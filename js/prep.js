// ===== 다음날 고객 응대 준비 (prep.html) =====
// ① 방문자내역 엑셀 → ② 10인 이상 목록 → ③ 단체예약 정보 → ④ 입장문 추천 · 표 복사 · 엑셀 · 인쇄

const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user={}; try{ user=JSON.parse(localStorage.getItem('sy_user')||'{}')||{}; }catch(_){}
$('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
let toastT; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 2600); }
const DOW='일월화수목금토';
const dLab = d => { const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
const digits = s => String(s||'').replace(/\D/g,'');
const norm = s => String(s||'').replace(/\s/g,'').toLowerCase();

// ===================== 공유 기록 (단체예약) =====================
const SHARED_URL = "https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec";
const KEY_LS='sayuwon_intake_key', GROUP_CACHE_LS='sayuwon_intake_cache';
const getKey = () => { try{ return localStorage.getItem(KEY_LS)||''; }catch(_){ return ''; } };
async function callApi(body){ const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})}); const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j; }
const GROUP_TYPES=['단체예약','예약상담','예약접수','상담','가예약','공식예약'];
let groups = (()=>{ try{ return (JSON.parse(localStorage.getItem(GROUP_CACHE_LS)||'[]')||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약')); }catch(_){ return []; } })();
async function loadGroups(){
  if(!getKey()){ $('#keyBox').hidden=false; return; }
  try{ const j=await callApi({action:'list'}); groups=(j.items||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약')); $('#keyBox').hidden=true; if(state) build(false); }
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
    state={ file:f.name, date:v.date, rows:v.rows, sel:{}, link:{}, edit:{} };
    build(true); saveState(); toast(`${v.rows.length}건을 읽었습니다.`);
  }catch(e){ $('#fileErr').textContent = e.message || '파일을 읽지 못했습니다.'; }
}
$('#file').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) readFile(f); e.target.value=''; });
const drop=$('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f) readFile(f); });

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
const isTravel = s => /여행|투어|관광|트래블|tour|travel/i.test(s||'');
const BIG_NAMES = ['해밀','아너드','군위시티투어'];
const isBig = s => isTravel(s) || BIG_NAMES.some(b=>norm(s).includes(norm(b)));
const fmtT = v => { const m=String(v||'').match(/(\d{1,2})\s*:?\s*(\d{2})/); return m ? `${String(+m[1]).padStart(2,'0')}:${m[2]}` : ''; };
const toMin = t => { const m=fmtT(t).match(/(\d\d):(\d\d)/); return m ? +m[1]*60 + +m[2] : null; };
function vehicleText(v){ const s=String(v||''); const b=s.match(/버스\D*(\d+)/); if(b) return {txt:b[1], bus:+b[1]}; const c=s.match(/(\d+)\s*대/); if(/승용|자차|개별|소형|승합/.test(s)) return {txt:`개별${c?c[1]+'대':''}`, bus:0}; return {txt:s.replace(/\s*\(.*\)$/,''), bus:0}; }
const MEAL_COLS = [['sadam1','런치1부'],['sadam2','런치2부'],['sadamD','디너'],['mabangL','마방 식사']];
const PROG_COLS = [['chabang','몽몽차방 대관'],['dangdu','당두봉갈 대관'],['donghaeng','동행 도슨트'],['yoga','요가'],['gaga','가가 바우처'],['teaMed','티하우스 명상'],['gayageum','가야금'],['cabin','유루 캐빈']];
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
    return { key:k, recId: r ? r.id : '', on: state.sel[k]!==false, group: !!r, travel: isBig((r&&r.org)||(x&&x.name)),
      name: r ? (r.org||r.contact||'(업체 미정)') : `${x.name}(개인)`, xname:x?x.name:'', ppl: x ? x.ppl : (parseInt(r.people)||0),
      time: e.time ?? fmtT(r&&r.tin) ?? '', timeHint: pmT, vehicle: e.vehicle ?? v.txt, bus: v.bus,
      phone: e.phone ?? (x&&x.phone || String(r&&r.phone||'').split(/\s*\/\s*/)[0] || ''),
      note: e.note ?? [ [...new Set(prods)].join(' · '), r ? recNote(r) : '', x && x.note && x.note!=='-' ? x.note.slice(0,60) : '' ].filter(Boolean).join(' / '),
      gate: e.gate || '', gateWhy:'', recGate: r && /문/.test(r.gate||'') ? r.gate : '', missing: !x, stage: r ? (r.callType||'') : '', prods: x ? x.items.map(i=>`${i.p} ${i.n}명`).join('\n') : '', pay: (x&&x.pay)||'' };
  });
  recommendGates(false);
  render();
}
// ===================== ④ 입장문 추천 =====================
function recommendGates(force){
  const on=rows.filter(r=>r.on), W=30;
  const near = (a,b) => { const x=toMin(a.time), y=toMin(b.time); return x!=null && y!=null && Math.abs(x-y)<=W; };
  on.forEach(r=>{
    let g='치허문', why='';
    const bigNear = on.filter(o=>o!==r && o.travel && near(o,r)), grpNear = on.filter(o=>o!==r && o.group && near(o,r));
    if(r.travel){ g='치허문'; why = isTravel(r.name) ? '여행사 → 치허문' : '대형 단체 → 치허문'; }
    else if(!r.group){ if(r.ppl>=15){ g='곡신문'; why='15명 이상 개인 → 곡신문'; } else if(toMin(r.time)==null){ why='도착 시간 미정 → 치허문'; } else if(grpNear.length || bigNear.length){ g='곡신문'; why=`${(bigNear[0]||grpNear[0]).name} 와 시간 겹침 → 곡신문`; } else { why='단체와 안 겹침 → 치허문'; } }
    else if(toMin(r.time)==null){ why='도착 시간 미정 → 치허문'; }
    else if(bigNear.length){ g='곡신문'; why=`${bigNear.map(o=>o.name).slice(0,2).join(' · ')} 와 시간 겹침 → 곡신문`; }
    else why='시간 안 겹침 → 치허문';
    r.recGateAuto=g; r.gateWhy=why + (r.recGate && r.recGate!==g ? ` (예약에는 ${r.recGate})` : '');
    const e=(state.edit[r.key] ||= {}); if(force) delete e.gate;
    r.gate = e.gate || g;
  });
}
// ===================== 화면 =====================
function render(){
  const s=state; [ '#p2','#p3','#p4' ].forEach(id=>$(id).classList.toggle('off', !s));
  if(!s){ $('#fileSum').innerHTML=''; $('#listBody').innerHTML=''; $('#outBody').innerHTML=''; $('#outFoot').innerHTML=''; return; }
  const total=s.rows.reduce((a,x)=>a+x.ppl,0), dg=dayGroups();
  $('#fileSum').innerHTML = `<span>파일 <b>${esc(s.file)}</b></span><span>방문일 <b>${esc(dLab(s.date))}</b></span><span>예약 <b>${s.rows.length}</b>건</span><span>방문 인원 <b>${total}</b>명</span><button class="btn" id="clearBtn" type="button">지우기</button>`;
  // ② 목록
  const linkOpts = (k, curId) => `<select class="link-sel" data-link="${esc(k)}"><option value="">자동으로 찾기</option><option value="none"${s.link[k]==='none'?' selected':''}>개인으로 (연결 안 함)</option>${dg.map(r=>`<option value="${esc(r.id)}"${(s.link[k]||curId)===r.id?' selected':''}>${esc(r.org||r.contact||'(업체 미정)')} · ${esc(r.people||'')}명</option>`).join('')}</select>`;
  $('#listBody').innerHTML = rows.map(r=>`<tr class="${r.on?'':'dim'}"><td><input type="checkbox" data-sel="${esc(r.key)}"${r.on?' checked':''}></td><td>${r.group?'<span class="tag grp">단체</span>':'<span class="tag ind">개인</span>'}${r.missing?'<span class="tag warn" title="단체예약에는 있는데 전산 방문자내역에 없음">전산에 없음</span>':''}</td><td>${esc(r.xname||'-')}</td><td>${esc(r.phone)}</td><td class="num">${r.ppl}</td><td style="white-space:pre-line;font-size:12px">${esc(r.prods)}</td><td>${r.missing?esc(r.name):linkOpts(r.key, r.recId)}</td></tr>`).join('')
    || '<tr><td colspan="7" class="hint" style="text-align:center;padding:14px">기준 이상인 예약이 없습니다.</td></tr>';
  const on=rows.filter(r=>r.on);
  $('#p2Sum').textContent = `${on.length}팀 · ${on.reduce((a,r)=>a+r.ppl,0)}명`;
  $('#p3Sum').textContent = `단체예약 ${dg.length}건 중 연결 ${rows.filter(r=>r.group && !r.missing).length} · 전산에 없음 ${rows.filter(r=>r.missing).length}` + (groups.length?'':' (단체예약을 아직 못 불러옴)');
  // ④ 결과 표 (도착 시간 순)
  const list=on.slice().sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999));
  const yy=s.date.slice(2).replace(/-/g,'');
  $('#outHead').innerHTML = `${yy}(${DOW[new Date(s.date+'T00:00').getDay()]||''})<br>${total}명+@`;
  $('#outBody').innerHTML = list.map(r=>`<tr><td class="name${r.group?'':' ind'}">${esc(r.name)}</td><td class="num">${r.ppl}</td>`
    + `<td><input class="t" data-e="${esc(r.key)}|time" value="${esc(r.time)}" placeholder="${esc(r.timeHint||'시간')}"></td>`
    + `<td><select class="gate ${esc(r.gate)}" data-e="${esc(r.key)}|gate"><option${r.gate==='치허문'?' selected':''}>치허문</option><option${r.gate==='곡신문'?' selected':''}>곡신문</option></select><span class="why no-print">${esc(r.gateWhy)}${r.gate!==r.recGateAuto?' · 직접 바꿈':''}</span></td>`
    + `<td><input class="v" data-e="${esc(r.key)}|vehicle" value="${esc(r.vehicle)}"></td><td><input class="p" data-e="${esc(r.key)}|phone" value="${esc(r.phone)}"></td>`
    + `<td class="note"><textarea data-e="${esc(r.key)}|note" rows="1">${esc(r.note)}</textarea></td></tr>`).join('');
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.vehicle&&r.group?+r.vehicle:0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>/현장/.test(r.note)).map(r=>r.name);
  const hae=s.rows.filter(x=>x.items.some(i=>/해오름/.test(i.p))), haeN=hae.reduce((a,x)=>a+x.items.filter(i=>/해오름/.test(i.p)).reduce((b,i)=>b+i.n,0),0);
  $('#outFoot').innerHTML = `<tr><td class="g">단체</td><td class="g num">${gSum}</td><td></td><td></td><td class="bus">버스 ${bus}대+</td><td colspan="2" class="ind">개인고객 ${ind}명</td></tr>`
    + `<tr><td>현장결제건</td><td colspan="6" style="text-align:left">${esc(onsite.join(', ')||'-')}</td></tr>`
    + `<tr><td>해오름 산책</td><td colspan="6" style="text-align:left">${hae.length?`${hae.length}팀 ${haeN}명 · 고객 도착 AM 6:00`:'-'}</td></tr>`;
  $('#p4Sum').textContent = `${list.length}팀 · 치허문 ${list.filter(r=>r.gate==='치허문').length} · 곡신문 ${list.filter(r=>r.gate==='곡신문').length}`;
  document.querySelectorAll('.out textarea').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
