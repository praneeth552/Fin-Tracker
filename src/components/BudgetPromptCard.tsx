import React from 'react';
import { View, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing, borderRadius } from '../theme';
import { useApp } from '../context/AppContext';

export const BudgetPromptCard: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const navigation = useNavigation<any>();

    const { budgets } = useApp();

    // Only show if no budgets are set (or very few?)
    // User request: "small little card showing in dashboard like set your budgets"
    // Let's show it if total budget limit is 0 or no budgets exist
    const hasBudgets = budgets && budgets.length > 0 && budgets.some(b => b.limit > 0);

    if (hasBudgets) return null;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Icon name="chart-arc" size={24} color="#3B82F6" />
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="body" weight="semibold">Set Your Budgets</Typography>
                    <Typography variant="caption" color="secondary" numberOfLines={2}>
                        Take control by setting monthly limits for your categories.
                    </Typography>
                </View>
            </View>
            <Pressable
                style={[styles.button, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' }]}
                onPress={() => navigation.navigate('Categories', { initialTab: 'budgets' })}
            >
                <Typography variant="caption" weight="semibold" style={{ color: colors.primary }}>
                    SET NOW
                </Typography>
                <Icon name="chevron-right" size={16} color={colors.primary} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    textContainer: {
        flex: 1,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 2,
    },
});
