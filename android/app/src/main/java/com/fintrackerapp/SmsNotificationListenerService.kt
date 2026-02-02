package com.fintrackerapp

import android.app.Notification
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * NotificationListenerService for SMS and UPI notification processing
 *
 * Handles two types of notifications:
 * 1. SMS notifications (for Android 14+ where SMS_RECEIVED is restricted)
 * 2. UPI app notifications (GPay, PhonePe, Paytm, etc.) for instant transaction detection
 *
 * User must grant "Notification Access" permission in device Settings.
 */
class SmsNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "SmsNotificationListener"
        private const val PREFS_NAME = "FinTrackerPrefs"
        private const val UPI_DETECTION_ENABLED = "upiDetectionEnabled"

        // Common SMS app package names - Extended list for compatibility
        private val SMS_PACKAGES =
                setOf(
                        "com.google.android.apps.messaging", // Google Messages
                        "com.android.mms", // Stock Android SMS
                        "com.android.messaging", // AOSP Messages
                        "com.samsung.android.messaging", // Samsung Messages
                        "com.oneplus.mms", // OnePlus Messages
                        "com.miui.sms", // Xiaomi Messages (older)
                        "com.xiaomi.midrop", // Xiaomi Messages (newer)
                        "com.android.mms.service", // Xiaomi Messages service
                        "com.oppo.mms", // Oppo Messages
                        "com.coloros.mms", // ColorOS (Oppo/Realme) Messages
                        "com.vivo.message", // Vivo Messages
                        "com.iqoo.mms", // iQOO Messages
                        "com.nothing.messaging", // Nothing/CMF Messages
                        "com.realme.sms", // Realme Messages
                        "com.motorola.messaging", // Motorola Messages
                        "com.huawei.message", // Huawei Messages
                        "com.hihonor.mms", // Honor Messages
                        "com.asus.message", // Asus Messages
                        "com.lenovo.mms", // Lenovo Messages
                        "org.thoughtcrime.securesms", // Signal (if used for SMS)
                        "com.textra", // Textra SMS
                        "com.jb.gosms", // GO SMS
                        "com.handcent.app.nextsms", // Handcent SMS
                        "com.sonyericsson.conversations", // Sony Messages
                        "com.lge.message", // LG Messages
                        "com.htc.sense.mms", // HTC Messages
                )

        // UPI App package names (India)
        private val UPI_PACKAGES =
                setOf(
                        "com.google.android.apps.nbu.paisa.user", // Google Pay
                        "com.phonepe.app", // PhonePe
                        "net.one97.paytm", // Paytm
                        "in.amazon.mShop.android.shopping", // Amazon Pay
                        "com.dreamplug.androidapp", // CRED
                        "in.org.npci.upiapp", // BHIM
                        "com.whatsapp", // WhatsApp Pay
                )

        // Bank/Financial sender patterns
        private val BANK_SENDERS =
                listOf(
                        "HDFC",
                        "ICICI",
                        "SBI",
                        "AXIS",
                        "KOTAK",
                        "PNB",
                        "BOB",
                        "IDBI",
                        "CITI",
                        "YES",
                        "INDUS",
                        "FEDERAL",
                        "RBL",
                        "IDFC",
                        "UJJIVAN",
                        "BANK",
                        "PAYTM",
                        "GPAY",
                        "PHONPE",
                        "AMAZON",
                        "FLIPKART",
                        "BHIM",
                        "MOBIKWIK",
                        "FREECHARGE",
                        "CRED",
                        "SLICE",
                        "LAZYPAY"
                )

        // Transaction keywords
        private val TRANSACTION_KEYWORDS =
                listOf(
                        "DEBITED",
                        "CREDITED",
                        "SPENT",
                        "RECEIVED",
                        "WITHDRAWN",
                        "TRANSFERRED",
                        "PAID TO",
                        "PAID FOR",
                        "PURCHASE",
                        "RS.",
                        "RS ",
                        "INR ",
                        "INR.",
                        "₹",
                        "A/C",
                        "ACCT",
                        "ACCOUNT",
                        "UPI REF",
                        "TXN ID",
                        "TRANSACTION",
                        "TXN",
                        "AVL BAL",
                        "AVAILABLE BALANCE",
                        "BAL:",
                        "SENT FROM",
                        "SENT TO"
                )

        // OTP/Sensitive patterns to EXCLUDE
        private val SENSITIVE_PATTERNS =
                listOf(
                        "OTP",
                        "ONE TIME PASSWORD",
                        "ONE-TIME PASSWORD",
                        "VERIFICATION CODE",
                        "VERIFY CODE",
                        "AUTH CODE",
                        "PIN IS",
                        "YOUR PIN",
                        "CVV",
                        "CVC",
                        "PASSCODE",
                        "PASSWORD",
                        "LOGIN CODE",
                        "2FA",
                        "TWO FACTOR",
                        "AUTHENTICATION CODE",
                        "SECRET CODE",
                        "SECURE CODE",
                        "TEMPORARY CODE",
                        "DO NOT SHARE",
                        "DON'T SHARE",
                        "DONT SHARE",
                        "VALID FOR",
                        "EXPIRES IN"
                )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListenerService connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "NotificationListenerService disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName

        // DEBUG: Log ALL notification packages to help diagnose issues
        // This helps find SMS app package names on devices where detection isn't working
        Log.d(TAG, "📱 Notification received from: $packageName")

        // Determine notification source
        val isSmsApp = SMS_PACKAGES.contains(packageName)
        val isUpiApp = UPI_PACKAGES.contains(packageName)

        // Skip if not from SMS or UPI app, but log for debugging
        if (!isSmsApp && !isUpiApp) {
            // Log potential SMS apps that we might be missing
            if (packageName.contains("sms", ignoreCase = true) ||
                            packageName.contains("mms", ignoreCase = true) ||
                            packageName.contains("message", ignoreCase = true) ||
                            packageName.contains("messaging", ignoreCase = true)
            ) {
                Log.w(TAG, "⚠️ Potential SMS app not in our list: $packageName")
            }
            return
        }

        // For UPI apps, check if UPI detection is enabled
        if (isUpiApp) {
            val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            val upiEnabled = prefs.getBoolean(UPI_DETECTION_ENABLED, false)
            if (!upiEnabled) {
                Log.d(TAG, "UPI detection disabled, ignoring notification from: $packageName")
                return
            }
        }

        val source = if (isUpiApp) "upi" else "sms"
        Log.d(TAG, "$source notification from package: $packageName")

        try {
            val notification = sbn.notification
            val extras = notification.extras

            // Extract notification content
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: text

            // Use bigText if available (contains full content), otherwise use text
            val messageBody = if (bigText.length > text.length) bigText else text
            val sender = title // Usually the sender name/number

            Log.d(TAG, "From: $sender, body length: ${messageBody.length}")

            // Check if it's a financial transaction
            val isTransaction =
                    if (isUpiApp) {
                        isUpiTransaction(messageBody)
                    } else {
                        isTransactionSms(sender, messageBody)
                    }

            if (isTransaction) {
                Log.d(TAG, "Valid transaction detected ($source), starting headless task")

                // Start HeadlessJS service to process
                val serviceIntent = Intent(this, SmsHeadlessTaskService::class.java)
                serviceIntent.putExtra("sender", sender)
                serviceIntent.putExtra("message", messageBody)
                serviceIntent.putExtra("source", source)
                serviceIntent.putExtra("packageName", packageName)

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    Log.d(TAG, "HeadlessJS service started successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start HeadlessJS service", e)
                }
            } else {
                Log.d(TAG, "Non-transaction notification ignored")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    /**
     * Check if SMS is a financial transaction (same logic as SmsBroadcastReceiver) PRIVACY:
     * Excludes OTPs and sensitive authentication messages
     */
    private fun isTransactionSms(sender: String, message: String): Boolean {
        val senderUpper = sender.uppercase()
        val messageUpper = message.uppercase()

        // PRIVACY: Exclude sensitive/OTP messages
        if (SENSITIVE_PATTERNS.any { messageUpper.contains(it) }) {
            Log.d(TAG, "SMS rejected: Contains sensitive/OTP content")
            return false
        }

        val hasBankSender = BANK_SENDERS.any { senderUpper.contains(it) }
        val hasTransactionKeyword = TRANSACTION_KEYWORDS.any { messageUpper.contains(it) }

        // Strong transaction patterns
        val strongPatterns =
                listOf(
                        "DEBITED FROM",
                        "CREDITED TO",
                        "DEBITED FROM A/C",
                        "CREDITED TO A/C",
                        "SENT FROM A/C",
                        "SENT TO"
                )
        val hasStrongPattern = strongPatterns.any { messageUpper.contains(it) }

        // Amount patterns (regex)
        val hasAmount = messageUpper.contains(Regex("(RS\\.?|INR\\.?|₹)\\s*\\d"))

        val isTransaction =
                (hasBankSender && hasTransactionKeyword) ||
                        (hasStrongPattern && hasTransactionKeyword) ||
                        (hasAmount && hasTransactionKeyword)

        if (isTransaction) {
            Log.d(TAG, "SMS accepted: Valid transaction")
        }

        return isTransaction
    }

    /**
     * Check if UPI notification is a financial transaction UPI notifications have different format
     * than SMS - usually simpler
     */
    private fun isUpiTransaction(message: String): Boolean {
        val messageUpper = message.uppercase()

        // PRIVACY: Exclude sensitive/OTP messages
        if (SENSITIVE_PATTERNS.any { messageUpper.contains(it) }) {
            Log.d(TAG, "UPI notification rejected: Contains sensitive/OTP content")
            return false
        }

        // UPI transaction indicators
        val upiKeywords =
                listOf(
                        "PAID",
                        "SENT",
                        "RECEIVED",
                        "DEBITED",
                        "CREDITED",
                        "PAYMENT",
                        "TRANSFERRED",
                        "MONEY",
                        "SUCCESSFUL"
                )

        val hasUpiKeyword = upiKeywords.any { messageUpper.contains(it) }

        // Amount patterns (must have rupee amount)
        val hasAmount =
                messageUpper.contains(Regex("(RS\\.?|INR\\.?|₹)\\s*\\d")) ||
                        messageUpper.contains(Regex("\\d+(\\.\\d{1,2})?\\s*(RS\\.?|INR|RUPEES)"))

        // Must have both a keyword and an amount to be considered a transaction
        val isTransaction = hasUpiKeyword && hasAmount

        if (isTransaction) {
            Log.d(TAG, "UPI notification accepted: Valid transaction")
        }

        return isTransaction
    }
}
