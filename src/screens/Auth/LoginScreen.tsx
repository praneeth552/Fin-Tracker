/**
 * Login Screen - Professional Design
 * ====================================
 * Clean, minimal authentication with refined visuals
 */

import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    Pressable,
    useColorScheme,
    StatusBar,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography } from '../../components/common';
import { themes, spacing } from '../../theme';
import { useAuth } from '../../../App';

interface LoginScreenProps {
    navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            await new Promise<void>(resolve => setTimeout(resolve, 800));
            await AsyncStorage.setItem('userEmail', email);
            signIn();
        } catch (error) {
            Alert.alert('Error', 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        Alert.alert('Coming Soon', 'Google Sign-In will be available soon!');
    };

    // Professional styling
    const bgColor = isDark ? colors.background : '#FAFAFA';
    const cardBg = isDark ? colors.card : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
    const inputBorder = isDark ? colors.border : '#E4E4E7';
    const focusBorder = colors.accent;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}>
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <View style={[styles.logoContainer, { backgroundColor: isDark ? colors.card : '#F4F4F5' }]}>
                                <Icon name="wallet-outline" size={40} color={colors.text} />
                            </View>
                            <Typography variant="3xl" weight="bold" style={styles.title}>
                                Welcome back
                            </Typography>
                            <Typography variant="body" color="secondary" style={styles.subtitle}>
                                Sign in to continue managing your finances
                            </Typography>
                        </View>

                        {/* Form Card */}
                        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Typography variant="caption" weight="medium" color="secondary" style={styles.inputLabel}>
                                    EMAIL
                                </Typography>
                                <View style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: inputBg,
                                        borderColor: focusedInput === 'email' ? focusBorder : inputBorder
                                    }
                                ]}>
                                    <Icon name="email-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="you@example.com"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedInput('email')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Typography variant="caption" weight="medium" color="secondary" style={styles.inputLabel}>
                                    PASSWORD
                                </Typography>
                                <View style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: inputBg,
                                        borderColor: focusedInput === 'password' ? focusBorder : inputBorder
                                    }
                                ]}>
                                    <Icon name="lock-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your password"
                                        placeholderTextColor={colors.textMuted}
                                        secureTextEntry={!showPassword}
                                        onFocus={() => setFocusedInput('password')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={8}
                                    >
                                        <Icon
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            <Pressable style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
                                <Typography variant="bodySmall" style={{ color: colors.accent }}>
                                    Forgot password?
                                </Typography>
                            </Pressable>

                            {/* Sign In Button */}
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    {
                                        backgroundColor: colors.text,
                                        opacity: loading ? 0.7 : 1
                                    }
                                ]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Signing in...
                                    </Typography>
                                ) : (
                                    <>
                                        <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                            Sign In
                                        </Typography>
                                        <Icon name="arrow-right" size={18} color={colors.background} style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </Pressable>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
                                <Typography variant="caption" color="secondary" style={styles.dividerText}>
                                    OR
                                </Typography>
                                <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
                            </View>

                            {/* Google Sign In */}
                            <Pressable
                                style={[styles.socialBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                onPress={handleGoogleSignIn}
                            >
                                <Icon name="google" size={20} color="#EA4335" />
                                <Typography variant="body" weight="medium" style={{ marginLeft: 12, color: colors.text }}>
                                    Continue with Google
                                </Typography>
                            </Pressable>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Typography variant="body" color="secondary">
                                Don't have an account?{' '}
                            </Typography>
                            <Pressable onPress={() => navigation.navigate('Signup')}>
                                <Typography variant="body" weight="semibold" style={{ color: colors.accent }}>
                                    Sign Up
                                </Typography>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        flexGrow: 1,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        maxWidth: 280,
    },
    formCard: {
        borderRadius: 24,
        padding: spacing.lg,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: spacing.md,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: spacing.lg,
        marginTop: 4,
    },
    primaryBtn: {
        flexDirection: 'row',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: spacing.md,
    },
    socialBtn: {
        flexDirection: 'row',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default LoginScreen;
