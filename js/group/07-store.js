// ===================== 통화 메모 (특이사항만 적어 두는 칸 · 예약 칸을 채우지 않음) =====================
$('#memoBox').addEventListener('input', ()=>startTimer());
function status(s){ $('#status').textContent=s; }

// 통화 시간
let timerInt=null;
function startTimer(){ if(startedAt) return; startedAt=new Date(); }   // 통화 시작 시각만 기억 (화면에 통화 시간은 보이지 않음)
function tick(){ $('#timer').textContent=''; }   // 통화 시간 표시는 없앰 (칸은 헤더 간격용으로 비워 둠)

// ===================== 복사 =====================
function toast(s){ const t=$('#toast'); t.textContent=s; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),1800); }
async function copy(text,msg){ try{ await navigator.clipboard.writeText(text); }catch(_){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } toast(msg); }
// 카카오톡 보고용: 기록된 예약 정보를 모두
function reportText(r){
  const cnt = v => /^\d+(\+\d+)*$/.test(String(v)) ? `${v}명` : v;
  const grpLine = g => FIELDS.filter(f=>f[0]===g && r[f[1]]).map(f=>`${f[2]} ${cnt(r[f[1]])}`).join(', ');
  // 2026-11-24: 제목 아래 빈 줄 · 예약 단계 · 예상 금액 · 미정 항목 · 남은 과업 · 영업 담당은 뺌 (보고받는 쪽에 필요한 방문 정보만)
  const L=[`[단체예약 보고] ${r.org||'(단체명 미정)'}`];
  const add=(k,v)=>{ if(v) L.push(`- ${k}: ${v}`); };
  add('방문일', r.date ? `${dateLabel(r.date)}` : '');
  add('인원', [r.people && cnt(r.people), r.pchg && '인원 변경 가능성 있음'].filter(Boolean).join(' · '));
  add('입장', [r.tin, r.gate].filter(Boolean).join(' ') + (r.tout ? ` ~ 퇴장 ${r.tout}` : ''));
  add('차량', r.vehicle);
  contactsOf(r).forEach((c,i)=>add(`담당자${i?i+1:''}`, [c.name,c.phone,c.email].filter(Boolean).join(' / ')));
  add('사담 식사', grpLine('사담'));
  add('몽몽마방 식사', mabangText(r));
  add('굿즈 구매', goodsText(r));
  add('프로그램(개별)', progList(r,'프로그램(개별)',true).join(', '));
  add('프로그램(시간)', progList(r,'프로그램(시간)',true).join(', '));
  add('기타 프로그램', LEGACY_KEYS.filter(k=>r[k]).map(k=>`${LABEL[k]} ${r[k]}`).join(', '));
  add('결제', r.pay ? r.pay + (r.pay==='미정' && r.tbdDate ? ` (${mdLabel(r.tbdDate)}까지 답변)` : '') + (r.onsite ? ' · 현장 카드 재결제' : '') : '');
  const sp = typeof SPECIAL!=='undefined' ? specialCounts(r) : [];
  add('특별 할인', sp.map(s=>`${s.short} ${s.n}명(${s.rate===1?'무료':Math.round(s.rate*100)+'%'})`).join(', '));
  add('서류 요청', [r.wantQuote&&'견적서', r.wantStmt&&'거래명세서'].filter(Boolean).join(', '));
  const ml = memoLines(); if(ml.length){ L.push('- 통화 메모:'); ml.forEach(x=>L.push(`  · ${x}`)); }
  return L.join('\n');
}
$('#copyTextBtn').onclick=()=>{
  if(!rec.org && !rec.date){ toast('업체나 방문일을 먼저 입력하세요.'); return; }
  copy(reportText(rec),'보고용 내용을 복사했습니다. 카카오톡에 붙여넣으세요.');
};
$('#copyReadBtn').onclick=()=>{ const v=$('#readback').value.trim(); if(!v){ toast('복사할 멘트가 없습니다.'); return; } copy(v,'확인 문구를 복사했습니다.'); };
// 고객님께 확인 멘트: 예약 내용으로 자동으로 만들고(readback), 직접 고치면 그 글을 그대로(rec.readEdit). '고객님께 말씀드림'을 체크하면 멘트를 지우고 시각만 남김(rec.readDone)
function paintReadback(){
  const ta=$('#readback'), done=$('#readDone'), st=$('#readState'); if(!ta) return;
  done.checked=!!rec.readDone;
  if(rec.readDone){
    if(ta.value) ta.value=''; ta.readOnly=true; ta.placeholder=`${dtLabel(rec.readDone)}에 고객님께 말씀드렸습니다. 체크를 풀면 멘트가 다시 나옵니다.`;
    st.textContent='말씀드림'; ta.classList.add('said'); return;
  }
  ta.readOnly=false; ta.classList.remove('said');
  const auto=readback(rec), empty=/^내용이 채워지면/.test(auto); ta.placeholder = empty ? auto : '';   // 아직 내용이 없으면 안내만
  if(document.activeElement!==ta){ const v=rec.readEdit || (empty ? '' : auto); if(ta.value!==v) ta.value=v; }
  st.textContent = rec.readEdit ? '직접 고친 멘트 · 다시 만들기로 되돌림' : '자동으로 만든 멘트 · 직접 고칠 수 있음';
}
$('#readback').addEventListener('input', e=>{ if(rec.readDone) return; rec.readEdit = e.target.value; startTimer(); $('#readState').textContent='직접 고친 멘트 · 다시 만들기로 되돌림'; });
$('#readback').addEventListener('blur', ()=>{ if(!rec.readDone && $('#readback').value.trim()===readback(rec).trim()) rec.readEdit=''; paintReadback(); });   // 자동 멘트와 같으면 자동으로
$('#readRegen').onclick=()=>{ rec.readEdit=''; rec.readDone=''; touched.add('readDone'); renderSide(); toast('예약 내용으로 멘트를 다시 만들었습니다.'); };
$('#readDone').addEventListener('change', e=>{ rec.readDone = e.target.checked ? new Date().toISOString() : ''; if(e.target.checked) rec.readEdit=''; touched.add('readDone'); startTimer(); renderSide(); });

