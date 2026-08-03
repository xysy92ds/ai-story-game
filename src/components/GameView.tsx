'use client';
import type { RoomState } from '@/lib/types';
import { Button, Card, Spinner } from './ui';
import StoryTimeline from './StoryTimeline';
import PlayerList from './PlayerList';
import ActionPanel from './ActionPanel';

export default function GameView({
  state, meId, meName, busy, onAction, onResolve, onEnd, onClose, onLeave, onKick,
}: {
  state: RoomState;
  meId: string;
  meName: string;
  busy: boolean;
  onAction: (content: string) => void;
  onResolve: () => void;
  onEnd: () => void;
  onClose: () => void;
  onLeave: () => void;
  onKick: (targetId: string) => void;
}) {
  const isHost = state.room.hostId === meId;
  const meSubmitted = state.actions.some((a) => a.playerId === meId);
  const finished = state.room.status === 'finished';

  return (
    <>
      {finished && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 px-5 py-3 text-amber-200">
          🏁 游戏已结束，感谢你们共同写下了这段故事。
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <StoryTimeline story={state.story} />

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              玩家（{state.players.length}/{state.room.maxPlayers}）
            </h3>
            <PlayerList
              players={state.players}
              actions={state.actions}
              maxPlayers={state.room.maxPlayers}
              meId={meId}
              isPlaying
              onKick={isHost ? onKick : undefined}
            />
          </Card>

          {!finished && (
            <Card>
              <ActionPanel
                key={`${state.room.currentRound}-${meSubmitted ? 's' : 'u'}`}
                playerName={meName}
                submitted={meSubmitted}
                disabled={busy}
                onSubmit={onAction}
              />
            </Card>
          )}

          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">房主操作</h3>
            {isHost ? (
              <>
                <Button
                  className="w-full"
                  variant="ghost"
                  disabled={busy || state.room.resolving || finished}
                  onClick={onResolve}
                >
                  提前结算本回合{state.room.resolving ? '（结算中…）' : ''}
                </Button>
                {!finished && (
                  <Button className="w-full" variant="danger" disabled={busy} onClick={onEnd}>
                    结束游戏
                  </Button>
                )}
                <Button className="w-full" variant="danger" disabled={busy} onClick={onClose}>
                  解散房间
                </Button>
              </>
            ) : (
              <Button className="w-full" variant="danger" disabled={busy} onClick={onLeave}>
                离开房间
              </Button>
            )}
          </Card>
        </div>
      </div>

      {state.room.resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="animate-pulse-glow rounded-2xl border border-violet-500/30 bg-slate-900 px-8 py-6 text-center">
            <Spinner className="mx-auto mb-3" />
            <p className="text-violet-200">AI 正在编织本回合的故事…</p>
            <p className="mt-1 text-xs text-slate-500">请稍候，世界正在发生巨变</p>
          </div>
        </div>
      )}
    </>
  );
}
