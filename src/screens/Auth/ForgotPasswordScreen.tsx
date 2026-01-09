/**
 * Forgot Password Screen
 * ========================
 * Allow user to recover account via email OTP
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
import { Typography } from '../../components/common';
import { themes, spacing } from '../../theme';

interface ForgotPasswordScreenProps {
    navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(false);

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

    const handleSendOTP = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert(
                'OTP Sent',
                `We have sent a verification code to ${email}`,
                [
                    {
                        text: 'Enter OTP',
                        onPress: () => navigation.navigate('OTPVerification', { email, mode: 'forgot_password' }),
                    },
                ]
            );
        }, 1500);
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
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
                                <Icon name="lock-reset" size={48} color={colors.accent} />
                            </View>
                            <Typography variant="2xl" weight="bold" style={styles.title}>
                                Forgot Password?
                            </Typography>
                            <Typography variant="body" color="secondary" style={styles.subtitle}>
                                Don't worry! It happens. Please enter the email associated with your account.
                            </Typography>
                        </View>

                        {/* Form Card */}
                        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Typography variant="caption" weight="medium" color="secondary" style={styles.inputLabel}>
                                    EMAIL ADDRESS
                                </Typography>
                                <View style={[
                                    styles.inputWrapper,
                                    {
                                        backgroundColor: inputBg,
                                        borderColor: focusedInput ? focusBorder : inputBorder
                                    }
                                ]}>
                                    <Icon name="email-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedInput(true)}
                                        onBlur={() => setFocusedInput(false)}
                                    />
                                </View>
                            </View>

                            {/* Send Button */}
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    {
                                        backgroundColor: colors.text,
                                        opacity: loading ? 0.7 : 1
                                    }
                                ]}
                                onPress={handleSendOTP}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Sending...
                                    </Typography>
                                ) : (
                                    <Typography variant="body" weight="semibold" style={{ color: colors.background }}>
                                        Send Code
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
        lineHeight: 22,
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
    inputGroup: {
        marginBottom: spacing.lg,
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
    },
});

export default ForgotPasswordScreen;
