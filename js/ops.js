// ===== 운영보조 (ops.html, 초안 2026-11-18) =====
// ?p=task 기타 개인 업무 (나의 할일) · lost 분실물 찾기 · accident 사고현황 접수 · stock 재고확인
// 저장: 공유 기록(calls) 한 줄 = 한 건 (opslib.js). 고치면 바로 시트에 올리고, 다른 사람이 고친 것은 1분마다 · 이 창으로 돌아올 때 다시 받음
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const user = opsUser();
const P = (new URLSearchParams(location.search).get('p')) || 'task';
const won = n => (Math.round(+n||0)).toLocaleString('ko-KR');
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true, 2600); }

// ---------- 화면마다 칸 ----------
// type: text · tel · num · date · time · select · textarea · dows(요일) · dom(매달 일자) · repeat
const LOST_ST = ['보관중','찾는 중','반환 완료','폐기'], ACC_ST = ['접수','처리 중','완료'];
const BOARDS = {
  task: { title:'기타 개인 업무', add:'업무 추가', hint:'직접 추가하는 내 업무 · 매일 / 매주(요일) / 매달(일자) 반복',
    fields:[ {k:'title', l:'업무', type:'text', req:1, ph:'예) 사무실 비품 주문', w:2},
      {k:'repeat', l:'반복', type:'repeat'}, {k:'dows', l:'요일', type:'dows', show:d=>d.repeat==='weekly'}, {k:'dom', l:'매달 날짜', type:'dom', show:d=>d.repeat==='monthly'},
      {k:'due', l:'날짜', type:'date', show:d=>!d.repeat || d.repeat==='none', def:()=>opsToday()},
      {k:'start', l:'시작일', type:'date', show:d=>d.repeat && d.repeat!=='none', def:()=>opsToday()},
      {k:'owner', l:'담당', type:'text', def:()=>user.name||''}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    summary:d=>`${d.title} · ${opsRepeatLabel(d)}` },
  lost: { title:'분실물 찾기', add:'분실물 접수', hint:'습득물 보관 · 분실 신고 · 반환까지',
    fields:[ {k:'kind', l:'구분', type:'select', opts:['습득','분실 신고'], def:()=>'습득'}, {k:'date', l:'접수일', type:'date', def:()=>opsToday()},
      {k:'item', l:'물품', type:'text', req:1, ph:'예) 검은색 장우산'}, {k:'feature', l:'특징', type:'text', ph:'색 · 브랜드 · 안에 든 것'},
      {k:'place', l:'발견 · 분실 장소', type:'text'}, {k:'storage', l:'보관 위치', type:'text', ph:'예) 안내소 서랍 2'},
      {k:'person', l:'습득자 / 신고자', type:'text'}, {k:'phone', l:'연락처', type:'tel'},
      {k:'status', l:'상태', type:'select', opts:LOST_ST, def:()=>'보관중'}, {k:'returnDate', l:'반환일', type:'date', show:d=>d.status==='반환 완료'},
      {k:'returnTo', l:'반환 받은 분', type:'text', show:d=>d.status==='반환 완료'}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    cols:[['date','접수일',v=>opsDateLabel(v)],['kind','구분'],['item','물품'],['place','장소'],['storage','보관 위치'],['status','상태'],['phone','연락처']],
    status:'status', open:['보관중','찾는 중'], summary:d=>`${d.kind||''} ${d.item||''} · ${d.status||''}` },
  accident: { title:'사고현황 접수', add:'사고 접수', hint:'부상 · 시설 파손 등 · 조치와 처리 상태',
    fields:[ {k:'date', l:'날짜', type:'date', def:()=>opsToday()}, {k:'time', l:'시각', type:'time', ph:'14:30'},
      {k:'type', l:'유형', type:'select', opts:['부상','시설 파손','분실 · 도난','민원','기타'], def:()=>'부상'}, {k:'place', l:'장소', type:'text'},
      {k:'person', l:'관련자', type:'text', ph:'방문객 이름 · 단체명'}, {k:'phone', l:'연락처', type:'tel'},
      {k:'what', l:'내용', type:'textarea', req:1, w:2}, {k:'action', l:'조치', type:'textarea', w:2},
      {k:'status', l:'상태', type:'select', opts:ACC_ST, def:()=>'접수'}, {k:'staff', l:'담당', type:'text', def:()=>user.name||''}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    cols:[['date','날짜',(v,d)=>`${opsDateLabel(v)}${d.time?' '+d.time:''}`],['type','유형'],['place','장소'],['what','내용',v=>String(v||'').split('\n')[0].slice(0,40)],['status','상태'],['staff','담당']],
    status:'status', open:['접수','처리 중'], summary:d=>`${d.type||''} ${d.place||''} · ${d.status||''}` },
  stock: { title:'재고확인', add:'품목 추가', hint:'품목별 수량 · 최소 수량 아래면 빨강',
    fields:[ {k:'name', l:'품목', type:'text', req:1}, {k:'cat', l:'분류', type:'text', ph:'예) 굿즈 · 사무용품'}, {k:'place', l:'위치', type:'text'},
      {k:'qty', l:'수량', type:'num', def:()=>'0'}, {k:'unit', l:'단위', type:'text', def:()=>'개'}, {k:'min', l:'최소 수량', type:'num', ph:'이 아래면 부족'}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    summary:d=>`${d.name||''} ${d.qty||0}${d.unit||''}` },
};
const B = BOARDS[P] || BOARDS.task;
document.title = `${B.title} · 사유원 운영 보조 시스템`;
$('#crumb').textContent = P==='task' ? `나의 할일 › ${B.title}` : `운영보조 › ${B.title}`;
$('#me').textContent = user.name ? `👤 ${user.name}` : '';
$('#bTitle').textContent = B.title; $('#addBtn').textContent = '＋ ' + B.add;
document.querySelectorAll('#tabs a').forEach(a=>{ a.classList.toggle('on', a.dataset.p===P); if(a.dataset.p==='task') a.hidden=true; });   // 탭 = 운영보조 3개 (기타 개인 업무는 나의 할일 쪽)
$('#tabs').hidden = P==='task';

// ---------- 공유 기록 ----------
const CACHE_LS = 'sy_ops_cache_' + P;
let rows = (()=>{ try{ return JSON.parse(localStorage.getItem(CACHE_LS)||'[]'); }catch(_){ return []; } })();   // [{r(시트 줄), d(내용)}]
let syncing=false;
const setSync = t => { $('#sync').textContent = t; };
async function pull(){
  if(!opsKey()){ $('#keyBox').hidden=false; return; }
  setSync('불러오는 중…');
  try{ const j=await opsApi({action:'list'}); $('#keyBox').hidden=true;
    rows = (j.items||[]).filter(r=>r.callType===OPS_TYPES[P]).map(r=>{ const h=opsParse(r); return h ? {r, d:h.d||{}, log:h.log||[]} : null; }).filter(Boolean);
    try{ localStorage.setItem(CACHE_LS, JSON.stringify(rows)); }catch(_){}
    setSync(''); render();
  }catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; $('#keyErr').textContent = '비밀번호가 맞지 않습니다.'; } setSync('연결 안 됨 · 잠시 뒤 다시'); }
}
async function putRow(row, what){
  const now=new Date().toISOString(), log=[...(row.log||[]), {at:now, by:user.name||'', what}].slice(-60);
  const item = {...(row.r||{}), id: row.r?.id || opsId(), callType:OPS_TYPES[P], saved: row.r?.saved || now, takenBy: row.r?.takenBy || user.name || '',
    owner: P==='task' ? (row.d.owner||user.name||'') : (row.r?.owner || user.name || ''), summary: B.summary(row.d).slice(0,120), history: JSON.stringify({kind:P, d:row.d, log}) };
  delete item.date; delete item.org;   // 방문일 · 업체 칸은 비워 둠 (단체 화면 예약 현황에 섞이지 않게)
  const i=rows.findIndex(x=>x.r?.id===item.id), nr={r:item, d:row.d, log}; if(i>=0) rows[i]=nr; else rows.push(nr);
  render(); setSync('저장 중…');
  try{ await opsApi({action:'put', item}); setSync(''); try{ localStorage.setItem(CACHE_LS, JSON.stringify(rows)); }catch(_){} return true; }
  catch(e){ setSync('저장 못 함'); toast('저장하지 못했습니다: '+(e.code||e.message)); return false; }
}
async function delRow(row){
  rows=rows.filter(x=>x.r?.id!==row.r.id); render();
  try{ await opsApi({action:'del', id:row.r.id}); toast('삭제했습니다.'); }catch(e){ toast('삭제하지 못했습니다: '+(e.code||e.message)); pull(); }
}
$('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(OPS_KEY_LS, v); }catch(_){} $('#keyIn').value=''; $('#keyErr').textContent=''; pull(); });

// ---------- 목록 ----------
let filter = B.open ? 'open' : 'all', mineOnly = true;
function render(){
  const q=$('#q').value.trim().toLowerCase(), hit = d => !q || JSON.stringify(d).toLowerCase().includes(q);
  if(P==='task') return renderTasks(hit);
  if(P==='stock') return renderStock(hit);
  const st=B.status, list=rows.filter(x=>hit(x.d) && (filter==='all' || (filter==='open' ? B.open.includes(x.d[st]) : x.d[st]===filter)))
    .sort((a,b)=>String(b.d.date||'').localeCompare(String(a.d.date||'')) || String(b.r.saved).localeCompare(String(a.r.saved)));
  const opts=[['open','진행 중'],['all','전체'], ...B.fields.find(f=>f.k===st).opts.map(o=>[o,o])];
  $('#filters').innerHTML = opts.map(([v,l])=>`<button type="button" class="chip${filter===v?' on':''}" data-f="${esc(v)}">${esc(l)} <small>${v==='all'?rows.length:v==='open'?rows.filter(x=>B.open.includes(x.d[st])).length:rows.filter(x=>x.d[st]===v).length}</small></button>`).join('');
  $('#bSum').textContent = B.hint;
  $('#list').innerHTML = list.length ? `<table class="tbl"><thead><tr>${B.cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>${list.map(x=>`<tr data-id="${esc(x.r.id)}" class="${B.open.includes(x.d[st])?'':'closed'}">${B.cols.map(([k,,f])=>`<td${k===st?` class="st st-${esc(x.d[k]||'')}"`:''}>${esc(f?f(x.d[k], x.d):x.d[k]||'')}</td>`).join('')}<td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">열기</button></td></tr>`).join('')}</tbody></table>`
    : `<p class="empty">${rows.length ? '조건에 맞는 기록이 없습니다.' : '아직 기록이 없습니다. 「＋ '+esc(B.add)+'」로 넣어 주세요.'}</p>`;
}
function renderStock(hit){
  const low = d => d.min!=='' && d.min!=null && +d.qty <= +d.min;
  const list=rows.filter(x=>hit(x.d) && (filter!=='low' || low(x.d))).sort((a,b)=>String(a.d.cat||'').localeCompare(String(b.d.cat||'')) || String(a.d.name).localeCompare(String(b.d.name)));
  $('#filters').innerHTML = [['all','전체',rows.length],['low','부족',rows.filter(x=>low(x.d)).length]].map(([v,l,n])=>`<button type="button" class="chip${filter===v?' on':''}" data-f="${v}">${l} <small>${n}</small></button>`).join('');
  $('#bSum').textContent = B.hint;
  $('#list').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>분류</th><th>품목</th><th>위치</th><th class="num">수량</th><th class="num">최소</th><th>마지막 확인</th><th></th></tr></thead><tbody>${list.map(x=>{ const d=x.d, last=(x.log||[]).slice(-1)[0];
    return `<tr data-id="${esc(x.r.id)}" class="${low(d)?'low':''}"><td>${esc(d.cat||'')}</td><td><b>${esc(d.name)}</b></td><td>${esc(d.place||'')}</td>`
      + `<td class="num qty"><button type="button" class="pm" data-pm="${esc(x.r.id)}|-1">−</button><b>${won(d.qty)}</b>${esc(d.unit||'')}<button type="button" class="pm" data-pm="${esc(x.r.id)}|1">＋</button></td>`
      + `<td class="num">${d.min!==''&&d.min!=null?won(d.min):''}</td><td class="hint">${last?esc(opsDateLabel(opsYmd(last.at)))+' '+esc(last.by||''):''}</td><td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">열기</button></td></tr>`; }).join('')}</tbody></table>`
    : `<p class="empty">${rows.length ? '부족한 품목이 없습니다.' : '아직 품목이 없습니다. 「＋ 품목 추가」로 넣어 주세요.'}</p>`;
}
function renderTasks(hit){
  const today=opsToday(), me=user.name||'';
  const mine = x => !mineOnly || (x.d.owner||x.r.takenBy)===me;
  const list=rows.filter(x=>mine(x) && hit(x.d));
  $('#filters').innerHTML = `<button type="button" class="chip${mineOnly?' on':''}" data-mine="1">내 업무</button><button type="button" class="chip${mineOnly?'':' on'}" data-mine="0">모두의 업무</button>`;
  const pend=[]; list.forEach(x=>opsPending(x.d, today).forEach(day=>pend.push({x, day})));
  pend.sort((a,b)=>a.day.localeCompare(b.day));
  $('#bSum').textContent = `오늘 할 일 ${pend.filter(p=>p.day===today).length}개${pend.some(p=>p.day<today)?` · 지난 것 ${pend.filter(p=>p.day<today).length}개`:''}`;
  const doneToday = list.filter(x=>(x.d.done||{})[today]);
  $('#list').innerHTML = `<h3 class="sub">오늘 할 일 <small>${esc(opsDateLabel(today))}</small></h3>`
    + (pend.length ? `<ul class="tlist">${pend.map(({x,day})=>`<li class="${day<today?'late':''}"><label><input type="checkbox" data-done="${esc(x.r.id)}|${day}"> <b>${esc(x.d.title)}</b></label><span class="hint">${esc(opsRepeatLabel(x.d))}${!mineOnly?` · ${esc(x.d.owner||'')}`:''}</span><em>${day<today?'지남 ':''}${esc(opsDateLabel(day))}</em><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">열기</button></li>`).join('')}</ul>` : '<p class="empty">오늘 할 일을 다 했습니다.</p>')
    + (doneToday.length ? `<ul class="tlist done">${doneToday.map(x=>`<li><label><input type="checkbox" checked data-undo="${esc(x.r.id)}|${today}"> <s>${esc(x.d.title)}</s></label><span class="hint">${esc((x.d.done[today]||{}).by||'')}</span></li>`).join('')}</ul>` : '')
    + `<h3 class="sub">전체 업무 <small>${list.length}개</small></h3>`
    + (list.length ? `<table class="tbl"><thead><tr><th>업무</th><th>반복</th><th>다음</th>${mineOnly?'':'<th>담당</th>'}<th></th></tr></thead><tbody>${list.slice().sort((a,b)=>String(a.d.title).localeCompare(String(b.d.title))).map(x=>{ const nx=nextOcc(x.d, today);
        return `<tr><td><b>${esc(x.d.title)}</b>${x.d.memo?`<br><small class="hint">${esc(String(x.d.memo).split('\n')[0].slice(0,50))}</small>`:''}</td><td>${esc(opsRepeatLabel(x.d))}</td><td>${nx?esc(opsDateLabel(nx)):'<span class="hint">끝남</span>'}</td>${mineOnly?'':`<td>${esc(x.d.owner||'')}</td>`}<td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">열기</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="empty">아직 업무가 없습니다. 「＋ 업무 추가」로 넣어 주세요.</p>');
}
function nextOcc(d, today){ if(!d.repeat || d.repeat==='none'){ const due=d.due||d.start; return due && !(d.done||{})[due] ? due : ''; }
  for(let i=0;i<400;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(opsOccurs(d, day) && !(d.done||{})[day]) return day; } return ''; }

document.addEventListener('click', e=>{
  const f=e.target.closest('[data-f]'); if(f){ filter=f.dataset.f; render(); return; }
  const m=e.target.closest('[data-mine]'); if(m){ mineOnly=m.dataset.mine==='1'; render(); return; }
  const ed=e.target.closest('[data-edit]'); if(ed){ openEdit(rows.find(x=>x.r.id===ed.dataset.edit)); return; }
  const pm=e.target.closest('[data-pm]'); if(pm){ const [id,dv]=pm.dataset.pm.split('|'), x=rows.find(y=>y.r.id===id); if(!x) return; const d={...x.d, qty:String(Math.max(0,(+x.d.qty||0)+(+dv)))}; putRow({...x, d}, `수량 ${x.d.qty||0} → ${d.qty}`); return; }
});
document.addEventListener('change', e=>{
  const dn=e.target.dataset.done, un=e.target.dataset.undo;
  if(dn||un){ const [id,day]=(dn||un).split('|'), x=rows.find(y=>y.r.id===id); if(!x) return; const done={...(x.d.done||{})};
    if(dn) done[day]={at:new Date().toISOString(), by:user.name||''}; else delete done[day];
    const keep=Object.keys(done).sort().slice(-120); const d2={...x.d, done:Object.fromEntries(keep.map(k=>[k,done[k]]))};
    putRow({...x, d:d2}, dn?`${day} 완료`:`${day} 완료 취소`); }
});
$('#q').addEventListener('input', ()=>render());

// ---------- 추가 · 고치기 ----------
let editRow=null, form={};
function openEdit(row){
  editRow=row||null; form = row ? {...row.d} : Object.fromEntries(B.fields.filter(f=>f.def).map(f=>[f.k, f.def()]));
  if(P==='task' && !form.repeat) form.repeat='none';
  $('#eTitle').textContent = row ? `${B.title} · 고치기` : B.add;
  $('#eDel').hidden = !row; $('#eErr').textContent=''; paintForm(); $('#editModal').hidden=false;
  setTimeout(()=>$('#eFields input:not([type=hidden]):not([readonly]), #eFields textarea')?.focus(), 0);
}
function fieldHTML(f){
  const v=form[f.k]??'', id='e_'+f.k, lab=`<label for="${id}">${f.l}${f.req?' <i>*</i>':''}</label>`;
  if(f.type==='select') return lab+`<select id="${id}" data-k="${f.k}">${f.opts.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
  if(f.type==='repeat') return lab+`<div class="seg">${[['none','반복 없음'],['daily','매일'],['weekly','매주'],['monthly','매달']].map(([k,l])=>`<button type="button" class="${(v||'none')===k?'on':''}" data-rep="${k}">${l}</button>`).join('')}</div>`;
  if(f.type==='dows') return lab+`<div class="seg">${[1,2,3,4,5,6,0].map(i=>`<button type="button" class="${(form.dows||[]).includes(i)?'on':''}" data-dow="${i}">${OPS_DOW[i]}</button>`).join('')}</div>`;
  if(f.type==='dom') return lab+`<select id="${id}" data-k="dom">${Array.from({length:30},(_,i)=>i+1).map(i=>`<option value="${i}"${+v===i?' selected':''}>${i}일</option>`).join('')}<option value="31"${+v>=31?' selected':''}>말일</option></select>`;
  if(f.type==='textarea') return lab+`<textarea id="${id}" data-k="${f.k}" data-ime="ko" rows="3">${esc(v)}</textarea>`;
  if(f.type==='date') return lab+`<span class="dbox"><input class="dtxt" id="${id}" data-dt="${f.k}" readonly value="${esc(dateDisp(v))}" placeholder="누르면 달력"><input type="date" class="dpick" data-dp="${f.k}" value="${esc(v)}" tabindex="-1" aria-hidden="true"></span>`;
  return lab+`<input id="${id}" data-k="${f.k}" value="${esc(v)}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.type==='num'||f.type==='time'?' inputmode="numeric" data-ime="num"':f.type==='tel'?' inputmode="tel" data-ime="num"':' data-ime="ko"'}>`;
}
function paintForm(){ $('#eFields').innerHTML = B.fields.filter(f=>!f.show || f.show(form)).map(f=>`<div class="ef${f.w===2?' w2':''}">${fieldHTML(f)}</div>`).join(''); }
$('#eFields').addEventListener('input', e=>{ const k=e.target.dataset.k; if(!k) return; let v=e.target.value; if(B.fields.find(f=>f.k===k)?.type==='num'){ v=v.replace(/[^\d.]/g,''); e.target.value=v; } form[k]=v; });
$('#eFields').addEventListener('change', e=>{ const k=e.target.dataset.k; if(!k) return; form[k]=e.target.value; if(k==='status'){ if(form.status==='반환 완료' && !form.returnDate) form.returnDate=opsToday(); paintForm(); } });   // 반환 완료면 반환일 = 오늘
$('#eFields').addEventListener('click', e=>{
  const r=e.target.closest('[data-rep]'); if(r){ form.repeat=r.dataset.rep; if(form.repeat==='weekly' && !(form.dows||[]).length) form.dows=[new Date().getDay()]; if(form.repeat==='monthly' && !form.dom) form.dom=String(new Date().getDate()); if(form.repeat!=='none' && !form.start) form.start=opsToday(); paintForm(); return; }
  const w=e.target.closest('[data-dow]'); if(w){ const i=+w.dataset.dow, s=new Set(form.dows||[]); s.has(i)?s.delete(i):s.add(i); form.dows=[...s]; paintForm(); return; }
});
// 날짜 칸 (단체 화면 방문일과 같은 방식): 칸 안에 "2026-12-05 (토)", 누르면 달력, 달력을 연 뒤 한 번 더 누르면 글자로 직접 입력
const dateDisp = v => { if(!v) return ''; const t=new Date(v+'T00:00'); return isNaN(t) ? v : `${v} (${OPS_DOW[t.getDay()]})`; };
function parseDateText(s){ s=String(s||'').replace(/\([^)]*\)\s*$/,'').trim(); if(!s) return ''; let y,m,d,x;
  if((x=s.match(/^(\d{4})\s*[-./년 ]?\s*(\d{1,2})\s*[-./월 ]?\s*(\d{1,2})\s*일?$/))){ y=+x[1]; m=+x[2]; d=+x[3]; }
  else if((x=s.match(/^(\d{1,2})\s*[-./월 ]\s*(\d{1,2})\s*일?$/)) || (x=s.match(/^(\d{2})(\d{2})$/))){ m=+x[1]; d=+x[2]; y=new Date().getFullYear(); }
  else return null; const t=new Date(y,m-1,d); return t.getMonth()===m-1 ? opsYmd(t) : null; }
$('#eFields').addEventListener('click', e=>{ const t=e.target.closest('.dtxt'); if(!t) return; const p=t.parentElement.querySelector('.dpick');
  if(t.dataset.opened){ t.readOnly=false; t.value=t.value.replace(/\s*\(.\)$/,''); t.select(); return; }
  t.dataset.opened='1'; try{ p.showPicker(); }catch(_){ t.readOnly=false; } });
$('#eFields').addEventListener('change', e=>{ const p=e.target.closest('.dpick'); if(!p) return; form[p.dataset.dp]=p.value; const t=p.parentElement.querySelector('.dtxt'); t.value=dateDisp(p.value); delete t.dataset.opened; t.readOnly=true; });
$('#eFields').addEventListener('focusout', e=>{ const t=e.target.closest('.dtxt'); if(!t || t.readOnly) return; const v=parseDateText(t.value); if(v===null){ t.value=dateDisp(form[t.dataset.dt]||''); } else { form[t.dataset.dt]=v; t.value=dateDisp(v); } t.readOnly=true; delete t.dataset.opened; });
$('#eForm').addEventListener('submit', async e=>{ e.preventDefault();
  document.activeElement?.blur?.();
  const miss=B.fields.filter(f=>f.req && (!f.show || f.show(form)) && !String(form[f.k]||'').trim()); if(miss.length){ $('#eErr').textContent=`${miss.map(f=>f.l).join(' · ')}을(를) 넣어 주세요.`; return; }
  if(P==='task' && form.repeat==='weekly' && !(form.dows||[]).length){ $('#eErr').textContent='요일을 하나 이상 골라 주세요.'; return; }
  const d={...form}; B.fields.forEach(f=>{ if(f.show && !f.show(form) && f.k in d && f.type!=='dows' && f.type!=='dom') delete d[f.k]; });
  const ok=await putRow({...(editRow||{}), d}, editRow?'고침':'추가'); if(ok!==false){ $('#editModal').hidden=true; toast(editRow?'고쳤습니다.':'추가했습니다.'); }
});
$('#eCancel').onclick=()=>{ $('#editModal').hidden=true; };
$('#editModal').addEventListener('mousedown', e=>{ if(e.target.id==='editModal') $('#editModal').hidden=true; });
$('#eDel').onclick=()=>{ if(!editRow) return; askDelete(`「${B.summary(editRow.d)}」을(를) 정말로 삭제할 건가요?`, ()=>{ $('#editModal').hidden=true; delRow(editRow); }); };
$('#addBtn').onclick=()=>openEdit(null);
// 삭제 확인 (초록 버튼)
let askOk=null; function askDelete(msg, ok){ askOk=ok; $('#askMsg').textContent=msg; $('#askModal').hidden=false; setTimeout(()=>$('#askNo').focus(),0); }
$('#askNo').onclick=()=>{ $('#askModal').hidden=true; askOk=null; };
$('#askYes').onclick=()=>{ const f=askOk; $('#askModal').hidden=true; askOk=null; if(f) f(); };
document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; if(!$('#askModal').hidden){ $('#askModal').hidden=true; return; } if(!$('#editModal').hidden) $('#editModal').hidden=true; });

render(); pull();
setInterval(()=>{ if(document.visibilityState==='visible' && $('#editModal').hidden) pull(); }, 60e3);
window.addEventListener('focus', ()=>{ if($('#editModal').hidden) pull(); });
