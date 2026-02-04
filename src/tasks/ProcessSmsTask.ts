/**
 * Background SMS/UPI Processing Task
 * ===================================
 * Headless JS task that processes SMS and UPI notifications when app is in background
 * Uses LOCAL SMSParser/UPINotificationParser - NO BACKEND REQUIRED (serverless)
 * Includes transaction deduplication to prevent duplicate entries
 * Now includes user-defined merchant category rules
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SMSParser, ParsedSMS } from '../services/SMSParser';
import { UPINotificationParser, ParsedUPINotification } from '../services/UPINotificationParser';
import { TransactionDeduplicationService, TransactionData } from '../services/TransactionDeduplicationService';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { MerchantRulesService } from '../services/MerchantRulesService';

interface TaskData {
    sender: string;
    message: string;
    source?: 'sms' | 'upi';      // Transaction source type
    packageName?: string;         // For UPI apps (e.g., com.phonepe.app)
}

// Common transaction structure after parsing
interface ParsedTransaction {
    amount: number;
    type: 'debit' | 'credit';
    merchant?: string;
    refNumber?: string;
    accountNumber?: string;
    bank?: string;
    raw: string;
    autoCategory?: string;
    sourceApp?: string;  // For UPI: GPay, PhonePe, etc.
}

/**
 * Process SMS/UPI notification in background
 * Called by native SmsHeadlessTaskService
 */
