import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PlayerSearchBar from '../components/compare/PlayerSearchBar';
import StatComparisonTable from '../components/compare/StatComparisonTable';
import RadarChart from '../components/compare/RadarChart';
import TrendChart from '../components/compare/TrendChart';
import ScoutingReport from '../components/compare/ScoutingReport';
import HeadToHeadSection from '../components/compare/HeadToHeadSection';
import CareerComparison from '../components/compare/CareerComparison';
import SeasonSelector from '../components/compare/SeasonSelector';
import { fetchComparison } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { responsiveSpacing, borderRadius } from '../theme/designTokens';
import PageContainer from '../components/PageContainer';
import type { PlayerSearchResult, ComparisonResponse, SeasonAverages } from '../types/compare';

type TabValue = 'overview' | 'trends' | 'scouting' | 'career';
type LastNGames = 10 | 20 | 30;
type TrendStat = 'pts' | 'ast' | 'reb';

const HEADSHOT_BASE = 'https://cdn.nba.com/headshots/nba/latest/1040x760';

/** Mobile stat cards: one card per player with key stats */
function StatComparisonCards({
  player1Name,
  player2Name,
  player1Averages,
  player2Averages,
}: {
  player1Name: string;
  player2Name: string;
  player1Averages: SeasonAverages;
  player2Averages: SeasonAverages;
}) {
  const rows: { key: keyof SeasonAverages; label: string }[] = [
    { key: 'pts', label: 'PTS' },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'stl', label: 'STL' },
    { key: 'blk', label: 'BLK' },
    { key: 'fg_pct', label: 'FG%' },
    { key: 'fg3_pct', label: '3P%' },
  ];
  const format = (v: number, k: string) =>
    k.includes('_pct') ? (v * 100).toFixed(1) + '%' : v.toFixed(1);
  const getVal = (a: SeasonAverages, key: keyof SeasonAverages) =>
    Number((a as unknown as Record<string, number>)[key] ?? 0);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: borderRadius.md }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {player1Name}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {rows.map(({ key, label }) => (
            <Typography key={key} variant="body2">
              {label} {format(getVal(player1Averages, key), key)}
            </Typography>
          ))}
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: borderRadius.md }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {player2Name}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {rows.map(({ key, label }) => (
            <Typography key={key} variant="body2">
              {label} {format(getVal(player2Averages, key), key)}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

export default function ComparePage() {
  const { player1Id, player2Id } = useParams<{ player1Id?: string; player2Id?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [player1, setPlayer1] = useState<PlayerSearchResult | null>(null);
  const [player2, setPlayer2] = useState<PlayerSearchResult | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSeason = getCurrentSeason();
  const [seasonPlayer1, setSeasonPlayer1] = useState(currentSeason);
  const [seasonPlayer2, setSeasonPlayer2] = useState(currentSeason);
  const [lastNGames, setLastNGames] = useState<LastNGames>(20);
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [trendStat, setTrendStat] = useState<TrendStat>('pts');

  // Pre-select players from URL when visiting /compare/123 or /compare/123/456
  useEffect(() => {
    if (!player1Id) return;
    const id1 = parseInt(player1Id, 10);
    if (Number.isNaN(id1)) return;
    const id2 = player2Id ? parseInt(player2Id, 10) : null;
    if (player1?.id === id1 && (id2 == null || player2?.id === id2)) return;
    setPlayer1({ id: id1, full_name: `Player ${id1}`, is_active: true });
    if (id2 != null && !Number.isNaN(id2)) {
      setPlayer2({ id: id2, full_name: `Player ${id2}`, is_active: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL params only
  }, [player1Id, player2Id]);

  const fetchComparisonData = useCallback(async () => {
    if (!player1 || !player2) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchComparison(
        player1.id,
        player2.id,
        seasonPlayer1,
        lastNGames,
        seasonPlayer2,
      );
      setComparisonData(data);
      setPlayer1(prev => (prev ? { ...prev, full_name: data.player1.full_name } : null));
      setPlayer2(prev => (prev ? { ...prev, full_name: data.player2.full_name } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids/season/lastNGames only to avoid refetch when updating full_name
  }, [player1?.id, player2?.id, seasonPlayer1, seasonPlayer2, lastNGames]);

  useEffect(() => {
    if (player1?.id && player2?.id) {
      fetchComparisonData();
    } else {
      setComparisonData(null);
      setError(null);
    }
  }, [player1?.id, player2?.id, seasonPlayer1, seasonPlayer2, lastNGames, fetchComparisonData]);

  const handlePlayer1Change = (p: PlayerSearchResult | null) => {
    setPlayer1(p);
    if (p && player2) navigate(`/compare/${p.id}/${player2.id}`, { replace: true });
  };
  const handlePlayer2Change = (p: PlayerSearchResult | null) => {
    setPlayer2(p);
    if (player1 && p) navigate(`/compare/${player1.id}/${p.id}`, { replace: true });
  };

  const phase1 = !player1 && !player2;
  const phase2 = player1 && !player2;
  const phase3 = player1 && player2;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <PageContainer
        maxWidth={1400}
        sx={{ px: responsiveSpacing.container, py: responsiveSpacing.containerVertical }}
      >
        {/* Phase 1: full-screen search for first player */}
        {phase1 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              py: 4,
            }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              Compare players
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Search for the first player to get started
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 480 }}>
              <PlayerSearchBar
                label="Search for first player"
                value={null}
                onChange={p => {
                  setPlayer1(p);
                  if (p) navigate(`/compare/${p.id}`, { replace: true });
                }}
                excludeId={undefined}
              />
            </Box>
          </Box>
        )}

        {/* Phase 2: player 1 card + search for second player */}
        {phase2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
              Compare players
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                src={`${HEADSHOT_BASE}/${player1.id}.png`}
                sx={{ width: 56, height: 56 }}
                onError={e => {
                  (e.target as HTMLImageElement).src = '';
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Player 1
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {player1.full_name}
                </Typography>
              </Box>
              <Typography
                component={Link}
                to={`/player/${player1.id}`}
                variant="body2"
                color="primary"
              >
                View profile
              </Typography>
            </Paper>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Search for second player
              </Typography>
              <PlayerSearchBar
                label="Player 2"
                value={null}
                onChange={p => {
                  setPlayer2(p);
                  if (p && player1) navigate(`/compare/${player1.id}/${p.id}`, { replace: true });
                }}
                excludeId={player1?.id ?? undefined}
              />
            </Box>
          </Box>
        )}

        {/* Phase 3: both selected — comparison with hero row, radar, stat cards/table, scouting */}
        {phase3 && (
          <>
            <Typography variant="h5" sx={{ mb: responsiveSpacing.element, fontWeight: 700 }}>
              Player Comparison
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: responsiveSpacing.gap,
                mb: responsiveSpacing.element,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PlayerSearchBar
                  label="Player 1"
                  value={player1}
                  onChange={handlePlayer1Change}
                  excludeId={player2?.id ?? undefined}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PlayerSearchBar
                  label="Player 2"
                  value={player2}
                  onChange={handlePlayer2Change}
                  excludeId={player1?.id ?? undefined}
                />
              </Box>
            </Box>
          </>
        )}

        {phase3 && player1 && player2 && (
          <SeasonSelector
            player1Id={player1.id}
            player2Id={player2.id}
            season1={seasonPlayer1}
            season2={seasonPlayer2}
            onSeason1Change={setSeasonPlayer1}
            onSeason2Change={setSeasonPlayer2}
            currentSeason={currentSeason}
          />
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: responsiveSpacing.element }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && comparisonData && (
          <>
            {/* Hero row: headshots + names (Phase 3) */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: borderRadius.md,
                mb: responsiveSpacing.element,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 2, sm: 4 },
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={
                    comparisonData.player1.headshot_url ||
                    `${HEADSHOT_BASE}/${comparisonData.player1.id}.png`
                  }
                  sx={{ width: { xs: 48, md: 64 }, height: { xs: 48, md: 64 } }}
                  onError={e => {
                    (e.target as HTMLImageElement).src = '';
                  }}
                />
                <Typography variant="subtitle1" fontWeight={600}>
                  {comparisonData.player1.full_name}
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">
                vs
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={
                    comparisonData.player2.headshot_url ||
                    `${HEADSHOT_BASE}/${comparisonData.player2.id}.png`
                  }
                  sx={{ width: { xs: 48, md: 64 }, height: { xs: 48, md: 64 } }}
                  onError={e => {
                    (e.target as HTMLImageElement).src = '';
                  }}
                />
                <Typography variant="subtitle1" fontWeight={600}>
                  {comparisonData.player2.full_name}
                </Typography>
              </Box>
            </Paper>

            <Tabs
              value={activeTab}
              onChange={(_, v: TabValue) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ borderBottom: 1, borderColor: 'divider', mb: responsiveSpacing.element }}
            >
              <Tab label="Overview" value="overview" />
              <Tab label="Trends" value="trends" />
              <Tab label="Scouting" value="scouting" />
              <Tab label="Career" value="career" />
            </Tabs>

            {activeTab === 'overview' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr minmax(320px, 1fr)' },
                  gap: responsiveSpacing.gap,
                  mb: responsiveSpacing.section,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: responsiveSpacing.card,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Season averages
                  </Typography>
                  {isMobile ? (
                    <StatComparisonCards
                      player1Name={comparisonData.player1.full_name}
                      player2Name={comparisonData.player2.full_name}
                      player1Averages={comparisonData.player1_averages}
                      player2Averages={comparisonData.player2_averages}
                    />
                  ) : (
                    <StatComparisonTable
                      player1Name={comparisonData.player1.full_name}
                      player2Name={comparisonData.player2.full_name}
                      player1Averages={comparisonData.player1_averages}
                      player2Averages={comparisonData.player2_averages}
                      player1HotStreak={comparisonData.player1_hot_streak}
                      player2HotStreak={comparisonData.player2_hot_streak}
                      player1Efficiency={comparisonData.player1_efficiency}
                      player2Efficiency={comparisonData.player2_efficiency}
                    />
                  )}
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: responsiveSpacing.card,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <RadarChart
                    player1Name={comparisonData.player1.full_name}
                    player2Name={comparisonData.player2.full_name}
                    player1Radar={comparisonData.player1_radar}
                    player2Radar={comparisonData.player2_radar}
                  />
                </Paper>
                <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: responsiveSpacing.card,
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      Head-to-head
                    </Typography>
                    {comparisonData.head_to_head && comparisonData.head_to_head.games_played > 0 ? (
                      <HeadToHeadSection
                        player1Name={comparisonData.player1.full_name}
                        player2Name={comparisonData.player2.full_name}
                        headToHead={comparisonData.head_to_head}
                      />
                    ) : (
                      <Typography color="text.secondary">
                        These players haven&apos;t faced each other this season.
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </Box>
            )}

            {activeTab === 'trends' && (
              <Paper
                variant="outlined"
                sx={{
                  p: responsiveSpacing.card,
                  borderRadius: borderRadius.md,
                }}
              >
                <TrendChart
                  player1Name={comparisonData.player1.full_name}
                  player2Name={comparisonData.player2.full_name}
                  player1Games={comparisonData.player1_games}
                  player2Games={comparisonData.player2_games}
                  player1Averages={comparisonData.player1_averages}
                  player2Averages={comparisonData.player2_averages}
                  stat={trendStat}
                  onStatChange={setTrendStat}
                  lastNGames={lastNGames}
                  onLastNGamesChange={v => setLastNGames(v)}
                />
              </Paper>
            )}

            {activeTab === 'scouting' && (
              <ScoutingReport
                report={comparisonData.scouting_report}
                onRefresh={fetchComparisonData}
                fetchSummary={comparisonData.fetch_summary}
              />
            )}

            {activeTab === 'career' && (
              <CareerComparison
                player1Name={comparisonData.player1.full_name}
                player2Name={comparisonData.player2.full_name}
                player1Career={comparisonData.player1_career ?? null}
                player2Career={comparisonData.player2_career ?? null}
              />
            )}
          </>
        )}

        {!loading && !comparisonData && player1 && player2 && (
          <Typography color="text.secondary">Select both players to compare.</Typography>
        )}
      </PageContainer>
    </Box>
  );
}
