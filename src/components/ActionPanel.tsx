'use client';
import { useState } from 'react';
import { Button, Textarea } from './ui';

export default function ActionPanel({
  playerName, submitted, disabled, onSubmit,
}: {
  playerName: string;
  submitted: boolean;
  disabled: boolean;
  onSubmit: (content: string) => void;
}) {
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(!submitted);

  if (submitted && !editing) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">本回合行动</h3>
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          ✓ 已提交，等待其他玩家或 AI 结算
        </p>
        <Button variant="ghost" className="w-full" disabled={disabled} onClick={() => setEditing(true)}>
          修改行动
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300">你要做什么？</h3>
      <p className="text-xs text-slate-500">作为 {playerName}，描述你本回合的行动（可具体、可疯狂）</p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 500))}
        placeholder="例如：我悄悄跟在那个神秘商人的身后，趁他不注意偷走他怀里的羊皮卷……"
        rows={4}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{content.length}/500</span>
        <Button
          disabled={disabled || content.trim().length === 0}
          onClick={() => {
            onSubmit(content.trim());
            setEditing(false);
          }}
        >
          提交行动
        </Button>
      </div>
    </div>
  );
}
