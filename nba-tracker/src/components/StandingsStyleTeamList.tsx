import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { StandingRecord } from '../types/standings';
import { borderRadius, transitions, typography, responsiveSpacing } from '../theme/designTokens';
import { getTeamInfo } from '../utils/teamMappings';

function formatGamesBack(gb: string) {
  if (!gb || gb === '0.0' || gb === '0') return '—';
  return gb;
}

function formatPercentage(pct: number) {
  return (pct * 100).toFixed(1);
}

function formatDiff(diff: number | null | undefined) {
  if (diff === null || diff === undefined) return '—';
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}`;
}

export interface StandingsStyleTeamListProps {
  teams: StandingRecord[];
  /** When false, rank shows next to abbreviation (division-style). Default true. */
  showRank?: boolean;
  /** PLAYOFF / PLAY-IN separator rows (only for league or full conference lists). */
  showPlayoffLines?: boolean;
}

/**
 * Same layout as the Standings page: stacked cards on mobile, full stats table on sm+.
 */
export default function StandingsStyleTeamList({
  teams,
  showRank = true,
  showPlayoffLines = false,
}: StandingsStyleTeamListProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderStandingCard = (team: StandingRecord, rankVisible: boolean) => {
    const fullTeamName = `${team.team_city} ${team.team_name}`;
    const teamInfo = getTeamInfo(fullTeamName);
    const logo = teamInfo.logo;
    const abbreviation = teamInfo.abbreviation;
    const isPlayoffTeam = team.playoff_rank <= 8;
    const isTopSeed = team.playoff_rank <= 3;
    const gamesBack = formatGamesBack(team.games_back);

    return (
      <Paper
        key={team.team_id}
        elevation={0}
        onClick={() => navigate(`/team/${team.team_id}`)}
        sx={{
          p: responsiveSpacing.card,
          mb: responsiveSpacing.element,
          cursor: 'pointer',
          transition: transitions.normal,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
          borderLeft: isTopSeed ? '3px solid' : 'none',
          borderLeftColor: isTopSeed ? 'primary.main' : 'transparent',
          minHeight: { xs: 120, sm: 140 },
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: 1 }}>
            {rankVisible && (
              <Chip
                label={team.playoff_rank}
                size="small"
                sx={{
                  height: { xs: 24, sm: 28 },
                  minWidth: { xs: 24, sm: 28 },
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: typography.size.caption.xs, sm: typography.editorial.helper.xs },
                  backgroundColor: isTopSeed
                    ? 'primary.main'
                    : isPlayoffTeam
                      ? 'rgba(25, 118, 210, 0.1)'
                      : 'transparent',
                  color: isTopSeed ? 'primary.contrastText' : 'text.primary',
                  border: isPlayoffTeam && !isTopSeed ? '1px solid' : 'none',
                  borderColor: isPlayoffTeam && !isTopSeed ? 'primary.main' : 'transparent',
                }}
              />
            )}
            <Avatar
              src={logo}
              alt={fullTeamName}
              sx={{
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                aspectRatio: '1/1',
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: {
                    xs: typography.size.bodySmall.xs,
                    sm: typography.editorial.metric.xs,
                  },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
              >
                {abbreviation || team.team_city}
                {!rankVisible && (
                  <Typography
                    component="span"
                    sx={{
                      color: 'text.secondary',
                      ml: 0.5,
                      fontSize: {
                        xs: typography.size.caption.xs,
                        sm: typography.editorial.helper.xs,
                      },
                    }}
                  >
                    ({team.playoff_rank})
                  </Typography>
                )}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: typography.size.caption.xs, sm: typography.editorial.helper.xs },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {team.team_city} {team.team_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.editorial.metric.xs },
                color: 'text.primary',
              }}
            >
              {team.wins}-{team.losses}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.medium,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.editorial.helper.xs },
                color: 'text.secondary',
              }}
            >
              {formatPercentage(team.win_pct)}%
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: { xs: 1, sm: 1.5 },
            mt: 2,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: {
                  xs: typography.size.captionSmall.xs,
                  sm: typography.editorial.helper.xs,
                },
                textTransform: 'lowercase',
              }}
            >
              GB
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.editorial.helper.xs },
                fontWeight: typography.weight.medium,
                mt: 0.25,
              }}
            >
              {gamesBack}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: {
                  xs: typography.size.captionSmall.xs,
                  sm: typography.editorial.helper.xs,
                },
                textTransform: 'lowercase',
              }}
            >
              Home
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.editorial.helper.xs },
                fontWeight: typography.weight.medium,
                mt: 0.25,
              }}
            >
              {team.home_record}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: {
                  xs: typography.size.captionSmall.xs,
                  sm: typography.editorial.helper.xs,
                },
                textTransform: 'lowercase',
              }}
            >
              Away
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.editorial.helper.xs },
                fontWeight: typography.weight.medium,
                mt: 0.25,
              }}
            >
              {team.road_record}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderTableRow = (team: StandingRecord, rankVisible: boolean) => {
    const fullTeamName = `${team.team_city} ${team.team_name}`;
    const teamInfo = getTeamInfo(fullTeamName);
    const logo = teamInfo.logo;
    const abbreviation = teamInfo.abbreviation;
    const isPlayoffTeam = team.playoff_rank <= 8;
    const isTopSeed = team.playoff_rank <= 3;
    const streakColor = team.current_streak_str.startsWith('W') ? 'success.main' : 'error.main';
    const gamesBack = formatGamesBack(team.games_back);
    const hasPPG = team.ppg !== null && team.ppg !== undefined;

    return (
      <TableRow
        key={team.team_id}
        onClick={() => navigate(`/team/${team.team_id}`)}
        sx={{
          cursor: 'pointer',
          transition: transitions.normal,
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          borderLeft: isTopSeed ? '3px solid' : 'none',
          borderLeftColor: isTopSeed ? 'primary.main' : 'transparent',
        }}
      >
        {rankVisible && (
          <TableCell sx={{ py: 2, backgroundColor: 'background.paper' }}>
            <Chip
              label={team.playoff_rank}
              size="small"
              sx={{
                height: 28,
                minWidth: 28,
                fontWeight: typography.weight.bold,
                fontSize: typography.size.bodySmall,
                backgroundColor: isTopSeed
                  ? 'primary.main'
                  : isPlayoffTeam
                    ? 'rgba(25, 118, 210, 0.1)'
                    : 'transparent',
                color: isTopSeed ? 'primary.contrastText' : 'text.primary',
                border: isPlayoffTeam && !isTopSeed ? '1px solid' : 'none',
                borderColor: isPlayoffTeam && !isTopSeed ? 'primary.main' : 'transparent',
              }}
            />
          </TableCell>
        )}
        <TableCell sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={logo}
              alt={fullTeamName}
              sx={{
                width: 36,
                height: 36,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.primary',
                }}
              >
                {abbreviation || team.team_city}
                {!rankVisible && (
                  <Typography
                    component="span"
                    sx={{
                      color: 'text.secondary',
                      ml: 0.5,
                      fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                    }}
                  >
                    ({team.playoff_rank})
                  </Typography>
                )}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                }}
              >
                {team.team_city} {team.team_name}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: typography.weight.bold,
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: typography.editorial.metric.xs,
              color: 'text.primary',
            }}
          >
            {team.wins}-{team.losses}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {formatPercentage(team.win_pct)}%
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {gamesBack}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.home_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.road_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.division_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.conference_record}
          </Typography>
        </TableCell>
        {hasPPG && (
          <>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.secondary',
                }}
              >
                {team.ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.secondary',
                }}
              >
                {team.opp_ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color:
                    team.diff && team.diff >= 0
                      ? 'success.main'
                      : team.diff && team.diff < 0
                        ? 'error.main'
                        : 'text.secondary',
                  fontWeight: typography.weight.semibold,
                }}
              >
                {formatDiff(team.diff)}
              </Typography>
            </TableCell>
          </>
        )}
        {!isMobile && (
          <>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Chip
                label={team.current_streak_str}
                size="small"
                icon={
                  team.current_streak_str.startsWith('W') ? (
                    <TrendingUp sx={{ fontSize: 14 }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14 }} />
                  )
                }
                sx={{
                  height: 24,
                  fontWeight: typography.weight.semibold,
                  fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                  backgroundColor: team.current_streak_str.startsWith('W')
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(239, 83, 80, 0.1)',
                  color: streakColor,
                }}
              />
            </TableCell>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.secondary',
                }}
              >
                {team.l10_record}
              </Typography>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  const hasPPG =
    teams.length > 0 && teams[0].ppg !== null && teams[0].ppg !== undefined;

  const table = (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.md,
        backgroundColor: 'background.paper',
        overflowX: 'auto',
        minHeight: { xs: 400, sm: 500 },
        '@media (hover: hover)': {
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'background.default',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: borderRadius.xs,
            '&:hover': {
              backgroundColor: 'text.secondary',
            },
          },
        },
      }}
    >
      <Table sx={{ minWidth: isMobile ? 600 : 800 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'background.paper' }}>
            {showRank && (
              <TableCell
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: {
                    xs: typography.size.bodySmall.xs,
                    sm: typography.size.bodySmall.sm,
                  },
                  py: 2.5,
                  color: 'text.secondary',
                }}
              >
                Rank
              </TableCell>
            )}
            <TableCell
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
                color: 'text.secondary',
              }}
            >
              Team
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Record
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Win %
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              GB
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Home
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Away
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Div
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                py: 2.5,
                backgroundColor: 'background.paper',
              }}
            >
              Conf
            </TableCell>
            {hasPPG && (
              <>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: {
                      xs: typography.size.bodySmall.xs,
                      sm: typography.size.bodySmall.sm,
                    },
                    py: 2.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  PPG
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: {
                      xs: typography.size.bodySmall.xs,
                      sm: typography.size.bodySmall.sm,
                    },
                    py: 2.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  Opp PPG
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: {
                      xs: typography.size.bodySmall.xs,
                      sm: typography.size.bodySmall.sm,
                    },
                    py: 2.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  Diff
                </TableCell>
              </>
            )}
            {!isMobile && (
              <>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: {
                      xs: typography.size.bodySmall.xs,
                      sm: typography.size.bodySmall.sm,
                    },
                    py: 2.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  Streak
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: {
                      xs: typography.size.bodySmall.xs,
                      sm: typography.size.bodySmall.sm,
                    },
                    py: 2.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  L10
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {teams.map((team, idx) => (
            <React.Fragment key={team.team_id}>
              {showPlayoffLines && idx === 6 && (
                <TableRow>
                  <TableCell
                    colSpan={20}
                    sx={{
                      py: 0.75,
                      backgroundColor: 'transparent',
                      borderBottom: '1px dashed',
                      borderBottomColor: 'divider',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    PLAYOFF LINE
                  </TableCell>
                </TableRow>
              )}
              {showPlayoffLines && idx === 10 && (
                <TableRow>
                  <TableCell
                    colSpan={20}
                    sx={{
                      py: 0.75,
                      backgroundColor: 'warning.light',
                      borderBottom: '2px solid',
                      borderBottomColor: 'warning.main',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: 'warning.dark',
                    }}
                  >
                    PLAY-IN LINE
                  </TableCell>
                </TableRow>
              )}
              {renderTableRow(team, showRank)}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      <Box sx={{ display: { xs: 'block', sm: 'none' }, minHeight: { xs: 400, sm: 500 } }}>
        {teams.map(team => renderStandingCard(team, showRank))}
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{table}</Box>
    </>
  );
}
