import { openStore, freshState, parseBackup, STORE_KEY } from './store/storage.js';
import { position, todayISO } from './domain/schedule.js';
import { createWorkout, markTask, pause, resume, review, finish, elapsed, timerText } from './domain/workout.js';
import { todayView } from './views/today.js';
import { planView } from './views/plan.js';
import { recordsView } from './views/records.js';
import { settingsView } from './views/settings.js';
import { icon, esc } from './views/shared.js';

const root=document.querySelector('#app'),toastNode=document.querySelector('#toast'),notice=document.querySelector('#saveNotice');
let store=openStore(localStorage),state=store.data,view='today',workoutOpen=false,deferredPrompt=null,toastTimeout;
let week=state?position(state.settings.startDate).week:1;
function toast(message) {clearTimeout(toastTimeout);toastNode.textContent=message;toastNode.classList.add('show');toastTimeout=setTimeout(()=>toastNode.classList.remove('show'),2400);}
function showError(error) {notice.hidden=false;notice.textContent='저장하지 못했어요. '+error.message;}
function commit(change,{renderScreen=false}={}) {
  try {const next=JSON.parse(JSON.stringify(state));change(next);store.save(next);state=next;notice.hidden=true;if(renderScreen) render();return true;}
  catch(error) {showError(error);return false;}
}
function active(s=state) {return s.workouts.find(w=>w.id===s.activeId);}
function render() {
  document.querySelector('#settingsButton').innerHTML=icon('settings');
  document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===view);b.setAttribute('aria-current',b.dataset.nav===view?'page':'false');});
  root.innerHTML=view==='today'?todayView(state,workoutOpen):view==='plan'?planView(state,week):view==='record'?recordsView(state):settingsView(state);
  root.dataset.view=view;
}
function show(next) {
  if(!['today','plan','record','settings'].includes(next)) return;
  if(view==='today' && next!=='today' && active()?.status==='active') {if(!commit(s=>pause(active(s)))) return;}
  if(next==='today') workoutOpen=false;
  if(next==='plan' && view!=='plan') week=position(state.settings.startDate).week;
  view=next;render();window.scrollTo({top:0});
}
function download(raw,name) {
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function readForm(form) {return Object.fromEntries(new FormData(form));}
const number=v=>v==='' || v===undefined?null:Number(v);
function validForm(form) {return !form || form.reportValidity();}

async function action(name,button) {
  if(name.startsWith('nav-')) {show(name.slice(4));return;}
  switch(name) {
    case 'start': {
      if(active()) {workoutOpen=true;render();return;}
      const p=position(state.settings.startDate);if(p.before||p.after) return;
      workoutOpen=true;
      commit(s=>{const w=createWorkout(s.settings,p.week,p.day);s.workouts.push(w);s.activeId=w.id;},{renderScreen:true});break;
    }
    case 'open-workout':
      if(!active()) return;workoutOpen=true;commit(s=>resume(active(s)),{renderScreen:true});break;
    case 'leave-workout':
      if(!active()) return;if(commit(s=>pause(active(s)))) {workoutOpen=false;render();}break;
    case 'resume': if(active()) commit(s=>resume(active(s)),{renderScreen:true});break;
    case 'pause': if(active()) commit(s=>pause(active(s)),{renderScreen:true});break;
    case 'previous': if(active()) commit(s=>{active(s).cursor=Math.max(0,active(s).cursor-1);},{renderScreen:true});break;
    case 'complete-task': {
      if(active()?.status!=='active') return;
      const form=document.querySelector('#taskForm');if(!validForm(form)) return;
      const values=readForm(form);
      commit(s=>{const w=active(s),t=w.tasks[w.cursor];t.weight=number(values.weight);t.rpe=number(values.rpe);markTask(w,'done');},{renderScreen:true});
      window.scrollTo({top:0});break;
    }
    case 'skip-task':
      if(active()?.status!=='active') return;
      commit(s=>{const w=active(s),t=w.tasks[w.cursor];t.weight=null;t.rpe=null;markTask(w,'skipped');},{renderScreen:true});break;
    case 'end-workout':
      if(!active()) return;workoutOpen=true;view='today';commit(s=>review(active(s)),{renderScreen:true});break;
    case 'back-workout':
      if(active()) commit(s=>{const w=active(s);w.status='paused';w.summary.minutes=null;if(w.draftSummary) delete w.draftSummary.minutes;},{renderScreen:true});break;
    case 'prev-week': week=Math.max(1,week-1);render();break;
    case 'next-week': week=Math.min(12,week+1);render();break;
    case 'delete-weight':
      if(confirm(`${button.dataset.date} 체중 기록을 삭제할까요?`)) commit(s=>{s.weights=s.weights.filter(w=>w.date!==button.dataset.date);},{renderScreen:true});break;
    case 'export':download(JSON.stringify(state,null,2),`project100-backup-${todayISO()}.json`);toast('백업 파일을 만들었어요.');break;
    case 'reset':
      if(confirm('체중과 운동 기록을 모두 초기화할까요? 먼저 백업 파일을 받아두세요.')) {
        try {localStorage.setItem('project100-before-reset',JSON.stringify(state));}
        catch(error){showError(error);return;}
        if(commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,freshState());})) {workoutOpen=false;show('today');toast('새 기록을 시작해요.');}
      }break;
    case 'install': {
      if(deferredPrompt) {await deferredPrompt.prompt();deferredPrompt=null;return;}
      const standalone=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      document.querySelector('#installText').textContent=standalone?'이미 홈 화면 앱으로 사용하고 있어요.':/iPhone|iPad|iPod/.test(navigator.userAgent)?'Safari의 공유 버튼을 누른 다음 ‘홈 화면에 추가’를 선택하세요.':'브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.';
      document.querySelector('#installHelp').showModal();break;
    }
  }
}

