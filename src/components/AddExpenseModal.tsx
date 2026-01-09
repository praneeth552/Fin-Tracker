/**
 * Add Expense Modal - Dark Mode Support
 * =======================================
 */

import React, { useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { Typography } from './common';
import { themes, spacing, borderRadius, createShadows } from '../theme';
import type { CategoryType } from '../types';

interface AddExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (expense: { amount: string; description: string; category: string }) => void;
}

interface Category {
    type: string;
    label: string;
    icon: string;
    colorKey: string;
}

const defaultCategories: Category[] = [
    { type: 'food', label: 'Food & Dining', icon: '🍽️', colorKey: 'food' },
    { type: 'transport', label: 'Transport', icon: '🚗', colorKey: 'transport' },
    { type: 'shopping', label: 'Shopping', icon: '🛒', colorKey: 'shopping' },
    { type: 'bills', label: 'Bills', icon: '📄', colorKey: 'bills' },
    { type: 'entertainment', label: 'Entertainment', icon: '🎬', colorKey: 'entertainment' },
    { type: 'health', label: 'Health', icon: '💊', colorKey: 'health' },
    { type: 'education', label: 'Education', icon: '📚', colorKey: 'education' },
];

const categoryEmojis = ['🏠', '✈️', '🎁', '💼', '🏋️', '🎨', '🎮', '☕', '🍿', '🛠️', '🐕', '💅'];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
    visible,
    onClose,
    onSave,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categories, setCategories] = useState<Category[]>(defaultCategories);
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');

    const handleSave = () => {
        if (amount && description && selectedCategory) {
            onSave({ amount, description, category: selectedCategory });
            resetForm();
            onClose();
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setSelectedCategory('');
        setShowCreateCategory(false);
        setNewCategoryName('');
    };

    const handleCreateCategory = () => {
        if (newCategoryName) {
            const newCat: Category = {
                type: newCategoryName.toLowerCase().replace(/\s/g, '_'),
                label: newCategoryName,
                icon: newCategoryIcon,
                colorKey: 'other',
            };
            setCategories([...categories, newCat]);
            setSelectedCategory(newCat.type);
            setShowCreateCategory(false);
            setNewCategoryName('');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                style={[styles.overlay]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                            <Typography variant="body" color="secondary">Cancel</Typography>
                        </TouchableOpacity>
                        <Typography variant="body" weight="semibold">Add Expense</Typography>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={!amount || !description || !selectedCategory}
                            style={styles.headerBtn}
                        >
                            <Typography
                                variant="body"
                                weight="semibold"
                                color={amount && description && selectedCategory ? 'accent' : 'muted'}
                            >
                                Save
                            </Typography>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                    >
                        {/* Amount */}
                        <View style={styles.amountSection}>
                            <Typography variant="caption" color="secondary">Amount</Typography>
                            <View style={styles.amountRow}>
                                <Typography variant="3xl" color="secondary">₹</Typography>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Typography variant="caption" color="secondary" style={styles.label}>Description</Typography>
                            <TextInput
                                style={[styles.pillInput, { backgroundColor: colors.background, color: colors.text }]}
                                placeholder="What was this for?"
                                placeholderTextColor={colors.textMuted}
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* Categories */}
                        <View style={styles.inputGroup}>
                            <View style={styles.categoryHeader}>
                                <Typography variant="caption" color="secondary">Category</Typography>
                                <TouchableOpacity onPress={() => setShowCreateCategory(true)}>
                                    <Typography variant="caption" color="accent">+ Create New</Typography>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.categoryPills}>
                                {categories.map((cat) => {
                                    const catColor = colors.categories[cat.colorKey as keyof typeof colors.categories] || colors.primary;
                                    const isSelected = selectedCategory === cat.type;

                                    return (
                                        <TouchableOpacity
                                            key={cat.type}
                                            style={[
                                                styles.categoryPill,
                                                {
                                                    backgroundColor: isSelected ? catColor : colors.background,
                                                    borderColor: isSelected ? catColor : colors.border,
                                                },
                                            ]}
                                            onPress={() => setSelectedCategory(cat.type)}
                                            activeOpacity={0.7}
                                        >
                                            <Typography variant="body">{cat.icon}</Typography>
                                            <Typography
                                                variant="caption"
                                                weight={isSelected ? 'semibold' : 'regular'}
                                                color={isSelected ? 'inverse' : 'primary'}
                                                style={styles.categoryPillLabel}
                                            >
                                                {cat.label}
                                            </Typography>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Create Category */}
                        {showCreateCategory && (
                            <View style={[styles.createSection, { backgroundColor: colors.background }]}>
                                <Typography variant="body" weight="semibold" style={styles.createTitle}>
                                    Create Category
                                </Typography>

                                <TextInput
                                    style={[styles.pillInput, { backgroundColor: colors.surface, color: colors.text }]}
                                    placeholder="Category name"
                                    placeholderTextColor={colors.textMuted}
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                />

                                <Typography variant="caption" color="secondary" style={styles.emojiLabel}>
                                    Choose an icon
                                </Typography>
                                <View style={styles.emojiGrid}>
                                    {categoryEmojis.map((emoji) => (
                                        <TouchableOpacity
                                            key={emoji}
                                            style={[
                                                styles.emojiBtn,
                                                { backgroundColor: colors.surface },
                                                newCategoryIcon === emoji && { backgroundColor: colors.primaryLight },
                                            ]}
                                            onPress={() => setNewCategoryIcon(emoji)}
                                        >
                                            <Typography variant="xl">{emoji}</Typography>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.createActions}>
                                    <TouchableOpacity onPress={() => setShowCreateCategory(false)}>
                                        <Typography variant="body" color="secondary">Cancel</Typography>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.createBtn, { backgroundColor: colors.primary }]}
                                        onPress={handleCreateCategory}
                                        disabled={!newCategoryName}
                                    >
                                        <Typography variant="body" weight="semibold" color="inverse">Create</Typography>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modal: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '90%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    headerBtn: {
        paddingVertical: spacing.xs,
        minWidth: 60,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing['2xl'],
    },

    // Amount
    amountSection: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountInput: {
        fontSize: 48,
        fontWeight: '600',
        minWidth: 100,
        textAlign: 'center',
    },

    // Input
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        marginBottom: spacing.sm,
    },
    pillInput: {
        borderRadius: borderRadius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: 15,
    },

    // Categories
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    categoryPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        borderWidth: 1.5,
    },
    categoryPillLabel: {
        marginLeft: spacing.xs,
    },

    // Create
    createSection: {
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    createTitle: {
        marginBottom: spacing.md,
    },
    emojiLabel: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    emojiBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    createBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
    },
});

export default AddExpenseModal;
