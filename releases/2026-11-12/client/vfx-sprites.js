// Approved eight-frame atlases, fixed cell registration: never crop/resize per frame.
export const VFX_TIMES=[60,60,60,70,110,130,140,170];
export function vfxFrame(age,duration){let ms=Math.max(0,Math.min(.999999,age/duration))*800;for(let i=0;i<VFX_TIMES.length;i++){if(ms<VFX_TIMES[i])return i;ms-=VFX_TIMES[i];}return 7;}
export const vfxImages=Object.fromEntries(['stomp','wind'].map(key=>[key,Array.from({length:8},(_,i)=>{const im=new Image();im.src=new URL(`./assets/vfx-v36/${key}-${i}.webp`,import.meta.url).href;return im;})]));
export async function loadVfx(){await Promise.all(Object.values(vfxImages).flat().map(im=>im.decode()));}
export function drawStompSprite(ctx,f){const im=vfxImages.stomp[vfxFrame(f.max-f.life,f.max)];if(!im?.complete||!im.naturalWidth)return;const side=f.r*2.9;ctx.save();ctx.drawImage(im,f.x-side/2,f.y-side/2,side,side);ctx.restore();}
export function drawWindSprite(ctx,f){const im=vfxImages.wind[vfxFrame(f.max-f.life,f.max)];if(!im?.complete||!im.naturalWidth)return;const side=f.r/.74;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,f.r,-f.spread,f.spread);ctx.closePath();ctx.clip();ctx.drawImage(im,-side*.17,-side*.5,side,side);ctx.restore();}
