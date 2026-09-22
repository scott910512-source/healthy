import { todayISO, validDate, dateFor } from '../domain/schedule.js';
import { session } from '../data/program.js';

export const STORE_KEY='project100-v3';
export const LEGACY_KEY='project100-v2';
const object=v=>v && typeof v==='object' && !Array.isArray(v);
const assert=(condition)=>{if(!condition) throw new Error('백업 데이터의 형식이나 값이 올바르지 않습니다.');};
const numeric=(v,min,max)=>v===null || (typeof v==='number' && Number.isFinite(v) && v>=min && v<=max);
const numberOrNull=(v,min,max)=>v!==null && v!=='' && v!==undefined && Number.isFinite(Number(v)) && Number(v)>=min && Number(v)<=max ? Number(v):null;
const text=(v,max=4000)=>typeof v==='string'?v.slice(0,max):'';

export function freshState() {
  return {version:3,settings:{startDate:todayISO(),targetWeight:100},weights:[],workouts:[],activeId:null,ui:{weightDraft:{}},legacy:null};
}
export function validate(state) {
  assert(object(state) && state.version===3 && object(state.settings));
  assert(validDate(state.settings.startDate) && numeric(state.settings.targetWeight,40,250) && state.settings.targetWeight!==null);
  assert(Array.isArray(state.weights) && Array.isArray(state.workouts));
  assert(state.weights.length<=10000 && state.workouts.length<=10000);
  state.weights.forEach(w=>{
    assert(object(w) && validDate(w.date) && numeric(w.weight,40,250) && w.weight!==null);
    assert(numeric(w.waist??null,40,250) && numeric(w.sleep??null,0,24));
  });
  assert(new Set(state.weights.map(w=>w.date)).size===state.weights.length);
  const ids=new Set();
  state.workouts.forEach(w=>{
    assert(object(w) && typeof w.id==='string' && w.id.length<200 && !ids.has(w.id));ids.add(w.id);
    assert(validDate(w.date) && validDate(w.planStartDate) && typeof w.programKey==='string');
    assert(Number.isInteger(w.week) && w.week>=1 && w.week<=12 && Number.isInteger(w.day) && w.day>=0 && w.day<=6);
    assert(typeof w.title==='string' && typeof w.type==='string' && numeric(w.estimatedMinutes,0,10000));
    assert(['active','paused','review','finished'].includes(w.status) && Array.isArray(w.tasks) && w.tasks.length<=100);
    assert(Number.isInteger(w.cursor) && w.cursor>=0 && w.cursor<Math.max(1,w.tasks.length));
    assert(numeric(w.elapsedMs,0,1e12) && w.elapsedMs!==null && numeric(w.runningSince,0,1e15));
    assert(numeric(w.createdAt,0,1e15) && w.createdAt!==null && numeric(w.finishedAt,0,1e15));
    w.tasks.forEach(t=>{
      assert(object(t) && ['id','exerciseId','name','detail','duration'].every(k=>typeof t[k]==='string'));
      assert(['pending','done','skipped'].includes(t.status) && numeric(t.weight,0,500) && numeric(t.rpe,1,10));
    });
    assert(new Set(w.tasks.map(t=>t.id)).size===w.tasks.length);
    assert(object(w.summary) && numeric(w.summary.minutes,0,10000) && numeric(w.summary.distance,0,1000) && numeric(w.summary.rpe,1,10));
    assert(typeof w.summary.pain==='string' && typeof w.summary.memo==='string' && w.summary.memo.length<=4000);
    if(w.draftSummary) assert(object(w.draftSummary) && Object.values(w.draftSummary).every(v=>typeof v==='string' && v.length<=4000));
    if(w.taskDrafts) assert(object(w.taskDrafts) && Object.values(w.taskDrafts).every(v=>object(v) && Object.values(v).every(x=>typeof x==='string' && x.length<=30)));
  });
  assert(state.activeId===null || (typeof state.activeId==='string' && ids.has(state.activeId)));
  const unfinished=state.workouts.filter(w=>w.status!=='finished');
  assert(unfinished.length<=1 && (unfinished.length===0 ? state.activeId===null : unfinished[0].id===state.activeId && unfinished[0].tasks.length>0));
  if(!object(state.ui)) state.ui={weightDraft:{}};
  if(!object(state.ui.weightDraft)) state.ui.weightDraft={};
  assert(Object.values(state.ui.weightDraft).every(v=>typeof v==='string' && v.length<=100));
  return state;
}

