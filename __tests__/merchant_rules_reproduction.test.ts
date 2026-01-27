
import { MerchantRulesService } from '../src/services/MerchantRulesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage if not already mocked by setup
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

describe('MerchantRulesService Auto-Categorization Bug', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reproduce the issue where a generic rule matches unrelated transactions', async () => {
        // Setup: Mock empty rules initially
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));

        // 1. User receives a transaction where SMSParser failed to find a merchant
        // So the description passed to setCategoryWithRule is the raw SMS (truncated)
        const rawSmsBad = "VM-HDFCBK: Rs 50.00 debited from HDFC Bank A/c xx1234 for Generic Purchase on 12-10-24.";
        // Truncated description as per UncategorizedTransactions logic
        const descriptionBad = rawSmsBad.substring(0, 50); // "VM-HDFCBK: Rs 50.00 debited from HDFC Bank A/c xx"

        console.log('Bad Description used for rule:', descriptionBad);

        // 2. User categorizes this as "Misc" and updates rule
        // Simulate setCategoryWithRule logic

        // Mock getRules to return updated rules sequence
        let currentRules: any[] = [];
        (AsyncStorage.getItem as jest.Mock).mockImplementation(() => Promise.resolve(JSON.stringify(currentRules)));
        (AsyncStorage.setItem as jest.Mock).mockImplementation((key, val) => {
            currentRules = JSON.parse(val);
            return Promise.resolve();
        });

        await MerchantRulesService.setCategoryWithRule(descriptionBad, 'misc');

        // Check what rule was created
        const rules = await MerchantRulesService.getRules();

        // ASSERT FIX: The new validation logic should PREVENT this rule from being created.
        if (rules.length === 0) {
            console.log("FIX VERIFIED: No rule created for generic transaction text.");
        } else {
            console.log("FIX FAILED: Rule was still created:", rules[0].pattern);
        }

        expect(rules.length).toBe(0);

        // 3. New unrelated transaction comes in
        const rawSmsGood = "VM-HDFCBK: Rs 100.00 debited from HDFC Bank A/c xx1234 for Tea Stall.";
        const merchantGood = "Tea Stall";

        const matchedCategory = await MerchantRulesService.findCategory(merchantGood, rawSmsGood);
        expect(matchedCategory).toBeUndefined();
    });
});
