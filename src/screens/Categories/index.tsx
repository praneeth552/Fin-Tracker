/**
 * Wallet Screen - Accounts & Budgets
 * =====================================
 * Combined view for bank accounts and category budgets
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, LayoutAnimation, Dimensions, Modal, TextInput, useColorScheme, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from '../../components/common';
import { useApp, BankAccount } from '../../context/AppContext';
import { themes, spacing } from '../../theme';

const categoryInfo: Record<string, { label: string; icon: string; color: string }> = {
    food: { label: 'Food & Dining', icon: '🍽️', color: '#3B82F6' },
    transport: { label: 'Transportation', icon: '🚗', color: '#8B5CF6' },
    shopping: { label: 'Shopping', icon: '🛒', color: '#EC4899' },
    bills: { label: 'Bills & Utilities', icon: '📄', color: '#10B981' },
    entertainment: { label: 'Entertainment', icon: '🎬', color: '#F59E0B' },
    health: { label: 'Health', icon: '💊', color: '#EF4444' },
    misc: { label: 'Miscellaneous', icon: '📌', color: '#6B7280' },
};

// Budget Edit Modal
const BudgetEditModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    budget: { category: string; limit: number; spent: number } | null;
    onSave: (category: string, limit: number) => void;
}> = ({ visible, onClose, budget, onSave }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const [value, setValue] = useState(budget?.limit || 5000);
    const info = budget ? categoryInfo[budget.category] : null;

    useEffect(() => {
        if (budget) setValue(budget.limit);
    }, [budget]);

    const handleSave = () => {
        if (budget) onSave(budget.category, value);
        onClose();
    };

    const percentage = budget ? Math.min((budget.spent / value) * 100, 100) : 0;
    const isOver = budget ? budget.spent > value : false;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        {budget && info && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalIcon, { backgroundColor: info.color + '20' }]}>
                                        <Typography variant="h3">{info.icon}</Typography>
                                    </View>
                                    <Typography variant="body" weight="semibold" style={{ marginTop: spacing.sm }}>
                                        {info.label}
                                    </Typography>
                                </View>

                                {/* Tappable Amount Input */}
                                <Pressable
                                    style={[styles.amountInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' }]}
                                    onPress={() => {/* Focus handled by TextInput */ }}
                                >
                                    <Typography variant="body" style={{ color: info.color }}>₹</Typography>
                                    <TextInput
                                        style={[styles.amountInput, { color: colors.text }]}
                                        value={value.toString()}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                            if (!isNaN(num)) setValue(Math.min(Math.max(num, 1000), 25000));
                                        }}
                                        keyboardType="number-pad"
                                        selectTextOnFocus
                                    />
                                </Pressable>
                                <Typography variant="caption" color="secondary" align="center">
                                    tap to edit • monthly budget limit
                                </Typography>

                                <Slider
                                    style={styles.slider}
                                    minimumValue={1000}
                                    maximumValue={25000}
                                    step={500}
                                    value={value}
                                    onValueChange={setValue}
                                    minimumTrackTintColor={info.color}
                                    maximumTrackTintColor={isDark ? '#3F3F46' : '#E4E4E7'}
                                    thumbTintColor={info.color}
                                />

                                <View style={styles.sliderLabels}>
                                    <Typography variant="caption" color="secondary">₹1k</Typography>
                                    <Typography variant="caption" color="secondary">₹25k</Typography>
                                </View>

                                <View style={[styles.progressBox, { backgroundColor: isDark ? '#1A1A1D' : '#F4F4F5' }]}>
                                    <View style={styles.progressRow}>
                                        <Typography variant="caption" color="secondary">Spent this month</Typography>
                                        <Typography variant="bodySmall" weight="semibold" style={{ color: isOver ? '#EF4444' : colors.text }}>
                                            ₹{budget.spent.toLocaleString()}
                                        </Typography>
                                    </View>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                                        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: isOver ? '#EF4444' : info.color }]} />
                                    </View>
                                    <Typography variant="caption" style={{ color: isOver ? '#EF4444' : '#22C55E', marginTop: 4 }}>
                                        {isOver ? `₹${(budget.spent - value).toLocaleString()} over budget` : `₹${(value - budget.spent).toLocaleString()} remaining`}
                                    </Typography>
                                </View>

                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={onClose}>
                                        <Typography variant="body" color="secondary">Cancel</Typography>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, { backgroundColor: info.color }]} onPress={handleSave}>
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

