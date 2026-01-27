/**
 * Transactions Screen - Connected to AppContext
 * ===============================================
 * Activity feed using real data with swipe-to-delete
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    SectionList,
    useColorScheme,
    Pressable,
    ScrollView,
    Animated,
    PanResponder,
    LayoutAnimation,
    Platform,
    UIManager,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from '../../components/common';
import { MonthDropdown, MonthFilter } from '../../components/MonthDropdown';
import { useApp, Transaction } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { themes, spacing } from '../../theme';

type CategoryType = 'food' | 'transport' | 'shopping' | 'bills' | 'entertainment' | 'health' | 'misc' | 'income' | string;

import { useCategories } from '../../hooks/useCategories';

const defaultFilterKeys: { key: 'all' | string; labelKey?: string; label?: string }[] = [
    { key: 'all', labelKey: 'transactions.all' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Swipeable Transaction Item with Fade Animation
const TransactionItem: React.FC<{
    item: Transaction;
    isDark: boolean;
    onDelete: (id: string) => void;
    index: number;
}> = ({ item, isDark, onDelete, index }) => {
    const colors = isDark ? themes.dark : themes.light;
    const translateX = useRef(new Animated.Value(0)).current;
    const [isSwiping, setIsSwiping] = useState(false);

    // Fade/slide animation on mount
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
            onPanResponderGrant: () => setIsSwiping(true),
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    translateX.setValue(Math.max(gestureState.dx, -80));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -50) {
                    Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
                } else {
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(() => setIsSwiping(false));
                }
            },
        })
    ).current;

    const handleDelete = () => {
        Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true }).start(() => onDelete(item.id));
    };

    const deleteOpacity = translateX.interpolate({
        inputRange: [-40, -10, 0],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp',
    });

    const { getCategoryIcon, getCategoryColor } = useCategories();
    // Use emoji for icon, if it's not a standard icon name, we might need a wrapper or just render Text
    // But the hook returns Emojis now. MaterialCommunityIcons doesn't support Emojis as "name".
    // So we need to change how we render the icon.
    // However, the original code used Material icons. My hook uses Emojis.
    // Strategy: The new design uses Emojis everywhere. So I should render a Text component for the icon, not Icon.
    const catColor = getCategoryColor(item.category);
    const catIcon = getCategoryIcon(item.category);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.swipeContainer}>
                {/* Always render delete button behind */}
                <AnimatedPressable style={[styles.deleteBtn, { opacity: deleteOpacity }]} onPress={handleDelete}>
                    <Icon name="trash-can-outline" size={22} color="#FFFFFF" />
                </AnimatedPressable>

                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.transactionRow,
                        { backgroundColor: isDark ? colors.card : '#FFFFFF', transform: [{ translateX }] }
                    ]}
                >
                    <View style={[styles.iconBox, { backgroundColor: catColor + '15' }]}>
                        <Typography variant="h3">{catIcon}</Typography>
                    </View>
                    <View style={styles.infoCol}>
                        <Typography variant="body" weight="medium">{item.description}</Typography>
                        <Typography variant="caption" color="secondary">
                            {item.merchant || item.category} • {item.type}
                        </Typography>
                    </View>
                    <Typography
                        variant="body"
                        weight="semibold"
                        style={{ color: item.type === 'income' ? '#22C55E' : colors.text }}
                    >
                        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString()}
                    </Typography>
                </Animated.View>
            </View>
        </Animated.View>
    );
};

const TransactionsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const bgColor = isDark ? colors.background : '#FAFAFA';

    // Use global state with filtered transactions and custom categories
    const { filteredTransactions, deleteTransaction, selectedMonth, selectedYear, setSelectedMonth, availableMonths, customCategories, refreshData } = useApp();
    const { t } = useLanguage();

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    const { allCategories } = useCategories();

    const filterKeys = React.useMemo(() => {
        const categoryFilters = allCategories.map(cat => ({
            key: cat.key,
            label: cat.label,
            labelKey: undefined as string | undefined
        }));

        // Add 'All' at the beginning
        return [{ key: 'all', labelKey: 'transactions.all', label: undefined as string | undefined }, ...categoryFilters];
    }, [allCategories]);

    // Get route params for filterCategory from pie chart navigation
    const route = require('@react-navigation/native').useRoute();
    const filterCategoryParam = route.params?.filterCategory as CategoryType | undefined;

    // Initialize filter from navigation param or default to 'all'
    const [activeFilter, setActiveFilter] = useState<'all' | CategoryType>(filterCategoryParam || 'all');

    // Update filter when navigation param changes
    React.useEffect(() => {
        if (filterCategoryParam) {
            setActiveFilter(filterCategoryParam);
        }
    }, [filterCategoryParam]);

    // Convert global month to MonthFilter type for dropdown
    const now = new Date();
    const isThisMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    const [monthFilter, setMonthFilter] = useState<MonthFilter>(isThisMonth ? 'this' : 'prev');

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

    const handleFilterChange = useCallback((filter: 'all' | CategoryType) => {
        LayoutAnimation.configureNext({
            duration: 300,
            create: { type: LayoutAnimation.Types.spring, property: LayoutAnimation.Properties.opacity, springDamping: 0.8 },
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
            delete: { type: LayoutAnimation.Types.spring, property: LayoutAnimation.Properties.opacity, springDamping: 0.8 },
        });
        setActiveFilter(filter);
    }, []);

    const handleDelete = useCallback((id: string) => {
        LayoutAnimation.configureNext({
            duration: 250,
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
            delete: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
        });
        deleteTransaction(id);
    }, [deleteTransaction]);

    const sections = useMemo(() => {
        const filtered = filteredTransactions.filter((t: Transaction) => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'income') return t.type === 'income';
            return t.category === activeFilter;
        });

        const groups: Record<string, Transaction[]> = {};
        filtered.forEach((t: Transaction) => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        return sortedKeys.map(date => {
            const d = new Date(date);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let title = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
            if (date === today.toISOString().split('T')[0]) title = 'Today';
            if (date === yesterday.toISOString().split('T')[0]) title = 'Yesterday';

            return { title, data: groups[date] };
        });
    }, [activeFilter, filteredTransactions]);

    // Empty state
    if (filteredTransactions.length === 0) {
        return (
            <View style={[styles.container, styles.emptyContainer, { backgroundColor: bgColor, paddingTop: insets.top }]}>
                <Icon name="receipt" size={64} color={colors.textMuted} />
                <Typography variant="h3" weight="semibold" style={{ marginTop: spacing.md }}>
                    {t('transactions.noTransactions')}
                </Typography>
                <Typography variant="body" color="secondary" align="center" style={{ marginTop: spacing.sm, maxWidth: 250 }}>
                    {t('transactions.addFirst')}
                </Typography>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Typography variant="h2" weight="bold">{t('transactions.activity')}</Typography>
                    <MonthDropdown
                        value={monthFilter}
                        onChange={handleMonthChange}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        availableMonths={availableMonths}
                        onMonthSelect={(month, year) => setSelectedMonth(month, year)}
                    />
                </View>
                <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                        {filterKeys.map((opt) => {
                            const isActive = activeFilter === opt.key;
                            const filterLabel = opt.labelKey ? t(opt.labelKey) : (opt.label || opt.key);
                            return (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => handleFilterChange(opt.key)}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: isActive ? '#3B82F6' : 'transparent',
                                            borderColor: isActive ? '#3B82F6' : (isDark ? '#3F3F46' : '#E4E4E7'),
                                        }
                                    ]}
                                >
                                    <Typography
                                        variant="caption"
                                        weight={isActive ? 'semibold' : 'medium'}
                                        style={{ color: isActive ? '#FFFFFF' : colors.textSecondary }}
                                    >
                                        {filterLabel}
                                    </Typography>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: spacing.md }}
                stickySectionHeadersEnabled={false}
                renderItem={({ item, index }) => <TransactionItem item={item} isDark={isDark} onDelete={handleDelete} index={index} />}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Typography variant="caption" weight="bold" style={{ color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {title}
                        </Typography>
                    </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    emptyContainer: { justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, paddingTop: spacing.sm },
    filterWrapper: { marginTop: 16, marginHorizontal: -spacing.lg },
    filters: { paddingHorizontal: spacing.lg, gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5 },
    sectionHeader: { marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
    swipeContainer: { position: 'relative' },
    deleteBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoCol: { flex: 1, gap: 2 },
});

export default TransactionsScreen;
