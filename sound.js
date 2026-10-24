// Procedural effects: no downloads, decoded files or looping sources.
export class Soundscape {
 constructor(){this.enabled=true;this.last=new Map();try{this.enabled=localStorage.getItem('qura-yard-sound')!=='false';}catch{}}
 unlock(){try{if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.26;const compressor=this.ctx.createDynamicsCompressor();this.master.connect(compressor).connect(this.ctx.destination);const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*.4,this.ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.noise=buffer;}this.ctx.resume().catch(()=>{});}catch{}if(this.master)this.master.gain.value=this.enabled?.26:0;}
 note(frequency,duration,volume=.25,type='sine',end=frequency,delay=0){const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);}
 hiss(duration,frequency,volume=.12){const c=this.ctx,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter).connect(gain).connect(this.master);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);source.stop(t+duration);}
 play(event){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime,minGap=event==='hit'?.065:event.startsWith('fire:')?.055:.12;if(now-(this.last.get(event)??-100)<minGap)return;this.last.set(event,now);
 switch(event){
 case 'fire:egg':this.note(330,.09,.22,'sine',130);this.hiss(.045,900,.08);break;
 case 'fire:ak':this.hiss(.065,1800,.28);this.note(140,.07,.19,'triangle',45);break;
 case 'fire:beak':this.hiss(.22,1100,.16);this.note(230,.13,.09,'triangle',100);break;
 case 'fire:feather':this.hiss(.24,2400,.18);break;
 case 'fire:martial':this.hiss(.28,650,.2);this.note(100,.16,.14,'sine',45);break;
 case 'hit':this.hiss(.045,1300,.09);this.note(180,.04,.08,'triangle',90);break;
 case 'hurt':this.note(140,.23,.4,'triangle',48);this.hiss(.14,400,.2);break;
 case 'reload':this.hiss(.08,2600,.16);this.note(480,.06,.07,'square',270,.12);break;
 case 'level':case 'bonus':case 'revive':[392,494,587,784].forEach((f,i)=>this.note(f,.3,.16,'sine',f,i*.09));break;
 case 'magnet':[260,390,520,780].forEach((f,i)=>this.note(f,.16,.12,'sine',f*1.1,i*.055));break;
 case 'heal':this.note(520,.16,.15,'sine',780);break;
 case 'end':case 'revive-offer':[294,247,196].forEach((f,i)=>this.note(f,.25,.15,'triangle',f*.9,i*.12));break;
 case 'select':this.note(640,.07,.12,'sine',820);break;
 }
 }
}
