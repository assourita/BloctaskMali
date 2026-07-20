/**
 * BlockTask Design System - Shadows
 * Inspired by Linear (subtle, layered) + Stripe (depth)
 */

export const shadows = {
  // Elevation levels
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Colored shadows - Garden Grid inspired
  primary: {
    sm: '0 1px 3px 0 rgba(34, 197, 94, 0.1)',
    base: '0 4px 6px -1px rgba(34, 197, 94, 0.15)',
    md: '0 10px 15px -3px rgba(34, 197, 94, 0.2)',
    lg: '0 20px 25px -5px rgba(34, 197, 94, 0.25)',
  },

  secondary: {
    sm: '0 1px 3px 0 rgba(168, 85, 247, 0.1)',
    base: '0 4px 6px -1px rgba(168, 85, 247, 0.15)',
    md: '0 10px 15px -3px rgba(168, 85, 247, 0.2)',
    lg: '0 20px 25px -5px rgba(168, 85, 247, 0.25)',
  },

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Glow effects - Linear inspired
  glow: {
    primary: '0 0 20px rgba(34, 197, 94, 0.3)',
    secondary: '0 0 20px rgba(168, 85, 247, 0.3)',
    info: '0 0 20px rgba(59, 130, 246, 0.3)',
    success: '0 0 20px rgba(34, 197, 94, 0.3)',
    warning: '0 0 20px rgba(245, 158, 11, 0.3)',
    error: '0 0 20px rgba(239, 68, 68, 0.3)',
  },
};
