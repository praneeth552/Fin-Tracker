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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from '../../components/common';
import { themes, spacing, borderRadius } from '../../theme';
import { useAuth } from '../../../App';

interface SettingsScreenProps {
    navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const bgColor = isDark ? colors.background : '#FAFAFA';
    const { signOut } = useAuth();

    const [autoTrackingEnabled, setAutoTrackingEnabled] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const autoTracking = await AsyncStorage.getItem('autoTrackingEnabled');
            const notifications = await AsyncStorage.getItem('notificationsEnabled');
            if (autoTracking !== null) setAutoTrackingEnabled(autoTracking === 'true');
            if (notifications !== null) setNotificationsEnabled(notifications === 'true');
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleAutoTrackingToggle = async (value: boolean) => {
        if (value) {
            if (Platform.OS !== 'android') {
                Alert.alert('Not Supported', 'SMS tracking is only available on Android');
                return;
            }

            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                    {
                        title: 'SMS Permission Required',
                        message: 'FinTracker needs to read your SMS messages to automatically track bank transactions.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'Grant Permission',
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setAutoTrackingEnabled(true);
                    await AsyncStorage.setItem('autoTrackingEnabled', 'true');
                } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
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
                <Typography variant="h2" weight="semibold">Settings</Typography>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Permissions Section */}
                <Typography variant="caption" color="secondary" style={styles.sectionLabel}>
                    PERMISSIONS
                </Typography>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="message-text-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">Auto-Tracking</Typography>
                                <Typography variant="caption" color="secondary">
                                    Read SMS for transactions
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

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="bell-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">Notifications</Typography>
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
                            <Typography variant="body" weight="medium">System Permissions</Typography>
                            <Typography variant="caption" color="secondary">
                                Manage all app permissions
                            </Typography>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>

                {/* Account Section */}
                <Typography variant="caption" color="secondary" style={styles.sectionLabel}>
                    ACCOUNT
                </Typography>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Pressable style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="account-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">Profile</Typography>
                                <Typography variant="caption" color="secondary">
                                    View and edit your profile
                                </Typography>
                            </View>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textMuted} />
                    </Pressable>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Pressable style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Icon name="shield-check-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.settingText}>
                                <Typography variant="body" weight="medium">Privacy & Security</Typography>
                                <Typography variant="caption" color="secondary">
                                    Data protection settings
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
                                <Typography variant="body" weight="medium">Sign Out</Typography>
                                <Typography variant="caption" color="secondary">
                                    Log out of your account
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
    appInfo: {
        marginTop: spacing.xl,
        paddingVertical: spacing.lg,
    },
});

export default SettingsScreen;
