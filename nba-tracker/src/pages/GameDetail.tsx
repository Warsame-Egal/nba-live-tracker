import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Skeleton,
  Paper,
  Drawer,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { ArrowBack, ExpandMore, TrendingUp, SportsBasketball } from '@mui/icons-material';
import { fetchGameDetail, fetchGameRecap, fetchGameSummary } from '../utils/apiClient';
import { getWebSocketUrl } from '../utils/apiConfig';
import WebSocketService from '../services/websocketService';
import type { GameDetailResponse, KeyMomentDict } from '../types/gameDetail';
import type { ScoreboardResponse } from '../types/scoreboard';
import type { PlayByPlayEvent } from '../types/playbyplay';
import ScoreHeader from '../components/game/ScoreHeader';
import { parseTeamNameForColors } from '../utils/teamNameUtils';
import PlayerImpacts from '../components/game/PlayerImpacts';
import KeyMomentsTimeline from '../components/game/KeyMomentsTimeline';
import WinProbabilityChart from '../components/game/WinProbabilityChart';
import GameSummary from '../components/game/GameSummary';
import PlayByPlay from '../components/PlayByPlay';
import MomentumChart from '../components/MomentumChart';
import { logger } from '../utils/logger';
import { borderRadius } from '../theme/designTokens';
import { getTeamColorsByName } from '../utils/teamColors';
import { LIVE_DOT_STYLE } from '../utils/gameVisuals';
import PageContainer from '../components/PageContainer';

const formatMinutes = (value: unknown): string => {
  if (value == null) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';

  // Already looks like mm:ss or similar, just return
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return raw;
  }

  // ISO8601 style from NBA live API, e.g. PT05M, PT32M15S
  if (raw.startsWith('PT')) {
    const match = raw.match(/^PT(?:(\d+)M)?(?:(\d+)S)?$/);
    if (match) {
      const mins = parseInt(match[1] || '0', 10);
      const secs = parseInt(match[2] || '0', 10);
      const mm = String(mins);
      const ss = secs.toString().padStart(2, '0');
      return `${mm}:${ss}`;
    }
  }

  // Fallback for plain numeric minutes
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && asNumber >= 0) {
    return asNumber.toFixed(1);
  }

  return raw;
};

/**
 * Full game detail page: single scrolling page with sticky score header,
 * narrative, key moment, win prob, momentum, top performers, key moments timeline,
 * box score and play-by-play accordions, AI summary (completed only).
 */
