export const PAID_REROLL_LIMIT=3;
const used=new WeakSet(),issued=new WeakSet();
export function purchaseQuote(s,action){const price=action==='reroll'?5:action==='revive'?20:NaN;if(!Number.isFinite(price)||s.ge<price)return null;if(action==='reroll'&&(s.mode!=='upgrade'||s.freeRerolls>0||s.stats.paidRerolls>=PAID_REROLL_LIMIT))return null;if(action==='revive'&&(s.mode!=='revive'||s.revived||s.time>=600))return null;const q=Object.freeze({state:s,action,price,balance:s.ge,mode:s.mode,time:s.time,choices:s.choices});issued.add(q);return q;}
export function consumeQuote(s,action,q){if(!q||!issued.has(q)||used.has(q)||q.time!==s.time||q.choices!==s.choices||q.state!==s||q.action!==action||q.balance!==s.ge||q.mode!==s.mode)return false;const current=purchaseQuote(s,action);if(!current||current.price!==q.price)return false;used.add(q);return true;}
export function cleanProgress(value){return {guinea:value?.guinea===true,turkey:value?.turkey===true};}
export function unlockedHeroes(p){return ['ryaba',...(p.guinea?['rambo']:[]),...(p.turkey?['monk']:[])];}
export function recordVictories(p,bossEvents){const added=[];for(const [boss,hero] of [['guinea','rambo'],['turkey','monk']])if(bossEvents[boss]==='dead'&&!p[boss]){p[boss]=true;added.push(hero);}return added;}
