import { NativeModules, Platform } from 'react-native';

const { NotificationAccess } = NativeModules;

export interface NotificationAccessAPI {
    /**
     * Check if NotificationListenerService permission is granted
     * Required for Android 14+ SMS detection
     */
    isEnabled: () => Promise<boolean>;

    /**
     * Open notification access settings
     * User must manually enable the permission for the app
     */
    openSettings: () => Promise<boolean>;

    /**
     * Check if device needs notification access (Android 13+)
     */
    needsNotificationAccess: () => Promise<boolean>;
}

/**
 * NotificationAccess Native Module
 * 
 * On Android 14+, SMS_RECEIVED broadcasts are restricted to default SMS apps.
 * This module provides access to NotificationListenerService as an alternative.
 * 
 * Usage:
 * 1. Check if device needs notification access: needsNotificationAccess()
 * 2. Check if permission is already granted: isEnabled()
 * 3. If not granted, prompt user and open settings: openSettings()
 * 
 * NOTE: Requires native rebuild. If NotificationAccess is null, the native 
 * Android code hasn't been rebuilt yet.
 */
const NotificationAccessModule: NotificationAccessAPI = {
    isEnabled: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        // Check if native module is available (requires native rebuild)
        if (!NotificationAccess) {
            console.warn('[NotificationAccess] Native module not available. Please rebuild the app.');
            return false;
        }
        try {
            return await NotificationAccess.isEnabled();
        } catch (error) {
            console.error('[NotificationAccess] Error checking status:', error);
            return false;
        }
    },

    openSettings: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return false;
        if (!NotificationAccess) {
            console.warn('[NotificationAccess] Native module not available. Please rebuild the app.');
            return false;
        }
        try {
            return await NotificationAccess.openSettings();
        } catch (error) {
            console.error('[NotificationAccess] Error opening settings:', error);
            return false;
        }
    },

    needsNotificationAccess: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return false;
        if (!NotificationAccess) {
            // Native module not available - app needs to be rebuilt
            console.warn('[NotificationAccess] Native module not available. Please rebuild the app.');
            return false;
        }
        try {
            return await NotificationAccess.needsNotificationAccess();
        } catch (error) {
            console.error('[NotificationAccess] Error checking need:', error);
            return false;
        }
    },
};

export default NotificationAccessModule;
