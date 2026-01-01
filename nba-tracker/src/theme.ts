import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Modern Material UI theme for 2025
 * Follows Material Design 3 principles with improved typography, spacing, and colors
 */

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
      '@media (min-width:600px)': {
        fontSize: '3rem',
      },
      '@media (min-width:900px)': {
        fontSize: '3.5rem',
      },
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.00833em',
      '@media (min-width:600px)': {
        fontSize: '2.5rem',
      },
      '@media (min-width:900px)': {
        fontSize: '3rem',
      },
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.35,
      letterSpacing: '0em',
      '@media (min-width:600px)': {
        fontSize: '2rem',
      },
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '0.00735em',
      '@media (min-width:600px)': {
        fontSize: '1.75rem',
      },
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
      fontWeight: 400,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9375rem',
      letterSpacing: '0.02857em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(155, 155, 155, 0.5)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(155, 155, 155, 0.7)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontWeight: 600,
          fontSize: '0.9375rem',
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
        },
        elevation4: {
          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
              borderWidth: '1.5px',
              transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            '&:hover fieldset': {
              borderWidth: '1.5px',
            },
            '&.Mui-focused fieldset': {
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: '1px solid',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderBottom: '2px solid',
            padding: '16px 12px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'divider',
          padding: '14px 12px',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.8125rem',
          height: 28,
          padding: '0 8px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'background.paper',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.8125rem',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9375rem',
          minHeight: 48,
          padding: '12px 20px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          marginTop: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          padding: '10px 16px',
          minHeight: 40,
          '&:hover': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: '1.5px solid',
          borderColor: 'divider',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'divider',
        },
      },
    },
  },
};

// Dark theme
export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#1E88E5',
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6B35',
      light: '#FF8C61',
      dark: '#E55A2B',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0A0E27',
      paper: '#141B2D',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    error: {
      main: '#EF5350',
      light: '#FF6B6B',
      dark: '#C62828',
    },
    success: {
      main: '#66BB6A',
      light: '#81C784',
      dark: '#388E3C',
    },
    warning: {
      main: '#FFA726',
      light: '#FFB74D',
      dark: '#F57C00',
    },
    info: {
      main: '#42A5F5',
      light: '#64B5F6',
      dark: '#1976D2',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.12)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiCard?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: '#141B2D',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiPaper?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: '#141B2D',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiTextField?.styleOverrides?.root as Record<string, unknown> ?? {}),
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1E88E5',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiDialog?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#141B2D',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiDrawer?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#141B2D',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiTableHead?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          '& .MuiTableCell-head': {
            color: 'rgba(255, 255, 255, 0.7)',
            borderBottomColor: 'rgba(255, 255, 255, 0.12)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiMenu?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#141B2D',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
  },
});

// Light theme
export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976D2',
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6B35',
      light: '#FF8C61',
      dark: '#E55A2B',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    success: {
      main: '#388E3C',
      light: '#66BB6A',
      dark: '#2E7D32',
    },
    warning: {
      main: '#F57C00',
      light: '#FFA726',
      dark: '#E65100',
    },
    info: {
      main: '#1976D2',
      light: '#42A5F5',
      dark: '#1565C0',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiCard?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0, 0, 0, 0.12)',
          '&:hover': {
            borderColor: 'rgba(0, 0, 0, 0.2)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiPaper?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiTextField?.styleOverrides?.root as Record<string, unknown> ?? {}),
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976D2',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiDialog?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiDrawer?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          ...(baseTheme.components?.MuiTableHead?.styleOverrides?.root as Record<string, unknown> ?? {}),
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          '& .MuiTableCell-head': {
            color: 'rgba(0, 0, 0, 0.6)',
            borderBottomColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...(baseTheme.components?.MuiMenu?.styleOverrides?.paper as Record<string, unknown> ?? {}),
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});

// Default export (will be overridden by ThemeContext)
export const theme = darkTheme;
