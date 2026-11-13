import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,spawnEnemy,step,ENEMIES,choose,evolve,WEAPONS} from '../client/engine.js';
import {createGame as baseGame,spawnEnemy as baseSpawn,step as baseStep} from '../../../releases/2026-11-12/client/engine.js';
import {createReplay,seededRandom,advanceReplay} from '../client/session-replay.js';
import {encode,decode} from '../client/checkpoint.js';
import {setNight,queuePreviewEvent,playerWeatherScale,EVENT_RULES} from '../client/world-events.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const fresh=difficulty=>createGame('ryaba',seededRandom(23),{difficulty});
test('all enemy HP and movement scales, including both bosses; wolf is exactly 83%',()=>{
 for(const type of Object.keys(ENEMIES)){
  const easy=fresh('easy'),hard=fresh('hard'),a=spawnEnemy(easy,type),b=spawnEnemy(hard,type);
  close(a.hp,b.hp*.9);close(a.maxHp,b.maxHp*.9);close(a.speed,b.speed*(type==='wolf'?.83:.9));
 }
});
test('unknown difficulties are rejected at game and replay creation',()=>{
 assert.throws(()=>fresh('cheat'));assert.throws(()=>createReplay({seed:1,difficulty:'cheat'}));
});
test('hard mode preserves old daytime simulation and RNG until first event',()=>{
 const a=fresh('hard'),b=baseGame('ryaba',seededRandom(23));a.player.inv=b.player.inv=9999;
 for(let i=0;i<1200;i++){step(a,1/60,{x:1,y:0});baseStep(b,1/60,{x:1,y:0});if(a.mode==='upgrade'){assert.equal(b.mode,'upgrade');break;}}
 assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.gems,b.gems);assert.deepEqual(a.player,b.player);assert.equal(a.random.getState(),b.random.getState());
 for(const type of Object.keys(ENEMIES)){const x=fresh('hard'),y=baseGame('ryaba',seededRandom(23));assert.deepEqual(spawnEnemy(x,type),baseSpawn(y,type));}
});
test('night buffs existing and newly spawned enemies once; dawn preserves damage ratio',()=>{
 const s=fresh('hard'),e=spawnEnemy(s,'turkey'),hp=e.hp,speed=e.speed;e.hp*=.4;
 setNight(s,true);close(e.hp,hp*.4*1.1);close(e.maxHp,hp*1.1);close(e.speed,speed*1.1);
 setNight(s,true);close(e.maxHp,hp*1.1);const wolf=spawnEnemy(s,'wolf'),plain=spawnEnemy(fresh('hard'),'wolf');close(wolf.speed,plain.speed*1.1);close(wolf.hp,plain.hp*1.1);
 e.hp-=10;const ratio=e.hp/e.maxHp;setNight(s,false);close(e.maxHp,hp);close(e.hp/e.maxHp,ratio);close(e.speed,speed);
});
test('easy cannot activate any events, even explicitly queued QA events',()=>{
 const s=fresh('easy');for(const id of Object.keys(EVENT_RULES))assert.equal(queuePreviewEvent(s,id),false);setNight(s,true);s.time=EVENT_RULES.night.first;step(s,1/60);assert.equal(s.worldEvents.night,false);assert.equal(s.worldEvents.puddles.length,0);assert.equal(s.worldEvents.huntUntil,0);assert.equal(s.worldEvents.nuclearAt,0);
});
test('boss charge movement obeys both difficulty and night modifiers',()=>{
 const travel=(difficulty,night=false)=>{const s=fresh(difficulty);s.obstacles=[];s.spawnTimer=999;const e=spawnEnemy(s,'guinea');e.x=s.player.x-600;e.y=s.player.y;e.attack={kind:'charge',angle:0,speed:200,elapsed:0,windup:0,active:1,recovery:1,width:10,hitPulses:new Set()};if(night){setNight(s,true);s.worldEvents.nightUntil=100;}const x=e.x;step(s,.05);return e.x-x;};
 const hard=travel('hard');close(travel('easy'),hard*.9);close(travel('hard',true),hard*1.1);
});
test('rain creates deterministic puddles, slows inside only, then clears; existing healing drop boost applies',()=>{
 const s=fresh('hard');s.player.inv=999;queuePreviewEvent(s,'rain');step(s,1/60);assert.equal(s.worldEvents.puddles.length,9);assert.equal(s.weather,'rain');assert.equal(playerWeatherScale(s),1);const p=s.worldEvents.puddles[0];s.player.x=p.x;s.player.y=p.y;assert.equal(playerWeatherScale(s),.85);s.time=s.worldEvents.rainUntil;step(s,1/60);assert.equal(s.weather,'clear');assert.equal(playerWeatherScale(s),1);
});
test('hunt arrives with warning and six paced wolves, without buffing their normal stats',()=>{
 const s=fresh('hard');s.worldEvents.next.night=s.worldEvents.next.rain=s.worldEvents.next.nuclear=Infinity;s.time=EVENT_RULES.hunt.first-5;step(s,1/60);assert.ok(s.events.includes('event:hunt-warning'));s.time=EVENT_RULES.hunt.first;step(s,1/60);const first=s.enemies.find(e=>e.eventPack);assert.ok(first);close(first.speed,spawnEnemy(fresh('hard'),'wolf').speed);for(let i=0;i<5;i++){s.time=s.worldEvents.huntNext;step(s,1/60);}assert.equal(s.enemies.filter(e=>e.eventPack).length,6);assert.equal(s.worldEvents.huntRemaining,0);
});
test('nuclear support warns, kills ordinary enemies with normal drops, damages bosses but never kills them',()=>{
 const s=fresh('hard');s.player.inv=999;const rat=spawnEnemy(s,'rat'),boss=spawnEnemy(s,'guinea');const hp=boss.hp;queuePreviewEvent(s,'nuclear');step(s,1/60);assert.ok(rat.hp>0);assert.equal(s.stats.environment.nuclearStrikes,0);s.time=s.worldEvents.nuclearAt;step(s,1/60);assert.equal(rat.hp,0);close(boss.hp,hp*.75);assert.equal(s.stats.killsByType.rat,1);assert.equal(s.stats.environment.nuclearStrikes,1);assert.ok(s.gems.length>0);boss.hp=2;queuePreviewEvent(s,'nuclear');step(s,1/60);s.time=s.worldEvents.nuclearAt;step(s,1/60);close(boss.hp,1);
});
test('pause/upgrade stop all event clocks and queued effects',()=>{
 const s=fresh('hard');queuePreviewEvent(s,'nuclear');step(s,1/60);for(const mode of ['paused','upgrade','evolution','revive','victory','ended']){s.mode=mode;const before=JSON.stringify(s.worldEvents),time=s.time;step(s,10);assert.equal(s.time,time);assert.equal(JSON.stringify(s.worldEvents),before);}
});
function tick(run){const s=run.state;s.player.inv=999;advanceReplay(run,run.tick+1);if(s.mode==='upgrade')choose(s,0);if(s.mode==='evolution')evolve(s,WEAPONS[s.evolving].effects[0][0]);}
test('checkpoint restore keeps difficulty, timed events and RNG deterministic through multiple event cycles',()=>{
 let a=createReplay({seed:951,difficulty:'hard'}),b=createReplay({seed:951,difficulty:'hard'});a.input=b.input={x:.6,y:.2};for(const run of [a,b]){run.state.spawnTimer=1e9;run.state.ambientTimer=1e9;run.state.gems=[];}
 for(let i=0;i<24000;i++){tick(a);tick(b);if(i===10000)b=decode(encode(b));}
 assert.deepEqual(encode(a),encode(b));assert.ok(a.state.stats.environment.nuclearStrikes>=2);assert.ok(a.state.stats.environment.hunts>=2);
});
