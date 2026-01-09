/**
 * LiquidGlass - LinearGradient Based
 * ===================================
 * Glassmorphism using LinearGradient (works on Android!)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface LiquidGlassProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    borderRadius?: number;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
    children,
    style,
    intensity = 20,
    borderRadius = 24,
}) => {
    const { isDark } = useTheme();

    const glassColors = isDark
        ? ['rgba(30, 41, 59, 0.85)', 'rgba(15, 23, 42, 0.9)']
        : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.7)'];

    return (
        <View style={[styles.container, { borderRadius }, style]}>
            <LinearGradient
                colors={glassColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius }]}
            />
            <View style={[styles.border, { borderRadius }]} />
            {children}
        </View>
    );
};

export const LiquidView: React.FC<LiquidGlassProps> = ({
    children,
    style,
    intensity = 15,
    borderRadius = 24,
}) => {
    const { isDark } = useTheme();

    const glassColors = isDark
        ? ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.85)']
        : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)'];

    return (
        <View style={[styles.container, { borderRadius, overflow: 'hidden' }, style]}>
            <LinearGradient
                colors={glassColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.border, { borderRadius }]} />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});
