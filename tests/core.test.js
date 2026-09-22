import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,migrateLegacy,validate,parseBackup,openStore,STORE_KEY,LEGACY_KEY} from '../store/storage.js';
import {position,dateFor,formatDate,todayISO} from '../domain/schedule.js';
import {createWorkout,markTask,pause,resume,review,finish,counts,elapsed,lastWeight} from '../domain/workout.js';
import {session} from '../data/program.js';
import {planView} from '../views/plan.js';
import {todayView} from '../views/today.js';
import {recordsView} from '../views/records.js';
const memory=initial=>{const map=new Map(Object.entries(initial||{}));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('Tuesday start uses real Tuesday dates without shifting the program',()=>{
 assert.equal(formatDate('2026-09-22',{weekday:'short'}),'화');assert.equal(dateFor('2026-09-22',1,6),'2026-09-28');
 assert.deepEqual(position('2026-09-22','2026-09-23'),{diff:1,week:1,day:1,before:false,after:false});
 assert.equal(position('2026-09-22','2026-09-21').before,true);assert.equal(position('2026-09-22','2026-12-15').after,true);
});
test('all 84 plans have stable unique exercise IDs and safe HTML',()=>{
 for(let w=1;w<=12;w++)for(let d=0;d<7;d++){const s=session(w,d);assert.equal(new Set(s.tasks.map(t=>t.id)).size,s.tasks.length);assert.ok(s.tasks.every(t=>t.exerciseId));}
 const state=freshState();state.settings.startDate='2026-09-22';const html=planView(state,1);assert.match(html,/화/);assert.doesNotMatch(html,/data-action="complete-task"/);
});
test('legacy checks, weights, lift values and unpaired daily entries survive migration',()=>{
 const old={startDate:'2026-09-01',checks:{w1d0:[0,1]},lifts:{'w1d0-1':{weight:0,rpe:7}},weights:[{date:'2026-09-01',weight:110,waist:99,sleep:0}],daily:{'2026-09-01':{minutes:55,memo:'메모'},'2026-09-04':{minutes:20,distance:2}}};
 const state=migrateLegacy(old);assert.equal(state.workouts.length,2);assert.equal(state.workouts[0].tasks[1].weight,0);assert.equal(counts(state.workouts[0]).done,2);assert.equal(state.weights[0].sleep,0);assert.equal(state.workouts[0].summary.memo,'메모');assert.deepEqual(state.legacy.original,old);
 assert.deepEqual(parseBackup(JSON.stringify(state)),state);
});
test('today partial legacy work is resumable without marking remaining tasks complete',()=>{
 const state=migrateLegacy({startDate:todayISO(),checks:{w1d0:[0]},lifts:{},weights:[]});const active=state.workouts.find(w=>w.id===state.activeId);assert.equal(active.status,'paused');assert.equal(active.cursor,1);assert.equal(counts(active).done,1);
});
test('completed legacy work for today is displayed as completed',()=>{
 const state=migrateLegacy({startDate:todayISO(),checks:{w1d0:session(1,0).tasks.map((_,i)=>i)},weights:[]});assert.equal(state.activeId,null);assert.match(todayView(state),/오늘도 수고했어요/);
});
test('pause, resume, skip and early finish retain accurate counts and elapsed time',()=>{
 const state=freshState(),w=createWorkout(state.settings,1,0,1000);state.workouts.push(w);state.activeId=w.id;
 markTask(w,'done',2000);assert.equal(w.cursor,1);pause(w,11000);assert.equal(elapsed(w,31000),10000);resume(w,41000);markTask(w,'skipped',42000);review(w,51000);assert.equal(w.elapsedMs,20000);assert.equal(counts(w).done,1);assert.equal(counts(w).skipped,1);assert.equal(w.tasks[2].status,'pending');finish(w,52000);state.activeId=null;validate(state);
});
test('last exercise transitions to summary; revisiting a task does not duplicate completions',()=>{
 const w=createWorkout(freshState().settings,1,0,1000);for(let i=0;i<w.tasks.length;i++)markTask(w,'done',2000+i);assert.equal(w.status,'review');assert.equal(counts(w).done,w.tasks.length);
 w.status='active';w.cursor=0;markTask(w,'done',3000);assert.equal(counts(w).done,w.tasks.length);
});
test('recommended loads are not actual records until confirmed',()=>{
 const state=freshState(),w=createWorkout(state.settings,1,0);w.cursor=1;state.workouts.push(w);state.activeId=w.id;
 assert.match(todayView(state,true),/value="60"/);assert.equal(w.tasks[1].weight,null);
 w.tasks[1].weight=35;w.tasks[1].status='done';finish(w);state.activeId=null;assert.equal(lastWeight(state.workouts,'leg-press','new').weight,35);
});
test('fresh reload preserves draft fields/cursor and pauses without inventing time',()=>{
 const storage=memory(),store=openStore(storage),state=store.data,w=createWorkout(state.settings,1,0,1000);state.workouts.push(w);state.activeId=w.id;w.cursor=2;w.taskDrafts={[w.tasks[2].id]:{weight:'25',rpe:'7'}};w.draftSummary={memo:'이어서 기록'};w.elapsedMs=5000;store.save(state);
 const reloaded=openStore(storage).data,a=reloaded.workouts[0];assert.equal(a.status,'paused');assert.equal(a.cursor,2);assert.equal(a.elapsedMs,5000);assert.equal(a.draftSummary.memo,'이어서 기록');
});
test('migration retains original v2 and rejects corrupt/newer schemas',()=>{
 const old=JSON.stringify({startDate:todayISO(),checks:{},weights:[]}),storage=memory({[LEGACY_KEY]:old});const store=openStore(storage);store.save(store.data);assert.equal(storage.getItem(LEGACY_KEY),old);
 assert.ok(openStore(memory({[STORE_KEY]:'broken'})).error);assert.throws(()=>parseBackup('{"version":4}'));
 const state=freshState();state.weights=[{date:'2026-02-30',weight:100}];assert.throws(()=>validate(state));
});
test('concurrent tabs and quota failure never silently overwrite saved data',()=>{
 const storage=memory(),a=openStore(storage),b=openStore(storage);a.save(a.data);assert.throws(()=>b.save(b.data),/다른 창/);
 const quota={getItem:()=>null,setItem:()=>{throw new Error('quota');}};const q=openStore(quota);assert.throws(()=>q.save(q.data),/quota/);
});
test('record HTML escapes notes and workout names from imports',()=>{
 const state=freshState(),w=createWorkout(state.settings,1,0);w.title='<img src=x onerror=alert(1)>';w.summary.memo='<script>x</script>';finish(w);state.workouts.push(w);const html=recordsView(state);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<script>/);
});
