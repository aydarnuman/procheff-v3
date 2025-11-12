const W = process.env.IHALE_WORKER_URL || 'http://127.0.0.1:8080';

export async function ihbLogin() {
  try {
    // Debug: environment variables
    console.log('[İHALE] Debug - Environment variables:', {
      IHALE_WORKER_URL: process.env.IHALE_WORKER_URL,
      IHALEBUL_USERNAME: process.env.IHALEBUL_USERNAME ? '***' : 'undefined',
      W,
    });

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[İHALE] Worker connection failed:', message);
    throw new Error(`İhale worker bağlantısı başarısız: ${message}`);
  }
}

export async function ihbList(sessionId: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 dakika timeout (çok sayfalı listeler için)

    console.log('[İHALE] Fetching tender list...');

    const r = await fetch(`${W}/list?sessionId=${sessionId}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'List failed');

    console.log('[İHALE] Tender list received:', j.items?.length || 0, 'items');
    return j.items;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[İHALE] List request failed:', message);
    throw new Error(`İhale listesi alınamadı: ${message}`);
  }
}

export async function ihbDetail(sessionId: string, id: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 saniye timeout (büyük dosyalar için)

    console.log('[İHALE] Fetching tender detail for ID:', id);

    const r = await fetch(`${W}/detail/${id}?sessionId=${sessionId}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Detail failed');

    console.log('[İHALE] Tender detail received for ID:', id);
    return j;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[İHALE] Detail request failed:', message);
    throw new Error(`İhale detayı alınamadı: ${message}`);
  }
}

export function ihbProxyUrl(sessionId: string, url: string) {
  return `/api/ihale/proxy?sessionId=${sessionId}&url=${encodeURIComponent(url)}`;
}
