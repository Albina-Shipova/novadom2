const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  const files = ['index.html', 'portfolio.html', 'contacts.html', 'seo-otchet.html', ...fs.readdirSync('assets/projects').filter(f => f.endsWith('.html')).map(f => 'assets/projects/' + f)];
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const file of files) {
      await page.goto('file:///D:/Albina/sites/novadom2/' + file);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll('h1').length,
        brokenImages: [...document.images].filter(i => i.getAttribute('src') && i.complete && !i.naturalWidth).map(i => i.getAttribute('src')),
        breadcrumbs: !!document.querySelector('.seo-breadcrumbs')
      }));
      if (result.overflow || result.h1 !== 1 || result.brokenImages.length || (file.includes('assets/projects/') && !result.breadcrumbs)) errors.push({ width, file, result });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('file:///D:/Albina/sites/novadom2/assets/projects/project-14.html');
  await page.screenshot({ path: '.responsive-audit/seo-breadcrumbs-390.png' });
  await page.locator('.menu-toggle').click();
  if (await page.locator('.menu-toggle').getAttribute('aria-expanded') !== 'true') errors.push('menu failed after defer');
  await page.locator('.menu-toggle').click();
  await page.locator('[data-hero-open]').click();
  if (!(await page.locator('.lightbox').evaluate(e => e.classList.contains('is-open') || e.classList.contains('open')))) errors.push('lightbox failed after defer');
  await page.goto('file:///D:/Albina/sites/novadom2/seo-otchet.html');
  await page.locator('a[href="#comparison"]').click();
  await page.screenshot({ path: '.responsive-audit/seo-report-comparison-390.png' });
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const np = await nojs.newPage();
  await np.goto('file:///D:/Albina/sites/novadom2/portfolio.html');
  if (await np.locator('.portfolio-tile').first().evaluate(e => getComputedStyle(e).opacity) !== '1') errors.push('no-JS portfolio hidden');
  console.log(JSON.stringify({ pages: files.length, widths: [320, 1440], interactions: ['menu', 'lightbox', 'report anchors', 'no-JS visibility'], errors }, null, 2));
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
