import { useEffect, useState } from 'react';
import {
  Drawer,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import { Close, ArrowBack, Assessment, Timeline } from '@mui/icons-material';
import { BoxScoreResponse, TeamBoxScoreStats, PlayerBoxScoreStats } from '../types/scoreboard';
import PlayByPlay from './PlayByPlay';
import { logger } from '../utils/logger';
import { fetchJson } from '../utils/apiClient';

// Base URL for API calls
import { API_BASE_URL } from '../utils/apiConfig';

interface GameDetailsDrawerProps {
  gameId: string | null;
  open: boolean;
  onClose: () => void;
  initialTab?: 'box' | 'play';
  gameInfo?: {
    homeTeam?: string;
    awayTeam?: string;
    homeScore?: number;
    awayScore?: number;
    status?: string;
  };
}

/**
 * Modern drawer component that shows detailed information about a game.
 * Has two tabs: Box Score (player stats) and Play by Play (game events).
 * Uses a slide-in drawer instead of a modal for a more modern experience.
 */
const GameDetailsDrawer = ({ gameId, open, onClose, initialTab = 'box', gameInfo }: GameDetailsDrawerProps) => {
  // Which tab is selected: 'box' for box score, 'play' for play-by-play
  const [tab, setTab] = useState<'box' | 'play'>(initialTab);
  
  // Update tab when initialTab prop changes
  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [initialTab, open]);
  // The box score data
  const [boxScore, setBoxScore] = useState<BoxScoreResponse | null>(null);
  // Whether we're loading the box score
  const [loading, setLoading] = useState(false);

  /**
   * Fetch the box score when the drawer opens or game ID changes.
   */
  useEffect(() => {
    if (!gameId || !open) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const boxRes = await fetchJson<BoxScoreResponse>(
          `${API_BASE_URL}/api/v1/scoreboard/game/${gameId}/boxscore`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setBoxScore(boxRes);
      } catch (err) {
        logger.error('Failed to fetch game details', err);
        setBoxScore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [gameId, open]);

  /**
   * Render modern team stats with improved visual hierarchy.
   */
  const renderTeamStats = (team: TeamBoxScoreStats, isHome: boolean) => (
    <Box sx={{ mb: { xs: 3, sm: 4 } }}>
      {/* Team header card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          backgroundColor: isHome ? 'rgba(25, 118, 210, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
              {team.team_name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Team stats summary */}
            <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
              <StatBadge label="PTS" value={team.score} />
              <StatBadge label="REB" value={team.rebounds_total} />
              <StatBadge label="AST" value={team.assists} />
              <StatBadge label="STL" value={team.steals} />
              <StatBadge label="BLK" value={team.blocks} />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Player stats */}
      {team.players.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              px: 2,
              py: 1.5,
              backgroundColor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 120, color: 'text.secondary' }}>
              PLAYER
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              MIN
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              PTS
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              REB
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              AST
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              STL
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              BLK
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
              TO
            </Typography>
          </Box>
          {/* Player rows */}
          <Box>
            {team.players.map((p: PlayerBoxScoreStats, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  px: { xs: 2, sm: 2 },
                  py: { xs: 1.5, sm: 1.75 },
                  borderBottom: idx < team.players.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  transition: 'background-color 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {/* Player name - mobile shows more info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                      mb: { xs: 0.5, sm: 0 },
                    }}
                  >
                    {p.name}
                  </Typography>
                  {/* Mobile stats */}
                  <Box
                    sx={{
                      display: { xs: 'flex', sm: 'none' },
                      gap: 1.5,
                      mt: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {formatMinutes(p.minutes ?? null)} MIN
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {p.points} PTS
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.rebounds} REB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.assists} AST
                    </Typography>
                  </Box>
                </Box>
                {/* Desktop stats */}
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {formatMinutes(p.minutes ?? null)}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', fontWeight: 600, color: 'primary.main' }}>
                    {p.points}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {p.rebounds}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {p.assists}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {p.steals}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {p.blocks}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', color: 'text.secondary' }}>
                    {p.turnovers}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No player stats available. Game may not have started yet.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '90%', md: '85%', lg: 900 },
          backgroundColor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton 
                onClick={onClose} 
                size="small" 
                sx={{ 
                  color: 'text.secondary',
                  minWidth: { xs: 44, sm: 40 },
                  minHeight: { xs: 44, sm: 40 },
                }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
                Game Details
              </Typography>
            </Box>
            <IconButton 
              onClick={onClose} 
              size="small" 
              sx={{ 
                color: 'text.secondary',
                minWidth: { xs: 44, sm: 40 },
                minHeight: { xs: 44, sm: 40 },
              }}
            >
              <Close />
            </IconButton>
          </Box>
          {/* Game info */}
          {gameInfo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={gameInfo.status || 'Game'}
                size="small"
                sx={{
                  backgroundColor: 'rgba(239, 83, 80, 0.15)',
                  color: 'error.main',
                  fontWeight: 600,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {gameInfo.awayTeam} {gameInfo.awayScore ?? 0} - {gameInfo.homeScore ?? 0} {gameInfo.homeTeam}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: { xs: 88, sm: 112 },
            zIndex: 1,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            sx={{
              px: { xs: 2, sm: 3 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                minHeight: { xs: 48, sm: 56 },
                gap: 1,
              },
            }}
          >
            <Tab
              icon={<Assessment sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Box Score"
              value="box"
            />
            <Tab
              icon={<Timeline sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Play by Play"
              value="play"
            />
          </Tabs>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 6, sm: 8 } }}>
              <CircularProgress />
            </Box>
          ) : tab === 'box' && boxScore ? (
            // Show box score for both teams
            <>
              {renderTeamStats(boxScore.away_team, false)}
              <Divider sx={{ my: { xs: 3, sm: 4 } }} />
              {renderTeamStats(boxScore.home_team, true)}
            </>
          ) : tab === 'play' ? (
            // Show play-by-play component
            // Determine if game is live based on status
            <PlayByPlay 
              gameId={gameId!} 
              isLiveGame={gameInfo?.status ? 
                (gameInfo.status.toLowerCase().includes('live') || 
                 gameInfo.status.toLowerCase().includes('in progress') ||
                 (/\b[1-4]q\b/i.test(gameInfo.status) && !gameInfo.status.toLowerCase().includes('final'))) 
                : false
              }
            />
          ) : (
            // No data available
            <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 8 } }}>
              <Typography variant="body1" color="text.secondary">
                No data available.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

/**
 * Helper component for displaying stat badges.
 */
const StatBadge = ({ label, value }: { label: string; value: number }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
      {value}
    </Typography>
  </Box>
);

/**
 * Format minutes from "PT10M30S" format to "10:30".
 */
const formatMinutes = (minutes: string | null): string => {
  if (!minutes) return '0:00';
  if (minutes.startsWith('PT')) {
    const match = minutes.match(/PT(\d+)M(\d+(\.\d+)?)S/);
    if (match) return `${match[1]}:${parseFloat(match[2]).toFixed(0).padStart(2, '0')}`;
    const minutesOnly = minutes.match(/PT(\d+)M/);
    if (minutesOnly) return `${minutesOnly[1]}:00`;
    const secondsOnly = minutes.match(/PT(\d+)S/);
    if (secondsOnly) return `0:${secondsOnly[1].padStart(2, '0')}`;
  }
  return minutes;
};

export default GameDetailsDrawer;

