import React from 'react';
import { Box, Typography } from '@mui/material';
import { Game } from '../types/scoreboard';
import { WinProbability } from '../types/scoreboard';
import { responsiveSpacing, typography, borderRadius } from '../theme/designTokens';
import { alpha, useTheme } from '@mui/material/styles';

interface WinProbabilityTrackerProps {
  games: Game[];
  winProbabilities: Map<string, WinProbability>;
}

/**
 * Component that displays real-time win probability for all live games.
 * Shows visual progress bars indicating the likelihood of each team winning.
 */
const WinProbabilityTracker: React.FC<WinProbabilityTrackerProps> = ({ games, winProbabilities }) => {
  const theme = useTheme();
  
  // Filter to only live games (gameStatus === 2)
  const liveGames = games.filter(game => game.gameStatus === 2);
  
  if (liveGames.length === 0) {
    return (
      <Box
        sx={{
          p: responsiveSpacing.container,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">
          No live games at the moment. Win probability will appear here when games are in progress.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: responsiveSpacing.container }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: typography.weight.bold,
          mb: 2,
          fontSize: typography.size.h6,
          color: 'text.primary',
        }}
      >
        Live Win Probability
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {liveGames.map(game => {
          const winProb = winProbabilities.get(game.gameId);
          const homeTeam = game.homeTeam;
          const awayTeam = game.awayTeam;
          
          // If no probability data, show placeholder
          if (!winProb) {
            return (
              <Box
                key={game.gameId}
                sx={{
                  p: 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: typography.weight.semibold }}>
                    {awayTeam.teamTricode} @ {homeTeam.teamTricode}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {game.gameStatusText}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Win probability data not available yet
                </Typography>
              </Box>
            );
          }
          
          const homeProb = winProb.home_win_prob * 100;
          const awayProb = winProb.away_win_prob * 100;
          
          // Determine which team is favored
          const homeFavored = homeProb > awayProb;
          const probDiff = Math.abs(homeProb - awayProb);
          
          return (
            <Box
              key={game.gameId}
              sx={{
                p: 2,
                borderRadius: borderRadius.md,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {/* Game header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: typography.weight.semibold }}>
                  {awayTeam.teamTricode} @ {homeTeam.teamTricode}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {game.gameStatusText}
                </Typography>
              </Box>
              
              {/* Win probability progress bar */}
              <Box sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    height: 32,
                    borderRadius: borderRadius.sm,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                  }}
                >
                  {/* Away team (left side) */}
                  <Box
                    sx={{
                      flex: awayProb,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      px: 1.5,
                      backgroundColor: homeFavored
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.3),
                      color: homeFavored ? 'text.secondary' : 'text.primary',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: typography.weight.semibold,
                        fontSize: typography.size.caption,
                      }}
                    >
                      {awayTeam.teamTricode} {awayProb.toFixed(1)}%
                    </Typography>
                  </Box>
                  
                  {/* Home team (right side) */}
                  <Box
                    sx={{
                      flex: homeProb,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      px: 1.5,
                      backgroundColor: homeFavored
                        ? alpha(theme.palette.primary.main, 0.3)
                        : alpha(theme.palette.primary.main, 0.1),
                      color: homeFavored ? 'text.primary' : 'text.secondary',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: typography.weight.semibold,
                        fontSize: typography.size.caption,
                      }}
                    >
                      {homeProb.toFixed(1)}% {homeTeam.teamTricode}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Additional info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {homeTeam.teamTricode} {homeTeam.score} - {awayTeam.score} {awayTeam.teamTricode}
                </Typography>
                {probDiff < 5 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Very close game
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default WinProbabilityTracker;

