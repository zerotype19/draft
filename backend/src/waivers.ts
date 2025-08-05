import { Env } from "./db";

interface WaiverPlayer {
  name: string;
  position: string;
  team: string;
  avg_points: number;
  ros_projection: number;
  breakout_flag: boolean;
  recent_trend: string;
  pickup_priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function getWaivers(env: Env, week: number, position?: string, limit: number = 50, scoring?: string, roster?: string) {
  // Get all stats for the season
  let query = `
    SELECT p.name, p.position, p.team, s.week, s.total_points
    FROM stats_custom_scored s
    JOIN players p ON p.player_id = s.player_id
    WHERE s.season = 2024
  `;
  const params: any[] = [];
  
  if (position) {
    query += ` AND p.position = ?`;
    params.push(position);
  }
  
  query += ` ORDER BY p.name, s.week`;
  
  const stats = await env.DB.prepare(query).bind(...params).all();
  
  // Group by player
  const playerStats = new Map<string, { name: string; position: string; team: string; points: number[] }>();
  
  for (const row of stats.results || []) {
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
  
  const waiverPlayers: WaiverPlayer[] = [];
  
  // Filter out rostered players if roster provided
  const rosterPlayers = roster ? roster.split(',').map(name => name.trim()) : [];
  
  for (const [_, player] of playerStats) {
    const points = player.points;
    if (points.length === 0) continue;
    
    // Skip if player is on roster (for waiver wire)
    if (rosterPlayers.length > 0 && rosterPlayers.includes(player.name)) {
      continue;
    }
    
    const avgPoints = points.reduce((sum, p) => sum + p, 0) / points.length;
    
    // Calculate ROS projection (weighted by recent performance)
    const recentWeeks = points.slice(-3); // Last 3 weeks
    const recentAvg = recentWeeks.length > 0 
      ? recentWeeks.reduce((sum, p) => sum + p, 0) / recentWeeks.length 
      : avgPoints;
    
    // ROS projection: 70% recent performance, 30% season average
    const rosProjection = (recentAvg * 0.7) + (avgPoints * 0.3);
    
    // Check for breakout (last 2 weeks > season average by 25%)
    const lastTwoWeeks = points.slice(-2);
    const lastTwoAvg = lastTwoWeeks.length > 0 
      ? lastTwoWeeks.reduce((sum, p) => sum + p, 0) / lastTwoWeeks.length 
      : avgPoints;
    
    const breakoutFlag = lastTwoAvg > (avgPoints * 1.25);
    
    // Determine recent trend
    let recentTrend: string;
    if (lastTwoAvg > (avgPoints * 1.2)) {
      recentTrend = '🔥 Hot streak';
    } else if (lastTwoAvg < (avgPoints * 0.8)) {
      recentTrend = '📉 Declining';
    } else {
      recentTrend = '➡️ Stable';
    }
    
    // Determine pickup priority
    let pickupPriority: 'HIGH' | 'MEDIUM' | 'LOW';
    if (breakoutFlag && rosProjection > getPositionThreshold(player.position)) {
      pickupPriority = 'HIGH';
    } else if (rosProjection > getPositionThreshold(player.position) * 0.8) {
      pickupPriority = 'MEDIUM';
    } else {
      pickupPriority = 'LOW';
    }
    
    waiverPlayers.push({
      name: player.name,
      position: player.position,
      team: player.team,
      avg_points: avgPoints,
      ros_projection: rosProjection,
      breakout_flag: breakoutFlag,
      recent_trend: recentTrend,
      pickup_priority: pickupPriority
    });
  }
  
  // Sort by ROS projection
  waiverPlayers.sort((a, b) => b.ros_projection - a.ros_projection);
  
  return {
    results: waiverPlayers.slice(0, limit),
    total_count: waiverPlayers.length,
    week,
    position: position || 'ALL'
  };
}

function getPositionThreshold(position: string): number {
  const thresholds: Record<string, number> = {
    'QB': 15,
    'RB': 10,
    'WR': 8,
    'TE': 6,
    'K': 5,
    'DEF': 5
  };
  return thresholds[position] || 6;
} 