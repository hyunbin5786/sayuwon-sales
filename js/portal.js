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
  $('#memberList').innerHTML = members.map(m=>`<tr class="${m.emp===u.emp?'me':''}"><td>${esc(m.name)}</td><td>${esc(m.emp)}</td><td><input class="mphone" data-mphone="${esc(m.emp)}" value="${esc(m.phone||'')}" inputmode="tel" placeholder="010-0000-0000" maxlength="20" title="고치고 Enter 또는 다른 곳을 누르면 저장"></td><td class="hint">${esc(m.added||'')}${m.by?` · ${esc(m.by)}`:''}</td><td class="r"><button type="button" class="btn-sm del" data-mdel="${esc(m.emp)}" data-mname="${esc(m.name)}">빼기</button></td></tr>`).join('')
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
//  끝에 연락처를 붙여도 됨 "이름 사번 010-1234-5678" (2026-11-24)
const parseLines = t => String(t||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
  const p=l.match(/^(.+?)[\s,\t]+(01\d[-\s.]?\d{3,4}[-\s.]?\d{4})$/), body=p ? p[1].trim() : l, phone=p ? SY.fmtPhone(p[2].replace(/[\s.]/g,'')) : '';
  const m=body.match(/^(.+?)[\s,\t]+([0-9A-Za-z-]{2,20})$/); return m ? {name:m[1].replace(/[,\t]/g,'').trim(), emp:m[2], phone} : {bad:l}; });
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
$('#memberAdd').addEventListener('submit', async e=>{ e.preventDefault(); const name=$('#mName').value.trim(), emp=$('#mEmp').value.trim(), phone=SY.fmtPhone($('#mPhone').value.trim());
  if(!name || !/^[0-9A-Za-z-]{2,20}$/.test(emp)){ $('#memberErr').textContent='이름과 사번(숫자 · 영문)을 넣어 주세요.'; return; }
  if(await addList([{name, emp, phone}])){ $('#mName').value=''; $('#mEmp').value=''; $('#mPhone').value=''; $('#mName').focus(); } });
// 멤버 연락처 고치기 (2026-11-24): 표의 칸을 고치고 Enter 또는 다른 곳을 누르면 저장 (분실물 습득 접수 때 습득자 연락처로 자동)
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('input[data-mphone]')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('change', async e=>{ const p=e.target.closest && e.target.closest('input[data-mphone]'); if(!p) return;
  const emp=p.dataset.mphone, phone=SY.fmtPhone(p.value.trim()), cur=(members.find(m=>m.emp===emp)||{}).phone||'';
  if(phone===cur){ p.value=phone; return; }
  const j=await memberCall({action:'memberPhone', emp, phone});
  if(!j){ if($('#memberErr').textContent.includes('bad_action')) $('#memberErr').textContent='연락처 저장은 서버(Cloudflare Worker)를 새 코드로 바꾼 뒤부터 됩니다.'; p.value=cur; return; }
  $('#memberErr').textContent=`${(members.find(m=>m.emp===emp)||{}).name||''} 님 연락처를 저장했습니다.`; $('#memberErr').style.color='var(--pine)'; setTimeout(()=>{ $('#memberErr').style.color=''; }, 3000); });
$('#mBulkBtn').onclick=async()=>{ if(await addList(parseLines($('#mBulk').value))) $('#mBulk').value=''; };
document.addEventListener('click', async e=>{ const b=e.target.closest('[data-mdel]'); if(!b) return;
  const u=getUser()||{}, self=b.dataset.mdel===u.emp;
  if(!confirm(`${b.dataset.mname}(${b.dataset.mdel}) 님을 멤버에서 뺄까요?${self?'\n본인입니다. 빼면 다음 로그인부터 들어올 수 없습니다.':''}`)) return;
  memberCall({action:'memberDel', emp:b.dataset.mdel, by:u.name||''}); });
