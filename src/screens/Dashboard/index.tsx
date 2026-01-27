/**
 * Dashboard Screen - Connected to Global State
 * ==============================================
 * Uses AppContext for real data and editable balance
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    useColorScheme,
    StatusBar,
    Animated,
    RefreshControl,
    TextInput,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    // Only enable if NOT on New Architecture (Fabric) to avoid warnings
    // @ts-ignore
    if (!global?.nativeFabricUIManager) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from '../../components/common';
import { CategoryPieChart } from '../../components/charts';
import { AutoTrackingModal } from '../../components/AutoTrackingModal';
import { DetectedAccountModal } from '../../components/DetectedAccountModal';
import { UncategorizedTransactions } from '../../components/UncategorizedTransactions';
import { MonthDropdown, MonthFilter } from '../../components/MonthDropdown';
import { CategorySelectionModal } from '../../components/CategorySelectionModal';

import { MerchantRulesService } from '../../services/MerchantRulesService';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { themes, spacing } from '../../theme';


const HEADER_MAX_HEIGHT = 100;
const HEADER_MIN_HEIGHT = 60;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Edit Balance Modal
const EditBalanceModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    currentBalance: number;
    currentIncome: number;
    onSave: (balance: number, income: number) => void;
}> = ({ visible, onClose, currentBalance, currentIncome, onSave }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [balance, setBalance] = useState(currentBalance.toString());
    const [income, setIncome] = useState(currentIncome.toString());

    useEffect(() => {
        setBalance(currentBalance.toString());
        setIncome(currentIncome.toString());
    }, [currentBalance, currentIncome]);

    const handleSave = () => {
        onSave(parseFloat(balance) || 0, parseFloat(income) || 0);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Typography variant="h3" weight="semibold" align="center">Edit Finances</Typography>

                        <View style={styles.inputGroup}>
                            <Typography variant="caption" color="secondary">Current Balance</Typography>
                            <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Typography variant="body" color="secondary">₹</Typography>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={balance}
                                    onChangeText={setBalance}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Typography variant="caption" color="secondary">Monthly Income</Typography>
                            <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Typography variant="body" color="secondary">₹</Typography>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={income}
                                    onChangeText={setIncome}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <Pressable
                            style={[styles.saveBtn, { backgroundColor: '#3B82F6' }]}
                            onPress={handleSave}
                        >
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>Save</Typography>
                        </Pressable>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

// Skeleton Loader - Matches actual Dashboard layout precisely
const SkeletonLoader: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const colors = isDark ? themes.dark : themes.light;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Better contrast skeleton colors for visibility
    const skeletonBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const cardBg = isDark ? colors.card : '#FFFFFF';
    const containerBg = isDark ? colors.background : '#F0F8FF';

    const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => (
        <Animated.View style={[{ width, height, backgroundColor: skeletonBg, borderRadius: 8, opacity: pulseAnim }, style]} />
    );

    return (
        <View style={[styles.skeletonContainer, { backgroundColor: containerBg }]}>
            {/* Header: Greeting + Month Selector */}
            <View style={styles.skeletonHeader}>
                <View>
                    <SkeletonBox width={80} height={12} style={{ marginBottom: 6 }} />
                    <SkeletonBox width={140} height={28} />
                </View>
                <SkeletonBox width={100} height={32} style={{ borderRadius: 16 }} />
            </View>

            {/* Balance Card */}
            <View style={[styles.skeletonBalanceCard, { backgroundColor: cardBg }]}>
                <SkeletonBox width={100} height={14} style={{ marginBottom: 12 }} />
                <SkeletonBox width={180} height={36} style={{ marginBottom: 16 }} />
                {/* Income / Expenses Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: skeletonBg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <SkeletonBox width={32} height={32} style={{ borderRadius: 10, marginRight: 8 }} />
                        <View>
                            <SkeletonBox width={50} height={10} style={{ marginBottom: 4 }} />
                            <SkeletonBox width={80} height={16} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <SkeletonBox width={32} height={32} style={{ borderRadius: 10, marginRight: 8 }} />
                        <View>
                            <SkeletonBox width={60} height={10} style={{ marginBottom: 4 }} />
                            <SkeletonBox width={70} height={16} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Spending Overview Section */}
            <View style={{ marginBottom: spacing.lg }}>
                <SkeletonBox width={140} height={14} style={{ marginBottom: 16 }} />
                <View style={[styles.skeletonSpendingCard, { backgroundColor: cardBg }]}>
                    {/* Pie Chart placeholder */}
                    <View style={{ flexDirection: 'row' }}>
                        <SkeletonBox width={120} height={120} style={{ borderRadius: 60 }} />
                        <View style={{ flex: 1, marginLeft: 20 }}>
                            {[1, 2, 3, 4].map((i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <SkeletonBox width={12} height={12} style={{ borderRadius: 6, marginRight: 8 }} />
                                    <SkeletonBox width={60} height={10} style={{ marginRight: 8 }} />
                                    <SkeletonBox width={40} height={12} />
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: spacing.md, gap: 8 }}>
                <SkeletonBox width={'48%' as any} height={40} style={{ borderRadius: 12 }} />
                <SkeletonBox width={'48%' as any} height={40} style={{ borderRadius: 12 }} />
            </View>

            {/* Transaction List */}
            {[1, 2].map((i) => (
                <Animated.View key={i} style={[styles.skeletonTransactionRow, { backgroundColor: cardBg, opacity: pulseAnim }]}>
                    <SkeletonBox width={44} height={44} style={{ borderRadius: 12 }} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <SkeletonBox width={'60%' as any} height={14} style={{ marginBottom: 6 }} />
                        <SkeletonBox width={'40%' as any} height={10} />
                    </View>
                    <SkeletonBox width={60} height={16} />
                </Animated.View>
            ))}
        </View>
    );
};


const DashboardScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const navigation = useNavigation<any>();

    // Use global state
    const {
        userData,
        updateUserData,
        totalSpent,
        totalIncome,
        transactions,
        filteredTransactions,
        refreshData,
        selectedMonth,
        selectedYear,
        setSelectedMonth,
        availableMonths,
        isLoading: isAppLoading,
        detectedAccount,
        confirmDetectedAccount,
        ignoreDetectedAccount,
        bankAccounts,
        updateTransaction
    } = useApp();
    const { t } = useLanguage();

    // Calculate monthly income/expenses from filtered transactions (current month only)
    const monthlyIncome = useMemo(() => {
        return filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    const monthlyExpenses = useMemo(() => {
        return filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    // Calculate Total Balance from Accounts (must be before any early returns)
    const totalWalletBalance = useMemo(() => {
        if (!bankAccounts || bankAccounts.length === 0) return 0;
        return bankAccounts.reduce((sum, account) => {
            const accName = account.name.toLowerCase();
            const bankName = accName.replace(/[^a-z\s]/g, '').trim();
            const bankNameParts = bankName.split(/\s+/).filter((p: string) => p.length > 2);
            const accountNumberMatch = account.name.match(/(\d{4})/);
            const accountNumber = accountNumberMatch ? accountNumberMatch[1] : null;

            const accTxs = transactions.filter(t => {
                const desc = (t.description || '').toLowerCase();
                if (t.accountId === account.id) return true;
                if (accountNumber && t.accountNumber === accountNumber) return true;
                if (accountNumber && desc.includes(accountNumber)) return true;
                if (accName.length > 2 && desc.includes(accName)) return true;
                if (bankNameParts.length > 0) {
                    if (bankNameParts.some((part: string) => desc.startsWith(part) || desc.includes(`${part}:`) || desc.includes(`${part} `))) {
                        return true;
                    }
                }
                return false;
            });

            const inc = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const exp = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return sum + (account.balance + inc - exp);
        }, 0);
    }, [bankAccounts, transactions]);

    const [showAutoTrackingModal, setShowAutoTrackingModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Legacy filter type (kept for MonthDropdown backward compatibility)
    const now = new Date();
    const isThisMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    const [monthFilter, setMonthFilter] = useState<MonthFilter>(isThisMonth ? 'this' : 'prev');

    // Handler for dynamic month selection (new)
    const handleMonthSelect = (month: number, year: number) => {
        setSelectedMonth(month, year);
    };

    // Legacy handler (kept for backward compatibility)
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

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Dashboard Tabs
    const [activeTab, setActiveTab] = useState<'review' | 'today'>('today');
    const [tabWidth, setTabWidth] = useState(0);
    const tabAnim = useRef(new Animated.Value(1)).current; // 1 for today, 0 for review

    useEffect(() => {
        Animated.spring(tabAnim, {
            toValue: activeTab === 'today' ? 1 : 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    }, [activeTab]);

    const handleTabChange = (tab: 'review' | 'today') => {
        if (activeTab === tab) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(tab);
    };

    // Header animations
    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
    });

    const headerTitleSize = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [28, 20],
        extrapolate: 'clamp',
    });

    const greetingOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (!isAppLoading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [isAppLoading]);

    useEffect(() => {
        checkAutoTrackingStatus();
    }, []);

    const checkAutoTrackingStatus = async () => {
        try {
            const enabled = await AsyncStorage.getItem('autoTrackingEnabled');
            const hasSeenModal = await AsyncStorage.getItem('hasSeenPermissionModal');

            if (enabled !== 'true' && hasSeenModal !== 'true') {
                setTimeout(() => setShowAutoTrackingModal(true), 2500);
            }
        } catch (error) {
            console.error('Error checking auto tracking status:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning')?.toUpperCase() || 'GOOD MORNING';
        if (hour < 17) return t('dashboard.goodAfternoon')?.toUpperCase() || 'GOOD AFTERNOON';
        return t('dashboard.goodEvening')?.toUpperCase() || 'GOOD EVENING';
    };

    const bgColor = isDark ? colors.background : '#FAFAFA';
    const cardBg = isDark ? colors.card : '#FFFFFF';

    if (isAppLoading) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <SkeletonLoader isDark={isDark} />
            </View>
        );
    }

    // State for Transaction Edit
    const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);

    const handleEditTx = (tx: any) => {
        setSelectedTx(tx);
        setEditCategoryModalVisible(true);
    };

    const handleUpdateCategory = async (category: string, updateRule: boolean) => {
        if (!selectedTx) return;
        await updateTransaction(selectedTx.id, { category });
        if (updateRule) {
            const merchant = selectedTx.merchant || selectedTx.description;
            await MerchantRulesService.setCategoryWithRule(merchant, category);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            {/* Collapsible Header */}
            <Animated.View
                style={[
                    styles.header,
                    { paddingTop: insets.top + spacing.sm, height: Animated.add(headerHeight, insets.top) }
                ]}
            >
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Animated.Text style={[styles.greeting, { color: colors.textSecondary, opacity: greetingOpacity }]}>
                        {getGreeting()}
                    </Animated.Text>
                    <Animated.Text
                        style={[styles.headerName, { color: colors.text, fontSize: headerTitleSize }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {userData.name?.split(' ')[0] || 'User'}
                    </Animated.Text>
                </View>
                <View style={styles.headerButtons}>
                    <MonthDropdown
                        value={monthFilter}
                        onChange={handleMonthChange}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        availableMonths={availableMonths}
                        onMonthSelect={handleMonthSelect}
                    />
                    <Pressable
                        style={({ pressed }) => [styles.headerBtn, { backgroundColor: isDark ? colors.card : '#F4F4F5', transform: [{ scale: pressed ? 0.95 : 1 }], marginLeft: 8 }]}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Icon name="cog-outline" size={20} color={colors.text} />
                    </Pressable>
                </View>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
            >
                {/* Balance Card - Tappable */}
                <Animated.View style={[styles.balanceCard, { opacity: fadeAnim }]}>
                    <Pressable
                        style={({ pressed }) => [styles.balanceInner, {
                            backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? '#27272A' : 'transparent',
                            transform: [{ scale: pressed ? 0.99 : 1 }]
                        }]}
                        onPress={() => setShowEditModal(true)}
                    >
                        <View style={styles.balanceHeader}>
                            <Typography variant="caption" color="secondary" style={styles.balanceLabel}>{t('dashboard.totalBalance')?.toUpperCase() || 'TOTAL BALANCE'}</Typography>
                            <Icon name="pencil-outline" size={16} color={colors.textMuted} />
                        </View>
                        <View style={styles.balanceRow}>
                            <Typography variant="3xl" weight="bold" style={{ letterSpacing: -1 }}>
                                ₹{userData.balance.toLocaleString()}
                            </Typography>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                    <Icon name="arrow-down" size={14} color="#22C55E" />
                                </View>
                                <View>
                                    <Typography variant="caption" color="secondary">{t('dashboard.income') || 'Income'}</Typography>
                                    <Typography variant="body" weight="semibold">₹{monthlyIncome.toLocaleString()}</Typography>
                                </View>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Icon name="arrow-up" size={14} color="#EF4444" />
                                </View>
                                <View>
                                    <Typography variant="caption" color="secondary">{t('dashboard.expenses') || 'Expenses'}</Typography>
                                    <Typography variant="body" weight="semibold">₹{monthlyExpenses.toLocaleString()}</Typography>
                                </View>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>

                {/* Spending Overview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography variant="caption" weight="medium" color="secondary" style={styles.sectionLabel}>{t('dashboard.spendingOverview')?.toUpperCase() || 'SPENDING OVERVIEW'}</Typography>
                    </View>
                    <Pressable style={[styles.spendingCard, { backgroundColor: cardBg }]}>
                        <CategoryPieChart isRefreshing={refreshing} />
                    </Pressable>
                </View>

                {/* Dashboard Tabs & List */}
                <View style={[styles.section, { marginTop: spacing.xl }]}>
                    <View
                        style={[
                            styles.tabContainer,
                            {
                                backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                                borderWidth: 1,
                                borderColor: isDark ? '#3F3F46' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
                    >
                        <Animated.View
                            style={{
                                position: 'absolute',
                                top: 4,
                                bottom: 4,
                                left: 4,
                                width: (tabWidth / 2) - 4,
                                backgroundColor: isDark ? '#3F3F46' : '#FFFFFF',
                                borderRadius: 10,
                                transform: [{
                                    translateX: tabAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, tabWidth / 2]
                                    })
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.3 : 0.1,
                                shadowRadius: 2,
                                elevation: 2,
                            }}
                        />
                        <Pressable style={styles.tab} onPress={() => handleTabChange('review')}>
                            <Icon name="alert-circle-outline" size={16} color={activeTab === 'review' ? (isDark ? '#FFF' : colors.text) : colors.textMuted} />
                            <Typography variant="bodySmall" weight={activeTab === 'review' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'review' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>{t('dashboard.needsReview') || 'Need Review'}</Typography>
                        </Pressable>
                        <Pressable style={styles.tab} onPress={() => handleTabChange('today')}>
                            <Icon name="calendar-today" size={16} color={activeTab === 'today' ? (isDark ? '#FFF' : colors.text) : colors.textMuted} />
                            <Typography variant="bodySmall" weight={activeTab === 'today' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'today' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>{t('dashboard.todaysTransactions') || "Today's"}</Typography>
                        </Pressable>
                    </View>

                    {/* Transaction List */}
                    <View style={{ marginTop: spacing.md }}>
                        {activeTab === 'today' ? (
                            transactions
                                .filter(t => t.date === new Date().toISOString().split('T')[0])
                                .length > 0 ? (
                                transactions
                                    .filter(t => t.date === new Date().toISOString().split('T')[0])
                                    .map((t, index) => (
                                        <Pressable
                                            key={`tx-${index}`}
                                            style={[styles.transactionItem, { backgroundColor: cardBg }]}
                                            onPress={() => handleEditTx(t)}
                                        >
                                            <View style={[styles.iconBox, { backgroundColor: t.type === 'expense' ? '#EF444420' : '#22C55E20' }]}>
                                                <Typography variant="lg">{t.type === 'expense' ? '💸' : '💰'}</Typography>
                                            </View>
                                            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                                                <Typography variant="body" weight="medium">{t.description}</Typography>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                    <Typography variant="caption" color="secondary">{t.category}</Typography>
                                                    <Icon name="pencil-outline" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
                                                </View>
                                            </View>
                                            <Typography variant="body" weight="bold" style={{ color: t.type === 'expense' ? '#EF4444' : '#22C55E' }}>
                                                {t.type === 'expense' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                            </Typography>
                                        </Pressable>
                                    ))
                            ) : (
                                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                                    <Icon name="calendar-blank-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                                    <Typography variant="body" color="secondary">{t('dashboard.noTransactions') || 'No transactions today'}</Typography>
                                </View>
                            )
                        ) : (
                            <UncategorizedTransactions />
                        )}
                    </View>
                </View>
            </Animated.ScrollView>

            {/* Edit Modal */}
            <EditBalanceModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                currentBalance={userData.balance}
                currentIncome={monthlyIncome}
                onSave={(balance, income) => updateUserData({ balance, income })}
            />

            <CategorySelectionModal
                visible={editCategoryModalVisible}
                onClose={() => setEditCategoryModalVisible(false)}
                transaction={selectedTx}
                mode="edit"
                onConfirm={handleUpdateCategory}
            />

            <AutoTrackingModal
                visible={showAutoTrackingModal}
                onGrantPermissions={() => {
                    setShowAutoTrackingModal(false);
                    AsyncStorage.setItem('hasSeenPermissionModal', 'true');
                }}
                onMaybeLater={() => {
                    setShowAutoTrackingModal(false);
                    AsyncStorage.setItem('hasSeenPermissionModal', 'true');
                }}
            />

            {/* New Account Detection Modal */}
            {detectedAccount && (
                <DetectedAccountModal
                    visible={!!detectedAccount}
                    bankName={detectedAccount.bank}
                    accountNumber={detectedAccount.accountNumber}
                    onConfirm={confirmDetectedAccount}
                    onIgnore={ignoreDetectedAccount}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: { fontSize: 11, letterSpacing: 1, marginBottom: 2, fontWeight: '500' },
    headerName: { fontWeight: '700' },
    headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    tabContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: spacing.md, position: 'relative' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, zIndex: 1 },
    transactionItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, marginBottom: spacing.sm },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    content: { paddingHorizontal: spacing.md },
    section: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    sectionLabel: { letterSpacing: 1 },
    balanceCard: { marginBottom: spacing.lg },
    balanceInner: { borderRadius: 20, padding: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceLabel: { letterSpacing: 1 },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
    statsRow: { flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(128, 128, 128, 0.1)' },
    statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statDivider: { width: 1, height: 36, marginHorizontal: spacing.md },
    spendingCard: { borderRadius: 20, padding: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
    skeletonContainer: { padding: spacing.md, paddingTop: 60, flex: 1 },
    skeletonCard: { height: 160, borderRadius: 20 },
    skeletonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
    skeletonBalanceCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
    skeletonText: { borderRadius: 6 },
    skeletonSummaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    skeletonSummaryCard: { flex: 1, padding: spacing.md, borderRadius: 16, height: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    skeletonIcon: { width: 32, height: 32, borderRadius: 10, marginBottom: 8 },
    skeletonIconSmall: { width: 40, height: 40, borderRadius: 12 },
    skeletonTransactions: { marginTop: spacing.sm },
    skeletonTransactionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 16, marginBottom: spacing.sm },
    skeletonSpendingCard: { borderRadius: 20, padding: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
    // Modal styles
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', borderRadius: 24, padding: spacing.xl },
    inputGroup: { marginTop: spacing.lg },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 6 },
    input: { flex: 1, fontSize: 18, fontWeight: '600', marginLeft: 8 },
    saveBtn: { marginTop: spacing.xl, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});

export default DashboardScreen;
