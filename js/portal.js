// ===== 첫 화면 (index.html): 로그인 · 메뉴 · 품목관리 · 멤버관리 =====

// 로그인 정보: localStorage 'sy_user' = {name, emp, at}. 같은 주소(hyunbin5786.github.io)의 단체 화면 · 견적서 사이트가 함께 씀
const $ = s => document.querySelector(s);
const USER_KEY = 'sy_user';
const ONLINE = /github\.io$/.test(location.hostname);
const QUOTE = ONLINE ? 'https://hyunbin5786.github.io/sayuwon-sales/document/' : 'document/index.html';   // 견적서 · 거래명세서 (이 사이트 안 document/, 예전 주소 sayuwon-invoice-quotation 도 그대로 있음)
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
    $('#quoteLink').href = QUOTE;
    $('#setupBar').hidden = !u.setup;
    $('#setupBar').textContent = u.setup==='empty' ? '아직 등록된 멤버가 없어 누구나 로그인할 수 있습니다. 「관리 › 멤버관리」에서 직원(본인 포함)을 추가하면 그때부터 이름 · 사번을 확인합니다.'
      : u.setup==='old' ? '공유 저장소(Apps Script)가 아직 예전 버전이라 이름 · 사번을 확인하지 못했습니다. 새 버전으로 배포하면 확인합니다.' : '';
    if(location.hash==='#catalog') openCatalog();
    if(view==='members') loadMembers();
    if(view==='menu') setTimeout(()=>{ if(!dashData) loadDash(); }, 0);   // 대시보드 (스크립트를 다 읽은 뒤)
  } else setTimeout(()=>$('#inName').focus(), 0);
}
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ===================== 공유 저장소 (단체 화면과 같은 Apps Script) =====================
const SHARED_URL = "https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec";
const KEY_LS = 'sayuwon_intake_key';   // 팀 비밀번호 (단체 화면 · 개인고객 화면과 같이 씀)
const getKey = () => { try{ return localStorage.getItem(KEY_LS)||''; }catch(_){ return ''; } };
async function callApi(body){
  const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})});   // Content-Type 없이 (Apps Script 사전 확인 요청 없이)
  return r.json();
}

// ===================== 로그인: 멤버 목록(이름 + 사번)과 맞아야 =====================
$('#loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name=$('#inName').value.trim(), emp=$('#inEmp').value.trim(), err=$('#loginErr'), btn=e.submitter||$('#loginForm button');
  if(!name || !emp){ err.textContent='이름과 사번을 모두 넣어 주세요.'; return; }
  if(!/^[0-9A-Za-z-]{2,20}$/.test(emp)){ err.textContent='사번은 숫자 · 영문으로 넣어 주세요.'; return; }
  err.textContent='확인하는 중…'; btn.disabled=true;
  let j=null; try{ j=await callApi({action:'login', name, emp}); }catch(_){ j=null; }
  btn.disabled=false;
  if(!j){ err.textContent='확인하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.'; return; }
  let setup='';
  if(j.ok && j.member) setup = j.empty ? 'empty' : '';
  else if(j.ok){ err.textContent='이름과 사번이 맞지 않습니다. 다시 확인해 주세요.'; $('#inEmp').select(); return; }
  else if(j.error==='bad_key' || j.error==='bad_action') setup='old';   // Apps Script 가 아직 예전 버전 (로그인 확인 기능 없음) → 막지 않음
  else { err.textContent='확인하지 못했습니다: '+(j.error||''); return; }
  setLS(USER_KEY, JSON.stringify({name, emp, at:new Date().toISOString(), setup}));
  setLS('sayuwon_owner', name);   // 단체 화면의 영업 담당
  setLS('sy_sender', name);       // 견적서 담당
  err.textContent=''; view='menu'; paint();
});
$('#logoutBtn').onclick=()=>{
  if(!confirm('로그아웃할까요? 다음 사람이 이름과 사번으로 다시 로그인합니다.')) return;
  [USER_KEY,'sayuwon_owner','sy_sender'].forEach(k=>setLS(k,null));
  $('#inName').value=''; $('#inEmp').value=''; view='menu'; history.replaceState(null,'',location.pathname); paint();
};
// 메뉴
document.addEventListener('click', e=>{
  const c=e.target.closest('[data-go]'); if(!c) return;
  if(c.dataset.go==='catalog'){ e.preventDefault(); openCatalog(); }
  if(c.dataset.go==='members'){ e.preventDefault(); view='members'; history.replaceState(null,'','#members'); paint(); }
});
// 헤더의 「사유원 운영 보조 시스템」 = 메뉴로 (품목관리는 남은 변경을 저장한 뒤)
$('#brand').addEventListener('click', e=>{ if(!getUser()) return; e.preventDefault(); if(!$('#catWrap').hidden){ askClose(); return; } view='menu'; history.replaceState(null,'',location.pathname); paint(); });

