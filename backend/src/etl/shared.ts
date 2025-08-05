import { Env } from "./db";
import { gunzipSync } from "fflate";
import Papa from "papaparse";

// Configurable week range for NFL seasons
const NFL_WEEK_RANGE = { min: 1, max: 18 };

export async function importSeason(env: Env, season: number, url: string, week?: number) {
  console.log(`Starting import for ${season}${week ? ` week ${week}` : ''}`);

  // Validate week parameter if provided
  if (week !== undefined) {
    if (week < NFL_WEEK_RANGE.min || week > NFL_WEEK_RANGE.max) {
      throw new Error(`Week must be between ${NFL_WEEK_RANGE.min} and ${NFL_WEEK_RANGE.max}`);
    }
  } else {
    throw new Error(`Missing week parameter. Use ?week=1-18 for weekly imports.`);
  }

  // Fetch the .gz file
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV for ${season}: ${res.status}`);

  // Decompress
  const arrayBuffer = await res.arrayBuffer();
  const decompressed = gunzipSync(new Uint8Array(arrayBuffer));
  const csvText = new TextDecoder().decode(decompressed);

  // Parse CSV
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  let batch: any[] = [];
  let processedRows = 0;
  let skippedRows = 0;

  for (const row of parsed.data as any[]) {
    // Filter by week if specified
    if (week !== undefined && row.week != week) {
      continue;
    }

    // Validate required fields
    if (!row.player_id || !row.player_name) {
      console.warn(`Skipping row ${processedRows + skippedRows + 1} for season ${season}: missing player_id or player_name`);
      skippedRows++;
      continue;
    }

    try {
      // Insert player if not exists
      await env.DB.prepare(
        `INSERT OR IGNORE INTO players (player_id, name, position, team) VALUES (?, ?, ?, ?)`
      ).bind(
        row.player_id,
        row.player_name,
        row.position || null,
        row.team || null
      ).run();

      // Add stat row with null/undefined handling
      batch.push([
        season,
        row.week,
        row.player_id,
        row.passing_yards || 0,
        row.passing_tds || 0,
        row.interceptions || 0,
        row.rushing_yards || 0,
        row.rushing_tds || 0,
        row.receptions || 0,
        row.receiving_yards || 0,
        row.receiving_tds || 0,
        row.fumbles_lost || 0,
        row.two_point_conversions || 0
      ]);

      processedRows++;

      // Batch insert every 500 rows
      if (batch.length >= 500) {
        await insertBatch(env, batch);
        batch = [];
      }
    } catch (error) {
      console.error(`Error processing row ${processedRows + skippedRows + 1} for season ${season}:`, {
        season,
        week: row.week,
        player_id: row.player_id,
        error: error.message
      });
      skippedRows++;
    }
  }

  if (batch.length) {
    await insertBatch(env, batch);
  }

  if (processedRows === 0) {
    console.log(`No rows found for week ${week} (season ${season})`);
  } else {
    console.log(`Imported ${processedRows} rows for week ${week} (season ${season})`);
  }
}

async function insertBatch(env: Env, batch: any[]) {
  const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
  const flat = batch.flat();
  await env.DB.prepare(
    `INSERT INTO stats_raw (
      season, week, player_id,
      passing_yards, passing_tds, interceptions,
      rushing_yards, rushing_tds, receptions,
      receiving_yards, receiving_tds, fumbles_lost,
      two_pt_conversions
    ) VALUES ${placeholders}`
  ).bind(...flat).run();
} 