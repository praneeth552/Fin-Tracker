/**
 * Uncategorized Transactions - Clean Modern UI
 * ==============================================
 * Minimal card with swipe-to-categorize
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    useColorScheme,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';

interface UncategorizedItem {
    id: string;
    description: string;
    amount: number;
    date: string;
}

const mockItems: UncategorizedItem[] = [
    { id: '1', description: 'POS Transaction #1234', amount: 450, date: '2026-01-05' },
    { id: '2', description: 'UPI - XYZ123', amount: 1200, date: '2026-01-04' },
    { id: '3', description: 'Card Payment - Unknown', amount: 89, date: '2026-01-03' },
];

const categories = [
    { type: 'food', label: 'Food', icon: '🍽️', color: '#3B82F6' },
    { type: 'transport', label: 'Travel', icon: '🚗', color: '#8B5CF6' },
    { type: 'shopping', label: 'Shop', icon: '🛒', color: '#EC4899' },
    { type: 'bills', label: 'Bills', icon: '📄', color: '#10B981' },
    { type: 'entertainment', label: 'Fun', icon: '🎬', color: '#F59E0B' },
    { type: 'health', label: 'Health', icon: '💊', color: '#EF4444' },
    { type: 'misc', label: 'Misc', icon: '📌', color: '#6B7280' },
];

export const UncategorizedTransactions: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [items, setItems] = useState(mockItems);
    const [selectedItem, setSelectedItem] = useState<UncategorizedItem | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

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

    const handleCategorize = (categoryType: string) => {
        if (selectedItem) {
            setItems(prev => prev.filter(i => i.id !== selectedItem.id));
            setShowModal(false);
            setSelectedItem(null);
        }
    };

    const cardBg = isDark ? colors.card : '#FFFFFF';

    if (items.length === 0) return null;

    return (
        <>
            {/* Main Section */}
            <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    {items.slice(0, 3).map((item, index) => (
                        <Pressable
                            key={item.id}
                            style={({ pressed }) => [
                                styles.item,
                                {
                                    opacity: pressed ? 0.8 : 1,
                                    transform: [{ scale: pressed ? 0.99 : 1 }]
                                },
                                index < Math.min(items.length, 3) - 1 && [
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
                    ))}
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

                                <View style={styles.categoriesGrid}>
                                    {categories.map((cat) => (
                                        <Pressable
                                            key={cat.type}
                                            style={({ pressed }) => [
                                                styles.categoryBtn,
                                                {
                                                    backgroundColor: pressed ? cat.color : 'transparent',
                                                    borderColor: cat.color,
                                                }
                                            ]}
                                            onPress={() => handleCategorize(cat.type)}
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
    skipBtn: {
        marginTop: spacing.lg,
        alignSelf: 'center',
        paddingVertical: spacing.sm,
    },
});

export default UncategorizedTransactions;