export function migrateLegacy(old) {
  assert(object(old) && validDate(old.startDate) && object(old.checks));
  assert(old.weights===undefined || Array.isArray(old.weights));
  assert(old.daily===undefined || object(old.daily));assert(old.lifts===undefined || object(old.lifts));
  const state=freshState();state.settings.startDate=old.startDate;
  // Keep the original document, including any fields that have no new UI equivalent.
  state.legacy={original:JSON.parse(JSON.stringify(old))};
  const weights=new Map();
  for(const w of old.weights||[]) {
    assert(object(w) && validDate(w.date) && numberOrNull(w.weight,40,250)!==null);
    weights.set(w.date,{date:w.date,weight:Number(w.weight),waist:numberOrNull(w.waist,40,250),sleep:numberOrNull(w.sleep,0,24)});
  }
  state.weights=[...weights.values()];
  const lifts=old.lifts||{},daily=old.daily||{},assigned=new Set();
  for(let week=1;week<=12;week++) for(let day=0;day<7;day++) {
    const key=`w${week}d${day}`,checks=old.checks[key]||[];
    assert(Array.isArray(checks));
    const hasLifts=Object.keys(lifts).some(k=>k.startsWith(key+'-'));
    if(!checks.length && !hasLifts) continue;
    const plan=session(week,day),date=dateFor(old.startDate,week,day),summary=legacySummary(daily[date]||{});
    if(daily[date]) assigned.add(date);
    const tasks=plan.tasks.map((t,i)=>({...t,status:checks.includes(i)?'done':'pending',weight:numberOrNull(lifts[`${key}-${i}`]?.weight,0,500),rpe:numberOrNull(lifts[`${key}-${i}`]?.rpe,1,10)}));
    const partial=tasks.some(t=>t.status!=='done'),isCurrent=date===todayISO() && partial;
    const w={id:'legacy-'+key,date,planStartDate:old.startDate,programKey:key,week,day,title:plan.title,type:plan.type,estimatedMinutes:plan.minutes,tasks,
      status:isCurrent?'paused':'finished',cursor:Math.max(0,tasks.findIndex(t=>t.status!=='done')),elapsedMs:(summary.minutes||0)*60000,runningSince:null,
      createdAt:+new Date(date+'T12:00:00'),finishedAt:isCurrent?null:+new Date(date+'T12:00:00'),summary,legacy:true};
    state.workouts.push(w);if(isCurrent) state.activeId=w.id;
  }
  for(const [date,d] of Object.entries(daily)) {
    assert(validDate(date) && object(d));if(assigned.has(date)) continue;
    const summary=legacySummary(d);
    state.workouts.push({id:'legacy-daily-'+date,date,planStartDate:old.startDate,programKey:'daily-'+date,week:1,day:0,title:'이전 운동 기록',type:'기록',estimatedMinutes:0,tasks:[],status:'finished',cursor:0,elapsedMs:(summary.minutes||0)*60000,runningSince:null,createdAt:+new Date(date+'T12:00:00'),finishedAt:+new Date(date+'T12:00:00'),summary,legacy:true});
  }
  return validate(state);
}
function legacySummary(d) {
  return {minutes:numberOrNull(d.minutes,0,10000),distance:numberOrNull(d.distance,0,1000),rpe:numberOrNull(d.rpe,1,10),pain:text(d.pain),memo:text(d.memo)};
}
export function parseBackup(raw) {
  if(raw.length>10000000) throw new Error('백업 파일이 너무 큽니다.');
  const data=JSON.parse(raw);
  if(data?.version!==undefined && data.version!==3) throw new Error('지원하지 않는 백업 버전입니다.');
  return data?.version===3 ? validate(data):migrateLegacy(data);
}

export function openStore(storage) {
  let expectedRaw;
  let initial;
  try {
    expectedRaw=storage.getItem(STORE_KEY);
    const legacy=expectedRaw===null?storage.getItem(LEGACY_KEY):null;
    initial=expectedRaw!==null?parseBackup(expectedRaw):legacy?migrateLegacy(JSON.parse(legacy)):freshState();
    // A re-opened app resumes explicitly; unseen time is never invented.
    const active=initial.workouts.find(w=>w.id===initial.activeId);
    if(active?.status==='active') {active.status='paused';active.runningSince=null;}
  } catch(error) {return {error,raw:expectedRaw||null};}
  return {data:initial,save(next) {
    validate(next);
    if(storage.getItem(STORE_KEY)!==expectedRaw) throw new Error('다른 창에서 기록이 변경됐어요. 이 화면을 새로고침해 주세요.');
    const raw=JSON.stringify(next);storage.setItem(STORE_KEY,raw);expectedRaw=raw;
  }};
}
