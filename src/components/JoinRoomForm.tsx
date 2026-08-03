'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from './ui';

export default function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), playerName, playerId: localStorage.getItem('sf_player_id') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加入失败');
      localStorage.setItem('sf_player_id', data.playerId);
      localStorage.setItem('sf_player_name', data.playerName);
      router.push(`/room/${data.roomCode}`);
    } catch (err: any) {
      setError(err.message || '加入失败');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="房间号">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="例如：AB3K7Q" required />
      </Field>
      <Field label="你的昵称">
        <Input value={playerName} onChange={(e) => setPlayerName(e.target.value.slice(0, 16))} placeholder="输入一个响亮的名字" required />
      </Field>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" className="w-full" loading={loading}>加入房间</Button>
    </form>
  );
}