// ===================== 저장: 공유 DB (서버 요청은 SY.call · 끊긴 사이 저장한 것은 대기열에 모았다가 다시 보냄) =====================
// 서버로 가는 요청은 모두 SY.call (js/common.js). 예전의 「공유 주소가 없으면 이 브라우저에만 저장」 방식은 없앰 (2026-11-23 · 주소는 늘 있음)
const PEND_LS='sayuwon_intake_pending', CACHE_LS='sayuwon_intake_cache';
const readJSON=SY.readJSON;
const writeJSON=SY.writeJSON;
let pending = readJSON(PEND_LS,[]);        // 아직 시트에 못 올린 저장·삭제 [{action:'put',item}|{action:'del',id}]
let serverItems = readJSON(CACHE_LS,[]);   // 마지막으로 받은 시트 내용 (바로 띄우기용)
// 2026-11-21: 사본이 5MB 를 넘으면 localStorage 에 못 써서(조용히 실패) 열 때마다 구글 시트를 기다렸음 → 전체 사본은 IndexedDB 에, 열자마자 그것으로 그림
let pulledOnce=false;
const cacheReady = (async()=>{ const v=(await SY.listCached()) || (await SY.idb.get(CACHE_LS));   // 모든 화면이 같이 쓰는 사본 (js/common.js SY.list) · 없으면 예전 단체 화면 사본
  if(Array.isArray(v) && v.length && !pulledOnce){ serverItems=v; cache=merged(); if(window.__tasksReady){ try{ renderList(); paintMyCount(); tryOpenG(); if(!$('#myModal').hidden) renderMy(); }catch(_){} } } })();
function cacheWrite(items){   // 전체 사본은 SY.list 가 IndexedDB 에 둠 · localStorage 는 작을 때만 (다른 화면이 빨리 쓰도록) — 크면 지워서 저장 대기 · 다른 칸 자리를 남김
  SY.idb.del(CACHE_LS);   // 예전(첫 판) 단체 화면 전용 사본은 지움
  try{ const s=JSON.stringify(items.slice(-1000)); if(s.length < 1.5e6) localStorage.setItem(CACHE_LS, s); else localStorage.removeItem(CACHE_LS); }catch(_){ try{ localStorage.removeItem(CACHE_LS); }catch(__){} } }
const ADMIN_LS='sayuwon_intake_admin';
let adminData = readJSON(ADMIN_LS,null);   // 관리자 사이트 사담·마방 현황 {updated, days:{날짜:{L1,L2,D,MB}}}
let syncState = 'loading', flushing=false, retryTimer=null;
const getKey=SY.getKey;   // 팀 비밀번호 대신 로그인 (2026-11-21, js/common.js)