// ===================== 멤버관리 (팀 비밀번호 필요) =====================
let members=[];
function paintMembers(){
  const u=getUser()||{};
  $('#memberHint').textContent = members.length ? `${members.length}명` : '';
  $('#memberList').innerHTML = members.map(m=>`<tr class="${m.emp===u.emp?'me':''}"><td>${esc(m.name)}</td><td>${esc(m.emp)}</td><td class="hint">${esc(m.added||'')}${m.by?` · ${esc(m.by)}`:''}</td><td class="r"><button type="button" class="btn-sm del" data-mdel="${esc(m.emp)}" data-mname="${esc(m.name)}">빼기</button></td></tr>`).join('')
    || '<tr><td colspan="4" class="hint">아직 멤버가 없습니다. 위에서 추가하면 그때부터 로그인할 때 이름 · 사번을 확인합니다.</td></tr>';
}
async function memberCall(body){
  $('#memberErr').textContent='';
  let j=null; try{ j=await callApi(body); }catch(_){}
  if(!j){ $('#memberErr').textContent='연결하지 못했습니다. 잠시 뒤 다시 해 주세요.'; return null; }
  if(j.error==='bad_key'){ $('#memberBody').hidden=true; $('#memberKey').hidden=false; $('#memberKeyErr').textContent = getKey() ? '비밀번호가 맞지 않습니다.' : ''; setTimeout(()=>$('#memberKeyIn').focus(),0); return null; }
  if(j.error==='bad_action' || (j.ok && !j.members)){ $('#memberErr').textContent='공유 저장소(Apps Script)를 새 버전으로 배포해야 멤버관리를 쓸 수 있습니다.'; $('#memberBody').hidden=false; $('#memberKey').hidden=true; return null; }
  if(!j.ok){ $('#memberErr').textContent='실패했습니다: '+(j.error||''); return null; }
  $('#memberKey').hidden=true; $('#memberBody').hidden=false;
  members=j.members||[]; paintMembers(); return j;
}
const loadMembers = () => { if(!getKey()){ $('#memberKey').hidden=false; $('#memberBody').hidden=true; return; } memberCall({action:'members'}); };
$('#memberKeyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#memberKeyIn').value.trim(); if(!v) return; setLS(KEY_LS, v); $('#memberKeyIn').value=''; loadMembers(); });
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
// 품목관리 (#catalog): 메뉴에서 열면 이 화면 안의 한 페이지 (헤더 아래 꽉 차게), 닫기(저장이 끝난 뒤) · ← 메뉴 로 메뉴에
function openCatalog(){ $('#catFrame').src = QUOTE + (QUOTE.includes('?')?'&':'?') + 'catalog=1&page=1&t=' + Date.now();   /* page=1: 페이지 모양 (팝업 테두리 · × 없음) */ $('#catWrap').hidden=false; document.querySelector('main').hidden=true; $('#crumb').textContent='품목관리'; $('#crumb').hidden=false; if(location.hash!=='#catalog') history.replaceState(null,'','#catalog'); }
function closeCatalog(){ $('#catWrap').hidden=true; document.querySelector('main').hidden=false; view='menu'; $('#crumb').hidden=true; $('#catFrame').src='about:blank'; history.replaceState(null,'',location.pathname); }
window.addEventListener('message', e=>{ if(!e.data || e.data.type!=='sy-catalog' || e.source!==$('#catFrame').contentWindow) return; if(e.data.ev==='close') closeCatalog(); });
const askClose = () => $('#catFrame').contentWindow?.postMessage({type:'sy-catalog', ev:'close-request'}, '*');

