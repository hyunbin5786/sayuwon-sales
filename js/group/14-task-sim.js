// ▣ js/group/14-task-sim.js — 열지 않은 예약의 추후 과업 계산(simTasks — 열었을 때와 같게) · 나의 할일 화면(renderMy: 탭 · 오늘 마감 · 오늘 완료) · 바깥에서 예약 열기
// ===== 열지 않은 예약의 추후 과업 = 열었을 때와 똑같이 (2026-11-21) =====
// 예전: 예약을 열어야 syncAutoTasks(과업 규칙)가 돌아 새 과업(전산 예약 · 견적서 · 담당자에게 일정 전달 …)이 생기고 저장됨 →
//       열기 전에는 나의 할일에 안 뜨다가, 누군가 그 예약을 열면 그때 (이미 기한이 지난 채로) 나타났음
// 지금: 나의 할일 · 알림이 예약마다 그 예약을 연 것처럼 같은 규칙(syncAutoTasks)을 화면 밖에서 돌려 과업을 계산 (저장은 하지 않음 · 화면 상태는 그대로 되돌림)
//  recFromRecord = openRecord 가 시트 한 줄로 예약 칸(rec)을 만드는 것과 같게 (화면은 건드리지 않음) — openRecord 를 고치면 여기도 같이
function recFromRecord(r){
  const o=blank(); KEYS.forEach(k=>{ o[k]=r[k]||''; });
  LEGACY_KEYS.forEach(k=>{ if(r[k]) o[k]=r[k]; }); if(r.mabangD) o.mabangD=r.mabangD;
  if(!o.owner) o.owner=savedOwner(); o.tbd='';
  Object.assign(o, unpackExtra(r));
  if(!o.pay) o.pay='미정'; if(!o.gate) o.gate='미정';
  if(o.seminar2){ o.seminar=String((numOf(o.seminar)||1)+(numOf(o.seminar2)||1)); o.seminar2=''; }
  { const gl=goodsParse(o.goods), mv=gl.filter(g=>goodsKeyOf(g.src)); if(mv.length){ mv.forEach(g=>{ const c=goodsKeyOf(g.src); o[c]=String((numOf(o[c])||0)+(g.qty||0)); }); o.goods=goodsJoin(gl.filter(g=>!goodsKeyOf(g.src))); } }
  syncPayTbd(o);
  if(/^adm/.test(r.id) && !o.erp) o.erp='관리자 예약';
  o.stage = STAGES.includes(normStage(r.callType)) && normStage(r.callType)!==stageAuto(o) ? normStage(r.callType) : '';
  Object.assign(o, splitContacts(r));
  return o;
}
const simCache=new Map();   // 예약 id → {k, tasks} (그 예약 · 오늘 · 품목 · 과업 설정이 같으면 다시 계산하지 않음)
let simVer=0;               // 품목 관리 · 추후과업 메시지 관리를 다시 받으면 올림 → 모두 다시 계산
function simTasks(r){
  const k=[r.saved||'', r.updated||'', r.callType||'', r.date||'', r.memo||'', todayYmd(), simVer, savedOwner()].join('|'), hs=String(r.history||''), c=simCache.get(r.id);
  if(c && c.k===k && c.h===hs) return c.tasks;   // 과업(수정 기록 칸)이 한 글자라도 다르면 다시 계산 (2026-11-23 · 예전엔 길이만 봐서, 길이가 같은 변경이면 옛 과업이 그대로 나왔음)
  // 2026-11-23: 열었을 때와 다르게 계산되던 곳을 맞춤 — ① 그 예약의 수정 기록(hist) · 메모(memos)도 그 예약 것으로 바꿔 놓고 계산 (예전엔 화면에 열려 있는 다른 예약의 수정 기록으로 「전산에 올린 때의 내용」을 되살렸음)
  //  ② 예약상담 · 예약취소로 열리는 예약은 화면처럼 사전답사 · 대구대교구 · 직접 추가한 과업만 ③ 계산이 실패하면 조용히 넘어가지 않고 콘솔에 남김 (실패하면 아래 예전 방식으로 떨어져 화면에 없는 과업이 나올 수 있음)
  const S={rec, tasks, erpList, editingId, touched, hist, memos};
  let out=null;
  try{ const ph=parseHist(r); rec=recFromRecord(r); tasks=JSON.parse(JSON.stringify(ph.tasks||[])); erpList=ph.erp||[]; hist=ph.h||[]; memos=ph.memos||[]; editingId=r.id; touched=new Set();
    // 예약을 열면 화면이 채워 넣는 기본값도 똑같이 (2026-11-23): 굿즈 담당 = 영업 담당 (paintFields 의 syncGoodsStaff) · 결제링크가 아니면 현장 재결제 해제.
    //  이것이 빠져서 굿즈가 있는 예약은 열면 과업이 없는데(담당이 채워짐) 나의 할일 · 첫 화면에는 「프로그램 · 굿즈 담당 입력」 · 「전산 예약 수정」(굿즈 담당이 지워진 것으로 봄)이 계속 떴음
    syncGoodsStaff(); if(rec.pay!=='결제링크' && rec.onsite) rec.onsite='';
    syncAutoTasks(); out = quietStage(effStage(rec)) ? tasks.filter(consultTask) : tasks; }
  catch(e){ out=null; try{ console.warn('simTasks', r.id, r.org, e); }catch(_){} }
  finally{ rec=S.rec; tasks=S.tasks; erpList=S.erpList; editingId=S.editingId; touched=S.touched; hist=S.hist; memos=S.memos; }
  simCache.set(r.id, {k, h:hs, tasks:out}); return out;
}
// 저장된 예약의 추후 과업 (열지 않은 예약도): 위 simTasks (열었을 때와 같은 규칙). 계산이 안 되면 예전 방식(저장된 과업 + 미정 · 현장 결제 · 점검)
// 통화 메모 확인 (2026-11-26): 예약상담 · 예약취소 예약도 영업 담당이 아닌 사람이 고친 안 읽은 메모가 있으면 과업이 뜸 (열었을 때와 같게 simTasks 로 계산)
const recMemoNew = r => { const own=ownerOf(r); return parseHist(r).memos.some(m=>m && !m.seen && m.by && m.by!==own); };
function tasksOf(r){
  if(editingId!==r.id && quietStage(stageOfRec(r)) && recMemoNew(r) && taskRecActive(r)){ const sim=simTasks(r), keep = stageOfRec(r)==='예약취소' ? (t=>t.id==='memocheck') : consultTask;   // 예약취소는 통화 메모 확인만
    if(sim) return sim.filter(t=>!t.removed && keep(t)).map(t=>({...t, due:taskDue(t)})); }
  if(stageOfRec(r)==='예약상담' && editingId!==r.id){ const x=xOf(r), all=parseHist(r).tasks, st=all.find(t=>t.id==='tour'), own=all.filter(t=>t.custom).map(t=>({...t, due:taskDue(t)})); return [...(x.tour ? [st ? {...st, due:taskDue(st)} : {id:'tour', title:AUTO_TASKS.tour, done:false, due:ymd(new Date(r.saved||Date.now())), at:r.saved}] : []), ...own]; }   // 예약상담: 사전답사 전산 예약 + 직접 추가한 과업
  if(editingId===r.id && quietStage(effStage(rec))) return tasks.filter(consultTask).map(t=>({...t, due:taskDue(t)}));
  if(editingId===r.id) return tasks.map(t=>({...t, due:taskDue(t)}));   // 지금 열어 둔 예약은 화면의 과업
  if(stageOfRec(r)==='예약취소') return [];   // 예약취소: 추후 과업 없음
  if(taskRecActive(r)){ const sim=simTasks(r); if(sim) return sim.filter(t=>!t.removed).map(t=>({...t, due:taskDue(t)})); }   // 열었을 때와 같은 과업 (2026-11-21 · 방문 뒤 30일이 지난 예약은 나의 할일에 안 나오므로 계산하지 않음)
  const x={...xOf(r)}; syncPayTbd(x);   // 미정 항목은 화면과 같은 기준 (결제 · 몽몽마방 결제 · 차량)
  const ts=settleTasks(parseHist(r).tasks, r, x);
  const has = id => ts.some(t=>t.id===id) || parseHist(r).tasks.some(t=>t.id===id && t.removed);   // 삭제한 과업은 다시 만들지 않음
  { const i=ts.findIndex(t=>t.id==='tbdcall'); if(i>=0) ts.splice(i,1); }   // 예전 「미정 항목 확인 연락」은 다음주 예약 점검으로 합침 (2026-11-23)
  // 현장 결제 인원 확인 연락은 다음주 예약 점검의 세부 과업 (2026-11-23) — 따로 만들지 않음. 예전에 저장된 것은 다음주 예약 점검이 있으면 아래에서 뺌
  if(((r.date && r.date>=ymd(new Date())) || x.tbd) && !has('wkcheck')){ const thu=prevWeekThu(r.date), old=(typeof wkDone==='function' && thu) ? wkDone(ownerOf(r), thu)[r.id] : '';   // 예전 「다음주 예약 점검」 한 줄에서 체크한 예약은 끝난 것으로
    ts.push({id:'wkcheck', title:AUTO_TASKS.wkcheck, done:!!old, ...(old?{doneAt:old}:{}), due:autoDue('wkcheck', {...x, date:r.date})}); }
  if(typeof tcfgVirtual==="function") tcfgVirtual(r, x, ts, has);   // 추후과업 메시지 관리의 새 과업 (열지 않은 예약도, 2026-11-20)
  if(typeof tcfgWhoApply==="function") tcfgWhoApply(ts);   // 추후과업 메시지 관리의 담당 (2026-11-25)
  return ts.filter(t=> t.id!=='tbdcall' && !(t.id==='onsitecall' && (x.pay!=='현장 결제' || ts.some(y=>y.id==='wkcheck'))))   // 조건이 사라진 것은 뺌 · 현장 결제 인원 확인 연락은 다음주 예약 점검에 합침
    .map(t=>({...t, ...(!t.custom && !t.titleSet && AUTO_TASKS[t.id] ? {title:AUTO_TASKS[t.id]} : t.id==='pplchk' && !t.titleSet ? {title:PPL_TITLE} : {}), due: t.id==='wkcheck' && !t.dueSet && !t.done && x.tbd && x.tbdDate && x.tbdDate < taskDue(t) ? x.tbdDate : taskDue(t)}));
}
const openTasksOf = r => tasksOf(r).filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due));
const taskRecActive = r => !r.date || daysFrom(r.date, ymd(new Date())) <= 30;   // 방문 뒤 30일 지난 예약의 과업은 빼고
function dueTasks(){   // 마감이 오늘이거나 지난 해결 안 된 과업 (영업 담당이 있으면 내 예약만 + 내가 담당자인 준비 과업)
  const today=ymd(new Date()), me=savedOwner();
  const out=[]; (cache||[]).filter(r=>isGroupRec(r) && (!me || ownerOf(r)===me || mayStaff(r, me)) && taskRecActive(r))
    .forEach(r=>openTasksOf(r).forEach(t=>{ if(t.due<=today && (!me || taskForMe(r, t, me))) out.push({r, t}); }));
  return out.sort((a,b)=>a.t.due.localeCompare(b.t.due));
}
// 과업 담당 (2026-11-24): 과업에 who(담당자 준비 과업)가 있으면 그 사람 것 — 영업 담당에게는 안 보임 · 없으면 예약의 영업 담당 것
const taskForMe = (r, t, me) => t.who ? t.who===me : ownerOf(r)===me;
const mayStaff = (r, me) => !!me && (String(r.memo||'').includes(me) || (typeof tcfgWhoSet==='function' && tcfgWhoSet().has(me)));   // 2026-11-25: 추후과업 메시지 관리에서 과업 담당으로 정해진 사람은 모든 예약을 훑음   // 저장된 비고(프로그램 담당 …)에 내 이름이 있는 예약만 계산 (빠르게)
// 내가 영업 담당이 아니지만 담당자로 들어간 예약의 준비 과업
const myStaffRecs = me => (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)!==me && mayStaff(r, me) && taskRecActive(r) && isBooked(stageOfRec(r)))
  .map(r=>({r, x:xOf(r), tasks:openTasksOf(r).filter(t=>t.who===me)})).filter(o=>o.tasks.length);
