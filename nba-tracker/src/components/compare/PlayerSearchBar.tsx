import { useState, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Avatar,
  Typography,
  CircularProgress,
} from '@mui/material';
import { searchComparePlayers } from '../../utils/apiClient';
import type { PlayerSearchResult } from '../../types/compare';

const HEADSHOT_BASE = 'https://cdn.nba.com/headshots/nba/latest/1040x760';

interface PlayerSearchBarProps {
  label: string;
  value: PlayerSearchResult | null;
  onChange: (player: PlayerSearchResult | null) => void;
  disabled?: boolean;
  excludeId?: number | null;
}

const DEBOUNCE_MS = 300;

export default function PlayerSearchBar({
  label,
  value,
  onChange,
  disabled = false,
  excludeId = null,
}: PlayerSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const loadOptions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchComparePlayers(q);
      setOptions(
        excludeId != null ? results.filter(p => p.id !== excludeId) : results,
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [excludeId]);

  const handleInputChange = (_: unknown, newInputValue: string) => {
    setInputValue(newInputValue);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      loadOptions(newInputValue);
      setDebounceTimer(null);
    }, DEBOUNCE_MS);
    setDebounceTimer(timer);
  };

  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
    <Autocomplete<PlayerSearchResult>
      fullWidth
      disabled={disabled}
      value={value}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={(_, newValue) => onChange(newValue)}
      options={options}
      getOptionLabel={opt => opt?.full_name ?? ''}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      loading={loading}
      noOptionsText="Type at least 2 characters to search players"
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder="Search by name"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={`${HEADSHOT_BASE}/${option.id}.png`}
              alt=""
              sx={{ width: 32, height: 32 }}
            />
            <Typography variant="body2">{option.full_name}</Typography>
            {option.is_active && (
              <Typography variant="caption" color="text.secondary">
                Active
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
    </Box>
  );
}
