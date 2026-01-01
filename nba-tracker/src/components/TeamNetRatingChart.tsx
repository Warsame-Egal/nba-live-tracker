import React, { useMemo } from 'react';
import { Paper, Typography, Box, Avatar, useTheme } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TeamStatsResponse } from '../types/teamstats';
import { typography, borderRadius } from '../theme/designTokens';
import { useNavigate } from 'react-router-dom';

interface TeamNetRatingChartProps {
  data: TeamStatsResponse;
}

const TeamNetRatingChart: React.FC<TeamNetRatingChartProps> = ({ data }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Get net rating category
  const netRatingCategory = useMemo(() => {
    return data.categories.find(cat => cat.category_name === 'Net Rating');
  }, [data.categories]);

  const chartData = useMemo(() => {
    if (!netRatingCategory || !netRatingCategory.teams) return [];

    // Get team abbreviation helper
    const getTeamAbbreviation = (teamName: string, abbreviation?: string): string => {
      if (abbreviation) return abbreviation;
      const teamMappings: { [key: string]: string } = {
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
      return teamMappings[teamName] || teamName.substring(0, 3).toUpperCase();
    };

    // Sort by net rating (highest to lowest) and show all teams
    return netRatingCategory.teams
      .map((team, index) => ({
        team_id: team.team_id,
        name: team.team_name,
        abbreviation: getTeamAbbreviation(team.team_name, team.team_abbreviation),
        value: team.value,
        rank: index + 1,
      }))
      .sort((a, b) => b.value - a.value)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [netRatingCategory]);

  if (!netRatingCategory || chartData.length === 0) {
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
          No net rating data available
        </Typography>
      </Paper>
    );
  }

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
        Team Net Rating
      </Typography>

      <ResponsiveContainer width="100%" height={600}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
            strokeOpacity={0.3}
            horizontal={true}
            vertical={false}
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
              value: 'Net Rating',
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
            dataKey="abbreviation"
            stroke={theme.palette.text.secondary}
            style={{
              fill: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: typography.weight.medium,
            }}
            tickLine={{ stroke: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const team = payload[0].payload;
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar
                        src={`/logos/${team.abbreviation}.svg`}
                        sx={{
                          width: 24,
                          height: 24,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/logos/default.svg';
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: typography.weight.bold,
                          color: theme.palette.text.primary,
                          fontSize: typography.size.bodySmall,
                        }}
                      >
                        {team.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: team.value >= 0 ? 'success.main' : 'error.main',
                        fontWeight: typography.weight.bold,
                        fontSize: typography.size.bodySmall,
                      }}
                    >
                      Net Rating: {team.value > 0 ? '+' : ''}{team.value.toFixed(1)}
                    </Typography>
                  </Paper>
                );
              }
              return null;
            }}
            cursor={{ fill: 'transparent' }}
          />
          <ReferenceLine x={0} stroke={theme.palette.divider} strokeDasharray="3 3" />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? theme.palette.success.main : theme.palette.error.main}
                opacity={0.8}
                onClick={() => navigate(`/team/${entry.team_id}`)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Ranked list with team logos */}
      <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: typography.weight.bold,
            mb: 2,
            fontSize: typography.size.body,
            color: 'text.secondary',
          }}
        >
          Team Rankings
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {chartData.map((team, index) => (
            <Box
              key={team.team_id}
              onClick={() => navigate(`/team/${team.team_id}`)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: borderRadius.sm,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.bold,
                  color: 'text.secondary',
                  minWidth: 32,
                  fontSize: typography.size.bodySmall,
                }}
              >
                #{index + 1}
              </Typography>
              <Avatar
                src={`/logos/${team.abbreviation}.svg`}
                sx={{
                  width: 32,
                  height: 32,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/logos/default.svg';
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: 'text.primary',
                  }}
                >
                  {team.name}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.bold,
                  color: team.value >= 0 ? 'success.main' : 'error.main',
                  fontSize: typography.size.body,
                }}
              >
                {team.value > 0 ? '+' : ''}{team.value.toFixed(1)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default TeamNetRatingChart;