const ProcessSmsTask = async (data: TaskData) => {
    const source = data.source || 'sms';
    console.log(`ProcessSmsTask: Running background ${source.toUpperCase()} processing`);
    console.log('Sender:', data.sender);
    console.log('Message:', data.message.substring(0, 100) + '...');
    console.log('Source:', source);
    if (data.packageName) console.log('Package:', data.packageName);

    let parsed: ParsedTransaction | null = null;
    let transaction: any = null;

    try {
        // Route to appropriate parser based on source
        if (source === 'upi') {
            // CRITICAL FIX: UPI Apps often split info between Title (sender) and Body (message)
            // e.g. Title: "Paid to Zomato", Body: "Rs 250"
            // We concatenate them to ensure the parser gets the full context.
            const fullUpiMessage = `${data.sender} ${data.message}`;
            const upiParsed = UPINotificationParser.parse(fullUpiMessage, data.packageName);

            if (upiParsed) {
                parsed = {
                    amount: upiParsed.amount,
                    type: upiParsed.type,
                    merchant: upiParsed.merchant,
                    refNumber: upiParsed.refNumber,
                    raw: upiParsed.raw,
                    autoCategory: upiParsed.autoCategory,
                    sourceApp: upiParsed.appName,
                };
            }
        } else {
            // SMS parsing
            if (!SMSParser.isTransactionSMS(data.message)) {
                console.log('ProcessSmsTask: Not a transaction SMS');
                return;
            }

            const smsParsed = await SMSParser.parse(data.message, data.sender);
            if (smsParsed) {
                parsed = {
                    amount: smsParsed.amount,
                    type: smsParsed.type,
                    merchant: smsParsed.merchant,
                    refNumber: smsParsed.refNumber,
                    accountNumber: smsParsed.accountNumber,
                    bank: smsParsed.bank,
                    raw: smsParsed.raw,
                    autoCategory: smsParsed.autoCategory,
                    sourceApp: 'SMS',
                };
            }
        }

        if (!parsed) {
            console.log(`ProcessSmsTask: Failed to parse ${source} from`, data.sender);
            return;
        }

        console.log('ProcessSmsTask: Parsed transaction:', JSON.stringify(parsed));

        // ============ DEDUPLICATION CHECK ============
        const dedupData: TransactionData = {
            amount: parsed.amount,
            type: parsed.type,
            accountNumber: parsed.accountNumber,
            refNumber: parsed.refNumber,
            merchant: parsed.merchant,
            timestamp: Date.now(),
        };

        const isDuplicate = await TransactionDeduplicationService.isDuplicate(dedupData);
        if (isDuplicate) {
            console.log(`ProcessSmsTask: DUPLICATE detected, skipping. Source: ${source}`);
            return; // EXIT EARLY - Don't save duplicate
        }

        // Mark as processed BEFORE saving (in case save fails, still avoid reprocessing)
        await TransactionDeduplicationService.markProcessed(dedupData, source);
        console.log('ProcessSmsTask: Marked transaction as processed');
        // =============================================

        // Convert to transaction with source indicator
        const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        transaction = {
            id: transactionId,
            amount: parsed.amount,
            type: parsed.type === 'credit' ? 'income' : 'expense',
            category: parsed.autoCategory || 'uncategorized',
            description: parsed.merchant || `${source.toUpperCase()} Transaction`,
            merchant: parsed.merchant,
            date: new Date().toISOString().split('T')[0],
            needsReview: !parsed.autoCategory,
            source: parsed.sourceApp || source.toUpperCase(), // e.g., "GPay", "PhonePe", "SMS"
            refNumber: parsed.refNumber,
        };

        // Check for user-defined merchant rules (takes precedence over auto-detection)
        const userCategory = await MerchantRulesService.findCategory(
            parsed.merchant || '',
            transaction.description
        );
        if (userCategory) {
            transaction.category = userCategory;
            transaction.needsReview = false; // User already categorized this merchant
            console.log('ProcessSmsTask: Applied user rule, category:', userCategory);
        }

        // Store detected bank account for "Add to Wallet" feature (SMS only)
        if (source === 'sms' && parsed?.bank && parsed?.accountNumber) {
            try {
                const validParsed = parsed; // Capture for closure
                const DETECTED_ACCOUNTS_KEY = '@fintracker_detected_accounts';
                const existing = await AsyncStorage.getItem(DETECTED_ACCOUNTS_KEY);
                const accounts = existing ? JSON.parse(existing) : [];

                // Check if already in detected list
                const alreadyDetected = accounts.some((a: any) =>
                    a.bank === validParsed.bank && a.accountNumber === validParsed.accountNumber
                );

                if (!alreadyDetected) {
                    accounts.push({
                        bank: validParsed.bank,
                        accountNumber: validParsed.accountNumber,
                        timestamp: Date.now()
                    });
                    await AsyncStorage.setItem(DETECTED_ACCOUNTS_KEY, JSON.stringify(accounts));
                    console.log(`ProcessSmsTask: New bank account detected: ${validParsed.bank} xx${validParsed.accountNumber}`);
                }
            } catch (accError) {
                console.error('ProcessSmsTask: Failed to save detected account', accError);
            }
        }

        console.log('ProcessSmsTask: Created transaction:', transaction);

        // ============ QUEUE FIRST STRATEGY (Optimistic) ============
        // Save to Queue IMMEDIATELY to prevent data loss on timeout (60s limit)
        const PENDING_OPS_KEY = '@fintracker_pending_operations';
        const opId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newOp = {
            id: opId,
            type: 'create',
            entity: 'transaction',
            data: {
                id: transaction.id,
                amount: transaction.amount,
                type: (transaction.type === 'income' ? 'INCOME' : 'EXPENSE'),
                description: transaction.description,
                category: transaction.category || 'uncategorized',
                date: transaction.date,
                paymentMethod: 'auto',
                source: transaction.source,
            },
            createdAt: Date.now(),
            retryCount: 0
        };

        try {
            const pending = await AsyncStorage.getItem(PENDING_OPS_KEY);
            const queue = pending ? JSON.parse(pending) : [];
            queue.push(newOp);
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(queue));
            console.log('ProcessSmsTask: Transaction QUEUED securely (Queue First Strategy)');
        } catch (qErr) {
            console.error('ProcessSmsTask: Failed to queue transaction locally!', qErr);
            // If storage fails, we try to proceed to sync anyway, but risk data loss if sync fails.
        }

        // Get stored Google tokens
        const accessToken = await AsyncStorage.getItem('googleAccessToken');
        const spreadsheetId = await AsyncStorage.getItem('userSpreadsheetId');

        if (!accessToken || !spreadsheetId) {
            console.log('ProcessSmsTask: No auth tokens, leaving in queue.');
            return;
        }

        // Attempt Sync
        try {
            GoogleSheetsService.setAuth(accessToken, spreadsheetId);

            await GoogleSheetsService.createTransaction({
                id: transaction.id,
                amount: transaction.amount,
                type: (transaction.type === 'income' ? 'INCOME' : 'EXPENSE'),
                description: transaction.description,
                category: transaction.category || 'uncategorized',
                date: transaction.date,
                paymentMethod: 'auto',
                source: transaction.source, // Column I
            });

            console.log(`ProcessSmsTask: Transaction saved to Google Sheets! (source: ${transaction.source})`);

            // SUCCESS: Remove from Queue
            const freshPending = await AsyncStorage.getItem(PENDING_OPS_KEY);
            let freshQueue = freshPending ? JSON.parse(freshPending) : [];
            freshQueue = freshQueue.filter((op: any) => op.id !== opId);
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(freshQueue));
            console.log('ProcessSmsTask: Removed from queue (Sync Success)');

        } catch (syncError) {
            console.error('ProcessSmsTask: Sync failed (will remain in queue)', syncError);
            // DO NOTHING - Item is already in queue.
        }

    } catch (error) {
        console.error('ProcessSmsTask: Critical Error processing', error);
    }
};

export default ProcessSmsTask;
