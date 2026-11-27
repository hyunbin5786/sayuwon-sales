// ===== 첫 화면 (index.html): 로그인 · 메뉴 · 품목관리 · 멤버관리 =====
// 공통 도구(SY: 공유 주소 · 날짜 · 전화 · esc · 저장소)는 js/common.js, 전체 구조는 docs 14절

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

// ===================== 공유 저장소 (단체 화면과 같은 서버) =====================
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
  $('#memberList').innerHTML = members.map(m=>`<tr class="${m.emp===u.emp?'me':''}"><td>${esc(m.name)}</td><td>${/^NEW-/.test(m.emp) ? `<input class="mphone memp" data-memp="${esc(m.emp)}" placeholder="사번 입력" maxlength="20" title="담당 고르기에서 이름만 만든 멤버 · 사번을 넣고 Enter (같은 이름 · 연락처로 사번만 바뀜)"><small class="hint" style="display:block">사번 미입력</small>` : esc(m.emp)}</td><td><input class="mphone" data-mphone="${esc(m.emp)}" value="${esc(m.phone||'')}" inputmode="tel" placeholder="010-0000-0000" maxlength="20" title="고치고 Enter 또는 다른 곳을 누르면 저장"></td><td class="hint">${esc(m.added||'')}${m.by?` · ${esc(m.by)}`:''}</td><td class="r"><button type="button" class="btn-sm del" data-mdel="${esc(m.emp)}" data-mname="${esc(m.name)}">빼기</button></td></tr>`).join('')
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
        let ts=[]; try{ ts=(E.tasksOf(r)||[]).filter(t=>!t.done && !t.removed).map(t=>({id:t.id, title:t.title, due:t.due||dueOf(t,r), who:t.who||''})); }catch(_){ ts=null; }
        // 담당자 준비 과업(who)은 그 담당자의 줄로 따로 (2026-11-24 · 영업 담당 줄에는 안 나옴)
        if(ts){ const own=(r.owner||r.takenBy||'').trim(), by={}; ts.forEach(t=>{ (by[t.who||own] ||= []).push(t); });
          Object.entries(by).forEach(([o, L])=>recs.push({kind:'단체', rid:r.id, owner:o, name:r.org||r.contact||r.phone||'(업체 미정)', q:[r.org,r.contact,r.phone].join(' '), tasks:L, href:'group.html?open='+encodeURIComponent(r.id)})); return; } }
      const d00=String(r.date||'').slice(0,10), wkSoon = histTasks(r).some(t=>t.id==='wkcheck' && !t.removed) || (booked(r) && d00>=opsToday());   // 다음주 예약 점검이 따로 나올 예약인지
      const ts=histTasks(r).filter(t=>!t.done && !t.removed && !doneByRec(t, r) && (!consult || ['tour','clergy'].includes(t.id) || t.custom) && !((t.id==='tbdcall' || t.id==='onsitecall') && wkSoon))   // 예전 「미정 항목 확인 연락」 · 「현장 결제 인원 확인 연락」은 다음주 예약 점검에 합침 (2026-11-23)
        .map(t=>({id:t.id, title: t.id==='tbdcall' ? '다음주 예약 점검' : t.title, due:dueOf(t,r), who:t.who||''}));
      // 다음주 예약 점검 (2026-11-20 · group.js wkcheck 와 같은 기준): 가예약 · 예약확정이고 방문일이 오늘 이후면 예약마다 방문일 전주 목요일 마감 (아직 저장된 과업이 없어도)
      const d0=String(r.date||'').slice(0,10), o0=(r.owner||r.takenBy||'').trim();
      if(booked(r) && d0>=opsToday() && !histTasks(r).some(t=>t.id==='wkcheck')){ const thu=wkPrevThu(d0), w=items.find(x=>x.id==='wk'+wkHash(o0)+thu.replace(/-/g,'')); let dn={}; try{ dn=(JSON.parse((w||{}).history||'{}')||{}).done||{}; }catch(_){}
        if(!dn[r.id]) ts.push({id:'wkcheck', title:'다음주 예약 점검', due:wkLimit(d0)}); }
      { const own=(r.owner||r.takenBy||'').trim(), by={}; ts.forEach(t=>{ (by[t.who||own] ||= []).push(t); }); Object.entries(by).forEach(([o, L])=>recs.push({kind:'단체', rid:r.id, owner:o, name:r.org||r.contact||r.phone||'(업체 미정)', q:[r.org,r.contact,r.phone].join(' '), tasks:L, href:'group.html?open='+encodeURIComponent(r.id)})); }   // 담당자 준비 과업은 그 담당자 줄로 (2026-11-24)
    } else if(ct==='개인고객'){
      const ts=histTasks(r).filter(t=>!t.done).map(t=>({id:t.id, title:t.title, due:dueOf(t,r)}));
      if(ts.length) recs.push({kind:'개인', rid:r.id, owner:(r.owner||r.takenBy||'').trim(), name:r.contact||r.phone||'(이름 없음)', q:[r.contact,r.phone].join(' '), tasks:ts, href:'personal.html?open='+encodeURIComponent(r.id)});
    } else if(ct===OPS_TYPES.task){
      const j=opsParse(r); if(!j) return; const d=j.d||{}, today=opsToday(), tm=new Date(today+'T00:00'); tm.setDate(tm.getDate()+1); const t2=opsYmd(tm);
      const days=opsPending(d, today); if(opsOccurs(d, t2) && !(d.done||{})[t2]) days.push(t2);
      for(let i=2;i<400;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(opsOccurs(d, day) && !(d.done||{})[day]){ days.push(day); break; } }   // 그 뒤 다음 할 날도 (개인 할일 보기의 이번주 · 전체 숫자용)
      const subs=d.subs||[], subTxt = day => subs.length ? `세부 과업 ${subs.filter(s=>((d.subDone||{})[day]||{})[s.id]).length}/${subs.length}` : opsRepeatLabel(d);
      if(days.length) recs.push({kind:'기타', rid:r.id, owner:(d.owner||r.takenBy||'').trim(), name:d.title||'(업무)', q:d.title||'', tasks:days.map(day=>({day, title:subTxt(day), due:day})), href:'#mypop'});
    }
  });
  // 고객 견적 요청 (2026-11-23 · 2026-11-24 바꿈): 아직 「접수」인 요청 = 담당 없는 공통 업무 (대시보드 4열 2행) · 마감 = 접수한 날
  (lastReq.items||[]).forEach(r=>{ [''].forEach(o=>recs.push({kind:'기타', owner:o, src:'quote', name:`${(typeof cmRule==='function' && cmRule('quote').title)||'견적 요청'} · ${r.org||''} ${r.name?r.name+'님':''}`.trim(), q:[r.org,r.name,r.phone].join(' '),
    tasks:[{title:((typeof cmRule==='function' && cmRule('quote').text)||'견적서 · 거래명세서 발급')+(r.date?` (방문 ${opsDateLabel(r.date)})`:''), due:String(r.at||'').slice(0,10)||opsToday()}], href:QUOTE})); });   // 이름 · 할 일은 공통 업무 관리(js/commonmgr.js)에서 고침
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
//  2026-11-24: 무엇을 알릴지(켜기 · 이름 · 할 일 · 만료 몇 달 전 · 새 공통 업무)는 「공통 업무」 옆 「관리」 — js/commonmgr.js (cmOn · cmRule · cmRecs)
const devOff = p => typeof SY_DEV!=='undefined' && SY_DEV.off(p);   // 배포 사이트에서 개발 중인 화면(재고관리 · 기업 프로모션 · 협업 여행사)의 알림은 숨김 (2026-11-24 · js/common.js SY_DEV)
function commonExtra(today){ const out=[];
  if(cmOn('promo') && !devOff('promo.html')){ const R=cmRule('promo');
    opsPromoAlerts(histOf('promodb'), today, cmMonths()).forEach(a=>out.push({kind:'공통', owner:'', name:`${R.title||'기업 프로모션'} ${a.label} · ${a.name}`, q:a.name, href:'promo.html',
      tasks:[{title:`만료 ${opsDateLabel(a.end)} · ${R.text||'연장 여부 확인'}`, due:a.due}]})); }
  const ag=cmOn('agency') && !devOff('agency.html') && opsAggDue(histOf('agencydb'), today), RA=cmRule('agency');
  if(ag) out.push({kind:'공통', owner:'', name:`${RA.title||'협업 여행사 집계기록 넣기'} · ${ag.label}`, q:'협업 여행사 집계 '+(RA.title||''), href:'agency.html',
    tasks:[{title:`${opsDateLabel(ag.from)} ~ ${opsDateLabel(ag.to)} · ${RA.text||'방문기록 엑셀을 넣어 여행사별 집계'}`, due:ag.due}]});
  return [...out, ...cmRecs(today)]; }
