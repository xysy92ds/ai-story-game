import { z } from 'zod';
import { ensureSchema } from '@/lib/db';
import { kickPlayer } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ playerId: z.string().min(1), targetPlayerId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    await ensureSchema();
    const body = schema.parse(await req.json());
    await kickPlayer(params.code, body.playerId, body.targetPlayerId);
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}