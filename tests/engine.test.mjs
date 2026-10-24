import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,choicePool,rollChoices,choose,evolve,reroll,damagePlayer,spawnEnemy,weaponStats,passiveMultiplier} from '../engine.js';
const weapon=(level=1,effect=null)=>({level,effect,cd:0,volley:0,ammo:20,reload:0});
function stationaryTarget(s,x=700,y=400,hp=100000){const e=spawnEnemy(s,'bear');Object.assign(e,{x,y,hp,maxHp:hp,speed:0});s.spawnTimer=10000;return e;}
test('character stats, exclusive weapon and three slots',()=>{const s=createGame();assert.equal(s.player.hp,3);assert(!choicePool(s).some(c=>c.id==='ak'));s.weapons={egg:weapon(),beak:weapon(),feather:weapon()};assert(choicePool(s).filter(c=>c.kind==='weapon').every(c=>s.weapons[c.id]));const r=createGame('rambo');assert.equal(r.player.hp,2);assert(r.weapons.ak);r.weapons={ak:weapon(),egg:weapon(),beak:weapon()};assert(!choicePool(r).some(c=>c.id==='feather'));});
test('three distinct choices and finite test wallet',()=>{const s=createGame();s.mode='upgrade';rollChoices(s);assert.equal(new Set(s.choices.map(c=>c.id)).size,3);for(let i=0;i<10;i++)assert(reroll(s));assert.equal(s.ge,0);assert.equal(reroll(s),false);});
test('level five pauses for evolution then removes weapon from pool',()=>{const s=createGame();s.weapons.egg=weapon(4);s.mode='upgrade';s.pending=1;s.choices=[{kind:'weapon',id:'egg'}];choose(s,0);assert.equal(s.mode,'evolution');assert.equal(s.weapons.egg.level,5);assert(!evolve(s,'invalid'));assert(evolve(s,'gold'));assert.equal(s.mode,'playing');assert(!choicePool(s).some(c=>c.id==='egg'));});
test('damage is one with half-second invulnerability, pause freezes timer',()=>{const s=createGame();damagePlayer(s);damagePlayer(s);assert.equal(s.player.hp,2);s.spawnTimer=100;step(s,.51);damagePlayer(s);assert.equal(s.player.hp,1);s.mode='paused';const t=s.time;step(s,10);assert.equal(s.time,t);});
test('max health upgrade also heals exactly one',()=>{const s=createGame();s.player.hp=1;s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'health'}];choose(s,0);assert.equal(s.player.hp,2);assert.equal(s.player.maxHp,4);});
test('third entire volley is golden, extra projectiles included',()=>{const s=createGame();stationaryTarget(s);s.weapons.egg=weapon(5,'gold');s.passives.shots=2;for(let i=1;i<=3;i++){s.bullets=[];s.weapons.egg.cd=0;step(s,.001);assert.equal(s.bullets.length,8);assert(s.bullets.every(b=>b.gold===(i===3)));}assert(s.bullets.every(b=>b.pierce===Infinity));});
test('AK magazine reload takes 3.5 seconds; belt bypasses reload',()=>{const s=createGame('rambo');stationaryTarget(s);s.weapons.ak=weapon();for(let i=0;i<20;i++){s.weapons.ak.cd=0;step(s,.001);}assert.equal(s.weapons.ak.ammo,0);assert.equal(s.weapons.ak.reload,3.5);step(s,3.49);assert(s.weapons.ak.reload>0);step(s,.02);assert.equal(s.weapons.ak.ammo,20);assert.equal(s.weapons.ak.reload,0);s.weapons.ak=weapon(5,'belt');for(let i=0;i<25;i++){s.weapons.ak.cd=0;step(s,.001);}assert.equal(s.weapons.ak.reload,0);});
test('super beak creates exactly one attack, scales with projectile count',()=>{const s=createGame();stationaryTarget(s);s.weapons={beak:weapon(5,'super')};s.passives.shots=4;step(s,.001);assert.equal(s.fx.filter(f=>f.type==='stab').length,1);assert(s.fx[0].r>200);});
test('squirrel does not contact damage and fires ranged acorns',()=>{const s=createGame();s.spawnTimer=100;const e=spawnEnemy(s,'squirrel');Object.assign(e,{x:s.player.x,y:s.player.y,shot:10});step(s,.01);assert.equal(s.player.hp,3);e.x=800;e.shot=0;step(s,.01);assert.equal(s.acorns.length,1);});
test('worm heals at most max HP and remains when full',()=>{const s=createGame();s.spawnTimer=100;s.worms=[{x:s.player.x,y:s.player.y}];step(s,.01);assert.equal(s.worms.length,1);s.player.hp=2;step(s,.01);assert.equal(s.player.hp,3);assert.equal(s.worms.length,0);});
test('600-second threshold marks success and doubles kill score',()=>{const s=createGame();s.time=599.99;s.spawnTimer=100;step(s,.02);assert(s.bonus);const e=stationaryTarget(s,610,400,1);s.weapons={beak:weapon()};step(s,.001);assert.equal(s.kills,1);assert.equal(s.score,200);assert(e.hp<=0);});
test('experience overflow queues all level choices',()=>{const s=createGame();s.spawnTimer=100;s.gems=[{x:s.player.x,y:s.player.y,value:100}];step(s,.01);assert.equal(s.mode,'upgrade');assert(s.pending>1);const n=s.pending;s.choices=[{kind:'passive',id:'damage'}];choose(s,0);assert.equal(s.pending,n-1);assert.equal(s.mode,'upgrade');});
test('death ends immediately and cannot collect healing afterwards',()=>{const s=createGame();s.player.hp=1;s.spawnTimer=100;s.worms=[{x:s.player.x,y:s.player.y}];const e=spawnEnemy(s,'rat');Object.assign(e,{x:s.player.x,y:s.player.y});step(s,.01);assert.equal(s.mode,'ended');assert.equal(s.player.hp,0);});

