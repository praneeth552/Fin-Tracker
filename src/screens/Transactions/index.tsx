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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from '../../components/common';
import { useApp, Transaction } from '../../context/AppContext';
import { themes, spacing } from '../../theme';

type CategoryType = 'food' | 'transport' | 'shopping' | 'bills' | 'entertainment' | 'health' | 'misc' | 'income';

const categoryIcons: Record<string, string> = {
    food: 'silverware-fork-knife',
    transport: 'car',
    shopping: 'cart',
    bills: 'file-document-outline',
    entertainment: 'movie-open',
    health: 'pill',
    education: 'school',
    misc: 'shape',
    income: 'cash-plus',
};

const categoryColors: Record<string, string> = {
    food: '#3B82F6',
    transport: '#8B5CF6',
    shopping: '#EC4899',
    bills: '#10B981',
    entertainment: '#F59E0B',
    health: '#EF4444',
    education: '#06B6D4',
    misc: '#6B7280',
    income: '#22C55E',
};

const filterOptions: { key: 'all' | CategoryType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'food', label: 'Food' },
    { key: 'transport', label: 'Travel' },
    { key: 'shopping', label: 'Shop' },
    { key: 'bills', label: 'Bills' },
    { key: 'income', label: 'Income' },
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

    const catColor = categoryColors[item.category] || categoryColors[item.type] || '#999';
    const catIcon = categoryIcons[item.category] || categoryIcons[item.type] || 'shape';

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
                        <Icon name={catIcon} size={20} color={catColor} />
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

    // Use global state
    const { transactions, deleteTransaction } = useApp();
    const [activeFilter, setActiveFilter] = useState<'all' | CategoryType>('all');

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
        const filtered = transactions.filter((t: Transaction) => {
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
    }, [activeFilter, transactions]);

    // Empty state
    if (transactions.length === 0) {
        return (
            <View style={[styles.container, styles.emptyContainer, { backgroundColor: bgColor, paddingTop: insets.top }]}>
                <Icon name="receipt" size={64} color={colors.textMuted} />
                <Typography variant="h3" weight="semibold" style={{ marginTop: spacing.md }}>
                    No Transactions Yet
                </Typography>
                <Typography variant="body" color="secondary" align="center" style={{ marginTop: spacing.sm, maxWidth: 250 }}>
                    Tap the + button to add your first transaction!
                </Typography>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Typography variant="h2" weight="bold">Activity</Typography>
                <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                        {filterOptions.map(opt => {
                            const isActive = activeFilter === opt.key;
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
                                        {opt.label}
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
