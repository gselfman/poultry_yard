import test from 'node:test';
import assert from 'node:assert/strict';
import {wolfDirection} from '../client/encounters.js';
import {boundWolfMotion} from '../client/wolf-motion.js';
import {separateCrowd} from '../client/crowd.js';
import {createGame,step,spawnEnemy,ENEMIES,enemySpeedScale} from '../client/engine.js';
import {seededRandom} from '../client/session-replay.js';
import {queuePreviewEvent,setNight,eventBudgetScale,eventSpawnProfile} from '../client/world-events.js';
const quiet={rain:{chance:0},hunt:{chance:0},nuclear:{chance:0}};
const fresh=()=>{const s=createGame('ryaba',seededRandom(45),{difficulty:'hard',eventRules:quiet});s.weapons={};s.gems=[];s.ambientTimer=1e9;s.testFlags={invincible:true,noSpawns:true};return s;};
const wolf=(s,x,y)=>spawnEnemy(s,'wolf',{x,y,force:true});
const body=(x=0,y=0)=>({id:1,type:'wolf',x,y,r:25,hp:100,speed:75});
const direction=(e,d,pack=[],move={x:0,y:0},age=0)=>wolfDirection(d,0,d,e.id,age,e,pack,ENEMIES,20,move,{width:1100,height:850});
test('all wolf steering modes use exactly the configured speed at all distances and pack ages',()=>{
 for(const d of [20,90,140,250,500,1000,5000])for(const age of [0,10,120,2000]){const dir=direction(body(),d,[],{x:0,y:0},age);assert.equal(dir.speed,1);assert.ok(Math.abs(Math.hypot(dir.x,dir.y)-1)<1e-9);}
});
test('wolves approach offscreen, spiral on screen, chase a fleeing player and attack close by',()=>{
 const e=body();let dir=direction(e,1000);assert.equal(dir.mode,'approach');assert.equal(dir.x,1);assert.equal(dir.y,0);
 dir=direction(e,300);assert.equal(dir.mode,'spiral');assert.ok(Math.abs(dir.y)>.1&&dir.x>0);
 dir=direction(e,305,[],{x:2,y:0});assert.equal(dir.mode,'approach');assert.equal(dir.x,1);assert.equal(dir.speed,1);
 dir=direction(e,85);assert.equal(dir.mode,'charge');assert.equal(dir.x,1);assert.equal(dir.y,0);
});
test('nearby wolves change spacing but distant membership and pack rank never move a wolf to a slot',()=>{
 const a=body(),b=body();const empty=direction(a,300),near=direction(b,300,[b,{id:2,type:'wolf',hp:100,x:0,y:-35,r:25}]);assert.ok(Math.abs(empty.y-near.y)>.01);
 const distant=direction(body(),300,Array.from({length:40},(_,i)=>({id:i+2,hp:100,x:5000+i*100,y:5000})),{x:0,y:0},5000);assert.deepEqual({x:empty.x,y:empty.y},{x:distant.x,y:distant.y});
});
test('a forty-wolf pile cannot add unbounded crowd displacement to movement',()=>{
 const pack=Array.from({length:40},(_,i)=>({...body(5000,3500),id:i+1})),frames=new Map(pack.map(e=>[e,{x:e.x,y:e.y,limit:75/60}]));
 separateCrowd(pack,ENEMIES,10800,7200);assert.ok(Math.max(...pack.map(e=>Math.hypot(e.x-5000,e.y-3500)))>50);
 boundWolfMotion(frames);for(const e of pack)assert.ok(Math.hypot(e.x-5000,e.y-3500)<=75/60+1e-8);
});
test('actual per-frame wolf speed stays bounded while a dense pack pursues a fleeing player at 30/60/120 FPS',t=>{
 for(const fps of [30,60,120]){
  const s=fresh();s.obstacles=[];for(let i=0;i<24;i++)wolf(s,s.player.x-330,s.player.y+(i%3));
  let maxMeasured=0,maxAllowed=0;
  for(let i=0;i<fps*8;i++){
   const before=new Map(s.enemies.filter(e=>e.type==='wolf').map(e=>[e,{x:e.x,y:e.y}]));step(s,1/fps,{x:1,y:0});
   for(const [e,p]of before){const measured=Math.hypot(e.x-p.x,e.y-p.y)*fps,allowed=e.speed*enemySpeedScale(s,'wolf');assert.ok(measured<=allowed+1e-5,measured+' > '+allowed);maxMeasured=Math.max(maxMeasured,measured);maxAllowed=Math.max(maxAllowed,allowed);}
  }
  t.diagnostic(JSON.stringify({fps,maxMeasured:Number(maxMeasured.toFixed(3)),configuredLimit:Number(maxAllowed.toFixed(3))}));
 }
});
test('a running hen gains distance from a normal wolf instead of dragging an orbit point behind her',()=>{
 const s=fresh();s.obstacles=[];const e=wolf(s,s.player.x-300,s.player.y),start=Math.hypot(s.player.x-e.x,s.player.y-e.y);
 for(let i=0;i<600;i++)step(s,1/60,{x:1,y:0});assert.ok(Math.hypot(s.player.x-e.x,s.player.y-e.y)>start+300);
});
test('obstacle avoidance does not pierce rocks or cause speed spikes',()=>{
 const s=fresh();s.player.x=5400;s.player.y=3500;s.obstacles=[{id:1,x:5200,y:3500,r:70}];const e=wolf(s,5000,3500),start=Math.hypot(e.x-s.player.x,e.y-s.player.y);
 for(let i=0;i<1200;i++){const old={x:e.x,y:e.y};step(s,1/60);assert.ok(Math.hypot(e.x-old.x,e.y-old.y)<=e.speed*enemySpeedScale(s,'wolf')/60+1e-6);assert.ok(Math.hypot(e.x-5200,e.y-3500)>=70+e.r-.001);}
 assert.ok(Math.hypot(e.x-s.player.x,e.y-s.player.y)<start-100);
});
test('rain puddles are sparse across the whole map and independent of the hen position',()=>{
 const a=fresh(),b=fresh();b.player.x=1000;b.player.y=1000;for(const s of [a,b]){queuePreviewEvent(s,'rain');step(s,1/60);}
 assert.deepEqual(a.worldEvents.puddles,b.worldEvents.puddles);const puddles=a.worldEvents.puddles;assert.equal(puddles.length,24);
 assert.equal(new Set(puddles.map(p=>(p.x>5400?1:0)+','+(p.y>3600?1:0))).size,4);
 assert.ok(puddles.filter(p=>Math.hypot(p.x-a.player.x,p.y-a.player.y)>1000).length>=20);
 assert.ok(puddles.reduce((sum,p)=>sum+Math.PI*p.r*p.r,0)/(10800*7200)<.02);
 for(const p of puddles)assert.ok(!a.obstacles.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<p.r+o.r-.001));
});
test('rain ramps in, lowers the shared budget, limits births per frame and focuses on birds',()=>{
 const s=fresh();s.time=180;s.testFlags.noSpawns=false;s.spawnCredit=1000;queuePreviewEvent(s,'rain');step(s,1/60);const start=eventBudgetScale(s);assert.ok(start<.3);
 let maxBirths=0,lateBirds=0,lateOther=0;
 for(let i=0;i<60*59;i++){const id=s.enemyId;step(s,1/60);const born=s.enemies.filter(e=>e.id>id&&!ENEMIES[e.type].isBoss);maxBirths=Math.max(maxBirths,born.length);if(i>60*15)for(const e of born){if(e.type==='duck'||e.type==='goose')lateBirds++;else lateOther++;}}
 assert.ok(maxBirths<=1);assert.ok(lateBirds>10);assert.ok(lateBirds/(lateBirds+lateOther)>.9);assert.ok(eventBudgetScale(s)<=.75);
});
test('hunting gradually replaces the normal stream without a first-frame army or credit backlog',()=>{
 const s=fresh();s.testFlags.noSpawns=false;setNight(s);s.spawnCredit=10000;queuePreviewEvent(s,'hunt');step(s,1/60);assert.equal(s.enemies.length,0);assert.equal(s.spawnCredit,0);assert.equal(eventBudgetScale(s),0);
 let maxBorn=0;for(let i=0;i<60*59;i++){const id=s.enemyId;step(s,1/60);const born=s.enemies.filter(e=>e.id>id);maxBorn=Math.max(maxBorn,born.length);for(const e of born){assert.ok(e.eventHunt);assert.ok(e.type==='wolf'||e.type==='fox');assert.ok(Math.abs(e.x-s.player.x)>s.spawnView.width*.5||Math.abs(e.y-s.player.y)>s.spawnView.height*.5);}}
 assert.ok(maxBorn<=2);assert.equal(s.stats.killsByType.rat,0);assert.equal(s.enemies.filter(e=>e.type==='wolf').length,40);assert.equal(s.enemies.filter(e=>e.type==='fox').length,12);
});
test('outside-zone nuclear discharge is gradual, bounded at zero and resumes on return',()=>{
 const s=fresh();setNight(s);queuePreviewEvent(s,'nuclear');step(s,1/60);const b=s.worldEvents.nuclear;b.charge=20;s.player.x=b.x+300;s.player.y=b.y;for(let i=0;i<120;i++)step(s,1/60);assert.ok(Math.abs(b.charge-16)<1e-6);s.player.x=b.x;for(let i=0;i<60;i++)step(s,1/60);assert.ok(Math.abs(b.charge-17)<1e-6);s.player.x=b.x+300;for(let i=0;i<600;i++)step(s,1/60);assert.equal(b.charge,0);assert.equal(b.status,'landed');
});