test('passives compound instead of adding percentages',()=>{
  const s=createGame();s.passives.damage=3;s.passives.speed=2;s.passives.haste=3;s.passives.magnet=2;
  assert(Math.abs(weaponStats(s,'egg').damage-13*1.15**3)<1e-9);
  assert(Math.abs(weaponStats(s,'egg').interval-.9/1.12**3)<1e-9);
  assert(Math.abs(passiveMultiplier(s,'magnet')-1.3**2)<1e-9);
  s.spawnTimer=100;const x=s.player.x;step(s,.1,{x:1,y:0});assert(Math.abs(s.player.x-x-14*1.1**2)<1e-9);
});

test('all four weapons improve damage, attack rate, size and count on every tier',()=>{
  const s=createGame('rambo');
  for(const id of ['egg','beak','feather','ak'])for(let level=2;level<=5;level++){
    const before=weaponStats(s,id,weapon(level-1)),after=weaponStats(s,id,weapon(level));
    assert(after.damage>before.damage,id);assert(after.interval<before.interval,id);
    assert(after.size>before.size,id);assert(after.count>before.count,id);
  }
});

test('projectile count compounds before integer rounding, health preserves lost HP',()=>{
  const s=createGame();s.passives.shots=3;assert.equal(weaponStats(s,'feather',weapon()).count,Math.ceil(5*1.25**3));
  s.player.hp=1;for(let i=0;i<3;i++){s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'health'}];choose(s,0);}
  assert.equal(s.player.maxHp,Math.ceil(3*1.25**3));assert.equal(s.player.maxHp-s.player.hp,2);
});

