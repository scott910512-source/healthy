import { session } from '../data/program.js';
import { EXERCISES } from '../data/exercises.js';
import { position, todayISO, formatDate, planKey } from '../domain/schedule.js';
import { counts, lastWeight, hasCardio, elapsed, timerText } from '../domain/workout.js';
import { esc, button, field, icon } from './shared.js';

export function todayView(state, workoutOpen=false) {
  const active=state.workouts.find(w=>w.id===state.activeId);
  if(active && workoutOpen) return active.status==='review'?reviewView(active):workoutView(active,state);
  if(active) { const c=counts(active);return `<div class="page-heading"><div><p class="eyebrow">WELCOME BACK</p><h1>이어서 해볼까요?</h1><p class="muted">${formatDate(active.date)}에 시작한 운동</p></div></div><section class="card hero"><span class="pill">${active.status==='review'?'마무리 기록':'진행 중'}</span><h2>${esc(active.title)}</h2><p class="muted">${c.total}종목 중 ${c.done}개 완료</p><div class="progress-track"><i style="width:${c.done/c.total*100}%"></i></div><p class="resume-task">${active.status==='review'?'운동 내용을 확인하고 저장해 주세요.':'다음 운동 · '+esc(active.tasks[active.cursor].name)}</p>${button(active.status==='review'?'기록 마무리':'이어서 운동','open-workout')}${button('여기까지 기록하고 종료','end-workout','text-button full')}</section>`; }
  const p=position(state.settings.startDate),today=todayISO();
  if(p.before || p.after) return `<div class="page-heading"><p class="eyebrow">MY ROUTINE</p><h1>${p.before?'시작을 준비해요':'12주를 마쳤어요'}</h1></div><section class="card hero"><span class="pill">${p.before?'시작 전':'프로그램 종료'}</span><h2>${p.before?formatDate(state.settings.startDate)+' 시작':'쌓인 기록을 확인해 보세요'}</h2><p class="muted">${p.before?'계획에서 앞으로 할 운동을 확인할 수 있어요.':'시작일을 변경하면 새 12주 계획을 시작할 수 있어요.'}</p>${button(p.before?'운동 계획 보기':'내 기록 보기',p.before?'nav-plan':'nav-record')}${button('시작일 설정','nav-settings','text-button')}</section>`;
  const s=session(p.week,p.day),key=planKey(p.week,p.day);
  const finished=state.workouts.filter(w=>w.status==='finished' && w.date===today);
  const matched=finished.find(w=>w.programKey===key && w.planStartDate===state.settings.startDate);
  const latest=state.weights.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  return `<div class="page-heading"><div><p class="eyebrow">ONE DAY AT A TIME</p><h1>오늘의 운동</h1><p class="muted">${formatDate(today)}</p></div><span class="pill">${p.week}주차</span></div>
    ${matched?`<section class="card success-card"><span class="success-mark">${icon('check')}</span><h2>오늘도 수고했어요</h2><p>${esc(matched.title)}</p><p class="muted">${counts(matched).done}종목 완료 · ${matched.summary.minutes===null?'시간 미기록':matched.summary.minutes+'분'}</p>${button('운동 기록 보기','nav-record')}${button('추가로 운동하기','start','text-button')}</section>`:
    `<section class="card hero"><div class="row"><span class="pill subtle">${s.type==='휴식'?'RECOVERY':s.type==='근력'?'STRENGTH':'MOVEMENT'}</span><span class="muted small">DAY ${p.diff+1} / 84</span></div><h2>${esc(s.title)}</h2><p class="muted">${s.type==='휴식'?'충분히 쉬어도 괜찮아요. 산책은 선택이에요.':'오늘은 이 운동만 차근차근 해봐요.'}</p><div class="session-facts"><div><b>${s.minutes}<small>분</small></b><span>예상 시간</span></div><div><b>${s.tasks.length}<small>종목</small></b><span>${s.type==='휴식'?'선택 활동':'오늘의 구성'}</span></div></div>${button((s.type==='휴식'?'산책 기록':'운동 시작')+icon('arrow'),'start')}<p class="footnote">한 종목씩 진행하고 자동으로 저장해요.</p></section>`}
    <section class="card compact"><div class="row"><div><h3>오늘의 순서</h3><p class="muted small">${s.type==='휴식'?'부담 없이 선택하세요':'자세 안내는 운동 중에 볼 수 있어요'}</p></div>${button('계획 보기','nav-plan','text-button')}</div><div class="exercise-chips">${s.tasks.slice(0,4).map(t=>`<span>${esc(t.name)}</span>`).join('')}${s.tasks.length>4?`<span>+${s.tasks.length-4}</span>`:''}</div></section>
    <button class="weight-link" type="button" data-action="nav-record"><span>나의 체중 <b>${latest?latest.weight.toFixed(1)+' kg':'기록해 보세요'}</b></span><span class="muted small">${latest?esc(latest.date.slice(5)):'기록'} →</span></button>`;
}

