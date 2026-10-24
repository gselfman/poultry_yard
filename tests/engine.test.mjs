import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,choicePool,rollChoices,choose,evolve,reroll,damagePlayer,spawnEnemy,weaponStats,passiveMultiplier,playerStats,revive,declineRevive,spawnProfile,enemyCost} from '../engine.js';
const weapon=(level=1,effect=null)=>({level,effect,cd:0,volley:0,ammo:20,reload:0});
function stationaryTarget(s,x=700,y=400,hp=100000){const e=spawnEnemy(s,'bear');Object.assign(e,{x,y,hp,maxHp:hp,speed:0});s.spawnTimer=10000;return e;}
test('character stats, exclusive weapon and three slots',()=>{const s=createGame();assert.equal(s.player.hp,3);assert(!choicePool(s).some(c=>c.id==='ak'));s.weapons={egg:weapon(),beak:weapon(),feather:weapon()};assert(choicePool(s).filter(c=>c.kind==='weapon').every(c=>s.weapons[c.id]));const r=createGame('rambo');assert.equal(r.player.hp,2);assert(r.weapons.ak);r.weapons={ak:weapon(),egg:weapon(),beak:weapon()};assert(!choicePool(r).some(c=>c.id==='feather'));});
test('three distinct choices and finite test wallet',()=>{const s=createGame();s.mode='upgrade';rollChoices(s);assert.equal(new Set(s.choices.map(c=>c.id)).size,3);for(let i=0;i<10;i++)assert(reroll(s));assert.equal(s.ge,0);assert.equal(reroll(s),false);});
test('level five pauses for evolution then removes weapon from pool',()=>{const s=createGame();s.weapons.egg=weapon(4);s.mode='upgrade';s.pending=1;s.choices=[{kind:'weapon',id:'egg'}];choose(s,0);assert.equal(s.mode,'evolution');assert.equal(s.weapons.egg.level,5);assert(!evolve(s,'invalid'));assert(evolve(s,'gold'));assert.equal(s.mode,'playing');assert(!choicePool(s).some(c=>c.id==='egg'));});
test('damage is one with half-second invulnerability, pause freezes timer',()=>{const s=createGame();damagePlayer(s);damagePlayer(s);assert.equal(s.player.hp,2);s.spawnTimer=100;step(s,.51);damagePlayer(s);assert.equal(s.player.hp,1);s.mode='paused';const t=s.time;step(s,10);assert.equal(s.time,t);});
test('max health upgrade also heals exactly one',()=>{const s=createGame();s.player.hp=1;s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'health'}];choose(s,0);assert.equal(s.player.hp,2);assert.equal(s.player.maxHp,4);});
test('third entire volley is golden, extra projectiles included',()=>{const s=createGame();stationaryTarget(s);s.weapons.egg=weapon(5,'gold');s.passives.shots=2;for(let i=1;i<=3;i++){s.bullets=[];s.weapons.egg.cd=0;step(s,.001);assert.equal(s.bullets.length,5);assert(s.bullets.every(b=>b.gold===(i===3)));}assert(s.bullets.every(b=>b.pierce===Infinity));});
test('AK magazine reload takes 3.5 seconds; belt bypasses reload',()=>{const s=createGame('rambo');stationaryTarget(s);s.weapons.ak=weapon();for(let i=0;i<20;i++){s.weapons.ak.cd=0;step(s,.001);}assert.equal(s.weapons.ak.ammo,0);assert.equal(s.weapons.ak.reload,3.5);step(s,3.49);assert(s.weapons.ak.reload>0);step(s,.02);assert.equal(s.weapons.ak.ammo,20);assert.equal(s.weapons.ak.reload,0);s.weapons.ak=weapon(5,'belt');for(let i=0;i<25;i++){s.weapons.ak.cd=0;step(s,.001);}assert.equal(s.weapons.ak.reload,0);});
test('super beak creates exactly one attack, scales with projectile count',()=>{const s=createGame();stationaryTarget(s);s.weapons={beak:weapon(5,'super')};s.passives.shots=4;step(s,.001);assert.equal(s.attacks.filter(f=>f.type==='beak').length,1);assert(s.attacks[0].r>200);});
test('squirrel does not contact damage and fires ranged acorns',()=>{const s=createGame();s.spawnTimer=100;const e=spawnEnemy(s,'squirrel');Object.assign(e,{x:s.player.x,y:s.player.y,shot:10});step(s,.01);assert.equal(s.player.hp,3);e.x=800;e.shot=0;step(s,.01);assert.equal(s.acorns.length,1);});
test('worm heals at most max HP and remains when full',()=>{const s=createGame();s.spawnTimer=100;s.worms=[{x:s.player.x,y:s.player.y}];step(s,.01);assert.equal(s.worms.length,1);s.player.hp=2;step(s,.01);assert.equal(s.player.hp,3);assert.equal(s.worms.length,0);});
test('600-second threshold marks success and doubles kill score',()=>{const s=createGame();s.time=599.99;s.spawnTimer=100;step(s,.02);assert(s.bonus);const e=stationaryTarget(s,610,400,1);s.weapons={beak:weapon()};step(s,.15);assert.equal(s.kills,1);assert.equal(s.score,200);assert(e.hp<=0);});
test('experience overflow queues all level choices',()=>{const s=createGame();s.spawnTimer=100;s.gems=[{x:s.player.x,y:s.player.y,value:100}];step(s,.01);assert.equal(s.mode,'upgrade');assert(s.pending>1);const n=s.pending;s.choices=[{kind:'passive',id:'damage'}];choose(s,0);assert.equal(s.pending,n-1);assert.equal(s.mode,'upgrade');});
test('death freezes combat and offers revival without collecting healing',()=>{const s=createGame();s.player.hp=1;s.spawnTimer=100;s.worms=[{x:s.player.x,y:s.player.y}];const e=spawnEnemy(s,'rat');Object.assign(e,{x:s.player.x,y:s.player.y});step(s,.01);assert.equal(s.mode,'revive');assert.equal(s.player.hp,0);});

