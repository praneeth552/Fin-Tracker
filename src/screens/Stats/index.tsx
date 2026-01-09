/**
 * Stats Screen - Analytics & Insights
 * =====================================
 * Vendors graph and Action Items only (budgets moved to Budget tab)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    useColorScheme,
    Animated,
    Easing,
    Modal,
    TextInput,
    Text,
    LayoutAnimation,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from '../../components/common';
import { MonthDropdown, MonthFilter } from '../../components/MonthDropdown';
import { useApp } from '../../context/AppContext';
import { themes, spacing } from '../../theme';

// Get merchants from transactions
const extractMerchants = (transactions: any[]) => {
    const merchantMap: Record<string, { amount: number; count: number }> = {};
    transactions
        .filter(t => t.type === 'expense' && t.merchant)
        .forEach(t => {
            if (!merchantMap[t.merchant]) {
                merchantMap[t.merchant] = { amount: 0, count: 0 };
            }
            merchantMap[t.merchant].amount += t.amount;
            merchantMap[t.merchant].count += 1;
        });

    return Object.entries(merchantMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
};

// Action Item with proper strike-through
const ActionItem: React.FC<{
    task: { id: string; title: string; desc: string; completed: boolean };
    onToggle: () => void;
    onDelete: () => void;
    cardBg: string;
    colors: any;
}> = ({ task, onToggle, onDelete, cardBg, colors }) => {
    const strikeAnim = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
    const [titleWidth, setTitleWidth] = useState(0);

    const handlePress = () => {
        Animated.timing(strikeAnim, {
            toValue: task.completed ? 0 : 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
        onToggle();
    };

    const strikeWidth = strikeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, titleWidth],
    });

    return (
        <Pressable onPress={handlePress} style={[styles.taskRow, { backgroundColor: cardBg }]}>
            <View style={[
                styles.checkbox,
                { borderColor: task.completed ? '#3B82F6' : colors.textMuted, backgroundColor: task.completed ? '#3B82F6' : 'transparent' }
            ]}>
                {task.completed && <Icon name="check" size={14} color="#FFF" />}
            </View>
            <View style={styles.taskContent}>
                <View style={{ flexDirection: 'row' }}>
                    <Text
                        style={{ position: 'absolute', opacity: 0, fontSize: 16, fontWeight: task.completed ? '400' : '600' }}
                        onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
                    >
                        {task.title}
                    </Text>
                    <View style={{ position: 'relative' }}>
                        <Typography variant="body" weight={task.completed ? 'regular' : 'semibold'} style={{ color: task.completed ? colors.textMuted : colors.text }}>
                            {task.title}
                        </Typography>
                        <Animated.View style={[styles.strikeLine, { width: strikeWidth, backgroundColor: colors.textMuted }]} />
                    </View>
                </View>
                <Typography variant="caption" color="secondary" numberOfLines={1}>{task.desc}</Typography>
            </View>
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
                <Icon name="close" size={16} color={colors.textMuted} />
            </Pressable>
        </Pressable>
    );
};

// Vendors Chart with horizontal bars - INTERACTIVE
const VendorsChart: React.FC<{
    vendors: { name: string; amount: number; count: number }[];
    isDark: boolean;
    colors: any;
    onVendorPress?: (vendor: { name: string; amount: number; count: number }) => void;
}> = ({ vendors, isDark, colors, onVendorPress }) => {
    const barAnims = useRef(vendors.map(() => new Animated.Value(0))).current;
    const maxAmount = Math.max(...vendors.map(v => v.amount), 1);

    useEffect(() => {
        vendors.forEach((_, i) => {
            Animated.timing(barAnims[i] || new Animated.Value(0), {
                toValue: 1,
                duration: 600,
                delay: i * 80,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        });
    }, [vendors]);

    if (vendors.length === 0) {
        return (
            <View style={styles.emptyVendors}>
                <Icon name="store-outline" size={32} color={colors.textMuted} />
                <Typography variant="caption" color="secondary" style={{ marginTop: 8 }}>No merchant data yet</Typography>
            </View>
        );
    }

    return (
        <View style={styles.vendorsChart}>
            {vendors.map((vendor, index) => {
                const widthPercent = (barAnims[index] || new Animated.Value(1)).interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${(vendor.amount / maxAmount) * 100}%`],
                });

                const isTop = index === 0;
                const barColor = isTop ? '#3B82F6' : ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][index % 4];

                return (
                    <Pressable
                        key={vendor.name}
                        style={({ pressed }) => [styles.vendorRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                        onPress={() => onVendorPress?.(vendor)}
                    >
                        <View style={styles.vendorInfo}>
                            <Typography variant="bodySmall" weight="medium">{vendor.name}</Typography>
                            <Typography variant="caption" color="secondary">{vendor.count} txn{vendor.count > 1 ? 's' : ''}</Typography>
                        </View>
                        <View style={[styles.vendorBarTrack, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                            <Animated.View
                                style={[styles.vendorBarFill, { width: widthPercent, backgroundColor: barColor }]}
                            />
                        </View>
                        <View style={styles.vendorAmount}>
                            <Typography variant="bodySmall" weight="semibold">
                                ₹{vendor.amount.toLocaleString()}
                            </Typography>
                            {isTop && (
                                <View style={styles.topBadge}>
                                    <Typography variant="caption" style={{ color: '#3B82F6', fontSize: 9 }}>TOP</Typography>
                                </View>
                            )}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
};

// Add Action Modal - Refined Design
const AddActionModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onAdd: (title: string, desc: string) => void;
}> = ({ visible, onClose, onAdd }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(300)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            setModalVisible(true);
            slideAnim.setValue(300);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
            ]).start(() => setModalVisible(false));
        }
    }, [visible]);

    const handleAdd = () => {
        if (title.trim()) {
            onAdd(title.trim(), desc.trim() || 'Personal goal');
            setTitle('');
            setDesc('');
            onClose();
        }
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F4F4F5';

    return (
        <Modal visible={modalVisible} transparent animationType="none">
            <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>
            <View style={styles.modalCenter}>
                <Animated.View
                    style={[
                        styles.addModal,
                        { backgroundColor: isDark ? colors.card : '#FFF', transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Header with Icon */}
                    <View style={styles.addModalHeader}>
                        <View style={styles.addModalIconBg}>
                            <Icon name="checkbox-marked-circle-plus-outline" size={28} color="#3B82F6" />
                        </View>
                        <Typography variant="lg" weight="semibold" style={{ marginTop: spacing.sm }}>
                            New Action Item
                        </Typography>
                        <Typography variant="caption" color="secondary">
                            Track a goal or reminder
                        </Typography>
                    </View>

                    {/* Title Input */}
                    <View style={styles.inputWrapper}>
                        <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 6 }}>
                            TITLE
                        </Typography>
                        <TextInput
                            style={[styles.refinedInput, { backgroundColor: inputBg, color: colors.text }]}
                            placeholder="e.g., Save ₹10k this month"
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                        />
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputWrapper}>
                        <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 6 }}>
                            DESCRIPTION (OPTIONAL)
                        </Typography>
                        <TextInput
                            style={[styles.refinedInput, { backgroundColor: inputBg, color: colors.text }]}
                            placeholder="Add more details..."
                            placeholderTextColor={colors.textMuted}
                            value={desc}
                            onChangeText={setDesc}
                        />
                    </View>

                    {/* Buttons */}
                    <View style={styles.addModalButtons}>
                        <Pressable
                            style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Typography variant="body" color="secondary">Cancel</Typography>
                        </Pressable>
                        <Pressable
                            style={[styles.modalAddBtn, { backgroundColor: '#3B82F6', opacity: title.trim() ? 1 : 0.5 }]}
                            onPress={handleAdd}
                            disabled={!title.trim()}
                        >
                            <Icon name="plus" size={18} color="#FFF" />
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF', marginLeft: 6 }}>
                                Add Task
                            </Typography>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const StatsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const bgColor = isDark ? colors.background : '#FAFAFA';
    const cardBg = isDark ? colors.card : '#FFFFFF';

    const { transactions, totalSpent, userData } = useApp();

    const [showAddAction, setShowAddAction] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<MonthFilter>('this');
    const [tasks, setTasks] = useState([
        { id: '1', title: 'Reduce food spending', desc: 'Set ₹6k monthly budget', completed: false },
        { id: '2', title: 'Cancel unused subscriptions', desc: 'Review all recurring payments', completed: false },
        { id: '3', title: 'Emergency fund goal', desc: 'Reach 3 months expenses', completed: false },
    ]);

    const merchants = extractMerchants(transactions);
    const savingsRate = userData.income > 0 ? Math.round(((userData.income - totalSpent) / userData.income) * 100) : 0;

    const toggleTask = (id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const addTask = (title: string, desc: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks(prev => [...prev, { id: Date.now().toString(), title, desc, completed: false }]);
    };

    // Vendor detail modal state
    const [selectedVendor, setSelectedVendor] = useState<{ name: string; amount: number; count: number } | null>(null);
    const vendorModalAnim = useRef(new Animated.Value(300)).current;
    const vendorBackdropAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (selectedVendor) {
            vendorModalAnim.setValue(300);
            vendorBackdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(vendorBackdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(vendorModalAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
            ]).start();
        }
    }, [selectedVendor]);

    const closeVendorModal = () => {
        Animated.parallel([
            Animated.timing(vendorBackdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(vendorModalAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        ]).start(() => setSelectedVendor(null));
    };

    const handleVendorPress = (vendor: { name: string; amount: number; count: number }) => {
        setSelectedVendor(vendor);
    };

    const vendorTransactions = selectedVendor
        ? transactions.filter(t => t.merchant === selectedVendor.name).slice(0, 5)
        : [];

    // Render vendor detail modal
    const renderVendorModal = () => {
        if (!selectedVendor) return null;

        return (
            <Modal visible={true} transparent animationType="none">
                <Animated.View style={[styles.modalBackdrop, { opacity: vendorBackdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeVendorModal} />
                </Animated.View>
                <View style={styles.modalCenter}>
                    <Animated.View
                        style={[
                            styles.vendorModal,
                            { backgroundColor: isDark ? colors.card : '#FFF', transform: [{ translateY: vendorModalAnim }] }
                        ]}
                    >
                        {/* Header */}
                        <View style={styles.vendorModalHeader}>
                            <View style={styles.vendorIconBg}>
                                <Icon name="store" size={28} color="#3B82F6" />
                            </View>
                            <Typography variant="lg" weight="semibold" style={{ marginTop: spacing.sm }}>
                                {selectedVendor.name}
                            </Typography>
                            <Typography variant="caption" color="secondary">
                                Merchant Details
                            </Typography>
                        </View>

                        {/* Stats Row */}
                        <View style={styles.vendorStatsRow}>
                            <View style={styles.vendorStat}>
                                <Typography variant="h2" weight="bold" style={{ color: '#EF4444' }}>
                                    ₹{selectedVendor.amount.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="secondary">Total Spent</Typography>
                            </View>
                            <View style={[styles.vendorStatDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.vendorStat}>
                                <Typography variant="h2" weight="bold">
                                    {selectedVendor.count}
                                </Typography>
                                <Typography variant="caption" color="secondary">Transactions</Typography>
                            </View>
                        </View>

                        {/* Recent Transactions */}
                        {vendorTransactions.length > 0 && (
                            <View style={styles.vendorTxnSection}>
                                <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 8 }}>
                                    RECENT
                                </Typography>
                                {vendorTransactions.map(txn => (
                                    <View key={txn.id} style={styles.vendorTxnRow}>
                                        <View>
                                            <Typography variant="bodySmall" weight="medium">{txn.description}</Typography>
                                            <Typography variant="caption" color="secondary">{txn.date}</Typography>
                                        </View>
                                        <Typography variant="bodySmall" weight="semibold" style={{ color: '#EF4444' }}>
                                            -₹{txn.amount.toLocaleString()}
                                        </Typography>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Close Button */}
                        <Pressable
                            style={[styles.vendorCloseBtn, { backgroundColor: '#3B82F6' }]}
                            onPress={closeVendorModal}
                        >
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>Done</Typography>
                        </Pressable>
                    </Animated.View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Typography variant="h2" weight="semibold">Analytics</Typography>
                <MonthDropdown value={selectedMonth} onChange={setSelectedMonth} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                        <Typography variant="caption" color="secondary">Total Spent</Typography>
                        <Typography variant="h2" weight="bold">₹{totalSpent.toLocaleString()}</Typography>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                        <Typography variant="caption" color="secondary">Savings Rate</Typography>
                        <Typography variant="h2" weight="bold" style={{ color: savingsRate > 0 ? '#22C55E' : '#EF4444' }}>{savingsRate}%</Typography>
                    </View>
                </View>

                {/* Top Merchants */}
                <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>TOP MERCHANTS</Typography>
                <View style={[styles.merchantsCard, { backgroundColor: cardBg }]}>
                    <VendorsChart vendors={merchants} isDark={isDark} colors={colors} onVendorPress={handleVendorPress} />
                </View>

                {/* Action Items */}
                <View style={styles.actionHeader}>
                    <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>ACTION ITEMS</Typography>
                    <Pressable onPress={() => setShowAddAction(true)} style={styles.addActionBtn}>
                        <Icon name="plus" size={16} color="#3B82F6" />
                        <Typography variant="caption" style={{ color: '#3B82F6', marginLeft: 4 }}>Add</Typography>
                    </Pressable>
                </View>
                {tasks.map(task => (
                    <ActionItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} cardBg={cardBg} colors={colors} />
                ))}
            </ScrollView>


            <AddActionModal visible={showAddAction} onClose={() => setShowAddAction(false)} onAdd={addTask} />
            {renderVendorModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    content: { paddingHorizontal: spacing.md },
    sectionLabel: { letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
    summaryRow: { flexDirection: 'row', gap: spacing.sm },
    summaryCard: { flex: 1, borderRadius: 16, padding: spacing.md },
    merchantsCard: { borderRadius: 16, padding: spacing.md },
    vendorsChart: { gap: 14 },
    vendorRow: { flexDirection: 'row', alignItems: 'center' },
    vendorInfo: { width: 75 },
    vendorBarTrack: { flex: 1, height: 10, borderRadius: 5, marginHorizontal: 10, overflow: 'hidden' },
    vendorBarFill: { height: '100%', borderRadius: 5 },
    vendorAmount: { width: 75, alignItems: 'flex-end' },
    topBadge: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
    emptyVendors: { alignItems: 'center', paddingVertical: spacing.xl },
    actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: spacing.xs },
    addActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
    taskRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 14, marginBottom: spacing.sm },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    taskContent: { flex: 1, marginRight: spacing.sm },
    strikeLine: { position: 'absolute', height: 1.5, top: '50%', left: 0 },
    deleteBtn: { padding: 6 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    addModal: { width: '100%', borderRadius: 24, padding: spacing.xl },
    addModalHeader: { alignItems: 'center', marginBottom: spacing.lg },
    addModalIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
    inputWrapper: { marginBottom: spacing.md },
    refinedInput: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 16 },
    addModalButtons: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    modalAddBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionInput: { marginTop: spacing.md, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 16 },
    addBtn: { marginTop: spacing.lg, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    // Vendor Modal Styles
    vendorModal: { width: '100%', borderRadius: 24, padding: spacing.xl },
    vendorModalHeader: { alignItems: 'center', marginBottom: spacing.lg },
    vendorIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(59, 130, 246, 0.12)', justifyContent: 'center', alignItems: 'center' },
    vendorStatsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
    vendorStat: { flex: 1, alignItems: 'center' },
    vendorStatDivider: { width: 1, height: 40, marginHorizontal: spacing.md },
    vendorTxnSection: { marginBottom: spacing.lg },
    vendorTxnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.2)' },
    vendorCloseBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: spacing.sm },
});

export default StatsScreen;
