// Same-origin live stream. Never set crossOrigin: that forces a CORS media
// request and breaks Icecast through nginx. GainNode still works same-origin.
const STREAM=typeof location!=='undefined'?new URL('/radio',location.origin).href:'https://qura.one/radio';
const DEFAULT_VOLUME=.2;
const MIN_VOLUME=.01;
// Icecast master is near full-scale; UI 100% maps through this ceiling.
const GAIN_CEILING=.35;
const clamp=v=>Math.max(MIN_VOLUME,Math.min(1,Number.isFinite(v)?v:DEFAULT_VOLUME));
const toGain=v=>clamp(v)*GAIN_CEILING;

export class QuRaRadio {
 constructor({createAudio=()=>new Audio(),createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),storage,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  try{this.storage=storage??globalThis.localStorage;}catch{this.storage=null;}
  this.setTimer=setTimer;this.clearTimer=clearTimer;this.createContext=createContext;
  this.audio=createAudio();this.audio.preload='none';
  this.enabled=false;this.message='Включается по нажатию. Звуки боя настраиваются отдельно.';
  this.volume=DEFAULT_VOLUME;this.generation=0;this.attempt=0;this.timer=null;
  this.ctx=null;this.source=null;this.gain=null;this.graphFailed=false;
  try{this.volume=clamp(Number(this.storage?.getItem('qura-yard-radio-volume')??DEFAULT_VOLUME));}catch{}
  this.applyVolume();
  this.audio.addEventListener('error',()=>this.reconnect());
  this.audio.addEventListener('ended',()=>this.reconnect());
  this.audio.addEventListener('playing',()=>{if(this.enabled){this.attempt=0;this.message='Радио играет';this.applyVolume();this.notify();}});
 }
 notify(){this.onchange?.();}
 // HTMLMediaElement.volume is ignored on iOS; route through GainNode instead.
 ensureGraph(){
  if(this.gain)return true;
  if(this.graphFailed)return false;
  try{
   this.ctx=this.createContext();
   this.source=this.ctx.createMediaElementSource(this.audio);
   this.gain=this.ctx.createGain();
   this.gain.gain.value=toGain(this.volume);
   this.source.connect(this.gain).connect(this.ctx.destination);
   this.audio.volume=1;
   return true;
  }catch{
   this.graphFailed=true;this.source=null;this.gain=null;this.ctx=null;
   return false;
  }
 }
 applyVolume(){
  const gain=toGain(this.volume);
  if(this.gain){
   const param=this.gain.gain,t=this.ctx?.currentTime??0;
   try{param.cancelScheduledValues(t);}catch{}
   try{param.setValueAtTime(gain,t);}catch{param.value=gain;}
   this.audio.volume=1;
  }else{
   this.audio.volume=gain;
  }
 }
 setVolume(v){
  this.volume=clamp(v);
  this.applyVolume();
  try{this.storage?.setItem('qura-yard-radio-volume',String(this.volume));}catch{}
  this.notify();
 }
 async toggle(){
  if(this.enabled){this.stop();return;}
  this.enabled=true;this.attempt=0;this.message='Подключаем радио…';this.notify();
  // Build the graph inside the tap handler so iOS unlocks AudioContext.
  this.ensureGraph();
  await this.play(++this.generation);
 }
 async play(generation){
  if(!this.enabled||generation!==this.generation)return;
  this.ensureGraph();
  try{await this.ctx?.resume?.();}catch{}
  if(!this.enabled||generation!==this.generation)return;
  this.audio.src=STREAM;
  this.applyVolume();
  try{
   await this.audio.play();
   if(generation!==this.generation){if(!this.enabled)this.audio.pause();return;}
   this.applyVolume();
   this.message='Радио играет';this.notify();
  }catch(e){
   if(generation!==this.generation)return;
   if(e.name==='NotAllowedError'){this.stop();this.message='Браузер просит ещё раз нажать «Включить радио».';this.notify();}
   else this.reconnect();
  }
 }
 reconnect(){
  if(!this.enabled||this.timer!==null)return;
  if(this.attempt>=5){this.stop();this.message='Радио недоступно. Можно попробовать включить ещё раз.';this.notify();return;}
  const generation=this.generation,delay=Math.min(30000,1000*2**this.attempt++);
  this.message='Связь с радио прервалась. Подключаем снова…';this.notify();
  this.timer=this.setTimer(()=>{this.timer=null;this.play(generation);},delay);
 }
 stop(){
  this.enabled=false;++this.generation;
  if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
  this.audio.pause();this.audio.removeAttribute('src');
  // Keep MediaElementSource; do not load() — some engines drop the graph link.
  try{this.audio.removeAttribute('src');}catch{}
  this.message='Радио выключено';this.notify();
 }
}
