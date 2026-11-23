// ===== 첫 화면 (index.html): 로그인 · 메뉴 · 품목관리 · 멤버관리 =====
// 공통 도구(SY: 공유 주소 · 날짜 · 전화 · esc · 저장소)는 js/common.js, 전체 구조는 README 14절

// 로그인 정보: localStorage 'sy_user' = {name, emp, at}. 같은 주소(hyunbin5786.github.io)의 단체 화면 · 견적서 사이트가 함께 씀
const $ = s => document.querySelector(s);
const USER_KEY = 'sy_user';
const QUOTE = 'document/index.html';   // 견적서 · 거래명세서 (이 사이트 안 document/, 예전 주소 sayuwon-invoice-quotation 도 그대로 있음)
const getUser = () => { try{ const u=JSON.parse(localStorage.getItem(USER_KEY)||'null'); return u && u.name && u.emp ? u : null; }catch(_){ return null; } };
const setLS = (k,v) => { try{ v==null ? localStorage.removeItem(k) : localStorage.setItem(k,v); }catch(_){} };

let view = location.hash==='#members' ? 'members' : 'menu';
function paint(){
  const u=getUser();
  $('#loginForm').hidden = !!u; $('#who').hidden = !u;
  $('#menuView').hidden = view!=='menu' && !!u; $('#memberView').hidden = !u || view!=='members';
  $('#menuView').classList.toggle('guest', !u); $('#hello').hidden = !u;   // 로그인 전에는 3열 「예약 현황 공유」만 (보기 전용)
  $('#shareHint').textContent = u ? '' : '로그인 없이 보기만';
  { const cr=$('#crumb'); if($('#catWrap').hidden){ cr.textContent = u && view==='members' ? '멤버관리' : ''; cr.hidden = !cr.textContent; } }   // 헤더: 시스템 이름 › 지금 화면
  if(u){
    $('#whoName').textContent = `👤 ${u.name}`; $('#whoName').title = `사번 ${u.emp}`;
    $('#hello').innerHTML = `${esc(u.name)}님, 무엇을 할까요?`;
    if($('#quoteLink')) $('#quoteLink').href = QUOTE;
    $('#setupBar').hidden = !u.setup;
    $('#setupBar').textContent = u.setup==='empty' ? '아직 등록된 멤버가 없어 누구나 로그인할 수 있습니다. 「관리 › 멤버관리」에서 직원(본인 포함)을 추가하면 그때부터 이름 · 사번을 확인합니다.'
      : '';
    if(location.hash==='#catalog') openCatalog();
    if(view==='members') loadMembers();
    if(view==='menu') setTimeout(()=>loadDash(), 0);   // 대시보드: 저장해 둔 것을 바로 그리고 새로 받음 (스크립트를 다 읽은 뒤)
  } else setTimeout(()=>$('#inName').focus(), 0);
}
const esc = SY.esc;   // 공통 도구 (js/common.js)

// ===================== 공유 저장소 (단체 화면과 같은 Apps Script) =====================
const getKey = SY.getKey;

// ===================== 로그인: 멤버 목록(이름 + 사번)과 맞아야 =====================
$('#loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name=$('#inName').value.trim(), emp=$('#inEmp').value.trim(), err=$('#loginErr'), btn=e.submitter||$('#loginForm button');
  if(!name || !emp){ err.textContent='이름과 사번을 모두 넣어 주세요.'; return; }
  if(!/^[0-9A-Za-z-]{2,20}$/.test(emp)){ err.textContent='사번은 숫자 · 영문으로 넣어 주세요.'; return; }
  err.textContent='확인하는 중…'; btn.disabled=true;
  let j=null; try{ j=await SY.callRaw({action:'login', name, emp}); }catch(_){ j=null; }
  btn.disabled=false;
  if(!j){ err.textContent='확인하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.'; return; }
  let setup='';
  if(j.ok && j.member) setup = j.empty ? 'empty' : '';
  else if(j.ok){ err.textContent='이름과 사번이 맞지 않습니다. 다시 확인해 주세요.'; $('#inEmp').select(); return; }
  else if(j.error==='too_many'){ err.textContent='틀린 로그인이 여러 번 이어져 잠시 막혔습니다. 15분쯤 뒤에 다시 해 주세요.'; return; }
  else { err.textContent='확인하지 못했습니다: '+(j.error||''); return; }
  setLS(USER_KEY, JSON.stringify({name, emp, at:new Date().toISOString(), setup}));
  setLS('sayuwon_owner', name);   // 단체 화면의 영업 담당
  setLS('sy_sender', name);       // 견적서 담당
  err.textContent=''; view='menu'; location.reload();   // 메뉴(☰ · 펼친 메뉴)를 로그인한 상태로 다시 그림
});
$('#logoutBtn').onclick=()=>{
  if(!confirm('로그아웃할까요? 다음 사람이 이름과 사번으로 다시 로그인합니다.')) return;
  [USER_KEY,'sayuwon_owner','sy_sender','sy_dash_cache'].forEach(k=>setLS(k,null));
  $('#inName').value=''; $('#inEmp').value=''; view='menu'; history.replaceState(null,'',location.pathname); location.reload();   // 메뉴도 로그아웃 상태로
};
// 메뉴
document.addEventListener('click', e=>{
  const c=e.target.closest('[data-go]'); if(!c) return;
  if(c.dataset.go==='catalog'){ e.preventDefault(); openCatalog(); }
  if(c.dataset.go==='members'){ e.preventDefault(); view='members'; history.replaceState(null,'','#members'); paint(); }
});
// 헤더의 「사유원 운영 보조 시스템」 = 메뉴로 (품목관리는 남은 변경을 저장한 뒤)
$('#brand').addEventListener('click', e=>{ if(!getUser()) return; e.preventDefault(); if(!$('#catWrap').hidden){ askClose(); return; } view='menu'; history.replaceState(null,'',location.pathname); paint(); });