test('passives add small bonuses without compounding',()=>{
  const s=createGame();s.passives.damage=3;s.passives.speed=2;s.passives.haste=3;s.passives.magnet=2;
  assert(Math.abs(weaponStats(s,'egg').damage-13*(1+.10*3))<1e-9);
  assert(Math.abs(weaponStats(s,'egg').interval-.9/(1+.08*3))<1e-9);
  assert(playerStats(s).pickup===48+20*2);
  s.spawnTimer=100;const x=s.player.x;step(s,.1,{x:1,y:0});assert(Math.abs(s.player.x-x-12.6*(1+.12*2))<1e-9);
});

test('weapon upgrades add damage, rate and size each tier; projectiles at tiers 3 and 5',()=>{
  const s=createGame('rambo');
  for(const id of ['egg','beak','feather','ak'])for(let level=2;level<=5;level++){
    const before=weaponStats(s,id,weapon(level-1)),after=weaponStats(s,id,weapon(level));
    assert(after.damage>before.damage,id);assert(after.interval<before.interval,id);
    assert(after.size>before.size,id);assert.equal(after.count-before.count,[3,5].includes(level)?1:0,id);
  }
});

test('projectiles and HP grow by fixed integers, health preserves lost HP',()=>{
  const s=createGame();s.passives.shots=3;assert.equal(weaponStats(s,'feather',weapon()).count,8);
  s.player.hp=1;for(let i=0;i<3;i++){s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'health'}];choose(s,0);}
  assert.equal(s.player.maxHp,6);assert.equal(s.player.maxHp-s.player.hp,2);
});

test('size changes the actual collision radius, not just projectile artwork',()=>{
  const s=createGame();s.spawnTimer=100;s.weapons.egg.cd=0;s.passives.size=3;stationaryTarget(s,900,400);
  step(s,.001);assert(Math.abs(s.bullets[0].r-6*(1+.10*3))<1e-9);
  s.weapons={beak:weapon()};s.fx=[];s.passives.size=1;stationaryTarget(s,730,400,100);
  step(s,.15);assert(s.attacks.some(f=>f.type==='beak'&&Math.abs(f.r-122*1.1)<1e-9));
  assert(s.enemies.some(e=>e.x===730&&e.hp<100));
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
  step(s,.01);assert(Math.abs(s.xp-10*1.16)<1e-9);step(s,.1);assert(Math.abs(s.xp-10*1.16)<1e-9);
});

test('worm and magnet drops have independent 0.5 percent rolls',()=>{
  const s=createGame();s.weapons={beak:weapon()};stationaryTarget(s,610,400,1);
  let rolls=[.9,.004];s.random=()=>rolls.shift()??.9;step(s,.15);assert.equal(s.magnets.length,0); // immediately picked up
  assert(s.events.includes('magnet'));assert.equal(s.worms.length,0);
  const r=createGame();r.weapons={beak:weapon()};stationaryTarget(r,700,400,1);rolls=[.004,.9];r.random=()=>rolls.shift()??.9;
  step(r,.15);assert.equal(r.worms.length,1);assert.equal(r.magnets.length,0);
});

