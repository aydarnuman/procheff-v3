import { chromium } from 'playwright';

async function testRealLogin() {
  console.log('🔐 Testing REAL login with credentials...');

  const browser = await chromium.launch({
    headless: false, // Görmek için
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to signin page...');
    await page.goto('https://www.ihalebul.com/signin', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('🔍 Waiting for form...');
    await page.waitForSelector('input[name="kul_adi"]', { timeout: 10000 });

    console.log('📝 Filling username...');
    await page.fill('input[name="kul_adi"]', 'aydarnuman');

    console.log('🔒 Filling password...');
    await page.fill('input[name="sifre"]', 'Numan.43');

    console.log('📸 Screenshot before submit...');
    await page.screenshot({ path: 'before-submit.png' });

    console.log('🚀 Clicking submit button...');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for navigation...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('📸 Screenshot after submit...');
    await page.screenshot({ path: 'after-submit.png' });

    const html = await page.content();
    const currentUrl = page.url();

    console.log('📍 Current URL:', currentUrl);

    // Login başarılı mı kontrol et
    if (html.includes('Çıkış') || html.includes('çıkış')) {
      console.log('✅ LOGIN SUCCESSFUL! Found logout button');
    } else if (!html.includes('kul_adi')) {
      console.log('✅ LOGIN SUCCESSFUL! Login form disappeared');
    } else {
      console.log('❌ LOGIN FAILED! Still seeing login form');
      console.log('🔍 Page title:', await page.title());

      // Hata mesajı var mı?
      const errorMsg = await page.$eval('.alert, .error, [class*="error"]', el => el.textContent).catch(() => 'No error message found');
      console.log('🔍 Error message:', errorMsg);
    }

    // 10 saniye bekle
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

testRealLogin();
