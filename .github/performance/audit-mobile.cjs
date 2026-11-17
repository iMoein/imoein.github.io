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
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cmd('Emulation.setCPUThrottlingRate',{rate:1});await cmd('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:3000000,uploadThroughput:93750});await cmd('Network.setBlockedURLs',{urls:['https://*','http://fonts.*']});
 const paths=['/','/en/','/about.html','/en/about.html','/portfolio.html','/en/portfolio.html','/product-management.html','/en/product-management.html','/resume/moein-ghezelbash-fa.html','/resume/moein-ghezelbash-en.html','/blog/fa/','/blog/en/','/blog/en/dashboard-to-action/','/blog/fa/dashboard-to-action/','/404.html'];const result=[];
 const inspect = () => {
  const w=document.documentElement.clientWidth, h=innerHeight;
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[inert],[aria-hidden="true"]');};
  const describe=e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',id:e.id,text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,65)});
  const out=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&!e.closest('.site-skip-link,.landing-skip,.product-guide-skip,svg')).map(e=>({e,r:e.getBoundingClientRect()})).filter(({e,r})=>r.left< -2||r.right>w+2).filter(({e})=>!e.parentElement||!(e.parentElement.getBoundingClientRect().left< -2||e.parentElement.getBoundingClientRect().right>w+2)).slice(0,15).map(({e,r})=>({...describe(e),left:Math.round(r.left),right:Math.round(r.right)}));
  const small=[...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter(e=>visible(e)&&!e.closest('p,li,td,th,.site-skip-link,.landing-skip,.product-guide-skip')).map(e=>({e,r:e.getBoundingClientRect()})).filter(({r})=>r.height<24||r.width<24).map(({e,r})=>({...describe(e),width:Math.round(r.width),height:Math.round(r.height)}));
  return {path:location.pathname,lang:document.documentElement.lang,viewport:w,scroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,h1:!!document.querySelector('h1'),loading:document.documentElement.classList.contains('site-loading'),overflow:out,small:small.slice(0,25),smallCount:small.length,menu:[...document.querySelectorAll('button[aria-expanded]')].filter(visible).map(describe)};
 };
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 for(const width of [320,390,768]){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const path of paths){
   await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+path});await sleep(1150);
   const r=await cmd('Runtime.evaluate',{expression:'JSON.stringify(('+inspect.toString()+')())',returnByValue:true});
   const row={width,requestedPath:path,...JSON.parse(r.result.value)};result.push(row);
   console.log(width,path,'scroll',row.scroll,'small',row.smallCount,'overflow',JSON.stringify(row.overflow.slice(0,3)));
  }
 }
 fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();chrome?.kill();server.close();setTimeout(()=>{try{fs.rmSync(profile,{recursive:true,force:true})}catch{}},300)});
