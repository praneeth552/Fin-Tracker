import { Transaction } from '../context/AppContext';

export interface Insight {
    id: string;
    title: string;
    description: string;
    type: 'alert' | 'info' | 'success' | 'warning';
    priority: number;
    icon: string;
}

export const generateInsights = (transactions: Transaction[], budgets: any[] = []): Insight[] => {
    const insights: Insight[] = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpent = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // 1. Savings Rate Insight
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalSpent) / totalIncome) * 100;
        if (savingsRate < 10) {
            insights.push({
                id: 'low-savings',
                title: 'Low Savings Rate',
                description: `You've saved only ${Math.round(savingsRate)}% of your income this month. Aim for 20%.`,
                type: 'warning',
                priority: 1,
                icon: 'alert-circle-outline'
            });
        } else if (savingsRate > 40) {
            insights.push({
                id: 'high-savings',
                title: 'Great Savings!',
                description: `You're saving ${Math.round(savingsRate)}% of your income. Keep it up!`,
                type: 'success',
                priority: 3,
                icon: 'check-circle-outline'
            });
        }
    }

    // 2. High Merchant Spending
    const merchantMap: Record<string, number> = {};
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
        if (t.merchant) {
            merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + t.amount;
        }
    });

    Object.entries(merchantMap).forEach(([merchant, amount]) => {
        if (totalSpent > 0 && (amount / totalSpent) > 0.25) {
            insights.push({
                id: `high-merchant-${merchant}`,
                title: `High Spending at ${merchant}`,
                description: `You spent ${Math.round((amount / totalSpent) * 100)}% of your monthly expense at ${merchant}.`,
                type: 'info',
                priority: 2,
                icon: 'storefront-outline' // Changed from shop-outline (deprecated?) to storefront or similar
            });
        }
    });

    // 3. Budget Alerts
    budgets.forEach(budget => {
        if (budget.limit > 0 && budget.spent > budget.limit * 0.9) {
            const isOver = budget.spent > budget.limit;
            insights.push({
                id: `budget-${budget.category}`,
                title: isOver ? `Budget Exceeded: ${budget.category}` : `Near Budget Limit: ${budget.category}`,
                description: isOver
                    ? `You exceeded your ${budget.category} budget by ₹${budget.spent - budget.limit}.`
                    : `You have used ${Math.round((budget.spent / budget.limit) * 100)}% of your ${budget.category} budget.`,
                type: isOver ? 'alert' : 'warning',
                priority: 0,
                icon: 'wallet-outline'
            });
        }
    });

    // Sort by priority (lower number = higher priority)
    return insights.sort((a, b) => a.priority - b.priority).slice(0, 5);
};