// ===================== 멤버관리 (로그인으로 확인, 2026-11-21) =====================
let members=[], roles=null;   // roles = {quote:[사번…]} 견적서 · 거래명세서 담당 (2026-11-23 · 서버가 예전 것이면 null)
function paintMembers(){
  const u=getUser()||{};
  $('#memberHint').textContent = members.length ? `${members.length}명` : '';
  $('#memberList').innerHTML = members.map(m=>`<tr class="${m.emp===u.emp?'me':''}"><td>${esc(m.name)}</td><td>${esc(m.emp)}</td><td class="hint">${esc(m.added||'')}${m.by?` · ${esc(m.by)}`:''}</td><td><label class="mrole" title="고객 견적 요청이 이 사람의 할일로 나옵니다"><input type="checkbox" data-mrole="quote" data-emp="${esc(m.emp)}"${roles && (roles.quote||[]).some(x=>String(x).trim().toUpperCase()===String(m.emp).trim().toUpperCase())?' checked':''}> 담당</label></td><td class="r"><button type="button" class="btn-sm del" data-mdel="${esc(m.emp)}" data-mname="${esc(m.name)}">빼기</button></td></tr>`).join('')
    || '<tr><td colspan="5" class="hint">아직 멤버가 없습니다. 위에서 추가하면 그때부터 로그인할 때 이름 · 사번을 확인합니다.</td></tr>';
}
async function memberCall(body){
  $('#memberErr').textContent='';
  let j=null; try{ j=await SY.callRaw(body); }catch(_){}
  if(!j){ $('#memberErr').textContent='연결하지 못했습니다. 잠시 뒤 다시 해 주세요.'; return null; }
  if(j.error==='bad_key'){ $('#memberBody').hidden=true; $('#memberKey').hidden=false; $('#memberKeyErr').textContent = ''; return null; }
  if(j.error==='bad_action' || (j.ok && !j.members)){ $('#memberErr').textContent='멤버 목록을 받지 못했습니다: '+(j.error||''); $('#memberBody').hidden=false; $('#memberKey').hidden=true; return null; }
  if(!j.ok){ $('#memberErr').textContent='실패했습니다: '+(j.error||''); return null; }
  $('#memberKey').hidden=true; $('#memberBody').hidden=false;
  members=j.members||[]; if(j.roles) roles=j.roles; paintMembers(); return j;
}
const loadMembers = () => { if(!getKey()){ $('#memberKey').hidden=false; $('#memberBody').hidden=true; return; } memberCall({action:'members'}); };
// (멤버관리 팀 비밀번호 칸은 없앰 · 2026-11-21 — 로그인으로 확인)
// "이름 사번" 줄들 → [{name, emp}]
const parseLines = t => String(t||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{ const m=l.match(/^(.+?)[\s,\t]+([0-9A-Za-z-]{2,20})$/); return m ? {name:m[1].replace(/[,\t]/g,'').trim(), emp:m[2]} : {bad:l}; });
async function addList(list){
  const bad=list.filter(x=>x.bad), ok=list.filter(x=>!x.bad);
  if(!ok.length){ $('#memberErr').textContent = bad.length ? `읽지 못한 줄: ${bad.map(b=>b.bad).join(' / ')}` : '이름과 사번을 넣어 주세요.'; return false; }
  const before=members.length, j=await memberCall({action:'memberAdd', list:ok, by:(getUser()||{}).name||''}); if(!j) return false;
  const skipped=ok.length-j.added;
  $('#memberErr').textContent = [`${j.added}명 추가했습니다.`, skipped?`${skipped}명은 이미 있는 사번이라 건너뜀`:'', bad.length?`읽지 못한 줄: ${bad.map(b=>b.bad).join(' / ')}`:''].filter(Boolean).join(' · ');
  $('#memberErr').style.color = 'var(--pine)'; setTimeout(()=>$('#memberErr').style.color='', 4000);
  if(before===0 && j.added){ const u=getUser(); if(u && u.setup==='empty'){ u.setup=''; setLS(USER_KEY, JSON.stringify(u)); $('#setupBar').hidden=true; } }
  return true;
}
$('#memberAdd').addEventListener('submit', async e=>{ e.preventDefault(); const name=$('#mName').value.trim(), emp=$('#mEmp').value.trim();
  if(!name || !/^[0-9A-Za-z-]{2,20}$/.test(emp)){ $('#memberErr').textContent='이름과 사번(숫자 · 영문)을 넣어 주세요.'; return; }
  if(await addList([{name, emp}])){ $('#mName').value=''; $('#mEmp').value=''; $('#mName').focus(); } });
