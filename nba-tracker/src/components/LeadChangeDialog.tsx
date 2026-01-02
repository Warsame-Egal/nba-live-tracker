import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { Close, TrendingDown } from '@mui/icons-material';
import { typography, borderRadius } from '../theme/designTokens';
import { useTheme } from '@mui/material/styles';

export interface LeadChangeExplanation {
  game_id: string;
  summary: string;
  key_factors: string[];
}

interface LeadChangeDialogProps {
  open: boolean;
  onClose: () => void;
  explanation: LeadChangeExplanation | null;
  homeTeam: string;
  awayTeam: string;
}

/**
 * Lightweight dialog for lead change deep-dive explanation.
 * Appears inside game card context.
 */
const LeadChangeDialog: React.FC<LeadChangeDialogProps> = ({
  open,
  onClose,
  explanation,
  homeTeam: _homeTeam,
  awayTeam: _awayTeam,
}) => {
  const theme = useTheme();

  if (!explanation) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: borderRadius.md,
          m: { xs: 2, sm: 3 },
        },
      }}
      aria-labelledby="lead-change-dialog-title"
      aria-describedby="lead-change-dialog-description"
    >
      <DialogTitle
        id="lead-change-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDown sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.h6,
            }}
          >
            Why did the lead change?
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 'auto',
            p: 0.5,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: 'action.hover',
            },
          }}
          aria-label="Close dialog"
        >
          <Close />
        </Button>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        <Box id="lead-change-dialog-description">
          {/* Summary */}
          {explanation.summary && (
            <Typography
              variant="body1"
              sx={{
                fontSize: typography.size.body,
                fontWeight: typography.weight.medium,
                color: 'text.primary',
                lineHeight: 1.6,
                mb: 2.5,
              }}
            >
              {explanation.summary}
            </Typography>
          )}

          {/* Key Factors */}
          {explanation.key_factors && explanation.key_factors.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: typography.size.bodySmall,
                  fontWeight: typography.weight.semibold,
                  color: 'text.secondary',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Key Factors
              </Typography>
              <List dense sx={{ py: 0 }}>
                {explanation.key_factors.map((factor, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      px: 0,
                      py: 0.75,
                      alignItems: 'flex-start',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: theme.palette.primary.main,
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: typography.size.bodySmall,
                            color: 'text.primary',
                            lineHeight: 1.5,
                          }}
                        >
                          {factor}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: typography.weight.medium,
            borderRadius: borderRadius.sm,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadChangeDialog;