function workoutView(w,state) {
  const task=w.tasks[w.cursor],exercise=EXERCISES[task.exerciseId],c=counts(w),paused=w.status==='paused';
  const previous=lastWeight(state.workouts,task.exerciseId,w.id),draft=w.taskDrafts?.[task.id]||{};
  const value=draft.weight??task.weight??previous?.weight??exercise?.load?.value??'';
  const weightSource=task.weight!==null?'이번 운동 기록':previous?`직전 ${previous.date.slice(5)} 사용 중량`:'초보 시작 참고값';
  return `<div class="workout-top"><div><p class="eyebrow">${esc(w.title)}</p><span class="muted small">${formatDate(w.date)} · ${w.week}주차</span></div>${button('나가기','leave-workout','text-button')}</div>
    <section class="card workout-card"><div class="row"><span class="pill">현재 ${w.cursor+1} / ${c.total}종목</span><span class="timer" id="workoutTimer">${timerText(elapsed(w))}</span></div><div class="progress-track" role="progressbar" aria-label="완료한 종목" aria-valuenow="${c.done}" aria-valuemin="0" aria-valuemax="${c.total}"><i style="width:${c.done/c.total*100}%"></i></div><p class="progress-caption">완료 ${c.done}개${c.skipped?' · 건너뜀 '+c.skipped+'개':''} · 화면을 떠나면 자동 일시정지</p>
      <h1 class="exercise-name">${esc(task.name)}</h1><p class="prescription">${esc(task.detail)}</p><span class="muted small">예상 ${esc(task.duration)}${task.status==='done'?' · 완료한 종목':task.status==='skipped'?' · 건너뛴 종목':''}</span>
      ${exercise?.cue?`<div class="cue"><span class="cue-label">자세 체크</span><p>${esc(exercise.cue)}</p></div>`:''}
      <form id="taskForm" novalidate>
      ${exercise?.load?`<div class="load-panel"><div class="row"><label for="taskWeight">사용 중량</label><span class="muted small">${esc(weightSource)}</span></div><div class="weight-input"><input id="taskWeight" name="weight" type="number" min="0" max="500" step="0.5" inputmode="decimal" value="${esc(value)}" placeholder="직접 입력" aria-describedby="weightNote"><span>kg</span></div><p class="muted small" id="weightNote">${exercise.load.value===null?'기구 최저 중량에서 확인하세요.':'기구마다 저항이 달라요. 무거우면 낮춰 주세요.'} 완료할 때 사용 중량으로 확정해요.</p></div>`:''}
      <details class="details"><summary>운동 강도 기록 <span>선택</span></summary>${field('체감 강도 · RPE 1~10','rpe',draft.rpe??task.rpe??'',{min:1,max:10,step:1,placeholder:'예: 6'})}<p class="muted small">10은 더 반복하기 어려운 최대 강도예요.</p></details></form>
      ${paused?`<div class="pause-note">잠시 멈췄어요. 이어서 진행할 수 있어요.</div>${button('이어서 운동','resume')}`:button(w.cursor===c.total-1?'완료하고 운동 마치기':'완료하고 다음 '+icon('arrow'),'complete-task')}
      <div class="workout-actions">${button('이전','previous','text-button',w.cursor===0?'disabled':'')}${button('건너뛰기','skip-task','text-button',paused?'disabled':'')}${button(paused?'기록하고 종료':'일시정지',paused?'end-workout':'pause','text-button')}</div>
      ${!paused?button('여기까지 기록하고 종료','end-workout','text-button quiet full'):''}
    </section>`;
}

function reviewView(w) {
  const c=counts(w),d=w.draftSummary||{},s=w.summary;
  return `<div class="page-heading"><div><p class="eyebrow">WELL DONE</p><h1>오늘의 운동 기록</h1><p class="muted">${formatDate(w.date)}</p></div></div><section class="card"><div class="review-count"><b>${c.done}<small> / ${c.total}종목 완료</small></b><p class="muted small">${c.skipped}개 건너뜀 · ${c.total-c.done-c.skipped}개 미완료</p></div><p>${esc(w.title)}</p>
    <form id="summaryForm">${field('실제 운동 시간 · 분','minutes',d.minutes??s.minutes??'',{min:0,max:10000,step:1,required:true})}
    ${hasCardio(w)?field('이동 거리 · km (선택)','distance',d.distance??s.distance??'',{min:0,max:1000,step:0.01}):''}
    <details class="details" ${Object.values(d).some(v=>v!=='')?'open':''}><summary>컨디션·메모 추가 <span>선택</span></summary><div class="form-grid">${field('전체 체감 강도 · RPE','rpe',d.rpe??s.rpe??'',{min:1,max:10,step:1})}<label class="field"><span>관절 상태</span><select name="pain">${['','좋음','약간 불편','통증 있음'].map(v=>`<option value="${v}" ${(d.pain??s.pain)===v?'selected':''}>${v||'선택 안 함'}</option>`).join('')}</select></label></div><label class="field"><span>메모</span><textarea name="memo" rows="3" maxlength="4000" placeholder="오늘 어땠나요?">${esc(d.memo??s.memo)}</textarea></label></details>
    <button class="primary" type="submit">기록 완료 ${icon('check')}</button></form>${button('운동으로 돌아가기','back-workout','text-button full')}</section>`;
}
