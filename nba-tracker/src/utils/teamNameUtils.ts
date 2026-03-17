export function parseTeamNameForColors(name: string): { city: string; teamName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { city: parts[0], teamName: parts.slice(1).join(' ') };
  }
  return { city: '', teamName: name };
}
