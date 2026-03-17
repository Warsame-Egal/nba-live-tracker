import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import type { RadarData } from '../../types/compare';

interface RadarChartProps {
  player1Name: string;
  player2Name: string;
  player1Radar: RadarData;
  player2Radar: RadarData;
}

const RADAR_KEYS: { key: keyof RadarData; label: string }[] = [
  { key: 'scoring', label: 'Scoring' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'playmaking', label: 'Playmaking' },
  { key: 'rebounding', label: 'Rebounding' },
  { key: 'defense', label: 'Defense' },
  { key: 'three_point', label: '3PT' },
];

export default function RadarChart({
  player1Name,
  player2Name,
  player1Radar,
  player2Radar,
}: RadarChartProps) {
  const data = RADAR_KEYS.map(({ key, label }) => ({
    stat: label,
    [player1Name]: Math.round(Number(player1Radar[key]) * 10) / 10,
    [player2Name]: Math.round(Number(player2Radar[key]) * 10) / 10,
  }));

  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 260, sm: 300, md: 360 },
        minHeight: { xs: 260, sm: 300, md: 360 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Normalized comparison (0–100)
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name={player1Name}
            dataKey={player1Name}
            stroke="hsl(220, 70%, 50%)"
            fill="hsl(220, 70%, 50%)"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Radar
            name={player2Name}
            dataKey={player2Name}
            stroke="hsl(30, 70%, 50%)"
            fill="hsl(30, 70%, 50%)"
            fillOpacity={0.3}
            strokeWidth={2}
          />
            <Legend />
            <Tooltip />
          </RechartsRadar>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
