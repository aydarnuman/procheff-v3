import { Express, Request, Response } from 'express';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

const IHALEBUL_URL = 'https://ihalebul.com';
const DEBUG = false; // Tarayıcıyı arka planda çalıştır (production mode)

// Session interface with cached tender data
interface Session {
  browser: Browser;
  page: Page;
  loggedIn: boolean;
  cachedTenders?: any[]; // Cache the scraped tender list
  cacheTimestamp?: number; // When the cache was created
}

const sessions = new Map<string, Session>();
const CACHE_DURATION = 15 * 60 * 1000; // Cache for 15 minutes

// Session ID generator
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// İnsan gibi rastgele bekleme
async function humanDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Login to ihalebul.com
async function login(username: string, password: string): Promise<string> {
  // İnsan gibi davran: gerçek tarayıcı ayarları
  const browser = await chromium.launch({
    headless: !DEBUG, // DEBUG modunda tarayıcıyı göster
    slowMo: DEBUG ? 500 : 0, // Her adımı yavaşlat (debug için)
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });

  const page = await context.newPage();

  // Bot detection'ı engelle
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    (window as any).chrome = { runtime: {} };
  });

  try {
    // İhalebul.com'a git
    await page.goto(IHALEBUL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // İnsan gibi bekle
    await humanDelay(2000, 3000);

    // DEBUG: Sayfa yüklendikten sonra screenshot al
    if (DEBUG) {
      await page.screenshot({ path: 'debug_01_homepage.png', fullPage: true });
      console.log('📸 Anasayfa screenshot: debug_01_homepage.png');
    }

    // Login butonuna tıklayarak modal'ı aç (varsa)
    const loginTriggers = ['a:has-text("Giriş")', 'button:has-text("Giriş")', '[href*="login"]', '.login-btn'];
    for (const trigger of loginTriggers) {
      try {
        const el = await page.locator(trigger).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          await humanDelay(1000, 2000);
          break;
        }
      } catch {
        // Trigger bulunamadı, devam et
      }
    }

    // Login form input'larını bul (GÖRÜNÜR olanı - sitede 2 tane var!)
    await page.waitForTimeout(2000);

    // DEBUG: Login modal açıldıktan sonra screenshot ve HTML kaydet
    if (DEBUG) {
      await page.screenshot({ path: 'debug_02_login_modal.png', fullPage: true });
      console.log('📸 Login modal screenshot: debug_02_login_modal.png');

      const html = await page.content();
      fs.writeFileSync('debug_login.html', html);
      console.log('💾 Login sayfası HTML kaydedildi: debug_login.html');
    }

    // İki login formu var, görünür olanı al
    const usernameInputs = page.locator('input[name="kul_adi"]');
    const passwordInputs = page.locator('input[name="kul_sifre"], input[type="password"]');
    const loginButtons = page.locator('button[type="submit"]:visible, button:has-text("Giriş"):visible');

    // Count: kaç tane var?
    const count = await usernameInputs.count();
    console.log(`Found ${count} username inputs`);

    // Görünür olanı bul
    let usernameInput = usernameInputs.last(); // Genelde ikincisi görünür
    let passwordInput = passwordInputs.last();
    let loginButton = loginButtons.first();

    // Username'i doldur
    await usernameInput.scrollIntoViewIfNeeded();
    await usernameInput.fill(username);
    await humanDelay(800, 1500);

    // Password'u doldur
    await passwordInput.scrollIntoViewIfNeeded();
    await passwordInput.fill(password);
    await humanDelay(800, 1500);

    // Login butonuna tıkla
    await loginButton.scrollIntoViewIfNeeded();
    await loginButton.click();

    console.log('🔄 Login butonuna tıklandı, sayfa yükleniyor...');

    // Wait for navigation after login
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await humanDelay(3000, 5000); // Daha uzun bekle (session'ın oturması için)

    // DEBUG: Login sonrası screenshot
    if (DEBUG) {
      await page.screenshot({ path: 'debug_03_after_login.png', fullPage: true });
      console.log('📸 Login sonrası screenshot: debug_03_after_login.png');
    }

    // Check if login was successful
    const url = page.url();
    console.log('📍 Login sonrası URL:', url);

    if (url.includes('login')) {
      throw new Error('Login failed - still on login page');
    }

    const sessionId = generateSessionId();
    sessions.set(sessionId, { browser, page, loggedIn: true });

    console.log(`✅ Login successful: ${sessionId}`);
    return sessionId;
  } catch (error: any) {
    await browser.close();
    throw new Error(`Login failed: ${error.message}`);
  }
}

