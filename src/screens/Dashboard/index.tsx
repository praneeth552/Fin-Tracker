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
import { UncategorizedTransactions } from '../../components/UncategorizedTransactions';
import { MonthDropdown, MonthFilter } from '../../components/MonthDropdown';
import { useApp } from '../../context/AppContext';
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

// Skeleton Loader
const SkeletonLoader: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const skeletonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={styles.skeletonContainer}>
            <Animated.View style={[styles.skeletonCard, { backgroundColor: skeletonBg, opacity: pulseAnim }]} />
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
    const { userData, updateUserData, totalSpent, totalIncome, transactions } = useApp();

    const [showAutoTrackingModal, setShowAutoTrackingModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<MonthFilter>('this');

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
        setTimeout(() => {
            setIsLoading(false);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }, 600);
    }, []);

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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'GOOD MORNING';
        if (hour < 17) return 'GOOD AFTERNOON';
        return 'GOOD EVENING';
    };

    const bgColor = isDark ? colors.background : '#FAFAFA';
    const cardBg = isDark ? colors.card : '#FFFFFF';

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <SkeletonLoader isDark={isDark} />
            </View>
        );
    }

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
                <View>
                    <Animated.Text style={[styles.greeting, { color: colors.textSecondary, opacity: greetingOpacity }]}>
                        {getGreeting()}
                    </Animated.Text>
                    <Animated.Text style={[styles.headerName, { color: colors.text, fontSize: headerTitleSize }]}>
                        {userData.name}
                    </Animated.Text>
                </View>
                <View style={styles.headerButtons}>
                    <MonthDropdown value={selectedMonth} onChange={setSelectedMonth} />
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
                            <Typography variant="caption" color="secondary" style={styles.balanceLabel}>TOTAL BALANCE</Typography>
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
                                    <Typography variant="caption" color="secondary">Income</Typography>
                                    <Typography variant="body" weight="semibold">₹{userData.income.toLocaleString()}</Typography>
                                </View>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Icon name="arrow-up" size={14} color="#EF4444" />
                                </View>
                                <View>
                                    <Typography variant="caption" color="secondary">Expenses</Typography>
                                    <Typography variant="body" weight="semibold">₹{totalSpent.toLocaleString()}</Typography>
                                </View>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>

                {/* Spending Overview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography variant="caption" weight="medium" color="secondary" style={styles.sectionLabel}>SPENDING OVERVIEW</Typography>
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
                            <Typography variant="bodySmall" weight={activeTab === 'review' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'review' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>Need Review</Typography>
                        </Pressable>
                        <Pressable style={styles.tab} onPress={() => handleTabChange('today')}>
                            <Icon name="calendar-today" size={16} color={activeTab === 'today' ? (isDark ? '#FFF' : colors.text) : colors.textMuted} />
                            <Typography variant="bodySmall" weight={activeTab === 'today' ? 'bold' : 'medium'} style={{ marginLeft: 6, color: activeTab === 'today' ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }}>Today's</Typography>
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
                                    .map(t => (
                                        <View key={t.id} style={[styles.transactionItem, { backgroundColor: cardBg }]}>
                                            <View style={[styles.iconBox, { backgroundColor: t.type === 'expense' ? '#EF444420' : '#22C55E20' }]}>
                                                <Typography variant="lg">{t.type === 'expense' ? '💸' : '💰'}</Typography>
                                            </View>
                                            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                                                <Typography variant="body" weight="medium">{t.description}</Typography>
                                                <Typography variant="caption" color="secondary">{t.category}</Typography>
                                            </View>
                                            <Typography variant="body" weight="bold" style={{ color: t.type === 'expense' ? '#EF4444' : '#22C55E' }}>
                                                {t.type === 'expense' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                            </Typography>
                                        </View>
                                    ))
                            ) : (
                                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                                    <Icon name="calendar-blank-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                                    <Typography variant="body" color="secondary">No transactions today</Typography>
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
                currentIncome={userData.income}
                onSave={(balance, income) => updateUserData({ balance, income })}
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
    skeletonContainer: { padding: spacing.md, paddingTop: 100 },
    skeletonCard: { height: 160, borderRadius: 20 },
    // Modal styles
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', borderRadius: 24, padding: spacing.xl },
    inputGroup: { marginTop: spacing.lg },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 6 },
    input: { flex: 1, fontSize: 18, fontWeight: '600', marginLeft: 8 },
    saveBtn: { marginTop: spacing.xl, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});

export default DashboardScreen;
