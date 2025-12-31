import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { ShotChartResponse, ShotDetail } from '../types/shotchart';
import { fetchJson } from '../utils/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ShotChartProps {
  playerId: string;
  teamId: number;
  playerName: string;
}

// Renders a shot chart showing where a player took shots on the court
// Uses X/Y coordinates from the NBA API to plot shot locations
const ShotChart: React.FC<ShotChartProps> = ({ playerId, teamId, playerName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shotData, setShotData] = useState<ShotChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState('2024-25');
  const [seasonType, setSeasonType] = useState('Regular Season');

  const COURT_WIDTH = 94;
  const COURT_HEIGHT = 50;
  const COURT_SCALE = 5;

  useEffect(() => {
    if (!playerId || !teamId) return;

    const loadShotChart = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          team_id: teamId.toString(),
          season,
          season_type: seasonType,
        });

        const data = await fetchJson<ShotChartResponse>(
          `${API_BASE_URL}/api/v1/player/${playerId}/shot-chart?${params}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setShotData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shot chart');
      } finally {
        setLoading(false);
      }
    };

    loadShotChart();
  }, [playerId, teamId, season, seasonType]);

  useEffect(() => {
    if (!shotData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = COURT_WIDTH * COURT_SCALE;
    canvas.height = COURT_HEIGHT * COURT_SCALE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt(ctx, canvas.width, canvas.height);
    shotData.shots.forEach(shot => {
      if (shot.loc_x !== null && shot.loc_y !== null && shot.loc_x !== undefined && shot.loc_y !== undefined) {
        drawShot(ctx, shot, canvas.width, canvas.height);
      }
    });
  }, [shotData]);

  const drawCourt = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;

    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    const freeThrowY = (19 / COURT_HEIGHT) * height;
    ctx.beginPath();
    ctx.moveTo(0, freeThrowY);
    ctx.lineTo(width, freeThrowY);
    ctx.stroke();

    const basketX = width / 2;
    const basketY = height / 2;
    const threePointRadius = (23.75 / COURT_WIDTH) * width;

    ctx.beginPath();
    ctx.arc(basketX, basketY, threePointRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(basketX, basketY, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawShot = (ctx: CanvasRenderingContext2D, shot: ShotDetail, width: number, height: number) => {
    const x = ((shot.loc_x! + 250) / 500) * width;
    const y = (shot.loc_y! / 470) * height;

    const isMade = shot.shot_made_flag === 1;
    ctx.fillStyle = isMade ? '#4caf50' : '#f44336';
    ctx.strokeStyle = isMade ? '#2e7d32' : '#c62828';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const displayName = shotData?.player_name || playerName;
  const madeShots = shotData?.shots.filter(s => s.shot_made_flag === 1).length || 0;
  const attemptedShots = shotData?.shots.length || 0;
  const fgPercentage = attemptedShots > 0 ? ((madeShots / attemptedShots) * 100).toFixed(1) : '0.0';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Shot Chart - {displayName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Season</InputLabel>
            <Select value={season} label="Season" onChange={(e: SelectChangeEvent) => setSeason(e.target.value)}>
              <MenuItem value="2025-26">2025-26</MenuItem>
              <MenuItem value="2024-25">2024-25</MenuItem>
              <MenuItem value="2023-24">2023-24</MenuItem>
              <MenuItem value="2022-23">2022-23</MenuItem>
              <MenuItem value="2021-22">2021-22</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Season Type</InputLabel>
            <Select
              value={seasonType}
              label="Season Type"
              onChange={(e: SelectChangeEvent) => setSeasonType(e.target.value)}
            >
              <MenuItem value="Regular Season">Regular Season</MenuItem>
              <MenuItem value="Playoffs">Playoffs</MenuItem>
              <MenuItem value="Pre Season">Pre Season</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {shotData && shotData.shots.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No shot chart data available for {displayName} in {season} {seasonType}.
          {shotData.team_name && (
            <Box component="span" sx={{ display: 'block', mt: 1, fontSize: '0.875rem' }}>
              Player may have been on a different team during this season.
            </Box>
          )}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: '#f5f5f5',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              border: '1px solid #ddd',
              borderRadius: 4,
              backgroundColor: '#fff',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Made Shots
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
              {madeShots}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Attempted
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {attemptedShots}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              FG%
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {fgPercentage}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                border: '1px solid #2e7d32',
              }}
            />
            <Typography variant="caption">Made</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#f44336',
                border: '1px solid #c62828',
              }}
            />
            <Typography variant="caption">Missed</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ShotChart;

