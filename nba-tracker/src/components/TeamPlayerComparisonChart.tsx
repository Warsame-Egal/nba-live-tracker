import React, { useMemo } from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TeamPlayerStatsResponse, TeamPlayerStat } from '../types/teamplayerstats';
import { typography, borderRadius } from '../theme/designTokens';

interface TeamLeaders {
  points: TeamPlayerStat;
  rebounds: TeamPlayerStat;
  assists: TeamPlayerStat;
  steals: TeamPlayerStat;
  blocks: TeamPlayerStat;
}

interface TeamPlayerComparisonChartProps {
  data: TeamPlayerStatsResponse;
  teamLeaders: TeamLeaders;
}

const TeamPlayerComparisonChart: React.FC<TeamPlayerComparisonChartProps> = ({ data, teamLeaders }) => {
  const theme = useTheme();

  // Get top 5 players from team leaders
  const topPlayers = useMemo(() => {
    if (!data.players || data.players.length === 0 || !teamLeaders) return [];

    // Get unique player IDs from all team leaders
    const leaderPlayerIds = new Set([
      teamLeaders.points.player_id,
      teamLeaders.rebounds.player_id,
      teamLeaders.assists.player_id,
      teamLeaders.steals.player_id,
      teamLeaders.blocks.player_id,
    ]);

    // Get player data for these leaders and calculate per-game averages
    const leaderPlayers = Array.from(leaderPlayerIds)
      .map(playerId => {
        const player = data.players.find(p => p.player_id === playerId);
        if (!player || player.games_played === 0) return null;
        
        return {
          ...player,
          pointsPerGame: player.points / player.games_played,
          reboundsPerGame: player.rebounds / player.games_played,
          assistsPerGame: player.assists / player.games_played,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.pointsPerGame - a.pointsPerGame)
      .slice(0, 5)
      .map(player => ({
        name: player.player_name.length > 18 
          ? player.player_name.substring(0, 15) + '...' 
          : player.player_name,
        fullName: player.player_name,
        Points: Number(player.pointsPerGame.toFixed(1)),
        Rebounds: Number(player.reboundsPerGame.toFixed(1)),
        Assists: Number(player.assistsPerGame.toFixed(1)),
      }));

    return leaderPlayers;
  }, [data.players, teamLeaders]);

  if (topPlayers.length === 0) {
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
          No player data available
        </Typography>
      </Paper>
    );
  }

  // Professional data visualization color scheme
  const pointsColor = '#2563eb'; // Deep Blue
  const reboundsColor = '#059669'; // Forest Green
  const assistsColor = '#dc2626'; // Red

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
        Top Players Performance
      </Typography>

      <ResponsiveContainer width="100%" height={480}>
        <BarChart
          data={topPlayers}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
            strokeOpacity={0.2}
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: typography.weight.medium,
            }}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            label={{
              value: 'Per Game',
              position: 'insideBottom',
              offset: -5,
              style: {
                fill: theme.palette.text.secondary,
                fontWeight: typography.weight.semibold,
                fontSize: '0.875rem',
              },
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.primary,
              fontSize: '0.875rem',
              fontWeight: typography.weight.semibold,
            }}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            width={90}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const dataPoint = topPlayers.find(p => p.name === label);
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
                      {dataPoint?.fullName || label}
                    </Typography>
                    {payload.map((entry, index) => {
                      const color = entry.dataKey === 'Points' 
                        ? pointsColor 
                        : entry.dataKey === 'Rebounds' 
                        ? reboundsColor 
                        : assistsColor;
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
            cursor={{ fill: theme.palette.action.hover }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '24px' }}
            formatter={(value) => (
              <span style={{ color: theme.palette.text.primary, fontSize: '0.875rem' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="Points"
            fill={pointsColor}
            radius={[0, 8, 8, 0]}
            animationDuration={1000}
            animationBegin={0}
            stroke={pointsColor}
            strokeWidth={0}
          />
          <Bar
            dataKey="Rebounds"
            fill={reboundsColor}
            radius={[0, 8, 8, 0]}
            animationDuration={1000}
            animationBegin={150}
            stroke={reboundsColor}
            strokeWidth={0}
          />
          <Bar
            dataKey="Assists"
            fill={assistsColor}
            radius={[0, 8, 8, 0]}
            animationDuration={1000}
            animationBegin={300}
            stroke={assistsColor}
            strokeWidth={0}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default TeamPlayerComparisonChart;

