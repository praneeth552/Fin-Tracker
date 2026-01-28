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
    TextInput,
} from 'react-native';
import { Typography } from './common';
import { useCategories } from '../hooks/useCategories';
import { Transaction, useApp } from '../context/AppContext';
import { themes, spacing } from '../theme';
import AddCategoryModal from './AddCategoryModal';

interface CategorySelectionModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    mode: 'edit' | 'categorize';
    onConfirm: (category: string, updateRule: boolean, newDescription?: string, newAccountId?: string) => Promise<void>;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
    visible,
    onClose,
    transaction,
    mode,
    onConfirm
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { allCategories } = useCategories();
    const { bankAccounts } = useApp();

    const linkedAccount = React.useMemo(() => {
        if (!transaction) return null;
        if (transaction.accountId) return bankAccounts.find(a => a.id === transaction.accountId);
        if (transaction.accountNumber) {
            // Check direct ID match (if persisted manually)
            const idMatch = bankAccounts.find(a => a.id === transaction.accountNumber);
            if (idMatch) return idMatch;

            // Fuzzy match: Check if account name contains the number (common pattern: "HDFC - 1234")
            const numMatch = bankAccounts.find(a => a.name.includes(transaction.accountNumber!));
            if (numMatch) return numMatch;
        }

        // Fallback: Try to match Bank Name from Description (e.g. "ICICI: Ref...")
        if (transaction.description) {
            const parts = transaction.description.split(':');
            if (parts.length > 0) {
                const prefix = parts[0].trim().toLowerCase();
                // Avoid matching generic prefixes
                const ignored = ['payment', 'sent', 'received', 'transfer', 'upi', 'neft', 'imps', 'cash', 'vendor', 'shop'];
                if (prefix.length > 2 && !ignored.includes(prefix)) {
                    // Check if Account Name contains Prefix OR Prefix contains Account Name
                    return bankAccounts.find(a =>
                        a.name.toLowerCase().includes(prefix) ||
                        prefix.includes(a.name.toLowerCase())
                    );
                }
            }
        }
        return null;
    }, [transaction, bankAccounts]);

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined);
    const [updateRule, setUpdateRule] = useState(true);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);
    const [editedDescription, setEditedDescription] = useState<string>('');
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

    // Initial load
    useEffect(() => {
        if (visible && transaction) {
            setSelectedAccount(linkedAccount?.id); // Pre-select linked account
        }
    }, [visible, transaction, linkedAccount]);

    // Animation refs
    const slideAnim = useRef(new Animated.Value(500)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && transaction) {
            setClosing(false);
            setSelectedCategory(transaction.category || '');
            setEditedDescription(transaction.description || '');
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

        // Pass edited description if changed from original
        const descriptionChanged = editedDescription !== transaction.description;
        const accountChanged = selectedAccount !== (linkedAccount?.id);

        setTimeout(async () => {
            await onConfirm(
                category,
                updateRule,
                descriptionChanged ? editedDescription : undefined,
                accountChanged ? selectedAccount : undefined
            );
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
                            {mode === 'edit' ? 'EDIT TRANSACTION' : 'CATEGORIZE TRANSACTION'}
                        </Typography>
                        <Typography variant="h3" weight="bold" align="center" style={{ marginTop: spacing.xs }}>
                            ₹{transaction.amount.toLocaleString()}
                        </Typography>

                        {/* Editable Description */}
                        <View style={[styles.descriptionInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4F4F5' }]}>
                            <TextInput
                                value={editedDescription}
                                onChangeText={setEditedDescription}
                                placeholder="Enter description..."
                                placeholderTextColor={colors.textMuted}
                                style={[styles.descriptionTextInput, { color: colors.text }]}
                                maxLength={100}
                            />
                        </View>
                        <Typography variant="caption" color="secondary" align="center" style={{ marginTop: 4 }}>
                            Tap to edit name
                        </Typography>

                        {/* Account Selector */}
                        <View style={{ marginTop: 16, height: 50 }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingHorizontal: 4, alignItems: 'center' }}
                            >
                                {bankAccounts.filter(a => a.type !== 'cash').map(acc => {
                                    const isSelected = selectedAccount === acc.id;
                                    return (
                                        <Pressable
                                            key={acc.id}
                                            onPress={() => setSelectedAccount(isSelected ? undefined : acc.id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 6,
                                                paddingHorizontal: 12,
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? (isDark ? '#3F3F46' : '#E4E4E7') : 'transparent',
                                                borderWidth: 1,
                                                borderColor: isSelected ? colors.primary : (isDark ? '#3F3F46' : '#E4E4E7'),
                                                gap: 6
                                            }}
                                        >
                                            <Typography variant="caption">{acc.icon}</Typography>
                                            <Typography variant="caption" weight={isSelected ? 'bold' : 'medium'} style={{ color: isSelected ? colors.primary : colors.textSecondary }}>
                                                {acc.name}
                                            </Typography>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
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

                        {/* Add New Category Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.catItem,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F4F4F5',
                                    borderColor: colors.border,
                                    borderStyle: 'dashed',
                                    transform: [{ scale: pressed ? 0.98 : 1 }]
                                }
                            ]}
                            onPress={() => setShowAddCategoryModal(true)}
                        >
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                                <Typography variant="caption" style={{ color: '#FFF', fontSize: 16, lineHeight: 20 }}>+</Typography>
                            </View>
                            <Typography
                                variant="caption"
                                weight="medium"
                                style={{ color: colors.textSecondary, fontSize: 10 }}
                                align="center"
                            >
                                Add New
                            </Typography>
                        </Pressable>
                    </ScrollView>

                    <AddCategoryModal
                        visible={showAddCategoryModal}
                        onClose={() => setShowAddCategoryModal(false)}
                        onAdd={(newCat) => {
                            // Optionally auto-select the new category
                            // handleSelect(newCat.key); // Uncomment if we want immediate selection
                        }}
                    />

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

    // Description Input
    descriptionInput: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        minWidth: 200,
        alignItems: 'center',
    },
    descriptionTextInput: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        minWidth: 200,
        paddingVertical: 4,
    },
});
