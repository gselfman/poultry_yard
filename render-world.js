import {drawCombat} from './combat-art.js';
import {WORLD} from './engine.js';
const ready=i=>i.complete&&i.naturalWidth;
export const sceneryArt={};for(let i=1;i<=12;i++){const im=new Image();im.src=`assets/design/S10-${String(i).padStart(2,'0')}-trim.png`;sceneryArt[i]=im;}
const pickupArt={};for(let i=5;i<=12;i++){const im=new Image();im.src=`assets/design/S07-${String(i).padStart(2,'0')}-trim.png`;pickupArt[i]=im;}
function image(ctx,im,x,y,w,h=w){if(!ready(im))return false;const k=Math.min(w/im.naturalWidth,h/im.naturalHeight);ctx.drawImage(im,x-im.naturalWidth*k/2,y-im.naturalHeight*k/2,im.naturalWidth*k,im.naturalHeight*k);return true;}
export function landscape(ctx,s,view){
 const visible=(x,y,r)=>x+r>view.x&&x-r<view.x+view.w&&y+r>view.y&&y-r<view.y+view.h;
 for(const d of s?.decor||[]){if(!visible(d.x,d.y,d.size))continue;ctx.save();ctx.globalAlpha=.56;ctx.translate(d.x,d.y);ctx.rotate(d.angle);image(ctx,sceneryArt[d.variant],0,0,d.size);ctx.restore();}
 for(const o of s?.obstacles||[]){if(!visible(o.x,o.y,o.r+15))continue;ctx.save();ctx.translate(o.x,o.y);
 if(o.type==='pond'){const g=ctx.createRadialGradient(-o.r*.25,-o.r*.3,8,0,0,o.r);g.addColorStop(0,'#759d89');g.addColorStop(.65,'#456b61');g.addColorStop(1,'#25453d');ctx.fillStyle='#716b45';ctx.beginPath();ctx.arc(0,0,o.r+5,0,Math.PI*2);ctx.fill();ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,o.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7c4a875';ctx.lineWidth=3;ctx.beginPath();ctx.arc(-o.r*.1,-o.r*.05,o.r*.72,3.5,5.3);ctx.stroke();ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(o.r*.2,o.r*.25,o.r*.28,.2,2.4);ctx.stroke();}
 else{ctx.fillStyle='#3c412b';ctx.beginPath();ctx.arc(0,0,o.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=5;ctx.shadowColor='#151d13';image(ctx,sceneryArt[10],0,0,o.r*2,o.r*2);}
 ctx.restore();}
 fence(ctx,view);
}
function fence(ctx,v){ctx.save();ctx.lineCap='round';const segment=(x1,y1,x2,y2)=>{ctx.strokeStyle='#372914';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#b18b4d';ctx.lineWidth=5;ctx.stroke();};
 for(const y of [30,WORLD.height-30])if(y>v.y-30&&y<v.y+v.h+30){segment(Math.max(20,v.x-50),y,Math.min(WORLD.width-20,v.x+v.w+50),y);for(let x=Math.max(24,Math.floor(v.x/70)*70);x<Math.min(WORLD.width-20,v.x+v.w+80);x+=70){ctx.fillStyle='#553919';ctx.fillRect(x-7,y-18,14,36);ctx.fillStyle='#d3ac66';ctx.fillRect(x-6,y-18,12,6);}}
 for(const x of [25,WORLD.width-25])if(x>v.x-30&&x<v.x+v.w+30){segment(x,Math.max(30,v.y-50),x,Math.min(WORLD.height-30,v.y+v.h+50));for(let y=Math.max(40,Math.floor(v.y/70)*70);y<Math.min(WORLD.height-30,v.y+v.h+80);y+=70){ctx.fillStyle='#553919';ctx.fillRect(x-10,y-7,20,14);ctx.fillStyle='#d3ac66';ctx.fillRect(x-10,y-7,4,14);}}
 ctx.restore();}
export function worm(ctx,w,time){const pulse=.88+Math.sin(time*3+w.x)*.12;ctx.save();ctx.translate(w.x,w.y);const g=ctx.createRadialGradient(0,0,2,0,0,33);g.addColorStop(0,'#ff91e8b0');g.addColorStop(.5,'#ff45d365');g.addColorStop(1,'#ff45d300');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,33,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd2f1';ctx.lineWidth=2;ctx.globalAlpha=pulse;ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.stroke();ctx.shadowColor='#ff46d4';ctx.shadowBlur=10;image(ctx,pickupArt[5+Math.floor(time*6)%4],0,0,31,27);ctx.restore();}
export function magnet(ctx,m,time){ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#ffe29a';image(ctx,pickupArt[9+Math.floor(time*5)%4],m.x,m.y,31);ctx.restore();}
let acornHalo;
export function acorn(ctx,a){ctx.save();ctx.translate(a.x,a.y);if(!acornHalo){acornHalo=document.createElement('canvas');acornHalo.width=acornHalo.height=36;const t=acornHalo.getContext('2d'),g=t.createRadialGradient(18,18,1,18,18,18);g.addColorStop(0,'#ff4d3975');g.addColorStop(.5,'#ff2e2728');g.addColorStop(1,'#ff2e2700');t.fillStyle=g;t.fillRect(0,0,36,36);}ctx.drawImage(acornHalo,-18,-18);ctx.rotate(Math.atan2(a.vy,a.vx));drawCombat(ctx,'acorn',0,0,23);ctx.restore();}
export function lowHealth(ctx,s,w,h){if(!s||s.player.hp<=0||s.player.hp>Math.max(1,s.player.maxHp*.3))return;ctx.save();const severity=s.player.hp===1?.36:.23,g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.27,w/2,h/2,Math.hypot(w,h)*.52);g.addColorStop(0,'#b4141400');g.addColorStop(.65,'#b4141408');g.addColorStop(1,`rgba(190,20,20,${severity})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();}
