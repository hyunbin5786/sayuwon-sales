// ===== 운영보조 화면 엔진 (분실물 찾기 · 사고현황 접수 · 재고확인 · 스마트스토어 발송 보고가 같이 씀) =====
// 2026-11-23 리팩토링: js/lost.js · accident.js · stock.js · ship.js 네 파일이 칸 정의만 다르고 나머지 230줄이 똑같아서 하나로 모음
//  - 페이지 파일(js/lost.js 등)은 그 페이지의 칸만: const OPS_PAGE = { key, title, add, hint, fields, cols, status, open, summary }
//  - 이 파일은 그 OPS_PAGE 로 목록 · 추가/고치기 팝업 · 저장을 그림. 읽는 순서: common.js → opslib.js → (페이지).js → opsboard.js
//  - 한 페이지만 다르게 하고 싶으면 OPS_PAGE 에 값을 더하고 여기서 그 값을 보고 갈라지게 (지금: 재고 = renderStock · 스마트스토어 = renderShip + 엑셀)
// 저장: 공유 기록(calls) 한 줄 = 한 건 (opslib.js). 고치면 바로 서버에 올리고, 다른 사람이 고친 것은 1분마다 · 이 창으로 돌아올 때 다시 받음
// 칸 종류(type): text · tel · num · date · time · select · textarea · goods(품목관리 굿즈) · repeat · dows(요일) · dom(매달 일자) · subs
const $ = s => document.querySelector(s);
const esc = SY.esc;   // 공통 도구 (js/common.js)
const user = opsUser();
const P = OPS_PAGE.key;   // 이 페이지 (공유 기록 통화 구분 · 브라우저 사본 이름에 씀)
const won = n => (Math.round(+n||0)).toLocaleString('ko-KR');
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true, 2600); }

const B = OPS_PAGE;   // 이 페이지의 칸 · 목록 열 (js/lost.js 등 페이지 파일이 먼저 만들어 둠)
document.title = `${B.title} · 사유원 운영 보조 시스템`;
$('#crumb').textContent = `운영보조 › ${B.title}`;
$('#me').textContent = user.name ? `👤 ${user.name}` : '';
$('#bTitle').textContent = B.title; $('#addBtn').textContent = '＋ ' + B.add;

// ---------- 공유 기록 ----------
const CACHE_LS = 'sy_ops_cache_' + P;
// 로그인 없이 쓰는 화면 (OPS_PAGE.guest · 분실물 2026-11-24): 로그인하지 않았으면 보기(이름 · 연락처 가림) · 찾기 · 새로 접수만 — 서버 lostList · lostAdd · lostImgPut
const GUEST = !!B.guest && !opsKey();
const OLD_SRV = '서버(Cloudflare)가 아직 예전 코드라 로그인 없이 저장할 수 없습니다 — 관리자가 worker.js 를 새로 올려야 합니다 (그 전에는 로그인하면 됨)';
let rows = GUEST ? [] : (()=>{ try{ return JSON.parse(localStorage.getItem(CACHE_LS)||'[]'); }catch(_){ return []; } })();   // [{r(시트 줄), d(내용)}]
let syncing=false;
const setSync = t => { $('#sync').textContent = t; };
async function pull(){
  if(GUEST){ setSync('불러오는 중…');
    const j=await SY.callRaw({action:'lostList'}).catch(()=>null);
    if(!j || !j.ok){ setSync(j && /^bad_(action|key)$/.test(j.error||'') ? OLD_SRV : '연결 안 됨 · 잠시 뒤 다시'); return; }
    rows=(j.items||[]).map(x=>({r:{id:x.id, saved:x.saved, updated:x.updated}, d:x.d||{}, log:[]})); setSync(''); render(); return; }
  if(!opsKey()){ $('#keyBox').hidden=false; return; }
  setSync('불러오는 중…');
  try{ const j=await SY.list(); $('#keyBox').hidden=true;
    rows = (j.items||[]).filter(r=>r.callType===OPS_TYPES[P]).map(r=>{ const h=opsParse(r); return h ? {r, d:h.d||{}, log:h.log||[]} : null; }).filter(Boolean);
    try{ localStorage.setItem(CACHE_LS, JSON.stringify(rows)); }catch(_){}
    setSync(''); render();
  }catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; $('#keyErr').textContent = SY.authFail(); } setSync('연결 안 됨 · 잠시 뒤 다시'); }
}
async function putRow(row, what){
  if(GUEST){   // 로그인 없이: 새로 접수만 (고치기는 로그인한 사람만)
    if(row.r?.id){ toast('고치려면 로그인해 주세요.'); return false; }
    setSync('저장 중…');
    try{ const j=await SY.callRaw({action:'lostAdd', d:row.d, by:row.d.person||''});
      if(!j || !j.ok) throw Object.assign(new Error((j && j.error)||'error'), {code:j && j.error});
      setSync(''); pull(); return true; }
    catch(e){ setSync('저장 못 함'); toast('접수하지 못했습니다: '+({busy:'잠시 뒤 다시 해 주세요', no_photo:'습득물 사진을 넣어 주세요', no_item:'물품을 적어 주세요', bad_action:OLD_SRV, bad_key:OLD_SRV}[e.code] || e.code || e.message)); return false; } }
  const now=new Date().toISOString(), log=[...(row.log||[]), {at:now, by:user.name||'', what}].slice(-60);
  const item = {...(row.r||{}), id: row.r?.id || opsId(), callType:OPS_TYPES[P], saved: row.r?.saved || now, takenBy: row.r?.takenBy || user.name || '',
    owner: row.r?.owner || user.name || '', summary: B.summary(row.d).slice(0,120), history: JSON.stringify({kind:P, d:row.d, log}) };
  delete item.date; delete item.org;   // 방문일 · 업체 칸은 비워 둠 (단체 화면 예약 현황에 섞이지 않게)
  const i=rows.findIndex(x=>x.r?.id===item.id), nr={r:item, d:row.d, log}; if(i>=0) rows[i]=nr; else rows.push(nr);
  render(); setSync('저장 중…');
  try{ await SY.call({action:'put', item}); setSync(''); try{ localStorage.setItem(CACHE_LS, JSON.stringify(rows)); }catch(_){} return true; }
  catch(e){ setSync('저장 못 함'); toast('저장하지 못했습니다: '+(e.code||e.message)); return false; }
}
async function delRow(row){
  rows=rows.filter(x=>x.r?.id!==row.r.id); render();
  try{ await SY.call({action:'del', id:row.r.id}); toast('삭제했습니다.'); }catch(e){ toast('삭제하지 못했습니다: '+(e.code||e.message)); pull(); }
}
// (팀 비밀번호 입력 칸은 없앰 · 2026-11-21 — 서버는 로그인으로 확인)

