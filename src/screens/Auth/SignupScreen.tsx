/**
 * Signup Screen - Professional Design
 * =====================================
 * Clean registration with refined visuals
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

interface SignupScreenProps {
    navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { signIn } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'password' | null>(null);

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

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await new Promise<void>(resolve => setTimeout(resolve, 800));
            await AsyncStorage.setItem('userEmail', email);
            await AsyncStorage.setItem('userName', name);
            signIn();
        } catch (error) {
            Alert.alert('Error', 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        Alert.alert('Coming Soon', 'Google Sign-Up will be available soon!');
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
                        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}>
                        {/* Back Button */}
                        <Pressable
                            style={[styles.backBtn, { backgroundColor: isDark ? colors.card : '#F4F4F5' }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-left" size={20} color={colors.text} />
                        </Pressable>

                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <Typography variant="3xl" weight="bold" style={styles.title}>
                                Create account
                            </Typography>
                            <Typography variant="body" color="secondary" style={styles.subtitle}>
                                Start your journey to better financial health
                            </Typography>
                        </View>

                        {/* Form Card */}
                        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                            {/* Name Input */}
                            <View style={styles.inputGroup}>
                                <Typography variant="caption" weight="medium" color="secondary" style={styles.inputLabel}>
                                    FULL NAME
                                </Typography>
                                <View style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: inputBg,
                                        borderColor: focusedInput === 'name' ? focusBorder : inputBorder
                                    }
                                ]}>
                                    <Icon name="account-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="John Doe"
                                        placeholderTextColor={colors.textMuted}
                                        autoCapitalize="words"
                                        onFocus={() => setFocusedInput('name')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

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
                                        placeholder="Min 6 characters"
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

                            {/* Sign Up Button */}
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    {
                                        backgroundColor: colors.text,
                                        opacity: loading ? 0.7 : 1
                                    }
                                ]}
                                onPress={handleSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Creating account...
                                    </Typography>
                                ) : (
                                    <>
                                        <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                            Create Account
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

                            {/* Google Sign Up */}
                            <Pressable
                                style={[styles.socialBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                onPress={handleGoogleSignUp}
                            >
                                <Icon name="google" size={20} color="#EA4335" />
                                <Typography variant="body" weight="medium" style={{ marginLeft: 12, color: colors.text }}>
                                    Continue with Google
                                </Typography>
                            </Pressable>
                        </View>

                        {/* Terms */}
                        <Typography variant="caption" color="secondary" align="center" style={styles.terms}>
                            By creating an account, you agree to our{' '}
                            <Typography variant="caption" style={{ color: colors.accent }}>Terms</Typography>
                            {' '}and{' '}
                            <Typography variant="caption" style={{ color: colors.accent }}>Privacy Policy</Typography>
                        </Typography>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Typography variant="body" color="secondary">
                                Already have an account?{' '}
                            </Typography>
                            <Pressable onPress={() => navigation.goBack()}>
                                <Typography variant="body" weight="semibold" style={{ color: colors.accent }}>
                                    Sign In
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
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerSection: {
        marginBottom: 24,
    },
    title: {
        marginBottom: spacing.xs,
    },
    subtitle: {
        maxWidth: 280,
    },
    formCard: {
        borderRadius: 24,
        padding: spacing.lg,
        marginBottom: 20,
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
    primaryBtn: {
        flexDirection: 'row',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.sm,
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
    terms: {
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SignupScreen;