if(store.error) {
  document.querySelector('.bottom-nav').hidden=true;document.querySelector('#settingsButton').hidden=true;
  root.innerHTML=`<section class="card"><h1>기록을 확인해야 해요</h1><p>기존 기록을 읽지 못했어요. 원본은 덮어쓰지 않았어요.</p><p class="muted">${esc(store.error.message)}</p><button class="secondary" id="recoverDownload">저장된 원본 받기</button><p class="muted small">원본을 보관한 뒤 정상 백업을 불러올 수 있어요.</p><label class="secondary file-label">백업으로 복구<input type="file" id="recoverImport" accept=".json,application/json"></label></section>`;
  document.querySelector('#recoverDownload').onclick=()=>download(store.raw || localStorage.getItem('project100-v2') || '{}','project100-recovery.json');
  document.querySelector('#recoverImport').onchange=async e=>{try {if(!e.target.files[0]) return;const next=parseBackup(await e.target.files[0].text());if(confirm('백업 파일로 복구할까요?')) {localStorage.setItem('project100-before-recovery',store.raw||localStorage.getItem('project100-v2')||'{}');localStorage.setItem(STORE_KEY,JSON.stringify(next));location.reload();}}catch(error){showError(error);}};
} else {
  // Persist the migrated copy only after it has passed validation; v2 is untouched.
  try {store.save(state);}catch(error){showError(error);}
  render();
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.nav)));
  document.querySelector('#settingsButton').addEventListener('click',()=>show('settings'));
  root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b && !b.disabled) action(b.dataset.action,b).catch(showError);});
  root.addEventListener('input',e=>{
    const {name,value}=e.target,form=e.target.closest('form');if(!name||!form) return;
    if(form.id==='taskForm') commit(s=>{const w=active(s);if(!w) return;w.taskDrafts??={};w.taskDrafts[w.tasks[w.cursor].id]??={};w.taskDrafts[w.tasks[w.cursor].id][name]=value;});
    if(form.id==='summaryForm') commit(s=>{const w=active(s);w.draftSummary??={};w.draftSummary[name]=value;});
    if(form.id==='weightForm') commit(s=>{s.ui.weightDraft[name]=value;});
  });
  root.addEventListener('submit',e=>{
    e.preventDefault();const form=e.target;if(!validForm(form)) return;const values=readForm(form);
    if(form.id==='summaryForm' && active()) {
      if(commit(s=>{const w=active(s);w.summary={minutes:number(values.minutes),distance:number(values.distance),rpe:number(values.rpe),pain:values.pain||'',memo:values.memo.trim()};delete w.draftSummary;finish(w);s.activeId=null;})) {workoutOpen=false;show('today');toast('운동 기록을 저장했어요. 수고했어요!');}
    }
    if(form.id==='weightForm') {
      if(commit(s=>{s.weights=s.weights.filter(w=>w.date!==values.date);s.weights.push({date:values.date,weight:number(values.weight),waist:number(values.waist),sleep:number(values.sleep)});s.ui.weightDraft={};},{renderScreen:true})) toast('체중을 저장했어요.');
    }
    if(form.id==='settingsForm') {
      if(commit(s=>{s.settings={startDate:values.startDate,targetWeight:number(values.targetWeight)};},{renderScreen:true})) toast('설정을 저장했어요.');
    }
  });
  root.addEventListener('change',async e=>{
    if(e.target.id!=='importFile' || !e.target.files[0]) return;
    try {
      if(e.target.files[0].size>10000000) throw new Error('백업 파일이 너무 큽니다.');
      const next=parseBackup(await e.target.files[0].text());
      if(!confirm('현재 기록을 이 백업으로 바꿀까요? 현재 기록 사본도 이 기기에 보관됩니다.')) {e.target.value='';return;}
      localStorage.setItem('project100-before-import',JSON.stringify(state));
      const w=next.workouts.find(w=>w.id===next.activeId);if(w?.status==='active') {w.status='paused';w.runningSince=null;}
      if(commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,next);})) {workoutOpen=false;show('record');toast('백업을 불러왔어요.');}
    }catch(error){showError(error);e.target.value='';}
  });
  const pauseAway=()=>{if(active()?.status==='active') commit(s=>pause(active(s)),{renderScreen:document.visibilityState==='hidden'});};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden') pauseAway();else if(view==='today') render();});
  window.addEventListener('pagehide',pauseAway);
  window.addEventListener('pageshow',e=>{if(e.persisted) {store=openStore(localStorage);if(store.data){state=store.data;render();}}});
  window.addEventListener('storage',e=>{if(e.key===STORE_KEY) showError(new Error('다른 창에서 기록이 변경됐어요. 새로고침 후 이어서 사용해 주세요.'));});
  let lastDate=todayISO();
  setInterval(()=>{
    const timer=document.querySelector('#workoutTimer');if(timer && active()) timer.textContent=timerText(elapsed(active()));
    const date=todayISO();if(date!==lastDate) {lastDate=date;if(view==='today' && !active()) render();}
  },1000);
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
document.querySelector('#closeInstall').addEventListener('click',()=>document.querySelector('#installHelp').close());
// Preserve the requested touch behavior and avoid accidental double-tap zoom.
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    const offer=worker=>{
      const banner=document.querySelector('#updateNotice');banner.hidden=false;
      document.querySelector('#updateApp').onclick=()=>{if(state && active()?.status==='active' && !commit(s=>pause(active(s)))) return;worker.postMessage({type:'SKIP_WAITING'});};
    };
    if(reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && navigator.serviceWorker.controller) offer(worker);});});
  }).catch(()=>{});
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});
}
