// ===== 다음날 고객 응대 준비 (prep.html) =====
// 공통 도구(SY: 공유 주소 · 날짜 · 전화 · esc · 저장소)는 js/common.js, 전체 구조는 README 14절
// 준비할 날짜(기본 내일 · 엑셀 방문일이 다르면 팝업) → ① 방문자내역 엑셀 → ② 티켓 발권 대상(단체예약은 늘 자동 연결) → ④ 입장문 추천 · 표(목록 · 새로 조사 구분) · 엑셀 · 이미지

const $ = s => document.querySelector(s);
const esc = SY.esc;   // 공통 도구 (js/common.js)
let user={}; try{ user=JSON.parse(localStorage.getItem('sy_user')||'{}')||{}; }catch(_){}
$('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
let toastT; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 2600); }
const DOW = SY.DOW;
const dLab = d => { const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
const digits = s => String(s||'').replace(/\D/g,'');
const norm = s => String(s||'').replace(/\s/g,'').toLowerCase();

// ===================== 공유 기록 (단체예약) =====================
const SHARED_URL = SY.API_URL;   // 공유 기록 Apps Script (js/common.js)
const KEY_LS=SY.KEY_LS, GROUP_CACHE_LS='sayuwon_intake_cache';
const getKey = SY.getKey;
async function callApi(body){ const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})}); const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j; }
const GROUP_TYPES=['예약확정','예약접수','공식예약'];   // 연결은 예약확정만 (2026-11-18 · 예약상담 · 가예약 · 예약취소는 가져오지 않음 · 예약접수 · 공식예약 = 예전 이름)
const isConfirmed = r => GROUP_TYPES.includes(r.callType) || (/^adm/.test(r.id||'') && (r.callType||'단체예약')==='단체예약');   // 관리자 사이트에서 온 예약도 확정
const memoVal = (r, label) => { const p=String(r.memo||'').split(' / ').map(s=>s.trim()).find(s=>s.startsWith(label+' ')); return p ? p.slice(label.length+1).trim() : ''; };   // 비고 칸 「입장문 치허문」 등
let groups = (()=>{ try{ return (JSON.parse(localStorage.getItem(GROUP_CACHE_LS)||'[]')||[]).filter(isConfirmed); }catch(_){ return []; } })();
async function loadGroups(){
  if(!getKey()){ $('#keyBox').hidden=false; return; }
  try{ const j=await callApi({action:'list'}); groups=(j.items||[]).filter(isConfirmed); $('#keyBox').hidden=true;
    if(state) build(false); }
  catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast('팀 비밀번호가 맞지 않습니다.'); } else toast('단체예약을 불러오지 못했습니다. 마지막으로 받은 목록으로 보여 줍니다.'); }
}
$('#keyBtn').onclick=()=>{ const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(KEY_LS, v); }catch(_){} $('#keyIn').value=''; loadGroups(); };

