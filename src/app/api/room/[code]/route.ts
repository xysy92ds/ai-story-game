import { ensureSchema } from '@/lib/db';
import { getRoomState } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    await ensureSchema();
    const me = new URL(req.url).searchParams.get('me') || undefined;
    const state = await getRoomState(params.code, me);
    return Response.json(state);
  } catch (e) {
    return handleError(e);
  }
}