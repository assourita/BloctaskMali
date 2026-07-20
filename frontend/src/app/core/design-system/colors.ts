/**
 * BlockTask Design System - Color Palette
 * Inspired by Garden Grid (natural, soft tones) + Linear (minimalist, clean)
 */

export const colors = {
  // Primary - Garden Grid inspired natural green
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main primary
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Secondary - Linear inspired purple accent
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Main secondary
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Neutral - Linear inspired grayscale
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Success - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Warning - Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // Error - Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Info - Blue
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Backgrounds
  background: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
    elevated: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Surface
  surface: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
    hover: '#f3f4f6',
    active: '#e5e7eb',
  },

  // Border
  border: {
    primary: '#e5e7eb',
    secondary: '#d1d5db',
    tertiary: '#9ca3af',
    focus: '#a855f7',
  },

  // Text
  text: {
    primary: '#171717',
    secondary: '#404040',
    tertiary: '#737373',
    inverse: '#ffffff',
  },

  // Stripe-inspired financial colors
  financial: {
    income: '#22c55e',
    expense: '#ef4444',
    pending: '#f59e0b',
    escrow: '#3b82f6',
    released: '#22c55e',
    refunded: '#ef4444',
  },

  // Status colors
  status: {
    draft: '#737373',
    published: '#22c55e',
    in_progress: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#ef4444',
    disputed: '#f59e0b',
  },
};

export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type ColorPalette = keyof typeof colors;
