import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography, IconButton, Tooltip, TextField, InputAdornment, Paper, List, ListItem, ListItemText, CircularProgress, Drawer, Divider, useMediaQuery, useTheme } from '@mui/material';
import { LightMode, DarkMode, Search, Close, Menu } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { SearchResults } from '../types/search';
import { typography, zIndex, borderRadius, transitions } from '../theme/designTokens';

interface NavbarSearchProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchResults: SearchResults;
  showSearchResults: boolean;
  setShowSearchResults: (show: boolean) => void;
  loading: boolean;
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
}

// Top navigation bar with app logo and links
const Navbar = ({ searchProps }: { searchProps?: NavbarSearchProps }) => {
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Scoreboard', path: '/' },
    { label: 'Standings', path: '/standings' },
    { label: 'Players', path: '/players' },
    { label: 'Teams', path: '/teams' },
    { label: 'Predictions', path: '/predictions' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

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

        {/* Navigation links, search, and theme toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0, flex: 1, justifyContent: 'flex-end' }}>
          {/* Desktop Navigation links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: { xs: 0.25, sm: 0.5 } }}>
            {navItems.map(item => (
              <Button
                key={item.path}
                component={RouterLink}
                to={item.path}
                sx={{
                  color: isActive(item.path) ? 'primary.main' : 'text.primary',
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  position: 'relative',
                  transition: transitions.smooth,
                  borderRadius: borderRadius.sm,
                  backgroundColor: 'transparent',
                  minHeight: 40, // Better touch target
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
                    backgroundColor: 'action.hover',
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            onClick={() => setMobileMenuOpen(true)}
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: 'text.primary',
              ml: { xs: 0.5, sm: 1 },
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="open navigation menu"
          >
            <Menu />
          </IconButton>

          {/* Mobile Menu Drawer */}
          <Drawer
            anchor="right"
            open={mobileMenuOpen}
            onClose={handleMobileMenuClose}
            sx={{
              '& .MuiDrawer-paper': {
                width: { xs: 280, sm: 320 },
                pt: 2,
              },
            }}
          >
            <Box sx={{ px: 2, pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: typography.size.h6,
                    color: 'text.primary',
                  }}
                >
                  Menu
                </Typography>
                <IconButton 
                  onClick={handleMobileMenuClose} 
                  size="small"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  <Close />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
            </Box>
            <List sx={{ px: 1 }}>
              {navItems.map(item => (
                <ListItem
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  onClick={handleMobileMenuClose}
                  sx={{
                    borderRadius: borderRadius.sm,
                    mb: 0.5,
                    minHeight: 48, // Better touch target for mobile
                    py: 1.5,
                    backgroundColor: isActive(item.path) ? 'action.selected' : 'transparent',
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
                    fontWeight: isActive(item.path) ? typography.weight.semibold : typography.weight.regular,
                    transition: transitions.smooth,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: typography.size.body,
                      fontWeight: 'inherit',
                    }}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ px: 2, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Theme
                </Typography>
                <IconButton
                  onClick={toggleColorMode}
                  sx={{
                    color: 'text.secondary',
                    minWidth: 44,
                    minHeight: 44,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      color: 'text.primary',
                    },
                  }}
                  aria-label="toggle theme"
                >
                  {mode === 'dark' ? <LightMode /> : <DarkMode />}
                </IconButton>
              </Box>
            </Box>
          </Drawer>

          {/* Search input - only show on scoreboard page */}
          {searchProps && location.pathname === '/' && (
            <Box
              ref={searchProps.searchContainerRef}
              sx={{
                position: 'relative',
                width: { xs: 140, sm: 200, md: 240, lg: 280 },
                minWidth: { xs: 120, sm: 180 },
                ml: { xs: 0.5, sm: 1 },
                flexShrink: 0,
              }}
            >
              <TextField
                fullWidth
                value={searchProps.searchInput}
                onChange={e => searchProps.setSearchInput(e.target.value)}
                placeholder={isMobile ? "Search" : "Search..."}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary', fontSize: { xs: 16, sm: 18 } }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchProps.searchInput && (
                    <InputAdornment position="end">
                      {searchProps.loading ? (
                        <CircularProgress size={16} />
                      ) : (
                        <IconButton
                          onClick={() => searchProps.setSearchInput('')}
                          size="small"
                          sx={{ color: 'text.secondary', p: 0.5 }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                    height: { xs: 36, sm: 40 },
                  },
                }}
              />
              {/* Search results dropdown */}
              {searchProps.showSearchResults && (searchProps.searchResults.players.length > 0 || searchProps.searchResults.teams.length > 0) && (
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    maxHeight: 400,
                    overflow: 'auto',
                    zIndex: zIndex.dropdown,
                    backgroundColor: 'background.paper',
                    borderRadius: borderRadius.md,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <List dense>
                    {/* Players section */}
                    {searchProps.searchResults.players.length > 0 && (
                      <>
                        <ListItem>
                          <ListItemText
                            primary="Players"
                            primaryTypographyProps={{
                              variant: 'caption',
                              sx: { fontWeight: typography.weight.bold, textTransform: 'uppercase', color: 'text.secondary' },
                            }}
                          />
                        </ListItem>
                        {searchProps.searchResults.players.map(player => (
                          <ListItem
                            key={player.id}
                            button
                            component={RouterLink}
                            to={`/player/${player.id}`}
                            onClick={() => searchProps.setShowSearchResults(false)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <ListItemText
                              primary={player.name}
                              secondary={player.team_abbreviation}
                            />
                          </ListItem>
                        ))}
                      </>
                    )}
                    {/* Teams section */}
                    {searchProps.searchResults.teams.length > 0 && (
                      <>
                        {searchProps.searchResults.players.length > 0 && <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5 }} />}
                        <ListItem>
                          <ListItemText
                            primary="Teams"
                            primaryTypographyProps={{
                              variant: 'caption',
                              sx: { fontWeight: typography.weight.bold, textTransform: 'uppercase', color: 'text.secondary' },
                            }}
                          />
                        </ListItem>
                        {searchProps.searchResults.teams.map(team => (
                          <ListItem
                            key={team.id}
                            button
                            component={RouterLink}
                            to={`/team/${team.id}`}
                            onClick={() => searchProps.setShowSearchResults(false)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <ListItemText
                              primary={team.name}
                              secondary={team.abbreviation}
                            />
                          </ListItem>
                        ))}
                      </>
                    )}
                  </List>
                </Paper>
              )}
            </Box>
          )}

          {/* Theme toggle button - Hidden on mobile (shown in drawer) */}
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              onClick={toggleColorMode}
              sx={{
                display: { xs: 'none', md: 'flex' },
                color: 'text.secondary',
                ml: { xs: 0.5, sm: 1 },
                minWidth: 40,
                minHeight: 40,
                transition: transitions.smooth,
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary',
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
