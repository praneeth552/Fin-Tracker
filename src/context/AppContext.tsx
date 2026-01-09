/**
 * App Context - Global State Management
 * ======================================
 * Manages transactions, budgets, and user data with persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
    date: string;
    merchant?: string;
    paymentMethod?: 'cash' | 'upi' | 'card' | 'netbanking';
    accountId?: string;
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
    key: string;
    label: string;
    icon: string;
    color: string;
}

export interface UserData {
    name: string;
    income: number;
    balance: number;
}

interface AppContextType {
    // User
    userData: UserData;
    updateUserData: (data: Partial<UserData>) => void;

    // Transactions
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    deleteTransaction: (id: string) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;

    // Budgets
    budgets: Budget[];
    updateBudget: (category: string, limit: number) => void;

    // Custom Categories
    customCategories: CustomCategory[];
    addCustomCategory: (category: CustomCategory) => void;

    // Bank Accounts
    bankAccounts: BankAccount[];
    addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
    updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
    deleteBankAccount: (id: string) => void;

    // Computed
    totalSpent: number;
    totalIncome: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
    USER_DATA: '@fintracker_user_data_v2',
    TRANSACTIONS: '@fintracker_transactions_v2',
    BUDGETS: '@fintracker_budgets_v2',
    CUSTOM_CATEGORIES: '@fintracker_custom_categories_v2',
    BANK_ACCOUNTS: '@fintracker_bank_accounts_v2',
};

// Default bank accounts
const defaultBankAccounts: BankAccount[] = [
    { id: '1', name: 'HDFC Bank', type: 'bank', icon: '🏦', balance: 25000 },
    { id: '2', name: 'Paytm Wallet', type: 'wallet', icon: '📱', balance: 4500 },
    { id: '3', name: 'SBI Savings', type: 'bank', icon: '🏦', balance: 12000 },
    { id: '4', name: 'SBI Credit Card', type: 'card', icon: '💳', balance: -15000 },
];

// Default data
const defaultUserData: UserData = {
    name: 'User',
    income: 85000,
    balance: 41500,
};

const defaultBudgets: Budget[] = [
    { category: 'food', limit: 8000, spent: 6240 },
    { category: 'transport', limit: 3000, spent: 1860 },
    { category: 'shopping', limit: 5000, spent: 3200 },
    { category: 'bills', limit: 7000, spent: 5500 },
    { category: 'entertainment', limit: 3000, spent: 2499 },
    { category: 'health', limit: 2000, spent: 800 },
    { category: 'misc', limit: 2000, spent: 500 },
];

const defaultTransactions: Transaction[] = [
    // Today's Transactions
    { id: 't1', amount: 150, description: 'Morning Coffee', category: 'food', type: 'expense', date: new Date().toISOString().split('T')[0], merchant: 'Starbucks' },
    { id: 't2', amount: 450, description: 'Lunch at Subway', category: 'food', type: 'expense', date: new Date().toISOString().split('T')[0], merchant: 'Subway' },
    { id: 't3', amount: 30, description: 'Bus Ticket', category: 'transport', type: 'expense', date: new Date().toISOString().split('T')[0], merchant: 'BMTC' },

    // Past Transactions
    { id: '1', amount: 245, description: 'Swiggy Order', category: 'food', type: 'expense', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], merchant: 'Swiggy' },
    { id: '2', amount: 186, description: 'Uber Trip', category: 'transport', type: 'expense', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], merchant: 'Uber' },
    { id: '3', amount: 1499, description: 'Netflix Subscription', category: 'entertainment', type: 'expense', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], merchant: 'Netflix' },
    { id: '4', amount: 3200, description: 'BigBasket Grocery', category: 'food', type: 'expense', date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], merchant: 'BigBasket' },
    { id: '5', amount: 85000, description: 'Salary', category: 'income', type: 'income', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userData, setUserData] = useState<UserData>(defaultUserData);
    const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
    const [budgets, setBudgets] = useState<Budget[]>(defaultBudgets);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(defaultBankAccounts);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load data from storage on mount
    useEffect(() => {
        loadData();
    }, []);

    // Save data whenever it changes
    useEffect(() => {
        if (isLoaded) {
            saveData();
        }
    }, [userData, transactions, budgets, customCategories, bankAccounts, isLoaded]);

    const loadData = async () => {
        try {
            const [userStr, transStr, budgetStr, catStr, accStr] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
                AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
                AsyncStorage.getItem(STORAGE_KEYS.BUDGETS),
                AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES),
                AsyncStorage.getItem(STORAGE_KEYS.BANK_ACCOUNTS),
            ]);

            if (userStr) setUserData(JSON.parse(userStr));
            if (transStr) setTransactions(JSON.parse(transStr));
            if (budgetStr) setBudgets(JSON.parse(budgetStr));
            if (catStr) setCustomCategories(JSON.parse(catStr));
            if (accStr) setBankAccounts(JSON.parse(accStr));
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setIsLoaded(true);
    };

    const saveData = async () => {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
                AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)),
                AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets)),
                AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(customCategories)),
                AsyncStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(bankAccounts)),
            ]);
        } catch (error) {
            console.error('Error saving data:', error);
        }
    };

    const updateUserData = (data: Partial<UserData>) => {
        setUserData(prev => ({ ...prev, ...data }));
    };

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
            date: transaction.date || new Date().toISOString().split('T')[0],
        };

        setTransactions(prev => [newTransaction, ...prev]);

        // Update budget spent if expense
        if (transaction.type === 'expense') {
            setBudgets(prev => prev.map(b =>
                b.category === transaction.category
                    ? { ...b, spent: b.spent + transaction.amount }
                    : b
            ));
            // Update balance
            setUserData(prev => ({ ...prev, balance: prev.balance - transaction.amount }));

            // Update Bank Account
            if (transaction.accountId) {
                setBankAccounts(prev => prev.map(acc =>
                    acc.id === transaction.accountId
                        ? { ...acc, balance: acc.balance - transaction.amount }
                        : acc
                ));
            }
        } else {
            // Income
            setUserData(prev => ({
                ...prev,
                balance: prev.balance + transaction.amount,
                income: prev.income + transaction.amount
            }));

            // Update Bank Account
            if (transaction.accountId) {
                setBankAccounts(prev => prev.map(acc =>
                    acc.id === transaction.accountId
                        ? { ...acc, balance: acc.balance + transaction.amount }
                        : acc
                ));
            }
        }
    };

    const deleteTransaction = (id: string) => {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
            setTransactions(prev => prev.filter(t => t.id !== id));

            if (tx.type === 'expense') {
                setBudgets(prev => prev.map(b =>
                    b.category === tx.category
                        ? { ...b, spent: Math.max(0, b.spent - tx.amount) }
                        : b
                ));
                setUserData(prev => ({ ...prev, balance: prev.balance + tx.amount }));

                // Reverse Bank Account effect (Credit back)
                if (tx.accountId) {
                    setBankAccounts(prev => prev.map(acc =>
                        acc.id === tx.accountId
                            ? { ...acc, balance: acc.balance + tx.amount }
                            : acc
                    ));
                }
            } else {
                setUserData(prev => ({
                    ...prev,
                    balance: prev.balance - tx.amount,
                    income: prev.income - tx.amount
                }));

                // Reverse Bank Account effect (Debit back)
                if (tx.accountId) {
                    setBankAccounts(prev => prev.map(acc =>
                        acc.id === tx.accountId
                            ? { ...acc, balance: acc.balance - tx.amount }
                            : acc
                    ));
                }
            }
        }
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates } : t
        ));
    };

    const updateBudget = (category: string, limit: number) => {
        setBudgets(prev => prev.map(b =>
            b.category === category ? { ...b, limit } : b
        ));
    };

    const addCustomCategory = (category: CustomCategory) => {
        setCustomCategories(prev => [...prev, category]);
        // Also add a budget entry for the new category
        setBudgets(prev => [...prev, { category: category.key, limit: 5000, spent: 0 }]);
    };

    // Bank Accounts handlers
    const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
        const newAccount = { ...account, id: Date.now().toString() };
        setBankAccounts(prev => [...prev, newAccount]);
    };

    const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
        setBankAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...updates } : acc));
    };

    const deleteBankAccount = (id: string) => {
        setBankAccounts(prev => prev.filter(acc => acc.id !== id));
    };

    const totalSpent = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <AppContext.Provider value={{
            userData,
            updateUserData,
            transactions,
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
