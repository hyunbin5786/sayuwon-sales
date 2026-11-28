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

function accTasksHTML(){ if(!accEd()) return ''; const id=editRow.r.id, me=accMe(), mine=accMine(editRow), L=accTasks(id);
  return `<label>추후과업 <small class="acc-sub">맡은 사람의 「나의 할일」에 뜹니다</small></label>`
    + (L.length ? `<ul class="acc-tasks lock-ok">${L.map(t=>{ const dn=accTaskDone(t.d), can=mine || t.d.owner===me;
        return `<li class="${dn?'done':''}"><label><input type="checkbox" data-acctk="${esc(t.r.id)}"${dn?' checked':''}${can?'':' disabled'}><span>${esc(accTaskName(t.d))}</span></label><small>${esc(t.d.owner||'')} · ${dn?'완료':'마감 '+esc(opsDateLabel(accTaskDay(t.d)))}</small></li>`; }).join('')}</ul>` : `<p class="acc-none">아직 추후과업이 없습니다.</p>`)
    + `<div class="acc-add"><input id="accTkIn" data-ime="ko" placeholder="할 일 (적고 Enter)" autocomplete="off" value="${esc(accDraft.tk)}"><select id="accTkWho" title="맡을 사람">${[...new Set([accOwner(form, editRow.r), me, ...(window.opsMembers||[])].filter(Boolean))].map(n=>`<option${n===(accDraft.who||accOwner(form, editRow.r))?' selected':''}>${esc(n)}</option>`).join('')}</select><button type="button" class="btn primary" id="accTkAdd">추가</button></div>`; }