export default function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [detail, setDetail] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [recap, setRecap] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [pbpOpen, setPbpOpen] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    fetchGameDetail(gameId)
      .then(setDetail)
      .catch(err => {
        logger.error('Failed to fetch game detail', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    fetchDetail();
  }, [gameId, fetchDetail]);

  // Completed games: fetch post-game recap once (only when gameId or completed status)
  useEffect(() => {
    if (!gameId || !detail || detail.status !== 'completed') return;
    setRecapLoading(true);
    setRecap(null);
    fetchGameRecap(gameId)
      .then(res => (res?.recap ? setRecap(res.recap) : setRecap(null)))
      .catch(() => setRecap(null))
      .finally(() => setRecapLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when gameId or status changes
  }, [gameId, detail?.status]);

  // Live: WebSocket for instant score updates; poll every 30s for enrichment (key moments, win prob, impacts)
  useEffect(() => {
    // Intentionally depend only on gameId and status to avoid re-subscribing on every detail update
    if (!gameId || !detail || detail.status !== 'live') return;
    const wsUrl = getWebSocketUrl('/api/v1/ws');
    const handleScoreboardUpdate = (data: ScoreboardResponse) => {
      const games = data?.scoreboard?.games;
      if (!games) return;
      const game = games.find(g => 'gameId' in g && g.gameId === gameId);
      if (!game || !('homeTeam' in game)) return;
      const g = game as {
        gameId: string;
        homeTeam: { score?: number };
        awayTeam: { score?: number };
        period?: number;
        gameClock?: string;
      };
      setDetail(prev => {
        if (!prev || prev.game_id !== gameId) return prev;
        return {
          ...prev,
          score: {
            ...prev.score,
            home_team: {
              ...prev.score.home_team,
              score: g.homeTeam?.score ?? prev.score.home_team.score,
            },
            away_team: {
              ...prev.score.away_team,
              score: g.awayTeam?.score ?? prev.score.away_team.score,
            },
            period: g.period ?? prev.score.period,
            clock: g.gameClock ?? prev.score.clock,
          },
        };
      });
    };
    WebSocketService.connect(wsUrl);
    WebSocketService.subscribe(handleScoreboardUpdate);
    return () => {
      WebSocketService.unsubscribe(handleScoreboardUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when gameId or live status changes
  }, [gameId, detail?.status]);

  // Poll detail every 30s for enrichment (key moments, win probability, player impacts, box score)
  useEffect(() => {
    // Intentionally depend only on gameId and status to avoid restarting interval on every detail update
    if (!gameId || !detail || detail.status !== 'live') return;
    const interval = setInterval(() => {
      fetchGameDetail(gameId)
        .then(setDetail)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when gameId or live status changes
  }, [gameId, detail?.status]);

  // Completed games: fetch AI summary once when no summary yet (for AI Summary section)
  useEffect(() => {
    if (
      !gameId ||
      !detail ||
      detail.status !== 'completed' ||
      (detail.game_summary != null && detail.game_summary !== '') ||
      summaryText != null ||
      summaryLoading
    )
      return;
    setSummaryLoading(true);
    fetchGameSummary(gameId)
      .then(res => {
        if (res.summary) {
          setSummaryText(res.summary);
          setDetail(prev => (prev ? { ...prev, game_summary: res.summary } : null));
        }
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid re-run on full detail updates
  }, [gameId, detail?.status, detail?.game_summary, summaryText, summaryLoading]);

  const gradientColors = useMemo(() => {
    if (!detail?.score) return { home: '#333333', away: '#333333' };
    const homeName = detail.score.home_team.name ?? '';
    const awayName = detail.score.away_team.name ?? '';
    const homeParsed = parseTeamNameForColors(homeName);
    const awayParsed = parseTeamNameForColors(awayName);
    return {
      away: getTeamColorsByName(awayParsed.city, awayParsed.teamName).primary,
      home: getTeamColorsByName(homeParsed.city, homeParsed.teamName).primary,
    };
  }, [detail?.score]);

  if (!gameId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Missing game ID.</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth={1400}>
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Go back"
          sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 1 }}
        >
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box
          component={Link}
          to="/"
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            alignItems: 'center',
            gap: 1,
            mb: 2,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <ArrowBack fontSize="small" /> Back to scoreboard
        </Box>
        <Typography color="error">{error}</Typography>
      </PageContainer>
    );
  }

  if (loading || !detail) {
    return (
      <PageContainer maxWidth={1400}>
        <Skeleton variant="text" width={120} height={40} sx={{ mb: 2 }} />
        <Skeleton
          variant="rectangular"
          height={200}
          sx={{ borderRadius: borderRadius.lg, mb: 2 }}
        />
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: borderRadius.lg }} />
      </PageContainer>
    );
  }

  const isLive = detail.status === 'live';
  const winProb = detail.win_probability;
  const playsForMomentum: PlayByPlayEvent[] = (detail.play_by_play ?? []).map(p => ({
    action_number: p.action_number ?? 0,
    clock: p.clock ?? '',
    period: p.period ?? 1,
    team_id: p.team_id,
    team_tricode: p.team_tricode,
    action_type: p.action_type ?? '',
    description: p.description ?? '',
    player_id: p.player_id,
    player_name: p.player_name,
    score_home: p.score_home ?? undefined,
    score_away: p.score_away ?? undefined,
  }));

  const latestKeyMoment = detail.key_moments?.[0] ?? null;
  const MOMENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    game_tying_shot: { label: 'Game Tied', color: '#FFD700', icon: '🏀' },
    lead_change: { label: 'Lead Change', color: '#00BCD4', icon: '🔄' },
    scoring_run: { label: 'Scoring Run', color: '#FF5722', icon: '🔥' },
    clutch_play: { label: 'Clutch Play', color: '#9C27B0', icon: '⚡' },
    big_shot: { label: 'Big Shot', color: '#4CAF50', icon: '💥' },
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'background.default',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <PageContainer maxWidth={1400} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Go back"
          sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 0.5, width: 'fit-content' }}
        >
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box
          component={Link}
          to="/"
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            alignItems: 'center',
            gap: 1,
            mb: 1,
            color: 'inherit',
            textDecoration: 'none',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          <ArrowBack fontSize="small" /> Back to scoreboard
        </Box>

        <ScoreHeader score={detail.score} status={detail.status} gradientColors={gradientColors} />

        {/* Floating Play-by-Play toggle button */}
        <Fab
          variant="extended"
          size="medium"
          color="primary"
          onClick={() => setPbpOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, md: 32 },
            right: { xs: 16, md: 32 },
            zIndex: 1200,
            gap: 1,
            boxShadow: 4,
          }}
        >
          <SportsBasketball sx={{ fontSize: 18 }} />
          {isLive ? 'Live Plays' : 'Play-by-Play'}
        </Fab>

        <Drawer
          anchor="right"
          open={pbpOpen}
          onClose={() => setPbpOpen(false)}
          variant="temporary"
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: '100%', sm: 380 },
              maxWidth: '100vw',
              backgroundColor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Panel header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              position: 'sticky',
              top: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLive && <Box sx={LIVE_DOT_STYLE} />}
              <Typography variant="subtitle1" fontWeight={700}>
                {isLive ? 'Live Play-by-Play' : 'Play-by-Play'}
              </Typography>
            </Box>
            <IconButton onClick={() => setPbpOpen(false)} size="small">
              <ArrowBack sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Panel content - scrollable */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
            <PlayByPlay gameId={gameId} isLiveGame={isLive} autoScrollToLatest={isLive} />
          </Box>
        </Drawer>

        {/* Narrative / Post-game recap (completed only) */}
        {detail.status === 'completed' && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.lg,
              backgroundColor: 'background.paper',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}
            >
              Post-Game Recap
            </Typography>
            {recapLoading ? (
              <>
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="95%" />
                <Skeleton variant="text" width="90%" />
              </>
            ) : recap ? (
              <>
                <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {recap}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  Generated by Groq
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Recap is being generated. Check back in a moment.
              </Typography>
            )}
          </Paper>
        )}

        {/* Most recent key moment */}
        {latestKeyMoment && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.lg,
              borderLeft: '4px solid',
              borderLeftColor:
                MOMENT_CONFIG[(latestKeyMoment as KeyMomentDict).type ?? '']?.color ?? '#757575',
            }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              KEY MOMENT
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
              {((latestKeyMoment as KeyMomentDict).play as { description?: string })?.description ??
                (latestKeyMoment as KeyMomentDict).context ??
                'Key moment'}
            </Typography>
            {(latestKeyMoment as KeyMomentDict).context && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1, fontStyle: 'italic', color: 'text.secondary' }}
              >
                {(latestKeyMoment as KeyMomentDict).context}
              </Typography>
            )}
          </Paper>
        )}

        {/* Win probability — only show for live and upcoming games, or when data exists */}
        {(winProb || detail.status !== 'completed') && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.lg,
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingUp sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Win probability
              </Typography>
            </Box>
            {winProb ? (
              <WinProbabilityChart
                winProbability={winProb}
                homeTeamName={detail.score.home_team.name}
                awayTeamName={detail.score.away_team.name}
                homeColor={gradientColors?.home}
                awayColor={gradientColors?.away}
                status={detail.status}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {isLive
                  ? 'Win probability data is loading. It may appear as the game progresses.'
                  : 'Win probability will be available once the game starts.'}
              </Typography>
            )}
          </Paper>
        )}

        {/* Momentum chart */}
        {playsForMomentum.length > 0 ? (
          <MomentumChart
            plays={playsForMomentum}
            homeTeam={detail.score.home_team.name}
            awayTeam={detail.score.away_team.name}
          />
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.lg,
              backgroundColor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Momentum
            </Typography>
            <Typography color="text.secondary">
              No play-by-play data for momentum chart.
            </Typography>
          </Paper>
        )}

        {/* Top performers */}
        <PlayerImpacts player_impacts={detail.player_impacts} />

        {/* Key moments timeline */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Key moments timeline
          </Typography>
          <KeyMomentsTimeline moments={detail.key_moments} gameId={gameId} />
        </Box>

        {/* Box score — accordion, collapsed by default on mobile */}
        <Accordion
          defaultExpanded={isDesktop}
          sx={{ borderRadius: `${borderRadius.lg} !important`, overflow: 'hidden' }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Box score
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BoxScoreTab boxScore={detail.box_score} score={detail.score} />
          </AccordionDetails>
        </Accordion>

        {/* AI summary — completed only */}
        {detail.status === 'completed' && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.lg,
              backgroundColor: 'background.paper',
            }}
          >
            <GameSummary
              summary={detail.game_summary ?? summaryText}
              loading={summaryLoading}
              status={detail.status}
              onRetry={() => {
                setSummaryText(null);
                setSummaryLoading(false);
              }}
            />
          </Paper>
        )}
      </PageContainer>
    </Box>
  );
}

