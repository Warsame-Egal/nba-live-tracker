import { useState, useEffect, useRef } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Box, IconButton, Typography, useTheme, alpha } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { borderRadius, transitions, typography as typographyTokens } from '../theme/designTokens';

interface WeeklyCalendarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

/**
 * Modern ESPN-style horizontal calendar component.
 * Displays dates in a horizontal scrollable strip with navigation arrows and calendar icon.
 */
const WeeklyCalendar = ({ selectedDate, setSelectedDate }: WeeklyCalendarProps) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // The start of the current week being displayed
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const selected = selectedDate ? parseISO(selectedDate) : new Date();
    return startOfWeek(selected, { weekStartsOn: 0 });
  });

  /**
   * Set default date to today if no date is selected.
   */
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [selectedDate, setSelectedDate]);

  /**
   * Update week start when selected date changes (if it's outside current week).
   */
  useEffect(() => {
    if (selectedDate) {
      const selected = parseISO(selectedDate);
      const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
      if (!isSameDay(weekStart, currentWeekStart)) {
        setCurrentWeekStart(weekStart);
      }
    }
  }, [selectedDate]);

  /**
   * Navigate to previous week.
   */
  const handlePrevWeek = () => {
    const newWeekStart = subDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeekStart);
    // Scroll to start of container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };
  
  /**
   * Navigate to next week.
   */
  const handleNextWeek = () => {
    const newWeekStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeekStart);
    // Scroll to start of container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Generate array of 7 days for the current week
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 0.75 },
        width: { xs: '100%', sm: 'fit-content' },
        maxWidth: '100%',
        flexShrink: 0,
      }}
    >
      {/* Left Navigation Arrow */}
      <IconButton
        onClick={handlePrevWeek}
        size="small"
        sx={{
          minWidth: { xs: 32, sm: 28 },
          minHeight: { xs: 32, sm: 28 },
          width: { xs: 32, sm: 28 },
          height: { xs: 32, sm: 28 },
          padding: 0,
          borderRadius: borderRadius.sm,
          color: 'text.secondary',
          transition: transitions.smooth,
          flexShrink: 0,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main',
          },
        }}
      >
        <ChevronLeft fontSize="small" />
      </IconButton>

      {/* Horizontal Date Strip */}
      <Box
        ref={scrollContainerRef}
        sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 0.75 },
          overflowX: 'hidden', // Prevent horizontal scroll
          flexShrink: 0,
        }}
      >
        {weekDays.map((day) => {
          const formattedDay = format(day, 'yyyy-MM-dd');
          const isSelected = formattedDay === selectedDate;
          const isToday = isSameDay(day, new Date());
          const dayAbbr = format(day, 'EEE').toUpperCase();
          const dayNumber = format(day, 'd');

          return (
            <Box
              key={formattedDay}
              onClick={() => setSelectedDate(formattedDay)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: { xs: 'clamp(40px, 10vw, 48px)', sm: 52 },
                width: { xs: 'clamp(40px, 10vw, 48px)', sm: 52 },
                minHeight: { xs: 'clamp(40px, 10vw, 48px)', sm: 52 },
                height: { xs: 'clamp(40px, 10vw, 48px)', sm: 52 },
                px: { xs: 0.5, sm: 1.25 },
                py: { xs: 0.5, sm: 1 },
                flexShrink: 0,
                borderRadius: borderRadius.sm,
                cursor: 'pointer',
                transition: transitions.smooth,
                backgroundColor: isSelected
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
                color: isSelected
                  ? 'primary.main'
                  : isToday
                    ? 'primary.main'
                    : 'text.secondary',
                position: 'relative',
                '&:hover': {
                  backgroundColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.action.hover, 0.4),
                },
                // Today indicator dot (if not selected)
                ...(isToday && !isSelected && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 4,
                    height: 4,
                    borderRadius: borderRadius.full,
                    backgroundColor: 'primary.main',
                  },
                }),
              }}
            >
              {/* Day Abbreviation (TUE, WED, etc.) */}
              <Typography
                sx={{
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  fontWeight: isSelected
                    ? typographyTokens.weight.bold
                    : typographyTokens.weight.medium,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: 1,
                  opacity: isSelected ? 1 : isToday ? 0.9 : 0.65,
                  mb: 0.25,
                }}
              >
                {dayAbbr}
              </Typography>
              
              {/* Date Number */}
              <Typography
                sx={{
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  fontWeight: isSelected
                    ? typographyTokens.weight.bold
                    : isToday
                      ? typographyTokens.weight.semibold
                      : typographyTokens.weight.regular,
                  lineHeight: 1,
                }}
              >
                {dayNumber}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Right Navigation Arrow */}
      <IconButton
        onClick={handleNextWeek}
        size="small"
        sx={{
          minWidth: { xs: 32, sm: 28 },
          minHeight: { xs: 32, sm: 28 },
          width: { xs: 32, sm: 28 },
          height: { xs: 32, sm: 28 },
          padding: 0,
          borderRadius: borderRadius.sm,
          color: 'text.secondary',
          transition: transitions.smooth,
          flexShrink: 0,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main',
          },
        }}
      >
        <ChevronRight fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default WeeklyCalendar;
