// Host-adapter building block, not connected to local prototype economy.
export class PoultryApi {
 constructor({csrfToken,fetcher=globalThis.fetch}={}){this.csrfToken=csrfToken;this.fetcher=fetcher;this.pending=new Map();}
 async request(path,{method='GET',body,key,revision}={}){if(method!=='GET'&&(!this.csrfToken||!key))throw new Error('CSRF and idempotency key required');if(key&&this.pending.has(key))return this.pending.get(key);const work=(async()=>{const response=await this.fetcher('/api/poultry'+path,{method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':this.csrfToken,'Idempotency-Key':key}:{}),...(revision?{'If-Match':revision}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok){const error=new Error('QuRa request failed: '+response.status);error.status=response.status;throw error;}return response.json();})();if(key)this.pending.set(key,work);try{return await work;}finally{if(key)this.pending.delete(key);}}
 bootstrap(){return this.request('/bootstrap');}
 start(body,key){return this.request('/sessions',{method:'POST',body,key});}
 batch(id,body,key){return this.request('/sessions/'+encodeURIComponent(id)+'/batches',{method:'POST',body,key});}
 quote(id,action,key){return this.request('/sessions/'+encodeURIComponent(id)+'/quotes',{method:'POST',body:{action},key});}
 purchase(id,quoteId,key){return this.request('/sessions/'+encodeURIComponent(id)+'/purchases',{method:'POST',body:{quoteId},key});}
 settle(id,key){return this.request('/sessions/'+encodeURIComponent(id)+'/settle',{method:'POST',body:{},key});}
 prepareBalance(values,revision,key){return this.request('/admin/balance/prepare',{method:'POST',body:{values},revision,key});}
 publishBalance(confirmationToken,revision,key){return this.request('/admin/balance/publish',{method:'POST',body:{confirmationToken},revision,key});}
}