function merged(){
  const m=new Map(serverItems.map(x=>[x.id,x]));
  pending.forEach(p=>{ if(p.action==='put') m.set(p.item.id,{...p.item,_pending:true}); else m.delete(p.id); });
  // 개인고객 화면에서 이 브라우저로 고친 통화 (과업 체크 등): 시트에 아직 안 올라갔거나 시트를 다시 받기 전이면 그 내용을 씀
  const pp = readJSON('sayuwon_personal_pending',[]), pc = readJSON('sayuwon_personal_cache',[]);
  // 개인고객 화면이 시트에 올린 뒤 다시 받은 내용(_localAt 없음, updated 가 더 새로움)도 이 화면이 가진 옛 내용보다 먼저
  [...pc, ...pp.filter(p=>p.action==='put').map(p=>p.item)].forEach(x=>{ if(!x || !x.id) return; const t=String(x._localAt || (x.callType==='개인고객' && x.updated) || ''); if(!t) return; const s=m.get(x.id);
    if(!s || String(s.updated||'') < t) m.set(x.id, x); });
  pp.forEach(p=>{ if(p.action==='delete') m.delete(p.id); });
  return SY.live.apply([...m.values()]);   // 다른 화면이 방금 저장 · 삭제한 기록 (바로 알리기 · js/common.js SY.live, 2026-11-23)
}
// 다른 화면(다른 탭 · 나의 할일 팝업 · 개인고객 화면)이 기록을 저장 · 삭제하면 그 순간 받아 다시 그림 (2026-11-23) — 서버에서 다시 받기(30초마다)를 기다리지 않음
SY.live.onRev(()=>{ if(BOOK_GUEST) return; if(pending.length) flush(); else pull(); if(typeof loadMyQuoteReq==='function') loadMyQuoteReq(); });   // 다른 컴퓨터에서 바뀜 → 바로 다시 받음 (바뀐 줄만)
let liveT=0;
SY.live.on(m=>{ const id = m.t==='del' ? m.id : m.item.id; cache=merged(); clearTimeout(liveT);
  liveT=setTimeout(()=>{ if(!window.__tasksReady) return;
    try{
      // 그 예약을 이 화면에서도 열어 두었고 고치던 것이 없으면: 새 내용으로 다시 엶 (화면의 과업이 옛 상태로 남았다가 저장되어 되돌아가지 않게)
      if(m.t==='put' && editingId===id && !saving && (lockOwner ? (typeof lockSaving==='undefined' || !lockSaving) : !isDirty()) && $('#listModal').hidden && !document.activeElement?.closest?.('#taskList, #form')){ const r=cache.find(x=>x.id===id); if(r){ const y=window.scrollY, lk=!!lockOwner, typed=$('#memoBox').value, foc=document.activeElement===$('#memoBox'), was=String(typeof memoOpened!=='undefined' ? memoOpened : ''); openRecord(r); window.scrollTo(0,y); if(lk && typed.trim()!==String(r.note||'').trim() && typed.trim()!==was.trim()){ $('#memoBox').value=typed; } if(lk && foc) $('#memoBox').focus(); } }   // 남이 담당인 예약도 새 내용으로 (2026-11-24 · 적던 통화 메모는 그대로 둠)
      paintMyCount(); if(!$('#listModal').hidden) renderList();
      if(!$('#myModal').hidden && !(typeof etcEdit!=='undefined' && etcEdit && document.activeElement?.closest?.('.etc-edit')) && !document.activeElement?.matches?.('.tk-memoin, .tk-subin, .tk-in')) renderMy();
    }catch(e){ console.warn('live', e); } }, 30); });
window.addEventListener('storage', e=>{ if(!/^sayuwon_personal_(pending|cache)$/.test(e.key||'')) return; cache=merged();
  if(window.__tasksReady){ paintMyCount(); if(!$('#myModal').hidden) renderMy(); } });   // 다른 창(개인고객)에서 과업을 체크하면 나의 할일에 바로
