import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { TenderDatabase } from '@/lib/ihale/database';
import { validateTenderContent, logValidationResult } from '@/lib/ihale/validators';
import { AILogger } from '@/lib/ai/logger';
import * as cheerio from 'cheerio';

// Force Node.js runtime (required for Puppeteer and Anthropic SDK)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 dakika timeout

/**
 * Fetch full content of a tender page with AI-powered parsing
 * 1. Puppeteer fetches raw HTML + screenshot
 * 2. Claude AI parses and structures the content
 * 3. Returns clean structured data
 */
export async function POST(request: NextRequest) {
  try {
    const { url, tenderUrl, tenderId } = await request.json();

    // Frontend'den tenderUrl veya url olarak gelebilir
    const targetUrl = tenderUrl || url;

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'URL gerekli' },
        { status: 400 }
      );
    }

    AILogger.info('Fetching full content from ihalebul.com', { targetUrl, tenderId });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 🔐 Auto-login to ihalebul.com
    const username = process.env.IHALEBUL_USERNAME;
    const password = process.env.IHALEBUL_PASSWORD;

    if (username && password) {
      AILogger.info('Logging in to ihalebul.com...');

      try {
        await page.goto('https://www.ihalebul.com/tenders', { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });

        // Wait for login form
        await page.waitForSelector('input[name="kul_adi"], input#kul_adi', { timeout: 10000 });
        AILogger.info('Login form detected');

        // Fill the form
        await page.evaluate((user, pass) => {
          const userInputs = document.querySelectorAll<HTMLInputElement>('input[name="kul_adi"], input#kul_adi');
          const passInputs = document.querySelectorAll<HTMLInputElement>('input[name="sifre"], input#sifre');

          // Use desktop form (second one) if available
          if (userInputs.length >= 2 && passInputs.length >= 2) {
            userInputs[1].value = user;
            passInputs[1].value = pass;
          } else if (userInputs.length > 0 && passInputs.length > 0) {
            userInputs[0].value = user;
            passInputs[0].value = pass;
          }
        }, username, password);

        AILogger.info('Login credentials filled');

        // Click login button
        await page.evaluate(() => {
          const buttons = document.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
          if (buttons.length >= 2) {
            buttons[1].click(); // Desktop form submit
          } else if (buttons.length > 0) {
            buttons[0].click();
          }
        });

        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

        // ✅ Login doğrulaması
        const currentUrl = page.url();
        const pageContent = await page.content();
        const isLoginPage = pageContent.toLowerCase().includes('giriş yap') ||
                           pageContent.toLowerCase().includes('kullanıcı adı') ||
                           currentUrl.includes('/login');

        if (isLoginPage) {
          AILogger.error('Login failed - still on login page');
          throw new Error('Login failed - still on login page');
        } else {
          AILogger.info('Login successful', { currentUrl });
        }
      } catch (loginError: unknown) {
        const errorMessage = loginError instanceof Error ? loginError.message : String(loginError);
        AILogger.error('Login error', { error: errorMessage });
        await browser.close();
        throw new Error(`Login failed: ${errorMessage}`);
      }
    }

    // Navigate to the tender page
    AILogger.info('Navigating to tender page', { targetUrl });
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // ✅ Sayfa yüklendikten sonra login kontrolü
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);

    AILogger.info('Page loaded', { textPreview: pageText.slice(0, 200) });

    // Login kontrolü
    const loginPatterns = [
      'lütfen giriş yapın',
      'please sign in',
      'kullanıcı adı',
      'şifrenizi girin',
      'oturum açın',
      'login required',
      'authentication required'
    ];

    const lowerText = pageText.toLowerCase();
    const hasLoginPattern = loginPatterns.some(pattern => lowerText.includes(pattern));
    const hasTenderContent = lowerText.includes('ihale bilgileri') ||
                             lowerText.includes('kayıt no') ||
                             lowerText.includes('ihale başlığı') ||
                             lowerText.includes('yayın tarihi');

    if (hasLoginPattern && !hasTenderContent) {
      AILogger.error('Tender page requires login');
      await browser.close();
      throw new Error('Tender page requires login - session may have expired');
    }

    AILogger.info('Page successfully loaded, tender content available');

    // ⏳ WAIT for dynamic content to load
    AILogger.info('Waiting for dynamic content to load...');
    await new Promise(r => setTimeout(r, 1500));

    // Try to ensure document section is visible
    try {
      await page.waitForSelector(
        'a[href*="/download"], .documents, .document-list, [class*="document"], button[onclick*="download"]',
        { timeout: 7000 }
      );
    } catch {
      AILogger.warn('No document section found immediately, continuing...');
    }

    // 🧠 Trigger lazy / dynamic buttons
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[onclick*="download"]'));
      btns.forEach((b) => {
        if (b instanceof HTMLElement) {
          try { b.click(); } catch {}
        }
      });

      const acc = Array.from(document.querySelectorAll('.accordion, .collapse, .tab'));
      acc.forEach((a) => {
        if (a instanceof HTMLElement) {
          try { a.click(); } catch {}
        }
      });
    });

    // Give the page time to inject new links
    await new Promise(r => setTimeout(r, 2000));

    // 🧠 Scroll to bottom to trigger lazy loads
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1000));

    // 🆕 Get RAW content
    AILogger.info('Capturing raw HTML and screenshot...');

    const htmlContent = await page.content();
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true }) as string;
    const innerText = await page.evaluate(() => document.body.innerText);

    // 📄 Extract document links from the page
    const documentLinks = await page.evaluate(() => {
      const links: Array<{ title: string; url: string; type: string }> = [];

      const selectors = [
        'a[href*="/download"]',
        'button[onclick*="download"]',
        'a.btn[href*="document"]',
        'a[class*="download"]',
        'a[download]',
        'a[href*=".pdf"]',
        'a[href*=".doc"]',
        'a[href*=".zip"]',
        'a[href*=".txt"]',    // 🆕 TXT
        'a[href*=".json"]',   // 🆕 JSON
        'a[href*=".csv"]',    // 🆕 CSV
        'a[href*=".xls"]',    // 🆕 Excel
      ];

      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll<HTMLElement>(selector);
          elements.forEach((element) => {
            let href = '';

            if (element.tagName === 'A') {
              href = (element as HTMLAnchorElement).href;
            } else if (element.tagName === 'BUTTON') {
              const onclick = element.getAttribute('onclick') || '';
              const urlMatch = onclick.match(/['"]([^'"]+)['"]/);
              if (urlMatch) {
                href = urlMatch[1];
                if (!href.startsWith('http')) {
                  href = window.location.origin + (href.startsWith('/') ? href : '/' + href);
                }
              }
            }

            if (!href) return;

            let title = element.textContent?.trim() || '';
            if (!title || title.length < 3) {
              title = element.getAttribute('aria-label') ||
                      element.getAttribute('title') ||
                      element.closest('.card, .document-item')?.querySelector('.title, .name, h3, h4, h5')?.textContent?.trim() ||
                      'Belge';
            }

            let type = 'ek_dosya';
            const titleLower = title.toLowerCase();
            const hrefLower = href.toLowerCase();

            if (titleLower.includes('idari') || titleLower.includes('şartname') || hrefLower.includes('idari')) {
              type = 'idari_sartname';
            } else if (titleLower.includes('teknik') || hrefLower.includes('teknik')) {
              type = 'teknik_sartname';
            } else if (hrefLower.endsWith('.txt')) {
              type = 'diger';
            } else if (hrefLower.endsWith('.json')) {
              type = 'diger';
            } else if (hrefLower.endsWith('.csv') || hrefLower.endsWith('.xls') || hrefLower.endsWith('.xlsx')) {
              type = 'diger';
            }

            if (href && !links.find(l => l.url === href)) {
              links.push({ title: title || 'Doküman', url: href, type });
            }
          });
        } catch (err) {
          // Ignore selector errors
        }
      });

      return links;
    });

    AILogger.info('Document links extracted', { count: documentLinks.length });

    // Close browser
    await browser.close();

    AILogger.info('Raw content captured', {
      htmlLength: htmlContent.length,
      textLength: innerText.length,
      hasScreenshot: !!screenshot,
      documentLinksCount: documentLinks.length,
    });

    // 🤖 Parse with Claude AI
    AILogger.info('Parsing with Claude AI...');

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build content array with screenshot + text
    const contentBlocks: Array<{ type: 'image' | 'text'; source?: { type: string; data: string }; text?: string }> = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshot,
        } as any,
      },
      {
        type: 'text',
        text: `Bu bir Türk kamu ihalesi sayfasıdır. Aşağıdaki içeriği analiz ederek yapılandırılmış JSON formatında çıkar:

1. **Sayfa screenshot'u** (yukarıdaki görsel)
2. **HTML ve text içeriği** (aşağıda)

**ÖNEMLİ:** TÜM detayları çıkar, hiçbir şeyi atlama! Büyük ihaleler için tüm bilgiler önemlidir

**İHTİYAÇ DUYULAN BİLGİLER:**
1. **title**: İhale başlığı / İşin adı
2. **organization**: İdare adı (kurum)
3. **details**: Tüm ihale detaylarını içeren key-value object. Örnekler:
   - "Kayıt no"
   - "Teklif tarihi"
   - "Yaklaşık maliyet limiti"
   - "İhale usulü"
   - "Toplantı adresi"
   - "İhale türü"
   - Ve diğer tüm görünen detaylar (HIÇBIR ŞEYİ ATLAMA!)
4. **documents**: İndirilebilir dokümanlar listesi (her biri şu formatta):
   - title: Doküman adı
   - url: Download linki (tam URL)
   - type: "idari_sartname" | "teknik_sartname" | "ek_dosya"
5. **announcementText**: İhale ilanı metni (SADECE ASIL İLAN METNİ - döküman listesini dahil etme, o zaten 'documents' field'ında var)
6. **itemsList**: Eğer ihale ilanında malzeme/ürün listesi varsa, CSV formatında çıkar. Format:
   - Header: "Sıra No,Ürün Adı,Miktar,Birim,Birim Fiyat (TL),Toplam Fiyat (TL)"
   - Örnek satır: "1,Domates,100,KG,15.50,1550.00"
   - Eğer liste yoksa null döndür

**HTML İçeriği:**
\`\`\`html
${htmlContent.slice(0, 500000)}
\`\`\`

**Plain Text İçeriği:**
\`\`\`
${innerText.slice(0, 300000)}
\`\`\`

**JSON FORMAT (SADECE JSON DÖNDÜR, BAŞKA HİÇBİR ŞEY YAZMA):**
{
  "title": "string",
  "organization": "string",
  "details": {
    "Kayıt no": "string",
    "Teklif tarihi": "string",
    "Yaklaşık maliyet limiti": "string",
    ... (diğer tüm detaylar - HIÇBIR ŞEYİ ATLAMA)
  },
  "documents": [
    {
      "title": "string",
      "url": "string",
      "type": "idari_sartname" | "teknik_sartname" | "ek_dosya"
    }
  ],
  "announcementText": "string (SADECE ASIL İLAN METNİ - döküman listesi hariç)",
  "itemsList": "string (CSV format - eğer malzeme listesi varsa) | null (eğer liste yoksa)"
}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: contentBlocks as any,
        },
      ],
    });

    // Extract JSON from AI response
    const aiText = response.content[0].type === 'text' ? response.content[0].text : '';
    AILogger.info('AI Response received', { preview: aiText.slice(0, 500) });

    // Parse JSON (AI might wrap it in ```json``` blocks)
    let parsedData;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(aiText);
      }
    } catch (parseError: unknown) {
      AILogger.error('Failed to parse AI JSON', { error: parseError instanceof Error ? parseError.message : String(parseError) });
      throw new Error('AI response parsing failed');
    }

    AILogger.info('AI Parsing successful', {
      title: parsedData.title,
      detailsCount: Object.keys(parsedData.details || {}).length,
      documentsCount: (parsedData.documents || []).length,
    });

    // HTML'den detayları çıkaran fonksiyon
    async function extractDetailsFromHTML(html: string): Promise<Record<string, string>> {
      const $ = cheerio.load(html);
      const details: Record<string, string> = {};
      $('#tender .row').each((i: number, row: any) => {
        const key = $(row as any).find('.fw-bold').text().replace(/\s+/g, ' ').trim();
        const value = $(row as any).find('.text-dark-emphasis').text().replace(/\s+/g, ' ').trim();
        if (key && value) details[key] = value;
      });
      return details;
    }

    const structuredData = {
      title: parsedData.title || '',
      organization: parsedData.organization || '',
      details: htmlContent ? await extractDetailsFromHTML(htmlContent) : (parsedData.details || {}),
      documents: parsedData.documents || documentLinks, // Use AI parsed or extracted
      fullText: parsedData.announcementText || innerText,
      itemsList: parsedData.itemsList || null,
    };

    // ✅ İçerik validasyonu
    const validation = validateTenderContent(structuredData, {
      minTextLength: 100,
      minDetailsCount: 3,
      requireDocuments: false,
      strict: false,
    });

    logValidationResult('AI Fetch (fetch-full-content)', validation, structuredData);

    if (!validation.valid) {
      AILogger.error('AI parse sonucu geçersiz', { errors: validation.errors });
      return NextResponse.json(
        {
          success: false,
          error: `AI parsing validation failed: ${validation.errors.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 🆕 Parse edilen detayları veritabanına kaydet (eğer tenderId varsa)
    if (tenderId) {
      try {
        AILogger.info('Saving parsed details to database', { tenderId });

        const saveResult = await TenderDatabase.saveTenderAnalysis(
          tenderId.toString(),
          structuredData,
          {
            rawHtml: htmlContent,
            plainText: innerText,
            screenshot: screenshot as string,
            documents: documentLinks,
            structuredData
          }
        );

        if (saveResult.success) {
          AILogger.info('Details saved to database', { tenderId });
        } else {
          AILogger.error('Failed to save analysis to database', { 
            tenderId, 
            error: saveResult.error 
          });
        }
      } catch (dbError: unknown) {
        AILogger.error('Failed to save to database', {
          tenderId,
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        // Database hatası olsa bile response döndür (kritik değil)
      }
    } else {
      AILogger.warn('No tenderId provided, skipping database save');
    }

    // Güvenli serialize
    const safeData = JSON.parse(JSON.stringify(structuredData));
    return NextResponse.json({
      success: true,
      data: safeData,
    });

  } catch (error: unknown) {
    AILogger.error('Fetch error', { 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined 
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Content fetch failed',
      },
      { status: 500 }
    );
  }
}

