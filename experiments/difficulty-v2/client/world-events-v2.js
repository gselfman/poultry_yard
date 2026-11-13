import {PUDDLE_ASPECT,inPuddle} from './event-visual-timing.js';
// Phase events. Every probability is rolled once, never on every minute/frame.
export const DIFFICULTIES=Object.freeze({easy:Object.freeze({id:'easy',name:'Обычный двор',hp:.9,speed:.9,wolfSpeed:.83,events:false}),hard:Object.freeze({id:'hard',name:'Дикий двор',hp:1,speed:1,wolfSpeed:1,events:true})});
export const EVENT_RULES=Object.freeze({
 night:Object.freeze({hp:1,speed:1,ratWeight:2,foxWeight:3,wolfWeight:3.5,bearWeight:1.2,gooseWeight:.12,spawnMultiplier:.85}),
 rain:Object.freeze({chance:.20,duration:60,puddles:24,radius:85,slow:.60,duckWeight:10,gooseWeight:6,spawnMultiplier:.75,rampDuration:12}),
 hunt:Object.freeze({chance:.20,duration:60,warning:5,wolves:40,foxes:12,foxDelay:24,foxInterval:2.8,wolfInterval:1,rampDuration:10,ringRadius:620}),
 nuclear:Object.freeze({chance:.15,dropDelay:10,minDistance:1100,maxDistance:2200,charge:30,chargeRadius:85,dischargeRate:2,fuse:5,whiteout:3,emptyAfter:3,bossDamage:.5})
});
const limits={dischargeRate:[.25,10],wolfInterval:[.4,10],rampDuration:[1,60],spawnMultiplier:[.25,8],chance:[0,1],hp:[.25,5],speed:[.25,5],slow:[.1,1],duration:[10,300],puddles:[1,40],radius:[20,200],wolves:[1,80],foxes:[0,60],foxDelay:[1,60],foxInterval:[.1,10],ringRadius:[250,1200],dropDelay:[0,120],minDistance:[500,3500],maxDistance:[600,4500],charge:[1,120],chargeRadius:[30,250],fuse:[1,30],whiteout:[0,10],emptyAfter:[0,20],bossDamage:[0,1],warning:[0,15]};
export const EVENT_SCHEMA=Object.freeze(Object.fromEntries(Object.entries(EVENT_RULES).flatMap(([group,values])=>Object.entries(values).map(([key,value])=>[group+'.'+key,{group,key,base:value,min:limits[key]?.[0]??0,max:limits[key]?.[1]??30,integer:['wolves','foxes','puddles'].includes(key)}]))));
export function configuredRules(overrides={}){
 const out=Object.fromEntries(Object.entries(EVENT_RULES).map(([g,v])=>[g,{...v}]));
 for(const [g,values]of Object.entries(overrides)){if(!Object.hasOwn(out,g)||!values||typeof values!=='object')throw Error('Unknown event settings');for(const [k,v]of Object.entries(values)){const spec=EVENT_SCHEMA[g+'.'+k];if(!spec||!Number.isFinite(v)||v<spec.min||v>spec.max||spec.integer&&!Number.isInteger(v))throw Error('Invalid event setting: '+g+'.'+k);out[g][k]=v;}}
 if(out.nuclear.minDistance>out.nuclear.maxDistance)throw Error('Минимальная дальность больше максимальной');if(out.night.ratWeight+out.night.foxWeight+out.night.wolfWeight+out.night.bearWeight+out.night.gooseWeight<=0||out.rain.duckWeight+out.rain.gooseWeight<=0)throw Error('Суммарный вес волны должен быть положительным');return out;
}
export function initDifficulty(s,id='hard',rules={}){
 if(!Object.hasOwn(DIFFICULTIES,id))throw Error('Unknown difficulty');
 s.difficulty=id;s.eventRules=configuredRules(rules);
 s.worldEvents={night:false,nightStartedAt:null,rainUntil:0,rainStartedAt:0,puddles:[],huntUntil:0,huntStartedAt:0,huntNextWolf:0,huntWolvesRemaining:0,huntFoxesRemaining:0,huntFoxAt:0,huntNextFox:0,nuclearDropAt:null,nuclear:null,nuclearFlashUntil:0,suppressUntil:0,rolls:{},schedule:{dayRain:null,nightRain:null,hunt:null},announced:{},previewQueue:[]};
 s.stats.environment={damage:0,nuclearStrikes:0,hunts:0};
 if(id==='hard'){const w=s.worldEvents;w.rolls.dayRain=s.random()<s.eventRules.rain.chance;if(w.rolls.dayRain)w.schedule.dayRain=45+s.random()*195;}
}
export function phaseProgression(s,t,guineaAt){return s.difficulty!=='hard'?t:s.worldEvents.night?Math.max(guineaAt,t):Math.min(guineaAt,t);}
export function enemyMovementScale(s,type){const d=DIFFICULTIES[s.difficulty]||DIFFICULTIES.hard;return (type==='wolf'?d.wolfSpeed:d.speed)*(s.worldEvents?.night?s.eventRules.night.speed:1);}
export function scaleSpawn(s,e){const d=DIFFICULTIES[s.difficulty]||DIFFICULTIES.hard,hp=d.hp*(s.worldEvents?.night?s.eventRules.night.hp:1);e.hp*=hp;e.maxHp*=hp;e.speed*=enemyMovementScale(s,e.type);}
export function setNight(s,on=true){
 const w=s.worldEvents;if(!DIFFICULTIES[s.difficulty]?.events||!on||w.night)return false;
 w.night=true;w.nightStartedAt=s.time;w.schedule.dayRain=null;s.spawnCredit=0;
 // Retain the shipped late-game curve. Existing enemies are never healed at the transition.
 w.rolls.nightRain=s.random()<s.eventRules.rain.chance;w.rolls.hunt=s.random()<s.eventRules.hunt.chance;w.rolls.nuclear=s.random()<s.eventRules.nuclear.chance;
 if(w.rolls.nightRain)w.schedule.nightRain=s.time+15+s.random()*150;if(w.rolls.hunt)w.schedule.hunt=s.time+20+s.random()*150;if(w.rolls.nuclear)w.nuclearDropAt=s.time+s.eventRules.nuclear.dropDelay;
 s.events.push('event:night');return true;
}
const progress=(time,start,duration)=>Math.max(0,Math.min(1,(time-start)/Math.max(.1,duration)));
function mixWeights(a,b,t){const sum=o=>Object.values(o).reduce((n,v)=>n+v,0)||1,sa=sum(a),sb=sum(b);return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,(a[k]||0)/sa*(1-t)+(b[k]||0)/sb*t]));}
export function eventSpawnProfile(s,p){
 if(s.difficulty!=='hard')return p;const w=s.worldEvents,r=s.eventRules.night;const ordinary=w.night?{rat:r.ratWeight,fox:r.foxWeight,wolf:r.wolfWeight,bear:r.bearWeight,goose:r.gooseWeight}:p.weights;
 if(w.huntUntil>s.time)return {...p,stage:'hunt',ramp:1,weights:{wolf:1,fox:s.time>=w.huntFoxAt?1:0}};
 if(w.rainUntil>s.time){const rain=s.eventRules.rain,t=.15+.85*progress(s.time,w.rainStartedAt,rain.rampDuration);return {...p,stage:'rain',ramp:1,weights:mixWeights(ordinary,{duck:rain.duckWeight,goose:rain.gooseWeight,rat:.02,fox:.02,wolf:w.night?.02:0},t)};}
 return w.night?{...p,stage:'night',ramp:1,weights:ordinary}:p;
}
export function worldCombatSuppressed(s){return s.difficulty==='hard'&&(s.worldEvents?.suppressUntil||0)>s.time;}
export function worldSpawnsPaused(s){return worldCombatSuppressed(s)||s.testFlags?.noSpawns===true;}
export function playerWeatherScale(s){return s.worldEvents?.puddles.some(p=>inPuddle(p,s.player))?s.eventRules.rain.slow:1;}
export function queuePreviewEvent(s,id){if(DIFFICULTIES[s.difficulty]?.events&&Object.hasOwn(EVENT_RULES,id)){s.worldEvents.previewQueue.push(id);return true;}return false;}
function startRain(s,{world,resolve}){
 const w=s.worldEvents,r=s.eventRules.rain;w.rainStartedAt=s.time;w.rainUntil=s.time+r.duration;w.puddles=[];s.weather='rain';s.spawnCredit=0;
 const n=r.puddles,cols=Math.ceil(Math.sqrt(n*world.width/world.height)),rows=Math.ceil(n/cols),margin=world.fenceInset+r.radius+12,dx=(world.width-margin*2)/cols,dy=(world.height-margin*2)/rows;
 for(let i=0;i<n;i++)for(let attempt=0;attempt<24;attempt++){const p={x:margin+(i%cols+.2+s.random()*.6)*dx,y:margin+(Math.floor(i/cols)+.2+s.random()*.6)*dy,r:r.radius*(i%8<4?.65:1),variant:i%8+1};p.ry=p.r*PUDDLE_ASPECT[i%8];resolve(p,s.obstacles);if(p.x<margin||p.x>world.width-margin||p.y<margin||p.y>world.height-margin||w.puddles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<r.radius*3))continue;w.puddles.push(p);break;}
 s.events.push('event:rain');
}
function startHunt(s){const w=s.worldEvents,r=s.eventRules.hunt;if(w.huntUntil>s.time)return;w.huntStartedAt=s.time;w.huntUntil=s.time+r.duration;w.huntWolvesRemaining=r.wolves;w.huntWolfIndex=0;w.huntNextWolf=s.time+1;w.huntFoxesRemaining=r.foxes;w.huntFoxAt=s.time+r.foxDelay;w.huntNextFox=w.huntFoxAt;s.spawnCredit=0;s.stats.environment.hunts++;s.events.push('event:hunt');}
function landNuclear(s,{world,resolve},force=false){
 const w=s.worldEvents,r=s.eventRules.nuclear;if(w.nuclear?.status!=='spent'&&w.nuclear||!force&&s.stats.environment.nuclearStrikes)return;
 let point=null;for(let i=0;i<64;i++){const a=s.random()*Math.PI*2,d=r.minDistance+s.random()*(r.maxDistance-r.minDistance),p={x:Math.max(world.fenceInset+50,Math.min(world.width-world.fenceInset-50,s.player.x+Math.cos(a)*d)),y:Math.max(world.fenceInset+50,Math.min(world.height-world.fenceInset-50,s.player.y+Math.sin(a)*d)),r:30};resolve(p,s.obstacles);if(Math.hypot(p.x-s.player.x,p.y-s.player.y)>=r.minDistance){point=p;break;}}
 if(!point)return;w.nuclear={...point,charge:0,status:'landed',fuseAt:null};w.nuclearDropAt=null;s.events.push('event:nuclear-landed');
}
function start(s,id,hooks){
 const w=s.worldEvents;
 if(id==='night')setNight(s);
 if(id==='rain'){if(w.huntUntil>s.time)w.schedule[w.night?'nightRain':'dayRain']=w.huntUntil+1;else startRain(s,hooks);}
 if(id==='hunt'){if(!w.night){s.events.push('event:night-required');return;}if(w.rainUntil>s.time)w.schedule.hunt=w.rainUntil+1;else startHunt(s);}
 if(id==='nuclear'){if(!w.night){s.events.push('event:night-required');return;}landNuclear(s,hooks,true);}
}
export function detonateNuclear(s,{hit,definitions}){
 const w=s.worldEvents;if(!DIFFICULTIES[s.difficulty]?.events||w.nuclear?.status!=='armed')return false;const r=s.eventRules.nuclear;
 w.nuclear.status='spent';w.nuclearFlashUntil=s.time+r.whiteout;w.suppressUntil=w.nuclearFlashUntil+r.emptyAfter;s.stats.environment.nuclearStrikes++;
 for(const e of [...s.enemies]){if(e.hp<=0)continue;const d=definitions[e.type].isBoss?Math.min(Math.max(0,e.hp-1),e.maxHp*r.bossDamage):e.hp;if(d<=0)continue;s.stats.environment.damage+=Math.min(e.hp,d);hit(s,e,d,null);if(e.attack)e.attack=null;}
 s.acorns.length=0;s.events.push('event:nuclear');return true;
}
function huntIngress(s,type,i,hooks){const r=s.eventRules.hunt,view=s.spawnView||{width:1100,height:850},radius=hooks.definitions[type].r,angle=i*2.399963+Math.floor(i/4)*.23,rx=view.width*.58+radius*3+70,ry=view.height*.58+radius*3+70,d=Math.max(r.ringRadius,1/Math.hypot(Math.cos(angle)/rx,Math.sin(angle)/ry)+radius);return hooks.spawn(s,type,{x:s.player.x+Math.cos(angle)*d,y:s.player.y+Math.sin(angle)*d,eventHunt:true,force:true,ringSlot:i});}
function spawnHunt(s,hooks){const w=s.worldEvents,r=s.eventRules.hunt;
 if(w.huntWolvesRemaining>0&&s.time>=w.huntNextWolf){const i=w.huntWolfIndex,e=huntIngress(s,'wolf',i,hooks);if(e){w.huntWolvesRemaining--;w.huntWolfIndex++;w.huntNextWolf=s.time+r.wolfInterval/(.4+.6*progress(s.time,w.huntStartedAt,r.rampDuration));}}
 if(w.huntFoxesRemaining>0&&s.time>=w.huntNextFox){const i=r.foxes-w.huntFoxesRemaining,e=huntIngress(s,'fox',i+.5,hooks);if(e){w.huntFoxesRemaining--;w.huntNextFox=s.time+r.foxInterval;if(i===0)s.events.push('event:hunt-foxes');}}
}
export function updateWorldEvents(s,dt,hooks,input={x:0,y:0}){
 const w=s.worldEvents;if(!w||!DIFFICULTIES[s.difficulty]?.events)return;
 if(s.bossEvents.guinea==='dead'&&!w.night)setNight(s);
 if(w.rainUntil&&s.time>=w.rainUntil){w.rainUntil=0;w.puddles=[];s.weather='clear';s.events.push('event:rain-end');}
 if(w.huntUntil&&s.time>=w.huntUntil){w.huntUntil=0;w.huntWolvesRemaining=0;w.huntFoxesRemaining=0;s.events.push('event:hunt-end');}
 if(w.nuclearDropAt!==null&&s.time>=w.nuclearDropAt)landNuclear(s,hooks);
 for(const id of w.previewQueue.splice(0))start(s,id,hooks);
 for(const key of ['dayRain','nightRain','hunt']){const at=w.schedule[key];if(at===null)continue;if(key==='hunt'&&s.time>=at-s.eventRules.hunt.warning&&s.time<at&&w.announced.hunt!==at){w.announced.hunt=at;s.events.push('event:hunt-warning');}if(s.time>=at){if(worldCombatSuppressed(s)){w.schedule[key]=w.suppressUntil+1;continue;}w.schedule[key]=null;start(s,key==='hunt'?'hunt':'rain',hooks);}}
 if(w.huntUntil>s.time){if(worldCombatSuppressed(s)){w.huntUntil+=dt;w.huntStartedAt+=dt;w.huntNextWolf+=dt;w.huntFoxAt+=dt;w.huntNextFox+=dt;}else spawnHunt(s,hooks);}
 const b=w.nuclear,r=s.eventRules.nuclear;if(!b)return;
 if(b.status==='armed'&&s.time>=b.fuseAt)detonateNuclear(s,hooks);
}