function paintSync(){
  const chip=$('#syncChip'), n=pending.length;
  // 연결돼 있으면 아무것도 안 보임. 문제가 있을 때만 헤더에 표시 (비밀번호 문제는 팝업)
  const txt={ loading:'', ok: n?`올리는 중 ${n}건`:'', error: n?`연결 끊김 · ${n}건 대기 · 다시 시도 중`:'연결 끊김 · 다시 시도 중', needkey:'' }[syncState];
  chip.textContent=txt; chip.hidden=!txt; chip.title = syncState==='error' && lastSyncErr ? `마지막 오류: ${lastSyncErr}
15초마다 다시 보냅니다. 저장 대기 중인 내용은 이 브라우저에 남아 있으니 창을 닫아도 다음에 열면 이어서 보냅니다.` : ''; chip.className='sync '+(syncState==='error'?'warn':'');
  const km=$('#keyModal'); km.hidden = syncState!=='needkey' || !!BOOK_GUEST;   // 로그인 확인 안내 (예약 현황 공유를 로그인 없이 볼 때는 안 띄움)
  paintDbTime();
  $('#storeHint').textContent = syncState==='ok' ? '공유 DB에 저장 · 모두가 같은 목록을 봅니다' : syncState==='needkey' ? '로그인을 확인하지 못했습니다 · 첫 화면에서 다시 로그인' : syncState==='error' ? '연결이 안 돼 이 브라우저에 모아 두었다가 다시 올립니다' : '불러오는 중…';
}
// 공유 DB에 마지막으로 저장된 시각 (이 브라우저에서 올린 것) · 마지막으로 받아 온 시각
var DBT_LS = 'sayuwon_db_time';   // var: paintSync가 먼저 불려도 되게
var dbTime = readJSON(DBT_LS, {});
const markDb = k => { dbTime[k]=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintDbTime(); };
function paintDbTime(){
  const el=$('#dbTime'); if(!el || !dbTime) return;
  const n=pending.length, last=[dbTime.saved, dbTime.cat].filter(Boolean).sort().pop(), t=last || dbTime.pulled;   // 예약 저장 · 품목 관리 저장 중 최근 것
  el.hidden = !t && !n;
  el.textContent = (last ? `DB 저장 ${dtLabel(last)}` : t ? `DB 동기화 ${dtLabel(t)}` : '') + (n ? ` · 저장 대기 ${n}건` : '');
  el.title = `공유 DB · 이 브라우저 기준\n· 예약 마지막 저장: ${dbTime.saved?dtLabel(dbTime.saved):'아직 없음'} (고치고 30초 뒤 자동 저장)\n· 품목 관리 마지막 저장: ${dbTime.cat?dtLabel(dbTime.cat):'아직 없음'} (고치고 2초 뒤 자동 저장)\n· 마지막으로 목록을 받아 옴: ${dbTime.pulled?dtLabel(dbTime.pulled):'아직 없음'}`;
}
// 구글 시트 칸 하나 = 5만 자까지. 수정 기록(history)이 넘으면 처음 저장 줄은 두고 오래된 기록부터 덜어 냄 (바꿨으면 줄인 기록을 돌려줌)
function fitHist(item){ const s=String(item && item.history || ''); if(s.length<=45000) return null; let hj; try{ hj=JSON.parse(s); }catch(_){ return null; }
  let h=Array.isArray(hj.h)?hj.h:[]; while(item.history.length>45000 && h.length>20){ h=[h[0], ...h.slice(1+Math.max(1, Math.floor(h.length/10)))]; hj.h=h; item.history=JSON.stringify(hj); } return h; }