// ===================== ① 엑셀 (전산 방문자내역: HTML 표 모양의 .xls) =====================
// 열: 구분 · 방문일 · 성명 · 연락처 · 예약일시 · 프로그램유형 · 예약인원(어른 · 학생) · 불래원 · … · 결제수단 · 금액 · 입장정보(입장 · 퇴장) · 비고
// 한 줄 = 한 예약. 상품이 여러 개면 칸 안에서 줄바꿈으로 나뉨 (상품마다 인원)
const cellLines = td => td ? td.innerHTML.split(/<br\s*\/?>/i).map(h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent.replace(/\s+/g,' ').trim(); }).filter((s,i,a)=>s!=='' || i<a.length-1) : [];
function parseVisitors(text){
  const doc=new DOMParser().parseFromString(text, 'text/html'), trs=[...doc.querySelectorAll('tr')];
  const hi=trs.findIndex(tr=>/성명/.test(tr.textContent) && /연락처/.test(tr.textContent)); if(hi<0) throw new Error('방문자내역 표(성명 · 연락처 열)를 찾지 못했습니다.');
  const cols=[]; const sub=[...(trs[hi+1]||{children:[]}).children].map(td=>td.textContent.trim()); let si=0;
  [...trs[hi].children].forEach(td=>{ const n=+td.getAttribute('colspan')||1, h=td.textContent.replace(/\s/g,''); if(n>1) for(let i=0;i<n;i++) cols.push(h+'·'+(sub[si++]||i)); else cols.push(h); });
  const ix = re => cols.findIndex(c=>re.test(c));
  const C={ kind:ix(/^구분$/), date:ix(/^방문일/), name:ix(/^성명/), phone:ix(/^연락처/), at:ix(/^예약일시/), prog:ix(/^프로그램/), adult:ix(/어른/), student:ix(/학생/), pay:ix(/^결제수단/), note:ix(/^비고/) };
  const title=(doc.querySelector('title')||{}).textContent||'', head=trs.slice(0,hi).map(t=>t.textContent).join(' ');
  const rows=[];
  trs.slice(hi+1).forEach((tr,i)=>{ const tds=[...tr.children]; if(tds.length<cols.length-2 || !tds[C.name]) return; const name=tds[C.name].textContent.trim(); if(!name) return;
    const prods=cellLines(tds[C.prog]).filter(Boolean), ad=cellLines(tds[C.adult]).map(v=>+v||0), st=cellLines(tds[C.student]).map(v=>+v||0);
    const items=prods.map((p,k)=>({p, n:(ad[k]||0)+(st[k]||0)}));
    rows.push({ id:'x'+i, kind:tds[C.kind]?.textContent.trim()||'', date:(tds[C.date]?.textContent.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/)||[]).slice(1).map((v,j)=>j?v.padStart(2,'0'):v).join('-'),
      name, phone:tds[C.phone]?.textContent.trim()||'', items, ppl: ad.reduce((s,v)=>s+v,0)+st.reduce((s,v)=>s+v,0),
      pay:cellLines(tds[C.pay]).filter(Boolean).join(', '), note:C.note>=0 ? tds[C.note].innerHTML.replace(/<\/p>|<br\s*\/?>/gi,' / ').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').replace(/(\s*\/\s*)+$/,'').trim() : '' });   // 비고: 문단은 ' / '로
  });
  const dm=(title+' '+head).match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  const date = dm ? `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}` : (rows.find(r=>r.date)||{}).date || '';
  return { date, rows };
}
async function readFile(f){
  $('#fileErr').textContent='';
  try{
    const buf=await f.arrayBuffer(), head=new Uint8Array(buf.slice(0,4));
    if(head[0]===0x50 && head[1]===0x4b) throw new Error('.xlsx 파일입니다. 전산 방문자내역에서 내려받은 .xls 파일을 그대로 넣어 주세요.');
    if(head[0]===0xd0 && head[1]===0xcf) throw new Error('예전 엑셀(.xls 바이너리) 파일입니다. 전산 방문자내역에서 내려받은 파일을 그대로 넣어 주세요.');
    const text=new TextDecoder('utf-8').decode(buf), v=parseVisitors(text);
    if(!v.rows.length) throw new Error('예약 줄을 찾지 못했습니다.');
    if(v.date && v.date!==prepDate){ showDateModal(`넣은 엑셀의 방문일은 <b>${esc(dLab(v.date))}</b>인데, 준비할 날짜는 <b>${esc(dLab(prepDate))}</b>입니다.<br>${esc(dLab(prepDate))} 방문자내역 엑셀로 바꿔 주세요.`); return; }   // 다음날(준비할 날짜) 파일이 아니면 읽지 않음 (2026-11-18)
    state={ file:f.name, date:v.date||prepDate, rows:v.rows, sel:{}, link:{}, edit:{} };
    build(true); saveState(); toast(`${v.rows.length}건을 읽었습니다.`);
  }catch(e){ $('#fileErr').textContent = e.message || '파일을 읽지 못했습니다.'; }
}
$('#file').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) readFile(f); e.target.value=''; });
const drop=$('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f) readFile(f); });

// ===================== 준비할 날짜 (2026-11-18): 맨 위 · 기본 = 내일 · 엑셀의 방문일이 다르면 팝업 =====================
const tomorrowYmd = () => { const d=new Date(); d.setDate(d.getDate()+1); return SY.ymd(d); };
let prepDate = tomorrowYmd();
function paintPrepDate(){ $('#prepDateTxt').value = SY.dateDisp(prepDate); $('#prepDate').value = prepDate;
  const h=$('#prepDateHint'), mis = state && state.date && state.date!==prepDate;
  h.className = mis ? 'bad' : ''; h.textContent = mis ? `읽어 둔 엑셀은 ${dLab(state.date)} 것입니다 — 파일을 바꿔 주세요` : prepDate===tomorrowYmd() ? '내일 · 이 날짜의 방문자내역 엑셀을 넣으세요' : '이 날짜의 방문자내역 엑셀을 넣으세요'; }
function showDateModal(html){ $('#dmMsg').innerHTML=html; $('#dateModal').hidden=false; setTimeout(()=>$('#dmPick').focus(), 0); }
$('#dmClose').onclick=()=>{ $('#dateModal').hidden=true; };
$('#dmPick').onclick=()=>{ $('#dateModal').hidden=true; $('#file').click(); };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#dateModal').hidden) $('#dateModal').hidden=true; });
// 날짜 칸: 누르면 달력, 달력이 열린 뒤 한 번 더 누르면 직접 입력 (다른 화면의 방문일 칸과 같음)
{ const t=$('#prepDateTxt'), p=$('#prepDate'); let pickAt=0;
  t.addEventListener('click', ()=>{ if(!t.readOnly) return; if(Date.now()-pickAt<20000){ t.readOnly=false; t.select(); pickAt=0; return; } pickAt=Date.now(); try{ p.showPicker(); }catch(_){ p.focus(); } });
  const setD = v => { if(!v) return; prepDate=v; paintPrepDate(); if(state && state.date!==prepDate) showDateModal(`읽어 둔 엑셀의 방문일은 <b>${esc(dLab(state.date))}</b>입니다. 준비할 날짜 <b>${esc(dLab(prepDate))}</b>의 방문자내역 엑셀로 바꿔 주세요.`); };
  p.addEventListener('change', ()=>setD(p.value));
  t.addEventListener('blur', ()=>{ if(t.readOnly) return; t.readOnly=true; const v=SY.parseDateText(t.value); if(v) setD(v); else paintPrepDate(); });
  t.addEventListener('keydown', e=>{ if(e.key==='Enter') t.blur(); }); }

// ===================== 상태 (이 브라우저에만 · 새로고침해도 그대로) =====================
const STATE_LS='sayuwon_prep_state';
let state = (()=>{ try{ return JSON.parse(localStorage.getItem(STATE_LS)||'null'); }catch(_){ return null; } })();
const saveState = () => { try{ localStorage.setItem(STATE_LS, JSON.stringify(state)); }catch(_){} };

// ===================== ② · ③ 목록 만들기 + 단체예약 연결 =====================
const dayGroups = () => state ? groups.filter(r=>String(r.date||'').slice(0,10)===state.date) : [];
const recPhones = r => String(r.phone||'').split(/\s*\/\s*/).map(digits).filter(p=>p.length>=9);
const recNames = r => [r.org, ...String(r.contact||'').split(/\s*\/\s*/)].map(norm).filter(Boolean);
function autoLink(x, dg, used){
  const ph=digits(x.phone), nm=norm(x.name.replace(/\(.*?\)/g,'')), pn=norm((x.name.match(/\((.+?)\)/)||[])[1]||'');
  const cands=dg.filter(r=>!used.has(r.id));
  return (ph.length>=9 && cands.find(r=>recPhones(r).includes(ph))) || cands.find(r=>recNames(r).some(n=>n && (n===nm || (pn && (n.includes(pn)||pn.includes(n)))))) || null;
}
const shortProd = p => { const m=p.match(/\(관람,\s*(.+)\)/); if(m) return m[1].replace(/^사담\s*/,'').replace(/^몽몽마방\s*/,'').replace(/\s/g,''); const t=p.match(/관람\((\d\d):00~18:00\)/); return t ? (t[1]==='13'?'오후 관람':'관람') : p; };
const isGroupName = s => /^[^()]+\(\s*(?!개인|대리)[가-힣A-Za-z ]{2,12}\s*\)\s*$/.test(String(s||'').trim());   // 「산청군청(고영현)」 = 단체명(담당자) → 단체 (2026-11-19)
const fmtT = v => { const m=String(v||'').match(/(\d{1,2})\s*:?\s*(\d{2})/); return m ? `${String(+m[1]).padStart(2,'0')}:${m[2]}` : ''; };
const toMin = t => { const m=fmtT(t).match(/(\d\d):(\d\d)/); return m ? +m[1]*60 + +m[2] : null; };
function vehicleText(v){ const s=String(v||''); const b=s.match(/버스\D*(\d+)/); if(b) return {txt:b[1], bus:+b[1]}; const c=s.match(/(\d+)\s*대/); if(/승용|자차|개별|소형|승합/.test(s)) return {txt:`개별${c?c[1]+'대':''}`, bus:0}; return {txt:s.replace(/\s*\(.*\)$/,''), bus:0}; }
const MEAL_COLS = [['sadam1','런치1부'],['sadam2','런치2부'],['sadamD','디너'],['mabangL','마방 식사']];
const PROG_COLS = [['chabang','몽몽차방 대관'],['dangdu','당두봉갈 대관'],['donghaeng','동행 도슨트'],['yoga','요가'],['gaga','음료쿠폰(가가빈빈)'],['teaMed','티하우스 명상'],['gayageum','가야금'],['cabin','유루 캐빈']];
function recNote(r){
  const memo=String(r.memo||''), parts=[];
  MEAL_COLS.forEach(([k,l])=>{ if(r[k]) parts.push(k==='mabangL' && r.mabangTime ? `${l} ${r.mabangTime}` : l); });   // 식사 (사담 · 마방)
  PROG_COLS.forEach(([k,l])=>{ if(r[k]) parts.push(`${l} ${r[k]}`); });
  const xp=memo.match(/추가 프로그램\s+([^/]+)/); if(xp) parts.push(xp[1].trim());
  if(/현장/.test(r.pay||'')) parts.push('현장결제');
  const note=String(r.note||'').split(/\n/)[0].trim(); if(note) parts.push(note.slice(0,40));
  return parts.join(' / ');
}
let rows=[];   // 결과 줄
function build(fresh){
  if(!state) return;
  const min=+$('#minPpl').value||10, dg=dayGroups(), used=new Set();
  // 연결: 직접 고른 것 먼저, 그다음 자동
  Object.values(state.link).forEach(id=>{ if(id && id!=='none') used.add(id); });
  const base = state.rows.map(x=>{ let rec=null; const l=state.link[x.id]; if(l==='none') rec=null; else if(l) rec=dg.find(r=>r.id===l)||null; else { rec=autoLink(x, dg, used); if(rec) used.add(rec.id); } return {x, rec}; });
  const list = base.filter(o=>o.rec || o.x.ppl>=min);
  dg.filter(r=>!used.has(r.id) && !base.some(o=>o.rec===r)).forEach(r=>list.push({x:null, rec:r}));   // 전산 명단에 없는 단체예약도
  if(fresh) list.forEach(o=>{ const k=o.x?o.x.id:'r'+o.rec.id; if(state.sel[k]==null) state.sel[k]=true; });
  rows = list.map(o=>{ const k=o.x?o.x.id:'r'+o.rec.id, r=o.rec, x=o.x, v=vehicleText(r&&r.vehicle), e=state.edit[k]||{};
    const prods=x ? x.items.filter(i=>i.n>0 || x.items.length===1).map(i=>shortProd(i.p)) : [];
    const pmT = x && x.items.some(i=>/13:00~18:00/.test(i.p)) && !x.items.some(i=>/09:00~18:00|\(관람,/.test(i.p)) ? '13:00 이후' : '';
    // 처음 값(엑셀 · 단체예약) — 표에서 고친 값(state.edit)과 비교해 「수정 내용 저장」에 씀 (2026-11-19)
    const orig = { name: r ? (r.org||r.contact||'(업체 미정)') : isGroupName(x.name) ? x.name : `${x.name}(개인)`, ppl: x ? x.ppl : (parseInt(r.people)||0),
      time: fmtT(r&&r.tin) || '', vehicle: v.txt, phone: x&&x.phone || String(r&&r.phone||'').split(/\s*\/\s*/)[0] || '',
      note: x && x.note && x.note!=='-' ? x.note : '',
      gate: (()=>{ const rg=r ? (memoVal(r,'입장문')||r.gate||'') : ''; return /^(치허문|곡신문)$/.test(rg) ? rg : ''; })() };   // 비고 = 전산 방문자내역 엑셀의 비고 그대로 (2026-11-19 · 상품 · 단체예약 내용을 만들어 붙이지 않음)
    return { key:k, recId: r ? r.id : '', on: state.sel[k]!==false, group: !!r || isGroupName(x&&x.name), inList: !!r, orig,
      name: e.name ?? orig.name, xname:x?x.name:'', ppl: e.ppl!=null && e.ppl!=='' ? (parseInt(e.ppl)||0) : orig.ppl,
      time: e.time ?? orig.time, timeHint: pmT, vehicle: e.vehicle ?? orig.vehicle, bus: v.bus,
      phone: e.phone ?? orig.phone,
      xnote: orig.note, note: e.note ?? '',   // xnote = 엑셀 비고 원문 · note = 표 · 이미지 비고 (간소화, render 에서 채움)
      onsitePay: /현장/.test((r&&r.pay)||''),   // 현장결제건 (단체예약 결제 방법)
      gate: e.gate ?? orig.gate, /* 입장문: 추천 없음 (2026-11-19) — 단체예약에서 정해 둔 문이 있으면 그 문, 없으면 빈칸 → 관리하는 사람이 고름 */ missing: !x, stage: r ? (r.callType||'') : '', prods: x ? x.items.map(i=>`${i.p} ${i.n}명`).join('\n') : '', pay: (x&&x.pay)||'' };
  });
  render();
}
// ===================== ④ 표에서 고친 것 → 저장 (2026-11-19) =====================
// 고친 칸 = 처음 값(엑셀 · 단체예약)과 다르고 아직 저장하지 않은 것. 「수정 내용 저장」:
//  ① 단체예약과 연결된 줄 → 그 단체예약에 바로 반영 (업체명 · 관람 인원 · 입장시각 · 차량 · 연락처 · 입장문, 비고는 기록에만) + 수정 기록 한 줄
//  ② 고친 사람의 기타 개인 업무(나의 할일)에 「전산에 추가」 업무 하나 (세부 과업 = 고친 내용 하나씩 · 메모에 전체)
const FIELD_LABEL = { name:'이름', ppl:'인원', time:'도착시간', gate:'입장문', vehicle:'차량', phone:'연락처', note:'비고' };
function rowChanges(r){
  const e=state.edit[r.key]||{}, sv=(state.saved||{})[r.key]||{}, out=[];
  ['name','ppl','time','gate','vehicle','phone','note'].forEach(f=>{ if(e[f]==null) return; const to=f==='ppl' ? String(r.ppl) : String(e[f]).trim(), from=String(r.orig[f]??'').trim();
    if(to!==from && sv[f]!==to) out.push({f, from, to}); });  return out;
}
const memoSet = (memo, label, val) => { const p=String(memo||'').split(' / ').map(s=>s.trim()).filter(s=>s && !s.startsWith(label+' ')); if(val) p.push(`${label} ${val}`); return p.join(' / '); };
const vehToGroup = s => { s=String(s||'').trim(); if(/^\d+$/.test(s)) return `버스 ${s}대`; const m=s.match(/^개별\s*(\d+)?/); return m ? `승용${m[1]?` ${m[1]}대`:''}` : s; };   // 표의 「2」 = 버스 2대 · 「개별3대」 = 승용 3대
const short = s => { s=String(s||''); return s.length>40 ? s.slice(0,40)+'…' : s; };
async function saveEdits(){
  if(!state) return;
  const todo=rows.map(r=>({r, ch:rowChanges(r)})).filter(o=>o.ch.length);
  if(!todo.length){ toast('저장할 수정 내용이 없습니다.'); return; }
  if(!getKey()){ $('#keyBox').hidden=false; toast('저장하려면 팀 비밀번호를 먼저 넣어 주세요.'); return; }
  const btn=$('#saveEdits'); btn.disabled=true; const now=new Date().toISOString(), me=user.name||'';
  const line = (r,c) => `${r.name} · ${FIELD_LABEL[c.f]} ${short(c.from)||'(빈칸)'} → ${short(c.to)||'(빈칸)'}`;
  let nGroup=0;
  try{
    // ① 단체예약에 반영
    for(const {r, ch} of todo){
      const rec = r.recId && groups.find(g=>g.id===r.recId); if(!rec) continue;
      const it={...rec}; delete it._localAt;
      ch.forEach(c=>{ if(c.f==='name') it.org=c.to; else if(c.f==='ppl') it.people=c.to; else if(c.f==='time') it.tin=fmtT(c.to)||c.to; else if(c.f==='vehicle') it.vehicle=vehToGroup(c.to);
        else if(c.f==='phone'){ const p=String(rec.phone||'').split(/\s*\/\s*/); p[0]=c.to; it.phone=p.filter((x,i)=>x || i===0).join(' / '); } else if(c.f==='gate') it.memo=memoSet(it.memo, '입장문', c.to); });
      let h={}; try{ const j=JSON.parse(rec.history||'{}'); h = Array.isArray(j) ? {h:j} : (j||{}); }catch(_){}
      h.h=[...(h.h||[]), {t:now, by:me, what:`[다음날 고객 응대 준비] ${ch.map(c=>`${FIELD_LABEL[c.f]} ${short(c.from)||'(빈칸)'} → ${short(c.to)||'(빈칸)'}`).join(', ')}`}];
      it.history=JSON.stringify(h);
      await callApi({action:'put', item:it}); nGroup++;
      const gi=groups.findIndex(g=>g.id===it.id); if(gi>=0) groups[gi]=it;
    }
    // ② 고친 사람의 기타 개인 업무: 전산에 추가
    const all=todo.flatMap(({r,ch})=>ch.map(c=>line(r,c))), today=SY.ymd(new Date());
    const title=`전산에 추가: ${dLab(state.date)} 다음날 고객 응대 수정 ${all.length}건`;
    const memo=[`다음날 고객 응대 준비에서 고친 내용입니다. 사유원 전산에도 추가해 주세요.${nGroup?` (단체예약 ${nGroup}건에는 자동으로 반영함)`:''}`, ...all.map(s=>'· '+s)].join('\n');
    const d={ title, repeat:'none', due:today, start:today, owner:me, memo, subs:all.map((s,i)=>({id:'s'+i+Date.now().toString(36), title:s})), done:{}, subDone:{} };
    const task={ id:Date.now().toString(36)+Math.random().toString(36).slice(2,7), callType:'개인업무', saved:now, takenBy:me, owner:me, summary:`${title} · 반복 없음`.slice(0,120),
      history:JSON.stringify({kind:'task', d, log:[{at:now, by:me, what:'다음날 고객 응대 준비에서 만듦'}]}) };
    await callApi({action:'put', item:task});
    // 저장한 값 기억 (다시 저장되지 않게)
    state.saved ||= {}; todo.forEach(({r,ch})=>{ const s=(state.saved[r.key] ||= {}); ch.forEach(c=>{ s[c.f]=c.to; }); });
    saveState(); build(false);
    toast(`저장했습니다. ${nGroup?`단체예약 ${nGroup}건에 반영 · `:''}나의 할일(기타 개인 업무)에 「전산에 추가」 ${all.length}건을 넣었습니다.`);
  }catch(e){ toast(e.code==='bad_key' ? '팀 비밀번호가 맞지 않습니다.' : `저장하지 못했습니다${nGroup?` (단체예약 ${nGroup}건까지는 반영됨)`:''}. 잠시 뒤 다시 눌러 주세요.`); }
  finally{ btn.disabled=false; }
}
// ===================== 화면 =====================
function render(){
  const s=state; [ '#p2','#p4' ].forEach(id=>$(id).classList.toggle('off', !s)); paintPrepDate();
  if(!s){ $('#fileSum').innerHTML=''; $('#listBody').innerHTML=''; $('#outBody').innerHTML=''; $('#outFoot').innerHTML=''; return; }
  const total=s.rows.reduce((a,x)=>a+x.ppl,0), dg=dayGroups();
  $('#fileSum').innerHTML = `<span>파일 <b>${esc(s.file)}</b></span><span>방문일 <b>${esc(dLab(s.date))}</b></span><span>예약 <b>${s.rows.length}</b>건</span><span>방문 인원 <b>${total}</b>명</span><button class="btn" id="clearBtn" type="button">지우기</button>`;
  // ② 목록
  const linkOpts = (k, curId) => `<select class="link-sel" data-link="${esc(k)}"><option value="">자동으로 찾기</option><option value="none"${s.link[k]==='none'?' selected':''}>개인으로 (연결 안 함)</option>${dg.map(r=>`<option value="${esc(r.id)}"${(s.link[k]||curId)===r.id?' selected':''}>${esc(r.org||r.contact||'(업체 미정)')} · ${esc(r.people||'')}명</option>`).join('')}</select>`;
  $('#listBody').innerHTML = rows.map(r=>`<tr class="${r.on?'':'dim'}"><td><input type="checkbox" data-sel="${esc(r.key)}"${r.on?' checked':''}></td><td>${r.group?'<span class="tag grp">단체</span>':'<span class="tag ind">개인</span>'}${r.missing?'<span class="tag warn" title="단체예약에는 있는데 전산 방문자내역에 없음">전산에 없음</span>':''}</td><td>${esc(r.xname||'-')}</td><td>${esc(r.phone)}</td><td class="num">${r.ppl}</td><td style="white-space:pre-line;font-size:12px">${esc(r.prods)}</td><td>${r.missing?esc(r.name):linkOpts(r.key, r.recId)}</td></tr>`).join('')
    || '<tr><td colspan="7" class="hint" style="text-align:center;padding:14px">기준 이상인 예약이 없습니다.</td></tr>';
  const on=rows.filter(r=>r.on);
  $('#p2Sum').textContent = `${on.length}팀 · ${on.reduce((a,r)=>a+r.ppl,0)}명 · 단체예약 ${dg.length}건 중 연결 ${rows.filter(r=>r.inList && !r.missing).length}${rows.some(r=>r.missing)?` · 전산에 없음 ${rows.filter(r=>r.missing).length}`:''}${groups.length?'':' (단체예약을 아직 못 불러옴)'}`;   // ③ 단체예약 정보 넣기는 없애고 여기에 요약 (2026-11-18)
  // ④ 결과 표 (도착 시간 순)
  const list=on.slice().sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999));
  rows.forEach(r=>{ const e=state.edit[r.key]||{}; r.orig.note=shortNote(r); r.note = e.note ?? r.orig.note; });   // 비고 = 간소화한 글 (이미지와 같음 · 직접 고치면 고친 글)
  rows.forEach(r=>{ r._chg=new Set(rowChanges(r).map(c=>c.f)); });   // 저장 안 한 수정 칸 (노란 테두리)
  { const n=rows.reduce((a,r)=>a+r._chg.size,0), b=$('#saveEdits'); if(b){ b.textContent = n ? `수정 내용 저장 (${n})` : '수정 내용 저장'; b.classList.toggle('dirty', n>0); } }
  const yy=s.date.slice(2).replace(/-/g,'');
  $('#outHead').innerHTML = `${yy}(${DOW[new Date(s.date+'T00:00').getDay()]||''})<br>${total}명+@`;
  $('#outBody').innerHTML = list.map(r=>`<tr class="${r.inList?'':'new'}">`
    + `<td class="called no-print${(state.edit[r.key]||{}).called?' on':''}"><label title="이 고객에게 연락했는지 (이 브라우저에 기억)"><input type="checkbox" data-call="${esc(r.key)}"${(state.edit[r.key]||{}).called?' checked':''}></label></td>`   // 연락 체크 = 맨 앞 열 (2026-11-19)
    + `<td class="name"><span class="src ${r.inList?'have':'new'} no-print" title="${r.inList?'단체예약 목록에 있는 단체 (예약 정보를 가져옴)':'단체예약 목록에 없음 — 새로 조사 (연락처로 업체 · 도착 시간 · 차량 확인)'}">${r.inList?'목록':'새로 조사'}</span><input class="nm${r._chg.has('name')?' chg':''}" data-e="${esc(r.key)}|name" value="${esc(r.name)}" data-ime="ko"></td><td class="num"><input class="pp${r._chg.has('ppl')?' chg':''}" data-e="${esc(r.key)}|ppl" value="${r.ppl}" inputmode="numeric"></td>`
    + `<td><input class="t${r._chg.has('time')?' chg':''}" data-e="${esc(r.key)}|time" value="${esc(r.time)}" placeholder="${esc(r.timeHint||'시간')}"></td>`
    + `<td><select class="gate ${esc(r.gate||'none')}${r._chg.has('gate')?' chg':''}" data-e="${esc(r.key)}|gate"><option value=""${r.gate?'':' selected'}>-</option><option${r.gate==='치허문'?' selected':''}>치허문</option><option${r.gate==='곡신문'?' selected':''}>곡신문</option></select></td>`   // 입장문: 관리하는 사람이 고름 (추천 없음, 2026-11-19)
    + `<td><input class="v${r._chg.has('vehicle')?' chg':''}" data-e="${esc(r.key)}|vehicle" value="${esc(r.vehicle)}"></td><td><input class="p${r._chg.has('phone')?' chg':''}" data-e="${esc(r.key)}|phone" value="${esc(r.phone)}"></td>`
    + `<td class="note"><textarea class="${r._chg.has('note')?'chg':''}" data-e="${esc(r.key)}|note" rows="1">${esc(r.note)}</textarea></td></tr>`).join('');
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.vehicle&&r.group?+r.vehicle:0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>r.onsitePay || /현장/.test(r.xnote||'')).map(r=>r.name);
  const hae=s.rows.filter(x=>x.items.some(i=>/해오름/.test(i.p))), haeN=hae.reduce((a,x)=>a+x.items.filter(i=>/해오름/.test(i.p)).reduce((b,i)=>b+i.n,0),0);
  $('#outFoot').innerHTML = `<tr><td class="no-print"></td><td class="g">단체</td><td class="g num">${gSum}</td><td></td><td></td><td class="bus">버스 ${bus}대+</td><td colspan="2" class="ind">개인고객 ${ind}명</td></tr>`
    + `<tr><td class="no-print"></td><td>현장결제건</td><td colspan="6" style="text-align:left">${esc(onsite.join(', ')||'-')}</td></tr>`
    + `<tr><td class="no-print"></td><td>해오름 산책</td><td colspan="6" style="text-align:left">${hae.length?`${hae.length}팀 ${haeN}명 · 고객 도착 AM 6:00`:'-'}</td></tr>`;
  $('#p4Sum').textContent = `${list.length}팀 (목록 ${list.filter(r=>r.inList).length} · 새로 조사 ${list.filter(r=>!r.inList).length}) · 치허문 ${list.filter(r=>r.gate==='치허문').length} · 곡신문 ${list.filter(r=>r.gate==='곡신문').length} · 연락 ${list.filter(r=>(s.edit[r.key]||{}).called).length}/${list.length}`;
  document.querySelectorAll('.out textarea').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
