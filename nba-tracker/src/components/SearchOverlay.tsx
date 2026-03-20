/**
 * Full-screen search overlay (File 4.2). Works on every page.
 * Recent searches in localStorage (max 5), live results as user types.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, Close } from '@mui/icons-material';
import { useSearchOverlay } from '../contexts/SearchOverlayContext';
import { API_BASE_URL } from '../utils/apiConfig';
import type { SearchResults } from '../types/search';

const RECENT_KEY = 'nba_tracker_recent_searches';
const RECENT_MAX = 5;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter(q => q.toLowerCase() !== query.trim().toLowerCase());
  recent.unshift(query.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_MAX)));
}

export default function SearchOverlay() {
  const { open, closeSearch } = useSearchOverlay();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ players: [], teams: [] });
  const [recent, setRecent] = useState<string[]>(getRecentSearches());

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ players: [], teams: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/search?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as SearchResults;
      setResults(data || { players: [], teams: [] });
    } catch {
      setResults({ players: [], teams: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setInput('');
    setResults({ players: [], teams: [] });
    setRecent(getRecentSearches());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      doSearch(input);
    }, 300);
    return () => clearTimeout(t);
  }, [input, open, doSearch]);

  const handleClose = () => {
    closeSearch();
  };

  const handleSelectPlayer = (id: number) => {
    addRecentSearch(input || String(id));
    navigate(`/player/${id}`);
    handleClose();
  };

  const handleSelectTeam = (id: number) => {
    addRecentSearch(input || String(id));
    navigate(`/team/${id}`);
    handleClose();
  };

  const handleRecentChip = (q: string) => {
    setInput(q);
    doSearch(q);
  };

  const hasResults = results.players.length > 0 || results.teams.length > 0;
  const showRecent = open && !input.trim() && recent.length > 0;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(10px)',
          maxWidth: '100%',
          margin: 0,
          borderRadius: 0,
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            fullWidth
            autoFocus
            placeholder="Search players and teams..."
            value={input}
            onChange={e => setInput(e.target.value)}
            variant="standard"
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={24} />
                </InputAdornment>
              ) : null,
            }}
            sx={{
              '& .MuiInputBase-root': { fontSize: '1.25rem' },
              '& .MuiInput-underline:before': { borderBottomColor: 'divider' },
              '& .MuiInput-underline:hover:before': { borderBottomColor: 'primary.main' },
              '& .MuiInput-underline:after': { borderBottomColor: 'primary.main' },
            }}
          />
          <IconButton
            onClick={handleClose}
            aria-label="close search"
            size="large"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
          {showRecent && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Recent
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recent.map(q => (
                  <Chip
                    key={q}
                    label={q}
                    onClick={() => handleRecentChip(q)}
                    size="medium"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {input.trim() && !loading && !hasResults && (
            <Typography color="text.secondary">No results for &quot;{input}&quot;</Typography>
          )}

          {hasResults && (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {results.players.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'block',
                      color: 'text.secondary',
                      fontWeight: 600,
                    }}
                  >
                    Players
                  </Typography>
                  <List dense disablePadding>
                    {results.players.map(p => (
                      <ListItem key={p.id} disablePadding>
                        <ListItemButton onClick={() => handleSelectPlayer(p.id)}>
                          <ListItemText primary={p.name} secondary={p.team_abbreviation} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {results.teams.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'block',
                      color: 'text.secondary',
                      fontWeight: 600,
                    }}
                  >
                    Teams
                  </Typography>
                  <List dense disablePadding>
                    {results.teams.map(t => (
                      <ListItem key={t.id} disablePadding>
                        <ListItemButton onClick={() => handleSelectTeam(t.id)}>
                          <ListItemText primary={t.name} secondary={t.abbreviation} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Paper>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
