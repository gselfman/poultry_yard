export const PAID_REROLL_LIMIT=3;
export const CONTINUE_PRICES=Object.freeze([20,100]);
const used=new WeakSet(),issued=new WeakSet();
export function continuePrice(s){if(s.bossEvents?.turkey==='dead')return null;const price=CONTINUE_PRICES[s.continuesUsed|0];return Number.isFinite(price)?price:null;}
export function purchaseQuote(s,action){const price=action==='reroll'?5:action==='revive'?continuePrice(s):NaN;if(!Number.isFinite(price)||s.ge<price)return null;if(action==='reroll'&&(s.mode!=='upgrade'||s.freeRerolls>0||s.stats.paidRerolls>=PAID_REROLL_LIMIT))return null;if(action==='revive'&&(s.mode!=='revive'||continuePrice(s)==null))return null;const q=Object.freeze({state:s,action,price,balance:s.ge,mode:s.mode,time:s.time,choices:s.choices,continuesUsed:s.continuesUsed|0});issued.add(q);return q;}
export function consumeQuote(s,action,q){if(!q||!issued.has(q)||used.has(q)||q.time!==s.time||q.choices!==s.choices||q.state!==s||q.action!==action||q.balance!==s.ge||q.mode!==s.mode||(action==='revive'&&q.continuesUsed!==(s.continuesUsed|0)))return false;const current=purchaseQuote(s,action);if(!current||current.price!==q.price)return false;used.add(q);return true;}
export function cleanProgress(value){return {guinea:value?.guinea===true,turkey:value?.turkey===true};}
export function unlockedHeroes(p){return ['ryaba',...(p.guinea?['rambo']:[]),...(p.turkey?['monk']:[])];}
export function recordVictories(p,bossEvents){const added=[];for(const [boss,hero] of [['guinea','rambo'],['turkey','monk']])if(bossEvents[boss]==='dead'&&!p[boss]){p[boss]=true;added.push(hero);}return added;}
