import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { typography, borderRadius, transitions } from '../theme/designTokens';

interface SeasonLeadersProps {
  data: SeasonLeadersResponse;
}

const SeasonLeaders: React.FC<SeasonLeadersProps> = ({ data }) => {
  // Determine if a category is a percentage
  const isPercentageCategory = (categoryName: string): boolean => {
    return categoryName.toLowerCase().includes('percentage') || categoryName.toLowerCase().includes('pct');
  };

  // Determine if a category should show whole numbers
  const isWholeNumberCategory = (categoryName: string): boolean => {
    return categoryName.toLowerCase().includes('made') || categoryName.toLowerCase().includes('total');
  };

  // Format value based on category type
  const formatValue = (value: number, categoryName: string): string => {
    if (isPercentageCategory(categoryName)) {
      return `${value.toFixed(1)}%`;
    } else if (isWholeNumberCategory(categoryName)) {
      return value.toString();
    } else {
      return value.toFixed(1);
    }
  };

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      {data.categories.map((category, idx) => (
        <Grid item xs={12} sm={6} md={4} key={idx}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 }, // Material 3: 24dp
              backgroundColor: 'background.paper', // Material 3: surface
              border: '1px solid',
              borderColor: 'divider', // Material 3: outline
              borderRadius: 1.5, // Material 3: 12dp
              height: '100%',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                mb: { xs: 2, sm: 2.5 },
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.h6 },
                color: 'text.primary',
              }}
            >
              {category.category}
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
                    formattedValue={formatValue(leader.value, category.category)}
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
  formattedValue: string;
}

const LeaderRow: React.FC<LeaderRowProps> = ({ leader, rank, formattedValue }) => {
  return (
    <Box
      component={Link}
      to={`/player/${leader.player_id}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textDecoration: 'none',
        color: 'text.primary',
        p: { xs: 1, sm: 1.5 },
        borderRadius: borderRadius.sm,
        transition: transitions.normal,
        '&:hover': {
          backgroundColor: 'action.hover',
          color: 'text.primary', // Neutral color on hover, not blue
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.bold,
            color: 'text.secondary',
            minWidth: 24,
            fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall },
          }}
        >
          {rank}.
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'text.primary',
            flex: 1,
            minWidth: 0,
          }}
        >
          {leader.player_name}
          {leader.team_abbreviation && (
            <Typography
              component="span"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall },
                color: 'primary.main',
                ml: 0.5,
              }}
            >
              {leader.team_abbreviation}
            </Typography>
          )}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: typography.weight.bold,
          color: 'primary.main',
          fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall },
          ml: 1,
        }}
      >
        {formattedValue}
      </Typography>
    </Box>
  );
};

export default SeasonLeaders;
