// Experiment-only deterministic rules. The November 12 release remains immutable.
export const DIFFICULTIES=Object.freeze({
 easy:Object.freeze({id:'easy',name:'Обычный двор',hp:.9,speed:.9,wolfSpeed:.83,events:false}),
 hard:Object.freeze({id:'hard',name:'Дикий двор',hp:1,speed:1,wolfSpeed:1,events:true})
});
// First playtest values, not recovered historical agreements. Seconds of active play.
export const EVENT_RULES=Object.freeze({
 night:Object.freeze({first:120,every:180,duration:45,warning:5,hp:1.1,speed:1.1}),
 rain:Object.freeze({first:75,every:150,duration:30,puddles:9,radius:65,slow:.85}),
 hunt:Object.freeze({first:200,every:180,duration:25,warning:5,wolves:6,interval:2}),
 nuclear:Object.freeze({first:170,every:210,warning:5,bossDamage:.25})
});
export function initDifficulty(s,id='hard'){
 if(!Object.hasOwn(DIFFICULTIES,id))throw Error('Unknown difficulty');
 s.difficulty=id;s.worldEvents={night:false,nightUntil:0,rainUntil:0,puddles:[],huntUntil:0,huntRemaining:0,huntNext:0,nuclearAt:0,nuclearFlash:0,next:{night:EVENT_RULES.night.first,rain:EVENT_RULES.rain.first,hunt:EVENT_RULES.hunt.first,nuclear:EVENT_RULES.nuclear.first},announced:{},previewQueue:[]};
 s.stats.environment={damage:0,nuclearStrikes:0,hunts:0};
}
export function enemyMovementScale(s,type){const d=DIFFICULTIES[s.difficulty]||DIFFICULTIES.hard;return (type==='wolf'?d.wolfSpeed:d.speed)*(s.worldEvents?.night?EVENT_RULES.night.speed:1);}
export function scaleSpawn(s,e){const d=DIFFICULTIES[s.difficulty]||DIFFICULTIES.hard,hp=d.hp*(s.worldEvents?.night?EVENT_RULES.night.hp:1);e.hp*=hp;e.maxHp*=hp;e.speed*=enemyMovementScale(s,e.type);}
export function setNight(s,on){
 const w=s.worldEvents;if(!DIFFICULTIES[s.difficulty]?.events||w.night===on)return;
 w.night=on;const hp=on?EVENT_RULES.night.hp:1/EVENT_RULES.night.hp,speed=on?EVENT_RULES.night.speed:1/EVENT_RULES.night.speed;
 // Preserve damage ratio, including a damaged boss. Never refill HP at dusk/dawn.
 for(const e of s.enemies){if(e.hp<=0)continue;e.hp*=hp;e.maxHp*=hp;e.speed*=speed;}
 s.events.push(on?'event:night':'event:day');
}
export function playerWeatherScale(s){return s.worldEvents?.puddles.some(p=>Math.hypot(s.player.x-p.x,s.player.y-p.y)<p.r+s.player.r*.5)?EVENT_RULES.rain.slow:1;}
export function queuePreviewEvent(s,id){if(DIFFICULTIES[s.difficulty]?.events&&Object.hasOwn(EVENT_RULES,id)){s.worldEvents.previewQueue.push(id);return true;}return false;}
function startRain(s,{world,resolve}){
 const w=s.worldEvents,r=EVENT_RULES.rain;w.rainUntil=s.time+r.duration;w.puddles=[];s.weather='rain';
 for(let i=0;i<r.puddles;i++){
  const angle=i*2.399963+s.random()*.35,distance=170+Math.floor(i/3)*135;
  const p={x:Math.max(world.fenceInset+r.radius,Math.min(world.width-world.fenceInset-r.radius,s.player.x+Math.cos(angle)*distance)),y:Math.max(world.fenceInset+r.radius,Math.min(world.height-world.fenceInset-r.radius,s.player.y+Math.sin(angle)*distance)),r:r.radius};
  resolve(p,s.obstacles);w.puddles.push(p);
 }s.events.push('event:rain');
}
function start(s,id,hooks){const w=s.worldEvents,r=EVENT_RULES[id];
 if(id==='night'){w.nightUntil=s.time+r.duration;setNight(s,true);}
 if(id==='rain')startRain(s,hooks);
 if(id==='hunt'){w.huntUntil=s.time+r.duration;w.huntRemaining=r.wolves;w.huntNext=s.time;s.stats.environment.hunts++;s.events.push('event:hunt');}
 if(id==='nuclear'){w.nuclearAt=s.time+r.warning;s.events.push('event:nuclear-warning');}
}
export function detonateNuclear(s,{hit,definitions}){
 if(!DIFFICULTIES[s.difficulty]?.events)return false;
 const w=s.worldEvents;w.nuclearAt=0;w.nuclearFlash=1.2;s.stats.environment.nuclearStrikes++;
 // A support event: all ordinary enemies, 25% max HP off bosses, at least 1 HP left.
 for(const e of [...s.enemies]){if(e.hp<=0)continue;const damage=definitions[e.type].isBoss?Math.min(Math.max(0,e.hp-1),e.maxHp*EVENT_RULES.nuclear.bossDamage):e.hp;if(damage<=0)continue;s.stats.environment.damage+=Math.min(e.hp,damage);hit(s,e,damage,null);}
 s.acorns.length=0;s.events.push('event:nuclear','explosion');return true;
}
export function updateWorldEvents(s,dt,hooks){
 const w=s.worldEvents;if(!w||!DIFFICULTIES[s.difficulty]?.events)return;
 w.nuclearFlash=Math.max(0,w.nuclearFlash-dt);
 if(w.night&&s.time>=w.nightUntil)setNight(s,false);
 if(w.rainUntil&&s.time>=w.rainUntil){w.rainUntil=0;w.puddles=[];s.weather='clear';s.events.push('event:rain-end');}
 if(w.huntUntil&&s.time>=w.huntUntil){w.huntUntil=0;w.huntRemaining=0;s.events.push('event:hunt-end');}
 if(w.nuclearAt&&s.time>=w.nuclearAt)detonateNuclear(s,hooks);
 for(const id of w.previewQueue.splice(0))start(s,id,hooks);
 for(const [id,r]of Object.entries(EVENT_RULES)){
  if((id==='night'||id==='hunt')&&s.time>=w.next[id]-r.warning&&s.time<w.next[id]&&w.announced[id]!==w.next[id]){w.announced[id]=w.next[id];s.events.push('event:'+id+'-warning');}
  if(s.time>=w.next[id]){w.next[id]+=r.every;start(s,id,hooks);}
 }
 if(w.huntRemaining&&s.time>=w.huntNext){const e=hooks.spawn(s,'wolf');if(e){e.eventPack=true;w.huntRemaining--;w.huntNext=s.time+EVENT_RULES.hunt.interval;}}
}
