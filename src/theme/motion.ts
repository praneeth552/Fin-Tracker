/**
 * Motion System - Material 3 Expressive
 * ======================================
 * Spring-based animations using built-in Animated API
 */

import { Animated } from 'react-native';

// Spring config presets for built-in Animated API
export const springConfigs = {
    // Bouncy, playful animations
    bouncy: {
        tension: 180,
        friction: 12,
        useNativeDriver: true,
    },

    // Standard responsive feel
    standard: {
        tension: 200,
        friction: 20,
        useNativeDriver: true,
    },

    // Quick, snappy transitions
    snappy: {
        tension: 300,
        friction: 25,
        useNativeDriver: true,
    },

    // Gentle, relaxed motion
    gentle: {
        tension: 120,
        friction: 18,
        useNativeDriver: true,
    },
};

// Animation durations (ms)
export const durations = {
    instant: 100,
    fast: 200,
    standard: 300,
    slow: 500,
    stagger: 50, // delay between staggered items
};

// Scale values
export const scales = {
    pressed: 0.96,
    active: 1.08,
    iconActive: 1.15,
    none: 1,
};
