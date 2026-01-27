package com.fintrackerapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.telephony.SmsMessage
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

/**
 * SMS Broadcast Receiver for background SMS processing
 * Receives SMS even when the app is in background/killed
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsBroadcastReceiver"
        private const val SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        if (intent.action != SMS_RECEIVED) return

        Log.d(TAG, "SMS Received in background")

        val bundle: Bundle? = intent.extras
        if (bundle != null) {
            try {
                // Use deprecated method for all versions as it's more reliable
                @Suppress("DEPRECATION")
                val pdus = bundle.get("pdus") as? Array<*>
                
                Log.d(TAG, "PDUs found: ${pdus?.size ?: 0}")

                if (pdus != null && pdus.isNotEmpty()) {
                    val format = bundle.getString("format")
                    val stringBuilder = StringBuilder()
                    var sender = ""

                    for (pdu in pdus) {
                        try {
                            val smsMessage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                SmsMessage.createFromPdu(pdu as ByteArray, format)
                            } else {
                                @Suppress("DEPRECATION")
                                SmsMessage.createFromPdu(pdu as ByteArray)
                            }
                            
                            stringBuilder.append(smsMessage.messageBody ?: "")
                            sender = smsMessage.originatingAddress ?: ""
                        } catch (e: Exception) {
                            Log.e(TAG, "Error parsing PDU", e)
                        }
                    }

                    val messageBody = stringBuilder.toString()
                    Log.d(TAG, "SMS from: $sender, body length: ${messageBody.length}")

                    // Check if it looks like a transaction SMS
                    val isTransaction = isTransactionSms(sender, messageBody)
                    Log.d(TAG, "isTransactionSms result: $isTransaction")

                    if (isTransaction) {
                        Log.d(TAG, "Starting headless task service")
                        
                        // Start headless task to process SMS
                        val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java)
                        serviceIntent.putExtra("sender", sender)
                        serviceIntent.putExtra("message", messageBody)
                        
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                Log.d(TAG, "Starting foreground service (API >= O)")
                                context.startForegroundService(serviceIntent)
                            } else {
                                Log.d(TAG, "Starting service (API < O)")
                                context.startService(serviceIntent)
                            }
                            Log.d(TAG, "Service started successfully")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to start service", e)
                        }
                    } else {
                        Log.d(TAG, "Ignored non-transaction SMS")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing SMS", e)
            }
        }
    }

    /**
     * Checks if SMS is a financial transaction (debit/credit)
     * PRIVACY: Explicitly excludes OTPs, passwords, and sensitive authentication messages
     */
    private fun isTransactionSms(sender: String, message: String): Boolean {
        val senderUpper = sender.uppercase()
        val messageUpper = message.uppercase()
        
        // ==========================================
        // PRIVACY FIRST: Exclude sensitive messages
        // ==========================================
        
        // OTP and authentication patterns - NEVER process these
        val sensitivePatterns = listOf(
            "OTP", "ONE TIME PASSWORD", "ONE-TIME PASSWORD",
            "VERIFICATION CODE", "VERIFY CODE", "AUTH CODE",
            "PIN IS", "YOUR PIN", "CVV", "CVC",
            "PASSCODE", "PASSWORD", "LOGIN CODE",
            "2FA", "TWO FACTOR", "AUTHENTICATION CODE",
            "SECRET CODE", "SECURE CODE", "TEMPORARY CODE",
            "DO NOT SHARE", "DON'T SHARE", "DONT SHARE",
            "VALID FOR", "EXPIRES IN"  // Common OTP message patterns
        )
        
        // If message contains ANY sensitive pattern, reject it immediately
        if (sensitivePatterns.any { messageUpper.contains(it) }) {
            Log.d(TAG, "SMS rejected: Contains sensitive/OTP content")
            return false
        }
        
        // ==========================================
        // Transaction detection (only if not sensitive)
        // ==========================================
        
        // Common bank/financial sender IDs (India-specific)
        val bankSenders = listOf(
            "HDFC", "ICICI", "SBI", "AXIS", "KOTAK", "PNB", "BOB", "IDBI",
            "CITI", "YES", "INDUS", "FEDERAL", "RBL", "IDFC", "UJJIVAN",
            "BANK", "PAYTM", "GPAY", "PHONPE", "AMAZON", "FLIPKART",
            "BHIM", "MOBIKWIK", "FREECHARGE", "CRED", "SLICE", "LAZYPAY"
        )
        
        // Transaction keywords - these indicate actual money movement
        val transactionKeywords = listOf(
            "DEBITED", "CREDITED", "SPENT", "RECEIVED", "WITHDRAWN",
            "TRANSFERRED", "PAID TO", "PAID FOR", "PURCHASE",
            "RS.", "RS ", "INR ", "INR.", "₹",
            "A/C", "ACCT", "ACCOUNT", 
            "UPI REF", "TXN ID", "TRANSACTION", "TXN",
            "AVL BAL", "AVAILABLE BALANCE", "BAL:",
            "SENT FROM", "SENT TO"  // For Slice and similar apps
        )

        val hasBankSender = bankSenders.any { senderUpper.contains(it) }
        val hasTransactionKeyword = transactionKeywords.any { messageUpper.contains(it) }
        
        // Strong transaction patterns - can detect even without known sender
        val strongPatterns = listOf(
            "DEBITED FROM", "CREDITED TO", "DEBITED FROM A/C", "CREDITED TO A/C",
            "RS.\\d", "RS \\d", "INR \\d", "INR.\\d", "₹\\d",
            "SENT FROM A/C", "SENT TO"  // For Slice format
        )
        val hasStrongPattern = strongPatterns.any { pattern ->
            messageUpper.contains(Regex(pattern.replace("\\d", "\\d+")))
        }

        // Accept if:
        // 1. Known bank sender + any transaction keyword, OR
        // 2. Strong transaction pattern in content (debited/credited with amount)
        val isTransaction = (hasBankSender && hasTransactionKeyword) || 
                           (hasStrongPattern && hasTransactionKeyword)
        
        if (isTransaction) {
            Log.d(TAG, "SMS accepted: Valid transaction from $sender")
        }
        
        return isTransaction
    }
}
