import { Box, Typography, Avatar } from '@mui/material';
import { getTeamColorsByName } from '../utils/teamColors';

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

/**
 * Material 3 flat, compact player header banner.
 * Lives inside the main content surface, uses team primary color.
 */
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
}) => {
  const colors = teamCity && teamName 
    ? getTeamColorsByName(teamCity, teamName)
    : { primary: '#1976d2', text: '#FFFFFF' };

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
          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
          alt={`${firstName} ${lastName}`}
          sx={{
            width: { xs: 80, sm: 100 },
            height: { xs: 80, sm: 100 },
            backgroundColor: 'transparent',
            border: `2px solid ${colors.text}`,
            flexShrink: 0,
          }}
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '/fallback-player.png';
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              fontSize: '0.75rem',
              opacity: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {teamName ? `${teamCity} ${teamName}` : 'Free Agent'} {jerseyNumber && `• #${jerseyNumber}`} {position && `• ${position}`}
          </Typography>
          
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              color: colors.text,
              mb: 1,
            }}
          >
            {firstName} {lastName}
          </Typography>

          {stats && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
                gap: 2,
                mt: 2,
              }}
            >
              {stats.ppg !== undefined && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    PPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {stats.ppg.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {stats.rpg !== undefined && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    RPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {stats.rpg.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {stats.apg !== undefined && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    APG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {stats.apg.toFixed(1)}
                  </Typography>
                </Box>
              )}

              {height && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    HEIGHT
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {height}
                  </Typography>
                </Box>
              )}

              {weight && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
                    WEIGHT
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {weight} lbs
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

export default PlayerBanner;
