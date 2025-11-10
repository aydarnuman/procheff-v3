import express from 'express';
import { chromium, BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';
import { toCSV, toJSON, toTXT } from './utils/exporters';

const BASE = 'https://www.ihalebul.com';

type Session = { storageState: any; createdAt: number };
const SESSIONS = new Map<string, Session>();

// Session cleanup - 1 saat sonra sil
setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of SESSIONS.entries()) {
    if (now - session.createdAt > 3600000) {
      SESSIONS.delete(sid);
      console.log(`🗑️  Session expired: ${sid}`);
    }
  }
}, 300000); // Her 5 dakikada kontrol

async function makeContext(sessionId: string) {
  const session = SESSIONS.get(sessionId);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    storageState: session?.storageState ?? undefined,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  return { browser, context };
}

async function doLogin(context: BrowserContext, username: string, password: string) {
  const page = await context.newPage();

  try {
    console.log('🔐 Logging in to ihalebul.com...');
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 30000 });

    // ID'li formu kullan (3 form var, ID'li olan ana form)
    await page.waitForSelector('input#kul_adi', { state: 'visible', timeout: 10000 });

    console.log('📝 Filling username...');
    await page.fill('input#kul_adi', username);

    console.log('🔒 Filling password...');
    await page.fill('input#sifre', password);

    // Login butonuna tıkla (form#form içindeki butonu seç)
    console.log('🚀 Clicking login button...');
    await page.click('form#form button[type="submit"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const html = await page.content();

    // Login başarılı mı kontrol et
    if (html.includes('Çıkış') || html.includes('çıkış') || !html.includes('kul_adi')) {
      console.log('✅ Login successful');
      return await context.storageState();
    }

    throw new Error('Login başarısız - Kullanıcı adı veya şifre hatalı');
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  } finally {
    await page.close();
  }
}

