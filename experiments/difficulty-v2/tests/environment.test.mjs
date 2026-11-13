import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeWorldObjects,moveBody} from '../client/world.js';
import {PROP_TYPES,propFile} from '../client/environment-props.js';
import {rainParticle,shockwaveSample,inPuddle} from '../client/event-visual-timing.js';
import {createGame,step} from '../client/engine.js';
import {queuePreviewEvent} from '../client/world-events.js';
import {seededRandom} from '../client/session-replay.js';
test('map has sparse deterministic props with all four families and three variants, never ponds',()=>{
 const a=makeWorldObjects(10800,7200),b=makeWorldObjects(10800,7200);assert.deepEqual(a,b);assert.ok(a.obstacles.length>30&&a.obstacles.length<100);
 for(const type of PROP_TYPES){const group=a.obstacles.filter(x=>x.type===type);assert.deepEqual([...new Set(group.map(x=>x.variant))].sort(),[1,2,3]);}
 for(const o of a.obstacles){assert.notEqual(o.type,'pond');assert.ok(Math.hypot(o.x-5400,o.y-3600)>=470);for(const p of a.obstacles)if(p!==o)assert.ok(Math.hypot(p.x-o.x,p.y-o.y)-p.r-o.r>300);}
});
test('every prop family blocks movement without leaving a body inside its footprint',()=>{
 const objects=makeWorldObjects(10800,7200).obstacles;
 for(const type of PROP_TYPES){const o=objects.find(x=>x.type===type),body={x:o.x-o.r-80,y:o.y,r:20};for(let i=0;i<120;i++){moveBody(body,4,0,[o]);assert.ok(Math.hypot(body.x-o.x,body.y-o.y)>=body.r+o.r-.001);}assert.ok(body.x<o.x);}
});
test('rain puddles have two sizes, stay separate from solid obstacles and vanish after the event',()=>{
 const s=createGame('ryaba',seededRandom(45),{difficulty:'hard',eventRules:{rain:{chance:0},hunt:{chance:0},nuclear:{chance:0}}});s.testFlags={invincible:true,noSpawns:true};s.weapons={};s.ambientTimer=1e9;queuePreviewEvent(s,'rain');step(s,1/60);
 const puddles=s.worldEvents.puddles;assert.equal(puddles.length,24);assert.equal(new Set(puddles.map(p=>p.r)).size,2);assert.equal(new Set(puddles.map(p=>p.variant)).size,8);for(const p of puddles){assert.ok(p.ry<p.r);assert.ok(inPuddle(p,{x:p.x,y:p.y,r:20}));assert.ok(!inPuddle(p,{x:p.x,y:p.y+p.r+20,r:20}));assert.ok(!s.obstacles.includes(p));}
 for(let i=0;i<61*60;i++)step(s,1/60);assert.equal(s.worldEvents.puddles.length,0);
});
test('rain particles animate independently with falling and impact stages across the viewport',()=>{
 const a=Array.from({length:400},(_,i)=>rainParticle(i,3,1280,720)),b=rainParticle(1,3.1,1280,720);assert.notDeepEqual(a[1],b);assert.ok(a.some(x=>x.splash)&&a.some(x=>!x.splash));assert.ok(new Set(a.map(x=>x.frame)).size>=7);assert.ok(a.some(x=>x.x<320)&&a.some(x=>x.x>960));assert.ok(a.some(x=>x.y<180)&&a.some(x=>x.y>540));
});
test('shockwave radius is continuous, monotonic and reaches every corner from any origin',()=>{
 for(const [x,y]of [[640,360],[50,50],[1200,650]]){let r=0;for(let i=0;i<=100;i++){const s=shockwaveSample(i*.0084,1280,720,x,y);assert.ok(s.radius>=r);r=s.radius;}assert.ok(r>Math.max(Math.hypot(x,y),Math.hypot(1280-x,720-y)));}assert.equal(shockwaveSample(.84,1280,720).frame,23);
});
test('all prop variants are distinct generated files; frame export has 24 identical canvases',async()=>{
 const world=makeWorldObjects(10800,7200),hashes=new Set();for(const type of PROP_TYPES)for(let variant=1;variant<=3;variant++){const file=propFile({type,variant}),data=await fs.readFile(new URL('../client/assets/environment/'+file,import.meta.url));hashes.add(createHash('sha256').update(data).digest('hex'));}assert.equal(hashes.size,12);
 const m=JSON.parse(await fs.readFile(new URL('../art-review/assets/manifest.json',import.meta.url),'utf8'));assert.equal(m.props.length,24);assert.equal(m.shockwave.length,24);for(const f of m.shockwave){const p=await fs.readFile(new URL('../art-review/assets/'+f.file,import.meta.url));assert.equal(p.readUInt32BE(16),768);assert.equal(p.readUInt32BE(20),768);assert.ok(f.diameter<=552);}assert.ok(world.obstacles.length>0);
});
