import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { WinProbabilityDict } from '../../types/gameDetail';
import { borderRadius } from '../../theme/designTokens';

interface WinProbabilityChartProps {
  winProbability: WinProbabilityDict | null;
  homeTeamName?: string;
  awayTeamName?: string;
  /** Team primary colors for areas: [away, home]. Applied when provided (File 4.7). */
  homeColor?: string;
  awayColor?: string;
  /** Game status: 'live' | 'completed' | 'upcoming'. Used for empty-state message. */
  status?: string;
}

interface ChartPoint {
  index: number;
  label: string;
  homePct: number;
  awayPct: number;
}

/**
 * Win probability area chart showing how the probability changed over game time.
 * Uses probability_history when available; falls back to summary home/away percentages.
 */
const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
  winProbability,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  homeColor,
  status,
}) => {
  const theme = useTheme();
  const homeStroke = homeColor ?? theme.palette.primary.main;

  const chartData = useMemo((): ChartPoint[] => {
    const history = winProbability?.probability_history;
    if (!history || !Array.isArray(history) || history.length === 0) return [];
    return history.map((entry, i) => {
      const home = Number(entry.home_win_prob ?? 0);
      const away = Number(entry.away_win_prob ?? 0);
      const eventNum = entry.event_num != null ? String(entry.event_num) : null;
      return {
        index: i,
        label: eventNum != null ? `Play ${eventNum}` : `#${i + 1}`,
        homePct: home * 100,
        awayPct: away * 100,
      };
    });
  }, [winProbability?.probability_history]);

  if (!winProbability) {
    const statusNorm = (status ?? '').toLowerCase();
    const message =
      statusNorm === 'live'
        ? 'Win probability data is loading. It may appear as the game progresses.'
        : statusNorm === 'completed'
          ? 'Win probability data is not available for this game.'
          : 'Win probability will be available once the game starts.';
    return (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    );
  }

  if (chartData.length > 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.lg,
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                tickLine={false}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                tickFormatter={v => `${v}%`}
                tickLine={false}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip
                formatter={(value: number | undefined) => [value != null ? `${value.toFixed(1)}%` : '', '']}
                labelFormatter={label => label}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as ChartPoint;
                  return (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        backgroundColor: theme.palette.background.paper,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" display="block" fontWeight={600}>
                        {label}
                      </Typography>
                      <Typography variant="caption" color="primary">
                        {homeTeamName}: {p.homePct.toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {awayTeamName}: {p.awayPct.toFixed(1)}%
                      </Typography>
                    </Paper>
                  );
                }}
              />
              <ReferenceLine
                y={50}
                stroke={theme.palette.text.disabled}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="homePct"
                name={homeTeamName}
                stroke={homeStroke}
                fill={homeStroke}
                fillOpacity={0.35}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    );
  }

  // Fallback: summary only (two numbers)
  const homePct = ((winProbability.home_win_prob ?? 0) * 100).toFixed(1);
  const awayPct = ((winProbability.away_win_prob ?? 0) * 100).toFixed(1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        {homeTeamName}: {homePct}%
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {awayTeamName}: {awayPct}%
      </Typography>
    </Box>
  );
};

export default WinProbabilityChart;
