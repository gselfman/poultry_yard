import {quraFetch} from './qura-bridge.js';
import {RUNTIME_MODE} from './runtime-mode.js';
// Ranked host adapter is live: batches, settle, loot and GE purchases go through QuRa.
export const INTEGRATED_HOST_READY=true;
export function masterSandbox(bootstrap){
 return bootstrap?.authenticated===true
  &&bootstrap?.permissions?.poultry_game_master===true
  &&typeof bootstrap?.csrfToken==='string'
  &&bootstrap.csrfToken.length>0
  ?bootstrap:null;
}
export async function bootstrapRuntime({mode=RUNTIME_MODE,fetcher=quraFetch,search=globalThis.location?.search||''}={}){
 const params=new URLSearchParams(search);
 const sandbox=params.get('sandbox')==='1';
 const casual=!sandbox&&params.get('mode')==='casual';
 if(mode==='integrated'&&!sandbox&&!casual&&!INTEGRATED_HOST_READY)throw new Error('QuRa authoritative host adapter is not connected');
 // Static prototype has no identity. Never accept email, URL flags or localStorage roles.
 if(mode==='prototype')return {masterSandbox:null,kind:'ranked'};
 const response=await fetcher('/api/poultry/bootstrap',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('QuRa bootstrap unavailable');
 const data=await response.json();
 if(!data.authenticated)throw new Error('Authentication required');
 if(sandbox&&!masterSandbox(data))throw new Error('Game Master required');
 if(casual&&data.casualEnabled!==true)throw new Error('Casual play unavailable');
 // Explicit URL chooses mode; default is ranked with rewards when not sandbox/casual.
 const kind=sandbox?'sandbox':casual?'casual':'ranked';
 return {masterSandbox:sandbox?masterSandbox(data):null,kind,bootstrap:data};
}
