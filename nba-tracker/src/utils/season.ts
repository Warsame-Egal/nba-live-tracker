/**
 * Utility functions for NBA season calculations and formatting.
 */

/**
 * Returns the current NBA season in YYYY-YY format.
 * NBA seasons start in October, so if the current month is October or later,
 * we're in the season that started that year. Otherwise, we're in the season
 * that started the previous year.
 */
export const getCurrentSeason = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (currentMonth >= 10) {
    return `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
  } else {
    return `${currentYear - 1}-${currentYear.toString().slice(2)}`;
  }
};

