import { Env } from "./db";

export async function recalcPoints(env: Env) {
  console.log("Starting points recalculation...");

  // Validate scoring settings exist
  const settings = await env.DB.prepare(
    `SELECT * FROM scoring_settings WHERE id = 1`
  ).first();

  if (!settings) {
    throw new Error("No scoring settings found. Please insert scoring settings first.");
  }

  console.log("Found scoring settings, clearing existing custom scored data...");

  // Clear existing data
  await env.DB.prepare(`DELETE FROM stats_custom_scored`).run();

  // Get all stats
  const stats = await env.DB.prepare(`SELECT * FROM stats_raw`).all();

  if (!stats.results || stats.results.length === 0) {
    console.warn("No stats_raw data found for recalculation");
    return;
  }

  console.log(`Processing ${stats.results.length} stat rows...`);

  let processedCount = 0;
  const totalRows = stats.results.length;

  for (const row of stats.results) {
    const totalPoints =
      (row.passing_yards || 0) * settings.passing_yards_points +
      (row.passing_tds || 0) * settings.passing_td_points +
      (row.interceptions || 0) * settings.interception_points +
      (row.rushing_yards || 0) * settings.rushing_yards_points +
      (row.rushing_tds || 0) * settings.rushing_td_points +
      (row.two_pt_conversions || 0) * settings.two_pt_conversion_points +
      (row.receptions || 0) * settings.reception_points +
      (row.receiving_yards || 0) * settings.receiving_yards_points +
      (row.receiving_tds || 0) * settings.receiving_td_points +
      (row.fumbles_lost || 0) * settings.fumble_lost_points;

    await env.DB.prepare(
      `INSERT INTO stats_custom_scored (season, week, player_id, total_points)
       VALUES (?, ?, ?, ?)`
    ).bind(row.season, row.week, row.player_id, totalPoints).run();

    processedCount++;
    
    // Log progress every 1000 rows
    if (processedCount % 1000 === 0) {
      console.log(`Processed ${processedCount} of ${totalRows} rows...`);
    }
  }

  console.log(`Points recalculation complete. Processed ${processedCount} rows.`);
} 