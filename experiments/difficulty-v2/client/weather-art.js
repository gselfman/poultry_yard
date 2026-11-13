import {rainParticle} from './event-visual-timing.js';
const ready=im=>im?.complete&&im.naturalWidth>0;
function load(prefix,n){return Array.from({length:n},(_,i)=>{const im=new Image();im.src=new URL('./assets/environment/'+prefix+'-'+String(i+1).padStart(2,'0')+'.webp',import.meta.url).href;return im;});}
export const rainArt=load('rain',8),puddleArt=load('puddle',8);
export const weatherImages=[...rainArt,...puddleArt];
export function drawRain(ctx,time,width,height){
 const count=Math.min(420,Math.floor(width*height/2100));ctx.save();
 for(let i=0;i<count;i++){const p=rainParticle(i,time,width,height),im=rainArt[p.frame];if(!ready(im)||p.y<-40||p.y>height+20)continue;ctx.globalAlpha=p.alpha;ctx.drawImage(im,p.x-p.width/2,p.y-p.height/2,p.width,p.height);}
 ctx.restore();
}
export function drawPuddle(ctx,p){const im=puddleArt[(p.variant||1)-1];if(!ready(im))return;ctx.save();ctx.translate(p.x,p.y);ctx.drawImage(im,-p.r,-(p.ry??p.r),p.r*2,(p.ry??p.r)*2);ctx.restore();}
