// ▣ js/group/15-lock-popups.js — 남이 담당인 예약(잠금 · 통화 메모만 고침) · 두 PC 동시 수정 막기(고치는 중) · 마감 알림 · 미정 기한 알림 · 보던 화면 기억
// ===================== 남이 담당인 예약: 잠금 + 담당자에게 메모 =====================
// 영업 담당이 다른 사람인 예약을 열면 아무것도 고칠 수 없음(저장 · 과업 · 수정 · 삭제 모두). 바꿀 내용은 위쪽 메모로 → 담당자 화면에 '메모를 확인하세요' 팝업
const mergeMemos = (a, b) => { const m=new Map(); [...(b||[]), ...(a||[])].forEach(x=>{ if(!x||!x.id) return; const o=m.get(x.id); m.set(x.id, o ? {...x, ...o, seen: !!(o.seen||x.seen), seenAt:o.seenAt||x.seenAt||''} : x); }); return [...m.values()].sort((x,y)=>String(x.t).localeCompare(String(y.t))); };
function notMineMsg(r){ const o=ownerOf(r), me=savedOwner(); if(o && me && o!==me){ toast(`${o}님 담당 예약이라 고치거나 지울 수 없습니다. 예약을 열어 메모로 남겨 주세요.`); return true; } return false; }
const memoLi = (m, own) => `<li class="${own && !m.seen ? 'new' : ''}"><small>${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>${own ? (m.seen ? ' · 확인함' : ' · <b style="color:var(--red)">새 메모</b>') : ''}</small><br>${esc(m.text).replace(/\n/g,'<br>')}</li>`;
// ===================== 같은 예약을 두 PC(창)에서 동시에 고치지 않기 =====================
// 예약을 열면 서버에 '고치는 중'(lock)을 잡고 1분마다 연장. 이미 다른 창이 잡고 있으면 읽기 전용(editLockBy)으로 열고 30초마다 다시 확인
// → 풀리면 최신 기록을 받아 다시 열어 고칠 수 있게. 다른 예약을 열거나 새 통화 · 화면을 닫으면 풀어 줌. 서버가 예전 버전이면 아무것도 막지 않음
var editLockBy='', editHeld='', editRetryT=null;
const EDIT_SID = (()=>{ try{ let s=sessionStorage.getItem('sy_edit_sid'); if(!s){ s=Date.now().toString(36)+Math.random().toString(36).slice(2,8); sessionStorage.setItem('sy_edit_sid', s); } return s; }catch(_){ return Math.random().toString(36).slice(2); } })();   // 창마다 (새로고침해도 그대로)
async function acquireEdit(id){
  if(!id || !getKey()) return;
  try{
    const j=await SY.call({action:'lock', id, sid:EDIT_SID, by:savedOwner()||''});
    if(editingId!==id) return;   // 그사이 다른 예약을 열었으면 무시
    if(j.locked){ const was=editLockBy; editLockBy=j.by||'다른 직원'; editHeld=''; if(!was) paintLock(); clearTimeout(editRetryT); editRetryT=setTimeout(()=>acquireEdit(id), 30000); return; }
    editHeld=id; clearTimeout(editRetryT);
    if(editLockBy){ editLockBy=''; await pull(); const r=cache.find(x=>x.id===id); if(r){ editHeld=''; openRecord(r); toast('이제 이 예약을 고칠 수 있습니다. 최신 내용으로 다시 불러왔습니다.'); } else paintLock(); }
  }catch(e){ /* 예전 서버 (bad_action) · 연결 문제: 막지 않음 */ }
}
function releaseEdit(beacon){
  clearTimeout(editRetryT); const id=editHeld; editHeld=''; editLockBy='';
  if(!id || !getKey()) return;
  const body={action:'lock', release:true, id, sid:EDIT_SID};
  if(beacon){ SY.beacon(body); return; }
  setTimeout(()=>{ if(editingId===id){ if(!editLockBy) editHeld=id; return; }   // 같은 예약을 바로 다시 열었으면 풀지 않음
    SY.call(body).catch(()=>{}); }, 0);
}
setInterval(()=>{ if(editHeld && editHeld===editingId) acquireEdit(editHeld); }, 60000);   // 고치는 중 표시 연장
window.addEventListener('pagehide', ()=>releaseEdit(true));
function paintLock(){
  document.body.classList.toggle('locked', !!(lockOwner || editLockBy));
  { const h=$('#memoLockHint'), mb=$('#memoBox');   // 영업 담당이 아니면 통화 메모 위에 흐린 안내 · 빈 칸 안내 글 (2026-11-24)
    if(h){ h.hidden=!lockOwner; h.textContent = lockOwner ? `수정 사안이 있다면 통화 메모에 남겨 두세요. 저장하면 ${lockOwner}님께 「통화 메모 확인」 과업이 갑니다.` : ''; }
    if(mb) mb.placeholder = lockOwner ? '수정 사안이 있다면 통화 메모에 남겨 두세요.' : ''; }
  const box=$('#ownerMemo'); if(!box) return;
  const me=savedOwner(), list=[...memos].reverse();
  if(editLockBy){   // 다른 PC(창)에서 이 예약을 고치는 중: 읽기 전용, 풀리면 최신 내용으로 다시 불러옴
    box.className='owner-memo lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">🔒 ${esc(editLockBy)}님이 다른 PC(창)에서 이 예약을 고치는 중입니다</div><div class="hint" style="margin:0">같은 예약을 두 곳에서 고치지 않도록 지금은 볼 수만 있습니다. 그쪽에서 다른 예약을 열거나 화면을 닫으면 30초 안에 자동으로 최신 내용을 불러와 고칠 수 있게 됩니다.</div>`;
    return;
  }
  if(lockOwner){   // 남이 담당인 예약 (2026-11-24): 위쪽 안내 · 「메모 남기기」 상자는 없앰 — 전할 말은 통화 메모에 적으면 영업 담당에게 「메모를 확인하세요」 알림 (고치려 하면 팝업으로 안내)
    box.hidden=true; box.innerHTML='';
  } else { box.hidden=true; box.innerHTML=''; }   // 내 예약: 위쪽 「다른 사람이 남긴 메모」 상자는 없앰 (2026-11-24) — 메모는 추후 과업 「통화 메모 확인」 안에 모두 나옴
}
async function saveMemos(id, fn){   // 공유 기록의 최신 예약에 메모를 바꿔 저장 (다른 칸은 건드리지 않음)
  const r=cache.find(x=>x.id===id); if(!r) return null;
  const ph=parseHist(r); ph.memos=fn(ph.memos||[]);
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
  if(editingId===id) memos=ph.memos;
  return item;
}
document.addEventListener('click', async e=>{
  if(e.target.id==='omSend'){ const ta=$('#omText'), text=ta.value.trim(); if(!text){ toast('메모를 적어 주세요.'); ta.focus(); return; }
    e.target.disabled=true;
    await saveMemos(editingId, ms=>[...ms, {id:'m'+Date.now().toString(36), t:new Date().toISOString(), by:savedOwner()||'', text, seen:false}]);
    paintLock(); toast(`메모를 남겼습니다. ${lockOwner}님께 알림이 갑니다.`); return; }
  if(e.target.id==='omSeen'){ const me=savedOwner(), now=new Date().toISOString(); await saveMemos(editingId, ms=>ms.map(m=>m.by!==me && !m.seen ? {...m, seen:true, seenAt:now} : m)); paintLock(); paintMemoCount(); }
});
// 잠긴 예약 (2026-11-24 바꿈): 예약 내용 · 예약 현황 · 수정 기록 · 추후 과업은 모두 읽을 수 있음 (흐리게 하지 않음 · 펼치기 · 스크롤 · 복사 됨)
//  고치는 칸 · 버튼(입력 · 고르기 · 체크 · 버튼)을 누르면 막고 「영업 담당자가 아니어서 편집할 수 없습니다」 팝업
//  남이 담당인 예약(lockOwner)에서도 고칠 수 있는 것: ① 통화 메모 (고치면 영업 담당에게 「메모를 확인하세요」 알림) ② 내가 담당자인 추후 과업(단체 준비 등 t.who === 나)
//  다른 PC(창)에서 고치는 중(editLockBy)이면 통화 메모 · 과업도 막음 (같은 예약을 두 곳에서 고치지 않게)
const LOCK_EDIT_SEL = 'input, select, textarea, button, label, [contenteditable="true"], [data-idel], [data-tmv], .tdrag';
const myLockTask = el => { const li=el.closest && el.closest('#taskList .task'); if(!li) return false; const t=tasks.find(x=>x.id===li.dataset.id); return !!(t && t.who && t.who===savedOwner()); };
const lockAllowed = el => !!el.closest('.lock-ok, [data-mbdb], [data-book], #copyTextBtn, #copyReadBtn, #noteRegenBtn, #noteModal, summary, [data-texp], [data-tcopy], #lockPop, #memoSave')
  || (!editLockBy && (el.closest('#memoBox') || myLockTask(el)));
