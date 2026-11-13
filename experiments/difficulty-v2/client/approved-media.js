import {APPROVED_CLIPS} from './approved-media-data.js';
export function frameAt(clip,seconds,loop=clip.loop){const total=clip.durations.reduce((a,b)=>a+b,0);let ms=Math.max(0,seconds*1000);ms=loop?ms%total:Math.min(ms,total-.001);for(let i=0;i<clip.durations.length;i++){if(ms<clip.durations[i])return i;ms-=clip.durations[i];}return clip.durations.length-1;}
export function visualClip(id,time,moving,attack,motion){
 if(id==='duck'||id==='squirrel')return {key:id,seconds:moving?time*(id==='duck'?1.15:.9):0};
 if(id==='goose'){
  if(!attack)return null;
  const c=APPROVED_CLIPS.gooseBite,total=c.durations.reduce((a,b)=>a+b,0)/1000;
  // Preserve the approved sequence while matching authoritative combat windows.
  const hold=c.holdFrame,start=c.durations.slice(0,hold).reduce((a,b)=>a+b,0)/1000;
  const elapsed=attack.elapsed;let seconds=0;
  if(attack.phase==='windup')seconds=Math.min(1,elapsed/Math.max(.001,attack.windup))*start;
  else if(attack.phase==='active')seconds=start+Math.min(.999999,Math.max(0,(elapsed-attack.windup)/Math.max(.001,attack.active)))*(c.durations[hold]/1000);
  else seconds=start+c.durations[hold]/1000+Math.min(1,(elapsed-attack.windup-attack.active)/Math.max(.001,attack.recovery))*(total-start-c.durations[hold]/1000);
  return {key:'gooseBite',seconds,loop:false};
 }
 if(id==='fox'&&motion){const phase=motion.phase;if(phase>=motion.dashAt){const c=APPROVED_CLIPS.foxJump;return {key:'foxJump',seconds:(phase-motion.dashAt)/(motion.cycle-motion.dashAt)*c.durations.reduce((a,b)=>a+b,0)/1000,loop:false};}if(phase>=motion.warning)return {key:'fox',seconds:0};}
 if(['rat','wolf','fox','bear'].includes(id))return {key:id,seconds:moving?time*(id==='fox'?.4:1):0};return null;
}
export const approvedImages=Object.fromEntries(Object.entries(APPROVED_CLIPS).map(([key,c])=>[key,c.files.map(src=>{const im=new Image();im.src=src;return im;})]));
export function drawApproved(ctx,id,x,y,r,facing,time,moving,inv,flash,attack,motion){const pose=visualClip(id,time,moving,attack,motion);if(!pose)return false;const c=APPROVED_CLIPS[pose.key],im=approvedImages[pose.key][frameAt(c,pose.seconds,pose.loop??c.loop)];if(!im?.complete||!im.naturalWidth)return false;const box=r*3.15*1.3,isBite=pose.key==='gooseBite';const h=isBite?box*(262/384)*1.281:box*c.height/c.width,w=h*c.width/c.height,k=w/c.width,anchor=isBite?c.bodyAnchorX*k:w/2,feet=isBite?c.feetY*k:h*(c.feetAnchor??1);
 ctx.save();ctx.translate(x,y);if(isBite)ctx.rotate(attack.angle-(facing<0?Math.PI:0));ctx.scale(facing||1,1);ctx.globalAlpha=inv>0&&Math.floor(inv*20)%2===0?.35:flash>0?.55:1;ctx.drawImage(im,-anchor,r*.85-feet,w,h);
 if(isBite&&attack.phase==='active'){const wind=APPROVED_CLIPS.gooseWind,wi=approvedImages.gooseWind[frameAt(wind,attack.elapsed-attack.windup,true)];const reach=attack.range;ctx.globalAlpha*=.95;if(wi?.complete&&wi.naturalWidth)ctx.drawImage(wi,reach*.35,-r*.95,reach*.85,r*1.9);ctx.strokeStyle='#fff2cb';ctx.lineWidth=2.2;for(let i=0;i<3;i++){const yy=(i-1)*r*.28;ctx.beginPath();ctx.moveTo(reach*.55,yy-r*.4);ctx.quadraticCurveTo(reach*.9,yy-r*.65,reach*1.2,yy-r*.35);ctx.stroke();}}
 ctx.restore();return true;}
export function drawApprovedStomp(ctx,x,y,r,phase){const c=APPROVED_CLIPS.stomp,im=approvedImages.stomp[frameAt(c,phase*c.durations.reduce((a,b)=>a+b,0)/1000,false)];if(!im?.complete||!im.naturalWidth)return false;ctx.save();ctx.globalAlpha*=Math.min(1,(1-phase)*4);ctx.drawImage(im,x-r,y-r,r*2,r*2);ctx.restore();return true;}