// ---------- 목록 ----------
let filter = B.open ? 'open' : 'all', mineOnly = true;
function render(){
  const q=$('#q').value.trim().toLowerCase(), hit = d => !q || JSON.stringify(d).toLowerCase().includes(q);
  if(P==='stock') return renderStock(hit);
  if(P==='ship') return renderShip(hit);
  if(B.boards) return renderLost(hit);
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
// ---------- 분실물: 두 대시보드 (2026-11-24 · OPS_PAGE.boards — 분실 신고 | 습득, 상태도 따로 · js/lost.js) ----------
//  대시보드마다 진행 중 · 전체 · 상태별로 걸러 보기 · 「＋ 접수」는 그 구분으로 열림 · 습득은 사진을 목록 옆에 작게 (누르면 크게)
const lostFilter = {};
function renderLost(hit){
  $('#filters').innerHTML=''; $('#bSum').textContent = GUEST ? '로그인하지 않아 접수 · 찾기만 됩니다 (이름 · 연락처 일부는 가림 · 상태를 바꾸려면 로그인)' : B.hint; $('#addBtn').hidden=true;
  $('#list').innerHTML = `<div class="lost-cols">${B.boards.map((b, bi)=>{
    const stOf=x=>lostStatus(x.d), all=rows.filter(x=>lostKind(x.d)===b.kind), f=lostFilter[bi]||'open';
    const cnt=v=>v==='all' ? all.length : v==='open' ? all.filter(x=>b.open.includes(stOf(x))).length : all.filter(x=>stOf(x)===v).length;
    const list=all.filter(x=>hit(x.d) && (f==='all' || (f==='open' ? b.open.includes(stOf(x)) : stOf(x)===f)))
      .sort((a, c)=>String(c.d.date||'').localeCompare(String(a.d.date||'')) || String(c.r.saved).localeCompare(String(a.r.saved)));
    const chips=[['open','진행 중'],['all','전체'], ...LOST_ST[b.kind].map(s=>[s,s])].map(([v,l])=>`<button type="button" class="chip${f===v?' on':''}" data-lf="${bi}|${esc(v)}">${esc(l)} <small>${cnt(v)}</small></button>`).join('');
    const tr=x=>{ const s=stOf(x), ps=Array.isArray(x.d.photos) ? x.d.photos : [];
      return `<tr class="${b.open.includes(s)?'':'closed'}">`
        + (b.photo ? `<td class="lost-ph">${ps.length ? `<img data-phimg="${esc(ps[0].id)}" data-phview="${esc(ps[0].id)}" alt="${esc(x.d.item||'습득물')}" title="누르면 크게">${ps.length>1?`<small>+${ps.length-1}</small>`:''}` : '<span class="hint">사진 없음</span>'}</td>` : '')
        + b.cols.map(([k,,fn])=>{ const v=fn?fn(x.d[k], x.d):x.d[k]||''; return `<td>${v && typeof v==='object' ? v.html : esc(v)}</td>`; }).join('')   // {html} 이면 그대로 (물품 아래 줄에 설명)
        + (GUEST ? `<td class="st st-${esc(s)}">${esc(s)}</td><td></td></tr>`   // 로그인 없이: 상태는 보기만 · 열기 없음
          : `<td class="st st-${esc(s)}"><select class="lost-st" data-lst="${esc(x.r.id)}" title="상태 바꾸기">${LOST_ST[b.kind].map(o=>`<option${o===s?' selected':''}>${esc(o)}</option>`).join('')}</select></td><td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">수정</button></td></tr>`); };
    return `<section class="lost-board"><div class="lb-head"><h3>${esc(b.title)} <small>${all.length}건</small></h3><button type="button" class="btn primary" data-ladd="${esc(b.kind)}">＋ ${esc(b.add)}</button></div>`
      + `<div class="filters">${chips}</div>`
      + (list.length ? `<div class="tw"><table class="tbl"><thead><tr>${b.photo?'<th>사진</th>':''}${b.cols.map(c=>`<th>${c[1]}</th>`).join('')}<th>상태</th><th></th></tr></thead><tbody>${list.map(tr).join('')}</tbody></table></div>`
        : `<p class="empty">${all.length ? '조건에 맞는 기록이 없습니다.' : `아직 ${esc(b.title)} 기록이 없습니다. 「＋ ${esc(b.add)}」로 넣어 주세요.`}</p>`)
      + `</section>`; }).join('')}</div>`;
  document.querySelectorAll('#list img[data-phimg]').forEach(im=>{ phLoad(im.dataset.phimg).then(u=>{ im.src=u; }).catch(()=>{ im.alt='사진을 불러오지 못함'; im.classList.add('bad'); }); });
}
if(B.boards) document.body.classList.add('pg-lost');
// 표에서 바로 상태 바꾸기 (2026-11-24 · 드롭다운): 고르면 바로 저장 · 반환 완료면 반환일 = 오늘 (반환 받은 분은 「열기」에서)
document.addEventListener('change', e=>{ const sel=e.target.closest('select[data-lst]'); if(!sel) return;
  const x=rows.find(y=>y.r.id===sel.dataset.lst); if(!x) return; const from=lostStatus(x.d), to=sel.value; if(from===to) return;
  const d={...x.d, status:to}; if(to==='반환 완료' && !d.returnDate) d.returnDate=opsToday();
  putRow({...x, d}, `상태 ${from} → ${to}`).then(ok=>{ if(ok!==false) toast(`「${d.item||''}」 상태를 ${to}(으)로 바꿨습니다.`); }); });

document.addEventListener('click', e=>{
  const lf=e.target.closest('[data-lf]'); if(lf){ const [bi, v]=lf.dataset.lf.split('|'); lostFilter[bi]=v; render(); return; }
  const la=e.target.closest('[data-ladd]'); if(la){ openEdit(null, {kind:la.dataset.ladd}); return; }
  const lv=e.target.closest('#list img[data-phview]'); if(lv){ if(lv.src) phOpen(lv.src); return; }
  const f=e.target.closest('[data-f]'); if(f){ filter=f.dataset.f; render(); return; }
  const ed=e.target.closest('[data-edit]'); if(ed){ openEdit(rows.find(x=>x.r.id===ed.dataset.edit)); return; }
  const pm=e.target.closest('[data-pm]'); if(pm){ const [id,dv]=pm.dataset.pm.split('|'), x=rows.find(y=>y.r.id===id); if(!x) return; const d={...x.d, qty:String(Math.max(0,(+x.d.qty||0)+(+dv)))}; putRow({...x, d}, `수량 ${x.d.qty||0} → ${d.qty}`); return; }
});
$('#q').addEventListener('input', ()=>render());

// ---------- 추가 · 고치기 ----------
let editRow=null, form={};
const fReq = f => typeof f.req==='function' ? f.req(form) : !!f.req;   // 꼭 넣기 (함수면 그때의 칸 값으로)
const fLabel = f => typeof f.l==='function' ? f.l(form) : f.l;   // 칸 이름 (함수면 그때의 칸 값으로 — 분실물: 신고자 / 습득자)
// 로그인한 사람의 연락처 (멤버관리에 적은 것 · 2026-11-24): 분실물 습득 접수 때 습득자 · 연락처를 자동으로 (js/lost.js onField)
window.opsMe = { name:user.name||'', phone:'' };
if(B.boards && !GUEST) SY.call({action:'members'}).then(j=>{ const e=String(user.emp||'').replace(/\s/g,'').toUpperCase(), m=(j.members||[]).find(x=>String(x.emp||'').replace(/\s/g,'').toUpperCase()===e); if(m){ opsMe.name=m.name||opsMe.name; opsMe.phone=m.phone||''; } }).catch(()=>{});
function openEdit(row, preset){   // preset: 새로 넣을 때 먼저 채울 값 (분실물 대시보드의 구분 등)
  editRow=row||null; form = row ? {...row.d} : Object.fromEntries(B.fields.filter(f=>f.def).map(f=>[f.k, f.def()]));
  if(preset) Object.entries(preset).forEach(([k, v])=>{ form[k]=v; if(B.onField) B.onField(k, form); });
  if(B.normalize) B.normalize(form);   // 예전 기록 값을 지금 규칙으로 (분실물 상태)
  $('#eTitle').textContent = row ? `${B.title} · 고치기` : B.add;
  $('#eDel').hidden = !row; $('#eErr').textContent=''; paintForm(); $('#editModal').hidden=false;
  setTimeout(()=>$('#eFields input:not([type=hidden]):not([readonly]), #eFields textarea')?.focus(), 0);
}
function fieldHTML(f){
  const v=form[f.k]??'', id='e_'+f.k, lab=`<label for="${id}">${fLabel(f)}${fReq(f)?' <i>*</i>':''}</label>`;
  if(f.type==='goods'){ const names=opsGoodsCache.map(g=>g.name), has=!v || names.includes(v);   // 품목관리의 굿즈 (엑셀에서 온 이름이 목록에 없으면 그 이름도 보임)
    return lab+`<select id="${id}" data-k="${f.k}"><option value=""${v?'':' selected'}>굿즈 고르기</option>${has?'':`<option selected>${esc(v)}</option>`}${names.map(n=>`<option${n===v?' selected':''}>${esc(n)}</option>`).join('')}</select>`; }
  if(f.type==='select') return lab+`<select id="${id}" data-k="${f.k}">${(typeof f.opts==='function' ? f.opts(form) : f.opts).map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
  if(f.type==='repeat') return lab+`<div class="seg">${[['none','반복 없음'],['daily','매일'],['weekly','매주'],['monthly','매달']].map(([k,l])=>`<button type="button" class="${(v||'none')===k?'on':''}" data-rep="${k}">${l}</button>`).join('')}</div>`;
  if(f.type==='dows') return lab+`<div class="seg">${[1,2,3,4,5,6,0].map(i=>`<button type="button" class="${(form.dows||[]).includes(i)?'on':''}" data-dow="${i}">${OPS_DOW[i]}</button>`).join('')}</div>`;
  if(f.type==='dom') return lab+`<select id="${id}" data-k="dom">${Array.from({length:30},(_,i)=>i+1).map(i=>`<option value="${i}"${+v===i?' selected':''}>${i}일</option>`).join('')}<option value="31"${+v>=31?' selected':''}>말일</option></select>`;
  if(f.type==='subs') return lab+`<ul class="esubs">${(form.subs||[]).map(s=>`<li><span>${esc(s.title)}</span><button type="button" class="x" data-subdel="${esc(s.id)}" title="빼기">×</button></li>`).join('')}</ul><div class="esub-add"><input id="e_subAdd" data-ime="ko" placeholder="세부 과업 (적고 Enter)"><button type="button" class="btn sm" id="e_subAddBtn">추가</button></div>`;
  if(f.type==='photos'){ const ps=Array.isArray(form[f.k]) ? form[f.k] : [];   // 사진 (2026-11-23): 휴대폰에서 바로 찍거나 사진첩에서 고름. 값 = [{id, name}] (그림은 서버 files 표 · 아래 「사진 칸」)
    return `<label>${fLabel(f)} <small class="ph-cnt">${ps.length} / ${PH_MAX}장</small></label>`
      + (ps.length ? `<div class="phs">${ps.map((p,i)=>`<span class="ph"><img alt="${esc(p.name||'사진')}" data-phimg="${esc(p.id)}" data-phview="${esc(p.id)}"><button type="button" class="ph-x" data-phdel="${f.k}|${i}" title="이 사진 빼기" aria-label="사진 빼기">×</button></span>`).join('')}</div>` : '')
      + (ps.length<PH_MAX ? `<div class="ph-btns"><label class="btn primary ph-btn">📷 사진 찍기<input type="file" accept="image/*" capture="environment" data-phadd="${f.k}" hidden></label>`
          + `<label class="btn primary ph-btn">🖼 사진 고르기<input type="file" accept="image/png,image/jpeg" multiple data-phadd="${f.k}" hidden></label></div>` : '')
      + `<span class="hint ph-msg" id="phMsg">${phBusy ? '사진을 올리는 중…' : 'PNG · JPEG · 한 번에 여러 장 고를 수 있습니다'}</span>`; }
  if(f.type==='textarea') return lab+`<textarea id="${id}" data-k="${f.k}" data-ime="ko" rows="3">${esc(v)}</textarea>`;
  if(f.type==='date') return lab+`<span class="dbox"><input class="dtxt" id="${id}" data-dt="${f.k}" readonly value="${esc(dateDisp(v))}" placeholder="누르면 달력"><input type="date" class="dpick" data-dp="${f.k}" value="${esc(v)}" tabindex="-1" aria-hidden="true"></span>`;
  return lab+`<input id="${id}" data-k="${f.k}" value="${esc(v)}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.type==='time'?' data-tp="1" readonly':f.type==='num'?' inputmode="numeric" data-ime="num"':f.type==='tel'?' inputmode="tel" data-ime="num"':' data-ime="ko"'}>`;
}
function paintForm(){ $('#eFields').innerHTML = B.fields.filter(f=>!f.show || f.show(form)).map(f=>`<div class="ef${f.w===2?' w2':''}">${fieldHTML(f)}</div>`).join(''); phPaint(); }
// ---------- 사진 칸 (type:'photos' · 2026-11-23 · 분실물 습득 사진) ----------
//  올리기: 화면에서 긴 변 1600px 로 줄여(PNG 는 PNG 그대로, 너무 크면 JPEG) 서버의 그림 저장(mentImgPut — 멘트 이미지와 같은 저장소 · files 표 · 5MB 까지)에 올리고, 기록에는 [{id, name}] 만 둠
//  보기: mentImgGet 으로 받아 그림으로 (로그인한 사람만 · 한 번 받은 것은 이 화면에 기억). 서버를 바꾸지 않으려고 멘트 이미지 동작을 같이 씀
const PH_MAX=5, phCache={}, phWait={}; let phBusy=0;
const phLoad = id => phCache[id] ? Promise.resolve(phCache[id]) : (phWait[id] ||= SY.call({action:'mentImgGet', id}).then(j=>(phCache[id]=`data:${j.file.mime};base64,${j.file.data}`)).catch(e=>{ delete phWait[id]; throw e; }));
function phPaint(){ document.querySelectorAll('#eFields img[data-phimg]').forEach(im=>{ phLoad(im.dataset.phimg).then(u=>{ im.src=u; }).catch(()=>{ im.alt='사진을 불러오지 못했습니다'; im.classList.add('bad'); }); }); }
function phShrink(file){ return new Promise((ok, no)=>{ const url=URL.createObjectURL(file), im=new Image();
  im.onload=()=>{ try{ const m=1600, k=Math.min(1, m/Math.max(im.naturalWidth, im.naturalHeight)), w=Math.max(1, Math.round(im.naturalWidth*k)), h=Math.max(1, Math.round(im.naturalHeight*k));
      const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); let mime=/png/i.test(file.type) ? 'image/png' : 'image/jpeg';
      if(mime==='image/jpeg'){ g.fillStyle='#fff'; g.fillRect(0,0,w,h); } g.drawImage(im,0,0,w,h);
      let u=c.toDataURL(mime, 0.82);
      if(mime==='image/png' && u.length>2.5e6){ g.globalCompositeOperation='destination-over'; g.fillStyle='#fff'; g.fillRect(0,0,w,h); mime='image/jpeg'; u=c.toDataURL(mime, 0.82); }   // 큰 PNG(사진)는 JPEG 로
      URL.revokeObjectURL(url); ok({mime, data:u.split(',')[1], url:u}); }catch(e){ URL.revokeObjectURL(url); no(e); } };
  im.onerror=()=>{ URL.revokeObjectURL(url); no(new Error('이 파일은 사진으로 열 수 없습니다 (PNG · JPEG 만)')); }; im.src=url; }); }