const lockBlocked = t => !!(lockOwner || editLockBy) && t && t.closest && !!t.closest('.layout') && !!t.closest(LOCK_EDIT_SEL) && !lockAllowed(t);
let lockNudgeT=0;
function lockPopup(){ if(Date.now()-lockNudgeT<800) return; lockNudgeT=Date.now();
  let m=document.getElementById('lockPop');
  if(!m){ m=document.createElement('div'); m.id='lockPop'; m.className='modal'; m.hidden=true;
    m.innerHTML='<section class="panel ask-box" role="dialog" aria-modal="true" aria-labelledby="lockPopT"><h2 id="lockPopT">🔒 편집할 수 없습니다</h2><p class="ask-msg" id="lockPopMsg"></p><div class="ask-btns"><button type="button" class="btn primary" id="lockPopOk">확인</button></div></section>';
    document.body.appendChild(m); m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; }); m.querySelector('#lockPopOk').onclick=()=>{ m.hidden=true; }; }
  m.querySelector('#lockPopMsg').innerHTML = editLockBy
    ? `<b>${esc(editLockBy)}</b>님이 다른 PC(창)에서 이 예약을 고치는 중이라 지금은 볼 수만 있습니다. 그쪽에서 닫으면 30초 안에 고칠 수 있게 됩니다.`
    : `<b>영업 담당자가 아니어서 편집할 수 없습니다.</b><br>이 예약은 <b>${esc(lockOwner)}</b>님 담당입니다. 예약 내용 · 예약 현황 · 수정 기록은 볼 수 있습니다.<br><b>통화 메모</b>는 고칠 수 있고(고치면 ${esc(lockOwner)}님께 「통화 메모 확인」 추후 과업), <b>내가 담당자인 추후 과업</b>은 체크할 수 있습니다.`;
  m.hidden=false; setTimeout(()=>m.querySelector('#lockPopOk').focus(), 0); }
