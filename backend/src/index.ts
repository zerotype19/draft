import { Env } from "./db";
import import2023 from "./etl/import2023";
import import2024 from "./etl/import2024";
import { recalcPoints } from "./recalcPoints";
import { getRankings } from "./rankings";

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/test") {
      return new Response("Worker is working!");
    }

    if (url.pathname === "/api/import/2023") {
      try {
        const weekParam = url.searchParams.get("week");
        if (!weekParam) {
          return new Response(
            JSON.stringify({ 
              error: "Missing ?week parameter. Use ?week=1-18 for weekly imports." 
            }), 
            { 
              status: 400, 
              headers: { "Content-Type": "application/json" } 
            }
          );
        }
        
        const week = Number(weekParam);
        await import2023(env, week);
        return new Response(`2023 week ${week} import complete`);
      } catch (error) {
        console.error("Import 2023 error:", error);
        return new Response(`Import failed: ${error}`, { status: 500 });
      }
    }
    if (url.pathname === "/api/import/2024") {
      try {
        const weekParam = url.searchParams.get("week");
        if (!weekParam) {
          return new Response(
            JSON.stringify({ 
              error: "Missing ?week parameter. Use ?week=1-18 for weekly imports." 
            }), 
            { 
              status: 400, 
              headers: { "Content-Type": "application/json" } 
            }
          );
        }
        
        const week = Number(weekParam);
        await import2024(env, week);
        return new Response(`2024 week ${week} import complete`);
      } catch (error) {
        console.error("Import 2024 error:", error);
        return new Response(`Import failed: ${error}`, { status: 500 });
      }
    }

    if (url.pathname === "/api/recalc-points" && req.method === "POST") {
      try {
        await recalcPoints(env);
        return new Response("Points recalculated");
      } catch (error) {
        console.error("Recalc points error:", error);
        return new Response(`Recalc failed: ${error}`, { status: 500 });
      }
    }

    if (url.pathname === "/api/rankings") {
      try {
        const season = url.searchParams.get("season");
        const week = url.searchParams.get("week");
        const position = url.searchParams.get("position");
        const limit = url.searchParams.get("limit");
        const offset = url.searchParams.get("offset");

        const rankings = await getRankings(
          env,
          season ? Number(season) : undefined,
          week ? Number(week) : undefined,
          position || undefined,
          limit ? Number(limit) : 50,
          offset ? Number(offset) : 0
        );
        return new Response(JSON.stringify(rankings), { 
          headers: { "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Rankings error:", error);
        return new Response(`Rankings failed: ${error}`, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  }
}; 