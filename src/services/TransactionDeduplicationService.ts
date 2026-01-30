/**
 * Transaction Deduplication Service
 * ==================================
 * Prevents duplicate transactions when both SMS and UPI notifications
 * arrive for the same transaction.
 * 
 * Strategy:
 * 1. Generate a fingerprint for each transaction
 * 2. Store fingerprints in AsyncStorage with 10-minute TTL
 * 3. Check for duplicates before processing
 * 
 * Fingerprint priority:
 * 1. UPI Reference Number (most reliable, ignores time)
 * 2. Amount + Type + TimeWindow + AccountNumber (fallback)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const FINGERPRINT_CACHE_KEY = '@fintracker_transaction_fingerprints';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface TransactionData {
    amount: number;
    type: 'debit' | 'credit';
    accountNumber?: string;
    refNumber?: string;      // UPI ref, UTR, or transaction ID
    merchant?: string;
    timestamp?: number;
}

interface FingerprintEntry {
    fingerprint: string;
    timestamp: number;
    source: 'sms' | 'upi';
}

interface FingerprintCache {
    entries: FingerprintEntry[];
    lastPruned: number;
}

class TransactionDeduplicationServiceClass {
    private static instance: TransactionDeduplicationServiceClass;
    private cache: FingerprintCache | null = null;
    private cacheLoaded = false;

    private constructor() { }

    static getInstance(): TransactionDeduplicationServiceClass {
        if (!TransactionDeduplicationServiceClass.instance) {
            TransactionDeduplicationServiceClass.instance = new TransactionDeduplicationServiceClass();
        }
        return TransactionDeduplicationServiceClass.instance;
    }

    /**
     * Generate a unique fingerprint for a transaction
     * Priority: UPI Ref > Amount+Type+TimeWindow+Account
     */
    generateFingerprint(data: TransactionData): string {
        // If we have a UPI reference, it's the golden identifier
        if (data.refNumber && data.refNumber.length >= 6) {
            // Normalize ref number (remove spaces, lowercase)
            const normalizedRef = data.refNumber.replace(/\s+/g, '').toLowerCase();
            return `ref:${normalizedRef}`;
        }

        // Fallback: Create fingerprint from transaction details
        const timestamp = data.timestamp || Date.now();

        // Round timestamp to 5-minute window for matching
        // This allows SMS arriving shortly after notification to be caught as duplicate
        const timeWindow = Math.floor(timestamp / (5 * 60 * 1000));

        // Normalize amount to 2 decimal places
        const normalizedAmount = data.amount.toFixed(2);

        // Account number (last 4 digits if available)
        const accountPart = data.accountNumber
            ? data.accountNumber.slice(-4)
            : 'NA';

        // Create fingerprint
        const fingerprint = `amt:${normalizedAmount}|${data.type}|${timeWindow}|${accountPart}`;

        return fingerprint;
    }

    /**
     * Load cache from AsyncStorage
     */
    private async loadCache(): Promise<FingerprintCache> {
        if (this.cacheLoaded && this.cache) {
            return this.cache;
        }

        try {
            const stored = await AsyncStorage.getItem(FINGERPRINT_CACHE_KEY);
            if (stored) {
                this.cache = JSON.parse(stored);
            } else {
                this.cache = { entries: [], lastPruned: Date.now() };
            }
            this.cacheLoaded = true;
            return this.cache!;
        } catch (error) {
            console.error('[Deduplication] Error loading cache:', error);
            this.cache = { entries: [], lastPruned: Date.now() };
            this.cacheLoaded = true;
            return this.cache;
        }
    }

    /**
     * Save cache to AsyncStorage
     */
    private async saveCache(): Promise<void> {
        if (!this.cache) return;

        try {
            await AsyncStorage.setItem(FINGERPRINT_CACHE_KEY, JSON.stringify(this.cache));
        } catch (error) {
            console.error('[Deduplication] Error saving cache:', error);
        }
    }

    /**
     * Prune expired entries from cache
     */
    private pruneExpiredEntries(): void {
        if (!this.cache) return;

        const now = Date.now();
        const cutoff = now - CACHE_TTL_MS;

        const originalCount = this.cache.entries.length;
        this.cache.entries = this.cache.entries.filter(
            entry => entry.timestamp > cutoff
        );
        this.cache.lastPruned = now;

        const pruned = originalCount - this.cache.entries.length;
        if (pruned > 0) {
            console.log(`[Deduplication] Pruned ${pruned} expired entries`);
        }
    }

    /**
     * Check if a transaction is a duplicate
     * Returns true if duplicate, false if new
     */
    async isDuplicate(data: TransactionData): Promise<boolean> {
        const fingerprint = this.generateFingerprint(data);
        return this.isDuplicateByFingerprint(fingerprint);
    }

    /**
     * Check if fingerprint already exists in cache
     */
    async isDuplicateByFingerprint(fingerprint: string): Promise<boolean> {
        const cache = await this.loadCache();

        // Prune expired entries first
        this.pruneExpiredEntries();

        // Check for exact match
        const exists = cache.entries.some(entry => entry.fingerprint === fingerprint);

        if (exists) {
            console.log(`[Deduplication] Duplicate detected: ${fingerprint}`);
        }

        return exists;
    }

    /**
     * Mark a transaction as processed (add to cache)
     */
    async markProcessed(data: TransactionData, source: 'sms' | 'upi'): Promise<void> {
        const fingerprint = this.generateFingerprint(data);
        return this.markProcessedByFingerprint(fingerprint, source);
    }

    /**
     * Add fingerprint to cache
     */
    async markProcessedByFingerprint(fingerprint: string, source: 'sms' | 'upi'): Promise<void> {
        const cache = await this.loadCache();

        // Don't add if already exists
        if (cache.entries.some(e => e.fingerprint === fingerprint)) {
            return;
        }

        cache.entries.push({
            fingerprint,
            timestamp: Date.now(),
            source
        });

        console.log(`[Deduplication] Marked as processed: ${fingerprint} (source: ${source})`);

        // Prune if cache is getting large
        if (cache.entries.length > 100) {
            this.pruneExpiredEntries();
        }

        await this.saveCache();
    }

    /**
     * Clear all cached fingerprints (for testing/debugging)
     */
    async clearCache(): Promise<void> {
        this.cache = { entries: [], lastPruned: Date.now() };
        this.cacheLoaded = true;
        await AsyncStorage.removeItem(FINGERPRINT_CACHE_KEY);
        console.log('[Deduplication] Cache cleared');
    }

    /**
     * Get cache stats for debugging
     */
    async getStats(): Promise<{ count: number; oldestAge: number; newestAge: number }> {
        const cache = await this.loadCache();
        const now = Date.now();

        if (cache.entries.length === 0) {
            return { count: 0, oldestAge: 0, newestAge: 0 };
        }

        const timestamps = cache.entries.map(e => e.timestamp);
        const oldest = Math.min(...timestamps);
        const newest = Math.max(...timestamps);

        return {
            count: cache.entries.length,
            oldestAge: Math.round((now - oldest) / 1000), // seconds
            newestAge: Math.round((now - newest) / 1000)  // seconds
        };
    }
}

export const TransactionDeduplicationService = TransactionDeduplicationServiceClass.getInstance();
