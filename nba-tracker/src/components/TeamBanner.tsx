import { Box, Typography, Avatar } from '@mui/material';
import { getTeamColors } from '../utils/teamColors';

interface TeamBannerProps {
  teamId: number;
  teamCity: string;
  teamName: string;
  abbreviation: string;
  record?: string;
  conferenceRank?: number;
  conference?: string;
  teamStats?: {
    ppg?: { rank: number; value: number };
    rpg?: { rank: number; value: number };
    apg?: { rank: number; value: number };
    oppg?: { rank: number; value: number };
  };
}

/**
 * Material 3 flat, compact team header banner.
 * Lives inside the main content surface, uses team primary color.
 */
const TeamBanner: React.FC<TeamBannerProps> = ({
  teamId,
  teamCity,
  teamName,
  abbreviation,
  record,
  conferenceRank,
  conference,
  teamStats,
}) => {
  const colors = getTeamColors(teamId);

  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: colors.primary,
        color: colors.text,
        borderRadius: 0,
        py: 3,
        px: 3,
        mb: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 3,
        }}
      >
        <Avatar
          src={`/logos/${abbreviation}.svg`}
          alt={`${teamCity} ${teamName}`}
          sx={{
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            backgroundColor: 'transparent',
            border: `2px solid ${colors.text}`,
            flexShrink: 0,
          }}
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/logos/default.svg';
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              color: colors.text,
              mb: 0.5,
            }}
          >
            {teamCity} {teamName}
          </Typography>

          {(record || conferenceRank) && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.875rem',
                color: colors.text,
                opacity: 0.9,
                fontWeight: 500,
                mb: teamStats ? 2 : 0,
              }}
            >
              {record}
              {conferenceRank && conference && (
                <span> • {conferenceRank}{getOrdinalSuffix(conferenceRank)} in {conference}</span>
              )}
            </Typography>
          )}

          {teamStats && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 2,
                mt: 2,
              }}
            >
              {teamStats.ppg && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    PPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {teamStats.ppg.rank}{getOrdinalSuffix(teamStats.ppg.rank)} • {teamStats.ppg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.rpg && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    RPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {teamStats.rpg.rank}{getOrdinalSuffix(teamStats.rpg.rank)} • {teamStats.rpg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.apg && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    APG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {teamStats.apg.rank}{getOrdinalSuffix(teamStats.apg.rank)} • {teamStats.apg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.oppg && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    OPPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {teamStats.oppg.rank}{getOrdinalSuffix(teamStats.oppg.rank)} • {teamStats.oppg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TeamBanner;
