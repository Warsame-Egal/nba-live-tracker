import React from 'react';
import { Box, Typography } from '@mui/material';
import { typography, responsiveSpacing } from '../theme/designTokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Reusable page header component with consistent typography and spacing.
 * Provides large, confident title with optional subtitle and action button.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <Box
      sx={{
        mb: responsiveSpacing.section,
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h1"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: 'clamp(1.25rem, 4vw, 1.5rem)', sm: 'clamp(1.25rem, 4vw, 1.5rem)' },
            color: 'text.primary',
            letterSpacing: typography.letterSpacing.tight,
            lineHeight: typography.lineHeight.tight,
            mb: subtitle ? 0.5 : 0,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.editorial.helper.xs,
              color: 'text.secondary',
              fontWeight: typography.weight.regular,
              letterSpacing: typography.letterSpacing.normal,
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ flexShrink: 0 }}>
          {action}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;

