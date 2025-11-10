import { chromium } from 'playwright';

async function testPagination() {
  console.log('🔍 Testing pagination...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto('https://www.ihalebul.com/signin');
    await page.waitForSelector('input#kul_adi', { state: 'visible' });
    await page.fill('input#kul_adi', 'aydarnuman');
    await page.fill('input#sifre', 'Numan.43');
    await page.click('form#form button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Logged in\n');

    // Hazır Yemek kategorisine git
    console.log('📍 Going to Hazır Yemek category...');
    await page.goto('https://www.ihalebul.com/tenders/search?workcategory_in=15', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(2000);

    // Sayfa bilgilerini al
    console.log('🔍 Looking for pagination info...');

    // Toplam ihale sayısı
    const totalText = await page.$eval('body', el => el.textContent).catch(() => '');
    const totalMatch = totalText.match(/(\d+)\s*ihale/i);
    if (totalMatch) {
      console.log(`📊 Total tenders found in text: ${totalMatch[1]}`);
    }

    // Sayfalama butonları
    const paginationLinks = await page.$$eval('a[href*="page="], .pagination a, [class*="page"]', links =>
      links.map(l => ({
        text: l.textContent?.trim(),
        href: l.getAttribute('href')
      }))
    ).catch(() => []);

    console.log('📄 Pagination links:', JSON.stringify(paginationLinks.slice(0, 10), null, 2));

    // Kartları say
    const cards = await page.$$('div.card.border-secondary, div.tender-card, div.ihale-card');
    console.log(`📋 Cards on first page: ${cards.length}`);

    await page.screenshot({ path: 'pagination-test.png' });
    console.log('📸 Screenshot saved: pagination-test.png');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testPagination();