test('size changes the actual collision radius, not just projectile artwork',()=>{
  const s=createGame();s.spawnTimer=100;s.weapons.egg.cd=0;s.passives.size=3;stationaryTarget(s,900,400);
  step(s,.001);assert(Math.abs(s.bullets[0].r-6*1.2**3)<1e-9);
  s.weapons={beak:weapon()};s.fx=[];s.passives.size=1;stationaryTarget(s,770,400,100);
  step(s,.001);assert(s.fx.some(f=>f.type==='stab'&&f.r===145*1.2));
  assert(s.enemies.some(e=>e.x===770&&e.hp<100));
});

test('level selection grants one-third second guard and small outward push, only on resume',()=>{
  const s=createGame();const e=stationaryTarget(s,620,400);s.mode='upgrade';s.pending=2;s.choices=[{kind:'passive',id:'damage'}];
  choose(s,0);assert.equal(s.mode,'upgrade');assert.equal(s.player.inv,0);assert.equal(e.x,620);
  s.choices=[{kind:'passive',id:'damage'}];choose(s,0);assert.equal(s.player.inv,1/3);assert(e.x>620&&e.x<=644);
  const hp=s.player.hp;damagePlayer(s);assert.equal(s.player.hp,hp);s.spawnTimer=100;step(s,.34);damagePlayer(s);assert.equal(s.player.hp,hp-1);
});

test('evolution guard preserves longer hit invulnerability and handles coincident enemies',()=>{
  const s=createGame();stationaryTarget(s,600,400);s.weapons.egg=weapon(4);s.mode='upgrade';s.pending=1;s.choices=[{kind:'weapon',id:'egg'}];choose(s,0);
  assert.equal(s.player.inv,0);s.player.inv=.5;evolve(s,'gold');assert.equal(s.player.inv,.5);
  assert(Number.isFinite(s.enemies[0].x));assert(Math.hypot(s.enemies[0].x-600,s.enemies[0].y-400)>0);
});

test('magnet attracts existing XP across the yard but not future drops',()=>{
  const s=createGame();s.spawnTimer=100;s.gems=[{x:80,y:80,value:2},{x:1100,y:720,value:3}];s.magnets=[{x:600,y:400}];
  step(s,.01);assert.equal(s.magnets.length,0);assert(s.gems.every(g=>g.magnetized));
  s.gems.push({x:100,y:100,value:1});step(s,.01);assert(!s.gems.at(-1).magnetized);
});

test('experience multiplier applies once on collection and also to magnetized XP',()=>{
  const s=createGame();s.spawnTimer=100;s.need=10000;s.passives.experience=2;s.gems=[{x:600,y:400,value:10,magnetized:true}];
  step(s,.01);assert(Math.abs(s.xp-10*1.15**2)<1e-9);step(s,.1);assert(Math.abs(s.xp-10*1.15**2)<1e-9);
});

test('worm and magnet drops have independent 0.5 percent rolls',()=>{
  const s=createGame();s.weapons={beak:weapon()};stationaryTarget(s,610,400,1);
  let rolls=[.9,.004];s.random=()=>rolls.shift()??.9;step(s,.001);assert.equal(s.magnets.length,0); // immediately picked up
  assert(s.events.includes('magnet'));assert.equal(s.worms.length,0);
  const r=createGame();r.weapons={beak:weapon()};stationaryTarget(r,700,400,1);rolls=[.004,.9];r.random=()=>rolls.shift()??.9;
  step(r,.001);assert.equal(r.worms.length,1);assert.equal(r.magnets.length,0);
});

test('opening spawns more slow enemies and squirrels fire slower acorns',()=>{
  const s=createGame();s.weapons={};s.gems=[];step(s,.41);assert.equal(s.enemies.length,2);assert(s.enemies.every(e=>e.speed<44));
  const r=createGame();r.spawnTimer=100;r.weapons={};const e=spawnEnemy(r,'squirrel');Object.assign(e,{x:850,y:400,shot:0});step(r,.01);
  assert.equal(e.shot,3.8);assert(Math.abs(Math.hypot(r.acorns[0].vx,r.acorns[0].vy)-125)<1e-9);
  step(r,2.4);assert.equal(r.acorns.length,1);
});
