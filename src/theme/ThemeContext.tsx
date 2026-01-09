/**
 * Theme Context - Dark Mode Support
 * ===================================
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themes, ThemeColors, createShadows, typography, spacing, borderRadius } from './index';

interface ThemeContextType {
    isDark: boolean;
    colors: ThemeColors;
    shadows: ReturnType<typeof createShadows>;
    typography: typeof typography;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const value: ThemeContextType = {
        isDark,
        colors: isDark ? themes.dark : themes.light,
        shadows: createShadows(isDark),
        typography,
        spacing,
        borderRadius,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        // Fallback for components outside provider
        const isDark = false;
        return {
            isDark,
            colors: themes.light,
            shadows: createShadows(false),
            typography,
            spacing,
            borderRadius,
        };
    }
    return context;
};
