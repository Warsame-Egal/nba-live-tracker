/**
 * Momentum Chart Component
 * 
 * Visualizes game momentum by showing score differential over time. Displays:
 * - Score differential (home - away) as an area chart
 * - Lead changes (when differential crosses zero)
 * - Scoring runs (6+ points in 2 minutes)
 * 
 * This component processes play-by-play data to create a timeline showing how
 * the game flow changed over time. Positive values mean home team is leading,
 * negative values mean away team is leading.
 * 
 * Used in the GameRow component when users click the "Momentum" button to
 * expand the visualization for a live or completed game.
 */

import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import { PlayByPlayEvent } from '../types/playbyplay';
import { typography, borderRadius } from '../theme/designTokens';

interface MomentumChartProps {
  plays: PlayByPlayEvent[]; // Play-by-play events from the game
  homeTeam: string; // Home team name for display
  awayTeam: string; // Away team name for display
}

interface MomentumDataPoint {
  time: string; // Formatted game time (e.g., "Q1 10:00", "Q2 5:30")
  gameTime: number; // Total game time in minutes for sorting
  differential: number; // home - away
  homeScore: number;
  awayScore: number;
  isLeadChange: boolean;
  isScoringRun: boolean;
  period: number;
  clock: string;
}

/**
 * Parse ISO 8601 clock string (e.g., "PT12M00.00S") to minutes.
 * 
 * NBA API returns clock time in ISO 8601 duration format. This converts it
 * to a decimal number of minutes for easier calculations.
 */
const parseClockToMinutes = (clock: string): number => {
  try {
    // Remove PT prefix and S suffix
    const cleaned = clock.replace('PT', '').replace('S', '');
    const parts = cleaned.split('M');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes + seconds / 60;
    }
    return 0;
  } catch {
    return 0;
  }
};

/**
 * Format game time for display on the chart X-axis.
 * 
 * Converts period and clock to a readable format like "Q1 10:00" or "OT1 2:30".
 * This makes it easy to see when in the game each data point occurred.
 */
const formatGameTime = (period: number, clock: string): string => {
  const minutes = parseClockToMinutes(clock);
  const periodLabel = period <= 4 ? `Q${period}` : `OT${period - 4}`;
  const minutesInt = Math.floor(minutes);
  const secondsInt = Math.floor((minutes - minutesInt) * 60);
  return `${periodLabel} ${minutesInt}:${secondsInt.toString().padStart(2, '0')}`;
};

/**
 * Calculate total game time in minutes for sorting data points chronologically.
 * 
 * Each regulation period is 12 minutes, overtime periods are 5 minutes.
 * This gives us a continuous timeline from game start to end, which is needed
 * to properly sort and display plays in order.
 */
const calculateGameTime = (period: number, clock: string): number => {
  const minutes = parseClockToMinutes(clock);
  // Each period is 12 minutes (regulation) or 5 minutes (OT)
  const periodLength = period <= 4 ? 12 : 5;
  const previousPeriods = period <= 4 
    ? (period - 1) * 12 
    : 4 * 12 + (period - 5) * 5;
  return previousPeriods + (periodLength - minutes);
};

/**
 * Parse score string to number, handling missing or invalid values.
 * 
 * Some plays might not have score data, so we return 0 as a fallback.
 */
