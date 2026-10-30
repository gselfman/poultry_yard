// Undo per-row atlas fitting: keep one source-pixel scale per species.
export const BIRD_VISUALS={turkey:{size:1.18,feet:480,scales:{walk:1,'wing-sweep':1,stomp:1,'charge-prepare':1,'charge-run':1,'peck-series':1}},goose:{size:1.22,scales:{walk:1,'bite-prepare':361/357,'bite-recover':402/357}},guinea:{size:1.18,scales:{walk:1,'wing-sweep':309/264,stomp:297/264,'charge-prepare':296/264,'charge-run':298/264}}};
export const BIRD_ACTIONS={turkey:['walk','wing-sweep','stomp','charge-prepare','charge-run','peck-series'],duck:['walk'],goose:['walk','bite-prepare','bite-recover'],guinea:['walk','wing-sweep','stomp','charge-prepare','charge-run']};
export function birdPose(type,attack,time){
 if(!BIRD_ACTIONS[type])return null;
 if(!attack)return {action:'walk',frame:Math.floor(time*8)%4};
 const phase=attack.phase,elapsed=attack.elapsed;
 const at=(t,d)=>Math.min(3,Math.max(0,Math.floor(t/Math.max(.001,d)*4)));
 if(type==='goose')return phase==='windup'?{action:'bite-prepare',frame:at(elapsed,attack.windup)}:{action:'bite-recover',frame:phase==='active'?Math.min(1,at(elapsed-attack.windup,attack.active)>>1):Math.min(3,2+(at(elapsed-attack.windup-attack.active,attack.recovery)>>1))};
 if(type==='guinea'||type==='turkey'){
  if(attack.kind==='pecks')return {action:'peck-series',frame:phase==='active'?Math.floor((elapsed-attack.windup)/Math.max(.001,attack.peckGap||.35)*4)%4:phase==='windup'?0:2};
  if(attack.kind==='charge'&&phase==='recovery')return {action:'charge-prepare',frame:3-Math.min(3,Math.max(0,Math.floor((elapsed-attack.windup-attack.active)/Math.max(.001,attack.recovery)*4)))};
  if(attack.kind==='charge')return phase==='windup'?{action:'charge-prepare',frame:at(elapsed,attack.windup)}:{action:'charge-run',frame:Math.floor(time*10)%4};
  const action=attack.kind==='stomp'?'stomp':'wing-sweep';return {action,frame:phase==='windup'?Math.min(1,at(elapsed,attack.windup)>>1):phase==='active'?2:3};
 }
 return {action:'walk',frame:Math.floor(time*8)%4};
}
