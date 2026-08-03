'use client';
import type { StorySegment } from '@/lib/types';
import { Badge } from './ui';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function StoryTimeline({ story }: { story: StorySegment[] }) {
  if (story.length === 0) {
    return <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-500">故事尚未开始…</p>;
  }
  const reversed = [...story].reverse();
  return (
    <div className="space-y-4">
      {reversed.map((seg) => (
        <div key={seg.round} className="animate-fade-in-up rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border-violet-500/40 text-violet-300">
              {seg.round === 0 ? '开场' : `第 ${seg.round} 回合`}
            </Badge>
            <span className="text-xs text-slate-500">{formatTime(seg.timestamp)}</span>
          </div>

          {seg.world_events && <p className="mb-3 text-slate-300">{seg.world_events}</p>}

          {Object.keys(seg.player_outcomes || {}).length > 0 && (
            <div className="mb-3 space-y-2 rounded-xl bg-slate-800/50 p-3">
              {Object.entries(seg.player_outcomes).map(([name, text]) =>
                text ? (
                  <p key={name} className="text-sm">
                    <span className="font-semibold text-violet-400">{name}：</span>
                    <span className="text-slate-300">{text}</span>
                  </p>
                ) : null
              )}
            </div>
          )}

          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{seg.narrative}</p>
        </div>
      ))}
    </div>
  );
}
