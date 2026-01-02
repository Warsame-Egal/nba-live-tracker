// Get current NBA season (e.g., "2024-25")
// Seasons start in October, so Oct-Dec uses current year, Jan-Sep uses previous year
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

// Build list of recent seasons for dropdowns
// Returns current season plus previous ones going backwards
export const getSeasonOptions = (numSeasons: number = 5): string[] => {
  const seasons: string[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentSeasonStartYear = currentMonth >= 10 ? currentYear : currentYear - 1;
  for (let i = 0; i < numSeasons; i++) {
    const year = currentSeasonStartYear - i;
    const seasonStr = `${year}-${(year + 1).toString().slice(2)}`;
    seasons.push(seasonStr);
  }
  return seasons;
};

