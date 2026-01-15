import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { GamePrediction } from '../../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../../utils/teamMappings';
import { typography, borderRadius } from '../../theme/designTokens';

interface PredictionHeaderProps {
  prediction: GamePrediction;
}

/**
 * Header zone for prediction card - displays game context:
 * Team logos, matchup format, and confidence badge
 */
const PredictionHeader: React.FC<PredictionHeaderProps> = ({ prediction }) => {
  const theme = useTheme();
  
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = getTeamLogo(prediction.home_team_name);
  const awayLogo = getTeamLogo(prediction.away_team_name);
  
  const matchup = `${awayAbbr} @ ${homeAbbr}`;
  
  // Confidence badge styling
  const getConfidenceColor = () => {
    if (!prediction.confidence_tier) return null;
    switch (prediction.confidence_tier.toLowerCase()) {
      case 'high':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.error.main;
      default:
        return null;
    }
  };
  
  const confidenceColor = getConfidenceColor();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2.5,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Team logos and matchup */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: 1, minWidth: 0 }}>
        <Avatar
          src={awayLogo}
          alt={awayAbbr}
          sx={{
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
            aspectRatio: '1/1',
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/logos/default.svg';
          }}
        />
        <Typography
          variant="body1"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
            color: 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {matchup}
        </Typography>
        <Avatar
          src={homeLogo}
          alt={homeAbbr}
          sx={{
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
            aspectRatio: '1/1',
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/logos/default.svg';
          }}
        />
      </Box>
      
      {/* Confidence badge */}
      {prediction.confidence_tier && confidenceColor && (
        <Chip
          label={prediction.confidence_tier.charAt(0).toUpperCase() + prediction.confidence_tier.slice(1).toLowerCase()}
          size="small"
          sx={{
            height: { xs: 22, sm: 24 },
            fontSize: { xs: '0.625rem', sm: '0.6875rem' },
            fontWeight: typography.weight.semibold,
            letterSpacing: '0.5px',
            backgroundColor: alpha(confidenceColor, 0.15),
            color: confidenceColor,
            border: `1px solid ${alpha(confidenceColor, 0.3)}`,
            borderRadius: borderRadius.sm,
            flexShrink: 0,
            ml: 1.5,
          }}
        />
      )}
    </Box>
  );
};

export default PredictionHeader;

