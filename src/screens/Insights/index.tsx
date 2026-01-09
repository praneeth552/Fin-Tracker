/**
 * Insights Screen - Material 3 Expressive
 * =========================================
 * Animated stats and tip cards using built-in Animated
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, AnimatedCard } from '../../components/common';
import { themes, spacing, borderRadius } from '../../theme';
import { springConfigs } from '../../theme/motion';

const InsightsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const tips = [
        { title: 'Weekend Spending', desc: 'You spend 40% more on weekends. Try setting a weekend limit.', icon: '📅' },
        { title: 'Subscription Check', desc: 'You have 2 subscriptions renewing this week.', icon: '🔔' },
        { title: 'Goal Progress', desc: 'You are on track to save ₹10,000 this month!', icon: '🎯' },
    ];

    // Entrance animation
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-20)).current;
    const statsOpacity = useRef(new Animated.Value(0)).current;
    const statsTranslateY = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.stagger(100, [
            Animated.parallel([
                Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(headerTranslateY, { toValue: 0, ...springConfigs.gentle }),
            ]),
            Animated.parallel([
                Animated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(statsTranslateY, { toValue: 0, ...springConfigs.bouncy }),
            ]),
        ]).start();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View
                style={[
                    styles.header,
                    { paddingTop: insets.top + spacing.sm },
                    { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
                ]}
            >
                <Typography variant="h2">Insights</Typography>
            </Animated.View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Row */}
                <Animated.View style={[styles.statsRow, { opacity: statsOpacity, transform: [{ translateY: statsTranslateY }] }]}>
                    <View style={styles.statCardWrapper}>
                        <AnimatedCard borderRadius={20}>
                            <View style={styles.statContent}>
                                <Typography variant="h3" color="success">↓12%</Typography>
                                <Typography variant="caption" color="secondary">vs last month</Typography>
                            </View>
                        </AnimatedCard>
                    </View>

                    <View style={styles.statCardWrapper}>
                        <AnimatedCard borderRadius={20}>
                            <View style={styles.statContent}>
                                <Typography variant="h3" color="accent">₹450</Typography>
                                <Typography variant="caption" color="secondary">Daily Avg</Typography>
                            </View>
                        </AnimatedCard>
                    </View>
                </Animated.View>

                <Typography variant="body" weight="semibold" style={styles.sectionTitle}>Smart Tips</Typography>

                {tips.map((tip, i) => (
                    <View key={i} style={{ marginBottom: spacing.md }}>
                        <AnimatedCard borderRadius={borderRadius.xl}>
                            <View style={styles.tipContent}>
                                <View style={[styles.tipIcon, { backgroundColor: colors.primary + '12' }]}>
                                    <Typography variant="xl">{tip.icon}</Typography>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Typography variant="body" weight="semibold">{tip.title}</Typography>
                                    <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
                                        {tip.desc}
                                    </Typography>
                                </View>
                            </View>
                        </AnimatedCard>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    content: {
        padding: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statCardWrapper: {
        flex: 1,
    },
    statContent: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    sectionTitle: {
        marginBottom: spacing.md,
    },
    tipContent: {
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tipIcon: {
        width: 50,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
});

export default InsightsScreen;
