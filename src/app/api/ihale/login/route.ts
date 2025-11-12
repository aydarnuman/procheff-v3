import { NextRequest } from 'next/server';
import { ihbLogin } from '@/lib/ihale/client';

export async function POST(req: NextRequest) {
  try {
    const sessionId = await ihbLogin();
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
    res.headers.append('Set-Cookie', `ihale_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`); // 8 hours (matches worker session duration)
    return res;
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
