import { session } from '../data/program.js';
import { todayISO, planKey } from './schedule.js';

export function createWorkout(settings, week, day, now=Date.now()) {
  const s=session(week,day);
  return {id:`workout-${now}-${Math.random().toString(36).slice(2,8)}`,date:todayISO(new Date(now)),
    planStartDate:settings.startDate,programKey:planKey(week,day),week,day,
    title:s.title,type:s.type,estimatedMinutes:s.minutes,tasks:s.tasks.map(t=>({...t,status:'pending',weight:null,rpe:null})),
    status:'active',cursor:0,elapsedMs:0,runningSince:now,createdAt:now,finishedAt:null,
    summary:{minutes:null,distance:null,rpe:null,pain:'',memo:''}};
}
export function elapsed(workout,now=Date.now()) {
  return workout.elapsedMs+(workout.status==='active' && workout.runningSince != null ? Math.max(0,now-workout.runningSince):0);
}
export function pause(workout,now=Date.now()) {
  workout.elapsedMs=elapsed(workout,now); workout.runningSince=null;
  if(workout.status==='active') workout.status='paused';
}
export function resume(workout,now=Date.now()) { if(workout.status==='paused') {workout.status='active';workout.runningSince=now;} }
export function markTask(workout,status,now=Date.now()) {
  if(workout.status!=='active' || !['done','skipped'].includes(status)) return;
  workout.tasks[workout.cursor].status=status;
  if(workout.cursor<workout.tasks.length-1) workout.cursor++;
  else review(workout,now);
}
export function review(workout,now=Date.now()) {
  pause(workout,now); workout.status='review';
  if(workout.summary.minutes===null) workout.summary.minutes=Math.round(workout.elapsedMs/60000);
}
export function finish(workout,now=Date.now()) {
  pause(workout,now);workout.status='finished';workout.finishedAt=now;
}
export function counts(workout) {
  return {done:workout.tasks.filter(t=>t.status==='done').length,skipped:workout.tasks.filter(t=>t.status==='skipped').length,total:workout.tasks.length};
}
export function lastWeight(workouts,exerciseId,beforeId) {
  const ordered=workouts.filter(w=>w.id!==beforeId).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  for(const w of ordered) {const t=w.tasks.find(t=>t.exerciseId===exerciseId && t.status!=='skipped' && t.weight!==null);if(t) return {weight:t.weight,date:w.date};}
  return null;
}
export function hasCardio(workout) {
  return workout.tasks.some(t=>['run-walk','stairs','elliptical','easy-cardio','optional-walk'].includes(t.exerciseId));
}
export function timerText(ms) {const sec=Math.floor(ms/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
