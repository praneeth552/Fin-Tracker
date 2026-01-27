/**
 * SMS Listener Service
 * ======================
 * Listens for incoming SMS messages and parses bank transaction messages
 * Core feature: Detect only transaction SMS (no OTPs or personal info)
 * Data stored in user's own Google Sheets - no database required
 */

import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SMSParser } from './SMSParser';
import { GoogleSheetsService } from './GoogleSheetsService';

// Type definitions for SMS message
export interface SMSMessage {
    originatingAddress: string;  // Sender (bank short code like VK-HDFCBK)
    body: string;                 // SMS text content
    timestamp: number;           // When received
    read: boolean;               // Whether already processed
}

// Type for parsed transaction ready for Google Sheets
export interface ParsedTransaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    description: string;
    category: string;
    date: string;
    merchant?: string;
    accountNumber?: string;
    balance?: number;
    needsReview: boolean;
    source: 'sms';
}

// SMS Listener State
type SMSListenerCallback = (transaction: ParsedTransaction) => void;
let isListening = false;
let transactionCallbacks: SMSListenerCallback[] = [];

// Check if platform supports SMS listening
const isPlatformSupported = (): boolean => {
    return Platform.OS === 'android';
};

// Request SMS permission (Android only)
export const requestSMSPermission = async (): Promise<boolean> => {
    if (!isPlatformSupported()) {
        console.log('SMS reading is only supported on Android');
        return false;
    }

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: 'SMS Permission Required',
                message: 'FinTracker needs SMS access to automatically detect bank transactions. We ONLY read transaction messages - OTPs and personal info are never accessed or stored.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'Allow',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.error('SMS permission request failed:', err);
        return false;
    }
};

// Check if SMS permission is granted
export const hasSMSPermission = async (): Promise<boolean> => {
    if (!isPlatformSupported()) return false;

    try {
        const result = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_SMS
        );
        return result;
    } catch {
        return false;
    }
};

// Process incoming SMS
const processSMS = async (sms: SMSMessage): Promise<ParsedTransaction | null> => {
    // Skip if not from a bank sender
    if (!SMSParser.isTransactionSMS(sms.body)) {
        console.log('[SMSListener] Not a transaction SMS, skipping');
        return null;
    }

    // Parse the SMS
    const parsed = await SMSParser.parse(sms.body, sms.originatingAddress);
    if (!parsed) {
        console.log('[SMSListener] Failed to parse SMS');
        return null;
    }

    // Convert to transaction
    const transaction = SMSParser.toTransaction(parsed);

    // Store detected bank account for "Add to Wallet" feature
    if (parsed.bank && parsed.accountNumber) {
        try {
            const DETECTED_ACCOUNTS_KEY = '@fintracker_detected_accounts';
            const existing = await AsyncStorage.getItem(DETECTED_ACCOUNTS_KEY);
            const accounts = existing ? JSON.parse(existing) : [];

            // Check if already in detected list
            const alreadyDetected = accounts.some((a: any) =>
                a.bank === parsed.bank && a.accountNumber === parsed.accountNumber
            );

            if (!alreadyDetected) {
                accounts.push({
                    bank: parsed.bank,
                    accountNumber: parsed.accountNumber,
                    timestamp: Date.now()
                });
                await AsyncStorage.setItem(DETECTED_ACCOUNTS_KEY, JSON.stringify(accounts));
                console.log(`[SMSListener] New bank account detected: ${parsed.bank} xx${parsed.accountNumber}`);
            }
        } catch (accError) {
            console.error('[SMSListener] Failed to save detected account', accError);
        }
    }

    // Add metadata
    const fullTransaction: ParsedTransaction = {
        ...transaction,
        type: transaction.type as 'income' | 'expense',
        source: 'sms',
    };

    console.log('[SMSListener] Parsed transaction:', fullTransaction);

    return fullTransaction;
};

// Save transaction to Google Sheets
const saveToGoogleSheets = async (transaction: ParsedTransaction, shouldQueue: boolean = true): Promise<boolean> => {
    try {
        // Try getting from initialized service first (in-memory, fastest)
        let accessToken = GoogleSheetsService.accessToken;
        let spreadsheetId = GoogleSheetsService.spreadsheetId;

        // Fallback to AsyncStorage if service not initialized (e.g. background check)
        if (!accessToken) {
            accessToken = await AsyncStorage.getItem('googleAccessToken');
        }
        if (!spreadsheetId) {
            spreadsheetId = await AsyncStorage.getItem('userSpreadsheetId');
        }

        if (!accessToken || !spreadsheetId) {
            console.log('[SMSListener] Credentials missing:', {
                hasToken: !!accessToken,
                hasSheetId: !!spreadsheetId
            });
            if (shouldQueue) {
                console.log('[SMSListener] Queuing transaction locally');
                await queueLocalTransaction(transaction);
            }
            return false;
        }

        // Set auth for service (ensure it's set if we got it from storage)
        GoogleSheetsService.setAuth(accessToken, spreadsheetId);

        // Save to Google Sheets
        await GoogleSheetsService.createTransaction({
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type === 'income' ? 'INCOME' : 'EXPENSE',
            description: transaction.description,
            category: transaction.category,
            date: transaction.date,
            paymentMethod: 'auto',
        });

        console.log('[SMSListener] Transaction saved to Google Sheets');
        return true;
    } catch (error) {
        console.error('[SMSListener] Failed to save to Google Sheets:', error);
        if (shouldQueue) {
            await queueLocalTransaction(transaction);
        }
        return false;
    }
};

