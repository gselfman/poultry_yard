export const WAVE_COPY={rat:'МЫШИНАЯ ВОЛНА · МНОГО, НО ХРУПКИЕ',fox:'ЛИСЫ · СЛЕДИ ЗА РАЗБЕГОМ',duck:'УТКИ · НЕ ДАЙ СЕБЯ ОКРУЖИТЬ',squirrel:'БЕЛКИ · БЕРЕГИСЬ ЖЁЛУДЕЙ',wolf:'ВОЛКИ · СЖИМАЮТ КОЛЬЦО',goose:'ГУСИ · ВЫХОДИ ИЗ ЛИНИИ ЩИПКА',bear:'МЕДВЕДИ · ТЯЖЁЛАЯ ВОЛНА',mixed:'ВОЛНА СМЕШАЛАСЬ · МЕДВЕДИ ОСТАЮТСЯ'};
export function localSpawn(s,world,r){const v=s.spawnView||{width:1100,height:850},p=s.player;const rx=v.width*.85+r*3+90,ry=v.height*.85+r*3+90;
 // Main direction persists for a short group; subsequent groups flank from another sector.
 const sector=(Math.floor(s.time/9)*2.399963)% (Math.PI*2),angle=sector+(s.random()-.5)*1.1;
 for(let i=0;i<24;i++){const a=angle+i*2.399963,x=p.x+Math.cos(a)*rx,y=p.y+Math.sin(a)*ry;if(!world.spawnPadding&&(x<r+32||x>world.width-r-32||y<r+32||y>world.height-r-32))continue;if(Math.abs(x-p.x)<v.width*.55+r*2&&Math.abs(y-p.y)<v.height*.65+r*2)continue;return {x,y};}
 if(world.spawnPadding)return {x:p.x+rx,y:p.y};
 return {x:Math.max(r+32,Math.min(world.width-r-32,p.x+(p.x<world.width/2?rx:-rx))),y:Math.max(r+32,Math.min(world.height-r-32,p.y))};
}
export function scatterSupplies(s,world,resolve){const corners=[[.07,.07],[.93,.07],[.07,.93],[.93,.93]];for(let i=0;i<corners.length;i++){const [x,y]=corners[i];for(const [key,offset]of [['worms',-55],['magnets',55]]){const p={x:world.width*x+offset,y:world.height*y,r:24};resolve(p,s.obstacles);s[key].push({x:p.x,y:p.y,mapSupply:true,corner:i});}}}
export function wolfDirection(dx,dy,d,id,age,body=null,pack=[],definitions={},playerRadius=20,playerMove={x:0,y:0}){
 // Stable ID slots spread wolves around a rotating ring; its shared radius contracts.
 if(body){if(d>=180)body.wolfHunt=false;else if(d<110||(d<150&&playerMove.x*(-dx)+playerMove.y*(-dy)>.01))body.wolfHunt=true;}if(body?.wolfHunt){const length=Math.hypot(dx,dy)||1;return {x:dx/length,y:dy/length,speed:1.25,hunt:true};}
 const count=Math.max(1,pack.length),rank=Math.max(0,pack.findIndex(e=>e.id===id)),r=body?.r||25;
 const desiredRadius=Math.max(playerRadius+r*.65,320-age*7),angle=Math.atan2(-dy,-dx),slot=age*.162+rank*Math.PI*2/count;
 const error=Math.atan2(Math.sin(slot-angle),Math.cos(slot-angle));
 const radial=Math.max(0,Math.min(.72,(d-desiredRadius)/100)),rawTangent=Math.max(-.95,Math.min(1.1,.18*d/Math.max(1,body?.speed||80)+error*.8)),baseTangent=(Math.sign(rawTangent)||1)*Math.max(.55,Math.abs(rawTangent)),tangent=baseTangent*.9;
 const inwardX=dx===0&&dy===0?Math.cos(slot):dx/d,inwardY=dx===0&&dy===0?Math.sin(slot):dy/d,x=inwardX*radial+inwardY*tangent,y=inwardY*radial-inwardX*tangent,length=Math.hypot(x,y);
 return {x:x/length,y:y/length,speed:Math.min(2.1,Math.max(1.35,Math.hypot(radial,baseTangent)*1.85))*length/Math.hypot(radial,baseTangent),ringRadius:desiredRadius};
}
