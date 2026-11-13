import {weatherImages} from './weather-art.js';
import {vfxImages,loadVfx} from './vfx-sprites.js';
import {runTime} from './engine.js';

import {approvedImages} from './approved-media.js';
import {groundPattern} from './ground-pattern.js';
import {heroMenu,settingsView,rulesView,aboutView,upgradeView,evolutionView,pauseView,resultView,ratingView,hearts,uiIcon,weaponImage} from './ui-views.js?v=20261103-rating';
import {returnToQuRa} from './qura-bridge.js';
// Preview uses the shipped November 12 defaults without a remote balance override.
import {PreviewHost as QuRaHost} from './preview-host.js';
import {difficultyMenu,eventStatus} from './difficulty-ui.js';
import {drawEventGround,drawEventSky} from './event-render.js';
import {worldCombatSuppressed} from './world-events.js';
import {createTestLab} from './test-lab.js';
import {openRunChest,continueBonus as rawBonus,finishRun as rawFinish} from './rewards.js';
import {purchaseQuote,continuePrice,cleanProgress,unlockedHeroes,recordVictories,PAID_REROLL_LIMIT} from './run-rules.js';
import {cameraView,stickVector,bossMarker} from './viewport.js';
import {combatArt} from './combat-art.js';
import {environmentImages,landscape,worm as drawWorm,magnet as drawMagnet,acorn,lowHealth,damageFeedback} from './render-world.js';
import {WORLD} from './engine.js';
import {QuRaRadio} from './radio.js?v=20261103-vol';
import {bootstrapRuntime} from './runtime-policy.js';
import {visibleBody} from './render-budget.js';
import {TUNING} from './engine.js';
import {createGame,step,choose as rawChoose,evolve as rawEvolve,reroll as rawReroll,revive as rawRevive,declineRevive as rawDecline,CHARACTERS,WEAPONS,ENEMIES,PASSIVES,weaponStats,playerStats,beakShape,clamp} from './engine.js';
import {art,walkArt,birdArt,creature,melee,effect} from './render.js';
import {Soundscape} from './sound.js';
import {projectile} from './projectile.js';
import {seed,visibleSeed,groundEffects,telegraphs,objects,bossEffect} from './render-next.js';
import {chestMarkup,mountLootChests} from './chest-reveal.js';
const ACTOR_SCALE=1.3;
const sounds=new Soundscape();
const radio=new QuRaRadio();let lab={beforeStep(){}};let arenaPattern=null;const visibleEnemies=[];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),overlay=$('overlay');
let fastTapArmed=null,fastTapX=0,fastTapY=0,suppressFastClickUntil=0;
const FAST_TAP='button,summary,[role="button"],[role="switch"],.upgrade,.character,[data-char],[data-choice],[data-effect],[data-period],[data-hero-nav],[data-qura-return]';
function fastTapTarget(node){return node instanceof Element?node.closest(FAST_TAP):null;}
document.addEventListener('pointerdown',e=>{const b=fastTapTarget(e.target);if(!b||b.disabled||(e.pointerType==='mouse'&&e.button!==0)){fastTapArmed=null;return;}fastTapArmed=b;fastTapX=e.clientX;fastTapY=e.clientY;},{passive:true,capture:true});
document.addEventListener('pointerup',e=>{const b=fastTapArmed;fastTapArmed=null;if(!b||!b.isConnected||b.disabled)return;if(Math.hypot(e.clientX-fastTapX,e.clientY-fastTapY)>18)return;const hit=fastTapTarget(e.target);if(hit!==b&&!b.contains(e.target))return;suppressFastClickUntil=0;b.click();suppressFastClickUntil=performance.now()+450;if(e.cancelable)e.preventDefault();},{capture:true});
document.addEventListener('click',e=>{if(performance.now()<suppressFastClickUntil&&fastTapTarget(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
let selectedDifficulty='hard';
let host=null;let runtimeReady=false;let s=null,selected='ryaba',last=0,lastMode='',pointer=null,stick={x:0,y:0},keys=new Set(),noticeUntil=0;
let progress=cleanProgress(null);
function exitToQuRa(){
 keys.clear();release();radio.stop();returnToQuRa();
}
$('qura-exit').onclick=exitToQuRa;
overlay.addEventListener('click',event=>{
 if(!(event.target instanceof Element)||!event.target.closest('[data-qura-return]'))return;
 exitToQuRa();
});
let manualEnded=false;
let purchaseOpen=false,spendPending=false,inputBlockedUntil=0;overlay.addEventListener('click',e=>{if(performance.now()<inputBlockedUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
let best=0;let rankingPeriod='today';
function setBest(value){best=Math.max(0,Math.floor(Number(value)||0));$('record').textContent=best.toLocaleString('ru');}
setBest(0);

async function showRating(period=rankingPeriod){
 if(purchaseOpen||spendPending)return;
 if(!runtimeReady||!host?.api){showNotice('Игра ещё загружается');return;}
 rankingPeriod=period==='all'?'all':'today';
 overlay.innerHTML=`<div class="panel info-panel rating-panel"><div class="panel-heading"><h2>Рейтинг</h2><p>Загружаем таблицу…</p></div><button class="primary" id="info-back">Назад</button></div>`;
 $('info-back').onclick=()=>{if(s){lastMode='';sync();}else menu();};
 try{
  const rows=await host.api.rating(rankingPeriod);
  if(purchaseOpen||spendPending)return;
  overlay.innerHTML=ratingView(rows,rankingPeriod);
  overlay.querySelectorAll('[data-period]').forEach(btn=>btn.onclick=()=>showRating(btn.dataset.period));
  $('info-back').onclick=()=>{if(s){lastMode='';sync();}else menu();};
 }catch{
  if(purchaseOpen||spendPending)return;
  overlay.innerHTML=`<div class="panel info-panel rating-panel"><div class="panel-heading"><h2>Рейтинг</h2><p>Не удалось загрузить таблицу. Проверьте связь и попробуйте снова.</p></div><button class="primary" id="info-back">Назад</button></div>`;
  $('info-back').onclick=()=>{if(s){lastMode='';sync();}else menu();};
 }
}

const arenaImage=new Image();arenaImage.src='assets/design/B01.webp';
const number=(n,d=1)=>n.toLocaleString('ru-RU',{maximumFractionDigits:d});
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function tone(){sounds.play('select');}
function soundLabel(){$('sound').innerHTML=uiIcon(sounds.enabled?3:4);$('sound').setAttribute('aria-label',sounds.enabled?'Выключить звук':'Включить звук');$('sound').setAttribute('aria-pressed',String(sounds.enabled));}
function unlockSound(){sounds.unlock();soundLabel();}
soundLabel();
$('sound').onclick=()=>{sounds.enabled=!sounds.enabled;try{localStorage.setItem('qura-yard-sound',String(sounds.enabled));}catch{}unlockSound();tone();};
function infoPanel(kind){if(purchaseOpen||spendPending)return;if(s?.mode==='playing'){pause();}overlay.innerHTML=kind==='rules'?rulesView():kind==='about'?aboutView():settingsView(sounds.enabled);$('info-back').onclick=()=>{if(s){lastMode='';sync();}else menu();};const soundVolume=$('sound-volume');if(soundVolume){soundVolume.value=String(Math.round(sounds.mix.master*100));const value=$('sound-volume-value');value.textContent=soundVolume.value+'%';soundVolume.oninput=()=>{sounds.setVolume(Number(soundVolume.value)/100);value.textContent=soundVolume.value+'%';};}const radioButton=$('radio-toggle');if(radioButton){const volume=$('radio-volume'),output=$('radio-volume-value');volume.value=String(Math.round(radio.volume*100));output.textContent=volume.value+'%';const update=()=>{if(!radioButton.isConnected)return;radioButton.setAttribute('aria-checked',String(radio.enabled));radioButton.querySelector('span').textContent=radio.enabled?'Вкл.':'Выкл.';$('radio-status').textContent=radio.message;};radio.onchange=update;radioButton.onclick=()=>radio.toggle();const setVol=()=>{radio.setVolume(Number(volume.value)/100);output.textContent=volume.value+'%';};volume.oninput=setVol;volume.onchange=setVol;update();}const btn=$('settings-sound');if(btn)btn.onclick=()=>{$('sound').click();btn.setAttribute('aria-checked',String(sounds.enabled));btn.querySelector('span').textContent=sounds.enabled?'Вкл.':'Выкл.';};}
$('rules-open').onclick=()=>infoPanel('rules');$('rating-open').onclick=()=>showRating();$('settings-open').onclick=()=>infoPanel('settings');
function menu(){if(!runtimeReady)return;release();$('event-status').hidden=true;clearPurchaseUi();host?.resetLocal?.();if(!CHARACTERS[selected])selected='ryaba';s=null;lastMode='';$('hud').hidden=true;$('boss-hud').hidden=true;$('loadout').hidden=true;$('joystick').hidden=true;$('boss-markers').innerHTML='';const box=document.getElementById('qura-connection');if(box)box.hidden=true;overlay.innerHTML=heroMenu(selected,unlockedHeroes(progress),best);const startButton=$('start');overlay.querySelector('.hero-gallery').insertAdjacentHTML('beforebegin',difficultyMenu(selectedDifficulty));overlay.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{selectedDifficulty=b.dataset.difficulty;menu();});overlay.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>{selected=b.dataset.char;menu();});overlay.querySelectorAll('[data-hero-nav]').forEach(b=>b.onclick=()=>{const ids=Object.keys(CHARACTERS);selected=ids[(ids.indexOf(selected)+Number(b.dataset.heroNav)+ids.length)%ids.length];menu();});const gallery=overlay.querySelector('.hero-gallery'),card=gallery.querySelector('.selected');gallery.scrollLeft=card.offsetLeft-gallery.offsetLeft-(gallery.clientWidth-card.clientWidth)/2;let swipe=null;gallery.onpointerdown=e=>{if(e.pointerType==='touch')swipe=e.clientX;};gallery.onpointerup=e=>{if(swipe!==null&&Math.abs(e.clientX-swipe)>45){const ids=Object.keys(CHARACTERS);selected=ids[(ids.indexOf(selected)+(e.clientX<swipe?1:-1)+ids.length)%ids.length];menu();}swipe=null;};gallery.onpointercancel=()=>swipe=null;$('menu-about').onclick=()=>infoPanel('about');$('menu-rules').onclick=()=>infoPanel('rules');$('menu-rating').onclick=()=>showRating();$('menu-settings').onclick=()=>infoPanel('settings');$('start').onclick=()=>{if(!unlockedHeroes(progress).includes(selected))return;unlockSound();if(!runtimeReady)return;beginRun();};}
function pause(){if(!s||purchaseOpen||spendPending)return;if(s.mode==='playing')host.command({type:'pause'});else if(s.mode==='paused')host.command({type:'resume'});keys.clear();release();sync();}
$('pause').onclick=pause;
window.addEventListener('keydown',e=>{if(purchaseOpen){if(e.key==='Escape')$('purchase-cancel')?.click();if(e.key==='Tab'){e.preventDefault();const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}return;}if(spendPending)return;if(e.target.closest('input,select,textarea,button,summary'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Escape'].includes(e.key))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.key==='Escape')pause();if(performance.now()>=inputBlockedUntil&&s?.mode==='upgrade'&&['1','2','3'].includes(e.key)){choose(s,Number(e.key)-1);sync();}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(s?.mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(s?.mode==='playing')pause();return;}
 // Resume: flush pending lag so soft ceiling does not pile up in the background.
 if(host?.kind==='ranked'&&host.session&&!host.busy)host.flush().catch(()=>{});
});
const joy=$('joystick');let stickOrigin={x:0,y:0};
function moveStick(e){stick=stickVector(e.clientX-stickOrigin.x,e.clientY-stickOrigin.y,lab.stickRadius||46);joy.firstChild.style.transform=`translate(${stick.x*32}px,${stick.y*32}px)`;}
function release(){pointer=null;stick={x:0,y:0};joy.hidden=true;joy.firstChild.style.transform='';}
canvas.onpointerdown=e=>{if(!s||s.mode!=='playing'||pointer!==null||e.pointerType==='mouse')return;e.preventDefault();pointer=e.pointerId;const r=canvas.getBoundingClientRect();stickOrigin={x:e.clientX,y:e.clientY};joy.style.left=(e.clientX-r.left-56)+'px';joy.style.top=(e.clientY-r.top-56)+'px';joy.hidden=false;canvas.setPointerCapture(pointer);moveStick(e);};
canvas.onpointermove=e=>{if(e.pointerId===pointer)moveStick(e);};
canvas.onpointerup=e=>{if(e.pointerId===pointer)release();};canvas.onpointercancel=canvas.onpointerup;canvas.onlostpointercapture=canvas.onpointerup;
function lockSpendButtons(){
 const reviveBtn=$('revive'),rerollBtn=$('reroll'),declineBtn=$('decline');
 if(reviveBtn)reviveBtn.disabled=true;
 if(rerollBtn)rerollBtn.disabled=true;
 if(declineBtn)declineBtn.disabled=true;
}
function clearPurchaseUi(){
 purchaseOpen=false;spendPending=false;
 document.body.classList.remove('purchasing');
}
function askPurchase(action,q){
 return new Promise(resolve=>{
  if(purchaseOpen){resolve(false);return;}
  purchaseOpen=true;document.body.classList.add('purchasing');release();
  const label=action==='reroll'?'Перебросить карточки':'Продолжить забег';
  const balance=q.balance??q.balanceAfter+q.price;
  const after=q.balanceAfter??balance-q.price;
  overlay.innerHTML=`<div class="panel purchase-panel" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><h2 id="purchase-title">Подтвердить трату GE</h2><p>${label} · <b>${q.price} GE</b></p><p>Баланс: ${balance} GE<br>После покупки: <b>${after} GE</b></p><div class="actions"><button id="purchase-cancel">Отмена</button><button class="primary" id="purchase-confirm" disabled>Подтвердить · ${q.price} GE</button></div></div>`;
  const confirm=$('purchase-confirm'),cancel=$('purchase-cancel');
  setTimeout(()=>{if(confirm.isConnected){confirm.disabled=false;confirm.focus();}},350);
  let finished=false;
  const finish=buy=>{
   if(finished)return;finished=true;inputBlockedUntil=performance.now()+450;
   confirm.disabled=true;if(cancel)cancel.disabled=true;
   // Keep purchaseOpen after confirm so sync cannot rebuild the death/revive banner
   // while the charge is in flight (that race stacked dialogs and soft-locked the run).
   if(buy){
    overlay.innerHTML=`<div class="panel purchase-panel" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><h2 id="purchase-title">Списываем GE</h2><p>${label} · <b>${q.price} GE</b></p><p>Не закрывайте игру — подтверждаем покупку.</p></div>`;
    resolve(true);
    return;
   }
   purchaseOpen=false;document.body.classList.remove('purchasing');
   resolve(false);lastMode='';sync();
  };
  cancel.onclick=()=>finish(false);
  confirm.onclick=()=>finish(true);
 });
}
function confirmSpend(action,perform){
 if(purchaseOpen||spendPending)return;
 spendPending=true;lockSpendButtons();
 if(host){
  host.spend(action,q=>askPurchase(action,q)).then(()=>{
   clearPurchaseUi();
   if(host?.run)s=host.run.state;
   lastMode='';sync();
  }).catch(error=>{
   clearPurchaseUi();
   const known={
    stale_quote:'Котировка устарела. Нажмите «Продолжить» ещё раз.',
    quote_expired:'Время подтверждения вышло. Нажмите «Продолжить» ещё раз.',
    quote_not_found:'Котировка устарела. Нажмите «Продолжить» ещё раз.',
    insufficient_ge:'Недостаточно GE для продолжения.',
    action_unavailable:'Продолжение сейчас недоступно.',
    spending_disabled:'Списание GE в этом режиме недоступно.',
   };
   const notice=known[error?.code]
    ||(error?.status===409?'Котировка устарела. Нажмите «Продолжить» ещё раз.':null)
    ||(action==='revive'
     ?'Продолжение недоступно. Завершите забег или начните новый.'
     :'Переброс недоступен. Попробуйте ещё раз.');
   showNotice(notice);
   if(host?.run)s=host.run.state;
   lastMode='';sync();
  });
  return;
 }
 const q=purchaseQuote(s,action);if(!q){clearPurchaseUi();return;}
 askPurchase(action,q).then(buy=>{
  if(buy)perform(q);
  clearPurchaseUi();lastMode='';sync();
 });
}
function showNotice(text){$('notice').textContent=text;$('notice').style.opacity=1;noticeUntil=performance.now()+3200;}
function sync(){if(!s)return;$('hud').hidden=false;$('loadout').hidden=false;if(s.mode!=='playing')release();const health=$('health');health.setAttribute('aria-label','Здоровье '+s.player.hp+' из '+s.player.maxHp);const healthKey=s.player.hp+':'+s.player.maxHp;if(health.dataset.value!==healthKey){health.innerHTML=hearts(s.player.hp,s.player.maxHp);health.dataset.value=healthKey;}const clock=time(runTime(s));if($('time').textContent!==clock)$('time').textContent=clock;const bosses=s.enemies.filter(e=>!worldCombatSuppressed(s)&&e.hp>0&&ENEMIES[e.type].isBoss);$('boss-hud').hidden=!bosses.length;const bossHtml=bosses.map(e=>`<div class="boss-row ${e.type}"><img src="assets/next/${e.type}.webp" alt=""><div class="boss-vitals"><strong>${ENEMIES[e.type].name}</strong><span role="progressbar" aria-label="Здоровье ${ENEMIES[e.type].name}" aria-valuemin="0" aria-valuemax="${Math.ceil(e.maxHp)}" aria-valuenow="${Math.max(0,Math.ceil(e.hp))}"><i style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></i></span></div><small>${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)} HP</small></div>`).join('');if($('boss-hud').dataset.value!==bossHtml){$('boss-hud').innerHTML=bossHtml;$('boss-hud').dataset.value=bossHtml;}if(bosses.length)updateBossMarkers(bosses);else if($('boss-markers').childElementCount)$('boss-markers').innerHTML='';const phase=s.mode==='victory'?'ПОБЕДА':bosses.length?'':s.bonus?'БОНУСНАЯ ВОЛНА · ОЧКИ ×2':'';const status=$('event-status');status.hidden=false;status.textContent=eventStatus(s);if($('phase').textContent!==phase)$('phase').textContent=phase;const xpWidth=`${s.xp/s.need*100}%`;if($('xpbar').style.width!==xpWidth)$('xpbar').style.width=xpWidth;const levelText='Уровень '+s.level;if($('level').textContent!==levelText)$('level').textContent=levelText;const scoreText=s.score.toLocaleString('ru');if($('run-score').textContent!==scoreText)$('run-score').textContent=scoreText;$('xpbar').parentElement.setAttribute('aria-label',`Опыт: ${Math.floor(s.xp)} из ${s.need}`);const loadoutKey=Object.entries(s.weapons).map(([id,w])=>id+':'+w.level+':'+w.effect+':'+(id==='ak'?w.reload>0?'reload':w.ammo:'')).join('|');if($('loadout').dataset.value!==loadoutKey){$('loadout').innerHTML=Object.entries(s.weapons).map(([id,w])=>`<div class="slot" role="img" aria-label="${WEAPONS[id].name}, уровень ${w.level}${w.effect?', эволюция':''}"><img class="slot-art" src="${weaponImage(id,w.effect)}" alt=""><small>${w.effect?'★':w.level+'/5'}</small></div>`).join('')+Array.from({length:3-Object.keys(s.weapons).length},()=>'<div class="slot empty-slot" aria-label="Пустой слот"></div>').join('');$('loadout').dataset.value=loadoutKey;}
if(purchaseOpen||spendPending)return;if(lastMode===s.mode)return;lastMode=s.mode;
if(s.mode==='playing'){overlay.innerHTML='';return;}
if(s.mode==='upgrade'){upgradePanel();return;}
if(s.mode==='evolution'){overlay.innerHTML=evolutionView(s);overlay.querySelectorAll('[data-effect]').forEach(b=>b.onclick=()=>{evolve(s,b.dataset.effect);lastMode='';sync();});return;}
if(s.mode==='paused'){pausePanel();return;}
if(s.mode==='victory'){if(s.fx.some(f=>f.type==='boss-death'&&f.life>.35)){overlay.innerHTML='';lastMode='';return;}victoryPanel();return;}
if(s.mode==='revive'){const price=continuePrice(s),nextHp=s.player.maxHp,attempt=(s.continuesUsed|0)+1;if(price==null){overlay.innerHTML=`<div class="panel"><div class="eyebrow">ЗАБЕГ ЗАВЕРШЁН</div><h2>Продолжение недоступно</h2><p>Время: ${time(runTime(s))}</p><div class="actions"><button class="primary" id="decline">К итогам</button></div></div>`;$('decline').onclick=()=>{declineRevive(s);sync();};return;}overlay.innerHTML=`<div class="panel"><div class="eyebrow">ПРОДОЛЖЕНИЕ ${attempt} ИЗ 2</div><h2>Ещё не конец</h2><p>Продолжить с этого места за <b>${price} GE</b>?<br>Полное здоровье: ${nextHp} HP. Без штрафа к максимуму здоровья. Бонус — магнит собирает весь лежащий опыт. Сборка и прогресс сохраняются, 2 секунды защиты.</p><p>Время: ${time(runTime(s))}</p><div class="actions"><button class="primary" id="revive">Продолжить · ${price} GE</button><button id="decline">Завершить забег</button></div></div>`;$('revive').onclick=()=>{confirmSpend('revive',q=>revive(s,q));};$('decline').onclick=()=>{if(purchaseOpen||spendPending)return;declineRevive(s);sync();};return;}
if(s.mode==='ended'){resultPanel();}}
function pausePanel(ended=false){overlay.innerHTML=pauseView(s,ended);$('resume').onclick=()=>{if(ended){unlockSound();if(!runtimeReady)return;beginRun();}else pause();};$('pause-settings').onclick=()=>infoPanel('settings');$('leave').onclick=()=>{if(ended)menu();else if(window.confirm('Завершить забег и перейти к итогам?')){manualEnded=true;finishRun(s);sync();}};}
function upgradePanel(){overlay.innerHTML=upgradeView(s);overlay.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choose(s,Number(b.dataset.choice));tone();lastMode='';sync();});$('reroll').onclick=()=>{if(s.freeRerolls>0){if(reroll(s))upgradePanel();}else confirmSpend('reroll',q=>reroll(s,q));};}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function chicken(x,y,inv=0,t=0){const id=s?.character||'ryaba';creature(ctx,id,x,y,s?.player.r||19,s?.player.facing||1,t,!!s?.player.moving,inv);}
function enemy(e,t){const boss=e.type==='turkey'||e.type==='guinea';const dx=e.x-(s?.player?.x||e.x),dy=e.y-(s?.player?.y||e.y),far=dx*dx+dy*dy>480*480;if(far&&!boss){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.flash>0?'#e6a455':'#6b5137';ctx.beginPath();ctx.ellipse(0,0,Math.max(8,e.r*.7),Math.max(6,e.r*.55),0,0,Math.PI*2);ctx.fill();ctx.restore();return;}creature(ctx,e.type,e.x,e.y,e.r,e.facing,t+e.id*.173,e.moving!==false,0,e.flash,e.attack,e.type==='fox'?{phase:e.dash%TUNING.behaviour.foxCycle,cycle:TUNING.behaviour.foxCycle,warning:TUNING.behaviour.foxWarning,dashAt:TUNING.behaviour.foxDashAt}:null);if(e.hp<e.maxHp){const w=e.r*ACTOR_SCALE,top=e.y-e.r*3.15*ACTOR_SCALE*0.55-6;ctx.fillStyle='#271809';ctx.fillRect(e.x-w,top,w*2,4);ctx.fillStyle='#e6a455';ctx.fillRect(e.x-w,top,w*2*Math.max(0,e.hp)/e.maxHp,4);}}

const grass=Array.from({length:700},(_,i)=>({x:(i*139.31)%1200,y:(i*91.67)%800,shade:i%3}));
function draw(){if(overlay.childElementCount>0)return;const dpr=Math.min(devicePixelRatio||1,(canvas.clientWidth||390)<700?1.5:2),w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const p=s?.player||{x:600,y:400};const view=cameraView(w,h,p,WORLD),{scale,vw,vh,cx,cy}=view;ctx.translate(view.offsetX,view.offsetY);ctx.scale(scale,scale);
if(arenaImage.complete&&arenaImage.naturalWidth){const pattern=arenaPattern||(arenaPattern=groundPattern(ctx,arenaImage));ctx.save();ctx.scale(.55,.55);ctx.fillStyle=pattern;ctx.fillRect((cx-vw/2)/.55-8,view.viewY/.55-8,vw/.55+16,vh/.55+16);ctx.restore();}else{ctx.fillStyle='#587447';ctx.fillRect(0,0,WORLD.width,WORLD.height);const light=ctx.createRadialGradient(570,340,30,600,400,750);light.addColorStop(0,'#90a26855');light.addColorStop(1,'#213d3544');ctx.fillStyle=light;ctx.fillRect(0,0,WORLD.width,WORLD.height);ellipse(280,240,150,80,'#b5a36a12');ellipse(890,610,220,100,'#c3b17715');for(const g of grass){ctx.strokeStyle=['#b0bb6e40','#2a503c45','#d2c67e25'][g.shade];ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x-3,g.y-5);ctx.moveTo(g.x,g.y);ctx.lineTo(g.x+3,g.y-7);ctx.stroke();}
}
landscape(ctx,s,{x:cx-vw/2,y:view.viewY,w:vw,h:vh});drawEventGround(ctx,s,{x:cx-vw/2,y:view.viewY,w:vw,h:vh});

if(!s){chicken(600,430,0,performance.now()/1000);return;}groundEffects(ctx,s);const seedView={x:cx-vw/2,y:view.viewY,w:vw,h:vh};for(const g of s.gems)if(visibleSeed(g,seedView))seed(ctx,g,s.time);for(const w of s.worms)drawWorm(ctx,w,s.time);for(const m of s.magnets)drawMagnet(ctx,m,s.time);
visibleEnemies.length=0;for(const e of s.enemies)if(!worldCombatSuppressed(s)&&visibleBody(e,seedView))visibleEnemies.push(e);if(visibleEnemies.length>1)visibleEnemies.sort((a,b)=>a.y-b.y);for(const e of visibleEnemies)enemy(e,s.time);chicken(p.x,p.y,p.inv,s.time);
objects(ctx,s);for(const b of s.bullets)projectile(ctx,b);
for(const a of s.acorns)acorn(ctx,a);for(const a of s.attacks)melee(ctx,a);for(const f of s.fx)if(!bossEffect(ctx,f))effect(ctx,f);telegraphs(ctx,s);ctx.setTransform(dpr,0,0,dpr,0,0);lowHealth(ctx,s,w,h);damageFeedback(ctx,s,w,h);drawEventSky(ctx,s,w,h,view);}

let hudTick=0;function frame(now){connectionNotice();const dt=Math.min((now-last)/1000||0,.05);last=now;if(s){if(host?.run)s=host.run.state;const input=lab.input?lab.input(keys,stick):{x:stick.x,y:stick.y};if(!purchaseOpen)lab.beforeStep(s);if(s.mode!=='playing')for(const f of s.fx)if(f.type==='boss-death')f.life=Math.max(0,f.life-dt);const spawnCamera=cameraView(canvas.clientWidth,canvas.clientHeight,s.player,WORLD);input.view={width:Math.max(300,Math.min(1600,Math.ceil(spawnCamera.vw))),height:Math.max(300,Math.min(1200,Math.ceil(spawnCamera.vh)))};host.advance(dt,input);sounds.observe(s);for(const ev of s.events){sounds.play(ev);if(ev.startsWith('event:')){const copy={'event:night-warning':'СМЕРКАЕТСЯ · НОЧЬ ЧЕРЕЗ 5 СЕКУНД','event:night':'НОЧЬ · МЫШИ ВЫШЛИ НА ПОИСКИ ЗЕРНА','event:day':'РАССВЕТ','event:rain':'ДОЖДЬ · ОБХОДИ ЛУЖИ','event:hunt-warning':'ВОЯТ ВОЛКИ · СКОРО НАЧНЁТСЯ ОХОТА','event:hunt':'ОХОТА · СТАЯ ПОСТЕПЕННО ОКРУЖАЕТ ДВОР','event:night-required':'ЭТО СОБЫТИЕ ДОСТУПНО НОЧЬЮ','event:nuclear-landed':'ГДЕ-ТО ВДАЛИ ЧТО-ТО УПАЛО…','event:nuclear-warning':'ЗАРЯД АКТИВИРОВАН · ОТОЙДИ','event:hunt-foxes':'ЛИСЫ ВХОДЯТ В КОЛЬЦО','event:nuclear':'ЯДЕРНЫЙ УДАР ПО ВРАГАМ'};if(copy[ev])showNotice(copy[ev]);}if(ev==='magnet')showNotice('МАГНИТ');if(ev==='boss:guinea')showNotice('ЦЕСАРКА');if(ev==='boss:turkey')showNotice('ИНДЮК');if(ev.startsWith('boss-defeated:'))showNotice('БОСС ПОВЕРЖЕН!');if(ev==='bonus')showNotice('ИНДЮК ПОВЕРЖЕН · СУНДУК ЗАРАБОТАН');}const rewards=[];if(rewards.length){try{localStorage.setItem('qura-yard-progress',JSON.stringify(progress));}catch{}showNotice('ОТКРЫТА КУРОЧКА: '+rewards.map(id=>CHARACTERS[id].name).join(', '));}s.events.length=0;if(now-hudTick>100||lastMode!==s.mode){sync();hudTick=now;}}draw();if(now>noticeUntil)$('notice').style.opacity=0;requestAnimationFrame(frame);}async function prepareAccess(){host=new QuRaHost();setBest(0);progress={guinea:true,turkey:true};lab=createTestLab({getState:()=>s,getHost:()=>host,refresh:()=>{lastMode='';sync();},pause,notify:showNotice});}async function prepareMenu(){overlay.innerHTML='<div class="panel loading-panel"><img class="loading-cover" width="1672" height="941" src="assets/catalog/poultry-yard-splash-v1.webp" alt="Рэмбо защищает Птичий двор от наступающих зверей"><h2>Готовим двор</h2><p></p><progress id="asset-progress" max="1" value="0" aria-label="Загрузка изображений"></progress></div>';const sources=[...weatherImages.map(i=>i.src),...Object.values(environmentImages).map(i=>i.src),...Object.values(vfxImages).flat().map(i=>i.src),...Object.values(approvedImages).flat().map(i=>i.src),'assets/design/F01.webp','assets/design/S03-01-trim.png','assets/design/S03-02-trim.png',...Object.values(art).map(i=>i.src),...Object.values(walkArt).flat().map(i=>i.src),...Object.values(combatArt).map(i=>i.src),...Object.values(birdArt).flatMap(actions=>Object.values(actions).flat()).map(i=>i.src)];let loaded=0;await Promise.all(sources.map(src=>new Promise(resolve=>{const im=new Image();const finish=()=>{loaded++;const bar=document.getElementById('asset-progress');if(bar)bar.value=loaded/sources.length;resolve();};im.onload=finish;im.onerror=finish;im.src=src;})));await document.fonts.ready;try{await loadVfx();await prepareAccess();runtimeReady=true;menu();}catch(error){console.error('Preview initialization failed',error);overlay.innerHTML='<div class="panel"><h2>Игра временно недоступна</h2><p>Подключение к QuRa ещё не завершено. Обновите страницу позже.</p></div>';} }prepareMenu();requestAnimationFrame(frame);

function updateBossMarkers(bosses){const w=canvas.clientWidth,h=canvas.clientHeight,v=cameraView(w,h,s.player,WORLD);$('boss-markers').innerHTML=bosses.map((e,index)=>{const m=bossMarker(e,v,w,h);if(!m)return '';return `<div class="boss-marker ${e.type}" style="left:${m.x}px;top:${Math.max(v.top+26,Math.min(h-v.bottom-26,m.y+index*24))}px"><span class="boss-arrow" style="transform:rotate(${m.angle}rad)">➤</span><span>${e.type==='turkey'?'Индюк':'Цесарка'}</span></div>`;}).join('');}
function chestPicture(open=false){return chestMarkup('main',{open})+`<p class="loot-tap-hint" style="margin:0">${open?'Открытый':'Заработанный'} ценный сундук</p>`;}
function victoryPanel(){release();overlay.innerHTML=`<div class="panel victory-panel"><div class="eyebrow">ПРОХОЖДЕНИЕ ЗАВЕРШЕНО</div><h2>Индюк повержен!</h2>${chestPicture()}<p>Сундук заработан. Откроется на экране итогов:<br><b>21–67 GE и случайный аксессуар</b>.</p><p>Заверши забег сейчас или добровольно продолжи бонусную волну. Сундук сохранится до итогов, даже если курочка погибнет в бонусной волне.</p><div class="actions"><button class="primary" id="continue-bonus">Продолжить забег</button><button id="finish-victory">Завершить и открыть сундук</button></div></div>`;$('finish-victory').onclick=()=>{finishRun(s);lastMode='';sync();};$('continue-bonus').onclick=()=>{continueBonus(s);lastMode='';sync();};}
function resultPanel(){
 const runScore=Math.max(0,Math.floor(Number(s?.score)||0));
 if(host?.kind==='ranked')setBest(Math.max(best,runScore));
 host.finish().then(receipt=>{
  if(receipt.rewardsEnabled)showNotice('Результат сохранён');
  if(receipt.rewardsEnabled)setBest(Math.max(best,Number(receipt.score)||runScore));
  const bestEl=overlay.querySelector('.personal-best b');
  if(bestEl)bestEl.textContent=best.toLocaleString('ru');
  renderServerLoot(receipt);
 }).catch(()=>showNotice('Результат проверяется. Повторите запрос после восстановления связи.'));
 overlay.innerHTML=resultView(manualEnded?{...s,endReason:'quit'}:s,null,best);
 $('again').onclick=()=>{unlockSound();if(!runtimeReady)return;beginRun();};
 $('change').onclick=menu;
 $('rating').onclick=()=>showRating();
 $('stats').onclick=()=>pausePanel(true);
}

let starting=false;
async function beginRun(){
 ttlWarned=false;
 if(!runtimeReady||!host||starting)return;
 starting=true;
 try{
  await host.abandon({force:true});
  lab.prepareRun?.();s=await host.start(selected,selectedDifficulty);
  manualEnded=false;lastMode='';sync();
 }catch(error){
  host.resetLocal();
  s=null;
  const known={no_tickets:'Нет билетов для входа',insufficient_ge:'Недостаточно GE для входа',active_session_exists:'Уже есть активный забег. Обновите страницу.',hero_locked:'Эта курочка ещё не открыта'};
  const msg=typeof error?.message==='string'&&error.message&&!error.message.startsWith('QuRa request failed')?error.message:(known[error?.code]||'Не удалось начать забег. Проверьте билеты, баланс GE и соединение.');
  showNotice(msg);
  menu();
 }finally{starting=false;}
}
function choose(_,index){return host.command({type:'choose',index});}
function evolve(_,effect){return host.command({type:'evolve',effect});}
function reroll(){return host.command({type:'reroll'});}
function revive(){return false;}
function declineRevive(){return host.command({type:'decline-revive'});}
function continueBonus(){return host.command({type:'continue-bonus'});}
function finishRun(){return host.command({type:'finish'});}

function renderServerLoot(receipt){
 const panel=overlay.querySelector('.results-panel');if(!panel)return;
 const actions=panel.querySelector('.actions');
 const hostNode=document.createElement('div');
 hostNode.className='server-loot-host';
 if(actions)panel.insertBefore(hostNode,actions);else panel.append(hostNode);
 unlockSound();
 mountLootChests(hostNode,{
  lootboxes:receipt.lootboxes||[],
  rewardsEnabled:!!receipt.rewardsEnabled,
  sounds,
  open:(id,key)=>host.api.request('/lootboxes/'+id+'/open',{method:'POST',body:{},key}),
 });
}

function syncErrorCopy(error){
 const code=error?.code||'';
 if(code==='network'||(typeof navigator!=='undefined'&&navigator.onLine===false))
  return{title:'Нет сети. Забег на паузе — можно повторить.',retry:'Сеть ещё не доступна. Можно выйти в меню.'};
 if(code==='bridge_busy'||code==='replay_busy'||error?.status===503)
  return{title:'Сервер занят. Забег на паузе — повторите запрос.',retry:'Сервер ещё занят. Можно выйти в меню.'};
 if(code==='server_error'||(error?.status|0)>=500)
  return{title:'Сервер временно недоступен. Забег на паузе.',retry:'Сервер ещё недоступен. Можно выйти в меню.'};
 return{title:'Не удалось синхронизировать забег. Можно повторить.',retry:'Синхронизация ещё не прошла. Можно выйти в меню.'};
}
// An uncertain request freezes commands; retry reuses persisted keys and never resubmits a new charge.
let ttlWarned=false;
function sessionTtlNotice(){
 const expires=host?.session?.expiresAt;
 if(!expires||host?.kind!=='ranked'||!s)return;
 const leftMs=Date.parse(expires)-Date.now();
 if(!Number.isFinite(leftMs))return;
 if(leftMs<=0){showNotice('Сессия истечёт сейчас. Завершите забег.');return;}
 if(leftMs<=5*60*1000&&!ttlWarned){
  ttlWarned=true;
  const mins=Math.max(1,Math.ceil(leftMs/60000));
  showNotice('Сессия истечёт через '+mins+' мин. Завершите забег.');
 }
}
function connectionNotice(){
 let box=document.getElementById('qura-connection');
 if(host?.expired){
  host.expired=false;ttlWarned=false;
  if(box)box.hidden=true;
  showNotice('Сессия истекла. Начните новый забег.');
  host.resetLocal();s=null;menu();
  return;
 }
 sessionTtlNotice();
 // Soft in-flight sync: show a notice without freezing — hard banner only when busy+error.
 if(host?.syncing&&!host?.busy&&!host?.error){
  if(box)box.hidden=true;
  if(!$('notice').textContent||$('notice').style.opacity==='0')showNotice('Синхронизация…');
  return;
 }
 if(!host?.error||(!host.busy&&host.flushFails<3)){if(box)box.hidden=true;return;}
 const copy=syncErrorCopy(host.error);
 if(!box){box=document.createElement('div');box.id='qura-connection';box.setAttribute('role','alert');
  box.style.cssText='position:fixed;left:8px;right:8px;bottom:16px;z-index:999;background:#291204;color:white;padding:16px;display:grid;gap:8px';
  const text=document.createElement('p');text.dataset.role='sync-message';
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const button=document.createElement('button');button.textContent='Повторить запрос';
  const leave=document.createElement('button');leave.textContent='В меню';
  button.onclick=async()=>{button.disabled=true;leave.disabled=true;try{await host.recover();if(!host.run){menu();return;}s=host.run.state;lastMode='';sync();}catch(error){if(error?.code==='session_closed'){showNotice('Забег на сервере уже закрыт. Начните новый.');host.resetLocal();s=null;menu();}else showNotice(syncErrorCopy(error).retry);}finally{button.disabled=false;leave.disabled=false;}};
  leave.onclick=()=>{host.resetLocal();s=null;menu();};
  actions.append(button,leave);box.append(text,actions);document.body.append(box);
 }
 const text=box.querySelector('[data-role="sync-message"]');
 if(text)text.textContent=copy.title;
 box.hidden=false;
}
