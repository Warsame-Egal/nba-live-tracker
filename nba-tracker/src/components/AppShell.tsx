/**
 * App shell (File 4.1): Navbar, main content area, BottomNav on mobile.
 * Search overlay is available on every page via navbar search icon.
 */
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import SearchOverlay from './SearchOverlay';
import { SearchOverlayProvider } from '../contexts/SearchOverlayContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <SearchOverlayProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <Navbar />
        <Box
          component="main"
          sx={{
            flex: 1,
            pb: isMobile ? '56px' : 0,
            overflowX: 'hidden',
          }}
        >
          {children}
        </Box>
        {isMobile && <BottomNav />}
      </Box>
      <SearchOverlay />
    </SearchOverlayProvider>
  );
}
