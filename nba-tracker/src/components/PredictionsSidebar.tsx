import {
  Box,
  Typography,
  Avatar,
  LinearProgress,
  alpha,
  useTheme,
  Skeleton,
  IconButton,
  Paper,
  Drawer,
  Chip,
  CircularProgress,
} from '@mui/material';
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

export interface PredictionCardProps {
  prediction: GamePrediction;
  onClick: () => void;
}

/**
 * Individual prediction card component for the sidebar list.
 * Exported for use in Scoreboard sidebar and mobile list.
 */
export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onClick }) => {
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
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.5,
        mb: 1.5,
        borderRadius: borderRadius.md,
        cursor: 'pointer',
        transition: transitions.normal,
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          backgroundColor:
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderColor: 'primary.main',
        },
      }}
    >
      {/* Team Matchup row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.25,
          gap: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Avatar
            src={awayLogo}
            sx={{
              width: 28,
              height: 28,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.caption.sm,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {awayAbbr}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: typography.weight.medium,
            fontSize: typography.size.captionSmall.xs,
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          @
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.caption.sm,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {homeAbbr}
          </Typography>
          <Avatar
            src={homeLogo}
            sx={{
              width: 28,
              height: 28,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>

      {/* Win Probability bar */}
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: typography.size.captionSmall.xs,
              color: 'text.secondary',
              fontWeight: typography.weight.medium,
            }}
          >
            Win %
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.captionSmall.xs,
              color: 'primary.main',
              whiteSpace: 'nowrap',
            }}
          >
            {favoredTeam === 'home' ? homeAbbr : awayAbbr} {favoredProb.toFixed(0)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={favoredProb}
          sx={{
            height: 5,
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
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontSize: typography.size.captionSmall.xs,
          color: 'text.secondary',
          fontWeight: typography.weight.medium,
        }}
      >
        {awayAbbr} {prediction.predicted_away_score} – {prediction.predicted_home_score} {homeAbbr}
      </Typography>
    </Paper>
  );
};

/**
 * Renders the predictions list content (loading, error, empty, or cards).
 * Used inline in Scoreboard sidebar and mobile section; no drawer.
 */
export const PredictionsListContent: React.FC<{
  predictions: GamePrediction[];
  loading: boolean;
  error: string | null;
  onPredictionClick: (gameDate: string) => void;
}> = ({ predictions, loading, error, onPredictionClick }) => {
  const theme = useTheme();
  if (loading && predictions.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[1, 2, 3].map(i => (
          <Paper
            key={i}
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: borderRadius.md,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Skeleton
              variant="rectangular"
              width="70%"
              height={16}
              sx={{ borderRadius: borderRadius.xs, mb: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={5}
              sx={{ borderRadius: borderRadius.xs, mb: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="50%"
              height={12}
              sx={{ borderRadius: borderRadius.xs }}
            />
          </Paper>
        ))}
      </Box>
    );
  }
  if (error && predictions.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="error" sx={{ fontSize: typography.size.bodySmall.xs }}>
          {error}
        </Typography>
      </Box>
    );
  }
  if (predictions.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Insights sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4, mb: 1.5 }} />
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontSize: typography.size.bodySmall.xs, mb: 0.5 }}
        >
          No predictions for this date.
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      {predictions.map(prediction => (
        <PredictionCard
          key={prediction.game_id}
          prediction={prediction}
          onClick={() => onPredictionClick(prediction.game_date)}
        />
      ))}
    </Box>
  );
};

/**
 * Material 3 left overlay sidebar for Predictions & Insights.
 * Displays all predictions in a scrollable vertical list.
 */
const PredictionsSidebar: React.FC<PredictionsSidebarProps> = ({
  open,
  onClose,
  predictions,
  loading,
  error,
  isUpdating = false,
}) => {
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Insights sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 }, flexShrink: 0 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
                color: 'text.primary',
                letterSpacing: typography.letterSpacing.tight,
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
              minWidth: { xs: 44, sm: 40 },
              minHeight: { xs: 44, sm: 40 },
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
            '@media (hover: hover)': {
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': {
                background:
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: borderRadius.xs,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor:
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                borderRadius: borderRadius.xs,
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.6)'
                      : 'rgba(0, 0, 0, 0.6)',
                },
              },
            },
          }}
        >
          <PredictionsListContent
            predictions={predictions}
            loading={loading}
            error={error}
            onPredictionClick={handlePredictionClick}
          />
        </Box>
      </Box>
    </Drawer>
  );
};

export default PredictionsSidebar;