document.addEventListener('change', e=>{ const t=e.target;
  if(t.dataset.sel){ state.sel[t.dataset.sel]=t.checked; saveState(); build(false); return; }
  if(t.dataset.call){ const e=(state.edit[t.dataset.call] ||= {}); if(t.checked) e.called=new Date().toISOString(); else delete e.called; saveState(); render(); return; }   // 연락 체크
  if(t.dataset.link!=null){ const k=t.dataset.link; if(t.value) state.link[k]=t.value; else delete state.link[k]; delete state.edit[k]; saveState(); build(false); return; }
  if(t.id==='minPpl'){ build(true); saveState(); return; }
  if(t.dataset.e){ const [k,f]=t.dataset.e.split('|'); (state.edit[k] ||= {})[f]=t.value; saveState(); if(f==='time' || f==='ppl' || f==='name') build(false); else { const r=rows.find(x=>x.key===k); if(r){ r[f]=t.value; } render(); } }
});
document.addEventListener('input', e=>{ const t=e.target; if(t.tagName==='TEXTAREA' && t.dataset.e){ const [k,f]=t.dataset.e.split('|'); (state.edit[k] ||= {})[f]=t.value; const r=rows.find(x=>x.key===k); if(r) r[f]=t.value; saveState(); t.style.height='auto'; t.style.height=t.scrollHeight+'px'; } });
document.addEventListener('click', e=>{ if(e.target.id==='clearBtn'){ if(!confirm('읽은 엑셀과 고친 내용을 지울까요?')) return; state=null; rows=[]; try{ localStorage.removeItem(STATE_LS); }catch(_){} render(); } });
// 표 내용 (엑셀 · 이미지 공통): 도착 시간 순
function tableData(){ const s=state, list=rows.filter(r=>r.on).sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999)), total=s.rows.reduce((a,x)=>a+x.ppl,0);
  const head=[`${s.date.slice(2).replace(/-/g,'')}(${DOW[new Date(s.date+'T00:00').getDay()]}) ${total}명+@`,'인원(명)','도착시간','입장문','차량','연락처','비고'];
  return [head, ...list.map(r=>[r.name, r.ppl, r.time||r.timeHint||'', r.gate, r.vehicle, r.phone, r.note])]; }
