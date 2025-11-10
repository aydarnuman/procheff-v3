const W = process.env.IHALE_WORKER_URL!;

export async function ihbLogin() {
  try {
    // Worker'a bağlanmayı dene
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout

    console.log('[İHALE] Connecting to worker:', W);

    const r = await fetch(`${W}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.IHALEBUL_USERNAME,
        password: process.env.IHALEBUL_PASSWORD,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const j = await r.json();
    if (!r.ok) throw new Error(j.error);

    console.log('[İHALE] Login successful, session ID:', j.sessionId);
    return j.sessionId;
  } catch (error: any) {
    console.error('[İHALE] Worker connection failed:', error.message);
    throw new Error(`İhale worker bağlantısı başarısız: ${error.message}`);
  }
}

export async function ihbList(sessionId: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    console.log('[İHALE] Fetching tender list...');

    const r = await fetch(`${W}/list?sessionId=${sessionId}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'List failed');

    console.log('[İHALE] Tender list received:', j.items?.length || 0, 'items');
    return j.items;
  } catch (error: any) {
    console.error('[İHALE] List request failed:', error.message);
    throw new Error(`İhale listesi alınamadı: ${error.message}`);
  }
}

export async function ihbDetail(sessionId: string, id: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    console.log('[İHALE] Fetching tender detail for ID:', id);

    const r = await fetch(`${W}/detail/${id}?sessionId=${sessionId}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Detail failed');

    console.log('[İHALE] Tender detail received for ID:', id);
    return j;
  } catch (error: any) {
    console.error('[İHALE] Detail request failed:', error.message);
    throw new Error(`İhale detayı alınamadı: ${error.message}`);
  }
}

export function ihbProxyUrl(sessionId: string, url: string) {
  return `/api/ihale/proxy?sessionId=${sessionId}&url=${encodeURIComponent(url)}`;
}
