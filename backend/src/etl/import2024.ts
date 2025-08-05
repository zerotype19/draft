import { Env } from "../db";
import { importSeason } from "./shared";

export default async (env: Env) => {
  const url = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2024.csv.gz";
  await importSeason(env, 2024, url);
}; 