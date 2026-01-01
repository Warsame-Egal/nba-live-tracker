import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { Link } from 'react-router-dom';
import { TeamStatCategory } from '../types/teamstats';
import { typography, borderRadius } from '../theme/designTokens';

interface TeamStatsChartProps {
  category: TeamStatCategory;
}

const teamNameToAbbreviation: { [key: string]: string } = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
};

const getTeamAbbreviation = (teamName: string, apiAbbreviation?: string): string => {
  if (apiAbbreviation) return apiAbbreviation;
  return teamNameToAbbreviation[teamName] || '';
};

const TeamStatsChart: React.FC<TeamStatsChartProps> = ({ category }) => {
  if (category.teams.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
          height: '100%',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            mb: 2,
            fontSize: typography.size.h6,
            color: 'text.primary',
          }}
        >
          {category.category_name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.md,
        height: '100%',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: typography.weight.bold,
          mb: 2,
          fontSize: typography.size.h6,
          color: 'text.primary',
        }}
      >
        {category.category_name.toUpperCase()}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {category.teams.map((team, index) => (
          <LeaderRow
            key={team.team_id}
            team={team}
            rank={index + 1}
          />
        ))}
      </Box>
    </Paper>
  );
};

interface LeaderRowProps {
  team: {
    team_id: number;
    team_name: string;
    team_abbreviation?: string;
    value: number;
  };
  rank: number;
}

const LeaderRow: React.FC<LeaderRowProps> = ({ team, rank }) => {
  const abbreviation = getTeamAbbreviation(team.team_name, team.team_abbreviation);
  const logoPath = abbreviation ? `/logos/${abbreviation}.svg` : '/logos/default.svg';

  return (
    <Box
      component={Link}
      to={`/team/${team.team_id}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',
        color: 'inherit',
        p: 1,
        borderRadius: borderRadius.sm,
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: typography.weight.bold,
          color: 'text.secondary',
          minWidth: 24,
          fontSize: typography.size.bodySmall,
        }}
      >
        {rank}.
      </Typography>
      <Avatar
        src={logoPath}
        alt={team.team_name}
        sx={{
          width: 40,
          height: 40,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'transparent',
        }}
        onError={e => {
          const target = e.currentTarget as HTMLImageElement;
          target.onerror = null;
          target.src = '/logos/default.svg';
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.body,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {team.team_name}
        </Typography>
        {abbreviation && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: typography.size.caption,
            }}
          >
            {abbreviation}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body1"
        sx={{
          fontWeight: typography.weight.bold,
          color: 'primary.main',
          fontSize: typography.size.body,
        }}
      >
        {team.value.toFixed(1)}
      </Typography>
    </Box>
  );
};

export default TeamStatsChart;