// 개인고객 통화 (personal.html, 통화 구분 '개인고객')의 추후 과업: 내가 받은(저장한) 통화의 안 끝난 과업
const isPersonalRec = r => r && r.callType==='개인고객';
let myTab = (()=>{ const fix=t=>(!t || t==='all' || t==='etc') ? 'main' : t; const q=new URLSearchParams(location.search).get('tab'); return q ? fix(q) : 'main'; })();   // 열 때는 늘 메인 (주소에 tab= 이 있을 때만 그 탭, 2026-11-19)   // 2026-11-19: 메인 · personal(개인예약) · group(단체예약) · cat:구분 (예전 all · etc 는 메인)   // 나의 할일 탭: all · personal · group (개인고객 화면에서 열면 ?tab=personal → 개인부터)
const MY_ONLY = new URLSearchParams(location.search).get('my')==='1';   // 나의 할일만 보는 모드 (group.html?my=1 — 팝업(embed=1) 안에서 씀)
function myPersonalOpen(){
  const me=savedOwner(); if(!me) return [];
  return (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).map(r=>{ let ts=[]; try{ ts=(JSON.parse(r.history||'{}').tasks)||[]; }catch(_){}
    return {r, left: ts.filter(t=>!t.done).map(t=>({...t, due: t.due || ymd(new Date(r.saved||Date.now()))})).sort((a,b)=>a.due.localeCompare(b.due))}; }).filter(o=>o.left.length);
}
const personalDueCount = () => { const today=ymd(new Date()); return myPersonalOpen().reduce((s,o)=>s+o.left.filter(t=>t.due<=today).length, 0); };
// 개인예약 · 단체예약 구분에 직접 넣은 업무 (나의 할일 개인 업무 입력에서 고른 것, 2026-11-19) — 있을 때만 그 구분 아래에
// 개인예약 · 단체예약 구분에 직접 넣은 업무 (2026-11-19 고침): 오늘 · 지난 것만이 아니라 앞으로 할 것(예: 12/27 마감)도 추후 과업처럼 마감 순으로 — 예전엔 오늘 할 일만 보여 안 보였음
const etcMemoHTML = d => d && String(d.memo||'').trim() ? `<div class="etc-memo">${esc(String(d.memo).trim())}</div>` : '';   // 직접 넣은 업무의 메모: 누르지 않아도 줄 아래에 늘 보임 (2026-11-20)
// 마감 없는 업무 (2026-11-20): 날짜 없이 「마감 없음」에 모아 둠 · 이름을 누르면 고치기(「반복 없음」으로 바꾸면 마감일) · 체크하면 오늘 완료
function etcLaterHTML(list){ if(!list.length) return '';   // 과업 줄 모양은 모두 같음 (js/mytask.js tkHTML, 2026-11-21)
  const today=opsToday();
  return `<div class="etc-cat-h">마감 없음 <small>${list.length}개</small></div>` + tkListHTML(list.slice().sort((a,b)=>String(a.r.saved||'').localeCompare(String(b.r.saved||''))).map(o=>tkFromE(o, today))); }
