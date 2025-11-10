import { chromium } from 'playwright';

async function testFinalLogin() {
  console.log('🔐 Testing FINAL login with ID selectors...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to signin page...');
    await page.goto('https://www.ihalebul.com/signin', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // ID'li formu kullan
    console.log('🔍 Waiting for input#kul_adi to be visible...');
    await page.waitForSelector('input#kul_adi', { state: 'visible', timeout: 10000 });

    console.log('📝 Filling username...');
    await page.fill('input#kul_adi', 'aydarnuman');

    console.log('🔒 Filling password...');
    await page.fill('input#sifre', 'Numan.43');

    console.log('📸 Screenshot before submit...');
    await page.screenshot({ path: 'final-before.png' });

    console.log('🚀 Clicking login button...');
    await page.click('form#form button[type="submit"]');

    console.log('⏳ Waiting for navigation...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('📸 Screenshot after submit...');
    await page.screenshot({ path: 'final-after.png' });

    const html = await page.content();
    const currentUrl = page.url();

    console.log('📍 Current URL:', currentUrl);
    console.log('📄 Page title:', await page.title());

    // Login başarılı mı kontrol et
    if (html.includes('Çıkış') || html.includes('çıkış')) {
      console.log('✅ LOGIN SUCCESSFUL! Found logout button');
    } else if (!html.includes('kul_adi')) {
      console.log('✅ LOGIN SUCCESSFUL! Login form disappeared');
    } else {
      console.log('❌ LOGIN FAILED! Still seeing login form');
    }

    // Storage state'i kaydet
    const storageState = await context.storageState();
    console.log('💾 Storage state saved, cookies count:', storageState.cookies.length);

    // 10 saniye bekle
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'final-error.png' });
  } finally {
    await browser.close();
  }
}

testFinalLogin();
