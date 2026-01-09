/**
 * useReducedMotion Hook
 * =====================
 * Respects system accessibility preferences for reduced motion
 */

import { AccessibilityInfo } from 'react-native';
import { useState, useEffect } from 'react';

export const useReducedMotion = (): boolean => {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const checkReducedMotion = async () => {
            const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
            setReducedMotion(isReduceMotionEnabled);
        };

        checkReducedMotion();

        const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            setReducedMotion
        );

        return () => {
            subscription.remove();
        };
    }, []);

    return reducedMotion;
};

export default useReducedMotion;
