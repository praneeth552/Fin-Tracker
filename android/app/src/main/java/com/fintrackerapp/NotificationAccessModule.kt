package com.fintrackerapp

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module to manage NotificationListenerService permissions Required for Android 14+ SMS
 * detection
 */
class NotificationAccessModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NotificationAccessModule"
    }

    override fun getName(): String = "NotificationAccess"

    /** Check if NotificationListenerService permission is granted */
    @ReactMethod
    fun isEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val flat =
                    Settings.Secure.getString(
                            context.contentResolver,
                            "enabled_notification_listeners"
                    )

            if (!TextUtils.isEmpty(flat)) {
                val componentName =
                        ComponentName(
                                context.packageName,
                                SmsNotificationListenerService::class.java.name
                        )
                val isEnabled = flat.contains(componentName.flattenToString())
                Log.d(TAG, "NotificationListener enabled: $isEnabled")
                promise.resolve(isEnabled)
            } else {
                Log.d(TAG, "No notification listeners enabled")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking notification access", e)
            promise.reject("ERROR", e.message)
        }
    }

    /** Open notification access settings */
    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening notification settings", e)
            promise.reject("ERROR", e.message)
        }
    }

    /** Check if device is running Android 14+ (where SMS_RECEIVED is restricted) */
    @ReactMethod
    fun needsNotificationAccess(promise: Promise) {
        // Android 14 = API level 34
        // We recommend notification access for Android 13+ (API 33)
        // to be safe, as some OEMs restrict earlier
        val needs = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU // Android 13+
        Log.d(TAG, "Needs notification access: $needs (API ${Build.VERSION.SDK_INT})")
        promise.resolve(needs)
    }
}
