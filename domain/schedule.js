export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T12:00:00');
  return !Number.isNaN(+date) && todayISO(date) === value;
}
export function addDays(value, days) {
  const date = new Date(value+'T12:00:00');
  date.setDate(date.getDate()+days);
  return todayISO(date);
}
function ordinal(value) { const [y,m,d]=value.split('-').map(Number); return Date.UTC(y,m-1,d)/86400000; }
export function position(startDate, date = todayISO()) {
  const diff = ordinal(date)-ordinal(startDate);
  return {diff, week:Math.max(1,Math.min(12,Math.floor(diff/7)+1)), day:Math.max(0,Math.min(83,diff))%7, before:diff<0, after:diff>=84};
}
export function dateFor(startDate, week, day) { return addDays(startDate,(week-1)*7+day); }
export function planKey(week,day) { return `w${week}d${day}`; }
export function formatDate(value, options={month:'long',day:'numeric',weekday:'short'}) {
  return new Intl.DateTimeFormat('ko-KR',options).format(new Date(value+'T12:00:00'));
}
