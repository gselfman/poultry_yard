import {DIFFICULTIES,worldCombatSuppressed} from './world-events.js';
export function difficultyMenu(selected){return '<fieldset class="difficulty-picker"><legend>Сложность</legend>'+Object.values(DIFFICULTIES).map(d=>'<button type="button" data-difficulty="'+d.id+'" aria-pressed="'+(selected===d.id)+'" class="difficulty-card '+(selected===d.id?'selected':'')+'"><strong>'+(d.events?'II':'I')+' · '+d.name+'</strong><span>'+(d.events?'Ночь после Цесарки. Редкие дождь, охота и секретный заряд.':'Враги: −10% здоровья и скорости. Волки: −17% скорости. Без событий.')+'</span></button>').join('')+'</fieldset>';}
export function eventStatus(s){
 const w=s.worldEvents;if(s.difficulty==='easy')return 'I · ОБЫЧНЫЙ ДВОР';
 const left=end=>Math.max(0,Math.ceil(end-s.time))+'с',parts=['II · ДИКИЙ ДВОР',w.night?'НОЧЬ':'ДЕНЬ'];
 if(w.rainUntil>s.time)parts.push('ДОЖДЬ '+left(w.rainUntil)+' · лужи −'+Math.round((1-s.eventRules.rain.slow)*100)+'%');
 if(w.huntUntil>s.time)parts.push('ОХОТА '+left(w.huntUntil));
 const b=w.nuclear;if(b?.status==='armed')parts.push('УДАР '+left(b.fuseAt));else if(b?.status==='landed'&&Math.hypot(b.x-s.player.x,b.y-s.player.y)<=s.eventRules.nuclear.chargeRadius)parts.push('ЗАРЯДКА В ЗОНЕ · '+Math.floor(b.charge)+'/'+s.eventRules.nuclear.charge+'с');else if(b?.status==='landed'&&b.charge>0)parts.push('РАЗРЯДКА · '+Math.ceil(b.charge)+'/'+s.eventRules.nuclear.charge+'с');
 if(worldCombatSuppressed(s))parts.push(s.time<w.nuclearFlashUntil?'ВСПЫШКА':'ЗАТИШЬЕ '+left(w.suppressUntil));return parts.join(' · ');
}