// 엑셀로 내려받기 (예전 표 모양: 머리 초록 · 입장문 색 · 아래 합계)
$('#xlsxBtn').onclick=async()=>{ if(!state || !window.ExcelJS) return; const d=tableData(), wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('다음날 고객 응대');
  ws.columns=[{width:16},{width:6},{width:8},{width:8},{width:7},{width:13},{width:24}];   // 핸드폰에서 보기 좋게 좁게 (비고는 줄바꿈)
  ws.pageSetup={orientation:'portrait', fitToPage:true, fitToWidth:1, fitToHeight:0, paperSize:9};
  d.forEach((r,i)=>{ const row=ws.addRow(r); row.eachCell(c=>{ c.alignment={horizontal:'center', vertical:'middle', wrapText:true}; c.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}; });
    if(!i) row.eachCell(c=>{ c.font={bold:true, color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern', pattern:'solid', fgColor:{argb:'FF5A6B4F'}}; });
    else { const g=row.getCell(4); g.fill={type:'pattern', pattern:'solid', fgColor:{argb: r[3]==='곡신문' ? 'FFDBE7F7' : 'FFDCEFD8'}}; } });
  const on=rows.filter(r=>r.on), total=state.rows.reduce((a,x)=>a+x.ppl,0), gSum=on.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=on.reduce((a,r)=>a+(+r.vehicle&&r.group?+r.vehicle:0),0), ind=total-on.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const f=ws.addRow(['단체', gSum, '', '', `버스 ${bus}대+`, `개인고객 ${ind}명`, '']); ws.mergeCells(f.number,6,f.number,7);
  [[1,'FFD9EAD3'],[2,'FFD9EAD3'],[5,'FFF6C26B'],[6,'FFFFF200']].forEach(([c,col])=>{ const x=f.getCell(c); x.fill={type:'pattern', pattern:'solid', fgColor:{argb:col}}; x.font={bold:true}; x.alignment={horizontal:'center'}; });
  const buf=await wb.xlsx.writeBuffer(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf])); a.download=`다음날_고객응대_${state.date.slice(2).replace(/-/g,'')}.xlsx`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000); };


