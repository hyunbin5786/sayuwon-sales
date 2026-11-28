// ===== 공통 업무 알림 관리 (2026-11-24 · 첫 화면 「공통 업무」 제목 옆 「관리」 버튼) =====
// 공통 업무(담당이 없는 모두의 일)에 무엇을 알릴지 한곳에서: 이미 있던 알림(기본 7개 · 2026-11-27 분실물 신고 · 2026-11-28 예약 현황 직접 추가 더함)도 이름 · 내용 · 설정을 고치고 끄거나 지울 수 있고, 새 공통 업무를 더함
// 저장: 공유 기록(calls) 한 줄 id commondb · 통화 구분 「공통업무설정」 · 수정 기록 칸 {rules:[…], done:{규칙 id:{날짜:{at, by}}}, log:[{at, by, what}]}
//  기본 알림(sys)은 바꾼 값만 rules 에 (id 가 같으면 덮어씀) · removed:true = 지움(아래 「지운 기본 알림」에서 되살리기) · on:false = 잠시 끔
//  새 공통 업무 {id, title, text, href, repeat:'none'|'daily'|'weekly'|'monthly'|'months'|'yearly', start, dows, dom, n, stop, on}
//  재고조사 다음 날짜 · 주기는 재고관리 설정 줄(stockcfg), 여행사 집계 주기는 agencydb 에 바로 저장 (그 화면들과 같은 값)
// portal.js 가 씀: cmOn(id) · cmRule(id) · cmRecs(today) · cmMgrBtn · 완료 버튼(data-cmdone)
const CM_ID='commondb', CM_TYPE='공통업무설정';
const CM_SYS = [
  {id:'quote',   title:'고객 견적 요청', text:'견적서 · 거래명세서 발급', when:'고객이 견적을 요청하고 아직 「접수」인 동안 (생성일 = 요청한 날)', href:'document/'},
  {id:'noowner', title:'담당 없는 예약 과업', text:'', when:'단체 · 개인 예약의 과업 중 담당이 정해지지 않은 것', noText:1},
  {id:'stock',   title:'📋 정기 재고조사', text:'붕정 · 차방을 세어 재고관리에 기록', when:'재고관리의 다음 조사일이 되면 (두 곳 모두 세면 다음 주기로)', href:'stock.html'},
  {id:'promo',   title:'기업 프로모션', text:'연장 여부 확인 (확인하면 「확인」)', when:'기업 프로모션 할인 표의 기간 끝(만료) 몇 달 전', months:'2, 1', href:'promo.html'},
  {id:'agency',  title:'협업 여행사 집계기록 넣기', text:'방문기록 엑셀을 넣어 여행사별 집계', when:'집계 기간(반기 · 분기)이 끝났는데 그 기간 기록이 없으면', href:'agency.html'},
  {id:'lost',    title:'분실물 신고', text:'찾아보고 신고자에게 안내', when:'분실물 신고가 새로 접수되고 「찾는 중」인 동안 (생성일 = 접수일 · 분실물 찾기에서 「처리완료」로 바꾸거나 체크해 없애면 빠짐)', href:'lost.html'},   // 2026-11-27 · js/portal.js commonExtra
  {id:'bookadd', title:'예약 현황 직접 추가', text:'내용을 확인', when:'예약 현황 공유(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰)에 예약을 직접 추가하면 (생성일 = 추가한 날 · 체크해 없애거나 그 예약을 목록에서 빼면 빠짐)', href:'group.html?book=mb'},   // 2026-11-28 · js/portal.js commonExtra
];
const CM_REPEAT = [['none','한 번'],['daily','매일'],['weekly','매주'],['monthly','매달'],['months','몇 달마다'],['yearly','매년']];
const cmHist = () => (typeof histOf==='function' && histOf(CM_ID)) || {};
function cmData(){ const h=cmHist(), saved=Array.isArray(h.rules)?h.rules:[];
  const rules = [...CM_SYS.map(s=>({...s, on:true, ...(saved.find(x=>x.id===s.id)||{}), sys:1})), ...saved.filter(x=>!CM_SYS.some(s=>s.id===x.id)).map(x=>({...x, sys:0}))];
  return {rules, done:h.done||{}}; }
