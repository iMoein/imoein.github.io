'use strict';
// Optimize only the reviewed Pages copy, never editable source files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { transformSync, version } = require('esbuild');
const root = path.resolve(__dirname, '../..');
const files = [
  'styles.css','home.css','product-management.css','site-footer.css','site-analytics.css',
  'assets/blog/blog.css','blog/article-taxonomy.css',
  'site-theme.js','site-analytics.js','site-navigation.js','site-footer.js','site-loader.js',
  'assets/blog/blog.js','app.js','home-collaborations.js','home.js','portfolio.js','resume/resume-page.js',
];
const measure = bytes => ({raw:bytes.length,gzip:zlib.gzipSync(bytes,{level:9}).length});
function optimize(artifact) {
  const dir = fs.realpathSync(artifact);
  if (dir === root || dir.startsWith(root + path.sep) && dir !== path.join(root,'_site')) throw Error('Use the isolated Pages artifact, not the source tree');
  const result = [];
  // Complete parsing and validation before writing anything.
  const pending = files.map(relative => {
    const file = path.join(dir,relative);
    if (!fs.statSync(file).isFile() || fs.realpathSync(file)!==file) throw Error('Not a regular artifact file: '+relative);
    const original = fs.readFileSync(file);
    const loader = relative.endsWith('.css')?'css':'js';
    const output = transformSync(original.toString('utf8'), {
      loader,sourcefile:relative,target:'esnext',charset:'utf8',
      minifyWhitespace:true,minifyIdentifiers:false,minifySyntax:false,
      legalComments:'inline',sourcemap:false,
    });
    if (output.warnings.length) throw Error(relative+': '+JSON.stringify(output.warnings));
    const optimized=Buffer.from(output.code);
    if(loader==='js') new vm.Script(output.code,{filename:relative});
    const chosen=optimized.length<original.length?optimized:original;
    result.push({file:relative,before:measure(original),after:measure(chosen),changed:chosen!==original});
    return [file,chosen];
  });
  for(const [file,bytes] of pending)fs.writeFileSync(file,bytes);
  const sum=field=>result.reduce((acc,x)=>({raw:acc.raw+x[field].raw,gzip:acc.gzip+x[field].gzip}),{raw:0,gzip:0});
  return {tool:'esbuild',version,scope:'isolated Pages artifact',files:result,before:sum('before'),after:sum('after')};
}
if (require.main===module){
  if (!process.argv[2]) throw Error('Usage: node optimize-assets.cjs ARTIFACT [REPORT]');
  const result=optimize(process.argv[2]);
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({files:result.files.length,before:result.before,after:result.after},null,2));
}
module.exports={optimize,files};
