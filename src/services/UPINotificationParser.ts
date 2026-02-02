/**
 * UPI Notification Parser
 * ========================
 * Parses transaction notifications from Indian UPI apps:
 * - Google Pay (GPay)
 * - PhonePe
 * - Paytm
 * - Amazon Pay
 * - CRED
 * - BHIM
 * 
 * Each app has slightly different notification formats.
 * This parser extracts: amount, type, merchant, UPI reference
 */

export interface ParsedUPINotification {
    amount: number;
    type: 'debit' | 'credit';
    merchant?: string;
    refNumber?: string;
    appName: string;
    raw: string;
    autoCategory?: string;
}

// UPI App Package Names
export const UPI_APP_PACKAGES: Record<string, string> = {
    'com.google.android.apps.nbu.paisa.user': 'GPay',
    'com.phonepe.app': 'PhonePe',
    'net.one97.paytm': 'Paytm',
    'in.amazon.mShop.android.shopping': 'Amazon Pay',
    'com.dreamplug.androidapp': 'CRED',
    'in.org.npci.upiapp': 'BHIM',
    'com.whatsapp': 'WhatsApp Pay',
};

// Amount extraction patterns (shared across apps)
const AMOUNT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
    /(?:amount|paid|received|sent|debited|credited)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

// UPI Reference patterns
const REF_PATTERNS = [
    /UPI\s*Ref[:\s]*([A-Za-z0-9]+)/i,
    /UTR\s*(?:No)?[:\s]*([A-Za-z0-9]+)/i,
    /Txn\s*(?:ID)?[:\s]*([A-Za-z0-9]+)/i,
    /Ref\s*(?:No)?[:\s]*(\d{12,})/i,
    /Transaction\s*ID[:\s]*([A-Za-z0-9]+)/i,
];

// Debit indicators
const DEBIT_KEYWORDS = [
    'paid', 'sent', 'debited', 'paid to', 'sent to',
    'payment to', 'transferred to', 'paid at',
    'purchase', 'spent', 'debit', 'withdraw'
];

// Credit indicators
const CREDIT_KEYWORDS = [
    'received', 'credited', 'received from', 'got',
    'money received', 'payment from', 'credit',
    'sent you',  // "X sent you Rs.Y" -> Credit
    'added to',  // "Money added to wallet" -> Credit
    'refund',    // "Refund received" -> Credit
];

// Patterns to IGNORE (Not transactions, or failed)
const IGNORE_PATTERNS = [
    /failed/i,
    /declined/i,
    /request/i,   // "Request received" != Money received
    /reminder/i,
    /due/i,
    /balance/i,   // "Check balance"
    /unsuccessful/i,
    /pending/i,
];

// Sensitive patterns to exclude (OTPs, passwords)
const SENSITIVE_PATTERNS = [
    /OTP/i,
    /one.?time.?password/i,
    /verification.?code/i,
    /CVV/i,
    /PIN/i,
    /passcode/i,
    /password/i,
    /do.?not.?share/i,
    /valid.?for/i,
    /expires?.?in/i,
    /login/i,
    /auth/i
];

class UPINotificationParserClass {

    /**
     * Parse a UPI app notification
     * @param message - Notification text content
     * @param packageName - Android package name of the source app
     * @returns Parsed transaction data or null if not a transaction
     */
    parse(message: string, packageName?: string): ParsedUPINotification | null {
        if (!message || message.length < 5) {
            return null;
        }

        // Check for sensitive content (OTPs, etc.)
        if (this.isSensitiveMessage(message)) {
            console.log('[UPIParser] Rejected: Sensitive content');
            return null;
        }

        // Check for ignored patterns (Failed, Request, etc.)
        if (this.isIgnoredMessage(message)) {
            console.log('[UPIParser] Rejected: Ignored pattern (Failed/Request)');
            return null;
        }

        const appName = packageName ? (UPI_APP_PACKAGES[packageName] || 'UPI App') : 'UPI App';

        // Extract amount
        const amount = this.extractAmount(message);
        if (!amount || amount <= 0) {
            console.log('[UPIParser] Rejected: No valid amount found');
            return null;
        }

        // Determine transaction type
        const type = this.determineType(message);
        if (!type) {
            console.log('[UPIParser] Rejected: Cannot determine transaction type');
            return null;
        }

        // Extract merchant/recipient
        const merchant = this.extractMerchant(message, appName);

        // Extract UPI reference
        const refNumber = this.extractReference(message);

        // Auto-categorize based on merchant
        const autoCategory = this.suggestCategory(merchant, message);

        const result: ParsedUPINotification = {
            amount,
            type,
            merchant,
            refNumber,
            appName,
            raw: message,
            autoCategory
        };

        console.log('[UPIParser] Parsed successfully:', {
            amount,
            type,
            merchant,
            refNumber,
            appName
        });

        return result;
    }

    /**
     * Check if message contains sensitive information
     */
    private isSensitiveMessage(message: string): boolean {
        return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
    }

    /**
     * Check if message should be ignored (Failed, Request, etc)
     */
    private isIgnoredMessage(message: string): boolean {
        return IGNORE_PATTERNS.some(pattern => pattern.test(message));
    }

