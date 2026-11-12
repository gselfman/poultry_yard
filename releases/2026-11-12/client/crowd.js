// Deterministic weighted separation, bounded spatial broad phase.
export function separateCrowd(enemies,definitions,width,height,obstacles=[],resolve=()=>{},padding=0){
 const alive=enemies.filter(e=>e.hp>0&&!e.airborne),cell=160;let maxR=0;for(const e of alive)maxR=Math.max(maxR,e.r*1.3);
 for(let pass=0;pass<3;pass++){
  const grid=new Map();for(let i=0;i<alive.length;i++){const e=alive[i],key=`${Math.floor(e.x/cell)},${Math.floor(e.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
  for(let i=0;i<alive.length;i++){const a=alive[i],search=a.r*1.3+maxR;for(let y=Math.floor((a.y-search)/cell);y<=Math.floor((a.y+search)/cell);y++)for(let x=Math.floor((a.x-search)/cell);x<=Math.floor((a.x+search)/cell);x++)for(const j of grid.get(`${x},${y}`)||[]){if(j<=i)continue;const b=alive[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.r+b.r)*1.3;if(d>=min)continue;const angle=(a.id*2.399963+b.id*.73),nx=d?dx/d:Math.cos(angle),ny=d?dy/d:Math.sin(angle),ma=definitions[a.type].weight,mb=definitions[b.type].weight,push=(min-d)*.9;const pa=push*mb/(ma+mb),pb=push*ma/(ma+mb);a.x-=nx*pa;a.y-=ny*pa;b.x+=nx*pb;b.y+=ny*pb;}}
  for(const e of alive){if(!definitions[e.type].isBoss&&!e.airborne)resolve(e,obstacles);e.x=Math.max(e.r-padding,Math.min(width+padding-e.r,e.x));e.y=Math.max(e.r-padding,Math.min(height+padding-e.r,e.y));}
 }
}
