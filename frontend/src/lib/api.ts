const API_BASE = "https://draft-api.kevin-mcgovern.workers.dev/api";

export interface Player {
  name: string;
  position: string;
  team: string;
  total_points: number;
  games_played: number;
  avg_points: number;
}

export interface RankingsResponse {
  results: Player[];
  total_count: number;
}

export interface DraftPlayer {
  name: string;
  position: string;
  team: string;
  total_points: number;
  avg_points: number;
  consistency_score: number;
  boom_rate: number;
  bust_rate: number;
  tier: number;
  adp?: number;
  // Enhanced predictive modeling fields
  injuryStatus?: string;
  sosScore?: string;
  trend?: string;
  enhancedProjection?: number;
}

export interface DraftRankingsResponse {
  results: DraftPlayer[];
  total_count: number;
}

export interface RecommendationPlayer {
  name: string;
  position: string;
  team: string;
  season_avg: number;
  recent_avg: number;
  weighted_avg: number;
  opponent_rank: number;
  projected_points: number;
  recommendation: 'START' | 'SIT' | 'FLEX';
  reason: string;
  // Enhanced predictive modeling fields
  injuryStatus?: string;
  sosScore?: string;
  trend?: string;
  enhancedProjection?: number;
}

export interface RecommendationsResponse {
  results: RecommendationPlayer[];
  total_count: number;
  week: number;
  position: string;
}

export interface WaiverPlayer {
  name: string;
  position: string;
  team: string;
  avg_points: number;
  ros_projection: number;
  breakout_flag: boolean;
  recent_trend: string;
  pickup_priority: 'HIGH' | 'MEDIUM' | 'LOW';
  // Enhanced predictive modeling fields
  injuryStatus?: string;
  sosScore?: string;
  trend?: string;
  enhancedProjection?: number;
}

export interface WaiversResponse {
  results: WaiverPlayer[];
  total_count: number;
  week: number;
  position: string;
}

export async function getRankings(
  season?: number, 
  position?: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<RankingsResponse> {
  const params = new URLSearchParams();
  if (season) params.append('season', season.toString());
  if (position) params.append('position', position);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`${API_BASE}/rankings?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rankings: ${response.statusText}`);
  }
  return response.json();
}

export async function getDraftRankings(
  season?: number,
  position?: string,
  limit: number = 50,
  offset: number = 0,
  scoring?: string,
  roster?: string,
  includeInjuries?: boolean
): Promise<DraftRankingsResponse> {
  const params = new URLSearchParams();
  if (season) params.append('season', season.toString());
  if (position) params.append('position', position);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (scoring) params.append('scoring', scoring);
  if (roster) params.append('roster', roster);
  if (includeInjuries !== undefined) params.append('includeInjuries', includeInjuries.toString());

  const response = await fetch(`${API_BASE}/draft-rankings?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch draft rankings: ${response.statusText}`);
  }
  return response.json();
}

export async function getRecommendations(
  week: number,
  position?: string,
  limit: number = 50,
  scoring?: string,
  roster?: string,
  includeInjuries?: boolean
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams();
  params.append('week', week.toString());
  if (position) params.append('position', position);
  params.append('limit', limit.toString());
  if (scoring) params.append('scoring', scoring);
  if (roster) params.append('roster', roster);
  if (includeInjuries !== undefined) params.append('includeInjuries', includeInjuries.toString());

  const response = await fetch(`${API_BASE}/recommendations?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
  }
  return response.json();
}

export async function getWaivers(
  week: number,
  position?: string,
  limit: number = 50,
  scoring?: string,
  roster?: string,
  includeInjuries?: boolean
): Promise<WaiversResponse> {
  const params = new URLSearchParams();
  params.append('week', week.toString());
  if (position) params.append('position', position);
  params.append('limit', limit.toString());
  if (scoring) params.append('scoring', scoring);
  if (roster) params.append('roster', roster);
  if (includeInjuries !== undefined) params.append('includeInjuries', includeInjuries.toString());

  const response = await fetch(`${API_BASE}/waivers?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch waivers: ${response.statusText}`);
  }
  return response.json();
} 