/**
 * i18n Configuration
 * ===================
 * Multi-language support for FinTrackerApp
 * Languages: English, Hindi, Telugu
 */

import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

const i18n = new I18n({
    en,
    hi,
    te,
});

// Default language
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = 'en'; // Default to English

// Language labels for display
export const languageOptions = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
    { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

// Country options with currency
export const countryOptions = [
    { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
    { code: 'US', name: 'United States', currency: 'USD', symbol: '$' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£' },
    { code: 'AE', name: 'UAE', currency: 'AED', symbol: 'د.إ' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$' },
    { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$' },
];

// Set initial locale from stored preference
export const initializeI18n = async () => {
    try {
        const storedLanguage = await AsyncStorage.getItem('userLanguage');
        if (storedLanguage && ['en', 'hi', 'te'].includes(storedLanguage)) {
            i18n.locale = storedLanguage;
        }
    } catch (error) {
        console.log('Error initializing i18n:', error);
        i18n.locale = 'en';
    }
};

// Change language and persist
export const setLanguage = async (languageCode: string) => {
    i18n.locale = languageCode;
    await AsyncStorage.setItem('userLanguage', languageCode);
};

// Get current language
export const getCurrentLanguage = () => i18n.locale;

// Translate function
export const t = (key: string, options?: object) => i18n.t(key, options);

export default i18n;
