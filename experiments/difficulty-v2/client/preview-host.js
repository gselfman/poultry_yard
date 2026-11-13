import {createReplay,advanceReplay,replayCommand} from './session-replay.js';
import {purchaseQuote} from './run-rules.js';
// Local-only host: no production API, wallet, tickets, loot or leaderboard writes.
export class PreviewHost{
 constructor(){this.kind='preview';this.api={rating:async()=>[]};this.resetLocal();}
 resetLocal(){this.run=null;this.session=null;this.accumulator=0;this.error=null;this.busy=false;this.commands=[];}
 async start(character,difficulty='hard'){this.run=createReplay({seed:crypto.getRandomValues(new Uint32Array(1))[0],character,geBalance:50,difficulty,eventRules:this.eventRules||{}});return this.run.state;}
 async abandon(){this.resetLocal();}
 advance(dt,input){if(!this.run)return;this.run.input={x:Math.max(-1,Math.min(1,input.x)),y:Math.max(-1,Math.min(1,input.y))};if(input.view)this.run.state.spawnView=input.view;this.accumulator+=dt*(this.timeScale||1);let steps=0;while(this.accumulator>=1/60&&steps++<32){advanceReplay(this.run,this.run.tick+1,{retainEvents:true});this.accumulator-=1/60;}}
 command(command){replayCommand(this.run,{...command,tick:this.run.tick});return true;}
 async spend(action,confirm){const q=purchaseQuote(this.run.state,action);if(!q)throw Error('Action unavailable');if(!await confirm(q))return false;replayCommand(this.run,{type:action,tick:this.run.tick},{authorizeSpend:()=>true});return true;}
 async finish(){return {rewardsEnabled:false,lootboxes:[],test:true};}
 async flush(){}
}
