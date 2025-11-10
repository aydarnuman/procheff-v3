import { chromium } from 'playwright';

async function testLogin() {
  console.log('🔍 Testing ihalebul.com login...');

  const browser = await chromium.launch({
    headless: false, // Tarayıcıyı göster
    slowMo: 1000, // Yavaşlat
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

    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'login-page.png', fullPage: true });

    // HTML'i kaydet
    const html = await page.content();
    require('fs').writeFileSync('login-page.html', html);

    console.log('🔍 Looking for form elements...');

    // Tüm input'ları bul
    const inputs = await page.$$eval('input', (els) =>
      els.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        className: el.className
      }))
    );

    console.log('📝 Found inputs:', JSON.stringify(inputs, null, 2));

    // Tüm butonları bul
    const buttons = await page.$$eval('button', (els) =>
      els.map(el => ({
        type: el.type,
        innerText: el.innerText,
        className: el.className,
        id: el.id
      }))
    );

    console.log('🔘 Found buttons:', JSON.stringify(buttons, null, 2));

    // Form tag'lerini bul
    const forms = await page.$$eval('form', (els) =>
      els.map(el => ({
        action: el.action,
        method: el.method,
        className: el.className,
        id: el.id
      }))
    );

    console.log('📋 Found forms:', JSON.stringify(forms, null, 2));

    console.log('\n✅ Debug complete! Check login-page.png and login-page.html');

    // 10 saniye bekle
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testLogin();