const cmRule = id => cmData().rules.find(r=>r.id===id) || {};
const cmOn = id => { const r=cmRule(id); return r.on!==false && !r.removed; };
const cmGone = (id, key) => !!((cmData().done[id]||{})[key]);   // 없앤(끝낸) 표시가 있는지 (2026-11-28 · 첫 화면 공통 업무의 체크 칸)
const cmMonths = () => String(cmRule('promo').months||'2, 1').split(/[^\d]+/).map(Number).filter(n=>n>0 && n<=24).sort((a,b)=>b-a);
// 새 공통 업무가 그 날짜에 할 날인지 (한 번 · 매일 · 매주 · 매달은 opsOccurs 와 같음 + 몇 달마다 · 매년)
function cmOccurs(r, day){
  if(r.stop && day>r.stop) return false;
  if(r.repeat==='months'){ if(!r.start || day<r.start) return false; for(let k=0;k<600;k++){ const x=opsAddMonths(r.start, k*(Math.max(1,+r.n||1))); if(x===day) return true; if(x>day) return false; } return false; }
  if(r.repeat==='yearly'){ if(!r.start || day<r.start) return false; const [y,m,d]=r.start.split('-').map(Number), last=new Date(+day.slice(0,4), m, 0).getDate(); return day.slice(5)===`${String(m).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`; }
  return opsOccurs({...r, due:r.start}, day);
}
const cmRepeatLabel = r => r.repeat==='months' ? `${Math.max(1,+r.n||1)}달마다 (${opsDateLabel(r.start)}부터)` : r.repeat==='yearly' ? `매년 ${r.start ? +r.start.slice(5,7)+'/'+(+r.start.slice(8)) : ''}` : r.repeat==='none' || !r.repeat ? (r.start ? opsDateLabel(r.start)+' 한 번' : '날짜 없음') : opsRepeatLabel(r);
// 대시보드에 넣을 것: 아직 없애지 않은 날 — 한 번짜리는 그날부터(지나도 계속) · 반복은 할 날이 되면 (최근 60일 안의 안 한 날을 한 줄로 · 생성일 = 가장 오래된 안 한 날 · 체크하면 밀린 날이 함께 없어짐)
//  2026-11-28 바꿈: 예전에는 최근 7일 ~ 45일 뒤의 날을 모두 내고 위 마감 기간 버튼으로 걸렀음 → 이제 마감 없이 「생성된 날부터 없앨 때까지」
function cmRecs(today){ const {rules, done}=cmData(), out=[];
  rules.filter(r=>!r.sys && r.on!==false && !r.removed && r.title).forEach(r=>{ const dn=done[r.id]||{}, days=[];
    if(!r.repeat || r.repeat==='none'){ if(r.start && r.start<=today && !dn[r.start]) days.push(r.start); }
    else for(let i=-60;i<=0;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(cmOccurs(r, day) && !dn[day]) days.push(day); }
    if(days.length) out.push({kind:'공통', owner:'', name:r.title, q:[r.title, r.text].join(' '), href:r.href||'', cm:r.id, cmKeys:days, made:days[0], more:days.length-1, tasks:[{title:r.text||cmRepeatLabel(r), due:days[0]}]}); });
  return out; }
// 공유 기록 한 줄 고치기 (최신을 받아 그 위에)
async function cmPut(id, type, fn, what){
  const j=await SY.list(); lastItems=SY.live.apply(j.items||[]);
  const it=lastItems.find(x=>x.id===id && !x.deleted); let h={}; try{ h=JSON.parse((it&&it.history)||'{}')||{}; }catch(_){}
  const now=new Date().toISOString(), me=(SY.user()||{}).name||'', next=fn(h); if(!next) return;
  if(id===CM_ID) next.log=[...(h.log||[]), {at:now, by:me, what}].slice(-200);
  const item={...(it||{}), id, callType:(it&&it.callType)||type, saved:(it&&it.saved)||now, takenBy:(it&&it.takenBy)||me, owner:'', summary:(id===CM_ID?`공통 업무 알림 · ${what}`:(it&&it.summary)||what).slice(0,120), history:JSON.stringify(next)};
  delete item.date; delete item.org;
  await SY.call({action:'put', item}); SY.live.post({t:'put', item});
  const i=lastItems.findIndex(x=>x.id===id); if(i>=0) lastItems[i]=item; else lastItems.push(item);
}
const cmRefresh = () => { if(typeof dashData!=='undefined' && dashData){ dashData={...dashData, recs:dashRecs(lastItems)}; renderDash(); } };
// 대시보드의 「완료」 (새 공통 업무만 · 그날 것)
document.addEventListener('click', async e=>{ const b=e.target.closest && e.target.closest('[data-cmdone]'); if(!b) return; e.preventDefault(); e.stopPropagation();
  const id=b.dataset.cmdone, day=b.dataset.day, me=(SY.user()||{}).name||''; b.disabled=true;
  try{ await cmPut(CM_ID, CM_TYPE, h=>{ h.done=h.done||{}; h.done[id]={...(h.done[id]||{}), [day]:{at:new Date().toISOString(), by:me}}; return h; }, `완료 ${cmRule(id).title||id} ${day}`); cmRefresh(); }
  catch(err){ b.disabled=false; alert('저장하지 못했습니다: '+(err.code||err.message)); } });

