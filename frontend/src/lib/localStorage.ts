export interface LeagueSettings {
  leagueName: string;
  rosterSlots: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
    DEF: number;
    K: number;
    Bench: number;
  };
  scoringSettings: {
    passing_yards_points: number;
    passing_td_points: number;
    interception_points: number;
    rushing_yards_points: number;
    rushing_td_points: number;
    two_pt_conversion_points: number;
    reception_points: number;
    receiving_yards_points: number;
    receiving_td_points: number;
    fumble_lost_points: number;
  };
  roster: string[]; // Array of player_ids
}

export const DEFAULT_SCORING_SETTINGS = {
  passing_yards_points: 0.03,
  passing_td_points: 6,
  interception_points: -2,
  rushing_yards_points: 0.1,
  rushing_td_points: 6,
  two_pt_conversion_points: 2,
  reception_points: 1,
  receiving_yards_points: 0.1,
  receiving_td_points: 6,
  fumble_lost_points: -2
};

export const DEFAULT_ROSTER_SLOTS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  DEF: 1,
  K: 1,
  Bench: 6
};

export function getLeagueSettings(): LeagueSettings | null {
  try {
    const stored = localStorage.getItem('leagueSettings');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading league settings:', error);
    return null;
  }
}

export function saveLeagueSettings(settings: LeagueSettings): void {
  try {
    localStorage.setItem('leagueSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving league settings:', error);
  }
}

export function getRoster(): string[] {
  try {
    const stored = localStorage.getItem('roster');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading roster:', error);
    return [];
  }
}

export function saveRoster(roster: string[]): void {
  try {
    localStorage.setItem('roster', JSON.stringify(roster));
  } catch (error) {
    console.error('Error saving roster:', error);
  }
}

export function hasLeagueSettings(): boolean {
  return getLeagueSettings() !== null;
}

export function formatScoringForAPI(scoring: LeagueSettings['scoringSettings']): string {
  return Object.entries(scoring)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
} 