// Shared by the boss sprite, warning outline and damage checks.
export function turkeyPeckGeometry(r,b={},pulse=0){return {start:r*(b.turkeyPeckStart??.85),range:r*Math.max(.86,(b.turkeyPeckReach??7.80)-(pulse%2?.15:0)),width:r*(b.turkeyPeckWidth??.15)};}
export function peckTiming(a){const gap=a.peckGap||.35,elapsed=Math.max(0,a.elapsed-a.windup),pulse=Math.floor(elapsed/gap),phase=elapsed/gap-pulse;return {pulse,phase,contact:a.phase==='active'&&phase>=.25&&phase<.65};}
export function turkeyPeckFrame(a){if(a.phase!=='active')return a.phase==='windup'?0:2;const t=peckTiming(a);return t.phase<.25?0:t.phase<.65?(t.pulse%2?3:1):2;}
export function turkeyPeckRotation(angle,facing,frame=1){const tipAngle=frame===3?.02:-.065;return angle-(facing<0?Math.PI-tipAngle:tipAngle);}
export function attackCapsule(a){const start=a.start||0;return {x:start-a.width,y:-a.width,w:a.range-start+a.width*2,h:a.width*2,r:a.width};}
