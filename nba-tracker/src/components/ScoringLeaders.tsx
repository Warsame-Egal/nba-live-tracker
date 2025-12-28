import { Game } from '../types/scoreboard';
import { Link } from 'react-router-dom';
import { Box, Typography, Avatar, Link as MuiLink, Paper } from '@mui/material';

interface ScoringLeadersProps {
  selectedGame: Game;
}

const fixEncoding = (str: string) => decodeURIComponent(escape(str));

const ScoringLeaders = ({ selectedGame }: ScoringLeadersProps) => {
  const { gameLeaders } = selectedGame;

  if (!gameLeaders?.homeLeaders && !gameLeaders?.awayLeaders) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'text.secondary',
          mb: 2,
          display: 'block',
        }}
      >
        Game Leaders
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {gameLeaders?.homeLeaders && (
          <LeaderRow
            leader={gameLeaders.homeLeaders}
            teamName={selectedGame.homeTeam.teamName}
            teamColor="primary"
          />
        )}
        {gameLeaders?.awayLeaders && (
          <LeaderRow
            leader={gameLeaders.awayLeaders}
            teamName={selectedGame.awayTeam.teamName}
            teamColor="secondary"
          />
        )}
      </Box>
    </Paper>
  );
};

interface LeaderRowProps {
  leader: {
    personId: number;
    name: string;
    points: number;
    rebounds: number;
    assists: number;
  };
  teamName: string;
  teamColor: 'primary' | 'secondary';
}

const LeaderRow = ({ leader, teamName, teamColor }: LeaderRowProps) => {
  const avatarUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`;

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: `${teamColor}.main`,
          mb: 1,
          display: 'block',
          fontSize: '0.75rem',
        }}
      >
        {teamName}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <MuiLink component={Link} to={`/players/${leader.personId}`} sx={{ textDecoration: 'none' }}>
          <Avatar
            src={avatarUrl}
            alt={leader.name}
            sx={{
              width: 36,
              height: 36,
              border: '2px solid',
              borderColor: 'divider',
            }}
            onError={e => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = '';
            }}
          />
        </MuiLink>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MuiLink
            component={Link}
            to={`/players/${leader.personId}`}
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              '&:hover': {
                textDecoration: 'underline',
                color: 'primary.light',
              },
            }}
          >
            {fixEncoding(leader.name)}
          </MuiLink>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <span>{leader.points} PTS</span>
            <span>•</span>
            <span>{leader.rebounds} REB</span>
            <span>•</span>
            <span>{leader.assists} AST</span>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ScoringLeaders;
