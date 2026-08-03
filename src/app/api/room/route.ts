import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema } from '@/lib/db';
import { createRoom } from '@/lib/engine';
import { AI_PROVIDERS } from '@/lib/ai';
import { WORLD_SETTINGS } from '@/lib/world';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  roomName: z.string().trim().min(1, '请输入房间名称').max(20, '房间名称最多20字'),
  playerName: z.string().trim().min(1, '请输入你的昵称').max(16, '昵称最多16字'),
  maxPlayers: z.number().int().min(2, '至少2人').max(10, '最多10人'),
  worldSetting: z.string().refine((id) => WORLD_SETTINGS.some((w) => w.id === id), '世界观不存在'),
  customWorld: z.string().trim().max(500, '补充设定最多500字').optional().default(''),
  aiProvider: z.enum(['openai', 'deepseek', 'kimi']),
  aiModel: z.string().min(1, '请选择模型'),
  apiKey: z.string().trim().max(300).optional().default(''),
});

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = schema.parse(await req.json());
    if (!AI_PROVIDERS[body.aiProvider].models.includes(body.aiModel)) {
      return NextResponse.json({ error: '该服务商不支持此模型' }, { status: 400 });
    }
    const result = await createRoom(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}