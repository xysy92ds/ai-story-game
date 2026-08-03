import { randomBytes, randomUUID } from 'crypto';
import { getDb } from './db';
import type { PlayerInfo, RoomPublic, RoomRow, RoundAction, StorySegment } from './types';
import { AI_PROVIDERS, callAI, getProviderEnvKey, type AIProviderId } from './ai';
import { decryptApiKey, encryptApiKey } from './crypto';
import {
  buildOpeningUserMessage,
  buildResolveUserMessage,
  fallbackOpening,
  OPENING_SYSTEM_PROMPT,
  parseOpeningOutput,
  parseStoryOutput,
  STORY_EDITOR_SYSTEM_PROMPT,
} from './prompts';
import { getWorld } from './world';

export const WAITING_ROOM_TTL_MINUTES = 20;
export const RESOLVE_STALE_MINUTES = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function isWaitingRoomExpired(room: RoomRow): boolean {
  return Date.now() - new Date(room.created_at).getTime() > WAITING_ROOM_TTL_MINUTES * 60 * 1000;
}

export async function cleanupExpiredRooms(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM rooms WHERE status = 'waiting' AND created_at < now() - ${WAITING_ROOM_TTL_MINUTES} * interval '1 minute'`;
  await sql`DELETE FROM rooms WHERE created_at < now() - interval '1 minute' AND status <> 'finished' AND id NOT IN (SELECT DISTINCT room_id FROM players)`;
  await sql`UPDATE rooms SET resolving = false, resolve_started_at = NULL WHERE resolving = true AND resolve_started_at IS NOT NULL AND resolve_started_at < now() - ${RESOLVE_STALE_MINUTES} * interval '1 minute'`;
}

export interface CreateRoomInput {
  roomName: string;
  playerName: string;
  maxPlayers: number;
  worldSetting: string;
  customWorld?: string;
  aiProvider: AIProviderId;
  aiModel: string;
  apiKey?: string;
}

export async function createRoom(input: CreateRoomInput) {
  const sql = getDb();
  const provider = AI_PROVIDERS[input.aiProvider];
  if (!provider) throw new ApiError('不支持的 AI 服务商');
  if (!provider.models.includes(input.aiModel)) throw new ApiError('该服务商不支持此模型');
  const apiKey = (input.apiKey || '').trim() || getProviderEnvKey(input.aiProvider);
  if (!apiKey) throw new ApiError('请填写 API Key，或在环境变量中配置该服务商的全局 Key');

  const roomId = randomUUID();
  const playerId = randomUUID();
  const code = await generateUniqueRoomCode();
  await sql`
    INSERT INTO rooms (id, code, name, host_id, world_setting, custom_world, ai_provider, ai_model, api_key_enc, max_players, status)
    VALUES (${roomId}, ${code}, ${input.roomName}, ${playerId}, ${input.worldSetting}, ${input.customWorld || ''}, ${input.aiProvider}, ${input.aiModel}, ${encryptApiKey(apiKey)}, ${input.maxPlayers}, 'waiting')
  `;
  await sql`INSERT INTO players (id, room_id, name, is_host) VALUES (${playerId}, ${roomId}, ${input.playerName}, true)`;
  return { roomCode: code, playerId, playerName: input.playerName };
}

async function generateUniqueRoomCode(): Promise<string> {
  const sql = getDb();
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode();
    const rows = await sql`SELECT 1 FROM rooms WHERE code = ${code}`;
    if (rows.length === 0) return code;
  }
  throw new ApiError('房间号生成失败，请重试');
}

export async function joinRoom(code: string, playerName: string, playerId?: string | null) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在，请检查房间号', 404);
  const room = rooms[0] as RoomRow;
  await cleanupExpiredRooms();
  if (room.status === 'waiting' && isWaitingRoomExpired(room)) {
    await sql`DELETE FROM rooms WHERE id = ${room.id}`;
    throw new ApiError('房间已过期（20 分钟未开局），已自动删除', 404);
  }
  if (room.status !== 'waiting') throw new ApiError('游戏已经开始，无法加入');

  const existing = playerId ? await sql`SELECT * FROM players WHERE id = ${playerId} AND room_id = ${room.id}` : [];
  let finalPlayerId = playerId || '';
  if (existing.length > 0) {
    finalPlayerId = existing[0].id;
    await sql`UPDATE players SET name = ${playerName}, last_active = now() WHERE id = ${finalPlayerId}`;
  } else {
    const players = await sql`SELECT * FROM players WHERE room_id = ${room.id}`;
    if (players.length >= room.max_players) throw new ApiError('房间已满员');
    finalPlayerId = randomUUID();
    await sql`INSERT INTO players (id, room_id, name, is_host) VALUES (${finalPlayerId}, ${room.id}, ${playerName}, false)`;
  }
  await sql`UPDATE rooms SET last_activity = now() WHERE id = ${room.id}`;
  return { roomCode: room.code, playerId: finalPlayerId, playerName };
}

export async function getRoomState(code: string, me?: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  await cleanupExpiredRooms();
  if (room.status === 'waiting' && isWaitingRoomExpired(room)) {
    await sql`DELETE FROM rooms WHERE id = ${room.id}`;
    throw new ApiError('房间已过期（20 分钟未开局），已自动删除', 404);
  }
  const players = await sql`SELECT id, name, is_host FROM players WHERE room_id = ${room.id} ORDER BY joined_at ASC`;
  if (me && room.status !== 'finished' && players.length > 0 && !players.some((p: any) => p.id === me)) {
    throw new ApiError('你已不在这个房间（被移出或已离开）', 403);
  }
  const story = safeParseStory(room.story_json);
  const actions = await sql`SELECT player_id, player_name, content FROM actions WHERE room_id = ${room.id} AND round = ${room.current_round} ORDER BY created_at ASC`;
  return {
    room: serializeRoom(room),
    players: players.map((p: any) => ({ id: p.id, name: p.name, isHost: !!p.is_host }) as PlayerInfo),
    story,
    actions: actions.map((a: any) => ({ playerId: a.player_id, playerName: a.player_name, content: a.content }) as RoundAction),
  };
}

function serializeRoom(room: RoomRow): RoomPublic {
  return {
    code: room.code,
    name: room.name,
    hostId: room.host_id,
    status: room.status,
    worldSettingId: room.world_setting,
    customWorld: room.custom_world,
    aiProvider: room.ai_provider,
    aiModel: room.ai_model,
    maxPlayers: room.max_players,
    currentRound: room.current_round,
    resolving: room.resolving,
    createdAt: room.created_at,
    startedAt: room.started_at,
    lastActivity: room.last_activity,
    endedAt: room.ended_at,
  };
}

export function safeParseStory(json: string): StorySegment[] {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? (v as StorySegment[]) : [];
  } catch {
    return [];
  }
}

export async function startGame(code: string, playerId: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.status !== 'waiting') throw new ApiError('房间不在等待状态');
  if (room.host_id !== playerId) throw new ApiError('只有房主可以开始游戏', 403);

  const players = await sql`SELECT * FROM players WHERE room_id = ${room.id}`;
  if (players.length < MIN_PLAYERS) throw new ApiError(`至少需要 ${MIN_PLAYERS} 名玩家才能开始`);

  const claimed = await sql`
    UPDATE rooms SET status = 'playing', started_at = now(), resolving = true, resolve_started_at = now(), last_activity = now()
    WHERE id = ${room.id} AND status = 'waiting' RETURNING id
  `;
  if (claimed.length === 0) throw new ApiError('房间状态已变化，请刷新后重试', 409);

  let openingText = fallbackOpening(room);
  try {
    const apiKey = decryptApiKey(room.api_key_enc);
    const raw = await callAI({
      provider: room.ai_provider as AIProviderId,
      model: room.ai_model,
      apiKey,
      messages: [
        { role: 'system', content: OPENING_SYSTEM_PROMPT },
        { role: 'user', content: buildOpeningUserMessage(room, players.map((p: any) => p.name)) },
      ],
      temperature: 0.9,
      maxTokens: 1000,
    });
    openingText = parseOpeningOutput(raw) || openingText;
  } catch (e) {
    console.error('开场生成失败，使用兜底开场：', e);
  }

  const segment: StorySegment = {
    round: 0,
    timestamp: new Date().toISOString(),
    world_events: openingText,
    player_outcomes: Object.fromEntries(players.map((p: any) => [p.name, ''])),
    narrative: openingText,
  };
  await sql`
    UPDATE rooms SET story_json = ${JSON.stringify([segment])}, current_round = 1, resolving = false, resolve_started_at = NULL, last_activity = now()
    WHERE id = ${room.id}
  `;
  return true;
}

export async function submitAction(code: string, playerId: string, content: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.status !== 'playing') throw new ApiError('游戏尚未开始或已结束');

  const players = await sql`SELECT * FROM players WHERE id = ${playerId} AND room_id = ${room.id}`;
  if (players.length === 0) throw new ApiError('你不在这个房间里', 403);
  const player = players[0];
  const round = room.current_round;

  await sql`
    INSERT INTO actions (id, room_id, round, player_id, player_name, content, created_at)
    VALUES (${randomUUID()}, ${room.id}, ${round}, ${player.id}, ${player.name}, ${content}, now())
    ON CONFLICT (room_id, round, player_id) DO UPDATE SET content = ${content}, created_at = now()
  `;
  await sql`UPDATE players SET last_active = now() WHERE id = ${playerId}`;
  await sql`UPDATE rooms SET last_activity = now() WHERE id = ${room.id}`;

  const submitted = await sql`SELECT COUNT(*)::int AS c FROM actions WHERE room_id = ${room.id} AND round = ${round}`;
  const total = await sql`SELECT COUNT(*)::int AS c FROM players WHERE room_id = ${room.id}`;
  if (Number(submitted[0].c) >= Number(total[0].c) && Number(total[0].c) >= MIN_PLAYERS) {
    await resolveRoundIfPossible(room.id);
  }
  return true;
}

export async function resolveRoundIfPossible(roomId: string): Promise<boolean> {
  const sql = getDb();
  const claimed = await sql`
    UPDATE rooms SET resolving = true, resolve_started_at = now(), last_activity = now()
    WHERE id = ${roomId} AND resolving = false RETURNING id
  `;
  if (claimed.length === 0) return false;
  const rooms = await sql`SELECT * FROM rooms WHERE id = ${roomId}`;
  const room = rooms[0] as RoomRow;
  if (!room || room.status !== 'playing') {
    await sql`UPDATE rooms SET resolving = false, resolve_started_at = NULL WHERE id = ${roomId}`;
    return false;
  }
  try {
    await resolveRound(room);
  } catch (e) {
    console.error('回合结算失败：', e);
    await saveFallbackSegment(room);
  }
  return true;
}

export async function hostResolveRound(code: string, playerId: string): Promise<boolean> {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.status !== 'playing') throw new ApiError('当前状态无法结算');
  if (room.host_id !== playerId) throw new ApiError('只有房主可以提前结算', 403);
  return resolveRoundIfPossible(room.id);
}

async function resolveRound(room: RoomRow) {
  const sql = getDb();
  const actionsRows = await sql`SELECT player_id, player_name, content FROM actions WHERE room_id = ${room.id} AND round = ${room.current_round} ORDER BY created_at ASC`;
  const actions: RoundAction[] = actionsRows.map((a: any) => ({ playerId: a.player_id, playerName: a.player_name, content: a.content }));
  const history = safeParseStory(room.story_json);
  const apiKey = decryptApiKey(room.api_key_enc);
  const world = getWorld(room.world_setting);
  const system = STORY_EDITOR_SYSTEM_PROMPT
    .replace('{world_name}', world?.name ?? room.world_setting)
    .replace('{world_description}', world?.description ?? '')
    .replace('{world_extra}', room.custom_world?.trim() ? `房主补充设定：${room.custom_world.trim()}` : '（无额外补充设定）');

  const raw = await callAI({
    provider: room.ai_provider as AIProviderId,
    model: room.ai_model,
    apiKey,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: buildResolveUserMessage(room, history, actions) },
    ],
    temperature: 0.9,
    maxTokens: 2400,
  });
  const parsed = parseStoryOutput(raw, actions);
  const segment: StorySegment = { round: room.current_round, timestamp: new Date().toISOString(), ...parsed };
  const newHistory = [...history, segment];
  await sql`
    UPDATE rooms SET story_json = ${JSON.stringify(newHistory)}, current_round = ${room.current_round + 1}, resolving = false, resolve_started_at = NULL, last_activity = now()
    WHERE id = ${room.id}
  `;
}

async function saveFallbackSegment(room: RoomRow) {
  const sql = getDb();
  const actionsRows = await sql`SELECT player_name, content FROM actions WHERE room_id = ${room.id} AND round = ${room.current_round} ORDER BY created_at ASC`;
  const history = safeParseStory(room.story_json);
  const world = getWorld(room.world_setting);
  const outcomes: Record<string, string> = {};
  for (const a of actionsRows) outcomes[a.player_name] = '你的行动引发了意想不到的连锁反应，结局尚不明朗。';
  const segment: StorySegment = {
    round: room.current_round,
    timestamp: new Date().toISOString(),
    world_events: `世界的齿轮仍在转动，${world?.name ?? '这个世界'}的局势变得更加扑朔迷离。`,
    player_outcomes: outcomes,
    narrative: `【世界动态】${world?.name ?? '这个世界'}暗流涌动，新的势力正在暗中布局。
【玩家行动】${actionsRows.map((a) => `${a.player_name}：${a.content}`).join('；')}
（本轮结算出现异常，故事由系统临时接续，请继续你们的冒险。）`,
  };
  const newHistory = [...history, segment];
  await sql`
    UPDATE rooms SET story_json = ${JSON.stringify(newHistory)}, current_round = ${room.current_round + 1}, resolving = false, resolve_started_at = NULL, last_activity = now()
    WHERE id = ${room.id}
  `;
}

export async function closeRoom(code: string, playerId: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.host_id !== playerId) throw new ApiError('只有房主可以解散房间', 403);
  await sql`DELETE FROM rooms WHERE id = ${room.id}`;
  return true;
}

export async function leaveRoom(code: string, playerId: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) return true;
  const room = rooms[0] as RoomRow;
  await sql`DELETE FROM players WHERE id = ${playerId} AND room_id = ${room.id}`;
  if (room.host_id === playerId) {
    await sql`DELETE FROM rooms WHERE id = ${room.id}`;
    return true;
  }
  await sql`UPDATE rooms SET last_activity = now() WHERE id = ${room.id}`;
  return true;
}

export async function endGame(code: string, playerId: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.host_id !== playerId) throw new ApiError('只有房主可以结束游戏', 403);
  await sql`UPDATE rooms SET status = 'finished', ended_at = now(), resolving = false, resolve_started_at = NULL, last_activity = now() WHERE id = ${room.id}`;
  return true;
}

export async function kickPlayer(code: string, hostId: string, targetPlayerId: string) {
  const sql = getDb();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
  if (rooms.length === 0) throw new ApiError('房间不存在', 404);
  const room = rooms[0] as RoomRow;
  if (room.host_id !== hostId) throw new ApiError('只有房主可以移出玩家', 403);
  if (targetPlayerId === hostId) throw new ApiError('不能移出自己');
  await sql`DELETE FROM players WHERE id = ${targetPlayerId} AND room_id = ${room.id}`;
  await sql`DELETE FROM actions WHERE room_id = ${room.id} AND round = ${room.current_round} AND player_id = ${targetPlayerId}`;
  await sql`UPDATE rooms SET last_activity = now() WHERE id = ${room.id}`;
  return true;
}
