// The QuRa parent owns cookie/device-bound and Telegram authorization.
export function quraFetch(path,options={}){
 if(typeof window==='undefined'||window.parent===window)return Promise.reject(Error('Open from QuRa'));
 const id=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  // Parent NACK (bridge_busy) must arrive before this; keep headroom for slow batches.
  const timer=setTimeout(()=>{
   window.removeEventListener('message',receive);
   const err=Error('QuRa timeout');err.code='network';err.status=0;reject(err);
  },30000);
  function receive(event){
   if(event.origin!==location.origin||event.source!==window.parent||
      event.data?.type!=='qura:poultry:response'||event.data.id!==id)return;
   clearTimeout(timer);window.removeEventListener('message',receive);
   const {status,body}=event.data;resolve({ok:status>=200&&status<300,status,json:async()=>body});
  }
  window.addEventListener('message',receive);
  window.parent.postMessage({type:'qura:poultry:request',id,path,options},location.origin);
 });
}

// Navigate the QuRa parent, preserving its router and Telegram container.
export function returnToQuRa(){
 if(window.parent===window){window.location.assign('/gamezone');return;}
 window.parent.postMessage({type:'qura:poultry:exit'},location.origin);
}
