/**
 * FinTracker App - Entry Point
 * ==============================
 * With Proper Authentication Flow
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, StyleSheet, useColorScheme, StatusBar, ActivityIndicator, PermissionsAndroid, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TabNavigator from './src/navigation/TabNavigator';
import SettingsScreen from './src/screens/Settings';
import GoogleLoginScreen from './src/screens/Auth/GoogleLoginScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { Api } from './src/services/api';
import SyncQueue from './src/services/SyncQueue';

const Stack = createNativeStackNavigator();

// Auth Context for global auth state
interface AuthContextType {
  isLoggedIn: boolean;
  user: any | null;
  signIn: (userInfo: any) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  signIn: () => { },
  signOut: () => { },
});

export const useAuth = () => useContext(AuthContext);

const AppContent = () => {
  const { isDark, colors } = useTheme();
  const { refreshData } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  /* SMS Listener Logic */
  useEffect(() => {
    // Initialize offline sync queue
    SyncQueue.init();
  }, []);

  useEffect(() => {
    checkLoginStatus();
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userData = await AsyncStorage.getItem('googleUser');

      if (loggedIn === 'true' && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
        await refreshData(); // Load data from Google Sheets
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (userInfo: any) => {
    try {
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('googleUser', JSON.stringify(userInfo));
      setUser(userInfo);
      // Load data first to prevent race conditions/crashes during transition
      await refreshData();
      setIsLoggedIn(true);
    } catch (e) {
      console.error("Sign in persistence failed", e);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('googleUser');
      // GoogleSignin.signOut() should be called here too, but importing it might cause circular dep issues if not careful
      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, signIn, signOut }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <NavigationContainer
          theme={{
            dark: isDark,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.primary,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isLoggedIn ? (
              // Auth stack - Single Google Login Screen
              <Stack.Screen
                name="GoogleLogin"
                component={GoogleLoginScreen}
                options={{ animation: 'fade' }}
              />
            ) : (
              // App screens
              <>
                <Stack.Screen name="Main" component={TabNavigator} />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ animation: 'slide_from_right' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import { LanguageProvider } from './src/context/LanguageContext';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppProvider>
              <AppContent />
            </AppProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

