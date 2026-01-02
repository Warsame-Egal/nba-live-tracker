import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { responsiveSpacing, typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { PlayerSummary } from '../types/player';
import { getSeasonOptions } from '../utils/season';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PlayersSidebarProps {
  selectedStat: string;
  onStatChange: (stat: string) => void;
  season: string;
  onSeasonChange: (season: string) => void;
}

const PlayersSidebar: React.FC<PlayersSidebarProps> = ({ selectedStat, onStatChange, season, onSeasonChange }) => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statOptions = [
    { value: 'PTS', label: 'Points' },
    { value: 'REB', label: 'Rebounds' },
    { value: 'AST', label: 'Assists' },
    { value: 'STL', label: 'Steals' },
    { value: 'BLK', label: 'Blocks' },
  ];

  const seasonOptions = getSeasonOptions(5);

  const fetchTopPlayersByStat = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<PlayerSummary[]>(
        `${API_BASE_URL}/api/v1/players/top-by-stat?season=${encodeURIComponent(season)}&stat=${encodeURIComponent(selectedStat)}&top_n=10`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching top players:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [season, selectedStat]);

  const fetchPlayers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await fetchJson<PlayerSummary[]>(
        `${API_BASE_URL}/api/v1/players/search/${encodeURIComponent(query)}`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      fetchTopPlayersByStat();
    }
  }, [selectedStat, season, searchQuery, fetchTopPlayersByStat]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetchPlayers(searchQuery);
      } else {
        fetchTopPlayersByStat();
      }
    }, 300);

    debounceTimerRef.current = timer;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, fetchPlayers, fetchTopPlayersByStat]);

  const getStatValue = (player: PlayerSummary, stat: string): number | undefined => {
    switch (stat) {
      case 'PTS':
        return player.PTS;
      case 'REB':
        return player.REB;
      case 'AST':
        return player.AST;
      case 'STL':
        return player.STL;
      case 'BLK':
        return player.BLK;
      default:
        return player.PTS;
    }
  };

  const handlePlayerClick = (playerId: number) => {
    navigate(`/player/${playerId}`);
  };

  const formatStatValue = (player: PlayerSummary, stat: string): string => {
    const value = getStatValue(player, stat);
    if (value !== undefined && value !== null) {
      return value.toFixed(1);
    }
    return 'N/A';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: responsiveSpacing.container, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            mb: 2,
            fontSize: typography.size.h6,
          }}
        >
          Players
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Season</InputLabel>
          <Select
            value={season}
            label="Season"
            onChange={e => onSeasonChange(e.target.value)}
            sx={{
              borderRadius: borderRadius.sm,
            }}
          >
            {seasonOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          placeholder="Search players..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius.sm,
            },
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Sort by</InputLabel>
          <Select
            value={selectedStat}
            label="Sort by"
            onChange={e => onStatChange(e.target.value)}
            sx={{
              borderRadius: borderRadius.sm,
            }}
          >
            {statOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : players.length === 0 ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery.trim().length >= 2
                ? 'No players found'
                : 'Loading top players...'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {players.map(player => {
              const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
              const positionTeam = [player.POSITION, player.TEAM_ABBREVIATION].filter(Boolean).join(' • ');
              const statValue = formatStatValue(player, selectedStat);

              return (
                <ListItem key={player.PERSON_ID} disablePadding>
                  <ListItemButton
                    onClick={() => handlePlayerClick(player.PERSON_ID)}
                    sx={{
                      py: 1.5,
                      px: responsiveSpacing.container,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
                        sx={{
                          width: 40,
                          height: 40,
                          border: '2px solid',
                          borderColor: 'divider',
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={fullName}
                      secondary={positionTeam || 'N/A'}
                      primaryTypographyProps={{
                        fontSize: typography.size.body,
                        fontWeight: typography.weight.semibold,
                      }}
                      secondaryTypographyProps={{
                        fontSize: typography.size.caption,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: typography.weight.bold,
                        color: 'primary.main',
                        ml: 1,
                      }}
                    >
                      {statValue}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default PlayersSidebar;

