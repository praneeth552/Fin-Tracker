/**
 * Vendors Screen - Material 3 Expressive
 * ========================================
 * Chart and list animations using built-in Animated
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, AnimatedCard } from '../../components/common';
import { VendorsBarChart } from '../../components/charts';
import { themes, spacing, borderRadius } from '../../theme';
import { springConfigs } from '../../theme/motion';

const VendorsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const vendors = [
        { name: 'Swiggy', amount: 3200, count: 8, icon: '🍔' },
        { name: 'Amazon', amount: 2800, count: 3, icon: '📦' },
        { name: 'Uber', amount: 1860, count: 12, icon: '🚗' },
        { name: 'Netflix', amount: 1499, count: 1, icon: '🎬' },
    ];

    // Entrance animation
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-20)).current;
    const chartOpacity = useRef(new Animated.Value(0)).current;
    const chartTranslateY = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.stagger(100, [
            Animated.parallel([
                Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(headerTranslateY, { toValue: 0, ...springConfigs.gentle }),
            ]),
            Animated.parallel([
                Animated.timing(chartOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(chartTranslateY, { toValue: 0, ...springConfigs.bouncy }),
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
                <Typography variant="h2">Vendors</Typography>
            </Animated.View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Chart Card */}
                <Animated.View style={{ opacity: chartOpacity, transform: [{ translateY: chartTranslateY }] }}>
                    <AnimatedCard style={styles.chartCard} borderRadius={24}>
                        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                            <VendorsBarChart />
                        </View>
                    </AnimatedCard>
                </Animated.View>

                <Typography variant="body" weight="semibold" style={styles.sectionTitle}>Top Merchants</Typography>

                {vendors.map((vendor, index) => (
                    <View key={index} style={{ marginBottom: spacing.sm }}>
                        <AnimatedCard borderRadius={borderRadius.lg}>
                            <View style={styles.vendorItem}>
                                <View style={[styles.vendorIcon, { backgroundColor: colors.surface }]}>
                                    <Typography variant="lg">{vendor.icon}</Typography>
                                </View>
                                <View style={styles.vendorInfo}>
                                    <Typography variant="body" weight="medium">{vendor.name}</Typography>
                                    <Typography variant="caption" color="secondary">{vendor.count} transactions</Typography>
                                </View>
                                <Typography variant="body" weight="semibold">₹{vendor.amount.toLocaleString()}</Typography>
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
    chartCard: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        marginBottom: spacing.md,
    },
    vendorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    vendorIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    vendorInfo: {
        flex: 1,
    },
});

export default VendorsScreen;