document.addEventListener('change', e=>{ const t=e.target;
  if(t.dataset.sel){ state.sel[t.dataset.sel]=t.checked; saveState(); build(false); return; }
  if(t.dataset.link!=null){ const k=t.dataset.link; if(t.value) state.link[k]=t.value; else delete state.link[k]; delete state.edit[k]; saveState(); build(false); return; }
  if(t.id==='minPpl'){ build(true); saveState(); return; }
  if(t.dataset.e){ const [k,f]=t.dataset.e.split('|'); (state.edit[k] ||= {})[f]=t.value; saveState(); if(f==='time') build(false); else { const r=rows.find(x=>x.key===k); if(r){ r[f]=t.value; } render(); } }
});
document.addEventListener('input', e=>{ const t=e.target; if(t.tagName==='TEXTAREA' && t.dataset.e){ const [k,f]=t.dataset.e.split('|'); (state.edit[k] ||= {})[f]=t.value; const r=rows.find(x=>x.key===k); if(r) r[f]=t.value; saveState(); t.style.height='auto'; t.style.height=t.scrollHeight+'px'; } });
document.addEventListener('click', e=>{ if(e.target.id==='clearBtn'){ if(!confirm('읽은 엑셀과 고친 내용을 지울까요?')) return; state=null; rows=[]; try{ localStorage.removeItem(STATE_LS); }catch(_){} render(); } });
$('#reGate').onclick=()=>{ if(!state) return; recommendGates(true); saveState(); render(); toast('입장문을 다시 추천했습니다.'); };
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