['mousedown','click','dblclick','beforeinput','paste','drop','dragstart','change','input','focusin'].forEach(ev=>document.addEventListener(ev, e=>{
  if(!lockBlocked(e.target)) return; e.preventDefault(); e.stopImmediatePropagation();
  if(ev==='mousedown' || ev==='focusin'){ if(ev==='focusin' && e.target.blur) e.target.blur(); lockPopup(); }
}, true));
document.addEventListener('keydown', e=>{ if(!lockBlocked(e.target)) return; if(['Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) || ((e.ctrlKey||e.metaKey) && /^[ca]$/i.test(e.key))) return; e.preventDefault(); e.stopImmediatePropagation(); lockPopup(); }, true);
// 남이 담당인 예약에서 고친 것 저장 (2026-11-24): 예약 전체가 아니라 통화 메모 · 내가 담당자인 과업만 최신 기록 위에 덮어씀 (save 가 lockOwner 일 때 부름)
let lockSaving=false;
async function saveLockedParts(){
  if(!lockOwner || editLockBy || lockSaving || !editingId) return;
  const me=savedOwner(), id=editingId, r0=cache.find(x=>x.id===id); if(!r0 || !me) return;
  const note=$('#memoBox').value, mine=tasks.filter(t=>t.who && t.who===me), ph0=parseHist(r0);
  const noteChanged = note.trim()!==String(r0.note||'').trim(), taskChanged = mine.some(t=>JSON.stringify(ph0.tasks.find(x=>x.id===t.id)||null)!==JSON.stringify(t));
  if(!noteChanged && !taskChanged) return;
  lockSaving=true;
  try{ await pull(true); const r=cache.find(x=>x.id===id); if(!r) return; const ph=parseHist(r), now=new Date().toISOString();
    mine.forEach(t=>{ const i=ph.tasks.findIndex(x=>x.id===t.id); if(i>=0) ph.tasks[i]={...t}; else ph.tasks.push({...t}); });
    if(noteChanged){   // 영업 담당에게 알림: 아직 안 읽은 내 「통화 메모를 고쳤습니다」가 있으면 그 줄을 새로 (여러 번 고쳐도 알림 한 줄)
      const txt=`통화 메모를 고쳤습니다 —\n${note.trim().slice(-400)}`, i=(ph.memos||[]).findIndex(m=>m.by===me && !m.seen && m.kind==='note');
      if(i>=0) ph.memos[i]={...ph.memos[i], t:now, text:txt}; else ph.memos=[...(ph.memos||[]), {id:'m'+Date.now().toString(36), t:now, by:me, kind:'note', text:txt, seen:false}]; }
    ph.h.push({t:now, by:me, what: [noteChanged?'[통화 메모] 고침 (담당 아님)':'', ...mine.filter(t=>JSON.stringify(ph0.tasks.find(x=>x.id===t.id)||null)!==JSON.stringify(t)).map(t=>`[과업] ${t.title} ${t.done?'완료':'고침'}`)].filter(Boolean).join(' · ')});
    const item={...r, ...(noteChanged ? {note} : {}), history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos})};
    await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
    memos=ph.memos; paintLock(); status(`저장됨 ${new Date().toTimeString().slice(0,5)} · ${noteChanged?'통화 메모':'과업'}`);
    if(noteChanged){ const ms=$('#memoSt'); if(ms){ ms.textContent=`저장됨 ${new Date().toTimeString().slice(0,5)}`; ms.className='memo-st ok'; } }
    try{ baseSnap=snap(); paintDirty(); }catch(_){}   // 저장한 뒤에는 「저장 안 함」으로 보지 않게 (창을 닫을 때 경고 없음)
  }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
  finally{ lockSaving=false; } }
// 내 예약에 새 메모가 있으면: '메모를 확인하세요' 팝업 (확인할 때까지, 이 화면에서는 새 메모가 생길 때마다)
let memoShown=new Set();
function myNewMemos(){ const me=savedOwner(); if(!me) return []; const out=[]; (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me).forEach(r=>parseHist(r).memos.forEach(m=>{ if(!m.seen && m.by!==me) out.push({r, m}); })); return out.sort((a,b)=>String(b.m.t).localeCompare(String(a.m.t))); }
function paintMemoCount(){ if(typeof paintMyCount==='function') paintMyCount(); }
function checkMemoPopup(){
  return;   // 「메모를 확인하세요」 팝업은 안 띄움 (2026-11-24) — 메모는 추후 과업 「통화 메모 확인」 안에서 봄
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
  if(MY_EMBED) return;
  const list=myNewMemos(); if(!list.length || list.every(o=>memoShown.has(o.m.id))) return;
  if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 닫힌 뒤에 (1분마다 다시 봄)
  list.forEach(o=>memoShown.add(o.m.id));
  $('#memoList').innerHTML = list.map(({r,m})=>`<li><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}<br><small class="hint" style="margin:0">${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>님 메모</small><br>${esc(m.text).replace(/\n/g,'<br>')}</span><button class="btn primary" data-mseen="${esc(r.id)}|${esc(m.id)}">확인</button><button class="btn" data-mopen="${esc(r.id)}|${esc(m.id)}">열기</button></li>`).join('');
  $('#memoTitle').innerHTML = `메모를 확인하세요 <small>내 예약에 다른 사람이 남긴 메모 ${list.length}개</small>`;
  $('#memoModal').hidden=false;
}
$('#memoLater').onclick=()=>{ $('#memoModal').hidden=true; };
$('#memoList').addEventListener('click', async e=>{ const d=e.target.dataset, v=d.mseen||d.mopen; if(!v) return; const [rid,mid]=v.split('|'), now=new Date().toISOString();
  e.target.disabled=true; await saveMemos(rid, ms=>ms.map(m=>m.id===mid ? {...m, seen:true, seenAt:now} : m));
  e.target.closest('li').remove(); if(!$('#memoList').children.length) $('#memoModal').hidden=true;
  if(editingId===rid) paintLock(); paintMemoCount();
  if(d.mopen){ $('#memoModal').hidden=true; const r=cache.find(x=>x.id===rid); if(r) openRecordG(r); } else toast('메모를 확인했습니다.'); });
setInterval(()=>{ if(window.__tasksReady) checkMemoPopup(); }, 60000);

// ===================== 마감이 된 추후 과업 팝업 =====================
// 마감이 오늘이거나 지난, 해결 안 된 과업(영업 담당이 있으면 내 예약만)을 해결될 때까지 계속 띄움: 열 때 · 9시 · '나중에'를 누르면 2시간 뒤 다시
const TASK_SNOOZE_LS='sayuwon_task_snooze', SNOOZE_MS=2*3600e3, TASK_SLOT_LS='sayuwon_task_slot', QUIET_MS=30*60e3;
// 알림 시각 (2026-11-25): 예전엔 늘 8 · 11 · 13 · 17시 → 나의 할일 설정에서 사람마다 (SY_ALERT · js/common.js) · 알림은 캘린더처럼 따로 뜨는 창(group.html?alert=1)으로
const ALERT_WIN = /[?&]alert=1/.test(location.search);   // 과업 알림 창 (따로 뜨는 창)
if(ALERT_WIN) document.documentElement.classList.add('alert-only');
// 공유 기록(내 개인업무목록 줄)에 저장된 알림 시각을 이 컴퓨터에 맞춤 — 개인고객 화면 · 다른 컴퓨터도 같게
function alertSync(){ try{ const r=typeof etcCatRec==='function' && etcCatRec(); if(!r) return; const a=(JSON.parse(r.history||'{}')||{}).alertTimes; if(Array.isArray(a) && JSON.stringify(a)!==JSON.stringify(SY_ALERT.times())) SY_ALERT.set(a); }catch(_){} }
const SELF_DONE = new Set(['erp','erpcheck','erpfix','progstaff','mbmenu']);   // erp · erpfix: 전산 내역을 붙여넣어야 완료 · 칸을 채우면 저절로 완료되는 과업은 '열기'만 (2026-11-23에 비웠다가 같은 날 되돌림)   // erp · erpfix: 전산 내역을 붙여넣어야 완료   // 칸을 채우면 저절로 완료되는 과업은 '열기'만
// 알림에 나올 것 = 나의 할일에 있는 것 모두 (2026-11-26 · 예전엔 단체 + 개인고객 과업만):
//  ① 단체 과업 ② 개인고객 과업 ③ 직접 넣은 업무(구분 · 반복 무엇이든 · 오늘 할 것과 안 한 지난 것) — 나의 할일 「오늘 마감」과 같은 목록(myDueList · js/group/14-task-sim.js)
//  ④ 내가 맡은 고객 견적 요청 (나의 할일 메인의 「고객 견적 요청」 · myQuoteReqs)
//  단, 넣은 지(마감을 바꾼 지) 30분이 안 된 것은 알리지 않음
function alertList(){
  const now=Date.now(), old = s => now - (+new Date(s||0)||0) >= QUIET_MS;
  const list = myDueList().filter(T => T.kind==='e' ? old(T._r.saved) : now - Math.max(+new Date(T._t.dueSetAt||0)||0, +new Date(T._t.at||T._r.saved||0)||0) >= QUIET_MS);
  myQuoteReqs().filter(q=>old(q.at)).forEach(q=>{ const a=new Date(q.at||''); list.push({kind:'q', q, due: isNaN(a) ? String(q.at||'').slice(0,10) : ymd(a), title:'견적서 · 거래명세서 발급'}); });
  return list.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
}
// 알림 한 줄: [☐] [이름표] 누구 것 / 할 일 · 마감 / 「열기」
//  2026-11-26: 초록 「완료」 버튼은 없애고, 나의 할일 「오늘 마감」처럼 맨 앞 체크 칸으로 완료 (체크하면 바로 저장 · 그 줄이 사라짐)
//  예약을 열어 처리해야 끝나는 과업(전산 예약 · 전산 내역 대조 등 SELF_DONE)은 회색 체크 칸 — 누르면 그 예약을 엶 · 견적 요청은 체크 칸 없음(견적서 화면에서 끝냄)
function alertRowHTML(T, today){
  const n = T.due ? daysFrom(today, T.due) : 0, late=n<0, when = `${late?`(${-n}일 지남)`:'(오늘)'}`;
  const ck = T.kind==='q' ? '<span class="my-ck no"></span>'
    : T.kind==='g' && SELF_DONE.has(T.tid) ? `<label class="my-ck self" title="예약을 열어 처리하면 완료됩니다 (체크하면 그 예약을 엶)"><input type="checkbox" data-ackopen="${esc(T.rid)}"></label>`
    : `<label class="my-ck" title="체크하면 완료"><input type="checkbox" data-ack="${esc([T.kind, T.rid, T.tid||'', T.day||''].join('|'))}"></label>`;
  const row = (tag, who, sub, open) => `<li class="${late?'late':'today'}">${ck}<span class="who"><span class="tag">${tag}</span> ${who}<br>`
    + `<b class="${late?'late':''}">${esc(T.title||'')}</b> <small class="hint" style="margin:0">${sub}</small></span><button class="btn primary" ${open}>열기</button></li>`;
  if(T.kind==='q'){ const q=T.q; return row('견적', `<b>${esc(q.org||'(업체 미정)')}</b>${q.name?` · ${esc(q.name)}님`:''}${q.date?` · 방문 ${esc(dateLabel(String(q.date).slice(0,10)))}`:''}${q.pax?` · ${esc(q.pax)}명`:''}`, `접수 ${esc(fmt(q.at))} ${when}`, 'data-aopen="quote"'); }
  if(T.kind==='e') return row('업무', `<b>${esc(catLabel(etcCatOf(T.d))||ETC_NOCAT)}</b>${T.rep && T.rep!=='none' ? ` · ${esc(opsRepeatLabel(T.d))}` : ''}`, `마감 ${esc(mdLabel(T.due))} ${when}${T.before&&T.before.length?` · 안 한 지난 날 ${T.before.length}일 더`:''}`, 'data-aopen="my"');
  const r=T._r, t=T._t;
  if(T.kind==='p') return row('개인', `<b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}`, `마감 ${esc(mdLabel(t.due))} ${when}`, `data-popen2="${esc(r.id)}"`);
  return row('단체', `<b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}${r.owner?` · ${esc(r.owner)}`:''}`, `마감 ${esc(mdLabel(t.due))} ${when}${t.id==='wkcheck'||t.id==='onsitecall'?` · ${esc(firstContact(r)||'담당자 연락처 없음')}`:''}`, `data-tbdopen="${esc(r.id)}"`);
}
function paintAlert(due){ const today=ymd(new Date());
  $('#tbdList').innerHTML = due.map(T=>alertRowHTML(T, today)).join('');
  $('#tbdTitle').innerHTML = `과업 알림 <small><b class="cnt-late">지남 ${due.filter(T=>T.due<today).length}</b> · <b class="cnt-today">오늘 ${due.filter(T=>T.due>=today).length}</b> · 나의 할일 전체 · 알림은 ${esc(SY_ALERT.label())}</small>`;
  $('#tbdLater').title=`다음 알림 시각(${SY_ALERT.label()})에 다시`;
  $('#tbdModal').hidden=false; }
function checkTbdPopup(force){
  alertSync(); if(ALERT_WIN) force=true;
  const ENG=/[?&]engine=/.test(location.search);   // 첫 화면의 과업 계산 창: 새 창으로만 알림 (2026-11-25 · 첫 화면만 켜 둬도 알림)
  if(BOOK_ONLY || (MY_EMBED && !ENG)) return;   // 예약 현황 공유 페이지 · 나의 할일 팝업 안에서는 안 함
  // 알림 시각(나의 할일 설정 · 기본 오전 8시 · 11시 · 오후 1시 · 5시)이 지나고 처음 화면을 볼 때, 시각마다 한 번
  // 개인고객 화면과 같은 기록(SY_ALERT · sayuwon_task_slot)을 써서, 한 시각에 여러 화면 · 여러 탭에서 또 뜨지 않음
  // 2026-11-26: 따로 뜨는 창으로 (SY_ALERT.show · js/common.js — 브라우저가 막으면 화면을 처음 누를 때 엶 · 끝내 안 열리면 이 화면 팝업)
  if(ALERT_WIN){ const due=alertList();
    if(!due.length){ $('#tbdList').innerHTML='<li class="hint">지금 알릴 과업이 없습니다.</li>'; $('#tbdTitle').textContent='과업 알림'; $('#tbdModal').hidden=false; return; }
    paintAlert(due); return; }
  const k=SY_ALERT.keyNow(); if(!force && (!k || SY_ALERT.seen(k))) return;
  if(!force && !ENG && [...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 떠 있으면 나중에 (1분마다 다시 봄)
  const due=alertList(); if(!due.length) return;
  if(force){ paintAlert(due); return; }
  SY_ALERT.show(ENG ? null : ()=>{ const d=alertList(); if(d.length) paintAlert(d); }, due.length);   // 과업 계산 창은 보이지 않으므로 이 화면 팝업은 없음
}
$('#tbdLater').onclick=()=>{ $('#tbdModal').hidden=true; if(ALERT_WIN) window.close(); };   // 다음 알림 시각에 다시 (알림 창이면 창을 닫음)
if(ALERT_WIN){ document.title='과업 알림 · 사유원';
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') window.close(); });
  setInterval(()=>{ if(window.__tasksReady) checkTbdPopup(true); }, 60000); }   // 열어 둔 알림 창은 1분마다 새로 (다른 화면에서 끝낸 것은 사라짐)
// 과업 하나 완료 (열어 둔 예약이면 화면의 과업, 아니면 저장된 기록을 고쳐 저장)
async function doneTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return;
  const now=new Date().toISOString(), base=tasksOf(r).find(t=>t.id===tid); if(!base) return;
  const mark = t => { t.done=true; t.doneAt=now; t.manualDone=1; t.doneBy=savedOwner()||'';   // 사람이 체크한 것 = 끝 (코드가 다시 따져서 되돌리지 않음, 2026-11-23)
  };
  if(editingId===id){ let t=tasks.find(x=>x.id===tid); if(!t){ t={...base}; tasks.push(t); } mark(t); if(tid==='memocheck'){ const me=savedOwner()||''; memos=memos.map(m=>!m.seen && m.by!==me ? {...m, seen:true, seenAt:now} : m); paintLock(); } if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=true); (t.xsubs||[]).forEach(x=>x.done=true); renderTasks(); await save({auto:true}); return; }
  const ph=parseHist(r); let t=ph.tasks.find(x=>x.id===tid); if(!t){ t={...base, memo:'', at:now}; ph.tasks.push(t); }
  if(tid==='memocheck'){ const me=savedOwner()||''; ph.memos=(ph.memos||[]).map(m=>!m.seen && m.by!==me ? {...m, seen:true, seenAt:now} : m); }   // 나의 할일에서 통화 메모 확인을 체크 = 안 읽은 메모를 읽음으로 (2026-11-24)
  mark(t); if(DOC_SUBS[t.id]) t.subs=Object.fromEntries(DOC_SUBS[t.id].map(([k])=>[k,true])); (t.xsubs||[]).forEach(x=>x.done=true); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료`});
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now}; await store.put(item);
  const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;   // 공유 기록에서 다시 받기 전에도 바로 반영
}
// 개인고객 과업 하나 완료 (그 통화 기록에 완료로 저장) — 나의 할일의 체크 칸과 알림의 체크 칸이 같이 씀
async function donePersonalTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return; let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){}
  const t=(h.tasks||[]).find(x=>x.id===tid); if(t){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; (t.xsubs||[]).forEach(x=>x.done=true); }
  const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
}
// 알림의 체크 칸 (2026-11-26): 체크 = 완료로 저장하고 목록을 다시 그림 (남은 것이 없으면 「지금 알릴 과업이 없습니다」 · 이 화면 팝업이면 닫힘)
const alertRepaint = () => { const d=alertList(); if(d.length){ paintAlert(d); return; }
  if(ALERT_WIN){ $('#tbdList').innerHTML='<li class="hint">지금 알릴 과업이 없습니다.</li>'; $('#tbdTitle').textContent='과업 알림'; } else $('#tbdModal').hidden=true; };
$('#tbdList').addEventListener('change', async e=>{ const d=e.target.dataset||{};
  if(d.ackopen){ e.target.checked=false; toast('이 과업은 예약을 열어 처리하면 완료됩니다 (전산 내역 붙여넣기 · 칸 채우기).', 3200); e.target.closest('li')?.querySelector('[data-tbdopen]')?.click(); return; }
  if(!d.ack || !e.target.checked) return; const [kind, rid, tid, day]=d.ack.split('|'); e.target.disabled=true;
  try{
    if(kind==='g') await doneTask(rid, tid);
    else if(kind==='p') await donePersonalTask(rid, tid);
    else { const o=etcMine().find(x=>x.r.id===rid); if(!o) return; const dd=day||opsToday();
      await etcPut(o.r, {...o.d, done:{...(o.d.done||{}), [dd]:{at:new Date().toISOString(), by:savedOwner()||''}}}, `${dd} 완료 (과업 알림)`); }
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); alertRepaint();
  }catch(err){ e.target.disabled=false; e.target.checked=false; toast('완료로 표시하지 못했습니다: '+(err.code||err.message)); } });
$('#tbdList').addEventListener('click', e=>{
  // 「열기」만 있음 (2026-11-26: 「완료」 버튼은 없앰). 단체 = 그 예약 · 개인 = 개인고객 화면의 그 통화 · 업무 = 나의 할일 · 견적 = 견적서 화면
  const d=e.target.dataset, kind = d.tbdopen ? 'g' : d.popen2 ? 'p' : d.aopen; if(!kind) return;
  const url = kind==='g' ? 'group.html?open='+encodeURIComponent(d.tbdopen) : kind==='p' ? 'personal.html?open='+encodeURIComponent(d.popen2) : kind==='quote' ? 'document/index.html' : './#mypop';
  if(ALERT_WIN){ window.open(url, '_blank'); return; }   // 알림 창: 새 탭에서 엶 (알림 창은 그대로)
  $('#tbdModal').hidden=true;
  if(kind==='g'){ const r=cache.find(x=>x.id===d.tbdopen); if(r) openRecordG(r); return; }
  if(kind==='my'){ openMy(); return; }
  guardLeave(()=>{ location.href=url; });
});
setInterval(()=>{ if(window.__tasksReady && !ALERT_WIN) checkTbdPopup(); }, 60000);   // 1분마다 확인 (나중에 = 2시간 뒤 다시)

// ===================== 미정 항목 입력 기한: 방문일 전주 목요일까지 =====================
// 그보다 늦게 잡으면 사유를 받는다 (비고 칸 '입력 기한 늦춘 사유', 수정 기록에도 남음)
const tbdMax = r => r.date ? tbdLimit(r.date) : '';
const tbdIsLate = r => !!(r.tbd && r.tbdDate && tbdMax(r) && r.tbdDate > tbdMax(r));
let lateThen=null;   // 사유를 받은 뒤 이어서 할 일 (저장)
function openLate(then){
  lateThen=then||null;
  $('#lateMsg').textContent = `미정 항목 답변일은 ${tbdLimitName(rec.date)}(${mdLabel(tbdMax(rec))})까지입니다. ${mdLabel(rec.tbdDate)}로 늦추는 사유를 적어 주세요.`;
  $('#lateReason').value = rec.tbdLate||''; $('#lateModal').hidden=false; setTimeout(()=>$('#lateReason').focus(),0);
}
function closeLate(){ $('#lateModal').hidden=true; lateThen=null; }
$('#lateOk').onclick=()=>{ const v=$('#lateReason').value.trim().replace(/\s*\/\s*/g,', '); if(!v){ $('#lateReason').focus(); toast('사유를 적어 주세요.'); return; }
  rec.tbdLate=v; touched.add('tbdLate'); const then=lateThen; closeLate(); renderSide(); if(then) then(); };
$('#lateFix').onclick=()=>{ rec.tbdDate=tbdMax(rec); rec.tbdLate=''; tbdAuto=true; $('#f_tbdDate').value=rec.tbdDate; const then=lateThen; closeLate(); paintFields(); renderSide(); if(then) then(); };
$('#lateReason').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); $('#lateOk').click(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#lateModal').hidden){ e.preventDefault(); closeLate(); } });
// 기한 칸을 바꿔서 늦어지면 바로 사유 팝업. 기한 안으로 돌아오면 사유는 지움
$('#f_tbdDate').addEventListener('change', ()=>{ if(tbdIsLate(rec)){ if(!rec.tbdLate) openLate(); } else if(rec.tbdLate){ rec.tbdLate=''; renderSide(); } });

// ===================== 새로고침해도 마지막으로 보던 화면 =====================
// 열어 둔 예약 · 저장 안 한 입력 · 펼친 묶음 · 열어 둔 목록/나의 할일 · 스크롤을 이 브라우저에 기억했다가 다시 열 때 그대로
const VIEW_LS='sayuwon_view';
let viewT=null, restoring=false;
function saveView(){
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
  if(!window.__autoReady || restoring || MY_ONLY) return;   // 나의 할일 단독 화면(메뉴 8)은 기억하지 않음 → 단체 화면을 열 때 나의 할일가 먼저 뜨지 않게
  try{
    const dirty=isDirty();
    const v={ id:editingId||'', dirty, opt:[...optOpen], y:Math.round(window.scrollY),
      modal: !$('#listModal').hidden ? 'list' : '', at:Date.now() };   // 나의 할일 팝업은 기억하지 않음 (단체 화면은 늘 입력 화면부터)
    if(dirty){ v.rec=rec; v.memo=$('#memoBox').value; v.tasks=tasks; v.nc=nContacts; v.tbdAuto=tbdAuto; }   // 저장 안 한 입력은 통째로
    localStorage.setItem(VIEW_LS, JSON.stringify(v));
  }catch(_){}
}
const saveViewSoon = () => { clearTimeout(viewT); viewT=setTimeout(saveView, 300); };
window.addEventListener('scroll', saveViewSoon, {passive:true});
window.addEventListener('pagehide', saveView);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveView(); });
['listModal','myModal'].forEach(id=>new MutationObserver(saveViewSoon).observe($('#'+id), {attributes:true, attributeFilter:['hidden']}));
async function restoreView(){
  if(BOOK_ONLY || MY_ONLY) return;   // 예약 현황 공유 페이지 · 나의 할일(단독 · 팝업)에서는 안 함 — 팝업 안에서 지난번 단체 화면(열어 둔 예약 · 단체예약 목록)이 되살아나지 않게 (2026-11-18)
  let v=null; try{ v=JSON.parse(localStorage.getItem(VIEW_LS)||'null'); }catch(_){}
  if(!v){ showStart(); return; }
  // 메뉴 · 링크로 들어오면 늘 새 통화 (2026-11-21) — 지난 화면(열어 둔 예약 · 목록)은 새로고침 · 뒤로 가기일 때만. 저장 안 한 입력이 있으면 그것만은 되살림
  //  2026-11-26: 그때 첫 화면은 「단체명으로 먼저 찾기」(showStart) — 되살릴 예약 · 입력 · 목록이 없을 때도
  const navType = (performance.getEntriesByType && (performance.getEntriesByType('navigation')[0]||{}).type) || 'navigate';
  if(navType==='navigate' && !v.dirty){ showStart(); return; }
  if(!v.id && !v.dirty && v.modal!=='list') showStart();
  restoring=true;
  try{
    await store.list();
    const r = v.id ? cache.find(x=>x.id===v.id) : null;
    if(r) openRecord(r);
    if(v.dirty && v.rec && (r || !v.id)){   // 저장 안 한 입력 되살리기 (저장된 예약이면 그 위에)
      Object.assign(rec, v.rec); Object.keys(v.rec).forEach(k=>{ if(v.rec[k]) touched.add(k); });
      $('#memoBox').value = v.memo||''; if(Array.isArray(v.tasks)) tasks=v.tasks; tbdAuto=!!v.tbdAuto;
      nContacts=Math.max(1, v.nc||nContactsOf(rec)); renderContacts(); renderForm(); renderTasks();
      if(isDirty()) toast('저장하지 않았던 입력을 되살렸습니다.');
    }
    optOpen=new Set(v.opt||[]); paintOpt();
    if(v.modal==='list') openList();
    setTimeout(()=>window.scrollTo(0, v.y||0), 450);   // 예약을 열 때 맨 위로 가는 스크롤이 끝난 뒤
  }catch(_){}
  finally{ setTimeout(()=>{ restoring=false; saveView(); }, 600); }
}
emptySnap=snap(); window.__autoReady=true; paintDirty();   // 자동 저장 시작 (빈 화면 기준)
restoreView();   // 새로고침 전에 보던 화면
window.__tasksReady=true; renderTasks(); checkPayPopup(); takeDocs(); setTimeout(checkTbdPopup, 0) /* 알림 목록이 뒤 조각(16 · 직접 넣은 업무 · 견적 요청)의 것을 써서 파일을 다 읽은 뒤에 (2026-11-26) */; checkMemoPopup();   // 추후 과업 · 결제 확인 알림 · 미정 항목 알림
// 불러오는 중 화면 걷기 (2026-11-21): 예약 정보(사본 또는 서버)가 준비되고, 열 예약(?open= · 새로고침 전 화면)을 다 연 뒤에. 서버 오류 · 로그인 필요 · 20초가 지나면 그냥 걷음
(function gLoadingWatch(){ const H=document.documentElement; if(!H.classList.contains('g-loading')) return; const t0=Date.now();
  const top=()=>{ const h=document.querySelector('body > header'); if(h) H.style.setProperty('--gl-top', Math.round(h.getBoundingClientRect().bottom)+'px'); }; top();
  let hasCache=false; cacheReady.then(()=>{ hasCache=(serverItems||[]).length>0; });
  const tick=()=>{ top();
    const failed = ['error','needkey'].includes(syncState);
    const data = pulledOnce || hasCache || failed;
    const waitOpen = !failed && ((openGId && !(pulledOnce && !(cache||[]).some(x=>x.id===openGId))) || restoring);   // 서버에서 받은 뒤에도 그 예약이 없으면 기다리지 않음
    if((data && !waitOpen) || Date.now()-t0>20000){ H.classList.remove('g-loading'); if(openGId && pulledOnce) toast('열려던 예약을 찾지 못했습니다. 단체예약 목록에서 찾아 주세요.'); return; }
    if(Date.now()-t0>4000) $('#gLoadingMsg').textContent='공유 기록에서 예약 정보를 받는 중…';
    setTimeout(tick, 120); };
  tick(); })();
window.addEventListener('focus', ()=>{ if(priceLoaded && Date.now()-priceLoaded>10*60000) loadQuotePrices(); });
$('#memoBox').focus();

// ===== 첫 화면: 단체명으로 먼저 찾기 (2026-11-26) =====
// 메뉴 · 링크로 단체 화면에 들어오면 입력 칸 하나만 보임 — 단체명을 치면 이미 있는 예약이 아래에 나오고(누르면 그 예약으로), 없으면 새 통화에 업체명이 들어감
//  - 건너뛰는 때: 새로고침 전에 보던 예약 · 저장 안 한 입력 · 목록을 되살릴 때(restoreView) · ?open= 으로 예약을 열 때 · 예약 현황 공유 · 나의 할일 · 알림 창
//  - 걷히는 때: 예약을 열거나 새 통화를 시작하면(newCall 이 endStart 를 부름) · 단체상담 입력을 적용하면
function showStart(force){   // force = 휴대폰 「다른 단체 찾기」: 주소로 연 예약(?open=) 뒤에도 첫 화면으로
  if(!force && (BOOK_ONLY || MY_ONLY || ALERT_WIN || openGId || /[?&]engine=/.test(location.search))) return;
  document.documentElement.classList.add('g-start'); paintStart();
  { const h=document.querySelector('body > header'); if(h) document.documentElement.style.setProperty('--start-top', Math.round(h.getBoundingClientRect().bottom)+'px'); }   // 머리줄 아래 남은 높이의 가운데에 (css #startBox) setTimeout(()=>{ const q=$('#startQ'); if(q) q.focus(); }, 0);
}
function endStart(){ document.documentElement.classList.remove('g-start'); }
// 찾기: 업체명 · 담당자 이름(띄어쓰기 무시) · 전화번호(숫자 4자리부터). 앞으로 있을 예약(가까운 날부터) → 지난 예약(최근 것부터)
function startHits(q){
  const qs=String(q||'').replace(/\s/g,'').toLowerCase(), qd=String(q||'').replace(/\D/g,''), t=todayYmd(); if(!qs) return [];
  const L=(cache||[]).filter(r=>isGroupRec(r) && ([r.org, r.contact].join(' ').replace(/\s/g,'').toLowerCase().includes(qs) || (qd.length>=4 && String(r.phone||'').replace(/\D/g,'').includes(qd))));
  return [...L.filter(r=>!r.date || r.date>=t).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')), ...L.filter(r=>r.date && r.date<t).sort((a,b)=>b.date.localeCompare(a.date))];
}
function paintStart(){
  const q=String($('#startQ').value||'').trim(), L=startHits(q), t=todayYmd();
  $('#startList').innerHTML = L.slice(0,30).map(r=>{ const s=stageOfRec(r);
    return `<li><button type="button" class="start-it" data-sid="${esc(r.id)}"><span class="num">${esc(dateLabel(r.date)||'방문일 미정')}</span><span class="tag st-${esc(s)}">${esc(s)}</span><b>${esc(r.org||r.contact||'(업체 미정)')}</b><small>${[r.people?`${esc(r.people)}명`:'', esc(firstContact(r)), ownerOf(r)?`담당 ${esc(ownerOf(r))}`:'', r.date && r.date<t?'지난 예약':''].filter(Boolean).join(' · ')}</small></button></li>`; }).join('');
  if(isMobG()){   // 휴대폰: 새 통화(새 예약)는 받지 않음 — 이미 있는 예약을 찾아 통화 메모 · 추후 과업만 (2026-11-27)
    $('#startHint').textContent = !q ? '단체명을 입력하면 이미 있는 예약을 찾아 줍니다.'
      : L.length ? `이미 있는 예약 ${L.length}건${L.length>30?' (가까운 30건만 보임 · 더 적어 보세요)':''} — 누르면 그 예약으로 갑니다.`
      : `「${q}」(으)로 저장된 예약이 없습니다. 새 예약은 PC 에서 받아 주세요.`;
    return; }
  $('#startHint').textContent = !q ? '단체명을 입력하면 이미 있는 예약을 찾아 줍니다. 없으면 새 통화에 업체명이 들어갑니다.'
    : L.length ? `이미 있는 예약 ${L.length}건${L.length>30?' (가까운 30건만 보임 · 더 적어 보세요)':''} — 누르면 그 예약으로 갑니다. 새로 받는 예약이면 아래 버튼을 누르세요.`
    : `「${q}」(으)로 저장된 예약이 없습니다. Enter 를 누르면 새 통화에 업체명이 들어갑니다.`;
  $('#startNew').textContent = q ? `「${q}」 새 통화로 시작` : '단체명 없이 새 통화';
}
function startOpen(id){ const r=(cache||[]).find(x=>x.id===id); if(r) openRecord(r); }   // openRecord → newCall → endStart
function startNew(org){
  endStart(); $('#startQ').value='';
  if(org){ rec.org=org; touched.add('org'); startTimer(); renderForm(); toast(`새 통화를 시작합니다 · 업체명 「${org}」`); }
  setTimeout(()=>{ const m=$('#memoBox'); if(m) m.focus(); }, 0);
}
$('#startQ').addEventListener('input', paintStart);
$('#startQ').addEventListener('keydown', e=>{ if(e.key!=='Enter' || e.isComposing || e.keyCode===229) return; e.preventDefault();
  const q=$('#startQ').value.trim(), L=startHits(q); if(!q) return;
  if(!L.length){ if(isMobG()){ toast('저장된 예약이 없습니다. 새 예약은 PC 에서 받아 주세요.'); return; } startNew(q); return; }   // 없는 단체 → 새 통화에 업체명 (휴대폰에서는 새 통화 없음)
  if(L.length===1){ startOpen(L[0].id); return; }   // 한 건뿐이면 바로 그 예약으로
  const f=$('#startList .start-it'); if(f) f.focus(); toast(`이미 있는 예약이 ${L.length}건입니다 · 골라 주세요 (새로 받는 예약이면 아래 버튼)`); });
$('#startList').addEventListener('click', e=>{ const b=e.target.closest('[data-sid]'); if(b) startOpen(b.dataset.sid); });
$('#startNew').onclick=()=>startNew($('#startQ').value.trim());
// ===== 휴대폰(너비 700px 아래 · 2026-11-27): 통화 메모 · 추후 과업만 보임 (예약 내용 · 가격표 · 수정 기록 · 머리줄의 편집 버튼은 css/group.css 맨 끝에서 숨김) =====
//  맨 위 제목 줄(#mobHead)은 어느 예약인지 읽기만 · 「다른 단체 찾기」 = 첫 화면(단체명으로 찾기)으로. 맨 아래 안내 글(#mobNote)은 group.html
//  과업 체크는 휴대폰에서 바로 저장 (PC 는 그대로: 과업의 「저장」 · 맨 위 저장 · 30초 자동 저장 — 휴대폰에는 맨 위 저장 버튼이 안 보여서)
function isMobG(){ return window.matchMedia('(max-width:700px)').matches; }
function paintMobHead(){
  try{ const el=$('#mobHead'); if(!el) return; const s=effStage(rec);
    el.innerHTML = `<div class="mh-row"><span class="tag st-${esc(s)}">${esc(s)}</span><span class="mh-sub">${[esc(dateLabel(rec.date)||'방문일 미정'), rec.people?`${esc(rec.people)}명`:''].filter(Boolean).join(' · ')}</span><button type="button" class="btn primary" id="mobFind">다른 단체 찾기</button></div><b class="mh-org">${esc(rec.org||'(업체 미정)')}</b>`;
  }catch(_){ /* 화면을 처음 그리는 중 (아직 준비 안 된 값) — 다음에 다시 그림 */ } }
$('#mobHead').addEventListener('click', e=>{ if(!e.target.closest('#mobFind')) return; guardLeave(()=>{ newCall(false); showStart(true); window.scrollTo(0,0); }); });
$('#taskList').addEventListener('change', e=>{ if(!isMobG() || e.target.type!=='checkbox') return;
  setTimeout(()=>{ if(editingId && !editLockBy && isDirty()) save(true); }, 300); });
window.matchMedia('(max-width:700px)').addEventListener?.('change', ()=>{ if(document.documentElement.classList.contains('g-start')) paintStart(); });   // 폭이 바뀌면 첫 화면 안내 글도 맞게
document.addEventListener('click', e=>{ if(e.target.id==='consultApplyBtn') setTimeout(()=>{ if($('#consultModal').hidden) endStart(); }, 0); });   // 단체상담 입력을 적용했으면 입력 화면으로


// ===== 예약 내용 「비고 멘트 재출력」: 지금 예약 내용으로 전산 비고 문구를 다시 만들어 팝업으로 (복사 · 직접 고친 과업 문구 바꾸기) =====
(function(){
  const erpTasks = () => tasks.filter(t=>(t.id==='erp'||t.id==='erpfix') && t.noteEdit);
  $('#noteRegenBtn').onclick = () => {
    if(!rec || (!rec.org && !rec.date)){ toast('업체나 방문일을 먼저 입력하세요.'); return; }
    $('#noteOut').value = erpNote(rec);
    const ed = erpTasks(); $('#noteApply').hidden = !ed.length;
    $('#noteHint').textContent = ed.length ? '추후 과업 「전산 예약」의 비고 문구는 직접 고친 것이라 예약 내용이 바뀌어도 그대로입니다. 이 멘트로 바꾸려면 「과업 문구도 이걸로 바꾸기」.' : '';
    $('#noteModal').hidden = false; $('#noteOut').focus(); $('#noteOut').setSelectionRange(0,0); $('#noteOut').scrollTop=0;
  };
  $('#noteCopy').onclick = () => copy($('#noteOut').value, '비고 멘트를 복사했습니다. 전산 비고에 붙여넣으세요.');
  $('#noteApply').onclick = () => { erpTasks().forEach(t=>t.noteEdit=''); renderTasks(); renderSide(); autoSave(); $('#noteApply').hidden=true; $('#noteHint').textContent='추후 과업 「전산 예약」 비고 문구도 이 멘트로 바꿨습니다.'; };
  const close = () => { $('#noteModal').hidden = true; };
  $('#noteClose').onclick = close;
  $('#noteModal').addEventListener('mousedown', e=>{ if(e.target.id==='noteModal') close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#noteModal').hidden){ e.preventDefault(); close(); } });
})();

// ===== 사전답사 (예약 내용의 「사전답사」 버튼 · 견적서 앞) =====
// 팝업: 성명 · 연락처(기본 = 담당자 첫 줄) · 일자 · 인원 · 시간 → rec.tour. 정보가 있으면 추후 과업 「사전답사 전산 예약」(메모 = 답사 정보, 비고 문구 = <단체명> 사전답사/n명 현장 결제 필요)
function syncTourTask(){   // 답사 정보가 바뀌면 과업 메모도 (메모를 직접 고치지 않았으면)
  const t=tasks.find(x=>x.id==='tour'); if(!t || t.done) return;
  if(!t.memo || t.memo===t.memoTour){ t.memo=tourMemo(rec); t.memoTour=t.memo; }
}
function paintTourCk(){ const c=$('#ckTour'); if(c) c.checked=!!String(rec.tour||'').trim(); const b=$('#tourBtn'); if(b) b.classList.toggle('on', !!String(rec.tour||'').trim()); }
async function openTour(){
  await freshRec();   // 최신 내용(단체명 · 담당자 · 연락처)으로 (2026-11-19)
  const o=tourWithDefaults(rec, rec.tour);
  $('#tourName').value=o.name||''; $('#tourPhone').value=o.phone||''; $('#tourPeople').value=String(o.people||'').replace(/\D/g,''); $('#tourTime').value=o.time||'';
  const dv = /^\d{4}-\d{2}-\d{2}$/.test(o.date||'') ? o.date : '';
  $('#tourDateBox').innerHTML = dboxHTML('id="tourDate"', dv) + (o.date && !dv ? `<small class="hint" style="margin:0"> (적혀 있던 일자: ${esc(o.date)})</small>` : '');
  $('#tourModal').dataset.extra = JSON.stringify(o.extra||[]); $('#tourModal').dataset.rawDate = dv ? '' : (o.date||'');
  $('#tourClear').hidden = !String(rec.tour||'').trim();
  $('#tourModal').hidden=false; setTimeout(()=>$('#tourName').focus(),0);
}
const closeTour = () => { $('#tourModal').hidden=true; paintTourCk(); };
function setTour(v){ rec.tour=v; touched.add('tour'); syncTourTask(); startTimer(); renderSide(); renderTasks(); paintTourCk(); }
$('#tourBtn').onclick = openTour;
$('#ckTour').addEventListener('change', e=>{ if(e.target.checked){ e.target.checked=false; openTour(); return; }
  if(!confirm('사전답사 정보를 지울까요? (손대지 않은 과업 「사전답사 전산 예약」도 빠집니다)')){ e.target.checked=true; return; } setTour(''); toast('사전답사 정보를 지웠습니다.'); });
$('#tourSave').onclick = () => {
  let extra=[]; try{ extra=JSON.parse($('#tourModal').dataset.extra||'[]'); }catch(_){}
  const ppl=$('#tourPeople').value.replace(/\D/g,''), t=fmtTime($('#tourTime').value)||$('#tourTime').value.trim();
  const o={ name:$('#tourName').value.trim(), phone:fmtPhone($('#tourPhone').value.trim())||$('#tourPhone').value.trim(), date:$('#tourDate').value||$('#tourModal').dataset.rawDate||'', people: ppl ? ppl+'명' : '', time:t, extra };
  if(!o.date && !o.people && !o.time && !extra.length){ toast('일자 · 인원 · 시간 중 하나는 넣어 주세요.'); return; }
  setTour(tourJoin(o)); closeTour(); toast('사전답사 정보를 넣었습니다. 추후 과업 「사전답사 전산 예약」을 확인하세요.');
};
$('#tourClear').onclick = () => { if(!confirm('사전답사 정보를 지울까요?')) return; setTour(''); closeTour(); };
$('#tourClose').onclick = closeTour;
$('#tourModal').addEventListener('mousedown', e=>{ if(e.target.id==='tourModal') closeTour(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#tourModal').hidden){ e.preventDefault(); closeTour(); } });
$('#tourTime').addEventListener('blur', e=>{ const t=fmtTime(e.target.value); if(t) e.target.value=t; });   // 1000 → 10:00
$('#tourPhone').addEventListener('blur', e=>{ const p=fmtPhone(e.target.value); if(p) e.target.value=p; });

// ===== 삭제 확인 팝업 (추후 과업 삭제 등): 「정말로 삭제할 건가요?」 → 삭제 · 취소 (Enter = 삭제, Esc = 취소) =====
let askOk=null;
function askDelete(msg, ok){ askOk=ok; document.getElementById('askMsg').textContent=msg; document.getElementById('askModal').hidden=false; setTimeout(()=>document.getElementById('askNo').focus(),0); }
const closeAsk = () => { document.getElementById('askModal').hidden=true; askOk=null; };
document.getElementById('askNo').onclick = closeAsk;
document.getElementById('askYes').onclick = () => { const f=askOk; closeAsk(); if(f) f(); };
document.getElementById('askModal').addEventListener('mousedown', e=>{ if(e.target.id==='askModal') closeAsk(); });
document.addEventListener('keydown', e=>{ if(document.getElementById('askModal').hidden) return; if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeAsk(); } }, true);
// 과업의 하위 과업(견적서 생성 · 전송 · NAS 등) · 직접 추가한 세부 과제가 모두 체크됐는지 (없으면 true)
function taskSubsDone(t){ const ds=DOC_SUBS[t.id]; return (!ds || !t.subs || ds.every(([k])=>t.subs[k])) && (t.xsubs||[]).every(x=>x.done); }

// 통화 메모 저장 (2026-11-24): 「저장」 버튼 · 영업 담당이 아니면 쓰고 1.5초 뒤 · 칸을 나가면 바로 저장 (예전엔 30초 자동 저장만이라 그 전에 나가면 안 남았음)
let memoLockT=0;
$('#memoBox').addEventListener('input', ()=>{ if(!lockOwner || editLockBy) return; clearTimeout(memoLockT); const ms=$('#memoSt'); if(ms){ ms.textContent='저장 안 함'; ms.className='memo-st'; } memoLockT=setTimeout(()=>saveLockedParts(), 1500); });
$('#memoBox').addEventListener('blur', ()=>{ if(!lockOwner || editLockBy) return; clearTimeout(memoLockT); saveLockedParts(); });
$('#memoSave').addEventListener('click', async ()=>{
  if(!editingId){ toast('업체나 방문일을 먼저 넣고 저장해 주세요.'); return; }
  if(editLockBy){ lockPopup(); return; }
  clearTimeout(memoLockT); const ms=$('#memoSt');
  if(lockOwner){ await saveLockedParts(); if(ms && ms.textContent==='저장 안 함'){ ms.textContent='바뀐 것 없음'; } return; }
  await save(); if(ms){ ms.textContent=`저장됨 ${new Date().toTimeString().slice(0,5)}`; ms.className='memo-st ok'; } });
