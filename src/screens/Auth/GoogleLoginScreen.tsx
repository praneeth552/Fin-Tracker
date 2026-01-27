import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../../App';
import { Typography } from '../../components/common/Typography';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

GoogleSignin.configure({
    webClientId: '734044761437-aecdjj4m06u1h0itk4mals5p1t890knl.apps.googleusercontent.com',
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'],
});

const GoogleLoginScreen = () => {
    const { colors, isDark } = useTheme();
    const { signIn } = useAuth();
    const insets = useSafeAreaInsets();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;

    const isMounted = useRef(true);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();

        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleGoogleLogin = async () => {
        setIsSigningIn(true);
        setError(null);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            console.log('Google Sign-In Success:', userInfo);
            if (isMounted.current) {
                await signIn(userInfo);
            }
        } catch (error: any) {
            if (!isMounted.current) return;
            console.error('Google Sign-In Error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // Already in progress
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                setError('Google Play Services not available');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            if (isMounted.current) {
                setIsSigningIn(false);
            }
        }
    };

    // Softer, more soothing color palette
    const bgColor = isDark ? '#0F172A' : '#F8FAFC';
    const cardBg = isDark ? '#1E293B' : '#FFFFFF';
    const accentColor = '#3B82F6';
    const successColor = '#10B981';

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} />

            {/* Subtle Background Pattern */}
            <View style={styles.bgPattern}>
                <View style={[styles.bgCircle, styles.bgCircle1, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }]} />
                <View style={[styles.bgCircle, styles.bgCircle2, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)' }]} />
            </View>

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], paddingTop: insets.top + 40 }]}>

                {/* Logo & Brand */}
                <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }] }]}>
                    <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}>
                        <Icon name="wallet-outline" size={48} color={accentColor} />
                    </View>
                    <Typography variant="h1" weight="bold" style={[styles.title, { color: colors.text }]}>
                        FinTracker
                    </Typography>
                    <Typography variant="body" style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Simple. Private. Yours.
                    </Typography>
                </Animated.View>

                {/* Features List */}
                <View style={styles.features}>
                    <FeatureItem
                        icon="shield-check-outline"
                        title="100% Private"
                        description="Data stored in YOUR Google Drive only"
                        color={successColor}
                        isDark={isDark}
                    />
                    <FeatureItem
                        icon="cellphone-message"
                        title="Auto-Track SMS"
                        description="Automatically detect bank transactions"
                        color="#8B5CF6"
                        isDark={isDark}
                    />
                    <FeatureItem
                        icon="chart-line"
                        title="Smart Insights"
                        description="Understand your spending patterns"
                        color="#F59E0B"
                        isDark={isDark}
                    />
                </View>
            </Animated.View>

            {/* Bottom Section */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim, paddingBottom: insets.bottom + 24 }]}>
                {error && (
                    <View style={[styles.errorBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                        <Icon name="alert-circle" size={18} color="#EF4444" />
                        <Typography variant="bodySmall" style={{ color: '#EF4444', marginLeft: 8 }}>
                            {error}
                        </Typography>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.googleButton, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={handleGoogleLogin}
                    disabled={isSigningIn}
                    activeOpacity={0.85}
                >
                    {isSigningIn ? (
                        <Animated.View style={styles.loader}>
                            <Icon name="loading" size={24} color={accentColor} />
                        </Animated.View>
                    ) : (
                        <>
                            <View style={styles.googleIconBg}>
                                <Icon name="google" size={20} color="#4285F4" />
                            </View>
                            <Typography variant="body" weight="semibold" style={{ color: colors.text }}>
                                Continue with Google
                            </Typography>
                        </>
                    )}
                </TouchableOpacity>

                <Typography variant="caption" style={[styles.footerText, { color: colors.textMuted }]}>
                    By continuing, you agree to our Terms & Privacy Policy
                </Typography>
            </Animated.View>
        </View>
    );
};

// Feature Item Component
const FeatureItem = ({ icon, title, description, color, isDark }: any) => (
    <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: isDark ? `${color}20` : `${color}15` }]}>
            <Icon name={icon} size={22} color={color} />
        </View>
        <View style={styles.featureText}>
            <Typography variant="body" weight="semibold" style={{ color: isDark ? '#F1F5F9' : '#1E293B', marginBottom: 2 }}>
                {title}
            </Typography>
            <Typography variant="caption" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {description}
            </Typography>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgPattern: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    bgCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    bgCircle1: {
        width: width * 1.5,
        height: width * 1.5,
        top: -width * 0.5,
        right: -width * 0.3,
    },
    bgCircle2: {
        width: width,
        height: width,
        bottom: -width * 0.3,
        left: -width * 0.3,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        width: 96,
        height: 96,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 32,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.8,
    },
    features: {
        marginTop: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
        marginLeft: 16,
    },
    footer: {
        paddingHorizontal: spacing.xl,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    googleIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(66,133,244,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    loader: {
        height: 24,
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
    },
});

export default GoogleLoginScreen;
