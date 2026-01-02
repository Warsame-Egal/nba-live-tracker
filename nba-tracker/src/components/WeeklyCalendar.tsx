import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { borderRadius, transitions, typography } from '../theme/designTokens';

interface WeeklyCalendarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

/**
 * Component that displays a weekly calendar for selecting dates.
 * Shows 7 days and allows navigation to previous/next week.
 */
const WeeklyCalendar = ({ selectedDate, setSelectedDate }: WeeklyCalendarProps) => {
  // The start of the current week being displayed
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );

  /**
   * Set default date to today if no date is selected.
   */
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [selectedDate, setSelectedDate]);

  /**
   * Navigate to previous week.
   */
  const handlePrevWeek = () => setCurrentWeekStart(subDays(currentWeekStart, 7));
  
  /**
   * Navigate to next week.
   */
  const handleNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Week navigation buttons and month/year display - Compact */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Button
          onClick={handlePrevWeek}
          variant="outlined"
          size="small"
          sx={{
            minWidth: 28,
            height: 28,
            borderRadius: borderRadius.full,
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.normal,
            p: 0,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              color: 'primary.main',
            },
          }}
        >
          <ChevronLeft fontSize="small" />
        </Button>

        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: '0.875rem',
            color: 'text.primary',
          }}
        >
          {format(currentWeekStart, 'MMM yyyy')}
        </Typography>

        <Button
          onClick={handleNextWeek}
          variant="outlined"
          size="small"
          sx={{
            minWidth: 28,
            height: 28,
            borderRadius: borderRadius.full,
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.normal,
            p: 0,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              color: 'primary.main',
            },
          }}
        >
          <ChevronRight fontSize="small" />
        </Button>
      </Box>

      {/* Calendar grid with 7 days - Compact */}
      <Paper
        elevation={0}
        sx={{
          p: 1, // Material 3: 8dp - tighter spacing
          width: '100%',
          backgroundColor: 'background.paper', // Material 3: surface
          border: '1px solid',
          borderColor: 'divider', // Material 3: outline
          borderRadius: 1.5, // Material 3: 12dp
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Grid container spacing={0.25}>
          {Array.from({ length: 7 }).map((_, i) => {
            // Calculate the date for this day
            const day = addDays(currentWeekStart, i);
            const formattedDay = format(day, 'yyyy-MM-dd');
            const isSelected = formattedDay === selectedDate;
            const isToday = isSameDay(day, new Date());

            return (
              <Grid item xs={12 / 7} key={formattedDay}>
                <Button
                  onClick={() => setSelectedDate(formattedDay)}
                  fullWidth
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0,
                    p: { xs: 0.5, sm: 0.75 },
                    minHeight: { xs: 44, sm: 48 }, // Reduced height
                    borderRadius: borderRadius.sm,
                    backgroundColor: isSelected ? 'primary.main' : 'transparent',
                    color: isToday && !isSelected ? 'primary.main' : isSelected ? 'primary.contrastText' : 'text.secondary',
                    fontWeight: isSelected ? typography.weight.bold : isToday ? typography.weight.semibold : typography.weight.regular,
                    transition: transitions.smooth,
                    position: 'relative',
                    '&::before': isToday && !isSelected
                      ? {
                          content: '""',
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 4,
                          height: 4,
                          borderRadius: borderRadius.full,
                          backgroundColor: 'primary.main',
                        }
                      : {},
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  {/* Day of week abbreviation (Mon, Tue, etc.) */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                      opacity: isSelected ? 1 : 0.6,
                      fontWeight: typography.weight.semibold,
                      lineHeight: 1.2,
                    }}
                  >
                    {format(day, 'EEE')}
                  </Typography>
                  {/* Day number */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 'inherit',
                      lineHeight: 1.2,
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};

export default WeeklyCalendar;
