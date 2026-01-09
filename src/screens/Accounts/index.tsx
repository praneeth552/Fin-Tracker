/**
 * Accounts Screen - Manage Bank Accounts
 * ========================================
 * List of accounts with balances and add/edit functionality
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    Modal,
    TextInput,
    useColorScheme,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useApp, BankAccount } from '../../context/AppContext';
import { Typography } from '../../components/common';
import { themes, spacing } from '../../theme';

const { width } = Dimensions.get('window');

const ACCOUNTS_GRADIENTS = {
    bank: ['#3B82F6', '#2563EB'],
    wallet: ['#8B5CF6', '#7C3AED'],
    card: ['#F59E0B', '#D97706'],
    cash: ['#10B981', '#059669'],
};

interface AddAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (account: Omit<BankAccount, 'id'>) => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose, onAdd }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [type, setType] = useState<BankAccount['type']>('bank');

    const handleSave = () => {
        if (name && balance) {
            onAdd({
                name,
                balance: parseFloat(balance),
                type,
                icon: type === 'cash' ? '💵' : type === 'card' ? '💳' : type === 'wallet' ? '📱' : '🏦',
            });
            setName('');
            setBalance('');
            setType('bank');
            onClose();
        }
    };

    const bgColor = isDark ? colors.card : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                    <Typography variant="h3" style={{ marginBottom: spacing.lg }}>Add Account</Typography>

                    <View style={styles.inputGroup}>
                        <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>Account Name</Typography>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                            placeholder="e.g. HDFC Savings"
                            placeholderTextColor={colors.textMuted}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>Opening Balance</Typography>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={balance}
                            onChangeText={setBalance}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>Type</Typography>
                        <View style={styles.typeRow}>
                            {(['bank', 'wallet', 'card', 'cash'] as const).map(t => (
                                <Pressable
                                    key={t}
                                    style={[
                                        styles.typeChip,
                                        {
                                            backgroundColor: type === t ? colors.primary : inputBg,
                                        }
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <Icon
                                        name={t === 'cash' ? 'cash' : t === 'card' ? 'credit-card' : t === 'wallet' ? 'wallet' : 'bank'}
                                        size={20}
                                        color={type === t ? '#FFF' : colors.textMuted}
                                    />
                                    <Typography
                                        variant="caption"
                                        style={{ color: type === t ? '#FFF' : colors.textMuted, marginTop: 4 }}
                                    >
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Typography>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Typography color="secondary">Cancel</Typography>
                        </Pressable>
                        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                            <Typography style={{ color: '#FFF' }} weight="semibold">Save Account</Typography>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AccountsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const { bankAccounts, addBankAccount, totalIncome, totalSpent } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);

    const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const renderAccount = ({ item }: { item: BankAccount }) => {
        const gradient = ACCOUNTS_GRADIENTS[item.type] || ACCOUNTS_GRADIENTS.bank;

        return (
            <View style={styles.cardContainer}>
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Icon
                                name={item.type === 'cash' ? 'cash' : item.type === 'card' ? 'credit-card' : item.type === 'wallet' ? 'wallet' : 'bank'}
                                size={24}
                                color="#FFF"
                            />
                        </View>
                        <Pressable>
                            <Icon name="dots-horizontal" size={24} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    </View>

                    <View style={styles.cardBody}>
                        <Typography variant="body" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {item.name}
                        </Typography>
                        <Typography variant="h2" weight="bold" style={{ color: '#FFF', marginTop: 4 }}>
                            ₹{item.balance.toLocaleString()}
                        </Typography>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.chip}>
                            <Typography variant="caption" style={{ color: '#FFF', opacity: 0.9 }}>
                                {item.type.toUpperCase()}
                            </Typography>
                        </View>
                    </View>

                    {/* Decorative Circles */}
                    <View style={[styles.circle, { width: 100, height: 100, right: -20, top: -20, opacity: 0.1 }]} />
                    <View style={[styles.circle, { width: 60, height: 60, right: 40, bottom: -20, opacity: 0.1 }]} />
                </LinearGradient>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View>
                    <Typography variant="h2" weight="bold">Accounts</Typography>
                    <Typography variant="body" color="secondary">Manage your money sources</Typography>
                </View>
                <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.card }]}
                    onPress={() => setShowAddModal(true)}
                >
                    <Icon name="plus" size={24} color={colors.primary} />
                </Pressable>
            </View>

            <View style={styles.summaryBlock}>
                <View style={[styles.summaryItem, { backgroundColor: colors.card }]}>
                    <Typography variant="caption" color="secondary">Total Balance</Typography>
                    <Typography variant="h3" weight="bold" style={{ color: colors.primary, marginTop: 4 }}>
                        ₹{totalBalance.toLocaleString()}
                    </Typography>
                </View>
            </View>

            <FlatList
                data={bankAccounts}
                renderItem={renderAccount}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            <AddAccountModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={addBankAccount}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryBlock: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    summaryItem: {
        padding: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.lg,
        gap: spacing.md,
        paddingBottom: 100,
    },
    cardContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    card: {
        borderRadius: 20,
        padding: spacing.lg,
        height: 160,
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        marginVertical: spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chip: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    circle: {
        position: 'absolute',
        backgroundColor: '#FFF',
        borderRadius: 100,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        borderRadius: 24,
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    input: {
        borderRadius: 12,
        padding: spacing.md,
        fontSize: 16,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    typeChip: {
        width: '48%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: spacing.md,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    saveBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
});

export default AccountsScreen;
