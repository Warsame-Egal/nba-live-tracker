/**
 * Design Tokens
 * 
 * This file defines consistent spacing, typography, colors, and other design tokens
 * that should be used across all components to maintain a cohesive look and feel.
 * 
 * Usage:
 *   import { spacing, typography, colors } from '../theme/designTokens';
 */

/**
 * Spacing scale (based on 8px grid)
 * Use these values for padding, margins, and gaps
 */
export const spacing = {
  xs: 0.5,   // 4px
  sm: 1,     // 8px
  md: 2,     // 16px
  lg: 3,     // 24px
  xl: 4,     // 32px
  xxl: 5,    // 40px
  xxxl: 6,   // 48px
} as const;

/**
 * Responsive spacing patterns
 * Use these for consistent responsive spacing across components
 */
export const responsiveSpacing = {
  // Container padding
  container: { xs: 2, sm: 3, md: 4 },
  containerVertical: { xs: 4, sm: 5, md: 6 },
  
  // Section spacing
  section: { xs: 4, sm: 5 },
  sectionLarge: { xs: 5, sm: 6, md: 8 },
  
  // Component padding
  card: { xs: 2.5, sm: 3 },
  cardCompact: { xs: 2, sm: 2.5 },
  cardLarge: { xs: 3, sm: 3.5, md: 4 },
  
  // Element spacing
  element: { xs: 2, sm: 2.5 },
  elementCompact: { xs: 1.5, sm: 2 },
  elementLarge: { xs: 3, sm: 4 },
} as const;

/**
 * Typography scale
 * Use these for consistent font sizes and weights
 */
export const typography = {
  // Font weights
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Font sizes (responsive)
  size: {
    // Headings
    h1: { xs: '2rem', sm: '2.5rem', md: '3rem' },
    h2: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
    h3: { xs: '1.5rem', sm: '1.875rem', md: '2rem' },
    h4: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
    h5: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
    h6: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
    
    // Body text
    body: { xs: '0.875rem', sm: '1rem' },
    bodySmall: { xs: '0.8125rem', sm: '0.875rem' },
    bodyLarge: { xs: '1rem', sm: '1.125rem' },
    
    // UI elements
    button: { xs: '0.875rem', sm: '0.9375rem' },
    caption: { xs: '0.7rem', sm: '0.75rem' },
    captionSmall: { xs: '0.65rem', sm: '0.7rem' },
    label: { xs: '0.75rem', sm: '0.8125rem' },
  },
  
  // Line heights
  lineHeight: {
    tight: 1.1,
    normal: 1.2,
    relaxed: 1.4,
    loose: 1.6,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '-0.01em',
    wide: '0.01em',
    wider: '0.02em',
    widest: '0.08em',
  },
} as const;

/**
 * Border radius scale
 * Use these for consistent rounded corners
 */
export const borderRadius = {
  none: 0,
  xs: 1,      // 4px - small badges, chips
  sm: 2,      // 8px - cards, containers (most common)
  md: 3,      // 12px - larger cards
  lg: 4,      // 16px - modals, drawers
  full: '50%', // circular
} as const;

/**
 * Shadow definitions
 * Use these for consistent elevation
 */
export const shadows = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  md: '0 4px 12px rgba(0, 0, 0, 0.15)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.25)',
  
  // Dark mode shadows
  dark: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.6)',
  },
  
  // Colored shadows (for primary actions)
  primary: {
    sm: '0 2px 8px rgba(30, 136, 229, 0.2)',
    md: '0 4px 12px rgba(30, 136, 229, 0.3)',
    lg: '0 8px 24px rgba(30, 136, 229, 0.4)',
  },
  
  // Error/live game shadows
  error: {
    sm: '0 2px 8px rgba(239, 83, 80, 0.2)',
    md: '0 4px 12px rgba(239, 83, 80, 0.3)',
    lg: '0 8px 24px rgba(239, 83, 80, 0.4)',
  },
} as const;

/**
 * Transition timings
 * Use these for consistent animations
 */
export const transitions = {
  fast: '0.15s ease-in-out',
  normal: '0.2s ease-in-out',
  slow: '0.3s ease-in-out',
  smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Z-index scale
 * Use these for consistent layering
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

/**
 * Common component styles
 * Pre-defined style objects for common patterns
 */
export const componentStyles = {
  // Card styles
  card: {
    borderRadius: borderRadius.sm,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    transition: transitions.normal,
  },
  
  cardHover: {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: shadows.md,
      borderColor: 'primary.main',
    },
  },
  
  // Button styles
  button: {
    borderRadius: borderRadius.sm,
    textTransform: 'none' as const,
    fontWeight: typography.weight.semibold,
    transition: transitions.normal,
  },
  
  // Input styles
  input: {
    borderRadius: borderRadius.sm,
    '& .MuiOutlinedInput-root': {
      borderRadius: borderRadius.sm,
    },
  },
  
  // Chip styles
  chip: {
    borderRadius: borderRadius.xs,
    fontWeight: typography.weight.semibold,
    height: 24,
  },
  
  // Empty state container
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    py: responsiveSpacing.sectionLarge,
    px: spacing.md,
    minHeight: '40vh',
  },
} as const;

/**
 * Helper function to get responsive value
 * Usage: getResponsive({ xs: 2, sm: 3, md: 4 })
 */
export const getResponsive = <T,>(values: { xs: T; sm?: T; md?: T; lg?: T }) => values;
