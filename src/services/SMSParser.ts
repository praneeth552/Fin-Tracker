import { MerchantRulesService } from './MerchantRulesService';

export interface ParsedSMS {
    amount: number;
    type: 'debit' | 'credit';
    accountNumber?: string;
    merchant?: string;
    balance?: number;
    refNumber?: string;
    date?: string;
    bank?: string;
    raw: string;
    autoCategory?: string;
}

// ENHANCED: More comprehensive amount patterns
const AMOUNT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:debited|credited|debit|credit|paid|received|withdrawn|deposit|transferred|spent|sent|refund)\s+(?:of\s+|with\s+)?(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|₹|rupees)/i,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Dr|Cr)\.?/i,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:received|sent|debited|credited)/i,
    /Payment\s+of\s+(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:txn|transaction)\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

const ACCOUNT_PATTERNS = [
    /(?:A\/c|Acct|Account|A\/C|ac|a\/c)\s*(?:no\.?|#|:)?\s*[Xx*]*([\d]{4,})/i,
    /(?:A\/c|ac|account|card)\s*ending\s+([Xx]*[\d]{4})/i,
    /[Xx*]+([\d]{4})/i,
    /slice\s+A\/c\s*[Xx]*([\d]{4})/i,
    /A\/C\s+[Xx]+([\d]{4,})/i,
    /Credit\s*Card\s*A\/c\s*[Xx]*([\d]{4})/i,
];

const BALANCE_PATTERNS = [
    /(?:Avl\.?\s*(?:Bal\.?)?|Available\s*Balance?|Bal\.?)\s*[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:balance\s*is|balance:?)\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /AvlBal:?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /Total\s*Bal:?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

const REF_PATTERNS = [
    /(?:Ref\s*(?:No\.?|#|ID)?|Txn\s*(?:Id|#)?|TxnID|Reference)\s*[:\s]*([A-Za-z0-9]+)/i,
    /(?:UPI|IMPS|NEFT|RTGS)\s*(?:Ref|Id)?\.?\s*[:\s]*([A-Za-z0-9]+)/i,
    /\(Ref\s*ID[:\s]*([A-Za-z0-9]+)\)/i,
    /Ref[:\s]*([0-9]+)/i,
];

// Bank & Fintech detection
const BANK_PATTERNS: Record<string, RegExp> = {
    'HDFC': /HDFC\s*Bank|HDFCBK|AD-HDFCBK/i,
    'ICICI': /ICICI\s*Bank|ICICIBK|VM-ICICIB/i,
    'SBI': /SBI|State\s*Bank|BW-SBIPSG/i,
    'Axis': /Axis\s*Bank|AXISBK|AX-AXISBK/i,
    'Kotak': /Kotak\s*(?:Mahindra)?|KOTAKBK|BZ-KMBANK/i,
    'BOB': /Bank\s*of\s*Baroda|BOBSMS|AX-BOBSMS|\bBOB\b/i,
    'PNB': /Punjab\s*National|PNB|VM-PNBSMS/i,
    'Yes Bank': /Yes\s*Bank|YESBNK/i,
    'IndusInd': /IndusInd\s*Bank|INDBNK/i,
    'IDFC': /IDFC\s*(?:First)?|IDFCFB/i,
    'RBL': /RBL\s*Bank|RBLBNK/i,
    'UBI': /Union\s*Bank|UBI|UBOI/i,
    'Canara': /Canara\s*Bank|CANARABK/i,
    'IOB': /Indian\s*Overseas|IOB/i,
    'Federal': /Federal\s*Bank|FEDBK/i,
    'IDBI': /IDBI\s*Bank|IDBIBK/i,
    'UCO': /UCO\s*Bank|UCOBK/i,
    'Slice': /SLCEIT|slice|VM-SLCEIT/i,
    'CRED': /CRED|CREDCL|VK-CREDCL/i,
    'Paytm': /PAYTM|PAYTMB|JD-PAYTMB/i,
    'PhonePe': /PHONPE|PHONEPE|JK-PHONPE/i,
    'GPay': /GPAY|GOOGLEPAY|TATADIG/i,
    'Amazon Pay': /AMAZON|AMAZONPAY|AMZNPAY/i,
    'LazyPay': /LAZYPAY|LAZYPY/i,
    'Simpl': /SIMPL|GETSIMPL/i,
    'Mobikwik': /MOBIKWIK|MBKWIK/i,
    'Freecharge': /FREECHARGE|FREECHRG/i,
    'Fino': /FINO|FINOBNK/i,
};

// CRITICAL FIX: Comprehensive transaction type detection
const DEBIT_KEYWORDS = [
    /debited/i,
    /debit/i,
    /withdrawn/i,
    /spent/i,
    /paid/i,
    /purchase/i,
    /payment/i,
    /sent\s+(?:from|to)/i,  // "sent from a/c" or "sent to merchant"
    /transfer(?:red)?\s*to/i,
    /UPI\s*(?:Dr|debit)/i,
    /Dr\.\s*from\s*A\/C/i,
    /Dr\.?$/i,
    /Dr\s/i, // "Rs 500 Dr"
    /Cr\.\s*to/i,  // Credit to someone = your debit
];

const CREDIT_KEYWORDS = [
    /credited/i,
    /credit/i,
    /received/i,
    /deposit/i,
    /refund/i,
    /UPI\s*Cr/i,
    /(?:received|got)\s*from/i,
    /received\s+in\s+.*\s*A\/c/i,  // "received in slice A/c"
    /Cr\.?$/i,
    /Cr\s/i, // "Rs 500 Cr"
    /refund\s*of/i,
];

// Merchant extraction
const MERCHANT_PATTERNS = [
    /(?:at|to|from|@)\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+(?:on|Ref|UPI|via|using)|[.\s]*$)/i,
    /(?:VPA|UPI)\s*[:\s]*([a-z0-9._@\-]+)/i,
    /(?:paid\s*to|transferred\s*to|received\s*from|sent\s+to)\s+([A-Za-z0-9\s&\-]+)/i,
    /from\s+([A-Z\s]+)\s+via\s+UPI/i,
    /to\s+([A-Z\s]+)\s+via\s+UPI/i,  // Added for "sent to X via UPI"
    /Cr\.\s*to\s+([a-z0-9._@\-]+)/i,
    /(?:spent|paid|purchase)\s*(?:at|on)?\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+on|\s+using|\.$)/i,
];

// Auto-categorization keywords - ordered by specificity (high confidence first)
// Specific merchant names are HIGH confidence, generic keywords are LOWER confidence
const HIGH_CONFIDENCE_MERCHANTS: Record<string, string> = {
    // Food
    'swiggy': 'food', 'zomato': 'food', 'dominos': 'food', 'mcdonald': 'food', 'kfc': 'food',
    'subway': 'food', 'starbucks': 'food', 'chaayos': 'food', 'haldiram': 'food', 'barbeque': 'food',
    'burger king': 'food', 'pizza hut': 'food',
    // Transport
    'uber': 'transport', 'ola': 'transport', 'rapido': 'transport', 'irctc': 'transport', 'redbus': 'transport',
    'makemytrip': 'transport', 'goibibo': 'transport', 'yatra': 'transport', 'cleartrip': 'transport',
    // Shopping
    'amazon': 'shopping', 'flipkart': 'shopping', 'myntra': 'shopping', 'ajio': 'shopping', 'nykaa': 'shopping',
    'meesho': 'shopping', 'decathlon': 'shopping', 'croma': 'shopping', 'reliance digital': 'shopping',
    'zudio': 'shopping', 'westside': 'shopping', 'pantaloons': 'shopping', 'h&m': 'shopping', 'zara': 'shopping',
    // Entertainment
    'netflix': 'entertainment', 'spotify': 'entertainment', 'hotstar': 'entertainment', 'prime video': 'entertainment',
    'bookmyshow': 'entertainment', 'pvr': 'entertainment', 'inox': 'entertainment', 'zee5': 'entertainment',
    'youtube': 'entertainment', 'apple': 'entertainment',
    // Groceries
    'bigbasket': 'groceries', 'blinkit': 'groceries', 'zepto': 'groceries', 'dunzo': 'groceries',
    'jiomart': 'groceries', 'dmart': 'groceries', 'avenue supermarts': 'groceries', 'dmart ready': 'groceries',
    'reliance fresh': 'groceries', 'nature basket': 'groceries', 'more retail': 'groceries', 'spencers': 'groceries',
    // Health
    'apollo': 'health', 'netmeds': 'health', 'pharmeasy': 'health', '1mg': 'health', 'medplus': 'health', 'practo': 'health',
    'cult': 'health', 'gym': 'health',
    // Bills
    'electricity': 'bills', 'jio': 'bills', 'airtel': 'bills', 'vi': 'bills', 'vodafone': 'bills', 'tatasky': 'bills',
    'bescom': 'bills', 'water': 'bills', 'gas': 'bills', 'broadband': 'bills', 'act': 'bills',
    // Investment
    'groww': 'investment', 'zerodha': 'investment', 'upstox': 'investment', 'angel one': 'investment', 'indmoney': 'investment',
    'ppf': 'investment', 'sip': 'investment', 'mutual fund': 'investment',
};

// Lower confidence categories (only applied if merchant not found)
const AUTO_CATEGORIES: Record<string, string[]> = {
    'food': ['restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'biryani', 'kitchen', 'bakery', 'sweets', 'bhavan', 'hotel'],
    'transport': ['metro', 'cab', 'auto', 'rickshaw', 'taxi', 'railways', 'card load', 'toll', 'fastag'],
    'shopping': ['mall', 'mart', 'store', 'retail', 'clothing', 'fashion', 'garments', 'textiles', 'saree', 'silks'],
    'bills': ['gas', 'water', 'broadband', 'dth', 'dish', 'postpaid', 'prepaid', 'recharge', 'bill payment', 'billdesk', 'razorpay'],
    'entertainment': ['movie', 'cinema', 'multiplex', 'theatre', 'gaming', 'playstation', 'steam'],
    'fuel': ['petrol', 'diesel', 'fuel', 'indian oil', 'hindustan petroleum', 'bharat petroleum', 'hp pump', 'bpcl', 'iocl', 'shell'],
    'health': ['hospital', 'doctor', 'medical', 'pharmacy', 'clinic', 'diagnostic', 'lab', 'scan'],
    'education': ['school', 'college', 'university', 'course', 'udemy', 'coursera', 'unacademy', 'byjus', 'fee'],
    'groceries': ['grocery', 'vegetables', 'fruits', 'supermarket', 'daily needs', 'kirana'],
    // 'transfer' is INTENTIONALLY omitted - we want those to be "needs review"
};

// Patterns to IGNORE (Not transactions, or failed)
const IGNORE_PATTERNS = [
    /failed/i,
    /declined/i,
    /request/i,
    /reminder/i,
    /due/i,
    /balance\s*is/i, // "Balance is Rs 500" - Not a transaction, just status
    /unsuccessful/i,
    /pending/i,
    /scheduled\s+(?:for|on)/i, // "Scheduled for debit" - Future
    /is\s+scheduled/i,         // "Payment is scheduled" - Future
    /mandate\s+successful/i,   // "Mandate setup successful" - Not a transaction
];

export const SMSParser = {
    /**
     * Check if a message is a bank transaction SMS
     */
    isTransactionSMS: (message: string): boolean => {
        // Check for ignored patterns first
        if (IGNORE_PATTERNS.some(pattern => pattern.test(message))) {
            return false;
        }

        const hasAmount = AMOUNT_PATTERNS.some(pattern => {
            pattern.lastIndex = 0; // Reset regex
            return pattern.test(message);
        });
        if (!hasAmount) return false;

        // Must have transaction keywords
        const hasTransactionKeyword = [
            ...DEBIT_KEYWORDS,
            ...CREDIT_KEYWORDS,
            /transaction|txn|transfer/i,
        ].some(pattern => {
            if (pattern.global) pattern.lastIndex = 0;
            return pattern.test(message);
        });

        return hasTransactionKeyword;
    },

    /**
     * Detect which bank sent the SMS
     */
    detectBank: (message: string, sender?: string): string | undefined => {
        if (sender) {
            for (const [bank, pattern] of Object.entries(BANK_PATTERNS)) {
                if (pattern.test(sender)) {
                    return bank;
                }
            }
        }

        for (const [bank, pattern] of Object.entries(BANK_PATTERNS)) {
            if (pattern.test(message)) {
                return bank;
            }
        }
        return undefined;
    },

    /**
     * Extract transaction amount from SMS
     */
    extractAmount: (message: string): number | undefined => {
        for (const pattern of AMOUNT_PATTERNS) {
            pattern.lastIndex = 0; // Reset global flag
            const match = message.match(pattern);
            if (match && match[1]) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) {
                    return amount;
                }
            }
        }
        return undefined;
    },

    /**
     * ENHANCED: Detect if transaction is debit or credit
     */
    detectType: (message: string): 'debit' | 'credit' => {
        const msgLower = message.toLowerCase();

        // Priority 1: Check for "sent" keyword (high confidence for debit)
        if (/sent\s+(?:from|Rs)/i.test(message)) {
            return 'debit';
        }

        // Priority 2: Check for "received" keyword (high confidence for credit)
        if (/received\s+(?:in|Rs)/i.test(message)) {
            return 'credit';
        }

        // Priority 3: Check all credit keywords
        // Priority 2.5: Check for explicit Refund/Reversal (Highest priority for credit overrides)
        if (/refund|reversed|reversal/i.test(message)) {
            return 'credit';
        }

        // Priority 3: Check all debit keywords (Prioritize over generic "credited")
        for (const pattern of DEBIT_KEYWORDS) {
            pattern.lastIndex = 0;
            if (pattern.test(message)) {
                return 'debit';
            }
        }

        // Priority 4: Check all credit keywords
        for (const pattern of CREDIT_KEYWORDS) {
            pattern.lastIndex = 0;
            if (pattern.test(message)) {
                return 'credit';
            }
        }

        // Default to debit if unclear
        return 'debit';
    },

    /**
     * Extract account number
     */
    extractAccountNumber: (message: string): string | undefined => {
        for (const pattern of ACCOUNT_PATTERNS) {
            pattern.lastIndex = 0;
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return undefined;
    },

    /**
     * Extract available balance
     */
    extractBalance: (message: string): number | undefined => {
        for (const pattern of BALANCE_PATTERNS) {
            pattern.lastIndex = 0;
            const match = message.match(pattern);
            if (match && match[1]) {
                const balance = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(balance)) {
                    return balance;
                }
            }
        }
        return undefined;
    },

    /**
     * Extract reference/transaction ID
     */
    extractRefNumber: (message: string): string | undefined => {
        for (const pattern of REF_PATTERNS) {
            pattern.lastIndex = 0;
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return undefined;
    },

    /**
     * ENHANCED: Extract merchant/payee name
     */
    extractMerchant: (message: string): string | undefined => {
        const GENERIC_MERCHANTS = ['user', 'upi', 'person', 'vendor', 'shop', 'store', 'payment', 'transfer', 'self', 'cash'];

        for (const pattern of MERCHANT_PATTERNS) {
            pattern.lastIndex = 0;
            const match = message.match(pattern);
            if (match && match[1]) {
                const merchant = match[1].trim();
                const lower = merchant.toLowerCase();

                // Skip if it looks like transaction metadata or generic term
                if (merchant.length > 2 &&
                    !/^\d+$/.test(merchant) &&
                    !/^[Xx]+\d+$/.test(merchant) &&
                    !GENERIC_MERCHANTS.includes(lower)) {
                    return merchant;
                }
            }
        }
        return undefined;
    },

    /**
     * Parse a complete SMS message
     */
    parse: async (message: string, sender?: string, receivedDate?: Date): Promise<ParsedSMS | null> => {
        if (!SMSParser.isTransactionSMS(message)) {
            return null;
        }

        const amount = SMSParser.extractAmount(message);
        if (!amount) {
            return null;
        }

        const merchant = SMSParser.extractMerchant(message);
        const autoCategory = await SMSParser.detectCategory(message, merchant);

        return {
            amount,
            type: SMSParser.detectType(message),
            bank: SMSParser.detectBank(message, sender),
            accountNumber: SMSParser.extractAccountNumber(message),
            merchant,
            balance: SMSParser.extractBalance(message),
            refNumber: SMSParser.extractRefNumber(message),
            date: receivedDate instanceof Date ? receivedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            raw: message,
            autoCategory,
        };
    },

    /**
     * SMART Auto-detect category
     * Priority: 1. User defined rules (MerchantRulesService) 2. High-confidence merchant match 3. Generic keyword match 4. undefined
     */
    detectCategory: async (message: string, merchant?: string): Promise<string | undefined> => {
        // PRIORITY 1: Check user-defined rules
        if (merchant) {
            const userRule = await MerchantRulesService.findCategory(merchant, message);
            if (userRule) {
                console.log(`[SMSParser] Matched user rule for ${merchant}: ${userRule}`);
                return userRule;
            }
        }

        const searchText = `${message} ${merchant || ''}`.toLowerCase();

        // PRIORITY 2: Check for high-confidence merchant matches (exact brand names)
        for (const [merchantName, category] of Object.entries(HIGH_CONFIDENCE_MERCHANTS)) {
            if (searchText.includes(merchantName.toLowerCase())) {
                return category;
            }
        }

        // PRIORITY 3: Check generic keywords (lower confidence)
        for (const [category, keywords] of Object.entries(AUTO_CATEGORIES)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    return category;
                }
            }
        }

        // PRIORITY 4: No match = undefined (will be marked as "needs review")
        return undefined;
    },

    /**
     * Convert parsed SMS to transaction data
     */
    toTransaction: (parsed: ParsedSMS) => {
        const category = parsed.autoCategory || 'uncategorized';
        // Needs review if no auto-category detected
        const needsReview = !parsed.autoCategory;

        // Cleanup raw message for description if no merchant found
        // Remove "VM-HDFCBK:" or "AD-BANK:" prefixes
        let fallbackDesc = parsed.raw;
        const prefixMatch = parsed.raw.match(/^[A-Z]{2}-[A-Z0-9]{3,8}:\s*/);
        if (prefixMatch) {
            fallbackDesc = parsed.raw.replace(prefixMatch[0], '');
        }
        fallbackDesc = fallbackDesc.substring(0, 50);

        return {
            id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            amount: parsed.amount,
            type: parsed.type === 'debit' ? 'expense' : 'income',
            category: category,
            description: parsed.merchant ? `${parsed.bank || 'Bank'}: ${parsed.merchant}` : fallbackDesc,
            date: parsed.date || new Date().toISOString().split('T')[0],
            paymentMethod: 'sms-auto',
            accountNumber: parsed.accountNumber,
            isFromSMS: true,
            needsReview: needsReview,
        };
    },
};

export default SMSParser;