export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const icons={
  today:'<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4"/>',
  plan:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  record:'<path d="M4 4v16h16M7 14l4-4 4 2 5-7"/>',
  settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2Z"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',
};
export const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.today}</svg>`;
export const button=(label,action,cls='primary',extra='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
export function field(label,name,value='',options={}) {
  const {type='number',min,max,step='any',required=false,placeholder=''}=options;
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${type==='number'?`step="${step}" inputmode="decimal"`:''} ${required?'required':''} placeholder="${esc(placeholder)}"></label>`;
}
export const empty=(title,body)=>`<div class="empty"><b>${title}</b><p>${body}</p></div>`;
