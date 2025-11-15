import express from 'express';
import { BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';
import { toCSV, toJSON, toTXT } from './utils/exporters';
import { createContext, browserPool } from './browser-pool';
import { config } from './config';

// Türkçe logger
const Log = {
  basla: (msg: string, detay?: any) => {
    console.log(`\x1b[36m🔄 [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başlatılıyor...\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  basarili: (msg: string, detay?: any) => {
    console.log(`\x1b[32m✅ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} tamamlandı\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📊 Sonuç:`, detay, '\x1b[0m');
  },
  hata: (msg: string, err?: any) => {
    console.error(`\x1b[31m❌ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başarısız\x1b[0m`);
    if (err) console.error(`\x1b[2m   🐛 Hata:`, err, '\x1b[0m');
  },
  bilgi: (msg: string, detay?: any) => {
    console.log(`\x1b[34mℹ️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  uyari: (msg: string, detay?: any) => {
    console.log(`\x1b[33m⚠️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  ilerleme: (yuzde: number, islem: string) => {
    const bar = '█'.repeat(Math.floor(yuzde / 5)) + '░'.repeat(20 - Math.floor(yuzde / 5));
    console.log(`📈 [${new Date().toLocaleTimeString('tr-TR')}] ${islem}: [${bar}] %${yuzde}`);
  }
};

const BASE = config.IHALEBUL_BASE_URL;

type Session = { storageState: any; createdAt: number };
const SESSIONS = new Map<string, Session>();

// Cleanup function for graceful shutdown
export async function cleanupBrowsers() {
  Log.basla('Browser pool kapatılıyor');
  await browserPool.destroy();
  Log.basarili('Browser pool kapatıldı');
}

// Session cleanup - config'den alınan süre sonra sil
setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of SESSIONS.entries()) {
    if (now - session.createdAt > config.SESSION_TTL_MS) {
      SESSIONS.delete(sid);
      Log.uyari(`Oturum süresi doldu`, { sessionId: sid });
    }
  }
}, config.SESSION_CLEANUP_INTERVAL_MS);

async function makeContext(sessionId: string) {
  const session = SESSIONS.get(sessionId);
  const { context, release } = await createContext(session?.storageState);
  return { context, release };
}

async function doLogin(context: BrowserContext, username: string, password: string) {
  const page = await context.newPage();

  try {
    Log.basla('ihalebul.com giriş işlemi');
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 60000 }); // 60 saniye (ihalebul.com yavaş olabiliyor)

    // ID'li formu kullan (3 form var, ID'li olan ana form)
    await page.waitForSelector('input#kul_adi', { state: 'visible', timeout: 10000 });

    Log.bilgi('Kullanıcı adı giriliyor');
    await page.fill('input#kul_adi', username);

    Log.bilgi('Şifre giriliyor');
    await page.fill('input#sifre', password);

    // Login butonuna tıkla (form#form içindeki butonu seç)
    Log.bilgi('Giriş butonu tıklanıyor');
    await page.click('form#form button[type="submit"]');
    await page.waitForLoadState('networkidle', { timeout: 60000 }); // 60 saniye (ihalebul.com yavaş olabiliyor)

    const html = await page.content();

    // Login başarılı mı kontrol et
    if (html.includes('Çıkış') || html.includes('çıkış') || !html.includes('kul_adi')) {
      Log.basarili('Giriş başarılı');
      return await context.storageState();
    }

    throw new Error('Giriş başarısız - Kullanıcı adı veya şifre hatalı');
  } catch (error) {
    Log.hata('Giriş hatası', error);
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
    
    // Card body içindeki bilgileri al (tender number için de kullanılacak)
    const $body = $card.find('.card-body');

    // 1️⃣ İLAN NUMARASI - ÖNCE card body'de "Kayıt No:" veya "İlan No:" etiketini ara (GERÇEK KAYIT NUMARASI)
    // Başlıktaki numaralar genellikle ihale numarası değil, başka bir referans numarası olabilir
    const fullHeaderText = $card.find('.card-header a.details').text().trim();
    
    // Try multiple patterns for tender number
    let tenderNumber: string | null = null;
    
    // ÖNCE: Card body'de "Kayıt No:" veya "İlan No:" etiketini ara (en güvenilir - GERÇEK KAYIT NUMARASI)
    // Pattern 1: Look in card body for "İlan No:" or "Kayıt No:" labels (PRIORITY - this is the real registration number)
    // First, try to find in dt/dd structure
    $body.find('dt').each((_, dt) => {
      const $dt = $(dt);
      const label = $dt.text().trim().toLowerCase();
      // Look for exact matches: "kayıt no", "ilan no", "kayıt numarası", "ilan numarası"
      if (label.includes('kayıt') || label.includes('ilan') || label.includes('numara')) {
        const $dd = $dt.next('dd');
        const numberText = $dd.text().trim();
        if (numberText) {
          // Take the full text as tender number (don't filter, just trim)
          tenderNumber = numberText.trim();
          return false; // break
        }
      }
    });
    
    // Pattern 2: Search in full card text for "Kayıt No:" or "İlan No:" pattern (more flexible)
    if (!tenderNumber) {
      // Try "Kayıt No:" first (more specific)
      const kayitMatch = cardText.match(/Kayıt\s*(?:No|numarası)[:\s]+([^\n\r]+)/i);
      if (kayitMatch) {
        tenderNumber = kayitMatch[1].trim();
      } else {
        // Fallback to "İlan No:"
        const ilanMatch = cardText.match(/İlan\s*(?:No|numarası)[:\s]+([^\n\r]+)/i);
        if (ilanMatch) {
          tenderNumber = ilanMatch[1].trim();
        }
      }
    }
    
    // Pattern 3: Look for "Kayıt No" in any format in card body text
    if (!tenderNumber) {
      const bodyText = $body.text();
      const kayitBodyMatch = bodyText.match(/Kayıt\s*(?:No|numarası)[:\s]+([^\n\r]+)/i);
      if (kayitBodyMatch) {
        tenderNumber = kayitBodyMatch[1].trim();
      }
    }
    
    // FALLBACK: If no "Kayıt No" or "İlan No" found, try to extract from header (may not be the real registration number)
    // Pattern 4: YYYY/NNNNNN format (2025/1845237) - from header
    if (!tenderNumber) {
      const pattern1 = fullHeaderText.match(/(\d{4}\/\d+)/);
      if (pattern1) {
        tenderNumber = pattern1[1];
      }
    }
    
    // Pattern 5: ILN + numbers (ILN02328625) - from header
    if (!tenderNumber) {
      const pattern2 = fullHeaderText.match(/(ILN\d+)/i);
      if (pattern2) {
        tenderNumber = pattern2[1];
      }
    }
    
    // Pattern 6: YYDT + numbers (25DT2004948) - from header
    if (!tenderNumber) {
      const pattern3 = fullHeaderText.match(/(\d{2}DT\d+)/i);
      if (pattern3) {
        tenderNumber = pattern3[1];
      }
    }

    // 2️⃣ BAŞLIK - İlan numarasını temizle
    let title = fullHeaderText;
    if (tenderNumber) {
      // Remove tender number from title (handle different formats)
      title = fullHeaderText
        .replace(`${tenderNumber} - `, '')
        .replace(`${tenderNumber} `, '')
        .replace(`- ${tenderNumber}`, '')
        .trim();
    }
    if (!title || title === tenderNumber) title = 'İsimsiz İhale';

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

    // 4️⃣ İŞİN ADI - "İşin Adı:" etiketini ara
    let workName = '';
    $body.find('dt').each((_, dt) => {
      const $dt = $(dt);
      const label = $dt.text().trim().toLowerCase();
      if (label.includes('işin') && label.includes('adı')) {
        const $dd = $dt.next('dd');
        const workText = $dd.text().trim();
        if (workText) {
          workName = workText.trim();
          return false; // break
        }
      }
    });
    if (!workName) {
      // Fallback: card text'te ara
      const workMatch = cardText.match(/İşin\s+adı[:\s]+([^\n]+)/i);
      if (workMatch) {
        workName = workMatch[1].trim();
      }
    }
    // Eğer hala bulunamadıysa, title'ı kullan (ama bu başlık olabilir)
    if (!workName) {
      workName = title;
    }

    // 5️⃣ ŞEHİR - badge veya span içinde
    let city = $card.find('.text-dark-emphasis.fw-medium').first().text().trim();
    if (!city) {
      // Card footer'daki şehir bilgisi
      city = $card.find('.card-footer .text-dark-emphasis').text().trim();
    }

    // 6️⃣ İHALE TÜRÜ/USULÜ - "Ekap Açık ihale usulü", "Pazarlık usulü" vs
    let tenderType = '-';
    
    // Önce dt/dd yapısında "İhale usulü" veya "İhale türü" etiketini ara
    $body.find('dt').each((_, dt) => {
      const $dt = $(dt);
      const label = $dt.text().trim().toLowerCase();
      if (label.includes('ihale') && (label.includes('usul') || label.includes('tür'))) {
        const $dd = $dt.next('dd');
        const typeText = $dd.text().trim();
        if (typeText) {
          // Temizle: yeni satırları ve fazla boşlukları kaldır
          tenderType = typeText.replace(/\s+/g, ' ').trim();
          return false; // break
        }
      }
    });
    
    // Eğer bulunamadıysa, regex pattern'leri dene
    if (tenderType === '-') {
      const typePatterns = [
        /Ekap\s+[^\n]+usulü/i,
        /Açık\s+ihale\s+usulü/i,
        /Pazarlık\s+usulü/i,
        /Belli\s+istekliler\s+arası/i,
        /[^\n]*ihale\s+usulü[^\n]*/i,
        /[^\n]*usulü[^\n]*/i
      ];
      for (const pattern of typePatterns) {
        const match = cardText.match(pattern);
        if (match) {
          // Temizle: yeni satırları ve fazla boşlukları kaldır
          tenderType = match[0].replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 7️⃣ KISMİ TEKLİF - "Kısmi teklif verilebilir" kontrolü
    const partialBidAllowed = cardText.includes('Kısmi teklif verilebilir');

    // 8️⃣ TARİHLER - Yayın tarihi ve Teklif tarihi
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

    // 9️⃣ KALAN GÜN - tenderDate'ten hesapla
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
      workName: workName || title, // İşin Adı (fallback: title)
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

  Log.bilgi(`İhale listesinden kayıt ayrıştırıldı`, { toplamKayıt: out.length });
  return out;
}

function extractDocuments(html: string) {
  const $ = cheerio.load(html);
  const docs: { title: string; url: string; filename?: string; fileType?: string }[] = [];

  // Doküman linklerini bul
  $('a[href*="downloadfile"], a[href*="/download/"], a[href*=".pdf"], a[href*=".docx"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    const title = $(a).text().trim() || $(a).attr('title') || 'Doküman';
    const absoluteUrl = href.startsWith('http') ? href : `${BASE}${href}`;

    // Extract filename and type from URL or hash parameter
    let filename = '';
    let fileType = '';

    try {
      const url = new URL(absoluteUrl);
      const hash = url.searchParams.get('hash');

      if (hash) {
        // Decode base64 hash (e.g., ekap://2025/25DT1965815.cetvel.docx -> 25DT1965815.cetvel.docx)
        const decoded = Buffer.from(hash, 'base64').toString('utf-8');
        const filenameMatch = decoded.match(/([^/]+\.(pdf|docx?|xlsx?|txt|zip|rar))$/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
          fileType = filenameMatch[2].toUpperCase();
        }
      } else {
        // Fallback: try to extract from URL path
        const urlMatch = href.match(/\.([a-z0-9]+)(\?|$)/i);
        if (urlMatch) {
          fileType = urlMatch[1].toUpperCase();
          filename = title.replace(/[^a-z0-9\s]/gi, '_') + '.' + urlMatch[1];
        }
      }
    } catch (e) {
      // Ignore errors, filename will remain empty
    }

    docs.push({
      title,
      url: absoluteUrl,
      filename: filename || undefined,
      fileType: fileType || undefined
    });
  });

  Log.bilgi(`Belgeler bulundu`, { toplamBelge: docs.length });
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

      Log.basla(`Kullanıcı girişi`, { kullanıcı: username });

      const { context, release } = await makeContext('tmp');
      const storageState = await doLogin(context, username, password);
      await release();

      // Session ID oluştur
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      SESSIONS.set(sessionId, {
        storageState,
        createdAt: Date.now()
      });

      Log.basarili(`Oturum oluşturuldu`, { sessionId });
      res.json({ sessionId, expiresIn: 3600 });

    } catch (error: any) {
      Log.hata('Giriş başarısız', error.message);
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

      Log.basla(`Tüm ihale sayfaları getiriliyor`, { sessionId });

      const { context, release } = await makeContext(sessionId);
      const page = await context.newPage();

      // İlk sayfaya git ve toplam sayfa sayısını tespit et
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 saniye (ihalebul.com yavaş olabiliyor)
      });

      // "Son sayfa" linkinden maksimum page sayısını al
      const lastPageHref = await page.$eval('a:has-text("Son sayfa")', el => el.getAttribute('href')).catch(() => null);
      let totalPages = 9; // Default

      if (lastPageHref) {
        const pageMatch = lastPageHref.match(/page=(\d+)/);
        if (pageMatch) {
          totalPages = parseInt(pageMatch[1], 10);
          Log.bilgi(`Toplam sayfa sayısı tespit edildi`, { toplamSayfa: totalPages });
        }
      }

      const allItems: any[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const url = pageNum === 1
          ? `${BASE}/tenders/search?workcategory_in=15`
          : `${BASE}/tenders/search?workcategory_in=15&page=${pageNum}`;

        Log.ilerleme(Math.round((pageNum / totalPages) * 100), `Sayfa getiriliyor: ${pageNum}/${totalPages}`);

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000 // 60 saniye (ihalebul.com yavaş olabiliyor)
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

      await release();

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

      const { context, release } = await makeContext(sessionId);
      const page = await context.newPage();

      // 🔍 Network monitoring - XHR/fetch isteklerini ve response'larını yakala
      const apiRequests: string[] = [];
      const apiResponses: Map<string, any> = new Map();
      
      page.on('request', request => {
        const url = request.url();
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          console.log(`🌐 XHR/Fetch request detected: ${url}`);
          apiRequests.push(url);
        }
      });

      // Response'ları yakala
      page.on('response', async response => {
        const url = response.url();
        const request = response.request();
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          try {
            // Clone response to avoid "already read" error
            const clonedResponse = response;
            const contentType = response.headers()['content-type'] || '';
            
            if (contentType.includes('application/json')) {
              try {
                const json = await clonedResponse.json();
                console.log(`📦 JSON response captured: ${url}`);
                apiResponses.set(url, json);
              } catch (e) {
                // Response might be already consumed, try text
                try {
                  const text = await clonedResponse.text();
                  const json = JSON.parse(text);
                  apiResponses.set(url, json);
                } catch (e2) {
                  console.warn(`⚠️ Could not parse JSON from ${url}`);
                }
              }
            } else if (contentType.includes('text/')) {
              try {
                const text = await clonedResponse.text();
                console.log(`📄 Text response captured: ${url}`);
                apiResponses.set(url, text);
              } catch (e) {
                console.warn(`⚠️ Could not read text from ${url}`);
              }
            }
          } catch (e) {
            // Response zaten okunmuş olabilir, ignore
            console.warn(`⚠️ Could not capture response from ${url}:`, e);
          }
        }
      });

      // Navigate to detail page
      await page.goto(`${BASE}/tender/${id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 saniye (ihalebul.com yavaş olabiliyor)
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

      // 📄 Check for pagination in tables (Mal/Hizmet Listesi)
      // Look for pagination controls in tables
      const allTablePages: string[] = [];
      try {
        // Wait a bit for any dynamic content to load
        await page.waitForTimeout(2000);
        
        // Check if there are pagination controls for tables
        const paginationInfo = await page.evaluate(() => {
          // Look for pagination in table containers
          const tables = document.querySelectorAll('table');
          const paginationData: any[] = [];
          
          tables.forEach((table) => {
            // Find pagination near this table
            const container = table.closest('div, section');
            if (container) {
              const pagination = container.querySelector('.pagination, [class*="pagination"], [class*="page"]');
              if (pagination) {
                // Try to find total pages
                const pageLinks = pagination.querySelectorAll('a, button');
                let maxPage = 1;
                let currentPage = 1;
                
                pageLinks.forEach((link: Element) => {
                  const text = link.textContent?.trim() || '';
                  const pageNum = parseInt(text);
                  if (!isNaN(pageNum)) {
                    maxPage = Math.max(maxPage, pageNum);
                    if (link.classList.contains('active') || link.getAttribute('aria-current') === 'page') {
                      currentPage = pageNum;
                    }
                  }
                });
                
                // Also check for "Son sayfa" or "Son" link
                const lastPageLink = Array.from(pageLinks).find((link: Element) => 
                  link.textContent?.toLowerCase().includes('son')
                ) as HTMLElement | undefined;
                if (lastPageLink) {
                  const href = lastPageLink.getAttribute('href') || '';
                  const match = href.match(/page[=_](\d+)/i);
                  if (match) {
                    maxPage = parseInt(match[1], 10);
                  }
                }
                
                if (maxPage > 1) {
                  paginationData.push({ hasPagination: true, totalPages: maxPage, currentPage });
                }
              }
            }
          });
          
          return paginationData;
        });
        
        console.log(`📊 Pagination info:`, paginationInfo);
        
        // If pagination found, collect all pages
        if (paginationInfo.length > 0 && paginationInfo[0].totalPages > 1) {
          console.log(`📄 Found paginated table with ${paginationInfo[0].totalPages} pages`);
          
          // Collect HTML from all pages
          for (let pageNum = 1; pageNum <= paginationInfo[0].totalPages; pageNum++) {
            if (pageNum > 1) {
              // Click on page number or "Sonraki" button
              try {
                const pageSelector = `a:has-text("${pageNum}"), button:has-text("${pageNum}"), .pagination a[href*="page=${pageNum}"]`;
                await page.click(pageSelector, { timeout: 5000 }).catch(() => {
                  // Try "Sonraki" button
                  return page.click('a:has-text("Sonraki"), button:has-text("Sonraki"), .pagination a:has-text(">")', { timeout: 5000 });
                });
                
                // Wait for content to load
                await page.waitForTimeout(2000);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
              } catch (e) {
                console.warn(`⚠️ Could not navigate to page ${pageNum}:`, e);
                break; // Stop if can't navigate
              }
            }
            
            // Get current page HTML
            const pageHtml = await page.content();
            allTablePages.push(pageHtml);
            console.log(`   ✅ Collected page ${pageNum}/${paginationInfo[0].totalPages}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Error checking pagination:', e);
      }

      // Merge all table pages into one HTML
      let html = '';
      if (allTablePages.length > 0) {
        // Use first page as base, then append tables from other pages
        const $base = cheerio.load(allTablePages[0]);
        
        // Find the main table container
        const mainTable = $base('table').first();
        if (mainTable.length > 0) {
          // Find or create tbody
          let tbody = mainTable.find('tbody');
          if (tbody.length === 0) {
            // Create tbody and append to table
            const tbodyHtml = '<tbody></tbody>';
            mainTable.append(tbodyHtml);
            tbody = mainTable.find('tbody');
          }
          
          // For each additional page, extract table rows and append
          for (let i = 1; i < allTablePages.length; i++) {
            const $page = cheerio.load(allTablePages[i]);
            const pageTable = $page('table').first();
            const pageRows = pageTable.find('tbody tr').length > 0 
              ? pageTable.find('tbody tr')
              : pageTable.find('tr').not('thead tr').slice(1); // Skip header row
            
            // Append rows to the main table's tbody
            pageRows.each((_, row) => {
              const rowHtml = $page.html(row) || '';
              if (rowHtml.trim()) {
                tbody.append(rowHtml);
              }
            });
          }
        }
        
        html = $base.html() || allTablePages[0];
      } else {
        html = await page.content();
      }
      
      const $ = cheerio.load(html);

      const title = $('h1, .tender-title, .ihale-baslik').first().text().trim() || 'İhale Detayı';
      const documents = extractDocuments(html);

      // 📸 Take screenshot (full page) for AI analysis
      let screenshot: string | undefined;
      if (config.SCREENSHOT_ENABLED) {
        try {
          // Take screenshot as buffer and convert to base64
          const screenshotBuffer = await page.screenshot({
            fullPage: config.SCREENSHOT_FULL_PAGE
          });

          // Type-safe conversion to base64 string
          screenshot = screenshotBuffer.toString('base64') as string;
          console.log('📸 Screenshot captured (base64 string), length:', screenshot.length);
        } catch (e: any) {
          console.warn('⚠️ Could not capture screenshot:', e?.message || String(e));
          screenshot = undefined;
        }
      }

      await release();

      console.log(`📊 API requests detected: ${apiRequests.length}`);
      if (apiRequests.length > 0) {
        console.log('🔗 Endpoints:', apiRequests);
      }
      console.log(`📦 API responses captured: ${apiResponses.size}`);

      // API response'larını döndür
      const apiData: Record<string, any> = {};
      apiResponses.forEach((value, url) => {
        // URL'den key oluştur (domain olmadan)
        const key = url.split('/').pop() || url.replace(/https?:\/\/[^\/]+/, '');
        apiData[key] = value;
      });

      res.json({
        id,
        title,
        html,
        documents,
        screenshot, // Base64-encoded string (type-safe from source)
        apiData, // API'den gelen raw data
        debug: {
          apiRequests,
          apiResponseCount: apiResponses.size
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

      const { context, release } = await makeContext(sessionId);
      const page = await context.newPage();

      // 90 saniye timeout (32MB+ dosyalar için)
      const response = await page.request.get(targetUrl, { timeout: 90000 });
      const buffer = await response.body();

      const contentType = response.headers()['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Extract filename from hash parameter if available
      let filename = 'document';
      try {
        const url = new URL(targetUrl);
        const hash = url.searchParams.get('hash');

        if (hash) {
          // Decode base64 hash (e.g., ekap://2025/2025.1745912.idari.zip)
          const decoded = Buffer.from(hash, 'base64').toString('utf-8');
          console.log('[Proxy] Decoded hash:', decoded);

          const filenameMatch = decoded.match(/([^/]+\.(pdf|docx?|xlsx?|txt|zip|rar))$/i);
          if (filenameMatch) {
            filename = filenameMatch[1];
            console.log('[Proxy] Extracted filename:', filename);
          }
        } else {
          // Fallback: try to get from URL path
          const pathParts = url.pathname.split('/');
          filename = pathParts[pathParts.length - 1] || 'document';
        }
      } catch (e) {
        console.error('[Proxy] Filename extraction error:', e);
        filename = 'document';
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(Buffer.from(buffer));
      await release();

    } catch (error: any) {
      console.error('❌ Proxy failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 5) EXPORT - Export tender list in CSV/JSON/TXT format
  // NOTE: This endpoint should ideally fetch from database for better performance
  // For now, we keep the scraping approach for data freshness guarantee
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

      const { context, release } = await makeContext(sessionId);
      const page = await context.newPage();

      // Fetch first page to detect total pages
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: config.BROWSER_TIMEOUT_MS
      });

      const lastPageHref = await page.$eval('a:has-text("Son sayfa")', el => el.getAttribute('href')).catch(() => null);
      let totalPages = config.DEFAULT_MAX_PAGES;

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
          timeout: config.BROWSER_TIMEOUT_MS
        });

        const html = await page.content();
        const items = parseList(html);
        allItems.push(...items);

        if (pageNum < totalPages) {
          await page.waitForTimeout(config.PAGE_RATE_LIMIT_MS);
        }
      }

      await release();

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

      const { context, release } = await makeContext(sessionId);
      const page = await context.newPage();
      await page.goto(`${BASE}/tenders/search?workcategory_in=15`, {
        waitUntil: 'domcontentloaded',
        timeout: config.BROWSER_TIMEOUT_MS
      });
      const html = await page.content();
      await release();

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ Ihalebul routes mounted');
}
