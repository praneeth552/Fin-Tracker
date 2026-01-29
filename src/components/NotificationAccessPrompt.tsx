/**
 * Notification Access Prompt Component
 * ======================================
 * Shows a modal or banner prompting users on Android 13+
 * to enable Notification Access for SMS detection
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    useColorScheme,
    Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from './common';
import { themes, spacing, borderRadius } from '../theme';
import NotificationAccessModule from '../native/NotificationAccessModule';
import { useLanguage } from '../context/LanguageContext';

interface NotificationAccessPromptProps {
    visible: boolean;
    onClose: () => void;
    onEnabled?: () => void;
}

export const NotificationAccessPrompt: React.FC<NotificationAccessPromptProps> = ({
    visible,
    onClose,
    onEnabled,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { t } = useLanguage();

    const handleEnable = async () => {
        await NotificationAccessModule.openSettings();
        // Mark as seen so we don't show again
        await AsyncStorage.setItem('hasSeenNotificationAccessPrompt', 'true');
        onClose();
        // Check if enabled after a delay
        setTimeout(async () => {
            const isEnabled = await NotificationAccessModule.isEnabled();
            if (isEnabled && onEnabled) {
                onEnabled();
            }
        }, 2000);
    };

    const handleLater = async () => {
        await AsyncStorage.setItem('hasSeenNotificationAccessPrompt', 'true');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={[styles.modal, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EBF5FF' }]}>
                        <Icon name="bell-ring-outline" size={40} color="#3B82F6" />
                    </View>

                    {/* Title */}
                    <Typography variant="h3" weight="bold" align="center" style={{ marginTop: 16 }}>
                        {t('settings.notificationAccessRequired') || 'Enable Notification Access'}
                    </Typography>

                    {/* Description */}
                    <Typography
                        variant="body"
                        color="secondary"
                        align="center"
                        style={{ marginTop: 12, lineHeight: 22, paddingHorizontal: 8 }}
                    >
                        {t('settings.notificationAccessMessage') ||
                            'To automatically detect bank SMS on Android 13+, FinTracker needs to read notifications.'}
                    </Typography>

                    {/* Privacy Notice */}
                    <View style={[styles.privacyBox, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)' }]}>
                        <Icon name="shield-check-outline" size={20} color="#22C55E" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Typography variant="caption" weight="medium" style={{ color: '#22C55E' }}>
                                {t('settings.privacyTitle') || 'Your privacy is protected'}
                            </Typography>
                            <Typography variant="caption" color="secondary" style={{ marginTop: 2, lineHeight: 16 }}>
                                {t('settings.noBackendPrivacy') || 'All data goes to YOUR Google Sheets. No servers, no databases, no tracking.'}
                            </Typography>
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[styles.button, styles.laterButton, { borderColor: colors.border }]}
                            onPress={handleLater}
                        >
                            <Typography variant="body" color="secondary">
                                {t('settings.askMeLater') || 'Later'}
                            </Typography>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.enableButton]}
                            onPress={handleEnable}
                        >
                            <Icon name="cog-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>
                                {t('settings.openSettings') || 'Open Settings'}
                            </Typography>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

/**
 * Hook to check if Notification Access prompt should be shown
 * @param autoTrackingTrigger - optional trigger to re-check when auto-tracking status changes
 */
export const useNotificationAccessCheck = (autoTrackingTrigger?: boolean) => {
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Small delay to let the AutoTrackingModal close first
        const timer = setTimeout(() => {
            checkNotificationAccess();
        }, 500);
        return () => clearTimeout(timer);
    }, [autoTrackingTrigger]);

    const checkNotificationAccess = async () => {
        try {
            console.log('[NotificationAccessCheck] Starting check...');

            // Only check on Android
            const needsAccess = await NotificationAccessModule.needsNotificationAccess();
            console.log('[NotificationAccessCheck] needsAccess:', needsAccess);
            if (!needsAccess) {
                setIsChecking(false);
                return;
            }

            // Check if auto-tracking is enabled
            const autoTrackingEnabled = await AsyncStorage.getItem('autoTrackingEnabled');
            console.log('[NotificationAccessCheck] autoTrackingEnabled:', autoTrackingEnabled);
            if (autoTrackingEnabled !== 'true') {
                setIsChecking(false);
                return;
            }

            // Check if already has notification access
            const isEnabled = await NotificationAccessModule.isEnabled();
            console.log('[NotificationAccessCheck] isEnabled:', isEnabled);
            if (isEnabled) {
                setIsChecking(false);
                return;
            }

            // Check if user has already seen and dismissed the prompt
            const hasSeenPrompt = await AsyncStorage.getItem('hasSeenNotificationAccessPrompt');
            console.log('[NotificationAccessCheck] hasSeenPrompt:', hasSeenPrompt);
            if (hasSeenPrompt === 'true') {
                setIsChecking(false);
                return;
            }

            // All conditions met - show the prompt
            console.log('[NotificationAccessCheck] Showing prompt!');
            setShouldShowPrompt(true);
            setIsChecking(false);
        } catch (error) {
            console.error('[NotificationAccessCheck] Error:', error);
            setIsChecking(false);
        }
    };

    const dismissPrompt = () => {
        setShouldShowPrompt(false);
    };

    const recheckAccess = async () => {
        const isEnabled = await NotificationAccessModule.isEnabled();
        return isEnabled;
    };

    const triggerCheck = () => {
        checkNotificationAccess();
    };

    return {
        shouldShowPrompt,
        isChecking,
        dismissPrompt,
        recheckAccess,
        triggerCheck,
    };
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modal: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: spacing.lg,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    privacyBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        borderRadius: 12,
        marginTop: 20,
        width: '100%',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    laterButton: {
        borderWidth: 1,
    },
    enableButton: {
        backgroundColor: '#3B82F6',
    },
});

export default NotificationAccessPrompt;
