import { Box, Typography, Avatar } from '@mui/material';
import { getTeamColorsByName } from '../utils/teamColors';
import { typography } from '../theme/designTokens';

interface PlayerBannerProps {
  playerId: number;
  firstName: string;
  lastName: string;
  teamCity?: string;
  teamName?: string;
  jerseyNumber?: string;
  position?: string;
  stats?: {
    ppg?: number;
    rpg?: number;
    apg?: number;
  };
  height?: string;
  weight?: number;
  country?: string;
  school?: string;
  age?: number;
  birthdate?: string;
  draft?: string;
  experience?: string;
}

const PlayerBanner: React.FC<PlayerBannerProps> = ({
  playerId,
  firstName,
  lastName,
  teamCity,
  teamName,
  jerseyNumber,
  position,
  stats,
  height,
  weight,
  country,
  school,
  age,
  birthdate,
  draft,
  experience,
}) => {
  // Get team colors if player has a team
  const colors = teamCity && teamName 
    ? getTeamColorsByName(teamCity, teamName)
    : { primary: '#1976d2', text: '#FFFFFF' };

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
          {firstName.toUpperCase()}
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
          {lastName.toUpperCase()}
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
        {/* Player Image */}
        <Avatar
          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
          alt={`${firstName} ${lastName}`}
          sx={{
            width: { xs: 120, sm: 140, md: 160 },
            height: { xs: 120, sm: 140, md: 160 },
            backgroundColor: 'transparent',
            border: `3px solid ${colors.text}`,
            flexShrink: 0,
          }}
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/fallback-player.png';
          }}
        />

        {/* Player Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                fontSize: typography.size.caption,
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {teamName ? `${teamCity} ${teamName}` : 'Free Agent'} {jerseyNumber && `| #${jerseyNumber}`} {position && `| ${position}`}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h3, sm: typography.size.h2, md: typography.size.h1 },
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                mb: 0.5,
              }}
            >
              {firstName}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h3, sm: typography.size.h2, md: typography.size.h1 },
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {lastName}
            </Typography>
          </Box>

          {/* Stats Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: { xs: 2, sm: 3 },
              mt: 3,
            }}
          >
            {stats?.ppg !== undefined && (
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
                  {stats.ppg.toFixed(1)}
                </Typography>
              </Box>
            )}

            {stats?.rpg !== undefined && (
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
                  {stats.rpg.toFixed(1)}
                </Typography>
              </Box>
            )}

            {stats?.apg !== undefined && (
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
                  {stats.apg.toFixed(1)}
                </Typography>
              </Box>
            )}

            {height && (
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
                  HEIGHT
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {height}
                </Typography>
              </Box>
            )}

            {weight && (
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
                  WEIGHT
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {weight}lb ({Math.round(weight * 0.453592)}kg)
                </Typography>
              </Box>
            )}

            {country && (
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
                  COUNTRY
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {country}
                </Typography>
              </Box>
            )}

            {school && (
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
                  LAST ATTENDED
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {school}
                </Typography>
              </Box>
            )}

            {age !== undefined && (
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
                  AGE
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {age} years
                </Typography>
              </Box>
            )}

            {birthdate && (
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
                  BIRTHDATE
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {birthdate}
                </Typography>
              </Box>
            )}

            {draft && (
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
                  DRAFT
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {draft}
                </Typography>
              </Box>
            )}

            {experience && (
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
                  EXPERIENCE
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    color: colors.text,
                  }}
                >
                  {experience}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PlayerBanner;

