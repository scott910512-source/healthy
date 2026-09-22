const CACHE='project100-v7';
const ASSETS=['./','./index.html','./app.js','./styles/app.css','./data/exercises.js','./data/program.js','./domain/schedule.js','./domain/workout.js','./store/storage.js','./views/shared.js','./views/today.js','./views/plan.js','./views/records.js','./views/settings.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const previous=await caches.keys();
  await (await caches.open(CACHE)).addAll(ASSETS);
  // v2 clients have no update prompt. Let their next reload receive the new shell.
  if(previous.some(key=>/^project100-v[1-6]$/.test(key))) await self.skipWaiting();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING') self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('project100-') && key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const hit=await cache.match(event.request,{ignoreSearch:true});if(hit) return hit;
    try {return await fetch(event.request);}
    catch(error){if(event.request.mode==='navigate') return cache.match('./index.html');throw error;}
  }));
});
