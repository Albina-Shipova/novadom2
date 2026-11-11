const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch(); const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/https:\/\//,r=>r.abort());
 await page.goto('file:///D:/Albina/sites/novadom2/index.html');
 await page.locator('[data-choice="rejected"]').click();
 await page.reload();
 if(await page.locator('.cookie-notice').isVisible()) throw Error('Refusal not persisted');
 await page.locator('.footer-legal button').click();
 await page.locator('[data-choice="accepted"]').click();
 if(await page.locator('script[src*="mc.yandex"]').count()) throw Error('Empty ID loaded analytics');
 await page.goto('file:///D:/Albina/sites/novadom2/privacy.html');
 for(const width of [320,390,1440]) {
 await page.setViewportSize({width,height:900});
 await page.locator('.footer-legal button').click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow '+width);
 await page.screenshot({path:'.responsive-audit/privacy-'+width+'.png',fullPage:false});
 await page.locator('[data-choice="rejected"]').click();
 }
 // Inject a test ID into the actual implementation and intercept the vendor script.
 const fs=require('fs');
 await page.route('**/privacy.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('privacy.js','utf8').replace('const COUNTER_ID = null','const COUNTER_ID = 12345678')}));
 let loads=0;
 await page.route('https://mc.yandex.ru/metrika/tag.js',r=>{loads++;return r.fulfill({body:'',contentType:'text/javascript'});});
 await page.goto('file:///D:/Albina/sites/novadom2/index.html');
 if(loads) throw Error('Tracking before consent');
 await page.locator('.footer-legal button').click();
 await page.locator('[data-choice="accepted"]').click();
 await page.waitForFunction(()=>!!document.querySelector('script[src*="mc.yandex"]'));
 await page.waitForTimeout(150);
 if(loads!==1) throw Error('Tracking not started after consent');
 await page.locator('.footer-legal button').click();
 await Promise.all([page.waitForEvent('load'),page.locator('[data-choice="rejected"]').click()]);
 if(await page.locator('script[src*="mc.yandex"]').count()) throw Error('Tracking after withdrawal');
 await page.goto('file:///D:/Albina/sites/novadom2/assets/projects/project-01.html');
 if(!(await page.locator('.footer-legal a[href$="privacy.html"]').getAttribute('href')).includes('../../privacy.html')) throw Error('Nested link');
 if(errors.length) throw Error(JSON.stringify(errors));
 console.log('PASS: consent, refusal persistence, withdrawal, nested links, layouts 320/390/1440, no JS errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
