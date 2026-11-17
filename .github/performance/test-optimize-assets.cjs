const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {optimize,files}=require('./optimize-assets.cjs');
const root=path.resolve(__dirname,'../..');
test('does not modify editable source tree',()=>assert.throws(()=>optimize(root),/isolated/));
test('isolated build preserves inputs, paths and deterministic output',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asset-unit-'));
 try{
  const before=new Map();
  for(const name of files){
   const input=fs.readFileSync(path.join(root,name));before.set(name,input);
   fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});
   fs.writeFileSync(path.join(dir,name),input);
  }
  const sentinel=path.join(dir,'index.html');fs.writeFileSync(sentinel,'<html>unchanged</html>');
  const report=optimize(dir);assert.equal(report.files.length,files.length);
  assert(report.after.raw<report.before.raw);
  assert(report.after.gzip<report.before.gzip);
  assert.equal(fs.readFileSync(sentinel,'utf8'),'<html>unchanged</html>');
  const first=new Map(files.map(name=>[name,fs.readFileSync(path.join(dir,name))]));
  for(const [name,input] of before)fs.writeFileSync(path.join(dir,name),input);
  optimize(dir);
  for(const name of files){
   assert.deepEqual(fs.readFileSync(path.join(dir,name)),first.get(name));
   assert.deepEqual(fs.readFileSync(path.join(root,name)),before.get(name));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('missing asset prevents any writes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asset-unit-'));
 try{
  const target=path.join(dir,files[0]);const original='/* test */ body { color: red; }';
  fs.writeFileSync(target,original);
  assert.throws(()=>optimize(dir));
  assert.equal(fs.readFileSync(target,'utf8'),original);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
