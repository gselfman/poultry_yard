import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,spawnEnemy,step,ENEMIES,TUNING,labDefeat,progressionTime,damagePlayer} from '../client/engine.js';
import {createReplay,seededRandom,advanceReplay} from '../client/session-replay.js';
import {encode,decode} from '../client/checkpoint.js';
import {EVENT_RULES,configuredRules,setNight,queuePreviewEvent,eventSpawnProfile,playerWeatherScale,worldCombatSuppressed} from '../client/world-events.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
const quiet={rain:{chance:0},hunt:{chance:0},nuclear:{chance:0}};
function fresh(difficulty='hard',eventRules=quiet){const s=createGame('ryaba',seededRandom(23),{difficulty,eventRules});s.testFlags={invincible:true,noSpawns:true};s.ambientTimer=1e9;s.gems=[];s.weapons={};return s;}
const spawn=(s,type)=>spawnEnemy(s,type,{force:true});
function seconds(s,n,input={x:0,y:0}){for(let i=0;i<Math.round(n*60);i++)step(s,1/60,input);}
function bomb(s){setNight(s);queuePreviewEvent(s,'nuclear');step(s,1/60);return s.worldEvents.nuclear;}
test('easy keeps exact HP/speed reductions for every enemy, including bosses and wolves',()=>{
 for(const id of Object.keys(ENEMIES)){const a=spawn(fresh('easy'),id),b=spawn(fresh(),id);close(a.hp,b.hp*.9);close(a.speed,b.speed*(id==='wolf'?.83:.9));}
});
test('invalid difficulty and invalid event values are rejected',()=>{assert.throws(()=>fresh('unknown'));assert.throws(()=>configuredRules({rain:{chance:2}}));assert.throws(()=>configuredRules({hunt:{wolves:4.5}}));assert.throws(()=>configuredRules({night:{ratWeight:0,foxWeight:0,wolfWeight:0,bearWeight:0,gooseWeight:0}}));});
test('night starts only after actual guinea victory, never just elapsed time',()=>{
 const s=fresh();s.time=800;step(s,1/60);assert.equal(s.worldEvents.night,false);assert.equal(progressionTime(s),300);labDefeat(s,'guinea');assert.equal(s.worldEvents.night,true);const nightAt=s.worldEvents.nightStartedAt;seconds(s,2);assert.equal(s.worldEvents.nightStartedAt,nightAt);
});
test('night does not heal existing enemies or add a second blanket stat buff; new enemies use late curve',()=>{
 const s=fresh(),e=spawn(s,'wolf');e.hp*=.4;const hp=e.hp,speed=e.speed;labDefeat(s,'guinea');close(e.hp,hp);close(e.speed,speed);const late=spawn(s,'wolf');assert.ok(late.hp>ENEMIES.wolf.hp);close(s.eventRules.night.hp,1);close(s.eventRules.night.speed,1);
});
test('ordinary night profile restores foraging mice, excludes ducks/squirrels and keeps geese scarce',()=>{
 const s=fresh();setNight(s);const p=eventSpawnProfile(s,{weights:{rat:10,duck:4,squirrel:2},stage:'rat'});assert.ok(p.weights.rat>0);assert.equal(p.weights.duck,undefined);assert.equal(p.weights.squirrel,undefined);assert.ok(p.weights.goose<p.weights.wolf*.05);assert.ok(p.weights.fox>0&&p.weights.bear>0);
});
test('easy never runs events after guinea victory or test buttons',()=>{
 const s=fresh('easy');labDefeat(s,'guinea');for(const id of Object.keys(EVENT_RULES))assert.equal(queuePreviewEvent(s,id),false);seconds(s,2);assert.equal(s.worldEvents.night,false);assert.equal(s.worldEvents.nuclear,null);
});
test('chances are one roll per phase; rain is independent for day and night',()=>{
 const s=fresh('hard',{rain:{chance:1},hunt:{chance:1},nuclear:{chance:1}});assert.equal(s.worldEvents.rolls.dayRain,true);assert.ok(s.worldEvents.schedule.dayRain>0);setNight(s);assert.deepEqual(s.worldEvents.rolls,{dayRain:true,nightRain:true,hunt:true,nuclear:true});assert.equal(s.worldEvents.schedule.dayRain,null);const rng=s.random.getState();for(let i=0;i<10;i++)setNight(s);assert.equal(s.random.getState(),rng);close(s.worldEvents.nuclearDropAt,10);
});
test('zero probabilities never schedule rain, hunt or nuclear, even through long idle night',()=>{
 const s=fresh();setNight(s);seconds(s,180);assert.equal(s.worldEvents.rainUntil,0);assert.equal(s.worldEvents.huntUntil,0);assert.equal(s.worldEvents.nuclear,null);assert.deepEqual(s.worldEvents.rolls,{dayRain:false,nightRain:false,hunt:false,nuclear:false});
});
test('rain lasts a minute, strengthens puddles and switches waves to ducks/geese even at night',()=>{
 const s=fresh();setNight(s);queuePreviewEvent(s,'rain');step(s,1/60);const w=s.worldEvents;assert.equal(w.puddles.length,24);const p=w.puddles[0];s.player.x=p.x;s.player.y=p.y;close(playerWeatherScale(s),.6);seconds(s,13);const profile=eventSpawnProfile(s,{weights:{}});assert.ok(profile.weights.duck>profile.weights.wolf);assert.ok(profile.weights.goose>profile.weights.fox);seconds(s,46);assert.equal(s.weather,'rain');seconds(s,2);assert.equal(s.weather,'clear');assert.equal(w.puddles.length,0);
});
test('hunt cannot start by day',()=>{const s=fresh();queuePreviewEvent(s,'hunt');step(s,1/60);assert.equal(s.worldEvents.huntUntil,0);assert.ok(s.events.includes('event:night-required'));});
test('hunt gradually distributes 40 wolves around all sides, then introduces twelve foxes',()=>{
 const s=fresh();setNight(s);queuePreviewEvent(s,'hunt');step(s,1/60);assert.equal(s.enemies.length,0);seconds(s,12);const wolves=s.enemies.filter(e=>e.type==='wolf'&&e.eventHunt);assert.ok(wolves.length>=4&&wolves.length<=12);assert.equal(s.enemies.filter(e=>e.type==='fox').length,0);assert.equal(new Set(wolves.map(e=>(e.x>=s.player.x?1:0)+','+(e.y>=s.player.y?1:0))).size,4);seconds(s,12.2);assert.ok(s.enemies.some(e=>e.type==='fox'&&e.eventHunt));seconds(s,35.8);assert.equal(s.enemies.filter(e=>e.type==='wolf'&&e.eventHunt).length,40);assert.equal(s.enemies.filter(e=>e.type==='fox'&&e.eventHunt).length,12);
});
test('rain and hunt defer one another rather than merging two control waves',()=>{
 const s=fresh();setNight(s);queuePreviewEvent(s,'rain');queuePreviewEvent(s,'hunt');step(s,1/60);assert.equal(s.worldEvents.huntUntil,0);assert.ok(s.worldEvents.schedule.hunt>s.worldEvents.rainUntil);
});
test('natural nuclear rolls once at night and lands 10 seconds later, far away and on walkable terrain',()=>{
 const s=fresh('hard',{rain:{chance:0},hunt:{chance:0},nuclear:{chance:1}});labDefeat(s,'guinea');seconds(s,9);assert.equal(s.worldEvents.nuclear,null);seconds(s,1.1);const b=s.worldEvents.nuclear;assert.ok(b);assert.ok(Math.hypot(b.x-s.player.x,b.y-s.player.y)>=1100);assert.ok(!s.obstacles.some(o=>Math.hypot(o.x-b.x,o.y-b.y)<o.r+b.r-.1));assert.ok(s.events.includes('event:nuclear-landed'));
});
test('nuclear charges during movement inside the zone and discharges at twice the rate outside',()=>{
 const s=fresh(),b=bomb(s);seconds(s,1);close(b.charge,0);s.player.x=b.x;s.player.y=b.y;for(let i=0;i<600;i++)step(s,1/60,{x:i%120<60?.25:-.25,y:0});close(b.charge,10);s.player.x=b.x+200;seconds(s,2);close(b.charge,6);s.player.x=b.x;s.player.y=b.y;seconds(s,24.1);assert.equal(b.status,'armed');
});
test('armed charge waits 5 seconds, destroys ordinary enemies and halves max boss HP',()=>{
 const s=fresh(),b=bomb(s);s.player.x=b.x;s.player.y=b.y;seconds(s,30.1);const rat=spawn(s,'rat'),boss=spawn(s,'guinea'),hp=boss.maxHp;s.acorns.push({x:0,y:0,vx:0,vy:0,life:10});seconds(s,4);assert.ok(rat.hp>0);assert.equal(s.stats.environment.nuclearStrikes,0);seconds(s,1);assert.equal(s.stats.environment.nuclearStrikes,1);close(boss.hp,hp*.5);assert.equal(s.stats.killsByType.rat,1);assert.equal(s.acorns.length,0);assert.equal(b.status,'spent');
});
test('whiteout is three seconds and enemy/spawn/contact suppression lasts three more; upgrades wait',()=>{
 const s=fresh(),b=bomb(s);s.player.x=b.x;s.player.y=b.y;seconds(s,30.1);const boss=spawn(s,'guinea');boss.x=s.player.x+1600;boss.y=s.player.y;seconds(s,5);boss.x=s.player.x;boss.y=s.player.y;s.testFlags.invincible=false;const w=s.worldEvents;assert.ok(worldCombatSuppressed(s));close(w.suppressUntil-w.nuclearFlashUntil,3);const px=boss.x,hp=s.player.hp;assert.equal(spawn(s,'wolf'),null);s.player.inv=0;damagePlayer(s);close(s.player.hp,hp);s.pending=1;seconds(s,2);assert.equal(s.mode,'playing');assert.ok(w.nuclearFlashUntil>s.time);close(boss.x,px);seconds(s,1.2);assert.ok(w.nuclearFlashUntil<s.time);assert.ok(worldCombatSuppressed(s));seconds(s,3);assert.equal(worldCombatSuppressed(s),false);assert.equal(s.mode,'upgrade');
});
test('all event timers and charging stop on pause and choice screens',()=>{
 const s=fresh(),b=bomb(s);s.player.x=b.x;s.player.y=b.y;seconds(s,1);for(const mode of ['paused','upgrade','evolution','revive','victory','ended']){s.mode=mode;const before=JSON.stringify(s.worldEvents),t=s.time;step(s,100);assert.equal(s.time,t);assert.equal(JSON.stringify(s.worldEvents),before);}
});
test('checkpoint restore preserves phase, schedules, charge, RNG and timed effects',()=>{
 const rules={rain:{chance:1,duration:15},hunt:{chance:1,wolves:8,foxes:4,duration:20,foxDelay:8},nuclear:{chance:1,charge:2,fuse:1}};
 let a=createReplay({seed:951,eventRules:rules}),b=createReplay({seed:951,eventRules:rules});
 for(const run of [a,b]){run.state.testFlags={invincible:true,noSpawns:true};run.state.ambientTimer=1e9;run.state.gems=[];run.state.bossEvents.guinea='dead';}
 for(let i=0;i<15000;i++){for(const run of [a,b]){const n=run.state.worldEvents.nuclear;if(n?.status==='landed'){run.state.player.x=n.x;run.state.player.y=n.y;}advanceReplay(run,run.tick+1);if(run.state.mode==='upgrade'){run.state.mode='playing';run.state.pending=0;}}if(i===650)b=decode(encode(b));}
 assert.deepEqual(encode(a),encode(b));assert.equal(a.state.stats.environment.nuclearStrikes,1);
});
