import React, { useMemo } from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import {
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TeamGameLogResponse } from '../types/teamgamelog';
import { format, parseISO } from 'date-fns';
import { typography, borderRadius } from '../theme/designTokens';

interface TeamPerformanceChartProps {
  data: TeamGameLogResponse;
}

const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({ data }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data.games || data.games.length === 0) return [];

    const recentGames = [...data.games].slice(0, 20).reverse();

    return recentGames.map(game => {
      const date = parseISO(game.game_date);
      // Calculate EPI: Points + Rebounds + Assists + Steals + Blocks - Turnovers
      const epi = game.points + game.rebounds + game.assists + game.steals + game.blocks - game.turnovers;
      return {
        date: format(date, 'MMM d'),
        fullDate: game.game_date,
        Points: game.points,
        EPI: Math.max(0, epi), // Ensure non-negative
      };
    });
  }, [data.games]);

  const averages = useMemo(() => {
    if (chartData.length === 0) return { Points: 0, EPI: 0 };

    const totals = chartData.reduce(
      (acc, game) => ({
        Points: acc.Points + game.Points,
        EPI: acc.EPI + game.EPI,
      }),
      { Points: 0, EPI: 0 }
    );

    return {
      Points: totals.Points / chartData.length,
      EPI: totals.EPI / chartData.length,
    };
  }, [chartData]);

  const maxPoints = useMemo(() => Math.max(...chartData.map(d => d.Points), 0), [chartData]);
  const maxEPI = useMemo(() => Math.max(...chartData.map(d => d.EPI), 0), [chartData]);

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

  // Color scheme matching reference
  const pointsColor = '#1976d2'; // Blue
  const epiColor = '#2e7d32'; // Green

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
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
          color: 'text.primary',
        }}
      >
        Recent Performance Trend
      </Typography>

      <ResponsiveContainer width="100%" height={420}>
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 50, left: 30, bottom: 40 }}
        >
          <defs>
            <linearGradient id="teamPointsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={pointsColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={pointsColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: typography.weight.medium,
            }}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            angle={0}
            textAnchor="middle"
            height={50}
          />
          <YAxis
            yAxisId="left"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: typography.weight.medium,
            }}
            domain={[0, Math.ceil(maxPoints * 1.1)]}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            label={{
              value: 'Points',
              angle: -90,
              position: 'insideLeft',
              style: {
                fill: pointsColor,
                fontWeight: typography.weight.semibold,
                fontSize: '0.875rem',
              },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: typography.weight.medium,
            }}
            domain={[0, Math.ceil(maxEPI * 1.1)]}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            label={{
              value: 'EPI',
              angle: 90,
              position: 'insideRight',
              style: {
                fill: epiColor,
                fontWeight: typography.weight.semibold,
                fontSize: '0.875rem',
              },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <Paper
                    elevation={8}
                    sx={{
                      p: 1.5,
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: borderRadius.sm,
                      boxShadow: theme.palette.mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: typography.weight.bold,
                        color: theme.palette.text.primary,
                        mb: 1,
                        fontSize: typography.size.bodySmall,
                      }}
                    >
                      {label}
                    </Typography>
                    {payload.map((entry, index) => {
                      const color = entry.dataKey === 'Points' ? pointsColor : epiColor;
                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: color,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: typography.size.bodySmall,
                              minWidth: 80,
                            }}
                          >
                            {entry.name}:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: typography.weight.bold,
                              color: color,
                              fontSize: typography.size.bodySmall,
                            }}
                          >
                            {entry.value?.toFixed(1) || 'N/A'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Paper>
                );
              }
              return null;
            }}
            cursor={{ stroke: theme.palette.divider, strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '24px' }}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: theme.palette.text.primary, fontSize: '0.875rem' }}>{value}</span>
            )}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="Points"
            stroke={pointsColor}
            fill="url(#teamPointsGradient)"
            strokeWidth={2}
            dot={{ r: 4, fill: pointsColor, strokeWidth: 1, stroke: theme.palette.background.paper }}
            activeDot={{ r: 6, fill: pointsColor, strokeWidth: 1, stroke: theme.palette.background.paper }}
            name={`Points (Avg: ${averages.Points.toFixed(1)})`}
            animationDuration={800}
            animationBegin={0}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="EPI"
            stroke={epiColor}
            strokeWidth={2}
            dot={{ r: 4, fill: epiColor, strokeWidth: 1, stroke: theme.palette.background.paper }}
            activeDot={{ r: 6, fill: epiColor, strokeWidth: 1, stroke: theme.palette.background.paper }}
            name={`EPI (Avg: ${averages.EPI.toFixed(1)})`}
            animationDuration={800}
            animationBegin={100}
          />
          <ReferenceLine
            yAxisId="left"
            y={averages.Points}
            stroke={pointsColor}
            strokeDasharray="5 5"
            strokeOpacity={0.4}
          />
          <ReferenceLine
            yAxisId="right"
            y={averages.EPI}
            stroke={epiColor}
            strokeDasharray="5 5"
            strokeOpacity={0.4}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default TeamPerformanceChart;

