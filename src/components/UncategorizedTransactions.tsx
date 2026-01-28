/**
 * Uncategorized Transactions - Clean Modern UI
 * ==============================================
 * Minimal card with swipe-to-categorize
 * Now creates merchant rules for auto-categorization
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    useColorScheme,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';
import { useApp, Transaction } from '../context/AppContext';
import { MerchantRulesService } from '../services/MerchantRulesService';
import { CategorySelectionModal } from './CategorySelectionModal';

export const UncategorizedTransactions: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const { transactions, updateTransaction } = useApp();

    // Filter for uncategorized transactions
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
    const [modalVisible, setModalVisible] = useState(false);

    const handleCategorize = async (categoryType: string, rememberChoice: boolean, newDescription?: string) => {
        if (!selectedItem) return;

        // Build update object with category and optionally description
        const updateData: { category: string; description?: string } = { category: categoryType };
        if (newDescription) {
            updateData.description = newDescription;
        }

        // Update via Context
        await updateTransaction(selectedItem.id, updateData);

        // Create merchant rule if requested
        if (rememberChoice) {
            if (selectedItem.merchant) {
                await MerchantRulesService.setCategoryWithRule(selectedItem.merchant, categoryType);
            } else if (selectedItem.description) {
                await MerchantRulesService.setCategoryWithRule(selectedItem.description, categoryType);
            }
        }

        setModalVisible(false);
        setSelectedItem(null);
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
                    {items.slice(0, 5).map((item, index) => (
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
                            onPress={() => { setSelectedItem(item); setModalVisible(true); }}
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
                    ))}
                </View>
            </View>

            <CategorySelectionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                transaction={selectedItem}
                mode="categorize"
                onConfirm={handleCategorize}
            />
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
