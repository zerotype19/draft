import { Env } from "./db";
import { predictiveModeling } from "./predictive-modeling";

interface RecommendationPlayer {
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

export async function getRecommendations(env: Env, week: number, position?: string, limit: number = 50, scoring?: string, roster?: string, includeInjuries?: boolean) {
  // Get recent performance data (last 5 weeks)
  const recentWeeks = Math.max(1, week - 5);
  
  let query = `
    SELECT p.name, p.position, p.team, s.week, s.total_points
    FROM stats_custom_scored s
    JOIN players p ON p.player_id = s.player_id
    WHERE s.week >= ? AND s.week < ?
  `;
  const params: any[] = [recentWeeks, week];
  
  if (position) {
    query += ` AND p.position = ?`;
    params.push(position);
  }
  
  query += ` ORDER BY p.name, s.week`;
  
  const stats = await env.DB.prepare(query).bind(...params).all();
  
  // Group by player and calculate metrics
  const playerStats = new Map<string, { name: string; position: string; team: string; recent: number[]; all: number[] }>();
  
  for (const row of stats.results || []) {
    const key = row.name;
    if (!playerStats.has(key)) {
      playerStats.set(key, {
        name: row.name,
        position: row.position,
        team: row.team,
        recent: [],
        all: []
      });
    }
    
    const player = playerStats.get(key)!;
    player.all.push(row.total_points);
    
    // Recent weeks (last 3) get more weight
    if (row.week >= week - 3) {
      player.recent.push(row.total_points);
    }
  }
  
  const recommendations: RecommendationPlayer[] = [];
  
  // Filter by roster if provided
  const rosterPlayers = roster ? roster.split(',').map(name => name.trim()) : [];
  
  for (const [_, player] of playerStats) {
    if (player.all.length === 0) continue;
    
    // Skip if not in roster (for start/sit recommendations)
    if (rosterPlayers.length > 0 && !rosterPlayers.includes(player.name)) {
      continue;
    }
    
    const seasonAvg = player.all.reduce((sum, p) => sum + p, 0) / player.all.length;
    const recentAvg = player.recent.length > 0 
      ? player.recent.reduce((sum, p) => sum + p, 0) / player.recent.length 
      : seasonAvg;
    
    // Weighted average: 60% recent, 40% season
    const weightedAvg = (recentAvg * 0.6) + (seasonAvg * 0.4);
    
    // Mock opponent rank (1-32, where 1 is easiest)
    const opponentRank = Math.floor(Math.random() * 32) + 1;
    
    // Projected points with opponent adjustment
    const opponentAdjustment = (32 - opponentRank) * 0.3;
    const projectedPoints = weightedAvg + opponentAdjustment;
    
    // Determine recommendation
    let recommendation: 'START' | 'SIT' | 'FLEX';
    let reason: string;
    
    if (projectedPoints >= getStartThreshold(player.position)) {
      recommendation = 'START';
      reason = `Strong projection (${projectedPoints.toFixed(1)} pts) vs ${getOpponentDescription(opponentRank)}`;
    } else if (projectedPoints <= getSitThreshold(player.position)) {
      recommendation = 'SIT';
      reason = `Low projection (${projectedPoints.toFixed(1)} pts) vs ${getOpponentDescription(opponentRank)}`;
    } else {
      recommendation = 'FLEX';
      reason = `Moderate projection (${projectedPoints.toFixed(1)} pts) - consider as flex option`;
    }
    
    recommendations.push({
      name: player.name,
      position: player.position,
      team: player.team,
      season_avg: seasonAvg,
      recent_avg: recentAvg,
      weighted_avg: weightedAvg,
      opponent_rank: opponentRank,
      projected_points: projectedPoints,
      recommendation,
      reason
    });
  }
  
  // Sort by projected points
  recommendations.sort((a, b) => b.projected_points - a.projected_points);
  
  // Apply enhanced predictive modeling if requested
  if (includeInjuries !== false) { // Default to true if not specified
    for (const player of recommendations.slice(0, limit)) {
      const enhanced = await predictiveModeling.enhanceProjection(
        env,
        player.name,
        player.position,
        player.team,
        player.projected_points, // Use projected_points as base projection
        2024, // Use 2024 season
        includeInjuries
      );
      
      player.injuryStatus = enhanced.injuryStatus;
      player.sosScore = enhanced.sosScore;
      player.trend = enhanced.trend;
      player.enhancedProjection = enhanced.finalProjection;
    }
  }
  
  return {
    results: recommendations.slice(0, limit),
    total_count: recommendations.length,
    week,
    position: position || 'ALL'
  };
}

function getStartThreshold(position: string): number {
  const thresholds: Record<string, number> = {
    'QB': 18,
    'RB': 12,
    'WR': 10,
    'TE': 8,
    'K': 7,
    'DEF': 7
  };
  return thresholds[position] || 10;
}

function getSitThreshold(position: string): number {
  const thresholds: Record<string, number> = {
    'QB': 12,
    'RB': 8,
    'WR': 6,
    'TE': 5,
    'K': 4,
    'DEF': 4
  };
  return thresholds[position] || 6;
}

function getOpponentDescription(rank: number): string {
  if (rank <= 8) return 'tough defense';
  if (rank <= 16) return 'above-average defense';
  if (rank <= 24) return 'average defense';
  return 'favorable matchup';
} 