import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { StandingRecord, StandingsResponse } from '../types/standings';
import { Sports, TrendingUp, TrendingDown, EmojiEvents } from '@mui/icons-material';
import Navbar from './Navbar';
import UniversalSidebar from './UniversalSidebar';
import { responsiveSpacing, borderRadius, transitions, typography } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Map of team names to their abbreviations and logo paths.
 * Used to display team logos in the standings table.
 */
const teamMappings: { [key: string]: { abbreviation: string; logo: string } } = {
  'Atlanta Hawks': { abbreviation: 'ATL', logo: '/logos/ATL.svg' },
  'Boston Celtics': { abbreviation: 'BOS', logo: '/logos/BOS.svg' },
  'Brooklyn Nets': { abbreviation: 'BKN', logo: '/logos/BKN.svg' },
  'Charlotte Hornets': { abbreviation: 'CHA', logo: '/logos/CHA.svg' },
  'Chicago Bulls': { abbreviation: 'CHI', logo: '/logos/CHI.svg' },
  'Cleveland Cavaliers': { abbreviation: 'CLE', logo: '/logos/CLE.svg' },
  'Dallas Mavericks': { abbreviation: 'DAL', logo: '/logos/DAL.svg' },
  'Denver Nuggets': { abbreviation: 'DEN', logo: '/logos/DEN.svg' },
  'Detroit Pistons': { abbreviation: 'DET', logo: '/logos/DET.svg' },
  'Golden State Warriors': { abbreviation: 'GSW', logo: '/logos/GSW.svg' },
  'Houston Rockets': { abbreviation: 'HOU', logo: '/logos/HOU.svg' },
  'Indiana Pacers': { abbreviation: 'IND', logo: '/logos/IND.svg' },
  'LA Clippers': { abbreviation: 'LAC', logo: '/logos/LAC.svg' },
  'Los Angeles Lakers': { abbreviation: 'LAL', logo: '/logos/LAL.svg' },
  'Memphis Grizzlies': { abbreviation: 'MEM', logo: '/logos/MEM.svg' },
  'Miami Heat': { abbreviation: 'MIA', logo: '/logos/MIA.svg' },
  'Milwaukee Bucks': { abbreviation: 'MIL', logo: '/logos/MIL.svg' },
  'Minnesota Timberwolves': { abbreviation: 'MIN', logo: '/logos/MIN.svg' },
  'New Orleans Pelicans': { abbreviation: 'NOP', logo: '/logos/NOP.svg' },
  'New York Knicks': { abbreviation: 'NYK', logo: '/logos/NYK.svg' },
  'Oklahoma City Thunder': { abbreviation: 'OKC', logo: '/logos/OKC.svg' },
  'Orlando Magic': { abbreviation: 'ORL', logo: '/logos/ORL.svg' },
  'Philadelphia 76ers': { abbreviation: 'PHI', logo: '/logos/PHI.svg' },
  'Phoenix Suns': { abbreviation: 'PHX', logo: '/logos/PHX.svg' },
  'Portland Trail Blazers': { abbreviation: 'POR', logo: '/logos/POR.svg' },
  'Sacramento Kings': { abbreviation: 'SAC', logo: '/logos/SAC.svg' },
  'San Antonio Spurs': { abbreviation: 'SAS', logo: '/logos/SAS.svg' },
  'Toronto Raptors': { abbreviation: 'TOR', logo: '/logos/TOR.svg' },
  'Utah Jazz': { abbreviation: 'UTA', logo: '/logos/UTA.svg' },
  'Washington Wizards': { abbreviation: 'WAS', logo: '/logos/WAS.svg' },
};

/**
 * Modern standings page that displays NBA standings with card-based design.
 * Shows teams ranked by their playoff position with enhanced visuals.
 */