test('opening spawns more slow enemies and squirrels fire slower acorns',()=>{
  const s=createGame();s.weapons={};s.gems=[];step(s,.41);assert.equal(s.enemies.length,1);assert(s.enemies.every(e=>e.speed<44));
  const r=createGame();r.spawnTimer=100;r.weapons={};const e=spawnEnemy(r,'squirrel');Object.assign(e,{x:850,y:400,shot:0});step(r,.01);
  assert.equal(e.shot,3.8);assert(Math.abs(Math.hypot(r.acorns[0].vx,r.acorns[0].vy)-112.5)<1e-9);
  step(r,2.4);assert.equal(r.acorns.length,1);
});

test('AK levels increase magazine capacity and refills use upgraded capacity',()=>{
  const s=createGame('rambo');stationaryTarget(s);s.mode='upgrade';s.pending=1;s.choices=[{kind:'weapon',id:'ak'}];choose(s,0);
  assert.equal(weaponStats(s,'ak').magazine,25);assert.equal(s.weapons.ak.ammo,25);
  s.weapons.ak.reload=.01;s.weapons.ak.ammo=0;step(s,.02);assert.equal(s.weapons.ak.ammo,25);
  assert.equal(weaponStats(s,'ak',weapon(5)).magazine,40);
});

test('attack speed shortens reload including an active reload proportionally',()=>{
  const s=createGame('rambo');s.weapons.ak.reload=1.75;s.weapons.ak.ammo=0;s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'haste'}];choose(s,0);
  assert(Math.abs(s.weapons.ak.reload-1.75/1.08)<1e-9);
  assert(Math.abs(weaponStats(s,'ak').reload-3.5/1.08)<1e-9);
  s.weapons.ak.level=4;assert(Math.abs(weaponStats(s,'ak').reload-3.5/1.20)<1e-9);
});

test('weapon upgrades and global damage bonuses sum against base damage',()=>{
  const s=createGame();s.passives.damage=5;s.passives.size=5;s.passives.experience=5;
  const v=weaponStats(s,'egg',weapon(5));assert(Math.abs(v.damage-13*2.1)<1e-9);assert(Math.abs(v.size-1.7)<1e-9);
  assert.equal(passiveMultiplier(s,'experience'),1.4);
});

test('statistics count effective damage once, by weapon and enemy type',()=>{
  const s=createGame();s.weapons={beak:weapon()};stationaryTarget(s,610,400,7);step(s,.15);
  assert.equal(s.stats.damageDealt,7);assert.equal(s.stats.weapons.beak.damage,7);assert.equal(s.stats.weapons.beak.kills,1);
  assert.equal(s.stats.weapons.beak.attacks,1);assert.equal(s.stats.killsByType.bear,1);
  assert.equal(s.stats.damageDealt,Object.values(s.stats.weapons).reduce((sum,w)=>sum+w.damage,0));
});

test('statistics track experience, damage taken and healing pickups',()=>{
  const s=createGame();s.spawnTimer=100;damagePlayer(s);s.gems=[{x:600,y:400,value:5}];s.worms=[{x:600,y:400}];step(s,.01);
  assert.equal(s.stats.damageTaken,1);assert.equal(s.stats.healed,1);assert.equal(s.stats.totalXp,5);assert.equal(s.stats.gems,1);
});

