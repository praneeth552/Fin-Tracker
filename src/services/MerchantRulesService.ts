/**
 * Merchant Rules Service
 * =======================
 * Allows users to set default categories for specific merchants/UPIs
 * When a transaction comes from a known merchant, it auto-categorizes
 * 
 * Example: User sets "yogi babu" -> "food"
 *          Next time "yogi babu" appears, it goes to "food" automatically
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MERCHANT_RULES_KEY = '@fintracker_merchant_rules';

export interface MerchantRule {
    id: string;
    pattern: string;  // Merchant name, UPI ID, or keyword to match
    category: string; // Category to assign
    matchType: 'exact' | 'contains'; // How to match
    createdAt: number;
}

export const MerchantRulesService = {
    /**
     * Get all merchant rules
     */
    getRules: async (): Promise<MerchantRule[]> => {
        try {
            const data = await AsyncStorage.getItem(MERCHANT_RULES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading merchant rules:', error);
            return [];
        }
    },

    /**
     * Add a new merchant rule
     */
    addRule: async (pattern: string, category: string, matchType: 'exact' | 'contains' = 'contains'): Promise<MerchantRule> => {
        const rules = await MerchantRulesService.getRules();

        // Check if rule already exists for this pattern
        const existing = rules.find(r => r.pattern.toLowerCase() === pattern.toLowerCase());
        if (existing) {
            // Update existing rule
            existing.category = category;
            await AsyncStorage.setItem(MERCHANT_RULES_KEY, JSON.stringify(rules));
            return existing;
        }

        const newRule: MerchantRule = {
            id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pattern: pattern.toLowerCase(),
            category,
            matchType,
            createdAt: Date.now(),
        };

        rules.push(newRule);
        await AsyncStorage.setItem(MERCHANT_RULES_KEY, JSON.stringify(rules));
        console.log(`Added merchant rule: "${pattern}" -> ${category}`);
        return newRule;
    },

    /**
     * Delete a merchant rule
     */
    deleteRule: async (ruleId: string): Promise<void> => {
        const rules = await MerchantRulesService.getRules();
        const filtered = rules.filter(r => r.id !== ruleId);
        await AsyncStorage.setItem(MERCHANT_RULES_KEY, JSON.stringify(filtered));
    },

    /**
     * Find matching category for a merchant/description
     * Returns undefined if no rule matches
     */
    findCategory: async (merchant: string, description?: string): Promise<string | undefined> => {
        if (!merchant && !description) return undefined;

        const rules = await MerchantRulesService.getRules();
        const searchText = `${merchant || ''} ${description || ''}`.toLowerCase();

        for (const rule of rules) {
            if (rule.matchType === 'exact') {
                if (searchText === rule.pattern || merchant?.toLowerCase() === rule.pattern) {
                    return rule.category;
                }
            } else {
                // Contains match
                if (searchText.includes(rule.pattern)) {
                    return rule.category;
                }
            }
        }

        return undefined;
    },

    /**
     * Set category for a transaction and create a rule for future matches
     * Called when user categorizes a "Needs Review" transaction
     */
    setCategoryWithRule: async (merchant: string, category: string): Promise<void> => {
        if (!merchant || merchant.length < 3) return;

        // Clean up merchant name (remove bank prefix if present)
        let cleanMerchant = merchant;
        const colonIndex = merchant.indexOf(':');
        if (colonIndex !== -1 && colonIndex < 15) {
            cleanMerchant = merchant.substring(colonIndex + 1).trim();
        }

        // VALIDATION: Prevent generic transaction text from becoming a rule
        // If the name contains numbers indicating amount, or transaction keywords, skip it
        // Removed 'bank', 'a/c' as they might be part of legitimate payees (e.g. "Bank Charges")
        const isGenericText = /(?:debited|credited|balance|avl|bal|txn|ref|rs\.|inr|upi)/i.test(cleanMerchant);
        const hasAmount = /\d+\.\d{2}/.test(cleanMerchant) || /(?:iso|inr|rs)\.?\s*\d+/i.test(cleanMerchant);

        if (isGenericText || hasAmount || cleanMerchant.length > 50) {
            console.log(`[MerchantRules] Skipped creating rule for invalid merchant name: "${cleanMerchant}"`);
            return;
        }

        // Only create rule if merchant is meaningful
        if (cleanMerchant.length >= 3 && !/^\d+$/.test(cleanMerchant)) {
            await MerchantRulesService.addRule(cleanMerchant, category);
        }
    },

    /**
     * Clear all rules
     */
    clearAllRules: async (): Promise<void> => {
        await AsyncStorage.removeItem(MERCHANT_RULES_KEY);
    },
};

export default MerchantRulesService;
