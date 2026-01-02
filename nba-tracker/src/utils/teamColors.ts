// Team colors for banners and branding
// Official team colors as of 2025

export interface TeamColors {
  primary: string;
  secondary?: string;
  text: string; // Text color that contrasts with primary
}

export const teamColors: { [teamId: number]: TeamColors } = {
  // Eastern Conference - Atlantic
  1610612738: { primary: '#007A33', secondary: '#BA9653', text: '#FFFFFF' }, // Boston Celtics
  1610612751: { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' }, // Brooklyn Nets
  1610612752: { primary: '#1D1160', secondary: '#C8102E', text: '#FFFFFF' }, // New York Knicks
  1610612755: { primary: '#006BB6', secondary: '#ED174C', text: '#FFFFFF' }, // Philadelphia 76ers
  1610612761: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' }, // Toronto Raptors

  // Eastern Conference - Central
  1610612739: { primary: '#860038', secondary: '#FDBB30', text: '#FFFFFF' }, // Cleveland Cavaliers
  1610612765: { primary: '#C8102E', secondary: '#1D42BA', text: '#FFFFFF' }, // Detroit Pistons
  1610612754: { primary: '#002D62', secondary: '#FDBB30', text: '#FFFFFF' }, // Indiana Pacers
  1610612749: { primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' }, // Milwaukee Bucks
  1610612741: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' }, // Chicago Bulls

  // Eastern Conference - Southeast
  1610612737: { primary: '#E03A3E', secondary: '#C1D32F', text: '#FFFFFF' }, // Atlanta Hawks
  1610612766: { primary: '#1D1160', secondary: '#00788C', text: '#FFFFFF' }, // Charlotte Hornets
  1610612748: { primary: '#98002E', secondary: '#F9A01B', text: '#FFFFFF' }, // Miami Heat
  1610612753: { primary: '#0077C0', secondary: '#C4CED4', text: '#FFFFFF' }, // Orlando Magic
  1610612764: { primary: '#002B5C', secondary: '#E31837', text: '#FFFFFF' }, // Washington Wizards

  // Western Conference - Northwest
  1610612743: { primary: '#0E2240', secondary: '#FEC524', text: '#FFFFFF' }, // Denver Nuggets
  1610612750: { primary: '#0C2340', secondary: '#236192', text: '#FFFFFF' }, // Minnesota Timberwolves
  1610612760: { primary: '#007AC1', secondary: '#EF3B24', text: '#FFFFFF' }, // Oklahoma City Thunder
  1610612757: { primary: '#E03A3E', secondary: '#000000', text: '#FFFFFF' }, // Portland Trail Blazers
  1610612762: { primary: '#002B5C', secondary: '#F9A01B', text: '#FFFFFF' }, // Utah Jazz

  // Western Conference - Pacific
  1610612744: { primary: '#1D1160', secondary: '#E56020', text: '#FFFFFF' }, // Golden State Warriors
  1610612746: { primary: '#C8102E', secondary: '#552583', text: '#FFFFFF' }, // LA Clippers
  1610612747: { primary: '#552583', secondary: '#FDB927', text: '#FFFFFF' }, // Los Angeles Lakers
  1610612756: { primary: '#1D1160', secondary: '#E56020', text: '#FFFFFF' }, // Phoenix Suns
  1610612758: { primary: '#5D76A9', secondary: '#FDB927', text: '#FFFFFF' }, // Sacramento Kings

  // Western Conference - Southwest
  1610612742: { primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' }, // Dallas Mavericks
  1610612745: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' }, // Houston Rockets
  1610612763: { primary: '#5D76A9', secondary: '#12173F', text: '#FFFFFF' }, // Memphis Grizzlies
  1610612740: { primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' }, // New Orleans Pelicans
  1610612759: { primary: '#C8102E', secondary: '#000000', text: '#FFFFFF' }, // San Antonio Spurs
};

export const getTeamColors = (teamId: number): TeamColors => {
  return teamColors[teamId] || { primary: '#1976d2', text: '#FFFFFF' };
};

export const getTeamColorsByName = (teamCity: string, teamName: string): TeamColors => {
  const fullName = `${teamCity} ${teamName}`;
  
  // Map team names to IDs
  const teamNameToId: { [key: string]: number } = {
    'Atlanta Hawks': 1610612737,
    'Boston Celtics': 1610612738,
    'Brooklyn Nets': 1610612751,
    'Charlotte Hornets': 1610612766,
    'Chicago Bulls': 1610612741,
    'Cleveland Cavaliers': 1610612739,
    'Dallas Mavericks': 1610612742,
    'Denver Nuggets': 1610612743,
    'Detroit Pistons': 1610612765,
    'Golden State Warriors': 1610612744,
    'Houston Rockets': 1610612745,
    'Indiana Pacers': 1610612754,
    'LA Clippers': 1610612746,
    'Los Angeles Clippers': 1610612746,
    'Los Angeles Lakers': 1610612747,
    'Memphis Grizzlies': 1610612763,
    'Miami Heat': 1610612748,
    'Milwaukee Bucks': 1610612749,
    'Minnesota Timberwolves': 1610612750,
    'New Orleans Pelicans': 1610612740,
    'New York Knicks': 1610612752,
    'Oklahoma City Thunder': 1610612760,
    'Orlando Magic': 1610612753,
    'Philadelphia 76ers': 1610612755,
    'Phoenix Suns': 1610612756,
    'Portland Trail Blazers': 1610612757,
    'Sacramento Kings': 1610612758,
    'San Antonio Spurs': 1610612759,
    'Toronto Raptors': 1610612761,
    'Utah Jazz': 1610612762,
    'Washington Wizards': 1610612764,
  };

  const teamId = teamNameToId[fullName];
  return teamId ? getTeamColors(teamId) : { primary: '#1976d2', text: '#FFFFFF' };
};

