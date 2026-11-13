import {spawn} from 'node:child_process';
import {open,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),url='http://127.0.0.1:4175/';
async function ready(){try{const res=await fetch(url,{signal:AbortSignal.timeout(700)});if(!res.ok)return false;const html=await res.text();return html.includes('Птичий двор')&&html.includes('difficulty.css');}catch{return false;}}
if(await ready()){console.log('Прототип уже работает: '+url);process.exit(0);}
const logs=path.join(root,'.preview');await mkdir(logs,{recursive:true});
const output=await open(path.join(logs,'server.log'),'a');
const child=spawn(process.execPath,[path.join(root,'serve.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',output.fd,output.fd]});
let spawnError=null;child.on('error',error=>spawnError=error);child.unref();await output.close();
for(let attempt=0;attempt<30;attempt++){
 if(spawnError)throw spawnError;
 if(await ready()){console.log('Прототип запущен в фоне: '+url);process.exit(0);}
 await new Promise(resolve=>setTimeout(resolve,200));
}
console.error('Не удалось запустить прототип. Проверь .preview/server.log и свободен ли порт 4175.');process.exitCode=1;