const parseScore = (score: string | undefined): number => {
  if (!score) return 0;
  const parsed = parseInt(score, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Detect scoring runs (6+ points in 2 minutes).
 * 
 * A scoring run is when a team scores 6 or more points within a 2-minute window.
 * This helps identify momentum shifts where one team is on a hot streak.
 * 
 * Returns a set of indices for data points that are part of scoring runs.
 */
const detectScoringRuns = (dataPoints: MomentumDataPoint[]): Set<number> => {
  const scoringRunIndices = new Set<number>();
  
  for (let i = 0; i < dataPoints.length; i++) {
    const currentPoint = dataPoints[i];
    let pointsScored = 0;
    let startIndex = i;
    
    // Look back to find when this scoring run started
    for (let j = i; j >= 0; j--) {
      const prevPoint = dataPoints[j];
      const timeDiff = currentPoint.gameTime - prevPoint.gameTime;
      
      // If more than 2 minutes apart, stop looking
      if (timeDiff > 2) break;
      
      // Check if same team scored
      const scoreDiff = Math.abs(
        (currentPoint.homeScore - prevPoint.homeScore) + 
        (currentPoint.awayScore - prevPoint.awayScore)
      );
      
      if (scoreDiff > 0) {
        pointsScored += scoreDiff;
        startIndex = j;
      }
    }
    
    // If 6+ points in 2 minutes, mark as scoring run
    if (pointsScored >= 6) {
      for (let k = startIndex; k <= i; k++) {
        scoringRunIndices.add(k);
      }
    }
  }
  
  return scoringRunIndices;
};

/**
 * Momentum Chart Component
 * 
 * Processes play-by-play events and renders a visual timeline showing:
 * - Score differential over time (home score - away score)
 * - Lead changes (marked with warning-colored dots)
 * - Scoring runs (highlighted regions)
 * 
 * The chart uses an area chart where:
 * - Positive values (above zero line) = home team leading
 * - Negative values (below zero line) = away team leading
 * - Zero line = game is tied
 */
const MomentumChart: React.FC<MomentumChartProps> = ({ plays, homeTeam, awayTeam }) => {
  const theme = useTheme();

  // Process play-by-play data into chart data points
  // This memoization ensures we only recalculate when plays change
  const chartData = useMemo(() => {
    if (!plays || plays.length === 0) return [];

    // Sort plays by action number (chronological order)
    const sortedPlays = [...plays].sort((a, b) => a.action_number - b.action_number);

    const dataPoints: MomentumDataPoint[] = [];
    let previousHomeScore = 0;
    let previousAwayScore = 0;
    let previousDifferential = 0;

    for (const play of sortedPlays) {
      const homeScore = parseScore(play.score_home);
      const awayScore = parseScore(play.score_away);
      
      // Use previous score if current score is missing
      const currentHomeScore = homeScore || previousHomeScore;
      const currentAwayScore = awayScore || previousAwayScore;
      
      const differential = currentHomeScore - currentAwayScore;
      const gameTime = calculateGameTime(play.period, play.clock);
      const timeLabel = formatGameTime(play.period, play.clock);
      
      // Detect lead change (differential crosses zero)
      const isLeadChange = 
        previousDifferential !== 0 && 
        ((previousDifferential > 0 && differential <= 0) || 
         (previousDifferential < 0 && differential >= 0));

      dataPoints.push({
        time: timeLabel,
        gameTime,
        differential,
        homeScore: currentHomeScore,
        awayScore: currentAwayScore,
        isLeadChange,
        isScoringRun: false, // Will be set after all points are created
        period: play.period,
        clock: play.clock,
      });

      previousHomeScore = currentHomeScore;
      previousAwayScore = currentAwayScore;
      previousDifferential = differential;
    }

    // Detect scoring runs
    const scoringRunIndices = detectScoringRuns(dataPoints);
    scoringRunIndices.forEach(index => {
      if (dataPoints[index]) {
        dataPoints[index].isScoringRun = true;
      }
    });

    return dataPoints;
  }, [plays]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MomentumDataPoint;
      const leadingTeam = data.differential > 0 ? homeTeam : awayTeam;
      const lead = Math.abs(data.differential);
      
      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            backgroundColor: theme.palette.background.paper,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: typography.weight.semibold, display: 'block', mb: 0.5 }}>
            {data.time}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {homeTeam}: {data.homeScore} | {awayTeam}: {data.awayScore}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {leadingTeam} leading by {lead}
          </Typography>
          {data.isLeadChange && (
            <Typography variant="caption" sx={{ color: theme.palette.primary.main, display: 'block', mt: 0.5 }}>
              Lead Change
            </Typography>
          )}
          {data.isScoringRun && (
            <Typography variant="caption" sx={{ color: theme.palette.warning.main, display: 'block', mt: 0.5 }}>
              Scoring Run
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

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
          No play-by-play data available
        </Typography>
      </Paper>
    );
  }

  // Need at least 2 data points for a chart
  if (chartData.length < 2) {
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
          Not enough data to display momentum chart
        </Typography>
      </Paper>
    );
  }

  const homeColor = theme.palette.primary.main;
  const awayColor = alpha(theme.palette.secondary.main, 0.6);
  const gridColor = theme.palette.divider;
  const textColor = theme.palette.text.secondary;

  // Find max absolute differential for Y-axis range
  const maxDifferential = Math.max(
    ...chartData.map(d => Math.abs(d.differential)),
    10 // Minimum range of 10
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.md,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 2,
          fontWeight: typography.weight.semibold,
          color: 'text.primary',
        }}
      >
        Game Momentum
      </Typography>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <defs>
            <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={homeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={homeColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="awayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={awayColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={awayColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
          
          <XAxis
            dataKey="time"
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          
          <YAxis
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 11 }}
            domain={[-maxDifferential, maxDifferential]}
            label={{ 
              value: 'Score Differential', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: textColor, fontSize: 11 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Zero line (tied game) */}
          <ReferenceLine y={0} stroke={textColor} strokeDasharray="2 2" opacity={0.5} />
          
          {/* Area chart showing differential */}
          <Area
            type="monotone"
            dataKey="differential"
            stroke={homeColor}
            strokeWidth={2}
            fill="url(#homeGradient)"
            isAnimationActive={false}
          />
          
          {/* Markers for lead changes */}
          {chartData.map((point, index) => 
            point.isLeadChange ? (
              <Dot
                key={`lead-change-${index}`}
                cx={undefined}
                cy={undefined}
                r={4}
                fill={theme.palette.warning.main}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
              />
            ) : null
          )}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: homeColor,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {homeTeam} leading
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: awayColor,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {awayTeam} leading
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.palette.warning.main,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Lead change
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MomentumChart;