var lastSyncErr='', syncErrN=0;   // 저장 실패 이유 (헤더 「연결 끊김」에 마우스를 올리면 보임)
function handleErr(e){
  if(e.code==='bad_key'){ syncState='needkey'; $('#keyMsg').textContent=SY.authFail(); }
  else { syncState='error'; clearTimeout(retryTimer); retryTimer=setTimeout(()=>{ flush(); }, 15000);
    const net = e instanceof TypeError || /fetch|network|Load failed/i.test(String(e.message||e)), msg = net ? '인터넷 연결 (또는 구글 서버 응답 없음)' : String(e.message||e).replace(/^Error:\s*/,'');
    syncErrN = msg===lastSyncErr ? syncErrN+1 : 1; lastSyncErr = msg;
    if(!net && syncErrN===3) toast(msg==='too_many' ? '틀린 로그인이 여러 번 이어져 서버가 잠시 막았습니다. 15분쯤 뒤에 다시 됩니다.' : `저장이 계속 실패합니다: ${msg}`); }   // 같은 오류가 세 번 이어지면 한 번 알림 (연결 문제는 알리지 않고 계속 다시 시도)
  paintSync();
}
// 예약 현황 공유를 로그인 없이 볼 때 (2026-11-21 · 담당자 휴대폰): 그 목록에 필요한 칸만 받는 bookList (고객 연락처 · 메모 · 수정 기록 없음)
async function bookPull(){
  try{ const j=await SY.callRaw({action:'bookList'});
    if(!j.ok){ syncState='error'; lastSyncErr = String(j.error||''); paintSync(); if($('#bookSum')) $('#bookSum').textContent=lastSyncErr; return; }
    serverItems=j.items||[]; cache=merged(); syncState='ok'; paintSync(); renderDayAll(); if(!$('#bookModal').hidden) paintBook(); }
  catch(e){ syncState='error'; lastSyncErr='인터넷 연결'; paintSync(); }
}
async function flush(){
  if(flushing) return;
  if(BOOK_GUEST) return bookPull();
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  flushing=true;
  try{
    do {   // 보내는 사이 새로 쌓인 것(예: 삭제 사유 저장 뒤 삭제)까지 이어서 보냄
    while(pending.length){
      if(pending[0].action==='put' && fitHist(pending[0].item)) writeJSON(PEND_LS,pending);   // 예전에 쌓인 저장도 시트 칸 크기에 맞춰
      await SY.call(pending[0]);
      pending.shift(); writeJSON(PEND_LS,pending); dbTime.saved=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintSync();
    }
    await pull(true);
    } while(pending.length);
  }catch(e){ handleErr(e); }
  finally{ flushing=false; }
}
async function pull(inFlush){
  if(BOOK_GUEST) return bookPull();
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  if(flushing && !inFlush) return;
  try{
    const j=await SY.list(inFlush ? {fresh:true} : {});   // 바뀐 것만 받아 사본에 합침 (js/common.js, 2026-11-21)
    serverItems=j.items||[]; pulledOnce=true; cacheWrite(serverItems); cache=merged();   // 2026-11-24: 받은 것을 바로 합침 — 예전엔 나의 할일 · 알림을 옛 사본으로 다시 그려(합치기는 그 뒤 renderList 에서) 다른 컴퓨터에서 바꾼 과업이 늦게 보였음
    if(j.admin!==undefined){ adminData=j.admin; writeJSON(ADMIN_LS,adminData); }
    dbTime.pulled=new Date().toISOString(); writeJSON(DBT_LS, dbTime);
    syncState='ok'; lastSyncErr=''; syncErrN=0; $('#keyMsg').textContent=''; paintSync(); renderList(); tryOpenG(); liveSync(); if(window.__tasksReady){ checkPayPopup(); takeDocs(); paintMyCount(); checkTbdPopup(); checkMemoPopup(); if(editingId){ const cr=cache.find(x=>x.id===editingId); if(cr){ memos=mergeMemos(memos, parseHist(cr).memos); paintLock(); } } if(!$("#myModal").hidden && !(typeof etcEdit!=="undefined" && etcEdit && document.activeElement?.closest?.(".etc-edit")) && !document.activeElement?.matches?.(".tk-memoin, .tk-subin, .tk-in")) renderMy(); }   // 과업 칸(메모 · 세부 과업)에 적는 중이면 나의 할일을 다시 그리지 않음
  }catch(e){ if(inFlush) throw e; handleErr(e); }
}
const store={
  async list(){ await cacheReady; cache = merged(); if(typeof applySpd==='function') applySpd(); if(typeof tcfgApply==='function') tcfgApply(); return cache; },
  async put(item){
    pending=pending.filter(p=>!(p.action==='put'&&p.item.id===item.id)); pending.push({action:'put',item}); writeJSON(PEND_LS,pending); paintSync();
    SY.live.post({t:'put', item});   // 다른 화면에 바로 (나의 할일 · 첫 화면)
    flush();
  },
  async del(id, keepPut){   // keepPut: 바로 앞에 넣은 저장(삭제 사유 기록)을 먼저 보내고 삭제
    const local=pending.some(p=>p.action==='put'&&p.item.id===id) && !serverItems.some(x=>x.id===id);
    if(!(keepPut && !local)) pending=pending.filter(p=>!(p.action==='put'&&p.item.id===id));
    if(!local) pending.push({action:'del',id});
    writeJSON(PEND_LS,pending); paintSync(); SY.live.post({t:'del', id}); flush();
  }
};
// (팀 비밀번호 입력 칸은 없앰 · 2026-11-21 — 서버는 로그인으로 확인, 안 되면 「로그인 확인 필요」 안내만)
window.addEventListener('focus', ()=>{ if(pending.length) flush(); else pull(); });   // 다른 창에서 돌아오면 최신 목록
setInterval(()=>{ if(!document.hidden){ if(pending.length) flush(); else pull(); } }, 30000);   // 30초마다 (2026-11-18 · 예전 1분)
