// Durable state is created by the server, never accepted from request bodies.
import {createReplay,seededRandom} from './session-replay.js';
export function encode(run) {
  // A remote-beak volley shares its combo counter with its queued strikes.
  // Preserve identity explicitly; equal-looking counters can belong to different volleys.
  const ids=new Map(),series=[];
  const reference=value=>{
    if(!ids.has(value)){ids.set(value,series.length);series.push({...value});}
    return {$remoteSeries:ids.get(value)};
  };
  return JSON.parse(JSON.stringify({version:1,tick:run.tick,input:run.input,settled:run.settled,
    rng:run.state.random.getState(),state:run.state,remoteSeries:series},(key,value)=>{
      if((key==='series'||key==='remoteSeries')&&value&&typeof value==='object'&&!Array.isArray(value))return reference(value);
      if(value===Infinity)return {$number:'Infinity'};
      if(value===-Infinity)return {$number:'-Infinity'};
      if(typeof value==='number'&&Number.isNaN(value))throw Error('NaN checkpoint');
      if(typeof value==='function')return undefined;
      if(value instanceof Set)return {$set:[...value]};
      if(value instanceof Map)return {$map:[...value]};
      return value;
    }));
}
export function decode(saved) {
  if(saved.version!==1)throw Error('Unsupported checkpoint');
  const result=JSON.parse(JSON.stringify(saved),(key,value)=>{
    if(value?.$number==='Infinity')return Infinity;
    if(value?.$number==='-Infinity')return -Infinity;
    if(value&&typeof value==='object'&&Object.hasOwn(value,'$set'))return new Set(value.$set);
    if(value&&typeof value==='object'&&Object.hasOwn(value,'$map'))return new Map(value.$map);
    return value;
  });
  if(Array.isArray(result.remoteSeries)){
    const restore=value=>value&&Object.hasOwn(value,'$remoteSeries')?result.remoteSeries[value.$remoteSeries]:value;
    for(const weapon of Object.values(result.state.weapons))if(weapon.remoteSeries)weapon.remoteSeries=restore(weapon.remoteSeries);
    for(const attack of result.state.attacks)if(attack.series)attack.series=restore(attack.series);
    delete result.remoteSeries;
  }
  result.state.random=seededRandom(result.rng);
  return result;
}
