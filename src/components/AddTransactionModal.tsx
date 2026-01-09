/**
 * Add Transaction Modal - Fixed Animation
 * =========================================
 * No mixing of native and JS animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    TextInput,
    useColorScheme,
    Animated,
    KeyboardAvoidingView,
    Platform,
    LayoutAnimation,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography, CustomDatePicker, CustomDropdown } from './common';
import { AddCategoryModal } from './AddCategoryModal';
import { useApp } from '../context/AppContext';
import { themes, spacing } from '../theme';

interface AddTransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (transaction: {
        amount: number;
        description: string;
        category: string;
        type: 'income' | 'expense';
        date?: string;
        merchant?: string;
        paymentMethod?: 'cash' | 'upi' | 'card' | 'netbanking';
        accountId?: string;
    }) => void;
}

const defaultCategories = [
    { key: 'food', label: 'Food', icon: '🍽️', color: '#3B82F6' },
    { key: 'transport', label: 'Travel', icon: '🚗', color: '#8B5CF6' },
    { key: 'shopping', label: 'Shop', icon: '🛒', color: '#EC4899' },
    { key: 'bills', label: 'Bills', icon: '📄', color: '#10B981' },
    { key: 'entertainment', label: 'Fun', icon: '🎬', color: '#F59E0B' },
    { key: 'health', label: 'Health', icon: '💊', color: '#EF4444' },
    { key: 'misc', label: 'Misc', icon: '📌', color: '#6B7280' },
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
    visible,
    onClose,
    onAdd,
}) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { customCategories, bankAccounts } = useApp();

    // Merge default categories with custom ones
    const allCategories = [...defaultCategories, ...customCategories];

    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('food');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // New fields
    const [vendor, setVendor] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'netbanking'>('upi');
    const [selectedAccount, setSelectedAccount] = useState(bankAccounts[0]?.id || 'cash');
    const [transactionDate, setTransactionDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const slideAnim = useRef(new Animated.Value(400)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // All animations use useNativeDriver: false to avoid conflicts
    const toggleAnim = useRef(new Animated.Value(0)).current;

    // Toggle animation only
    useEffect(() => {
        Animated.spring(toggleAnim, {
            toValue: type === 'income' ? 1 : 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
        }).start();
    }, [type]);

    // Categories section animation (height + opacity)
    const categoryAnim = useRef(new Animated.Value(1)).current;

    // Handle type change with smooth animated height
    const handleTypeChange = (newType: 'expense' | 'income') => {
        if (newType === type) return;

        Animated.timing(categoryAnim, {
            toValue: newType === 'expense' ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
        setType(newType);
    };

    const categoryHeight = categoryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 60],
    });

    const categoryOpacity = categoryAnim;

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            slideAnim.setValue(400);
            backdropAnim.setValue(0);

            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: false }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
                Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: false }),
            ]).start(() => setModalVisible(false));
        }
    }, [visible]);

    const handleSubmit = () => {
        if (amount && parseFloat(amount) > 0) {
            onAdd({
                amount: parseFloat(amount),
                description: description || (type === 'income' ? 'Income' : allCategories.find((c: any) => c.key === selectedCategory)?.label || 'Expense'),
                category: selectedCategory,
                type,
                date: transactionDate.toISOString().split('T')[0],
                merchant: vendor || undefined,
                paymentMethod,
                accountId: selectedAccount,
            });
            // Reset all fields
            setAmount('');
            setDescription('');
            setVendor('');
            setSelectedCategory('food');
            setPaymentMethod('upi');
            setPaymentMethod('upi');
            setTransactionDate(new Date());
            onClose();
        }
    };

    const bgColor = isDark ? colors.card : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
    const [toggleWidth, setToggleWidth] = useState(0);

    const indicatorLeft = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, toggleWidth > 0 ? (toggleWidth / 2) + 2 : 4],
    });

    const accentColor = type === 'expense' ? '#EF4444' : '#22C55E';

    return (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modal,
                        {
                            backgroundColor: bgColor,
                            paddingBottom: insets.bottom + spacing.lg,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={22} color={colors.textMuted} />
                        </Pressable>
                        <Typography variant="body" weight="semibold">New Transaction</Typography>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Animated Toggle */}
                    <View
                        style={[styles.toggleContainer, { backgroundColor: inputBg }]}
                        onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
                    >
                        <Animated.View
                            style={[
                                styles.toggleIndicator,
                                { backgroundColor: accentColor, left: indicatorLeft, width: toggleWidth > 0 ? (toggleWidth / 2) - 6 : '46%' }
                            ]}
                        />
                        <Pressable style={styles.toggleBtn} onPress={() => handleTypeChange('expense')}>
                            <Icon name="arrow-up" size={16} color={type === 'expense' ? '#FFF' : colors.textMuted} />
                            <Typography
                                variant="bodySmall"
                                weight="semibold"
                                style={{ color: type === 'expense' ? '#FFF' : colors.textMuted, marginLeft: 4 }}
                            >
                                Expense
                            </Typography>
                        </Pressable>
                        <Pressable style={styles.toggleBtn} onPress={() => handleTypeChange('income')}>
                            <Icon name="arrow-down" size={16} color={type === 'income' ? '#FFF' : colors.textMuted} />
                            <Typography
                                variant="bodySmall"
                                weight="semibold"
                                style={{ color: type === 'income' ? '#FFF' : colors.textMuted, marginLeft: 4 }}
                            >
                                Income
                            </Typography>
                        </Pressable>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.amountSection}>
                        <View style={styles.amountRow}>
                            <Typography variant="3xl" weight="bold" style={{ color: accentColor }}>₹</Typography>
                            <TextInput
                                style={[styles.amountInput, { color: colors.text }]}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>
                        <View style={[styles.amountLine, { backgroundColor: accentColor }]} />
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: inputBg, color: colors.text }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What's this for?"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>

                    {/* Category Selection - Animated height for smooth toggle */}
                    <Animated.View
                        style={[
                            styles.categoriesSection,
                            { height: categoryHeight, opacity: categoryOpacity, overflow: 'hidden' }
                        ]}
                        pointerEvents={type === 'expense' ? 'auto' : 'none'}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoriesScroll}
                        >
                            {allCategories.map((cat) => {
                                const isSelected = selectedCategory === cat.key;
                                return (
                                    <Pressable
                                        key={cat.key}
                                        onPress={() => setSelectedCategory(cat.key)}
                                        style={[
                                            styles.categoryChip,
                                            {
                                                backgroundColor: isSelected ? cat.color : inputBg,
                                                borderColor: isSelected ? cat.color : 'transparent',
                                            }
                                        ]}
                                    >
                                        <Typography variant="body">{cat.icon}</Typography>
                                    </Pressable>
                                );
                            })}
                            {/* Add Category Button */}
                            <Pressable
                                onPress={() => setShowAddCategory(true)}
                                style={[styles.categoryChip, styles.addCategoryBtn, { borderColor: colors.border }]}
                            >
                                <Icon name="plus" size={20} color={colors.textMuted} />
                            </Pressable>
                        </ScrollView>
                    </Animated.View>

                    {/* Add Category Modal */}
                    <AddCategoryModal
                        visible={showAddCategory}
                        onClose={() => setShowAddCategory(false)}
                        onAdd={(cat) => setSelectedCategory(cat.key)}
                    />

                    {/* Vendor/Merchant - For Expense */}
                    <Animated.View
                        style={[styles.inputGroup, { height: categoryHeight, opacity: categoryOpacity, overflow: 'hidden' }]}
                        pointerEvents={type === 'expense' ? 'auto' : 'none'}
                    >
                        <TextInput
                            style={[styles.textInput, { backgroundColor: inputBg, color: colors.text }]}
                            value={vendor}
                            onChangeText={setVendor}
                            placeholder="Vendor/Merchant (e.g., Swiggy)"
                            placeholderTextColor={colors.textMuted}
                        />
                    </Animated.View>

                    {/* Payment Method */}
                    <View style={styles.inputGroup}>
                        <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>Payment Method</Typography>
                        <View style={styles.paymentRow}>
                            {(['cash', 'upi', 'card', 'netbanking'] as const).map((pm) => (
                                <Pressable
                                    key={pm}
                                    style={[
                                        styles.paymentChip,
                                        { backgroundColor: paymentMethod === pm ? (pm === 'cash' ? '#22C55E' : pm === 'upi' ? '#3B82F6' : pm === 'card' ? '#8B5CF6' : '#F59E0B') : inputBg }
                                    ]}
                                    onPress={() => setPaymentMethod(pm)}
                                >
                                    <Typography variant="caption" weight={paymentMethod === pm ? 'semibold' : 'regular'} style={{ color: paymentMethod === pm ? '#FFF' : colors.text }}>
                                        {pm === 'netbanking' ? 'Bank' : pm.toUpperCase()}
                                    </Typography>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Account Selector */}
                    <View style={styles.inputGroup}>
                        <CustomDropdown
                            label="From Account"
                            placeholder="Select Account"
                            options={bankAccounts.map(acc => ({
                                label: acc.name,
                                value: acc.id,
                                icon: acc.icon,
                                subtitle: `₹${acc.balance.toLocaleString()}`
                            }))}
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                        />
                    </View>

                    {/* Date */}
                    <View style={styles.inputGroup}>
                        <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>Date</Typography>
                        <Pressable
                            style={[styles.textInput, { backgroundColor: inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Icon name="calendar" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
                            <Typography variant="body" weight="medium" style={{ color: colors.text }}>
                                {transactionDate.toLocaleDateString('default', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </Typography>
                        </Pressable>
                    </View>

                    {/* Submit Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.submitBtn,
                            { backgroundColor: accentColor, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                        ]}
                        onPress={handleSubmit}
                    >
                        <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>
                            Add {type === 'expense' ? 'Expense' : 'Income'}
                        </Typography>
                    </Pressable>
                </Animated.View>
            </KeyboardAvoidingView>

            <CustomDatePicker
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                date={transactionDate}
                onChange={setTransactionDate}
            />
        </Modal >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.lg },
    handle: { width: 40, height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 14,
        marginBottom: spacing.lg,
        position: 'relative',
        height: 52,
    },
    toggleIndicator: {
        position: 'absolute',
        top: 4,
        height: 44,
        borderRadius: 10,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    amountSection: { alignItems: 'center', marginBottom: spacing.lg },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
    amountInput: { fontSize: 48, fontWeight: '700', paddingHorizontal: 0, paddingVertical: 0, minWidth: 50 },
    amountLine: { width: 120, height: 3, borderRadius: 2, marginTop: spacing.sm },
    inputGroup: { marginBottom: spacing.md },
    textInput: { paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: 12, fontSize: 16, textAlign: 'center' },
    categoriesSection: { marginBottom: spacing.md },
    categoriesScroll: { paddingHorizontal: spacing.sm, gap: 10 },
    categoryChip: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addCategoryBtn: { borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent' },
    paymentRow: { flexDirection: 'row', gap: 8 },
    paymentChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    accountChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
});

export default AddTransactionModal;
