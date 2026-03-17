import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: string | number;
  sx?: SxProps<Theme>;
}

/**
 * Standardized page wrapper: max-width, responsive padding, centered.
 * Use on every page for consistent layout (File 4.7).
 */
export default function PageContainer({ children, maxWidth = 1200, sx }: PageContainerProps) {
  return (
    <Box
      sx={{
        maxWidth: typeof maxWidth === 'number' ? maxWidth : maxWidth,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