// Parse cards from current page
async function parseCurrentPage(page: Page, pageNumber: number): Promise<any[]> {
  // Card yapısından parse et
  const tenders = await page.evaluate((pgNum) => {
    const items: any[] = [];

    // İhale card'larını bul
    const cards = document.querySelectorAll('.card.border-secondary');
    console.log(`[Page ${pgNum}] Found ${cards.length} tender cards`);

    cards.forEach((card, index) => {
      try {
        // ID
        const titleLink = card.querySelector('.card-header a.details');
        const tenderId = titleLink?.getAttribute('data-id') || `card-${index}`;

        // Tüm card text'i ve HTML'i al
        const cardText = card.textContent || '';
        const cardHTML = card.innerHTML || '';

        // İşin Adı - HTML'den span içeriğini çek
        const titleMatch = cardHTML.match(/İşin adı:<\/b>\s*<span>([^<]+)<\/span>/);
        const titleText = titleMatch ? titleMatch[1].trim() : '-';

        // İdare adı - HTML'den span içeriğini çek
        const orgMatch = cardHTML.match(/İdare adı:<\/b>\s*<span>([^<]+)<\/span>/);
        const organization = orgMatch ? orgMatch[1].trim() : '-';

        // Şehir - sign-hanging icon'dan sonra gelen text
        const cityHTML = card.querySelector('iconify-icon[icon="fa6-solid:sign-hanging"]')?.parentElement?.textContent?.trim() || '-';
        const city = cityHTML.replace(/^\s+|\s+$/g, '');

        // Teklif tarihi - "Teklif tarihi:" sonrası (sadece tarih formatı)
        const dateMatch = cardText.match(/Teklif tarihi:\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/);
        const dateText = dateMatch ? dateMatch[1].trim() : '-';

        items.push({
          id: tenderId,
          title: titleText,
          ihaleName: titleText,
          organization,
          kurum: organization,
          city,
          sehir: city,
          date: dateText,
          ihaleTarihi: dateText,
        });
      } catch (err) {
        console.error('Card parse error:', err);
      }
    });

    return items;
  }, pageNumber);

  return tenders;
}

// Get tender list (Direct HTML parsing with pagination)
async function getTenderList(sessionId: string): Promise<any[]> {
  const session = sessions.get(sessionId);
  if (!session || !session.loggedIn) {
    throw new Error('Invalid or expired session');
  }

  // Check if cached data exists and is still fresh
  const now = Date.now();
  if (session.cachedTenders && session.cacheTimestamp) {
    const cacheAge = now - session.cacheTimestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log(`✨ Using cached tender list (${session.cachedTenders.length} items, age: ${Math.floor(cacheAge / 1000)}s)`);
      return session.cachedTenders;
    } else {
      console.log(`⏱️  Cache expired (age: ${Math.floor(cacheAge / 1000)}s), fetching fresh data...`);
    }
  }

  const { page } = session;

  console.log('🔍 Fetching tender list from HTML (9 pages)...');

  const allTenders: any[] = [];

  try {
    // Direkt kategori sayfasına git - Hazır Yemek - Lokantacılık (workcategory_in=15)
    const categoryUrl = `${IHALEBUL_URL}/tenders/search?workcategory_in=15`;

    console.log('Navigating to:', categoryUrl);

    try {
      await page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('✅ Page loaded with networkidle');
    } catch (err: any) {
      console.log('⚠️  Navigation timeout, trying to continue...', err.message);
      // Timeout olsa bile devam et
    }

    // JavaScript'in render etmesini bekle
    await humanDelay(3000, 5000);

    console.log('Current URL:', page.url());

    // "Ara" butonuna tıkla (ihale listesini yüklemek için)
    try {
      const searchButton = page.locator('button[type="submit"]:has-text("Ara")').first();
      if (await searchButton.isVisible({ timeout: 3000 })) {
        console.log('🔍 "Ara" butonuna tıklanıyor...');
        await searchButton.click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await humanDelay(3000, 5000);
        console.log('✅ Ara butonu tıklandı, ihale listesi yüklendi');
      }
    } catch (err: any) {
      console.log('⚠️  Ara butonu bulunamadı veya tıklanamadı:', err.message);
    }

    // DEBUG: Kategori sayfası screenshot (sadece ilk sayfa)
    if (DEBUG) {
      await page.screenshot({ path: 'debug_04_category_page.png', fullPage: true });
      console.log('📸 Kategori sayfası screenshot: debug_04_category_page.png');

      const html = await page.content();
      fs.writeFileSync('debug_category.html', html);
      console.log('💾 Kategori sayfası HTML kaydedildi: debug_category.html');
    }

    // 9 sayfa boyunca döngü
    for (let pageNum = 1; pageNum <= 9; pageNum++) {
      console.log(`\n📄 Processing page ${pageNum}/9...`);

      // Mevcut sayfayı parse et
      const pageTenders = await parseCurrentPage(page, pageNum);
      console.log(`✅ Page ${pageNum}: Found ${pageTenders.length} tenders`);

      allTenders.push(...pageTenders);

      // Son sayfa değilse, sonraki sayfaya git
      if (pageNum < 9) {
        try {
          // "Sonraki sayfa" linkini bul ve tıkla
          const nextPageLink = page.locator('a.page-link:has-text("Sonraki sayfa")').first();

          if (await nextPageLink.isVisible({ timeout: 3000 })) {
            console.log(`🔄 Clicking "Sonraki sayfa" button...`);
            await nextPageLink.click();
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await humanDelay(3000, 5000); // İnsan gibi bekle
            console.log(`✅ Navigated to page ${pageNum + 1}`);
          } else {
            console.log(`⚠️  "Sonraki sayfa" button not found, stopping at page ${pageNum}`);
            break;
          }
        } catch (err: any) {
          console.log(`⚠️  Failed to navigate to page ${pageNum + 1}:`, err.message);
          break;
        }
      }
    }

    console.log(`\n✅ Total tenders fetched from all pages: ${allTenders.length}`);

    // Cache the results
    session.cachedTenders = allTenders;
    session.cacheTimestamp = Date.now();
    console.log(`💾 Cached ${allTenders.length} tenders for future requests`);

    return allTenders;
  } catch (error: any) {
    console.error('HTML parsing failed:', error.message);

    // Cache even partial results
    if (allTenders.length > 0) {
      session.cachedTenders = allTenders;
      session.cacheTimestamp = Date.now();
      console.log(`💾 Cached ${allTenders.length} partial results`);
    }

    return allTenders; // Return what we have so far
  }
}

