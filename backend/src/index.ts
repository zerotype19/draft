import { Env } from "./db";
import import2023 from "./etl/import2023";
import import2024 from "./etl/import2024";

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/test") {
      return new Response("Worker is working!");
    }

    if (url.pathname === "/api/import/2023") {
      try {
        await import2023(env);
        return new Response("2023 import complete");
      } catch (error) {
        console.error("Import 2023 error:", error);
        return new Response(`Import failed: ${error}`, { status: 500 });
      }
    }
    if (url.pathname === "/api/import/2024") {
      try {
        await import2024(env);
        return new Response("2024 import complete");
      } catch (error) {
        console.error("Import 2024 error:", error);
        return new Response(`Import failed: ${error}`, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  }
}; 