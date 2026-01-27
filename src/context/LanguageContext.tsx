/**
 * Language Context
 * =================
 * Provides language state and translation function to all components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { setLanguage, languageOptions, countryOptions } from '../i18n';

interface LanguageContextType {
    language: string;
    country: string;
    currencySymbol: string;
    changeLanguage: (code: string) => Promise<void>;
    changeCountry: (code: string) => Promise<void>;
    t: (key: string, options?: object) => string;
    languageOptions: typeof languageOptions;
    countryOptions: typeof countryOptions;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState('en');
    const [country, setCountryState] = useState('IN');
    const [_, forceUpdate] = useState(0);

    // Get currency symbol from country
    const currencySymbol = countryOptions.find(c => c.code === country)?.symbol || '₹';

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const storedLang = await AsyncStorage.getItem('userLanguage');
            const storedCountry = await AsyncStorage.getItem('userCountry');

            if (storedLang) {
                i18n.locale = storedLang;
                setLanguageState(storedLang);
            }
            if (storedCountry) {
                setCountryState(storedCountry);
            }
        } catch (error) {
            console.log('Error loading language preferences:', error);
        }
    };

    const changeLanguage = async (code: string) => {
        await setLanguage(code);
        setLanguageState(code);
        forceUpdate(prev => prev + 1); // Force re-render all components
    };

    const changeCountry = async (code: string) => {
        await AsyncStorage.setItem('userCountry', code);
        setCountryState(code);
    };

    const t = (key: string, options?: object) => i18n.t(key, options);

    return (
        <LanguageContext.Provider value={{
            language,
            country,
            currencySymbol,
            changeLanguage,
            changeCountry,
            t,
            languageOptions,
            countryOptions,
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};

export default LanguageContext;
