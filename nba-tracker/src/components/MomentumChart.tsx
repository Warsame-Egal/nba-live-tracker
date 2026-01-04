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
import { Box, Typography, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Scatter,
  Label,
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

  // Custom tooltip component - broadcast-quality design
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MomentumDataPoint;
      const leadingTeam = data.differential > 0 ? homeTeam : awayTeam;
      const lead = Math.abs(data.differential);
      const isTied = data.differential === 0;
      
      return (
        <Paper
          elevation={8}
          sx={{
            p: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(18, 18, 18, 0.95)' 
              : 'rgba(255, 255, 255, 0.98)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: borderRadius.sm,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.6)'
              : '0 8px 32px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: typography.weight.bold, 
              display: 'block', 
              mb: 1,
              fontSize: '0.8125rem',
              color: 'text.primary',
            }}
          >
            {data.time}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', fontWeight: typography.weight.medium }}>
              {homeTeam}: <strong>{data.homeScore}</strong> | {awayTeam}: <strong>{data.awayScore}</strong>
            </Typography>
            {!isTied && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: data.differential > 0 ? homeColor : awayColor, 
                  display: 'block',
                  fontWeight: typography.weight.semibold,
                }}
              >
                {leadingTeam} leading by {lead}
              </Typography>
            )}
            {isTied && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Game tied
              </Typography>
            )}
          </Box>
          {(data.isLeadChange || data.isScoringRun) && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              {data.isLeadChange && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 152, 0, 0.9)', 
                    display: 'block',
                    fontWeight: typography.weight.semibold,
                  }}
                >
                  Lead Change
                </Typography>
              )}
              {data.isScoringRun && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: theme.palette.warning.main, 
                    display: 'block',
                    fontWeight: typography.weight.semibold,
                  }}
                >
                  Scoring Run
                </Typography>
              )}
            </Box>
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

  const homeColor = theme.palette.primary.main; // Blue for home team leading
  // Use orange color for away team leading (warning color is typically orange)
  const awayColor = theme.palette.warning.main || '#ff9800';
  const gridColor = theme.palette.divider;
  const textColor = theme.palette.text.secondary;

  // Transform data to separate positive (home leading) and negative (away leading) values
  const transformedData = chartData.map(d => ({
    ...d,
    homeLeading: d.differential > 0 ? d.differential : 0,
    awayLeading: d.differential < 0 ? d.differential : 0, // Keep negative for display below zero
  }));

  // Find max absolute differential for Y-axis range
  const maxDifferential = Math.max(
    ...chartData.map(d => Math.abs(d.differential)),
    10 // Minimum range of 10
  );

  // Detect edge cases
  const hasHomeData = chartData.some(d => d.differential > 0);
  const hasAwayData = chartData.some(d => d.differential < 0);
  const hasOnlyHomeData = hasHomeData && !hasAwayData;
  const hasOnlyAwayData = hasAwayData && !hasHomeData;
  const isTiedGame = chartData.every(d => d.differential === 0);

  // Determine current leader from last data point
  const lastDataPoint = chartData[chartData.length - 1];
  const currentLeader = lastDataPoint
    ? lastDataPoint.differential > 0
      ? { team: homeTeam, lead: lastDataPoint.differential }
      : lastDataPoint.differential < 0
      ? { team: awayTeam, lead: Math.abs(lastDataPoint.differential) }
      : { team: null, lead: 0 }
    : null;

  // Find lead change points for annotations
  const leadChangePoints = useMemo(() => {
    const changes: Array<{ index: number; team: string; time: string }> = [];
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].isLeadChange) {
        const team = chartData[i].differential > 0 ? homeTeam : awayTeam;
        changes.push({
          index: i,
          team,
          time: chartData[i].time,
        });
      }
    }
    return changes;
  }, [chartData, homeTeam, awayTeam]);

  // Group data points by leading team for background shading
  const leadingSections = useMemo(() => {
    const sections: Array<{ start: number; end: number; team: 'home' | 'away' | 'tied' }> = [];
    let currentTeam: 'home' | 'away' | 'tied' = chartData[0]?.differential > 0 ? 'home' : chartData[0]?.differential < 0 ? 'away' : 'tied';
    let sectionStart = 0;

    for (let i = 1; i < chartData.length; i++) {
      const newTeam: 'home' | 'away' | 'tied' = chartData[i].differential > 0 ? 'home' : chartData[i].differential < 0 ? 'away' : 'tied';
      if (newTeam !== currentTeam) {
        if (currentTeam !== 'tied') {
          sections.push({ start: sectionStart, end: i - 1, team: currentTeam });
        }
        sectionStart = i;
        currentTeam = newTeam;
      }
    }
    // Add final section
    if (currentTeam !== 'tied' && sectionStart < chartData.length) {
      sections.push({ start: sectionStart, end: chartData.length - 1, team: currentTeam });
    }
    return sections;
  }, [chartData]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: typography.weight.semibold,
            color: 'text.primary',
          }}
        >
          Game Momentum
        </Typography>
        {/* Edge case messages */}
        {hasOnlyHomeData && (
          <Chip
            label={`Insufficient data for ${awayTeam}`}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: typography.weight.medium,
              fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
            }}
          />
        )}
        {hasOnlyAwayData && (
          <Chip
            label={`Insufficient data for ${homeTeam}`}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: typography.weight.medium,
              fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
            }}
          />
        )}
        {isTiedGame && (
          <Chip
            label="Game tied throughout"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.text.secondary, 0.1),
              color: 'text.secondary',
              fontWeight: typography.weight.medium,
              fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
            }}
          />
        )}
        {/* Current Leader Display */}
        {currentLeader && !isTiedGame && (
          <Chip
            label={
              currentLeader.team
                ? `${currentLeader.team} leading by ${currentLeader.lead}`
                : 'Game tied'
            }
            size="small"
            sx={{
              backgroundColor: currentLeader.team
                ? currentLeader.lead > 0
                  ? alpha(homeColor, 0.1)
                  : alpha(awayColor, 0.1)
                : alpha(theme.palette.text.secondary, 0.1),
              color: currentLeader.team
                ? currentLeader.lead > 0
                  ? homeColor
                  : awayColor
                : 'text.secondary',
              fontWeight: typography.weight.semibold,
              fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
              border: `1px solid ${currentLeader.team ? (currentLeader.lead > 0 ? alpha(homeColor, 0.3) : alpha(awayColor, 0.3)) : 'divider'}`,
            }}
          />
        )}
      </Box>
      
      <Box sx={{ width: '100%', height: { xs: 300, sm: 380 } }}>
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={transformedData}
          margin={{ top: 15, right: 15, left: 15, bottom: 50 }}
        >
          <defs>
            <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={homeColor} stopOpacity={0.35} />
              <stop offset="50%" stopColor={homeColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={homeColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="awayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={awayColor} stopOpacity={0.35} />
              <stop offset="50%" stopColor={awayColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={awayColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="2 4" stroke={gridColor} opacity={0.25} />
          
          <XAxis
            dataKey="time"
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={Math.max(0, Math.floor((transformedData.length - 1) / 6))}
            tickCount={7}
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
          
          {/* Background shading for leading sections */}
          {leadingSections.map((section, idx) => {
            if (section.team === 'tied') return null;
            const y1 = section.team === 'home' ? 0 : -maxDifferential;
            const y2 = section.team === 'home' ? maxDifferential : 0;
            return (
              <ReferenceArea
                key={`section-${idx}`}
                x1={transformedData[section.start]?.time}
                x2={transformedData[section.end]?.time}
                y1={y1}
                y2={y2}
                fill={section.team === 'home' ? alpha(homeColor, 0.05) : alpha(awayColor, 0.05)}
                stroke="none"
              />
            );
          })}
          
          {/* Zero line (tied game) - more prominent but neutral */}
          <ReferenceLine 
            y={0} 
            stroke={theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'} 
            strokeWidth={1.5}
            strokeDasharray="4 4" 
          />
          
          {/* Lead change annotations */}
          {leadChangePoints.map((change, idx) => {
            const dataPoint = transformedData[change.index];
            if (!dataPoint) return null;
            return (
              <ReferenceLine
                key={`lead-change-${idx}`}
                x={dataPoint.time}
                stroke={theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 152, 0, 0.6)'}
                strokeWidth={1.5}
                strokeDasharray="2 2"
                label={
                  <Label
                    value={change.team}
                    position="top"
                    offset={5}
                    style={{
                      fill: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 152, 0, 0.9)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                }
              />
            );
          })}
          
          {/* Area chart for home team leading (positive values, blue) */}
          <Area
            type="stepAfter"
            dataKey="homeLeading"
            stroke={homeColor}
            strokeWidth={2.5}
            fill="url(#homeGradient)"
            isAnimationActive={false}
            baseValue={0}
            connectNulls={false}
            strokeOpacity={hasOnlyAwayData ? 0.3 : 1}
            fillOpacity={hasOnlyAwayData ? 0.1 : 1}
          />
          
          {/* Area chart for away team leading (negative values, orange) */}
          <Area
            type="stepAfter"
            dataKey="awayLeading"
            stroke={awayColor}
            strokeWidth={2.5}
            fill="url(#awayGradient)"
            isAnimationActive={false}
            baseValue={0}
            connectNulls={false}
            strokeOpacity={hasOnlyHomeData ? 0.3 : 1}
            fillOpacity={hasOnlyHomeData ? 0.1 : 1}
          />
          
          {/* Subtle markers for lead changes */}
          <Scatter
            data={transformedData.filter((_, idx) => chartData[idx].isLeadChange)}
            dataKey="differential"
            fill={theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 152, 0, 0.8)'}
            shape={(props: any) => {
              const { cx, cy } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill={theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 152, 0, 0.9)'}
                  stroke={theme.palette.background.paper}
                  strokeWidth={1.5}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </Box>
      
      {/* Legend - premium styling */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2.5, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: homeColor,
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 0 0 1px ${homeColor}40`,
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.primary',
              fontWeight: typography.weight.medium,
              fontSize: '0.75rem',
            }}
          >
            {homeTeam} leading
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: awayColor,
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 0 0 1px ${awayColor}40`,
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.primary',
              fontWeight: typography.weight.medium,
              fontSize: '0.75rem',
            }}
          >
            {awayTeam} leading
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 152, 0, 0.9)',
              border: `1.5px solid ${theme.palette.background.paper}`,
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            Lead change
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MomentumChart;

