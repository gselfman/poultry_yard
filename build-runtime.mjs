import {cp,mkdir,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
const out='build';await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const file of await readdir('.'))if(/\.(js|css|html)$/.test(file)&&file!=='assets.html')await cp(file,path.join(out,file));
await cp('assets',path.join(out,'assets'),{recursive:true,filter:source=>{
 const p=source.replaceAll('\\','/').replace(/^assets\/?/,'');
 if(!path.extname(p))return true;
 if(p.startsWith('fonts/'))return true;if(p.startsWith('v5/')||p.startsWith('v7/'))return p.endsWith('.webp');
 if(/^(next|animation|combat|birds-v2)\//.test(p))return /\.(webp|png)$/.test(p);
 if(p.startsWith('design/'))return /\.(webp|svg)$/.test(p)||p==='design/qura-logo.png'||/^design\/(?:S\d+-\d+-trim|B02-\d+)\.png$/.test(p);
 return /^(yard|ryaba|rambo)-v1\.webp$/.test(p);
}});
console.log('Runtime build prepared; original graphics remain in assets.');
const {writeFile}=await import('node:fs/promises');let sections='';for(const [dir,title]of [['birds-v2','Новые анимации птиц'],['combat','Снаряды и атаки'],['animation','Исправленные кадры ходьбы и эффектов'],['next','Новые враги и оружие'],['design','Интерфейс и декор']]){const names=(await readdir(`${out}/assets/${dir}`)).filter(n=>n.endsWith('.png')).sort();sections+=`<section><h2>${title}</h2><div class="grid">`+names.map(n=>`<figure><img loading="lazy" src="assets/${dir}/${n}" alt="${n}"><figcaption><a href="assets/${dir}/${n}" download>${n}</a></figcaption></figure>`).join('')+'</div></section>';}
await writeFile(`${out}/assets.html`,`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Птичий двор · спрайты</title><style>@font-face{font-family:Onest;src:url('assets/fonts/Onest-Regular.ttf')}body{background:#201309;color:#fff2d4;font:16px Onest,sans-serif;margin:30px}a{color:#ffd47f}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px}figure{margin:0;padding:12px;background:#35200f;border:1px solid #77501e;border-radius:12px}img{width:100%;height:130px;object-fit:contain}figcaption{font-size:12px;margin-top:8px}section{margin-top:40px}</style><h1>Птичий двор · отдельные PNG</h1><p><a href="./">Открыть игру</a> · <a href="https://www.figma.com/design/5CeOcsre3HC0PmRJVUxwOA?node-id=77-3">Figma · снаряды и атаки</a></p><p>PNG доступны по нажатию на название. Исходные атласы сохранены в проекте и Figma. Для ходьбы используются исправленные кадры из отдельного раздела.</p>${sections}</html>`);
