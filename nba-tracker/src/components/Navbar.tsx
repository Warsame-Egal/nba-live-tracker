import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

// Top navigation bar with app logo and links
const Navbar = () => {
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();

  const navItems = [
    { label: 'Scoreboard', path: '/' },
    { label: 'Standings', path: '/standings' },
    { label: 'Players', path: '/players' },
    { label: 'Teams', path: '/teams' },
    { label: 'Predictions', path: '/predictions' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        backgroundColor: 'background.paper', // Material 3: surface color (light in light mode, dark in dark mode)
        borderBottom: '1px solid',
        borderColor: 'divider', // Material 3: outline color
        borderRadius: 0, // Flat, straight - no rounded corners
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1, sm: 1.25 }, // Compact height
          minHeight: { xs: 56, sm: 64 }, // Smaller, consistent height
          gap: 2,
          maxWidth: '100%',
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
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              color: 'text.primary', // Neutral dark in light mode, neutral light in dark mode
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                color: 'primary.main', // Blue only on hover (primary action)
              },
            }}
          >
            NBA Live
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
                  color: isActive(item.path) ? 'primary.main' : 'text.primary', // Blue only for active, neutral for default
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 0.75, // Material 3: 6dp - minimal rounding
                  backgroundColor: 'transparent', // No background highlight
                  // Show underline for active link only
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
                      borderRadius: 0,
                    },
                  }),
                  '&:hover': {
                    backgroundColor: 'transparent', // No hover background
                    color: isActive(item.path) ? 'primary.main' : 'text.primary', // Don't change to blue on hover unless active
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
                color: 'text.secondary', // Muted neutral tone
                ml: { xs: 0.5, sm: 1 },
                transition: 'background-color 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary', // Neutral, not blue
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
