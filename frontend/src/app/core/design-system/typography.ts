/**
 * BlockTask Design System - Typography
 * Inspired by Linear (clean, readable) + Stripe (professional)
 */

export const typography = {
  // Font families
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'JetBrains Mono, "Fira Code", Consolas, Monaco, monospace',
    display: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Font sizes - Linear inspired scale
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Text styles - Stripe inspired
  textStyle: {
    // Display
    display: {
      fontSize: '3.75rem',
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    },
    'display-sm': {
      fontSize: '3rem',
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    },

    // Headings
    heading: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    'heading-lg': {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    'heading-md': {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    'heading-sm': {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    'heading-xs': {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },

    // Body
    body: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    'body-lg': {
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    'body-sm': {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    'body-xs': {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },

    // Labels
    label: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    'label-sm': {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },

    // Buttons
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    'button-sm': {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    'button-lg': {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },

    // Code
    code: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: 'JetBrains Mono, "Fira Code", Consolas, monospace',
    },
    'code-sm': {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      fontFamily: 'JetBrains Mono, "Fira Code", Consolas, monospace',
    },

    // Captions
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0.025em',
      textTransform: 'uppercase',
    },
  },
};

export type TextStyle = keyof typeof typography.textStyle;
