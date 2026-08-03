import { neon } from '@neondatabase/serverless';

let _sql: any = null;
let schemaReady = false;

export function getDb(): any {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('缺少环境变量 DATABASE_URL（Neon 连接串）');
    _sql = neon(url);
  }
  return _sql;
}

/** 首次冷启动时自动建表（幂等），无需任何迁移工具 */
export async function ensureSchema() {
  if (schemaReady) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      host_id TEXT NOT NULL,
      world_setting TEXT NOT NULL DEFAULT 'fantasy',
      custom_world TEXT NOT NULL DEFAULT '',
      ai_provider TEXT NOT NULL DEFAULT 'openai',
      ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      api_key_enc TEXT NOT NULL DEFAULT '',
      max_players INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'waiting',
      current_round INTEGER NOT NULL DEFAULT 1,
      story_json TEXT NOT NULL DEFAULT '[]',
      resolving BOOLEAN NOT NULL DEFAULT FALSE,
      resolve_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_host BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_active TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (room_id, round, player_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_players_room ON players (room_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_actions_room_round ON actions (room_id, round)`;
  schemaReady = true;
}