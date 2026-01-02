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
import PageLayout from '../components/PageLayout';
import UniversalSidebar from '../components/UniversalSidebar';
import { typography } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PredictionsResponse, GamePrediction } from '../types/predictions';
import { useTheme, alpha } from '@mui/material/styles';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';


const Predictions = () => {
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
          { maxRetries: 2, retryDelay: 500, timeout: 120000 } // 120s timeout for AI processing (10 games can take time)
        );
        console.log(`Predictions loaded: ${data.predictions?.length || 0} games for ${selectedDate}`);
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
      <PageLayout sidebar={<UniversalSidebar />}>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: 1200 },
              borderRadius: 1.5,
              backgroundColor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {/* Header with title and filters */}
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Analytics sx={{ fontSize: { xs: 28, sm: 32 }, color: 'text.secondary' }} />
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: typography.weight.bold,
                        fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
                        color: 'text.primary',
                      }}
                    >
                      Game Predictions
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Stat-based predictions with AI insights
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${predictions?.predictions.length || 0} Game${predictions?.predictions.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: 'background.paper',
                    fontWeight: typography.weight.medium,
                  }}
                />
              </Box>

              {/* Filters row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <IconButton
                  onClick={() => handleDateNavigation('prev')}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    width: 36,
                    height: 36,
                    '&:hover': {
                      backgroundColor: 'background.paper',
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
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      backgroundColor: 'background.paper',
                    },
                  }}
                />
                <IconButton
                  onClick={() => handleDateNavigation('next')}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    width: 36,
                    height: 36,
                    '&:hover': {
                      backgroundColor: 'background.paper',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <TrendingUp fontSize="small" />
                </IconButton>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Sort</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort"
                    onChange={(e) => setSortBy(e.target.value as 'confidence' | 'home_prob')}
                    sx={{
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <MenuItem value="confidence">Confidence</MenuItem>
                    <MenuItem value="home_prob">Win Probability</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
                    borderRadius: 1,
                    '& .MuiAlert-message': {
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              {!loading && !error && predictions && (
                <>
                  {predictions.predictions.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
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
                        sx={{ fontSize: '0.875rem' }}
                      >
                        No games scheduled for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                      </Typography>
                    </Box>
                  ) : (
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
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </PageLayout>
    </Box>
  );
};

const PredictionCard: React.FC<{ prediction: GamePrediction }> = ({ prediction }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = getTeamLogo(prediction.home_team_name);
  const awayLogo = getTeamLogo(prediction.away_team_name);
  
  const homeWinProb = prediction.home_win_probability * 100;
  const awayWinProb = prediction.away_win_probability * 100;
  const confidence = prediction.confidence * 100;

  // Compute colors for the donut chart - use theme colors as explicit hex strings
  const homeColor = theme.palette.primary.main;
  const awayColor = alpha(theme.palette.primary.main, 0.6); // Lighter version for contrast

  const probChartData = [
    { 
      name: 'Home', 
      value: homeWinProb, 
      fill: homeColor 
    },
    { 
      name: 'Away', 
      value: awayWinProb, 
      fill: awayColor 
    },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 1.5,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Team logos + matchup */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.7 },
            }}
            onClick={() => navigate(`/team/${prediction.away_team_id}`)}
          >
            <Avatar
              src={awayLogo}
              sx={{
                width: 40,
                height: 40,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Box>

          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: '0.875rem',
              color: 'text.primary',
            }}
          >
            {awayAbbr} @ {homeAbbr}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.7 },
              ml: 'auto',
            }}
            onClick={() => navigate(`/team/${prediction.home_team_id}`)}
          >
            <Avatar
              src={homeLogo}
              sx={{
                width: 40,
                height: 40,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Box>
        </Box>

        {/* Win Probability section */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: '0.8125rem',
                color: 'text.secondary',
              }}
            >
              Win Probability
            </Typography>
            <Chip
              label={`${confidence.toFixed(0)}%`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                backgroundColor: 'action.hover',
                fontWeight: typography.weight.medium,
              }}
            />
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {awayAbbr}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: '0.8125rem',
                }}
              >
                {awayWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={awayWinProb}
              sx={{
                height: 4,
                borderRadius: 0.5,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                  borderRadius: 0.5,
                },
              }}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {homeAbbr}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: '0.8125rem',
                }}
              >
                {homeWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={homeWinProb}
              sx={{
                height: 4,
                borderRadius: 0.5,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: 0.5,
                },
              }}
            />
          </Box>
        </Box>

        {/* Predicted Score */}
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            backgroundColor: 'action.hover',
            mb: 2.5,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: 1.5,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Predicted Score
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: '1.5rem',
                }}
              >
                {prediction.predicted_away_score.toFixed(0)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.6875rem' }}
              >
                {awayAbbr}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: '1rem' }}
            >
              -
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: '1.5rem',
                }}
              >
                {prediction.predicted_home_score.toFixed(0)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.6875rem' }}
              >
                {homeAbbr}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Insights */}
        {prediction.insights.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: typography.weight.semibold,
                mb: 1.5,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'text.secondary',
              }}
            >
              Insights
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {prediction.insights.slice(0, 3).map((insight, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.weight.semibold,
                      mb: 0.5,
                      fontSize: '0.8125rem',
                      color: 'text.primary',
                    }}
                  >
                    {insight.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {insight.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Probability Breakdown */}
        <Box sx={{ mt: 'auto' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: typography.weight.semibold,
              mb: 1.5,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            }}
          >
            Probability Breakdown
          </Typography>
          <Box 
            sx={{ 
              position: 'relative', 
              height: 180, 
              width: '100%', 
              overflow: 'visible',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={probChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  labelLine={false}
                  style={{
                    fontSize: '0.6875rem',
                    fill: theme.palette.text.primary,
                    fontWeight: typography.weight.medium,
                  }}
                >
                  {probChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                      stroke={theme.palette.background.paper}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value?: number) => value !== undefined ? `${value.toFixed(1)}%` : ''}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    fontSize: '0.8125rem',
                    color: theme.palette.text.primary,
                  }}
                  labelStyle={{
                    color: theme.palette.text.primary,
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
