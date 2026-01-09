/**
 * Vendors Bar Chart - Dark Mode Support
 * =======================================
 */

import React from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { themes, spacing, borderRadius } from '../../theme';

const screenWidth = Dimensions.get('window').width;

interface VendorData {
    name: string;
    amount: number;
}

interface VendorsBarChartProps {
    data?: VendorData[];
}

const defaultData: VendorData[] = [
    { name: 'Swiggy', amount: 3200 },
    { name: 'Amazon', amount: 2800 },
    { name: 'Uber', amount: 1860 },
    { name: 'Netflix', amount: 1499 },
    { name: 'BigB', amount: 2400 },
];

export const VendorsBarChart: React.FC<VendorsBarChartProps> = ({ data = defaultData }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const chartData = {
        labels: data.map(d => d.name.slice(0, 4)),
        datasets: [{ data: data.map(d => d.amount) }],
    };

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
