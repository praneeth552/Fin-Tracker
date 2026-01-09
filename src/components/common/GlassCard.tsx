/**
 * GlassCard - iOS 26 Liquid Glass (Skia Powered)
 * ==============================================
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LiquidView } from './LiquidGlass';
import { useTheme } from '../../theme/ThemeContext';
import { createShadows } from '../../theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    borderRadius?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 20,
    borderRadius,
}) => {
    const { isDark, borderRadius: themeRadius } = useTheme();

    return (
        <LiquidView
            style={[styles.container, style]}
            intensity={intensity}
            borderRadius={borderRadius || themeRadius.lg}
        >
            {children}
        </LiquidView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0, // LiquidView handles content
        overflow: 'hidden',
    },
});

export default GlassCard;
