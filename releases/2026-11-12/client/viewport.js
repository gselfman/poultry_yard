export const VIEW_ZOOM=1.3;
/** Keep actor/world scale consistent across portrait and landscape. */
export const LANDSCAPE_MOBILE_ZOOM=1;
export function cameraView(w,h,p,world){
 const top=Math.min(136,h*.24),bottom=Math.min(82,h*.18),safeH=Math.max(1,h-top-bottom);
 const landscapeMobile=w>h&&h<=650;
 const zoom=VIEW_ZOOM*(landscapeMobile?LANDSCAPE_MOBILE_ZOOM:1);
 const scale=Math.max(Math.min(w/680,safeH/560)*zoom,w/1600,h/1200);
 const vw=w/scale,vh=h/scale,centerY=(top+h-bottom)/2;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const cx=world.spawnPadding?p.x:clamp(p.x,vw/2,world.width-vw/2),cy=world.spawnPadding?p.y:clamp(p.y,(centerY/scale),world.height-(h-centerY)/scale);
 return {scale,vw,vh,cx,cy,offsetX:w/2-cx*scale,offsetY:centerY-cy*scale,top,bottom,viewY:cy-centerY/scale};
}
export function stickVector(dx,dy,radius=46){const d=Math.hypot(dx,dy),scale=Math.max(radius,d);return {x:dx/scale,y:dy/scale};}
export function bossMarker(e,view,w,h){const x=e.x*view.scale+view.offsetX,y=e.y*view.scale+view.offsetY,top=view.top+30,bottom=h-view.bottom-25;const radius=(e.r||0)*view.scale;if(x+radius*1.8>=0&&x-radius*1.8<=w&&y+radius>=0&&y-radius*2.6<=h)return null;const cx=w/2,cy=(top+bottom)/2,dx=x-cx,dy=y-cy,limitX=Math.max(1,w/2-74),limitY=Math.max(1,(bottom-top)/2),k=Math.min(limitX/Math.max(1,Math.abs(dx)),limitY/Math.max(1,Math.abs(dy)));return {x:cx+dx*k,y:cy+dy*k,angle:Math.atan2(dy,dx)};}
