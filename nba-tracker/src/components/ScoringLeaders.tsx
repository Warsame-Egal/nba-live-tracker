import { Game } from '../types/scoreboard';
import { Link } from 'react-router-dom';
import { Box, Typography, Avatar, Link as MuiLink, Paper, Chip } from '@mui/material';
import { EmojiEvents, Person } from '@mui/icons-material';

interface ScoringLeadersProps {
  selectedGame: Game;
}

/**
 * Helper function to fix encoding issues with player names.
 */
const fixEncoding = (str: string) => decodeURIComponent(escape(str));

/**
 * Modern component that displays the top scorers for both teams in a game.
 * Shows player photo, name, position, and key stats (points, rebounds, assists).
 */
const ScoringLeaders = ({ selectedGame }: ScoringLeadersProps) => {
  const { gameLeaders } = selectedGame;

  // Don't show anything if there are no leaders
  if (!gameLeaders?.homeLeaders && !gameLeaders?.awayLeaders) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundImage: 'linear-gradient(135deg, rgba(25, 118, 210, 0.03) 0%, rgba(25, 118, 210, 0.01) 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, sm: 2.5 } }}>
        <EmojiEvents sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'text.primary',
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
          }}
        >
          Game Leaders
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
        {/* Away team leader */}
        {gameLeaders?.awayLeaders && (
          <LeaderCard
            leader={gameLeaders.awayLeaders}
            teamName={selectedGame.awayTeam.teamName}
            teamTricode={selectedGame.awayTeam.teamTricode}
            isHome={false}
          />
        )}
        {/* Home team leader */}
        {gameLeaders?.homeLeaders && (
          <LeaderCard
            leader={gameLeaders.homeLeaders}
            teamName={selectedGame.homeTeam.teamName}
            teamTricode={selectedGame.homeTeam.teamTricode}
            isHome={true}
          />
        )}
      </Box>
    </Paper>
  );
};

interface LeaderCardProps {
  leader: {
    personId: number;
    name: string;
    jerseyNum: string;
    position: string;
    teamTricode: string;
    points: number;
    rebounds: number;
    assists: number;
  };
  teamName: string;
  teamTricode: string;
  isHome: boolean;
}

/**
 * Modern card component that displays one team's scoring leader.
 */
const LeaderCard = ({ leader, teamName, teamTricode, isHome }: LeaderCardProps) => {
  // Check if player ID is valid (not 0, null, or undefined)
  const isValidPlayerId = leader.personId && leader.personId > 0;
  // URL for player photo
  const avatarUrl = isValidPlayerId ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png` : '';

  // Avatar component (clickable only if valid player ID)
  const AvatarComponent = isValidPlayerId ? (
    <MuiLink component={Link} to={`/players/${leader.personId}`} sx={{ textDecoration: 'none' }}>
      <Avatar
        src={avatarUrl}
        alt={leader.name}
        sx={{
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
          border: '2px solid',
          borderColor: isHome ? 'primary.main' : 'divider',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
          },
        }}
        onError={e => {
          const target = e.currentTarget as HTMLImageElement;
          target.onerror = null;
          target.src = '';
        }}
      />
    </MuiLink>
  ) : (
    <Avatar
      sx={{
        width: { xs: 48, sm: 56 },
        height: { xs: 48, sm: 56 },
        border: '2px solid',
        borderColor: 'divider',
        backgroundColor: 'action.disabledBackground',
        opacity: 0.5,
      }}
    >
      <Person sx={{ fontSize: { xs: 24, sm: 28 }, color: 'text.disabled' }} />
    </Avatar>
  );

  // Name component (clickable only if valid player ID)
  const NameComponent = isValidPlayerId ? (
    <MuiLink
      component={Link}
      to={`/players/${leader.personId}`}
      sx={{
        color: 'text.primary',
        fontWeight: 700,
        textDecoration: 'none',
        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        '&:hover': {
          color: 'primary.main',
          textDecoration: 'underline',
        },
      }}
    >
      {fixEncoding(leader.name)}
    </MuiLink>
  ) : (
    <Typography
      sx={{
        color: 'text.secondary',
        fontWeight: 700,
        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontStyle: 'italic',
      }}
    >
      {fixEncoding(leader.name)}
    </Typography>
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        backgroundColor: isHome ? 'rgba(25, 118, 210, 0.05)' : 'rgba(255, 255, 255, 0.02)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: isHome ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      {/* Team name header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip
          label={teamTricode}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 700,
            backgroundColor: isHome ? 'primary.main' : 'text.secondary',
            color: 'white',
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
          }}
        >
          {teamName}
        </Typography>
      </Box>

      {/* Player info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
        {/* Player photo (clickable only if valid player ID) */}
        {AvatarComponent}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Player name and position */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            {NameComponent}
            {/* Position badge */}
            {leader.position && (
              <Chip
                icon={<Person sx={{ fontSize: 12 }} />}
                label={leader.position}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'text.secondary',
                }}
              />
            )}
            {/* Jersey number */}
            {leader.jerseyNum && (
              <Chip
                label={`#${leader.jerseyNum}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              />
            )}
          </Box>

          {/* Player stats */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1.5, sm: 2 },
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <StatBadge label="PTS" value={leader.points} isHighlight />
            <StatBadge label="REB" value={leader.rebounds} />
            <StatBadge label="AST" value={leader.assists} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Helper component for displaying stat badges.
 */
const StatBadge = ({ label, value, isHighlight = false }: { label: string; value: number; isHighlight?: boolean }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.25,
      px: { xs: 1, sm: 1.5 },
      py: 0.5,
      backgroundColor: isHighlight ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
      borderRadius: 1,
      minWidth: { xs: 45, sm: 50 },
    }}
  >
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        fontSize: { xs: '0.65rem', sm: '0.7rem' },
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        fontSize: { xs: '0.875rem', sm: '1rem' },
        color: isHighlight ? 'primary.main' : 'text.primary',
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default ScoringLeaders;
