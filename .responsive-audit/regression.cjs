const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 const results = [], errors = [];
 try {
 for (const width of [320,390,768,1440]) {
  const page = await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:true});
  page.on('pageerror', e => errors.push({width,error:e.message}));
  await page.route('https://fonts.googleapis.com/**', r=>r.abort());
  for (const file of ['index.html','portfolio.html','contacts.html',...fs.readdirSync('assets/projects').filter(f=>f.endsWith('.html')).map(f=>'assets/projects/'+f)]) {
   await page.goto('file:///D:/Albina/sites/novadom2/'+file);
   await page.waitForFunction(()=>!document.documentElement.matches('.intro-active, .hero-pending'));
   const info = await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1, ready:!document.querySelector('[data-coverflow]')||document.querySelector('[data-coverflow]').classList.contains('is-ready'),viewer:document.querySelector('[data-project-viewer]')?document.querySelector('[data-gallery-counter]').textContent:null}));
   if(info.overflow||!info.ready) results.push({width,file,...info});
  }
  await page.close();
  console.log('Scanned width',width);
 }
 console.log(JSON.stringify({issues:results,errors}));
 } finally {await browser.close()}
})();
