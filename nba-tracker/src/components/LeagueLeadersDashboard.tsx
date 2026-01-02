import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { responsiveSpacing, typography, borderRadius, transitions } from '../theme/designTokens';
import { fetchLeagueLeaders } from '../utils/apiClient';
import { LeagueLeader, LeagueLeadersResponse } from '../types/league';

interface LeagueLeadersDashboardProps {
  season: string;
}

type CategoryTab = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK';

const categoryLabels: Record<CategoryTab, string> = {
  PTS: 'Points',
  REB: 'Rebounds',
  AST: 'Assists',
  STL: 'Steals',
  BLK: 'Blocks',
};

/**
 * League Leaders Dashboard component.
 * 
 * Displays top 5 players across multiple stat categories (Points, Rebounds, Assists, Steals, Blocks)
 * with visual indicators including progress bars, rank badges, and player photos.
 * 
 * Features:
 * - Category tabs to switch between stat types
 * - Visual progress bars showing relative stat values
 * - Rank badges (highlighted for #1 player)
 * - Clickable player cards that navigate to player profiles
 * - Responsive design matching existing UI style
 * 
 * Used in the UniversalSidebar as a new "Leaders" tab.
 */
const LeagueLeadersDashboard: React.FC<LeagueLeadersDashboardProps> = ({ season }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('PTS');
  const [leaders, setLeaders] = useState<LeagueLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaders = useCallback(async (category: CategoryTab) => {
    setLoading(true);
    setError(null);
    try {
      const data: LeagueLeadersResponse = await fetchLeagueLeaders(category, season);
      setLeaders(data.leaders || []);
    } catch (err) {
      console.error('Error fetching league leaders:', err);
      setError('Failed to load league leaders');
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    fetchLeaders(activeCategory);
  }, [activeCategory, fetchLeaders]);

  const handleCategoryChange = (_: unknown, newValue: CategoryTab) => {
    setActiveCategory(newValue);
  };

  const handlePlayerClick = (playerId: number) => {
    navigate(`/player/${playerId}`);
  };

  // Calculate max stat value for progress bar scaling
  const maxStatValue = leaders.length > 0 
    ? Math.max(...leaders.map(l => l.stat_value)) 
    : 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Category Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeCategory}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.bodySmall,
              minHeight: 48,
              px: 1.5,
            },
          }}
        >
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Tab key={key} label={label} value={key as CategoryTab} />
          ))}
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        ) : leaders.length === 0 ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No data available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            {leaders.map((leader, index) => {
              const progress = maxStatValue > 0 ? (leader.stat_value / maxStatValue) * 100 : 0;
              const isTopPlayer = leader.rank === 1;

              return (
                <Box
                  key={leader.player_id}
                  onClick={() => handlePlayerClick(leader.player_id)}
                  sx={{
                    px: responsiveSpacing.container,
                    py: 1.5,
                    cursor: 'pointer',
                    transition: transitions.smooth,
                    borderBottom: index < leaders.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Rank Badge */}
                    <Chip
                      label={leader.rank}
                      size="small"
                      sx={{
                        width: 32,
                        height: 32,
                        fontWeight: typography.weight.bold,
                        fontSize: typography.size.bodySmall,
                        backgroundColor: isTopPlayer
                          ? alpha(theme.palette.primary.main, 0.2)
                          : 'action.selected',
                        color: isTopPlayer ? theme.palette.primary.main : 'text.primary',
                        border: isTopPlayer
                          ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
                          : 'none',
                      }}
                    />

                    {/* Player Photo */}
                    <Avatar
                      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.player_id}.png`}
                      sx={{
                        width: 40,
                        height: 40,
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/logos/default.svg';
                      }}
                    />

                    {/* Player Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: typography.weight.semibold,
                          fontSize: typography.size.body,
                          color: 'text.primary',
                          mb: 0.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leader.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: typography.size.caption,
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        {leader.team} • {leader.games_played} GP
                      </Typography>
                      {/* Progress Bar */}
                      <Box sx={{ position: 'relative', width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 4,
                            borderRadius: borderRadius.xs,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: borderRadius.xs,
                              backgroundColor: isTopPlayer
                                ? theme.palette.primary.main
                                : alpha(theme.palette.primary.main, 0.6),
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Stat Value */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: typography.weight.bold,
                        fontSize: typography.size.body,
                        color: isTopPlayer ? theme.palette.primary.main : 'text.primary',
                        minWidth: 48,
                        textAlign: 'right',
                      }}
                    >
                      {leader.stat_value.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LeagueLeadersDashboard;

