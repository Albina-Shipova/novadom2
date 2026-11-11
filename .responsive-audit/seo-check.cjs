const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  for (const file of ['index.html', 'portfolio.html', 'contacts.html', 'assets/projects/project-14.html', '404.html']) {
    await page.goto('file:///D:/Albina/sites/novadom2/' + file);
    const result = { file, title: await page.title(), h1: await page.locator('h1').count(),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      schema: await page.locator('script[type="application/ld+json"]').count() };
    console.log(JSON.stringify(result));
    if (result.overflow || result.h1 !== 1) errors.push(file + ': layout or heading error');
  }
  await page.goto('file:///D:/Albina/sites/novadom2/index.html');
  await page.screenshot({ path: '.responsive-audit/seo-home-390.png' });
  const context = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await context.newPage();
  await nojs.goto('file:///D:/Albina/sites/novadom2/portfolio.html');
  const opacity = await nojs.locator('.portfolio-tile').first().evaluate(e => getComputedStyle(e).opacity);
  console.log('No-JS portfolio opacity:', opacity);
  if (opacity !== '1') errors.push('No-JS content hidden');
  console.log('Errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