$('#mBulkBtn').onclick=async()=>{ if(await addList(parseLines($('#mBulk').value))) $('#mBulk').value=''; };
document.addEventListener('click', async e=>{ const b=e.target.closest('[data-mdel]'); if(!b) return;
  const u=getUser()||{}, self=b.dataset.mdel===u.emp;
  if(!confirm(`${b.dataset.mname}(${b.dataset.mdel}) 님을 멤버에서 뺄까요?${self?'\n본인입니다. 빼면 다음 로그인부터 들어올 수 없습니다.':''}`)) return;
  memberCall({action:'memberDel', emp:b.dataset.mdel, by:u.name||''}); });
// 견적서 · 거래명세서 담당 지정 (2026-11-23): 체크하면 바로 저장. 여러 명도 가능
document.addEventListener('change', async e=>{ const c=e.target.closest('[data-mrole]'); if(!c) return;
  const j=await memberCall({action:'memberRole', role:c.dataset.mrole, emp:c.dataset.emp, on:c.checked});
  if(!j || !j.roles){ c.checked=!c.checked; if(j) $('#memberErr').textContent='담당 지정은 서버(Cloudflare Worker)를 새 코드로 바꾼 뒤부터 됩니다.'; return; }
  dashSoon(300); });
// 품목관리 (#catalog): 메뉴에서 열면 이 화면 안의 한 페이지 (헤더 아래 꽉 차게), 닫기(저장이 끝난 뒤) · ← 메뉴 로 메뉴에
function openCatalog(){ $('#catFrame').src = QUOTE + (QUOTE.includes('?')?'&':'?') + 'catalog=1&page=1&t=' + Date.now();   /* page=1: 페이지 모양 (팝업 테두리 · × 없음) */ $('#catWrap').hidden=false; document.querySelector('main').hidden=true; $('#crumb').textContent='품목관리'; $('#crumb').hidden=false; if(location.hash!=='#catalog') history.replaceState(null,'','#catalog'); }
function closeCatalog(){ $('#catWrap').hidden=true; document.querySelector('main').hidden=false; view='menu'; $('#crumb').hidden=true; $('#catFrame').src='about:blank'; history.replaceState(null,'',location.pathname); }
window.addEventListener('message', e=>{ if(!e.data || e.data.type!=='sy-catalog' || e.source!==$('#catFrame').contentWindow) return; if(e.data.ev==='close') closeCatalog(); });
const askClose = () => $('#catFrame').contentWindow?.postMessage({type:'sy-catalog', ev:'close-request'}, '*');

