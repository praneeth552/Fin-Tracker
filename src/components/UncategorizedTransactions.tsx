/**
 * Uncategorized Transactions - Clean Modern UI
 * ==============================================
 * Minimal card with swipe-to-categorize
 * Now creates merchant rules for auto-categorization
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    useColorScheme,
    Animated,
    Switch,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';
import { useApp, Transaction } from '../context/AppContext';
import { MerchantRulesService } from '../services/MerchantRulesService';
import { useCategories } from '../hooks/useCategories';

export const UncategorizedTransactions: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const { transactions, updateTransaction } = useApp();
    const { allCategories } = useCategories();

    // Filter for uncategorized transactions from global state
    // We assume backend sends "uncategorized" or maybe null, checking for both
    const items = useMemo(() => {
        const filtered = transactions.filter(t =>
            !t.category ||
            t.category.toLowerCase() === 'uncategorized' ||
            t.category.toLowerCase() === 'unknown'
        );
        // Safety dedup
        const uniqueItems = Array.from(new Map(filtered.map(item => [item.id, item])).values());
        return uniqueItems;
    }, [transactions]);

    const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [rememberChoice, setRememberChoice] = useState(true); // Auto-create rule

    const slideAnim = useRef(new Animated.Value(400)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showModal) {
            setModalVisible(true);
            slideAnim.setValue(400);
            backdropAnim.setValue(0);

            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
            ]).start(() => setModalVisible(false));
        }
    }, [showModal]);

    const handleCategorize = async (categoryType: string) => {
        if (selectedItem) {
            // Update via Context (which calls API) - await to ensure pie chart refreshes
            await updateTransaction(selectedItem.id, { category: categoryType });

            // Create merchant rule for future auto-categorization
            if (rememberChoice && selectedItem.merchant) {
                await MerchantRulesService.setCategoryWithRule(selectedItem.merchant, categoryType);
            } else if (rememberChoice && selectedItem.description) {
                // Try to extract merchant from description
                await MerchantRulesService.setCategoryWithRule(selectedItem.description, categoryType);
            }

            setShowModal(false);
            setSelectedItem(null);
        }
    };

    const cardBg = isDark ? colors.card : '#FFFFFF';

    if (items.length === 0) return (
        <View style={[styles.section, { alignItems: 'center', padding: spacing.xl }]}>
            <Icon name="check-circle-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
            <Typography variant="body" color="secondary">All caught up! No transactions to review.</Typography>
        </View>
    );

    return (
        <>
            {/* Main Section */}
            <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    {items.slice(0, 5).map((item, index) => {
                        // Debug log for keys
                        if (index === 0) console.log('Rendering Uncategorized items:', items.slice(0, 5).map(i => i.id));
                        return (
                            <Pressable
                                key={item.id}
                                style={({ pressed }) => [
                                    styles.item,
                                    {
                                        opacity: pressed ? 0.8 : 1,
                                        transform: [{ scale: pressed ? 0.99 : 1 }]
                                    },
                                    index < Math.min(items.length, 5) - 1 && [
                                        styles.itemBorder,
                                        { borderBottomColor: colors.border }
                                    ]
                                ]}
                                onPress={() => { setSelectedItem(item); setShowModal(true); }}
                            >
                                <View style={[styles.itemDot, { backgroundColor: '#F59E0B' }]} />
                                <View style={styles.itemContent}>
                                    <Typography variant="body" weight="medium" numberOfLines={1}>
                                        {item.description}
                                    </Typography>
                                    <Typography variant="caption" color="secondary">
                                        {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    </Typography>
                                </View>
                                <View style={styles.itemRight}>
                                    <Typography variant="body" weight="semibold">₹{item.amount}</Typography>
                                    <Icon name="chevron-right" size={18} color={colors.textMuted} />
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Categorize Modal */}
            <Modal visible={modalVisible} transparent animationType="none">
                <View style={styles.modalContainer}>
                    <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.modalContent,
                            { backgroundColor: cardBg, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <View style={styles.modalHandle} />

                        {selectedItem && (
                            <>
                                <Typography variant="caption" color="secondary" align="center">
                                    CATEGORIZE TRANSACTION
                                </Typography>
                                <Typography variant="h3" weight="bold" align="center" style={{ marginTop: spacing.xs }}>
                                    ₹{selectedItem.amount}
                                </Typography>
                                <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                                    {selectedItem.description}
                                </Typography>

                                <ScrollView
                                    contentContainerStyle={styles.categoriesGrid}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {allCategories.map((cat) => (
                                        <Pressable
                                            key={cat.key}
                                            style={({ pressed }) => [
                                                styles.categoryBtn,
                                                {
                                                    backgroundColor: pressed ? cat.color : 'transparent',
                                                    borderColor: cat.color,
                                                }
                                            ]}
                                            onPress={() => handleCategorize(cat.key)}
                                        >
                                            <Typography variant="lg">{cat.icon}</Typography>
                                            <Typography
                                                variant="caption"
                                                weight="medium"
                                                style={{ color: colors.text, marginTop: 2 }}
                                            >
                                                {cat.label}
                                            </Typography>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                {/* Remember this choice toggle */}
                                <View style={styles.rememberRow}>
                                    <View style={{ flex: 1 }}>
                                        <Typography variant="body" weight="medium">
                                            Remember for this merchant
                                        </Typography>
                                        <Typography variant="caption" color="secondary">
                                            Auto-categorize future transactions
                                        </Typography>
                                    </View>
                                    <Switch
                                        value={rememberChoice}
                                        onValueChange={setRememberChoice}
                                        trackColor={{ false: '#767577', true: '#3B82F6' }}
                                        thumbColor={rememberChoice ? '#FFFFFF' : '#f4f3f4'}
                                    />
                                </View>

                                <Pressable
                                    style={styles.skipBtn}
                                    onPress={() => setShowModal(false)}
                                >
                                    <Typography variant="body" color="secondary">Skip for now</Typography>
                                </Pressable>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    sectionLabel: {
        letterSpacing: 1,
    },
    countBadge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    itemBorder: {
        borderBottomWidth: 1,
    },
    itemDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.md,
    },
    itemContent: {
        flex: 1,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: 40,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(128,128,128,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: spacing.lg,
    },
    categoryBtn: {
        width: 70,
        height: 70,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    skipBtn: {
        marginTop: spacing.md,
        alignSelf: 'center',
        paddingVertical: spacing.sm,
    },
});

export default UncategorizedTransactions;
