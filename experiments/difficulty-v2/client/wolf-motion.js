const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
// All steering vectors are normalized. Neither distance nor pack slots increase speed.
export function localWolfDirection(dx,dy,d,id,age,body=null,pack=[],definitions={},playerRadius=20,playerMove={x:0,y:0},view={width:1100,height:850}){
 const inward=unit(dx,dy),r=body?.r||25,contact=playerRadius+r+55;
 const visible=Math.abs(dx)<view.width*.5+r*1.5&&Math.abs(dy)<view.height*.5+r*1.5;
 const movingAway=playerMove.x*inward.x+playerMove.y*inward.y>.02;
 const widening=body?.wolfLastDistance!=null&&d>body.wolfLastDistance+.005;
 const charge=d<contact||(body?.wolfMode==='charge'&&d<contact+35);
 const mode=!visible?'approach':charge?'charge':movingAway&&widening&&d>contact+65?'approach':'spiral';
 // Local spacing follows nearby wolves, not a rank/slot tied to a moving player.
 let sx=0,sy=0;
 if(body){const spacing=r*3.4;for(const other of pack){if(other===body||other.id===id||other.hp<=0)continue;const ox=body.x-other.x,oy=body.y-other.y,dist=Math.hypot(ox,oy);if(dist>=spacing)continue;const a=dist?0:(id<other.id?-.7:Math.PI-.7),nx=dist?ox/dist:Math.cos(a),ny=dist?oy/dist:Math.sin(a),force=1-dist/spacing;sx+=nx*force;sy+=ny*force;}}
 const separation=unit(sx,sy),strength=Math.min(.75,Math.hypot(sx,sy)*.32);
 let x=inward.x,y=inward.y;
 if(mode==='spiral'){
  const radial=clamp((d-contact)/500,.25,.65),tangent=.8;
  x=inward.x*radial+inward.y*tangent;y=inward.y*radial-inward.x*tangent;
 }
 const repel=mode==='spiral'?strength:Math.min(.22,strength);
 x+=separation.x*repel;y+=separation.y*repel;
 const dir=unit(x,y);
 if(body){body.wolfLastDistance=d;body.wolfMode=mode;body.wolfHunt=mode==='charge';}
 return {...dir,speed:1,hunt:mode==='charge',mode,visible};
}
// Bound actual post-separation travel, not merely the intended AI velocity.
export function boundWolfMotion(frames,obstacles=[]){
 for(const [e,start]of frames){
  const dx=e.x-start.x,dy=e.y-start.y,d=Math.hypot(dx,dy),limit=start.limit;
  if(d<=limit+1e-8)continue;
  const x=start.x+dx/d*limit,y=start.y+dy/d*limit;
  const blocked=obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<e.r+o.r-.001);
  if(blocked){e.x=start.x;e.y=start.y;}else{e.x=x;e.y=y;}
 }
}

