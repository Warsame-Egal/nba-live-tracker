import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  History,
} from '@mui/icons-material';
import { responsiveSpacing, typography, borderRadius } from '../theme/designTokens';
import { getTeamAbbreviation } from '../utils/teamMappings';

interface HistoricalPrediction {
  game_id: string;
  date: string;
  prediction: {
    home_team: string;
    away_team: string;
    predicted_winner: string;
    predicted_home_score: number;
    predicted_away_score: number;
    home_win_probability: number;
  };
  actual: {
    winner?: string;
    home_score?: number;
    away_score?: number;
  };
  accuracy: {
    win_prediction_correct?: boolean;
    score_error_home?: number;
    score_error_away?: number;
  };
}

interface HistoricalPredictionsProps {
  startDate?: string;
  endDate?: string;
  loading: boolean;
  error: string | null;
  data: {
    total_games: number;
    predictions: HistoricalPrediction[];
  } | null;
}

/**
 * Component that displays historical predictions compared with actual results.
 * Shows which predictions were correct and which were incorrect.
 */
const HistoricalPredictions: React.FC<HistoricalPredictionsProps> = ({
  loading,
  error,
  data,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: responsiveSpacing.section,
          backgroundColor: 'background.paper',
          borderRadius: borderRadius.md,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress size={32} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: responsiveSpacing.section,
          backgroundColor: 'background.paper',
          borderRadius: borderRadius.md,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Alert severity="error">Error loading historical predictions: {error}</Alert>
      </Paper>
    );
  }

  if (!data || data.predictions.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: responsiveSpacing.section,
          backgroundColor: 'background.paper',
          borderRadius: borderRadius.md,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No historical predictions available for this date range.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: responsiveSpacing.section,
        backgroundColor: 'background.paper',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        mb: responsiveSpacing.section,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <History sx={{ fontSize: 24, color: 'primary.main' }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            color: 'text.primary',
          }}
        >
          Historical Predictions
        </Typography>
        <Chip
          label={`${data.total_games} games`}
          size="small"
          variant="outlined"
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Date</TableCell>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Matchup</TableCell>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Predicted</TableCell>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Actual</TableCell>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Result</TableCell>
              <TableCell sx={{ fontWeight: typography.weight.semibold }}>Score Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.predictions.map((pred) => {
              const homeAbbr = getTeamAbbreviation(pred.prediction.home_team);
              const awayAbbr = getTeamAbbreviation(pred.prediction.away_team);
              const predictedWinnerAbbr =
                pred.prediction.predicted_winner === 'home'
                  ? homeAbbr
                  : pred.prediction.predicted_winner === 'away'
                  ? awayAbbr
                  : 'Tie';
              const actualWinnerAbbr =
                pred.actual.winner === 'home'
                  ? homeAbbr
                  : pred.actual.winner === 'away'
                  ? awayAbbr
                  : pred.actual.winner === 'tie'
                  ? 'Tie'
                  : 'N/A';

              const totalScoreError =
                (pred.accuracy.score_error_home || 0) +
                (pred.accuracy.score_error_away || 0);

              return (
                <TableRow key={pred.game_id} hover>
                  <TableCell>{pred.date}</TableCell>
                  <TableCell>
                    {awayAbbr} @ {homeAbbr}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: typography.weight.medium }}>
                        {predictedWinnerAbbr} wins
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pred.prediction.predicted_away_score} - {pred.prediction.predicted_home_score}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {pred.actual.winner ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: typography.weight.medium }}>
                          {actualWinnerAbbr} {pred.actual.winner !== 'tie' ? 'won' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pred.actual.away_score} - {pred.actual.home_score}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Game not completed
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {pred.accuracy.win_prediction_correct !== undefined ? (
                      <Chip
                        icon={
                          pred.accuracy.win_prediction_correct ? (
                            <CheckCircle sx={{ fontSize: 16 }} />
                          ) : (
                            <Cancel sx={{ fontSize: 16 }} />
                          )
                        }
                        label={pred.accuracy.win_prediction_correct ? 'Correct' : 'Incorrect'}
                        size="small"
                        sx={{
                          backgroundColor: alpha(
                            pred.accuracy.win_prediction_correct
                              ? theme.palette.success.main
                              : theme.palette.error.main,
                            0.1
                          ),
                          color: pred.accuracy.win_prediction_correct
                            ? 'success.main'
                            : 'error.main',
                        }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {totalScoreError > 0 ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            totalScoreError <= 5
                              ? 'success.main'
                              : totalScoreError <= 10
                              ? 'warning.main'
                              : 'error.main',
                        }}
                      >
                        {totalScoreError.toFixed(1)} pts
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default HistoricalPredictions;

