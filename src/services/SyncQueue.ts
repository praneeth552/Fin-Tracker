/**
 * Sync Queue Service
 * ==================
 * Handles syncing offline operations when connection is restored
 * Implements merge strategy for conflicts
 */

import { OfflineCache, PendingOperation, ConnectionStatus } from './OfflineCache';
import { GoogleSheetsService } from './GoogleSheetsService';

// Max retries before dropping an operation
const MAX_RETRIES = 3;

// Sync status
export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncStatusListener = (status: SyncStatus, pendingCount: number) => void;
let syncStatusListeners: SyncStatusListener[] = [];
let currentSyncStatus: SyncStatus = 'idle';

export const SyncQueue = {
    // Get current sync status
    getStatus: (): SyncStatus => currentSyncStatus,

    // Subscribe to sync status changes
    onStatusChange: (listener: SyncStatusListener): (() => void) => {
        syncStatusListeners.push(listener);
        return () => {
            syncStatusListeners = syncStatusListeners.filter(l => l !== listener);
        };
    },

    // Update and broadcast status
    _setStatus: async (status: SyncStatus) => {
        currentSyncStatus = status;
        const pending = await OfflineCache.getPendingOperations();
        syncStatusListeners.forEach(listener => listener(status, pending.length));
    },

    /**
     * Initialize sync queue - sets up connection listener for auto-sync
     */
    init: async () => {
        await OfflineCache.init();

        // Listen for connection changes
        OfflineCache.onConnectionChange(async (status: ConnectionStatus) => {
            if (status === 'online') {
                console.log('Connection restored - syncing pending operations...');
                await SyncQueue.syncAll();
            }
        });

        // Sync on init if online
        if (OfflineCache.getConnectionStatus() === 'online') {
            await SyncQueue.syncAll();
        }
    },

    /**
     * Add an operation to the queue and sync if online
     */
    queueOperation: async (
        type: PendingOperation['type'],
        entity: PendingOperation['entity'],
        data: any
    ): Promise<boolean> => {
        await OfflineCache.addPendingOperation({ type, entity, data });

        // Try to sync immediately if online
        if (OfflineCache.getConnectionStatus() === 'online') {
            return await SyncQueue.syncAll();
        }
        return false;
    },

    /**
     * Process a single pending operation
     */
    processOperation: async (op: PendingOperation): Promise<boolean> => {
        try {
            switch (op.entity) {
                case 'transaction':
                    return await SyncQueue._processTransactionOp(op);
                case 'bankAccount':
                    return await SyncQueue._processBankAccountOp(op);
                case 'budget':
                    return await SyncQueue._processBudgetOp(op);
                case 'category':
                    return await SyncQueue._processCategoryOp(op);
                default:
                    console.warn('Unknown entity type:', op.entity);
                    return false;
            }
        } catch (error) {
            console.error('Error processing operation:', op, error);
            return false;
        }
    },

    // Process transaction operations
    _processTransactionOp: async (op: PendingOperation): Promise<boolean> => {
        switch (op.type) {
            case 'create':
                await GoogleSheetsService.createTransaction(op.data);
                return true;
            case 'update':
                // TODO: Implement transaction update
                console.log('Transaction update not yet implemented');
                return true;
            case 'delete':
                // TODO: Implement transaction delete
                console.log('Transaction delete not yet implemented');
                return true;
            default:
                return false;
        }
    },

    // Process bank account operations
    _processBankAccountOp: async (op: PendingOperation): Promise<boolean> => {
        switch (op.type) {
            case 'create':
                await GoogleSheetsService.createBankAccount(op.data);
                return true;
            case 'update':
                await GoogleSheetsService.updateBankAccount(op.data.id, op.data);
                return true;
            case 'delete':
                await GoogleSheetsService.deleteBankAccount(op.data.id);
                return true;
            default:
                return false;
        }
    },

    // Process budget operations
    _processBudgetOp: async (op: PendingOperation): Promise<boolean> => {
        switch (op.type) {
            case 'update':
                await GoogleSheetsService.updateBudget(op.data.category, op.data.limit);
                return true;
            default:
                return false;
        }
    },

    // Process category operations
    _processCategoryOp: async (op: PendingOperation): Promise<boolean> => {
        switch (op.type) {
            case 'create':
                await GoogleSheetsService.appendRow('Categories', [
                    op.data.id, op.data.key, op.data.label, op.data.icon, op.data.color, false
                ]);
                return true;
            default:
                return false;
        }
    },

    /**
     * Sync all pending operations
     * Returns true if all operations succeed
     */
    syncAll: async (): Promise<boolean> => {
        if (currentSyncStatus === 'syncing') {
            console.log('Sync already in progress');
            return false;
        }

        if (OfflineCache.getConnectionStatus() !== 'online') {
            console.log('Offline - cannot sync');
            return false;
        }

        const ops = await OfflineCache.getPendingOperations();
        if (ops.length === 0) {
            return true;
        }

        await SyncQueue._setStatus('syncing');
        console.log(`Syncing ${ops.length} pending operations...`);

        let allSuccess = true;
        const failedOps: PendingOperation[] = [];

        for (const op of ops) {
            const success = await SyncQueue.processOperation(op);

            if (success) {
                await OfflineCache.removePendingOperation(op.id);
                console.log(`✓ Synced: ${op.type} ${op.entity}`);
            } else {
                allSuccess = false;

                if (op.retryCount >= MAX_RETRIES) {
                    // Drop operation after max retries
                    await OfflineCache.removePendingOperation(op.id);
                    console.warn(`✗ Dropped after ${MAX_RETRIES} retries: ${op.type} ${op.entity}`);
                } else {
                    // Increment retry count
                    await OfflineCache.incrementRetryCount(op.id);
                    failedOps.push(op);
                    console.warn(`⟳ Retry scheduled: ${op.type} ${op.entity} (attempt ${op.retryCount + 1})`);
                }
            }
        }

        if (allSuccess) {
            await OfflineCache.recordSync();
            await SyncQueue._setStatus('idle');
        } else {
            await SyncQueue._setStatus('error');
        }

        return allSuccess;
    },

    /**
     * Merge conflict resolution
     * Strategy: Combine local changes with server data
     */
    mergeTransactions: (localTxs: any[], serverTxs: any[]): any[] => {
        const serverMap = new Map(serverTxs.map(tx => [tx.id, tx]));
        const merged = [...serverTxs];

        for (const localTx of localTxs) {
            if (!serverMap.has(localTx.id)) {
                // New local transaction - add to merged
                merged.push(localTx);
            } else {
                // Exists in both - server wins (could be enhanced with timestamp comparison)
                // The local copy is discarded in favor of server
            }
        }

        return merged;
    },

    /**
     * Get count of pending operations
     */
    getPendingCount: async (): Promise<number> => {
        const ops = await OfflineCache.getPendingOperations();
        return ops.length;
    },

    /**
     * Clear all pending operations (use with caution)
     */
    clearQueue: async (): Promise<void> => {
        await OfflineCache.clearPendingOperations();
        await SyncQueue._setStatus('idle');
    },
};

export default SyncQueue;
