// Team name to abbreviation mapping
export const TEAM_ABBREVIATIONS: { [key: string]: string } = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
};

// Team name to logo path mapping
export const TEAM_LOGOS: { [key: string]: string } = {
  'Atlanta Hawks': '/logos/ATL.svg',
  'Boston Celtics': '/logos/BOS.svg',
  'Brooklyn Nets': '/logos/BKN.svg',
  'Charlotte Hornets': '/logos/CHA.svg',
  'Chicago Bulls': '/logos/CHI.svg',
  'Cleveland Cavaliers': '/logos/CLE.svg',
  'Dallas Mavericks': '/logos/DAL.svg',
  'Denver Nuggets': '/logos/DEN.svg',
  'Detroit Pistons': '/logos/DET.svg',
  'Golden State Warriors': '/logos/GSW.svg',
  'Houston Rockets': '/logos/HOU.svg',
  'Indiana Pacers': '/logos/IND.svg',
  'LA Clippers': '/logos/LAC.svg',
  'Los Angeles Lakers': '/logos/LAL.svg',
  'Memphis Grizzlies': '/logos/MEM.svg',
  'Miami Heat': '/logos/MIA.svg',
  'Milwaukee Bucks': '/logos/MIL.svg',
  'Minnesota Timberwolves': '/logos/MIN.svg',
  'New Orleans Pelicans': '/logos/NOP.svg',
  'New York Knicks': '/logos/NYK.svg',
  'Oklahoma City Thunder': '/logos/OKC.svg',
  'Orlando Magic': '/logos/ORL.svg',
  'Philadelphia 76ers': '/logos/PHI.svg',
  'Phoenix Suns': '/logos/PHX.svg',
  'Portland Trail Blazers': '/logos/POR.svg',
  'Sacramento Kings': '/logos/SAC.svg',
  'San Antonio Spurs': '/logos/SAS.svg',
  'Toronto Raptors': '/logos/TOR.svg',
  'Utah Jazz': '/logos/UTA.svg',
  'Washington Wizards': '/logos/WAS.svg',
};

// Get team abbreviation from full name
export const getTeamAbbreviation = (teamName: string): string => {
  return TEAM_ABBREVIATIONS[teamName] || teamName.substring(0, 3).toUpperCase();
};

// Get team logo path from full name
export const getTeamLogo = (teamName: string): string => {
  return TEAM_LOGOS[teamName] || '/logos/default.svg';
};

// Get both abbreviation and logo
export const getTeamInfo = (teamName: string): { abbreviation: string; logo: string } => {
  return {
    abbreviation: getTeamAbbreviation(teamName),
    logo: getTeamLogo(teamName),
  };
};

