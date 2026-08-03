import { z } from 'zod';
import { ensureSchema } from '@/lib/db';
import { hostResolveRound } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({ playerId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    await ensureSchema();
    const { playerId } = schema.parse(await req.json());
    const claimed = await hostResolveRound(params.code, playerId);
    return Response.json({ ok: true, alreadyResolving: !claimed });
  } catch (e) {
    return handleError(e);
  }
}