// 견적서 · 거래명세서 담당 지정 (2026-11-23): 체크하면 바로 저장. 여러 명도 가능 — 2026-11-24 멤버관리 표에서 열을 뺌 (아래 처리는 남겨 둠 · 이미 지정된 사람은 그대로)
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
let dashTomorrow = new Set(), dashWho = '', dashLoading = false, dashMem = (()=>{ try{ return localStorage.getItem('sy_dash_mem')||''; }catch(_){ return ''; } })();   // dashMem: 개인 업무에서 고른 멤버 (2026-11-24 · '' = 전체)
// ===== 대시보드 마감 기간 버튼 (2026-11-24): 위 왼쪽 — 오늘 마감 · 내일 마감 · 이번주 마감 · 이번달 마감 · 기간설정(시작일 ~ 끝날) · 오른쪽 = 검색 =====
//  오늘 · 내일 · 이번주(이번 일요일까지) · 이번달(말일까지) = 그날까지 마감인 것 (지난 것 포함) · 기간설정 = 고른 시작일 ~ 끝날 마감인 것만
//  고른 것은 이 브라우저에 기억 (sy_dash_range)
const DASH_RANGES = [['today','오늘 마감'],['tomorrow','내일 마감'],['week','이번주 마감'],['month','이번달 마감'],['custom','기간설정']];
let dashRange = (()=>{ try{ const v=JSON.parse(localStorage.getItem('sy_dash_range')||'null'); return v && v.k ? v : {k:'today'}; }catch(_){ return {k:'today'}; } })();
function dashRangeDates(today){   // [시작('' = 처음부터), 끝]
  const d=new Date(today+'T00:00'), add=n=>{ const x=new Date(d); x.setDate(x.getDate()+n); return opsYmd(x); };
  if(dashRange.k==='tomorrow') return ['', add(1)];
  if(dashRange.k==='week') return ['', add((7-d.getDay())%7)];   // 이번 일요일까지 (일요일이면 오늘)
  if(dashRange.k==='month') return ['', opsYmd(new Date(d.getFullYear(), d.getMonth()+1, 0))];
  if(dashRange.k==='custom'){ const f=dashRange.from||today, t=dashRange.to||f; return f<=t ? [f, t] : [t, f]; }
  return ['', today];
}
function paintRange(){ const box=$('#dashRange'); if(!box) return; const today=opsToday();
  const sig=JSON.stringify(dashRange); if(box.dataset.sig===sig) return; box.dataset.sig=sig;   // 날짜 칸을 고르는 중에 다시 그리지 않게
  box.innerHTML = DASH_RANGES.map(([k,l])=>`<button type="button" class="dr-btn${dashRange.k===k?' on':''}" data-drange="${k}">${l}</button>`).join('')
    + (dashRange.k==='custom' ? `<span class="dr-cus"><input type="date" id="drFrom" value="${esc(dashRange.from||today)}"><span>~</span><input type="date" id="drTo" value="${esc(dashRange.to||dashRange.from||today)}"></span>` : ''); }
function setRange(r){ dashRange=r; try{ localStorage.setItem('sy_dash_range', JSON.stringify(r)); }catch(_){} paintRange(); renderDash(); }
document.addEventListener('click', e=>{ const b=e.target.closest('[data-drange]'); if(!b) return; const k=b.dataset.drange, t=opsToday();
  setRange(k==='custom' ? {k, from:dashRange.from||t, to:dashRange.to||t} : {k}); });
