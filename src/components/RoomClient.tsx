'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomState } from '@/lib/types';
import LobbyView from './LobbyView';
import GameView from './GameView';
import { Badge, Button, Spinner } from './ui';

function statusText(s: string) {
  if (s === 'waiting') return '等待中';
  if (s === 'playing') return '进行中';
  return '已结束';
}

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('sf_player_id') || '';
    const name = localStorage.getItem('sf_player_name') || '';
    if (!id || !name) {
      setError('还没有身份信息，请先回到首页创建或加入房间。');
      setLoading(false);
      return;
    }
    setPlayerId(id);
    setPlayerName(name);
  }, []);

  const fetchState = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/room/${roomCode}?me=${playerId}`, { cache: 'no-store' });
      if (res.status === 404) {
        setError('房间不存在或已过期（20 分钟未开局会被自动删除）。');
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || '你已不在这个房间。');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setState(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    if (!playerId) return;
    fetchState();
    const timer = setInterval(fetchState, 2500);
    return () => clearInterval(timer);
  }, [fetchState, playerId]);

  function showNotice(msg: string) {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3000);
  }

  async function post(path: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '操作失败');
    return data;
  }

  async function run(fn: () => Promise<any>, okMsg?: string) {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showNotice(okMsg);
      await fetchState();
    } catch (e: any) {
      showNotice(e.message || '操作失败');
    } finally {
      setBusy(false);
    }
  }

  const handlers = {
    start: () => run(() => post(`/api/room/${roomCode}/start`, { playerId }), '游戏开始，AI 正在生成开场…'),
    submitAction: (content: string) => run(() => post(`/api/room/${roomCode}/action`, { playerId, content }), '行动已提交'),
    resolve: () => run(() => post(`/api/room/${roomCode}/resolve`, { playerId }), '正在结算本回合…'),
    end: () => run(() => post(`/api/room/${roomCode}/end`, { playerId }), '游戏已结束'),
    kick: (targetId: string) => run(() => post(`/api/room/${roomCode}/kick`, { playerId, targetPlayerId: targetId })),
  };

  async function closeRoom() {
    if (!confirm('确定要解散这个房间吗？所有故事记录将被删除。')) return;
    setBusy(true);
    try {
      await post(`/api/room/${roomCode}/close`, { playerId });
      router.push('/');
    } catch (e: any) {
      showNotice(e.message || '操作失败');
      setBusy(false);
    }
  }

  async function leaveRoom() {
    if (!confirm('确定要离开房间吗？')) return;
    setBusy(true);
    try {
      await post(`/api/room/${roomCode}/leave`, { playerId });
      router.push('/');
    } catch (e: any) {
      showNotice(e.message || '操作失败');
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="mb-3 text-2xl font-bold text-rose-400">无法进入房间</h1>
        <p className="mb-6 text-slate-400">{error}</p>
        <Button onClick={() => router.push('/')}>返回首页</Button>
      </main>
    );
  }

  if (loading || !state) {
    return (
      <main className="mx-auto max-w-xl px-4 py-32 text-center text-slate-400">
        <Spinner className="mx-auto mb-4" />
        <p>正在进入房间…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{state.room.name}</h1>
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 font-mono text-sm tracking-widest">
            {state.room.code}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(state.room.code);
              showNotice('房间号已复制');
            }}
            className="text-xs text-slate-500 hover:text-white"
          >
            复制
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge>{statusText(state.room.status)}</Badge>
          {state.room.resolving && <Badge className="border-violet-500/50 text-violet-300">AI 结算中</Badge>}
          <span className="text-xs text-slate-500">第 {state.room.currentRound} 回合</span>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-violet-500/40 bg-violet-950/50 px-4 py-2 text-sm text-violet-200">
          {notice}
        </div>
      )}

      {state.room.status === 'waiting' ? (
        <LobbyView
          state={state}
          meId={playerId}
          busy={busy}
          onStart={handlers.start}
          onClose={closeRoom}
          onLeave={leaveRoom}
        />
      ) : (
        <GameView
          state={state}
          meId={playerId}
          meName={playerName}
          busy={busy}
          onAction={handlers.submitAction}
          onResolve={handlers.resolve}
          onEnd={handlers.end}
          onClose={closeRoom}
          onLeave={leaveRoom}
          onKick={handlers.kick}
        />
      )}
    </main>
  );
}
