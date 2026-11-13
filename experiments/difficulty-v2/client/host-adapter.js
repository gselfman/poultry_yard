import {PoultryApi} from './integration-client.js';
import {decode} from './checkpoint.js';
import {createReplay,advanceReplay,replayCommand} from './session-replay.js';

// Ranked sessions debit a shared ticket, replay on the server and settle GE lootboxes.
export class QuRaHost {
 constructor(bootstrap,kind='sandbox',{storage=globalThis.sessionStorage}={}){
  this.storage=storage;
  this.bootstrap=bootstrap;this.kind=kind;this.api=new PoultryApi({csrfToken:bootstrap.csrfToken});
  this.commands=[];this.busy=false;this.pending=null;this.error=null;this.accumulator=0;
  this.holdFlush=false;this.spendLock=false;this.expired=false;this.flushFails=0;this.syncing=false;
  this.walletGe=Number.isSafeInteger(bootstrap?.balance)?bootstrap.balance:0;
 }
 get sessionKey(){return this.kind==='ranked'?'qura-poultry-session':'qura-poultry-session:'+this.kind;}
 get economic(){return this.kind==='ranked';}
 /** Classify batch/network failures so the UI can show a precise message. */
 static classifyError(error){
  if(!error)return null;
  if(error.code==='session_closed'||error.status===410||error.code==='session_expired')
   return Object.assign(error,{code:error.code==='session_closed'?error.code:'session_expired'});
  if(error.code==='bridge_busy'||error.status===503||error.code==='replay_busy'||/503|bridge_busy/i.test(error.message||''))
   return Object.assign(error,{code:error.code==='bridge_busy'?'bridge_busy':'replay_busy',status:error.status||503});
  const msg=String(error.message||'');
  const offline=typeof navigator!=='undefined'&&navigator.onLine===false;
  if(offline||error.name==='TypeError'||error.code==='network'
     ||/Failed to fetch|NetworkError|network|Load failed|offline|QuRa timeout/i.test(msg)
     ||error.status===0)
   return Object.assign(error,{code:'network',status:error.status||0});
  if(error.status>=500)return Object.assign(error,{code:'server_error'});
  if(!error.code)error.code='sync_failed';
  return error;
 }
 /** Soft failures may retry without freezing the yard; hard ones pause input. */
 static isSoftBatchError(error){
  const code=error?.code;
  return code==='replay_busy'||code==='bridge_busy'||code==='network'||error?.status===503
   ||error?.name==='TypeError'||/Failed to fetch|NetworkError|network|Load failed|QuRa timeout/i.test(String(error?.message||''));
 }
 static isHardBatchError(error){
  const code=error?.code;
  return code==='sequence_conflict'||code==='tick_window'||code==='accelerated_run'
   ||error?.status===401||error?.status===403||error?.status===422;
 }
 /** Mirror ledger GE into the live run so upgrade/pause UI can enable paid actions. */
 applyWallet(balance){
  if(Number.isSafeInteger(balance)&&balance>=0)this.walletGe=balance;
  if(this.run?.state&&this.economic)this.run.state.ge=this.walletGe;
 }
 get storageKey(){return 'qura-poultry-pending:'+this.session.sessionId;}
 clearStoredSession(sid){
  if(!sid)return;
  this.storage.removeItem(this.sessionKey);
  this.storage.removeItem('qura-poultry-pending:'+sid);
  this.storage.removeItem('qura-poultry-pending:'+sid+':purchase');
  this.storage.removeItem('qura-poultry-pending:'+sid+':settle');
 }
 resetLocal(){
  this.run=null;this.session=null;this.abandonKey=null;this.pending=null;this.commands=[];
  this.error=null;this.busy=false;this.sending=null;this.needsSync=false;this.accumulator=0;
  this.holdFlush=false;this.spendLock=false;this.expired=false;this.flushFails=0;this.syncing=false;
 }
 async start(character){
  let created=false;
  try{
  let active=this.bootstrap.activeSession;
  // Sandbox/casual: start afresh with the hero from the menu. Ranked keeps its ticketed run.
  if(active&&(this.kind==='sandbox'||this.kind==='casual')){
   if(active.kind!==this.kind){
    // Never discard a live ranked session when opening casual/sandbox.
    if(active.kind==='ranked')throw Error('Session kind mismatch');
   }else{
    this.session=active;
    await this.abandon();
    this.bootstrap.activeSession=null;
    this.storage.removeItem('qura-poultry-start:'+this.kind);
    active=null;
   }
  }
  if(!active&&this.kind!=='sandbox'){const sid=this.storage.getItem(this.sessionKey);
   if(sid){
    try{active=await this.api.request('/sessions/'+encodeURIComponent(sid));}
    catch(error){
     if(this.kind==='casual'&&error.status===404){this.clearStoredSession(sid);active=null;}
     else if(this.kind==='ranked'){this.clearStoredSession(sid);active=null;}
     else throw error;
    }
   }
  }
  if(active&&active.status&&active.status!=='active'){
   this.clearStoredSession(active.sessionId||this.storage.getItem(this.sessionKey));active=null;
  }
  if(active&&active.kind!==this.kind)throw Error('Session kind mismatch');
  if(active){this.session=active;this.bootstrap.activeSession=null;}
  else{
   const slot='qura-poultry-start:'+this.kind;
   const pending=JSON.parse(this.storage.getItem(slot)||'null')||{key:crypto.randomUUID(),character,
    protocol:this.bootstrap.protocol,engineHash:this.bootstrap.engineHash,kind:this.kind};
   this.storage.setItem(slot,JSON.stringify(pending));
   this.session=await this.api.start(pending,pending.key);this.storage.removeItem(slot);
   created=true;
  }
  if(this.session.kind!==this.kind)throw Error('Session kind mismatch');
  if(this.kind==='casual'&&this.session.rewardsEnabled!==false)throw Error('Casual rewards must be disabled');
  // Sandbox uses local lab settings; casual/ranked replay the server checkpoint.
  this.run=this.kind==='sandbox'?createReplay({seed:this.session.saved.rng,
   character:this.session.saved.state.character,geBalance:0}):decode(this.session.saved);
  // Older ranked checkpoints stored ge=0; overlay bootstrap wallet so paid UI works.
  if(this.economic){
   const savedGe=this.run.state.ge|0;
   if(Number.isSafeInteger(this.session?.balance))this.applyWallet(this.session.balance);
   else if(savedGe>0)this.walletGe=savedGe;
   else this.applyWallet(this.walletGe);
  }
  this.commands=[];this.accumulator=0;this.error=null;this.busy=false;
  if(this.kind!=='sandbox'){
   this.storage.setItem(this.sessionKey,this.session.sessionId);
   try{this.pending=JSON.parse(this.storage.getItem(this.storageKey));}catch{}
   await this.recover();
  }
  return this.run.state;
  }catch(error){
   // Brand-new session that failed after create: drop it and unlock the UI.
   // Existing active resume that failed mid-recover: keep busy so recover() can retry.
   // Failed sandbox replace must keep abandonKey for the next idempotent retry.
   if(created){
    const sid=this.session?.sessionId;
    if(sid){
     try{await this.api.request('/sessions/'+sid+'/abandon',{method:'POST',body:{},key:crypto.randomUUID()});}catch{}
     this.clearStoredSession(sid);
     this.storage.removeItem('qura-poultry-start:'+this.kind);
    }
    this.resetLocal();
   }else if(this.run){
    this.error=error;this.busy=true;
   }else if(!this.abandonKey){
    this.resetLocal();
   }
   throw error;
  }
 }
 command(command){
  if(this.busy||!this.run||this.kind!=='sandbox'&&this.commands.length>=180)return false;
  try {
   const value={...command,tick:this.run.tick};
   // Coalesce consecutive moves so the 180-command ceiling lasts longer under lag.
   if(value.type==='move'&&this.commands.length){
    const last=this.commands[this.commands.length-1];
    if(last.type==='move'&&last.tick===value.tick){last.x=value.x;last.y=value.y;replayCommand(this.run,value);return true;}
   }
   replayCommand(this.run,value);this.commands.push(value);
   return true;
  }catch{return false;}
 }
 advance(dt,input){
  if(!this.run||this.busy)return;
  if(this.kind!=='sandbox'&&this.session&&(this.session.receipt||this.session.status&&this.session.status!=='active'))return;
  if(input.view&&(this.run.state.spawnView?.width!==input.view.width||this.run.state.spawnView?.height!==input.view.height))this.command({type:'view',width:input.view.width,height:input.view.height});
  const x=Math.max(-1,Math.min(1,input.x)),y=Math.max(-1,Math.min(1,input.y));
  if(x!==this.run.input.x||y!==this.run.input.y)this.command({type:'move',x,y});
  this.accumulator=Math.min(this.accumulator+dt,0.1);
  let ticks=Math.floor(this.accumulator*60);
  if(this.kind!=='sandbox'){
   const acknowledged=this.pending?.body.toTick??this.session.saved.tick;
   ticks=Math.max(0,Math.min(ticks,acknowledged+600-this.run.tick));
   if(this.commands.length>=180)ticks=0;
  }
  this.accumulator-=ticks/60;
  if(ticks)advanceReplay(this.run,this.run.tick+ticks,{retainEvents:true});
  if(this.kind==='sandbox'){this.commands=[];return;}
  const crowded=(this.run.state.enemies?.length||0)>40;
  if(this.run.tick-this.session.saved.tick>=(crowded?75:120)||this.commands.length>=160||
    this.run.state.mode!=='playing'&&this.commands.length)this.flush().catch(()=>{});
 }
 async flush(){
  if(this.kind==='sandbox')return;
  // Confirm UI unlocks busy; without this hold a background flush bumps seq and stale-quotes the purchase.
  if(this.holdFlush)return;
  if(this.sending)return this.sending;
  if(!this.pending&&!this.commands.length&&this.run.tick===this.session.saved.tick)return;
  if(!this.pending){
   // Detach the list so movement during the request cannot change the body already sent.
   this.pending={key:crypto.randomUUID(),body:{
    seq:this.session.seq+1,toTick:this.run.tick,commands:this.commands}};
   this.commands=[];
  }
  this.storage.setItem(this.storageKey,JSON.stringify(this.pending));
  this.syncing=true;
  this.sending=(async()=>{
   let attempt=0;
   try{
    // The live run keeps going. Replacing it with the server snapshot froze the yard
    // for the whole round trip, about once every two seconds.
    for(;;){
     try{
      this.session=await this.api.batch(this.session.sessionId,this.pending.body,this.pending.key);
      this.pending=null;this.error=null;this.flushFails=0;this.busy=false;
      this.storage.removeItem(this.storageKey);
      return;
     }catch(raw){
      const error=QuRaHost.classifyError(raw);
      // TTL / closed run: stop the 410 retry storm and let UI return to menu.
      if(error?.status===410||error?.code==='session_expired'||error?.code==='session_closed'){
       this.clearStoredSession(this.session?.sessionId);
       this.pending=null;this.commands=[];
       if(this.session)this.session={...this.session,status:'abandoned'};
       this.error=null;this.busy=false;this.expired=true;this.flushFails=0;
       const closed=Error('session_closed');closed.code='session_closed';throw closed;
      }
      // Transient network / replay overload: keep playing and retry the same idempotent batch.
      const soft=QuRaHost.isSoftBatchError(error);
      if(soft&&++attempt<=3){
       this.error=null;
       await new Promise(ok=>setTimeout(ok,250*attempt));
       continue;
      }
      this.flushFails=(this.flushFails|0)+1;
      this.error=error;
      // Hard conflicts freeze input; soft-exhaust warns but keeps the yard playable until lag hits the ceiling.
      this.busy=QuRaHost.isHardBatchError(error)||this.flushFails>=3;
      throw error;
     }
    }
   }finally{this.sending=null;this.syncing=false;}
  })();return this.sending;
 }
 async closedSession(latest){
  if(!(latest?.status&&latest.status!=='active'))return false;
  this.clearStoredSession(latest.sessionId);
  this.pending=null;this.commands=[];this.error=null;this.busy=false;this.needsSync=false;
  this.session=latest;
  const closed=Error('session_closed');closed.code='session_closed';throw closed;
 }
 async recover(){
  this.busy=true;
  try{
   if(this.pending){
    this.needsSync=true;
    try{
     await this.flush();
    }catch(error){
     try{
      const latest=await this.api.request('/sessions/'+encodeURIComponent(this.session.sessionId));
      await this.closedSession(latest);
     }catch(probe){if(probe?.code==='session_closed')throw probe;}
     throw error;
    }
    // Recovery (unlike a background ack) must reconstruct the acknowledged run.
    // Flush any newer commands accumulated before the connection failed first.
    if(this.run.tick>this.session.saved.tick||this.commands.length)await this.flush();
   }
   if(this.needsSync){
    this.session=await this.api.request('/sessions/'+encodeURIComponent(this.session.sessionId));
    await this.closedSession(this.session);
    this.run=decode(this.session.saved);this.accumulator=0;this.needsSync=false;
    this.applyWallet(Number.isSafeInteger(this.session?.balance)?this.session.balance:this.run.state.ge|0);
   }
   await this.retryPurchase();
   if(this.storage.getItem(this.storageKey+':settle'))await this.finish();
   this.error=null;this.busy=false;
  }catch(error){if(error?.code==='session_closed')throw error;this.error=error;this.busy=true;throw error;}
 }
 async pullServerState(){
  if(!this.session?.sessionId)return null;
  const latest=await this.api.request('/sessions/'+encodeURIComponent(this.session.sessionId));
  this.session=latest;
  if(latest.status&&latest.status!=='active'){
   this.clearStoredSession(latest.sessionId);
   this.pending=null;this.commands=[];
  }
  if(latest.saved){
   this.run=decode(latest.saved);this.accumulator=0;
   this.applyWallet(Number.isSafeInteger(latest.balance)?latest.balance:this.run.state.ge|0);
  }
  return latest;
 }
 async spend(action,confirm){
  if(!this.economic)throw Error('В этом режиме нет списаний GE');
  // One quote/confirm/purchase at a time — double taps otherwise stacked confirm dialogs.
  if(this.spendLock)return false;
  this.spendLock=true;this.busy=true;this.error=null;
  try{
   await this.flush();
   await this.flush();
   let quote;
   try{
    quote=await this.api.quote(this.session.sessionId,action,crypto.randomUUID());
   }catch(error){
    // Old engine / ended run: pull authoritative mode so Continue cannot freeze the yard.
    try{await this.pullServerState();}catch{}
    this.busy=false;this.error=null;
    throw error;
   }
   // Unlock input for the confirm panel, but freeze flushes so seq cannot invalidate the quote.
   this.holdFlush=true;
   this.busy=false;
   let ok=false;
   try{ok=await confirm(quote);}finally{this.holdFlush=false;}
   if(!ok)return false;
   this.busy=true;
   const key=crypto.randomUUID();
   // Persist before request so an uncertain charge can only retry the same quote/key.
   this.storage.setItem(this.storageKey+':purchase',JSON.stringify({quoteId:quote.quoteId,key}));
   await this.retryPurchase();return true;
  }catch(error){
   if(this.error==null&&this.busy)this.error=error;
   throw error;
  }finally{this.spendLock=false;this.holdFlush=false;this.busy=!!this.error;}
 }
 async retryPurchase(){
  const purchase=JSON.parse(this.storage.getItem(this.storageKey+':purchase')||'null');
  if(!purchase)return;
  try{
   this.session=await this.api.purchase(this.session.sessionId,purchase.quoteId,purchase.key);
   this.run=decode(this.session.saved);
   this.applyWallet(Number.isSafeInteger(this.session.balance)?this.session.balance:this.run.state.ge|0);
   this.storage.removeItem(this.storageKey+':purchase');this.error=null;
  }catch(error){
   const code=error?.code||'';
   // Permanent purchase failures must not leave a sticky pending charge that 409-loops forever.
   if(['stale_quote','quote_expired','quote_not_found','insufficient_ge','action_unavailable','spending_disabled'].includes(code)
      ||error?.status===402||error?.status===403||error?.status===404||error?.status===409||error?.status===410){
    this.storage.removeItem(this.storageKey+':purchase');
    try{await this.pullServerState();}catch{}
    this.error=null;this.busy=false;
   }else{this.error=error;this.busy=true;}
   throw error;
  }
 }
 async finish(){
  if(this.kind==='sandbox'){await this.abandon();return {rewardsEnabled:false,lootboxes:[]};}
  if(this.session.receipt){this.storage.removeItem(this.storageKey+':settle');return this.session.receipt;}
  this.busy=true;
  try{
   await this.flush();
   await this.flush();
   const slot=this.storageKey+':settle';
   const key=this.storage.getItem(slot)||crypto.randomUUID();this.storage.setItem(slot,key);
   const receipt=await this.api.settle(this.session.sessionId,key);
   this.session.receipt=receipt;this.session.status=receipt.status||this.session.status||'lost';
   this.commands=[];this.pending=null;this.storage.removeItem(slot);this.error=null;return receipt;
  }catch(error){this.error=error;throw error;}
  finally{this.busy=!!this.error;}
 }
 async abandon({force=false}={}){
  if(!this.session){this.resetLocal();return;}
  const sid=this.session.sessionId;
  const live=!this.session.status||this.session.status==='active';
  if(live&&this.kind==='ranked'){
   try{await this.recover();}catch(error){
    if(!force&&error?.code!=='session_closed')throw error;
   }
  }
  if(this.session&&(!this.session.status||this.session.status==='active')){
   try{
    const key=this.abandonKey||(this.abandonKey=crypto.randomUUID());
    await this.api.request('/sessions/'+sid+'/abandon',{method:'POST',body:{},key});
   }catch(error){
    if(!force)throw error;
   }
  }
  this.clearStoredSession(sid);
  this.resetLocal();
 }
}
