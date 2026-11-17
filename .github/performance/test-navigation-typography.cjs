const fs=require('fs'),p=require('path'),os=require('os'),http=require('http'),{spawn}=require('child_process');
const root=process.cwd(),profile=fs.mkdtempSync(p.join(os.tmpdir(),'cwv24-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let f=p.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=p.join(f,'index.html');if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[p.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(f).pipe(res);});
let chrome,ws;
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 chrome=spawn((process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 const pf=p.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(pf);i++)await sleep(100);
 const port=fs.readFileSync(pf,'utf8').split('\n')[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let id=0,pend=new Map();ws.addEventListener('message',e=>{const o=JSON.parse(e.data);if(o.id&&pend.has(o.id)){const z=pend.get(o.id);pend.delete(o.id);o.error?z.reject(o.error):z.resolve(o.result);}});
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pend.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('DOM.enable');await cmd('CSS.enable');await cmd('Network.enable');await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cmd('Emulation.setCPUThrottlingRate',{rate:1});await cmd('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await cmd('Network.setBlockedURLs',{urls:['https://*','http://fonts.*']});

 const assert = require('node:assert/strict');
 const paths=['/','/en/','/about.html','/en/about.html','/portfolio.html','/en/portfolio.html','/product-management.html','/en/product-management.html','/resume/moein-ghezelbash-fa.html','/resume/moein-ghezelbash-en.html','/blog/fa/','/blog/en/','/blog/en/dashboard-to-action/','/blog/fa/dashboard-to-action/'];
 const signature = () => {
   const describe=e=>{const s=getComputedStyle(e);return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,spacing:s.letterSpacing}};
   const nav=document.querySelector('.site-navigation');
   if(!nav) return null;
   const links=[...nav.querySelectorAll('.primary-nav-links a')];
   const fa=nav.querySelector('.locale-switcher [data-lang="fa"]'), en=nav.querySelector('.locale-switcher [data-lang="en"]');
   if(!fa||!en||!links.length) return null;
   return {locale:document.documentElement.lang,fa:describe(fa),en:describe(en),primary:links.map(describe),fonts:[document.fonts.check('750 14px SiteNavLatin','EN'),document.fonts.check('750 14px SiteNavPersian','فا')],width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
 };
 const seen=new Map(); let count=0;
 for(const width of [1440,390,320]){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<760});
   for(const path of paths){
     await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+path});
     let data;
     for(let i=0;i<25;i++){
       await sleep(180);
       try{
         const r=await cmd('Runtime.evaluate',{expression:'(async()=>{await document.fonts.ready;return JSON.stringify(('+signature.toString()+')())})()',awaitPromise:true,returnByValue:true});
         if(!r.exceptionDetails&&r.result.value){data=JSON.parse(r.result.value);if(data)break;}
       }catch{}
     }
     assert.ok(data,path+' missing nav');
     assert.ok(data.fonts.every(Boolean),path+' fonts not loaded');
     assert.ok(data.primary.every(x=>JSON.stringify(x)===JSON.stringify(data.primary[0])),path+' unequal primary links');
     assert.ok(data.scroll<=data.width+2,path+' page overflow '+data.scroll);
     const doc=await cmd('DOM.getDocument');
     const actual={};
     for(const lang of ['fa','en']){
        const {nodeId}=await cmd('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.site-navigation .locale-switcher [data-lang="'+lang+'"]'});
        const {fonts}=await cmd('CSS.getPlatformFontsForNode',{nodeId});
        actual[lang]=fonts.map(f=>({family:f.familyName,custom:f.isCustomFont,glyphs:f.glyphCount}));
        assert.ok(fonts.length&&fonts.every(f=>f.isCustomFont),path+' fallback '+lang+' '+JSON.stringify(fonts));
     }
     const key=width+':'+data.locale;
     const record={fa:data.fa,en:data.en,primary:data.primary[0],actual};
     if(seen.has(key))assert.deepEqual(record,seen.get(key),path+' inconsistent at '+width);
     else seen.set(key,record);
     count++;console.log('PASS',width,path);
   }
 }
 console.log(JSON.stringify(Object.fromEntries(seen),null,2));console.log('PASS total: '+count);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();chrome?.kill();server.close();setTimeout(()=>{try{fs.rmSync(profile,{recursive:true,force:true})}catch{}},300)});