// ---------- 체크 칸 → 「없앨까요?」 창 (2026-11-28 · 운영팀 요청) ----------
// 첫 화면 공통 업무 줄 앞의 체크 칸(data-cmx · js/portal.js cmLi)을 누르면 창으로 묻고, 「없애기」면 없앰 표시를 남김 — 줄을 지우지 않음: done[알림 id][열쇠] = {at, by, what(이름), made(생성일)}
// 공통 업무는 모두가 같이 보므로 한 사람이 없애면 모두에게서 빠짐. 되살리기 = 「관리」 창 아래 「없앤 공통 업무」 (표시를 빼고 수정 기록 log 에 「되살림」)
let cmxPick=null;
function cmxClose(){ const M=document.getElementById('cmxModal'); if(M){ M.hidden=true; M.innerHTML=''; } cmxPick=null; document.querySelectorAll('[data-cmx]:checked').forEach(x=>{ x.checked=false; }); }
function cmxAsk(inp){ let keys=[]; try{ keys=JSON.parse(inp.dataset.keys||'[]'); }catch(_){}
  cmxPick={id:inp.dataset.cmx, keys, name:inp.dataset.name||'', made:inp.dataset.made||''};
  let M=document.getElementById('cmxModal'); if(!M){ M=document.createElement('div'); M.id='cmxModal'; M.className='cm-modal'; document.body.appendChild(M); }
  M.innerHTML = `<div class="cm-panel cmx-panel" role="dialog" aria-modal="true" aria-labelledby="cmxT" tabindex="-1"><h2 id="cmxT">이 공통 업무를 없앨까요?</h2><button type="button" class="win-x" data-cmxno title="닫기 (Esc)" aria-label="닫기">×</button>`
    + `<p class="cmx-what"><b>${cmEsc(cmxPick.name)}</b><span>생성일 ${cmEsc(SY.dateDisp(cmxPick.made))}</span></p>`
    + `<p class="hint">공통 업무는 모두가 함께 보는 것이라, 없애면 <b>모든 사람의 화면에서 사라집니다.</b> 잘못 없앴으면 「관리」 창 아래 「없앤 공통 업무」에서 되살릴 수 있습니다.</p>`
    + `<p class="err" id="cmxErr"></p><div class="cm-btns win-top"><button type="button" class="btn-sm primary" id="cmxOk">없애기</button></div></div>`;
  M.hidden=false; M.querySelector('.cmx-panel').focus(); }   // × 가 아니라 창 상자에 초점
document.addEventListener('change', e=>{ const t=e.target; if(t.matches && t.matches('[data-cmx]')){ if(t.checked) cmxAsk(t); } });
document.addEventListener('keydown', e=>{ const M=document.getElementById('cmxModal'); if(e.key==='Escape' && M && !M.hidden){ e.preventDefault(); cmxClose(); } });
document.addEventListener('click', async e=>{ const M=document.getElementById('cmxModal'); if(!M || M.hidden || !M.contains(e.target)) return;
  if(e.target===M || e.target.closest('[data-cmxno]')){ cmxClose(); return; }
  const ok=e.target.closest('#cmxOk'); if(!ok || !cmxPick) return; const P=cmxPick, me=(SY.user()||{}).name||'', at=new Date().toISOString(); ok.disabled=true; ok.textContent='없애는 중…';
  try{ await cmPut(CM_ID, CM_TYPE, h=>{ h.done={...(h.done||{})}; h.done[P.id]={...(h.done[P.id]||{})}; P.keys.forEach(k=>{ h.done[P.id][k]={at, by:me, what:P.name, made:P.made}; }); return h; }, `없앰 ${P.name}`.slice(0,80)); cmxClose(); cmRefresh(); }
  catch(err){ ok.disabled=false; ok.textContent='없애기'; M.querySelector('#cmxErr').textContent=err.code==='bad_key' ? SY.authFail() : '없애지 못했습니다: '+(err.code||err.message); } });
