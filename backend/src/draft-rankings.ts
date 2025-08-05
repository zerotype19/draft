import { Env } from "./db";

interface DraftPlayer {
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
}

export async function getDraftRankings(env: Env, season?: number, position?: string, limit: number = 50, offset: number = 0, scoring?: string) {
  // Get all weekly stats for the season to calculate advanced metrics
  let weeklyStatsQuery = `
    SELECT p.name, p.position, p.team, s.week, s.total_points
    FROM stats_custom_scored s
    JOIN players p ON p.player_id = s.player_id
    WHERE 1=1
  `;
  const weeklyParams: any[] = [];

  if (season) {
    weeklyStatsQuery += ` AND s.season = ?`;
    weeklyParams.push(season);
  }
  if (position) {
    weeklyStatsQuery += ` AND p.position = ?`;
    weeklyParams.push(position);
  }

  weeklyStatsQuery += ` ORDER BY p.name, s.week`;

  const weeklyStats = await env.DB.prepare(weeklyStatsQuery).bind(...weeklyParams).all();
  
  // Group stats by player
  const playerStats = new Map<string, { name: string; position: string; team: string; points: number[] }>();
  
  for (const row of weeklyStats.results || []) {
    const key = row.name;
    if (!playerStats.has(key)) {
      playerStats.set(key, {
        name: row.name,
        position: row.position,
        team: row.team,
        points: []
      });
    }
    playerStats.get(key)!.points.push(row.total_points);
  }

  // Calculate advanced metrics for each player
  const draftPlayers: DraftPlayer[] = [];
  
  for (const [_, player] of playerStats) {
    const points = player.points;
    const totalPoints = points.reduce((sum, p) => sum + p, 0);
    const avgPoints = totalPoints / points.length;
    
    // Calculate consistency score (1 - coefficient of variation)
    const mean = avgPoints;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;
    
    // Calculate boom/bust rates based on position averages
    const positionAvg = getPositionAverage(points, player.position);
    const boomThreshold = positionAvg * 1.2; // 20% above average
    const bustThreshold = positionAvg * 0.8; // 20% below average
    
    const boomGames = points.filter(p => p >= boomThreshold).length;
    const bustGames = points.filter(p => p <= bustThreshold).length;
    const boomRate = points.length > 0 ? (boomGames / points.length) * 100 : 0;
    const bustRate = points.length > 0 ? (bustGames / points.length) * 100 : 0;
    
    draftPlayers.push({
      name: player.name,
      position: player.position,
      team: player.team,
      total_points: totalPoints,
      avg_points: avgPoints,
      consistency_score: consistencyScore,
      boom_rate: boomRate,
      bust_rate: bustRate,
      tier: 0 // Will be calculated after sorting
    });
  }
  
  // Sort by total points and assign tiers
  draftPlayers.sort((a, b) => b.total_points - a.total_points);
  
  // Assign tiers (players within 10 points of each other are in same tier)
  let currentTier = 1;
  let lastPoints = draftPlayers[0]?.total_points || 0;
  
  for (const player of draftPlayers) {
    if (lastPoints - player.total_points > 10) {
      currentTier++;
      lastPoints = player.total_points;
    }
    player.tier = currentTier;
  }
  
  // Apply limit and offset
  const paginatedPlayers = draftPlayers.slice(offset, offset + limit);
  
  return {
    results: paginatedPlayers,
    total_count: draftPlayers.length
  };
}

// Helper function to get position-specific averages for boom/bust calculations
function getPositionAverage(points: number[], position: string): number {
  // These are rough estimates - in a real implementation, you'd calculate from actual data
  const positionAverages: Record<string, number> = {
    'QB': 20,
    'RB': 15,
    'WR': 12,
    'TE': 10,
    'K': 8,
    'DEF': 8
  };
  
  return positionAverages[position] || 10;
} 