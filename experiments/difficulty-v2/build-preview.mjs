import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),output=root+'dist/';
await fs.mkdir(output,{recursive:true});
for(const file of await fs.readdir(root+'client'))await fs.cp(root+'client/'+file,output+file,{recursive:true});
await fs.cp(fileURLToPath(new URL('../../releases/2026-11-12/client/assets/',import.meta.url)),output+'assets/',{recursive:true});
let html=await fs.readFile(output+'index.html','utf8');html=html.replace('<base href="../../../releases/2026-11-12/client/">','').replaceAll('../../../experiments/difficulty-v2/client/','');await fs.writeFile(output+'index.html',html);
console.log('Static preview: '+output);

await fs.mkdir(output+'review',{recursive:true});
for(const file of ['index.html','review.css','review.js']){let data=await fs.readFile(root+'art-review/'+file,'utf8');data=data.replaceAll('../client/','../').replace("../../../releases/2026-11-12/client/assets/","../assets/");await fs.writeFile(output+'review/'+file,data);}
await fs.cp(root+'art-review/assets',output+'review/assets',{recursive:true});
let lab=await fs.readFile(output+'test-lab.js','utf8');lab=lab.replace('../art-review/index.html','./review/index.html');await fs.writeFile(output+'test-lab.js',lab);