// Queue transaction locally when offline
const queueLocalTransaction = async (transaction: ParsedTransaction): Promise<void> => {
    try {
        const existing = await AsyncStorage.getItem('pendingTransactions');
        const pending = existing ? JSON.parse(existing) : [];
        pending.push(transaction);
        await AsyncStorage.setItem('pendingTransactions', JSON.stringify(pending));
        console.log('[SMSListener] Transaction queued locally');
    } catch (error) {
        console.error('[SMSListener] Failed to queue transaction:', error);
    }
};

// Get pending transactions
export const getPendingTransactions = async (): Promise<ParsedTransaction[]> => {
    try {
        const existing = await AsyncStorage.getItem('pendingTransactions');
        return existing ? JSON.parse(existing) : [];
    } catch {
        return [];
    }
};

// Clear pending transactions after sync
export const clearPendingTransactions = async (): Promise<void> => {
    await AsyncStorage.removeItem('pendingTransactions');
};

// SMS Listener Service
export const SMSListenerService = {
    // Check if SMS tracking is enabled
    isEnabled: async (): Promise<boolean> => {
        const enabled = await AsyncStorage.getItem('autoTrackingEnabled');
        return enabled === 'true';
    },

    // Enable SMS tracking
    enable: async (): Promise<boolean> => {
        const hasPermission = await requestSMSPermission();
        if (hasPermission) {
            await AsyncStorage.setItem('autoTrackingEnabled', 'true');
            console.log('[SMSListener] Auto-tracking enabled');
            return true;
        }
        return false;
    },

    // Disable SMS tracking
    disable: async (): Promise<void> => {
        await AsyncStorage.setItem('autoTrackingEnabled', 'false');
        console.log('[SMSListener] Auto-tracking disabled');
    },

    // Subscribe to new transactions
    onNewTransaction: (callback: SMSListenerCallback): (() => void) => {
        transactionCallbacks.push(callback);
        return () => {
            transactionCallbacks = transactionCallbacks.filter(cb => cb !== callback);
        };
    },

    // Notify all subscribers of new transaction
    notifyTransaction: (transaction: ParsedTransaction) => {
        transactionCallbacks.forEach(callback => callback(transaction));
    },

    // Sync pending offline transactions
    syncPendingTransactions: async (): Promise<number> => {
        const pending = await getPendingTransactions();
        if (pending.length === 0) return 0;

        console.log(`[SMSListener] Syncing ${pending.length} pending transactions...`);
        const remaining: ParsedTransaction[] = [];
        let syncedCount = 0;

        for (const tx of pending) {
            const success = await saveToGoogleSheets(tx, false);
            if (success) {
                syncedCount++;
            } else {
                remaining.push(tx);
            }
        }

        if (syncedCount > 0) {
            if (remaining.length > 0) {
                await AsyncStorage.setItem('pendingTransactions', JSON.stringify(remaining));
            } else {
                await clearPendingTransactions();
            }
            console.log(`[SMSListener] Synced ${syncedCount} transactions, ${remaining.length} remaining`);
        }

        return syncedCount;
    },

    // Process a single SMS message (called from native module)
    handleIncomingSMS: async (sms: SMSMessage): Promise<void> => {
        // Check if enabled
        const enabled = await SMSListenerService.isEnabled();
        if (!enabled) {
            console.log('[SMSListener] Auto-tracking disabled, ignoring SMS');
            return;
        }

        // Process the SMS
        const transaction = await processSMS(sms);
        if (!transaction) return;

        // Save to Google Sheets
        await saveToGoogleSheets(transaction);

        // Notify subscribers
        SMSListenerService.notifyTransaction(transaction);
    },

    // Scan existing SMS for transactions (one-time import)
    scanExistingSMS: async (smsMessages: SMSMessage[]): Promise<ParsedTransaction[]> => {
        const transactions: ParsedTransaction[] = [];

        for (const sms of smsMessages) {
            if (SMSParser.isTransactionSMS(sms.body)) {
                const transaction = await processSMS(sms);
                if (transaction) {
                    transactions.push(transaction);
                }
            }
        }

        return transactions;
    },

    // Get privacy info for display
    getPrivacyInfo: () => ({
        title: 'Your Privacy is Protected',
        points: [
            'We ONLY read bank transaction messages',
            'OTPs, passwords, and personal codes are NEVER accessed',
            'All data is stored in YOUR Google Sheets - we have no database',
            'You have full control over your data',
            'Delete your Sheet = delete all your data',
        ],
    }),
};

export default SMSListenerService;
