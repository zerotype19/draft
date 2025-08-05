import { Env } from "../db";
import { importSeason } from "./shared";

export default async (env: Env) => {
  await importSeason(
    env,
    2023,
    "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2023.csv.gz"
  );
}; 