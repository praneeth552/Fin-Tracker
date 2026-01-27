/**
 * Typography Component - Dark Mode Support
 * ==========================================
 */

import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, useColorScheme, TextProps } from 'react-native';
import { themes, typography } from '../../theme';

interface TypographyProps extends TextProps {
    children: React.ReactNode;
    variant?: 'h1' | 'h2' | 'h3' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'body' | 'bodySmall' | 'caption' | 'label';
    color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'success' | 'warning' | 'error' | 'accent';
    weight?: 'regular' | 'medium' | 'semibold' | 'bold';
    align?: 'left' | 'center' | 'right';
    style?: StyleProp<TextStyle>;
}

export const Typography: React.FC<TypographyProps> = ({
    children,
    variant = 'body',
    color = 'primary',
    weight,
    align = 'left',
    style,
    ...props
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const fontWeight = weight
        ? typography.weight[weight]
        : variantWeights[variant];

    const colorMap: Record<string, string> = {
        primary: colors.text,
        secondary: colors.textSecondary,
        muted: colors.textMuted,
        inverse: colors.textInverse,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        accent: colors.primary,
    };

    return (
        <Text
            style={[
                variantStyles[variant],
                {
                    color: colorMap[color] || colors.text,
                    fontWeight: fontWeight as TextStyle['fontWeight'],
                    textAlign: align,
                },
                style,
            ]}
            {...props}
        >
            {children}
        </Text>
    );
};

const variantWeights: Record<string, string> = {
    h1: typography.weight.bold,
    h2: typography.weight.semibold,
    h3: typography.weight.semibold,
    '4xl': typography.weight.bold,
    '3xl': typography.weight.bold,
    '2xl': typography.weight.semibold,
    xl: typography.weight.medium,
    lg: typography.weight.medium,
    body: typography.weight.regular,
    bodySmall: typography.weight.regular,
    caption: typography.weight.regular,
    label: typography.weight.medium,
};

const variantStyles = StyleSheet.create({
    h1: { fontSize: typography.size['3xl'], lineHeight: typography.size['3xl'] * 1.2 },
    h2: { fontSize: typography.size['2xl'], lineHeight: typography.size['2xl'] * 1.2 },
    h3: { fontSize: typography.size.xl, lineHeight: typography.size.xl * 1.2 },
    '4xl': { fontSize: typography.size['4xl'], lineHeight: typography.size['4xl'] * 1.1 },
    '3xl': { fontSize: typography.size['3xl'], lineHeight: typography.size['3xl'] * 1.2 },
    '2xl': { fontSize: typography.size['2xl'], lineHeight: typography.size['2xl'] * 1.2 },
    xl: { fontSize: typography.size.xl, lineHeight: typography.size.xl * 1.4 },
    lg: { fontSize: typography.size.lg, lineHeight: typography.size.lg * 1.4 },
    body: { fontSize: typography.size.md, lineHeight: typography.size.md * 1.5 },
    bodySmall: { fontSize: typography.size.sm, lineHeight: typography.size.sm * 1.5 },
    caption: { fontSize: typography.size.xs, lineHeight: typography.size.xs * 1.5 },
    label: { fontSize: typography.size.sm, lineHeight: typography.size.sm * 1.2 },
});