function stockDue(today){   // 정기 재고조사 날(오늘이거나 지남)이면 그 날짜 · 아니면 '' — 공통 업무에 (2026-11-24)
  const it=(lastItems||[]).find(x=>x.id==='stockcfg' && !x.deleted); if(!it) return '';
  let d=null; try{ d=(JSON.parse(it.history||'{}')||{}).d; }catch(_){} const nx=d && d.next; return nx && nx<=today ? nx : '';
}
// ===== 캘린더 (2026-11-24 · 대시보드 4열 1행): 단체 방문 현황 + 함께 쓰는 일정표 =====
//  달력 칸마다 구분별 수(색 동그라미) · 아래 색 안내 · 날짜를 누르면 그날 단체 방문 · 일정 · 「＋ 일정 추가」 버튼(팝업: 구분 · 제목 · 기간 · 하루 종일 또는 시간) · × 로 빼기
//  일정 저장: 공유 기록(calls) 한 줄 id calendardb · 통화 구분 「일정표」 · 수정 기록 칸 {rows:[{id, cat(행사·교육·휴관·기타 · 없으면 기타), d, d2(기간이면 끝나는 날), tm(비면 하루 종일), title, by, at}]} (추가 · 빼기는 최신을 받아 그 위에)
//  대시보드는 자주 다시 그려지므로 고른 달 · 날짜 · 적던 글자는 변수에 두고 다시 그린 뒤 되돌림 (calRestore)
const CAL_ID='calendardb', CAL_TYPE='일정표';
// 공휴일 = 빨간 글씨 (일요일처럼 · 2026-11-24) — 단체 화면(js/group/12-quote-stage-list.js HOLIDAYS)과 같은 목록. 해마다 더함
const CAL_HOLI = new Set(['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-01','2026-05-05','2026-05-25','2026-06-03','2026-07-17','2026-08-17','2026-09-24','2026-09-25','2026-10-05','2026-10-09','2026-12-25',
  '2027-01-01','2027-02-08','2027-02-09','2027-03-01','2027-05-03','2027-05-05','2027-05-13','2027-07-19','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-04','2027-10-11','2027-12-27']);
let calMonth=opsToday().slice(0,7), calDay=opsToday(), calDraft={title:'', tm:'', end:''}, calFocus='';
const calRows = items => { const it=(items||[]).find(x=>x.id===CAL_ID && !x.deleted); let h={}; try{ h=JSON.parse((it||{}).history||'{}')||{}; }catch(_){} return Array.isArray(h.rows) ? h.rows : []; };
const calVisits = () => (lastItems||[]).filter(r=>!r.deleted && GROUP_TYPES.includes(r.callType||'단체예약') && !['예약상담','상담'].includes(r.callType) && /^\d{4}-\d{2}-\d{2}/.test(r.date||''))
  .map(r=>({d:String(r.date).slice(0,10), org:r.org||r.contact||'(업체 미정)', n:r.people||'', st:r.callType||'', tm:r.tin||'', id:r.id, own:(r.owner||'').trim(), items:grpItems(r)}));