// Fallback: HTML parsing
async function getFallbackTenderList(page: Page): Promise<any[]> {
  try {
    await page.goto(`${IHALEBUL_URL}/tenders`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await humanDelay(2000, 3000);

    const tenders = await page.evaluate(() => {
      const items: any[] = [];
      const cards = document.querySelectorAll('.tender-card, .ihale-card, [data-tender-id]');

      cards.forEach((card, index) => {
        const title = card.querySelector('.title, h3, h4')?.textContent?.trim();
        const org = card.querySelector('.organization, .kurum')?.textContent?.trim();
        const city = card.querySelector('.city, .sehir')?.textContent?.trim();
        const date = card.querySelector('.date, .tarih')?.textContent?.trim();
        const link = card.querySelector('a[href*="/tender/"]');
        const id = link?.getAttribute('href')?.split('/').pop();

        if (title) {
          items.push({
            id: id || `tender-${index}`,
            title,
            ihaleName: title,
            organization: org || '-',
            kurum: org,
            city: city || '-',
            sehir: city,
            date: date || new Date().toISOString(),
            ihaleTarihi: date,
            tarih: date,
          });
        }
      });

      return items;
    });

    console.log(`✅ Found ${tenders.length} tenders from HTML`);
    return tenders;
  } catch (error: any) {
    console.error('HTML parsing also failed:', error.message);
    return [];
  }
}

// Get tender detail
async function getTenderDetail(sessionId: string, tenderId: string): Promise<any> {
  const session = sessions.get(sessionId);
  if (!session || !session.loggedIn) {
    throw new Error('Invalid or expired session');
  }

  const { page } = session;

  try {
    await page.goto(`${IHALEBUL_URL}/ihale/${tenderId}`, { waitUntil: 'networkidle' });

    const detail = await page.evaluate(() => {
      return {
        title: document.querySelector('.ihale-baslik, h1')?.textContent?.trim() || 'Detay yok',
        description: document.querySelector('.description, .aciklama')?.textContent?.trim() || '',
        organization: document.querySelector('.kurum')?.textContent?.trim() || '',
        date: document.querySelector('.tarih')?.textContent?.trim() || '',
        documents: Array.from(document.querySelectorAll('.documents a')).map(a => ({
          name: a.textContent?.trim(),
          url: (a as HTMLAnchorElement).href,
        })),
      };
    });

    return detail;
  } catch (error: any) {
    throw new Error(`Failed to get tender detail: ${error.message}`);
  }
}

// Cleanup session
async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    await session.browser.close();
    sessions.delete(sessionId);
    console.log(`🗑️ Session closed: ${sessionId}`);
  }
}

// Mount routes to Express app
export function mountIhalebul(app: Express) {
  // Login endpoint
  app.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const sessionId = await login(username, password);
      res.json({ ok: true, sessionId });
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tender list
  app.get('/list', async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const items = await getTenderList(sessionId);
      res.json({ ok: true, items });
    } catch (error: any) {
      console.error('❌ List error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tender detail
  app.get('/detail/:id', async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      const tenderId = req.params.id;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const detail = await getTenderDetail(sessionId, tenderId);
      res.json({ ok: true, ...detail });
    } catch (error: any) {
      console.error('❌ Detail error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Close session
  app.delete('/session/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      await closeSession(sessionId);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ İhalebul routes mounted');
}
