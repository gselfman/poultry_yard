const fract=x=>x-Math.floor(x);
const hash=i=>fract(Math.sin(i*127.1+311.7)*43758.5453);
export const PUDDLE_ASPECT=[.54,.65,.73,.65,.60,.55,.67,.69];
export function inPuddle(p,body){const extra=(body.r||0)*.5;return ((body.x-p.x)/(p.r+extra))**2+((body.y-p.y)/((p.ry??p.r)+extra))**2<1;}
// Each particle has its own phase, speed, depth and impact point. No simulation RNG.
export function rainParticle(i,time,width,height){
 const depth=hash(i+41),phase=fract(time*(1.1+hash(i+5)*1.2)+hash(i+11));
 const groundX=hash(i+91)*(width+80)-40,groundY=hash(i+121)*(height+160)-40;
 const splash=phase>=.82,progress=splash?(phase-.82)/.18:phase/.82;
 const travel=140+depth*240;
 return {x:groundX+(splash?0:(1-progress)*28),y:groundY-(splash?0:(1-progress)*travel),frame:(splash?4:0)+Math.min(3,Math.floor(progress*4)),splash,depth,alpha:(.3+depth*.5)*(splash?Math.sin(progress*Math.PI):1),width:splash?9+depth*10:2.5+depth*3,height:splash?4+depth*5:13+depth*24};
}
export function shockwaveSample(elapsed,width,height,x=width/2,y=height/2){
 const duration=.84,p=Math.max(0,Math.min(1,elapsed/duration));
 const far=Math.max(Math.hypot(x,y),Math.hypot(width-x,y),Math.hypot(x,height-y),Math.hypot(width-x,height-y));
 return {progress:p,frame:Math.min(23,Math.floor(p*24)),radius:8+far*1.12*p,alpha:Math.min(1,(1-p)*6),done:elapsed>=duration};
}
