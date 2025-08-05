import { Env } from "./db";

export async function getRankings(env: Env, season?: number, week?: number, position?: string, limit: number = 50, offset: number = 0) {
  let query = `
    SELECT p.name, p.position, p.team,
           SUM(s.total_points) as total_points,
           COUNT(DISTINCT s.week) as games_played,
           CASE 
             WHEN COUNT(DISTINCT s.week) > 0 
             THEN SUM(s.total_points) / COUNT(DISTINCT s.week) 
             ELSE 0 
           END as avg_points
    FROM stats_custom_scored s
    JOIN players p ON p.player_id = s.player_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (season) {
    query += ` AND s.season = ?`;
    params.push(season);
  }
  if (week) {
    query += ` AND s.week = ?`;
    params.push(week);
  }
  if (position) {
    query += ` AND p.position = ?`;
    params.push(position);
  }

  query += ` GROUP BY p.player_id ORDER BY total_points DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all();

  if (!result.results || result.results.length === 0) {
    console.warn(`No rankings found for filters: season=${season}, week=${week}, position=${position}`);
  }

  return result.results || [];
} 