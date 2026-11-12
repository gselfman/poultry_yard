// Prototype rewards only. Production supplies an approved accessory catalog and server ledger.
export const ACCESSORIES=[]; // No prototype inventory in QuRa.
export function earnChest(s){if(s.chest.earned)return false;s.chest.earned=true;s.events.push('chest-earned');return true;}
export function openRunChest(s,catalog=ACCESSORIES){if(s.mode!=='ended'||!s.chest.earned||!catalog.length)return null;if(s.chest.opened)return s.chest.reward;const roll=()=>Math.max(0,Math.min(.999999999,Number(s.random())||0));const reward=Object.freeze({ge:21+Math.floor(roll()*47),accessory:{...catalog[Math.floor(roll()*catalog.length)]},prototypeOnly:true});s.chest.reward=reward;s.chest.opened=true;return reward;}
export function continueBonus(s){if(s.mode!=='victory')return false;s.awaitingBonusChoice=false;s.mode=s.pending?'upgrade':'playing';return true;}
export function finishRun(s){if(!['victory','paused','playing'].includes(s.mode))return false;s.awaitingBonusChoice=false;s.mode='ended';return true;}
