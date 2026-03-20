import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Avatar, Chip } from '@mui/material';
import type { ScoreSection } from '../../types/gameDetail';
import { getTeamLogo } from '../../utils/teamMappings';
import { LIVE_DOT_STYLE } from '../../utils/gameVisuals';
import { typography, borderRadius } from '../../theme/designTokens';
import { alpha } from '@mui/material/styles';

const STICKY_SCROLL_THRESHOLD = 120;

interface ScoreHeaderProps {
  score: ScoreSection;
  status: string;
  /** Optional team primary colors for gradient: [away, home] (left to right) */
  gradientColors?: { away: string; home: string };
}

/**
 * Score header for game detail page. Full version in flow; when user scrolls past
 * threshold, a compact sticky bar pins to top. Optional team color gradient on background.
 */
const ScoreHeader: React.FC<ScoreHeaderProps> = ({ score, status, gradientColors }) => {
  const { home_team, away_team, period, clock, quarter_scores } = score;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > STICKY_SCROLL_THRESHOLD);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isLive = status === 'live';
  const isCompleted = status === 'completed';
  const isUpcoming = status === 'upcoming';

  const statusLabel = isCompleted
    ? 'FINAL'
    : isLive && period != null && clock != null
      ? `Q${period} ${clock}`
      : isUpcoming
        ? 'Tip-off'
        : status;

  const awayAbbr = away_team.abbreviation || away_team.name?.slice(0, 3) || 'AWAY';
  const homeAbbr = home_team.abbreviation || home_team.name?.slice(0, 3) || 'HOME';

  const gradientSx =
    gradientColors &&
    (() => {
      const away = alpha(gradientColors.away, 0.05);
      const home = alpha(gradientColors.home, 0.05);
      return {
        background: `linear-gradient(to right, ${away}, ${home})`,
      };
    })();

  const fullHeader = (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.lg,
        backgroundColor: 'background.paper',
        ...gradientSx,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {isLive && (
            <Chip
              icon={<Box component="span" sx={LIVE_DOT_STYLE} />}
              label="LIVE"
              color="error"
              size="small"
              sx={{ fontWeight: 700, '& .MuiChip-icon': { overflow: 'visible' } }}
            />
          )}
          {isCompleted && (
            <Chip label="FINAL" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
          {isUpcoming && (
            <Chip
              label={statusLabel}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500, color: 'text.secondary' }}
            />
          )}
          {!isLive && !isCompleted && !isUpcoming && (
            <Typography
              variant="overline"
              sx={{
                fontWeight: typography.weight.bold,
                color: 'text.secondary',
                letterSpacing: 0.5,
              }}
            >
              {statusLabel}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={getTeamLogo(away_team.name, away_team.abbreviation)}
              sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, flexShrink: 0 }}
              variant="rounded"
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: typography.weight.semibold,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {away_team.name}
                {away_team.abbreviation && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    ({away_team.abbreviation})
                  </Typography>
                )}
              </Typography>
              {away_team.record && (
                <Typography variant="caption" color="text.secondary">
                  {away_team.record}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexShrink: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 44,
                textAlign: 'center',
              }}
            >
              {away_team.score}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              –
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 44,
                textAlign: 'center',
              }}
            >
              {home_team.score}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: typography.weight.semibold,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {home_team.name}
                {home_team.abbreviation && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    ({home_team.abbreviation})
                  </Typography>
                )}
              </Typography>
              {home_team.record && (
                <Typography variant="caption" color="text.secondary">
                  {home_team.record}
                </Typography>
              )}
            </Box>
            <Avatar
              src={getTeamLogo(home_team.name, home_team.abbreviation)}
              sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, flexShrink: 0 }}
              variant="rounded"
            />
          </Box>
        </Box>

        {quarter_scores &&
          quarter_scores.home &&
          quarter_scores.away &&
          quarter_scores.home.length > 0 && (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  minWidth: 200,
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    py: 0.75,
                    px: 1,
                    textAlign: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '& th': {
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: typography.weight.semibold,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th></th>
                    {quarter_scores.home.map((_, i) => (
                      <th key={i}>Q{i + 1}</th>
                    ))}
                    <th>T</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Box
                      component="td"
                      sx={{
                        textAlign: 'left',
                        fontWeight: typography.weight.medium,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {away_team.abbreviation || away_team.name}
                    </Box>
                    {quarter_scores.away.map((s, i) => (
                      <td key={i}>{s}</td>
                    ))}
                    <Box component="td" sx={{ fontWeight: typography.weight.bold }}>
                      {away_team.score}
                    </Box>
                  </tr>
                  <tr>
                    <Box
                      component="td"
                      sx={{
                        textAlign: 'left',
                        fontWeight: typography.weight.medium,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {home_team.abbreviation || home_team.name}
                    </Box>
                    {quarter_scores.home.map((s, i) => (
                      <td key={i}>{s}</td>
                    ))}
                    <Box component="td" sx={{ fontWeight: typography.weight.bold }}>
                      {home_team.score}
                    </Box>
                  </tr>
                </tbody>
              </Box>
            </Box>
          )}
      </Box>
    </Paper>
  );

  const compactBar = (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        minHeight: 48,
        backgroundColor: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        ...gradientSx,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {awayAbbr} {away_team.score} — {homeAbbr} {home_team.score}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        |
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {statusLabel}
      </Typography>
      {isLive && <Box component="span" sx={LIVE_DOT_STYLE} />}
    </Box>
  );

  return (
    <>
      {fullHeader}
      {isScrolled && compactBar}
    </>
  );
};

export default ScoreHeader;