document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#catWrap').hidden){ e.preventDefault(); askClose(); } });
paint();
// 이미 로그인한 브라우저도 첫 화면을 열 때 다시 확인: 멤버에서 빠졌거나 이름 · 사번이 다르면 로그아웃
(async()=>{ const u=getUser(); if(!u) return; let j=null; try{ j=await callApi({action:'login', name:u.name, emp:u.emp}); }catch(_){ return; }
  if(!j || !j.ok) return;   // 연결 안 됨 · 예전 버전이면 그대로 둠
  if(!j.member){ [USER_KEY,'sayuwon_owner','sy_sender'].forEach(k=>setLS(k,null)); view='menu'; paint(); $('#loginErr').textContent='등록된 멤버가 아니어서 로그아웃했습니다. 이름과 사번을 다시 확인해 주세요.'; return; }
  const setup = j.empty ? 'empty' : ''; if((u.setup||'')!==setup){ u.setup=setup; setLS(USER_KEY, JSON.stringify(u)); paint(); } })();

// ===================== 아코디언 메뉴: 펼친 묶음을 이 브라우저에 기억 =====================
(function(){
  let st={}; try{ st=JSON.parse(localStorage.getItem('sy_menu_acc')||'{}')||{}; }catch(_){}
  document.querySelectorAll('#acc details[data-acc]').forEach(d=>{ if(d.dataset.acc in st) d.open=!!st[d.dataset.acc];
    d.addEventListener('toggle', ()=>{ st[d.dataset.acc]=d.open; setLS('sy_menu_acc', JSON.stringify(st)); }); });
})();

