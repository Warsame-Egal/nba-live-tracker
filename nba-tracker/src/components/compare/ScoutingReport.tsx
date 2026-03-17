import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Button,
  Box,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from '@mui/material';
import { Refresh, ExpandMore, ExpandLess, AutoAwesome } from '@mui/icons-material';
import { responsiveSpacing } from '../../theme/designTokens';
import { useTheme, alpha } from '@mui/material/styles';

export interface FetchSummaryItem {
  status: string;
  latency_ms?: number;
  error?: string;
  cache_ttl_seconds?: number;
}

const SOURCE_LABELS: Record<string, string> = {
  player1_bio: 'Player 1 bio',
  player2_bio: 'Player 2 bio',
  player1_splits: 'Player 1 season stats',
  player2_splits: 'Player 2 season stats',
  player1_games: 'Player 1 game log',
  player2_games: 'Player 2 game log',
  head_to_head: 'Head-to-head games',
  player1_hot_streak: 'Player 1 form (last 5)',
  player2_hot_streak: 'Player 2 form (last 5)',
  player1_career: 'Player 1 career',
  player2_career: 'Player 2 career',
  player1_efficiency: 'Player 1 efficiency',
  player2_efficiency: 'Player 2 efficiency',
  scouting_report: 'AI report',
};

interface ScoutingReportProps {
  report: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  fetchSummary?: Record<string, FetchSummaryItem> | null;
}

export default function ScoutingReport({
  report,
  loading = false,
  onRefresh,
  fetchSummary,
}: ScoutingReportProps) {
  const theme = useTheme();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const cardBg = theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.primary.main, 0.03);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ backgroundColor: cardBg }}>
        <CardContent sx={{ p: responsiveSpacing.card }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <AutoAwesome sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              AI Scouting Report
            </Typography>
          </Box>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="95%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="85%" />
        </CardContent>
      </Card>
    );
  }

  if (report == null || report === '') {
    return (
      <Card variant="outlined" sx={{ backgroundColor: cardBg }}>
        <CardContent sx={{ p: responsiveSpacing.card }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <AutoAwesome sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              AI Scouting Report
            </Typography>
          </Box>
          <Typography color="text.secondary">
            AI scouting report is unavailable. This may be due to rate limits or missing API configuration.
          </Typography>
          {onRefresh && (
            <Button
              startIcon={<Refresh />}
              onClick={onRefresh}
              size="small"
              sx={{ mt: 1 }}
            >
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ backgroundColor: cardBg }}>
      <CardContent sx={{ p: responsiveSpacing.card }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <AutoAwesome sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              AI Scouting Report
            </Typography>
          </Box>
          {onRefresh && (
            <Button startIcon={<Refresh />} onClick={onRefresh} size="small">
              Regenerate
            </Button>
          )}
        </Box>
        <Typography
          component="div"
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            maxWidth: '72ch',
            lineHeight: 1.6,
          }}
        >
          {report}
        </Typography>
        {fetchSummary && Object.keys(fetchSummary).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => setSourcesOpen(o => !o)}
              endIcon={sourcesOpen ? <ExpandLess /> : <ExpandMore />}
            >
              Data sources
            </Button>
            <Collapse in={sourcesOpen}>
              <Box sx={{ overflowX: 'auto', mt: 0.5, maxWidth: '100%' }}>
                <Table size="small" sx={{ minWidth: 360 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Latency (ms)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Cache</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(fetchSummary).map(([key, val]) => (
                      <TableRow key={key}>
                        <TableCell>{SOURCE_LABELS[key] ?? key}</TableCell>
                        <TableCell>{val.status}</TableCell>
                        <TableCell align="right">{val.latency_ms ?? '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          {val.cache_ttl_seconds != null
                            ? val.cache_ttl_seconds >= 3600
                              ? `${val.cache_ttl_seconds / 3600}h`
                              : `${val.cache_ttl_seconds / 60}m`
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          {val.error ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {Object.keys(fetchSummary).length > 0 && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Total pipeline</TableCell>
                        <TableCell />
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {Object.values(fetchSummary).reduce(
                            (sum, v) => sum + (typeof v.latency_ms === 'number' ? v.latency_ms : 0),
                            0,
                          )}
                          {' ms'}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          Generated by Groq
        </Typography>
      </CardContent>
    </Card>
  );
}
