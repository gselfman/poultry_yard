const names=['ryaba','rambo','monk','rat','fox','wolf','bear','squirrel','beak','wing','talon'];
export const art=Object.fromEntries(names.map(id=>{const image=new Image();image.src=`assets/v5/${id}.png`;return [id,image];}));
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
export function melee(ctx,a){
 const phase=Math.min(1,a.elapsed/a.duration),opacity=Math.min(1,phase*9,(1-phase)*7);
 ctx.save();ctx.translate(a.x,a.y);ctx.globalAlpha=opacity;
 if(a.type==='beak'){
  ctx.rotate(a.angle);const thrust=Math.sin(Math.PI*phase),w=a.r*.78,h=Math.max(18,a.r*.27);const x=a.r*(.04+.18*thrust);
  sprite(ctx,art.beak,x,-h/2,w,h);
  if(phase>.35&&phase<.7){ctx.strokeStyle='#f6df9b88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-h*.3);ctx.lineTo(x-4,-h*.2);ctx.moveTo(-8,h*.3);ctx.lineTo(x-4,h*.2);ctx.stroke();}
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
 if(f.type==='muzzle'){
  ctx.rotate(f.angle||0);const g=ctx.createRadialGradient(0,0,1,0,0,f.r);g.addColorStop(0,'#fff7d2');g.addColorStop(.3,'#fbd071');g.addColorStop(1,'#e9973100');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,f.r,f.r*.55,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffe4a0';ctx.lineWidth=1.5;for(let i=0;i<5;i++){const a=(i-2)*.4;ctx.beginPath();ctx.moveTo(Math.cos(a)*4,Math.sin(a)*4);ctx.lineTo(Math.cos(a)*f.r,Math.sin(a)*f.r);ctx.stroke();}
 }else if(f.type==='blast'){
  const r=f.r*(.3+p*.7),g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'#fff4caaa');g.addColorStop(.45,'#efb04c66');g.addColorStop(1,'#db6c1f00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f6d58b';ctx.lineWidth=3;ctx.stroke();
  for(let i=0;i<9;i++){const a=i*2.4;ctx.fillStyle=i%2?'#e9b060':'#d9c49a';ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3*(1-p),0,Math.PI*2);ctx.fill();}
 }else if(f.type==='impact'){
  ctx.strokeStyle='#f0dba9';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.moveTo(Math.cos(a)*f.r*p*.6,Math.sin(a)*f.r*p*.6);ctx.lineTo(Math.cos(a)*f.r*p,Math.sin(a)*f.r*p);ctx.stroke();}
 }else{
  ctx.strokeStyle=f.type==='revive'?'#ffe4a0':'#b7edeb';ctx.lineWidth=f.type==='revive'?4:2;ctx.beginPath();ctx.arc(0,0,f.r*(.25+p*.75),0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
