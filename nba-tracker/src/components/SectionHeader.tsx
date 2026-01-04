import React from 'react';
import { Box, Typography } from '@mui/material';
import { typography, responsiveSpacing } from '../theme/designTokens';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Standardized section header component for consistent typography and spacing.
 * Provides medium-sized section title with optional description and action.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, action }) => {
  return (
    <Box
      sx={{
        mb: responsiveSpacing.element,
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: typography.editorial.sectionTitle.xs,
            color: 'text.primary',
            letterSpacing: typography.letterSpacing.normal,
            lineHeight: typography.lineHeight.normal,
            mb: description ? 0.5 : 0,
          }}
        >
          {title}
        </Typography>
        {description && (
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
            {description}
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

export default SectionHeader;

