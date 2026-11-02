import {RUNTIME_MODE} from './runtime-mode.js';
// Deliberately false until the QuRa host wires and verifies the replay/session adapter.
export const INTEGRATED_HOST_READY=false;
export function masterSandbox(bootstrap){return bootstrap?.authenticated===true&&bootstrap?.permissions?.poultry_game_master===true&&bootstrap?.session?.kind==='sandbox'&&bootstrap?.session?.rewardsEnabled===false&&typeof bootstrap?.csrfToken==='string'&&bootstrap.csrfToken.length>0?bootstrap:null;}
export async function bootstrapRuntime({mode=RUNTIME_MODE,fetcher=globalThis.fetch}={}){
 if(mode==='integrated'&&!INTEGRATED_HOST_READY)throw new Error('QuRa authoritative host adapter is not connected');
 // Static prototype has no identity. Never accept email, URL flags or localStorage roles.
 if(mode==='prototype')return {masterSandbox:null};
 const response=await fetcher('/api/poultry/bootstrap',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('QuRa bootstrap unavailable');const data=await response.json();if(!data.authenticated)throw new Error('Authentication required');return {masterSandbox:masterSandbox(data),bootstrap:data};
}
