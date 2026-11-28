// ===== 사고현황 접수 (accident.html) — 이 페이지의 칸 · 목록 · 담당자 잠금 · 추후과업 · 메모. 저장 · 접수 창은 js/opsboard.js (운영보조 공통 엔진) =====
// 2026-11-28 다시 만듦: 예전 사고 현황판(인수인계 자료)의 항목을 이 시스템의 화면 모양으로 옮김 — 자세한 규칙은 docs/화면/46-사고현황-접수.md
//  · 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨, list 고를 값(직접 적어도 됨)} · type:'head' = 묶음 제목 · html = 직접 그리는 칸
//  · 예전 기록(날짜 · 시각 · 유형 · 장소 · 관련자 · 연락처 · 내용 · 조치 · 상태 · 담당 · 메모)의 저장 이름은 그대로 — 화면 이름만 바뀜. 예전 상태 「처리 중」→ 접수 · 「완료」→ 처리 완료 로 읽음 (accStatus)
//  · 단계: 접수 → 보험 접수 → 손해사정사 현장 방문 → 손해사정중 → 처리 완료 (보험까지 가지 않는 사고는 접수에서 바로 처리 완료)
//  · 담당자(d.owner · 없으면 접수한 사람)만 고침 · 단계 바꿈 · 삭제. 다른 사람은 보기 + 「처리 이력 · 메모」 남기기만 (단체예약의 영업 담당자와 같은 방식 · 화면에서만 막음 — 서버는 로그인만 확인)
//  · 추후과업 = 「개인업무」 줄 (d.acc = 이 사고의 id) → 그 사람의 「나의 할일」(기타 개인 업무)에 뜸. 새 사고 = 담당자에게 한 건 · 다른 사람이 메모를 남기면 담당자에게 「메모 확인」 한 건
//  · 고객 이름 · 연락처는 공유 기록의 요약(summary) · 추후과업 제목에 넣지 않음 (장소 · 구분만)
const ACC_ST = ['접수','보험 접수','손해사정사 현장 방문','손해사정중','처리 완료'];
const ACC_OPEN = ACC_ST.slice(0, 4);
const accStatus = d => { const s=d.status||''; return ACC_ST.includes(s) ? s : /완료|종결/.test(s) ? '처리 완료' : '접수'; };
const accMe = () => (typeof user!=='undefined' && user.name) || '';
const accOwner = (d, r) => String((d && d.owner) || (r && (r.owner || r.takenBy)) || '').trim();
const accMine = x => { const o=accOwner(x.d, x.r); return !o || o===accMe(); };
const accEd = () => typeof editRow!=='undefined' && !!editRow;   // 고치는 중 (새로 접수하는 중이 아님 · opsboard.js editRow)
const accTel = l => ({type:'tel', ph:'010-0000-0000', fmt:'phone', bad:(v, touched)=>!v || !touched || /^(\d{2,4}-\d{3,4}-\d{4}|1\d{3}-\d{4})$/.test(v) ? '' : l+'를 010-0000-0000 처럼 넣어 주세요 (지금: '+v+')'});
// 단계를 바꾸면 그 단계의 날짜가 비어 있을 때 오늘로
function accStageDate(d){ const s=accStatus(d), t=opsToday();
  if(s==='보험 접수' && !d.rcptDate) d.rcptDate=t;
  if(s==='손해사정사 현장 방문' && !d.visitDate) d.visitDate=t;
  if(s==='손해사정중' && !d.adjDate) d.adjDate=t;
  if(s==='처리 완료' && !d.procDate) d.procDate=t; }
const accDays = d => { const s=d.rcptDate||d.date; if(!s) return null; const t=new Date(s+'T00:00'); return isNaN(t) ? null : Math.max(0, Math.floor((new Date(opsToday()+'T00:00')-t)/864e5)); };
const accWhen = d => `${opsDateLabel(d.date)}${d.time?' '+d.time:''}`;
const accWon = n => (Math.round(+n||0)).toLocaleString('ko-KR');

// ---------- 추후과업 (개인업무 줄 · d.acc = 사고 id) ----------
const accTasks = id => (window.opsItems||[]).filter(r=>r.callType===OPS_TYPES.task).map(r=>({r, j:opsParse(r)})).filter(o=>o.j && o.j.d && o.j.d.acc===id).map(o=>({r:o.r, j:o.j, d:o.j.d}))
  .sort((a,b)=>String(a.r.saved||'').localeCompare(String(b.r.saved||'')));
const accTaskDay = d => d.due || d.start || '';
const accTaskDone = d => !!(d.done||{})[accTaskDay(d)];
const accTaskName = d => String(d.title||'').replace(/^\[사고\][^—]*—\s*/, '');
async function accTaskPut(r, j, d, what){ const now=new Date().toISOString();
  const item={...r, owner:d.owner||r.owner||'', summary:`${d.title} · 반복 없음`.slice(0,120), history:JSON.stringify({...j, kind:'task', d, log:[...(j.log||[]), {at:now, by:accMe(), what}].slice(-60)})};
  await SY.call({action:'put', item});
  const L=(window.opsItems ||= []), i=L.findIndex(x=>x.id===item.id); if(i>=0) L[i]=item; else L.push(item);
  return item; }
function accTaskNew(x, title, who, tag){ const d=x.d, now=new Date().toISOString();
  return accTaskPut({id:opsId(), callType:OPS_TYPES.task, saved:now, takenBy:accMe(), owner:who}, {kind:'task', log:[]},
    {title:`[사고] ${d.place||'장소 없음'} · ${d.type||''} — ${title}`, repeat:'none', due:opsToday(), owner:who, memo:`사고현황 접수 › ${accWhen(d)} ${d.place||''} (운영보조 › 사고현황 접수에서 엽니다)`, subs:[], acc:x.r.id, accTag:tag||''}, '사고현황 접수에서 만듦'); }