document.addEventListener('change', e=>{ if(e.target.id==='drFrom' || e.target.id==='drTo'){ const f=$('#drFrom').value, t=$('#drTo').value; if(f && t) setRange({k:'custom', from:f, to:t}); } });
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
      const ts=histTasks(r).filter(t=>!t.done && !t.removed && !doneByRec(t, r) && (!consult || ['tour','clergy'].includes(t.id) || t.custom) && !((t.id==='tbdcall' || t.id==='onsitecall') && wkSoon))   // 예전 「미정 항목 확인 연락」 · 「현장 결제 인원 확인 연락」은 다음주 예약 점검에 합침 (2026-11-23)
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
  // 고객 견적 요청 (2026-11-23 · 2026-11-24 바꿈): 아직 「접수」인 요청 = 담당 없는 공통 업무 (대시보드 4열 2행) · 마감 = 접수한 날
  (lastReq.items||[]).forEach(r=>{ [''].forEach(o=>recs.push({kind:'기타', owner:o, name:`견적 요청 · ${r.org||''} ${r.name?r.name+'님':''}`.trim(), q:[r.org,r.name,r.phone].join(' '),
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
    lastItems=SY.live.apply(j.items||[]); startEngine();   // 방금 다른 화면이 고친 기록이 옛 목록으로 되돌아가지 않게
    dashData = {recs:dashRecs(lastItems), names, at:Date.now()};
    try{ localStorage.setItem(DASH_LS, JSON.stringify(dashData)); }catch(_){}
    renderDash();
  }catch(e){ if(!dashData) $('#dashBody').innerHTML='<p class="err">불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; }
  finally{ dashLoading=false; if(dashAgain){ dashAgain=false; dashSoon(0); } }
}
// 정기 재고조사 알림 (2026-11-24 · 재고관리 js/stockx.js): 설정 줄(stockcfg)의 다음 조사일이 오늘이거나 지났으면 모두에게 대시보드 맨 위에
// 공통 업무에 더할 것 (2026-11-24): 기업 프로모션 만료 2달 · 1달 전 알림 (promodb · 「확인」 전까지) · 협업 여행사 집계기록 넣기 (agencydb · 끝난 기간의 기록이 없으면)
const histOf = id => { const it=(lastItems||[]).find(x=>x.id===id && !x.deleted); try{ return JSON.parse((it && it.history)||'null'); }catch(_){ return null; } };
function commonExtra(today){ const out=[];
  opsPromoAlerts(histOf('promodb'), today).forEach(a=>out.push({kind:'공통', owner:'', name:`기업 프로모션 ${a.label} · ${a.name}`, q:a.name, href:'promo.html',
    tasks:[{title:`만료 ${opsDateLabel(a.end)} · 연장 여부 확인 (확인하면 「확인」)`, due:a.due}]}));
  const ag=opsAggDue(histOf('agencydb'), today);
  if(ag) out.push({kind:'공통', owner:'', name:`협업 여행사 집계기록 넣기 · ${ag.label}`, q:'협업 여행사 집계', href:'agency.html',
    tasks:[{title:`${opsDateLabel(ag.from)} ~ ${opsDateLabel(ag.to)} 방문기록 엑셀을 넣어 여행사별 집계`, due:ag.due}]});
  return out; }
function stockDue(today){   // 정기 재고조사 날(오늘이거나 지남)이면 그 날짜 · 아니면 '' — 공통 업무에 (2026-11-24)
  const it=(lastItems||[]).find(x=>x.id==='stockcfg' && !x.deleted); if(!it) return '';
  let d=null; try{ d=(JSON.parse(it.history||'{}')||{}).d; }catch(_){} const nx=d && d.next; return nx && nx<=today ? nx : '';
}
// ===== 캘린더 (2026-11-24 · 대시보드 4열 1행): 단체 방문 현황 + 함께 쓰는 일정표 =====
//  달력 칸마다 단체 방문 수(초록) · 일정 수(파랑) · 날짜를 누르면 아래에 그날 단체 방문 · 일정 + 「일정 추가」(제목 · 시간) · × 로 빼기
//  일정 저장: 공유 기록(calls) 한 줄 id calendardb · 통화 구분 「일정표」 · 수정 기록 칸 {rows:[{id, d, d2(기간이면 끝나는 날), tm, title, by, at}]} (추가 · 빼기는 최신을 받아 그 위에)
//  대시보드는 자주 다시 그려지므로 고른 달 · 날짜 · 적던 글자는 변수에 두고 다시 그린 뒤 되돌림 (calRestore)
const CAL_ID='calendardb', CAL_TYPE='일정표';
// 공휴일 = 빨간 글씨 (일요일처럼 · 2026-11-24) — 단체 화면(js/group/12-quote-stage-list.js HOLIDAYS)과 같은 목록. 해마다 더함
const CAL_HOLI = new Set(['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-01','2026-05-05','2026-05-25','2026-06-03','2026-07-17','2026-08-17','2026-09-24','2026-09-25','2026-10-05','2026-10-09','2026-12-25',
  '2027-01-01','2027-02-08','2027-02-09','2027-03-01','2027-05-03','2027-05-05','2027-05-13','2027-07-19','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-04','2027-10-11','2027-12-27']);
let calMonth=opsToday().slice(0,7), calDay=opsToday(), calDraft={title:'', tm:'', end:''}, calFocus='';
const calRows = items => { const it=(items||[]).find(x=>x.id===CAL_ID && !x.deleted); let h={}; try{ h=JSON.parse((it||{}).history||'{}')||{}; }catch(_){} return Array.isArray(h.rows) ? h.rows : []; };
const calVisits = () => (lastItems||[]).filter(r=>!r.deleted && GROUP_TYPES.includes(r.callType||'단체예약') && !['예약상담','상담'].includes(r.callType) && /^\d{4}-\d{2}-\d{2}/.test(r.date||''))
  .map(r=>({d:String(r.date).slice(0,10), org:r.org||r.contact||'(업체 미정)', n:r.people||'', st:r.callType||'', tm:r.tin||'', id:r.id}));
function calHTML(today){
  const [y,m]=calMonth.split('-').map(Number), first=new Date(y, m-1, 1), start=first.getDay(), days=new Date(y, m, 0).getDate();
  // 기간 일정 (2026-11-24): d2(끝나는 날)가 있으면 d ~ d2 의 모든 날에 보임 (예: 겨울 휴장) · 기간 안의 날은 칸 바탕을 연한 파랑(rng)
  // 기업 프로모션 시작 · 만료 (2026-11-24 · promodb): 주황 점 · 그날 목록에 「프로모션 시작 · 만료」
  const PR=((histOf('promodb')||{}).rows||[]).flatMap(r=>{ const p=opsPeriod(r.period), n=String(r.name||'').split(/\n/)[0]; return [p.from?{d:p.from, t:'시작', n}:null, p.to?{d:p.to, t:'만료', n}:null].filter(Boolean); });
  const V=calVisits(), E=calRows(lastItems), on=(x,ds)=>x.d2 && x.d2>x.d ? (x.d<=ds && ds<=x.d2) : x.d===ds, cnt=(L,d)=>L.filter(x=>x.d===d).length, cntE=d=>E.filter(x=>on(x,d)).length, rng=d=>E.some(x=>x.d2 && x.d2>x.d && on(x,d));
  let cells=''; for(let i=0;i<start;i++) cells+='<span class="cd e"></span>';
  for(let d=1; d<=days; d++){ const ds=`${calMonth}-${String(d).padStart(2,'0')}`, v=cnt(V,ds), e=cntE(ds), dow=(start+d-1)%7;
    cells+=`<button type="button" class="cd${ds===today?' today':''}${ds===calDay?' on':''}${rng(ds)?' rng':''}${dow===0 || CAL_HOLI.has(ds)?' sun':dow===6?' sat':''}" data-cday="${ds}"${CAL_HOLI.has(ds)?' title="공휴일"':''}><i>${d}</i>${v?`<b class="cv">${v}</b>`:''}${e?`<b class="ce">${e}</b>`:''}${PR.some(x=>x.d===ds)?`<b class="cp">${PR.filter(x=>x.d===ds).length}</b>`:''}</button>`; }
  const dv=V.filter(x=>x.d===calDay).sort((a,b)=>String(a.tm).localeCompare(String(b.tm))), de=E.filter(x=>on(x,calDay)).sort((a,b)=>String(a.d).localeCompare(String(b.d)) || String(a.tm||'99').localeCompare(String(b.tm||'99')));
  const per = x => x.d2 && x.d2>x.d ? `<b class="per">${esc(opsDateLabel(x.d))} ~ ${esc(opsDateLabel(x.d2))}</b> ` : '';
  return `<div class="dcol-h"><b>캘린더</b><span class="cal-nav"><button type="button" data-cmon="-1" title="이전 달">‹</button><span>${y}년 ${m}월</span><button type="button" data-cmon="1" title="다음 달">›</button></span></div>`
    + `<div class="cal-g"><span class="cw">일</span><span class="cw">월</span><span class="cw">화</span><span class="cw">수</span><span class="cw">목</span><span class="cw">금</span><span class="cw">토</span>${cells}</div>`

    + `<div class="cal-day">`   /* 고른 날짜 제목 · n 단체 방문 · n 일정 안내는 없앰 (2026-11-24) */
    + (dv.length||de.length||PR.some(x=>x.d===calDay) ? `<ul>${dv.map(x=>`<li class="cv-i"><a href="group.html?open=${encodeURIComponent(x.id)}">단체 · ${esc(x.org)}${x.n?` ${esc(x.n)}명`:''}${x.tm?` · ${esc(x.tm)}`:''}${x.st==='가예약'?' <small>(가예약)</small>':''}</a></li>`).join('')}`
        + PR.filter(x=>x.d===calDay).map(x=>`<li class="cp-i"><a href="promo.html">기업 프로모션 ${x.t} · ${esc(x.n)}</a></li>`).join('')
        + `${de.map(x=>`<li class="ce-i${per(x)?' per-i':''}"><span>${per(x)}${x.tm?esc(x.tm)+' · ':''}${esc(x.title)} <small>${esc(x.by||'')}</small></span><button type="button" data-cdel="${esc(x.id)}" title="이 일정 빼기">×</button></li>`).join('')}</ul>` : '<p class="hint">이날 단체 방문 · 일정이 없습니다.</p>')
    + `<form class="cal-add" id="calAdd" autocomplete="off"><input id="calTitle" placeholder="일정 추가 (예: 정기 점검)" data-ime="ko" maxlength="60"><input id="calTm" placeholder="시간" maxlength="11"><button type="submit" class="btn-sm primary">추가</button>`
    + `<label class="cal-end"><span>기간이면 끝나는 날</span><input type="date" id="calEnd" min="${calDay}" title="비우면 하루 일정 · 고르면 ${esc(opsDateLabel(calDay))}부터 그날까지 (예: 겨울 휴장)"></label></form></div>`;
}
function calRestore(){ const t=$('#calTitle'), h=$('#calTm'); if(!t) return; t.value=calDraft.title; h.value=calDraft.tm; if($('#calEnd')) $('#calEnd').value=calDraft.end||''; if(calFocus){ const el=$('#'+calFocus); if(el){ el.focus(); const n=el.value.length; try{ el.setSelectionRange(n,n); }catch(_){} } } }
document.addEventListener('input', e=>{ if(e.target.id==='calTitle') calDraft.title=e.target.value; if(e.target.id==='calTm') calDraft.tm=e.target.value; if(e.target.id==='calEnd') calDraft.end=e.target.value; });
document.addEventListener('focusin', e=>{ if(e.target.id==='calTitle' || e.target.id==='calTm') calFocus=e.target.id; });
document.addEventListener('focusout', e=>{ if((e.target.id==='calTitle' || e.target.id==='calTm') && !e.relatedTarget?.closest?.('#calAdd')) setTimeout(()=>{ if(!document.activeElement?.closest?.('#calAdd')) calFocus=''; }, 0); });
async function calSave(fn, what){   // 최신 일정표를 받아 fn(rows) 로 바꾸고 저장
  const j=await SY.list(); lastItems=SY.live.apply(j.items||[]);
  const it=(lastItems||[]).find(x=>x.id===CAL_ID), rows=fn(calRows(lastItems).slice()), now=new Date().toISOString(), me=(getUser()||{}).name||'';
  const item={...(it||{}), id:CAL_ID, callType:CAL_TYPE, saved:(it&&it.saved)||now, takenBy:me, owner:'', summary:`일정표 ${rows.length}건 · ${what}`.slice(0,120), history:JSON.stringify({rows, at:now, by:me})};
  delete item.date; delete item.org;
  await SY.call({action:'put', item}); SY.live.post({t:'put', item});
  const i=lastItems.findIndex(x=>x.id===CAL_ID); if(i>=0) lastItems[i]=item; else lastItems.push(item);
  renderDash();
}
document.addEventListener('click', e=>{
  const d=e.target.closest('[data-cday]'); if(d){ calDay=d.dataset.cday; renderDash(); return; }
  const mo=e.target.closest('[data-cmon]'); if(mo){ const [y,m]=calMonth.split('-').map(Number), x=new Date(y, m-1+(+mo.dataset.cmon), 1); calMonth=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; renderDash(); return; }
  const del=e.target.closest('[data-cdel]'); if(del){ const id=del.dataset.cdel; calSave(rows=>rows.filter(x=>x.id!==id), '빼기').catch(err=>alert('빼지 못했습니다: '+(err.code||err.message))); return; }
});
document.addEventListener('submit', e=>{ if(e.target.id!=='calAdd') return; e.preventDefault();
  const title=calDraft.title.trim(), tm=calDraft.tm.trim(), end=calDraft.end||''; if(!title){ $('#calTitle').focus(); return; }
  if(end && end<calDay){ alert('끝나는 날이 시작하는 날(고른 날짜)보다 앞입니다.'); return; }
  const row={id:'e'+Date.now().toString(36), d:calDay, ...(end && end>calDay ? {d2:end} : {}), tm, title, by:(getUser()||{}).name||'', at:new Date().toISOString()};
  calDraft={title:'', tm:'', end:''}; calFocus='calTitle';
  calSave(rows=>[...rows, row], `추가 ${title}`).catch(err=>{ calDraft={title, tm, end}; renderDash(); alert('추가하지 못했습니다: '+(err.code||err.message)); }); });
document.addEventListener('change', e=>{ if(e.target.id==='dashMem'){ dashMem=e.target.value; try{ localStorage.setItem('sy_dash_mem', dashMem); }catch(_){} renderDash(); } });
function renderDash(){ if(!dashData) return; paintRange();
  // 2026-11-24 새 배치: 4열 · 2행 — ① 개인고객 전화 ② 단체고객 전화 ③ 개인 업무(멤버 고르기 · 기본 전체) 는 두 행을 통째로 / ④ 1행 = 캘린더(단체 방문 + 일정표) · 2행 = 공통 업무(담당 없는 과업)
  const today=opsToday(), tm=new Date(today+'T00:00'); tm.setDate(tm.getDate()+1); const tomorrow=opsYmd(tm), me=(getUser()||{}).name||'';
  const q=(($('#dashQ')||{}).value||'').trim().toLowerCase(), qd=q.replace(/\D/g,'');
  const hit = r => !q || r.q.toLowerCase().includes(q) || (qd.length>=3 && r.q.replace(/\D/g,'').includes(qd));   // 전화번호는 - 없이도
  const all = dashData.recs.filter(hit), mine = all.filter(r=>r.owner), common = [...all.filter(r=>!r.owner), ...commonExtra(today).filter(hit)];
  const dl = d => d<today ? `<span class="late">지남 ${esc(opsDateLabel(d))}</span>` : d===today ? '오늘' : d===tomorrow ? '내일' : esc(opsDateLabel(d));
  const first = r => r.due.reduce((m,t)=>t.due<m?t.due:m, '9999');
  // 마감 기간 (2026-11-24 · 위 왼쪽 버튼 · 「내일 마감도 보기」 대신): 오늘 · 내일 · 이번주 · 이번달 = 그날까지(지난 것 포함) · 기간설정 = 고른 시작일 ~ 끝날
  const [rFrom, rTo] = dashRangeDates(today), rLabel = DASH_RANGES.find(x=>x[0]===dashRange.k)?.[1] || '오늘 마감';
  const list = src => ({ L:src.map(r=>({...r, due:r.tasks.filter(t=>(!rFrom || t.due>=rFrom) && t.due<=rTo)})).filter(r=>r.due.length).sort((a,b)=>first(a).localeCompare(first(b)) || a.name.localeCompare(b.name)) });
  const items = (L, showOwner) => L.map(r=>{ const late=r.due.some(t=>t.due<today);
    return `<li class="drec${late?' late':''}"><a href="${r.href}"><span class="dr-h"><b>${esc(r.name)}</b>${showOwner?`<span class="downer${r.owner===me?' me':''}">${esc(r.owner||'담당 없음')}</span>`:''}</span>`
      + r.due.slice().sort((a,b)=>a.due.localeCompare(b.due)).map(t=>`<span class="dr-t">${dl(t.due)} · ${esc(t.title)}</span>`).join('') + `</a></li>`; }).join('');
  const box = (kind, title, src, extraHead, opt={}) => { const {L}=list(src), pre=opt.pre||'', n=L.length+(opt.preN||0);
    return `<div class="dcol${opt.cls?' '+opt.cls:''}"><div class="dcol-h"><b>${title}</b>${extraHead||''}<span class="dn">${n}</span></div>`
      + (n ? `<ul class="dlist">${pre}${items(L, opt.owner!==false)}</ul>` : `<p class="hint dempty">${q?'검색에 맞는 것이 없습니다.':`${esc(rLabel)} 기준 할 것이 없습니다.`}</p>`) + `</div>`; };
  // ③ 개인 업무: 멤버 고르기 (기본 전체 = 모두의 것)
  const names=[...new Set([...(dashData.names||[]), ...mine.filter(r=>r.kind==='기타').map(r=>r.owner)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
  if(dashMem && !names.includes(dashMem)) dashMem='';
  const memSel = `<select id="dashMem" class="dmem" title="이 사람의 개인 업무만"><option value="">전체</option>${names.map(n=>`<option${n===dashMem?' selected':''}>${esc(n)}</option>`).join('')}</select>`;
  const etc = mine.filter(r=>r.kind==='기타' && (!dashMem || r.owner===dashMem));
  // ④ 2행 공통 업무: 담당이 없는 과업 (고객 견적 요청 · 담당 없는 예약 과업 등) + 정기 재고조사 날
  const st = stockDue(today), pre = st ? `<li class="drec late"><a href="stock.html"><span class="dr-h"><b>📋 정기 재고조사</b></span><span class="dr-t">${dl(st)} · 붕정 · 차방을 세어 재고관리에 기록</span></a></li>` : '';
  $('#dashBody').innerHTML = `<div class="dcols d2">`
    + box('개인','개인고객 전화', mine.filter(r=>r.kind==='개인'), '', {cls:'span2'})
    + box('단체','단체고객 전화', mine.filter(r=>r.kind==='단체'), '', {cls:'span2'})
    + box('기타','개인 업무', etc, memSel, {cls:'span2'})
    + `<div class="dcol dcal-col">${calHTML(today)}</div>`
    + box('공통','공통 업무', common, '', {cls:'dcommon', pre, preN:st?1:0, owner:false})
    + `</div>`;
  calRestore();
}
document.addEventListener('click', e=>{

  const w=e.target.closest('[data-dwho]'); if(w){ dashWho = dashWho===w.dataset.dwho ? '' : w.dataset.dwho; renderDash(); }
});
if($('#dashQ')) $('#dashQ').addEventListener('input', ()=>renderDash());
let dashAgain=false;
SY.live.onRev(()=>{ if(dashLoading){ dashAgain=true; return; } dashSoon(0); });   // 다른 컴퓨터에서 바뀜 → 대시보드를 바로 다시 받음 (2026-11-23)
// 바로 알리기 (2026-11-23 · js/common.js SY.live): 단체 · 개인고객 화면 · 나의 할일 팝업에서 과업을 끝내면(기록을 저장하면) 그 순간 대시보드에서도 빠짐 — 20초마다 다시 받기를 기다리지 않음
SY.live.on(m=>{ try{
  if(!getUser()) return; if(!lastItems){ dashSoon(200); return; }
  const id = m.t==='del' ? m.id : m.item.id, i=lastItems.findIndex(x=>x.id===id);
  if(m.t==='del'){ if(i>=0) lastItems.splice(i,1); } else if(i>=0) lastItems[i]={...lastItems[i], ...m.item}; else lastItems.push(m.item);
  dashData={...(dashData||{names:[]}), recs:dashRecs(lastItems), at:Date.now()};
  try{ localStorage.setItem(DASH_LS, JSON.stringify(dashData)); }catch(_){}
  if(!$('#menuView').hidden) renderDash();
}catch(e){ console.warn('live', e); } });
$('#dashReload').onclick = () => loadDash();
// (대시보드 팀 비밀번호 칸은 없앰 · 2026-11-21 — 로그인으로 확인)
// 대시보드 새로 받기 (2026-11-18 · 거의 실시간): 20초마다 · 이 창으로 돌아오면 · 다른 탭(단체 · 개인고객 · 나의 할일)에서 저장하면 바로
const dashSoon = (ms=0) => { clearTimeout(dashSoon.t); dashSoon.t=setTimeout(()=>{ if(getUser() && !$('#menuView').hidden && document.visibilityState==='visible') loadDash(); }, ms); };
setInterval(()=>dashSoon(), 20e3);
window.addEventListener('focus', ()=>dashSoon());
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') dashSoon(); });
window.addEventListener('storage', e=>{ if(/^(sayuwon_intake_pending|sayuwon_personal_pending|sayuwon_intake_cache|sayuwon_personal_cache)$/.test(e.key||'')) dashSoon(2500); });   // 다른 탭의 저장 대기 · 받은 기록이 바뀜 → 저장이 끝날 즈음 다시
