import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
} from '@mui/material';
import type { SeasonAverages, HotStreakData, EfficiencyMetrics } from '../../types/compare';

interface StatComparisonTableProps {
  player1Name: string;
  player2Name: string;
  player1Averages: SeasonAverages;
  player2Averages: SeasonAverages;
  player1HotStreak?: HotStreakData | null;
  player2HotStreak?: HotStreakData | null;
  player1Efficiency?: EfficiencyMetrics | null;
  player2Efficiency?: EfficiencyMetrics | null;
}

const EFFICIENCY_ROWS: { key: keyof EfficiencyMetrics; label: string }[] = [
  { key: 'pts_per_minute', label: 'PTS/min' },
  { key: 'ast_to_tov', label: 'AST/TOV' },
  { key: 'defensive_impact', label: 'Def impact' },
  { key: 'scoring_efficiency', label: 'Scoring eff' },
  { key: 'usage_estimate', label: 'Usage est' },
];

const STAT_ROWS: { key: keyof SeasonAverages; label: string; format: 'int' | 'float' | 'pct' }[] = [
  { key: 'gp', label: 'GP', format: 'int' },
  { key: 'min', label: 'MIN', format: 'float' },
  { key: 'pts', label: 'PTS', format: 'float' },
  { key: 'reb', label: 'REB', format: 'float' },
  { key: 'ast', label: 'AST', format: 'float' },
  { key: 'stl', label: 'STL', format: 'float' },
  { key: 'blk', label: 'BLK', format: 'float' },
  { key: 'tov', label: 'TOV', format: 'float' },
  { key: 'fg_pct', label: 'FG%', format: 'pct' },
  { key: 'fg3_pct', label: '3P%', format: 'pct' },
  { key: 'ft_pct', label: 'FT%', format: 'pct' },
  { key: 'plus_minus', label: '+/-', format: 'float' },
];

function formatVal(
  v: number,
  format: 'int' | 'float' | 'pct',
): string {
  if (format === 'pct') return (v * 100).toFixed(1) + '%';
  if (format === 'int') return String(Math.round(v));
  return v.toFixed(1);
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'hot')
    return <Chip size="small" label="Hot" sx={{ bgcolor: 'error.light', color: 'error.contrastText' }} />;
  if (trend === 'cold')
    return <Chip size="small" label="Cold" sx={{ bgcolor: 'info.light', color: 'info.contrastText' }} />;
  return <Chip size="small" label="Steady" variant="outlined" color="default" />;
}

export default function StatComparisonTable({
  player1Name,
  player2Name,
  player1Averages,
  player2Averages,
  player1HotStreak,
  player2HotStreak,
  player1Efficiency,
  player2Efficiency,
}: StatComparisonTableProps) {
  const hasEfficiency = Boolean(player1Efficiency || player2Efficiency);
  return (
    <TableContainer
      sx={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        maxWidth: '100%',
      }}
    >
      <Table size="small" stickyHeader sx={{ minWidth: 320 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Stat</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                {player1Name}
                {player1HotStreak && <TrendBadge trend={player1HotStreak.overall_trend} />}
              </Box>
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                {player2Name}
                {player2HotStreak && <TrendBadge trend={player2HotStreak.overall_trend} />}
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {STAT_ROWS.map(({ key, label, format }) => {
            const v1 = Number(player1Averages[key]);
            const v2 = Number(player2Averages[key]);
            const higher = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
            return (
              <TableRow key={key}>
                <TableCell>{label}</TableCell>
                <TableCell
                  align="right"
                  sx={higher === 1 ? { color: 'success.main', fontWeight: 600 } : {}}
                >
                  {formatVal(v1, format)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={higher === 2 ? { color: 'success.main', fontWeight: 600 } : {}}
                >
                  {formatVal(v2, format)}
                </TableCell>
              </TableRow>
            );
          })}
          {hasEfficiency &&
            EFFICIENCY_ROWS.map(({ key, label }) => {
              const v1 = player1Efficiency?.[key] ?? 0;
              const v2 = player2Efficiency?.[key] ?? 0;
              const higher = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
              return (
                <TableRow key={key}>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{label}</TableCell>
                  <TableCell
                    align="right"
                    sx={
                      higher === 1
                        ? { color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }
                        : { fontSize: '0.875rem' }
                    }
                  >
                    {typeof v1 === 'number' ? v1.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={
                      higher === 2
                        ? { color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }
                        : { fontSize: '0.875rem' }
                    }
                  >
                    {typeof v2 === 'number' ? v2.toFixed(2) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          {(player1HotStreak?.summary || player2HotStreak?.summary) && (
            <TableRow>
              <TableCell sx={{ fontWeight: 500 }}>Form (last 5)</TableCell>
              <TableCell
                align="right"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  maxWidth: { xs: 140, sm: 'none' },
                }}
              >
                {player1HotStreak?.summary ?? '—'}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  maxWidth: { xs: 140, sm: 'none' },
                }}
              >
                {player2HotStreak?.summary ?? '—'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
