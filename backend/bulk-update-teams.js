import { gunzipSync } from "fflate";
import Papa from "papaparse";

async function bulkUpdateTeams() {
  console.log("Fetching NFLverse CSV data...");
  
  // Fetch the CSV data
  const res = await fetch("https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2024.csv.gz");
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  
  // Decompress
  const arrayBuffer = await res.arrayBuffer();
  const decompressed = gunzipSync(new Uint8Array(arrayBuffer));
  const csvText = new TextDecoder().decode(decompressed);
  
  // Parse CSV
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  // Create a map of player_id to team
  const playerTeams = new Map();
  
  for (const row of parsed.data) {
    if (row.player_id && row.team) {
      const team = row.team.trim();
      if (team && team !== '') {
        playerTeams.set(row.player_id, team);
      }
    }
  }
  
  console.log(`Found ${playerTeams.size} players with team data`);
  
  // Generate bulk UPDATE statement
  const updates = [];
  for (const [playerId, team] of playerTeams) {
    updates.push(`WHEN '${playerId}' THEN '${team}'`);
  }
  
  const sql = `
    UPDATE players 
    SET team = CASE player_id 
      ${updates.join('\n      ')}
      ELSE team 
    END 
    WHERE player_id IN (${Array.from(playerTeams.keys()).map(id => `'${id}'`).join(', ')});
  `;
  
  console.log("Generated bulk UPDATE SQL statement");
  console.log(`Will update ${playerTeams.size} players`);
  
  // Show some examples
  let count = 0;
  for (const [playerId, team] of playerTeams) {
    if (count < 10) {
      console.log(`${playerId}: ${team}`);
      count++;
    }
  }
  
  return { sql, playerTeams };
}

// Run the script
bulkUpdateTeams().then(({ sql, playerTeams }) => {
  console.log("\nSQL Statement (first 1000 chars):");
  console.log(sql.substring(0, 1000) + "...");
  console.log(`\nTotal players to update: ${playerTeams.size}`);
}).catch(console.error); 