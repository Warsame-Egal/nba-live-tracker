import React, { useState } from 'react';
import { Paper, Box, Typography, Avatar, Chip, Collapse, IconButton } from '@mui/material';
import { ExpandMore, Warning } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';

interface PredictionCardProps {
  prediction: GamePrediction;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = getTeamLogo(prediction.home_team_name);
  const awayLogo = getTeamLogo(prediction.away_team_name);

  const homeProb = Math.round(prediction.home_win_probability * 100);
  const awayProb = Math.round(prediction.away_win_probability * 100);
  const homeWins = homeProb >= awayProb;
  const winnerAbbr = homeWins ? homeAbbr : awayAbbr;
  const winnerProb = homeWins ? homeProb : awayProb;

  // Confidence tier color
  const confidenceColor = (() => {
    switch ((prediction.confidence_tier || '').toLowerCase()) {
      case 'high':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.disabled;
    }
  })();

  const hasDetails =
    prediction.matchup_narrative ||
    (prediction.key_drivers && prediction.key_drivers.length > 0) ||
    (prediction.risk_factors && prediction.risk_factors.length > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.4)'
              : '0 4px 16px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* ── TOP: confidence bar ─────────────────────────── */}
      <Box
        sx={{
          height: 3,
          backgroundColor: alpha(confidenceColor, 0.25),
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${winnerProb}%`,
            backgroundColor: confidenceColor,
            transition: 'width 0.6s ease',
          }}
        />
      </Box>

      {/* ── HEADER: teams + logos + confidence badge ──── */}
      <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* Away team */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Avatar
              src={awayLogo}
              alt={awayAbbr}
              sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider' }}
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/logos/NBA.svg';
              }}
            />
            <Box>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '0.02em',
                }}
              >
                {awayAbbr}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                Away
              </Typography>
            </Box>
          </Box>

          {/* VS + confidence */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, px: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.6875rem' }}
            >
              VS
            </Typography>
            {prediction.confidence_tier && (
              <Chip
                label={prediction.confidence_tier.toUpperCase()}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  backgroundColor: alpha(confidenceColor, 0.12),
                  color: confidenceColor,
                  border: `1px solid ${alpha(confidenceColor, 0.3)}`,
                  borderRadius: 1,
                }}
              />
            )}
          </Box>

          {/* Home team */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '0.02em',
                }}
              >
                {homeAbbr}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                Home
              </Typography>
            </Box>
            <Avatar
              src={homeLogo}
              alt={homeAbbr}
              sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider' }}
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/logos/NBA.svg';
              }}
            />
          </Box>
        </Box>

        {/* ── WIN PROBABILITY: single split bar ─────────── */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: !homeWins ? 800 : 500,
                fontSize: '0.9375rem',
                color: !homeWins ? 'text.primary' : 'text.secondary',
              }}
            >
              {awayProb}%
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.6875rem', color: 'text.disabled', alignSelf: 'center' }}
            >
              WIN PROBABILITY
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: homeWins ? 800 : 500,
                fontSize: '0.9375rem',
                color: homeWins ? 'text.primary' : 'text.secondary',
              }}
            >
              {homeProb}%
            </Typography>
          </Box>
          {/* Split bar — away left, home right */}
          <Box
            sx={{
              display: 'flex',
              height: 6,
              borderRadius: 999,
              overflow: 'hidden',
              gap: '2px',
              backgroundColor: 'divider',
            }}
          >
            <Box
              sx={{
                flex: awayProb,
                backgroundColor: !homeWins
                  ? theme.palette.primary.main
                  : alpha(theme.palette.text.secondary, 0.3),
                borderRadius: '999px 0 0 999px',
                transition: 'flex 0.4s ease',
              }}
            />
            <Box
              sx={{
                flex: homeProb,
                backgroundColor: homeWins
                  ? theme.palette.primary.main
                  : alpha(theme.palette.text.secondary, 0.3),
                borderRadius: '0 999px 999px 0',
                transition: 'flex 0.4s ease',
              }}
            />
          </Box>
          {/* Winner label */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 0.75,
              fontSize: '0.6875rem',
              color: 'text.secondary',
            }}
          >
            {winnerAbbr} favored — {winnerProb}% win probability
          </Typography>
        </Box>

        {/* ── PREDICTED SCORE ───────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            py: 1.5,
            px: 2,
            mb: 1.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: !homeWins ? 800 : 600,
                fontSize: { xs: '1.75rem', sm: '2rem' },
                lineHeight: 1,
                color: !homeWins ? 'primary.main' : 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {prediction.predicted_away_score.toFixed(0)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem', fontWeight: 600 }}>
              {awayAbbr}
            </Typography>
          </Box>
          <Typography color="text.disabled" sx={{ fontWeight: 300, fontSize: '1.25rem' }}>
            —
          </Typography>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: homeWins ? 800 : 600,
                fontSize: { xs: '1.75rem', sm: '2rem' },
                lineHeight: 1,
                color: homeWins ? 'primary.main' : 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {prediction.predicted_home_score.toFixed(0)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem', fontWeight: 600 }}>
              {homeAbbr}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── KEY DRIVERS: always visible pills ─────────── */}
      {prediction.key_drivers && prediction.key_drivers.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {prediction.key_drivers.slice(0, 3).map((d, idx) => (
            <Chip
              key={idx}
              label={d.factor}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.6875rem',
                fontWeight: 600,
                backgroundColor: alpha(theme.palette.primary.main, 0.07),
                color: 'text.secondary',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                borderRadius: 1,
              }}
            />
          ))}
        </Box>
      )}

      {/* ── FOOTER: expand toggle + analysis ─────────── */}
      {hasDetails && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, sm: 2.5 },
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
            onClick={() => setExpanded(e => !e)}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.05em' }}
            >
              {expanded ? 'HIDE ANALYSIS' : 'SHOW ANALYSIS'}
            </Typography>
            <IconButton size="small" sx={{ p: 0.25, color: 'text.secondary' }}>
              <ExpandMore
                sx={{
                  fontSize: 18,
                  transform: expanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Matchup narrative */}
              {prediction.matchup_narrative && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.65,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {prediction.matchup_narrative}
                </Typography>
              )}

              {/* All key drivers with impact text */}
              {prediction.key_drivers && prediction.key_drivers.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Typography variant="overline" sx={{ fontSize: '0.625rem', letterSpacing: '0.1em', color: 'text.disabled' }}>
                    Key Factors
                  </Typography>
                  {prediction.key_drivers.map((d, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', flex: 1, lineHeight: 1.4 }}>
                        {d.factor}
                        {d.impact ? ` — ${d.impact}` : ''}
                      </Typography>
                      <Chip
                        label={d.magnitude}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          flexShrink: 0,
                          backgroundColor:
                            d.magnitude?.toLowerCase() === 'high'
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.text.secondary, 0.1),
                          color:
                            d.magnitude?.toLowerCase() === 'high' ? 'primary.main' : 'text.secondary',
                          borderRadius: 0.75,
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              {/* Risk factors */}
              {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <Warning sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography variant="overline" sx={{ fontSize: '0.625rem', letterSpacing: '0.1em', color: 'warning.main' }}>
                      Risk Factors
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {prediction.risk_factors.map((r, idx) => (
                      <Typography key={idx} variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.4 }}>
                        · {r.factor}
                        {r.explanation ? ` — ${r.explanation}` : ''}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </>
      )}
    </Paper>
  );
};

export default PredictionCard;
