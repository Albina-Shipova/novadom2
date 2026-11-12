const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch();try{for(const width of [320,390,768,1440]){
const p=await b.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
await p.goto('file:///D:/Albina/sites/novadom2/index.html');
if(width<=980){await p.locator('.menu-toggle').click();assert.equal(await p.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await p.locator('.navlinks > a').first().click();assert.equal(await p.locator('.menu-toggle').getAttribute('aria-expanded'),'false');}
await p.locator('.credential-card').first().click();assert(await p.locator('.lightbox').evaluate(e=>e.classList.contains('open')));await p.keyboard.press('Escape');assert(!await p.locator('main').evaluate(e=>e.inert));
const faq=p.locator('.faq-item');await faq.nth(0).locator('summary').click();await faq.nth(1).locator('summary').click();await p.waitForFunction(()=>!document.querySelector('.faq-item').open);
await p.goto('file:///D:/Albina/sites/novadom2/portfolio.html');
for(const button of await p.locator('.filter').all()) {await button.click();const category=await button.getAttribute('data-filter');const invalid=await p.locator('.portfolio-tile').evaluateAll((tiles,category)=>tiles.filter(t=>!t.hidden&&category!=='all'&&t.dataset.category!==category).length,category);assert.equal(invalid,0);}
await p.locator('[data-filter="all"]').click();await p.locator('[data-show-projects]').click();assert.equal(await p.locator('.portfolio-tile').evaluateAll(t=>t.filter(x=>!x.hidden).length),23);
await p.goto('file:///D:/Albina/sites/novadom2/assets/projects/project-14.html');await p.locator('[data-gallery-thumb]').last().click();const before=await p.locator('[data-gallery-counter]').innerText();await p.locator('[data-gallery-open]').click();await p.locator('.lightbox-next').click();await p.locator('.lightbox-close').click();assert.notEqual(await p.locator('[data-gallery-counter]').innerText(),before);
console.log('PASS interactions',width);await p.close();}
}finally{await b.close()}})();

