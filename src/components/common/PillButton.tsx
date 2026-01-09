/**
 * PillButton Component - Dark Mode Support
 * ==========================================
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp, Animated, useColorScheme } from 'react-native';
import { Typography } from './Typography';
import { themes, spacing, borderRadius, createShadows } from '../../theme';

interface PillButtonProps {
    onPress: () => void;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}

export const PillButton: React.FC<PillButtonProps> = ({
    onPress,
    label,
    icon,
    variant = 'primary',
    size = 'medium',
    style,
    disabled = false,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const shadows = createShadows(isDark);

    const scaleValue = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.95,
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

    const getBackgroundColor = () => {
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.surface;
            case 'ghost': return 'transparent';
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'secondary': return colors.border;
            default: return 'transparent';
        }
    };

    return (
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={0.9}
                style={[
                    styles.button,
                    size === 'small' && styles.small,
                    size === 'medium' && styles.medium,
                    size === 'large' && styles.large,
                    {
                        backgroundColor: getBackgroundColor(),
                        borderColor: getBorderColor(),
                        borderWidth: variant === 'secondary' ? 1.5 : 0,
                    },
                    variant === 'primary' && shadows.glow(colors.primary),
                    disabled && styles.disabled,
                ]}
            >
                {icon && <Typography variant="lg" style={styles.icon}>{icon}</Typography>}
                <Typography
                    variant={size === 'small' ? 'caption' : 'body'}
                    weight="semibold"
                    color={variant === 'primary' ? 'inverse' : 'primary'}
                >
                    {label}
                </Typography>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.pill,
    },
    small: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    medium: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    large: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md + 4,
    },
    disabled: {
        opacity: 0.5,
    },
    icon: {
        marginRight: spacing.sm,
    },
});

export default PillButton;
