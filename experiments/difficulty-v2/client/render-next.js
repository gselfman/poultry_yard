import {drawWindSprite} from './vfx-sprites.js';
import {drawCombat} from './combat-art.js';
import {approvedImages,frameAt} from './approved-media.js';
import {APPROVED_CLIPS} from './approved-media-data.js';
import {attackCapsule,peckTiming} from './enemy-attack-geometry.js';
import {TUNING,enemySpeedScale} from './engine.js';
import {art,effect} from './render.js';
const ACTOR_SCALE=1.3;
const ready=i=>i?.complete&&i.naturalWidth;
function sprite(ctx,id,x,y,w,h=w,alpha=1){const im=art[id];if(!ready(im))return;ctx.save();ctx.globalAlpha*=alpha;const k=Math.min(w/im.naturalWidth,h/im.naturalHeight);ctx.drawImage(im,x-im.naturalWidth*k/2,y-im.naturalHeight*k/2,im.naturalWidth*k,im.naturalHeight*k);ctx.restore();}
const seedCache=new Map();
export function seed(ctx,g,time){const tier=g.tier||1;let tile=seedCache.get(tier);if(!tile){const id=tier===8?'seed-large':tier===3?'seed-medium':'seed-small';if(!ready(art[id]))return;const size=(tier===8?42:tier===3?30:22)*ACTOR_SCALE,side=Math.ceil(size*3),c=document.createElement('canvas');c.width=c.height=side;const t=c.getContext('2d');t.translate(side/2,side/2);const halo=size*.7,glow=t.createRadialGradient(0,0,0,0,0,halo);glow.addColorStop(0,'#ffe27d99');glow.addColorStop(.45,'#ffc92833');glow.addColorStop(1,'#ffbe2400');t.fillStyle=glow;t.beginPath();t.arc(0,0,halo,0,Math.PI*2);t.fill();sprite(t,id,0,0,size,size,.96);tile=c;seedCache.set(tier,tile);}ctx.drawImage(tile,g.x-tile.width/2,g.y-tile.height/2);}
export function visibleSeed(g,view){return g.x>=view.x-50&&g.x<=view.x+view.w+50&&g.y>=view.y-50&&g.y<=view.y+view.h+50;}
export function groundEffects(ctx,s){
 for(const z of s.zones){ctx.save();ctx.translate(z.x,z.y);
 const trail=z.effect==='trail',age=trail?1-Math.max(0,z.remaining)/(z.duration||3):0;
 ctx.globalAlpha=z.follow?1:trail?Math.pow(1-age,.65):Math.min(1,Math.max(0,z.remaining)/1.5);
 if(z.type==='dust'){
  const key=trail?'dustTrail':z.effect==='storm'?'dustStorm':'dustBath',clip=APPROVED_CLIPS[key],frames=approvedImages[key];
  ctx.globalAlpha*=.8;
  if(trail){const phase=Math.min(clip.files.length-1,Math.floor(age*clip.files.length)),im=frames[phase];if(ready(im))ctx.drawImage(im,-z.r,-z.r,z.r*2,z.r*2);}
  else {const clock=s.time*(z.effect==='storm'?.55:.7),total=clip.durations.reduce((a,b)=>a+b,0)/1000,phase=clock%total,index=frameAt(clip,clock,true),im=frames[index];ctx.rotate(s.time*.45);const seam=index===frames.length-1?(phase-(total-clip.durations[index]/1000))/(clip.durations[index]/1000):0;if(ready(im)){ctx.globalAlpha*=1-seam;ctx.drawImage(im,-z.r,-z.r,z.r*2,z.r*2);}if(seam>0&&ready(frames[0])){ctx.globalAlpha=.8*(z.follow?1:Math.min(1,Math.max(0,z.remaining)/1.5))*seam;ctx.drawImage(frames[0],-z.r,-z.r,z.r*2,z.r*2);}}
 }else{ctx.rotate(s.time*.35);sprite(ctx,'dust-small',0,0,z.r*2,z.r*2,.55);}
 ctx.restore();}
 for(const b of s.bombs){ctx.save();ctx.strokeStyle='#ffdc7799';ctx.setLineDash([7,7]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.targetX,b.targetY,b.r,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
export function warningProgress(a){return Math.max(0,Math.min(1,a.elapsed/a.windup));}
function warningPath(ctx,a,f=1){ctx.beginPath();if(a.kind==='stomp')ctx.arc(0,0,a.range*f,0,Math.PI*2);else if(a.kind==='wing'){ctx.moveTo(0,0);ctx.arc(0,0,a.range*f,-a.spread,a.spread);ctx.closePath();}else{const c=attackCapsule(a);ctx.roundRect(c.x,c.y,Math.max(.01,c.w*f),c.h,c.r);}}
function drawWarning(ctx,a,active,progress){ctx.fillStyle=active?'#ff503b66':'#ffffff16';ctx.strokeStyle=active?'#ffb092':'#fff4d9c0';ctx.lineWidth=active?3:2;ctx.setLineDash([]);warningPath(ctx,a);ctx.fill();ctx.stroke();if(!active&&a.kind!=='charge'){ctx.save();warningPath(ctx,a);ctx.clip();ctx.fillStyle='#ef3f355e';warningPath(ctx,a,progress);ctx.fill();ctx.restore();}}
export function telegraphs(ctx,s){for(const e of s.enemies){let a=e.attack;if(!a&&e.type==='fox'&&e.dashDirection&&e.dash%TUNING.behaviour.foxCycle>=TUNING.behaviour.foxWarning&&e.dash%TUNING.behaviour.foxCycle<TUNING.behaviour.foxDashAt)a={kind:'charge',phase:'windup',angle:Math.atan2(e.dashDirection.y,e.dashDirection.x),range:e.speed*enemySpeedScale(s,'fox')*TUNING.behaviour.foxDash*Math.max(0,TUNING.behaviour.foxCycle-TUNING.behaviour.foxDashAt),width:e.r+2,elapsed:0,windup:1};if(!a||a.phase==='recovery')continue;if(a.kind==='pecks'&&a.targets){turkeyTargets(ctx,e,a);continue;}ctx.save();ctx.translate(a.originX??e.x,a.originY??e.y);ctx.rotate(a.angle);const active=a.phase==='active'&&(a.kind!=='pecks'||peckTiming(a).contact);drawWarning(ctx,a,active,warningProgress(a));if(e.type==='turkey'&&a.kind==='pecks'&&active)turkeyPeckWind(ctx,a);ctx.restore();}}
export function objects(ctx,s){for(const b of s.bombs){const f=Math.min(1,b.elapsed/b.flight),lift=Math.sin(f*Math.PI)*65;ctx.save();ctx.translate(b.x,b.y-lift);ctx.rotate(Math.min(1,b.elapsed/b.flight)*Math.PI*2);sprite(ctx,'bomb',0,0,(b.child?22:36)*b.size);ctx.restore();}
 for(const o of s.orbitals){ctx.save();if(o.core){ctx.translate(o.x,o.y);ctx.rotate(o.spin||0);if(!drawCombat(ctx,'egg-gold',0,0,o.r*2.5,o.r*3))sprite(ctx,'orbit',0,0,o.r*2.5);ctx.shadowBlur=0;}else sprite(ctx,'orbit',o.x,o.y,o.r*2.5);ctx.restore();}}
export function bossEffect(ctx,f){if(f.type==='boss-death'){if(f.life>0)bossDeath(ctx,f);return true;}if(f.type==='boss-wind'){bossWind(ctx,f);return true;}if(f.type==='boss-stomp'){effect(ctx,{...f,type:'stomp'});return true;}if(f.type!=='boss-stomp'&&f.type!=='boss-charge')return false;ctx.save();ctx.translate(f.x,f.y);if(f.angle)ctx.rotate(f.angle);sprite(ctx,f.type==='boss-stomp'?'turkey-stomp':'turkey-charge',0,0,f.r*2,f.r*2,.65*f.life/f.max);ctx.restore();return true;}

function bossDeath(ctx,f){const p=1-f.life/f.max;ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=Math.max(0,1-p);ctx.fillStyle='#ffdda32c';ctx.beginPath();ctx.arc(0,0,f.r*(.2+p*.8),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe7b9';ctx.lineWidth=4*(1-p)+1;ctx.beginPath();ctx.ellipse(0,0,f.r*p,f.r*p*.72,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<22;i++){const a=i*2.39996,dist=f.r*(.2+p*.85)*( .5+(i%5)*.12),x=Math.cos(a)*dist,y=Math.sin(a)*dist*.78;ctx.save();ctx.translate(x,y);ctx.rotate(a+p*2);ctx.fillStyle=i%3?'#f9d086':'#fff1d3';ctx.beginPath();ctx.ellipse(0,0,(i%3?3:9)*(1-p*.6),i%3?3:3.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.restore();}

export function turkeyPeckWind(ctx,a){const clip=APPROVED_CLIPS.gooseWind,im=approvedImages.gooseWind[frameAt(clip,Math.max(0,a.elapsed-a.windup),true)],start=a.start||0,length=Math.max(1,a.range-start),count=Math.max(2,Math.ceil(length/190)),stride=length/count,height=Math.max(55,a.width*5);ctx.save();ctx.globalAlpha*=.86;ctx.strokeStyle='#fff0c9';ctx.lineWidth=2;ctx.shadowColor='#ffe4ab';ctx.shadowBlur=5;for(let i=0;i<count;i++){const x=start+i*stride;if(im?.complete&&im.naturalWidth)ctx.drawImage(im,x,-height/2,stride,height);for(let j=0;j<2;j++){const yy=(j?1:-1)*height*.12;ctx.beginPath();ctx.moveTo(x+stride*.08,yy+height*.14);ctx.quadraticCurveTo(x+stride*.45,yy-height*.27,x+stride*.91,yy);ctx.stroke();}}ctx.restore();}

function turkeyTargets(ctx,e,a){const timing=peckTiming(a);for(let i=0;i<a.targets.length;i++){if(a.phase==='active'&&i<timing.pulse)continue;const target=a.targets[i],active=a.phase==='active'&&i===timing.pulse&&timing.contact,markAt=i*a.windup/TUNING.bosses.peckCount,impactAt=a.windup+(i+.25)*a.peckGap,progress=Math.max(0,Math.min(1,(a.elapsed-markAt)/(impactAt-markAt))),line={...a,angle:target.angle};ctx.save();ctx.translate(a.originX??e.x,a.originY??e.y);ctx.rotate(target.angle);drawWarning(ctx,line,active,progress);if(active)turkeyPeckWind(ctx,line);ctx.restore();}}

export function bossWind(ctx,f){drawWindSprite(ctx,f);}
