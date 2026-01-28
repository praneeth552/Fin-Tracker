/**
 * Auto Tracking Modal - With Actual Permission Request
 * ======================================================
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    useColorScheme,
    Platform,
    PermissionsAndroid,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from './common';
import { themes, spacing, borderRadius, createShadows } from '../theme';

interface AutoTrackingModalProps {
    visible: boolean;
    onGrantPermissions: () => void;
    onMaybeLater: () => void;
}

export const AutoTrackingModal: React.FC<AutoTrackingModalProps> = ({
    visible,
    onGrantPermissions,
    onMaybeLater,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const shadows = createShadows(isDark);
    const [loading, setLoading] = useState(false);

    const requestSMSPermission = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('Not Supported', 'SMS tracking is only available on Android');
            return;
        }

        setLoading(true);
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
                console.log('SMS permission granted');
                // Also request notification permission for payment apps
                await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                // Enable auto-tracking in settings so it starts working immediately
                await AsyncStorage.setItem('autoTrackingEnabled', 'true');
                console.log('Auto-tracking enabled in settings');
                onGrantPermissions();
            } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                    'Permission Required',
                    'SMS permission was denied. Please enable it from Settings > Apps > FinTracker > Permissions.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: onMaybeLater },
                        { text: 'Open Settings', onPress: onMaybeLater }
                    ]
                );
            } else {
                Alert.alert(
                    'Permission Denied',
                    'Auto-tracking requires SMS permission to read bank messages.',
                    [{ text: 'OK', onPress: onMaybeLater }]
                );
            }
        } catch (err) {
            console.warn('Permission request error:', err);
            Alert.alert('Error', 'Failed to request permission. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.surface }, shadows.lg]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Typography variant="3xl">🔔</Typography>
                    </View>

                    {/* Title */}
                    <Typography variant="h2" align="center" style={styles.title}>
                        Auto-Track Expenses
                    </Typography>

                    {/* Description */}
                    <Typography variant="body" color="secondary" align="center" style={styles.description}>
                        Allow FinTracker to read SMS notifications to automatically track your expenses from bank messages.
                    </Typography>

                    {/* Permissions */}
                    <View style={[styles.permissionCard, { backgroundColor: colors.background }]}>
                        <View style={styles.permissionRow}>
                            <Typography variant="lg">📱</Typography>
                            <View style={styles.permissionText}>
                                <Typography variant="body" weight="medium">SMS Access</Typography>
                                <Typography variant="caption" color="secondary">Read bank transaction SMS</Typography>
                            </View>
                        </View>
                        <View style={styles.permissionRow}>
                            <Typography variant="lg">🔔</Typography>
                            <View style={styles.permissionText}>
                                <Typography variant="body" weight="medium">Notifications</Typography>
                                <Typography variant="caption" color="secondary">Read payment app alerts</Typography>
                            </View>
                        </View>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={requestSMSPermission}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Typography variant="body" weight="semibold" color="inverse">
                                Enable Auto-Tracking
                            </Typography>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onMaybeLater} activeOpacity={0.7}>
                        <Typography variant="body" color="secondary" style={styles.laterText}>
                            Maybe Later
                        </Typography>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modal: {
        width: '100%',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        marginBottom: spacing.sm,
    },
    description: {
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    permissionCard: {
        width: '100%',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    permissionText: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    primaryBtn: {
        width: '100%',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.pill,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    laterText: {
        paddingVertical: spacing.sm,
    },
});

export default AutoTrackingModal;