    /**
     * Extract amount from message
     */
    private extractAmount(message: string): number | null {
        for (const pattern of AMOUNT_PATTERNS) {
            const match = message.match(pattern);
            if (match && match[1]) {
                const cleaned = match[1].replace(/,/g, '');
                const amount = parseFloat(cleaned);
                if (!isNaN(amount) && amount > 0) {
                    return amount;
                }
            }
        }
        return null;
    }

    /**
     * Determine if transaction is debit or credit
     */
    private determineType(message: string): 'debit' | 'credit' | null {
        const lowerMessage = message.toLowerCase();

        // Check for debit
        const isDebit = DEBIT_KEYWORDS.some(kw => lowerMessage.includes(kw));

        // Check for credit
        const isCredit = CREDIT_KEYWORDS.some(kw => lowerMessage.includes(kw));

        // If both match, use word order (which comes first)
        if (isDebit && isCredit) {
            const debitIndex = Math.min(
                ...DEBIT_KEYWORDS
                    .map(kw => lowerMessage.indexOf(kw))
                    .filter(idx => idx >= 0)
            );
            const creditIndex = Math.min(
                ...CREDIT_KEYWORDS
                    .map(kw => lowerMessage.indexOf(kw))
                    .filter(idx => idx >= 0)
            );
            return debitIndex < creditIndex ? 'debit' : 'credit';
        }

        if (isDebit) return 'debit';
        if (isCredit) return 'credit';

        return null;
    }

    /**
     * Extract merchant/recipient name from message
     */
    private extractMerchant(message: string, appName: string): string | undefined {
        // Different patterns for different apps
        const patterns = [
            // "paid to [Merchant]"
            /paid\s+to\s+([A-Za-z0-9\s]+?)(?:\.|,|$|UPI|Ref|successfully)/i,
            // "sent to [Name]"
            /sent\s+to\s+([A-Za-z0-9\s]+?)(?:\.|,|$|UPI|Ref|successfully)/i,
            // "received from [Name]"
            /received\s+from\s+([A-Za-z0-9\s]+?)(?:\.|,|$|UPI|Ref)/i,
            // "to [Merchant] successfully"
            /to\s+([A-Za-z0-9\s]+?)\s+successfully/i,
            // "from [Name]. Check"
            /from\s+([A-Za-z0-9\s]+?)(?:\.|,|$|Check|UPI)/i,
            // "at [Merchant]"
            /at\s+([A-Za-z0-9\s]+?)(?:\.|,|$|UPI|Ref)/i,
            // PhonePe format: "Paid to MD JARSED"
            /Paid\s+to\s+([A-Z0-9\s]+?)\s+Debit/i,
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                const merchant = match[1].trim();
                // Skip if it's just the app name or too short
                if (merchant.length > 2 &&
                    merchant.toUpperCase() !== appName.toUpperCase()) {
                    return merchant;
                }
            }
        }

        return undefined;
    }

    /**
     * Extract UPI reference number
     */
    private extractReference(message: string): string | undefined {
        for (const pattern of REF_PATTERNS) {
            const match = message.match(pattern);
            if (match && match[1] && match[1].length >= 6) {
                return match[1];
            }
        }
        return undefined;
    }

    /**
     * Suggest category based on merchant name or message content
     */
    private suggestCategory(merchant: string | undefined, message: string): string | undefined {
        const text = (merchant || message).toLowerCase();

        // Food & Dining
        if (/swiggy|zomato|domino|pizza|mcdonald|kfc|burger|restaurant|food|cafe|coffee|starbucks|hotel|eat|dining/i.test(text)) {
            return 'Food & Dining';
        }

        // Shopping
        if (/amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|store|mart|retail|mall/i.test(text)) {
            return 'Shopping';
        }

        // Transportation
        if (/uber|ola|rapido|metro|cab|taxi|travel|petrol|fuel|parking|toll/i.test(text)) {
            return 'Transportation';
        }

        // Entertainment
        if (/netflix|prime|hotstar|spotify|movie|cinema|pvr|inox|game|playstation|xbox/i.test(text)) {
            return 'Entertainment';
        }

        // Bills & Utilities
        if (/electric|water|gas|internet|broadband|jio|airtel|vodafone|vi|bsnl|mobile|recharge|bill/i.test(text)) {
            return 'Bills & Utilities';
        }

        // Healthcare
        if (/pharmacy|medical|hospital|doctor|apollo|medplus|health|medicine|clinic/i.test(text)) {
            return 'Healthcare';
        }

        // Groceries
        if (/grocery|bigbasket|blinkit|zepto|dunzo|instamart|vegetables|fruits|milk|dairy/i.test(text)) {
            return 'Groceries';
        }

        return undefined;
    }

    /**
     * Check if a package name is a known UPI app
     */
    isUPIApp(packageName: string): boolean {
        return packageName in UPI_APP_PACKAGES;
    }

    /**
     * Get all known UPI app package names
     */
    getUPIPackages(): string[] {
        return Object.keys(UPI_APP_PACKAGES);
    }
}

export const UPINotificationParser = new UPINotificationParserClass();
