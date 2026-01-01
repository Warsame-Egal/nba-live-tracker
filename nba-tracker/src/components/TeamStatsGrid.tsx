import React from 'react';
import { Grid } from '@mui/material';
import { TeamStatsResponse } from '../types/teamstats';
import TeamStatsChart from './TeamStatsChart';

interface TeamStatsGridProps {
  data: TeamStatsResponse;
}

const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({ data }) => {
  return (
    <Grid container spacing={3}>
      {data.categories.map((category, idx) => (
        <Grid item xs={12} md={6} key={idx}>
          <TeamStatsChart category={category} />
        </Grid>
      ))}
    </Grid>
  );
};

export default TeamStatsGrid;

