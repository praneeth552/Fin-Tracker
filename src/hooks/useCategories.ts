
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export interface CategoryItem {
    key: string;
    label: string;
    icon: string; // Emoji
    color: string;
    isCustom?: boolean;
}

// Default Categories - Standardized List
// Combining emojis from AddTransactionModal and colors from TransactionsScreen
const defaultCategories: CategoryItem[] = [
    { key: 'food', label: 'Food', icon: '🍽️', color: '#3B82F6' },
    { key: 'transport', label: 'Travel', icon: '🚗', color: '#8B5CF6' },
    { key: 'shopping', label: 'Shop', icon: '🛒', color: '#EC4899' },
    { key: 'bills', label: 'Bills', icon: '📄', color: '#10B981' },
    { key: 'entertainment', label: 'Fun', icon: '🎬', color: '#F59E0B' },
    { key: 'health', label: 'Health', icon: '💊', color: '#EF4444' },
    { key: 'education', label: 'Education', icon: '📚', color: '#06B6D4' },
    { key: 'transfer', label: 'Transfer', icon: '↔️', color: '#64748B' },
    { key: 'misc', label: 'Misc', icon: '📌', color: '#6B7280' },
    { key: 'income', label: 'Income', icon: '💵', color: '#22C55E' },
];

// Mapping for text-based icons to emojis (for legacy/stored categories)
export const textIconToEmoji: Record<string, string> = {
    // Income related
    cash: '💵', salary: '💰', income: '💵', money: '💵',
    // Fuel
    fuel: '⛽', gas: '⛽', petrol: '⛽', gasstation: '⛽',
    // Food
    food: '🍽️', dining: '🍽️', restaurant: '🍕',
    // Transport
    transport: '🚗', car: '🚗', travel: '✈️', taxi: '🚕',
    // Shopping
    shopping: '🛒', cart: '🛒', shop: '🛍️',
    // Bills
    bills: '📄', bill: '📄', utilities: '💡', receipt: '📄',
    // Entertainment
    entertainment: '🎬', movie: '🎬', fun: '🎉', game: '🎮',
    // Health
    health: '💊', medical: '🏥', pill: '💊',
    // Education
    education: '📚', school: '🎓', book: '📖',
    // Misc
    misc: '📌', other: '📋', shape: '📋',
    // Other
    label: '🏷️', tag: '🏷️',
    tax: '📊', taxes: '📊',
    gift: '🎁', subscription: '📺', gym: '🏋️', music: '🎵',
    pet: '🐕', coffee: '☕', pizza: '🍕', gaming: '🎮', beauty: '💄', baby: '👶',
    transfer: '↔️', transition: '↔️',
};

// Helper to get emoji from icon (text or emoji)
export const getEmojiFromIcon = (icon: string | undefined): string => {
    if (!icon || icon.trim() === '') return '📁';
    // If it's already an emoji (no alphanumeric chars), return as-is
    // Simple check: most emojis don't have [a-zA-Z]
    if (!/[a-zA-Z]/.test(icon)) return icon;

    // Try to map text icon to emoji
    const lowerIcon = icon.toLowerCase().replace(/[^a-z]/g, '');
    return textIconToEmoji[lowerIcon] || '📁';
};

export const useCategories = () => {
    const { customCategories } = useApp();
    const { t } = useLanguage();

    // 1. Merge default categories with custom categories
    const allCategories = useMemo(() => {
        const defaultKeys = new Set(defaultCategories.map(c => c.key));
        const seenKeys = new Set<string>();

        // Translate defaults
        const translatedDefaults = defaultCategories.map(c => ({
            ...c,
            label: t(`categories.${c.key}`) || c.label,
            isCustom: false
        }));

        // Process Custom Categories
        const validCustom = customCategories
            .filter(c => {
                if (!c.key || typeof c.key !== 'string' || c.key.length < 2) return false;
                if (c.key === 'key') return false;
                if (defaultKeys.has(c.key)) return false;
                if (seenKeys.has(c.key)) return false;
                seenKeys.add(c.key);
                return true;
            })
            .map(c => ({
                key: c.key,
                label: c.label,
                icon: getEmojiFromIcon(c.icon),
                color: c.color || '#6B7280',
                isCustom: true
            }));

        return [...translatedDefaults, ...validCustom];
    }, [customCategories, t]);

    // 2. lookup maps
    const categoryMap = useMemo(() => {
        const map = new Map<string, CategoryItem>();
        allCategories.forEach(c => map.set(c.key.toLowerCase(), c));
        return map;
    }, [allCategories]);

    // 3. Helpers
    const getCategoryByKey = (key: string): CategoryItem | undefined => {
        return categoryMap.get(key.toLowerCase());
    };

    const getCategoryColor = (key: string): string => {
        const cat = getCategoryByKey(key);
        // Fallback checks for common types if key matches type
        if (!cat) {
            if (key === 'expense') return '#EF4444';
            if (key === 'income') return '#22C55E';
            return '#6B7280';
        }
        return cat.color;
    };

    const getCategoryIcon = (key: string): string => {
        const cat = getCategoryByKey(key);
        if (!cat) {
            // Check manual map for fallback
            return getEmojiFromIcon(key);
        }
        return cat.icon;
    };

    const getCategoryLabel = (key: string): string => {
        const cat = getCategoryByKey(key);
        return cat ? cat.label : key.charAt(0).toUpperCase() + key.slice(1);
    };

    return {
        allCategories,
        categoryMap,
        getCategoryByKey,
        getCategoryColor,
        getCategoryIcon,
        getCategoryLabel
    };
};