document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#catWrap').hidden){ e.preventDefault(); askClose(); } });
paint();
// 이미 로그인한 브라우저도 첫 화면을 열 때 다시 확인: 멤버에서 빠졌거나 이름 · 사번이 다르면 로그아웃
(async()=>{ const u=getUser(); if(!u) return; let j=null; try{ j=await SY.callRaw({action:'login', name:u.name, emp:u.emp}); }catch(_){ return; }
  if(!j || !j.ok) return;   // 연결 안 됨 · 예전 버전이면 그대로 둠
  if(!j.member){ [USER_KEY,'sayuwon_owner','sy_sender','sy_dash_cache'].forEach(k=>setLS(k,null)); view='menu'; paint(); window.syMenu && window.syMenu(false); $('#loginErr').textContent='등록된 멤버가 아니어서 로그아웃했습니다. 이름과 사번을 다시 확인해 주세요.'; return; }
  const setup = j.empty ? 'empty' : ''; if((u.setup||'')!==setup){ u.setup=setup; setLS(USER_KEY, JSON.stringify(u)); paint(); } })();


// ===================== 대시보드: 모든 사용자의 나의 할일 (단체 · 개인고객 추후 과업 + 기타 개인 업무) =====================
// 단체: 영업 담당(owner)별, 방문 뒤 30일이 지난 예약은 빼고 (나의 할일과 같은 기준). 예약상담은 사전답사 · 담당자 확정 · 대구대교구 · 직접 추가한 과업만
// 개인고객: 받은(저장한) 사람별 안 끝난 과업 · 기타 개인 업무: 오늘 할 것 + 지난 것(반복은 최근 7일)
const GROUP_TYPES = ['단체예약','예약상담','가예약','예약확정','예약접수','상담','공식예약'];   // 예약취소는 대시보드에서 뺌 (2026-11-18 4단계)
// 다음주 예약 점검 (2026-11-20): 방문일 전주 목요일 (지났으면 방문 전날, 그것도 지났으면 오늘) · 예전 주간 점검 기록(id wk+이름+목요일)에서 체크한 예약은 끝난 것
const wkHash = s => { let h=5381; for(const c of String(s)) h=((h*33) ^ c.codePointAt(0))>>>0; return h.toString(36); };
const wkPrevThu = d => { const t=new Date(d+'T00:00'); t.setDate(t.getDate()-((t.getDay()+6)%7)-4); return opsYmd(t); };
const wkLimit = d => { const thu=wkPrevThu(d), today=opsToday(); if(thu>=today) return thu; const p=new Date(d+'T00:00'); p.setDate(p.getDate()-1); const pd=opsYmd(p); return pd>=today ? pd : today; };
const booked = r => ['가예약','예약확정','예약접수','공식예약'].includes(r.callType) || (/^adm/.test(r.id||'') && (r.callType||'단체예약')==='단체예약');
const histTasks = r => { try{ const j=JSON.parse(r.history||'{}'); return Array.isArray(j.tasks) ? j.tasks : []; }catch(_){ return []; } };
// 단체 과업이 예약 내용으로 이미 끝났는지 (단체 화면 추후 과업과 같은 기준, 2026-11-18): 저장 전이라 「오늘 마감」으로 남던 것
//  전산 예약 = 전산 등록 · 결제링크 전송 · 입금 확인 = 비고 칸에 그 일시 · 하위 과업이 모두 체크 · 예전 기준(담당자 이름 등)으로 생긴 전산 예약 수정
const memoVal = (r, label) => { const parts=String(r.memo||'').split(' / ').map(s=>s.trim()), p=parts.find(s=>s.startsWith(label+' ')); return p ? p.slice(label.length+1).trim() : ''; };   // 비고 칸 「항목 값 / 항목 값」에서 그 항목의 값
const memoHas = (r, label) => !!memoVal(r, label);
// 미정 항목 (단체 화면과 같은 기준): 비고 칸 '미정 체크' 에서 정해진 것은 뺌 — 결제 · 차량을 정했으면 빠짐
function tbdLeft(r){ const s=memoVal(r,'미정 체크').split(/\s*,\s*/).filter(Boolean);
  return s.filter(x=> !(x==='결제 방법' && r.pay && r.pay!=='미정') && !(x==='차량 대수' && r.vehicle && r.vehicle!=='미정') && !(x==='몽몽마방 결제' && memoVal(r,'마방 결제') && memoVal(r,'마방 결제')!=='미정')); }