// 구분(개인예약 · 단체예약)에 직접 넣은 업무: 업무마다 한 줄 — 오늘 할 날이면 오늘(「오늘 마감」과 같은 줄), 아니면 안 한 지난 날 중 가장 이른 날, 없으면 다음 날짜
// (2026-11-20 · 예전엔 반복 업무가 늘 가장 이른 안 한 날이라, 「오늘 마감」에서 오늘 것을 체크해도 이 목록은 어제 것이 남아 안 바뀐 것처럼 보였음)
function etcDaysOf(c){ const today=opsToday();
  return etcMine().filter(o=>etcCatOf(o.d)===c && o.d.repeat!=='later').map(o=>{ const p=opsPending(o.d, today), day = p.includes(today) ? today : (p[0] || etcNext(o.d, today)); return day ? {...o, day} : null; }).filter(Boolean); }
// 시스템 과업(예약 · 통화의 추후 과업)과 직접 넣은 업무를 한 목록에 마감 순으로 (2026-11-20 · 넣은 방식과 상관없이)
//  2026-11-21: 과업마다 같은 모양의 한 줄 (js/mytask.js tkHTML) — 예약 이름은 줄 안의 출처 버튼(누르면 그 예약)
function mergedTasksHTML(recs, c, _recLi, emptyMsg){
  const list=[]; recs.forEach(o=>o.left.forEach(t=>list.push(o.personal ? tkFromP(o.r, t) : tkFromG(o.r, t))));
  etcDaysOf(c).forEach(e=>list.push(tkFromE(e, e.day)));
  return tkListHTML(tkSort(list), emptyMsg) + etcLaterHTML(etcMine().filter(o=>etcCatOf(o.d)===c && o.d.repeat==='later'));
}
// 설정 (× 옆): 구분 순서 ▲▼ · ＋ 구분 추가
// 전체 화면으로 보기 (× 옆, 2026-11-19): 다음 탭에 나의 할일 한 페이지 (group.html?my=1)
// (「전체 보기」 버튼 · 나의 할일 한 페이지는 2026-11-24에 없앰 — 나의 할일은 팝업으로만. group.html?my=1 을 주소로 열면 첫 화면의 팝업으로 넘어감)
let mySetOpen=false;
function paintMySet(){ const m=$('#mySetModal'), b=$('#mySet'); if(!m || !b) return; m.hidden=!mySetOpen; $('#mySetBtn')?.classList.toggle('on', mySetOpen); if(mySetOpen) b.innerHTML = `<div class="set-cols"><div class="set-col">${catManageHTML()}</div><div class="set-col">${alertSetHTML()}</div></div>`; }   /* 2026-11-25: 왼쪽 구분 · 오른쪽 과업 알림 (2열) */   // 설정 = 팝업 (2026-11-19)
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && mySetOpen){ e.stopImmediatePropagation(); mySetOpen=false; paintMySet(); } }, true);
document.addEventListener('mousedown', e=>{ if(e.target.id==='mySetModal'){ mySetOpen=false; paintMySet(); } });
document.addEventListener('click', e=>{ if(e.target.closest?.('#mySetBtn')){ mySetOpen=!mySetOpen; paintMySet(); return; } if(e.target.closest?.('[data-mysetclose]')){ mySetOpen=false; paintMySet(); } });
// 나의 할일의 개인예약 · 단체예약 과업을 그 자리에서 체크해 완료 (2026-11-19) — 전산 내역을 붙여넣거나 칸을 채워야 끝나는 과업은 체크 대신 「열기」 안내
// 메인 1열 개인 업무 입력 아래: 오늘 마감인 과업 모두 (단체예약 · 개인예약 · 기타 업무) — 그 자리에서 체크해 완료 (2026-11-19)
// 오늘 마감이거나 마감이 지난 내 할 일 모두 (단체 과업 · 개인고객 과업 · 직접 넣은 업무) — 나의 할일 「오늘 마감」과 과업 알림(js/group/15-lock-popups.js alertList)이 같이 씀 (2026-11-26)
//  줄마다 _r(그 기록) · _t(그 과업)를 달아 둠 — 알림이 「방금 넣은 과업은 30분 동안 알리지 않기」 · 「열기」에 씀
function myDueList(){
  const today=ymd(new Date()), list=[];   // 단체 · 개인 · 직접 넣은 업무 모두 같은 줄 (js/mytask.js, 2026-11-21)
  // 오늘 마감 + 이미 마감이 지난 것 (2026-11-21): 지난 것 = 빨강, 오늘 = 노랑 · 마감이 이른 것부터
  dueTasks().filter(o=>o.t.due<=today).forEach(({r,t})=>list.push({...tkFromG(r, t), _r:r, _t:t}));
  myPersonalOpen().forEach(o=>o.left.filter(t=>t.due<=today).forEach(t=>list.push({...tkFromP(o.r, t), _r:o.r, _t:t})));
  // 직접 넣은 업무: 업무마다 한 줄 — 오늘 할 날이 있으면 오늘, 없으면 안 한 지난 날 중 가장 이른 날 (반복 업무의 다른 지난 날은 「지난 n일 모두 완료」)
  const byId={}; myEtcOpen().filter(o=>o.day<=today).forEach(o=>{ (byId[o.r.id] ||= []).push(o); });
  Object.values(byId).forEach(a=>{ const days=a.map(o=>o.day).sort(), day=days.includes(today) ? today : days[0]; list.push(tkFromE(a[0], day, {before:days.filter(d=>d!==day), _r:a[0].r})); });
  return list.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
}
function todayDueHTML(){
  const today=ymd(new Date()), list=myDueList();
  const nLate=list.filter(T=>T.due && T.due<today).length;
  return `<h3 class="my-h sub">오늘 마감 <small>${list.length}개${nLate?` · <b class="late">지난 마감 ${nLate}개</b>`:''}</small></h3>` + (list.length ? tkListHTML(list).replace('pc-list tk-list', 'pc-list tk-list today-due') : '<p class="hint">오늘 마감인 과업이 없습니다.</p>');
}
const myCk = (o, t) => !o.personal && SELF_DONE.has(t.id) ? `<label class="my-ck self" title="예약을 열어 처리하면 완료됩니다 (체크하면 그 예약을 엶)"><input type="checkbox" data-myopenck="${esc(t.id)}"></label>` : `<label class="my-ck" title="체크하면 완료"><input type="checkbox" data-myck="${o.personal?'p':'g'}|${esc(o.r.id)}|${esc(t.id)}"></label>`;   // 전산 예약 · 전산 내역 대조 · 담당 입력처럼 예약에서 끝나는 과업도 체크 칸 (체크하면 그 예약을 엶, 2026-11-19)
document.addEventListener('change', e=>{ if(!(e.target.dataset && e.target.dataset.myopenck)) return; e.target.checked=false; const li=e.target.closest('li'), src=li?.querySelector('[data-myopen]') || e.target.closest('[data-myopen]');   // 과업 줄의 출처 버튼(그 예약)
  if(e.target.dataset.myopenck==='erpcheck') erpAfterOpen=src?.dataset.myopen||''; else toast('이 과업은 예약을 열어 처리하면 완료됩니다 (전산 내역 붙여넣기 · 칸 채우기).', 3200); (src || li?.querySelector('.who'))?.click(); });
