'use client';
import type { PlayerInfo, RoundAction } from '@/lib/types';
import { Badge } from './ui';

export default function PlayerList({
  players, actions, maxPlayers, meId, isPlaying = false, onKick,
}: {
  players: PlayerInfo[];
  actions: RoundAction[];
  maxPlayers: number;
  meId: string;
  isPlaying?: boolean;
  onKick?: (id: string) => void;
}) {
  const submitted = new Map(actions.map((a) => [a.playerId, a.content]));
  return (
    <div className="space-y-2">
      {players.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isPlaying ? (submitted.has(p.id) ? 'bg-emerald-400' : 'animate-pulse bg-amber-400') : 'bg-emerald-400'
              }`}
            />
            <span className="truncate text-sm">{p.name}</span>
            {p.id === meId && <span className="shrink-0 text-xs text-cyan-400">（我）</span>}
            {p.isHost && <Badge className="shrink-0">房主</Badge>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPlaying &&
              (submitted.has(p.id) ? (
                <span className="max-w-[120px] truncate text-xs text-emerald-400" title={submitted.get(p.id)}>
                  已提交 ✓
                </span>
              ) : (
                <span className="text-xs text-slate-500">未提交</span>
              ))}
            {onKick && !p.isHost && (
              <button onClick={() => onKick(p.id)} className="text-xs text-rose-400 hover:text-rose-300" title="移出玩家">
                移出
              </button>
            )}
          </div>
        </div>
      ))}
      {players.length < maxPlayers && (
        <p className="text-xs text-slate-500">还可加入 {maxPlayers - players.length} 人</p>
      )}
    </div>
  );
}
