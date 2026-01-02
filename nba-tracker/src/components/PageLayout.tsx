import { Box, Paper } from '@mui/material';
import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

/**
 * Material Design 3 dialog-first layout.
 * All content lives inside elevated Material surfaces.
 * Main content is centered, sidebar is inset from right edge.
 * Both surfaces scroll independently.
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children, sidebar }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Main content area - centered with gap from edges */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          gap: 3, // Material 3: 24dp spacing between surfaces
          px: { xs: 2, sm: 3, md: 4 }, // Material 3: 16dp, 24dp, 32dp from edges
          py: { xs: 3, sm: 4, md: 5 }, // Material 3: 24dp, 32dp, 40dp from edges
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Primary content surface - Material 3 elevation 1 */}
        <Paper
          elevation={1}
          sx={{
            flex: 1,
            maxWidth: { xs: '100%', md: sidebar ? 'calc(100% - 360px)' : '1400px' },
            minWidth: 0,
            borderRadius: 1.5, // Material 3: 12dp (medium)
            backgroundColor: 'background.paper', // Material 3: surface
            border: '1px solid',
            borderColor: 'divider', // Material 3: outline
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: { xs: 'auto', md: 'calc(100vh - 160px)' },
            maxHeight: { xs: 'none', md: 'calc(100vh - 160px)' },
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              px: { xs: 3, sm: 4 }, // Material 3: 24dp, 32dp internal padding
              py: { xs: 3, sm: 4 }, // Material 3: 24dp, 32dp internal padding
              minHeight: 0,
            }}
          >
            {children}
          </Box>
        </Paper>

        {/* Secondary sidebar surface - Material 3 elevation 1, inset from right */}
        {sidebar && (
          <Paper
            elevation={1}
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              borderRadius: 1.5, // Material 3: 12dp (medium)
              backgroundColor: 'background.paper', // Material 3: surface
              border: '1px solid',
              borderColor: 'divider', // Material 3: outline
              overflow: 'hidden',
              height: 'calc(100vh - 160px)',
              maxHeight: 'calc(100vh - 160px)',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                minHeight: 0,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  },
                },
                '@media (prefers-color-scheme: dark)': {
                  scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    },
                  },
                },
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {sidebar}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default PageLayout;