// ---------- 처리 이력 · 메모 (d.notes = [{id, t, by, text, del:{t,by}}] · 누구나 남김 · 지우는 것은 자기 것만 — 줄을 없애지 않고 표시) ----------
const accDraft = {tk:'', who:'', note:''};
const accNoteWhen = t => { const x=new Date(t); return isNaN(x) ? '' : `${opsDateLabel(opsYmd(x))} ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };
function accNotesHTML(){ if(!accEd()) return ''; const me=accMe(), L=Array.isArray(form.notes) ? form.notes : [];
  return `<label>처리 이력 · 메모 <small class="acc-sub">보험사 접수 · 손해사정 연락 · 고객 안내 같은 진행을 남깁니다 · 담당자가 아니어도 남길 수 있습니다</small></label>`
    + (L.length ? `<ol class="acc-notes lock-ok">${L.map(n=>`<li class="acc-note${n.del?' del':''}"><div class="an-h"><b>${esc(n.by||'')}</b><span>${esc(accNoteWhen(n.t))}</span>${n.del ? '<span>지움</span>' : n.by===me ? `<button type="button" class="an-x" data-accndel="${esc(n.id)}">지우기</button>` : ''}</div><div class="an-t">${esc(n.text||'')}</div></li>`).join('')}</ol>` : `<p class="acc-none">아직 남긴 메모가 없습니다.</p>`)
    + `<div class="acc-add lock-ok"><textarea id="accNoteIn" data-ime="ko" rows="2" placeholder="예: 손해사정사 현장 조사 일정 확정 (Enter 로 남기기 · 줄바꿈은 Shift+Enter)">${esc(accDraft.note)}</textarea><button type="button" class="btn primary" id="accNoteAdd">메모 남기기</button></div>`; }
// 메모는 바로 저장: 서버의 지금 내용을 다시 받아 그 위에 메모만 더함 (창에서 고치던 다른 칸은 「저장」을 눌러야 저장됨)
let accBusy=false;
async function accNoteSave(fn, what){ if(!accEd() || accBusy) return false; accBusy=true;
  try{ const id=editRow.r.id; await pull();
    const x=rows.find(y=>y.r.id===id); if(!x){ toast('이 사고 기록을 찾지 못했습니다 (지워졌을 수 있습니다).'); return false; }
    const notes=fn(Array.isArray(x.d.notes) ? x.d.notes.slice() : []);
    const ok=await putRow({...x, d:{...x.d, notes}}, what); if(ok===false) return false;
    editRow=putRow.last; form.notes=notes; return true;
  } finally { accBusy=false; } }
async function accNoteAdd(){ const text=accDraft.note.trim(); if(!text) return; const me=accMe(), n={id:'n'+Date.now().toString(36), t:new Date().toISOString(), by:me, text};
  if(!await accNoteSave(L=>[...L, n].slice(-200), '메모 남김')) return;
  accDraft.note=''; paintForm(); toast('메모를 남겼습니다.');
  const o=accOwner(editRow.d, editRow.r);   // 담당자가 아닌 사람이 남겼으면 담당자의 나의 할일에 「메모 확인」 (아직 안 끝낸 것이 있으면 또 만들지 않음)
  if(o && o!==me && !accTasks(editRow.r.id).some(t=>t.d.accTag==='memo' && !accTaskDone(t.d))){ try{ await accTaskNew(editRow, '새 메모 확인', o, 'memo'); paintForm(); }catch(_){} } }

// ---------- 보고 글 (보험사 전달용 「사고 경위 보고」 · 적어 둔 칸으로 만들어 복사) ----------
function accReport(d){ const L=['사고 경위 보고',''], line=(k,v)=>L.push(k+' : '+(v||'')), para=(t,v)=>{ if(v) L.push('', t, '', v); };
  let when=''; if(d.date){ const [y,m,dd]=d.date.split('-').map(Number); when=`${y}년 ${m}월 ${dd}일`; if(d.time){ const [h,mi]=d.time.split(':').map(Number); when+=` ${h<12?'오전':'오후'} ${(h%12)||12}시${mi?' '+mi+'분':''}경`; } }
  line('사고 일시', when); line('사고 장소', [d.place, d.addr].filter(Boolean).join(' / ')); line('방문 단체', [d.group, d.visitType].filter(Boolean).join(' · '));
  line('사고 대상자 성명', [d.person, d.personNote ? '('+d.personNote+')' : ''].filter(Boolean).join(' ')); line('사고 대상자 연락처', d.phone);
  line('대표 예약자', [d.booker, d.bookerPhone].filter(Boolean).join(' '));
  if(d.injury) line('부상 부위', d.injury); if(d.accNo) line('사고번호', d.accNo); if(d.policyNo) line('증권번호', d.policyNo);
  para('사고 내용', [d.what, d.action, d.after].filter(Boolean).join('\n\n'));
  para('추가 내용', [d.claim, +d.claimAmt ? '고객 측 청구 금액: '+accWon(d.claimAmt)+'원' : ''].filter(Boolean).join('\n\n'));
  if(d.cctv && d.cctv!=='미확인') para('CCTV', '사고 장소 CCTV '+d.cctv+(d.cctvKept && d.cctvKept!=='미확인' ? ' / 영상 '+d.cctvKept : ''));
  return L.join('\n'); }

// ---------- 창 안의 단추들 ----------
document.addEventListener('input', e=>{ const t=e.target; if(t.id==='accTkIn') accDraft.tk=t.value; else if(t.id==='accNoteIn') accDraft.note=t.value; });
document.addEventListener('change', async e=>{ const t=e.target;
  if(t.id==='accTkWho'){ accDraft.who=t.value; return; }
  if(t.dataset && t.dataset.acctk && accEd()){ const k=accTasks(editRow.r.id).find(x=>x.r.id===t.dataset.acctk); if(!k) return; try{ await accTaskCheck(k, t.checked); }catch(err){ accFail(err); } paintForm(); return; }
  const sel=t.closest && t.closest('select[data-accst]'); if(!sel) return;   // 목록에서 바로 단계 바꾸기 (담당자만 고르기가 보임)
  const x=rows.find(y=>y.r.id===sel.dataset.accst); if(!x) return; const from=accStatus(x.d), to=sel.value; if(from===to) return;
  const d={...x.d, status:to}; accStageDate(d);
  const ok=await putRow({...x, d}, `단계 ${from} → ${to}`); if(ok!==false){ toast(`단계를 「${to}」(으)로 바꿨습니다.`); if(to==='처리 완료') accTasksClose(x.r.id); } });
async function accTkAdd(){ const title=accDraft.tk.trim(); if(!title || !accEd() || !accMine(editRow)) return; const who=accDraft.who || accOwner(form, editRow.r) || accMe();
  try{ await accTaskNew({r:editRow.r, d:form}, title, who, ''); accDraft.tk=''; paintForm(); toast(`「${who}」님의 나의 할일에 올렸습니다.`); document.getElementById('accTkIn')?.focus(); }catch(err){ accFail(err); } }
document.addEventListener('keydown', e=>{ if(e.key!=='Enter' || e.isComposing) return;
  if(e.target.id==='accTkIn'){ e.preventDefault(); accTkAdd(); }
  else if(e.target.id==='accNoteIn' && !e.shiftKey){ e.preventDefault(); accNoteAdd(); } });
document.addEventListener('click', async e=>{ const t=e.target;
  if(t.id==='accTkAdd'){ accTkAdd(); return; }
  if(t.id==='accNoteAdd'){ accNoteAdd(); return; }
  if(t.dataset && t.dataset.accndel){ const id=t.dataset.accndel, me=accMe(); if(await accNoteSave(L=>L.map(n=>n.id===id && n.by===me ? {...n, del:{t:new Date().toISOString(), by:me}} : n), '메모 지움')) paintForm(); return; }
  if(t.id==='accCopy'){ try{ await navigator.clipboard.writeText(accReport(form)); toast('보고 글을 복사했습니다. 메일이나 메신저에 붙여 넣으세요.'); }catch(_){ toast('복사하지 못했습니다.'); } return; } });

// ---------- 목록 (opsboard.js 의 render 가 부름) — PC = 표 · 휴대폰(700px 아래) = 카드 ----------
let accYear='';
const ACC_MQ = matchMedia('(max-width:700px)');
ACC_MQ.addEventListener('change', ()=>{ if(typeof render==='function') render(); });
document.body.classList.add('pg-acc');
const accTag = s => `<span class="acc-tag s${ACC_ST.indexOf(s)}">${esc(s)}</span>`;
function accRender(hit){
  if(!document.getElementById('accYear')){ $('#q').insertAdjacentHTML('beforebegin', '<select id="accYear" class="q-kind" title="사고가 난 해"></select>'); $('#accYear').addEventListener('change', e=>{ accYear=e.target.value; render(); }); }
  const years=[...new Set(rows.map(x=>String(x.d.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse(); if(accYear && !years.includes(accYear)) accYear='';
  $('#accYear').innerHTML=`<option value="">전체 연도</option>${years.map(y=>`<option${y===accYear?' selected':''}>${y}</option>`).join('')}`;
  const base=rows.filter(x=>!accYear || String(x.d.date||'').startsWith(accYear)), cnt=v=>v==='all' ? base.length : v==='open' ? base.filter(x=>accStatus(x.d)!=='처리 완료').length : base.filter(x=>accStatus(x.d)===v).length;
  $('#filters').innerHTML=[['open','진행 중'],['all','전체'], ...ACC_ST.map(s=>[s,s])].map(([v,l])=>`<button type="button" class="chip${filter===v?' on':''}" data-f="${esc(v)}">${esc(l)} <small>${cnt(v)}</small></button>`).join('');
  $('#bSum').textContent=OPS_PAGE.hint;
  const list=base.filter(x=>{ const s=accStatus(x.d); return hit(x.d) && (filter==='all' || (filter==='open' ? s!=='처리 완료' : s===filter)); })
    .sort((a,b)=>String(b.d.date||'').localeCompare(String(a.d.date||'')) || String(b.d.time||'').localeCompare(String(a.d.time||'')) || String(b.r.saved).localeCompare(String(a.r.saved)));
  if(!list.length){ $('#list').innerHTML=`<p class="empty">${rows.length ? '조건에 맞는 사고가 없습니다.' : '아직 접수된 사고가 없습니다. 「＋ 사고 접수」로 넣어 주세요.'}</p>`; return; }
  const days=x=>{ if(accStatus(x.d)==='처리 완료') return ''; const n=accDays(x.d); return n==null ? '' : `<small class="acc-age${n>60?' warn':''}">지난 ${n}일</small>`; };
  const what=d=>String(d.what||'').split('\n')[0].slice(0,40);
  if(ACC_MQ.matches){ $('#list').innerHTML=`<div class="acc-cards">${list.map(x=>{ const d=x.d, s=accStatus(d);
      return `<div class="acc-card${s==='처리 완료'?' closed':''}" data-edit="${esc(x.r.id)}" role="button" tabindex="0"><div class="ac-t">${accTag(s)}<b>${esc(accWhen(d))}</b>${days(x)}</div><div class="ac-p">${esc([d.place, d.type].filter(Boolean).join(' · '))}</div>${what(d)?`<div class="ac-w">${esc(what(d))}</div>`:''}<div class="ac-o">담당 ${esc(accOwner(d, x.r))}${accMine(x)?'':' · 보기 · 메모만'}</div></div>`; }).join('')}</div>`; return; }
  $('#list').innerHTML=`<div class="acc-tw"><table class="tbl acc-tbl"><thead><tr><th>사고 일시</th><th>장소</th><th>구분</th><th>사고 대상자</th><th>사고 내용</th><th>담당자</th><th>단계</th><th></th></tr></thead><tbody>${list.map(x=>{ const d=x.d, s=accStatus(d), mine=accMine(x);
    return `<tr class="${s==='처리 완료'?'closed':''}"><td class="nw">${esc(accWhen(d))}</td><td>${esc(d.place||'')}</td><td class="nw">${esc(d.type||'')}</td><td>${esc(d.person||'')}</td><td>${esc(what(d))}</td><td class="nw">${esc(accOwner(d, x.r))}</td>`
      + `<td class="nw">${mine ? `<select class="lost-st acc-st s${ACC_ST.indexOf(s)}" data-accst="${esc(x.r.id)}" title="단계 바꾸기">${ACC_ST.map(o=>`<option${o===s?' selected':''}>${esc(o)}</option>`).join('')}</select>` : accTag(s)}${days(x)}</td>`
      + `<td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">${mine?'수정':'보기'}</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

const ACC_PLACES = ['소대','쉼자리길','가가빈빈','현암','소요헌','남명','별유동천','소백세심대','몽몽마방','몽몽차방','곡신문','주차장','매표소'];
const OPS_PAGE =
{ key:'accident', title:'사고현황 접수', add:'사고 접수', hint:'고객 사고 접수 · 현장 조치 · 보험 처리까지 (담당자만 고침 · 다른 사람은 메모)', members:true,
    fields:[
      {type:'head', l:'사고 개요'},
      {k:'date', l:'사고 일자', type:'date', def:()=>opsToday(), req:()=>!accEd()}, {k:'time', l:'사고 시각', type:'time'},
      {k:'type', l:'구분', type:'select', opts:['부상','시설 파손','분실 · 도난','민원','기타'], def:()=>'부상'},
      {k:'visitType', l:'방문 유형', type:'select', opts:['','단체','개인','도슨트 투어','몽몽마방 식사','기타'], def:()=>''},
      {k:'place', l:'사고 장소 (사유원 안)', type:'text', ph:'고르거나 직접 적기 · 예: 소요헌 안 계단', list:ACC_PLACES, req:()=>!accEd()}, {k:'group', l:'방문 단체', type:'text', ph:'단체 이름 (개인이면 비움)'},
      {k:'owner', l:'담당자 (이 사람만 고칠 수 있음)', type:'member', def:()=>accMe(), w:2},

      {type:'head', l:'사고 대상자 · 대표 예약자', note:'로그인한 멤버만 봅니다'},
      {k:'person', l:'사고 대상자 이름', type:'text'}, {k:'phone', l:'사고 대상자 연락처', ...accTel('사고 대상자 연락처')},
      {k:'personNote', l:'대상자 비고 (성별 · 연령대 등)', type:'text', w:2},
      {k:'booker', l:'대표 예약자 이름', type:'text'}, {k:'bookerPhone', l:'대표 예약자 연락처', ...accTel('대표 예약자 연락처')},

      {type:'head', l:'사고 내용'},
      {k:'what', l:'사고 내용', type:'textarea', req:1, w:2},
      {k:'injury', l:'부상 부위 · 진단', type:'text'}, {k:'staff', l:'현장 대응 직원', type:'text', def:()=>accMe()},
      {k:'action', l:'현장 조치', type:'textarea', w:2},
      {k:'after', l:'이후 경과 (병원 진료 등)', type:'textarea', w:2},
      {k:'witness', l:'목격자 · 동행인', type:'text', w:2},
      {k:'photos', l:'현장 사진 (없어도 됨)', type:'photos', w:2},
      {k:'cctv', l:'사고 장소 CCTV', type:'select', opts:['미확인','있음','없음'], def:()=>'미확인'}, {k:'cctvKept', l:'CCTV 영상 확보', type:'select', opts:['미확인','확보함','미확보','해당 없음'], def:()=>'미확인'},

      // 아래 묶음들은 접수한 뒤 고칠 때만 보임 (현장에서는 위의 것만 적고 접수)
      {type:'head', l:'고객 요청 · 원인과 재발 방지', show:accEd},
      {k:'claim', l:'고객 요청 사항 · 안내한 내용', type:'textarea', w:2, show:accEd},
      {k:'claimAmt', l:'고객 측 청구 금액 (원)', type:'num', show:accEd}, {k:'evidence', l:'확보 자료', type:'text', ph:'진단서 · 영수증 · 사진 등', show:accEd},
      {k:'cause', l:'사고 사유', type:'textarea', w:2, show:accEd},
      {k:'prevent', l:'재발 방지 대책', type:'textarea', w:2, show:accEd},

      {type:'head', l:'처리 단계 · 보험', note:'보험사 접수 전이면 사고번호는 비워 둡니다', show:accEd},
      {k:'status', l:'단계', type:'select', opts:ACC_ST, def:()=>'접수', show:accEd}, {k:'rcptDate', l:'보험 접수일', type:'date', show:accEd},
      {k:'visitDate', l:'손해사정사 현장 방문일', type:'date', show:accEd}, {k:'visitNote', l:'현장 방문 메모', type:'text', ph:'담당 손해사정사 · 방문 시간', show:accEd},
      {k:'procDate', l:'처리 완료일', type:'date', show:accEd}, {k:'insStatus', l:'보험사 진행상태', type:'text', list:['사고조사','보상종결','면책종결'], show:accEd},
      {k:'accNo', l:'사고번호', type:'text', show:accEd}, {k:'policyNo', l:'증권번호', type:'text', show:accEd},
      {k:'insCause', l:'사고원인 (보험사 기준)', type:'text', list:['치료비','파손','품질불량','주차장사고'], show:accEd}, {k:'insType', l:'사고유형 (보험사 기준)', type:'text', list:['배상책임','생산물(PL)'], show:accEd},
      {k:'lossObj', l:'손해목적', type:'text', list:['대인(배상책임)','대물(배상책임)'], show:accEd}, {k:'product', l:'보험 상품명', type:'text', list:['영업배상책임보험','생산물배상책임보험(Ⅰ)'], show:accEd},
      {k:'adjuster', l:'위임업체 (손해사정)', type:'text', show:accEd}, {k:'examiner', l:'심사자', type:'text', show:accEd},
      {k:'addr', l:'사고 장소 (주소 · 보험사에 낸 것)', type:'text', w:2, show:accEd},
      {k:'payout', l:'보험금 (원)', type:'num', show:accEd}, {k:'diagnosis', l:'진단명', type:'text', show:accEd},

      {type:'head', l:'추후과업 · 메모', show:accEd},
      {k:'_tasks', w:2, show:accEd, html:accTasksHTML},
      {k:'_notes', w:2, show:accEd, html:accNotesHTML},
      {k:'memo', l:'내부 메모', type:'textarea', w:2},
      {k:'_copy', w:2, show:accEd, html:()=>`<div class="acc-copy lock-ok"><button type="button" class="btn primary" id="accCopy">보고 글 복사</button><span class="hint">적어 둔 내용으로 「사고 경위 보고」 글을 만들어 복사합니다 (보험사 전달용)</span></div>`} ],
    cols:[['date','사고 일시'],['place','장소'],['type','구분'],['status','단계']],
    status:'status', open:ACC_OPEN, summary:d=>`${d.type||''} ${d.place||''} · ${accStatus(d)}`.trim(),
    render:accRender,
    owner:(d, r)=>accOwner(d, r),
    lockBy:row=>accMine(row) ? '' : accOwner(row.d, row.r),
    normalize:d=>{ d.status=accStatus(d); if(accEd() && !d.owner) d.owner=accOwner(d, editRow.r); delete d._tasks; delete d._notes; delete d._copy; },
    onField:(k, d)=>{ if(k==='status') accStageDate(d); },
    afterPaint:(f, row, ro)=>{ const h=document.getElementById('accLock'); if(h){ h.hidden=!ro; h.textContent = ro ? `담당자는 ${ro} 님입니다. 담당자가 아니어서 내용은 볼 수만 있고, 아래 「처리 이력 · 메모」에 메모를 남길 수 있습니다.` : ''; } },
    // 저장한 뒤: 새 사고 = 담당자의 나의 할일에 한 건 · 담당자를 바꿨으면 남은 과업을 새 담당자에게 · 처리 완료면 남은 과업을 끝냄
    afterSave:async (nr, was)=>{ try{ const o=accOwner(nr.d, nr.r), id=nr.r.id;
        if(!was){ await accTaskNew(nr, '접수 확인 · 보험 접수 여부 정하기', o, 'new'); return; }
        const po=accOwner(was.d, was.r);
        if(accStatus(nr.d)==='처리 완료'){ await accTasksClose(id); return; }
        if(po!==o){ const open=accTasks(id).filter(t=>!accTaskDone(t.d) && t.d.owner===po);
          for(const t of open) await accTaskPut({...t.r, owner:o}, t.j, {...t.d, owner:o}, `담당자 ${po} → ${o}`);
          if(!open.length) await accTaskNew(nr, '담당자로 지정됨 · 내용 확인', o, 'owner'); } }catch(e){ accFail(e); } },
    afterDel:row=>{ accTasksClose(row.r.id); } };
