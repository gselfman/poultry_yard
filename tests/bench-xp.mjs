import {createGame,step} from '../engine.js';
import {performance} from 'node:perf_hooks';
for(const count of [1000,10000,30000]){const s=createGame();s.weapons={};s.spawnTimer=1e9;s.ambientTimer=1e9;s.need=1e12;s.gems=Array.from({length:count},(_,i)=>({x:100+(i*37)%7000,y:100+(i*73)%4600,value:1,tier:1}));const values=[];for(let i=0;i<240;i++){const t=performance.now();step(s,1/60);values.push(performance.now()-t);}values.sort((a,b)=>a-b);console.log(JSON.stringify({count,mean:values.reduce((a,b)=>a+b)/values.length,p95:values[228],max:values.at(-1)}));}
