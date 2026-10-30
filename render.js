import {BIRD_ACTIONS,BIRD_VISUALS,birdPose} from './bird-poses.js';
import {combatArt,drawCombat} from './combat-art.js';
import {beakPose,wingSweep} from './engine.js';
const names=['ryaba','rambo','monk','rat','fox','wolf','bear','squirrel','beak','wing','talon','guinea','duck','turkey','goose','seed-small','seed-medium','seed-large','bomb','orbit','dust','dust-large','dust-small','turkey-charge','turkey-stomp'];
export const art=Object.fromEntries(names.map(id=>{const image=new Image();image.src=names.indexOf(id)>10?`assets/next/${id}.webp`:`assets/${['ryaba','rambo','monk'].includes(id)?'v5':'v7'}/${id}.webp`;return [id,image];}));
const ready=image=>image?.complete&&image.naturalWidth>0;
function sprite(ctx,image,x,y,w,h){if(ready(image))ctx.drawImage(image,x,y,w,h);}
export const walkArt=Object.fromEntries(['ryaba','rambo','monk','rat','fox','squirrel','wolf','bear'].map(id=>[id,Array.from({length:['ryaba','rambo','monk'].includes(id)?4:3},(_,i)=>{const im=new Image();im.src=`assets/animation/${id}-${String(i).padStart(2,'0')}.webp`;return im;})]));
export const birdArt=Object.fromEntries(Object.entries(BIRD_ACTIONS).map(([id,actions])=>[id,Object.fromEntries(actions.map(action=>[action,Array.from({length:4},(_,i)=>{const im=new Image();im.src=`assets/birds-v2/${id}-${action}-${String(i+1).padStart(2,'0')}.webp`;return im;})]))]));
const outlined=new WeakMap();
function enemyOutline(image){if(outlined.has(image))return outlined.get(image);const pad=14,c=document.createElement('canvas');c.width=image.naturalWidth+pad*2;c.height=image.naturalHeight+pad*2;const t=c.getContext('2d');const mask=document.createElement('canvas');mask.width=image.naturalWidth;mask.height=image.naturalHeight;const m=mask.getContext('2d');m.drawImage(image,0,0);m.globalCompositeOperation='source-in';m.fillStyle='#201d14';m.fillRect(0,0,mask.width,mask.height);for(let i=0;i<8;i++){const a=i*Math.PI/4;t.drawImage(mask,pad+Math.cos(a)*6,pad+Math.sin(a)*6);}m.fillStyle='#ffe0a1';m.fillRect(0,0,mask.width,mask.height);for(let i=0;i<8;i++){const a=i*Math.PI/4;t.drawImage(mask,pad+Math.cos(a)*3,pad+Math.sin(a)*3);}t.drawImage(image,pad,pad);outlined.set(image,c);return c;}
export function creature(ctx,id,x,y,r,facing,time,moving,inv=0,flash=0,attack=null){
 const hero=['ryaba','rambo','monk'].includes(id),frames=walkArt[id],cycle=hero?[1,2,3,2]:[1,0,2,0],clock=time*8,index=moving?cycle[Math.floor(clock)%4]:0;
 const pose=birdPose(id,attack,time),birdImage=pose&&birdArt[id]?.[pose.action]?.[pose.frame],usingBird=ready(birdImage),animated=usingBird||(frames&&ready(frames[index])),image=usingBird?birdImage:animated?frames[index]:art[id],box=r*(hero?2.5:3.15);
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#14220e77';ctx.beginPath();ctx.ellipse(0,r*.85,r,Math.max(3,r*.3),0,0,Math.PI*2);ctx.fill();
 if(!ready(image)){ctx.restore();return;}
 ctx.globalAlpha=inv>0&&Math.floor(inv*20)%2===0?.35:flash>0?.55:1;ctx.scale(facing||1,1);
 // Real animation frames use a shared canvas/scale; never normalize each frame separately.
 if(animated){const draw=id==='rat'?enemyOutline(image):image,visual=usingBird?BIRD_VISUALS[id]:null,k=box/(usingBird?image.naturalWidth:384)*(visual?.size||1)*(visual?.scales[pose.action]||1),top=usingBird?r*.85-(visual?.feet??image.naturalHeight-24)*k:-draw.height*k/2;ctx.drawImage(draw,-draw.width*k/2,top,draw.width*k,draw.height*k);}

 else{const b=alphaBounds(image),k=Math.min(box/b.w,box*1.1/b.h);ctx.drawImage(image,b.x,b.y,b.w,b.h,-b.w*k/2,-b.h*k/2,b.w*k,b.h*k);}
 ctx.restore();
}
const crops=new WeakMap();
function alphaBounds(image){let b=crops.get(image);if(!b){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const c2=c.getContext('2d',{willReadFrequently:true});c2.drawImage(image,0,0);const data=c2.getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>100){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}b={x:left,y:top,w:right-left+1,h:bottom-top+1};crops.set(image,b);}return b;}
function croppedSprite(ctx,image,x,y,w,h=null){if(!ready(image))return;const b=alphaBounds(image);const height=h??w*b.h/b.w;ctx.drawImage(image,b.x,b.y,b.w,b.h,x,y-height/2,w,height);}
export function melee(ctx,a){
 if(a.delay>0)return;
 const phase=Math.min(1,a.elapsed/a.duration),opacity=Math.min(1,phase*12,(1-phase)*10);
 ctx.save();ctx.translate(a.x,a.y);ctx.globalAlpha=opacity;
 if(a.type==='beak'){
  ctx.rotate(a.angle);const pose=beakPose(a);
  if(a.remote){const targetX=a.r*.55;drawCombat(ctx,'beak-remote',targetX,0,a.r*.82);}else if(!drawCombat(ctx,a.big?'beak-super':'beak',pose.x+pose.width/2,0,pose.width))croppedSprite(ctx,art.beak,pose.x,0,pose.width);
 }else if(a.type==='wing'){
  const angle=wingSweep(a,phase);ctx.rotate(angle);
  ctx.fillStyle='#edd9ac16';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,a.r,Math.max(-.7,-phase*2.8),0);ctx.closePath();ctx.fill();
  if(!drawCombat(ctx,a.side===1?'wing-right':'wing-left',a.r*.45,0,a.r*1.08,a.r*.74))sprite(ctx,art.wing,-a.r*.08,-a.r*.38,a.r*1.08,a.r*.74);
 }else{
  const impact=Math.max(0,(phase-.4)/.6),lift=phase<.42?Math.sin(phase/.42*Math.PI)*20:0;
  drawCombat(ctx,'talon',0,-lift,a.r*.62);
  if(impact>0&&ready(fxFrames.stomp[Math.min(3,Math.floor(impact*4))])){const im=fxFrames.stomp[Math.min(3,Math.floor(impact*4))];ctx.drawImage(im,-a.r,-a.r,a.r*2,a.r*2);ctx.restore();return;}if(impact>0){ctx.globalAlpha=(1-impact)*.8;ctx.strokeStyle='#e7c382';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,a.r*Math.min(1,impact+i*.12),0,Math.PI*2);ctx.stroke();}for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.fillStyle='#b4935b';ctx.beginPath();ctx.ellipse(Math.cos(angle)*a.r*impact,Math.sin(angle)*a.r*impact,4,2,angle,0,Math.PI*2);ctx.fill();}}
 }
 ctx.restore();
}
const fxFrames=Object.fromEntries(['impact','blast','stomp','guard'].map((id,row)=>[id,Array.from({length:4},(_,i)=>{const im=new Image();im.src=`assets/animation/${id}-${String(i).padStart(2,'0')}.webp`;return im;})]));
export function effect(ctx,f){
 const seq=fxFrames[f.type],phase=1-f.life/f.max,im=seq?.[Math.min(3,Math.floor(phase*4))];if(ready(im)){ctx.save();const r=f.type==='impact'?f.r*1.4:f.r;ctx.globalAlpha=Math.min(1,(1-phase)*4);ctx.drawImage(im,f.x-r,f.y-r,r*2,r*2);ctx.restore();return;}

 const p=1-f.life/f.max;ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=1-p;
 if(f.type==='muzzle'&&f.weapon!=='ak'){ctx.strokeStyle='#e4d4ad';ctx.globalAlpha=.25*(1-p);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,3+p*8,-1.1,1.1);ctx.stroke();
 }else if(f.type==='muzzle'){
  ctx.rotate(f.angle||0);ctx.fillStyle='#ffe6aa';ctx.beginPath();ctx.moveTo(0,-3*(1-p));ctx.quadraticCurveTo(f.r*.6,-5*(1-p),f.r*(1-p),0);ctx.quadraticCurveTo(f.r*.6,5*(1-p),0,3*(1-p));ctx.fill();ctx.fillStyle='#c0b59b';ctx.globalAlpha=.22*(1-p);ctx.beginPath();ctx.ellipse(-p*12,-p*8,3+p*6,2+p*4,0,0,Math.PI*2);ctx.fill();
 }else if(f.type==='blast'){
  const r=f.r*(.3+p*.7),g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'#fff4caaa');g.addColorStop(.45,'#efb04c66');g.addColorStop(1,'#db6c1f00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f6d58b';ctx.lineWidth=3;ctx.stroke();
  for(let i=0;i<9;i++){const a=i*2.4;ctx.fillStyle=i%2?'#e9b060':'#d9c49a';ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3*(1-p),0,Math.PI*2);ctx.fill();}
 }else if(f.type==='impact'){
  const shell=f.weapon==='egg';ctx.fillStyle=shell?'#fff0cc':'#d1ba85';for(let i=0;i<4;i++){const a=i*2.4+.5,d=f.r*(.2+p*.9);ctx.save();ctx.translate(Math.cos(a)*d,Math.sin(a)*d+p*p*9);ctx.rotate(a+p*2);ctx.beginPath();ctx.moveTo(-2,-2);ctx.lineTo(3,-1);ctx.lineTo(1,2);ctx.closePath();ctx.fill();ctx.restore();}ctx.fillStyle='#f6dfac';ctx.globalAlpha=(1-p)*.4;ctx.beginPath();ctx.ellipse(0,0,4*(1-p),3*(1-p),0,0,Math.PI*2);ctx.fill();
 }else{
  ctx.strokeStyle=f.type==='revive'?'#ffe4a0':'#b7edeb';ctx.lineWidth=f.type==='revive'?4:2;ctx.beginPath();ctx.arc(0,0,f.r*(.25+p*.75),0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