async function accTaskCheck(t, on){ const d={...t.d, done:{...(t.d.done||{})}}, day=accTaskDay(d) || opsToday(); if(!d.due && !d.start) d.due=day;
  if(on) d.done[day]={at:new Date().toISOString(), by:accMe()}; else delete d.done[day];
  await accTaskPut(t.r, t.j, d, on?'완료':'완료 취소'); }
// 사고가 끝나면(처리 완료 · 삭제) 남은 과업도 끝낸 것으로
async function accTasksClose(id){ for(const t of accTasks(id).filter(t=>!accTaskDone(t.d))){ try{ await accTaskCheck(t, true); }catch(_){} } }
const accFail = e => toast('저장하지 못했습니다: '+((e && (e.code||e.message))||e));

// ---------- 창의 오른쪽 「진행」 (2026-11-28 다시 짬 · 단체예약 창처럼: 왼쪽 = 사고 내용(칸) · 오른쪽 = 진행 단계 · 추후과업 · 처리 이력 · 메모) ----------
//  오른쪽의 것은 누르는 대로 바로 저장된다 (서버의 지금 내용을 다시 받아 그것만 고침 · accPatch). 왼쪽 칸은 「저장」을 눌러야 저장된다.
const ACC_SHORT = ['접수','보험 접수','현장 방문','손해사정중','처리 완료'];
const accDraft = {tk:'', who:'', note:'', ph:[], edit:'', edTx:'', up:0};   // 적던 것 (다시 그려도 남게) · ph = 메모에 붙일 사진 · edit = 고치는 메모 id
const accStageDates = d => [d.date, d.rcptDate, d.visitDate, d.adjDate, d.procDate];
function accStepsHTML(d, can){ const cur=ACC_ST.indexOf(accStatus(d)), dt=accStageDates(d);
  return `<ol class="acc-steps">${ACC_ST.map((s,i)=>{ const skip=i>0 && i<cur && !dt[i];   // 날짜 없이 지나간 단계 (보험 없이 끝낸 사고)
    return `<li class="${i<cur ? (skip?'skip':'done') : i===cur ? 'cur' : ''}"><button type="button" data-accstep="${i}"${can?'':' disabled'} title="${esc(s)}"><i>${(i<cur && !skip) || (i===cur && cur===4) ? '✓' : i+1}</i><b>${ACC_SHORT[i]}</b><small>${i<=cur && dt[i] ? esc(opsDateLabel(dt[i])) : ''}</small></button></li>`; }).join('')}</ol>`; }
const accMini = d => { const cur=ACC_ST.indexOf(accStatus(d)); return `<span class="acc-mini" aria-hidden="true">${ACC_ST.map((_,i)=>`<i class="${i<=cur?'on':''}"></i>`).join('')}</span>`; };
function accTasksHTML(mine){ if(!accEd()) return `<p class="acc-none">저장한 뒤에 넣을 수 있습니다</p>`; const id=editRow.r.id, me=accMe(), L=accTasks(id), own=accOwner(form, editRow.r);
  return (L.length ? `<ul class="acc-tasks">${L.map(t=>{ const dn=accTaskDone(t.d), can=mine || t.d.owner===me;
        return `<li class="${dn?'done':''}"><label><input type="checkbox" data-acctk="${esc(t.r.id)}"${dn?' checked':''}${can?'':' disabled'}><span>${esc(accTaskName(t.d))}</span></label><small>${esc(t.d.owner||'')} · ${dn?'완료':'마감 '+esc(opsDateLabel(accTaskDay(t.d)))}</small></li>`; }).join('')}</ul>` : `<p class="acc-none">없음</p>`)
    + (mine ? `<div class="acc-add"><input id="accTkIn" data-ime="ko" placeholder="할 일 (적고 Enter)" autocomplete="off" value="${esc(accDraft.tk)}"><select id="accTkWho" title="맡을 사람">${[...new Set([own, me, ...(window.opsMembers||[])].filter(Boolean))].map(n=>`<option${n===(accDraft.who||own)?' selected':''}>${esc(n)}</option>`).join('')}</select><button type="button" class="btn primary" id="accTkAdd">추가</button></div>` : ''); }
