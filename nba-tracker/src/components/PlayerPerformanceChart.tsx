import React, { useMemo } from 'react';
import { Paper, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { PlayerGameLogResponse } from '../types/playergamelog';
import { format, parseISO } from 'date-fns';
import { typography, borderRadius } from '../theme/designTokens';

interface PlayerPerformanceChartProps {
  data: PlayerGameLogResponse;
}

const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data.games || data.games.length === 0) return [];

    const recentGames = [...data.games].slice(0, 20).reverse();

    return recentGames.map(game => {
      const date = parseISO(game.game_date);
      return {
        date: format(date, 'MMM d'),
        fullDate: game.game_date,
        Points: game.points,
        Rebounds: game.rebounds,
        Assists: game.assists,
      };
    });
  }, [data.games]);

  const averages = useMemo(() => {
    if (chartData.length === 0) return { Points: 0, Rebounds: 0, Assists: 0 };

    const totals = chartData.reduce(
      (acc, game) => ({
        Points: acc.Points + game.Points,
        Rebounds: acc.Rebounds + game.Rebounds,
        Assists: acc.Assists + game.Assists,
      }),
      { Points: 0, Rebounds: 0, Assists: 0 }
    );

    return {
      Points: totals.Points / chartData.length,
      Rebounds: totals.Rebounds / chartData.length,
      Assists: totals.Assists / chartData.length,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
        }}
      >
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No game data available
        </Typography>
      </Paper>
    );
  }

  const maxPoints = Math.max(...chartData.map(d => d.Points), 0);
  const maxRebounds = Math.max(...chartData.map(d => d.Rebounds), 0);
  const maxAssists = Math.max(...chartData.map(d => d.Assists), 0);
  const maxValue = Math.max(maxPoints, maxRebounds * 2, maxAssists * 2);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.md,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: typography.weight.bold,
          mb: 3,
          fontSize: typography.size.h6,
        }}
      >
        Recent Performance Trend
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 10, right: 40, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="date"
            stroke="currentColor"
            style={{ fill: 'currentColor', fontSize: '0.75rem' }}
          />
          <YAxis
            yAxisId="left"
            stroke="currentColor"
            style={{ fill: 'currentColor', fontSize: '0.75rem' }}
            domain={[0, Math.ceil(maxValue * 1.1)]}
            label={{ value: 'Points', angle: -90, position: 'insideLeft', style: { fill: 'currentColor' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="currentColor"
            style={{ fill: 'currentColor', fontSize: '0.75rem' }}
            domain={[0, Math.ceil(maxValue * 0.6)]}
            label={{ value: 'Rebounds / Assists', angle: 90, position: 'insideRight', style: { fill: 'currentColor' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.sm,
            }}
            labelStyle={{ color: 'text.primary', fontWeight: typography.weight.semibold }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <ReferenceLine
            yAxisId="left"
            y={averages.Points}
            stroke="#1976d2"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            yAxisId="right"
            y={averages.Rebounds}
            stroke="#2e7d32"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            yAxisId="right"
            y={averages.Assists}
            stroke="#ed6c02"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Points"
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={`Points (Avg: ${averages.Points.toFixed(1)})`}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Rebounds"
            stroke="#2e7d32"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={`Rebounds (Avg: ${averages.Rebounds.toFixed(1)})`}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Assists"
            stroke="#ed6c02"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={`Assists (Avg: ${averages.Assists.toFixed(1)})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PlayerPerformanceChart;

