/**
 * GlobalFAB - Glassmorphism + Dark Mode
 * =======================================
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Animated, useColorScheme } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Typography } from './common';
import { themes, spacing, createShadows } from '../theme';

interface GlobalFABProps {
    onPress: () => void;
}

export const GlobalFAB: React.FC<GlobalFABProps> = ({ onPress }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const shadows = createShadows(isDark);

    const scaleValue = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.9,
            useNativeDriver: true,
            friction: 5,
            tension: 100,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 100,
        }).start();
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={shadows.glow(colors.primary)}
            >
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <Typography variant="h2" color="inverse" style={styles.icon}>+</Typography>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: spacing.lg,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 26,
        marginTop: -2,
    },
});

export default GlobalFAB;
