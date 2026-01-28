import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, useColorScheme, StyleProp } from 'react-native';

const SkeletonContext = createContext<Animated.Value | null>(null);

export const SkeletonContainer: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <SkeletonContext.Provider value={pulseAnim}>
            <View style={style}>{children}</View>
        </SkeletonContext.Provider>
    );
};

interface SkeletonItemProps {
    width?: number | string;
    height?: number | string;
    style?: any;
    borderRadius?: number;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({ width, height, style, borderRadius = 8 }) => {
    const pulseAnim = useContext(SkeletonContext);
    const isDark = useColorScheme() === 'dark';
    // Slightly lighter/darker based on theme for visibility
    const bg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';

    if (!pulseAnim) {
        return <View style={[{ width, height, backgroundColor: bg, borderRadius }, style]} />;
    }

    return (
        <Animated.View style={[{ width, height, backgroundColor: bg, borderRadius, opacity: pulseAnim }, style]} />
    );
};