function BoxScoreTab({
  boxScore,
  score,
}: {
  boxScore: GameDetailResponse['box_score'];
  score: GameDetailResponse['score'];
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [viewMode, setViewMode] = useState<'standard' | 'advanced'>('standard');

  if (!boxScore || typeof boxScore !== 'object') {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Box score not available.
      </Typography>
    );
  }
  const home = (boxScore as { home_team?: { players?: unknown[]; team_name?: string } }).home_team;
  const away = (boxScore as { away_team?: { players?: unknown[]; team_name?: string } }).away_team;
  if (!home || !away) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No team data.
      </Typography>
    );
  }
  const homePlayers = (home.players ?? []) as Record<string, unknown>[];
  const awayPlayers = (away.players ?? []) as Record<string, unknown>[];
  const advancedKeys = ['game_score', 'ts_pct', 'pts_per_min', 'usage_est'];

  const maxAwayPts = awayPlayers.length
    ? Math.max(...awayPlayers.map(p => Number(p.points ?? 0)))
    : 0;
  const maxHomePts = homePlayers.length
    ? Math.max(...homePlayers.map(p => Number(p.points ?? 0)))
    : 0;

  const renderPlayerCard = (
    p: Record<string, unknown>,
    teamLabel: string,
    isLeadingScorer: boolean,
  ) => (
    <Paper
      key={String(p.player_id ?? p.name)}
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        backgroundColor: isLeadingScorer ? 'action.hover' : 'background.paper',
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.5,
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          {String(p.name ?? '')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {teamLabel} · {formatMinutes(p.minutes)} MIN
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          PTS {Number(p.points ?? 0)}
        </Typography>
        <Typography variant="caption">REB {Number(p.rebounds ?? 0)}</Typography>
        <Typography variant="caption">AST {Number(p.assists ?? 0)}</Typography>
        <Typography variant="caption">STL {Number(p.steals ?? 0)}</Typography>
        <Typography variant="caption">BLK {Number(p.blocks ?? 0)}</Typography>
        <Typography variant="caption">TO {Number(p.turnovers ?? 0)}</Typography>
      </Box>
    </Paper>
  );

  const renderTeamTable = (
    players: Record<string, unknown>[],
    teamLabel: string,
    maxPts: number,
  ) => (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {teamLabel}
      </Typography>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  minWidth: 120,
                  position: 'sticky',
                  left: 0,
                  backgroundColor: 'background.paper',
                  zIndex: 1,
                }}
              >
                Player
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                MIN
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                PTS
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                REB
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                AST
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                STL
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                BLK
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                TO
              </TableCell>
              {viewMode === 'advanced' && (
                <>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    GmSc
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    TS%
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    PTS/MIN
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    Usage
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map(p => {
              const pts = Number(p.points ?? 0);
              const isLeadingScorer = maxPts > 0 && pts === maxPts;
              return (
                <TableRow
                  key={String(p.player_id ?? p.name)}
                  hover
                  sx={{
                    minHeight: 48,
                    ...(isLeadingScorer ? { backgroundColor: 'action.hover' } : {}),
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'background.paper',
                      zIndex: 1,
                    }}
                  >
                    {String(p.name ?? '')}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMinutes(p.minutes)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {pts}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.rebounds ?? 0)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.assists ?? 0)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.steals ?? 0)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.blocks ?? 0)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.turnovers ?? 0)}
                  </TableCell>
                  {viewMode === 'advanced' &&
                    advancedKeys.map(k => {
                      const v = p[k];
                      const display =
                        v != null && typeof v === 'number'
                          ? k === 'ts_pct' || k === 'usage_est'
                            ? (v * 100).toFixed(1) + '%'
                            : v.toFixed(1)
                          : v != null
                            ? String(v)
                            : '—';
                      return (
                        <TableCell key={k} align="center">
                          {display}
                        </TableCell>
                      );
                    })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  if (!isDesktop) {
    const awayLabel = away.team_name ?? score.away_team.name;
    const homeLabel = home.team_name ?? score.home_team.name;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {awayLabel}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {awayPlayers.map(p =>
            renderPlayerCard(p, awayLabel, maxAwayPts > 0 && Number(p.points ?? 0) === maxAwayPts),
          )}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
          {homeLabel}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {homePlayers.map(p =>
            renderPlayerCard(p, homeLabel, maxHomePts > 0 && Number(p.points ?? 0) === maxHomePts),
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v != null && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="standard">Standard</ToggleButton>
          <ToggleButton value="advanced">Advanced</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Box sx={{ minWidth: 650 }}>
          {renderTeamTable(awayPlayers, away.team_name ?? score.away_team.name, maxAwayPts)}
          <Box sx={{ mt: 2 }}>
            {renderTeamTable(homePlayers, home.team_name ?? score.home_team.name, maxHomePts)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
