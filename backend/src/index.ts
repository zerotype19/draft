import { Env } from "./db";
import import2023 from "./etl/import2023";
import import2024 from "./etl/import2024";
import { recalcPoints } from "./recalcPoints";
import { getRankings } from "./rankings";
import { getDraftRankings } from "./draft-rankings";
import { getRecommendations } from "./recommendations";
import { getWaivers } from "./waivers";
import { simulateRoster } from "./simulator";
import { getAlerts } from "./alerts";
import { getSeasonStrategy } from "./season-strategy";
import { analyzeTrade } from "./trade-analyzer";
import { corsHeaders } from "./cors";

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/api/test") {
      return new Response("Worker is working!", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
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
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        const week = Number(weekParam);
        await import2023(env, week);
        return new Response(`2023 week ${week} import complete`, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      } catch (error) {
        console.error("Import 2023 error:", error);
        return new Response(`Import failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
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
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        const week = Number(weekParam);
        await import2024(env, week);
        return new Response(`2024 week ${week} import complete`, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      } catch (error) {
        console.error("Import 2024 error:", error);
        return new Response(`Import failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/recalc-points" && req.method === "POST") {
      try {
        await recalcPoints(env);
        return new Response("Points recalculated", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      } catch (error) {
        console.error("Recalc points error:", error);
        return new Response(`Recalc failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
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
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Rankings error:", error);
        return new Response(`Rankings failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/draft-rankings") {
      try {
        const season = url.searchParams.get("season");
        const week = url.searchParams.get("week");
        const position = url.searchParams.get("position");
        const limit = url.searchParams.get("limit");
        const offset = url.searchParams.get("offset");
        const scoring = url.searchParams.get("scoring");
        const includeInjuries = url.searchParams.get("includeInjuries");

        const rankings = await getDraftRankings(
          env,
          season ? Number(season) : undefined,
          position || undefined,
          limit ? Number(limit) : 50,
          offset ? Number(offset) : 0,
          scoring || undefined,
          includeInjuries !== "false" // Default to true unless explicitly false
        );
        return new Response(JSON.stringify(rankings), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Draft Rankings error:", error);
        return new Response(`Draft Rankings failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/recommendations") {
      try {
        const week = url.searchParams.get("week");
        const position = url.searchParams.get("position");
        const limit = url.searchParams.get("limit");
        const scoring = url.searchParams.get("scoring");
        const roster = url.searchParams.get("roster");
        const includeInjuries = url.searchParams.get("includeInjuries");

        if (!week) {
          return new Response("Week parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const recommendations = await getRecommendations(
          env,
          Number(week),
          position || undefined,
          limit ? Number(limit) : 50,
          scoring || undefined,
          roster || undefined,
          includeInjuries !== "false" // Default to true unless explicitly false
        );
        return new Response(JSON.stringify(recommendations), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Recommendations error:", error);
        return new Response(`Recommendations failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/waivers") {
      try {
        const week = url.searchParams.get("week");
        const position = url.searchParams.get("position");
        const limit = url.searchParams.get("limit");
        const scoring = url.searchParams.get("scoring");
        const roster = url.searchParams.get("roster");
        const includeInjuries = url.searchParams.get("includeInjuries");

        if (!week) {
          return new Response("Week parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const waivers = await getWaivers(
          env,
          Number(week),
          position || undefined,
          limit ? Number(limit) : 50,
          scoring || undefined,
          roster || undefined,
          includeInjuries !== "false" // Default to true unless explicitly false
        );
        return new Response(JSON.stringify(waivers), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Waivers error:", error);
        return new Response(`Waivers failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/alerts") {
      try {
        const week = url.searchParams.get("week");
        const scoring = url.searchParams.get("scoring");
        const roster = url.searchParams.get("roster");
        const starters = url.searchParams.get("starters");
        const includeInjuries = url.searchParams.get("includeInjuries");

        if (!week) {
          return new Response("Week parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        if (!roster) {
          return new Response("Roster parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const alerts = await getAlerts(env, {
          week: Number(week),
          roster: roster.split(','),
          starters: starters ? starters.split(',') : [],
          scoring: scoring || undefined,
          includeInjuries: includeInjuries !== "false"
        });

        return new Response(JSON.stringify(alerts), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Alerts error:", error);
        return new Response(`Alerts failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/season-strategy") {
      try {
        const roster = url.searchParams.get("roster");
        const starters = url.searchParams.get("starters");
        const playoffWeeks = url.searchParams.get("playoff_weeks");
        const scoring = url.searchParams.get("scoring");
        const includeInjuries = url.searchParams.get("includeInjuries");

        if (!roster) {
          return new Response("Roster parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        if (!playoffWeeks) {
          return new Response("Playoff weeks parameter is required", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const strategy = await getSeasonStrategy(env, {
          roster: roster.split(','),
          starters: starters ? starters.split(',') : [],
          playoff_weeks: playoffWeeks.split(',').map(w => Number(w)),
          scoring: scoring || undefined,
          includeInjuries: includeInjuries !== "false"
        });

        return new Response(JSON.stringify(strategy), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Season Strategy error:", error);
        return new Response(`Season Strategy failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/trade-analyzer" && req.method === "POST") {
      try {
        const body = await req.json();
        const { roster, give, receive, playoff_weeks, scoring, includeInjuries } = body;

        if (!roster || !give || !receive || !playoff_weeks) {
          return new Response("Missing required parameters: roster, give, receive, playoff_weeks", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const analysis = await analyzeTrade(env, {
          roster,
          give,
          receive,
          playoff_weeks,
          scoring,
          includeInjuries: includeInjuries !== false
        });

        return new Response(JSON.stringify(analysis), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Trade Analyzer error:", error);
        return new Response(`Trade Analyzer failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    if (url.pathname === "/api/simulate" && req.method === "POST") {
      try {
        const body = await req.json();
        const { mode, roster, moves, scoring, includeInjuries, rosterSlots } = body;

        if (!mode || !roster || !moves) {
          return new Response("Missing required parameters: mode, roster, moves", { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/plain" }
          });
        }

        const simulation = await simulateRoster(env, {
          mode,
          roster,
          moves,
          scoring,
          includeInjuries: includeInjuries !== false,
          rosterSlots
        });

        return new Response(JSON.stringify(simulation), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        console.error("Simulation error:", error);
        return new Response(`Simulation failed: ${error}`, { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
    }

    return new Response("Not found", { 
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
}; 