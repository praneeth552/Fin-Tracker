package com.fintrackerapp

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module for managing UPI Detection settings Syncs React Native AsyncStorage setting to
 * Android SharedPreferences which is read by SmsNotificationListenerService in native code
 */
class UPIDetectionModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "UPIDetectionModule"
        private const val PREFS_NAME = "FinTrackerPrefs"
        private const val UPI_DETECTION_ENABLED = "upiDetectionEnabled"
    }

    override fun getName(): String = "UPIDetectionModule"

    /** Set UPI detection enabled/disabled Called from React Native when user toggles the setting */
    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        try {
            val prefs =
                    reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(UPI_DETECTION_ENABLED, enabled).apply()
            Log.d(TAG, "UPI Detection set to: $enabled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting UPI detection", e)
            promise.reject("ERROR", e.message)
        }
    }

    /** Get current UPI detection status */
    @ReactMethod
    fun isEnabled(promise: Promise) {
        try {
            val prefs =
                    reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(UPI_DETECTION_ENABLED, false)
            Log.d(TAG, "UPI Detection is: $enabled")
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting UPI detection status", e)
            promise.reject("ERROR", e.message)
        }
    }
}
