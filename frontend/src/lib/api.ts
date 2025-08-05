export interface Player {
  name: string;
  position: string;
  team: string | null;
  total_points: number;
  games_played: number;
  avg_points: number;
}

export async function getRankings(
  season: number, 
  position?: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<Player[]> {
  const params = new URLSearchParams();
  params.append("season", String(season));
  params.append("limit", String(limit));
  params.append("offset", String(offset));
  if (position) params.append("position", position);

  // Use the full Worker URL directly
  const res = await fetch(`https://draft-api.kevin-mcgovern.workers.dev/api/rankings?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch rankings: ${res.statusText}`);
  return res.json();
} 