function doneByRec(t, r){
  if(t.id==='erp') return /^adm/.test(r.id) || memoHas(r,'전산 등록');
  if(t.id==='linksend') return memoHas(r,'결제링크 전송');
  if(t.id==='paycheck') return memoHas(r,'입금 확인');
  if(t.id==='tbdcall') return !tbdLeft(r).length;   // 미정 항목이 다 정해지면
  if(t.id==='onsitecall') return r.pay!=='현장 결제';   // 현장 결제가 아니면 필요 없음
  if(t.id==='erpfix') return !(t.v===4 && (t.changes||[]).length) && !(t.changes||[]).some(c=>/전산 비고/.test(c)) && !t.memo && !(t.xsubs||[]).length;
  const st=[...Object.values(t.subs||{}).map(Boolean), ...(t.xsubs||[]).map(x=>!!x.done)];
  return st.length>0 && st.every(Boolean);
}
const dueOf = (t, r) => t.due || (t.at ? opsYmd(t.at) : r.saved ? opsYmd(r.saved) : opsToday());
// 첫 화면 = 대시보드만 (2026-11-18): ① 개인고객 전화 ② 단체고객 전화 ③ 기타 개인 할일 ④ 개인 할일 보기(1행 1명 · 숫자)
//  ①② 줄 = 예약 · 통화 하나: 단체명 / 접수자 이름 (없으면 전화번호) → 아래 회색으로 오늘까지(기한 지난 것 포함) 할 과업. 「내일 마감도 보기」면 내일 것도
//  ③ 줄 = 업무 하나 · ④ 이름을 누르면 ①②③을 그 사람 것만 · 위 검색: 전화번호 · 단체명 · 이름
//  빠르게: 마지막으로 받은 내용을 이 브라우저에 두고(sy_dash_cache) 바로 그린 뒤 새로 받아 다시 그림
const DASH_LS = 'sy_dash_cache';
let dashData = (()=>{ try{ const c=JSON.parse(localStorage.getItem(DASH_LS)||'null'); return c && c.recs ? c : null; }catch(_){ return null; } })();
let dashTomorrow = new Set(), dashWho = '', dashLoading = false;
// ===== 과업 계산 = 나의 할일과 똑같이 (2026-11-21) =====
// 단체 예약의 과업은 단체 화면 규칙(group.js)으로 계산해야 저장 안 된 과업(아무도 그 예약을 아직 안 열었을 때)까지 나옴 →
// 첫 화면에 보이지 않는 창(#dashEngine = group.html?my=1&embed=1)을 띄워 그 tasksOf 로 계산. 준비 전에는 저장된 과업으로 (예전처럼)
let lastItems=null, engineWait=null, lastReq=(()=>{ try{ return JSON.parse(localStorage.getItem('sy_dash_req')||'null')||{items:[], owners:[]}; }catch(_){ return {items:[], owners:[]}; } })();   // 고객 견적 요청(접수 상태) · 견적서 담당자 이름들
function engine(){ try{ const w=$('#dashEngine').contentWindow; return w && typeof w.tasksOf==='function' && w.__tasksReady && w.eval('typeof quoteCat!=="undefined" && !!quoteCat') ? w : null; }catch(_){ return null; } }
function startEngine(){ const f=$('#dashEngine'); if(!f || f.src || !getUser()) return; f.src='group.html?my=1&embed=1&engine=1&t='+Date.now();
  clearInterval(engineWait); let n=0; engineWait=setInterval(()=>{ n++; if(engine()){ clearInterval(engineWait); if(lastItems){ dashData={...(dashData||{}), recs:dashRecs(lastItems)}; renderDash(); } } else if(n>60) clearInterval(engineWait); }, 500); }
