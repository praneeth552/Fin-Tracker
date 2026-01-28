/**
 * App Context - Global State Management
 * ======================================
 * Manages transactions, budgets, and user data via Spring Boot Backend
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Api } from '../services/api';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { SMSListenerService } from '../services/SMSListenerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAvailableMonths, MonthOption } from '../components/MonthDropdown';

// Types (Frontend)
export interface Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
    date: string;
    merchant?: string;
    paymentMethod?: 'cash' | 'upi' | 'card' | 'netbanking' | 'sms-auto';
    accountId?: string;
    accountNumber?: string;  // Last 4 digits from SMS-parsed transactions
    isFromSMS?: boolean;
    needsReview?: boolean;
}

export interface BankAccount {
    id: string;
    name: string;
    type: 'bank' | 'wallet' | 'card' | 'cash';
    icon: string;
    balance: number;
}

export interface Budget {
    category: string;
    limit: number;
    spent: number;
}

export interface CustomCategory {
    id: number;
    key: string;  // backend uses categoryKey
    label: string;
    icon: string;
    color: string;
    isDefault: boolean;
}

export interface UserData {
    name: string;
    income: number;
    balance: number;
}

interface AppContextType {
    userData: UserData;
    updateUserData: (data: Partial<UserData>) => void;

    transactions: Transaction[];
    filteredTransactions: Transaction[]; // Transactions filtered by selected month
    addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<boolean>;
    deleteTransaction: (id: string) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;

    budgets: Budget[];
    updateBudget: (category: string, limit: number) => void;

    customCategories: CustomCategory[];
    addCustomCategory: (category: Omit<CustomCategory, 'id' | 'isDefault'>) => Promise<boolean>;

    bankAccounts: BankAccount[];
    addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<boolean>;
    updateBankAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
    deleteBankAccount: (id: string) => Promise<void>;

    totalSpent: number;
    totalIncome: number;
    isLoading: boolean;
    refreshData: () => Promise<void>;
    loadDataForMonth: (month: number, year: number) => Promise<void>;

    // Global month selection
    selectedMonth: number;
    selectedYear: number;
    setSelectedMonth: (month: number, year: number) => void;

    // Available months based on transaction data
    availableMonths: MonthOption[];

    // Detected accounts for approval
    detectedAccount: { bank: string; accountNumber: string } | null;
    confirmDetectedAccount: () => Promise<void>;
    ignoreDetectedAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initial State (Empty until loaded from API)
    const [userData, setUserData] = useState<UserData>({ name: '', income: 0, balance: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);

    // Detected Account State
    const [detectedAccount, setDetectedAccount] = useState<{ bank: string; accountNumber: string } | null>(null);

    // Global month selection state
    const now = new Date();
    const [selectedMonth, setSelectedMonthState] = useState(now.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYearState] = useState(now.getFullYear());

    // Load data from Backend
    // Load data from Backend - REMOVED: Called manually from App.tsx after auth
    // useEffect(() => {
    //    loadData();
    // }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await GoogleSheetsService.init();

            // Sync any pending SMS transactions from background
            try {
                await SMSListenerService.syncPendingTransactions();
            } catch (smsError) {
                console.log('Failed to sync pending SMS:', smsError);
            }



            // Load Transactions
            const txs = await GoogleSheetsService.getTransactions();
            const mappedTx: Transaction[] = txs.map((t: any) => ({
                id: t.id,
                amount: t.amount,
                description: t.description || '',
                category: t.category || 'uncategorized',
                type: t.type ? t.type.toLowerCase() : 'expense',
                date: t.date,
                paymentMethod: t.paymentMethod ? t.paymentMethod.toLowerCase() : 'cash',
                accountNumber: t.accountNumber,
            })).filter((t: any) => t.id && t.id.trim().length > 0);

            // Deduplicate: Keep only the first occurrence of each ID
            const uniqueTxMap = new Map<string, Transaction>();
            mappedTx.forEach(item => {
                if (!uniqueTxMap.has(item.id)) {
                    uniqueTxMap.set(item.id, item);
                }
            });
            const uniqueTx = Array.from(uniqueTxMap.values());

            const sortedTxs = uniqueTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(sortedTxs);

            // Calculate Totals locally
            let income = 0;
            let expense = 0;
            sortedTxs.forEach(t => {
                if (t.type === 'income') income += t.amount;
                else expense += t.amount;
            });
            setTotalIncome(income);
            setTotalSpent(expense);
            setUserData(prev => ({ ...prev, balance: income - expense }));

            // Load Budgets from Sheets and calculate actual spent from transactions
            const budgetsFromSheets = await GoogleSheetsService.getBudgets();
            if (budgetsFromSheets.length > 0) {
                // Calculate actual spent per category from transactions
                const spentByCategory: { [key: string]: number } = {};
                sortedTxs.forEach(t => {
                    if (t.type === 'expense') {
                        const cat = t.category ? t.category.toLowerCase() : 'uncategorized';
                        spentByCategory[cat] = (spentByCategory[cat] || 0) + t.amount;
                    }
                });

                // Merge calculated spent into budget data
                const budgetsWithSpent = budgetsFromSheets.map((b: any) => ({
                    ...b,
                    spent: b.category ? (spentByCategory[b.category.toLowerCase()] || 0) : 0
                }));
                setBudgets(budgetsWithSpent);
            } else {
                setBudgets([]);
            }

            // Load Categories from Sheets
            const categoriesFromSheets = await GoogleSheetsService.getCategories();
            if (categoriesFromSheets) {
                setCustomCategories(categoriesFromSheets.map((c: any) => ({
                    id: parseInt(c.id) || 0,
                    key: c.key,
                    label: c.label,
                    icon: c.icon,
                    color: c.color,
                    isDefault: c.isDefault
                })));
            } else {
                setCustomCategories([]);
            }

            // Load Bank Accounts from Sheets
            const accountsFromSheets = await GoogleSheetsService.getBankAccounts();
            setBankAccounts(accountsFromSheets);

            // Check for new detected accounts from SMS
            checkDetectedAccounts(accountsFromSheets);

            // Load User Name from Google Sign-In data stored in AsyncStorage
            const googleUserData = await AsyncStorage.getItem('googleUser');
            if (googleUserData) {
                const googleUser = JSON.parse(googleUserData);
                const displayName = googleUser?.data?.user?.name || googleUser?.user?.name || googleUser?.name || 'User';
                setUserData(prev => ({ ...prev, name: displayName }));
            }

        } catch (error) {
            console.error('Failed to load data from Sheets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Detected Accounts Logic ---
    const checkDetectedAccounts = async (currentAccounts: BankAccount[]) => {
        try {
            const DETECTED_ACCOUNTS_KEY = '@fintracker_detected_accounts';
            const IGNORED_ACCOUNTS_KEY = '@fintracker_ignored_accounts';

            const [detectedJson, ignoredJson] = await Promise.all([
                AsyncStorage.getItem(DETECTED_ACCOUNTS_KEY),
                AsyncStorage.getItem(IGNORED_ACCOUNTS_KEY)
            ]);

            const detected = detectedJson ? JSON.parse(detectedJson) : [];
            const ignored = ignoredJson ? JSON.parse(ignoredJson) : [];

            if (detected.length === 0) return;

            // Find first detected account that is NOT in current accounts AND NOT ignored
            const newAccount = detected.find((d: any) => {
                const exists = currentAccounts.some(a =>
                    a.name.toLowerCase().includes(d.bank.toLowerCase()) ||
                    (a.type === 'bank' && a.name.includes(d.accountNumber)) // Weak check, but something
                );

                const isIgnored = ignored.some((i: any) =>
                    i.bank === d.bank && i.accountNumber === d.accountNumber
                );

                return !exists && !isIgnored;
            });

            if (newAccount) {
                setDetectedAccount(newAccount);
            }
        } catch (error) {
            console.error('Check Detected Accounts Failed:', error);
        }
    };

    const confirmDetectedAccount = async () => {
        if (!detectedAccount) return;

        try {
            // Add to wallet
            await addBankAccount({
                name: `${detectedAccount.bank} - ${detectedAccount.accountNumber}`,
                type: 'bank',
                icon: 'bank',
                balance: 0 // User can update later
            });

            // Remove from detected list
            const DETECTED_ACCOUNTS_KEY = '@fintracker_detected_accounts';
            const existing = await AsyncStorage.getItem(DETECTED_ACCOUNTS_KEY);
            let accounts = existing ? JSON.parse(existing) : [];
            accounts = accounts.filter((a: any) =>
                !(a.bank === detectedAccount.bank && a.accountNumber === detectedAccount.accountNumber)
            );
            await AsyncStorage.setItem(DETECTED_ACCOUNTS_KEY, JSON.stringify(accounts));

            setDetectedAccount(null);
        } catch (error) {
            console.error('Confirm Account Failed:', error);
        }
    };

    const ignoreDetectedAccount = async () => {
        if (!detectedAccount) return;

        try {
            // Add to ignored list
            const IGNORED_ACCOUNTS_KEY = '@fintracker_ignored_accounts';
            const existing = await AsyncStorage.getItem(IGNORED_ACCOUNTS_KEY);
            const ignored = existing ? JSON.parse(existing) : [];
            ignored.push(detectedAccount);
            await AsyncStorage.setItem(IGNORED_ACCOUNTS_KEY, JSON.stringify(ignored));

            // Remove from detected list to prevent re-prompt
            const DETECTED_ACCOUNTS_KEY = '@fintracker_detected_accounts';
            const detectedJson = await AsyncStorage.getItem(DETECTED_ACCOUNTS_KEY);
            let accounts = detectedJson ? JSON.parse(detectedJson) : [];
            accounts = accounts.filter((a: any) =>
                !(a.bank === detectedAccount.bank && a.accountNumber === detectedAccount.accountNumber)
            );
            await AsyncStorage.setItem(DETECTED_ACCOUNTS_KEY, JSON.stringify(accounts));

            setDetectedAccount(null);

            // Check for next one
            checkDetectedAccounts(bankAccounts);
        } catch (error) {
            console.error('Ignore Account Failed:', error);
        }
    };

    // --- Actions ---

    // Update user data locally (Backend removed)
    const updateUserData = async (data: Partial<UserData>) => {
        setUserData(prev => ({ ...prev, ...data }));
    };

    const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        try {
            // Optimistic update
            const tempId = Date.now().toString();

            // Sheets Call
            await GoogleSheetsService.createTransaction({
                id: tempId,
                amount: transaction.amount,
                type: transaction.type.toUpperCase() as any,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                paymentMethod: transaction.paymentMethod?.toUpperCase() || 'CASH'
            });

            // No reload needed - rely on optimistic update
            // Wait, we didn't add it to state yet! The original code was relying on loadData to add it!
            // I need to add it to state here manually!
            const newTx: Transaction = {
                id: tempId, // WARNING: If backend generates a different ID, this will desync. But we are sending ID.
                ...transaction,
                category: transaction.category || 'uncategorized', // Default
            };
            setTransactions(prev => [newTx, ...prev]);

            return true;
        } catch (error) {
            console.error('Add Transaction Failed:', error);
            await loadData(); // Revert on error
            return false;
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            setTransactions(prev => prev.filter(t => t.id !== id)); // Optimistic
            await GoogleSheetsService.deleteTransaction(id);
            // No reload needed
        } catch (error) {
            console.error('Delete Transaction Failed:', error);
            await loadData(); // Revert on error
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        try {
            // Optimistic Update
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

            // Google Sheets Call
            await GoogleSheetsService.updateTransaction(id, {
                ...updates,
                type: updates.type ? updates.type.toUpperCase() as any : undefined,
                paymentMethod: updates.paymentMethod ? updates.paymentMethod.toUpperCase() : undefined
            });

            // No reload needed
        } catch (error) {
            console.error('Update Transaction Failed:', error);
            await loadData(); // Revert on error
        }
    };

    const updateBudget = async (category: string, limit: number) => {
        try {
            // Optimistic
            setBudgets(prev => {
                const existing = prev.find(b => b.category === category);
                if (existing) {
                    return prev.map(b => b.category === category ? { ...b, limit } : b);
                } else {
                    return [...prev, { category, limit, spent: 0 }];
                }
            });

            await GoogleSheetsService.updateBudget(category, limit);
            await loadData();
        } catch (error) {
            console.error('Update Budget Failed:', error);
            await loadData();
        }
    };

    const addCustomCategory = async (category: Omit<CustomCategory, 'id' | 'isDefault'>) => {
        try {
            const newId = Date.now(); // Use number for local ID

            // Optimistic Update
            setCustomCategories(prev => [...prev, {
                id: newId,
                key: category.key,
                label: category.label,
                icon: category.icon,
                color: category.color,
                isDefault: false
            }]);

            // API Call
            await GoogleSheetsService.appendRow('Categories', [
                newId.toString(), category.key, category.label, category.icon, category.color, 'false'
            ]);

            // Background sync (don't await to block UI)
            loadData();
            return true;
        } catch (error) {
            console.error('Add Category Failed:', error);
            await loadData(); // Revert on error
            return false;
        }
    };

    const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
        try {
            await GoogleSheetsService.createBankAccount({
                name: account.name,
                type: account.type,
                icon: account.icon,
                balance: account.balance
            });
            await loadData();
            return true;
        } catch (error) {
            console.error('Add Bank Account Failed:', error);
            return false;
        }
    };

    const updateBankAccount = async (id: string, data: Partial<BankAccount>) => {
        try {
            // Optimistic
            setBankAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));

            await GoogleSheetsService.updateBankAccount(id, data);
            // No reload needed, optimistic update is sufficient
        } catch (error) {
            console.error('Update Bank Account Failed:', error);
            await loadData();
        }
    };

    const deleteBankAccount = async (id: string) => {
        try {
            setBankAccounts(prev => prev.filter(a => a.id !== id));
            await GoogleSheetsService.deleteBankAccount(id);
            // No reload needed, optimistic update is sufficient
        } catch (error) {
            console.error('Delete Bank Account Failed:', error);
            await loadData();
        }
    };

    // Recalculate Totals whenever transactions or selected month/year changes
    useEffect(() => {
        // 1. Calculate Monthly Totals (for Dashboard)
        const monthFiltered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        });

        let monthIncome = 0;
        let monthExpense = 0;
        monthFiltered.forEach(t => {
            if (t.type === 'income') monthIncome += t.amount;
            else monthExpense += t.amount;
        });

        setTotalIncome(monthIncome);
        setTotalSpent(monthExpense);

        // 2. Calculate All-Time Balance (for UserData)
        let allIncome = 0;
        let allExpense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') allIncome += t.amount;
            else allExpense += t.amount;
        });

        setUserData(prev => ({ ...prev, balance: allIncome - allExpense }));

    }, [transactions, selectedMonth, selectedYear]);

    // Set selected month
    const setSelectedMonth = (month: number, year: number) => {
        setSelectedMonthState(month);
        setSelectedYearState(year);
        // useEffect will handle data reload/recalc
    };

    // Compute filtered transactions for selected month
    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate.getMonth() + 1 === selectedMonth && txDate.getFullYear() === selectedYear;
        });
    }, [transactions, selectedMonth, selectedYear]);

    // Compute available months from all transactions
    const availableMonths = useMemo(() => {
        return getAvailableMonths(transactions);
    }, [transactions]);

    return (
        <AppContext.Provider value={{
            userData,
            updateUserData,
            transactions,
            filteredTransactions,
            addTransaction,
            deleteTransaction,
            updateTransaction,
            budgets,
            updateBudget,
            customCategories,
            addCustomCategory,
            bankAccounts,
            addBankAccount,
            updateBankAccount,
            deleteBankAccount,
            totalSpent,
            totalIncome,
            isLoading,
            refreshData: loadData,
            loadDataForMonth: async () => { }, // Deprecated/No-op as useEffect handles it
            selectedMonth,
            selectedYear,
            setSelectedMonth,
            availableMonths,
            detectedAccount,
            confirmDetectedAccount,
            ignoreDetectedAccount,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export default AppContext;
