const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try {
 for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///D:/Albina/sites/novadom2/assets/projects/project-14.html');
 await page.locator('[data-gallery-open]').click();
 const img=page.locator('.lightbox img'); await img.evaluate(e=>e.decode());
 const cdp=await page.context().newCDPSession(page);
 const caption=()=>page.locator('.lightbox-caption').innerText();
 const initial=await caption();
 async function drag(dx,dy=0){const r=await img.boundingBox();const x=r.x+r.width/2,y=r.y+r.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await drag(-90);assert.notEqual(await caption(),initial);
 await drag(90);assert.equal(await caption(),initial);
 await drag(0,70);assert.equal(await caption(),initial);
 await drag(-15);assert.equal(await caption(),initial);
 const r=await img.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 const pts=d=>[{x:x-d,y,id:1},{x:x+d,y,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(25)});
 for(const d of [35,45,55])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(d)});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(await img.evaluate(e=>e.classList.contains('is-zoomed')));
 await drag(-60);assert.equal(await caption(),initial);
 await page.locator('.lightbox-next').click();assert.notEqual(await caption(),initial);
 assert.deepEqual(errors,[]);console.log(width+': swipe both directions, vertical/short drag, pinch, zoomed pan, arrow passed');
 await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
