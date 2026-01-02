import { Box, Typography, Avatar } from '@mui/material';
import { getTeamColors } from '../utils/teamColors';
import { typography } from '../theme/designTokens';

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
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4, sm: 5, md: 6 },
        px: { xs: 3, sm: 4, md: 6 },
        mb: 0,
      }}
    >
      {/* Background pattern/text overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Typography
          variant="h1"
          sx={{
            position: 'absolute',
            left: { md: -20, lg: 0 },
            top: '50%',
            transform: 'translateY(-50%)',
            fontWeight: 900,
            fontSize: { md: '8rem', lg: '10rem' },
            color: colors.text,
            opacity: 0.15,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {teamCity}
        </Typography>
        <Typography
          variant="h1"
          sx={{
            position: 'absolute',
            right: { md: -20, lg: 0 },
            top: '50%',
            transform: 'translateY(-50%)',
            fontWeight: 900,
            fontSize: { md: '8rem', lg: '10rem' },
            color: colors.text,
            opacity: 0.15,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {teamName.toUpperCase()}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: 3, md: 4 },
        }}
      >
        {/* Team Logo */}
        <Avatar
          src={`/logos/${abbreviation}.svg`}
          alt={`${teamCity} ${teamName}`}
          sx={{
            width: { xs: 80, sm: 100, md: 120 },
            height: { xs: 80, sm: 100, md: 120 },
            backgroundColor: 'transparent',
            border: `3px solid ${colors.text}`,
            flexShrink: 0,
          }}
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/logos/default.svg';
          }}
        />

        {/* Team Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h4, sm: typography.size.h3, md: typography.size.h2 },
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {teamCity} {teamName}
            </Typography>
          </Box>

          {/* Record and Rank */}
          {(record || conferenceRank) && (
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                fontSize: { xs: typography.size.body, sm: typography.size.bodyLarge },
                color: colors.text,
                opacity: 0.95,
                fontWeight: typography.weight.medium,
              }}
            >
              {record}
              {conferenceRank && conference && (
                <span> | {conferenceRank}{getOrdinalSuffix(conferenceRank)} in {conference}</span>
              )}
            </Typography>
          )}

          {/* Team Stats Grid */}
          {teamStats && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: { xs: 2, sm: 3 },
                mt: 2,
              }}
            >
              {teamStats.ppg && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 0.5,
                      fontSize: typography.size.caption,
                      opacity: 0.8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    PPG
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: { xs: typography.size.bodyLarge, sm: typography.size.h6 },
                      color: colors.text,
                    }}
                  >
                    {teamStats.ppg.rank}{getOrdinalSuffix(teamStats.ppg.rank)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: typography.size.body,
                      color: colors.text,
                      opacity: 0.9,
                    }}
                  >
                    {teamStats.ppg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.rpg && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 0.5,
                      fontSize: typography.size.caption,
                      opacity: 0.8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    RPG
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: { xs: typography.size.bodyLarge, sm: typography.size.h6 },
                      color: colors.text,
                    }}
                  >
                    {teamStats.rpg.rank}{getOrdinalSuffix(teamStats.rpg.rank)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: typography.size.body,
                      color: colors.text,
                      opacity: 0.9,
                    }}
                  >
                    {teamStats.rpg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.apg && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 0.5,
                      fontSize: typography.size.caption,
                      opacity: 0.8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    APG
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: { xs: typography.size.bodyLarge, sm: typography.size.h6 },
                      color: colors.text,
                    }}
                  >
                    {teamStats.apg.rank}{getOrdinalSuffix(teamStats.apg.rank)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: typography.size.body,
                      color: colors.text,
                      opacity: 0.9,
                    }}
                  >
                    {teamStats.apg.value.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {teamStats.oppg && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 0.5,
                      fontSize: typography.size.caption,
                      opacity: 0.8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    OPPG
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: { xs: typography.size.bodyLarge, sm: typography.size.h6 },
                      color: colors.text,
                    }}
                  >
                    {teamStats.oppg.rank}{getOrdinalSuffix(teamStats.oppg.rank)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: typography.size.body,
                      color: colors.text,
                      opacity: 0.9,
                    }}
                  >
                    {teamStats.oppg.value.toFixed(1)}
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

