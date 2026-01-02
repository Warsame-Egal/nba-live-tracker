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
        backdropFilter: 'blur(10px)',
        backgroundColor: 'background.paper',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1.5, sm: 2 },
          minHeight: { xs: 64, sm: 72 },
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
              fontWeight: 700,
              fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.375rem' },
              color: 'text.primary',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                color: 'primary.main',
                transform: 'scale(1.02)',
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
                  color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 1, sm: 1.25 },
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 2,
                  // Show underline for active link
                  ...(isActive(item.path) && {
                    backgroundColor: 'action.selected',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60%',
                      height: 3,
                      backgroundColor: 'primary.main',
                      borderRadius: '3px 3px 0 0',
                    },
                  }),
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    color: 'primary.main',
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
