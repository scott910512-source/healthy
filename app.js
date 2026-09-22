const DAYS = ["월","화","수","목","금","토","일"];
const STORE_KEY = "project100-v2";
const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
};
const base = {startDate:todayISO(), week:1, day:0, checks:{}, daily:{}, weights:[], lifts:{}};
let data = load();
let deferredPrompt = null;
const taskCursor = {};

function load(){
  try {
    const saved=Object.assign({}, base, JSON.parse(localStorage.getItem(STORE_KEY) || "{}"));
    saved.checks=saved.checks||{}; saved.daily=saved.daily||{}; saved.weights=saved.weights||[]; saved.lifts=saved.lifts||{};
    return saved;
  }
  catch(e) { return Object.assign({}, base); }
}
function persist(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function esc(v){
  return String(v == null ? "" : v).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function addDays(value,n){ const d=new Date(value+"T12:00:00"); d.setDate(d.getDate()+n); return d; }
function fmtDate(d){ return new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(d); }
function key(w,d){ return "w"+w+"d"+d; }
function completedFor(k){ return data.checks[k] || []; }
function toast(msg){
  const e=document.querySelector("#toast");
  e.textContent=msg; e.classList.add("show");
  setTimeout(function(){e.classList.remove("show");},1800);
}

const strengthA = [
  ["워밍업","러닝머신 평지 걷기 5분 + 관절 가동성 3분","8분"],
  ["레그프레스","3세트 × 10~12회 · 휴식 90초","9분"],
  ["체스트프레스","3세트 × 10~12회 · 휴식 75초","8분"],
  ["랫풀다운","3세트 × 10~12회 · 휴식 75초","8분"],
  ["레그컬","3세트 × 12~15회 · 휴식 60초","7분"],
  ["숄더프레스","2세트 × 10~12회 · 휴식 60초","5분"]
];
const strengthB = [
  ["워밍업","러닝머신 평지 걷기 5분 + 관절 가동성 3분","8분"],
  ["핵스쿼트","3세트 × 8~10회 · 통증 없는 깊이","9분"],
  ["시티드로우","3세트 × 10~12회 · 휴식 75초","8분"],
  ["인클라인 체스트프레스","3세트 × 10~12회","8분"],
  ["레그익스텐션","2세트 × 12~15회 · 가볍고 천천히","5분"],
  ["레그컬","2세트 × 12~15회 · 휴식 60초","5분"],
  ["데드버그","좌우 8회 × 3세트","5분"]
];
const LOAD_GUIDE = {
  "레그프레스":{label:"60 kg",value:60,step:10},
  "체스트프레스":{label:"20 kg",value:20,step:5},
  "랫풀다운":{label:"25 kg",value:25,step:5},
  "레그컬":{label:"15 kg",value:15,step:5},
  "숄더프레스":{label:"10 kg",value:10,step:2.5},
  "핵스쿼트":{label:"기구 최저 중량",value:null,step:5},
  "시티드로우":{label:"25 kg",value:25,step:5},
  "인클라인 체스트프레스":{label:"15 kg",value:15,step:5},
  "레그익스텐션":{label:"15 kg",value:15,step:5}
};
const FORM_CUES = {
  "워밍업":"보폭을 작게 시작하고 무릎과 발끝이 같은 방향을 보게 하세요.",
  "레그프레스":"엉덩이와 허리를 등받이에 붙이고, 무릎을 완전히 잠그지 마세요.",
  "체스트프레스":"어깨를 아래로 내리고 손잡이는 가슴 중앙 높이. 팔꿈치를 과하게 뒤로 보내지 마세요.",
  "랫풀다운":"가슴을 살짝 들고 바를 쇄골 쪽으로 당기세요. 목 뒤로 당기거나 반동을 쓰지 마세요.",
  "레그컬":"골반을 패드에 고정하고 천천히 굽히세요. 허리가 뜨면 중량을 낮추세요.",
  "숄더프레스":"허리를 과하게 젖히지 말고 팔꿈치는 손목 아래에 두세요. 어깨 통증 시 즉시 중단하세요.",
  "핵스쿼트":"발 전체로 밀고 무릎은 발끝 방향으로 움직이세요. 무릎이 안쪽으로 모이지 않게 하세요.",
  "시티드로우":"가슴을 세우고 팔이 아닌 팔꿈치로 당기세요. 몸을 앞뒤로 흔들지 마세요.",
  "인클라인 체스트프레스":"견갑을 등받이에 고정하고 손목을 곧게 유지하세요. 어깨 앞쪽 통증을 참지 마세요.",
  "레그익스텐션":"반동 없이 올리고 천천히 내리세요. 무릎을 세게 잠그지 마세요.",
  "데드버그":"허리를 바닥에 붙인 채 팔다리를 뻗으세요. 허리가 뜨면 가동범위를 줄이세요.",
  "준비 걷기":"상체를 세우고 발뒤꿈치부터 부드럽게 디디세요.",
  "런/워크 인터벌":"보폭을 줄이고 몸 바로 아래에 착지하세요. 무릎·발목의 날카로운 통증은 중단 신호입니다.",
  "마무리 걷기":"갑자기 멈추지 말고 호흡과 심박이 내려올 때까지 천천히 걸으세요.",
  "종아리·둔근 스트레칭":"반동 없이 당기는 느낌까지만. 통증이 나는 범위까지 누르지 마세요.",
  "빠른 걷기 또는 엘립티컬":"허리를 세우고 손잡이에 체중을 싣지 마세요.",
  "가벼운 스트레칭":"호흡을 멈추지 말고 각 자세를 편안하게 유지하세요.",
  "천국의계단":"발바닥을 계단에 충분히 올리고 손잡이는 균형만 잡으세요. 허리를 숙여 매달리지 마세요.",
  "엘립티컬":"무릎과 발끝을 같은 방향으로 두고 상체가 좌우로 흔들리지 않게 하세요.",
  "높은 곳 짚고 푸시업":"머리부터 발뒤꿈치까지 일직선. 팔꿈치는 몸통에서 약 45도로 벌리세요.",
  "맨몸 스쿼트":"엉덩이를 뒤로 보내며 앉고 무릎은 발끝 방향을 따라가게 하세요.",
  "스텝백 버피":"점프하지 말고 한 발씩 움직이세요. 허리가 꺾이지 않도록 배에 힘을 주세요.",
  "플랭크":"엉덩이가 처지거나 들리지 않게 하고 허리 통증 전 종료하세요.",
  "선택 산책":"대화 가능한 편한 강도로 걷고 통증이 있으면 쉬세요.",
  "회복 확인":"한쪽 관절의 통증이나 절뚝거림이 남으면 다음 운동 강도를 낮추세요."
};
function nextLoad(weight,rpe,step){
  if(!weight) return "실제 중량을 기록하면 다음 추천이 표시됩니다";
  if(!rpe) return "RPE도 입력하면 다음 중량을 계산합니다";
  if(rpe<=7) return "다음 추천 "+(weight+step)+" kg";
  if(rpe<=8) return "다음에도 "+weight+" kg 유지";
  return "다음 추천 "+Math.max(0,weight-step)+" kg · 자세 우선";
}
function runPrescription(w,second){
  const patterns=[[1,2,8],[1,2,10],[2,2,8],[2,2,10],[3,2,8],[3,2,9],[2,2,8],[4,2,7],[5,2,6],[8,2,4],[12,2,3],[20,2,2]];
  const p=patterns[w-1].slice();
  if(second && w>2) p[2]=Math.max(3,p[2]-1);
  const total=10+(p[0]+p[1])*p[2];
  const dist=(total*(w<5?0.075:w<9?0.082:0.09)).toFixed(1);
  return {run:p[0],walk:p[1],sets:p[2],total:total,dist:dist};
}
function cardioTasks(w,second){
  const p=runPrescription(w,second);
  return [
    ["준비 걷기","편한 속도로 걷고 발목·무릎 상태 확인","5분"],
    ["런/워크 인터벌",p.run+"분 조깅 + "+p.walk+"분 걷기 × "+p.sets+"회 · 예상 "+p.dist+"km",(p.run+p.walk)+"분 × "+p.sets],
    ["마무리 걷기","호흡이 안정될 때까지 천천히","5분"],
    ["종아리·둔근 스트레칭","반동 없이 각 20~30초","5분"]
  ];
}
function bodyTasks(w){
  const rounds=w<5?3:4;
  return [
    ["높은 곳 짚고 푸시업","10~12회 × "+rounds+"라운드","약 4분"],
    ["맨몸 스쿼트","12~15회 × "+rounds+"라운드 · 통증 없는 깊이","약 4분"],
    ["스텝백 버피",(w<5?5:w<9?6:8)+"회 × "+rounds+"라운드 · 점프 없음","약 4분"],
    ["플랭크",(w<5?20:w<9?30:40)+"초 × "+rounds+"라운드","약 3분"]
  ];
}
function session(w,d){
  const stair=Math.min(10+Math.floor((w-1)/2)*3,25);
  const low=Math.min(40+(w-1)*2,60);
  const deload=w===7;
  let s;
  if(d===0) s={title:"전신 A + 천국의계단",type:"근력",minutes:deload?48:58+stair,tasks:strengthA.concat([["천국의계단","레벨 3~5 · "+(deload?10:stair)+"분 · 손잡이는 균형만",(deload?10:stair)+"분"]])};
  if(d===1) s={title:"하천 런/워크",type:"유산소",minutes:runPrescription(w,false).total+10,tasks:cardioTasks(w,false)};
  if(d===2) s={title:"전신 B + 엘립티컬",type:"근력",minutes:deload?48:63,tasks:strengthB.concat([["엘립티컬","RPE 5~6 · "+(deload?10:15)+"분",(deload?10:15)+"분"]])};
  if(d===3) s={title:"저강도 회복 유산소",type:"회복",minutes:deload?35:low,tasks:[
    ["빠른 걷기 또는 엘립티컬","RPE 4~5 · "+(deload?35:low)+"분 · 예상 "+(((deload?35:low)*0.075).toFixed(1))+"km",(deload?35:low)+"분"],
    ["가벼운 스트레칭","종아리·대퇴 앞·둔근 각 30초 × 2","6분"]
  ]};
  if(d===4) s={title:"전신 A + 천국의계단",type:"근력",minutes:deload?45:55+stair,tasks:strengthA.slice(0,5).concat([
    ["시티드로우","3세트 × 10~12회 · 휴식 75초","8분"],
    ["천국의계단","레벨 3~5 · "+(deload?8:stair)+"분",(deload?8:stair)+"분"]
  ])};
  if(d===5) s={title:"런/워크 + 맨몸",type:"복합",minutes:runPrescription(w,true).total+25,tasks:cardioTasks(w,true).slice(0,3).concat(bodyTasks(w))};
  if(d===6) s={title:"휴식 또는 산책",type:"휴식",minutes:30,tasks:[
    ["선택 산책","아주 편한 속도로 20~30분","선택"],
    ["회복 확인","수면·근육통·무릎/발목 상태 메모","2분"]
  ]};
  if(deload) s.title += " · 회복주";
  return s;
}
function taskHTML(s,k){
  const checked=completedFor(k);
  if(taskCursor[k]==null) taskCursor[k]=Math.max(0,s.tasks.findIndex(function(_,i){return checked.indexOf(i)<0;}));
  taskCursor[k]=Math.min(s.tasks.length-1,Math.max(0,taskCursor[k]));
  const i=taskCursor[k],t=s.tasks[i],done=checked.indexOf(i)>=0,guide=LOAD_GUIDE[t[0]];
  let html='<div class="session-head"><div><div class="session-title">'+esc(s.title)+'</div><div class="session-meta">예상 '+s.minutes+'분 · '+esc(s.type)+'</div></div><span class="tag">'+esc(s.type)+'</span></div>';
  html+='<div class="task-progress"><span>'+(i+1)+' / '+s.tasks.length+'</span><i><b style="width:'+((i+1)/s.tasks.length*100)+'%"></b></i></div>';
  html+='<div class="task-slide"><label class="task '+(done?'done':'')+'"><input type="checkbox" data-task="'+i+'" '+(done?'checked':'')+'><span><div class="task-main">'+esc(t[0])+'</div><div class="task-sub">'+esc(t[1])+'</div></span><span class="task-time">'+esc(t[2])+'</span></label>';
  if(FORM_CUES[t[0]]) html+='<div class="form-cue"><b>자세 체크</b><span>'+esc(FORM_CUES[t[0]])+'</span></div>';
  if(guide){
    const liftKey=k+"-"+i, saved=data.lifts[liftKey]||{},initial=saved.weight||guide.value||"";
    html+='<div class="load-box"><div class="load-guide"><b>초보 시작 무게 '+esc(guide.label)+'</b><span>첫 세트 후 가볍게 조정</span></div><div class="load-inputs"><label>실제 kg<input type="number" min="0" max="500" step="2.5" inputmode="decimal" value="'+esc(initial)+'" data-lift-weight="'+i+'" placeholder="kg"></label><label>RPE<input type="number" min="1" max="10" step="1" inputmode="numeric" value="'+esc(saved.rpe||"")+'" data-lift-rpe="'+i+'" placeholder="1~10"></label></div><div class="next-load" data-next="'+i+'">'+esc(nextLoad(Number(saved.weight),Number(saved.rpe),guide.step))+'</div></div>';
  }
  html+='</div><div class="task-nav"><button data-prev-task '+(i===0?'disabled':'')+'>이전</button><button class="next-task" data-next-task '+(i===s.tasks.length-1?'disabled':'')+'>'+(i===s.tasks.length-1?'마지막 운동':'다음 운동')+'</button></div>';
  const all=checked.length===s.tasks.length;
  html+='<button class="complete '+(all?'alt':'')+'" data-all>'+(all?'완료 취소':'오늘 운동 전체 완료')+'</button>';
  return html;
}
function wireTasks(container,k,s){
  container.querySelectorAll("[data-task]").forEach(function(c){
    c.onchange=function(){
      const arr=new Set(completedFor(k));
      const n=Number(c.dataset.task);
      if(c.checked) arr.add(n); else arr.delete(n);
      data.checks[k]=Array.from(arr); persist(); render();
    };
  });
  container.querySelector("[data-all]").onclick=function(){
    data.checks[k]=completedFor(k).length===s.tasks.length?[]:s.tasks.map(function(_,i){return i;});
    persist(); render();
    toast(data.checks[k].length?"운동 완료! 수고했어요.":"완료를 취소했어요.");
  };
  container.querySelector("[data-prev-task]").onclick=function(){taskCursor[k]=Math.max(0,taskCursor[k]-1);render();};
  container.querySelector("[data-next-task]").onclick=function(){taskCursor[k]=Math.min(s.tasks.length-1,taskCursor[k]+1);render();};
  function saveLift(i){
    const task=s.tasks[i],guide=LOAD_GUIDE[task[0]];
    if(!guide) return;
    const weight=Number(container.querySelector('[data-lift-weight="'+i+'"]').value)||null;
    const rpe=Number(container.querySelector('[data-lift-rpe="'+i+'"]').value)||null;
    if(weight||rpe) data.lifts[k+"-"+i]={name:task[0],weight:weight,rpe:rpe,date:todayISO()};
    else delete data.lifts[k+"-"+i];
    persist();
    container.querySelector('[data-next="'+i+'"]').textContent=nextLoad(weight,rpe,guide.step);
    toast("사용 중량을 저장했어요.");
  }
  container.querySelectorAll("[data-lift-weight],[data-lift-rpe]").forEach(function(input){
    input.onchange=function(){saveLift(Number(input.dataset.liftWeight??input.dataset.liftRpe));};
  });
}
function programPosition(){
  const start=new Date(data.startDate+"T00:00:00");
  const now=new Date(todayISO()+"T00:00:00");
  const diff=Math.floor((now-start)/86400000);
  return {diff:diff,w:Math.min(12,Math.max(1,Math.floor(diff/7)+1)),d:Math.min(6,Math.max(0,(diff%7+7)%7)),before:diff<0,after:diff>=84};
}
function renderToday(){
  const p=programPosition(),s=session(p.w,p.d),k=key(p.w,p.d);
  document.querySelector("#todayDate").textContent=fmtDate(new Date());
  document.querySelector("#todayWeek").textContent=p.before?"시작 전":p.after?"12주 완료":p.w+"주차";
  document.querySelector("#todayTitle").textContent=p.before?"프로그램 준비":s.title;
  document.querySelector("#todaySubtitle").textContent=p.before?fmtDate(addDays(data.startDate,0))+" 시작 예정":DAYS[p.d]+"요일 · 예상 "+s.minutes+"분";
  const box=document.querySelector("#todaySession");
  box.innerHTML=taskHTML(s,k); wireTasks(box,k,s);
  const daily=data.daily[todayISO()]||{};
  document.querySelector("#dailyMinutes").value=daily.minutes||"";
  document.querySelector("#dailyDistance").value=daily.distance||"";
  document.querySelector("#dailyRpe").value=daily.rpe||"";
  document.querySelector("#dailyPain").value=daily.pain||"좋음";
  document.querySelector("#dailyMemo").value=daily.memo||"";
}
function renderPlan(){
  document.querySelector("#startDate").value=data.startDate;
  document.querySelector("#weekLabel").textContent=data.week+"주차"+(data.week===7?" · 회복주":"");
  const tabs=document.querySelector("#dayTabs");
  tabs.innerHTML=DAYS.map(function(x,i){return '<button class="'+(i===data.day?'active':'')+'" data-day="'+i+'">'+x+'</button>';}).join("");
  tabs.querySelectorAll("button").forEach(function(b){b.onclick=function(){data.day=Number(b.dataset.day);persist();renderPlan();};});
  const s=session(data.week,data.day),k=key(data.week,data.day),box=document.querySelector("#planSession");
  box.innerHTML=taskHTML(s,k); wireTasks(box,k,s);
  document.querySelector("#weekOverview").innerHTML=DAYS.map(function(x,i){
    const a=session(data.week,i),done=completedFor(key(data.week,i)).length===a.tasks.length;
    return '<div class="plan-row"><strong>'+x+'요일</strong><div><div class="name">'+esc(a.title)+'</div><div class="detail">'+a.minutes+'분 · '+a.type+'</div></div><span class="state">'+(done?'완료':'예정')+'</span></div>';
  }).join("");
}
function stats(){
  let total=0,done=0,mins=0;
  for(let w=1;w<=12;w++) for(let d=0;d<7;d++){
    const s=session(w,d); total++; mins+=s.minutes;
    if(completedFor(key(w,d)).length===s.tasks.length) done++;
  }
  const pct=Math.round(done/total*100);
  document.querySelector("#overallBar").style.width=pct+"%";
  document.querySelector("#overallText").textContent="전체 완료율 "+pct+"% · "+done+"/"+total+"일";
  document.querySelector("#daysDone").textContent=done;
  document.querySelector("#totalMinutes").textContent=mins.toLocaleString();
  const ws=data.weights.slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  document.querySelector("#weightDelta").textContent=ws.length>1?(ws[ws.length-1].weight-ws[0].weight).toFixed(1):"—";
}
function chart(){
  const svg=document.querySelector("#weightChart");
  const a=data.weights.slice().sort(function(x,y){return x.date.localeCompare(y.date);});
  if(!a.length){svg.innerHTML='<text x="180" y="86" text-anchor="middle">체중을 기록하면 변화가 표시됩니다</text>';return;}
  const values=a.map(function(x){return x.weight;});
  const min=Math.min.apply(null,values.concat([100]))-1,max=Math.max.apply(null,values.concat([110]))+1;
  const X=function(i){return 26+(a.length===1?154:i/(a.length-1)*308);};
  const Y=function(v){return 18+(max-v)/(max-min)*125;};
  let html="";
  [0,.5,1].forEach(function(q){const y=18+q*125,v=(max-q*(max-min)).toFixed(1);html+='<line class="grid" x1="26" y1="'+y+'" x2="334" y2="'+y+'"/><text x="2" y="'+(y+3)+'">'+v+'</text>';});
  const pts=a.map(function(x,i){return X(i)+","+Y(x.weight);}).join(" ");
  html+='<polyline class="line" points="'+pts+'"/>';
  a.forEach(function(x,i){html+='<circle class="dot" cx="'+X(i)+'" cy="'+Y(x.weight)+'" r="4"/>';});
  html+='<text x="26" y="167">'+a[0].date.slice(5)+'</text><text x="334" y="167" text-anchor="end">'+a[a.length-1].date.slice(5)+'</text>';
  svg.innerHTML=html;
}
function renderRecords(){
  document.querySelector("#logDate").value=document.querySelector("#logDate").value||todayISO();
  chart();
  const a=data.weights.slice().sort(function(x,y){return y.date.localeCompare(x.date);});
  document.querySelector("#logList").innerHTML=a.map(function(x){
    const sub=(x.waist?"허리 "+x.waist+"cm · ":"")+(x.sleep?"수면 "+x.sleep+"시간":"");
    return '<div class="log"><div><b>'+esc(x.date)+' · '+x.weight.toFixed(1)+' kg</b><small>'+esc(sub)+'</small></div><button class="delete" data-del="'+esc(x.date)+'">삭제</button></div>';
  }).join("");
  document.querySelectorAll("[data-del]").forEach(function(b){b.onclick=function(){data.weights=data.weights.filter(function(x){return x.date!==b.dataset.del;});persist();render();};});
}
function render(){renderToday();renderPlan();renderRecords();stats();}
function show(v){
  document.querySelectorAll(".view").forEach(function(x){x.classList.toggle("active",x.id===v+"View");});
  document.querySelectorAll(".nav button").forEach(function(x){x.classList.toggle("active",x.dataset.view===v);});
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav button").forEach(function(b){b.onclick=function(){show(b.dataset.view);};});
document.querySelectorAll("[data-nav]").forEach(function(b){b.onclick=function(){show(b.dataset.nav);};});
document.querySelector("#startDate").onchange=function(e){data.startDate=e.target.value||todayISO();persist();render();toast("시작일을 저장했어요.");};
document.querySelector("#prevWeek").onclick=function(){data.week=Math.max(1,data.week-1);persist();renderPlan();};
document.querySelector("#nextWeek").onclick=function(){data.week=Math.min(12,data.week+1);persist();renderPlan();};
document.querySelector("#saveDaily").onclick=function(){
  data.daily[todayISO()]={minutes:Number(document.querySelector("#dailyMinutes").value)||null,distance:Number(document.querySelector("#dailyDistance").value)||null,rpe:Number(document.querySelector("#dailyRpe").value)||null,pain:document.querySelector("#dailyPain").value,memo:document.querySelector("#dailyMemo").value.trim()};
  persist();toast("오늘 기록을 저장했어요.");
};
document.querySelector("#saveWeight").onclick=function(){
  const date=document.querySelector("#logDate").value,weight=Number(document.querySelector("#logWeight").value);
  if(!date||!weight){toast("날짜와 체중을 입력하세요.");return;}
  const item={date:date,weight:weight,waist:Number(document.querySelector("#logWaist").value)||null,sleep:Number(document.querySelector("#logSleep").value)||null};
  data.weights=data.weights.filter(function(x){return x.date!==date;});data.weights.push(item);persist();document.querySelector("#logWeight").value="";render();toast("체중 기록을 저장했어요.");
};
document.querySelector("#exportData").onclick=function(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="project100-backup-"+todayISO()+".json";a.click();URL.revokeObjectURL(a.href);
};
document.querySelector("#importData").onchange=async function(e){
  try{const obj=JSON.parse(await e.target.files[0].text());if(!obj.startDate||!obj.checks)throw new Error();data=Object.assign({},base,obj);persist();render();toast("백업을 불러왔어요.");}
  catch(err){toast("올바른 백업 파일이 아니에요.");}
};
document.querySelector("#resetData").onclick=function(){if(confirm("모든 체크와 기록을 초기화할까요?")){data=Object.assign({},base,{startDate:todayISO()});persist();render();toast("초기화했어요.");}};
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferredPrompt=e;});
document.querySelector("#installBtn").onclick=async function(){
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)){document.querySelector("#installHelp").showModal();}
  else if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;}
  else{document.querySelector("#installHelp").showModal();}
};
document.querySelector("#closeInstall").onclick=function(){document.querySelector("#installHelp").close();};
if("serviceWorker" in navigator) window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){});});
document.addEventListener("dblclick",function(e){e.preventDefault();},{passive:false});
document.addEventListener("gesturestart",function(e){e.preventDefault();},{passive:false});
document.addEventListener("gesturechange",function(e){e.preventDefault();},{passive:false});
render();