// 단체 예약에 든 품목 (관람만 빼고 모두 · 2026-11-24 · 캘린더 그날 목록에 글자로): 사담 · 몽몽마방 · 관람+식사 · 프로그램 · 굿즈 + 담당(있으면)
//  저장 모양은 js/group/02-state-form.js packExtra — 칸(sadam1 · yoga …) + 비고(memo)의 「관람 품목 · 추가 프로그램 · 굿즈 · 마방 시간 · 프로그램 담당 · 프로그램 시간대」
const GRP_PROG = [['yoga','요가','명'],['gaga','음료쿠폰(가가빈빈)','개'],['chabang','차방 대관','시간'],['dangdu','당두봉갈 대관','시간'],['donghaeng','동행 도슨트','시간']];
function grpItems(r){
  const parts=String(r.memo||'').split(/\s+\/\s+/), part=l=>{ const p=parts.find(x=>x.startsWith(l+' ')); return p ? p.slice(l.length+1).trim() : ''; };
  const kv=l=>{ const o={}; part(l).split(/\s*,\s*/).forEach(t=>{ const m=t.match(/^(.+?):(.+)$/); if(m) o[m[1].trim()]=m[2].trim(); }); return o; };
  const staff=kv('프로그램 담당'), time=kv('프로그램 시간대'), out=[], has=v=>{ const s=String(v||'').trim(); return !!s && s!=='0'; };
  const add=(name, q, unit)=>{ const v=String(q||'').trim(); out.push({t:`${name}${v?` ${v}${/^\d+$/.test(v)?unit:''}`:''}${time[name]?` · ${time[name]}`:''}`, s:staff[name]||''}); };
  [['sadam1','사담 1부'],['sadam2','사담 2부'],['sadamD','사담 디너']].forEach(([k,l])=>{ if(has(r[k])) add(l, r[k], '명'); });
  if(has(r.mabangL)) out.push({t:`몽몽마방 ${String(r.mabangL).trim()}명${part('마방 시간')?` · ${part('마방 시간')}`:''}${r.mabangMenu?` · ${r.mabangMenu}`:''}`, s:''});
  part('관람 품목').split(/\s+·\s+/).forEach(v=>{ const m=v.trim().match(/^(.*?)\(관람,\s*(.+)\)\s*x\s*(\d+)$/); if(m) out.push({t:`관람+식사 · ${m[2].trim()} ${m[3]}명`, s:''}); });
  GRP_PROG.forEach(([k,l,u])=>{ if(has(r[k])) add(l, r[k], u); });
  part('추가 프로그램').split(/\s*,\s*/).forEach(t=>{ const m=t.trim().match(/^(.+?)\s+(\S+)$/); if(m) add(m[1], m[2], /세미나/.test(m[1])?'회':/대관|도슨트/.test(m[1])?'시간':'명'); });
  if(part('굿즈')) out.push({t:`굿즈 · ${part('굿즈')}`, s:staff['굿즈 품목']||''});
  return out;
}
// 구분 (2026-11-24): 단체예약(단체 방문 · 자동) · 행사 · 교육 · 휴관 · 기타 — 구분마다 색 · 달력 아래 색 안내(범례). 예전 일정(구분 없음)은 「기타」
//  기업 프로모션(시작 · 만료)은 캘린더에서 뺌 (2026-11-24 같은 날)
const CAL_CATS = [['행사','#8b4a9c','#f3e9f6'], ['교육','#3d5a80','#eaf0f7'], ['휴관','#b5442c','#f9e9e5'], ['기타','#7a705c','#f1eee6']];
const CAL_GRP = ['단체예약','#3f5236','#eef4ee'];
const calCat = x => CAL_CATS.find(k=>k[0]===x.cat) || CAL_CATS[3];
const calTag = c => `<span class="cal-tag" style="background:${c[1]}">${esc(c[0])}</span>`;
function calHTML(today){
  const [y,m]=calMonth.split('-').map(Number), first=new Date(y, m-1, 1), start=first.getDay(), days=new Date(y, m, 0).getDate();
  // 기간 일정: d2(끝나는 날)가 있으면 d ~ d2 의 모든 날에 보임 (예: 겨울 휴관) · 기간 안의 날은 칸 바탕을 그 구분의 연한 색
  const V=calVisits(), E=calRows(lastItems), on=(x,ds)=>x.d2 && x.d2>x.d ? (x.d<=ds && ds<=x.d2) : x.d===ds, cnt=(L,d)=>L.filter(x=>x.d===d).length;
  const badge = (c, n) => n ? `<b class="ck" style="background:${c[1]}" title="${esc(c[0])} ${n}">${n}</b>` : '';
  let cells=''; for(let i=0;i<start;i++) cells+='<span class="cd e"></span>';
  for(let d=1; d<=days; d++){ const ds=`${calMonth}-${String(d).padStart(2,'0')}`, dow=(start+d-1)%7, eD=E.filter(x=>on(x,ds)), rg=eD.find(x=>x.d2 && x.d2>x.d);
    cells+=`<button type="button" class="cd${ds===today?' today':''}${ds===calDay?' on':''}${rg?' rng':''}${dow===0 || CAL_HOLI.has(ds)?' sun':dow===6?' sat':''}" data-cday="${ds}"${CAL_HOLI.has(ds)?' title="공휴일"':''}${rg && ds!==calDay?` style="background:${calCat(rg)[2]}"`:''}><i>${d}</i>`
      + badge(CAL_GRP, cnt(V,ds)) + CAL_CATS.map(c=>badge(c, eD.filter(x=>calCat(x)===c).length)).join('') + `</button>`; }
  const dv=V.filter(x=>x.d===calDay).sort((a,b)=>String(a.tm).localeCompare(String(b.tm))), de=E.filter(x=>on(x,calDay)).sort((a,b)=>String(a.d).localeCompare(String(b.d)) || String(a.tm||'99').localeCompare(String(b.tm||'99')));
  const per = x => x.d2 && x.d2>x.d ? `<b class="per">${esc(opsDateLabel(x.d))} ~ ${esc(opsDateLabel(x.d2))}</b> ` : '';
  const legend = `<div class="cal-lg">${[CAL_GRP, ...CAL_CATS].map(c=>`<span><i style="background:${c[1]}"></i>${esc(c[0])}</span>`).join('')}</div>`;
  return `<div class="dcol-h"><b>캘린더</b><button type="button" class="cal-plus" id="calAddBtn" title="일정 추가" aria-label="일정 추가">+</button><button type="button" class="cal-plus cal-pop" id="calPopBtn" title="캘린더를 새 창으로 띄우기" aria-label="캘린더를 새 창으로"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5v3.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V4.5a.5.5 0 0 1 .5-.5H7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="cal-nav"><button type="button" data-cmon="-1" title="이전 달">‹</button><span>${y}년 ${m}월</span><button type="button" data-cmon="1" title="다음 달">›</button></span></div>`
    + `<div class="cal-body"><div class="cal-l"><div class="cal-g"><span class="cw">일</span><span class="cw">월</span><span class="cw">화</span><span class="cw">수</span><span class="cw">목</span><span class="cw">금</span><span class="cw">토</span>${cells}</div>`
    + legend + `</div>`
    + `<div class="cal-day cal-r"><b class="cal-dh">${esc(opsDateLabel(calDay))}</b>`
    + (dv.length||de.length ? `<ul>${dv.map(x=>`<li class="cv-i"><span class="cv-l">${calTag(CAL_GRP)} <a class="cv-org" href="group.html?open=${encodeURIComponent(x.id)}" title="이 단체예약 열기">${esc(x.org)}</a>${x.n?` ${esc(x.n)}명`:''}${x.tm?` · ${esc(x.tm)}`:''}${x.st==='가예약'?' <small>(가예약)</small>':''}</span>${x.items.length?`<div class="cv-items">${x.items.map(i=>`<span>${esc(i.t)}${i.s?`<em>담당 ${esc(i.s)}</em>`:''}</span>`).join('')}</div>`:''}</li>`).join('')}`
        + `${de.map(x=>{ const c=calCat(x); return `<li class="ce-i" style="background:${c[2]}" data-cedit="${esc(x.id)}" title="누르면 고치기 · 삭제"><span>${calTag(c)} ${per(x)}${x.tm?`<b class="ctm">${esc(x.tm)}</b> · `:''}<b class="ce-t" style="color:${c[1]}">${esc(x.title)}</b></span></li>`; }).join('')}</ul>` : '<p class="hint">이날 단체 방문 · 일정이 없습니다.</p>')
    + `</div></div>`;
}
function calRestore(){}   // 예전 칸 안 입력(제목 · 시간 · 끝나는 날)은 없앰 (2026-11-24) — 「+」 팝업으로
// ===== 일정 추가 · 고치기 팝업 (2026-11-24) =====
//  「캘린더」 옆 + = 추가 · 아래 일정 상자를 누르면 같은 팝업으로 고치기 + 「삭제」
//  하루 일정 = 날짜 하나 + 시간(선택 · 비우면 하루 종일) / 기간 일정 = 시작하는 날 ~ 끝나는 날 (시간 없음) · 시작하는 날 기본 오늘
function calDateBox(pick, errId){   // 단체 방문일과 같은 날짜 칸 (칸 안에 「날짜 (요일)」 · 누르면 달력 · 한 번 더 누르거나 숫자를 치면 직접 입력)
  const txt=pick.parentElement.querySelector('.dtxt');
  const paint=()=>{ if(!txt.dataset.editing) txt.value=SY.dateDisp(pick.value); };
  const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
  const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value=blank?'':pick.value; txt.focus(); if(!blank) txt.select(); };
  txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return; if(Date.now()-(+txt.dataset.pickAt||0)<20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; } txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
  txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } });
  txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const raw=txt.value.trim(), d=raw==='' ? '' : SY.parseDateText(raw); delete txt.dataset.editing; txt.readOnly=true;
    if(!d){ $('#'+(errId||'calErr')).textContent='날짜를 알아볼 수 없습니다. 2026-12-05 · 12/5 처럼 적어 주세요.'; paint(); return; } pick.value=d; pick.dispatchEvent(new Event('change', {bubbles:true})); });
  pick.addEventListener('input', paint); pick.addEventListener('change', paint); paint();
}
let calAddCat='행사', calEditId='';
const calPlus1 = d => { const x=new Date(d+'T00:00'); x.setDate(x.getDate()+1); return opsYmd(x); };
function calOpenAdd(row){
  let M=$('#calModal'); if(!M){ M=document.createElement('div'); M.id='calModal'; M.className='cm-modal'; document.body.appendChild(M); }
  calEditId=row ? row.id : ''; calAddCat=row ? calCat(row)[0] : '행사';   // 새 일정은 늘 「행사」부터
  const d=row ? row.d : opsToday(), isPer=!!(row && row.d2 && row.d2>row.d), d2=isPer ? row.d2 : calPlus1(d), tm0=row && !isPer ? (row.tm||'') : '';
  const dbox=(id,v)=>`<span class="dbox"><input class="dtxt" readonly placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력" inputmode="numeric"><input type="date" class="dpick" id="${id}" value="${v}"></span>`;
  M.innerHTML = `<div class="cm-panel cal-panel" role="dialog" aria-label="${row?'일정 고치기':'일정 추가'}"><h2>${row?'일정 고치기':'일정 추가'}</h2>`
    + `<div class="cal-f"><span class="cal-fl">구분</span><span class="cal-cats">${CAL_CATS.map(c=>`<button type="button" data-ccat="${c[0]}" style="--c:${c[1]}"${c[0]===calAddCat?' class="on"':''}>${c[0]}</button>`).join('')}</span></div>`
    + `<div class="cal-f"><span class="cal-fl">제목</span><input id="calNTitle" placeholder="예: 정기 점검 · 직원 교육 · 겨울 휴관" data-ime="ko" maxlength="60" autocomplete="off" value="${esc(row?row.title:'')}"></div>`
    + `<div class="cal-f"><span class="cal-fl">일정</span><span class="cal-kind"><button type="button" data-ckind="day"${isPer?'':' class="on"'}>하루 일정</button><button type="button" data-ckind="per"${isPer?' class="on"':''}>기간 일정</button></span></div>`
    + `<div class="cal-f"><span class="cal-fl" id="calDLabel">${isPer?'기간':'날짜'}</span><span class="cal-per">${dbox('calNFrom', d)}<span class="cal-to"${isPer?'':' hidden'}>~</span><span class="cal-to"${isPer?'':' hidden'}>${dbox('calNTo', d2)}</span></span></div>`
    + `<div class="cal-f cal-tmrow"${isPer?' hidden':''}><span class="cal-fl">시간</span><span class="cal-tm"><label><input type="checkbox" id="calNAll"${tm0?'':' checked'}> 하루 종일</label><input id="calNTm" data-tp="range" placeholder="예: 10:00~11:00" maxlength="11" autocomplete="off" value="${esc(tm0)}"${tm0?'':' hidden'}></span></div>`
    + `<p class="err" id="calErr"></p><div class="cm-btns">${row?'<button type="button" class="btn-sm primary" id="calNDel">삭제</button>':''}<span class="hint"></span><button type="button" class="btn-sm primary" data-cclose>닫기</button><button type="button" class="btn-sm primary" id="calNSave">${row?'저장':'추가'}</button></div></div>`;
  M.hidden=false; M.querySelectorAll('.dpick').forEach(p=>calDateBox(p)); setTimeout(()=>{ const t=$('#calNTitle'); t.focus(); const n=t.value.length; try{ t.setSelectionRange(n,n); }catch(_){} }, 0);
}
function calCloseAdd(){ const M=$('#calModal'); if(M){ M.hidden=true; M.innerHTML=''; } calEditId=''; }
const calIsPer = () => !!document.querySelector('#calModal [data-ckind="per"].on');
document.addEventListener('change', e=>{
  if(e.target.id==='calNFrom' && calIsPer()){ const t=$('#calNTo'); if(t && (!t.value || t.value<=e.target.value)){ t.value=calPlus1(e.target.value); t.dispatchEvent(new Event('change')); } }   // 기간 일정: 시작하는 날을 끝나는 날 뒤로 옮기면 끝나는 날 = 다음 날
  if(e.target.id==='calNAll'){ const tm=$('#calNTm'); tm.hidden=e.target.checked; if(!e.target.checked) tm.focus(); }   // 하루 종일을 풀면 시간 칸
});
document.addEventListener('keydown', e=>{ const M=$('#calModal'); if(!M || M.hidden) return;
  if(e.key==='Escape' && !document.querySelector('.tp-pop:not([hidden])')) calCloseAdd();
  if(e.key==='Enter' && e.target.id==='calNTitle'){ e.preventDefault(); $('#calNSave').click(); } });
