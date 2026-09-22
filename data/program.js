import { exerciseByName } from "./exercises.js";

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
function rawSession(w,d){
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

export function session(w,d) {
  if (!Number.isInteger(w) || w<1 || w>12 || !Number.isInteger(d) || d<0 || d>6) throw new Error("올바르지 않은 계획 날짜입니다.");
  const s=rawSession(w,d);
  return {...s, tasks:s.tasks.map(([name,detail,duration],i) => { const e=exerciseByName(name); return {id:e.id+"-"+i,exerciseId:e.id,name,detail,duration}; })};
}
