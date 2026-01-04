import { Box, Typography, Avatar, LinearProgress, alpha, useTheme, Skeleton, IconButton, Paper, Drawer, Chip, CircularProgress } from '@mui/material';
import { Close, Insights } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';
import { typography, borderRadius, transitions, shadows } from '../theme/designTokens';

interface PredictionsSidebarProps {
  open: boolean;
  onClose: () => void;
  predictions: GamePrediction[];
  loading: boolean;
  error: string | null;
  isUpdating?: boolean; // Optional: shows subtle updating indicator when true
}

interface PredictionCardProps {
  prediction: GamePrediction;
  onClick: () => void;
}

/**
 * Individual prediction card component for the sidebar list.
 */
const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onClick }) => {
  const theme = useTheme();
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = getTeamLogo(prediction.home_team_name);
  const awayLogo = getTeamLogo(prediction.away_team_name);
  const homeWinProb = prediction.home_win_probability * 100;
  const awayWinProb = prediction.away_win_probability * 100;
  const favoredTeam = homeWinProb > awayWinProb ? 'home' : 'away';
  const favoredProb = favoredTeam === 'home' ? homeWinProb : awayWinProb;

  return (
    <Paper
      elevation={1}
      onClick={onClick}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: borderRadius.md, // Material 3: 12px
        cursor: 'pointer',
        transition: transitions.smooth,
        mb: { xs: 1.5, sm: 2 },
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.sm : shadows.sm,
        '&:hover': {
          elevation: 2,
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
          transform: 'translateY(-2px)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
      }}
    >
      {/* Team Matchup */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={awayLogo}
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          />
          <Typography
            variant="body1"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.primary',
            }}
          >
            {awayAbbr}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.bodySmall,
            color: 'text.secondary',
            px: 1,
          }}
        >
          @
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.primary',
            }}
          >
            {homeAbbr}
          </Typography>
          <Avatar
            src={homeLogo}
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          />
        </Box>
      </Box>

      {/* Win Probability */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: typography.size.caption,
              color: 'text.secondary',
              fontWeight: typography.weight.medium,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wider,
            }}
          >
            Win Probability
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: typography.size.bodySmall,
              color: 'primary.main',
            }}
          >
            {favoredTeam === 'home' ? homeAbbr : awayAbbr} {favoredProb.toFixed(0)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={favoredProb}
          sx={{
            height: 6,
            borderRadius: borderRadius.full,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              backgroundColor:
                favoredProb >= 70
                  ? theme.palette.success.main
                  : favoredProb >= 50
                  ? theme.palette.primary.main
                  : theme.palette.warning.main,
              borderRadius: borderRadius.full,
            },
          }}
        />
      </Box>

      {/* Projected Score */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: typography.size.caption,
            color: 'text.secondary',
            fontWeight: typography.weight.medium,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wider,
            mb: 0.5,
            display: 'block',
          }}
        >
          Projected Score
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
            color: 'text.primary',
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {awayAbbr} {prediction.predicted_away_score} - {prediction.predicted_home_score} {homeAbbr}
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * Material 3 left overlay sidebar for Predictions & Insights.
 * Displays all predictions in a scrollable vertical list.
 */
const PredictionsSidebar: React.FC<PredictionsSidebarProps> = ({ open, onClose, predictions, loading, error, isUpdating = false }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handlePredictionClick = (gameDate: string) => {
    navigate(`/predictions?date=${gameDate}`);
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380, md: 420 },
          maxWidth: '100vw', // Ensure never exceeds viewport
          borderRight: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.xl : shadows.xl,
          borderRadius: 0, // Left side flush with screen edge
          // Right side border radius
          borderTopRightRadius: borderRadius.lg,
          borderBottomRightRadius: borderRadius.lg,
          overflowX: 'hidden', // Prevent horizontal scroll
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <Insights sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 }, flexShrink: 0 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
                color: 'text.primary',
                letterSpacing: typography.letterSpacing.tight,
                flexShrink: 0,
              }}
            >
              Predictions & Insights
            </Typography>
            {predictions.length > 0 && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: borderRadius.full,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontSize: typography.size.caption,
                  fontWeight: typography.weight.semibold,
                  flexShrink: 0,
                }}
              >
                {predictions.length}
              </Box>
            )}
            {/* Subtle updating indicator - only shows when updating and predictions exist */}
            {isUpdating && predictions.length > 0 && (
              <Chip
                icon={<CircularProgress size={12} sx={{ color: 'primary.main' }} />}
                label="Updating"
                size="small"
                sx={{
                  ml: 'auto',
                  fontSize: '0.7rem',
                  height: 20,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  flexShrink: 0,
                  '& .MuiChip-icon': {
                    marginLeft: '4px',
                  },
                }}
              />
            )}
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              minWidth: 40,
              minHeight: 40,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
              transition: transitions.smooth,
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 2, sm: 2.5 },
            // Material 3 scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: borderRadius.xs,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
              borderRadius: borderRadius.xs,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              },
            },
          }}
        >
          {loading && predictions.length === 0 ? (
            // Loading State - only show if no predictions exist yet
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Paper
                  key={i}
                  elevation={1}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Skeleton variant="rectangular" width="60%" height={20} sx={{ borderRadius: borderRadius.sm, mb: 1.5 }} />
                  <Skeleton variant="rectangular" width="100%" height={6} sx={{ borderRadius: borderRadius.xs, mb: 1 }} />
                  <Skeleton variant="rectangular" width="80%" height={18} sx={{ borderRadius: borderRadius.sm }} />
                </Paper>
              ))}
            </Box>
          ) : error && predictions.length === 0 ? (
            // Error State - only show if no predictions exist (preserve existing predictions on error)
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="error" sx={{ fontSize: typography.size.body }}>
                {error}
              </Typography>
            </Box>
          ) : predictions.length === 0 ? (
            // Empty State - only show if truly no predictions ever loaded
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                textAlign: 'center',
              }}
            >
              <Insights sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  fontSize: typography.size.body,
                  mb: 1,
                }}
              >
                No Predictions Available
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: typography.size.bodySmall,
                }}
              >
                No predictions available for this date.
              </Typography>
            </Box>
          ) : (
            // Predictions List - always show if predictions exist (even during loading/error)
            <Box>
              {predictions.map((prediction) => (
                <PredictionCard
                  key={prediction.game_id}
                  prediction={prediction}
                  onClick={() => handlePredictionClick(prediction.game_date)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default PredictionsSidebar;

