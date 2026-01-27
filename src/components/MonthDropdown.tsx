/**
 * Month Dropdown Component
 * =========================
 * Dynamic month selection based on available transaction data
 */

import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Animated,
    useColorScheme,
    Modal,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';

// Legacy type for backward compatibility
export type MonthFilter = 'this' | 'prev';

export interface MonthOption {
    month: number; // 1-12
    year: number;
    label: string; // "Jan 2026"
    isCurrentMonth: boolean;
}

interface MonthDropdownProps {
    value: MonthFilter;
    onChange: (month: MonthFilter) => void;
    // New optional prop for dynamic months
    selectedMonth?: number;
    selectedYear?: number;
    availableMonths?: MonthOption[];
    onMonthSelect?: (month: number, year: number) => void;
}

const getMonthName = (filter: MonthFilter): string => {
    const now = new Date();
    const month = filter === 'this' ? now.getMonth() : now.getMonth() - 1;
    const year = filter === 'prev' && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const date = new Date(year, month < 0 ? 11 : month);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatMonthYear = (month: number, year: number): string => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Generate available months from transactions
export const getAvailableMonths = (transactions: { date: string }[]): MonthOption[] => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Collect unique months from transaction dates
    const monthSet = new Set<string>();

    // Always include current month
    monthSet.add(`${currentYear}-${currentMonth}`);

    // Removed forced Previous Month addition to avoid confusion when no data exists

    transactions.forEach(tx => {
        if (tx.date) {
            const [year, month] = tx.date.split('-').map(Number);
            if (year && month) {
                monthSet.add(`${year}-${month}`);
            }
        }
    });

    // Convert to array and sort descending (newest first)
    const months: MonthOption[] = Array.from(monthSet)
        .map(key => {
            const [year, month] = key.split('-').map(Number);
            return {
                month,
                year,
                label: formatMonthYear(month, year),
                isCurrentMonth: month === currentMonth && year === currentYear,
            };
        })
        .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

    return months;
};

export const MonthDropdown: React.FC<MonthDropdownProps> = ({
    value,
    onChange,
    selectedMonth,
    selectedYear,
    availableMonths,
    onMonthSelect,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [showDropdown, setShowDropdown] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Determine display mode: dynamic (new) vs legacy
    const isDynamic = !!availableMonths && !!onMonthSelect;

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

    const handleMonthSelect = (month: number, year: number) => {
        if (onMonthSelect) {
            onMonthSelect(month, year);
        }
        setShowDropdown(false);
    };

    // Get display text
    const displayText = useMemo(() => {
        if (isDynamic && selectedMonth && selectedYear) {
            return formatMonthYear(selectedMonth, selectedYear);
        }
        return getMonthName(value);
    }, [isDynamic, selectedMonth, selectedYear, value]);

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
                        {displayText}
                    </Typography>
                    <Icon name="chevron-down" size={16} color={colors.textMuted} />
                </Pressable>
            </Animated.View>

            <Modal visible={showDropdown} transparent animationType="fade">
                <Pressable style={styles.backdrop} onPress={() => setShowDropdown(false)}>
                    <View style={[styles.dropdown, { backgroundColor: dropdownBg }]}>
                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            {isDynamic && availableMonths ? (
                                // Dynamic mode: show all available months
                                availableMonths.map((mo, index) => {
                                    const isSelected = mo.month === selectedMonth && mo.year === selectedYear;
                                    return (
                                        <React.Fragment key={`${mo.year}-${mo.month}`}>
                                            {index > 0 && (
                                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                            )}
                                            <Pressable
                                                style={[styles.option, isSelected && { backgroundColor: colors.primary + '15' }]}
                                                onPress={() => handleMonthSelect(mo.month, mo.year)}
                                            >
                                                <Icon
                                                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                                                    size={18}
                                                    color={isSelected ? colors.primary : colors.textMuted}
                                                />
                                                <View style={styles.optionText}>
                                                    <Typography variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                                                        {mo.label}
                                                    </Typography>
                                                    {mo.isCurrentMonth && (
                                                        <Typography variant="caption" color="secondary">
                                                            Current Month
                                                        </Typography>
                                                    )}
                                                </View>
                                            </Pressable>
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                // Legacy mode: This Month / Previous Month
                                <>
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
                                </>
                            )}
                        </ScrollView>
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
