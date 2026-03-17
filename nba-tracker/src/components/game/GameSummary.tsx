import React from 'react';
import { Typography, Paper, Skeleton, Button } from '@mui/material';
import { typography, borderRadius } from '../../theme/designTokens';

interface GameSummaryProps {
  summary: string | null;
  loading?: boolean;
  /** Game status from API: 'live' | 'upcoming' | 'completed'. Used to pick the right empty-state message. */
  status?: string;
  /** Called when user clicks Try Again in completed-game empty state. */
  onRetry?: () => void;
}

/**
 * AI post-game recap: 3 paragraphs. Skeleton while loading; message if null/unavailable.
 */
const GameSummary: React.FC<GameSummaryProps> = ({ summary, loading = false, status = '', onRetry }) => {
  const statusNorm = (status || '').toLowerCase();
  const isLive = statusNorm === 'live';
  const isUpcoming = statusNorm === 'upcoming';
  const isCompleted = statusNorm === 'completed';
  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.lg,
          backgroundColor: 'background.paper',
        }}
      >
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="88%" sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
      </Paper>
    );
  }

  if (summary == null || summary === '') {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.lg,
          backgroundColor: 'background.paper',
          textAlign: 'center',
        }}
      >
        <Typography color="text.secondary" sx={{ mb: isCompleted && onRetry ? 2 : 0 }}>
          {isLive
            ? "AI recap is generated after the game ends. Check back when the game is final."
            : isUpcoming
              ? "AI recap will be available after the game ends."
              : isCompleted
                ? "AI recap couldn't be generated. This may be due to rate limits or API configuration."
                : "No AI recap for this game. Summaries are generated for completed games and require Groq to be configured."}
        </Typography>
        {isCompleted && onRetry && (
          <Button variant="outlined" size="small" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.lg,
        backgroundColor: 'background.paper',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: typography.weight.bold,
          mb: 1.5,
          fontSize: '0.9375rem',
        }}
      >
        Game recap
      </Typography>
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          color: 'text.primary',
        }}
      >
        {summary}
      </Typography>
    </Paper>
  );
};

export default GameSummary;
