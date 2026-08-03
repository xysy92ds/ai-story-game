'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AI_PROVIDERS, type AIProviderId } from '@/lib/ai';
import { WORLD_SETTINGS } from '@/lib/world';
import { Button, Field, Input, Select, Textarea } from './ui';

export default function CreateRoomForm() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [worldSetting, setWorldSetting] = useState('fantasy');
  const [customWorld, setCustomWorld] = useState('');
  const [provider, setProvider] = useState<AIProviderId>('openai');
  const [model, setModel] = useState(AI_PROVIDERS.openai.models[0]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const models = useMemo(() => AI_PROVIDERS[provider].models, [provider]);

  function changeProvider(id: AIProviderId) {
    setProvider(id);
    setModel(AI_PROVIDERS[id].models[0]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, playerName, maxPlayers, worldSetting, customWorld, aiProvider: provider, aiModel: model, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      localStorage.setItem('sf_player_id', data.playerId);
      localStorage.setItem('sf_player_name', data.playerName);
      router.push(`/room/${data.roomCode}`);
    } catch (err: any) {
      setError(err.message || '创建失败');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="你的昵称">
          <Input value={playerName} onChange={(e) => setPlayerName(e.target.value.slice(0, 16))} placeholder="冒险者" required />
        </Field>
        <Field label="房间名称">
          <Input value={roomName} onChange={(e) => setRoomName(e.target.value.slice(0, 20))} placeholder="例如：星辉下的远征" required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="玩家人数（2-10）">
          <Select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
            {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>{n}人</option>
            ))}
          </Select>
        </Field>
        <Field label="世界观">
          <Select value={worldSetting} onChange={(e) => setWorldSetting(e.target.value)}>
            {WORLD_SETTINGS.map((w) => (
              <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="世界背景设定（选填，会注入给 AI）" hint="用于补充或完全自定义世界观细节">
        <Textarea
          value={customWorld}
          onChange={(e) => setCustomWorld(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="例如：这个世界的魔法来自月亮的潮汐，最近潮汐紊乱了……"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="AI 服务商">
          <Select value={provider} onChange={(e) => changeProvider(e.target.value as AIProviderId)}>
            {Object.values(AI_PROVIDERS).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="模型">
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="API Key" hint="仅用于本房间调用 AI，AES 加密存储；不填则使用环境变量中的全局 Key">
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." autoComplete="off" />
      </Field>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" className="w-full" loading={loading}>创建房间并进入</Button>
    </form>
  );
}
