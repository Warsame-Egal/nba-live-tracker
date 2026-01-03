import { Box, Typography, Avatar, LinearProgress, alpha, useTheme, Skeleton, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';
import { typography, borderRadius, transitions } from '../theme/designTokens';

interface PredictionsSummaryProps {
  predictions: GamePrediction[];
  loading: boolean;
  error: string | null;
}

/**
 * Compact predictions summary component.
 * Shows key metrics (win probability, projected score) for upcoming games.
 */
const PredictionsSummary: React.FC<PredictionsSummaryProps> = ({ predictions, loading, error }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Always reserve space to prevent layout shifts
  const minHeight = loading || error || predictions.length === 0 ? 180 : undefined;

  return (
    <Box
      sx={{
        mb: 0,
        p: { xs: 1.5, sm: 2 },
        pb: { xs: 1, sm: 1.5 },
        backgroundColor: 'background.paper',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        minHeight: minHeight,
        transition: 'min-height 0.3s ease',
        visibility: loading || error || predictions.length === 0 ? 'visible' : 'visible',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          Predictions & Insights
        </Typography>
      </Box>
      <Divider sx={{ mb: 2.5 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ minWidth: 200, maxWidth: 240 }}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: borderRadius.sm }} />
            </Box>
          ))}
        </Box>
      ) : error ? (
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="error" sx={{ fontSize: typography.size.caption }}>
            {error}
          </Typography>
        </Box>
      ) : predictions.length === 0 ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: typography.size.caption }}>
            No predictions available for this date.
          </Typography>
        </Box>
      ) : (
        <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          overflowY: 'hidden',
          pb: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
          '&::-webkit-scrollbar': {
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
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
        }}
      >
        {predictions.map((prediction) => {
          const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
          const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
          const homeLogo = getTeamLogo(prediction.home_team_name);
          const awayLogo = getTeamLogo(prediction.away_team_name);
          const homeWinProb = prediction.home_win_probability * 100;
          const awayWinProb = prediction.away_win_probability * 100;
          const favoredTeam = homeWinProb > awayWinProb ? 'home' : 'away';
          const favoredProb = favoredTeam === 'home' ? homeWinProb : awayWinProb;

          return (
            <Box
              key={prediction.game_id}
              onClick={() => navigate(`/predictions?date=${prediction.game_date}`)}
              sx={{
                minWidth: { xs: 180, sm: 200 },
                maxWidth: { xs: 200, sm: 240 },
                width: { xs: 180, sm: 'auto' },
                p: { xs: 1.25, sm: 1.5 },
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: borderRadius.sm,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                cursor: 'pointer',
                transition: transitions.smooth,
                flexShrink: 0,
                '&:active': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  transform: 'scale(0.98)',
                },
                '@media (hover: hover)': {
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    transform: 'translateY(-2px)',
                  },
                },
              }}
            >
              {/* Team matchup */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Avatar
                  src={awayLogo}
                  sx={{
                    width: 28,
                    height: 28,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.caption,
                    color: 'text.primary',
                    flex: 1,
                  }}
                >
                  {awayAbbr} @ {homeAbbr}
                </Typography>
                <Avatar
                  src={homeLogo}
                  sx={{
                    width: 28,
                    height: 28,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              </Box>

              {/* Win probability */}
              <Box sx={{ mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
                    color: 'text.secondary',
                    mb: 0.5,
                    display: 'block',
                  }}
                >
                  Win Prob
                </Typography>
                {/* Win probability progress bar - shows the favored team's win probability */}
                <LinearProgress
                  variant="determinate"
                  value={favoredProb}
                  sx={{
                    height: 4,
                    borderRadius: borderRadius.xs,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    mb: 0.5,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        favoredProb >= 70
                          ? theme.palette.success.main
                          : favoredProb >= 50
                          ? theme.palette.primary.main
                          : theme.palette.warning.main,
                      borderRadius: borderRadius.xs,
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                    color: theme.palette.primary.main,
                  }}
                >
                  {favoredTeam === 'home' ? homeAbbr : awayAbbr} {favoredProb.toFixed(0)}%
                </Typography>
              </Box>

              {/* Projected score */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
                    color: 'text.secondary',
                    mb: 0.25,
                  }}
                >
                  Projected Score
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                    color: 'text.primary',
                  }}
                >
                  {awayAbbr} {prediction.predicted_away_score} - {prediction.predicted_home_score} {homeAbbr}
                </Typography>
              </Box>
            </Box>
          );
        })}
        </Box>
      )}
    </Box>
  );
};

export default PredictionsSummary;

