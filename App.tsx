/**
 * FinTracker App - Entry Point
 * ==============================
 * With Proper Authentication Flow
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, StyleSheet, useColorScheme, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TabNavigator from './src/navigation/TabNavigator';
import SettingsScreen from './src/screens/Settings';
import { LoginScreen, SignupScreen, ForgotPasswordScreen, OTPVerificationScreen } from './src/screens/Auth';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { themes } from './src/theme';

const Stack = createNativeStackNavigator();

// Auth Context for global auth state
interface AuthContextType {
  isLoggedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  signIn: () => { },
  signOut: () => { },
});

export const useAuth = () => useContext(AuthContext);

const AppContent = () => {
  const { isDark, colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(loggedIn === 'true');
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    await AsyncStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, signIn, signOut }}>
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
              // Auth screens
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen
                  name="Signup"
                  component={SignupScreen}
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="OTPVerification"
                  component={OTPVerificationScreen}
                  options={{ animation: 'slide_from_right' }}
                />
              </>
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

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
