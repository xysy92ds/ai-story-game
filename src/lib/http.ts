import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './engine';

export function handleError(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    const msg = e.errors.map((err) => err.message).join('；');
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  console.error('[API错误]', e);
  return NextResponse.json({ error: '服务器内部错误，请稍后重试' }, { status: 500 });
}
