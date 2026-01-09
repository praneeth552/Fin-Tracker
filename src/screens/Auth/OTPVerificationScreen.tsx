/**
 * OTP Verification Screen
 * ========================
 * Verify email via 4-digit code
 */

import React, { useState, useRef, useEffect } from 'react';
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

interface OTPVerificationScreenProps {
    navigation: any;
    route: any;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ navigation, route }) => {
    const { email, mode } = route.params || { email: 'user@example.com', mode: 'signup' };
    const { signIn } = useAuth();

    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [otp, setOtp] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);

    // Refs for input focus management
    const inputRefs = useRef<Array<TextInput | null>>([]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();

        // Timer countdown
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto move to next input
        if (text && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 4) {
            Alert.alert('Error', 'Please enter the full 4-digit code');
            return;
        }

        setLoading(true);
        // Simulate verification
        setTimeout(async () => {
            setLoading(false);
            if (mode === 'signup') {
                await AsyncStorage.setItem('userEmail', email);
                signIn(); // Log in directly
            } else {
                Alert.alert('Success', 'Email verified! You can now reset your password.');
                // Here we would navigate to Reset Password, but for MVP we go to Login
                navigation.navigate('Login');
            }
        }, 1500);
    };

    const handleResend = () => {
        setTimer(30);
        Alert.alert('Sent', 'A new code has been sent to your email.');
    };

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
                    {/* Back Button */}
                    <Pressable
                        style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F4F4F5' }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color={colors.text} />
                    </Pressable>

                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}>
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                                <Icon name="email-check-outline" size={48} color={isDark ? '#4ADE80' : '#16A34A'} />
                            </View>
                            <Typography variant="2xl" weight="bold" style={styles.title}>
                                OTP Verification
                            </Typography>
                            <Typography variant="body" color="secondary" style={styles.subtitle}>
                                Enter the 4-digit code sent to
                            </Typography>
                            <Typography variant="body" weight="semibold" style={{ color: colors.text, marginTop: 4 }}>
                                {email}
                            </Typography>
                        </View>

                        {/* Form Card */}
                        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                            {/* OTP Inputs */}
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => { inputRefs.current[index] = ref; }}
                                        style={[
                                            styles.otpInput,
                                            {
                                                backgroundColor: inputBg,
                                                borderColor: digit ? focusBorder : inputBorder,
                                                color: colors.text
                                            }
                                        ]}
                                        value={digit}
                                        onChangeText={(text) => handleChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        textAlign="center"
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </View>

                            {/* Resend Timer */}
                            <View style={styles.resendContainer}>
                                <Typography variant="bodySmall" color="secondary">
                                    Didn't receive code?{' '}
                                </Typography>
                                {timer > 0 ? (
                                    <Typography variant="bodySmall" weight="semibold" style={{ color: colors.accent }}>
                                        Resend in {timer}s
                                    </Typography>
                                ) : (
                                    <Pressable onPress={handleResend}>
                                        <Typography variant="bodySmall" weight="bold" style={{ color: colors.accent }}>
                                            Resend Code
                                        </Typography>
                                    </Pressable>
                                )}
                            </View>

                            {/* Verify Button */}
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    {
                                        backgroundColor: colors.text,
                                        opacity: loading ? 0.7 : 1
                                    }
                                ]}
                                onPress={handleVerify}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Verifying...
                                    </Typography>
                                ) : (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Verify
                                    </Typography>
                                )}
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
        marginBottom: 20,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        maxWidth: 280,
    },
    formCard: {
        borderRadius: 24,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    otpInput: {
        width: 60,
        height: 60,
        borderRadius: 16,
        borderWidth: 1.5,
        fontSize: 24,
        fontWeight: 'bold',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
    },
    primaryBtn: {
        flexDirection: 'row',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default OTPVerificationScreen;
