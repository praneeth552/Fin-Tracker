/**
 * Vendors Bar Chart - Dark Mode Support
 * =======================================
 */

import React from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { themes, spacing, borderRadius } from '../../theme';
import { Typography } from '../common';

const screenWidth = Dimensions.get('window').width;

interface VendorData {
    name: string;
    amount: number;
}

interface VendorsBarChartProps {
    data?: VendorData[];
}

const defaultData: VendorData[] = []; // Removed dummy data

import { useApp } from '../../context/AppContext';

export const VendorsBarChart: React.FC<VendorsBarChartProps> = ({ data }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { filteredTransactions } = useApp();

    const chartData = React.useMemo(() => {
        let displayData = data;

        // If no data provided, calculate from transactions
        if (!displayData || displayData.length === 0) {
            const vendorMap = new Map<string, number>();

            filteredTransactions.filter(t => t.type === 'expense' && t.merchant).forEach(t => {
                const name = t.merchant || 'Unknown';
                vendorMap.set(name, (vendorMap.get(name) || 0) + t.amount);
            });

            displayData = Array.from(vendorMap.entries())
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5); // Top 5
        }

        if (displayData.length === 0) return null;

        return {
            labels: displayData.map(d => d.name.slice(0, 4)),
            datasets: [{ data: displayData.map(d => d.amount) }],
        };
    }, [data, filteredTransactions]);

    if (!chartData) {
        return (
            <View style={[styles.container, { height: 160, justifyContent: 'center' }]}>
                <Typography variant="body" color="secondary">No vendor data available</Typography>
            </View>
        );
    }

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: () => colors.primary,
        labelColor: () => colors.textSecondary,
        barPercentage: 0.5,
        propsForBackgroundLines: {
            stroke: colors.border,
        },
    };

    return (
        <View style={styles.container}>
            <BarChart
                data={chartData}
                width={screenWidth - spacing.md * 4}
                height={160}
                chartConfig={chartConfig}
                style={styles.chart}
                fromZero
                showValuesOnTopOfBars
                yAxisLabel="₹"
                yAxisSuffix=""
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    chart: {
        borderRadius: borderRadius.md,
        marginLeft: -spacing.sm,
    },
});

export default VendorsBarChart;
