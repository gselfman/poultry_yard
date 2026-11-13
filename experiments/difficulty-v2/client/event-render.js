import {drawRain,drawPuddle} from './weather-art.js';
export function drawEventGround(ctx,s,view){
 if(!s)return;const visible=p=>p.x+p.r>view.x&&p.x-p.r<view.x+view.w&&p.y+p.r>view.y&&p.y-p.r<view.y+view.h;
 for(const p of s.worldEvents.puddles){if(visible(p))drawPuddle(ctx,p);}
 const b=s.worldEvents.nuclear;if(!b||b.status==='spent'||!visible({...b,r:120}))return;
 const r=s.eventRules.nuclear,near=Math.hypot(b.x-s.player.x,b.y-s.player.y)<r.chargeRadius+60;
 ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#17141ac9';ctx.beginPath();ctx.ellipse(0,22,30,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#77766c';ctx.strokeStyle='#d3b37d';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-18,-24,36,50,10);ctx.fill();ctx.stroke();ctx.fillStyle='#e9c94f';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29252a';for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,11,a,a+.95);ctx.closePath();ctx.fill();}ctx.fillStyle='#e9c94f';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();ctx.fillStyle=b.status==='armed'?'#ff7552':'#aaf47d';ctx.beginPath();ctx.arc(0,-17,3+Math.sin(s.time*3)*.6,0,Math.PI*2);ctx.fill();
 if(near){ctx.strokeStyle='#e9c94f55';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r.chargeRadius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffe68b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,b.charge/r.charge));ctx.stroke();ctx.fillStyle='#ffe8ad';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(b.status==='armed'?'Удар через '+Math.max(0,Math.ceil(b.fuseAt-s.time))+'с':(b.inZone?'В зоне: ':'Разряжается: ')+Math.floor(b.charge)+' / '+r.charge+'с',0,-55);}
 ctx.restore();
}
export function drawEventSky(ctx,s,w,h,view){
 if(!s||s.difficulty!=='hard')return;const v=s.worldEvents;ctx.save();
 if(v.night){const x=view.offsetX+s.player.x*view.scale,y=view.offsetY+s.player.y*view.scale,g=ctx.createRadialGradient(x,y,65,x,y,Math.max(w,h)*.8);g.addColorStop(0,'#10172a20');g.addColorStop(.45,'#10172a65');g.addColorStop(1,'#080c22c0');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 if(v.rainUntil>s.time)drawRain(ctx,s.time,w,h);
 if(v.nuclear?.status==='armed'){ctx.strokeStyle='#ffe887';ctx.lineWidth=3;ctx.globalAlpha=.5+.2*Math.sin(s.time*5);ctx.strokeRect(8,8,w-16,h-16);}
 if(v.nuclearFlashUntil>s.time){ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
 ctx.restore();
}
