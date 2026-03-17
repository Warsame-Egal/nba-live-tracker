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
  ReferenceLine,
} from 'recharts';
import { Box, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import { responsiveSpacing } from '../../theme/designTokens';
import type { GameLogEntry, SeasonAverages } from '../../types/compare';

type StatKey = 'pts' | 'ast' | 'reb';

interface TrendChartProps {
  player1Name: string;
  player2Name: string;
  player1Games: GameLogEntry[];
  player2Games: GameLogEntry[];
  player1Averages?: SeasonAverages | null;
  player2Averages?: SeasonAverages | null;
  stat: StatKey;
  onStatChange: (s: StatKey) => void;
  lastNGames: 10 | 20 | 30;
  onLastNGamesChange: (n: 10 | 20 | 30) => void;
}

const STAT_LABEL: Record<StatKey, string> = {
  pts: 'Points',
  ast: 'Assists',
  reb: 'Rebounds',
};

export default function TrendChart({
  player1Name,
  player2Name,
  player1Games,
  player2Games,
  player1Averages,
  player2Averages,
  stat,
  onStatChange,
  lastNGames,
  onLastNGamesChange,
}: TrendChartProps) {
  const p1 = useMemo(
    () => player1Games.slice(-lastNGames).map(g => ({ date: g.date, [player1Name]: g[stat] })),
    [player1Games, player1Name, stat, lastNGames],
  );
  const p2 = useMemo(
    () => player2Games.slice(-lastNGames).map(g => ({ date: g.date, [player2Name]: g[stat] })),
    [player2Games, player2Name, stat, lastNGames],
  );

  const dates = useMemo(() => {
    const set = new Set<string>();
    p1.forEach(d => set.add(d.date));
    p2.forEach(d => set.add(d.date));
    return Array.from(set).sort();
  }, [p1, p2]);

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; [key: string]: string | number }> = {};
    dates.forEach(d => {
      byDate[d] = { date: d };
    });
    p1.forEach(row => {
      if (byDate[row.date]) byDate[row.date][player1Name] = row[player1Name];
    });
    p2.forEach(row => {
      if (byDate[row.date]) byDate[row.date][player2Name] = row[player2Name];
    });
    return Object.values(byDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [dates, p1, p2, player1Name, player2Name]);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: responsiveSpacing.gapCompact,
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: responsiveSpacing.elementCompact,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2">Stat:</Typography>
          <ToggleButtonGroup
            size="small"
            value={stat}
            exclusive
            onChange={(_, v) => v != null && onStatChange(v)}
          >
            <ToggleButton value="pts">{STAT_LABEL.pts}</ToggleButton>
            <ToggleButton value="ast">{STAT_LABEL.ast}</ToggleButton>
            <ToggleButton value="reb">{STAT_LABEL.reb}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2">Games:</Typography>
          <ToggleButtonGroup
            size="small"
            value={lastNGames}
            exclusive
            onChange={(_, v) => v != null && onLastNGamesChange(v)}
          >
            <ToggleButton value={10}>10</ToggleButton>
            <ToggleButton value={20}>20</ToggleButton>
            <ToggleButton value={30}>30</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Box sx={{ width: '100%', height: { xs: 260, sm: 300 }, minHeight: { xs: 260, sm: 300 } }}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {player1Averages != null && (
            <ReferenceLine
              y={Number(player1Averages[stat])}
              stroke="hsl(220, 70%, 50%)"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
              label={{ value: `${player1Name} avg`, position: 'right', fontSize: 10 }}
            />
          )}
          {player2Averages != null && (
            <ReferenceLine
              y={Number(player2Averages[stat])}
              stroke="hsl(30, 70%, 50%)"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
              label={{ value: `${player2Name} avg`, position: 'right', fontSize: 10 }}
            />
          )}
          <Line
            type="monotone"
            dataKey={player1Name}
            stroke="hsl(220, 70%, 50%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={player2Name}
            stroke="hsl(30, 70%, 50%)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
