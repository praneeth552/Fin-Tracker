/**
 * FinTracker - TypeScript Type Definitions
 * =========================================
 * 
 * 📚 LEARNING: Why TypeScript?
 * TypeScript adds type safety to JavaScript. It catches errors at compile time
 * instead of runtime, makes code self-documenting, and provides better IDE support.
 * 
 * 📚 LEARNING: Interfaces vs Types
 * - Interface: Best for defining object shapes, can be extended
 * - Type: More flexible, can define unions, primitives, etc.
 * 
 * We use interfaces for our data models since they clearly define object structures.
 */

// ============================================
// TRANSACTION TYPES
// ============================================

/**
 * Represents a single financial transaction
 * 
 * 📚 LEARNING: Interface Definition
 * Each property has a name, followed by colon, then its type.
 * Optional properties have a ? after the name.
 */
export interface Transaction {
    id: string;                    // Unique identifier
    amount: number;                // Transaction amount (positive = expense, negative = income)
    description: string;           // What was purchased/received
    category: CategoryType;        // Category for grouping
    date: string;                  // ISO date string (e.g., "2026-01-05")
    merchant?: string;             // Optional: Store or company name
    notes?: string;                // Optional: User notes
    isRecurring?: boolean;         // Optional: Is this a recurring transaction?
    source: 'manual' | 'auto';     // How was this added?
    createdAt: string;             // When the record was created
    updatedAt: string;             // When the record was last updated
}

/**
 * Input for creating a new transaction (omits auto-generated fields)
 * 
 * 📚 LEARNING: Omit<> Utility Type
 * TypeScript's Omit<T, K> creates a new type by removing keys K from type T.
 * This is useful for "create" inputs where the server generates IDs and timestamps.
 */
export type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================
// CATEGORY TYPES
// ============================================

/**
 * Predefined category types
 * 
 * 📚 LEARNING: Union Types
 * A union type (string1 | string2 | ...) limits values to specific options.
 * This is safer than using plain 'string' because TypeScript will error
 * if you try to use an invalid category.
 */
export type CategoryType =
    | 'food'
    | 'transport'
    | 'shopping'
    | 'bills'
    | 'entertainment'
    | 'health'
    | 'education'
    | 'income'
    | 'other';

/**
 * Category metadata (for UI display)
 */
export interface Category {
    id: CategoryType;
    label: string;           // Display name
    icon: string;            // Icon name (from react-native-vector-icons)
    color: string;           // Associated color (from theme.colors.categories)
}

// ============================================
// BUDGET TYPES
// ============================================

/**
 * Budget for a specific category
 */
export interface Budget {
    id: string;
    category: CategoryType;
    limit: number;           // Monthly budget limit
    spent: number;           // Amount spent this period
    period: 'weekly' | 'monthly';
    createdAt: string;
    updatedAt: string;
}

/**
 * Budget progress for UI display
 * 
 * 📚 LEARNING: Computed Properties
 * Some types include computed values that make UI rendering easier.
 */
export interface BudgetProgress extends Budget {
    percentage: number;      // spent / limit * 100
    remaining: number;       // limit - spent
    status: 'safe' | 'warning' | 'exceeded';
}

// ============================================
// DASHBOARD TYPES
// ============================================

/**
 * Summary statistics for the dashboard
 */
export interface DashboardSummary {
    totalSpent: number;      // Total spending this month
    totalIncome: number;     // Total income this month
    dailyAverage: number;    // Average daily spending
    budgetUsage: number;     // Overall budget usage percentage
    savingsRate: number;     // (income - expenses) / income * 100
}

/**
 * Data point for charts
 */
export interface ChartDataPoint {
    label: string;           // X-axis label (date, category name, etc.)
    value: number;           // Y-axis value
    color?: string;          // Optional color for pie charts
}

/**
 * Spending trend data (for line charts)
 */
export interface SpendingTrend {
    labels: string[];        // Dates or periods
    data: number[];          // Corresponding values
}

// ============================================
// INSIGHT TYPES
// ============================================

/**
 * AI-generated insight
 */
export interface Insight {
    id: string;
    title: string;           // Short insight title
    description: string;     // Detailed explanation
    type: 'tip' | 'warning' | 'achievement' | 'trend';
    priority: 'low' | 'medium' | 'high';
    category?: CategoryType; // Related category (if applicable)
    createdAt: string;
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Common async state pattern
 * 
 * 📚 LEARNING: Generic Types
 * <T> is a type parameter - it lets us create reusable types.
 * AsyncState<Transaction[]> would be an async state holding transactions.
 */
export interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

/**
 * Filter options for transactions
 */
export interface TransactionFilters {
    category?: CategoryType;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    searchQuery?: string;
}

// ============================================
// USER TYPES
// ============================================

/**
 * User preferences
 */
export interface UserPreferences {
    currency: string;                    // e.g., "INR", "USD"
    currencySymbol: string;              // e.g., "₹", "$"
    defaultBudgetPeriod: 'weekly' | 'monthly';
    notificationsEnabled: boolean;
    budgetAlertThreshold: number;        // Percentage at which to alert (e.g., 80)
}
