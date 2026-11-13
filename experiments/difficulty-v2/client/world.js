import {PROP_TYPES,PROP_SPECS} from './environment-props.js';
// Deterministic scenery: no combat RNG consumed, wide clear routes between obstacles.
export function makeWorldObjects(width,height){
 const obstacles=[],decor=[];
 const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 for(let row=0;row<Math.floor(height/660)-1;row++)for(let col=0;col<Math.floor(width/650)-1;col++){
  const id=row*100+col,x=650+col*650+(hash(id)-.5)*170,y=680+row*660+(hash(id+80)-.5)*160;
  if(id%2===1||Math.hypot(x-width/2,y-height/2)<470)continue;
  const type=PROP_TYPES[Math.floor(id/2)%PROP_TYPES.length],spec=PROP_SPECS[type];
  obstacles.push({id,type,variant:1+Math.floor(hash(id+210)*3),x,y,r:spec.radius+hash(id+7)*spec.variation});
 }
 for(let i=0;i<700;i++){const x=70+hash(i+200)* (width-140),y=80+hash(i+1200)*(height-160);if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+32))continue;decor.push({id:i,x,y,variant:1+i%12,size:18+hash(i+400)*35,angle:(hash(i+600)-.5)*1.4});}
 return {obstacles,decor};
}
export function overlapsObstacle(body,o,padding=0){return Math.hypot(body.x-o.x,body.y-o.y)<body.r+o.r+padding;}
export function resolveObstacles(body,obstacles){for(let pass=0;pass<3;pass++)for(const o of obstacles||[]){const dx=body.x-o.x,dy=body.y-o.y,r=body.r+o.r;if(Math.abs(dx)>=r||Math.abs(dy)>=r)continue;const d=Math.hypot(dx,dy);if(d<r){body.x=o.x+(d?dx/d:1)*(r+.01);body.y=o.y+(d?dy/d:0)*(r+.01);}}return body;}
export function moveBody(body,dx,dy,obstacles){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(8,body.r*.65)));for(let i=0;i<steps;i++){body.x+=dx/steps;body.y+=dy/steps;resolveObstacles(body,obstacles);}return body;}
export function steerAround(body,target,ux,uy,obstacles){
 const goalDistance=Math.hypot(target.x-body.x,target.y-body.y);
 // Once melee contact is reachable, avoid steering must not repel attackers from the shore.
 if(goalDistance<=body.r+(target.r||19)+8){body.avoidId=null;return {x:ux,y:uy};}
 let nearest=null,best=Infinity;
 for(const o of obstacles||[]){const dx=o.x-body.x,dy=o.y-body.y,ahead=dx*ux+dy*uy,cross=dx*uy-dy*ux,R=o.r+body.r+1;
  const targetBeyond=(target.x-o.x)*ux+(target.y-o.y)*uy;
  if(ahead>0&&ahead<R+38&&ahead<goalDistance&&targetBeyond>-R&&Math.abs(cross)<R&&ahead<best){nearest=o;best=ahead;}}
 if(!nearest){body.avoidId=null;return {x:ux,y:uy};}
 const o=nearest,dx=body.x-o.x,dy=body.y-o.y,d=Math.max(1,Math.hypot(dx,dy));
 if(body.avoidId!==o.id){body.avoidId=o.id;body.avoidSide=(ux*(-dy/d)+uy*(dx/d))>=0?1:-1;}
 const side=body.avoidSide,nx=dx/d,ny=dy/d,R=o.r+body.r+1,radial=Math.max(-.45,Math.min(.35,(R+2-d)/20));
 let x=-ny*side+nx*radial,y=nx*side+ny*radial,length=Math.hypot(x,y);return {x:x/length,y:y/length};
}
