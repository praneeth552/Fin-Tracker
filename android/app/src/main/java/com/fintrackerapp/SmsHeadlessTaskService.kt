package com.fintrackerapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Headless JS Task Service for processing SMS in background This service runs the JS code even when
 * the app is in background
 */
class SmsHeadlessTaskService : HeadlessJsTaskService() {

    companion object {
        private const val TAG = "SmsHeadlessTaskService"
        private const val CHANNEL_ID = "sms_processing_channel"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                    NotificationChannel(
                                    CHANNEL_ID,
                                    "SMS Processing",
                                    NotificationManager
                                            .IMPORTANCE_MIN // Minimal importance - no sound, no
                                    // popup
                                    )
                            .apply {
                                description = "Processing transaction SMS"
                                setShowBadge(false)
                            }

            val notificationManager =
                    getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)

            // Start as foreground service with minimal notification
            val notification =
                    NotificationCompat.Builder(this, CHANNEL_ID)
                            .setContentTitle("Processing SMS")
                            .setContentText("Detecting transactions...")
                            .setSmallIcon(android.R.drawable.ic_dialog_info)
                            .setPriority(NotificationCompat.PRIORITY_MIN)
                            .setOngoing(false) // Allow swipe to dismiss
                            .setAutoCancel(true)
                            .build()

            startForeground(NOTIFICATION_ID, notification)
            Log.d(TAG, "Started as foreground service")
        }
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        Log.d(TAG, "getTaskConfig called")
        val extras: Bundle? = intent?.extras

        if (extras != null) {
            val sender = extras.getString("sender", "")
            val message = extras.getString("message", "")
            val source = extras.getString("source", "sms")
            val packageName = extras.getString("packageName", "")

            Log.d(TAG, "Processing $source - sender: $sender, message: ${message.take(50)}...")

            val data = Arguments.createMap()
            data.putString("sender", sender)
            data.putString("message", message)
            data.putString("source", source)
            data.putString("packageName", packageName)

            Log.d(TAG, "Starting HeadlessJsTask: ProcessSmsTask (source: $source)")

            return HeadlessJsTaskConfig(
                    "ProcessSmsTask", // Task name registered in JS
                    data, // Task data
                    60000, // Timeout (60 seconds - allow time for network calls)
                    true // Allow task in foreground
            )
        }

        Log.w(TAG, "No extras found in intent")
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
    }
}
