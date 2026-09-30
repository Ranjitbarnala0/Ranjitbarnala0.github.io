// generated
const V='rc-munepwth',STATIC=['/','/site.css','/site.js','/art.js','/i.svg','/offline/','/img/mark.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const trim=async(c,n)=>{const k=await c.keys();if(k.length>n)await Promise.all(k.slice(0,k.length-n).map(x=>c.delete(x)))};
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return;
 if(r.mode==='navigate'){
  e.respondWith((async()=>{const c=await caches.open(V);
   try{const n=await Promise.race([fetch(r),new Promise((_,j)=>setTimeout(j,4500))]);if(n.ok){c.put(r,n.clone());trim(c,120)}return n}
   catch(_){return (await c.match(r))||(await c.match('/offline/'))||Response.error()}})());return}
 e.respondWith((async()=>{const c=await caches.open(V);const hit=await c.match(r);
  const net=fetch(r).then(n=>{if(n.ok)c.put(r,n.clone());return n}).catch(()=>hit);
  return hit||net})());
});