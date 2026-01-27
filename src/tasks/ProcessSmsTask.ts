/**
 * Background SMS Processing Task
 * ===============================
 * Headless JS task that processes SMS when app is in background
 * Uses LOCAL SMSParser - NO BACKEND REQUIRED (serverless)
 * Now includes user-defined merchant category rules
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SMSParser } from '../services/SMSParser';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { MerchantRulesService } from '../services/MerchantRulesService';

interface SmsTaskData {
    sender: string;
    message: string;
}

/**
 * Process SMS in background
 * Called by native SmsHeadlessTaskService
 */
const ProcessSmsTask = async (data: SmsTaskData) => {
    console.log('ProcessSmsTask: Running background SMS processing');
    console.log('Sender:', data.sender);
    console.log('Message:', data.message);

    try {
        // Use LOCAL SMSParser - no network call needed!
        if (!SMSParser.isTransactionSMS(data.message)) {
            console.log('ProcessSmsTask: Not a transaction SMS');
            return;
        }

        // Parse SMS locally
        const parsed = await SMSParser.parse(data.message, data.sender);
        if (!parsed) {
            console.log('ProcessSmsTask: Failed to parse SMS from', data.sender);
            return;
        }

        console.log('ProcessSmsTask: Parsed transaction:', JSON.stringify(parsed));

        // Convert to transaction
        const transaction = SMSParser.toTransaction(parsed);

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
                    console.log(`ProcessSmsTask: New bank account detected: ${parsed.bank} xx${parsed.accountNumber}`);
                }
            } catch (accError) {
                console.error('ProcessSmsTask: Failed to save detected account', accError);
            }
        }

        console.log('ProcessSmsTask: Created transaction:', transaction);

        // Get stored Google tokens
        const accessToken = await AsyncStorage.getItem('googleAccessToken');
        const spreadsheetId = await AsyncStorage.getItem('userSpreadsheetId');

        if (!accessToken || !spreadsheetId) {
            // Queue for later sync when user opens app
            console.log('ProcessSmsTask: No Google auth, queuing transaction locally');

            // Match OfflineCache.ts structure and key
            const PENDING_OPS_KEY = '@fintracker_pending_operations';
            const pending = await AsyncStorage.getItem(PENDING_OPS_KEY);
            const queue = pending ? JSON.parse(pending) : [];

            const newOp = {
                id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                },
                createdAt: Date.now(),
                retryCount: 0
            };

            queue.push(newOp);
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(queue));
            console.log('ProcessSmsTask: Transaction queued for sync');
            return;
        }

        // Save to Google Sheets using createTransaction method
        // Set tokens manually for headless context
        GoogleSheetsService.setAuth(accessToken, spreadsheetId);

        // Save to Google Sheets using createTransaction method
        await GoogleSheetsService.createTransaction({
            id: transaction.id,
            amount: transaction.amount,
            type: (transaction.type === 'income' ? 'INCOME' : 'EXPENSE'),
            description: transaction.description,
            category: transaction.category || 'uncategorized',
            date: transaction.date,
            paymentMethod: 'auto',
        });

        console.log('ProcessSmsTask: Transaction saved to Google Sheets!');
    } catch (error) {
        console.error('ProcessSmsTask: Error processing SMS', error);

        // Queue for retry on error
        try {
            const parsed = await SMSParser.parse(data.message);
            if (parsed) {
                const transaction = SMSParser.toTransaction(parsed);
                const PENDING_OPS_KEY = '@fintracker_pending_operations';
                const pending = await AsyncStorage.getItem(PENDING_OPS_KEY);
                const queue = pending ? JSON.parse(pending) : [];

                const newOp = {
                    id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                    },
                    createdAt: Date.now(),
                    retryCount: 0
                };

                queue.push(newOp);
                await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(queue));
                console.log('ProcessSmsTask: Queued for retry');
            }
        } catch (queueError) {
            console.error('ProcessSmsTask: Failed to queue', queueError);
        }
    }
};

export default ProcessSmsTask;
