import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Week navigation buttons and month/year display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          onClick={handlePrevWeek}
          variant="outlined"
          size="small"
          sx={{
            minWidth: 40,
            height: 40,
            borderRadius: '50%',
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ChevronLeft fontSize="small" />
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 150, textAlign: 'center' }}>
          {format(currentWeekStart, 'MMMM yyyy')}
        </Typography>

        <Button
          onClick={handleNextWeek}
          variant="outlined"
          size="small"
          sx={{
            minWidth: 40,
            height: 40,
            borderRadius: '50%',
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
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
          p: 2,
          width: '100%',
          maxWidth: 600,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={1}>
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
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: isSelected ? 'primary.main' : 'transparent',
                    color: isToday ? 'primary.light' : isSelected ? 'primary.contrastText' : 'text.secondary',
                    fontWeight: isSelected ? 600 : 400,
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  {/* Day of week abbreviation (Mon, Tue, etc.) */}
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {format(day, 'EEE')}
                  </Typography>
                  {/* Day number */}
                  <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 'inherit' }}>
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
