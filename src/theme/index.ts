/**
 * FinTracker Design System - Professional Monochrome
 * ====================================================
 * Sophisticated gray-based palette with subtle blue accent
 */

// Re-export motion system
export * from './motion';

// Professional Light Theme
const lightColors = {
  primary: '#000000',       // Pure Black
  primaryLight: '#27272A',  // Zinc-800
  primaryDark: '#000000',   // Pure Black

  accent: '#3B82F6',        // Blue-500 - Subtle accent
  accentLight: '#60A5FA',   // Blue-400

  success: '#22C55E',       // Green-500
  warning: '#F59E0B',       // Amber-500
  error: '#EF4444',         // Red-500

  background: '#FAFAFA',    // Zinc-50
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',
  card: '#FFFFFF',

  text: '#18181B',          // Zinc-900
  textSecondary: '#71717A', // Zinc-500
  textMuted: '#A1A1AA',     // Zinc-400
  textInverse: '#FAFAFA',   // Zinc-50

  border: '#E4E4E7',        // Zinc-200
  borderGlass: 'rgba(0, 0, 0, 0.06)',

  shadow: 'rgba(0, 0, 0, 0.08)',

  // Muted professional category colors
  categories: {
    food: '#78716C',        // Stone-500
    transport: '#64748B',   // Slate-500
    shopping: '#737373',    // Neutral-500
    bills: '#71717A',       // Zinc-500
    entertainment: '#6B7280', // Gray-500
    health: '#78716C',      // Stone-500
    education: '#64748B',   // Slate-500
    other: '#A1A1AA',       // Zinc-400
  },
};

// Professional Dark Theme - Lighter Cards
const darkColors = {
  primary: '#FAFAFA',       // Zinc-50 - Inverted for dark
  primaryLight: '#E4E4E7',  // Zinc-200
  primaryDark: '#FFFFFF',

  accent: '#60A5FA',        // Blue-400
  accentLight: '#93C5FD',   // Blue-300

  success: '#4ADE80',       // Green-400
  warning: '#FBBF24',       // Amber-400
  error: '#F87171',         // Red-400

  background: '#09090B',    // Zinc-950
  surface: '#18181B',       // Zinc-900
  surfaceGlass: 'rgba(24, 24, 27, 0.95)',
  card: '#18181B',          // Darker cards (Zinc-900) to blend or pop against black

  text: '#FAFAFA',          // Zinc-50
  textSecondary: '#A1A1AA', // Zinc-400
  textMuted: '#52525B',     // Zinc-600 (Darker for less emphasis)
  textInverse: '#18181B',   // Zinc-900

  border: '#3F3F46',        // Zinc-700 - More visible borders
  borderGlass: 'rgba(255, 255, 255, 0.12)',

  shadow: 'rgba(0, 0, 0, 0.5)',

  // Muted category colors for dark mode
  categories: {
    food: '#A8A29E',        // Stone-400
    transport: '#94A3B8',   // Slate-400
    shopping: '#A3A3A3',    // Neutral-400
    bills: '#A1A1AA',       // Zinc-400
    entertainment: '#9CA3AF', // Gray-400
    health: '#A8A29E',      // Stone-400
    education: '#94A3B8',   // Slate-400
    other: '#71717A',       // Zinc-500
  },
};

export type ThemeColors = typeof lightColors;

export const themes = {
  light: lightColors,
  dark: darkColors,
};

// Typography
export const typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// Border Radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// Shadows
export const createShadows = (isDark: boolean) => ({
  sm: {
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
});

// For backwards compatibility
export const colors = lightColors;
export const shadows = createShadows(false);
