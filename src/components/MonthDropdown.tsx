/**
 * Month Dropdown Component
 * =========================
 * Allows filtering by This Month / Previous Month
 */

import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Animated,
    useColorScheme,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';

export type MonthFilter = 'this' | 'prev';

interface MonthDropdownProps {
    value: MonthFilter;
    onChange: (month: MonthFilter) => void;
}

const getMonthName = (filter: MonthFilter): string => {
    const now = new Date();
    const month = filter === 'this' ? now.getMonth() : now.getMonth() - 1;
    const year = filter === 'prev' && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const date = new Date(year, month < 0 ? 11 : month);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const MonthDropdown: React.FC<MonthDropdownProps> = ({ value, onChange }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [showDropdown, setShowDropdown] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setShowDropdown(true);
    };

    const handleSelect = (filter: MonthFilter) => {
        onChange(filter);
        setShowDropdown(false);
    };

    const buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const dropdownBg = isDark ? colors.card : '#FFFFFF';

    return (
        <>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable
                    style={[styles.button, { backgroundColor: buttonBg }]}
                    onPress={handlePress}
                >
                    <Icon name="calendar-month" size={16} color={colors.primary} />
                    <Typography variant="bodySmall" weight="medium" style={{ marginHorizontal: 6 }}>
                        {getMonthName(value)}
                    </Typography>
                    <Icon name="chevron-down" size={16} color={colors.textMuted} />
                </Pressable>
            </Animated.View>

            <Modal visible={showDropdown} transparent animationType="fade">
                <Pressable style={styles.backdrop} onPress={() => setShowDropdown(false)}>
                    <View style={[styles.dropdown, { backgroundColor: dropdownBg }]}>
                        <Pressable
                            style={[styles.option, value === 'this' && { backgroundColor: colors.primary + '15' }]}
                            onPress={() => handleSelect('this')}
                        >
                            <Icon
                                name={value === 'this' ? 'radiobox-marked' : 'radiobox-blank'}
                                size={18}
                                color={value === 'this' ? colors.primary : colors.textMuted}
                            />
                            <View style={styles.optionText}>
                                <Typography variant="body" weight={value === 'this' ? 'semibold' : 'regular'}>
                                    This Month
                                </Typography>
                                <Typography variant="caption" color="secondary">
                                    {getMonthName('this')}
                                </Typography>
                            </View>
                        </Pressable>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <Pressable
                            style={[styles.option, value === 'prev' && { backgroundColor: colors.primary + '15' }]}
                            onPress={() => handleSelect('prev')}
                        >
                            <Icon
                                name={value === 'prev' ? 'radiobox-marked' : 'radiobox-blank'}
                                size={18}
                                color={value === 'prev' ? colors.primary : colors.textMuted}
                            />
                            <View style={styles.optionText}>
                                <Typography variant="body" weight={value === 'prev' ? 'semibold' : 'regular'}>
                                    Previous Month
                                </Typography>
                                <Typography variant="caption" color="secondary">
                                    {getMonthName('prev')}
                                </Typography>
                            </View>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    dropdown: {
        width: '100%',
        maxWidth: 300,
        borderRadius: 16,
        padding: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 12,
    },
    optionText: {
        marginLeft: spacing.md,
    },
    divider: {
        height: 1,
        marginVertical: spacing.xs,
    },
});

export default MonthDropdown;
