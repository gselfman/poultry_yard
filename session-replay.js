// Shared deterministic driver for the future browser/isolated server replay adapter.
// Never accept reward totals, boss flags, balance edits or receipts from client JSON.
import {createGame,step,choose,evolve,reroll,revive,declineRevive} from './engine.js';
import {purchaseQuote} from './run-rules.js';
import {continueBonus,finishRun} from './rewards.js';
export const ENGINE_PROTOCOL='poultry-v1';
export const TICK_RATE=60;
export function seededRandom(seed){if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('uint32 seed required');let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
export function createReplay({seed,character='ryaba',geBalance=0}){if(!Number.isSafeInteger(geBalance)||geBalance<0)throw new Error('Invalid GE balance');const state=createGame(character,seededRandom(seed));state.ge=geBalance;return {state,tick:0,input:{x:0,y:0},settled:false};}
export function advanceReplay(run,toTick,{maxAdvance=600}={}){if(!Number.isSafeInteger(toTick)||toTick<run.tick||toTick-run.tick>maxAdvance)throw new Error('Invalid tick window');while(run.tick<toTick){step(run.state,1/TICK_RATE,run.input);run.state.events.length=0;run.tick++;}return run.state;}
export function replayCommand(run,command,{authorizeSpend=()=>false}={}){if(run.settled||!command||typeof command!=='object')throw new Error('Invalid session');advanceReplay(run,command.tick);const s=run.state;let ok=false;switch(command.type){
 case 'move':if(!Number.isFinite(command.x)||!Number.isFinite(command.y)||Math.abs(command.x)>1||Math.abs(command.y)>1)throw new Error('Invalid movement');run.input={x:command.x,y:command.y};return true;
 case 'choose':if(s.mode==='upgrade'&&Number.isInteger(command.index)&&s.choices[command.index]){ok=choose(s,command.index)===true;}break;
 case 'evolve':if(s.mode==='evolution'){ok=evolve(s,command.effect)===true;}break;
 case 'reroll':case 'revive':{if(command.type==='reroll'&&s.freeRerolls>0){ok=reroll(s);break;}const quote=purchaseQuote(s,command.type);if(quote&&authorizeSpend({action:command.type,price:quote.price,tick:run.tick,command})===true)ok=command.type==='reroll'?reroll(s,quote):revive(s,quote);break;}
 case 'decline-revive':if(s.mode==='revive'){declineRevive(s);ok=true;}break;
 case 'continue-bonus':ok=continueBonus(s);break;
 case 'finish':ok=finishRun(s);if(ok)run.settled=true;break;
 default:throw new Error('Unknown replay command');
 }if(!ok)throw new Error('Command rejected in current state');return true;}
