import { useState, useEffect, useRef } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Box, IconButton, Typography, useTheme, alpha, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { ChevronLeft, ChevronRight, CalendarToday } from '@mui/icons-material';
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);
  
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

  /**
   * Handle date picker icon click - opens date picker dialog.
   */
  const handleDatePickerClick = () => {
    setTempDate(selectedDate);
    setDatePickerOpen(true);
  };

  /**
   * Handle date picker dialog close with selection.
   */
  const handleDatePickerClose = (apply: boolean) => {
    if (apply && tempDate) {
      const selected = parseISO(tempDate);
      const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
      setCurrentWeekStart(weekStart);
      setSelectedDate(tempDate);
    }
    setDatePickerOpen(false);
  };

  // Generate array of 7 days for the current week
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        width: { xs: '100%', sm: 'auto' },
        maxWidth: { xs: '100%', sm: 600 },
        flexShrink: 0,
      }}
    >
      {/* Left Navigation Arrow */}
      <IconButton
        onClick={handlePrevWeek}
        size="small"
        sx={{
          minWidth: { xs: 44, sm: 36 },
          minHeight: { xs: 44, sm: 36 },
          borderRadius: borderRadius.full,
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.secondary',
          transition: transitions.smooth,
          flexShrink: 0,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main',
            transform: 'scale(1.05)',
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
          gap: { xs: 0.75, sm: 1 },
          overflowX: 'auto',
          flex: 1,
          pr: { xs: 1, sm: 1.5 }, // Add padding-right to ensure last day (Saturday) is fully visible
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
          '&::-webkit-scrollbar': {
            height: 4,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: borderRadius.full,
            '&:hover': {
              backgroundColor: theme.palette.text.secondary,
            },
          },
          // Hide scrollbar on mobile
          '@media (max-width: 600px)': {
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          },
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
                minWidth: { xs: 60, sm: 64 }, // Better touch target on mobile
                minHeight: { xs: 56, sm: 64 }, // Better touch target on mobile
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1.5 }, // More padding for better touch
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                transition: transitions.smooth,
                backgroundColor: isSelected
                  ? alpha(theme.palette.primary.main, 0.12)
                  : 'transparent',
                border: isSelected
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : '1px solid transparent',
                color: isSelected
                  ? 'primary.main'
                  : isToday
                    ? 'primary.main'
                    : 'text.secondary',
                position: 'relative',
                '&:hover': {
                  backgroundColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.16)
                    : alpha(theme.palette.action.hover, 0.5),
                  transform: 'translateY(-2px)',
                  borderColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.4)
                    : 'divider',
                },
                // Today indicator dot (if not selected)
                ...(isToday && !isSelected && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: borderRadius.full,
                    backgroundColor: 'primary.main',
                  },
                }),
              }}
            >
              {/* Day Abbreviation (TUE, WED, etc.) */}
              <Typography
                sx={{
                  fontSize: { xs: typographyTokens.size.captionSmall.xs, sm: typographyTokens.size.caption.xs },
                  fontWeight: isSelected
                    ? typographyTokens.weight.bold
                    : typographyTokens.weight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: typographyTokens.letterSpacing.wider,
                  lineHeight: 1.2,
                  opacity: isSelected ? 1 : isToday ? 0.9 : 0.7,
                  mb: 0.25,
                }}
              >
                {dayAbbr}
              </Typography>
              
              {/* Date Number */}
              <Typography
                sx={{
                  fontSize: { xs: typographyTokens.size.body.xs, sm: typographyTokens.size.body.sm },
                  fontWeight: isSelected
                    ? typographyTokens.weight.bold
                    : isToday
                      ? typographyTokens.weight.semibold
                      : typographyTokens.weight.regular,
                  lineHeight: 1.2,
                }}
              >
                {dayNumber}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Right Navigation Arrow + Calendar Icon */}
      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
        <IconButton
          onClick={handleNextWeek}
          size="small"
          sx={{
            minWidth: { xs: 44, sm: 36 },
            minHeight: { xs: 44, sm: 36 },
            borderRadius: borderRadius.full,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.smooth,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
              transform: 'scale(1.05)',
            },
          }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
        
        <IconButton
          onClick={handleDatePickerClick}
          size="small"
          sx={{
            minWidth: { xs: 44, sm: 36 },
            minHeight: { xs: 44, sm: 36 },
            borderRadius: borderRadius.full,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            transition: transitions.smooth,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
              transform: 'scale(1.05)',
            },
          }}
        >
          <CalendarToday fontSize="small" />
        </IconButton>
      </Box>

      {/* Date Picker Dialog */}
      <Dialog 
        open={datePickerOpen} 
        onClose={() => handleDatePickerClose(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: borderRadius.md,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: typographyTokens.weight.bold }}>
            Select Date
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            fullWidth
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: borderRadius.sm,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button 
            onClick={() => handleDatePickerClose(false)}
            sx={{ 
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDatePickerClose(true)}
            variant="contained"
            sx={{ 
              textTransform: 'none',
              borderRadius: borderRadius.sm,
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyCalendar;