// Animated Progress Bar
const AnimatedProgressBar: React.FC<{
    progress: number;
    color: string;
    bgColor: string;
    delay?: number;
}> = ({ progress, color, bgColor, delay = 0 }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: Math.min(progress, 100),
            duration: 800,
            delay,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const width = widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[styles.progressBarTrack, { backgroundColor: bgColor }]}>
            <Animated.View style={[styles.progressBarFill, { width, backgroundColor: color }]} />
        </View>
    );
};

// Add Account Modal
const accountTypes = [
    { key: 'bank', label: 'Bank', icon: '🏦' },
    { key: 'wallet', label: 'Wallet', icon: '📱' },
    { key: 'card', label: 'Card', icon: '💳' },
    { key: 'cash', label: 'Cash', icon: '💵' },
];

const accountIcons = ['🏦', '💳', '📱', '💵', '🪙', '💰', '🏧', '💎'];



const AddAccountModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onAdd: (account: Omit<BankAccount, 'id'>) => void;
    onUpdate?: (id: string, data: Partial<BankAccount>) => void;
    onDelete?: (id: string) => void;
    editingAccount?: BankAccount | null;
}> = ({ visible, onClose, onAdd, onUpdate, onDelete, editingAccount }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [name, setName] = useState('');
    const [type, setType] = useState<'bank' | 'wallet' | 'card' | 'cash'>('bank');
    const [balance, setBalance] = useState('');
    const [icon, setIcon] = useState('🏦');

    // Internal state for managing exit animation
    const [showModal, setShowModal] = useState(visible);
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: Dimensions.get('window').height,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowModal(false));
        }
    }, [visible]);

    // Effect to pre-fill data when editing
    useEffect(() => {
        if (visible) {
            if (editingAccount) {
                setName(editingAccount.name);
                setType(editingAccount.type);
                setBalance(editingAccount.balance.toString());
                setIcon(editingAccount.icon);
            } else {
                // Reset for add mode
                setName('');
                setType('bank');
                setBalance('');
                setIcon('🏦');
            }
        }
    }, [visible, editingAccount]);

    const handleSubmit = () => {
        if (name.trim() && balance) {
            const numericBalance = parseFloat(balance) || 0;

            if (editingAccount && onUpdate) {
                onUpdate(editingAccount.id, {
                    name: name.trim(),
                    type,
                    icon,
                    balance: numericBalance,
                });
            } else {
                onAdd({
                    name: name.trim(),
                    type,
                    icon,
                    balance: numericBalance,
                });
            }
            onClose();
        }
    };

    const handleDelete = () => {
        if (editingAccount && onDelete) {
            Alert.alert(
                "Delete Account",
                "Are you sure you want to delete this account?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            onDelete(editingAccount.id);
                            onClose();
                        }
                    }
                ]
            );
        }
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F4F4F5';

    if (!showModal) return null;

    return (
        <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: isDark ? '#18181B' : '#FFF',
                            transform: [{ translateY: slideAnim }],
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingBottom: 40,
                            borderWidth: 1,
                            borderColor: isDark ? '#27272A' : 'transparent',
                            borderRadius: 0, // Override default borderRadius for slide up
                        }
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <Typography variant="h3" weight="semibold">{editingAccount ? 'Edit Account' : 'Add Account'}</Typography>
                        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                            {editingAccount && (
                                <Pressable onPress={handleDelete} style={{ padding: 4 }}>
                                    <Icon name="delete-outline" size={20} color="#EF4444" />
                                </Pressable>
                            )}
                            <Pressable onPress={onClose} style={{ padding: 4 }}>
                                <Icon name="close" size={20} color={colors.textMuted} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Account Name */}
                    <View style={{ marginBottom: spacing.md }}>
                        <Typography variant="caption" weight="medium" color="secondary" style={{ marginBottom: 6, letterSpacing: 0.5 }}>ACCOUNT NAME</Typography>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. HDFC Savings"
                            placeholderTextColor={colors.textMuted}
                            autoFocus
                        />
                    </View>

                    {/* Account Type */}
                    <View style={{ marginBottom: spacing.md }}>
                        <Typography variant="caption" weight="medium" color="secondary" style={{ marginBottom: 6, letterSpacing: 0.5 }}>ACCOUNT TYPE</Typography>
                        <View style={styles.typeGrid}>
                            {accountTypes.map((t) => (
                                <Pressable
                                    key={t.key}
                                    style={[
                                        styles.typeOption,
                                        {
                                            backgroundColor: type === t.key ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                                            borderColor: type === t.key ? '#3B82F6' : (isDark ? '#27272A' : '#E4E4E7')
                                        }
                                    ]}
                                    onPress={() => { setType(t.key as any); setIcon(t.icon); }}
                                >
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#000' : '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                                        <Typography variant="lg">{t.icon}</Typography>
                                    </View>
                                    <Typography variant="caption" weight={type === t.key ? 'semibold' : 'medium'} style={{ color: type === t.key ? colors.text : colors.textSecondary }}>{t.label}</Typography>
                                    {type === t.key && <View style={styles.selectedCheck}><Icon name="check" size={10} color="#FFF" /></View>}
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Opening Balance */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Typography variant="caption" weight="medium" color="secondary" style={{ marginBottom: 6, letterSpacing: 0.5 }}>OPENING BALANCE</Typography>
                        <View style={[styles.balanceInputRow, { backgroundColor: inputBg }]}>
                            <Typography variant="h3" weight="bold" color="secondary">₹</Typography>
                            <TextInput
                                style={[styles.balanceInput, { color: colors.text }]}
                                value={balance}
                                onChangeText={setBalance}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <Pressable style={[styles.cancelBtn, { borderColor: isDark ? '#27272A' : '#E4E4E7' }]} onPress={onClose}>
                            <Typography variant="body" weight="medium" color="secondary">Cancel</Typography>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.saveBtn,
                                { backgroundColor: name && balance ? '#3B82F6' : (isDark ? '#27272A' : '#E4E4E7') }
                            ]}
                            onPress={handleSubmit}
                            disabled={!name || !balance}
                        >
                            <Typography variant="body" weight="semibold" style={{ color: name && balance ? '#FFF' : colors.textMuted }}>{editingAccount ? 'Update Account' : 'Create Account'}</Typography>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const CategoriesScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const {
        budgets, updateBudget,
        bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount,
        totalSpent, totalIncome
    } = useApp();

    const [activeTab, setActiveTab] = useState<'accounts' | 'budgets'>('accounts');
    const [selectedBudget, setSelectedBudget] = useState<{ category: string; limit: number; spent: number } | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);

    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
    const usedPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const handleEdit = (budget: { category: string; limit: number; spent: number }) => {
        setSelectedBudget(budget);
        setShowModal(true);
    };

    const handleSave = (category: string, limit: number) => {
        updateBudget(category, limit);
    };

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    // Tab toggle animation
    const tabAnim = useRef(new Animated.Value(0)).current;
    // Content fade animation
    const contentFadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        Animated.spring(tabAnim, {
            toValue: activeTab === 'accounts' ? 0 : 1,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    }, [activeTab]);

    const handleTabChange = (tab: 'accounts' | 'budgets') => {
        if (activeTab === tab) return;

        Animated.timing(contentFadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(tab);
            Animated.timing(contentFadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const bgLeft = tabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 4 + (useRef(0).current / 2)], // Will need layout measurement
    });

    const [tabLayout, setTabLayout] = useState({ width: 0 });

    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9F9FB', paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Typography variant="h1" weight="bold">Wallet</Typography>
                <Typography variant="body" color="secondary">Manage your funds</Typography>
            </View>

            {/* Tab Toggle */}
            <View
                style={[styles.tabContainer, {
                    backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                    borderWidth: 1,
                    borderColor: isDark ? '#3F3F46' : 'rgba(0,0,0,0.05)'
                }]}
                onLayout={(e) => setTabLayout({ width: e.nativeEvent.layout.width })}
            >
                {/* Animated Background */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 4,
                        bottom: 4,
                        left: 4,
                        width: (tabLayout.width - 8) / 2,
                        backgroundColor: isDark ? '#3F3F46' : '#FFFFFF',
                        borderRadius: 10,
                        transform: [{
                            translateX: tabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, (tabLayout.width - 8) / 2]
                            })
                        }],
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.3 : 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                    }}
                />

                <Pressable
                    style={styles.tab}
                    onPress={() => handleTabChange('accounts')}
                >
                    <Icon name="wallet-outline" size={18} color={activeTab === 'accounts' ? (isDark ? '#FFF' : colors.text) : colors.textMuted} />
                    <Typography variant="body" weight={activeTab === 'accounts' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'accounts' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>Accounts</Typography>
                </Pressable>
                <Pressable
                    style={styles.tab}
                    onPress={() => handleTabChange('budgets')}
                >
                    <Icon name="chart-pie" size={18} color={activeTab === 'budgets' ? (isDark ? '#FFF' : colors.text) : colors.textMuted} />
                    <Typography variant="body" weight={activeTab === 'budgets' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'budgets' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>Budgets</Typography>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: contentFadeAnim }}>
                    {/* ACCOUNTS TAB */}
                    {activeTab === 'accounts' && (
                        <>
                            {/* Total Balance Card */}
                            <Animated.View style={[styles.overviewCard, { backgroundColor: isDark ? colors.card : '#FFF', opacity: fadeAnim }]}>
                                <Typography variant="caption" color="secondary">Total Balance</Typography>
                                <Typography variant="3xl" weight="bold">
                                    ₹{bankAccounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
                                    {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                                </Typography>
                            </Animated.View>

                            {/* Accounts List */}
                            <View style={styles.sectionRow}>
                                <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>YOUR ACCOUNTS</Typography>
                                <Pressable onPress={() => { setSelectedAccount(null); setShowAddAccount(true); }} style={styles.addBtn}>
                                    <Icon name="plus" size={16} color={colors.primary} />
                                    <Typography variant="caption" weight="semibold" style={{ color: colors.primary, marginLeft: 4 }}>Add</Typography>
                                </Pressable>
                            </View>

                            {bankAccounts.map((account) => (
                                <Pressable
                                    key={account.id}
                                    style={({ pressed }) => [
                                        styles.accountCard,
                                        {
                                            backgroundColor: isDark ? '#18181B' : '#FFF',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#27272A' : colors.border,
                                            opacity: pressed ? 0.7 : 1
                                        }
                                    ]}
                                    onPress={() => { setSelectedAccount(account); setShowAddAccount(true); }}
                                >
                                    <View style={[styles.accountIcon, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                                        <Typography variant="lg">{account.icon}</Typography>
                                    </View>
                                    <View style={styles.accountInfo}>
                                        <Typography variant="body" weight="medium">{account.name}</Typography>
                                        <Typography variant="caption" color="secondary" style={{ textTransform: 'capitalize' }}>{account.type}</Typography>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Typography variant="body" weight="semibold">₹{account.balance.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="secondary" style={{ fontSize: 10 }}>tap to edit</Typography>
                                    </View>
                                </Pressable>
                            ))}
                        </>
                    )}

                    {/* BUDGETS TAB */}
                    {activeTab === 'budgets' && (
                        <>
                            {/* Overview Card */}
                            <Animated.View style={[styles.overviewCard, { backgroundColor: isDark ? colors.card : '#FFF', opacity: fadeAnim }]}>
                                <View style={styles.overviewRow}>
                                    <View style={styles.overviewItem}>
                                        <Typography variant="caption" color="secondary">Total Spent</Typography>
                                        <Typography variant="h2" weight="bold">₹{totalSpent.toLocaleString()}</Typography>
                                    </View>
                                    <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.overviewItem}>
                                        <Typography variant="caption" color="secondary">Total Budget</Typography>
                                        <Typography variant="h2" weight="bold">₹{totalBudget.toLocaleString()}</Typography>
                                    </View>
                                </View>

                                <View style={styles.overviewProgress}>
                                    <AnimatedProgressBar
                                        progress={usedPercentage}
                                        color={usedPercentage > 100 ? '#EF4444' : '#3B82F6'}
                                        bgColor={isDark ? '#27272A' : '#E4E4E7'}
                                        delay={200}
                                    />
                                    <Typography variant="caption" color="secondary" style={{ marginTop: 6 }}>
                                        {usedPercentage}% of budget used
                                    </Typography>
                                </View>
                            </Animated.View>

                            {/* Categories List */}
                            <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>
                                CATEGORIES
                            </Typography>

                            {budgets.map((budget, index) => {
                                const info = categoryInfo[budget.category];
                                if (!info) return null;
                                const percent = Math.round((budget.spent / budget.limit) * 100);
                                const isOver = budget.spent > budget.limit;

                                return (
                                    <Pressable
                                        key={budget.category}
                                        style={({ pressed }) => [
                                            styles.categoryCard,
                                            { backgroundColor: isDark ? colors.card : '#FFF', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                                        ]}
                                        onPress={() => handleEdit(budget)}
                                    >
                                        <View style={[styles.categoryIcon, { backgroundColor: info.color + '15' }]}>
                                            <Typography variant="lg">{info.icon}</Typography>
                                        </View>
                                        <View style={styles.categoryContent}>
                                            <View style={styles.categoryHeader}>
                                                <Typography variant="body" weight="medium">{info.label}</Typography>
                                                <Typography variant="bodySmall" weight="semibold" style={{ color: isOver ? '#EF4444' : colors.text }}>
                                                    {percent}%
                                                </Typography>
                                            </View>
                                            <Typography variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                                                ₹{budget.spent.toLocaleString()} of ₹{budget.limit.toLocaleString()}
                                            </Typography>
                                            <AnimatedProgressBar
                                                progress={percent}
                                                color={isOver ? '#EF4444' : info.color}
                                                bgColor={isDark ? '#27272A' : '#E4E4E7'}
                                                delay={100 + index * 50}
                                            />
                                        </View>
                                        <Icon name="chevron-right" size={20} color={colors.textMuted} />
                                    </Pressable>
                                );
                            })}
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Edit Budget Modal */}
            <BudgetEditModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                budget={selectedBudget}
                onSave={handleSave}
            />

            {/* Add Account Modal */}
            <AddAccountModal
                visible={showAddAccount}
                onClose={() => setShowAddAccount(false)}
                onAdd={(account) => { addBankAccount(account); setShowAddAccount(false); }}
                onUpdate={(id, data) => { updateBankAccount(id, data); setShowAddAccount(false); }}
                onDelete={(id) => { deleteBankAccount(id); setShowAddAccount(false); }}
                editingAccount={selectedAccount}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    content: { paddingHorizontal: spacing.md },
    overviewCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.lg },
    overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
    overviewItem: { flex: 1 },
    overviewDivider: { width: 1, marginHorizontal: spacing.lg },
    overviewProgress: { marginTop: spacing.lg },
    sectionLabel: { letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.xs },
    categoryCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, marginBottom: spacing.sm },
    categoryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    categoryContent: { flex: 1, marginRight: spacing.sm },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    progressBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    // Modal & Inputs
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', borderRadius: 24, padding: spacing.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    modalIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    input: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15 },

    // Type Grid
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeOption: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, position: 'relative' },
    selectedCheck: { position: 'absolute', top: -6, right: -6, backgroundColor: '#3B82F6', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

    // Balance Input
    balanceInputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    balanceInput: { flex: 1, fontSize: 20, fontWeight: '600', marginLeft: 8 },

    // Actions
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Old styles to keep standard stuff
    slider: { width: '100%', height: 40, marginTop: spacing.md },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    progressBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: 12 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, padding: spacing.md, borderRadius: 12 },
    amountInput: { fontSize: 32, fontWeight: '700', textAlign: 'center', minWidth: 100 },

    // Tab Toggle
    tabContainer: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, padding: 4, borderRadius: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },

    // Accounts Section
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
    accountCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, marginBottom: spacing.sm },
    accountIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    accountInfo: { flex: 1 },
});

export default CategoriesScreen;
