/**
 * Budget Slider Modal
 * ====================
 * Allows users to set budget limits per category
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    useColorScheme,
    Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';

interface BudgetModalProps {
    visible: boolean;
    onClose: () => void;
    category: {
        name: string;
        label: string;
        icon: string;
        color: string;
        limit: number;
        spent: number;
    } | null;
    onSave: (category: string, limit: number) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
    visible,
    onClose,
    category,
    onSave,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [budgetValue, setBudgetValue] = useState(category?.limit || 5000);

    React.useEffect(() => {
        if (category) {
            setBudgetValue(category.limit);
        }
    }, [category]);

    const handleSave = () => {
        if (category) {
            onSave(category.name, budgetValue);
        }
        onClose();
    };

    const bgColor = isDark ? colors.card : '#FFFFFF';
    const percentage = category ? Math.min((category.spent / budgetValue) * 100, 100) : 0;
    const isOverBudget = category ? category.spent > budgetValue : false;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View style={[styles.modal, { backgroundColor: bgColor }]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        {category && (
                            <>
                                {/* Header */}
                                <View style={styles.header}>
                                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                                        <Typography variant="h3">{category.icon}</Typography>
                                    </View>
                                    <Typography variant="h3" weight="semibold" style={{ marginTop: spacing.sm }}>
                                        {category.label} Budget
                                    </Typography>
                                </View>

                                {/* Current Amount */}
                                <View style={styles.amountDisplay}>
                                    <Typography variant="3xl" weight="bold">
                                        ₹{budgetValue.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="secondary">monthly limit</Typography>
                                </View>

                                {/* Slider */}
                                <View style={styles.sliderContainer}>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={1000}
                                        maximumValue={500000}
                                        step={500}
                                        value={budgetValue}
                                        onValueChange={setBudgetValue}
                                        minimumTrackTintColor={category.color}
                                        maximumTrackTintColor={isDark ? '#3F3F46' : '#E4E4E7'}
                                        thumbTintColor={category.color}
                                    />
                                    <View style={styles.sliderLabels}>
                                        <Typography variant="caption" color="secondary">₹1k</Typography>
                                        <Typography variant="caption" color="secondary">₹5L</Typography>
                                    </View>
                                </View>

                                {/* Progress */}
                                <View style={styles.progressSection}>
                                    <View style={styles.progressHeader}>
                                        <Typography variant="bodySmall" color="secondary">Spent this month</Typography>
                                        <Typography
                                            variant="bodySmall"
                                            weight="semibold"
                                            style={{ color: isOverBudget ? '#EF4444' : colors.text }}
                                        >
                                            ₹{category.spent.toLocaleString()}
                                        </Typography>
                                    </View>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                {
                                                    width: `${percentage}%`,
                                                    backgroundColor: isOverBudget ? '#EF4444' : category.color
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
                                        {isOverBudget
                                            ? `₹${(category.spent - budgetValue).toLocaleString()} over budget`
                                            : `₹${(budgetValue - category.spent).toLocaleString()} remaining`
                                        }
                                    </Typography>
                                </View>

                                {/* Buttons */}
                                <View style={styles.buttons}>
                                    <Pressable
                                        style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                                        onPress={onClose}
                                    >
                                        <Typography variant="body" color="secondary">Cancel</Typography>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.btn, styles.saveBtn, { backgroundColor: category.color }]}
                                        onPress={handleSave}
                                    >
                                        <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>Save</Typography>
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </Pressable>
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
    modal: {
        width: '100%',
        borderRadius: 24,
        padding: spacing.xl,
    },
    header: {
        alignItems: 'center',
    },
    categoryIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amountDisplay: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    sliderContainer: {
        marginTop: spacing.lg,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    progressSection: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: spacing.lg,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        borderWidth: 1,
    },
    saveBtn: {},
});

export default BudgetModal;
