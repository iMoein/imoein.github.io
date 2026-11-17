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
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cmd('Emulation.setCPUThrottlingRate',{rate:1});await cmd('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:3000000,uploadThroughput:93750});await cmd('Network.setBlockedURLs',{urls:['https://*','http://fonts.*']});
 const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
 const paths=process.argv.length>3?process.argv.slice(3):['/','/en/','/about.html','/en/about.html','/portfolio.html','/product-management.html','/resume/moein-ghezelbash-fa.html','/blog/fa/','/blog/en/','/blog/en/dashboard-to-action/','/404.html'];const result=[];
 for(const theme of ['light','dark']){
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
  for(const path of paths){
   await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+path});
   await sleep(1600);
   const r=await cmd('Runtime.evaluate',{expression:axe+';axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]}}).then(r=>JSON.stringify({violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,250)}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),passes:r.passes.length,theme:document.documentElement.dataset.colorScheme,lang:document.documentElement.lang,loading:document.documentElement.classList.contains("site-loading")}))',awaitPromise:true,returnByValue:true});
   if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
   const row={path,requestedTheme:theme,...JSON.parse(r.result.value)};
   if(path!=='/404.html'){
    await cmd('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    const focus=await cmd('Runtime.evaluate',{expression:'JSON.stringify({className:document.activeElement.className,href:document.activeElement.getAttribute("href"),visible:document.activeElement.getBoundingClientRect().bottom>0&&document.activeElement.getBoundingClientRect().top<innerHeight})',returnByValue:true});
    row.skipFocus=JSON.parse(focus.result.value);
    if(row.skipFocus.href?.startsWith('#')){
     await cmd('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
     await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
     await sleep(250);
     const target=await cmd('Runtime.evaluate',{expression:'document.activeElement.tagName==="MAIN"&&"#"+document.activeElement.id===location.hash',returnByValue:true});
     row.skipActivated=target.result.value;
    }
   }
   result.push(row);console.log(path,theme,row.theme,JSON.stringify(row.violations.map(v=>[v.id,v.nodes.length])), 'loading',row.loading);
  }
 }
 fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();chrome?.kill();server.close();setTimeout(()=>{try{fs.rmSync(profile,{recursive:true,force:true})}catch{}},300)});