// ===================== 대시보드: 모든 사용자의 나의 할일 (단체 · 개인고객 추후 과업 + 기타 개인 업무) =====================
// 단체: 영업 담당(owner)별, 방문 뒤 30일이 지난 예약은 빼고 (나의 할일과 같은 기준). 예약상담은 사전답사 · 담당자 확정 · 대구대교구 · 직접 추가한 과업만
// 개인고객: 받은(저장한) 사람별 안 끝난 과업 · 기타 개인 업무: 오늘 할 것 + 지난 것(반복은 최근 7일)
const GROUP_TYPES = ['단체예약','예약상담','예약접수','상담','가예약','공식예약'];
const histTasks = r => { try{ const j=JSON.parse(r.history||'{}'); return Array.isArray(j.tasks) ? j.tasks : []; }catch(_){ return []; } };
const dueOf = (t, r) => t.due || (t.at ? opsYmd(t.at) : r.saved ? opsYmd(r.saved) : opsToday());
let dashOpen = new Set();
async function loadDash(){
  if(!getUser()) return;
  if(!getKey()){ $('#dashKey').hidden=false; $('#dashBody').innerHTML=''; $('#dashSum').textContent=''; return; }
  $('#dashKey').hidden=true;
  let items=[], names=[];
  try{ const j=await callApi({action:'list'}); if(!j.ok){ if(j.error==='bad_key'){ $('#dashKey').hidden=false; $('#dashBody').innerHTML='<p class="err">팀 비밀번호가 맞지 않습니다.</p>'; return; } throw new Error(j.error); } items=j.items||[]; }
  catch(e){ $('#dashBody').innerHTML='<p class="err">불러오지 못했습니다. 잠시 뒤 ↻ 를 눌러 주세요.</p>'; return; }
  try{ const m=await callApi({action:'members'}); if(m.ok) names=(m.members||[]).map(x=>String(x.name||'').trim()).filter(Boolean); }catch(_){}
  const today=opsToday(), by={};
  const add = (who, o) => { who=String(who||'').trim()||'(담당 없음)'; (by[who] ||= []).push(o); };
  items.forEach(r=>{
    const ct=r.callType||'단체예약';
    if(GROUP_TYPES.includes(ct)){
      if(r.date && (new Date(today) - new Date(r.date))/864e5 > 30) return;
      const consult = ct==='예약상담' || ct==='상담';
      histTasks(r).filter(t=>!t.done && !t.removed && (!consult || ['tour','ctbd','clergy'].includes(t.id) || t.custom))
        .forEach(t=>add(r.owner||r.takenBy, {kind:'단체', title:t.title, due:dueOf(t,r), who:r.org||r.contact||'(업체 미정)', href:'group.html?open='+encodeURIComponent(r.id)}));
    } else if(ct==='개인고객'){
      histTasks(r).filter(t=>!t.done).forEach(t=>add(r.owner||r.takenBy, {kind:'개인', title:t.title, due:dueOf(t,r), who:r.contact||'(이름 없음)', href:'personal.html?open='+encodeURIComponent(r.id)}));
    } else if(ct===OPS_TYPES.task){
      const j=opsParse(r); if(!j) return; const d=j.d||{};
      opsPending(d, today).forEach(day=>add(d.owner||r.takenBy, {kind:'기타', title:d.title, due:day, who:opsRepeatLabel(d), href:'ops.html?p=task'}));
    }
  });
  dashData={by, names, today}; renderDash();
}
let dashData=null;
function renderDash(){ if(!dashData) return; const {by, names, today}=dashData;
  const me=(getUser()||{}).name||'';
  const all=[...new Set([...names, ...Object.keys(by)])].sort((a,b)=>(b===me)-(a===me) || (by[b]||[]).length-(by[a]||[]).length || a.localeCompare(b));
  const late=o=>o.due<today, tot=Object.values(by).flat();
  $('#dashSum').textContent = `남은 과업 ${tot.length}개 · 기한 지남 ${tot.filter(late).length}개 · 오늘 ${tot.filter(o=>o.due===today).length}개`;
  const chip=(l,n,cls='')=>n?`<span class="dchip ${cls}">${l} ${n}</span>`:'';
  $('#dashBody').innerHTML = `<div class="dgrid">${all.map(n=>{ const L=(by[n]||[]).slice().sort((a,b)=>a.due.localeCompare(b.due)), cnt=k=>L.filter(o=>o.kind===k).length, lt=L.filter(late).length;
    return `<div class="dcard${n===me?' me':''}${L.length?'':' empty'}"><button type="button" class="dcard-h" data-dash="${esc(n)}" ${L.length?'':'disabled'}><b>${esc(n)}${n===me?' <small>(나)</small>':''}</b>`
      + `<span class="dchips">${L.length?chip('단체',cnt('단체'))+chip('개인',cnt('개인'))+chip('기타',cnt('기타'))+chip('지남',lt,'late'):'<span class="hint">할일 없음</span>'}</span></button>`
      + (dashOpen.has(n) && L.length ? `<ul class="dlist">${L.map(o=>`<li class="${late(o)?'late':o.due===today?'today':''}"><a href="${o.href}"><span class="dk k-${o.kind}">${o.kind}</span> <b>${esc(o.title)}</b> <small>${esc(o.who)}</small><em>${late(o)?'지남 ':''}${esc(opsDateLabel(o.due))}</em></a></li>`).join('')}</ul>` : '')
      + `</div>`; }).join('')}</div>`;
}
document.addEventListener('click', e=>{ const b=e.target.closest('[data-dash]'); if(!b) return; const n=b.dataset.dash; dashOpen.has(n) ? dashOpen.delete(n) : dashOpen.add(n); loadDashCached(); });
let dashTimer=null, dashLast=0;
function loadDashCached(){ renderDash(); }
$('#dashReload').onclick = () => loadDash();
$('#dashKeyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#dashKeyIn').value.trim(); if(!v) return; setLS(KEY_LS, v); $('#dashKeyIn').value=''; loadDash(); });
setInterval(()=>{ if(getUser() && !$('#menuView').hidden && document.visibilityState==='visible') loadDash(); }, 3*60e3);   // 3분마다 새로
