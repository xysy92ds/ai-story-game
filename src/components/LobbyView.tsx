'use client';
import { useEffect, useState } from 'react';
import type { RoomState } from '@/lib/types';
import { AI_PROVIDERS } from '@/lib/ai';
import { getWorld } from '@/lib/world';
import { Button, Card, Spinner } from './ui';
import PlayerList from './PlayerList';

const TTL_MS = 20 * 60 * 1000;

export default function LobbyView({
  state, meId, busy, onStart, onClose, onLeave,
}: {
  state: RoomState;
  meId: string;
  busy: boolean;
  onStart: () => void;
  onClose: () => void;
  onLeave: () => void;
}) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () =>
      setLeft(Math.max(0, TTL_MS - (Date.now() - new Date(state.room.createdAt).getTime())));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [state.room.createdAt]);

  const world = getWorld(state.room.worldSettingId);
  const provider = AI_PROVIDERS[state.room.aiProvider as keyof typeof AI_PROVIDERS];
  const isHost = state.room.hostId === meId;
  const canStart = state.players.length >= 2;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">等待玩家加入…</h2>
          <div
            className={`rounded-full px-3 py-1 text-xs ${
              left < 120000 ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {left <= 0 ? '房间即将过期' : `自动删除倒计时 ${mins}:${String(secs).padStart(2, '0')}`}
          </div>
        </div>
        <PlayerList players={state.players} actions={[]} maxPlayers={state.room.maxPlayers} meId={meId} />
        <div className="mt-4 space-y-1 text-xs text-slate-500">
          <p>
            世界观：{world?.emoji} {world?.name}（{provider?.name} / {state.room.aiModel}）
          </p>
          {state.room.customWorld && <p className="line-clamp-2">补充设定：{state.room.customWorld}</p>}
        </div>
      </Card>

      <Card className="space-y-3">
        {isHost ? (
          <>
            <p className="text-sm text-slate-400">你是房主，至少 2 人即可开始游戏。</p>
            <Button className="w-full" disabled={!canStart || busy} onClick={onStart}>
              {busy ? <Spinner /> : null}
              {canStart ? '开始游戏' : '等待更多玩家（至少2人）'}
            </Button>
            <Button variant="danger" className="w-full" disabled={busy} onClick={onClose}>
              解散房间
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400">已加入，等待房主开始游戏…</p>
            <Button variant="danger" className="w-full" disabled={busy} onClick={onLeave}>
              离开房间
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
