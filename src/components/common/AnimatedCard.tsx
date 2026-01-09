/**
 * AnimatedCard - Material 3 Expressive
 * =====================================
 * Pressable card with spring-based animations using built-in Animated
 */

import React, { useRef } from 'react';
import { StyleSheet, ViewStyle, StyleProp, Pressable, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { springConfigs, scales } from '../../theme/motion';
import { borderRadius as radii } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    onLongPress?: () => void;
    borderRadius?: number;
    disabled?: boolean;
    intensity?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    style,
    onPress,
    onLongPress,
    borderRadius = radii.lg,
    disabled = false,
    intensity = 20,
}) => {
    const { isDark, colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;

    const glassColors = isDark
        ? ['rgba(30, 41, 59, 0.88)', 'rgba(15, 23, 42, 0.92)']
        : ['rgba(255, 255, 255, 0.92)', 'rgba(255, 255, 255, 0.82)'];

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: scales.pressed,
            ...springConfigs.snappy,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            ...springConfigs.bouncy,
        }).start();
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[
                styles.container,
                { borderRadius, transform: [{ scale }] },
                style,
            ]}
        >
            <LinearGradient
                colors={glassColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius }]}
            />
            <Animated.View style={[
                styles.border,
                {
                    borderRadius,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
                },
            ]} />
            {children}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        pointerEvents: 'none',
    },
});