const accNoteWhen = t => { const x=new Date(t); return isNaN(x) ? '' : `${opsDateLabel(opsYmd(x))} ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };
const accPhs = (L, del) => (L||[]).length ? `<div class="an-phs">${L.map((p,i)=>`<span class="an-ph"><img alt="${esc(p.name||'사진')}" data-phimg="${esc(p.id)}" data-accview="1">${del?`<button type="button" class="ph-x" data-accphdel="${i}" title="이 사진 빼기" aria-label="사진 빼기">×</button>`:''}</span>`).join('')}</div>` : '';
function accNotesHTML(){ if(!accEd()) return `<p class="acc-none">저장한 뒤에 남길 수 있습니다</p>`; const me=accMe(), L=(Array.isArray(form.notes) ? form.notes : []).slice().reverse();   // 새 것이 위
  return `<div class="acc-note-in"><textarea id="accNoteIn" data-ime="ko" rows="2" placeholder="메모 (적고 Enter)">${esc(accDraft.note)}</textarea>${accPhs(accDraft.ph, true)}`
      + `<div class="an-btns"><label class="btn">${accDraft.up ? '올리는 중…' : '사진 붙이기'}<input type="file" accept="image/*" multiple id="accNotePh" hidden></label><span class="sp"></span><button type="button" class="btn primary" id="accNoteAdd">메모 남기기</button></div></div>`
    + (L.length ? `<ol class="acc-notes">${L.map(n=>{ const ed=accDraft.edit===n.id;
        return `<li class="acc-note${n.del?' del':''}"><div class="an-h"><b>${esc(n.by||'')}</b><span>${esc(accNoteWhen(n.t))}${n.ed && !n.del ? ' · 고침' : ''}</span>${n.del ? '<span>지움</span>' : n.by===me && !ed ? `<span class="an-acts"><button type="button" class="an-x" data-accnedit="${esc(n.id)}">고치기</button><button type="button" class="an-x" data-accndel="${esc(n.id)}">지우기</button></span>` : ''}</div>`
          + (ed ? `<textarea id="accNoteEd" data-ime="ko" rows="3">${esc(accDraft.edTx)}</textarea><div class="an-btns"><span class="sp"></span><button type="button" class="btn" id="accNoteEdNo">그만</button><button type="button" class="btn primary" id="accNoteEdOk">고침 저장</button></div>`
               : `<div class="an-t">${esc(n.text||'')}</div>${n.del ? '' : accPhs(n.photos)}`) + `</li>`; }).join('')}</ol>` : ''); }
let accTab='side', accTabId='';
function accSidePaint(row, ro){ const side=document.getElementById('accSide'), box=document.querySelector('#editModal .edit-box'), tabs=document.getElementById('accTabs'); if(!side) return;
  box.classList.add('acc-wide'); side.hidden=false; if(tabs) tabs.hidden=false;   // 새로 접수할 때부터 진행 단계 · 뒤처리 묶음이 다 보임 (2026-11-28 · 새 접수의 단계는 「저장」할 때 같이 저장 · 추후과업 · 메모는 저장한 뒤)
  const rid=row ? row.r.id : 'new'; if(accTabId!==rid){ accTabId=rid; accTab=row ? 'side' : 'info'; accDraft.tk=accDraft.note=accDraft.edit=accDraft.edTx=accDraft.who=''; accDraft.ph=[]; }
  $('#eForm').dataset.tab=accTab; if(tabs) tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.acctab===accTab));
  const mine=!ro;
  side.innerHTML=`<section class="acc-box"><h3>진행 단계</h3>${accStepsHTML(form, mine)}</section>`
    + `<section class="acc-box"><h3>추후과업</h3>${accTasksHTML(mine)}</section>`
    + `<section class="acc-box"><h3>처리 이력 · 메모</h3>${accNotesHTML()}</section>`
    ;
  side.querySelectorAll('img[data-phimg]').forEach(im=>{ phLoad(im.dataset.phimg).then(u=>{ im.src=u; }).catch(()=>{ im.alt='사진을 불러오지 못함'; im.classList.add('bad'); }); }); }
const accSide = () => accSidePaint(editRow, roBy);
// 바로 저장: 서버의 지금 내용을 다시 받아 그 위에 mut 만 (창에서 고치던 다른 칸은 「저장」을 눌러야 저장됨)
let accBusy=false;
async function accPatch(mut, what){ if(!accEd() || accBusy) return false; accBusy=true;
  try{ const id=editRow.r.id; await pull();
    const x=rows.find(y=>y.r.id===id); if(!x){ toast('이 사고 기록을 찾지 못했습니다 (지워졌을 수 있습니다).'); return false; }
    const d2=mut({...x.d}); const ok=await putRow({...x, d:d2}, what); if(ok===false) return false;
    editRow=putRow.last; return d2;
  } finally { accBusy=false; } }
async function accNotePatch(fn, what){ const d2=await accPatch(d=>({...d, notes:fn(Array.isArray(d.notes) ? d.notes.slice() : [])}), what); if(!d2) return false; form.notes=d2.notes; return true; }
async function accNoteAdd(){ const text=accDraft.note.trim(), ph=accDraft.ph.slice(); if((!text && !ph.length) || accDraft.up) return; const me=accMe(), n={id:'n'+Date.now().toString(36), t:new Date().toISOString(), by:me, text}; if(ph.length) n.photos=ph;
  if(!await accNotePatch(L=>[...L, n].slice(-300), '메모 남김')) return;
  accDraft.note=''; accDraft.ph=[]; accSide(); toast('메모를 남겼습니다.');
  const o=accOwner(editRow.d, editRow.r);   // 담당자가 아닌 사람이 남겼으면 담당자의 나의 할일에 「메모 확인」 (아직 안 끝낸 것이 있으면 또 만들지 않음)
  if(o && o!==me && !accTasks(editRow.r.id).some(t=>t.d.accTag==='memo' && !accTaskDone(t.d))){ try{ await accTaskNew(editRow, '새 메모 확인', o, 'memo'); accSide(); }catch(_){} } }
// 메모에 붙일 사진: 분실물 사진과 같은 저장 (줄여서 올림 · opsboard.js phShrink · 5장까지)
async function accNotePhAdd(files){ const left=5-accDraft.ph.length; if(left<=0){ toast('사진은 메모 하나에 5장까지입니다.'); return; } accDraft.up++; accSide(); let fail='';
  for(const f of files.slice(0, left)){ try{ const s=await phShrink(f), j=await SY.call({action:'mentImgPut', name:'사고현황 메모 사진'+(s.mime==='image/png'?'.png':'.jpg'), mime:s.mime, data:s.data}); phCache[j.file.id]=s.url; accDraft.ph.push({id:j.file.id, name:j.file.name}); }catch(e){ fail=String(e.code||e.message||e); } }
  accDraft.up--; accSide(); if(fail) toast('사진을 올리지 못했습니다: '+fail); }
async function accStep(i){ const to=ACC_ST[i], from=accStatus(form); if(to===from) return;
  if(!accEd()){ form.status=to; accStageDate(form); paintForm(); return; }   // 새 접수: 화면에서만 바꿔 두고 「저장」할 때 같이 저장
  if(!accMine(editRow)) return;
  const d2=await accPatch(d=>{ d.status=to; accStageDate(d); return d; }, `단계 ${from} → ${to}`); if(!d2) return;
  form.status=to; ['rcptDate','visitDate','adjDate','procDate'].forEach(k=>{ if(!form[k] && d2[k]) form[k]=d2[k]; });
  paintForm(); toast(`단계를 「${to}」(으)로 바꿨습니다.`); if(to==='처리 완료') accTasksClose(editRow.r.id).then(accSide); }

// ---------- 보고 글 (보험사 전달용 「사고 경위 보고」 · 적어 둔 칸으로 만들어 복사) ----------
function accReport(d){ const L=['사고 경위 보고',''], line=(k,v)=>L.push(k+' : '+(v||'')), para=(t,v)=>{ if(v) L.push('', t, '', v); };
  let when=''; if(d.date){ const [y,m,dd]=d.date.split('-').map(Number); when=`${y}년 ${m}월 ${dd}일`; if(d.time){ const [h,mi]=d.time.split(':').map(Number); when+=` ${h<12?'오전':'오후'} ${(h%12)||12}시${mi?' '+mi+'분':''}경`; } }
  line('사고 일시', when); line('사고 장소', [d.place, d.addr].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')); line('방문 단체', [d.group, d.visitType].filter(Boolean).join(' · '));
  line('사고 대상자 성명', [d.person, d.personNote ? '('+d.personNote+')' : ''].filter(Boolean).join(' ')); line('사고 대상자 연락처', d.phone);
  line('대표 예약자', [d.booker, d.bookerPhone].filter(Boolean).join(' '));
  if(d.injury) line('부상 부위', d.injury); if(d.accNo) line('사고번호', d.accNo); if(d.policyNo) line('증권번호', d.policyNo);
  para('사고 내용', [d.what, d.action, d.after].filter(Boolean).join('\n\n'));
  para('추가 내용', [d.claim, +d.claimAmt ? '고객 측 청구 금액: '+accWon(d.claimAmt)+'원' : ''].filter(Boolean).join('\n\n'));
  if(d.cctv && d.cctv!=='미확인') para('CCTV', '사고 장소 CCTV '+d.cctv+(d.cctvKept && d.cctvKept!=='미확인' ? ' / 영상 '+d.cctvKept : ''));
  return L.join('\n'); }

// ---------- 창 안의 단추들 ----------
document.addEventListener('input', e=>{ const t=e.target; if(t.id==='accTkIn') accDraft.tk=t.value; else if(t.id==='accNoteIn') accDraft.note=t.value; else if(t.id==='accNoteEd') accDraft.edTx=t.value; });
document.addEventListener('change', async e=>{ const t=e.target;
  if(t.id==='accTkWho'){ accDraft.who=t.value; return; }
  if(t.id==='accShowDone'){ accShowDone=t.checked; if(!accShowDone && filter==='처리 완료') filter='all'; render(); return; }
  if(t.id==='accNotePh'){ const files=[...(t.files||[])]; t.value=''; if(files.length) accNotePhAdd(files); return; }
  if(t.dataset && t.dataset.acctk && accEd()){ const k=accTasks(editRow.r.id).find(x=>x.r.id===t.dataset.acctk); if(!k) return; try{ await accTaskCheck(k, t.checked); }catch(err){ accFail(err); } accSide(); return; }
  const sel=t.closest && t.closest('select[data-accst]'); if(!sel) return;   // 목록에서 바로 단계 바꾸기 (담당자만 고르기가 보임)
  const x=rows.find(y=>y.r.id===sel.dataset.accst); if(!x) return; const from=accStatus(x.d), to=sel.value; if(from===to) return;
  const d={...x.d, status:to}; accStageDate(d);
  const ok=await putRow({...x, d}, `단계 ${from} → ${to}`); if(ok!==false){ toast(`단계를 「${to}」(으)로 바꿨습니다.`); if(to==='처리 완료') accTasksClose(x.r.id); } });
async function accTkAdd(){ const title=accDraft.tk.trim(); if(!title || !accEd() || !accMine(editRow)) return; const who=accDraft.who || accOwner(form, editRow.r) || accMe();
  try{ await accTaskNew({r:editRow.r, d:form}, title, who, ''); accDraft.tk=''; accSide(); toast(`「${who}」님의 나의 할일에 올렸습니다.`); document.getElementById('accTkIn')?.focus(); }catch(err){ accFail(err); } }
document.addEventListener('keydown', e=>{ if(e.key!=='Enter' || e.isComposing) return;
  if(e.target.id==='accTkIn'){ e.preventDefault(); accTkAdd(); }
  else if(e.target.id==='accNoteIn' && !e.shiftKey){ e.preventDefault(); accNoteAdd(); } });
// 메모 칸에 사진을 붙여 넣으면(Ctrl+V) 그 메모에 붙임 — 공통 엔진의 붙여넣기(현장 사진 칸)보다 먼저 받음
document.addEventListener('paste', e=>{ if(!e.target || e.target.id!=='accNoteIn') return; const files=[...(e.clipboardData?.files||[])].filter(x=>/^image\//.test(x.type)); if(!files.length) return;
  e.preventDefault(); e.stopImmediatePropagation(); accNotePhAdd(files); }, true);
document.addEventListener('click', async e=>{ const t=e.target, me=accMe(); if(!t.closest) return;
  const tb=t.closest('[data-acctab]'); if(tb){ accTab=tb.dataset.acctab; accSide(); return; }
  const sp=t.closest('[data-accstep]'); if(sp){ accStep(+sp.dataset.accstep); return; }
  if(t.id==='accTkAdd'){ accTkAdd(); return; }
  if(t.id==='accNoteAdd'){ accNoteAdd(); return; }
  if(t.dataset.accphdel){ accDraft.ph.splice(+t.dataset.accphdel, 1); accSide(); return; }
  if(t.dataset.accview && t.src){ phOpen(t.src); return; }
  if(t.dataset.accnedit){ const n=(form.notes||[]).find(x=>x.id===t.dataset.accnedit); if(n){ accDraft.edit=n.id; accDraft.edTx=n.text||''; accSide(); document.getElementById('accNoteEd')?.focus(); } return; }
  if(t.id==='accNoteEdNo'){ accDraft.edit=''; accSide(); return; }
  if(t.id==='accNoteEdOk'){ const id=accDraft.edit, text=accDraft.edTx.trim(); if(!text) return; if(await accNotePatch(L=>L.map(n=>n.id===id && n.by===me ? {...n, text, ed:{t:new Date().toISOString(), by:me}} : n), '메모 고침')){ accDraft.edit=''; accSide(); } return; }
  if(t.dataset.accndel){ const id=t.dataset.accndel; if(await accNotePatch(L=>L.map(n=>n.id===id && n.by===me ? {...n, del:{t:new Date().toISOString(), by:me}} : n), '메모 지움')) accSide(); return; }
  if(t.id==='accCopy'){ try{ await navigator.clipboard.writeText(accReport(form)); toast('보고 글을 복사했습니다.'); }catch(_){ toast('복사하지 못했습니다.'); } return; } });

// ---------- 목록 (opsboard.js 의 render 가 부름) — PC = 표 · 휴대폰(700px 아래) = 카드 ----------
//  위: 「전체」(처리 완료가 아닌 것만 · 「완료된 것도 보기」를 켜면 모두) + 단계가 이어지는 흐름(접수 › 보험 접수 › … › 처리 완료 · 누르면 그 단계만)
let accYear='', accShowDone=false;
const ACC_MQ = matchMedia('(max-width:700px)');
ACC_MQ.addEventListener('change', ()=>{ if(typeof render==='function') render(); });
document.body.classList.add('pg-acc');
const accTag = s => `<span class="acc-tag s${ACC_ST.indexOf(s)}">${esc(s)}</span>`;
function accRender(hit){
  if(filter==='open') filter='all';
  if(!document.getElementById('accYear')){ $('#q').insertAdjacentHTML('beforebegin', '<select id="accYear" class="q-kind" title="사고가 난 해"></select>'); $('#accYear').addEventListener('change', e=>{ accYear=e.target.value; render(); }); }
  const years=[...new Set(rows.map(x=>String(x.d.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse(); if(accYear && !years.includes(accYear)) accYear='';
  $('#accYear').innerHTML=`<option value="">전체 연도</option>${years.map(y=>`<option${y===accYear?' selected':''}>${y}</option>`).join('')}`;
  const base=rows.filter(x=>!accYear || String(x.d.date||'').startsWith(accYear)), shown=x=>{ const s=accStatus(x.d); return filter==='all' ? (accShowDone || s!=='처리 완료') : s===filter; };
  const chip=(v,l,n)=>`<button type="button" class="chip${filter===v?' on':''}" data-f="${esc(v)}">${esc(l)} <small>${n}</small></button>`;
  $('#filters').innerHTML=chip('all','전체', base.filter(x=>accShowDone || accStatus(x.d)!=='처리 완료').length)
    + `<span class="acc-flow">${ACC_ST.map((s,i)=>chip(s, ACC_SHORT[i], base.filter(x=>accStatus(x.d)===s).length)).join('<i aria-hidden="true">›</i>')}</span>`
    + `<label class="acc-done"><input type="checkbox" id="accShowDone"${accShowDone?' checked':''}> 완료된 것도 보기</label>`;
  $('#bSum').textContent=OPS_PAGE.hint;
  const list=base.filter(x=>hit(x.d) && shown(x))
    .sort((a,b)=>String(b.d.date||'').localeCompare(String(a.d.date||'')) || String(b.d.time||'').localeCompare(String(a.d.time||'')) || String(b.r.saved).localeCompare(String(a.r.saved)));
  if(!list.length){ $('#list').innerHTML=`<p class="empty">${rows.length ? '조건에 맞는 사고가 없습니다.' : '아직 접수된 사고가 없습니다.'}</p>`; return; }
  const days=x=>{ if(accStatus(x.d)==='처리 완료') return ''; const n=accDays(x.d); return n==null ? '' : `<small class="acc-age${n>60?' warn':''}">지난 ${n}일</small>`; };
  const what=d=>String(d.what||'').split('\n')[0].slice(0,40);
  if(ACC_MQ.matches){ $('#list').innerHTML=`<div class="acc-cards">${list.map(x=>{ const d=x.d, s=accStatus(d);
      return `<div class="acc-card${s==='처리 완료'?' closed':''}" data-edit="${esc(x.r.id)}" role="button" tabindex="0"><div class="ac-t">${accTag(s)}<b>${esc(accWhen(d))}</b>${days(x)}</div>${accMini(d)}<div class="ac-p">${esc([d.place, d.type].filter(Boolean).join(' · '))}</div>${what(d)?`<div class="ac-w">${esc(what(d))}</div>`:''}<div class="ac-o">담당 ${esc(accOwner(d, x.r))}${accMine(x)?'':' · 보기 · 메모만'}</div></div>`; }).join('')}</div>`; return; }
  $('#list').innerHTML=`<div class="acc-tw"><table class="tbl acc-tbl"><thead><tr><th>사고 일시</th><th>장소</th><th>구분</th><th>사고 대상자</th><th>사고 내용</th><th>담당자</th><th>단계</th><th></th></tr></thead><tbody>${list.map(x=>{ const d=x.d, s=accStatus(d), mine=accMine(x);
    return `<tr class="${s==='처리 완료'?'closed':''}"><td class="nw">${esc(accWhen(d))}</td><td>${esc(d.place||'')}</td><td class="nw">${esc(d.type||'')}</td><td>${esc(d.person||'')}</td><td>${esc(what(d))}</td><td class="nw">${esc(accOwner(d, x.r))}</td>`
      + `<td class="nw">${mine ? `<select class="lost-st acc-st s${ACC_ST.indexOf(s)}" data-accst="${esc(x.r.id)}" title="단계 바꾸기">${ACC_ST.map(o=>`<option${o===s?' selected':''}>${esc(o)}</option>`).join('')}</select>` : accTag(s)}${accMini(d)}${days(x)}</td>`
      + `<td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">${mine?'열기':'보기'}</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

const ACC_PLACES = ['소대','쉼자리길','가가빈빈','현암','소요헌','남명','별유동천','소백세심대','몽몽마방','몽몽차방','곡신문','주차장','매표소'];
const OPS_PAGE =
{ key:'accident', title:'사고현황 접수', add:'사고 접수', hint:'', members:true,
    fields:[
      // 묶음 제목의 col = 창의 몇째 열 (2026-11-28 · 단체 화면처럼 3열 · opsboard.js paintForm) — 새로 접수: 개요 | 대상자 | 내용 · 고칠 때: 사고 내용(세 묶음) | 뒤처리 · 보험 | 진행(단계 · 추후과업 · 메모 = #accSide)
      {type:'head', l:'① 접수 · 사고 개요', col:1},
      {k:'date', l:'사고 일자', type:'date', def:()=>opsToday(), req:()=>!accEd()}, {k:'time', l:'사고 시각', type:'time'},
      {k:'type', l:'구분', type:'select', opts:['부상','시설 파손','분실 · 도난','민원','기타'], def:()=>'부상'},
      {k:'visitType', l:'방문 유형', type:'select', opts:['','단체','개인','도슨트 투어','몽몽마방 식사','기타'], def:()=>''},
      {k:'place', l:'사고 장소 (사유원 안)', type:'text', ph:'고르거나 직접 적기 · 예: 소요헌 안 계단', list:ACC_PLACES, req:()=>!accEd()}, {k:'group', l:'방문 단체', type:'text', ph:'단체 이름 (개인이면 비움)'},
      {k:'owner', def:()=>accMe(), html:()=>'<i class="ef-none"></i>'},   // 담당자: 칸은 제목 줄 오른쪽(#accOwnerSel · 아래 「제목 줄의 담당자」) — 여기는 처음 값(접수한 사람)만

      {type:'head', l:'사고 대상자 · 대표 예약자', col:1},
      {k:'person', l:'사고 대상자 이름', type:'text'}, {k:'phone', l:'사고 대상자 연락처', ...accTel('사고 대상자 연락처')},
      {k:'personNote', l:'대상자 비고 (성별 · 연령대 등)', type:'text', w:2},
      {k:'bookerSame', w:2, html:d=>`<label class="acc-same"><input type="checkbox" id="accSame"${d.bookerSame?' checked':''}> 대표 예약자가 사고 대상자와 같음</label>`},   // 체크하면 대표 예약자 이름 · 연락처 = 사고 대상자의 것 (적는 대로 따라감 · 아래 「대표 예약자 = 사고 대상자」)
      {k:'booker', l:'대표 예약자 이름', type:'text'}, {k:'bookerPhone', l:'대표 예약자 연락처', ...accTel('대표 예약자 연락처')},
      {k:'erp', l:'상품 정보', type:'textarea', w:2, ph:'전산의 상품 정보를 복사해 붙여 넣기'},   // 전산의 예약 상품 내역 (방문일자 · 상품 · 인원 · 금액) — 붙여 넣으면 방문자 이름 · 연락처를 비어 있는 대표 예약자 칸에 넣음

      {type:'head', l:'사고 내용', col:1},
      {k:'what', l:'사고 내용', type:'textarea', w:2},
      {k:'injury', l:'부상 부위 · 진단', type:'text'}, {k:'staff', l:'현장 대응 직원', type:'text', def:()=>accMe()},
      {k:'action', l:'현장 조치', type:'textarea', w:2},
      {k:'after', l:'이후 경과 (병원 진료 등)', type:'textarea', w:2},
      {k:'witness', l:'목격자 · 동행인', type:'text', w:2},
      {k:'photos', l:'현장 사진 (없어도 됨)', type:'photos', w:2},
      {k:'cctv', l:'사고 장소 CCTV', type:'select', opts:['미확인','있음','없음'], def:()=>'미확인'}, {k:'cctvKept', l:'CCTV 영상 확보', type:'select', opts:['미확인','확보함','미확보','해당 없음'], def:()=>'미확인'},
      {k:'memo', l:'내부 메모', type:'textarea', w:2},

      // 가운데 열 = 진행 단계별 묶음 (2026-11-28 · sec = 그 단계의 순서 1~4 — 지금 단계보다 뒤의 묶음은 접혀 있고 제목을 누르면 펼쳐짐 · 아래 「단계별 묶음 접기」). 저장 이름은 그대로 · 놓인 자리만 바뀜
      {type:'head', l:'② 보험 접수', col:2, sec:1},
      {k:'rcptDate', l:'보험 접수일', type:'date'}, {k:'product', l:'보험 상품명', type:'text', list:['영업배상책임보험','생산물배상책임보험(Ⅰ)']},
      {k:'accNo', l:'사고번호', type:'text'}, {k:'policyNo', l:'증권번호', type:'text'},
      {k:'insCause', l:'사고원인 (보험사 기준)', type:'text', list:['치료비','파손','품질불량','주차장사고']}, {k:'insType', l:'사고유형 (보험사 기준)', type:'text', list:['배상책임','생산물(PL)']},
      {k:'lossObj', l:'손해목적', type:'text', list:['대인(배상책임)','대물(배상책임)']}, {k:'claimAmt', l:'고객 측 청구 금액 (원)', type:'num'},
      {k:'addr', l:'사고 장소 (주소 · 보험사에 낸 것)', type:'text', w:2},
      {k:'claim', l:'고객 요청 사항 · 안내한 내용', type:'textarea', w:2},
      {k:'evidence', l:'확보 자료', type:'text', ph:'진단서 · 영수증 · 사진 등', w:2},

      {type:'head', l:'③ 손해사정사 현장 방문', col:2, sec:2},
      {k:'visitDate', l:'손해사정사 현장 방문일', type:'date'}, {k:'adjuster', l:'위임업체 (손해사정)', type:'text'},
      {k:'visitNote', l:'현장 방문 메모', type:'text', ph:'담당 손해사정사 · 방문 시간', w:2},

      {type:'head', l:'④ 손해사정중', col:2, sec:3},
      {k:'adjDate', l:'손해사정 시작일', type:'date'}, {k:'examiner', l:'심사자', type:'text'},
      {k:'insStatus', l:'보험사 진행상태', type:'text', list:['사고조사','보상종결','면책종결']}, {k:'diagnosis', l:'진단명', type:'text'},

      {type:'head', l:'⑤ 처리 완료', col:2, sec:4},
      {k:'procDate', l:'처리 완료일', type:'date'}, {k:'payout', l:'보험금 (원)', type:'num'},
      {k:'cause', l:'사고 사유', type:'textarea', w:2},
      {k:'prevent', l:'재발 방지 대책', type:'textarea', w:2} ],
    cols:[['date','사고 일시'],['place','장소'],['type','구분'],['status','단계']],
    status:'status', open:ACC_OPEN, summary:d=>`${d.type||''} ${d.place||''} · ${accStatus(d)}`.trim(),
    render:accRender,
    owner:(d, r)=>accOwner(d, r),
    lockBy:row=>accMine(row) ? '' : accOwner(row.d, row.r),
    normalize:d=>{ d.status=accStatus(d); if(accEd() && !d.owner) d.owner=accOwner(d, editRow.r); delete d._tasks; delete d._notes; delete d._copy; },
    onField:(k, d)=>{ if(k==='status') accStageDate(d); },
    afterPaint:(f, row, ro)=>{ accSidePaint(row, ro); accSameLock(); accOwnerPaint(ro); accSecPaint(); const h=document.getElementById('accLock'); if(h){ h.hidden=!ro; h.textContent = ro ? `담당자 ${ro} · 보기와 메모만 됩니다` : ''; } },
    // 저장한 뒤: 새 사고 = 담당자의 나의 할일에 한 건 · 담당자를 바꿨으면 남은 과업을 새 담당자에게 · 처리 완료면 남은 과업을 끝냄
    afterSave:async (nr, was)=>{ accGo=nr.r.id; try{ const o=accOwner(nr.d, nr.r), id=nr.r.id;
        if(!was){ if(accStatus(nr.d)==='처리 완료') return; await accTaskNew(nr, '접수 확인 · 보험 접수 여부 정하기', o, 'new'); if(accEd() && editRow.r.id===id) accSide(); return; }
        const po=accOwner(was.d, was.r);
        if(accStatus(nr.d)==='처리 완료'){ await accTasksClose(id); return; }
        if(po!==o){ const open=accTasks(id).filter(t=>!accTaskDone(t.d) && t.d.owner===po);
          for(const t of open) await accTaskPut({...t.r, owner:o}, t.j, {...t.d, owner:o}, `담당자 ${po} → ${o}`);
          if(!open.length) await accTaskNew(nr, '담당자로 지정됨 · 내용 확인', o, 'owner'); } }catch(e){ accFail(e); } },
    afterDel:row=>{ accTasksClose(row.r.id); if(!accEd() || editRow.r.id===row.r.id) openEdit(null); } };

// ---------- 첫 화면 = 사고 한 건을 접수 · 고치는 곳 · 목록은 헤더의 「사고 목록」 (2026-11-28 · 단체 화면처럼) ----------
//  공통 엔진(opsboard.js)은 저장 · 삭제 · Esc 때 #editModal 을 숨긴다 — 이 화면에서는 늘 떠 있어야 하므로 숨겨지면 바로 다시 보인다:
//   저장한 뒤 = 저장한 그 사고를 다시 엶(accGo) · 삭제한 뒤 = 빈 새 접수(afterDel) · 그 밖(Esc 등) = 적던 것 그대로 다시 보임
let accGo='';
const accListEl = () => document.getElementById('accListModal');
function accListOpen(on){ accListEl().hidden=!on; if(on){ if(typeof pull==='function') pull(); setTimeout(()=>$('#q')?.focus(), 0); } }
new MutationObserver(()=>{ const m=document.getElementById('editModal'); if(!m.hidden) return;
  if(accGo){ const id=accGo; accGo=''; const x=rows.find(y=>y.r.id===id) || (putRow.last && putRow.last.r.id===id ? putRow.last : null); if(x){ openEdit(x); return; } }
  m.hidden=false; }).observe(document.getElementById('editModal'), {attributes:true, attributeFilter:['hidden']});
document.addEventListener('DOMContentLoaded', ()=>{ $('#bTitle').textContent='사고 목록';
  if(new URLSearchParams(location.search).get('open')) setTimeout(()=>{ if(document.getElementById('editModal').hidden) openEdit(null); }, 4000);   // ?open=기록 은 공통 엔진이 목록을 받은 뒤에 엶 · 못 찾으면 빈 접수
  else openEdit(null); });
document.addEventListener('click', e=>{ const t=e.target; if(!t.closest) return;
  if(t.id==='accListBtn'){ accListOpen(true); return; }
  if(t.id==='accNewBtn'){ openEdit(null); return; }
  if(t.id==='accListX' || t.id==='addBtn' || t.closest('#accListModal [data-edit]')){ accListOpen(false); return; }
 });
document.addEventListener('mousedown', e=>{ if(e.target.id==='accListModal') accListOpen(false); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !accListEl().hidden && $('#askModal').hidden) accListOpen(false); }, true);
// ---------- 대표 예약자 = 사고 대상자 (체크) · 상품 정보 붙여넣기 (2026-11-28) ----------
//  체크(d.bookerSame)해 두면 대표 예약자 이름 · 연락처 칸은 잠기고 사고 대상자 칸을 따라간다. 체크를 풀면 값은 남고 다시 고칠 수 있다.
function accSameCopy(){ if(!form.bookerSame) return; form.booker=form.person||''; form.bookerPhone=form.phone||'';
  const a=document.getElementById('e_booker'), b=document.getElementById('e_bookerPhone'); if(a) a.value=form.booker; if(b) b.value=form.bookerPhone; }
function accSameLock(){ if(!form.bookerSame) return; ['e_booker','e_bookerPhone'].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled=true; }); }
document.addEventListener('change', e=>{ const t=e.target; if(t.id==='accSame'){ form.bookerSame=t.checked; accSameCopy(); paintForm(); return; }
  if(t.dataset && (t.dataset.k==='person' || t.dataset.k==='phone')){ accSameCopy(); return; }
  // 상품 정보를 붙여 넣으면: 「방문자정보 이름(연락처)」 줄에서 대표 예약자를 채움 (비어 있을 때만 · 「같음」을 체크했으면 건드리지 않음)
  if(t.dataset && t.dataset.k==='erp' && !form.bookerSame && !form.booker && !form.bookerPhone){ const m=/방문자\s*정보\s*([^\s(（]+)\s*[(（]\s*([\d\- ]{8,})\s*[)）]/.exec(form.erp||'');
    if(m){ form.booker=m[1]; form.bookerPhone=(SY.fmtPhone && SY.fmtPhone(m[2])) || m[2].trim(); paintForm(); } } });
document.addEventListener('input', e=>{ const k=e.target.dataset && e.target.dataset.k; if(k==='person' || k==='phone') accSameCopy(); });
document.addEventListener('focusout', e=>{ if(e.target.dataset && e.target.dataset.k==='phone') setTimeout(accSameCopy, 0); });

// ---------- 제목 줄의 담당자 (2026-11-28 · 사고 개요에서 꺼내 제목 줄 오른쪽 「삭제」 · 「저장」 옆으로) ----------
//  고르면 form.owner 만 바뀌고 「저장」을 눌러야 저장된다 (남은 추후과업을 새 담당자에게 넘기는 것은 OPS_PAGE.afterSave). 담당자가 아닌 사람에게는 잠겨 보인다.
function accOwnerPaint(ro){ const s=document.getElementById('accOwnerSel'); if(!s) return; const v=form.owner || (accEd() ? accOwner(form, editRow.r) : accMe());
  s.innerHTML=[...new Set([...(window.opsMembers||[]), accMe(), v].filter(Boolean))].map(n=>`<option${n===v?' selected':''}>${esc(n)}</option>`).join(''); s.disabled=!!ro; }
document.addEventListener('change', e=>{ if(e.target.id==='accOwnerSel') form.owner=e.target.value; });

// ---------- 단계별 묶음 접기 (2026-11-28 · 가운데 열의 ② ~ ⑤ = 진행 단계 · 묶음 제목 칸의 sec) ----------
//  지금 단계까지의 묶음은 펼쳐져 있고 그 뒤 단계의 묶음은 접혀 있다(제목만). 제목을 누르면 펼치고 접는다 — 사고마다 누른 대로 기억(다른 사고를 열면 처음으로)
let accSecId='', accSecSet={};
function accSecPaint(){ const rid=accEd() ? editRow.r.id : 'new'; if(accSecId!==rid){ accSecId=rid; accSecSet={}; }
  const cur=ACC_ST.indexOf(accStatus(form));
  document.querySelectorAll('#eFields .ef-sec[data-sec]').forEach(s=>{ const n=+s.dataset.sec, open=(n in accSecSet) ? accSecSet[n] : n<=cur;
    s.classList.toggle('shut', !open); s.classList.toggle('st-cur', n===cur); s.classList.toggle('st-done', n<cur);
    const h=s.querySelector('.ef-head'); if(h){ h.tabIndex=0; h.setAttribute('role','button'); h.setAttribute('aria-expanded', open ? 'true' : 'false'); } }); }
function accSecToggle(h){ const s=h.closest('.ef-sec[data-sec]'); if(!s) return; accSecSet[+s.dataset.sec]=s.classList.contains('shut'); accSecPaint(); }
document.addEventListener('click', e=>{ const h=e.target.closest && e.target.closest('#eFields .ef-sec[data-sec] > .ef-head'); if(h) accSecToggle(h); });
document.addEventListener('keydown', e=>{ if((e.key==='Enter' || e.key===' ') && e.target.matches && e.target.matches('#eFields .ef-sec[data-sec] > .ef-head')){ e.preventDefault(); accSecToggle(e.target); } });
