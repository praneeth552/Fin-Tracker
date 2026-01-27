
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    ScrollView,
    useColorScheme,
    Animated,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { useCategories } from '../hooks/useCategories';
import { Transaction } from '../context/AppContext';
import { themes, spacing } from '../theme';

interface CategorySelectionModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    mode: 'edit' | 'categorize';
    onConfirm: (category: string, updateRule: boolean) => Promise<void>;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
    visible,
    onClose,
    transaction,
    mode,
    onConfirm
}) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { allCategories } = useCategories();

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [updateRule, setUpdateRule] = useState(true);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);

    // Animation refs
    const slideAnim = useRef(new Animated.Value(500)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && transaction) {
            setClosing(false);
            setSelectedCategory(transaction.category || '');
            setUpdateRule(true); // Default to true
            slideAnim.setValue(500);
            backdropAnim.setValue(0);

            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, transaction]);

    const animateOut = () => {
        if (closing) return;
        setClosing(true);
        Animated.parallel([
            Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            onClose();
        });
    };

    const handleSelect = async (category: string) => {
        if (!transaction) return;

        setLoading(true);
        setSelectedCategory(category);

        // Unified "Instant Save" behavior
        setTimeout(async () => {
            await onConfirm(category, updateRule);
            setLoading(false);
            animateOut();
        }, 50);
    };

    const cardBg = isDark ? colors.card : '#FFFFFF';

    if (!visible || !transaction) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.container}>
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.content,
                        {
                            backgroundColor: cardBg,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Typography variant="caption" color="secondary" align="center" style={{ textTransform: 'uppercase' }}>
                            {mode === 'edit' ? 'EDIT CATEGORY' : 'CATEGORIZE TRANSACTION'}
                        </Typography>
                        <Typography variant="h3" weight="bold" align="center" style={{ marginTop: spacing.xs }}>
                            ₹{transaction.amount.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="secondary" align="center" numberOfLines={1}>
                            {transaction.description}
                        </Typography>
                    </View>

                    <ScrollView
                        style={{ maxHeight: 450 }}
                        contentContainerStyle={styles.grid}
                        showsVerticalScrollIndicator={false}
                    >
                        {allCategories.map((cat) => {
                            const isSelected = selectedCategory === cat.key;
                            return (
                                <Pressable
                                    key={cat.key}
                                    style={({ pressed }) => [
                                        styles.catItem,
                                        {
                                            backgroundColor: pressed || isSelected ? cat.color : 'transparent',
                                            borderColor: cat.color,
                                            transform: [{ scale: pressed ? 0.98 : 1 }]
                                        }
                                    ]}
                                    onPress={() => handleSelect(cat.key)}
                                >
                                    <Typography variant="lg">{cat.icon}</Typography>
                                    <Typography
                                        variant="caption"
                                        weight="medium"
                                        style={{ color: colors.text, marginTop: 2, fontSize: 10 }}
                                        align="center"
                                    >
                                        {cat.label}
                                    </Typography>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {/* Exact Rule Toggle */}
                    <View style={styles.ruleRow}>
                        <View style={{ flex: 1 }}>
                            <Typography variant="body" weight="medium">
                                {mode === 'edit' ? 'Update auto-rule' : 'Remember for this merchant'}
                            </Typography>
                            <Typography variant="caption" color="secondary">
                                Auto-categorize future transactions
                            </Typography>
                        </View>
                        <Switch
                            value={updateRule}
                            onValueChange={setUpdateRule}
                            trackColor={{ false: '#767577', true: '#3B82F6' }}
                            thumbColor={'#FFFFFF'}
                        />
                    </View>

                    <Pressable
                        style={styles.skipBtn}
                        onPress={animateOut}
                    >
                        <Typography variant="body" color="secondary">
                            {mode === 'edit' ? 'Cancel' : 'Skip for now'}
                        </Typography>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: 40,
        maxHeight: '90%'
    },
    handle: { width: 40, height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },

    // Header
    header: { alignItems: 'center', marginBottom: spacing.md },

    // Exact Grid Match
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: spacing.lg
    },
    catItem: {
        width: 70,
        height: 70,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Exact Rule Row Match
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.08)'
    },
    skipBtn: { marginTop: spacing.md, alignSelf: 'center', paddingVertical: spacing.sm },
});
