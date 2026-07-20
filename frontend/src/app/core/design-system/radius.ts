/**
 * BlockTask Design System - Border Radius
 * Inspired by Linear (subtle, modern) + Stripe (consistent)
 */

export const radius = {
  none: '0',
  xs: '0.125rem',  // 2px
  sm: '0.25rem',   // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px',  // Pill/circle
};

// Component-specific radius
export const componentRadius = {
  button: radius.md,
  input: radius.md,
  card: radius.lg,
  modal: radius.xl,
  badge: radius.full,
  avatar: radius.full,
  chip: radius.full,
  dropdown: radius.md,
  tooltip: radius.sm,
  progress: radius.full,
};
