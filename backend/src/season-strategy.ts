import { Env } from "./db";
import { predictiveModeling } from "./predictive-modeling";

interface PlayoffIssue {
  position: string;
  issue: string;
  suggestion: string;
  affected_players: string[];
  playoff_weeks: number[];
  projected_impact: number;
}

interface SeasonStrategyRequest {
  roster: string[]; // player_ids
  starters: string[]; // player_ids of starters
  playoff_weeks: number[]; // e.g., [15, 16, 17]
  scoring?: string;
  includeInjuries?: boolean;
}

export async function getSeasonStrategy(
  env: Env,
  request: SeasonStrategyRequest
): Promise<PlayoffIssue[]> {
  const { roster, starters, playoff_weeks, scoring, includeInjuries = true } = request;
  const issues: PlayoffIssue[] = [];

  // Get roster players with projections
  const rosterPlayers = await getRosterProjections(env, roster, scoring, includeInjuries);
  const starterPlayers = rosterPlayers.filter(p => starters.includes(p.player_id));

  // Group starters by position
  const startersByPosition: Record<string, any[]> = {};
  starterPlayers.forEach(player => {
    if (!startersByPosition[player.position]) {
      startersByPosition[player.position] = [];
    }
    startersByPosition[player.position].push(player);
  });

  // Analyze each position for playoff week issues
  for (const [position, players] of Object.entries(startersByPosition)) {
    const positionIssues = await analyzePositionForPlayoffIssues(
      env, position, players, playoff_weeks, scoring, includeInjuries
    );
    issues.push(...positionIssues);
  }

  return issues;
}

async function analyzePositionForPlayoffIssues(
  env: Env,
  position: string,
  players: any[],
  playoff_weeks: number[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<PlayoffIssue[]> {
  const issues: PlayoffIssue[] = [];

  for (const player of players) {
    const playoffWeekIssues: number[] = [];
    let totalImpact = 0;

    // Check each playoff week for hard matchups
    for (const week of playoff_weeks) {
      const sosScore = await getSOSForWeek(env, player.team, position, week);
      
      if (sosScore === 'Hard' || sosScore === 'Very Hard') {
        playoffWeekIssues.push(week);
        totalImpact -= 5; // Estimate 5-point reduction for hard matchup
      }
    }

    if (playoffWeekIssues.length > 0) {
      // Generate suggestions for this position
      const suggestions = await generatePlayoffSuggestions(
        env, position, playoff_weeks, scoring, includeInjuries
      );

      issues.push({
        position,
        issue: `Week ${playoffWeekIssues.join(', ')} starter faces tough ${position} defense`,
        suggestion: suggestions.length > 0 ? suggestions[0] : `Target ${position}s with easier playoff matchups`,
        affected_players: [player.name],
        playoff_weeks: playoffWeekIssues,
        projected_impact: totalImpact
      });
    }
  }

  return issues;
}

async function getSOSForWeek(
  env: Env,
  team: string,
  position: string,
  week: number
): Promise<string> {
  // For now, use the existing SOS data structure
  // In a full implementation, this would query week-specific SOS data
  const query = `
    SELECT avg_rank_remaining
    FROM sos_data 
    WHERE team = ? AND position = ?
    LIMIT 1
  `;

  try {
    const result = await env.DB.prepare(query).bind(team, position).first();
    if (result && result.avg_rank_remaining) {
      const rank = result.avg_rank_remaining;
      if (rank <= 10) return 'Easy';
      if (rank <= 21) return 'Medium';
      if (rank <= 27) return 'Hard';
      return 'Very Hard';
    }
  } catch (error) {
    console.error('Error getting SOS for week:', error);
  }

  return 'Medium'; // Default fallback
}

async function generatePlayoffSuggestions(
  env: Env,
  position: string,
  playoff_weeks: number[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<string[]> {
  const suggestions: string[] = [];

  // Get waiver players for this position with easy playoff matchups
  const query = `
    SELECT p.player_id, p.name, p.team, s.total_points
    FROM players p
    JOIN stats_custom_scored s ON p.player_id = s.player_id
    WHERE p.position = ?
    AND s.season = 2024
    GROUP BY p.player_id
    ORDER BY s.total_points DESC
    LIMIT 50
  `;

  try {
    const result = await env.DB.prepare(query).bind(position).all();
    
    for (const row of result.results || []) {
      // Check if this player has easy playoff matchups
      let easyPlayoffWeeks = 0;
      
      for (const week of playoff_weeks) {
        const sosScore = await getSOSForWeek(env, row.team, position, week);
        if (sosScore === 'Easy') {
          easyPlayoffWeeks++;
        }
      }

      if (easyPlayoffWeeks >= playoff_weeks.length * 0.5) { // At least 50% of playoff weeks are easy
        suggestions.push(`${row.name} (${row.team}) - Easy playoff schedule`);
        
        if (suggestions.length >= 3) break; // Top 3 suggestions
      }
    }
  } catch (error) {
    console.error('Error generating playoff suggestions:', error);
  }

  return suggestions;
}

async function getRosterProjections(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<any[]> {
  if (roster.length === 0) return [];

  const players: any[] = [];

  for (const playerId of roster) {
    // Try to find player by player_id first, then by name
    let query = `
      SELECT p.player_id, p.name, p.position, p.team, s.total_points
      FROM players p
      JOIN stats_custom_scored s ON p.player_id = s.player_id
      WHERE p.player_id = ?
      AND s.season = 2024
      GROUP BY p.player_id
      ORDER BY s.total_points DESC
      LIMIT 1
    `;

    let result = await env.DB.prepare(query).bind(playerId).all();

    // If not found by player_id, try by name
    if (!result.results || result.results.length === 0) {
      query = `
        SELECT p.player_id, p.name, p.position, p.team, s.total_points
        FROM players p
        JOIN stats_custom_scored s ON p.player_id = s.player_id
        WHERE p.name = ?
        AND s.season = 2024
        GROUP BY p.player_id
        ORDER BY s.total_points DESC
        LIMIT 1
      `;
      result = await env.DB.prepare(query).bind(playerId).all();
    }

    if (result.results && result.results.length > 0) {
      const row = result.results[0];
      const avgPoints = row.total_points;

      // Apply enhanced predictive modeling
      const enhanced = await predictiveModeling.enhanceProjection(
        env,
        row.name,
        row.position,
        row.team,
        avgPoints,
        2024,
        includeInjuries
      );

      players.push({
        player_id: row.player_id,
        name: row.name,
        position: row.position,
        team: row.team,
        projection: enhanced.finalProjection,
        injury_status: enhanced.injuryStatus,
        sos_score: enhanced.sosScore,
        trend: enhanced.trend
      });
    }
  }

  return players;
} 