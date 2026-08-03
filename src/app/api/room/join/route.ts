import { z } from 'zod';
import { ensureSchema } from '@/lib/db';
import { joinRoom } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(1, '请输入房间号').max(8),
  playerName: z.string().trim().min(1, '请输入你的昵称').max(16, '昵称最多16字'),
  playerId: z.string().optional().nullable().default(null),
});

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = schema.parse(await req.json());
    const result = await joinRoom(body.code, body.playerName, body.playerId);
    return Response.json(result);
  } catch (e) {
    return handleError(e);
  }
}