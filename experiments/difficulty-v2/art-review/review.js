import {makeWorldObjects} from '../client/world.js';
import {PROP_SPECS,propIndex} from '../client/environment-props.js';
import {rainParticle,shockwaveSample} from '../client/event-visual-timing.js';
const $=id=>document.getElementById(id),canvas=$('review'),ctx=canvas.getContext('2d');
const W=1280,H=720,world=makeWorldObjects(10800,7200),images={},patches=[];
let scene='props',camera={x:5550,y:3750},time=0,last=performance.now(),paused=false,action=null,loaded=false;
const status=$('status'),hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const descriptions={props:'Три варианта пней, сена, камней и простых низких кормушек. Те же редкие позиции используются в игре; постоянных водоёмов-преград больше нет. Трава сохранена.',waste:'Пустошь собирается из основы, четырёх мягко смешанных фрагментов и шести вариантов пятен. Разрушенные пропы сохраняют позиции и разновидности обычных. Можно перемещать поле и менять масштаб.',rain:'Каждая капля имеет свою скорость, глубину и фазу. Падение сменяется коротким всплеском. Новые матовые лужи появляются только во время дождя и не становятся препятствиями. Переключи ночь для сравнения.',blast:'Чистая волна без дымовой стены расширяется до дальнего угла экрана. Подготовлены 24 выровненных кадра с прозрачным запасом; обычный просмотр плавно масштабирует мастер между кадрами.'};
function load(key,src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error('Не загрузилось: '+src));im.src=src;});}
const root=new URL('../../../releases/2026-11-12/client/assets/',import.meta.url);
const jobs=[load('grass',new URL('design/B01.webp',root)),load('hen',new URL('v5/ryaba.webp',root)),load('waste','assets/wasteland-base.webp'),load('night','assets/night-mask.webp'),load('ring','assets/shockwave-master.webp')];
for(const [prefix,n]of [['normal',12],['ruined',12],['ash',6],['rain',8],['puddle',8],['bomb',4],['shock',24]])for(let i=1;i<=n;i++)jobs.push(load(prefix+i,'assets/'+prefix+'-'+String(i).padStart(2,'0')+(prefix==='shock'?'.png':'.webp')));
function sprite(im,x,y,w,h=w){ctx.drawImage(im,x-w/2,y-h/2,w,h);}
function terrainPatches(){const im=images.waste;for(let i=0;i<4;i++){const c=document.createElement('canvas');c.width=c.height=512;const t=c.getContext('2d');t.drawImage(im,i%2*im.width/2,Math.floor(i/2)*im.height/2,im.width/2,im.height/2,0,0,512,512);t.globalCompositeOperation='destination-in';let g=t.createLinearGradient(0,0,512,0);g.addColorStop(0,'transparent');g.addColorStop(.24,'black');g.addColorStop(.76,'black');g.addColorStop(1,'transparent');t.fillStyle=g;t.fillRect(0,0,512,512);g=t.createLinearGradient(0,0,0,512);g.addColorStop(0,'transparent');g.addColorStop(.24,'black');g.addColorStop(.76,'black');g.addColorStop(1,'transparent');t.fillStyle=g;t.fillRect(0,0,512,512);patches.push(c);}}
let groundCache=null,groundKey='';
function ground(ruined){
 const cacheKey=[ruined,camera.x,camera.y,$('zoom').value,scene,action?.phase==='empty'].join(':');if(groundCache&&groundKey===cacheKey){ctx.drawImage(groundCache,0,0);return;}
 const z=+$('zoom').value;ctx.save();ctx.translate(W/2-camera.x*z,H/2-camera.y*z);ctx.scale(z,z);
 const left=camera.x-W/2/z,top=camera.y-H/2/z,right=left+W/z,bottom=top+H/z;
 if(!ruined){ctx.fillStyle=ctx.createPattern(images.grass,'repeat');ctx.fillRect(left,top,W/z,H/z);}else{
  ctx.fillStyle='#81766e';ctx.fillRect(left,top,W/z,H/z);
  const step=330,size=840;for(let row=Math.floor((top-size)/step);row<Math.ceil((bottom+size)/step);row++)for(let col=Math.floor((left-size)/step);col<Math.ceil((right+size)/step);col++){const id=row*1000+col;ctx.save();ctx.translate(col*step,row*step);ctx.rotate(Math.floor(hash(id)*4)*Math.PI/2);ctx.drawImage(patches[Math.floor(hash(id+19)*4)],-size/2,-size/2,size,size);ctx.restore();}
  for(let i=0;i<180;i++){const x=100+hash(i+801)*10600,y=100+hash(i+901)*7000;if(x<left-400||x>right+400||y<top-400||y>bottom+400)continue;ctx.save();ctx.translate(x,y);ctx.rotate(hash(i+931)*6.28);ctx.globalAlpha=.15+hash(i+951)*.16;sprite(images['ash'+(1+i%6)],0,0,230+hash(i+961)*300);ctx.restore();}
 }
 for(const o of world.obstacles){if(o.x<left-140||o.x>right+140||o.y<top-140||o.y>bottom+140)continue;const im=images[(ruined?'ruined':'normal')+propIndex(o)],w=o.r*PROP_SPECS[o.type].drawScale;sprite(im,o.x,o.y,w,w*im.height/im.width);}
 if(scene==='rain')for(let i=0;i<8;i++){const x=camera.x-500+(i%4)*340,y=camera.y-180+Math.floor(i/4)*350,im=images['puddle'+(i+1)],w=i<4?100:170;sprite(im,x,y,w,w*im.height/im.width);}
 if(!action||action.phase!=='empty')sprite(images.hen,camera.x,camera.y,65,65*images.hen.height/images.hen.width);
 ctx.restore();if(!groundCache){groundCache=document.createElement('canvas');groundCache.width=W;groundCache.height=H;}groundCache.getContext('2d').clearRect(0,0,W,H);groundCache.getContext('2d').drawImage(canvas,0,0);groundKey=cacheKey;
}
function night(){if(!$('night').checked)return;ctx.save();ctx.globalAlpha=+$('night-opacity').value;ctx.drawImage(images.night,0,0,W,H);ctx.restore();}
function rain(){for(let i=0;i<400;i++){const p=rainParticle(i,time,W,H);ctx.globalAlpha=p.alpha;const im=images['rain'+(p.frame+1)];sprite(im,p.x,p.y,p.width,p.height);}ctx.globalAlpha=1;}
function drawWave(elapsed){const sample=shockwaveSample(elapsed,W,H),r=sample.radius;ctx.save();ctx.globalAlpha=sample.alpha;sprite(images.ring,W/2,H/2,r*2);if(elapsed<.1){ctx.globalAlpha=(1-elapsed/.1)*.5;ctx.fillStyle='#fff7dc';ctx.fillRect(0,0,W,H);}ctx.restore();}
function setScene(value){scene=value;action=null;$('frame-mode').checked=false;$('blast-controls').hidden=scene!=='blast';document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===scene)));$('explanation').textContent=descriptions[scene];status.textContent=scene==='blast'?'Готов к запуску':scene==='waste'?'Пустошь · отдельный просмотр':scene==='rain'?'Дождь · независимые фазы капель':'Окружение · уже в игре';gallery();}
function gallery(){const ruined=scene==='waste';$('prop-gallery').innerHTML=Array.from({length:12},(_,i)=>'<div class="prop"><img src="assets/'+(ruined?'ruined':'normal')+'-'+String(i+1).padStart(2,'0')+'.webp" alt="'+Object.values(PROP_SPECS)[Math.floor(i/3)].name+' · вариант '+(i%3+1)+'"><small>'+Object.values(PROP_SPECS)[Math.floor(i/3)].name+' · '+(i%3+1)+(ruined?' · разрушенный':'')+'</small></div>').join('');}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>setScene(b.dataset.scene));
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Продолжить анимацию':'Пауза анимации';};
function begin(sequence){$('frame-mode').checked=false;action={start:time,sequence,phase:sequence?'charge':'wave'};paused=false;$('pause').textContent='Пауза анимации';}
$('explode').onclick=()=>begin(false);$('sequence').onclick=()=>begin(true);
$('frame').oninput=()=>{$('frame-mode').checked=true;action=null;$('frame-label').textContent=(+$('frame').value+1)+' / 24';};
let drag=null;canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;const scale=canvas.getBoundingClientRect().width/W*+$('zoom').value;camera.x=Math.max(600,Math.min(10200,drag.cx-(e.clientX-drag.x)/scale));camera.y=Math.max(500,Math.min(6700,drag.cy-(e.clientY-drag.y)/scale));};canvas.onpointerup=()=>drag=null;
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!paused)time+=dt*+$('speed').value;if(loaded){
 const age=action?time-action.start:0,pre=action?.sequence?5:0,blastAge=age-pre;
 const ruined=scene==='waste'||action&&blastAge>=3.84;ground(ruined);night();if(scene==='rain')rain();
 if(action){if(age<pre){const stage=age<4?Math.min(2,Math.floor(age/4*3)):3;sprite(images['bomb'+(stage+1)],W/2+110,H/2,90,100);action.phase=age<4?'charge':'fuse';status.textContent=age<4?'Заряд в зоне · '+Math.floor(age/4*30)+' / 30 с':'Заряд готов · отсчёт';}else if(blastAge<.84){action.phase='wave';drawWave(blastAge);status.textContent='Ударная волна · '+(Math.min(24,Math.floor(blastAge/.84*24)+1))+' / 24';}else if(blastAge<3.84){action.phase='white';ctx.fillStyle='white';ctx.fillRect(0,0,W,H);status.textContent='Белизна · '+(3.84-blastAge).toFixed(1)+' с';}else if(blastAge<6.84){action.phase='empty';status.textContent='Затишье · '+(6.84-blastAge).toFixed(1)+' с';}else{action.phase='done';status.textContent='Пустошь · просмотр завершён';}}
 if(scene==='blast'&&$('frame-mode').checked){const index=+$('frame').value;ctx.save();const size=Math.hypot(W,H)*2.1;sprite(images['shock'+(index+1)],W/2,H/2,size);ctx.restore();status.textContent='Кадр '+(index+1)+' / 24 · общий центр и размер';}
 }requestAnimationFrame(frame);}
requestAnimationFrame(frame);
try{await Promise.all(jobs);terrainPatches();loaded=true;setScene('props');$('counts').textContent='12 целых + 12 разрушенных пропов · 6 пятен пустоши · 8 матовых луж · 24 кадра волны';}catch(e){status.textContent=e.message;console.error(e);}
