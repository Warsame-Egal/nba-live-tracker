import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Box, IconButton, Typography, Collapse, useTheme, alpha } from '@mui/material';
import { ChevronLeft, ChevronRight, ExpandMore } from '@mui/icons-material';
import { borderRadius, transitions, typography as typographyTokens } from '../theme/designTokens';

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** When true, tapping the date row expands to show full week strip */
  expandable?: boolean;
}

/**
 * Compact date navigator: "Today, March 16" with prev/next arrows.
 * Optionally expands to show full week when the date is tapped.
 */
const DateNavigator = ({ selectedDate, onDateChange, expandable = true }: DateNavigatorProps) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const selected = parseISO(selectedDate);
  const today = new Date();
  const isToday = isSameDay(selected, today);
  const displayLabel = isToday
    ? `Today, ${format(selected, 'MMMM d')}`
    : format(selected, 'EEEE, MMMM d');

  const handlePrev = () => {
    const next = subDays(selected, 1);
    onDateChange(format(next, 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const next = addDays(selected, 1);
    onDateChange(format(next, 'yyyy-MM-dd'));
  };

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          width: '100%',
        }}
      >
        <IconButton
          onClick={handlePrev}
          size="small"
          sx={{
            minWidth: 44,
            minHeight: 44,
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
        <Box
          onClick={expandable ? () => setExpanded(e => !e) : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            flex: 1,
            py: 0.75,
            cursor: expandable ? 'pointer' : 'default',
            borderRadius: borderRadius.sm,
            transition: transitions.smooth,
            ...(expandable && {
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
              },
            }),
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: typographyTokens.weight.semibold,
              color: 'text.primary',
            }}
          >
            {displayLabel}
          </Typography>
          {expandable && (
            <ExpandMore
              sx={{
                fontSize: 20,
                color: 'text.secondary',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: transitions.smooth,
              }}
            />
          )}
        </Box>
        <IconButton
          onClick={handleNext}
          size="small"
          sx={{
            minWidth: 44,
            minHeight: 44,
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

      {expandable && (
        <Collapse in={expanded}>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              justifyContent: 'center',
              flexWrap: 'wrap',
              pt: 1,
              pb: 0.5,
            }}
          >
            {weekDays.map(day => {
              const formattedDay = format(day, 'yyyy-MM-dd');
              const isSelected = formattedDay === selectedDate;
              const isTodayDay = isSameDay(day, today);
              const dayAbbr = format(day, 'EEE').toUpperCase();
              const dayNumber = format(day, 'd');
              return (
                <Box
                  key={formattedDay}
                  onClick={() => {
                    onDateChange(formattedDay);
                    setExpanded(false);
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    width: 44,
                    minHeight: 44,
                    height: 44,
                    borderRadius: borderRadius.sm,
                    cursor: 'pointer',
                    transition: transitions.smooth,
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                    color: isSelected
                      ? 'primary.main'
                      : isTodayDay
                        ? 'primary.main'
                        : 'text.secondary',
                    '&:hover': {
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.action.hover, 0.4),
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>{dayAbbr}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500 }}>
                    {dayNumber}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default DateNavigator;