// 오늘 완료한 과업 (메인 1열 오늘 마감 아래): 체크를 풀면 다시 열림 — 마감이 지났으면 마감 = 오늘 (2026-11-19)
// 편 · 접은 상태는 직접 누를 때만 바뀜 (화면을 새로 그려도 · 새로 고쳐도 그대로, 2026-11-20)
const DONE_TODAY_LS='sy_done_today_open';
const doneTodayOpen = () => { try{ return localStorage.getItem(DONE_TODAY_LS)==='1'; }catch(_){ return false; } };
function doneTodayHTML(){
  const today=ymd(new Date()), me=savedOwner(), isToday = s => { const x=new Date(s||''); return !isNaN(x) && ymd(x)===today; }, rows=[];
  const L=[];   // 같은 과업 줄 모양 (완료 = 줄 그음 · 체크를 풀면 다시 열림, 2026-11-21)
  (cache||[]).filter(r=>isGroupRec(r) && (ownerOf(r)===me || mayStaff(r, me))).forEach(r=>parseHist(r).tasks.filter(t=>t.done && !t.removed && !SELF_DONE.has(t.id) && isToday(t.doneAt) && taskForMe(r, t, me)).forEach(t=>L.push(tkFromG(r, t))));   // 내가 담당자인 준비 과업도 (2026-11-24 · 체크를 풀어 다시 열 수 있게)
  (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).forEach(r=>{ let ts=[]; try{ ts=(JSON.parse(r.history||'{}').tasks)||[]; }catch(_){} ts.filter(t=>t.done && isToday(t.doneAt)).forEach(t=>L.push(tkFromP(r, t))); });
  etcMine().forEach(o=>Object.entries(o.d.done||{}).filter(([,v])=>isToday(v&&v.at)).forEach(([day])=>L.push({...tkFromE(o, day), done:true, src:catLabel(etcCatOf(o.d))||ETC_NOCAT, srcAttr:''})));
  L.forEach(T=>rows.push(tkHTML(T)));
  return rows.length ? `<details class="etc-more done-today"${doneTodayOpen()?' open':''} data-etcfold="today"><summary>오늘 완료한 과업 ${rows.length}개 (체크를 풀면 다시 열림)</summary><ul class="pc-list tk-list">${rows.join('')}</ul></details>` : '';
}
document.addEventListener('change', async e=>{ const v=e.target.dataset && e.target.dataset.myunck; if(!v || e.target.checked) return; const [kind,id,tid]=v.split('|'), today=todayYmd(), now=new Date().toISOString(); e.target.disabled=true;
  const reopen = t => { t.done=false; t.doneAt=''; delete t.manualDone; delete t.doneBy; if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=false); (t.xsubs||[]).forEach(x=>x.done=false); if((t.due||'')<today){ t.due=today; t.dueSet=1; t.dueSetAt=now; } };
  try{
    if(kind==='g'){
      if(editingId===id){ const t=tasks.find(x=>x.id===tid); if(t){ reopen(t); renderTasks(); renderSide(); await save({auto:true}); } }
      else { const r=cache.find(x=>x.id===id); if(!r) return; const ph=parseHist(r), t=ph.tasks.find(x=>x.id===tid); if(!t) return; reopen(t); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료 취소`});
        const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item; }
    } else { const r=cache.find(x=>x.id===id); if(!r) return; let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const t=(h.tasks||[]).find(x=>x.id===tid); if(!t) return; reopen(t);
      const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item; }
    toast('다시 열었습니다 (마감 = 오늘).'); paintMyCount(); renderMy();
  }catch(err){ e.target.disabled=false; e.target.checked=true; toast('되돌리지 못했습니다: '+(err.code||err.message)); } });
document.addEventListener('change', async e=>{ const v=e.target.dataset && e.target.dataset.myck; if(!v || !e.target.checked) return; const [kind,id,tid]=v.split('|'); e.target.disabled=true;
  try{
    if(kind==='g') await doneTask(id, tid);
    else await donePersonalTask(id, tid);   // js/group/15-lock-popups.js (알림의 체크 칸과 같이 씀 · 2026-11-26)
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); renderMy();
  }catch(err){ e.target.disabled=false; e.target.checked=false; toast('완료로 표시하지 못했습니다: '+(err.code||err.message)); } });
function renderMy(){ paintMySet();
  const me=savedOwner(), today=ymd(new Date()), past=$('#myPast').checked;
  $('#myTitle').textContent = me ? `나의 할일 · ${me}` : '나의 할일';
  if(!me){ $('#mySum').textContent=''; $('#myBody').innerHTML='<p class="hint">맨 위 초록 헤더의 <b>영업 담당</b>에 이름을 넣으면, 그 이름이 영업 담당인 예약을 모아 보여 줍니다.</p>'; return; }
  if(gWaiting()){ $('#mySum').textContent=''; $('#myBody').innerHTML=`<div class="my-cols three">${[0,1,2].map(i=>`<div class="my-col">${SY.skel('list', 4, {label: i ? ' ' : '나의 할일을 불러오는 중'})}</div>`).join('')}</div>`; return; }   // 사본이 없고 처음 받는 중 (2026-11-27 · js/group/07-store.js gWaiting)
  const mine = myRecords().map(r=>({r, x:xOf(r), tasks:openTasksOf(r).filter(t=>taskForMe(r, t, me))}));   // 다른 담당자의 준비 과업은 빼고 (2026-11-24)
  const ahead = mine.filter(o=>!o.r.date || o.r.date>=today);
  const tbdAll = ahead.filter(o=>o.x.tbd);
  const open = [...mine, ...myStaffRecs(me)].filter(o=>o.tasks.length && taskRecActive(o.r)).map(o=>({...o, left:o.tasks})).sort((a,b)=>a.left[0].due.localeCompare(b.left[0].due));   // + 내가 담당자인 준비 과업
  const booked = o => isBooked(stageOfRec(o.r));   // 방문 예정은 가예약 · 예약확정만 (예약상담 · 예약취소는 뺌)
  const shown = (past ? mine : ahead).filter(booked).slice().sort((a,b)=>(a.r.date||'9999').localeCompare(b.r.date||'9999'));
  $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정 ${ahead.length}건 · 미정 ${tbdAll.length}건 · 남은 과업 단체 ${open.reduce((s,o)=>s+o.left.length,0)}개 · 개인 ${myPersonalOpen().reduce((s,o)=>s+o.left.length,0)}개`;
  const org = r => esc(r.org || r.contact || '(업체 미정)');
  const dueTxt = d => { const n=daysFrom(today,d); return n<0 ? `<b class="late">${-n}일 지남</b>` : n===0 ? '<b class="late">오늘</b>' : `${n}일 남음`; };
  // 단체 탭 2열: ① 단체 추후 과업 ② 방문 예정 (2026-11-24 순서 바꿈)
  const none = t => `<p class="hint">${t}</p>`;
  // 칸의 틀 (2026-11-27 · 모든 탭이 같은 틀): 위(제목 — 「<!--fx-->」 표시가 있으면 거기까지)는 고정, 그 아래 목록만 스크롤 · 스크롤 막대는 칸 안쪽 (css/group.css .my-col.fx)
  const splitHead = h => { let i=h.indexOf('<!--fx-->'); if(i>=0) return [h.slice(0,i), h.slice(i+9)]; i=h.indexOf('</h3>'); return i<0 ? ['', h] : [h.slice(0,i+5), h.slice(i+5)]; };
  const fxCol = h => { const [a,b]=splitHead(h); return `<div class="my-col fx"><div class="my-fix">${a}</div><div class="my-scroll">${b}</div></div>`; };
  let c1 =`<h3 class="my-h">${past?'전체 담당 예약':'방문 예정'} <small>${shown.length}건 · 방문일 순</small></h3>` + (shown.length
    ? `<ul class="pc-list">${shown.map(o=>{ const st=stageOfRec(o.r), left=o.tasks.filter(t=>!t.done).length, dq=docTag(o.r,'quote'), ds=docTag(o.r,'stmt');
        return `<li class="r" data-myopen="${esc(o.r.id)}"><span class="who"><b>${esc(dateLabel(o.r.date)||'방문일 미정')}</b> <span class="tag st-${st}">${st}</span> <b>${org(o.r)}</b>${o.r.people?` · ${esc(o.r.people)}명`:''}<br>`
          + `<small class="hint" style="margin:0">${contactCell(o.r)||'담당자 미입력'}</small>`
          + `${o.x.tbd?`<br><span class="tag tbd-tag">미정: ${esc(o.x.tbd)}</span>${o.x.tbdDate?` <small class="hint" style="margin:0">${esc(mdLabel(o.x.tbdDate))}까지</small>`:''}`:''}`
          + `${dq||ds||left?`<br>${dq?`견적서 ${dq} `:''}${ds?`거래명세서 ${ds} `:''}${left?`<small class="hint" style="margin:0">남은 과업 ${left}개</small>`:''}`:''}</span></li>`; }).join('')}</ul>`
    : none(past?'담당한 예약이 없습니다.':'방문 예정인 담당 예약이 없습니다.'));
  // ② 추후 과업: 단체 예약 + 개인고객 통화의 해결 안 된 과업을 한 목록으로, 마감이 이른 것부터. 기한 지남 = 빨강
  const pers = myPersonalOpen().map(o=>({...o, personal:true}));
  const all2 = [...open, ...pers].sort((a,b)=>a.left[0].due.localeCompare(b.left[0].due));
  const nLeft = all2.reduce((s,o)=>s+o.left.length,0), nLate = all2.reduce((s,o)=>s+o.left.filter(t=>t.due<today).length,0);
  const c2 = `<h3 class="my-h">추후 과업 <small>단체 ${open.reduce((s,o)=>s+o.left.length,0)} · 개인 ${pers.reduce((s,o)=>s+o.left.length,0)} · 해결 안 된 ${nLeft}개${nLate?` · <b class="late">기한 지남 ${nLate}개</b>`:''}</small></h3>` + (all2.length
    ? `<ul class="pc-list">${all2.map(o=>`<li class="r my-tg" ${o.personal?`data-popen="${esc(o.r.id)}"`:`data-myopen="${esc(o.r.id)}"`}><span class="who">`
        + (o.personal ? `<span class="tag">개인</span> <b>${esc(o.r.contact||'(이름 없음)')}</b>${o.r.phone?` · ${esc(o.r.phone)}`:''}${o.r.date?` · ${esc(dateLabel(String(o.r.date).slice(0,10)))}`:''}<br>`
                      : `<span class="tag st-${stageOfRec(o.r)}">단체</span> <b>${org(o.r)}</b> · 방문 ${esc(dateLabel(o.r.date)||'미정')}<br>`)
        + o.left.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">${myCk(o,t)} ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
        + `</span></li>`).join('')}</ul>`
    : none('해결 안 된 과업이 없습니다.'));
  // 탭 (2026-11-19): 메인 + 구분마다(개인예약 · 단체예약 · 내가 만든 구분 · 구분 없음, 순서는 메인 1열에서 바꿈)
  const order=catOrder(); if(myTab!=='main' && !order.map(catTab).includes(myTab)) myTab='main';
  $('#myTabs').innerHTML = `<button type="button" data-mt="main">메인</button>` + order.map(c=>`<button type="button" data-mt="${esc(catTab(c))}">${esc(catLabel(c))}</button>`).join('');
  document.querySelectorAll('#myTabs [data-mt]').forEach(b=>b.classList.toggle('on', b.dataset.mt===myTab));
  // 휴대폰(700px 아래)에서는 탭 대신 드롭다운으로 구분을 고름 (2026-11-26 · css/group.css 맨 아래 — 구분이 많아도 한 줄)
  { const sel=$('#myTabSel'); if(sel){ sel.innerHTML = `<option value="main">오늘 마감</option>`   /* 휴대폰에서는 「메인」 대신 「오늘 마감」 — 오늘 마감 목록만 보임 (개인 업무 입력 · 구분 칸은 css/group.css 맨 아래에서 숨김 · 2026-11-26) */ + order.map(c=>`<option value="${esc(catTab(c))}">${esc(catLabel(c))}</option>`).join(''); sel.value=myTab; } }
  $('#myPast').closest('label').hidden = myTab!=='group';
  const nG = open.reduce((s,o)=>s+o.left.length,0), persAll = myPersonalOpen(), nP = persAll.reduce((s,o)=>s+o.left.length,0);
  const recLi = (o, ts) => `<li class="r my-tg" ${o.personal?`data-popen="${esc(o.r.id)}"`:`data-myopen="${esc(o.r.id)}"`}><span class="who">`
      + (o.personal ? `<span class="tag">개인</span> <b>${esc(o.r.contact||'(이름 없음)')}</b>${o.r.phone?` · ${esc(o.r.phone)}`:''}${o.r.date?` · ${esc(dateLabel(String(o.r.date).slice(0,10)))}`:''}<br>`
                    : `<span class="tag st-${stageOfRec(o.r)}">단체</span> <b>${org(o.r)}</b> · 방문 ${esc(dateLabel(o.r.date)||'미정')}<br>`)
      + ts.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">${myCk(o,t)} ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
      + `</span></li>`;
  const taskList = (list, emptyMsg) => list.length ? `<ul class="pc-list">${list.map(o=>recLi(o, o.left)).join('')}</ul>` : none(emptyMsg);
  // 구분 목록: 시스템 과업 + 직접 넣은 업무를 마감 순으로 한 목록 (2026-11-20)
  const catTasks = (list, c, emptyMsg) => mergedTasksHTML(list, c, recLi, emptyMsg);
  const lateOf = list => list.reduce((s,o)=>s+o.left.filter(t=>t.due<today).length,0);
  // 추후 과업 (단체): 「다음주 예약 점검」(매주 목요일 · weekTask) 을 목록 맨 위 과업 한 줄로 (2026-11-19)
  // 제목의 개수 = 그 아래 목록의 줄 수 (2026-11-27): 그 구분에 직접 넣은 업무도 셈 (예전엔 줄은 보이는데 개수에서는 빠졌음 · 「마감 없음」은 따로 제목이 있어 안 셈)
  const nE = c => etcDaysOf(c).length, lateE = c => etcDaysOf(c).filter(e=>e.day<today).length;
  const nPc = nP + nE(CAT_P), latePc = lateOf(persAll) + lateE(CAT_P);
  const groupTasksHTML = () => { const wk=null /* 다음주 예약 점검은 예약마다 과업(wkcheck)으로 (2026-11-20 · 한 줄 모음 weekTask 는 안 씀) */, cnt=nG+nE(CAT_G)+(wk?1:0), lt=lateOf(open)+lateE(CAT_G)+(wk&&wk.late?1:0);
    const head = `<h3 class="my-h">추후 과업 (단체) <small>${cnt}개${lt?` · <b class="late">기한 지남 ${lt}개</b>`:''}</small></h3>`;
    if(!wk) return head + catTasks(open, CAT_G, '해결 안 된 단체 과업이 없습니다.');
    return head + (open.length ? taskList(open, '').replace('<ul class="pc-list">', '<ul class="pc-list">'+wk.html) : `<ul class="pc-list">${wk.html}</ul>`); };
  if(myTab==='personal'){
    // 개인: ① 추후 과업 ② 내가 받은 개인고객 통화 (최근)
    const calls = (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).sort((a,b)=>String(b.saved).localeCompare(String(a.saved))).slice(0,50);
    $('#mySum').textContent = `개인고객 통화 ${calls.length}건 · 남은 과업 ${nP}개`;
    const p1 = `<h3 class="my-h">추후 과업 (개인) <small>${nPc}개${latePc?` · <b class="late">기한 지남 ${latePc}개</b>`:''}</small></h3>` + catTasks(persAll.map(o=>({...o, personal:true})), CAT_P, '해결 안 된 개인고객 과업이 없습니다.');
    const p2 = `<h3 class="my-h">내가 받은 개인고객 통화 <small>최근 ${calls.length}건</small></h3>` + (calls.length ? `<ul class="pc-list">${calls.map(r=>{ let ts=[]; try{ ts=JSON.parse(r.history||'{}').tasks||[]; }catch(_){} const left=ts.filter(t=>!t.done).length;
        return `<li class="r" data-popen="${esc(r.id)}"><span class="who"><b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}${r.date?` · ${esc(dateLabel(String(r.date).slice(0,10)))}`:''}<br><small class="hint" style="margin:0">${esc(fmt(r.saved))}${r.note?` · ${esc(String(r.note).split(/\n/)[0].slice(0,50))}`:''}${left?` · 남은 과업 ${left}개`:''}</small></span></li>`; }).join('')}</ul>` : none('내가 받은 개인고객 통화가 없습니다.'));
    $('#myBody').innerHTML = `<div class="my-cols two">${fxCol(p1)}${fxCol(p2)}</div>`; return;
  }
  if(/^cat:/.test(myTab)){ const c=myTab.slice(4), n=myEtcOpen().filter(o=>etcCatOf(o.d)===c).length; $('#mySum').textContent = `${c||ETC_NOCAT} 남은 것 ${n}개`; $('#myBody').innerHTML = `<div class="my-cols one">${fxCol(etcCatAllHTML(c))}</div>`; return; }   // 내가 만든 구분 · 구분 없음 (기타 개인 업무)
  if(myTab==='group'){
    $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정(가예약 · 예약확정) ${ahead.filter(booked).length}건 · 미정 ${tbdAll.length}건 · 남은 과업 ${nG}개`;
    const g2 = groupTasksHTML();
    $('#myBody').innerHTML = `<div class="my-cols two">${fxCol(g2)}${fxCol(c1)}</div>`; return;
  }
  // 메인 (2026-11-19 · 예전 「전체」): ① 개인 업무 입력 + 구분 순서 · 추가 ② ③ 고른 구분의 할 일 (고른 것은 이 브라우저에 기억)
  const pTasks = () => `<h3 class="my-h">개인예약 <small>${nPc}개${latePc?` · <b class="late">기한 지남 ${latePc}개</b>`:''}</small></h3>` + catTasks(persAll.map(o=>({...o, personal:true})), CAT_P, '해결 안 된 개인고객 과업이 없습니다.');
  const secOf = c => c===CAT_P ? pTasks() : c===CAT_G ? groupTasksHTML().replace('추후 과업 (단체)', '단체예약') : etcSection(false, c===CAT_N ? '' : c);
  const pick = n => { let v=''; try{ v=localStorage.getItem('sy_my_col'+n)||''; }catch(_){} if(!order.includes(v)) v = n===2 ? CAT_P : CAT_G; return v; };
  const colSel = (n, v) => `<label class="my-colpick">구분 <select data-mycol="${n}">${order.map(c=>`<option value="${esc(c)}"${c===v?' selected':''}>${esc(catLabel(c))}</option>`).join('')}</select></label>`;
  const v2=pick(2), v3=pick(3);
  $('#mySum').textContent = '';   // 메인: 「개인예약 n · 단체예약 n · 기타 개인 업무 n개」 글은 없앰 (2026-11-24)
  // 2026-11-24: 칸마다 위(입력 · 오늘 마감 제목 / 구분 고르기 · 개인예약 · 단체예약 제목)는 고정, 그 아래 목록만 스크롤 (다시 그려도 스크롤 자리 그대로)
  const [tdH, tdL]=splitHead(todayDueHTML()), [h2, l2]=splitHead(secOf(v2)), [h3, l3]=splitHead(secOf(v3));
  const keep=[...document.querySelectorAll('#myBody .my-scroll')].map(x=>x.scrollTop);
  $('#myBody').innerHTML = `<div class="my-cols three"><div class="my-col fx"><div class="my-fix"><h3 class="my-h">개인 업무 입력</h3>${etcAddHTML()}${myQuoteReqHTML()}${tdH}</div><div class="my-scroll">${tdL}${doneTodayHTML()}</div></div>`
    + `<div class="my-col fx"><div class="my-fix">${colSel(2, v2)}${h2}</div><div class="my-scroll">${l2}</div></div><div class="my-col fx"><div class="my-fix">${colSel(3, v3)}${h3}</div><div class="my-scroll">${l3}</div></div></div>`;
  document.querySelectorAll('#myBody .my-scroll').forEach((x,i)=>{ if(keep[i]) x.scrollTop=keep[i]; });
}
document.addEventListener('change', e=>{ const n=e.target.dataset && e.target.dataset.mycol; if(!n) return; try{ localStorage.setItem('sy_my_col'+n, e.target.value); }catch(_){} renderMy(); });
// 「오늘 마감」 줄 수와 같은 숫자 (2026-11-27): 단체 과업 + 개인고객 과업 + 직접 넣은 업무(업무마다 한 번 — 반복 업무의 안 한 지난 날은 따로 세지 않음 · myDueList 와 같은 기준)
//  예전엔 헤더 숫자가 직접 넣은 업무를 빼고 세어, 나의 할일 「오늘 마감 n개」와 달랐음
//  2026-11-27 다시 고침 — 「오늘 마감」 숫자는 어디서든 이 목록(myDueList) 하나의 길이다. 따로 세는 식을 두지 않는다:
//   · 단체 화면 헤더 「과업 n」 · 나의 할일 「오늘 마감 n개」 · 과업 알림 = 이 파일
//   · 첫 화면 「오늘 마감」 칸(js/portal.js todayBox) · 개인고객 화면 헤더 「과업 n」(js/personal.js paintMyCount) = 보이지 않는 과업 계산 창(group.html?…&engine=1)의 이 myDueList 를 그대로 읽음
//  예전엔 그 두 화면이 저장된 과업을 저마다의 규칙으로 세어, 삭제한 과업 · 다른 담당자의 준비 과업 · 상담 단계라 안 보이는 과업까지 세었음 (2개인데 3개)
function myDueCount(){ if(!savedOwner()) return 0;
  try{ return myDueList().length; }catch(_){ return dueTasks().length + personalDueCount(); } }   // 화면을 막 여는 중(업무 목록 준비 전)이면 단체 · 개인고객 과업만
const MY_ENGINE = /[?&]engine=/.test(location.search) && window.parent!==window;   // 다른 화면(첫 화면 · 개인고객)이 숫자를 읽으려고 띄운 보이지 않는 과업 계산 창
let myDueSig=null;
function paintMyCount(){ const n=myDueCount();   // 마감이 오늘이거나 지난 과업 수 = 나의 할일 「오늘 마감」 줄 수
  const mm=myNewMemos().length, nq=savedOwner() ? myQuoteReqs().length : 0, t=[n&&`과업 ${n}`, nq&&`견적 요청 ${nq}`, mm&&`메모 ${mm}`].filter(Boolean).join(' · ');   // 수정 표시는 없앰 · 내 예약에 확인 안 한 메모 수
  $('#myCount').hidden=!t; $('#myCount').textContent=t;
  // 과업 계산 창이면: 목록이 바뀔 때마다 띄운 화면에 알림 → 그 화면이 숫자 · 「오늘 마감」 칸을 다시 그림 (같은 내용이면 안 보냄)
  if(MY_ENGINE && window.__tasksReady){ try{ const sig=myDueList().map(T=>[T.kind, T.rid, T.tid, T.day, T.due, T.title, (T.before||[]).length].join('|')).join('\n');
    if(sig!==myDueSig){ myDueSig=sig; window.parent.postMessage({type:'sy-my', ev:'due', n}, location.origin); } }catch(_){} } }
function openMy(fromGroup){ myTab='main'; $('#myModal').hidden=false; renderMy(); loadMyQuoteReq();   // 나의 할일 버튼은 어디서든 메인부터 (2026-11-19)
  if(pending.length) flush(); else pull();
  const p=$('#myModal > section'); if(p){ p.tabIndex=-1; try{ p.focus({preventScroll:true}); }catch(_){ p.focus(); } } }   // 초점은 창 상자에 (2026-11-27 · 예전엔 × 단추에 줘서 열자마자 × 에 까만 초점 테두리가 떴음 — css/group.css #myModal > section:focus)
// group.html?open=예약ID → 그 예약을 엶 (팝업 나의 할일에서 단체 줄을 누른 경우 · 목록을 받은 뒤)
let openGId = new URLSearchParams(location.search).get('open'), openGErp = new URLSearchParams(location.search).get('erp')==='1';
// 나의 할일에서 「전산 내역 대조」를 체크하면: 그 예약을 열고 전산 내역 붙여넣는 칸까지 (2026-11-20)
let erpAfterOpen='';
function erpPasteAfter(id){ if(erpAfterOpen!==id) return; erpAfterOpen=''; setTimeout(()=>{ if(editingId===id) $('#erpPasteBtn').click(); }, 400); }
// &hl=people,tin… : 다음날 고객 응대 준비에서 바꾼 칸 → 열고 나서 노랗게 표시 · 그 칸으로 스크롤 (2026-11-19)
const openHl = (new URLSearchParams(location.search).get('hl')||'').split(',').filter(Boolean);
function showHl(){ if(!openHl.length) return; let first=null;
  openHl.forEach(k=>{ const el=document.getElementById('f_'+k) || document.querySelector(`[data-k="${k}"]`); if(!el) return; const box=el.closest('.fld, .field, .f, label, td, .vrow') || el; box.classList.add('hl-prep'); el.classList.add('hl-prep-in'); first ||= box; });
  if(first) first.scrollIntoView({block:'center', behavior:'smooth'});
  const names={org:'업체', people:'관람 인원', tin:'입장시각', vehicle:'차량', phone:'연락처', gate:'입장문'};
  if(typeof toast==='function') toast(`다음날 고객 응대 준비에서 바꾼 칸: ${openHl.map(k=>names[k]||k).join(' · ')}`);
  setTimeout(()=>document.querySelectorAll('.hl-prep, .hl-prep-in').forEach(x=>x.classList.remove('hl-prep','hl-prep-in')), 12000); }
async function tryOpenG(){ if(!openGId) return; const list = await store.list(); const r=(list||[]).find(x=>x.id===openGId); if(!r) return; openGId=null; history.replaceState(null,'','group.html'); openRecordG(r); if(openGErp){ openGErp=false; erpAfterOpen=r.id; erpPasteAfter(r.id); } setTimeout(showHl, 900); }
setTimeout(tryOpenG, 400);
const MY_EMBED = MY_ONLY && window.parent!==window;   // 다른 화면이 팝업으로 띄운 나의 할일
function closeMy(){ if(MY_EMBED){ window.parent.postMessage({type:'sy-my', ev:'close'}, '*'); return; } if(MY_ONLY && document.documentElement.classList.contains('my-only')){ location.href='./'; return; } $('#myModal').hidden=true; }   // 팝업 = 바깥 화면이 닫음, 단독 페이지 = 메뉴로
// 단체 화면의 「나의 할일」 = 이 화면 위 팝업 (메뉴 8번은 한 페이지)
$('#myOpenBtn').onclick=()=>openMy(true);
// 나의 할일 「↻ 새로고침」 (2026-11-21): 보낼 저장이 있으면 먼저 보내고, 공유 기록을 새로(이미 가고 있는 요청과 따로) 받아 다시 그림 (평소엔 30초마다 · 창으로 돌아오면 저절로)
$('#myReloadBtn').onclick=async()=>{ const b=$('#myReloadBtn'); if(b.disabled) return; b.disabled=true; b.textContent='불러오는 중…';
  try{ if(pending.length) await flush(); else await pull(true);    renderMy(); paintMyCount(); toast(syncState==='ok' ? `최신 내용으로 다시 불러왔습니다 (${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}).` : '불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.'); }
  catch(e){ handleErr(e); toast('불러오지 못했습니다: '+(e.code||e.message||e)); }
  finally{ b.disabled=false; b.textContent='↻ 새로고침'; } };
if(location.hash==='#my' && !MY_ONLY) setTimeout(openMy, 300);   // 예전 주소 group.html#my
if(MY_ONLY){ document.title='나의 할일 · 사유원 운영 보조 시스템'; $('#crumb').textContent='나의 할일'; setTimeout(openMy, 50); }
document.addEventListener('click', e=>{ const b=e.target.closest('#myTabs [data-mt]'); if(!b) return; myTab=b.dataset.mt; try{ localStorage.setItem('sayuwon_my_tab', myTab); }catch(_){} renderMy(); });
document.addEventListener('change', e=>{ if(e.target.id!=='myTabSel') return; myTab=e.target.value; try{ localStorage.setItem('sayuwon_my_tab', myTab); }catch(_){} renderMy(); });   // 휴대폰의 구분 드롭다운 (2026-11-26)
$('#myCloseBtn').onclick=closeMy;
$('#myPast').onchange=renderMy;
$('#myModal').addEventListener('mousedown', e=>{ if(e.target.id==='myModal' && !MY_ONLY) closeMy(); });
$('#myBody').addEventListener('click', e=>{ if(e.target.closest('.my-ck, .etc-subadd, .etc-subck, [data-etcdone], .tk-ctl:not(.tk-src), .tk-sub, .tk-in, .tk-when')) return; const pe=e.target.closest('[data-popen]');
  if(MY_EMBED){ const ge=e.target.closest('[data-myopen]'); if(pe||ge) window.parent.postMessage({type:'sy-my', ev:'go', url: pe ? 'personal.html?open='+encodeURIComponent(pe.dataset.popen) : 'group.html?open='+encodeURIComponent(ge.dataset.myopen)+(erpAfterOpen===ge.dataset.myopen?'&erp=1':'')}, '*'); erpAfterOpen=''; return; }   // 팝업 안: 바깥 화면이 그 화면으로 이동
  if(pe){ guardLeave(()=>{ location.href='personal.html?open='+encodeURIComponent(pe.dataset.popen); }); return; } const el=e.target.closest('[data-myopen]'); if(!el) return; const r=cache.find(x=>x.id===el.dataset.myopen); if(!r) return;
  if(MY_ONLY){ document.documentElement.classList.remove('my-only'); history.replaceState(null,'','group.html'); document.title='단체고객 응대 · 사유원 운영 보조 시스템'; $('#crumb').textContent='단체고객 응대'; $('#myModal').hidden=true; openRecordG(r); erpPasteAfter(r.id); return; }   // 단체 줄 → 단체 화면으로 바뀌며 그 예약을 엶
  closeMy(); openRecordG(r); erpPasteAfter(r.id); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#myModal').hidden){ e.preventDefault(); closeMy(); } });