function parseList(html: string) {
  const $ = cheerio.load(html);
  const out: any[] = [];
  const seen = new Set<string>();

  // Her bir card'ı ayrı ayrı bul
  $('div.card.border-secondary').each((_, cardEl) => {
    const $card = $(cardEl);

    // Bu card içindeki tender linkini bul
    const $link = $card.find('a.details[href*="/tender/"]').first();
    if (!$link.length) return;

    const href = $link.attr('href');
    if (!href) return;

    const absoluteUrl = href.startsWith('http') ? href : `${BASE}${href}`;
    const idMatch = absoluteUrl.match(/\/tender\/(\d+)/);
    if (!idMatch) return;
    const id = idMatch[1];

    // Duplicate check
    if (seen.has(id)) return;
    seen.add(id);

    // Tam metin - tüm parse için
    const cardText = $card.text();

    // 1️⃣ İLAN NUMARASI - Başlıktan veya karttan çıkar
    const fullHeaderText = $card.find('.card-header a.details').text().trim();
    const tenderNumberMatch = fullHeaderText.match(/(\d{5,}\/\d+)/);
    const tenderNumber = tenderNumberMatch ? tenderNumberMatch[1] : null;

    // 2️⃣ BAŞLIK - İlan numarasını temizle
    let title = fullHeaderText;
    if (tenderNumber) {
      title = fullHeaderText.replace(`${tenderNumber} - `, '').trim();
    }
    if (!title) title = 'İsimsiz İhale';

    // Card body içindeki bilgileri al
    const $body = $card.find('.card-body');

    // 3️⃣ İDARE - "İdare adı:" satırını bul
    let org = '';
    $body.find('dt').each((_, dt) => {
      const $dt = $(dt);
      if ($dt.text().includes('İdare')) {
        org = $dt.next('dd').text().trim();
        return false; // break
      }
    });
    if (!org) {
      const orgMatch = cardText.match(/İdare\s+adı:\s*([^\n]+)/i);
      if (orgMatch) org = orgMatch[1].trim();
    }

    // 4️⃣ ŞEHİR - badge veya span içinde
    let city = $card.find('.text-dark-emphasis.fw-medium').first().text().trim();
    if (!city) {
      // Card footer'daki şehir bilgisi
      city = $card.find('.card-footer .text-dark-emphasis').text().trim();
    }

    // 5️⃣ İHALE TÜRÜ - "Ekap Açık ihale usulü", "Pazarlık usulü" vs
    let tenderType = '-';
    const typePatterns = [
      /Ekap\s+[^\n]+usulü/i,
      /Açık\s+ihale\s+usulü/i,
      /Pazarlık\s+usulü/i,
      /Belli\s+istekliler\s+arası/i
    ];
    for (const pattern of typePatterns) {
      const match = cardText.match(pattern);
      if (match) {
        tenderType = match[0].trim();
        break;
      }
    }

    // 6️⃣ KISMİ TEKLİF - "Kısmi teklif verilebilir" kontrolü
    const partialBidAllowed = cardText.includes('Kısmi teklif verilebilir');

    // 7️⃣ TARİHLER - Yayın tarihi ve Teklif tarihi
    let publishDate = '';
    let tenderDate = '';

    // "Yayın tarihi:" etiketli tarihi bul
    const publishMatch = cardText.match(/Yayın\s+tarihi:\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i);
    if (publishMatch) publishDate = publishMatch[1];

    // "Teklif tarihi:" etiketli tarihi bul (saati de içerebilir)
    const tenderMatch = cardText.match(/Teklif\s+tarihi:\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i);
    if (tenderMatch) tenderDate = tenderMatch[1];

    // Eğer tenderDate bulunamadıysa, time elementlerine bak
    if (!tenderDate) {
      const allDates: string[] = [];

      // dt/dd elementlerinden tarihleri topla
      $body.find('dt').each((_, dt) => {
        const $dt = $(dt);
        const label = $dt.text().trim().toLowerCase();
        // "Teklif", "İhale", "Son" gibi kelimeleri içeren etiketleri tercih et
        if (label.includes('teklif') || label.includes('ihale') || label.includes('son')) {
          const $dd = $dt.next('dd');
          const $time = $dd.find('time');
          if ($time.length) {
            const d = $time.attr('datetime') || $time.text().trim();
            if (d) allDates.push(d);
          }
          const ddText = $dd.text().trim();
          const dateMatch = ddText.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
          if (dateMatch) allDates.push(dateMatch[1]);
        }
      });

      // En gelecekteki tarihi seç
      if (allDates.length > 0) {
        const parsedDates = allDates
          .map(d => {
            const parts = d.split(/[./]/);
            if (parts.length === 3) {
              return {
                str: d,
                date: new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
              };
            }
            return null;
          })
          .filter(d => d !== null && !isNaN(d.date.getTime()));

        if (parsedDates.length > 0) {
          parsedDates.sort((a, b) => b!.date.getTime() - a!.date.getTime());
          tenderDate = parsedDates[0]!.str;
        }
      }
    }

    // 8️⃣ KALAN GÜN - tenderDate'ten hesapla
    let daysRemaining: number | null = null;
    if (tenderDate) {
      const parts = tenderDate.split(/[./]/);
      if (parts.length === 3) {
        const tDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = tDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    out.push({
      id,
      tenderNumber: tenderNumber || '-',
      title,
      organization: org || '-',
      city: city || '-',
      tenderType,
      partialBidAllowed,
      publishDate: publishDate || '-',
      tenderDate: tenderDate || '-',
      daysRemaining,
      url: absoluteUrl,
    });
  });

  console.log(`📋 Parsed ${out.length} tenders from list`);
  return out;
}

function extractDocuments(html: string) {
  const $ = cheerio.load(html);
  const docs: { title: string; url: string }[] = [];

  // Doküman linklerini bul
  $('a[href*="downloadfile"], a[href*="/download/"], a[href*=".pdf"], a[href*=".docx"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    const title = $(a).text().trim() || $(a).attr('title') || 'Doküman';
    const absoluteUrl = href.startsWith('http') ? href : `${BASE}${href}`;

    docs.push({ title, url: absoluteUrl });
  });

  console.log(`📄 Found ${docs.length} documents`);
  return docs;
}

export function mountIhalebul(app: express.Express) {

  // 1) LOGIN
  app.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
      }

      console.log(`🔑 Login attempt for user: ${username}`);

      const { browser, context } = await makeContext('tmp');
      const storageState = await doLogin(context, username, password);
      await browser.close();

      // Session ID oluştur
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      SESSIONS.set(sessionId, {
        storageState,
        createdAt: Date.now()
      });

      console.log(`✅ Session created: ${sessionId}`);
      res.json({ sessionId, expiresIn: 3600 });

    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 2) LIST (with pagination support)
  app.get('/list', async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || '');

      if (!SESSIONS.has(sessionId)) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      console.log(`📋 Fetching ALL tender pages for session: ${sessionId}`);

      const { browser, context } = await makeContext(sessionId);
      const page = await context.newPage();

      // İlk sayfaya git ve toplam sayfa sayısını tespit et
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // "Son sayfa" linkinden maksimum page sayısını al
      const lastPageHref = await page.$eval('a:has-text("Son sayfa")', el => el.getAttribute('href')).catch(() => null);
      let totalPages = 9; // Default

      if (lastPageHref) {
        const pageMatch = lastPageHref.match(/page=(\d+)/);
        if (pageMatch) {
          totalPages = parseInt(pageMatch[1], 10);
          console.log(`📊 Detected ${totalPages} total pages`);
        }
      }

      const allItems: any[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const url = pageNum === 1
          ? `${BASE}/tenders/search?workcategory_in=15`
          : `${BASE}/tenders/search?workcategory_in=15&page=${pageNum}`;

        console.log(`📄 Fetching page ${pageNum}/${totalPages}...`);

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        const html = await page.content();
        const items = parseList(html);

        allItems.push(...items);
        console.log(`   ✅ Found ${items.length} items on page ${pageNum}`);

        // Rate limiting - 1 saniye bekle
        if (pageNum < totalPages) {
          await page.waitForTimeout(1000);
        }
      }

      await browser.close();

      console.log(`✅ Total items fetched: ${allItems.length}`);
      res.json({ items: allItems, count: allItems.length });

    } catch (error: any) {
      console.error('❌ List fetch failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 3) DETAIL (with network monitoring and spinner handling)
  app.get('/detail/:id', async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || '');
      const id = req.params.id;

      if (!SESSIONS.has(sessionId)) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      console.log(`📄 Fetching tender detail: ${id}`);

      const { browser, context } = await makeContext(sessionId);
      const page = await context.newPage();

      // 🔍 Network monitoring - XHR/fetch isteklerini yakala
      const apiRequests: string[] = [];
      page.on('request', request => {
        const url = request.url();
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          console.log(`🌐 XHR/Fetch request detected: ${url}`);
          apiRequests.push(url);
        }
      });

      // Navigate to detail page
      await page.goto(`${BASE}/tender/${id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // ⏳ SPA spinner handling - wait for content to fully load
      try {
        // #tender, .tender-content, veya herhangi bir ana içerik container'ını bekle
        await page.waitForFunction(
          `() => {
            const tender = document.querySelector('#tender, .tender-content, main.tender-detail');
            return tender && tender.textContent && tender.textContent.length > 200;
          }`,
          { timeout: 15000 }
        );
        console.log('✅ Spinner completed, content loaded');
      } catch (e) {
        console.warn('⚠️ Spinner wait timeout, proceeding with available content');
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      const title = $('h1, .tender-title, .ihale-baslik').first().text().trim() || 'İhale Detayı';
      const documents = extractDocuments(html);

      await browser.close();

      console.log(`📊 API requests detected: ${apiRequests.length}`);
      if (apiRequests.length > 0) {
        console.log('🔗 Endpoints:', apiRequests);
      }

      res.json({
        id,
        title,
        html,
        documents,
        debug: {
          apiRequests, // Debug için - production'da kaldırılabilir
        }
      });

    } catch (error: any) {
      console.error('❌ Detail fetch failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 4) PROXY (Doküman İndirme)
  app.get('/proxy', async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || '');
      const targetUrl = String(req.query.url || '');

      if (!SESSIONS.has(sessionId)) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      if (!targetUrl) {
        return res.status(400).json({ error: 'url parameter required' });
      }

      console.log(`📥 Proxying download: ${targetUrl}`);

      const { browser, context } = await makeContext(sessionId);
      const page = await context.newPage();

      const response = await page.request.get(targetUrl);
      const buffer = await response.body();

      const contentType = response.headers()['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Filename from URL
      const filename = targetUrl.split('/').pop() || 'document';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(Buffer.from(buffer));
      await browser.close();

    } catch (error: any) {
      console.error('❌ Proxy failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 5) EXPORT - Export tender list in CSV/JSON/TXT format
  app.get('/export', async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || '');
      const format = String(req.query.format || 'json').toLowerCase();

      if (!SESSIONS.has(sessionId)) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      if (!['csv', 'json', 'txt'].includes(format)) {
        return res.status(400).json({ error: 'Invalid format. Use: csv, json, or txt' });
      }

      console.log(`📦 Exporting tender list as ${format.toUpperCase()}...`);

      const { browser, context } = await makeContext(sessionId);
      const page = await context.newPage();

      // Fetch first page to detect total pages
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const lastPageHref = await page.$eval('a:has-text("Son sayfa")', el => el.getAttribute('href')).catch(() => null);
      let totalPages = 9; // Default

      if (lastPageHref) {
        const pageMatch = lastPageHref.match(/page=(\d+)/);
        if (pageMatch) {
          totalPages = parseInt(pageMatch[1], 10);
        }
      }

      const allItems: any[] = [];

      // Fetch all pages
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const url = pageNum === 1
          ? `${BASE}/tenders/search?workcategory_in=15`
          : `${BASE}/tenders/search?workcategory_in=15&page=${pageNum}`;

        console.log(`📄 Fetching page ${pageNum}/${totalPages} for export...`);

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        const html = await page.content();
        const items = parseList(html);
        allItems.push(...items);

        if (pageNum < totalPages) {
          await page.waitForTimeout(1000);
        }
      }

      await browser.close();

      console.log(`✅ Export completed: ${allItems.length} tenders in ${format.toUpperCase()} format`);

      // Format response based on requested format
      if (format === 'csv') {
        const csv = toCSV(allItems);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="ihaleler_${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
      }

      if (format === 'txt') {
        const txt = toTXT(allItems);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="ihaleler_${new Date().toISOString().split('T')[0]}.txt"`);
        return res.send(txt);
      }

      // JSON (default)
      const json = toJSON(allItems);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ihaleler_${new Date().toISOString().split('T')[0]}.json"`);
      return res.send(json);

    } catch (error: any) {
      console.error('❌ Export failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // DEBUG - Get raw HTML
  app.get('/debug/html', async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || '');
      if (!SESSIONS.has(sessionId)) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      const { browser, context } = await makeContext(sessionId);
      const page = await context.newPage();
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      const html = await page.content();
      await browser.close();

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ Ihalebul routes mounted');
}
