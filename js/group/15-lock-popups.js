// ===================== 남이 담당인 예약: 잠금 + 담당자에게 메모 =====================
// 영업 담당이 다른 사람인 예약을 열면 아무것도 고칠 수 없음(저장 · 과업 · 수정 · 삭제 모두). 바꿀 내용은 위쪽 메모로 → 담당자 화면에 '메모를 확인하세요' 팝업
const mergeMemos = (a, b) => { const m=new Map(); [...(b||[]), ...(a||[])].forEach(x=>{ if(!x||!x.id) return; const o=m.get(x.id); m.set(x.id, o ? {...x, ...o, seen: !!(o.seen||x.seen), seenAt:o.seenAt||x.seenAt||''} : x); }); return [...m.values()].sort((x,y)=>String(x.t).localeCompare(String(y.t))); };
function notMineMsg(r){ const o=ownerOf(r), me=savedOwner(); if(o && me && o!==me){ toast(`${o}님 담당 예약이라 고치거나 지울 수 없습니다. 예약을 열어 메모로 남겨 주세요.`); return true; } return false; }
const memoLi = (m, own) => `<li class="${own && !m.seen ? 'new' : ''}"><small>${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>${own ? (m.seen ? ' · 확인함' : ' · <b style="color:var(--red)">새 메모</b>') : ''}</small><br>${esc(m.text).replace(/\n/g,'<br>')}</li>`;
// ===================== 같은 예약을 두 PC(창)에서 동시에 고치지 않기 =====================
// 예약을 열면 Apps Script 에 '고치는 중'(lock)을 잡고 1분마다 연장. 이미 다른 창이 잡고 있으면 읽기 전용(editLockBy)으로 열고 30초마다 다시 확인
// → 풀리면 최신 기록을 받아 다시 열어 고칠 수 있게. 다른 예약을 열거나 새 통화 · 화면을 닫으면 풀어 줌. Apps Script 가 예전 버전이면 아무것도 막지 않음
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
  }catch(e){ /* 예전 Apps Script (bad_action) · 연결 문제: 막지 않음 */ }
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
  const box=$('#ownerMemo'); if(!box) return;
  const me=savedOwner(), list=[...memos].reverse();
  if(editLockBy){   // 다른 PC(창)에서 이 예약을 고치는 중: 읽기 전용, 풀리면 최신 내용으로 다시 불러옴
    box.className='owner-memo lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">🔒 ${esc(editLockBy)}님이 다른 PC(창)에서 이 예약을 고치는 중입니다</div><div class="hint" style="margin:0">같은 예약을 두 곳에서 고치지 않도록 지금은 볼 수만 있습니다. 그쪽에서 다른 예약을 열거나 화면을 닫으면 30초 안에 자동으로 최신 내용을 불러와 고칠 수 있게 됩니다.</div>`;
    return;
  }
  if(lockOwner){
    box.className='owner-memo lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">🔒 ${esc(lockOwner)}님 담당 예약입니다 · 고칠 수 없습니다</div><div class="hint" style="margin:0">바꿀 내용이나 전할 말은 아래에 메모로 남겨 주세요. ${esc(lockOwner)}님 화면에 「메모를 확인하세요」 알림이 뜹니다.</div>`
      + (list.length ? `<ul>${list.map(m=>memoLi(m,false)).join('')}</ul>` : '')
      + `<div class="om-add"><textarea id="omText" data-ime="ko"></textarea><button type="button" class="btn primary" id="omSend">메모 남기기</button></div>`;
  } else if(editingId && memos.length){
    const unseen=memos.filter(m=>!m.seen && m.by!==me).length;
    box.className='owner-memo mine lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">다른 사람이 남긴 메모 ${memos.length}개${unseen?` · <b style="color:var(--red)">새 메모 ${unseen}개</b> <button type="button" class="btn" id="omSeen" style="padding:2px 8px;font-size:12px">확인함</button>`:''}</div><ul>${list.map(m=>memoLi(m,true)).join('')}</ul>`;
  } else { box.hidden=true; box.innerHTML=''; }
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
// 잠긴 예약: 화면의 칸 · 버튼을 누르거나 쳐도 아무 일이 없게 (위쪽 메모 · 예약 현황 목록 · 텍스트 복사는 됨)
const lockBlocked = t => !!(lockOwner || editLockBy) && t && t.closest && t.closest('.layout') && !t.closest('.lock-ok, [data-mbdb], [data-book], #copyTextBtn, #noteRegenBtn, #noteModal, #histDet > summary');
let lockNudgeT=0;
['mousedown','click','dblclick','beforeinput','paste','drop','dragstart','change','input'].forEach(ev=>document.addEventListener(ev, e=>{
  if(!lockBlocked(e.target)) return; e.preventDefault(); e.stopImmediatePropagation();
  if(ev==='mousedown' && Date.now()-lockNudgeT>2500){ lockNudgeT=Date.now(); toast(`${lockOwner}님 담당 예약이라 고칠 수 없습니다. 위쪽 메모로 남겨 주세요.`); }
}, true));
document.addEventListener('keydown', e=>{ if(!lockBlocked(e.target)) return; if(['Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) || ((e.ctrlKey||e.metaKey) && /^[ca]$/i.test(e.key))) return; e.preventDefault(); e.stopImmediatePropagation(); }, true);
// 내 예약에 새 메모가 있으면: '메모를 확인하세요' 팝업 (확인할 때까지, 이 화면에서는 새 메모가 생길 때마다)
let memoShown=new Set();
function myNewMemos(){ const me=savedOwner(); if(!me) return []; const out=[]; (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me).forEach(r=>parseHist(r).memos.forEach(m=>{ if(!m.seen && m.by!==me) out.push({r, m}); })); return out.sort((a,b)=>String(b.m.t).localeCompare(String(a.m.t))); }
function paintMemoCount(){ if(typeof paintMyCount==='function') paintMyCount(); }
function checkMemoPopup(){
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
const ALERT_HOURS=[8,11,13,17];   // 추후 과업 마감 알림 시각 (개인고객 화면과 같음)
const SELF_DONE = new Set(['erp','erpcheck','erpfix','progstaff','mbmenu']);   // erp · erpfix: 전산 내역을 붙여넣어야 완료   // 칸을 채우면 저절로 완료되는 과업은 '열기'만
function checkTbdPopup(force){
  if(BOOK_ONLY || MY_EMBED) return;   // 예약 현황 공유 페이지 · 나의 할일 팝업 안에서는 안 함
  // 마감 지난 과업: 열 때 · 1분마다 (나중에 = 2시간 뒤). 오늘 마감 과업: 오후 1시, 아직 안 끝났으면 오후 5시에 (시간마다 한 번)
  // 단, 입력(과업이 생기거나 마감을 바꾼 것)한 지 30분이 안 된 과업은 알리지 않음
  // 2026-11-14부터: 오전 8시 · 11시 · 오후 1시 · 5시에 (그 시각이 지나고 처음 화면을 볼 때, 시각마다 한 번) 마감이 오늘이거나 지난 과업을 단체 + 개인고객 함께
  // 개인고객 화면과 같은 기록(TASK_SLOT_LS)을 써서, 한 시각에 두 화면에서 두 번 뜨지 않음
  const nowD=new Date(), now=+nowD, today=ymd(nowD); let slots=''; try{ slots=localStorage.getItem(TASK_SLOT_LS)||''; }catch(_){}
  if(!force && [...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 떠 있으면 나중에 (1분마다 다시 봄)
  const h=nowD.getHours(), slotH=ALERT_HOURS.filter(x=>h>=x).pop(), slotKey=`${today}|${slotH}`;
  if(!force && (slotH==null || slots.split(',').includes(slotKey))) return;
  const fresh = ({r,t}) => now - Math.max(+new Date(t.dueSetAt||0)||0, +new Date(t.at||r.saved||0)||0) < QUIET_MS;
  const pers = myPersonalOpen().flatMap(o=>o.left.filter(t=>t.due<=today).map(t=>({r:o.r, t, personal:true})));
  const due=[...dueTasks(), ...pers].filter(o=>!fresh(o)).sort((a,b)=>a.t.due.localeCompare(b.t.due));
  if(!due.length) return;
  if(slotH!=null){ try{ localStorage.setItem(TASK_SLOT_LS, [...slots.split(',').filter(s=>s.startsWith(today)), slotKey].join(',')); }catch(_){} }
  $('#tbdList').innerHTML = due.map(({r,t,personal})=>{ const n=daysFrom(today,t.due);
    if(personal) return `<li class="${n<0?'late':'today'}"><span class="who"><span class="tag">개인</span> <b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}<br>`
      + `<b class="${n<0?'late':''}">${esc(t.title)}</b> <small class="hint" style="margin:0">마감 ${esc(mdLabel(t.due))} ${n<0?`(${-n}일 지남)`:'(오늘)'}</small></span>`
      + `<button class="btn primary" data-pdone="${esc(r.id)}|${esc(t.id)}">완료</button><button class="btn" data-popen2="${esc(r.id)}">열기</button></li>`;
    return `<li class="${n<0?'late':'today'}"><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}${r.owner?` · ${esc(r.owner)}`:''}<br>`
      + `<b class="${n<0?'late':''}">${esc(t.title)}</b> <small class="hint" style="margin:0">마감 ${esc(mdLabel(t.due))} ${n<0?`(${-n}일 지남)`:'(오늘)'}${t.id==='wkcheck'||t.id==='onsitecall'?` · ${esc(firstContact(r)||'담당자 연락처 없음')}`:''}</small></span>`
      + (SELF_DONE.has(t.id) ? '' : `<button class="btn primary" data-tdone="${esc(r.id)}|${esc(t.id)}">완료</button>`) + `<button class="btn" data-tbdopen="${esc(r.id)}">열기</button></li>`; }).join('');
  $('#tbdTitle').innerHTML = `과업 알림 <small><b class="cnt-late">지남 ${due.filter(o=>o.t.due<today).length}</b> · <b class="cnt-today">오늘 ${due.filter(o=>o.t.due>=today).length}</b> · 단체 + 개인 · 알림은 오전 8시 · 11시 · 오후 1시 · 5시</small>`;
  $('#tbdModal').hidden=false;
}
$('#tbdLater').onclick=()=>{ $('#tbdModal').hidden=true; };   // 다음 알림 시각에 다시
// 과업 하나 완료 (열어 둔 예약이면 화면의 과업, 아니면 저장된 기록을 고쳐 저장)
async function doneTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return;
  const now=new Date().toISOString(), base=tasksOf(r).find(t=>t.id===tid); if(!base) return;
  if(editingId===id){ let t=tasks.find(x=>x.id===tid); if(!t){ t={...base}; tasks.push(t); } t.done=true; t.doneAt=now; if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=true); (t.xsubs||[]).forEach(x=>x.done=true); renderTasks(); await save({auto:true}); return; }
  const ph=parseHist(r); let t=ph.tasks.find(x=>x.id===tid); if(!t){ t={...base, memo:'', at:now}; ph.tasks.push(t); }
  t.done=true; t.doneAt=now; if(DOC_SUBS[t.id]) t.subs=Object.fromEntries(DOC_SUBS[t.id].map(([k])=>[k,true])); (t.xsubs||[]).forEach(x=>x.done=true); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료`});
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now}; await store.put(item);
  const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;   // 공유 기록에서 다시 받기 전에도 바로 반영
}
$('#tbdList').addEventListener('click', async e=>{
  // 개인고객 과업: 열기 = 개인고객 화면에서 그 통화, 완료 = 그 통화 기록에 완료로 저장
  if(e.target.dataset.popen2){ const id=e.target.dataset.popen2; $('#tbdModal').hidden=true; guardLeave(()=>{ location.href='personal.html?open='+encodeURIComponent(id); }); return; }
  if(e.target.dataset.pdone){ const [id,tid]=e.target.dataset.pdone.split('|'), r=cache.find(x=>x.id===id); if(!r) return; e.target.disabled=true;
    let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const t=(h.tasks||[]).find(x=>x.id===tid); if(t){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; (t.xsubs||[]).forEach(x=>x.done=true); }
    const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
    e.target.closest('li').remove(); if(!$('#tbdList').children.length) $('#tbdModal').hidden=true; toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); return; }
  const dn=e.target.dataset.tdone, open=e.target.dataset.tbdopen;
  if(open){ const r=cache.find(x=>x.id===open); $('#tbdModal').hidden=true; if(r) openRecordG(r); }
  if(dn){ const [id,tid]=dn.split('|'); e.target.disabled=true; await doneTask(id, tid);
    e.target.closest('li').remove(); if(!$('#tbdList').children.length) $('#tbdModal').hidden=true;
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); }
});
setInterval(()=>{ if(window.__tasksReady) checkTbdPopup(); }, 60000);   // 1분마다 확인 (나중에 = 2시간 뒤 다시)

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
  if(!v) return;
  // 메뉴 · 링크로 들어오면 늘 새 통화 (2026-11-21) — 지난 화면(열어 둔 예약 · 목록)은 새로고침 · 뒤로 가기일 때만. 저장 안 한 입력이 있으면 그것만은 되살림
  const navType = (performance.getEntriesByType && (performance.getEntriesByType('navigation')[0]||{}).type) || 'navigate';
  if(navType==='navigate' && !v.dirty) return;
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
window.__tasksReady=true; renderTasks(); checkPayPopup(); takeDocs(); checkTbdPopup(); checkMemoPopup();   // 추후 과업 · 결제 확인 알림 · 미정 항목 알림
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
// 팝업: 성명 · 연락처(기본 = 담당자 첫 줄) · 일자 · 인원 · 시간 → rec.tour. 정보가 있으면 추후 과업 「사전답사 전산 예약」(메모 = 답사 정보, 비고 문구 = <단체명> 사전답사/n명 현장결제 필요)
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

