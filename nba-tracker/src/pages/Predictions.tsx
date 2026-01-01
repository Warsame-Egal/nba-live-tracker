import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CalendarToday,
  Analytics,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import Navbar from '../components/Navbar';
import UniversalSidebar from '../components/UniversalSidebar';
import { responsiveSpacing, typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PredictionsResponse, GamePrediction } from '../types/predictions';
import { useTheme, alpha } from '@mui/material/styles';
import { format, parseISO, addDays, subDays } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const teamLogos: Record<string, string> = {
  ATL: '/logos/ATL.svg', BOS: '/logos/BOS.svg', BKN: '/logos/BKN.svg', CHA: '/logos/CHA.svg',
  CHI: '/logos/CHI.svg', CLE: '/logos/CLE.svg', DAL: '/logos/DAL.svg', DEN: '/logos/DEN.svg',
  DET: '/logos/DET.svg', GSW: '/logos/GSW.svg', HOU: '/logos/HOU.svg', IND: '/logos/IND.svg',
  LAC: '/logos/LAC.svg', LAL: '/logos/LAL.svg', MEM: '/logos/MEM.svg', MIA: '/logos/MIA.svg',
  MIL: '/logos/MIL.svg', MIN: '/logos/MIN.svg', NOP: '/logos/NOP.svg', NYK: '/logos/NYK.svg',
  OKC: '/logos/OKC.svg', ORL: '/logos/ORL.svg', PHI: '/logos/PHI.svg', PHX: '/logos/PHX.svg',
  POR: '/logos/POR.svg', SAC: '/logos/SAC.svg', SAS: '/logos/SAS.svg', TOR: '/logos/TOR.svg',
  UTA: '/logos/UTA.svg', WAS: '/logos/WAS.svg',
};

const getTeamAbbreviation = (teamName: string): string => {
  const mapping: Record<string, string> = {
    'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
    'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
    'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
    'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
    'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
    'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
    'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
    'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
    'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
    'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
  };
  return mapping[teamName] || 'NBA';
};