export function advanceNuclearCharge(s,dt){const b=s.worldEvents?.nuclear;if(s.difficulty!=='hard'||b?.status!=='landed')return;const r=s.eventRules.nuclear,near=Math.hypot(s.player.x-b.x,s.player.y-b.y)<=r.chargeRadius;b.inZone=near;b.charge=Math.max(0,Math.min(r.charge,b.charge+dt*(near?1:-r.dischargeRate)));if(b.charge>=r.charge-1e-7){b.status='armed';b.fuseAt=s.time+r.fuse;s.events.push('event:nuclear-warning');}}
export function eventBudgetScale(s){if(s.difficulty!=='hard')return 1;const w=s.worldEvents;if(w.huntUntil>s.time)return 0;const base=w.night?s.eventRules.night.spawnMultiplier:1;return w.rainUntil>s.time?base*s.eventRules.rain.spawnMultiplier*(.25+.75*progress(s.time,w.rainStartedAt,s.eventRules.rain.rampDuration)):base;}
export function eventSpawnLimit(s){if(s.difficulty!=='hard')return 12;const w=s.worldEvents;return w.huntUntil>s.time?0:w.rainUntil>s.time?1:12;}
export function trimEventCredit(s){if(s.difficulty!=='hard')return;const w=s.worldEvents;if(w.huntUntil>s.time)s.spawnCredit=0;else if(w.rainUntil>s.time)s.spawnCredit=Math.min(3,s.spawnCredit);}
