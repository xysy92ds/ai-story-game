export interface RoomRow {
  id: string;
  code: string;
  name: string;
  host_id: string;
  world_setting: string;
  custom_world: string;
  ai_provider: string;
  ai_model: string;
  api_key_enc: string;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  story_json: string;
  resolving: boolean;
  resolve_started_at: string | null;
  created_at: string;
  started_at: string | null;
  last_activity: string;
  ended_at: string | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

export interface StorySegment {
  round: number;
  timestamp: string;
  world_events: string;
  player_outcomes: Record<string, string>;
  narrative: string;
}

export interface RoundAction {
  playerId: string;
  playerName: string;
  content: string;
}

export interface RoomPublic {
  code: string;
  name: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  worldSettingId: string;
  customWorld: string;
  aiProvider: string;
  aiModel: string;
  maxPlayers: number;
  currentRound: number;
  resolving: boolean;
  createdAt: string;
  startedAt: string | null;
  lastActivity: string;
  endedAt: string | null;
}

export interface RoomState {
  room: RoomPublic;
  players: PlayerInfo[];
  story: StorySegment[];
  actions: RoundAction[];
}