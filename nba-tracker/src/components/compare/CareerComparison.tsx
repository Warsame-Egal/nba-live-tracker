import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Box,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import { responsiveSpacing } from '../../theme/designTokens';
import type { CareerSummary } from '../../types/compare';

interface CareerComparisonProps {
  player1Name: string;
  player2Name: string;
  player1Career: CareerSummary | null;
  player2Career: CareerSummary | null;
}

export default function CareerComparison({
  player1Name,
  player2Name,
  player1Career,
  player2Career,
}: CareerComparisonProps) {
  const hasAny = Boolean(player1Career?.seasons_played || player2Career?.seasons_played);

  const chartData = useMemo(() => {
    const seasonsSet = new Set<string>();
    (player1Career?.seasons ?? []).forEach(s => seasonsSet.add(s.season));
    (player2Career?.seasons ?? []).forEach(s => seasonsSet.add(s.season));
    const sorted = Array.from(seasonsSet).sort();
    const p1BySeason = new Map((player1Career?.seasons ?? []).map(s => [s.season, s.pts]));
    const p2BySeason = new Map((player2Career?.seasons ?? []).map(s => [s.season, s.pts]));
    return sorted.map(season => ({
      season,
      [player1Name]: p1BySeason.get(season) ?? null,
      [player2Name]: p2BySeason.get(season) ?? null,
    }));
  }, [player1Career?.seasons, player2Career?.seasons, player1Name, player2Name]);

  if (!hasAny) {
    return (
      <Box sx={{ py: responsiveSpacing.section }}>
        <Typography color="text.secondary">Career data unavailable for both players.</Typography>
      </Box>
    );
  }

  const p1Avg = player1Career?.career_averages?.pts ?? 0;
  const p2Avg = player2Career?.career_averages?.pts ?? 0;
  const p1Totals = player1Career?.career_totals ?? {};
  const p2Totals = player2Career?.career_totals ?? {};
  const p1Peak = player1Career?.peak_season?.pts ?? 0;
  const p2Peak = player2Career?.peak_season?.pts ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: responsiveSpacing.section }}>
      {/* Career numbers table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 280 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Stat</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{player1Name}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{player2Name}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Seasons played</TableCell>
              <TableCell align="center">{player1Career?.seasons_played ?? '—'}</TableCell>
              <TableCell align="center">{player2Career?.seasons_played ?? '—'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Career PPG</TableCell>
              <TableCell align="center">{p1Avg ? p1Avg.toFixed(1) : '—'}</TableCell>
              <TableCell align="center">{p2Avg ? p2Avg.toFixed(1) : '—'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total points</TableCell>
              <TableCell align="center">{p1Totals.pts ?? '—'}</TableCell>
              <TableCell align="center">{p2Totals.pts ?? '—'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total rebounds</TableCell>
              <TableCell align="center">{p1Totals.reb ?? '—'}</TableCell>
              <TableCell align="center">{p2Totals.reb ?? '—'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total assists</TableCell>
              <TableCell align="center">{p1Totals.ast ?? '—'}</TableCell>
              <TableCell align="center">{p2Totals.ast ?? '—'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Peak season PPG</TableCell>
              <TableCell align="center">{p1Peak ? p1Peak.toFixed(1) : '—'}</TableCell>
              <TableCell align="center">{p2Peak ? p2Peak.toFixed(1) : '—'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Career arc chart */}
      {chartData.length > 0 && (
        <Card variant="outlined">
          <CardContent sx={{ p: responsiveSpacing.card }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              PPG by season
            </Typography>
            <Box sx={{ width: '100%', height: { xs: 280, sm: 320, md: 360 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="divider" />
                  <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number | undefined) => (value != null ? value.toFixed(1) : '—')} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={player1Name}
                    stroke="var(--chart-p1, #2196f3)"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey={player2Name}
                    stroke="var(--chart-p2, #ff9800)"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Peak season callouts + consistency */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {player1Career?.peak_season && (
          <Card variant="outlined">
            <CardContent sx={{ p: responsiveSpacing.card }}>
              <Typography variant="caption" color="text.secondary">
                {player1Name} — Peak season
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {player1Career.peak_season.season} ({player1Career.peak_season.team})
              </Typography>
              <Typography variant="body2">
                {player1Career.peak_season.pts.toFixed(1)} PPG · {player1Career.peak_season.reb.toFixed(1)} REB ·{' '}
                {player1Career.peak_season.ast.toFixed(1)} AST · {player1Career.peak_season.gp} GP
              </Typography>
              {player1Career.consistency_score >= 90 && (
                <Chip
                  size="small"
                  label={`Elite consistency: ${player1Career.consistency_score}% seasons 20+ PPG`}
                  sx={{ mt: 1 }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </CardContent>
          </Card>
        )}
        {player2Career?.peak_season && (
          <Card variant="outlined">
            <CardContent sx={{ p: responsiveSpacing.card }}>
              <Typography variant="caption" color="text.secondary">
                {player2Name} — Peak season
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {player2Career.peak_season.season} ({player2Career.peak_season.team})
              </Typography>
              <Typography variant="body2">
                {player2Career.peak_season.pts.toFixed(1)} PPG · {player2Career.peak_season.reb.toFixed(1)} REB ·{' '}
                {player2Career.peak_season.ast.toFixed(1)} AST · {player2Career.peak_season.gp} GP
              </Typography>
              {player2Career.consistency_score >= 90 && (
                <Chip
                  size="small"
                  label={`Elite consistency: ${player2Career.consistency_score}% seasons 20+ PPG`}
                  sx={{ mt: 1 }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