$('#eFields').addEventListener('change', async e=>{ const inp=e.target.closest('input[data-phadd]'); if(!inp) return; const k=inp.dataset.phadd, files=[...(inp.files||[])]; inp.value=''; if(!files.length) return;
  const cur=()=>Array.isArray(form[k]) ? form[k] : (form[k]=[]); let left=PH_MAX-cur().length, fail='';
  if(files.length>left){ toast(`사진은 ${PH_MAX}장까지입니다. 앞의 ${Math.max(0,left)}장만 올립니다.`); }
  phBusy++; paintForm();
  for(const f of files.slice(0, Math.max(0,left))){
    try{ const s=await phShrink(f), base=String(f.name||'').replace(/\.[A-Za-z0-9]+$/,'').slice(0,30) || '사진';
      const j=await SY.call({action:GUEST?'lostImgPut':'mentImgPut', name:`${B.title} ${form.item||''} ${base}`.trim()+(s.mime==='image/png'?'.png':'.jpg'), mime:s.mime, data:s.data});
      phCache[j.file.id]=s.url; cur().push({id:j.file.id, name:j.file.name}); paintForm();
    }catch(err){ fail=String(err.code||err.message||err); }
  }
  phBusy--; paintForm(); if(fail) $('#eErr').textContent='사진을 올리지 못했습니다: '+(GUEST && /bad_(key|action)/.test(fail) ? OLD_SRV : fail); });