// 없앤 것 목록 (관리 창 · 최근 것부터 30개): 같은 때 함께 없앤 날(반복 업무의 밀린 날)은 한 줄로
function cmGoneList(){ const done=cmData().done||{}, by=new Map();
  Object.entries(done).forEach(([id, o])=>Object.entries(o||{}).forEach(([k, v])=>{ if(!v || !v.what) return; const g=id+'|'+v.at; if(!by.has(g)) by.set(g, {id, at:v.at, by:v.by||'', what:v.what, made:v.made||'', keys:[]}); by.get(g).keys.push(k); }));
  return [...by.values()].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,30); }

// ---------- 관리 창 ----------
const cmMgrBtn = `<button type="button" class="cm-btn" id="cmMgrBtn" title="공통 업무에 무엇을 알릴지 고치기 · 추가 · 삭제">관리</button>`;
let cmBackOpen=false;   // 「없앤 공통 업무」를 펼쳐 둔 채로 다시 그림
let cmDraft=null;   // 창에서 고치는 중인 것 {rules, stock:{next, cycle}, agency:{cycle}}
function cmOpen(){
  const st=(histOf('stockcfg')||{}).d||{}, ag=histOf('agencydb')||{};
  cmDraft={rules:cmData().rules.map(r=>({...r})), stock:{next:st.next||'', cycle:String(st.cycle||14)}, agency:{cycle:String(ag.cycle||6)}, del:new Set()};
  let m=document.getElementById('cmModal'); if(!m){ m=document.createElement('div'); m.id='cmModal'; m.className='cm-modal'; document.body.appendChild(m); }
  m.hidden=false; cmPaint();
}
const cmEsc = s => SY.esc(s==null?'':String(s));
const cmDate = (attrs, v) => `<span class="dbox"><input class="dtxt" readonly value="${cmEsc(SY.dateDisp(v))}" placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력" inputmode="numeric"><input type="date" class="dpick" ${attrs} value="${cmEsc(v)}" tabindex="-1" aria-hidden="true"></span>`;
function cmSysSet(r){   // 기본 알림마다 따로 고칠 설정
  if(r.id==='promo') return `<label>만료 <input data-cf="months" data-rid="promo" value="${cmEsc(r.months||'2, 1')}" class="cm-sm"> 달 전 <small>(쉼표로 여러 번)</small></label>`;
  if(r.id==='stock') return `<label>다음 조사일 ${cmDate('data-sf="next"', cmDraft.stock.next)}</label><label>주기 <input data-sf="cycle" value="${cmEsc(cmDraft.stock.cycle)}" class="cm-xs" inputmode="numeric"> 일마다</label>`;
  if(r.id==='agency') return `<label>집계 주기 <select data-af="cycle"><option value="6"${cmDraft.agency.cycle==='6'?' selected':''}>반기 (1~6월 · 7~12월)</option><option value="3"${cmDraft.agency.cycle==='3'?' selected':''}>분기 (3개월)</option></select></label>`;
  return '';
}
function cmCustSet(r){
  const rp=r.repeat||'none';
  return `<label>반복 <select data-cf="repeat" data-rid="${cmEsc(r.id)}">${CM_REPEAT.map(([v,l])=>`<option value="${v}"${v===rp?' selected':''}>${l}</option>`).join('')}</select></label>`
    + `<label>${rp==='none'?'날짜':'시작'} ${cmDate(`data-cf="start" data-rid="${cmEsc(r.id)}"`, r.start||'')}</label>`
    + (rp==='weekly' ? `<span class="cm-dows">${[1,2,3,4,5,6,0].map(i=>`<label><input type="checkbox" data-cdow="${i}" data-rid="${cmEsc(r.id)}"${(r.dows||[]).includes(i)?' checked':''}>${OPS_DOW[i]}</label>`).join('')}</span>` : '')
    + (rp==='monthly' ? `<label><input data-cf="dom" data-rid="${cmEsc(r.id)}" value="${cmEsc(r.dom||1)}" class="cm-xs" inputmode="numeric"> 일 <small>(31 = 말일)</small></label>` : '')
    + (rp==='months' ? `<label><input data-cf="n" data-rid="${cmEsc(r.id)}" value="${cmEsc(r.n||3)}" class="cm-xs" inputmode="numeric"> 달마다</label>` : '')
    + (rp!=='none' ? `<label>끝 ${cmDate(`data-cf="stop" data-rid="${cmEsc(r.id)}"`, r.stop||'')} <small>(비우면 계속)</small></label>` : '');
}
function cmPaint(){
  const m=document.getElementById('cmModal'); if(!m || !cmDraft) return;
  const live=cmDraft.rules.filter(r=>!r.removed), gone=cmDraft.rules.filter(r=>r.sys && r.removed);
  const row = r => { const dz=cmDraft.del.has(r.id);
    return `<div class="cm-row${r.on===false?' off':''}${dz?' dz':''}" data-row="${cmEsc(r.id)}">`
      + `<label class="cm-on" title="끄면 공통 업무에 나오지 않음 (설정은 그대로)"><input type="checkbox" data-cf="on" data-rid="${cmEsc(r.id)}"${r.on!==false?' checked':''}><span>${r.on!==false?'켜짐':'꺼짐'}</span></label>`
      + `<div class="cm-main"><div class="cm-l1"><input data-cf="title" data-rid="${cmEsc(r.id)}" value="${cmEsc(r.title)}" placeholder="이름 (예: 소방 점검)" data-ime="ko" class="cm-title">`
      + (r.noText ? '' : `<input data-cf="text" data-rid="${cmEsc(r.id)}" value="${cmEsc(r.text)}" placeholder="할 일 (예: 소화기 압력 확인)" data-ime="ko" class="cm-text">`) + `</div>`
      + `<div class="cm-l2">${r.sys ? `<span class="cm-tag">기본</span><span class="cm-when">${cmEsc(r.when)}</span>${cmSysSet(r)}` : `<span class="cm-tag new">추가</span>${cmCustSet(r)}<label>누르면 갈 화면 <input data-cf="href" data-rid="${cmEsc(r.id)}" value="${cmEsc(r.href)}" placeholder="(없어도 됨) 예: stock.html" class="cm-href"></label>`}</div></div>`
      + (dz ? `<button type="button" class="btn-sm primary" data-cmundo="${cmEsc(r.id)}">되돌리기</button>` : `<button type="button" class="cm-x" data-cmdel="${cmEsc(r.id)}" title="${r.sys?'지우기 (아래 「지운 기본 알림」에서 되살릴 수 있음)':'지우기'}">×</button>`)
      + `</div>`; };
  m.innerHTML = `<section class="cm-panel" role="dialog" aria-modal="true" aria-labelledby="cmTitle">`
    + `<h2 id="cmTitle">공통 업무 알림 관리 <span class="sp"></span><button type="button" class="btn-sm primary" id="cmAdd">＋ 새 공통 업무</button><button type="button" class="win-x in-row" id="cmNo" title="닫기 (Esc)" aria-label="닫기">×</button></h2>`
    + `<div class="cm-list">${live.map(row).join('') || '<p class="hint">알림이 없습니다.</p>'}</div>`
    + (gone.length ? `<details class="cm-gone"><summary>지운 기본 알림 ${gone.length}개</summary>${gone.map(r=>`<div class="cm-g1"><b>${cmEsc(r.title)}</b> <span class="hint">${cmEsc(r.when)}</span><button type="button" class="btn-sm primary" data-cmback="${cmEsc(r.id)}">되살리기</button></div>`).join('')}</details>` : '')
    + (cmGoneList().length ? `<details class="cm-gone cm-back"${cmBackOpen?' open':''}><summary>없앤 공통 업무 ${cmGoneList().length}개 (최근 것부터)</summary>${cmGoneList().map((g,i)=>`<div class="cm-g1"><b>${cmEsc(g.what)}</b> <span class="hint">생성일 ${cmEsc(SY.dateDisp(g.made))} · ${cmEsc(SY.dateDisp(opsYmd(g.at)))} ${cmEsc(g.by)} 없앰</span><button type="button" class="btn-sm primary" data-cmrestore="${i}">되살리기</button></div>`).join('')}</details>` : '')
    + `<p class="err" id="cmErr"></p><div class="cm-btns"><span class="hint" id="cmLog">${cmLastLog()}</span><button type="button" class="btn-sm primary" id="cmOk">저장</button></div></section>`;
  m.querySelectorAll('.dpick').forEach(p=>cmDateBox(p));
}
function cmLastLog(){ const lg=(cmHist().log||[]).slice(-1)[0]; return lg ? `마지막 수정: ${cmEsc(new Date(lg.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))} · ${cmEsc(lg.by)} · ${cmEsc(lg.what)}` : ''; }
// 날짜 칸: 단체 방문일과 같은 방식 (칸 안에 「날짜 (요일)」 · 누르면 달력 · 한 번 더 누르거나 숫자를 치면 직접 입력)
function cmDateBox(pick){ const txt=pick.parentElement.querySelector('.dtxt'); if(!txt || txt.dataset.ready) return; txt.dataset.ready='1';
  const paint=()=>{ if(!txt.dataset.editing) txt.value=SY.dateDisp(pick.value); };
  const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
  const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value=blank?'':pick.value; txt.focus(); if(!blank) txt.select(); };
  txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return; if(Date.now()-(+txt.dataset.pickAt||0)<20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; } txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
  txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } });
  txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const d=txt.value.trim()==='' ? '' : SY.parseDateText(txt.value); delete txt.dataset.editing; txt.readOnly=true;
    if(d===null){ alert('날짜를 알아볼 수 없습니다. 2026-12-05 · 12/5 처럼 적어 주세요.'); paint(); return; }
    if(d!==pick.value){ pick.value=d; pick.dispatchEvent(new Event('change',{bubbles:true})); } paint(); });
  pick.addEventListener('input', paint); pick.addEventListener('change', paint); paint(); }
