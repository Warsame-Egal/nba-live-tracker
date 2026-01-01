import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

/**
 * Navigation bar component that appears at the top of every page.
 * Shows the app logo and navigation links.
 */
const Navbar = () => {
  // Get current page location to highlight active link
  const location = useLocation();
  // Get theme mode and toggle function
  const { mode, toggleColorMode } = useThemeMode();

  // Navigation items to display
  const navItems = [
    { label: 'Scoreboard', path: '/' },
    { label: 'Standings', path: '/standings' },
    { label: 'Players', path: '/players' },
  ];

  /**
   * Check if a navigation item is currently active (on that page).
   */
  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1, sm: 1.5 },
          minHeight: { xs: 64, sm: 72 },
          gap: 2,
        }}
      >
        {/* App title */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.375rem' },
              color: 'text.primary',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'color 0.2s ease-in-out',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            NBA Live Tracker
          </Typography>
        </Box>

        {/* Navigation links and theme toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
          {/* Navigation links */}
          <Box sx={{ display: 'flex', gap: { xs: 0.25, sm: 0.5 } }}>
            {navItems.map(item => (
              <Button
                key={item.path}
                component={RouterLink}
                to={item.path}
                sx={{
                  color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                  fontWeight: isActive(item.path) ? 700 : 500,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 0.75, sm: 1 },
                  position: 'relative',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: 1,
                  // Show underline for active link
                  ...(isActive(item.path) && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60%',
                      height: 2,
                      backgroundColor: 'primary.main',
                      borderRadius: '2px 2px 0 0',
                    },
                  }),
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Theme toggle button */}
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              onClick={toggleColorMode}
              sx={{
                color: 'text.secondary',
                ml: { xs: 0.5, sm: 1 },
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'primary.main',
                  transform: 'rotate(15deg) scale(1.1)',
                },
              }}
              aria-label="toggle theme"
            >
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
