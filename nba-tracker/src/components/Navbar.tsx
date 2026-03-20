/**
 * Simplified navbar (File 4.1): Scores, Predictions, Explore dropdown.
 * Search icon opens full-screen SearchOverlay. Mobile nav is BottomNav.
 */
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import { LightMode, DarkMode, Search, ExpandMore } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { useSearchOverlay } from '../contexts/SearchOverlayContext';
import { typography, transitions } from '../theme/designTokens';

const mainNav = [
  { label: 'Scores', path: '/' },
  { label: 'Predictions', path: '/predictions' },
  { label: 'Agent', path: '/agent' },
];

const exploreItems = [
  { label: 'Standings', path: '/standings' },
  { label: 'Teams', path: '/teams' },
  { label: 'Players', path: '/players' },
  { label: 'Compare', path: '/compare' },
];

export default function Navbar() {
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();
  const { openSearch } = useSearchOverlay();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: { xs: 56, md: 64 },
          height: { xs: 56, md: 64 },
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: typography.editorial.pageTitle.xs,
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
            transition: transitions.smooth,
          }}
        >
          CourtIQ
        </Typography>

        {/* Desktop: Scores, Predictions, Explore */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
          {mainNav.map(item => (
            <Button
              key={item.path}
              component={RouterLink}
              to={item.path}
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                fontWeight: isActive(item.path)
                  ? typography.weight.semibold
                  : typography.weight.medium,
                fontSize: typography.editorial.helper.xs,
                px: 2,
                py: 1,
                borderRadius: 0,
                borderBottom: '2px solid',
                borderBottomColor: isActive(item.path) ? 'primary.main' : 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  borderBottomColor: 'primary.main',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          <Button
            onClick={e => setAnchorEl(e.currentTarget)}
            endIcon={<ExpandMore />}
            sx={{
              color:
                location.pathname.startsWith('/standings') ||
                location.pathname.startsWith('/teams') ||
                location.pathname.startsWith('/players') ||
                location.pathname.startsWith('/compare')
                  ? 'primary.main'
                  : 'text.secondary',
              fontWeight: typography.weight.medium,
              fontSize: typography.editorial.helper.xs,
              px: 2,
              py: 1,
              borderBottom: '2px solid',
              borderBottomColor: 'transparent',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
              },
            }}
          >
            Explore
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            {exploreItems.map(item => (
              <MenuItem
                key={item.path}
                component={RouterLink}
                to={item.path}
                onClick={() => setAnchorEl(null)}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Search icon + theme toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Search players and teams">
            <IconButton
              onClick={openSearch}
              aria-label="open search"
              size="medium"
              sx={{ color: 'text.primary' }}
            >
              <Search />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton
              onClick={toggleColorMode}
              aria-label="toggle theme"
              size="medium"
              sx={{
                display: { xs: 'none', md: 'flex' },
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
