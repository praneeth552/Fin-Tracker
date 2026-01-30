/**
 * Settings Screen
 * ================
 * App settings including permissions
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    useColorScheme,
    Switch,
    Alert,
    Linking,
    Platform,
    PermissionsAndroid,
    NativeModules,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from '../../components/common';
import { themes, spacing, borderRadius } from '../../theme';
import { useAuth } from '../../../App';
import { useLanguage } from '../../context/LanguageContext';
import NotificationAccessModule from '../../native/NotificationAccessModule';

interface SettingsScreenProps {
    navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const bgColor = isDark ? colors.background : '#F0F8FF'; // Azure White
    const { signOut } = useAuth();
    const { language, changeLanguage, languageOptions, t } = useLanguage();

    const [autoTrackingEnabled, setAutoTrackingEnabled] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    // Android 14+ Notification Access (required for SMS detection)
    const [needsNotificationAccess, setNeedsNotificationAccess] = useState(false);
    const [notificationAccessEnabled, setNotificationAccessEnabled] = useState(false);
    // UPI Notification Detection (separate toggle)
    const [upiDetectionEnabled, setUpiDetectionEnabled] = useState(false);

    useEffect(() => {
        loadSettings();
        checkNotificationAccess();
    }, []);

    const loadSettings = async () => {
        try {
            const autoTracking = await AsyncStorage.getItem('autoTrackingEnabled');
            const notifications = await AsyncStorage.getItem('notificationsEnabled');
            const upiDetection = await AsyncStorage.getItem('upiDetectionEnabled');
            if (autoTracking !== null) setAutoTrackingEnabled(autoTracking === 'true');
            if (notifications !== null) setNotificationsEnabled(notifications === 'true');
            if (upiDetection !== null) setUpiDetectionEnabled(upiDetection === 'true');
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Check if device needs and has Notification Access (Android 13+)
    const checkNotificationAccess = async () => {
        const needs = await NotificationAccessModule.needsNotificationAccess();
        setNeedsNotificationAccess(needs);
        if (needs) {
            const enabled = await NotificationAccessModule.isEnabled();
            setNotificationAccessEnabled(enabled);
        }
    };

    // Open Notification Access settings
    const openNotificationAccessSettings = async () => {
        await NotificationAccessModule.openSettings();
        // Check again when user returns
        setTimeout(() => checkNotificationAccess(), 1000);
    };

    const handleAutoTrackingToggle = async (value: boolean) => {
        if (value) {
            if (Platform.OS !== 'android') {
                Alert.alert('Not Supported', 'SMS tracking is only available on Android');
                return;
            }

            try {
                // Request both READ_SMS and RECEIVE_SMS permissions
                const smsPermissions = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                ]);

                const readGranted = smsPermissions[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
                const receiveGranted = smsPermissions[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;

                // Also request notification permission on Android 13+ (API 33+)
                // @ts-ignore - Platform.Version can be number or string
                if (Platform.Version >= 33) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                        {
                            title: 'Notification Permission',
                            message: 'FinTracker needs notification permission to show transaction updates.',
                            buttonPositive: 'Allow',
                        }
                    );
                }

                if (readGranted && receiveGranted) {
                    setAutoTrackingEnabled(true);
                    await AsyncStorage.setItem('autoTrackingEnabled', 'true');
                    console.log('SMS permissions granted - auto tracking enabled');
                } else if (
                    smsPermissions[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
                    smsPermissions[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
                ) {
                    Alert.alert(
                        'Permission Required',
                        'SMS permission was denied. Please enable it from App Settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: openAppSettings }
                        ]
                    );
                } else {
                    Alert.alert('Permission Denied', 'Auto-tracking requires SMS permission.');
                }
            } catch (err) {
                console.warn('Permission request error:', err);
            }
        } else {
            setAutoTrackingEnabled(false);
            await AsyncStorage.setItem('autoTrackingEnabled', 'false');
        }
    };

    const handleNotificationsToggle = async (value: boolean) => {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('notificationsEnabled', value.toString());
    };

    // Handle UPI notification detection toggle
    const handleUpiDetectionToggle = async (value: boolean) => {
        // First check if user has notification access enabled (required for UPI detection)
        if (value && needsNotificationAccess && !notificationAccessEnabled) {
            Alert.alert(
                'Notification Access Required',
                'UPI notification detection requires Notification Access permission. Please enable it first.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Enable', onPress: openNotificationAccessSettings }
                ]
            );
            return;
        }

        setUpiDetectionEnabled(value);
        await AsyncStorage.setItem('upiDetectionEnabled', value.toString());

        // Also update SharedPreferences for native Android (used by SmsNotificationListenerService)
        if (Platform.OS === 'android') {
            try {
                const { UPIDetectionModule } = NativeModules;
                if (UPIDetectionModule) {
                    await UPIDetectionModule.setEnabled(value);
                }
            } catch (error) {
                console.log('UPI native module error:', error);
            }
        }

        console.log(`UPI Detection ${value ? 'enabled' : 'disabled'}`);
    };

    const openAppSettings = () => {
        Linking.openSettings();
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                        // Use the signOut from context which clears storage and updates state
                        signOut();
                    },
                },
            ]
        );
    };

    const cardBg = isDark ? colors.card : '#FFFFFF';

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </Pressable>
                <Typography variant="h2" weight="semibold">{t('settings.settings') || 'Settings'}</Typography>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Permissions Section */}
                <Typography variant="caption" color="secondary" style={styles.sectionLabel}>
                    {t('settings.permissions')?.toUpperCase() || 'PERMISSIONS'}
                </Typography>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="message-text-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.autoTracking') || 'Auto-Tracking'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    {t('settings.readSms') || 'Read SMS for transactions'}
                                </Typography>
                            </View>
                        </View>
                        <Switch
                            value={autoTrackingEnabled}
                            onValueChange={handleAutoTrackingToggle}
                            trackColor={{ false: colors.border, true: isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.3)' }}
                            thumbColor={autoTrackingEnabled ? colors.accent : colors.textMuted}
                        />
                    </View>

                    {/* Privacy Notice */}
                    {autoTrackingEnabled && (
                        <View style={[styles.privacyNotice, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)' }]}>
                            <Icon name="shield-check-outline" size={16} color="#22C55E" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Typography variant="caption" weight="medium" style={{ color: '#22C55E' }}>
                                    {t('settings.privacyTitle') || 'Your privacy is protected'}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                                    {t('settings.privacyMessage') || 'We only read transaction messages. OTPs, passwords, and sensitive codes are never accessed.'}
                                </Typography>
                            </View>
                        </View>
                    )}

                    {/* Android 14+ Notification Access Warning */}
                    {autoTrackingEnabled && needsNotificationAccess && !notificationAccessEnabled && (
                        <Pressable
                            style={[styles.privacyNotice, { backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)' }]}
                            onPress={openNotificationAccessSettings}
                        >
                            <Icon name="alert-circle-outline" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Typography variant="caption" weight="medium" style={{ color: '#F59E0B' }}>
                                    {t('settings.notificationAccessRequired') || 'Notification Access Required'} ({t('settings.notificationAccessAndroidVersion') || 'Android 13+'})
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                                    {t('settings.notificationAccessMessage') || 'Tap here to enable Notification Access for reliable SMS detection on newer Android versions.'}
                                </Typography>
                            </View>
                            <Icon name="chevron-right" size={16} color="#F59E0B" />
                        </Pressable>
                    )}

                    {/* Notification Access Enabled Confirmation */}
                    {autoTrackingEnabled && needsNotificationAccess && notificationAccessEnabled && (
                        <View style={[styles.privacyNotice, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)' }]}>
                            <Icon name="check-circle-outline" size={16} color="#22C55E" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Typography variant="caption" weight="medium" style={{ color: '#22C55E' }}>
                                    {t('settings.notificationAccessEnabled') || 'Notification Access Enabled'}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                                    {t('settings.notificationAccessEnabledMessage') || 'SMS detection is fully working on your device.'}
                                </Typography>
                            </View>
                        </View>
                    )}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* UPI App Detection Toggle */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                                <Icon name="cellphone-nfc" size={20} color="#6366F1" />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.upiDetection') || 'UPI App Detection'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    {t('settings.upiDetectionDesc') || 'Detect GPay, PhonePe, Paytm transactions'}
                                </Typography>
                            </View>
                        </View>
                        <Switch
                            value={upiDetectionEnabled}
                            onValueChange={handleUpiDetectionToggle}
                            trackColor={{ false: colors.border, true: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.3)' }}
                            thumbColor={upiDetectionEnabled ? '#6366F1' : colors.textMuted}
                        />
                    </View>

                    {/* UPI Detection Info */}
                    {upiDetectionEnabled && (
                        <View style={[styles.privacyNotice, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)' }]}>
                            <Icon name="information-outline" size={16} color="#6366F1" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Typography variant="caption" weight="medium" style={{ color: '#6366F1' }}>
                                    {t('settings.upiDetectionActive') || 'UPI Detection Active'}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                                    {t('settings.upiDetectionInfo') || 'Transactions from GPay, PhonePe, Paytm, CRED, and BHIM will be detected instantly. Works even if bank SMS is delayed.'}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 6, lineHeight: 16, fontStyle: 'italic' }}>
                                    💡 {t('settings.upiDetectionTip') || 'Tip: Make sure notifications are enabled for your UPI apps in your phone settings.'}
                                </Typography>
                            </View>
                        </View>
                    )}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="bell-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.notifications') || 'Notifications'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    Budget alerts & reminders
                                </Typography>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationsToggle}
                            trackColor={{ false: colors.border, true: isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.3)' }}
                            thumbColor={notificationsEnabled ? colors.accent : colors.textMuted}
                        />
                    </View>
                </View>

                {/* System Permissions */}
                <Pressable
                    style={[styles.card, styles.linkCard, { backgroundColor: cardBg }]}
                    onPress={openAppSettings}
                >
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <Icon name="cog-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <View style={styles.settingText}>
                            <Typography variant="body" weight="medium">{t('settings.permissionsTitle') || 'System Permissions'}</Typography>
                            <Typography variant="caption" color="secondary">
                                {t('settings.permissionsDesc') || 'Manage all app permissions'}
                            </Typography>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>

                {/* Language Section - Redesigned as Grid */}
                <Typography variant="caption" color="secondary" style={styles.sectionLabel}>
                    {t('settings.language')?.toUpperCase() || 'LANGUAGE'}
                </Typography>
                <View style={styles.languageGrid}>
                    {languageOptions.map((lang) => {
                        const isSelected = language === lang.code;
                        return (
                            <Pressable
                                key={lang.code}
                                style={[
                                    styles.langCard,
                                    {
                                        backgroundColor: isSelected ? (isDark ? 'rgba(59,130,246,0.2)' : '#EBF5FF') : cardBg,
                                        borderColor: isSelected ? '#3B82F6' : 'transparent',
                                        borderWidth: 1
                                    }
                                ]}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <Typography
                                    variant="h3"
                                    style={{ marginBottom: 4 }}
                                >
                                    {lang.nativeLabel.charAt(0)}
                                </Typography>
                                <Typography
                                    variant="bodySmall"
                                    weight={isSelected ? 'semibold' : 'regular'}
                                    style={{ color: isSelected ? '#3B82F6' : colors.text }}
                                >
                                    {lang.nativeLabel}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ fontSize: 10 }}>
                                    {lang.label}
                                </Typography>
                                {isSelected && (
                                    <View style={styles.checkIcon}>
                                        <Icon name="check-circle" size={16} color="#3B82F6" />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Account Section */}
                <Typography variant="caption" color="secondary" style={styles.sectionLabel}>
                    {t('settings.account')?.toUpperCase() || 'ACCOUNT'}
                </Typography>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.settingItem,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                        onPress={() => Alert.alert(t('settings.profile') || 'Profile', "User profile editing coming soon!")}
                    >
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="account-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.profile') || 'Profile'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    {t('settings.editProfile') || 'View and edit your profile'}
                                </Typography>
                            </View>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textMuted} />
                    </Pressable>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Pressable
                        style={({ pressed }) => [
                            styles.settingItem,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                        onPress={() => Alert.alert(t('settings.privacy') || 'Privacy', "Privacy settings coming soon!")}
                    >
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="shield-check-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.privacy') || 'Privacy & Security'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    {t('settings.privacyDesc') || 'Data protection settings'}
                                </Typography>
                            </View>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textMuted} />
                    </Pressable>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Pressable style={styles.settingItem} onPress={handleSignOut}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : 'rgba(239,68,68,0.1)' }]}>
                                <Icon name="logout" size={20} color={colors.error} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">{t('settings.signOut') || 'Sign Out'}</Typography>
                                <Typography variant="caption" color="secondary">
                                    {t('settings.signOutDesc') || 'Log out of your account'}
                                </Typography>
                            </View>
                        </View>
                    </Pressable>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Typography variant="caption" color="secondary" align="center">
                        FinTracker v1.0.0
                    </Typography>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: spacing.md,
    },
    sectionLabel: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    linkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    settingText: {
        flex: 1,
    },
    divider: {
        height: 1,
        marginLeft: 56,
    },
    privacyNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 8,
    },
    appInfo: {
        marginTop: spacing.xl,
        paddingVertical: spacing.lg,
    },
    languageGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    langCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
});

export default SettingsScreen;
