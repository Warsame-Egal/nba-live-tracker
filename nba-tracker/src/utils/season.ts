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

/**
 * Generates a list of NBA season strings, starting from the current season
 * and going backwards for a specified number of years.
 * @param numSeasons The number of seasons to generate, including the current one. Defaults to 5.
 * @returns An array of season strings (e.g., ["2024-25", "2023-24", ...]).
 */
export const getSeasonOptions = (numSeasons: number = 5): string[] => {
  const seasons: string[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Determine the start year of the current NBA season
  const currentSeasonStartYear = currentMonth >= 10 ? currentYear : currentYear - 1;

  // Generate seasons going backwards from the current season
  for (let i = 0; i < numSeasons; i++) {
    const year = currentSeasonStartYear - i;
    const seasonStr = `${year}-${(year + 1).toString().slice(2)}`;
    seasons.push(seasonStr);
  }
  return seasons;
};

