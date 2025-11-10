import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('ihale_session')?.value;
  const targetUrl = req.nextUrl.searchParams.get('url');

  if (!sessionId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const workerUrl = process.env.IHALE_WORKER_URL!;
    const proxyUrl = `${workerUrl}/proxy?sessionId=${sessionId}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error('Proxy failed');
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
