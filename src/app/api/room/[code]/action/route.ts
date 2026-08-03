import { z } from 'zod';
import { ensureSchema } from '@/lib/db';
import { submitAction } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  playerId: z.string().min(1),
  content: z.string().trim().min(1, '请输入行动内容').max(500, '行动最多500字'),
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    await ensureSchema();
    const body = schema.parse(await req.json());
    await submitAction(params.code, body.playerId, body.content);
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}