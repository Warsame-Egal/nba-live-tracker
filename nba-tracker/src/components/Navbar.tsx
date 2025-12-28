import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { SportsBasketball } from '@mui/icons-material';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Scoreboard', path: '/' },
    { label: 'Standings', path: '/standings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          minHeight: { xs: 64, sm: 72 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SportsBasketball sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              color: 'text.primary',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            NBA Live
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {navItems.map(item => (
            <Button
              key={item.path}
              component={RouterLink}
              to={item.path}
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                fontWeight: isActive(item.path) ? 700 : 500,
                fontSize: '0.9375rem',
                px: 2.5,
                py: 1,
                position: 'relative',
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
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: isActive(item.path) ? 'primary.main' : 'text.primary',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
