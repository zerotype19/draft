import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractJSON(output) {
  // Find the JSON array in the output
  const jsonMatch = output.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No JSON found in output');
}

async function recalcPointsLocal() {
  console.log('🚀 Starting local fantasy points recalculation...');
  
  try {
    // Clear existing custom scored data first
    console.log('🧹 Clearing existing custom scored data...');
    execSync(
      'wrangler d1 execute draft-db --remote --command="DELETE FROM stats_custom_scored"',
      { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', 'backend')
      }
    );
    
    // Process stats in smaller chunks to avoid buffer issues
    const CHUNK_SIZE = 1000;
    let offset = 0;
    let totalProcessed = 0;
    
    while (true) {
      console.log(`📈 Fetching stats_raw data (offset: ${offset}, limit: ${CHUNK_SIZE})...`);
      
      const statsResult = execSync(
        `wrangler d1 execute draft-db --remote --command="SELECT * FROM stats_raw LIMIT ${CHUNK_SIZE} OFFSET ${offset}"`,
        { 
          stdio: 'pipe',
          cwd: path.join(__dirname, '..', 'backend'),
          encoding: 'utf8'
        }
      );
      
      // Parse the JSON result
      const statsData = extractJSON(statsResult);
      const stats = statsData[0]?.results || [];
      
      console.log(`📊 Found ${stats.length} stat rows in this chunk`);
      
      if (stats.length === 0) {
        console.log('✅ No more data to process');
        break;
      }
      
      // Process this chunk
      const insertStatements = [];
      
      for (const row of stats) {
        // Calculate fantasy points using the scoring settings
        const totalPoints =
          (row.passing_yards || 0) * 0.03 +  // passing_yards_points
          (row.passing_tds || 0) * 6 +        // passing_td_points
          (row.interceptions || 0) * -2 +      // interception_points
          (row.rushing_yards || 0) * 0.1 +    // rushing_yards_points
          (row.rushing_tds || 0) * 6 +        // rushing_td_points
          (row.two_pt_conversions || 0) * 2 + // two_pt_conversion_points
          (row.receptions || 0) * 1 +         // reception_points
          (row.receiving_yards || 0) * 0.1 +  // receiving_yards_points
          (row.receiving_tds || 0) * 6 +      // receiving_td_points
          (row.fumbles_lost || 0) * -2;       // fumble_lost_points
        
        insertStatements.push(
          `INSERT INTO stats_custom_scored (season, week, player_id, total_points)
           VALUES (${row.season}, ${row.week}, '${row.player_id}', ${totalPoints});`
        );
      }
      
      // Write chunk to SQL file
      const sqlFile = path.join(__dirname, 'sql', `recalc_chunk_${Math.floor(offset / CHUNK_SIZE)}.sql`);
      const fs = await import('fs');
      fs.writeFileSync(sqlFile, insertStatements.join('\n'));
      
      // Execute chunk
      console.log(`📝 Processing chunk ${Math.floor(offset / CHUNK_SIZE) + 1} (${stats.length} rows)...`);
      execSync(
        `wrangler d1 execute draft-db --remote --file=${sqlFile}`,
        { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..', 'backend')
        }
      );
      
      totalProcessed += stats.length;
      console.log(`✅ Processed ${totalProcessed} total rows so far`);
      
      offset += CHUNK_SIZE;
    }
    
    console.log('🎉 Fantasy points recalculation complete!');
    console.log(`📊 Processed ${totalProcessed} total rows`);
    
  } catch (error) {
    console.error('❌ Local recalculation failed:', error.message);
    process.exit(1);
  }
}

// Run the recalculation
recalcPointsLocal(); 