// 이미지의 비고 = 간소화 (2026-11-19): 「프로그램 / 현장결제 / 도착시간 입장문」
//  - 도착시간 · 입장문은 꼭 (예: 9시 치허문 · 10:30 곡신문) · 관람만이면 「관람」은 안 씀
//  - 런치 · 디너 · 일출 · 일몰 · 동행도슨트 · PPT세미나 · 자체세미나가 있으면 (상품 이름 · 엑셀 비고에서, 시간 · 괄호 설명은 그대로)
//  - 금액 · 출입구 미정 · 입장 시각 · 마방 식사 · 적은 사람 이름 등은 뺌. 표에서 비고를 직접 고쳤으면 고친 글 그대로
const PROG_RE = /런치|디너|일출|해오름|일몰|선셋|도슨트|세미나|PPT/i;
const shortT = t => { const m=fmtT(t).match(/(\d\d):(\d\d)/); return m ? (m[2]==='00' ? `${+m[1]}시` : `${+m[1]}:${m[2]}`) : String(t||'').trim(); };
function shortNote(r){
  const out=[], add=s=>{ s=String(s||'').trim(); if(s && !out.some(x=>norm(x)===norm(s))) out.push(s); };
  const clean = s => String(s).replace(/사담\s*/g,'').replace(/런치\s*(\d)\s*부/g,'런치$1부').replace(/해오름\s*산책|해오름/g,'일출').replace(/선셋/g,'일몰').replace(/\s+/g,' ').trim();
  String(r.prods||'').split('\n').forEach(p=>{ const m=p.replace(/\s*\d+명$/,''), k=m.match(/\(관람,\s*(.+)\)/); const v=k?k[1]:m; if(PROG_RE.test(v)) add(clean(v)); });   // 상품 (예: (관람, 사담 런치 1부) → 런치1부)
  String(r.xnote||'').replace(/\s*\(\s*[가-힣]{2,4}\s*\)\s*$/,'')   // 맨 끝 적은 사람 이름 「(문현빈)」은 뺌
    .split(/\s*\/\s*/).forEach(s=>{ if(PROG_RE.test(s) && !/\d[\d,]*\s*원/.test(s)) add(clean(s)); });   // 엑셀 비고의 프로그램 (금액 칸은 빼고)
  if(r.onsitePay || /현장\s*결제/.test(r.xnote||'')) add('현장결제');
  const arrive = r.time ? `${shortT(r.time)} ${r.gate || '입장'}` : (r.gate || '');   // 입장문을 아직 안 골랐으면 「9시 입장」 (2026-11-19)
  // 시간이 적힌 프로그램이 있으면 도착부터 시간 순 (예: 13시 곡신문 / 13:30 동행도슨트 / 15-16시 자체세미나), 없으면 맨 뒤에 도착 (예: 런치1부 / 현장결제 / 10:30 곡신문)
  const startMin = s => { const m=String(s).match(/^(\d{1,2})(?::(\d\d))?(?=시|\s|-|~)/); return m ? +m[1]*60+(+m[2]||0) : null; };
  if(out.some(s=>startMin(s)!=null) && arrive){
    const timed=out.filter(s=>startMin(s)!=null), rest=out.filter(s=>startMin(s)==null);
    return [...rest, ...[arrive, ...timed].sort((a,b)=>(startMin(a)??-1)-(startMin(b)??-1))].join(' / ');
  }
  add(arrive);
  return out.join(' / ');
}
// 이미지로 저장: 핸드폰에서 보기 좋은 좁은 폭(430px)의 표를 화면 밖에 그려 PNG로 (카카오톡으로 보내기 좋게)
$('#pngBtn').onclick=async()=>{
  if(!state || !window.html2canvas){ toast('잠시 뒤 다시 눌러 주세요.'); return; }
  const s=state, list=rows.filter(r=>r.on).sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999)), total=s.rows.reduce((a,x)=>a+x.ppl,0);
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.vehicle&&r.group?+r.vehicle:0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>r.onsitePay || /현장/.test(r.xnote||'')).map(r=>r.name);
  const hae=s.rows.filter(x=>x.items.some(i=>/해오름/.test(i.p))), haeN=hae.reduce((a,x)=>a+x.items.filter(i=>/해오름/.test(i.p)).reduce((b,i)=>b+i.n,0),0);
  const box=$('#shot');
  box.innerHTML = `<div class="sh-h"><b>${esc(dLab(s.date))} 단체현황 · ${list.length}팀</b><span>방문 ${total}명+@</span></div>`
    + `<table><thead><tr><th>단체 · 고객</th><th>인원</th><th>도착</th><th>입장문</th><th>차량</th></tr></thead><tbody>`
    + list.map(r=>`<tr class="${r.inList?'':'new'}"><td class="nm"><b>${esc(r.name)}</b>${r.phone?`<small>${esc(r.phone)}</small>`:''}</td><td class="c">${r.ppl}</td><td class="c">${esc(r.time||r.timeHint||'')}</td><td class="c">${r.gate?`<span class="g ${esc(r.gate)}">${esc(r.gate)}</span>`:''}</td><td class="c">${esc(r.vehicle||'')}</td></tr>`
      + ((n=>n ? `<tr class="nt"><td colspan="5">${esc(n)}</td></tr>` : '')(shortNote(r)))).join('')
    + `</tbody></table>`
    + `<div class="sh-f"><span class="g1">단체 ${gSum}명</span><span class="g2">버스 ${bus}대+</span><span class="g3">개인고객 ${ind}명</span></div>`
    + `<div class="sh-n">현장결제건: ${esc(onsite.join(', ')||'-')}</div><div class="sh-n">해오름 산책: ${hae.length?`${hae.length}팀 ${haeN}명 · 고객 도착 AM 6:00`:'-'}</div>`;
  try{
    const cv=await html2canvas(box, {scale:2, backgroundColor:'#ffffff'});
    const blob=await new Promise(ok=>cv.toBlob(ok, 'image/png')), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`다음날_고객응대_${s.date.slice(2).replace(/-/g,'')}.png`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    toast('이미지로 저장했습니다.');
  }catch(_){ toast('이미지를 만들지 못했습니다.'); }
};

$("#saveEdits").onclick=saveEdits;   // ④ 표에서 고친 것 저장 (2026-11-19)

if(state) build(false); else render();
loadGroups();
paintPrepDate();
if(state && state.date && state.date!==prepDate) showDateModal(`전에 읽어 둔 엑셀은 <b>${esc(dLab(state.date))}</b> 것입니다. 준비할 날짜 <b>${esc(dLab(prepDate))}</b>(내일)의 방문자내역 엑셀로 바꿔 주세요.`);   // 어제 넣은 파일이 남아 있으면
