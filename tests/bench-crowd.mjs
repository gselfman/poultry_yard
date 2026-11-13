import {performance} from 'node:perf_hooks';
import {createGame,step,spawnEnemy} from '../engine.js';
let seed=431;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const s=createGame('ryaba',rng);s.spawnTimer=1e9;s.ambientTimer=1e9;s.need=1e12;s.player.hp=1e12;s.player.inv=1e6;s.weapons={};
for(let i=0;i<600;i++){const e=spawnEnemy(s,'rat');e.x=100+rng()*7000;e.y=100+rng()*4600;e.hp=e.maxHp=1e12;}
s.gems=Array.from({length:10000},()=>({x:100+rng()*7000,y:100+rng()*4600,value:1,tier:1}));
for(let i=0;i<500;i++)s.bullets.push({id:i,type:'egg',weapon:'egg',x:100+rng()*7000,y:100+rng()*4600,px:0,py:0,vx:0,vy:0,r:6,size:1,damage:1,pierce:Infinity,bounces:0,hits:new Set(),life:1000});
const ts=[];for(let i=0;i<240;i++){const start=performance.now();step(s,1/60);s.events.length=0;ts.push(performance.now()-start);}const times=ts.slice(60).sort((a,b)=>a-b);console.log(JSON.stringify({scenario:'600 enemies + 500 projectiles + 10000 seeds',samples:times.length,mean:times.reduce((a,b)=>a+b)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1),heapMB:process.memoryUsage().heapUsed/1048576}));
