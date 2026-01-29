package com.fintrackerapp

import android.app.Notification
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * NotificationListenerService for Android 14+ SMS processing
 *
 * Since Android 14+, SMS_RECEIVED broadcasts are restricted to default SMS apps only. This service
 * reads SMS notifications from the notification bar as an alternative.
 *
 * User must grant "Notification Access" permission in device Settings.
 */
class SmsNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "SmsNotificationListener"

        // Common SMS app package names
        private val SMS_PACKAGES =
                setOf(
                        "com.google.android.apps.messaging", // Google Messages
                        "com.android.mms", // Stock Android SMS
                        "com.samsung.android.messaging", // Samsung Messages
                        "com.oneplus.mms", // OnePlus Messages
                        "com.miui.sms", // Xiaomi Messages
                        "com.oppo.mms", // Oppo Messages
                        "com.vivo.message", // Vivo Messages
                        "com.nothing.messaging", // Nothing/CMF Messages
                        "com.realme.sms", // Realme Messages
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

        // Only process notifications from SMS apps
        if (!SMS_PACKAGES.contains(packageName)) {
            return
        }

        Log.d(TAG, "SMS notification from package: $packageName")

        try {
            val notification = sbn.notification
            val extras = notification.extras

            // Extract notification content
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: text

            // Use bigText if available (contains full SMS), otherwise use text
            val messageBody = if (bigText.length > text.length) bigText else text
            val sender = title // Usually the sender name/number

            Log.d(TAG, "SMS from: $sender, body length: ${messageBody.length}")

            // Check if it's a financial transaction
            if (isTransactionSms(sender, messageBody)) {
                Log.d(TAG, "Valid transaction SMS detected, starting headless task")

                // Start HeadlessJS service to process
                val serviceIntent = Intent(this, SmsHeadlessTaskService::class.java)
                serviceIntent.putExtra("sender", sender)
                serviceIntent.putExtra("message", messageBody)
                serviceIntent.putExtra("source", "notification")

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
                Log.d(TAG, "Non-transaction SMS ignored")
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
}
