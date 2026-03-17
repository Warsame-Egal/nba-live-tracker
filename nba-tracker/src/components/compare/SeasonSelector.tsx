import { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, Box } from '@mui/material';
import { fetchPlayerSeasons } from '../../utils/apiClient';
import { responsiveSpacing } from '../../theme/designTokens';

interface SeasonSelectorProps {
  player1Id: number | null;
  player2Id: number | null;
  season1: string;
  season2: string;
  onSeason1Change: (s: string) => void;
  onSeason2Change: (s: string) => void;
  currentSeason: string;
}

export default function SeasonSelector({
  player1Id,
  player2Id,
  season1,
  season2,
  onSeason1Change,
  onSeason2Change,
  currentSeason,
}: SeasonSelectorProps) {
  const [seasons1, setSeasons1] = useState<string[]>([]);
  const [seasons2, setSeasons2] = useState<string[]>([]);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    if (!player1Id) {
      setSeasons1([]);
      return;
    }
    setLoading1(true);
    fetchPlayerSeasons(player1Id)
      .then(setSeasons1)
      .catch(() => setSeasons1([]))
      .finally(() => setLoading1(false));
  }, [player1Id]);

  useEffect(() => {
    if (!player2Id) {
      setSeasons2([]);
      return;
    }
    setLoading2(true);
    fetchPlayerSeasons(player2Id)
      .then(setSeasons2)
      .catch(() => setSeasons2([]))
      .finally(() => setLoading2(false));
  }, [player2Id]);

  const options1 =
    seasons1.length > 0 ? [...new Set([season1, ...seasons1])].sort() : [season1 || currentSeason];
  const options2 =
    seasons2.length > 0 ? [...new Set([season2, ...seasons2])].sort() : [season2 || currentSeason];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: responsiveSpacing.element,
      }}
    >
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
        <InputLabel id="season1-label">Player 1 season</InputLabel>
        <Select
          labelId="season1-label"
          label="Player 1 season"
          value={season1}
          onChange={e => onSeason1Change(e.target.value)}
          disabled={loading1 || !player1Id}
        >
          {options1.map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
        <InputLabel id="season2-label">Player 2 season</InputLabel>
        <Select
          labelId="season2-label"
          label="Player 2 season"
          value={season2}
          onChange={e => onSeason2Change(e.target.value)}
          disabled={loading2 || !player2Id}
        >
          {options2.map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
