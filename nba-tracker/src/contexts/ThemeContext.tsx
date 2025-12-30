import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';
import { shadows, transitions, typography } from '../theme/designTokens';

interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to use the theme context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeContextProvider');
  }
  return context;
};

/**
 * Get the initial theme mode from localStorage or system preference.
 */
const getInitialMode = (): PaletteMode => {
  // Check localStorage first
  const savedMode = localStorage.getItem('themeMode') as PaletteMode | null;
  if (savedMode === 'light' || savedMode === 'dark') {
    return savedMode;
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

/**
 * Create theme based on mode (dark or light).
 */
const createAppTheme = (mode: PaletteMode): Theme => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1E88E5', // Premium blue
        light: '#42A5F5',
        dark: '#1565C0',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FF6B35', // Accent orange
        light: '#FF8C61',
        dark: '#E55A2B',
      },
      background: {
        default: isDark ? '#0A0A0A' : '#F5F5F5',
        paper: isDark ? '#141414' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#1A1A1A',
        secondary: isDark ? '#A0A0A0' : '#666666',
        disabled: isDark ? '#666666' : '#999999',
      },
      error: {
        main: '#EF5350', // Red for live games
      },
      success: {
        main: '#66BB6A', // Green for wins
      },
      warning: {
        main: '#FFA726',
      },
      info: {
        main: '#42A5F5',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: '3rem',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2.25rem',
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 700,
        fontSize: '1.875rem',
        lineHeight: 1.3,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        fontWeight: 400,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        fontWeight: 400,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 8, // 8px - matches borderRadius.sm (2 * 4px spacing unit)
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8, // 8px - matches borderRadius.sm
            padding: '10px 20px',
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.button.sm,
            textTransform: 'none',
            transition: transitions.normal,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: shadows.primary.md,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8, // 8px - standardized to match components (borderRadius.sm)
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            border: '1px solid',
            borderColor: 'divider',
            transition: transitions.normal,
            '&:hover': {
              borderColor: 'primary.main',
              transform: 'translateY(-2px)',
              boxShadow: isDark ? shadows.dark.lg : shadows.lg,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8, // 8px - standardized (borderRadius.sm)
              backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
              transition: transitions.normal,
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.light',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: '2px',
              },
            },
            '& .MuiInputBase-input': {
              color: isDark ? '#FFFFFF' : '#1A1A1A',
            },
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
            backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
            '& .MuiTableCell-head': {
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              color: isDark ? '#A0A0A0' : '#666666',
              borderBottom: isDark ? '2px solid rgba(255, 255, 255, 0.12)' : '2px solid rgba(0, 0, 0, 0.12)',
              padding: '16px 12px',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
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
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            padding: '14px 12px',
            fontSize: '0.9375rem',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4, // 4px - matches borderRadius.xs
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.caption.sm,
            height: 24,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: 'none',
          },
        },
      },
    },
  });
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

/**
 * Theme context provider that manages dark/light mode.
 */
export const ThemeContextProvider = ({ children }: ThemeContextProviderProps) => {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode());

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Only update if user hasn't manually set a preference
    const handleChange = (e: MediaQueryListEvent) => {
      const savedMode = localStorage.getItem('themeMode');
      if (!savedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle between dark and light mode
  const toggleColorMode = () => {
    setMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = createAppTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

