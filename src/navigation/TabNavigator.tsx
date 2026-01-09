/**
 * Tab Navigator - With Floating Action Button
 * =============================================
 * Compact navigation with centered FAB for adding transactions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    useColorScheme,
    Dimensions,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../context/AppContext';

import DashboardScreen from '../screens/Dashboard';
import TransactionsScreen from '../screens/Transactions';
import CategoriesScreen from '../screens/Categories';
import StatsScreen from '../screens/Stats';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { themes } from '../theme';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = [
    { name: 'Dashboard', component: DashboardScreen, label: 'Home', icon: 'home-variant-outline', iconActive: 'home-variant' },
    { name: 'Transactions', component: TransactionsScreen, label: 'Activity', icon: 'swap-horizontal', iconActive: 'swap-horizontal' },
    { name: 'Categories', component: CategoriesScreen, label: 'Wallet', icon: 'wallet-outline', iconActive: 'wallet' },
    { name: 'Stats', component: StatsScreen, label: 'Stats', icon: 'chart-line', iconActive: 'chart-line' },
];

// Dimensions
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 360);
const FAB_SIZE = 56;

// Spring config
const springConfig = {
    tension: 200,
    friction: 15,
    useNativeDriver: true,
};

interface TabItemProps {
    tab: typeof tabs[0];
    isFocused: boolean;
    onPress: () => void;
    colors: typeof themes.light;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isFocused, onPress, colors }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(bgOpacity, {
            toValue: isFocused ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isFocused]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.9, ...springConfig }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, ...springConfig }).start();
    };

    const activeColor = colors.primary;
    const inactiveColor = colors.textMuted;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={styles.tabItemContainer}
        >
            <Animated.View style={[styles.tabItem, { transform: [{ scale: scaleAnim }] }]}>
                <Animated.View
                    style={[
                        styles.activeBg,
                        {
                            opacity: bgOpacity,
                            backgroundColor: activeColor + '12',
                        }
                    ]}
                />
                <Icon
                    name={isFocused ? tab.iconActive : tab.icon}
                    size={22}
                    color={isFocused ? activeColor : inactiveColor}
                />
                <Text
                    style={[
                        styles.label,
                        { color: isFocused ? activeColor : inactiveColor }
                    ]}
                    numberOfLines={1}
                >
                    {tab.label}
                </Text>
            </Animated.View>
        </Pressable>
    );
};

// Floating Action Button Component
interface FABProps {
    onPress: () => void;
    colors: typeof themes.light;
}

const FloatingActionButton: React.FC<FABProps> = ({ onPress, colors }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 0.9, ...springConfig }),
            Animated.timing(rotateAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, ...springConfig }),
            Animated.timing(rotateAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
    };

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.fabContainer}
        >
            <Animated.View style={[styles.fabShadow, { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.fab}
                >
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <Icon name="plus" size={28} color="#FFFFFF" />
                    </Animated.View>
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
};

interface CustomTabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [showAddModal, setShowAddModal] = useState(false);

    // Use global state for adding transactions
    const { addTransaction } = useApp();

    const bgColor = isDark
        ? 'rgba(20, 25, 35, 0.95)'
        : 'rgba(255, 255, 255, 0.92)';

    const borderColor = isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.06)';

    const handleAddTransaction = (transaction: { amount: number; description: string; category: string; type: 'income' | 'expense'; date?: string; paymentMethod?: 'cash' | 'upi' | 'card' | 'netbanking'; accountId?: string; merchant?: string }) => {
        addTransaction({ ...transaction, date: transaction.date || new Date().toISOString().split('T')[0] });
    };

    return (
        <>
            {/* FAB - positioned above tab bar */}
            <FloatingActionButton
                onPress={() => setShowAddModal(true)}
                colors={colors}
            />

            {/* Tab Bar */}
            <View style={[styles.container, { bottom: Math.max(insets.bottom + 8, 16) }]}>
                <View
                    style={[
                        styles.tabBarPill,
                        {
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                            shadowColor: isDark ? '#000' : 'rgba(0, 0, 0, 0.1)',
                        }
                    ]}
                >
                    {state.routes.map((route: any, index: number) => {
                        const tab = tabs.find(t => t.name === route.name);
                        if (!tab) return null;

                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name, route.params);
                            }
                        };

                        return (
                            <TabItem
                                key={route.key}
                                tab={tab}
                                isFocused={isFocused}
                                onPress={onPress}
                                colors={colors}
                            />
                        );
                    })}
                </View>
            </View>

            {/* Add Transaction Modal */}
            <AddTransactionModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddTransaction}
            />
        </>
    );
};

const TabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            {tabs.map((tab) => (
                <Tab.Screen
                    key={tab.name}
                    name={tab.name}
                    component={tab.component}
                />
            ))}
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    tabBarPill: {
        width: TAB_BAR_WIDTH,
        height: TAB_BAR_HEIGHT,
        borderRadius: TAB_BAR_HEIGHT / 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: 4,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    tabItemContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
    },
    activeBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        letterSpacing: 0.2,
    },
    // FAB Styles - positioned to the right
    fabContainer: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        zIndex: 101,
    },
    fabShadow: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default TabNavigator;
