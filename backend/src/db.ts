export interface Env {
  DB: D1Database;
}

export async function queryDB(env: Env, sql: string, params: any[] = []) {
  const stmt = env.DB.prepare(sql);
  const result = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return result;
} 