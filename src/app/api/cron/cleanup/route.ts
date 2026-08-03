import { ensureSchema } from '@/lib/db';
import { cleanupExpiredRooms } from '@/lib/engine';
import { handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    await ensureSchema();
    await cleanupExpiredRooms();
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}