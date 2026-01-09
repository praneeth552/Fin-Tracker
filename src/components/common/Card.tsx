/**
 * Card Component - Dark Mode Support
 * ====================================
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, useColorScheme } from 'react-native';
import { themes, spacing, borderRadius, createShadows } from '../../theme';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const shadows = createShadows(isDark);

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
});

export default Card;