test('revival costs 20 GE once, restores HP, preserves build and grants protection',()=>{
 const s=createGame('monk');s.player.hp=1;s.score=90;s.time=100;const e=stationaryTarget(s,610,400);damagePlayer(s);assert.equal(s.mode,'revive');
 assert(revive(s));assert.equal(s.ge,30);assert.equal(s.player.hp,5);assert.equal(s.player.inv,2);assert.equal(s.time,100);assert.equal(s.score,90);assert(s.weapons.martial);assert(e.x>610);
 assert(!revive(s));s.player.inv=0;s.player.hp=1;damagePlayer(s);assert.equal(s.mode,'ended');assert.equal(s.stats.revivals,1);
});
test('revival cannot be bought at 10 minutes or without enough GE and can be declined',()=>{
 for(const setup of [s=>s.time=600,s=>s.ge=19]){const s=createGame();setup(s);s.player.hp=1;damagePlayer(s);assert.equal(s.mode,'ended');assert(!revive(s));}
 const s=createGame();s.player.hp=1;damagePlayer(s);assert(declineRevive(s));assert.equal(s.mode,'ended');assert.equal(s.ge,50);
});
test('free rerolls are awarded on levels 5 and 10, saved and spent before GE',()=>{
 const s=createGame();s.gems=[];s.spawnTimer=100;s.level=4;s.xp=s.need;step(s,.001);assert.equal(s.freeRerolls,1);assert.equal(s.level,5);
 s.level=9;s.xp=s.need;s.pending=0;s.mode='playing';step(s,.001);assert.equal(s.freeRerolls,2);
 assert(reroll(s));assert(reroll(s));assert.equal(s.freeRerolls,0);assert.equal(s.ge,50);assert(reroll(s));assert.equal(s.ge,45);assert.equal(s.stats.freeRerolls,2);assert.equal(s.stats.paidRerolls,1);
 assert.equal(createGame().freeRerolls,0);
});
test('projectile passive disappears after three selections and forged fourth is rejected',()=>{
 const s=createGame();for(let i=0;i<3;i++){s.mode='upgrade';s.pending=1;s.choices=[{kind:'passive',id:'shots'}];assert(choose(s,0));}
 assert(!choicePool(s).some(c=>c.id==='shots'));s.mode='upgrade';s.choices=[{kind:'passive',id:'shots'}];assert(!choose(s,0));assert.equal(s.passives.shots,3);
});
test('character level bonuses are linear and apply to all weapons',()=>{
 const r=createGame('rambo');r.level=11;assert(Math.abs(playerStats(r).damageBonus-.2)<1e-9);assert(Math.abs(weaponStats(r,'egg',weapon()).damage-13*1.2)<1e-9);
 const m=createGame('monk');m.level=11;assert.equal(m.player.hp,5);assert(m.player.x===600);assert(Math.abs(playerStats(m).hasteBonus-.2)<1e-9);assert(Math.abs(weaponStats(m,'egg',weapon()).interval-.9/1.2)<1e-9);
 const y=createGame();y.level=11;assert(Math.abs(playerStats(y).xpBonus-.2)<1e-9);assert(playerStats(m).speed<playerStats(y).speed);
});
test('martial weapon is exclusive, cycles left/right/stomp and ignores projectile buffs',()=>{
 const s=createGame('monk');s.gems=[];stationaryTarget(s,680,400);s.passives.shots=3;
 for(let i=0;i<3;i++){s.weapons.martial.cd=0;step(s,.001);}
 assert.deepEqual(s.attacks.map(a=>a.type),['wing','wing','stomp']);assert.deepEqual(s.attacks.slice(0,2).map(a=>a.side),[-1,1]);assert.equal(weaponStats(s,'martial').count,1);
 assert(!choicePool(createGame()).some(c=>c.id==='martial'));assert(!choicePool(createGame('rambo')).some(c=>c.id==='martial'));
});
test('martial evolution chooses every-attack stomp or paired wings with extra feathers',()=>{
 const s=createGame('monk');s.gems=[];stationaryTarget(s,680,400);s.weapons.martial=weapon(5,'stomp');for(let i=0;i<3;i++){s.weapons.martial.cd=0;step(s,.001);}assert(s.attacks.every(a=>a.type==='stomp'));
 const p=createGame('monk');p.gems=[];stationaryTarget(p,1000,400);p.weapons.martial=weapon(5,'plumes');p.passives.shots=3;step(p,.001);assert.equal(p.attacks.length,2);step(p,.32);assert.equal(p.bullets.length,6);assert(p.bullets.every(b=>b.weapon==='martial'));
});
test('stomp pushes enemies, melee hits only during its visible attack and only once',()=>{
 const s=createGame('monk');s.gems=[];const e=stationaryTarget(s,670,400);s.weapons.martial=weapon(5,'stomp');step(s,.001);const hp=e.hp;assert.equal(e.hp,hp);step(s,.20);assert(e.hp<hp);assert(e.x>670);const after=e.hp;step(s,.05);assert.equal(e.hp,after);
});
test('attack speed shortens both martial animation and repeat interval',()=>{
 const a=createGame('monk'),b=createGame('monk');for(const s of [a,b]){s.gems=[];stationaryTarget(s,680,400);s.weapons.martial.cd=0;}b.passives.haste=3;b.level=6;step(a,.001);step(b,.001);assert(b.attacks[0].duration<a.attacks[0].duration);assert(b.weapons.martial.cd<a.weapons.martial.cd);
});
test('spawn transitions suppress only future old types, ramp over 30 seconds and blend after 60',()=>{
 assert.deepEqual(Object.keys(spawnProfile(240).weights),['wolf']);assert(spawnProfile(240).ramp<spawnProfile(270).ramp);assert(spawnProfile(300).weights.rat>spawnProfile(300).weights.wolf);
 assert.deepEqual(Object.keys(spawnProfile(420).weights),['bear']);assert(spawnProfile(480).weights.fox>spawnProfile(480).weights.bear);
 assert(enemyCost('fox',241)<enemyCost('fox',239));assert(enemyCost('wolf',361)<enemyCost('wolf',359));
 const s=createGame();const rat=spawnEnemy(s,'rat');s.time=239.99;s.spawnTimer=100;step(s,.02);assert(s.enemies.includes(rat));
});
