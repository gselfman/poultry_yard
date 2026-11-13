import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),output=root+'dist/';
await fs.mkdir(output,{recursive:true});
for(const file of await fs.readdir(root+'client'))await fs.copyFile(root+'client/'+file,output+file);
await fs.cp(fileURLToPath(new URL('../../releases/2026-11-12/client/assets/',import.meta.url)),output+'assets/',{recursive:true});
let html=await fs.readFile(output+'index.html','utf8');html=html.replace('<base href="../../../releases/2026-11-12/client/">','').replaceAll('../../../experiments/difficulty-v2/client/','');await fs.writeFile(output+'index.html',html);
console.log('Static preview: '+output);
