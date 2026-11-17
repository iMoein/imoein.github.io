const {test}=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const src=fs.readFileSync(path.resolve(__dirname,"../../site-loader.js"),"utf8");
function harness(navReady){
  const classes=new Set(["site-loading"]);
  const timers=[];
  const loader={hidden:false,addEventListener(){}};
  const document={documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},
    querySelector:()=>navReady?{}:null,getElementById:id=>id==="site-loader"?loader:null};
  // Reading fonts or images would make first paint depend on a noncritical resource.
  for(const key of ["fonts","images"])Object.defineProperty(document,key,{get(){throw Error("Unexpected wait on "+key)}});
  const window={addEventListener(){}};
  const ctx={document,window,setTimeout:(fn,ms)=>{timers.push({fn,ms})},requestAnimationFrame:fn=>fn(),Promise,MutationObserver:class{}};
  vm.runInNewContext(src,ctx);
  return {classes,timers,loader,window};
}
test("reveals without waiting for fonts or images",async()=>{
  const h=harness(true);await h.window.siteReady();
  assert(h.classes.has("site-ready"));assert(!h.classes.has("site-loading"));
  h.timers.find(t=>t.ms===320).fn();assert(h.loader.hidden);
});
test("hard fallback reveals even if data never becomes ready",()=>{
  const h=harness(false);h.timers.find(t=>t.ms===7500).fn();
  assert(!h.classes.has("site-loading"));assert(h.classes.has("site-ready"));
});
