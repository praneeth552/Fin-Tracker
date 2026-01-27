/**
 * Offline Cache Service
 * ======================
 * Caches app data in AsyncStorage for offline access
 * Provides read-from-cache-first strategy with background sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
    TRANSACTIONS: '@fintracker_cache_transactions',
    BUDGETS: '@fintracker_cache_budgets',
    CATEGORIES: '@fintracker_cache_categories',
    BANK_ACCOUNTS: '@fintracker_cache_bank_accounts',
    USER_DATA: '@fintracker_cache_user_data',
    LAST_SYNC: '@fintracker_cache_last_sync',
    PENDING_OPS: '@fintracker_pending_operations',
} as const;

// Types
export interface CachedData<T> {
    data: T;
    timestamp: number;
    version: number;
}

export interface PendingOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'transaction' | 'budget' | 'category' | 'bankAccount';
    data: any;
    createdAt: number;
    retryCount: number;
}

export type ConnectionStatus = 'online' | 'offline' | 'unknown';

// Cache expiration (1 hour)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

// Current cache version
const CACHE_VERSION = 1;

// Connection status listeners
type ConnectionListener = (status: ConnectionStatus) => void;
let connectionListeners: ConnectionListener[] = [];
let currentConnectionStatus: ConnectionStatus = 'online'; // Assume online by default

// Simple connectivity check using fetch
const checkConnectivity = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
};

export const OfflineCache = {
    // Initialize the cache system
    init: async (): Promise<ConnectionStatus> => {
        const isOnline = await checkConnectivity();
        currentConnectionStatus = isOnline ? 'online' : 'offline';

        // Periodically check connectivity (every 30 seconds)
        setInterval(async () => {
            const wasOnline = currentConnectionStatus === 'online';
            const isNowOnline = await checkConnectivity();
            const newStatus: ConnectionStatus = isNowOnline ? 'online' : 'offline';

            if (newStatus !== currentConnectionStatus) {
                currentConnectionStatus = newStatus;
                connectionListeners.forEach(listener => listener(newStatus));
            }
        }, 30000);

        return currentConnectionStatus;
    },

    // Get current connection status
    getConnectionStatus: (): ConnectionStatus => currentConnectionStatus,

    // Manually set connection status (useful for testing)
    setConnectionStatus: (status: ConnectionStatus) => {
        if (status !== currentConnectionStatus) {
            currentConnectionStatus = status;
            connectionListeners.forEach(listener => listener(status));
        }
    },

    // Subscribe to connection changes
    onConnectionChange: (listener: ConnectionListener): (() => void) => {
        connectionListeners.push(listener);
        // Return unsubscribe function
        return () => {
            connectionListeners = connectionListeners.filter(l => l !== listener);
        };
    },

    // Generic cache get
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const cached = await AsyncStorage.getItem(key);
            if (!cached) return null;

            const parsed: CachedData<T> = JSON.parse(cached);

            // Check version
            if (parsed.version !== CACHE_VERSION) {
                await AsyncStorage.removeItem(key);
                return null;
            }

            return parsed.data;
        } catch (error) {
            console.error('OfflineCache.get error:', error);
            return null;
        }
    },

    // Generic cache set
    set: async <T>(key: string, data: T): Promise<void> => {
        try {
            const cached: CachedData<T> = {
                data,
                timestamp: Date.now(),
                version: CACHE_VERSION,
            };
            await AsyncStorage.setItem(key, JSON.stringify(cached));
        } catch (error) {
            console.error('OfflineCache.set error:', error);
        }
    },

    // Check if cache is expired
    isExpired: async (key: string): Promise<boolean> => {
        try {
            const cached = await AsyncStorage.getItem(key);
            if (!cached) return true;

            const parsed: CachedData<any> = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            return age > CACHE_EXPIRATION_MS;
        } catch {
            return true;
        }
    },

    // ----- Specific entity caching -----

    // Transactions
    getTransactions: async () => {
        return await OfflineCache.get<any[]>(CACHE_KEYS.TRANSACTIONS);
    },
    setTransactions: async (transactions: any[]) => {
        await OfflineCache.set(CACHE_KEYS.TRANSACTIONS, transactions);
    },

    // Budgets
    getBudgets: async () => {
        return await OfflineCache.get<any[]>(CACHE_KEYS.BUDGETS);
    },
    setBudgets: async (budgets: any[]) => {
        await OfflineCache.set(CACHE_KEYS.BUDGETS, budgets);
    },

    // Categories
    getCategories: async () => {
        return await OfflineCache.get<any[]>(CACHE_KEYS.CATEGORIES);
    },
    setCategories: async (categories: any[]) => {
        await OfflineCache.set(CACHE_KEYS.CATEGORIES, categories);
    },

    // Bank Accounts
    getBankAccounts: async () => {
        return await OfflineCache.get<any[]>(CACHE_KEYS.BANK_ACCOUNTS);
    },
    setBankAccounts: async (accounts: any[]) => {
        await OfflineCache.set(CACHE_KEYS.BANK_ACCOUNTS, accounts);
    },

    // User Data
    getUserData: async () => {
        return await OfflineCache.get<any>(CACHE_KEYS.USER_DATA);
    },
    setUserData: async (userData: any) => {
        await OfflineCache.set(CACHE_KEYS.USER_DATA, userData);
    },

    // ----- Pending Operations Queue -----

    // Get pending operations
    getPendingOperations: async (): Promise<PendingOperation[]> => {
        try {
            const ops = await AsyncStorage.getItem(CACHE_KEYS.PENDING_OPS);
            return ops ? JSON.parse(ops) : [];
        } catch {
            return [];
        }
    },

    // Add operation to queue
    addPendingOperation: async (op: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<void> => {
        try {
            const ops = await OfflineCache.getPendingOperations();
            const newOp: PendingOperation = {
                ...op,
                id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: Date.now(),
                retryCount: 0,
            };
            ops.push(newOp);
            await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPS, JSON.stringify(ops));
        } catch (error) {
            console.error('addPendingOperation error:', error);
        }
    },

    // Remove operation from queue
    removePendingOperation: async (opId: string): Promise<void> => {
        try {
            const ops = await OfflineCache.getPendingOperations();
            const filtered = ops.filter(op => op.id !== opId);
            await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPS, JSON.stringify(filtered));
        } catch (error) {
            console.error('removePendingOperation error:', error);
        }
    },

    // Increment retry count for an operation
    incrementRetryCount: async (opId: string): Promise<void> => {
        try {
            const ops = await OfflineCache.getPendingOperations();
            const updated = ops.map(op =>
                op.id === opId ? { ...op, retryCount: op.retryCount + 1 } : op
            );
            await AsyncStorage.setItem(CACHE_KEYS.PENDING_OPS, JSON.stringify(updated));
        } catch (error) {
            console.error('incrementRetryCount error:', error);
        }
    },

    // Clear all pending operations
    clearPendingOperations: async (): Promise<void> => {
        await AsyncStorage.removeItem(CACHE_KEYS.PENDING_OPS);
    },

    // ----- Sync management -----

    // Record last sync time
    recordSync: async (): Promise<void> => {
        await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    },

    // Get last sync time
    getLastSyncTime: async (): Promise<number | null> => {
        const time = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
        return time ? parseInt(time, 10) : null;
    },

    // Clear all cache
    clearAll: async (): Promise<void> => {
        const keys = Object.values(CACHE_KEYS);
        await AsyncStorage.multiRemove(keys);
    },
};

export default OfflineCache;