const Standings = () => {
  // Get season from URL if provided
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  // Default to current season if not provided
  const getCurrentSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth >= 10) {
      return `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(2)}`;
    }
  };
  const seasonParam = season || getCurrentSeason();
  // List of all team standings
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  // Whether we're loading the standings
  const [loading, setLoading] = useState(true);
  // Error message if something goes wrong
  const [error, setError] = useState('');
  // Which conference to show (East or West)
  const [conference, setConference] = useState<'East' | 'West'>('East');

  /**
   * Fetch standings when component loads or season changes.
   */
  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      try {
        const data = await fetchJson<StandingsResponse>(
          `${API_BASE_URL}/api/v1/standings/season/${seasonParam}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setStandings(data.standings);
      } catch {
        setError('Failed to fetch standings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [seasonParam]);

  /**
   * Filter standings by selected conference and sort by playoff rank.
   */
  const filteredStandings = useMemo(() => {
    return standings
      .filter(team => team.conference === conference)
      .sort((a, b) => a.playoff_rank - b.playoff_rank);
  }, [standings, conference]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Container maxWidth="xl" sx={{ py: responsiveSpacing.containerVertical, px: responsiveSpacing.container }}>
        {/* Page title */}
        <Box sx={{ textAlign: 'center', mb: responsiveSpacing.section }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: typography.weight.bold,
              mb: 0.5,
              fontSize: typography.size.h4,
              color: 'text.primary',
            }}
          >
            Standings
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              fontWeight: typography.weight.regular,
            }}
          >
            {seasonParam}
          </Typography>
        </Box>

        {/* Conference selector buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: responsiveSpacing.section }}>
          <ToggleButtonGroup
            value={conference}
            exclusive
            onChange={(_, newValue) => newValue && setConference(newValue)}
            sx={{
              '& .MuiToggleButton-root': {
                px: { xs: 3, sm: 4 },
                py: { xs: 1, sm: 1.5 },
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.button,
                textTransform: 'none',
                borderColor: 'divider',
                color: 'text.secondary',
                transition: transitions.normal,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            }}
          >
            <ToggleButton value="East">Eastern Conference</ToggleButton>
            <ToggleButton value="West">Western Conference</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Loading spinner */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 6, sm: 8 } }}>
            <CircularProgress />
          </Box>
        )}
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: { xs: 3, sm: 4 } }}>
            {error}
          </Alert>
        )}
        {/* Empty state */}
        {!loading && !error && filteredStandings.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: { xs: 8, sm: 12 },
              px: 3,
              minHeight: '40vh',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                mb: 4,
                animation: 'float 3s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' },
                },
              }}
            >
              <Sports
                sx={{
                  fontSize: { xs: 100, sm: 120 },
                  color: 'primary.main',
                  opacity: 0.3,
                }}
              />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: typography.weight.bold,
                mb: 1,
                textAlign: 'center',
                color: 'text.primary',
              }}
            >
              No Standings Data Available
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                textAlign: 'center',
                maxWidth: 500,
                lineHeight: 1.6,
              }}
            >
              Unable to load standings data for the selected season. Please try again later or select a different season.
            </Typography>
          </Box>
        )}

        {/* Standings cards */}
        {!loading && !error && filteredStandings.length > 0 && (
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredStandings.map((team) => {
              const teamName = `${team.team_city} ${team.team_name}`;
              const logo = teamMappings[teamName]?.logo || '/logos/default.svg';
              const isPlayoffTeam = team.playoff_rank <= 8;
              const isTopSeed = team.playoff_rank <= 3;
              const streakColor = team.current_streak_str.startsWith('W') ? 'success.main' : 'error.main';

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={team.team_id}>
                  <Card
                    elevation={0}
                    onClick={() => navigate(`/team/${team.team_id}`)}
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      backgroundColor: 'background.paper',
                      border: '1px solid',
                      borderColor: isTopSeed ? 'primary.main' : 'divider',
                      borderLeft: isTopSeed ? '4px solid' : '1px solid',
                      borderLeftColor: isTopSeed ? 'primary.main' : 'divider',
                      borderRadius: borderRadius.sm,
                      transition: transitions.normal,
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <CardContent sx={{ p: responsiveSpacing.cardCompact }}>
                      {/* Header with rank and team */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                          {/* Playoff rank badge */}
                          <Chip
                            label={team.playoff_rank}
                            size="small"
                            icon={isPlayoffTeam ? <EmojiEvents sx={{ fontSize: 14 }} /> : undefined}
                            sx={{
                              height: 28,
                              minWidth: 28,
                              fontWeight: typography.weight.bold,
                              fontSize: typography.size.body.sm,
                              backgroundColor: isTopSeed
                                ? 'primary.main'
                                : isPlayoffTeam
                                  ? 'rgba(25, 118, 210, 0.15)'
                                  : 'transparent',
                              color: isTopSeed ? 'primary.contrastText' : 'text.primary',
                              border: isPlayoffTeam && !isTopSeed ? '1px solid' : 'none',
                              borderColor: isPlayoffTeam && !isTopSeed ? 'primary.main' : 'transparent',
                            }}
                          />
                          {/* Team logo */}
                          <Avatar
                            src={logo}
                            alt={teamName}
                            sx={{
                              width: { xs: 36, sm: 40 },
                              height: { xs: 36, sm: 40 },
                              backgroundColor: 'transparent',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                          {/* Team name */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {team.team_city}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {team.team_name}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Main stats */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: typography.weight.extrabold, fontSize: typography.size.h5 }}>
                            {team.wins} - {team.losses}
                          </Typography>
                          <Chip
                            label={team.win_pct.toFixed(3)}
                            size="small"
                            sx={{
                              height: 24,
                              fontWeight: typography.weight.semibold,
                              fontSize: typography.size.caption.sm,
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                              color: 'primary.main',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: typography.size.caption }}>
                          {team.games_back === '0.0' ? '—' : `${team.games_back} GB`}
                        </Typography>
                      </Box>

                      {/* Divider */}
                      <Box
                        sx={{
                          height: 1,
                          backgroundColor: 'divider',
                          mb: 2,
                          mx: -2.5,
                        }}
                      />

                      {/* Secondary stats grid */}
                      <Grid container spacing={1} sx={{ mb: 1.5 }}>
                        <Grid item xs={6}>
                          <StatItem label="Home" value={team.home_record} />
                        </Grid>
                        <Grid item xs={6}>
                          <StatItem label="Away" value={team.road_record} />
                        </Grid>
                        <Grid item xs={6}>
                          <StatItem label="L10" value={team.l10_record} />
                        </Grid>
                        <Grid item xs={6}>
                          <StatItem
                            label="Streak"
                            value={team.current_streak_str}
                            color={streakColor}
                            icon={team.current_streak_str.startsWith('W') ? <TrendingUp sx={{ fontSize: 12 }} /> : <TrendingDown sx={{ fontSize: 12 }} />}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
          </Container>
        </Box>

        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            overflowY: 'auto',
          }}
        >
          <UniversalSidebar />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Helper component for displaying a stat item.
 */
const StatItem = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        fontSize: typography.size.captionSmall,
        fontWeight: typography.weight.semibold,
        textTransform: 'uppercase',
        display: 'block',
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon}
      <Typography
        variant="body2"
        sx={{
          fontWeight: typography.weight.bold,
          fontSize: typography.size.bodySmall,
          color: color || 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
);

export default Standings;
