/**
 * Accounts Screen - Manage Bank Accounts
 * ========================================
 * List of accounts with balances, add/edit, and transaction statement view
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    Modal,
    TextInput,
    useColorScheme,
    Dimensions,
    Alert,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useApp, BankAccount, Transaction } from '../../context/AppContext';
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
    onAdd: (account: Omit<BankAccount, 'id'>) => Promise<boolean>;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose, onAdd }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [type, setType] = useState<BankAccount['type']>('bank');

    const handleSave = async () => {
        if (name && balance) {
            const success = await onAdd({
                name,
                balance: parseFloat(balance),
                type,
                icon: type === 'cash' ? '💵' : type === 'card' ? '💳' : type === 'wallet' ? '📱' : '🏦',
            });

            if (success) {
                setName('');
                setBalance('');
                setType('bank');
                onClose();
            } else {
                Alert.alert("Error", "Failed to add account. Please try again.");
            }
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

// Account Statement Modal - Shows transactions for a specific account
interface AccountStatementModalProps {
    visible: boolean;
    onClose: () => void;
    account: BankAccount | null;
    transactions: Transaction[];
}

const AccountStatementModal: React.FC<AccountStatementModalProps> = ({ visible, onClose, account, transactions }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const insets = useSafeAreaInsets();

    if (!account) return null;

    // Filter transactions for this account
    const accountTransactions = transactions.filter(t => {
        // 1. Direct match by accountId (if set in memory)
        if (t.accountId === account.id) return true;

        // 2. Direct match by accountNumber (if manually linked via ID)
        // Ensure string comparison to handle cases where Sheets returns numbers
        if (String(t.accountNumber) === String(account.id)) return true;

        // 3. Fuzzy match by accountNumber (if SMS parsed 4 digits matches account name eg. "HDFC - 1234")
        if (t.accountNumber && account.name.includes(t.accountNumber)) return true;

        return false;
    });

    // Calculate totals
    const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const bgColor = isDark ? colors.card : '#FFFFFF';
    const gradient = ACCOUNTS_GRADIENTS[account.type] || ACCOUNTS_GRADIENTS.bank;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.statementContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                {/* Header */}
                <LinearGradient colors={gradient} style={styles.statementHeader}>
                    <View style={styles.statementHeaderTop}>
                        <Pressable onPress={onClose} style={styles.backBtn}>
                            <Icon name="arrow-left" size={24} color="#FFF" />
                        </Pressable>
                        <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>
                            Account Statement
                        </Typography>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.statementAccountInfo}>
                        <Icon
                            name={account.type === 'cash' ? 'cash' : account.type === 'card' ? 'credit-card' : account.type === 'wallet' ? 'wallet' : 'bank'}
                            size={32}
                            color="#FFF"
                        />
                        <Typography variant="lg" weight="semibold" style={{ color: '#FFF', marginTop: spacing.sm }}>
                            {account.name}
                        </Typography>
                        <Typography variant="h2" weight="bold" style={{ color: '#FFF', marginTop: 4 }}>
                            ₹{account.balance.toLocaleString()}
                        </Typography>
                    </View>
                    <View style={styles.statementSummary}>
                        <View style={styles.statementSummaryItem}>
                            <Icon name="arrow-down" size={16} color="#22C55E" />
                            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>Income</Typography>
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF', marginLeft: 6 }}>₹{totalIncome.toLocaleString()}</Typography>
                        </View>
                        <View style={styles.statementSummaryItem}>
                            <Icon name="arrow-up" size={16} color="#EF4444" />
                            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>Expenses</Typography>
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF', marginLeft: 6 }}>₹{totalExpenses.toLocaleString()}</Typography>
                        </View>
                    </View>
                </LinearGradient>

                {/* Transactions List */}
                <View style={{ flex: 1, padding: spacing.lg }}>
                    <Typography variant="caption" color="secondary" style={{ marginBottom: spacing.sm }}>
                        {accountTransactions.length} TRANSACTION{accountTransactions.length !== 1 ? 'S' : ''}
                    </Typography>

                    {/* DEBUG INFO REMOVED */}




                    <ScrollView
                        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {accountTransactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="receipt" size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 16 }} />
                                <Typography variant="body" color="secondary" style={{ textAlign: 'center' }}>
                                    No transactions linked to this account yet.
                                </Typography>
                            </View>
                        ) : (
                            <View>
                                {accountTransactions.map((tx) => (
                                    <View
                                        key={tx.id}
                                        style={[styles.transactionItem, { backgroundColor: bgColor }]}
                                    >
                                        <View style={[
                                            styles.txIcon,
                                            { backgroundColor: tx.type === 'income' ? '#22C55E20' : '#EF444420' }
                                        ]}>
                                            <Icon
                                                name={tx.type === 'income' ? 'arrow-down-bold' : 'arrow-up-bold'}
                                                size={18}
                                                color={tx.type === 'income' ? '#22C55E' : '#EF4444'}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                                            <Typography variant="body" weight="medium" numberOfLines={1}>
                                                {tx.description || tx.category || 'Transaction'}
                                            </Typography>
                                            <Typography variant="caption" color="secondary">
                                                {new Date(tx.date).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                                {tx.category ? ` • ${tx.category}` : ''}
                                            </Typography>
                                        </View>
                                        <Typography
                                            variant="body"
                                            weight="semibold"
                                            style={{ color: tx.type === 'income' ? '#22C55E' : '#EF4444' }}
                                        >
                                            {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </Typography>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
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

    const { bankAccounts, addBankAccount, totalIncome, totalSpent, transactions, filteredTransactions, refreshData, selectedMonth, selectedYear } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    const [showStatementModal, setShowStatementModal] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const handleAccountPress = (account: BankAccount) => {
        setSelectedAccount(account);
        setShowStatementModal(true);
    };

    const renderAccount = ({ item }: { item: BankAccount }) => {
        const gradient = ACCOUNTS_GRADIENTS[item.type] || ACCOUNTS_GRADIENTS.bank;

        return (
            <Pressable
                style={styles.cardContainer}
                onPress={() => handleAccountPress(item)}
            >
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
                        <View style={styles.viewStatementHint}>
                            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.7)', marginRight: 4 }}>View</Typography>
                            <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
                        </View>
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
            </Pressable>
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            />

            <AddAccountModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={addBankAccount}
            />

            <AccountStatementModal
                visible={showStatementModal}
                onClose={() => setShowStatementModal(false)}
                account={selectedAccount}
                transactions={filteredTransactions}
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
    // Account Statement Modal Styles
    statementContainer: {
        flex: 1,
    },
    statementHeader: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    statementHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    statementAccountInfo: {
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    statementSummary: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginTop: spacing.md,
    },
    statementSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
    },
    txIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewStatementHint: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default AccountsScreen;
