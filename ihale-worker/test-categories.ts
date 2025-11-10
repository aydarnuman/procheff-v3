import { chromium } from 'playwright';

async function testCategories() {
  console.log('🔍 Testing ihalebul.com categories...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('https://www.ihalebul.com/signin');
    await page.waitForSelector('input#kul_adi', { state: 'visible' });
    await page.fill('input#kul_adi', 'aydarnuman');
    await page.fill('input#sifre', 'Numan.43');
    await page.click('form#form button[type="submit"]');
    await page.waitForLoadState('networkidle');

    console.log('✅ Logged in');

    // Ana sayfaya git
    console.log('📍 Going to homepage...');
    await page.goto('https://www.ihalebul.com');
    await page.waitForLoadState('networkidle');

    // Kategorileri bul
    console.log('🔍 Looking for category links...');
    const categoryLinks = await page.$$eval('a[href*="category"], a[href*="kategori"], a[href*="tenders"]', (links) =>
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href')
      }))
    );

    console.log('📋 Found category links:', JSON.stringify(categoryLinks, null, 2));

    // Yemek ile ilgili linkleri filtrele
    const foodCategories = categoryLinks.filter(link =>
      link.text?.toLowerCase().includes('yemek') ||
      link.text?.toLowerCase().includes('lokanta') ||
      link.text?.toLowerCase().includes('catering') ||
      link.text?.toLowerCase().includes('gıda')
    );

    console.log('🍽️ Food-related categories:', JSON.stringify(foodCategories, null, 2));

    // Eğer link varsa git
    if (foodCategories.length > 0) {
      const firstLink = foodCategories[0];
      console.log(`📍 Going to: ${firstLink.href}`);
      await page.goto(firstLink.href!.startsWith('http') ? firstLink.href! : `https://www.ihalebul.com${firstLink.href}`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'food-category.png' });
      console.log('📸 Screenshot saved to food-category.png');

      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
    }

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testCategories();
