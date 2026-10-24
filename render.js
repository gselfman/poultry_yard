import {beakPose} from './engine.js';
const names=['ryaba','rambo','monk','rat','fox','wolf','bear','squirrel','beak','wing','talon'];
export const art=Object.fromEntries(names.map(id=>{const image=new Image();image.src=`assets/${['ryaba','rambo','monk'].includes(id)?'v5':'v7'}/${id}.png`;return [id,image];}));
const ready=image=>image?.complete&&image.naturalWidth>0;
function sprite(ctx,image,x,y,w,h){if(ready(image))ctx.drawImage(image,x,y,w,h);}
export function creature(ctx,id,x,y,r,facing,time,moving,inv=0,flash=0){
 const image=art[id],hero=['ryaba','rambo','monk'].includes(id),box=r*(hero?4.7:4.1);
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#14220e55';ctx.beginPath();ctx.ellipse(0,r*.85,r,Math.max(3,r*.3),0,0,Math.PI*2);ctx.fill();
 if(!ready(image)){ctx.restore();return;}
 const scale=Math.min(box/image.naturalWidth,box*1.1/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 const stride=moving?Math.sin(time*(id==='bear'?7:12)):0,bob=moving?Math.abs(stride)*1.5:0;
 ctx.globalAlpha=inv>0&&Math.floor(inv*20)%2===0?.35:flash>0?.55:1;
 ctx.scale(facing||1,1);ctx.rotate(stride*.018);
 const cut=.72,sourceCut=image.naturalHeight*cut;
 // Upper body and two foot regions share one image; small offsets form a simple walk cycle.
 ctx.drawImage(image,0,0,image.naturalWidth,sourceCut,-w/2,-h*.57-bob,w,h*cut);
 for(let foot=0;foot<2;foot++)ctx.drawImage(image,foot*image.naturalWidth/2,sourceCut,image.naturalWidth/2,image.naturalHeight-sourceCut,-w/2+foot*w/2+stride*(foot===0?1.3:-1.3),-h*.57+h*cut-bob+Math.max(0,stride*(foot===0?1:-1))*1.5,w/2,h*(1-cut));
 ctx.restore();
}
const crops=new WeakMap();
function croppedSprite(ctx,image,x,y,w,h=null){if(!ready(image))return;let b=crops.get(image);if(!b){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const c2=c.getContext('2d',{willReadFrequently:true});c2.drawImage(image,0,0);const data=c2.getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>100){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}b={x:left,y:top,w:right-left+1,h:bottom-top+1};crops.set(image,b);}const height=h??w*b.h/b.w;ctx.drawImage(image,b.x,b.y,b.w,b.h,x,y-height/2,w,height);}
export function melee(ctx,a){
 if(a.delay>0)return;
 const phase=Math.min(1,a.elapsed/a.duration),opacity=Math.min(1,phase*12,(1-phase)*10);
 ctx.save();ctx.translate(a.x,a.y);ctx.globalAlpha=opacity;
 if(a.type==='beak'){
  ctx.rotate(a.angle);const pose=beakPose(a);
  croppedSprite(ctx,art.beak,pose.x,0,pose.width);
 }else if(a.type==='wing'){
  const angle=a.angle+a.side*(-1.4+2.8*phase);ctx.rotate(angle);ctx.scale(1,a.side);
  ctx.fillStyle='#edd9ac16';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,a.r,Math.max(-.7,-phase*2.8),0);ctx.closePath();ctx.fill();
  sprite(ctx,art.wing,-a.r*.08,-a.r*.38,a.r*1.08,a.r*.74);
 }else{
  const impact=Math.max(0,(phase-.4)/.6),lift=phase<.42?Math.sin(phase/.42*Math.PI)*20:0;
  ctx.rotate(a.angle);sprite(ctx,art.talon,8,-a.r*.3-lift,a.r*.62,a.r*.62);
  if(impact>0){ctx.globalAlpha=(1-impact)*.8;ctx.strokeStyle='#e7c382';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,a.r*Math.min(1,impact+i*.12),0,Math.PI*2);ctx.stroke();}for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.fillStyle='#b4935b';ctx.beginPath();ctx.ellipse(Math.cos(angle)*a.r*impact,Math.sin(angle)*a.r*impact,4,2,angle,0,Math.PI*2);ctx.fill();}}
 }
 ctx.restore();
}
export function effect(ctx,f){
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
