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
    RefreshControl,
    Dimensions,
} from 'react-native';
import { generateInsights, Insight } from '../../utils/insights';
import { PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from '../../components/common';
import { MonthDropdown, MonthFilter } from '../../components/MonthDropdown';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { themes, spacing } from '../../theme';

// Get merchants from transactions - extracts from description
const extractMerchants = (transactions: any[]) => {
    const merchantMap: Record<string, { amount: number; count: number }> = {};

    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            // Use merchant field if available, otherwise extract from description
            let merchantName = t.merchant || t.description || 'Unknown';

            // Clean up merchant name - take first meaningful part
            merchantName = merchantName.split(' - ')[0].split(' at ')[1] || merchantName.split(' - ')[0];
            merchantName = merchantName.trim();

            // Skip very generic descriptions
            if (!merchantName || merchantName.toLowerCase() === 'expense') return;

            if (!merchantMap[merchantName]) {
                merchantMap[merchantName] = { amount: 0, count: 0 };
            }
            merchantMap[merchantName].amount += t.amount;
            merchantMap[merchantName].count += 1;
        });

    return Object.entries(merchantMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
};

// Action Item with proper strike-through
const ActionItem: React.FC<{
    task: { id: string | number; title: string; desc: string; completed: boolean };
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
        <Pressable onPress={handlePress} style={[styles.taskRow, { backgroundColor: cardBg, opacity: task.completed ? 0.5 : 1 }]}>
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

    const { filteredTransactions, totalSpent, userData, refreshData, selectedMonth, selectedYear, setSelectedMonth } = useApp();
    const { t } = useLanguage();

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    };

    const [showAddAction, setShowAddAction] = useState(false);
    // Convert global month to MonthFilter type for dropdown compatibility
    const now = new Date();
    const isThisMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    const [monthFilter, setMonthFilter] = useState<MonthFilter>(isThisMonth ? 'this' : 'prev');
    const [tasks, setTasks] = useState<{ id: string | number; title: string; desc: string; completed: boolean }[]>([]);

    const handleMonthChange = (filter: MonthFilter) => {
        setMonthFilter(filter);
        const date = new Date();
        if (filter === 'this') {
            setSelectedMonth(date.getMonth() + 1, date.getFullYear());
        } else {
            const prevMonth = date.getMonth() === 0 ? 12 : date.getMonth();
            const prevYear = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
            setSelectedMonth(prevMonth, prevYear);
        }
    };

    const merchants = extractMerchants(filteredTransactions);

    // Calculate actual income from transactions of this month
    const actualIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const actualExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const savingsRate = actualIncome > 0 ? Math.round(((actualIncome - actualExpenses) / actualIncome) * 100) : 0;

    const toggleTask = (id: string | number) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: string | number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const addTask = (title: string, desc: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks(prev => [...prev, { id: Date.now().toString(), title, desc, completed: false }]);
    };

    // Dynamic Suggestions based on spending analysis
    useEffect(() => {
        const newTasks: { id: string; title: string; desc: string; completed: boolean }[] = [];

        // Get spending by category
        const categorySpending: Record<string, number> = {};
        filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'misc';
            categorySpending[cat] = (categorySpending[cat] || 0) + t.amount;
        });

        // Find highest spending category
        const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];

        // Suggestion 1: High spending alert (>80% of income spent)
        if (actualIncome > 0 && actualExpenses > actualIncome * 0.8) {
            newTasks.push({
                id: 's1',
                title: '⚠️ High Spending Alert',
                desc: `You've spent ${Math.round((actualExpenses / actualIncome) * 100)}% of your income`,
                completed: false
            });
        }

        // Suggestion 2: Savings rate improvement
        if (actualIncome > 0 && savingsRate < 20 && savingsRate >= 0) {
            const targetSavings = Math.round(actualIncome * 0.2);
            const currentSavings = actualIncome - actualExpenses;
            newTasks.push({
                id: 's2',
                title: '💰 Boost Your Savings',
                desc: `Try to save ₹${(targetSavings - currentSavings).toLocaleString()} more this month`,
                completed: false
            });
        }

        // Suggestion 3: Top spending category alert
        if (topCategory && topCategory[1] > actualIncome * 0.3 && actualIncome > 0) {
            newTasks.push({
                id: 's3',
                title: `🔍 Review ${topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1)} Spending`,
                desc: `${Math.round((topCategory[1] / actualIncome) * 100)}% of income spent here`,
                completed: false
            });
        }

        // Suggestion 4: Top merchant spending
        const topMerchant = merchants[0];
        if (topMerchant && topMerchant.amount > 3000) {
            newTasks.push({
                id: 's4',
                title: `📊 ${topMerchant.name} Analysis`,
                desc: `₹${topMerchant.amount.toLocaleString()} spent across ${topMerchant.count} transactions`,
                completed: false
            });
        }

        // Suggestion 5: No income tracked
        if (actualIncome === 0 && filteredTransactions.length > 0) {
            newTasks.push({
                id: 's5',
                title: '📝 Add Your Income',
                desc: 'Track salary/income for better insights',
                completed: false
            });
        }

        // Great job message if everything looks healthy
        if (newTasks.length === 0 && filteredTransactions.length > 0) {
            if (savingsRate >= 20) {
                newTasks.push({
                    id: 's6',
                    title: '🎉 Great Savings!',
                    desc: `You're saving ${savingsRate}% of your income`,
                    completed: true
                });
            } else {
                newTasks.push({
                    id: 's7',
                    title: '✅ Keep it up!',
                    desc: 'Your spending looks healthy',
                    completed: true
                });
            }
        }

        setTasks(prev => {
            // Keep user added tasks (numeric IDs from Date.now()) and merge with suggestions
            const userTasks = prev.filter(t => !t.id.toString().startsWith('s'));
            return [...newTasks, ...userTasks];
        });
    }, [actualIncome, actualExpenses, savingsRate, merchants.length, filteredTransactions]);





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
        ? filteredTransactions.filter((t: any) => t.merchant === selectedVendor.name).slice(0, 5)
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
                <Typography variant="h2" weight="semibold">{t('stats.analytics') || 'Analytics'}</Typography>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MonthDropdown value={monthFilter} onChange={handleMonthChange} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                        <Typography variant="caption" color="secondary">{t('stats.totalSpent') || 'Total Spent'}</Typography>
                        <Typography variant="h2" weight="bold">₹{totalSpent.toLocaleString()}</Typography>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                        <Typography variant="caption" color="secondary">{t('stats.savingsRate') || 'Savings Rate'}</Typography>
                        <Typography variant="h2" weight="bold" style={{ color: savingsRate > 0 ? '#22C55E' : '#EF4444' }}>{savingsRate}%</Typography>
                    </View>
                </View>

                {/* Spending by Category (Pie Chart) */}


                {/* Top Merchants */}
                <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>{t('stats.topMerchants')?.toUpperCase() || 'TOP MERCHANTS'}</Typography>
                <View style={[styles.merchantsCard, { backgroundColor: cardBg }]}>
                    <VendorsChart vendors={merchants} isDark={isDark} colors={colors} onVendorPress={handleVendorPress} />
                </View>

                {/* Action Items (Dynamic Insights) */}
                <View style={styles.actionHeader}>
                    <Typography variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>{t('stats.actionItems')?.toUpperCase() || 'INSIGHTS & ACTIONS'}</Typography>
                </View>

                {(() => {
                    const insights = generateInsights(filteredTransactions, []); // Pass budgets if available in context
                    // If no insights, maybe show a default 'All good' message?
                    if (insights.length === 0) {
                        return (
                            <View style={[styles.taskRow, { backgroundColor: cardBg, padding: 16, justifyContent: 'center', alignItems: 'center' }]}>
                                <Icon name="check-circle-outline" size={24} color={colors.success || '#10B981'} />
                                <Typography variant="body" weight="medium" style={{ marginTop: 8 }}>{t('stats.spendingHealthy') || 'Spending looks healthy!'}</Typography>
                            </View>
                        );
                    }

                    return insights.map((insight: Insight) => (
                        <View key={insight.id} style={[styles.taskRow, { backgroundColor: cardBg, borderLeftWidth: 4, borderLeftColor: insight.type === 'alert' ? '#EF4444' : insight.type === 'warning' ? '#F59E0B' : '#3B82F6' }]}>
                            <View style={{ marginRight: 12 }}>
                                <Icon name={insight.icon} size={24} color={insight.type === 'alert' ? '#EF4444' : insight.type === 'warning' ? '#F59E0B' : '#3B82F6'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Typography variant="body" weight="semibold" style={{ textDecorationLine: 'none' }}>{insight.title}</Typography>
                                <Typography variant="caption" color="secondary">{insight.description}</Typography>
                            </View>
                        </View>
                    ));
                })()}

                <View style={{ height: 20 }} />
            </ScrollView >


            <AddActionModal visible={showAddAction} onClose={() => setShowAddAction(false)} onAdd={addTask} />
            {renderVendorModal()}
        </View >
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
