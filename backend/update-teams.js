import { gunzipSync } from "fflate";
import Papa from "papaparse";

async function updateTeams() {
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
  
  // Show some examples
  let count = 0;
  for (const [playerId, team] of playerTeams) {
    if (count < 10) {
      console.log(`${playerId}: ${team}`);
      count++;
    }
  }
  
  // Generate SQL update statements
  console.log("\nGenerating SQL update statements...");
  let updateCount = 0;
  
  for (const [playerId, team] of playerTeams) {
    console.log(`UPDATE players SET team = '${team}' WHERE player_id = '${playerId}';`);
    updateCount++;
    if (updateCount >= 20) break; // Limit output for readability
  }
  
  console.log(`\nTotal updates needed: ${updateCount}`);
  
  return playerTeams;
}

// Run the script
updateTeams().catch(console.error); 