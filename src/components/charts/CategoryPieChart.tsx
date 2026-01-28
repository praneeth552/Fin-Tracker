/**
 * Category Pie Chart - Progressive Fill Animation
 * =================================================
 * Segments animate from 0% to their percentage on load/refresh
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, useColorScheme, Animated, Pressable, Modal, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, G } from 'react-native-svg';
import { Typography } from '../common';
import { themes, spacing } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

const CHART_SIZE = 140;
const STROKE_WIDTH = 24;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CategoryData {
    name: string;
    amount: number;
    color: string;
    key: string;
    icon: string;
}

interface CategoryPieChartProps {
    isRefreshing?: boolean;
    type?: 'expense' | 'income';
}

// ... (AnimatedSegment omitted for brevity if unchanged, but I need to be careful with replace)
// Actually I can just replace the interface and component definition.

// Animated segment component (unchanged)
const AnimatedSegment: React.FC<{
    segment: {
        color: string;
        percentage: number;
        rotation: number;
        strokeDasharray: string;
    };
    index: number;
    isRefreshing: boolean;
    totalSegments: number;
}> = ({ segment, index, isRefreshing, totalSegments }) => {
    // ... implementation unchanged
    const fillAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Initial animation with stagger
        const delay = index * 150;
        setTimeout(() => {
            Animated.timing(fillAnim, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }, delay);
    }, []);

    useEffect(() => {
        if (isRefreshing) {
            // Reset and animate again
            fillAnim.setValue(0);
            const delay = index * 100;
            setTimeout(() => {
                Animated.timing(fillAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }).start();
            }, delay);
        }
    }, [isRefreshing]);

    // Animate strokeDashoffset from CIRCUMFERENCE (empty) to 0 (full segment)
    const strokeDashoffset = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [segment.percentage * CIRCUMFERENCE, 0],
    });

    return (
        <AnimatedCircle
            cx={CHART_SIZE / 2}
            cy={CHART_SIZE / 2}
            r={RADIUS}
            stroke={segment.color}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(${segment.rotation} ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}
        />
    );
};

// Create animated Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

import { useApp } from '../../context/AppContext';
import { useCategories } from '../../hooks/useCategories';

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ isRefreshing = false, type = 'expense' }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { filteredTransactions } = useApp();
    const { t } = useLanguage();
    const navigation = useNavigation<any>();
    const { getCategoryColor, getCategoryLabel, getCategoryIcon } = useCategories();

    const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Calculate Data from Transactions
    const data: CategoryData[] = React.useMemo(() => {
        const categoryMap = new Map<string, number>();

        // Filter transactions based on type
        const relevantTransactions = filteredTransactions.filter(t => t.type === type);

        if (relevantTransactions.length === 0) return [];

        relevantTransactions.forEach(t => {
            const cat = t.category.toLowerCase();
            const amount = t.amount;
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount);
        });

        // Sort by amount
        const sorted = Array.from(categoryMap.entries())
            .map(([key, amount]) => {
                return {
                    key,
                    name: getCategoryLabel(key),
                    amount,
                    color: getCategoryColor(key),
                    icon: getCategoryIcon(key)
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // Group into Other if more than 5 items
        if (sorted.length > 5) {
            const top5 = sorted.slice(0, 5);
            const otherItems = sorted.slice(5);
            const otherAmount = otherItems.reduce((sum, item) => sum + item.amount, 0);

            if (otherAmount > 0) {
                top5.push({
                    key: 'other_grouped',
                    name: t('categories.other') || 'Other',
                    amount: otherAmount,
                    color: getCategoryColor('misc'),
                    icon: getCategoryIcon('misc') // or 'pie-chart' emoji? '📌' from misc is fine
                });
            }
            return top5;
        }

        return sorted;
    }, [filteredTransactions, t, type]);

    const total = data.reduce((sum, item) => sum + item.amount, 0);

    // Entrance animation
    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Returns empty view or placeholder if no data
    if (total === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center', height: 160 }]}>
                <Typography variant="body" color="secondary">No spending data available</Typography>
            </View>
        );
    }

    // Calculate segments
    let cumulativePercentage = 0;
    const segments = data.map((item) => {
        const percentage = item.amount / total;
        const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
        const rotationAngle = cumulativePercentage * 360 - 90;
        cumulativePercentage += percentage;
        return { ...item, percentage, strokeDasharray, rotation: rotationAngle };
    });

    const handleCategoryPress = (category: CategoryData) => {
        setSelectedCategory(category);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim
                }
            ]}
        >
            <View style={styles.chartContainer}>
                {/* Donut Chart */}
                <Svg width={CHART_SIZE} height={CHART_SIZE}>
                    <G>
                        {/* Background circle */}
                        <Circle
                            cx={CHART_SIZE / 2}
                            cy={CHART_SIZE / 2}
                            r={RADIUS}
                            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                        />
                        {/* Animated data segments */}
                        {segments.map((segment, index) => (
                            <AnimatedSegment
                                key={segment.key}
                                segment={segment}
                                index={index}
                                isRefreshing={isRefreshing}
                                totalSegments={segments.length}
                            />
                        ))}
                    </G>
                </Svg>
                {/* Center text */}
                <View style={styles.centerText}>
                    <Typography variant="caption" color="secondary">{t('common.total') || 'Total'}</Typography>
                    <Typography variant="lg" weight="bold">₹{(total / 1000).toFixed(1)}k</Typography>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
                {data.map((item, index) => (
                    <Pressable
                        key={index}
                        style={({ pressed }) => [
                            styles.legendItem,
                            pressed && styles.legendItemPressed,
                            selectedCategory?.key === item.key && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                borderRadius: 8,
                            }
                        ]}
                        onPress={() => handleCategoryPress(item)}
                    >
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        {/* Emoji Icon */}
                        <Typography variant="body" style={{ marginRight: 6, fontSize: 16 }}>
                            {item.icon}
                        </Typography>
                        <View style={styles.legendText}>
                            <Typography variant="caption" color="secondary">{item.name}</Typography>
                            <Typography variant="bodySmall" weight="medium">
                                ₹{item.amount.toLocaleString()}
                            </Typography>
                        </View>
                        <Typography variant="caption" color="secondary">
                            {Math.round((item.amount / total) * 100)}%
                        </Typography>
                    </Pressable>
                ))}
            </View>

            {/* Detail Modal */}
            <Modal
                visible={selectedCategory !== null}
                transparent
                animationType="fade"
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setSelectedCategory(null)}
                >
                    <View
                        style={[
                            styles.modalContent,
                            { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                        ]}
                    >
                        {selectedCategory && (
                            <>
                                <View style={[styles.modalDot, { backgroundColor: selectedCategory.color }]} />
                                <Typography variant="h3" weight="semibold" style={{ marginTop: spacing.sm }}>
                                    {selectedCategory.name}
                                </Typography>
                                <Typography variant="3xl" weight="bold" style={{ marginTop: spacing.xs }}>
                                    ₹{selectedCategory.amount.toLocaleString()}
                                </Typography>
                                <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
                                    {Math.round((selectedCategory.amount / total) * 100)}% {t('stats.totalSpent').toLowerCase()}
                                </Typography>
                                {selectedCategory.amount > 0 && selectedCategory.key !== 'other_grouped' && (
                                    <Pressable
                                        style={[styles.modalBtn, { backgroundColor: selectedCategory.color }]}
                                        onPress={() => {
                                            const categoryKey = selectedCategory.key;
                                            setSelectedCategory(null);
                                            // Navigate to Transactions screen with filter
                                            navigation.navigate('Transactions', { filterCategory: categoryKey });
                                        }}
                                    >
                                        <Typography variant="body" weight="medium" style={{ color: '#FFFFFF' }}>
                                            {t('common.viewTransactions') || 'View Transactions'}
                                        </Typography>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    chartContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerText: {
        position: 'absolute',
        alignItems: 'center',
    },
    legendContainer: {
        flex: 1,
        marginLeft: spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    legendItemPressed: {
        opacity: 0.7,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.sm,
    },
    legendText: {
        flex: 1,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalDot: {
        width: 48,
        height: 48,
        borderRadius: 16,
    },
    modalBtn: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: 12,
    },
});

export default CategoryPieChart;