const cmFind = id => cmDraft && cmDraft.rules.find(r=>r.id===id);
function cmField(el){ if(!cmDraft || !el.closest('#cmModal')) return false;
  if(el.dataset.sf){ cmDraft.stock[el.dataset.sf]=el.value; return false; }
  if(el.dataset.af){ cmDraft.agency[el.dataset.af]=el.value; return false; }
  const r=cmFind(el.dataset.rid); if(!r) return false;
  if(el.dataset.cdow!=null){ const i=+el.dataset.cdow, s=new Set(r.dows||[]); el.checked ? s.add(i) : s.delete(i); r.dows=[...s]; return false; }
  const k=el.dataset.cf; if(!k) return false;
  if(k==='on'){ r.on=el.checked; return true; }
  r[k]=el.value; return k==='repeat'; }
document.addEventListener('input', e=>{ if(e.target.closest && e.target.closest('#cmModal') && e.target.type!=='checkbox' && e.target.tagName!=='SELECT') cmField(e.target); });
document.addEventListener('change', e=>{ if(!(e.target.closest && e.target.closest('#cmModal'))) return; if(cmField(e.target)) cmPaint(); });
document.addEventListener('click', async e=>{
  if(e.target.closest && e.target.closest('#cmMgrBtn')){ e.preventDefault(); cmOpen(); return; }
  const m=document.getElementById('cmModal'); if(!m || m.hidden || !m.contains(e.target)) return;
  if(e.target===m || e.target.closest('#cmNo')){ m.hidden=true; cmDraft=null; return; }
  if(e.target.closest('#cmAdd')){ const id='c'+Date.now().toString(36); cmDraft.rules.push({id, title:'', text:'', href:'', repeat:'none', start:opsToday(), on:true, sys:0}); cmPaint(); const t=m.querySelector(`[data-row="${id}"] .cm-title`); if(t){ t.scrollIntoView({block:'center'}); t.focus(); } return; }
  const d=e.target.closest('[data-cmdel]'); if(d){ cmDraft.del.add(d.dataset.cmdel); cmPaint(); return; }
  const u=e.target.closest('[data-cmundo]'); if(u){ cmDraft.del.delete(u.dataset.cmundo); cmPaint(); return; }
  const b=e.target.closest('[data-cmback]'); if(b){ const r=cmFind(b.dataset.cmback); if(r){ r.removed=false; r.on=true; } cmPaint(); return; }
  const rs=e.target.closest('[data-cmrestore]'); if(rs){ const g=cmGoneList()[+rs.dataset.cmrestore]; if(!g) return; rs.disabled=true; cmBackOpen=true;   // 되살리기: 바로 저장 (위에서 고치던 것은 그대로 둠)
    try{ await cmPut(CM_ID, CM_TYPE, h=>{ h.done={...(h.done||{})}; const o={...(h.done[g.id]||{})}; g.keys.forEach(k=>{ delete o[k]; }); h.done[g.id]=o; return h; }, `되살림 ${g.what}`.slice(0,80)); cmRefresh(); cmPaint(); }
    catch(err){ rs.disabled=false; m.querySelector('#cmErr').textContent='되살리지 못했습니다: '+(err.code||err.message); } return; }
  if(e.target.closest('#cmOk')) cmSave();
});
document.addEventListener('keydown', e=>{ const m=document.getElementById('cmModal'); if(e.key==='Escape' && m && !m.hidden && !(e.target.classList && e.target.classList.contains('dtxt') && e.target.dataset.editing)){ m.hidden=true; cmDraft=null; } });
async function cmSave(){
  const m=document.getElementById('cmModal'), err=m.querySelector('#cmErr'), ok=m.querySelector('#cmOk'); err.textContent='';
  const D=cmDraft, keep=D.rules.filter(r=>!D.del.has(r.id) || r.sys).map(r=>D.del.has(r.id) ? {...r, removed:true} : r);
  for(const r of keep.filter(x=>!x.removed)){
    if(!String(r.title||'').trim()){ err.textContent='이름이 빈 줄이 있습니다.'; return; }
    if(!r.sys){ if(!r.start){ err.textContent=`「${r.title}」의 날짜(시작)를 넣어 주세요.`; return; }
      if(r.repeat==='weekly' && !(r.dows||[]).length){ err.textContent=`「${r.title}」의 요일을 골라 주세요.`; return; } }
  }
  if(cmOn('stock') && D.stock.cycle && !(+D.stock.cycle>0)){ err.textContent='재고조사 주기는 1 이상의 숫자로 적어 주세요.'; return; }
  const pick=(r,ks)=>Object.fromEntries(ks.filter(k=>r[k]!==undefined).map(k=>[k, typeof r[k]==='string' ? r[k].trim() : r[k]]));
  const rules=keep.map(r=>r.sys ? {id:r.id, sys:1, ...pick(r,['title','text','months','on','removed'])} : pick(r,['id','title','text','href','repeat','start','dows','dom','n','stop','on']));
  ok.disabled=true; ok.textContent='저장 중…';
  try{
    await cmPut(CM_ID, CM_TYPE, h=>({...h, rules}), `알림 ${keep.filter(r=>!r.removed).length}개${D.del.size?` · 지움 ${D.del.size}개`:''}`);
    const st=(histOf('stockcfg')||{}).d||{};
    if(histOf('stockcfg') && (D.stock.next!==(st.next||'') || +D.stock.cycle!==+(st.cycle||14)))
      await cmPut('stockcfg', OPS_TYPES.stock, h=>{ h.d={...(h.d||{}), next:D.stock.next, cycle:+D.stock.cycle||14, cfg:true}; h.kind=h.kind||'stock'; h.log=[...(h.log||[]), {at:new Date().toISOString(), by:(SY.user()||{}).name||'', what:`공통 업무 관리에서 다음 조사일 ${D.stock.next||'-'} · ${+D.stock.cycle||14}일마다`}].slice(-100); return h; }, '재고조사 설정');
    const ag=histOf('agencydb');
    if(ag && Array.isArray(ag.rows) && +D.agency.cycle!==+(ag.cycle||6))
      await cmPut('agencydb', '협업여행사', h=>{ h.cycle=+D.agency.cycle; h.log=[...(h.log||[]), {at:new Date().toISOString(), by:(SY.user()||{}).name||'', what:`집계 주기 ${+D.agency.cycle===3?'분기':'반기'} (공통 업무 관리)`}].slice(-200); return h; }, '집계 주기');
    m.hidden=true; cmDraft=null; cmRefresh();
  }catch(e){ err.textContent=e.code==='bad_key' ? SY.authFail() : '저장하지 못했습니다: '+(e.code||e.message); }
  finally{ ok.disabled=false; ok.textContent='저장'; }
}
