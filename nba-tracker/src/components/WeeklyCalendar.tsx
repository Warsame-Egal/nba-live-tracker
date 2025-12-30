import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { responsiveSpacing, borderRadius, transitions, typography, shadows } from '../theme/designTokens';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: { xs: '100%', sm: 500 } }}>
      {/* Week navigation buttons and month/year display */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: responsiveSpacing.elementCompact }}>
        <Button
          onClick={handlePrevWeek}
          variant="outlined"
          size="small"
          sx={{
            minWidth: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            borderRadius: borderRadius.full,
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.normal,
            p: 0,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              color: 'primary.main',
              transform: 'scale(1.1)',
            },
          }}
        >
          <ChevronLeft fontSize="small" />
        </Button>

        <Typography
          variant="body1"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.body,
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
            minWidth: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            borderRadius: borderRadius.full,
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.normal,
            p: 0,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              color: 'primary.main',
              transform: 'scale(1.1)',
            },
          }}
        >
          <ChevronRight fontSize="small" />
        </Button>
      </Box>

      {/* Calendar grid with 7 days */}
      <Paper
        elevation={0}
        sx={{
          p: responsiveSpacing.elementCompact,
          width: '100%',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.sm,
          transition: transitions.normal,
          '&:hover': {
            borderColor: 'primary.light',
            boxShadow: shadows.sm,
          },
        }}
      >
        <Grid container spacing={0.5}>
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
                    gap: 0.25,
                    p: { xs: 0.75, sm: 1 },
                    minHeight: { xs: 56, sm: 64 },
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
                          top: 6,
                          right: 6,
                          width: 5,
                          height: 5,
                          borderRadius: borderRadius.full,
                          backgroundColor: 'primary.main',
                        }
                      : {},
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: isSelected ? shadows.primary.md : shadows.sm,
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  {/* Day of week abbreviation (Mon, Tue, etc.) */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: typography.size.captionSmall,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                      opacity: isSelected ? 1 : 0.6,
                      fontWeight: typography.weight.semibold,
                    }}
                  >
                    {format(day, 'EEE')}
                  </Typography>
                  {/* Day number */}
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.9375rem', sm: '1rem' },
                      fontWeight: 'inherit',
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