// 이미지로 저장: 핸드폰에서 보기 좋은 좁은 폭(430px)의 표를 화면 밖에 그려 PNG로 (카카오톡으로 보내기 좋게)
$('#pngBtn').onclick=async()=>{
  if(!state || !window.html2canvas){ toast('잠시 뒤 다시 눌러 주세요.'); return; }
  const s=state, list=rows.filter(r=>r.on).sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999)), total=s.rows.reduce((a,x)=>a+x.ppl,0);
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.vehicle&&r.group?+r.vehicle:0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>/현장/.test(r.note)).map(r=>r.name);
  const hae=s.rows.filter(x=>x.items.some(i=>/해오름/.test(i.p))), haeN=hae.reduce((a,x)=>a+x.items.filter(i=>/해오름/.test(i.p)).reduce((b,i)=>b+i.n,0),0);
  const box=$('#shot');
  box.innerHTML = `<div class="sh-h"><b>${esc(dLab(s.date))} 고객 응대</b><span>방문 ${total}명+@ · ${list.length}팀</span></div>`
    + `<table><thead><tr><th>단체 · 고객</th><th>인원</th><th>도착</th><th>입장문</th><th>차량</th></tr></thead><tbody>`
    + list.map(r=>`<tr><td class="nm${r.group?'':' ind'}"><b>${esc(r.name)}</b>${r.phone?`<small>${esc(r.phone)}</small>`:''}</td><td class="c">${r.ppl}</td><td class="c">${esc(r.time||r.timeHint||'')}</td><td class="c"><span class="g ${esc(r.gate)}">${esc(r.gate)}</span></td><td class="c">${esc(r.vehicle||'')}</td></tr>`
      + (r.note ? `<tr class="nt"><td colspan="5">${esc(r.note)}</td></tr>` : '')).join('')
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

if(state) build(false); else render();
loadGroups();
