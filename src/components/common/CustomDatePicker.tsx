import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, Pressable, useColorScheme, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './Typography';
import { themes, spacing } from '../../theme';

interface CustomDatePickerProps {
    visible: boolean;
    onClose: () => void;
    date: Date;
    onChange: (date: Date) => void;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    visible,
    onClose,
    date,
    onChange,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [currentMonth, setCurrentMonth] = useState(new Date(date));

    // Reset current month when modal opens
    React.useEffect(() => {
        if (visible) {
            setCurrentMonth(new Date(date));
        }
    }, [visible]);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = daysInMonth(month, year);
        const firstDay = firstDayOfMonth(month, year);

        const slots = [];
        // Empty slots for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            slots.push(null);
        }
        // Actual days
        for (let i = 1; i <= days; i++) {
            slots.push(new Date(year, month, i));
        }
        return slots;
    }, [currentMonth]);

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleSelectDate = (selectedDate: Date) => {
        onChange(selectedDate);
        onClose();
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d: Date) => {
        return isSameDay(d, new Date());
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View style={[styles.container, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={handlePrevMonth} style={styles.arrowBtn}>
                            <Icon name="chevron-left" size={24} color={colors.text} />
                        </Pressable>
                        <Pressable onPress={() => setCurrentMonth(new Date())}>
                            <Typography variant="h3" weight="bold">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Typography>
                        </Pressable>
                        <Pressable onPress={handleNextMonth} style={styles.arrowBtn}>
                            <Icon name="chevron-right" size={24} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* Week Days */}
                    <View style={styles.weekRow}>
                        {weekDays.map((day, index) => (
                            <Typography
                                key={day}
                                variant="caption"
                                weight="bold"
                                style={[
                                    styles.weekDay,
                                    { color: index === 0 || index === 6 ? '#EF4444' : colors.textSecondary }
                                ]}
                            >
                                {day}
                            </Typography>
                        ))}
                    </View>

                    {/* Grid */}
                    <View style={styles.grid}>
                        {calendarData.map((slot, index) => {
                            if (!slot) {
                                return <View key={`empty-${index}`} style={styles.daySlot} />;
                            }

                            const isSelected = isSameDay(slot, date);
                            const isCurrentDay = isToday(slot);

                            return (
                                <Pressable
                                    key={slot.toISOString()}
                                    style={[
                                        styles.daySlot,
                                        isSelected && { backgroundColor: colors.primary, borderRadius: 12 },
                                        !isSelected && isCurrentDay && { borderWidth: 1, borderColor: colors.primary, borderRadius: 12 }
                                    ]}
                                    onPress={() => handleSelectDate(slot)}
                                >
                                    <Typography
                                        variant="body"
                                        weight={isSelected || isCurrentDay ? 'bold' : 'medium'}
                                        style={{
                                            color: isSelected ? colors.textInverse : colors.text
                                        }}
                                    >
                                        {slot.getDate().toString()}
                                    </Typography>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Footer - Cancel/Today */}
                    <View style={styles.footer}>
                        <Pressable style={styles.footerBtn} onPress={onClose}>
                            <Typography variant="body" color="secondary">Cancel</Typography>
                        </Pressable>
                        <Pressable
                            style={[styles.footerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
                            onPress={() => handleSelectDate(new Date())}
                        >
                            <Typography variant="body" weight="semibold" style={{ color: colors.primary }}>Today</Typography>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    container: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: spacing.lg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    arrowBtn: {
        padding: 8,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    weekDay: {
        flex: 1,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    daySlot: {
        width: '14.28%', // 100% / 7
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: spacing.lg,
        gap: spacing.md,
    },
    footerBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    }
});