$('#eFields').addEventListener('click', e=>{
  const x=e.target.closest('[data-phdel]'); if(x){ const [k,i]=x.dataset.phdel.split('|'); if(Array.isArray(form[k])){ form[k].splice(+i,1); paintForm(); } return; }
  const v=e.target.closest('img[data-phview]'); if(v && v.src) phOpen(v.src); });
function phOpen(src){   // 사진 크게 보기 (고치기 팝업 · 분실물 습득 목록)
  let o=$('#phView'); if(!o){ o=document.createElement('div'); o.id='phView'; o.className='ph-view'; o.innerHTML='<img alt="사진 크게 보기"><button type="button" class="btn primary">닫기</button>'; o.addEventListener('click', ()=>{ o.hidden=true; }); document.body.appendChild(o); }
  o.querySelector('img').src=src; o.hidden=false; }
$('#eFields').addEventListener('input', e=>{ const k=e.target.dataset.k; if(!k) return; let v=e.target.value; if(B.fields.find(f=>f.k===k)?.type==='num'){ v=v.replace(/[^\d.]/g,''); e.target.value=v; } form[k]=v; });
$('#eFields').addEventListener('change', e=>{ const k=e.target.dataset.k; if(!k) return; form[k]=e.target.value; if(B.onField) B.onField(k, form); if(k==='status'){ if(form.status==='반환 완료' && !form.returnDate) form.returnDate=opsToday(); paintForm(); } else if(e.target.tagName==='SELECT' && B.fields.some(f=>f.show)) paintForm();   /* 구분을 바꾸면 그에 따라 보이는 칸(습득물 사진 등)도 바로 */ });   // 반환 완료면 반환일 = 오늘
$('#eFields').addEventListener('click', e=>{
  const r=e.target.closest('[data-rep]'); if(r){ form.repeat=r.dataset.rep; if(form.repeat==='weekly' && !(form.dows||[]).length) form.dows=[new Date().getDay()]; if(form.repeat==='monthly' && !form.dom) form.dom=String(new Date().getDate()); if(form.repeat!=='none' && !form.start) form.start=opsToday(); paintForm(); return; }
  const w=e.target.closest('[data-dow]'); if(w){ const i=+w.dataset.dow, s=new Set(form.dows||[]); s.has(i)?s.delete(i):s.add(i); form.dows=[...s]; paintForm(); return; }
});
// 날짜 칸 (단체 화면 방문일과 같은 방식): 칸 안에 "2026-12-05 (토)", 누르면 달력, 달력을 연 뒤 한 번 더 누르면 글자로 직접 입력
const dateDisp = SY.dateDisp;   // 공통 (js/common.js)
function parseDateText(s){ return SY.parseDateText(s); }   // 공통 (js/common.js)
$('#eFields').addEventListener('click', e=>{ const t=e.target.closest('.dtxt'); if(!t) return; const p=t.parentElement.querySelector('.dpick');
  if(t.dataset.opened){ t.readOnly=false; t.value=t.value.replace(/\s*\(.\)$/,''); t.select(); return; }
  t.dataset.opened='1'; try{ p.showPicker(); }catch(_){ t.readOnly=false; } });