const Predictions = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'confidence' | 'home_prob'>('confidence');
  
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam || format(new Date(), 'yyyy-MM-dd');
  const season = getCurrentSeason();

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<PredictionsResponse>(
          `${API_BASE_URL}/api/v1/predictions/date/${selectedDate}?season=${season}`,
          {},
          { maxRetries: 2, retryDelay: 500, timeout: 15000 }
        );
        setPredictions(data);
      } catch (err) {
        console.error('Predictions error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [selectedDate, season]);

  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate });
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDate);
    const newDate = direction === 'next' ? addDays(current, 1) : subDays(current, 1);
    handleDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflowY: 'auto', backgroundColor: 'background.default' }}>
          <Box sx={{ maxWidth: 1400, mx: 'auto', py: { xs: 3, sm: 4, md: 5 }, px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Analytics sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: { xs: typography.size.h5, sm: typography.size.h4 },
                      color: 'text.primary',
                      mb: 0.5,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Game Predictions
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
                  >
                    Statistical analysis and AI-powered insights for upcoming games
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => handleDateNavigation('prev')}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: borderRadius.md,
                    width: 40,
                    height: 40,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <TrendingDown fontSize="small" />
                </IconButton>
                <TextField
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    maxWidth: 280,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                    },
                  }}
                />
                <IconButton
                  onClick={() => handleDateNavigation('next')}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: borderRadius.md,
                    width: 40,
                    height: 40,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <TrendingUp fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} />
              </Box>
            )}

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: borderRadius.md,
                  '& .MuiAlert-message': {
                    fontSize: '0.9375rem',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {!loading && !error && predictions && (
              <>
                {predictions.predictions.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 4, sm: 6 },
                      textAlign: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.lg,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 1, 
                        fontWeight: typography.weight.bold,
                        fontSize: { xs: typography.size.body, sm: typography.size.h6 },
                      }}
                    >
                      No Games Scheduled
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: '0.9375rem' }}
                    >
                      No games scheduled for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                          value={sortBy}
                          label="Sort By"
                          onChange={(e) => setSortBy(e.target.value as 'confidence' | 'home_prob')}
                        >
                          <MenuItem value="confidence">Confidence</MenuItem>
                          <MenuItem value="home_prob">Win Probability</MenuItem>
                        </Select>
                      </FormControl>
                      <Chip
                        label={`${predictions.predictions.length} Game${predictions.predictions.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          backgroundColor: 'action.hover',
                          fontWeight: typography.weight.medium,
                        }}
                      />
                    </Box>
                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                      {[...predictions.predictions]
                        .sort((a, b) => {
                          if (sortBy === 'confidence') {
                            return b.confidence - a.confidence;
                          } else {
                            return b.home_win_probability - a.home_win_probability;
                          }
                        })
                        .map((prediction) => (
                          <Grid item xs={12} md={6} lg={4} key={prediction.game_id}>
                            <PredictionCard prediction={prediction} />
                          </Grid>
                        ))}
                    </Grid>
                  </>
                )}
              </>
            )}
          </Box>
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
          <UniversalSidebar season={season} onSeasonChange={() => {}} />
        </Box>
      </Box>
    </Box>
  );
};

const PredictionCard: React.FC<{ prediction: GamePrediction }> = ({ prediction }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = teamLogos[homeAbbr] || '/logos/default.svg';
  const awayLogo = teamLogos[awayAbbr] || '/logos/default.svg';
  
  const homeWinProb = prediction.home_win_probability * 100;
  const awayWinProb = prediction.away_win_probability * 100;
  const confidence = prediction.confidence * 100;

  const probChartData = [
    { name: 'Home', value: homeWinProb, fill: theme.palette.primary.main },
    { name: 'Away', value: awayWinProb, fill: alpha(theme.palette.primary.main, 0.5) },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flex: 1,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.7 },
              }}
              onClick={() => navigate(`/team/${prediction.away_team_id}`)}
            >
              <Avatar
                src={awayLogo}
                sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: typography.weight.semibold,
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  }}
                >
                  {prediction.away_team_name.split(' ').pop()}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {awayAbbr}
                </Typography>
              </Box>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mx: 1, fontSize: '0.875rem' }}
            >
              @
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flex: 1,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.7 },
              }}
              onClick={() => navigate(`/team/${prediction.home_team_id}`)}
            >
              <Avatar
                src={homeLogo}
                sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: typography.weight.semibold,
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  }}
                >
                  {prediction.home_team_name.split(' ').pop()}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {homeAbbr}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: typography.weight.bold, 
                fontSize: { xs: typography.size.body, sm: typography.size.h6 },
              }}
            >
              Win Probability
            </Typography>
            <Chip
              label={`${confidence.toFixed(0)}% Confidence`}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontWeight: typography.weight.semibold,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {prediction.away_team_name.split(' ').pop()}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: typography.weight.bold,
                  fontSize: '0.875rem',
                }}
              >
                {awayWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={awayWinProb}
              sx={{
                height: 6,
                borderRadius: borderRadius.sm,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.6),
                  borderRadius: borderRadius.sm,
                },
              }}
            />
          </Box>
          
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {prediction.home_team_name.split(' ').pop()}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: typography.weight.bold,
                  fontSize: '0.875rem',
                }}
              >
                {homeWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={homeWinProb}
              sx={{
                height: 6,
                borderRadius: borderRadius.sm,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: borderRadius.sm,
                },
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: borderRadius.md,
            backgroundColor: 'action.hover',
            mb: 3,
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              display: 'block', 
              mb: 1.5,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Predicted Score
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                }}
              >
                {prediction.predicted_away_score.toFixed(0)}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {awayAbbr}
              </Typography>
            </Box>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ fontSize: '1.25rem' }}
            >
              -
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                }}
              >
                {prediction.predicted_home_score.toFixed(0)}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {homeAbbr}
              </Typography>
            </Box>
          </Box>
        </Box>

        {prediction.insights.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: typography.weight.bold, 
                mb: 2, 
                fontSize: { xs: typography.size.body, sm: typography.size.h6 },
              }}
            >
              Key Insights
            </Typography>
            <Grid container spacing={1.5}>
              {prediction.insights.map((insight, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                      backgroundColor: 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: typography.weight.semibold, 
                        mb: 0.5,
                        fontSize: '0.875rem',
                      }}
                    >
                      {insight.title}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}
                    >
                      {insight.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <Box sx={{ mt: 'auto', pt: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: typography.weight.bold, 
              mb: 2, 
              fontSize: { xs: typography.size.body, sm: typography.size.h6 },
            }}
          >
            Probability Breakdown
          </Typography>
          <Box sx={{ position: 'relative', height: 200, pt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={probChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ value }) => `${value.toFixed(1)}%`}
                >
                  {probChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.875rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Predictions;