function dashRecs(items){
  const recs=[], E=engine();
  items.forEach(r=>{
    const ct=r.callType||'단체예약';
    if(GROUP_TYPES.includes(ct)){
      if(r.date && (new Date(opsToday()) - new Date(r.date))/864e5 > 30) return;
      if(ct==='예약취소') return;   // 예약취소는 과업 없음
      const consult = ct==='예약상담' || ct==='상담';
      if(E){   // 나의 할일과 같은 규칙 (안 끝난 과업 모두 · 마감 = 나의 할일과 같음)
        let ts=[]; try{ ts=(E.tasksOf(r)||[]).filter(t=>!t.done && !t.removed).map(t=>({title:t.title, due:t.due||dueOf(t,r)})); }catch(_){ ts=null; }
        if(ts){ if(ts.length) recs.push({kind:'단체', owner:(r.owner||r.takenBy||'').trim(), name:r.org||r.contact||r.phone||'(업체 미정)', q:[r.org,r.contact,r.phone].join(' '), tasks:ts, href:'group.html?open='+encodeURIComponent(r.id)}); return; } }
      const d00=String(r.date||'').slice(0,10), wkSoon = histTasks(r).some(t=>t.id==='wkcheck' && !t.removed) || (booked(r) && d00>=opsToday());   // 다음주 예약 점검이 따로 나올 예약인지
      const ts=histTasks(r).filter(t=>!t.done && !t.removed && !doneByRec(t, r) && (!consult || ['tour','clergy'].includes(t.id) || t.custom) && !(t.id==='tbdcall' && wkSoon))   // 예전 「미정 항목 확인 연락」은 다음주 예약 점검에 합침 (2026-11-23)
        .map(t=>({title: t.id==='tbdcall' ? '다음주 예약 점검' : t.title, due:dueOf(t,r)}));
      // 다음주 예약 점검 (2026-11-20 · group.js wkcheck 와 같은 기준): 가예약 · 예약확정이고 방문일이 오늘 이후면 예약마다 방문일 전주 목요일 마감 (아직 저장된 과업이 없어도)
      const d0=String(r.date||'').slice(0,10), o0=(r.owner||r.takenBy||'').trim();
      if(booked(r) && d0>=opsToday() && !histTasks(r).some(t=>t.id==='wkcheck')){ const thu=wkPrevThu(d0), w=items.find(x=>x.id==='wk'+wkHash(o0)+thu.replace(/-/g,'')); let dn={}; try{ dn=(JSON.parse((w||{}).history||'{}')||{}).done||{}; }catch(_){}
        if(!dn[r.id]) ts.push({title:'다음주 예약 점검', due:wkLimit(d0)}); }
      if(ts.length) recs.push({kind:'단체', owner:(r.owner||r.takenBy||'').trim(), name:r.org||r.contact||r.phone||'(업체 미정)', q:[r.org,r.contact,r.phone].join(' '), tasks:ts, href:'group.html?open='+encodeURIComponent(r.id)});
    } else if(ct==='개인고객'){
      const ts=histTasks(r).filter(t=>!t.done).map(t=>({title:t.title, due:dueOf(t,r)}));
      if(ts.length) recs.push({kind:'개인', owner:(r.owner||r.takenBy||'').trim(), name:r.contact||r.phone||'(이름 없음)', q:[r.contact,r.phone].join(' '), tasks:ts, href:'personal.html?open='+encodeURIComponent(r.id)});
    } else if(ct===OPS_TYPES.task){
      const j=opsParse(r); if(!j) return; const d=j.d||{}, today=opsToday(), tm=new Date(today+'T00:00'); tm.setDate(tm.getDate()+1); const t2=opsYmd(tm);
      const days=opsPending(d, today); if(opsOccurs(d, t2) && !(d.done||{})[t2]) days.push(t2);
      for(let i=2;i<400;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(opsOccurs(d, day) && !(d.done||{})[day]){ days.push(day); break; } }   // 그 뒤 다음 할 날도 (개인 할일 보기의 이번주 · 전체 숫자용)
      const subs=d.subs||[], subTxt = day => subs.length ? `세부 과업 ${subs.filter(s=>((d.subDone||{})[day]||{})[s.id]).length}/${subs.length}` : opsRepeatLabel(d);
      if(days.length) recs.push({kind:'기타', owner:(d.owner||r.takenBy||'').trim(), name:d.title||'(업무)', q:d.title||'', tasks:days.map(day=>({title:subTxt(day), due:day})), href:'group.html?my=1&tab=etc'});
    }
  });
  // 고객 견적 요청 (2026-11-23): 아직 「접수」인 요청 = 견적서 · 거래명세서 담당자(멤버관리에서 지정)의 할일. 담당이 여럿이면 각자에게, 없으면 「담당 없음」. 마감 = 접수한 날
  (lastReq.items||[]).forEach(r=>{ (lastReq.owners.length ? lastReq.owners : ['']).forEach(o=>recs.push({kind:'기타', owner:o, name:`견적 요청 · ${r.org||''} ${r.name?r.name+'님':''}`.trim(), q:[r.org,r.name,r.phone].join(' '),
    tasks:[{title:'견적서 · 거래명세서 발급'+(r.date?` (방문 ${opsDateLabel(r.date)})`:''), due:String(r.at||'').slice(0,10)||opsToday()}], href:QUOTE})); });
  return recs;
}
async function loadDash(){
  if(!getUser()) return;
  if(!getKey()){ $('#dashKey').hidden=false; $('#dashBody').innerHTML=''; return; }
  $('#dashKey').hidden=true;
  if(dashData) renderDash(); else $('#dashBody').innerHTML='<p class="hint">불러오는 중…</p>';
  if(dashLoading) return; dashLoading=true;
  try{
    const [j, m, qr] = await Promise.all([SY.list(), SY.callRaw({action:'members'}).catch(()=>null), SY.callRaw({action:'quoteReqList'}).catch(()=>null)]);   // 목록 · 멤버 · 고객 견적 요청을 함께 받음
    if(m && m.ok && qr && qr.ok){ const up=s=>String(s||'').trim().toUpperCase(), es=((m.roles||{}).quote||[]).map(up);
      lastReq={items:(qr.items||[]).filter(r=>(r.status||'접수')==='접수').map(r=>({org:r.org, name:r.name, phone:r.phone, date:r.date, at:r.at})), owners:(m.members||[]).filter(x=>es.includes(up(x.emp))).map(x=>String(x.name||'').trim()).filter(Boolean)};
      try{ localStorage.setItem('sy_dash_req', JSON.stringify(lastReq)); }catch(_){} }
    if(!j.ok){ if(j.error==='bad_key'){ $('#dashKey').hidden=false; $('#dashBody').innerHTML='<p class="err">'+SY.authFail()+'</p>'; return; } throw new Error(j.error); }
    const names = m && m.ok ? (m.members||[]).map(x=>String(x.name||'').trim()).filter(Boolean) : ((dashData && dashData.names)||[]);
    lastItems=j.items||[]; startEngine();
    dashData = {recs:dashRecs(lastItems), names, at:Date.now()};
    try{ localStorage.setItem(DASH_LS, JSON.stringify(dashData)); }catch(_){}
    renderDash();
  }catch(e){ if(!dashData) $('#dashBody').innerHTML='<p class="err">불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; }
  finally{ dashLoading=false; }
}
function renderDash(){ if(!dashData) return;
  const today=opsToday(), tm=new Date(today+'T00:00'); tm.setDate(tm.getDate()+1); const tomorrow=opsYmd(tm), me=(getUser()||{}).name||'';
  const q=(($('#dashQ')||{}).value||'').trim().toLowerCase(), qd=q.replace(/\D/g,'');
  const hit = r => !q || r.q.toLowerCase().includes(q) || (qd.length>=3 && r.q.replace(/\D/g,'').includes(qd));   // 전화번호는 - 없이도
  const who = r => r.owner || '(담당 없음)';
  const recs = dashData.recs.filter(r=>hit(r) && (!dashWho || who(r)===dashWho));
  const dl = d => d<today ? `<span class="late">지남 ${esc(opsDateLabel(d))}</span>` : d===today ? '오늘' : d===tomorrow ? '내일' : esc(opsDateLabel(d));
  const first = r => r.due.reduce((m,t)=>t.due<m?t.due:m, '9999');
  const col = (kind, title) => { const withT=dashTomorrow.has(kind), lim=withT?tomorrow:today;
    const L=recs.filter(r=>r.kind===kind).map(r=>({...r, due:r.tasks.filter(t=>t.due<=lim)})).filter(r=>r.due.length).sort((a,b)=>first(a).localeCompare(first(b)) || a.name.localeCompare(b.name));
    const nT=recs.filter(r=>r.kind===kind && r.tasks.some(t=>t.due===tomorrow)).length;
    return `<div class="dcol"><div class="dcol-h"><b>${title}</b><span class="dn">${L.length}</span></div>`
      + `<button type="button" class="dtm${withT?' on':''}" data-dtm="${kind}">${withT?'오늘까지만 보기':`내일 마감도 보기${nT?` (${nT})`:''}`}</button>`
      + (L.length ? `<ul class="dlist">${L.map(r=>{ const late=r.due.some(t=>t.due<today);
          return `<li class="drec${late?' late':''}"><a href="${r.href}"><span class="dr-h"><b>${esc(r.name)}</b><span class="downer${r.owner===me?' me':''}">${esc(r.owner||'담당 없음')}</span></span>`
            + r.due.slice().sort((a,b)=>a.due.localeCompare(b.due)).map(t=>`<span class="dr-t">${dl(t.due)} · ${esc(t.title)}</span>`).join('') + `</a></li>`; }).join('')}</ul>`
        : `<p class="hint dempty">${q?'검색에 맞는 것이 없습니다.':withT?'오늘 · 내일까지 할 것이 없습니다.':'오늘까지 할 것이 없습니다.'}</p>`) + `</div>`; };
  // ④ 개인 할일 보기: 1행 1명, 오늘까지 할 것(기한 지난 것 포함)이 있는 예약 · 통화 · 업무 수 — 개인고객 전화 · 단체고객 전화 · 기타
  // 칸마다 숫자 3개 = 오늘까지 · 이번주까지(오늘부터 6일 뒤까지, 예: 수요일이면 다음주 화요일) · 모든 기간 (2026-11-18)
  const wk=new Date(today+'T00:00'); wk.setDate(wk.getDate()+6); const weekEnd=opsYmd(wk);
  const all=dashData.recs.filter(hit), cnt=(n,k,lim)=>all.filter(r=>who(r)===n && r.kind===k && r.tasks.some(t=>!lim || t.due<=lim)).length, lateN=n=>all.filter(r=>who(r)===n && r.tasks.some(t=>t.due<today)).length;
  const trio = (n,k) => [cnt(n,k,today), cnt(n,k,weekEnd), cnt(n,k,'')];
  const people=[...new Set([...dashData.names, ...dashData.recs.map(who)])].map(n=>({n, a:trio(n,'개인'), b:trio(n,'단체'), c:trio(n,'기타'), l:lateN(n)}))
    .sort((x,y)=>(y.n===me)-(x.n===me) || (y.a[0]+y.b[0]+y.c[0])-(x.a[0]+x.b[0]+x.c[0]) || (y.a[2]+y.b[2]+y.c[2])-(x.a[2]+x.b[2]+x.c[2]) || x.n.localeCompare(y.n));
  const num = t => `<td class="t3">${t.map((v,i)=>`<span class="${v?'':'z'}${i===0?' d':''}">${v}</span>`).join('<i>·</i>')}</td>`;
  const col4 = `<div class="dcol"><div class="dcol-h"><b>개인 할일 보기</b><span class="dn">오늘 · 이번주 · 전체</span></div>${dashWho?`<p class="pfilter">${esc(dashWho)} 것만 보는 중 · 다시 누르면 모두</p>`:''}`
    + `<div class="ptbl-wrap"><table class="ptbl"><thead><tr><th>이름</th><th>개인고객</th><th>단체고객</th><th>기타</th></tr><tr class="sub"><th></th>${'<th><span>오늘</span><i>·</i><span>주</span><i>·</i><span>전체</span></th>'.repeat(3)}</tr></thead><tbody>${people.map(p=>`<tr class="${p.n===dashWho?'on':''}${p.n===me?' me':''}" data-dwho="${esc(p.n)}"><td>${esc(p.n)}${p.l?`<span class="late"> 지남 ${p.l}</span>`:''}</td>${num(p.a)}${num(p.b)}${num(p.c)}</tr>`).join('')}</tbody></table></div>`
    + `<p class="hint ptbl-note">숫자 = 그때까지 할 일이 있는 예약 · 통화 · 업무 수 · 이번주 = 오늘부터 ${esc(opsDateLabel(weekEnd))}까지</p></div>`;
  $('#dashBody').innerHTML = `<div class="dcols">${col('개인','개인고객 전화')}${col('단체','단체고객 전화')}${col('기타','기타 개인 할일')}${col4}</div>`;
}
document.addEventListener('click', e=>{
  const t=e.target.closest('[data-dtm]'); if(t){ const k=t.dataset.dtm; dashTomorrow.has(k) ? dashTomorrow.delete(k) : dashTomorrow.add(k); renderDash(); return; }
  const w=e.target.closest('[data-dwho]'); if(w){ dashWho = dashWho===w.dataset.dwho ? '' : w.dataset.dwho; renderDash(); }
});
if($('#dashQ')) $('#dashQ').addEventListener('input', ()=>renderDash());
$('#dashReload').onclick = () => loadDash();
// (대시보드 팀 비밀번호 칸은 없앰 · 2026-11-21 — 로그인으로 확인)
// 대시보드 새로 받기 (2026-11-18 · 거의 실시간): 20초마다 · 이 창으로 돌아오면 · 다른 탭(단체 · 개인고객 · 나의 할일)에서 저장하면 바로
const dashSoon = (ms=0) => { clearTimeout(dashSoon.t); dashSoon.t=setTimeout(()=>{ if(getUser() && !$('#menuView').hidden && document.visibilityState==='visible') loadDash(); }, ms); };
setInterval(()=>dashSoon(), 20e3);
window.addEventListener('focus', ()=>dashSoon());
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') dashSoon(); });
window.addEventListener('storage', e=>{ if(/^(sayuwon_intake_pending|sayuwon_personal_pending|sayuwon_intake_cache|sayuwon_personal_cache)$/.test(e.key||'')) dashSoon(2500); });   // 다른 탭의 저장 대기 · 받은 기록이 바뀜 → 저장이 끝날 즈음 다시