document.addEventListener('click', e=>{
  if(e.target.closest('#calAddBtn')){ calOpenAdd(null); return; }
  const ed=e.target.closest('[data-cedit]'); if(ed){ const r=calRows(lastItems).find(x=>x.id===ed.dataset.cedit); if(r) calOpenAdd(r); return; }
  const M=$('#calModal'); if(!M || M.hidden) return;
  if(e.target===M || e.target.closest('[data-cclose]')){ calCloseAdd(); return; }
  const c=e.target.closest('[data-ccat]'); if(c){ calAddCat=c.dataset.ccat; M.querySelectorAll('[data-ccat]').forEach(b=>b.classList.toggle('on', b===c)); return; }
  const k=e.target.closest('[data-ckind]'); if(k){ const per=k.dataset.ckind==='per'; M.querySelectorAll('[data-ckind]').forEach(b=>b.classList.toggle('on', b===k));
    M.querySelectorAll('.cal-to').forEach(x=>x.hidden=!per); M.querySelector('.cal-tmrow').hidden=per; $('#calDLabel').textContent=per?'기간':'날짜';
    if(per){ const f=$('#calNFrom'), t=$('#calNTo'); if(!t.value || t.value<=f.value){ t.value=calPlus1(f.value); t.dispatchEvent(new Event('change')); } } return; }
  if(e.target.id==='calNDel'){ const id=calEditId, r=calRows(lastItems).find(x=>x.id===id); if(!id || !confirm(`「${r?r.title:'이 일정'}」을(를) 삭제할까요?`)) return;
    e.target.disabled=true; calSave(rows=>rows.filter(x=>x.id!==id), '삭제').then(()=>calCloseAdd()).catch(er=>{ e.target.disabled=false; $('#calErr').textContent='삭제하지 못했습니다: '+(er.code||er.message); }); return; }
  if(e.target.id==='calNSave'){
    const err=$('#calErr'), title=$('#calNTitle').value.trim(), per=calIsPer(), d=$('#calNFrom').value, d2=per ? $('#calNTo').value : '', all=per || $('#calNAll').checked, tm=all ? '' : $('#calNTm').value.trim();
    err.textContent='';
    if(!title){ err.textContent='제목을 적어 주세요.'; $('#calNTitle').focus(); return; }
    if(!d){ err.textContent=per?'시작하는 날을 넣어 주세요.':'날짜를 넣어 주세요.'; return; }
    if(per && !d2){ err.textContent='끝나는 날을 넣어 주세요.'; return; }
    if(per && d2<=d){ err.textContent='끝나는 날이 시작하는 날보다 뒤여야 합니다 (같은 날이면 「하루 일정」).'; return; }
    if(!all && !tm){ err.textContent='시간을 넣거나 「하루 종일」을 고르세요.'; $('#calNTm').focus(); return; }
    const me=(getUser()||{}).name||'', now=new Date().toISOString(), id=calEditId;
    const base={cat:calAddCat, d, tm, title};
    e.target.disabled=true;
    const fn = id ? rows=>rows.map(x=>{ if(x.id!==id) return x; const y={...x, ...base, editBy:me, editAt:now}; if(per) y.d2=d2; else delete y.d2; return y; })
                  : rows=>[...rows, {id:'e'+Date.now().toString(36), ...base, ...(per ? {d2} : {}), by:me, at:now}];
    calSave(fn, `${id?'고침':'추가'} ${title}`).then(()=>{ calDay=d; calMonth=d.slice(0,7); calCloseAdd(); renderDash(); })
      .catch(er=>{ e.target.disabled=false; err.textContent=(id?'저장하지':'추가하지')+' 못했습니다: '+(er.code||er.message); });
  }
});
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
});
document.addEventListener('change', e=>{ if(e.target.id==='dashMem'){ dashMem=e.target.value; try{ localStorage.setItem('sy_dash_mem', dashMem); }catch(_){} renderDash(); } });
// ===== 공지사항 (2026-11-24 · 대시보드 1열 2행 · 캘린더 아래) =====
//  저장: 공유 기록(calls) 한 줄 id noticedb · 통화 구분 「공지사항」 · 수정 기록 칸 {rows:[{id, title, body, by, at, editBy, editAt, from·to(게시 기간 · 없으면 기한 없음)}]} (최신을 받아 그 위에)
//  「게시물 등록」 → 팝업(제목 · 내용) · 목록은 최근 것부터 · 누르면 내용 보기 팝업(고치기 · 삭제 · 닫기)
const NT_ID='noticedb', NT_TYPE='공지사항';
const ntRows = items => { const it=(items||[]).find(x=>x.id===NT_ID && !x.deleted); let h={}; try{ h=JSON.parse((it||{}).history||'{}')||{}; }catch(_){} return Array.isArray(h.rows) ? h.rows : []; };
const ntDay = iso => { const s=String(iso||''); return s ? opsDateLabel(opsYmd(new Date(s))) : ''; };
const ntIsNew = r => Date.now()-new Date(r.at||0).getTime() < 3*864e5;   // 3일 안에 올린 글 = 새 글
// 게시 기간 (2026-11-24): from · to 가 있으면 그 기간에만 목록에 뜸 (from 이 오늘보다 뒤 = 예약 공지) · 없으면 기한 없음
const ntState = (r, today) => !r.to ? (r.from && r.from>today ? 'sched' : 'on') : r.from && r.from>today ? 'sched' : r.to<today ? 'past' : 'on';
const ntPer = r => r.to ? `${opsDateLabel(r.from||'')} ~ ${opsDateLabel(r.to)}` : '기한 없음';
let ntShowOff=false;   // 예약 · 지난 공지도 보기 (목록 맨 아래 버튼)
function noticeHTML(){
  const today=opsToday(), A=ntRows(lastItems).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const L=A.filter(r=>ntState(r,today)==='on'), off=A.filter(r=>ntState(r,today)!=='on');
  const li = r => { const s=ntState(r,today); return `<li><button type="button" class="nt-i${s!=='on'?' off':''}" data-nt="${esc(r.id)}"><span class="nt-t">${s==='sched'?'<span class="nt-st">예약</span> ':s==='past'?'<span class="nt-st">지남</span> ':''}${esc(r.title)}</span><small>${esc(r.by||'')} · ${esc(ntDay(r.at))}${r.to?` · 게시 ${esc(ntPer(r))}`:''}</small></button></li>`; };
  return `<div class="dcol-h"><b>공지사항</b><button type="button" class="cm-btn" id="ntAddBtn" title="공지사항 게시물 등록">게시물 등록</button></div>`
    + (L.length || off.length ? `<ul class="dlist nt-list">${L.map(li).join('')}${!L.length?'<li class="hint nt-none">지금 게시 중인 공지사항이 없습니다.</li>':''}`
        + (off.length ? `<li><button type="button" class="nt-offbtn" id="ntOffBtn">${ntShowOff?'예약 · 지난 공지 접기 ▴':`예약 · 지난 공지 ${off.length}개 보기 ▾`}</button></li>${ntShowOff?off.map(li).join(''):''}` : '') + `</ul>`
      : `<p class="hint dempty">공지사항이 없습니다. 「게시물 등록」으로 올리세요.</p>`);
}
async function ntSave(fn, what){   // 최신 공지사항을 받아 fn(rows) 로 바꾸고 저장
  const j=await SY.list(); lastItems=SY.live.apply(j.items||[]);
  const it=(lastItems||[]).find(x=>x.id===NT_ID), rows=fn(ntRows(lastItems).slice()), now=new Date().toISOString(), me=(getUser()||{}).name||'';
  const item={...(it||{}), id:NT_ID, callType:NT_TYPE, saved:(it&&it.saved)||now, takenBy:me, owner:'', summary:`공지사항 ${rows.length}건 · ${what}`.slice(0,120), history:JSON.stringify({rows, at:now, by:me})};
  delete item.date; delete item.org;
  await SY.call({action:'put', item}); SY.live.post({t:'put', item});
  const i=lastItems.findIndex(x=>x.id===NT_ID); if(i>=0) lastItems[i]=item; else lastItems.push(item);
  renderDash();
}
let ntEditId='';
function ntModal(){ let M=$('#ntModal'); if(!M){ M=document.createElement('div'); M.id='ntModal'; M.className='cm-modal'; document.body.appendChild(M); } return M; }
function ntClose(){ const M=$('#ntModal'); if(M){ M.hidden=true; M.innerHTML=''; } ntEditId=''; }
function ntOpenForm(row){
  const M=ntModal(); ntEditId=row ? row.id : '';
  M.innerHTML = `<div class="cm-panel nt-panel" role="dialog" aria-label="${row?'게시물 고치기':'게시물 등록'}"><h2>${row?'게시물 고치기':'게시물 등록'}</h2>`
    + `<input id="ntTitle" class="nt-in" placeholder="제목" data-ime="ko" maxlength="80" autocomplete="off" value="${esc(row?row.title:'')}">`
    + `<textarea id="ntBody" class="nt-ta" placeholder="내용" data-ime="ko">${esc(row?row.body||'':'')}</textarea>`
    + ntPerHTML(row)
    + `<p class="err" id="ntErr"></p><div class="cm-btns"><span class="hint"></span><button type="button" class="btn-sm primary" data-ntclose>닫기</button><button type="button" class="btn-sm primary" id="ntSaveBtn">${row?'저장':'등록'}</button></div></div>`;
  M.hidden=false; M.querySelectorAll('.dpick').forEach(p=>calDateBox(p, 'ntErr')); setTimeout(()=>$('#ntTitle').focus(), 0);
}
// 게시 기간 칸: 「기한 없음」 / 「기한 있음」(시작하는 날 기본 오늘 ~ 끝나는 날 기본 일주일 뒤 · 시작을 뒤로 하면 예약 공지)
function ntPerHTML(row){
  const today=opsToday(), has=!!(row && row.to), x=new Date(today+'T00:00'); x.setDate(x.getDate()+7);
  const from=has ? (row.from||today) : today, to=has ? row.to : opsYmd(x);
  const dbox=(id,v)=>`<span class="dbox"><input class="dtxt" readonly placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력" inputmode="numeric"><input type="date" class="dpick" id="${id}" value="${v}"></span>`;
  return `<div class="cal-f nt-perrow"><span class="cal-fl">게시</span><span class="cal-kind"><button type="button" data-ntper="0"${has?'':' class="on"'}>기한 없음</button><button type="button" data-ntper="1"${has?' class="on"':''}>기한 있음</button></span></div>`
    + `<div class="cal-f nt-perdates"${has?'':' hidden'}><span class="cal-fl">기간</span><span class="cal-per">${dbox('ntFrom', from)}<span>~</span>${dbox('ntTo', to)}</span></div>`
    + `<p class="hint nt-perhint"${has?'':' hidden'}>이 기간에만 공지사항 목록에 뜹니다 · 시작하는 날을 뒤로 하면 그날부터 뜨는 예약 공지</p>`;
}
function ntOpenView(r){
  const M=ntModal(); ntEditId=r.id;
  M.innerHTML = `<div class="cm-panel nt-panel" role="dialog" aria-label="공지사항"><h2>${esc(r.title)}</h2>`
    + `<p class="nt-meta">${esc(r.by||'')} · ${esc(ntDay(r.at))}${r.editAt?` · 고침 ${esc(r.editBy||'')} ${esc(ntDay(r.editAt))}`:''} · 게시 ${esc(ntPer(r))}${ntState(r,opsToday())==='sched'?' (예약)':ntState(r,opsToday())==='past'?' (지남)':''}</p>`
    + `<div class="nt-body">${esc(r.body||'').replace(/\n/g,'<br>')||'<span class="hint">(내용 없음)</span>'}</div>`
    + `<p class="err" id="ntErr"></p><div class="cm-btns"><button type="button" class="btn-sm primary" id="ntDelBtn">삭제</button><span class="hint"></span><button type="button" class="btn-sm primary" id="ntEditBtn">고치기</button><button type="button" class="btn-sm primary" data-ntclose>닫기</button></div></div>`;
  M.hidden=false;
}
document.addEventListener('keydown', e=>{ const M=$('#ntModal'); if(M && !M.hidden && e.key==='Escape') ntClose(); });
document.addEventListener('click', e=>{
  if(e.target.closest('#ntAddBtn')){ ntOpenForm(null); return; }
  if(e.target.closest('#ntOffBtn')){ ntShowOff=!ntShowOff; renderDash(); return; }
  const pk=e.target.closest('[data-ntper]'); if(pk){ const has=pk.dataset.ntper==='1', M=$('#ntModal'); M.querySelectorAll('[data-ntper]').forEach(b=>b.classList.toggle('on', b===pk)); M.querySelector('.nt-perdates').hidden=!has; M.querySelector('.nt-perhint').hidden=!has; return; }
  const v=e.target.closest('[data-nt]'); if(v){ const r=ntRows(lastItems).find(x=>x.id===v.dataset.nt); if(r) ntOpenView(r); return; }
  const M=$('#ntModal'); if(!M || M.hidden) return;
  if(e.target===M || e.target.closest('[data-ntclose]')){ ntClose(); return; }
  if(e.target.id==='ntEditBtn'){ const r=ntRows(lastItems).find(x=>x.id===ntEditId); if(r) ntOpenForm(r); return; }
  if(e.target.id==='ntDelBtn'){ const id=ntEditId, r=ntRows(lastItems).find(x=>x.id===id); if(!id || !confirm(`「${r?r.title:'이 게시물'}」을(를) 삭제할까요?`)) return;
    e.target.disabled=true; ntSave(rows=>rows.filter(x=>x.id!==id), '삭제').then(ntClose).catch(er=>{ e.target.disabled=false; $('#ntErr').textContent='삭제하지 못했습니다: '+(er.code||er.message); }); return; }
  if(e.target.id==='ntSaveBtn'){
    const err=$('#ntErr'), title=$('#ntTitle').value.trim(), body=$('#ntBody').value.replace(/\s+$/,''), me=(getUser()||{}).name||'', now=new Date().toISOString(), id=ntEditId;
    err.textContent=''; if(!title){ err.textContent='제목을 적어 주세요.'; $('#ntTitle').focus(); return; }
    const has=!!M.querySelector('[data-ntper="1"].on'), from=has ? $('#ntFrom').value : '', to=has ? $('#ntTo').value : '';
    if(has && (!from || !to)){ err.textContent='게시 기간의 시작하는 날과 끝나는 날을 넣어 주세요.'; return; }
    if(has && to<from){ err.textContent='끝나는 날이 시작하는 날보다 앞입니다.'; return; }
    e.target.disabled=true;
    const per = x => { const y={...x}; if(has){ y.from=from; y.to=to; } else { delete y.from; delete y.to; } return y; };
    const fn = id ? rows=>rows.map(x=>x.id===id ? per({...x, title, body, editBy:me, editAt:now}) : x) : rows=>[...rows, per({id:'n'+Date.now().toString(36), title, body, by:me, at:now})];
    ntSave(fn, `${id?'고침':'등록'} ${title}`).then(ntClose).catch(er=>{ e.target.disabled=false; err.textContent=(id?'저장하지':'등록하지')+' 못했습니다: '+(er.code||er.message); });
  }
});
function renderDash(){ if(!dashData) return; paintRange();
  // 2026-11-24 배치: 4열 · 2행 — ① 1행 캘린더(단체 방문 + 일정표) · 2행 공지사항 ② 개인고객 전화 ③ 단체고객 전화 (두 행 통째로) ④ 1행 개인 업무(멤버 고르기 · 기본 전체) · 2행 공통 업무(담당 없는 과업)
  const today=opsToday(), tm=new Date(today+'T00:00'); tm.setDate(tm.getDate()+1); const tomorrow=opsYmd(tm), me=(getUser()||{}).name||'';
  const q=(($('#dashQ')||{}).value||'').trim().toLowerCase(), qd=q.replace(/\D/g,'');
  const hit = r => !q || r.q.toLowerCase().includes(q) || (qd.length>=3 && r.q.replace(/\D/g,'').includes(qd));   // 전화번호는 - 없이도
  const all = dashData.recs.filter(hit), mine = all.filter(r=>r.owner), common = [...all.filter(r=>!r.owner && cmOn(r.src==='quote' ? 'quote' : 'noowner')), ...commonExtra(today).filter(hit)];
  const dl = d => d<today ? `<span class="late">지남 ${esc(opsDateLabel(d))}</span>` : d===today ? '오늘' : d===tomorrow ? '내일' : esc(opsDateLabel(d));
  const first = r => r.due.reduce((m,t)=>t.due<m?t.due:m, '9999');
  // 마감 기간 (2026-11-24 · 위 왼쪽 버튼 · 「내일 마감도 보기」 대신): 오늘 · 내일 · 이번주 · 이번달 = 그날까지(지난 것 포함) · 기간설정 = 고른 시작일 ~ 끝날
  const [rFrom, rTo] = dashRangeDates(today), rLabel = DASH_RANGES.find(x=>x[0]===dashRange.k)?.[1] || '오늘 마감';
  const list = src => ({ L:src.map(r=>({...r, due:r.tasks.filter(t=>(!rFrom || t.due>=rFrom) && t.due<=rTo)})).filter(r=>r.due.length).sort((a,b)=>first(a).localeCompare(first(b)) || a.name.localeCompare(b.name)) });
  const items = (L, showOwner) => L.map(r=>{ const late=r.due.some(t=>t.due<today);
    const D=r.due.slice().sort((a,b)=>a.due.localeCompare(b.due)), A=r.href ? `a href="${r.href}"` : 'div class="dnolink"';
    return `<li class="drec${late?' late':''}${r.cm?' cm':''}"><${A}><span class="dr-h"><b>${esc(r.name)}</b>${showOwner?`<span class="downer${me && r.owner===me?' me':''}">${esc(r.owner||'담당 없음')}</span>`:''}</span>`   // 줄은 칠하지 않고 내 이름 칸만 초록 (2026-11-25)
      + D.map(t=>`<span class="dr-t">${dl(t.due)} · ${esc(t.title)}</span>`).join('') + `</${r.href?'a':'div'}>`
      + (r.cm ? `<button type="button" class="cm-done" data-cmdone="${esc(r.cm)}" data-day="${esc(D[0].due)}" title="${esc(opsDateLabel(D[0].due))} 것을 끝냄">완료</button>` : '') + `</li>`; }).join('');
  const box = (kind, title, src, extraHead, opt={}) => { const {L}=list(src), pre=opt.pre||'', n=L.length+(opt.preN||0);
    return `<div class="dcol${opt.cls?' '+opt.cls:''}"><div class="dcol-h"><b>${title}</b>${extraHead||''}<span class="dn">${n}</span></div>`
      + (n ? `<ul class="dlist">${pre}${items(L, opt.owner!==false)}</ul>` : `<p class="hint dempty">${q?'검색에 맞는 것이 없습니다.':`${esc(rLabel)} 기준 할 것이 없습니다.`}</p>`) + `</div>`; };
  // ③ 개인 업무: 멤버 고르기 (기본 전체 = 모두의 것)
  const names=[...new Set([...(dashData.names||[]), ...mine.filter(r=>r.kind==='기타').map(r=>r.owner)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
  if(dashMem && !names.includes(dashMem)) dashMem='';
  const memSel = `<select id="dashMem" class="dmem" title="이 사람의 개인 업무만"><option value="">전체</option>${names.map(n=>`<option${n===dashMem?' selected':''}>${esc(n)}</option>`).join('')}</select>`;
  const etc = mine.filter(r=>r.kind==='기타' && (!dashMem || r.owner===dashMem));
  // ④ 2행 공통 업무: 담당이 없는 과업 (고객 견적 요청 · 담당 없는 예약 과업 등) + 정기 재고조사 날
  // 2026-11-25 · 1열 2행 「오늘 마감」: 내 것(단체 · 개인 · 개인 업무) 중 오늘 마감 + 지난 마감 — 위 마감 기간 버튼과 상관없이 늘 오늘 · 초록 「나의 할일」 = 팝업 열기
  //  2026-11-25 고침: 제목 「오늘 마감 · 내 이름」 · 줄마다 구분 표시 · 과업마다 체크 칸(바로 완료) · 이름 · 과업을 누르면 그 예약을 팝업으로 열어 바로 고침 · 단체 · 개인고객은 「바로가기」(그 화면으로) · 「오늘」 글자는 안 씀 (지난 것만 「지남 날짜」)
  //  2026-11-27: 직접 넣은 업무(개인 업무)는 업무마다 한 줄 · 한 번만 셈 — 반복 업무를 하루 안 했으면 「지난 날 · 오늘」 두 줄로 나와 과업 하나가 2개로 세어졌음.
  //   나의 할일 「오늘 마감」과 같게: 오늘 할 날이 있으면 오늘, 없으면 안 한 지난 날 중 가장 이른 날 (나머지 지난 날 수는 글자로 · 체크하면 그 줄의 날이 완료되고 다음 것이 나옴)
  const one = r => { if(r.kind!=='기타' || r.due.length<2) return r; const t=r.due.find(x=>x.due===today) || r.due[0]; return {...r, due:[{...t, more:r.due.length-1}]}; };
  const todayBox = () => { const L=all.filter(r=>me && r.owner===me).map(r=>one({...r, due:r.tasks.filter(t=>t.due<=today).sort((a,b)=>a.due.localeCompare(b.due))})).filter(r=>r.due.length).sort((a,b)=>first(a).localeCompare(first(b)) || a.name.localeCompare(b.name));
    const n=L.reduce((s,r)=>s+r.due.length, 0);
    const ck = (r, t) => `<label class="dtd-ck" title="체크하면 완료"><input type="checkbox" data-dck="${esc([r.kind, r.rid||'', t.id||'', t.day||''].join('|'))}"></label>`;
    const open = r => r.kind==='기타' ? 'data-mypop' : `data-recpop="${esc(r.href.replace('?open=', '?embed=1&open='))}"`;
    const late = t => (t.due<today ? `<small class="late">지남 ${esc(opsDateLabel(t.due))}</small>` : '') + (t.more ? `<small class="late">안 한 지난 날 ${t.more}일 더</small>` : '');
    const li = r => { const k=DTD_KIND[r.kind]||[r.kind,''];
      if(r.kind==='기타') return `<li class="dtd">${r.due.map(t=>`<div class="dtd-t">${ck(r,t)}<span class="dk ${k[1]}">${k[0]}</span><button type="button" class="dtd-x" ${open(r)} title="나의 할일에서 고치기">${esc(r.name)}</button>${late(t)}</div>`).join('')}</li>`;
      return `<li class="dtd"><div class="dtd-h"><span class="dk ${k[1]}">${k[0]}</span><button type="button" class="dtd-x dtd-name" ${open(r)} title="눌러서 바로 고치기 (팝업)">${esc(r.name)}</button>${r.href?`<a class="dtd-go" href="${esc(r.href)}" data-tip="바로가기" aria-label="바로가기 (그 화면으로)"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.3 10.3l3.9 3.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>`:''}</div>`
        + r.due.map(t=>`<div class="dtd-t">${ck(r,t)}<button type="button" class="dtd-x" ${open(r)} title="눌러서 바로 고치기 (팝업)">${esc(t.title)}</button>${late(t)}</div>`).join('') + `</li>`; };
    return `<div class="dcol dtoday"><div class="dcol-h"><b>오늘 마감${me?` · ${esc(me)}`:''}</b><span class="dn">${n}</span></div>`
      + (L.length ? `<ul class="dlist dtd-list">${L.map(li).join('')}</ul>` : `<p class="hint dempty">${q?'검색에 맞는 것이 없습니다.':'마감인 내 과업이 없습니다.'}</p>`) + `</div>`; };
  const RS = cmRule('stock'), st = cmOn('stock') && !devOff('stock.html') ? stockDue(today) : '', pre = st ? `<li class="drec late"><a href="stock.html"><span class="dr-h"><b>${esc(RS.title||'📋 정기 재고조사')}</b></span><span class="dr-t">${dl(st)} · ${esc(RS.text||'붕정 · 차방을 세어 재고관리에 기록')}</span></a></li>` : '';
  $('#dashBody').innerHTML = `<div class="dcols d2">`
    // 2026-11-25 배치: 1행 = 캘린더(1 · 2열) · 개인고객 전화(3열) · 개인 업무(4열) / 2행 = 오늘 마감(1열) · 공지사항(2열) · 단체고객 전화(3열) · 공통 업무(4열)
    + `<div class="dcol dcal-col">${calHTML(today)}</div>`
    + todayBox()
    + `<div class="dcol dnotice">${noticeHTML()}</div>`
    + box('개인','개인고객 전화', mine.filter(r=>r.kind==='개인'), '', {cls:'dpc'})
    + box('단체','단체고객 전화', mine.filter(r=>r.kind==='단체'), '', {cls:'dgc'})
    + box('기타','개인 업무', etc, memSel, {cls:'dmine'})
    + box('공통','공통 업무', common, cmMgrBtn, {cls:'dcommon', pre, preN:st?1:0, owner:false})
    + `</div>`;
  calRestore();
}
// ===== 오늘 마감 (2026-11-25): 체크 = 나의 할일과 같은 완료 처리 · 누르면 그 예약을 팝업으로 =====
const DTD_KIND = {단체:['단체고객','dk-g'], 개인:['개인고객','dk-p'], 기타:['개인 업무','dk-e']};
//  체크: 첫 화면의 과업 계산 창(#dashEngine = 나의 할일 화면)에 같은 체크 칸을 만들어 넘김 → 나의 할일에서 체크한 것과 똑같이 저장 (단체 · 개인고객 과업 · 개인 업무)
//  전산 내역을 붙여넣어야 끝나는 과업(SELF_DONE)은 나의 할일처럼 체크 대신 그 예약을 엶
function dashCheck(inp){
  const [kind, rid, tid, day]=inp.dataset.dck.split('|'), E=engine();
  if(!E){ inp.checked=false; alert('과업 계산 창을 준비하는 중입니다. 잠시 뒤 다시 체크해 주세요.'); return; }
  try{
    const it=(lastItems||[]).find(x=>x.id===rid);   // 계산 창의 기록을 첫 화면의 최신 것으로 맞춘 뒤
    if(it) E.eval('(it=>{ const i=cache.findIndex(x=>x.id===it.id); if(i>=0) cache[i]=it; else cache.push(it); })')(JSON.parse(JSON.stringify(it)));
    if(kind==='단체' && E.eval('SELF_DONE').has(tid)){ inp.checked=false; recPopOpen('group.html?embed=1&open='+encodeURIComponent(rid)); return; }
    const x=E.document.createElement('input'); x.type='checkbox'; x.checked=true; x.hidden=true;
    if(kind==='기타') x.dataset.etcdone=`${rid}|${day||opsToday()}`; else x.dataset.myck=`${kind==='개인'?'p':'g'}|${rid}|${tid}`;
    E.document.body.appendChild(x); x.dispatchEvent(new E.Event('change', {bubbles:true})); setTimeout(()=>x.remove(), 10000);
  }catch(err){ inp.checked=false; alert('완료로 표시하지 못했습니다: '+(err.message||err)); return; }
  inp.disabled=true; inp.closest('.dtd-t')?.classList.add('done');   // 바로 흐리게 → 저장되면 다시 받아 목록에서 빠짐
  dashSoon(1500);
}
document.addEventListener('change', e=>{ if(e.target.matches?.('[data-dck]') && e.target.checked) dashCheck(e.target); });
// 예약 팝업: 단체 · 개인고객 화면을 머리줄 없이(embed=1) 띄워 그 자리에서 고침 · 닫으면 대시보드를 다시 받음
function recPopOpen(url){ const P=$('#recPop'), F=$('#recPopFrame'); if(!P) { location.href=url.replace('embed=1&',''); return; } F.src=url; P.hidden=false; }
function recPopClose(){ const P=$('#recPop'); if(!P || P.hidden) return; P.hidden=true; $('#recPopFrame').src='about:blank'; dashSoon(200); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('#recPop') && !$('#recPop').hidden){ e.preventDefault(); recPopClose(); } });
document.addEventListener('click', e=>{
  if(e.target.closest('#calPopBtn')){ const w=window.open('./?cal=1', 'sy_cal', 'width=1000,height=460,resizable=yes,scrollbars=yes'); if(w) w.focus(); else location.href='./?cal=1'; return; }   // 캘린더 새 창 (2026-11-25 · 같은 창이 있으면 그 창을 앞으로)
  const rp=e.target.closest('[data-recpop]'); if(rp){ e.preventDefault(); recPopOpen(rp.dataset.recpop); return; }
  if(e.target.id==='recPop' || e.target.closest('#recPopX')){ recPopClose(); return; }
  const w=e.target.closest('[data-dwho]'); if(w){ dashWho = dashWho===w.dataset.dwho ? '' : w.dataset.dwho; renderDash(); }
});
if($('#dashQ')) $('#dashQ').addEventListener('input', ()=>renderDash());
// 나의 할일은 팝업으로만 (2026-11-24): 대시보드의 「기타 개인 할일」 줄(href="#mypop")을 누르면 팝업 · 예전 주소(group.html?my=1 · mypage.html · ops.html?p=task)로 들어오면 여기(./#mypop)로 넘어와 팝업을 엶
const openMyHash = () => { if(location.hash!=='#mypop') return; history.replaceState(null,'',location.pathname+location.search); if(getUser() && window.openMyPop) window.openMyPop(); };
document.addEventListener('click', e=>{ const a=e.target.closest?.('a[href="#mypop"]'); if(!a) return; e.preventDefault(); if(window.openMyPop) window.openMyPop(); });
window.addEventListener('hashchange', openMyHash); setTimeout(openMyHash, 0);
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
// 사번 미입력 멤버 (2026-11-24 · 단체 화면 담당 고르기의 「＋ 새 멤버」로 이름만 만든 사람 · 임시 사번 NEW-…): 사번을 넣으면 같은 이름 · 연락처로 새 사번 멤버를 만들고 임시 사번은 뺌
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.matches && e.target.matches('input[data-memp]')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('change', async e=>{ const p=e.target.closest && e.target.closest('input[data-memp]'); if(!p) return;
  const old=p.dataset.memp, emp=p.value.trim(), m=members.find(x=>x.emp===old); if(!m || !emp) return;
  if(!/^[0-9A-Za-z-]{2,20}$/.test(emp)){ $('#memberErr').textContent='사번은 숫자 · 영문 2~20자로 넣어 주세요.'; return; }
  if(members.some(x=>x.emp.toUpperCase()===emp.toUpperCase())){ $('#memberErr').textContent=`${emp} 는 이미 있는 사번입니다.`; return; }
  p.disabled=true; const u=getUser()||{};
  const j=await memberCall({action:'memberAdd', list:[{name:m.name, emp, phone:m.phone||''}], by:u.name||''});
  if(!j || !j.added){ p.disabled=false; if(!$('#memberErr').textContent) $('#memberErr').textContent='사번을 넣지 못했습니다.'; return; }
  await memberCall({action:'memberDel', emp:old, by:u.name||''});
  $('#memberErr').textContent=`${m.name} 님 사번을 ${emp} 로 넣었습니다.`; $('#memberErr').style.color='var(--pine)'; setTimeout(()=>{ $('#memberErr').style.color=''; }, 3000); });
// 캘린더 새 창(?cal=1 · 2026-11-25): 창 높이를 캘린더 상자에 맞춤 (달마다 줄 수가 달라 상자가 바뀌면 다시 맞춤 · 새 창으로 연 창에서만 됨)
if(document.documentElement.classList.contains('cal-only')){
  const calFit=()=>{ const c=document.querySelector('.dcal-col'); if(!c || c.offsetParent===null || !window.innerHeight) return;
    const need=Math.ceil(c.getBoundingClientRect().bottom + 22), diff=need-window.innerHeight;   // 22 = 아래 여백 10 + 테스트 사이트 빨간 테두리 · 여유
    if(Math.abs(diff)<3) return; try{ window.resizeBy(0, diff); }catch(_){} };
  new MutationObserver(()=>requestAnimationFrame(calFit)).observe(document.body, {childList:true, subtree:true});
  window.addEventListener('load', ()=>{ setTimeout(calFit, 300); setTimeout(calFit, 1200); });
}
