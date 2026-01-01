import React from 'react';
import { Box, Typography, Avatar, Paper, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { typography, borderRadius } from '../theme/designTokens';

interface SeasonLeadersProps {
  data: SeasonLeadersResponse;
}

const SeasonLeaders: React.FC<SeasonLeadersProps> = ({ data }) => {
  return (
    <Grid container spacing={3}>
      {data.categories.map((category, idx) => (
        <Grid item xs={12} sm={6} md={4} key={idx}>
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
              {category.category.toUpperCase()}
            </Typography>

            {category.leaders.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No data available
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {category.leaders.map((leader, leaderIdx) => (
                  <LeaderRow
                    key={leader.player_id}
                    leader={leader}
                    rank={leaderIdx + 1}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

interface LeaderRowProps {
  leader: {
    player_id: number;
    player_name: string;
    team_abbreviation?: string;
    position?: string;
    value: number;
  };
  rank: number;
}

const LeaderRow: React.FC<LeaderRowProps> = ({ leader, rank }) => {
  return (
    <Box
      component={Link}
      to={`/players/${leader.player_id}`}
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
        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.player_id}.png`}
        sx={{
          width: 40,
          height: 40,
          border: '1px solid',
          borderColor: 'divider',
        }}
        onError={e => {
          const target = e.currentTarget as HTMLImageElement;
          target.onerror = null;
          target.src = '';
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
          {leader.player_name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: typography.size.caption,
          }}
        >
          {[leader.team_abbreviation, leader.position].filter(Boolean).join(' • ') || 'N/A'}
        </Typography>
      </Box>
      <Typography
        variant="body1"
        sx={{
          fontWeight: typography.weight.bold,
          color: 'primary.main',
          fontSize: typography.size.body,
        }}
      >
        {leader.value.toFixed(1)}
      </Typography>
    </Box>
  );
};

export default SeasonLeaders;

