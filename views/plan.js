import { session } from '../data/program.js';
import { dateFor, formatDate, todayISO, planKey } from '../domain/schedule.js';
import { counts } from '../domain/workout.js';
import { esc,button } from './shared.js';

export function planView(state,week) {
  return `<div class="page-heading"><div><p class="eyebrow">YOUR PROGRAM</p><h1>운동 계획</h1><p class="muted">12주, 하루씩 차근차근</p></div></div><div class="week-switch">${button('‹','prev-week','icon-button',`aria-label="이전 주" ${week===1?'disabled':''}`)}<div><b>${week}주차${week===7?' · 회복주':''}</b><p class="muted small">${formatDate(dateFor(state.settings.startDate,week,0),{month:'numeric',day:'numeric'})} — ${formatDate(dateFor(state.settings.startDate,week,6),{month:'numeric',day:'numeric'})}</p></div>${button('›','next-week','icon-button',`aria-label="다음 주" ${week===12?'disabled':''}`)}</div><p class="muted small plan-help">날짜를 누르면 운동 구성을 볼 수 있어요.</p><div class="plan-list">${Array.from({length:7},(_,day)=>{
    const s=session(week,day),date=dateFor(state.settings.startDate,week,day),isToday=date===todayISO();
    const records=state.workouts.filter(w=>w.planStartDate===state.settings.startDate && w.programKey===planKey(week,day));
    const done=records.some(w=>w.tasks.length && counts(w).done===w.tasks.length && w.status==='finished');
    const label=done?'완료':records.length?'기록 있음':s.type==='휴식'?'휴식':isToday?'오늘':'예정';
    return `<details class="plan-day ${isToday?'is-today':''}"><summary><div class="date-block"><b>${formatDate(date,{weekday:'short'})}</b><span>${date.slice(5).replace('-','/')}</span></div><div class="plan-title"><b>${esc(s.title)}</b><span>${s.type} · 예상 ${s.minutes}분</span></div><span class="day-state ${done?'done':''}">${label}</span></summary><div class="plan-detail"><ol>${s.tasks.map(t=>`<li><b>${esc(t.name)}</b><p>${esc(t.detail)}</p></li>`).join('')}</ol><p class="muted small">운동 완료는 ‘오늘’에서 진행할 때 기록돼요.</p>${isToday?button('오늘 운동으로','nav-today','secondary'):''}</div></details>`;
  }).join('')}</div>`;
}