$('#eFields').addEventListener('change', e=>{ const p=e.target.closest('.dpick'); if(!p) return; form[p.dataset.dp]=p.value; const t=p.parentElement.querySelector('.dtxt'); t.value=dateDisp(p.value); delete t.dataset.opened; t.readOnly=true; });
$('#eFields').addEventListener('focusout', e=>{ const t=e.target.closest('.dtxt'); if(!t || t.readOnly) return; const v=parseDateText(t.value); if(v===null){ t.value=dateDisp(form[t.dataset.dt]||''); } else { form[t.dataset.dt]=v; t.value=dateDisp(v); } t.readOnly=true; delete t.dataset.opened; });
$('#eForm').addEventListener('submit', async e=>{ e.preventDefault();
  document.activeElement?.blur?.();
  if($('#e_subAdd')?.value.trim()) addSub();   // 세부 과업 칸에 적어 두고 추가를 안 누른 것도
  if(phBusy){ $('#eErr').textContent='사진을 올리는 중입니다. 끝난 뒤 저장해 주세요.'; return; }
  const miss=B.fields.filter(f=>fReq(f) && (!f.show || f.show(form)) && !String(form[f.k]||'').trim()); if(miss.length){ $('#eErr').textContent=`${miss.map(f=>fLabel(f)).join(' · ')}을(를) 넣어 주세요.`; return; }
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


// ---------- 스마트스토어 발송 보고 (?p=ship, 2026-11-18) ----------
// 목록: 달(주문일 기준) · 상태(발송 전 · 발송 완료 · 수령 완료) 로 걸러 보고, 위에 그 달 보고(건수 · 수량 · 금액 · 상품별). 「보고 글자 복사」
// 엑셀 불러오기: 「★ 스마트스토어 발송내역.xlsx」처럼 달마다 시트 · 첫 줄 머리글(주문일 · 발송일 · 수령일 · 상품명 · 수량 · 총 주문금액 · 배송비 · 구매자명 · 수취인명 · 수취인연락처 · 수취인연락처2 · 기본배송지 · 상세배송지 · 우편번호 · 배송메세지)
//   파일은 이 브라우저 안에서만 읽고, 고른 시트의 새 줄만 공유 기록에 올림 (주문일 · 상품 · 수취인 · 연락처 · 수량이 같은 줄은 이미 있는 것으로 봄)
const SHIP_COLS = { '주문일':'orderDate', '발송일':'shipDate', '수령일':'recvDate', '상품명':'item', '수량':'qty', '총 주문금액':'amount', '총주문금액':'amount', '배송비':'shipFee', '구매자명':'buyer', '수취인명':'recv', '수취인연락처':'phone', '수취인연락처2':'phone2', '기본배송지':'addr', '상세배송지':'addr2', '우편번호':'zip', '배송메세지':'msg' };
const shipStatus = d => d.recvDate ? '수령 완료' : d.shipDate ? '발송 완료' : '발송 전';
const shipKey = d => [d.orderDate||'', String(d.item||'').replace(/\s/g,''), String(d.recv||'').replace(/\s/g,''), String(d.phone||'').replace(/\D/g,''), String(+d.qty||0)].join('|');
let shipMonth = '', shipMonthAuto = true;   // 'YYYY-MM' · '' = 전체 · 직접 고르기 전에는 가장 최근 달
function renderShip(hit){
  const months=[...new Set(rows.map(x=>String(x.d.orderDate||'').slice(0,7)).filter(Boolean))].sort().reverse();
  if(shipMonthAuto || (shipMonth && !months.includes(shipMonth))) shipMonth = months[0] || '';
  const inMonth=rows.filter(x=>!shipMonth || String(x.d.orderDate||'').startsWith(shipMonth));
  const list=inMonth.filter(x=>hit(x.d) && (filter==='all' || shipStatus(x.d)===filter)).sort((a,b)=>String(b.d.orderDate||'').localeCompare(String(a.d.orderDate||'')));
  const st=['발송 전','발송 완료','수령 완료'];
  $('#filters').innerHTML = `<select id="shipMonth" class="chip-sel"><option value="">전체 달</option>${months.map(m=>`<option value="${m}"${m===shipMonth?' selected':''}>${m.slice(0,4)}년 ${+m.slice(5)}월</option>`).join('')}</select>`
    + [['all','전체',inMonth.length], ...st.map(s=>[s,s,inMonth.filter(x=>shipStatus(x.d)===s).length])].map(([v,l,n])=>`<button type="button" class="chip${filter===v?' on':''}" data-f="${v}">${l} <small>${n}</small></button>`).join('');
  $('#bSum').textContent = B.hint;
  const rep=shipReport(inMonth);
  $('#list').innerHTML = `<div class="ship-rep"><div class="ship-rep-h"><b>${shipMonth?`${shipMonth.slice(0,4)}년 ${+shipMonth.slice(5)}월`:'전체'} 보고</b><span>주문 ${rep.n}건 · 수량 ${won(rep.qty)}개 · 금액 ${won(rep.amount)}원 · 배송비 ${won(rep.fee)}원 · 발송 전 <b class="${rep.wait?'late':''}">${rep.wait}건</b></span><button type="button" class="btn sm" id="shipCopy">보고 글자 복사</button></div>`
      + (rep.items.length ? `<table class="tbl ship-items"><thead><tr><th>상품</th><th class="num">건수</th><th class="num">수량</th><th class="num">금액</th></tr></thead><tbody>${rep.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="num">${i.n}</td><td class="num">${won(i.qty)}</td><td class="num">${won(i.amount)}</td></tr>`).join('')}</tbody></table>` : '') + `</div>`
    + (list.length ? `<table class="tbl"><thead><tr><th>주문일</th><th>상품명</th><th class="num">수량</th><th class="num">금액</th><th>수취인</th><th>연락처</th><th>발송일</th><th>상태</th><th></th></tr></thead><tbody>${list.map(x=>{ const d=x.d, s=shipStatus(d);
        return `<tr class="${s==='발송 전'?'':'closed'}"><td>${esc(opsDateLabel(d.orderDate))}</td><td>${esc(d.item||'')}</td><td class="num">${won(d.qty)}</td><td class="num">${won(d.amount)}</td><td>${esc(d.recv||d.buyer||'')}</td><td>${esc(d.phone||'')}</td><td>${esc(opsDateLabel(d.shipDate))}</td><td class="st ${s==='발송 전'?'ship-wait':'ship-done'}">${s}</td><td class="r"><button type="button" class="btn sm" data-edit="${esc(x.r.id)}">열기</button></td></tr>`; }).join('')}</tbody></table>`
      : `<p class="empty">${rows.length ? '조건에 맞는 발송이 없습니다.' : '아직 발송 기록이 없습니다. 「엑셀 불러오기」나 「＋ 발송 추가」로 넣어 주세요.'}</p>`);
}
function shipReport(L){
  const by={}; let qty=0, amount=0, fee=0, wait=0;
  L.forEach(x=>{ const d=x.d, k=d.item||'(상품 없음)'; (by[k] ||= {name:k, n:0, qty:0, amount:0}); by[k].n++; by[k].qty+=+d.qty||0; by[k].amount+=+d.amount||0; qty+=+d.qty||0; amount+=+d.amount||0; fee+=+d.shipFee||0; if(shipStatus(d)==='발송 전') wait++; });
  return {n:L.length, qty, amount, fee, wait, items:Object.values(by).sort((a,b)=>b.amount-a.amount)};
}
document.addEventListener('change', e=>{ if(e.target.id==='shipMonth'){ shipMonth=e.target.value; shipMonthAuto=false; render(); } });
document.addEventListener('click', async e=>{ if(e.target.id!=='shipCopy') return;
  const inMonth=rows.filter(x=>!shipMonth || String(x.d.orderDate||'').startsWith(shipMonth)), r=shipReport(inMonth);
  const t=[`[스마트스토어 발송 보고] ${shipMonth?`${shipMonth.slice(0,4)}년 ${+shipMonth.slice(5)}월`:'전체'}`, `주문 ${r.n}건 · 수량 ${won(r.qty)}개 · 금액 ${won(r.amount)}원 · 배송비 ${won(r.fee)}원`, `발송 전 ${r.wait}건`, ...r.items.map(i=>`- ${i.name} ${i.n}건 · ${won(i.qty)}개 · ${won(i.amount)}원`)].join('\n');
  try{ await navigator.clipboard.writeText(t); toast('보고 글자를 복사했습니다.'); }catch(_){ toast('복사하지 못했습니다.'); } });

// 엑셀 불러오기
function shipCell2date(v){
  if(v==null || v==='') return '';
  if(typeof v==='number'){ const t=new Date(Math.round((v-25569)*864e5)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')}`; }   // 엑셀 날짜(일련번호, 시각 포함)
  if(v instanceof Date) return opsYmd(v);
  const s=String(v).trim(), m=s.match(/(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/); if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;   // 2024.07.31.수.
  const p=SY.parseDateText(s); return p || '';
}
function shipRowsFromSheet(ws){
  const aoa=XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''}); const hi=aoa.findIndex(r=>r.some(c=>String(c).trim()==='주문일') && r.some(c=>String(c).trim()==='상품명')); if(hi<0) return [];
  const head=aoa[hi].map(c=>SHIP_COLS[String(c).replace(/\s+/g,' ').trim()] || SHIP_COLS[String(c).replace(/\s/g,'')] || '');
  const goods=opsGoodsCache, ns=s=>String(s||'').replace(/\s/g,'');
  return aoa.slice(hi+1).map(r=>{ const d={}; head.forEach((k,i)=>{ if(k) d[k]=r[i]; });
    if(!String(d.item||'').trim() && !d.orderDate) return null;
    ['orderDate','shipDate','recvDate'].forEach(k=>d[k]=shipCell2date(d[k]));
    ['qty','amount','shipFee'].forEach(k=>d[k]=d[k]===''||d[k]==null ? '' : String(Number(String(d[k]).replace(/[^\d.-]/g,''))||0));
    ['phone','phone2'].forEach(k=>d[k]=d[k] ? SY.fmtPhone(d[k]) : '');
    ['item','buyer','recv','addr','addr2','zip','msg'].forEach(k=>d[k]=String(d[k]??'').trim());
    const g=goods.find(x=>ns(x.name)===ns(d.item) || ns(x.src)===ns(d.item)); if(g) d.item=g.name;   // 품목관리 굿즈 이름과 같으면 그 이름으로
    return d; }).filter(Boolean);
}
async function loadXLSX(){ if(window.XLSX) return; await new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
let shipImport=null;   // {sheets:[{name, rows, fresh}]}
async function shipOpenFile(file){
  try{ await loadXLSX(); }catch(_){ toast('엑셀 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'); return; }
  const wb=XLSX.read(await file.arrayBuffer(), {type:'array'}), have=new Set(rows.map(x=>shipKey(x.d)));
  const sheets=wb.SheetNames.map(n=>{ const rs=shipRowsFromSheet(wb.Sheets[n]); return {name:n, rows:rs, fresh:rs.filter(d=>!have.has(shipKey(d)))}; }).filter(s=>s.rows.length);
  if(!sheets.length){ toast('발송 내역(주문일 · 상품명 머리글)이 있는 시트를 찾지 못했습니다.'); return; }
  shipImport={sheets, pick:new Set([sheets[sheets.length-1].name])};   // 기본: 마지막 시트(가장 최근 달)
  paintShipImport(); $('#shipImpModal').hidden=false;
}
function paintShipImport(){ const s=shipImport, n=s.sheets.filter(x=>s.pick.has(x.name)).reduce((a,x)=>a+x.fresh.length,0);
  $('#shipImpBody').innerHTML = `<p class="hint">올릴 시트를 고르세요. 이미 있는 발송(주문일 · 상품 · 수취인 · 연락처 · 수량이 같음)은 빼고 새 줄만 올립니다.</p><div class="ship-sheets">${s.sheets.slice().reverse().map(x=>`<label class="ship-sheet${x.fresh.length?'':' none'}"><input type="checkbox" data-shsh="${esc(x.name)}"${s.pick.has(x.name)?' checked':''}${x.fresh.length?'':' disabled'}> <b>${esc(x.name)}</b> <small>${x.rows.length}줄 · 새로 ${x.fresh.length}</small></label>`).join('')}</div>`;
  $('#shipImpGo').textContent = n ? `${n}건 올리기` : '올릴 새 발송이 없습니다'; $('#shipImpGo').disabled=!n; }
async function shipDoImport(){
  const todo=shipImport.sheets.filter(x=>shipImport.pick.has(x.name)).flatMap(x=>x.fresh); if(!todo.length) return;
  const btn=$('#shipImpGo'); btn.disabled=true; let ok=0;
  for(const d of todo){ btn.textContent=`올리는 중 ${ok}/${todo.length}…`; const r=await putRow({d}, '엑셀 불러오기'); if(r===false) break; ok++; }
  $('#shipImpModal').hidden=true; shipImport=null; toast(`${ok}건을 올렸습니다.`); render();
}
if(P==='ship'){
  const tools=document.querySelector('.b-tools');
  tools.insertAdjacentHTML('afterbegin', `<label class="btn" title="스마트스토어 발송내역 엑셀 (달마다 시트)">엑셀 불러오기<input type="file" id="shipFile" accept=".xlsx,.xls" hidden></label>`);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="shipImpModal" hidden><section class="panel edit-box" role="dialog" aria-modal="true"><h2>엑셀 불러오기</h2><div id="shipImpBody"></div><div class="row-btns"><span class="sp"></span><button type="button" class="btn" id="shipImpNo">취소</button><button type="button" class="btn primary" id="shipImpGo">올리기</button></div></section></div>`);
  $('#shipFile').addEventListener('change', e=>{ const f=e.target.files[0]; e.target.value=''; if(f) shipOpenFile(f); });
  document.addEventListener('change', e=>{ const c=e.target.dataset?.shsh; if(c==null || !shipImport) return; e.target.checked ? shipImport.pick.add(c) : shipImport.pick.delete(c); paintShipImport(); });
  $('#shipImpNo').onclick=()=>{ $('#shipImpModal').hidden=true; shipImport=null; };
  $('#shipImpGo').onclick=shipDoImport;
  filter='all';
  opsLoadGoods().then(()=>{ if(!$('#editModal').hidden) paintForm(); });   // 굿즈 목록 새로 받기
}

// ---------- 시작 (모든 정의가 끝난 뒤) ----------
render(); pull();
setInterval(()=>{ if(document.visibilityState==='visible' && $('#editModal').hidden) pull(); }, 60e3);
window.addEventListener('focus', ()=>{ if($('#editModal').hidden) pull(); });
