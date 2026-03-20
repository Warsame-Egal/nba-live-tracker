/**
 * Mobile-only bottom tab bar (File 4.1). Four tabs: Scores, Stats, Predict, More.
 * More opens a bottom sheet with Standings, Teams, Compare, theme toggle.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import {
  SportsBasketball,
  BarChart,
  AutoAwesome,
  Menu,
  EmojiEvents,
  Groups,
  CompareArrows,
  SmartToy,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLiveCount } from '../contexts/LiveCountContext';
import { LIVE_DOT_STYLE } from '../utils/gameVisuals';

const tabs = [
  { label: 'Scores', icon: <SportsBasketball />, path: '/' },
  { label: 'Stats', icon: <BarChart />, path: '/players' },
  { label: 'Predict', icon: <AutoAwesome />, path: '/predictions' },
  { label: 'More', icon: <Menu />, path: null },
];

const moreItems = [
  { label: 'Standings', path: '/standings', icon: <EmojiEvents /> },
  { label: 'Teams', path: '/teams', icon: <Groups /> },
  { label: 'Compare', path: '/compare', icon: <CompareArrows /> },
  { label: 'Agent', path: '/agent', icon: <SmartToy /> },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeMode();
  const { liveCount } = useLiveCount();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathToValue = useCallback(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/game/')) return 0;
    if (location.pathname.startsWith('/players')) return 1;
    if (location.pathname.startsWith('/predictions')) return 2;
    return 0;
  }, [location.pathname]);
  const [value, setValue] = useState(pathToValue());
  useEffect(() => {
    setValue(pathToValue());
  }, [pathToValue]);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    const tab = tabs[newValue];
    if (tab.path) {
      navigate(tab.path);
    } else {
      setDrawerOpen(true);
    }
  };

  const handleMoreItem = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          height: 56,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(20px)',
        }}
        elevation={4}
      >
        <BottomNavigation value={value} onChange={handleChange} showLabels sx={{ height: 56 }}>
          {tabs.map((tab, idx) => (
            <BottomNavigationAction
              key={tab.label}
              label={tab.label}
              icon={
                idx === 0 && liveCount > 0 ? (
                  <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    {tab.icon}
                    <Box sx={{ position: 'absolute', top: -3, right: -6, ...LIVE_DOT_STYLE }} />
                  </Box>
                ) : (
                  tab.icon
                )
              }
              sx={{
                minWidth: 0,
                px: 0.5,
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.7rem',
                },
                '&.Mui-selected': { color: 'primary.main' },
                color: '#555555',
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            maxHeight: '70vh',
            backgroundColor: '#111111',
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
            Explore
          </Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1 }}>
          {moreItems.map(item => (
            <ListItem
              key={item.path}
              button
              onClick={() => handleMoreItem(item.path)}
              sx={{ borderRadius: 1, minHeight: 44 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Theme
          </Typography>
          <IconButton onClick={toggleColorMode} aria-label="toggle theme" size="medium">
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Box>
      </SwipeableDrawer>
    </>
  );
}
