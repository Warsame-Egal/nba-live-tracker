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
import { StandingsResponse } from '../types/standings';
import { getSeasonOptions } from '../utils/season';
import { getTeamAbbreviation } from '../utils/teamMappings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface TeamsSidebarProps {
  season: string;
  onSeasonChange: (season: string) => void;
}

interface TeamListItem {
  id: number;
  name: string;
  abbreviation: string;
}

const TeamsSidebar: React.FC<TeamsSidebarProps> = ({ season, onSeasonChange }) => {
  const navigate = useNavigate();
  const [allTeams, setAllTeams] = useState<TeamListItem[]>([]);
  const [displayedTeams, setDisplayedTeams] = useState<TeamListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seasonOptions = getSeasonOptions(5);


  const fetchAllTeams = useCallback(async (seasonParam: string) => {
    setLoading(true);
    try {
      const data = await fetchJson<StandingsResponse>(
        `${API_BASE_URL}/api/v1/standings/season/${encodeURIComponent(seasonParam)}`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      const teamsList: TeamListItem[] = data.standings.map(standing => ({
        id: standing.team_id,
        name: `${standing.team_city} ${standing.team_name}`,
        abbreviation: getTeamAbbreviation(`${standing.team_city} ${standing.team_name}`),
      }));

      setAllTeams(teamsList);
      setDisplayedTeams(teamsList);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setAllTeams([]);
      setDisplayedTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTeams(season);
  }, [season, fetchAllTeams]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        const filtered = allTeams.filter(
          team =>
            team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setDisplayedTeams(filtered);
      } else {
        setDisplayedTeams(allTeams);
      }
    }, 300);

    debounceTimerRef.current = timer;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, allTeams]);

  const handleTeamClick = (teamId: number) => {
    navigate(`/team/${teamId}`);
  };

  const getTeamLogoPath = (abbreviation: string): string => {
    return `/logos/${abbreviation}.svg`;
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
          Teams
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
          placeholder="Search teams..."
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
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius.sm,
            },
          }}
        />
      </Box>

      <Box sx={{ 
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
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : displayedTeams.length === 0 ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery.trim().length >= 2 ? 'No teams found' : 'No teams available'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {displayedTeams.map(team => (
              <ListItem key={team.id} disablePadding>
                <ListItemButton
                  onClick={() => handleTeamClick(team.id)}
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
                      src={getTeamLogoPath(team.abbreviation)}
                      sx={{
                        width: 40,
                        height: 40,
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                      onError={e => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/logos/default.svg';
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={team.name}
                    secondary={team.abbreviation}
                    primaryTypographyProps={{
                      fontSize: typography.size.body,
                      fontWeight: typography.weight.semibold,
                    }}
                    secondaryTypographyProps={{
                      fontSize: typography.size.caption,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default TeamsSidebar;
