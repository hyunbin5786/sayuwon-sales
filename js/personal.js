// ===== 개인고객 전화응대 (personal.html) =====
// 통화 기록(구분 · 보고전달자 · 예약 여부) · 추후 과업 · 통화 기록 전체 · 삭제된 통화 · 마감 알림 · 보고 글자 복사

const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(_){ return d; } };
const writeJSON=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} };
const DOW='일월화수목금토';
const dLabel = d => { const t=new Date(String(d).slice(0,10)+'T00:00'); return isNaN(t)?'':`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
const dtLabel = s => { const t=new Date(s); return isNaN(t)?'':`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]}) ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let toastT; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 2600); }
const user = readJSON('sy_user', {}) || {};
$('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';

// ===================== 공유 기록 (단체 화면과 같은 Apps Script · 같은 팀 비밀번호) =====================
const SHARED_URL = "https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec";
const KEY_LS='sayuwon_intake_key', PEND_LS='sayuwon_personal_pending', CACHE_LS='sayuwon_personal_cache';
const CALL_TYPE='개인고객';
const getKey=()=>{ try{ return localStorage.getItem(KEY_LS)||''; }catch(_){ return ''; } };
let pending = readJSON(PEND_LS, []), items = readJSON(CACHE_LS, []), flushing=false, retryT=null;
async function callApi(body){
  const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})});   // Content-Type 없이 (Apps Script 사전 확인 요청 없이)
  const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j;
}
function paintSync(state){
  const c=$('#syncChip'), n=pending.length;
  const txt = state==='error' ? `연결 끊김 · ${n}건 대기 · 다시 시도 중` : n ? `올리는 중 ${n}건` : '';
  c.textContent=txt; c.hidden=!txt;
  $('#keyModal').hidden = state!=='needkey'; if(state==='needkey') setTimeout(()=>$('#keyInput').focus(),0);
}
function handleErr(e){ if(e.code==='bad_key'){ if(getKey()) $('#keyMsg').textContent='비밀번호가 맞지 않습니다.'; paintSync('needkey'); } else { paintSync('error'); clearTimeout(retryT); retryT=setTimeout(flush, 15000); } }
async function flush(){
  if(flushing) return; if(!getKey()){ paintSync('needkey'); return; }
  flushing=true;
  try{
    while(pending.length){ await callApi(pending[0]); pending.shift(); writeJSON(PEND_LS,pending); paintSync(); }
    await pull(true);
  }catch(e){ handleErr(e); } finally{ flushing=false; }
}
async function pull(inFlush){
  if(!getKey()){ paintSync('needkey'); return; }
  if(flushing && !inFlush) return;
  try{
    const j=await callApi({action:'list'});
    items=(j.items||[]).filter(r=>r.callType===CALL_TYPE); writeJSON(CACHE_LS, items.slice(-500));
    { const pc=(j.items||[]).find(r=>r.id==='pcats'); if(pc && !pending.some(p=>p.action==='put' && p.item.id==='pcats')){ pcatRec=pc; writeJSON(PCATS_LS, pc); } paintChips(); if(!memberNames.length) loadMembers(); }   // 모두가 추가한 구분 · 멤버 이름
    groupMine=(j.items||[]).filter(r=>r.callType!==CALL_TYPE && ['단체예약','예약상담','예약접수','상담','가예약','공식예약'].includes(r.callType||'단체예약') && (r.owner||r.takenBy)===(user.name||''));   // 마감 알림용: 내가 영업 담당인 단체 예약
    setTimeout(checkDue, 300); setTimeout(paintMyCount, 0);
    $('#keyMsg').textContent=''; paintSync(); renderLists(); tryOpen();
    if(j.admin){ writeJSON('sayuwon_intake_admin', j.admin); paintSeats(); }   // 사담 · 마방 현황 (단체 화면과 같이 씀)
  }catch(e){ if(inFlush) throw e; handleErr(e); }
}
function put(item){
  pending = pending.filter(p=>!(p.action==='put' && p.item.id===item.id)); pending.push({action:'put', item}); writeJSON(PEND_LS,pending);
  const i=items.findIndex(x=>x.id===item.id); if(i>=0) items[i]=item; else items.push(item);
  renderLists(); paintSync(); flush(); paintMyCount();
}
$('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyInput').value.trim(); if(!v) return; try{ localStorage.setItem(KEY_LS, v); }catch(_){} $('#keyInput').value=''; flush(); });

// ===================== 날짜 칸 (단체 화면 방문일과 같은 방식) =====================
// 칸 안에 "2026-12-05 (토)". 누르면 바로 달력, 달력을 연 뒤 한 번 더 누르거나 숫자를 치면 글자로 직접 입력 (2026-12-05 · 12/5 · 1205)
// 원래 <input type="date"> 는 숨긴 달력으로 그대로 두어 값 · 이벤트(input · change)는 예전 그대로
const dateDisp = v => { if(!v) return ''; const t=new Date(v+'T00:00'); return isNaN(t) ? v : `${v} (${DOW[t.getDay()]})`; };
function parseDateText(s){
  s=String(s||'').replace(/\([^)]*\)\s*$/,'').trim(); if(!s) return '';
  let y, m, d, x;
  if((x=s.match(/^(\d{4})\s*[-./년 ]?\s*(\d{1,2})\s*[-./월 ]?\s*(\d{1,2})\s*일?$/))){ y=+x[1]; m=+x[2]; d=+x[3]; }
  else if((x=s.match(/^(\d{1,2})\s*[-./월 ]\s*(\d{1,2})\s*일?$/)) || (x=s.match(/^(\d{2})(\d{2})$/))){
    m=+x[1]; d=+x[2]; const now=new Date(); y=now.getFullYear(); const t=new Date(y,m-1,d); now.setHours(0,0,0,0); if(t<now) y++; }   // 연도 없으면 올해 (이미 지났으면 내년)
  else return null;
  const t=new Date(y,m-1,d); if(t.getFullYear()!==y || t.getMonth()!==m-1 || t.getDate()!==d) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function makeDateBox(pick){
  if(!pick || pick.dataset.dbox) return; pick.dataset.dbox='1';
  const box=document.createElement('span'); box.className='dbox'; pick.parentNode.insertBefore(box, pick);
  const txt=document.createElement('input'); txt.className='dtxt'; txt.readOnly=true; txt.placeholder=pick.dataset.ph||'누르면 달력'; txt.title='누르면 달력 · 한 번 더 누르면 직접 입력 (예: 2026-12-05, 12/5)'; txt.setAttribute('inputmode','numeric');
  box.appendChild(txt); box.appendChild(pick); pick.classList.add('dpick'); pick.tabIndex=-1;
  const paint=()=>{ if(!txt.dataset.editing) txt.value=dateDisp(pick.value); };
  const set=v=>{ pick.value=v; pick.dispatchEvent(new Event('input',{bubbles:true})); pick.dispatchEvent(new Event('change',{bubbles:true})); paint(); };
  const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
  const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value = blank ? '' : pick.value; txt.focus(); if(!blank) txt.select(); };
  txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return;
    if(Date.now()-(+txt.dataset.pickAt||0) < 20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; }   // 두 번째 누름 = 직접 입력
    txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
  txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } });
  txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const d=parseDateText(txt.value);
    delete txt.dataset.editing; txt.readOnly=true;
    if(d===null){ toast('날짜를 알아볼 수 없습니다. 예) 2026-12-05, 12/5'); paint(); return; }
    if(d!==pick.value) set(d); else paint(); });
  pick.addEventListener('input', paint); pick.addEventListener('change', paint);
  pick.__paintBox = paint; paint();
}
const enhanceDates = root => (root||document).querySelectorAll('input[type=date]:not([data-dbox])').forEach(makeDateBox);
const syncDates = () => document.querySelectorAll('input[type=date][data-dbox]').forEach(p=>p.__paintBox && p.__paintBox());   // 코드로 값을 바꾼 뒤 칸 글자 맞춤
// ===================== 통화 기록 =====================
// 시트 칸: 고객 이름 → 고객 담당자, 연락처, 방문 희망일 / 예약일 → 방문일, 인원 → 관람, 문의 내용 → 통화 메모, 추후 과업 → 수정 기록 칸 JSON {h:[], tasks:[…]} (단체 화면과 같은 방식)
let cur=null, startedAt=null;   // cur: 지금 열어 둔 기록 (새 통화면 null)
function blankForm(){ return {cat:'', reportTo:'', reserved:'', name:'', phone:'', date:'', people:'', note:'', tasks:[]}; }
let form=blankForm(), saved=JSON.stringify(form);
const todayYmd = () => ymd(new Date());
const tasksOfItem = r => { try{ const h=JSON.parse(r.history||'{}'); return Array.isArray(h.tasks) ? h.tasks : []; }catch(_){ return []; } };
const FIELDS=[['fName','name'],['fPhone','phone'],['fDate','date'],['fPeople','people'],['fNote','note']];
function paintForm(force){
  FIELDS.forEach(([id,k])=>{ const el=$('#'+id); if((force || document.activeElement!==el) && el.value!==form[k]) el.value=form[k]; });
  paintTasks(); paintChips();
  $('#editing').hidden = !cur; if(cur) $('#editing').textContent = `${dtLabel(cur.saved)} ${cur.takenBy||''}님이 받은 통화를 고치는 중 · 저장하면 그대로 덮어씁니다`;
  $('#startedAt').textContent = startedAt ? `통화 시작 ${dtLabel(startedAt.toISOString())}` : '';
  $('#state').textContent = isDirty() ? '저장하지 않은 내용이 있습니다' : (cur ? '저장됨' : '');
  paintPrices(); syncDates();   // 날짜 칸 글자 (요일)
}
// 이 통화의 추후 과업: 안 끝난 것(마감일 순) → 끝난 것
const isDirty = () => JSON.stringify(form)!==saved;
const fmtPhone = v => { const d=String(v||'').replace(/\D/g,''); if(/^01\d{8,9}$/.test(d)) return d.length===10?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:`${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`; if(/^0\d{8,10}$/.test(d)) return d.replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/,'$1-$2-$3'); return v; };
FIELDS.forEach(([id,k])=>{ $('#'+id).addEventListener('input', e=>{ let v=e.target.value; if(k==='people'){ v=v.replace(/[^\d+]/g,''); e.target.value=v; } if(k==='phone') v=phoneTyping(e); form[k]=v; touch(); }); });
// 연락처를 치는 동안 010-0000-0000 모양으로: 010- 다음 숫자 4개를 치면 바로 - (지울 때는 - 를 다시 붙이지 않음, 글자 중간을 고칠 때는 그대로)
function phoneTyping(e){ const el=e.target, v=el.value; if(el.selectionStart!==v.length) return v;
  const del=/^delete/.test(e.inputType||''), d=v.replace(/\D/g,'').slice(0,11); let out=d.slice(0,3);
  if(d.length>3 || (d.length===3 && !del)) out+='-'+d.slice(3,7);
  if(d.length>7 || (d.length===7 && !del)) out+='-'+d.slice(7);
  el.value=out; return out; }
// 연락처: 빈 칸을 누르면 010- 부터 (커서는 끝), 아무것도 안 치고 나가면 다시 비움 (단체 화면과 같음)
$('#fPhone').addEventListener('focus', e=>{ const el=e.target; if(!el.value){ el.value='010-'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} },0); } });
$('#fPhone').addEventListener('blur', e=>{ if(/^010-?$/.test(e.target.value)){ e.target.value=''; if(form.phone){ form.phone=''; touch(); } return; } const v=fmtPhone(e.target.value); if(v!==form.phone){ form.phone=v; e.target.value=v; touch(); } });
function touch(){ if(!startedAt && !cur) startedAt=new Date(); paintForm(); }
// 과업 추가 · 체크 · 마감일 · 빼기
// ===================== 추후 과업 (단체 화면과 같은 모양 · 동작) =====================
// 순서: 마감일이 빠른 순, 같으면 최근에 추가한 것이 위. 직접 옮긴 과업(ordSet)은 그 순서 그대로, 끝난 과업은 맨 아래 한 줄로(자세히 ▾)
// 세부 과제가 있으면 모두 체크될 때 완료. 이미 저장한 통화면 체크 · 순서 · 마감일 · 세부 과제 · 메모(칸을 벗어날 때)는 바로 저장
let openDone = new Set();   // 펼쳐 본 끝난 과업
function sortedTasks(){
  const byNew=(a,b)=>String(a.due||'').localeCompare(String(b.due||'')) || String(b.at||'').localeCompare(String(a.at||''));
  const open=form.tasks.filter(t=>!t.done), done=form.tasks.filter(t=>t.done).sort(byNew);
  const list=open.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord);
  open.filter(t=>!t.ordSet).sort(byNew).forEach(t=>{ let i=list.findIndex(x=>x.ordSet && String(x.due||'')>=String(t.due||'')); if(i<0) i=list.length; list.splice(i,0,t); });
  return [...list, ...done];
}
function subsHTML(t){
  const rows=(t.xsubs||[]).map(x=>`<div class="tsub-row"><label class="tsub${x.done?' on':''}"><input type="checkbox" data-xsub="${esc(t.id)}|${esc(x.id)}"${x.done?' checked':''}> ${esc(x.title)}</label><button type="button" class="tsub-del" data-xdel="${esc(t.id)}|${esc(x.id)}" title="세부 과제 빼기">×</button></div>`);
  return `<div class="tsubs">${rows.join('')}<div class="tsub-add"><input data-xadd="${esc(t.id)}" lang="ko" data-ime="ko" placeholder="+ 세부 과제 추가 (적고 Enter)" autocomplete="off"><button type="button" class="btn" data-xaddbtn="${esc(t.id)}">추가</button></div></div>`;
}
function paintTasks(){
  const box=$('#taskList'), ae=document.activeElement;
  if(box.contains(ae) && (ae.tagName==='TEXTAREA' || (ae.tagName==='INPUT' && ae.type!=='checkbox' && !ae.readOnly && !ae.classList.contains('dpick')))) return;   // 메모 · 세부 과제를 쓰는 중이면 다시 그리지 않음
  const today=todayYmd();
  box.innerHTML = sortedTasks().map(t=>{ const due=t.due||today, late=!t.done && due<today, fold=t.done && !openDone.has(t.id);
    return `<li class="task${t.done?' done':late?' late':''}${fold?' collapsed':''}" data-id="${esc(t.id)}">`
      + `<div class="task-h">${t.done?'':`<span class="tdrag" title="끌어서 순서 바꾸기">⠿</span>`}<label class="task-c"><input type="checkbox" data-tk="${esc(t.id)}"${t.done?' checked':''}><span>${esc(t.title)}</span></label>`
      + `${t.done?`<button type="button" class="texp" data-texp="${esc(t.id)}">${fold?'자세히 ▾':'접기 ▴'}</button>`:''}`
      + `${t.done?'':`<span class="tmove"><button type="button" data-tmv="${esc(t.id)}|-1" title="위로">▲</button><button type="button" data-tmv="${esc(t.id)}|1" title="아래로">▼</button></span>`}`
      + `<label class="tdue" title="마감일 · 바꿀 수 있음">${late?'기한 지남 ':'마감 '}<input type="date" data-tdue="${esc(t.id)}" value="${esc(due)}"></label>`
      + `<button type="button" class="del" data-tdel="${esc(t.id)}" title="과업 삭제">×</button></div>`
      + subsHTML(t) + `<textarea data-tm="${esc(t.id)}" lang="ko" data-ime="ko" placeholder="메모">${esc(t.memo||'')}</textarea></li>`; }).join('')
    || '<li class="empty">추후 과업이 없습니다. 이 통화 뒤에 할 일이 있으면 위에 적어 주세요.</li>';
  enhanceDates(box);   // 마감일 = 방문일 방식 날짜 칸
  $('#taskHint').textContent = form.tasks.length ? (cur ? '체크 · 순서 · 마감일 · 세부 과제는 바로 저장됩니다. 메모는 칸을 벗어나면 저장됩니다.' : '통화 기록을 저장하면 과업도 함께 저장됩니다.') : '';
}
// 이미 저장한 통화면 과업을 바꾸자마자 저장 (단체 화면과 같음)
function taskSave(){ if(!cur) return; const item=toItem(); put(item); cur=item; saved=JSON.stringify(form); }
const taskOf = id => form.tasks.find(x=>x.id===id);
function taskChanged(save=true){ touch(); paintTasks(); if(save) taskSave(); paintForm(); }
$('#taskAdd').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#taskAddIn').value.trim(); if(!v) return;
  form.tasks.push({id:'t'+Date.now().toString(36), title:v, done:false, memo:'', at:new Date().toISOString(), due:todayYmd(), by:user.name||''});   // 마감은 오늘 (바꿀 수 있음)
  $('#taskAddIn').value=''; taskChanged(); $('#taskAddIn').focus(); });
function addXsub(tid){ const inp=document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`), v=inp?inp.value.trim():'', t=taskOf(tid); if(!v || !t) return;
  (t.xsubs ||= []).push({id:'x'+Date.now().toString(36), title:v, done:false}); if(t.done){ t.done=false; t.doneAt=''; }
  inp.blur(); taskChanged(); document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`)?.focus(); }
$('#taskList').addEventListener('change', e=>{ const d=e.target.dataset;
  if(d.xsub){ const [tid,xid]=d.xsub.split('|'), t=taskOf(tid), x=t&&(t.xsubs||[]).find(s=>s.id===xid); if(!x) return; x.done=e.target.checked;
    const all=(t.xsubs||[]).every(s=>s.done); if(all && !t.done){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=user.name||''; } if(!all && t.done){ t.done=false; t.doneAt=''; } taskChanged(); return; }   // 세부 과제가 모두 끝나면 완료
  if(d.tdue){ const t=taskOf(d.tdue); if(t && e.target.value){ t.due=e.target.value; t.dueSet=1; taskChanged(); } return; }
  if(d.tk){ const t=taskOf(d.tk); if(!t) return; t.done=e.target.checked; t.doneAt=t.done?new Date().toISOString():''; t.doneBy=t.done?(user.name||''):''; (t.xsubs||[]).forEach(x=>x.done=t.done); taskChanged(); }
});
$('#taskList').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.texp){ openDone.has(d.texp) ? openDone.delete(d.texp) : openDone.add(d.texp); paintTasks(); return; }
  if(d.tdel){ const t=taskOf(d.tdel); if(t && confirm(`'${t.title}' 과업을 삭제할까요?`)){ form.tasks=form.tasks.filter(x=>x.id!==d.tdel); taskChanged(); } return; }
  if(d.xdel){ const [tid,xid]=d.xdel.split('|'), t=taskOf(tid); if(t){ t.xsubs=(t.xsubs||[]).filter(s=>s.id!==xid); taskChanged(); } return; }
  if(d.xaddbtn){ addXsub(d.xaddbtn); return; }
  if(d.tmv){ const [id,dir]=d.tmv.split('|'), open=sortedTasks().filter(t=>!t.done), i=open.findIndex(t=>t.id===id), j=i+(+dir);   // ▲▼: 안 끝난 과업끼리
    if(i<0 || j<0 || j>=open.length) return; [open[i],open[j]]=[open[j],open[i]]; open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; }); taskChanged(); }
});
$('#taskList').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing && e.target.dataset.xadd!==undefined){ e.preventDefault(); addXsub(e.target.dataset.xadd); } });   // 세부 과제: 적고 Enter
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tm; if(!id) return; const t=taskOf(id); if(t){ t.memo=e.target.value; touch(); } });
$('#taskList').addEventListener('focusout', e=>{ if(e.target.dataset.tm!==undefined) setTimeout(()=>{ taskSave(); paintForm(); },0); });   // 메모는 칸을 벗어나면 저장
// 끌어서 순서 바꾸기 (⠿ 를 잡고)
let dragId=null;
$('#taskList').addEventListener('mousedown', e=>{ const h=e.target.closest('.tdrag'); if(h) h.closest('li.task').draggable=true; });
$('#taskList').addEventListener('dragstart', e=>{ const li=e.target.closest('li.task'); if(!li || !li.draggable) return; dragId=li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', dragId); }catch(_){} });
$('#taskList').addEventListener('dragover', e=>{ if(!dragId) return; const li=e.target.closest('li.task'); if(!li || li.classList.contains('done')) return; e.preventDefault();
  document.querySelectorAll('#taskList li.task').forEach(x=>x.classList.remove('drop-before','drop-after'));
  if(li.dataset.id!==dragId){ const r=li.getBoundingClientRect(); li.classList.add(e.clientY < r.top+r.height/2 ? 'drop-before' : 'drop-after'); } });
$('#taskList').addEventListener('drop', e=>{ if(!dragId) return; e.preventDefault(); const li=e.target.closest('li.task'); if(!li || li.dataset.id===dragId) return;
  const before=li.classList.contains('drop-before'), open=sortedTasks().filter(t=>!t.done), from=open.findIndex(t=>t.id===dragId); if(from<0) return;
  const [moved]=open.splice(from,1); let to=open.findIndex(t=>t.id===li.dataset.id); if(to<0) return; if(!before) to++;
  open.splice(to,0,moved); open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; }); dragId=null; taskChanged(); });
$('#taskList').addEventListener('dragend', ()=>{ dragId=null; document.querySelectorAll('#taskList li.task').forEach(x=>{ x.draggable=false; x.classList.remove('dragging','drop-before','drop-after'); }); });
document.addEventListener('mouseup', ()=>{ if(!dragId) document.querySelectorAll('#taskList li.task[draggable="true"]').forEach(x=>x.draggable=false); });
document.addEventListener('dragover', e=>{ if(!dragId) return; const EDGE=70, H=window.innerHeight, sp=e.clientY<EDGE ? -Math.ceil((EDGE-e.clientY)/3) : e.clientY>H-EDGE ? Math.ceil((e.clientY-(H-EDGE))/3) : 0; if(sp) window.scrollBy(0, sp); });   // 화면 끝에서 저절로 스크롤
function toItem(f=form, base=cur){
  const id = base ? base.id : (Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const open = f.tasks.filter(t=>!t.done).length, first = String(f.note||'').split(/\n/)[0].slice(0,60);
  let h={}; try{ h=JSON.parse((base&&base.history)||'{}')||{}; }catch(_){}
  return { ...(base||{}), id, saved: base ? base.saved : new Date().toISOString(), callStart: base ? base.callStart : (startedAt||new Date()).toISOString(),
    takenBy: base ? (base.takenBy || user.name || '') : (user.name || ''), owner: user.name || '', callType: CALL_TYPE,
    summary: [first, open ? `추후 과업 ${open}건` : ''].filter(Boolean).join(' · '), date: f.date, people: f.people,
    contact: f.name, phone: f.phone, note: f.note, memo: [f.cat&&`구분 ${f.cat}`, f.reportTo&&`보고전달자 ${f.reportTo}`, f.reserved&&`예약 여부 ${f.reserved}`].filter(Boolean).join(' / '),   // 시트 비고 칸에도 보이게
    history: JSON.stringify({...h, h:h.h||[], tasks:f.tasks, cat:f.cat||'', reportTo:f.reportTo||'', reserved:f.reserved||''}) };
}
function fromItem(r){ let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} return { cat:h.cat||'', reportTo:h.reportTo||'', reserved:h.reserved||'', name:r.contact||'', phone:r.phone||'', date:String(r.date||'').slice(0,10), people:r.people||'', note:r.note||'', tasks:tasksOfItem(r).map(t=>({...t})) }; }
// ===================== 구분 · 예약 여부 (하나 고르기, 다시 누르면 해제) =====================
// 구분: 처음엔 기본(예약취소 · 결제링크 · 기타문의). ＋로 추가 · 칩의 ×로 삭제(기본도 삭제 가능) → 공유 기록 한 줄(id pcats, 통화 구분 '개인구분')에 전체 목록으로 저장 → 모든 사람 화면에 같게
//  (예전 저장 모양 {cats:[추가한 것]} 은 기본 + 추가로 읽음, 새 모양은 {cats:[전체], full:true})
const PCATS_ID='pcats', PCATS_TYPE='개인구분', PCAT_DEF=['예약취소','결제링크','기타문의'], RES_OPTS=['예약함','예약 안 함'], PCATS_LS='sayuwon_pcats';
let pcatRec = readJSON(PCATS_LS, null);
const pcatList = r => { let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} const l=Array.isArray(j.cats) ? j.cats : []; return j.full ? [...new Set(l)] : [...new Set([...PCAT_DEF, ...l])]; };
function pcats(){ const p=pending.filter(x=>x.action==='put' && x.item.id===PCATS_ID).pop(); return pcatList(p ? p.item : pcatRec); }
function savePcats(list, what){
  const now=new Date().toISOString();
  const item={...(pcatRec||{}), id:PCATS_ID, callType:PCATS_TYPE, saved:now, takenBy:user.name||'', summary:`개인고객 구분 ${list.join(', ')} (${what})`, history:JSON.stringify({cats:list, full:true, at:now, by:user.name||''})};
  pending=pending.filter(p=>!(p.action==='put' && p.item.id===PCATS_ID)); pending.push({action:'put', item}); writeJSON(PEND_LS,pending);
  pcatRec=item; writeJSON(PCATS_LS, item); flush();
}
function paintChips(){
  const list=pcats(), cats=[...list]; if(form.cat && !cats.includes(form.cat)) cats.push(form.cat);   // 삭제된 구분이어도 이 통화에 고른 것은 보이게
  $('#catChips').innerHTML = cats.map(c=>`<button type="button" data-cat="${esc(c)}" class="${form.cat===c?'on':''}${list.includes(c)?'':' gone'}" aria-pressed="${form.cat===c}">${esc(c)}${list.includes(c)?`<span class="x" data-catdel="${esc(c)}" title="'${esc(c)}' 구분 삭제 (모든 사람에게서)">×</span>`:''}</button>`).join('') + `<button type="button" class="add" data-catadd title="구분 추가 (모든 사람에게 보임)">＋</button>`;
  // 보고전달자: 멤버관리에 등록된 사람 중 하나 (나는 빼고, 안 골라도 됨)
  const me=String(user.name||'').replace(/\s/g,''), mem=memberNames.filter(n=>n.replace(/\s/g,'')!==me);
  if(form.reportTo && !mem.includes(form.reportTo)) mem.push(form.reportTo);   // 예전에 적어 둔 이름도 보이게
  $('#rtChips').innerHTML = mem.length ? mem.map(n=>`<button type="button" data-rt="${esc(n)}" class="${form.reportTo===n?'on':''}" aria-pressed="${form.reportTo===n}">${esc(n)}</button>`).join('') : '<span class="hint" style="margin:0">멤버 목록을 불러오는 중…</span>';
  $('#resChips').innerHTML = RES_OPTS.map(c=>`<button type="button" data-res="${esc(c)}" class="${form.reserved===c?'on':''}" aria-pressed="${form.reserved===c}">${esc(c)}</button>`).join('');
}
$('#catChips').addEventListener('click', e=>{
  const x=e.target.closest('[data-catdel]');
  if(x){ e.stopPropagation(); const c=x.dataset.catdel; if(!confirm(`'${c}' 구분을 삭제할까요?\n모든 사람의 구분 목록에서 빠집니다. (이미 저장된 통화의 구분은 그대로 남습니다)`)) return;
    savePcats(pcats().filter(v=>v!==c), `'${c}' 삭제`); paintChips(); toast(`구분 '${c}'을(를) 삭제했습니다.`); return; }
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.catadd!==undefined){ const v=(prompt('추가할 구분 이름 (예: 단체 문의). 추가하면 모든 사람에게 보입니다.')||'').trim().replace(/\s+/g,' ').slice(0,20); if(!v) return;
    if(!pcats().includes(v)){ savePcats([...pcats(), v], `'${v}' 추가`); toast(`구분 '${v}'을(를) 추가했습니다. 모든 사람에게 보입니다.`); } form.cat=v; touch(); return; }
  form.cat = form.cat===b.dataset.cat ? '' : b.dataset.cat; touch(); });
$('#rtChips').addEventListener('click', e=>{ const b=e.target.closest('button[data-rt]'); if(!b) return; form.reportTo = form.reportTo===b.dataset.rt ? '' : b.dataset.rt; touch(); });
// 멤버 이름 (멤버관리 · 공유 시트 members 탭): 이 브라우저에 기억해 두고 열 때마다 새로
const MEMBERS_LS='sayuwon_member_names';
let memberNames = readJSON(MEMBERS_LS, []);
async function loadMembers(){ if(!getKey()) return; try{ const j=await callApi({action:'members'}); memberNames=(j.members||[]).map(m=>String(m.name||'').trim()).filter(Boolean); writeJSON(MEMBERS_LS, memberNames); paintChips(); }catch(_){} }
setTimeout(loadMembers, 500); setInterval(loadMembers, 10*60e3);
$('#resChips').addEventListener('click', e=>{ const b=e.target.closest('button[data-res]'); if(!b) return; form.reserved = form.reserved===b.dataset.res ? '' : b.dataset.res; touch(); });
// ===================== 카카오톡 보고용 글자 복사 =====================
// [구분] 담당자 -> 보고전달자 / 고객 이름 / 연락처 / 방문 희망일/예약일 / 인원 / 문의내용
function reportText(){ const f=form, who=(cur && cur.takenBy) || user.name || '';
  return [`[${f.cat||'구분 없음'}] ${who}${f.reportTo ? ` -> ${f.reportTo}` : ''}`, `고객 이름 : ${f.name||''}`, `연락처 : ${f.phone||''}`,
    `방문 희망일/예약일 : ${f.date ? dLabel(f.date) : ''}`, `인원 : ${f.people ? f.people+(/^\d+$/.test(f.people)?'명':'') : ''}`, `문의내용 : ${f.note||''}`].join('\n'); }
async function copyText(s){ try{ await navigator.clipboard.writeText(s); return true; }catch(_){ const t=document.createElement('textarea'); t.value=s; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(__){} t.remove(); return ok; } }
$('#copyBtn').onclick=async()=>{ const ok=await copyText(reportText()); toast(ok ? '보고 글자를 복사했습니다. 카카오톡에 붙여 넣으세요.' : '복사하지 못했습니다.'); };
function save(){
  if(!form.note.trim() && !form.name.trim() && !form.phone.trim() && !form.tasks.length){ toast('문의 내용이나 고객 정보를 넣어 주세요.'); return; }
  if($('#taskAddIn').value.trim()) $('#taskAdd').requestSubmit();   // 과업 칸에 적어 두고 추가를 안 누른 것도
  const item=toItem(); put(item); cur=item; saved=JSON.stringify(form); startedAt=null; paintForm(); toast('저장했습니다.');
}
$('#callForm').addEventListener('submit', e=>{ e.preventDefault(); save(); });
document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); } });
function newCall(){ if(isDirty() && !confirm('저장하지 않은 내용이 있습니다. 버리고 새 통화를 시작할까요?')) return false; cur=null; form=blankForm(); saved=JSON.stringify(form); startedAt=null; paintForm(true); $('#fName').focus(); return true; }
$('#newBtn').onclick=newCall;
window.addEventListener('beforeunload', e=>{ if(isDirty()){ e.preventDefault(); e.returnValue=''; } });
function openItem(id){ const r=shown().find(x=>x.id===id); if(!r) return; if(cur && cur.id===id) return; if(isDirty() && !confirm('저장하지 않은 내용이 있습니다. 버리고 이 기록을 열까요?')) return; cur=r; form=fromItem(r); saved=JSON.stringify(form); startedAt=null; paintForm(true); window.scrollTo({top:0, behavior:'smooth'}); }

// ===================== 목록: 추후 과업(모든 개인고객 통화) · 최근 통화 =====================
const shown = () => { const m=new Map(items.map(x=>[x.id,x])); pending.forEach(p=>{ if(p.action==='put') m.set(p.item.id,p.item); else m.delete(p.id); }); return [...m.values()]; };
function rowHTML(r){
  const f=fromItem(r), open=f.tasks.filter(t=>!t.done).length;
  return `<li data-id="${esc(r.id)}"><div><b>${esc(f.name||'(이름 없음)')}</b> <span class="meta">${esc(f.phone)}${f.date?` · ${esc(dLabel(f.date))}`:''}${f.people?` · ${esc(f.people)}명`:''}</span></div>`
    + `<div class="r">${esc(dtLabel(r.saved))}<br>${esc(r.takenBy||'')}</div>`
    + `<div class="txt">${open?`<span class="tag cb">추후 과업 ${open}</span>`:''}${esc(f.note.split(/\n/)[0]||'')}</div></li>`;
}
function renderLists(){ if(!$('#cbList')) return;   // 오른쪽 목록은 없앰 (2026-11-14) · 문의 매뉴얼로
  const all=shown().sort((a,b)=>String(b.saved).localeCompare(String(a.saved))), today=todayYmd();
  // 추후 과업: 안 끝난 과업을 마감일 순으로 (지난 것 빨강 · 오늘 노랑), 체크하면 그 통화 기록에 완료로 저장
  const open=[]; all.forEach(r=>tasksOfItem(r).forEach(t=>{ if(!t.done) open.push({r, t}); }));
  open.sort((a,b)=>String(a.t.due).localeCompare(String(b.t.due)));
  $('#cbCount').textContent = open.length ? `${open.length}건` : '';
  $('#cbList').innerHTML = open.map(({r,t})=>{ const late=t.due && t.due<today, td=t.due===today, f=fromItem(r);
    return `<li data-id="${esc(r.id)}"><div><b>${esc(t.title)}</b> <span class="meta">${esc(f.name||'(이름 없음)')}${f.phone?` · ${esc(f.phone)}`:''}</span></div>`
      + `<div class="r"><span class="tag ${late?'late':td?'cb':''}">${late?'기한 지남 ':td?'오늘 ':''}${esc(dLabel(t.due))}</span></div>`
      + `<div class="txt" style="text-align:right"><button type="button" class="btn" data-tfin="${esc(r.id)}|${esc(t.id)}" style="padding:2px 10px;font-size:12px">완료</button></div></li>`; }).join('')
    || '<li class="empty" style="cursor:default">안 끝난 추후 과업이 없습니다.</li>';
  const q=$('#search').value.trim().replace(/\s/g,'').toLowerCase(), qd=q.replace(/\D/g,'');
  const hit = r => !q || [r.contact, r.note, r.summary, r.takenBy, r.history].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd));
  const list=all.filter(hit);
  $('#listCount').textContent = `${all.length}건${q?` · 찾은 ${list.length}건`:''}`;
  $('#recentList').innerHTML = list.slice(0,60).map(rowHTML).join('') || `<li class="empty" style="cursor:default">${q?'찾은 통화가 없습니다.':'아직 저장한 개인고객 통화가 없습니다.'}</li>`;
}
document.addEventListener('click', e=>{
  const d=e.target.closest('[data-tfin]'); if(d){ e.stopPropagation(); const [rid,tid]=d.dataset.tfin.split('|'), r=shown().find(x=>x.id===rid); if(!r) return;
    const f=fromItem(r), t=f.tasks.find(x=>x.id===tid); if(!t) return; t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=user.name||'';
    const item=toItem(f, r); put(item);
    if(cur && cur.id===rid){ const keepDirty=isDirty(); cur=item; const ft=form.tasks.find(x=>x.id===tid); if(ft){ ft.done=true; ft.doneAt=t.doneAt; ft.doneBy=t.doneBy; } if(!keepDirty) saved=JSON.stringify(form); paintForm(); }
    toast('과업을 완료로 표시했습니다.'); return; }
  const li=e.target.closest('.list li[data-id]'); if(li) openItem(li.dataset.id);
});

// ===================== 안내용 가격 · 사담 현황 =====================
// 가격: 견적서 사이트 품목 목록(품목 관리 값 반영). 단체 화면이 받아 둔 것을 먼저 쓰고, 없으면 직접 불러옴
const HOLI = new Set(['2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-05','2027-05-13','2027-06-06','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25']);
const isRed = d => { const t=new Date(d+'T00:00'); return !isNaN(t) && (t.getDay()===0 || t.getDay()===6 || HOLI.has(d)); };
let cat = readJSON('sayuwon_quote_cat', null);
const QUOTE_PAGE = /github\.io$/.test(location.hostname) ? 'https://hyunbin5786.github.io/sayuwon-sales/document/' : 'document/index.html';
const QUOTE_DATA = (/github\.io$/.test(location.hostname) ? 'https://hyunbin5786.github.io/sayuwon-sales/document/' : 'document/') + 'js/document.js';   // 품목 목록이 들어 있는 견적서 코드
const QUOTE_SHARED = "https://script.google.com/macros/s/AKfycbyFMeWFtokUB9FW44ZRrOMssIA_2jJzKC9dhjDR7c4WgdPxsaqzT1aLbLWmpIwvVMmY/exec";
async function loadCat(){
  try{
    const [html, shared] = await Promise.all([fetch(QUOTE_DATA+'?t='+Date.now()).then(r=>r.text()), fetch(QUOTE_SHARED).then(r=>r.json()).catch(()=>null)]);
    const m=html.match(/var CATALOG_RAW = \[([\s\S]*?)\];/); if(!m) throw 0;
    const raw=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]); const d=(shared&&shared.data)||{};
    cat = {...(cat||{}), raw, edits:d.edits||{}, added:d.added||[], at:new Date().toISOString()};
  }catch(_){}
  paintPrices();
}
function catItems(){
  if(!cat || !cat.raw) return [];
  const out=[], seen={};
  cat.raw.forEach(line=>{ const [src,price]=line.split('|'); if(seen[src]) return; seen[src]=1; const e=(cat.edits||{})[src]||{}; if(e.hidden) return;
    out.push({src, name:String(e.name||'').trim(), price: e.price!=null ? Number(e.price) : (price?Number(price):null), kind: e.kind || (/\(관람,/.test(src)?'package':/관람/.test(src)&&!/관람권|관람식사권/.test(src)?'view':'') }); });
  (cat.added||[]).forEach(a=>{ if(!a.hidden) out.push({src:a.src||a.name, name:a.name, price:a.price!=null?Number(a.price):null, kind:a.kind||''}); });
  return out;
}
function paintPrices(){ if(!$('#priceBox')) return;   // 안내용 가격은 없앰 (2026-11-14)
  const day = form.date || ymd(new Date()), we=isRed(day), pre=we?'주말/공휴일':'평일';
  $('#priceDay').textContent = `${dLabel(day)} → ${we?'주말 · 공휴일':'평일'} 가격${form.date?'':' (방문 희망일을 넣으면 그날 기준)'}`;
  const its=catItems().filter(it=>it.price!=null && String(it.src).startsWith(pre) && !/네이버/.test(it.src) && (it.kind==='view' || it.kind==='package'));
  const label = it => { let s=String(it.src).replace(/^(평일|주말\/공휴일)\s*/,''); const p=s.match(/^\(관람,\s*(.+)\)$/); if(p) return '관람 + '+p[1]; const t=s.match(/\((\d\d):00~(\d\d):00\)/); return s.replace(/\(\d\d:00~\d\d:00\)/,'').replace(/^관람\(학생\)/,'관람 (학생)').trim()+(t?` (${+t[1]}~${+t[2]}시)`:''); };
  const per = n => { const k=Number(String(form.people).replace(/\D/g,''))||0; return k>1 ? `<td class="n">${(n*k).toLocaleString('ko-KR')}</td>` : ''; };
  const k=Number(String(form.people).replace(/\D/g,''))||0;
  $('#priceBox').innerHTML = its.length ? `<table class="pt"><thead><tr><th>상품</th><th style="text-align:right">1인</th>${k>1?`<th style="text-align:right">${k}명</th>`:''}</tr></thead><tbody>${its.map(it=>`<tr><td>${esc(label(it))}</td><td class="n">${it.price.toLocaleString('ko-KR')}</td>${per(it.price)}</tr>`).join('')}</tbody></table><p class="hint" style="margin-top:6px">품목 관리 기준 정상가 · 개인 예약 할인은 반영하지 않음</p>` : '<p class="empty">가격을 불러오지 못했습니다.</p>';
  paintSeats();
}
// 사담 · 마방 남은 자리: 관리자 사이트 현황 (단체 화면과 같은 자료, 15분마다 갱신)
function paintSeats(){ if(!$('#seatBox')) return;
  const ad=readJSON('sayuwon_intake_admin', null), day=form.date, d=ad && ad.days && day && ad.days[day];
  const NAMES={L1:'사담 런치 1부', L2:'사담 런치 2부', D:'사담 디너', MB:'마방 사유의 밥상'};
  if(!day){ $('#seatBox').innerHTML=''; return; }
  if(!d){ $('#seatBox').innerHTML=`<p class="hint" style="margin-bottom:8px">${esc(dLabel(day))} 사담 · 마방 현황: ${ad?'자료 없음':'관리자 사이트 현황을 아직 받지 않음'}</p>`; return; }
  $('#seatBox').innerHTML = `<div class="sub-h" style="margin-top:0">${esc(dLabel(day))} 남은 자리 (관리자 사이트 ${ad.updated?esc(dtLabel(ad.updated)):''} 기준)</div><div class="seat" style="margin-bottom:10px">`
    + Object.entries(NAMES).map(([s,n])=>{ const x=d[s]; if(!x) return ''; const left = x.max!=null && x.cur!=null ? x.max-x.cur : null; return `<span class="${x.close||left===0?'full':''}">${n} ${x.close?'마감':left!=null?`${left}자리`:'-'}</span>`; }).join('') + `</div>`;
}

// 문의 매뉴얼 (노션): 헤더 링크로 새 창에 엶
const MANUAL_URL = 'https://happyyy-monkeyyy.notion.site/3d645f859824807090f1df4f0815a7bd?source=copy_link';   // 새 창으로 열기
$('#manualOpen').href = MANUAL_URL;   // 문의 매뉴얼은 헤더의 링크로만 (새 창)
// ===================== 통화 기록 전체 (모든 직원이 받은 개인고객 통화) =====================
// 삭제된 통화 (Apps Script 'deleted', 보기 전용): 같은 창에서 「삭제된 통화」 ↔ 「← 통화 기록 전체」
const ALL_HEAD = '<tr><th>저장</th><th>고객</th><th>연락처</th><th>방문 희망일 / 예약일</th><th>인원</th><th>문의 내용</th><th>남은 과업</th><th></th><th class="owner">받은 사람</th></tr>';
const TRASH_HEAD = '<tr><th>삭제 일시</th><th>삭제한 사람</th><th>사유</th><th>고객</th><th>연락처</th><th>방문 희망일 / 예약일</th><th>문의 내용</th><th class="owner">받은 사람</th></tr>';
let allTrash=false, trashItems=null, trashErr='';
function renderTrash(q, qd){
  if(trashItems==null){ $('#allCount').textContent=''; $('#allBody').innerHTML=`<tr><td colspan="8" class="empty">${trashErr?esc(trashErr):'불러오는 중…'}</td></tr>`; return; }
  const info = r => { let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const e=[...(Array.isArray(h.h)?h.h:[])].reverse().find(x=>/^\[삭제\]/.test(x.what||'')); return { by:e?e.by:'', why:e?String(e.what).replace(/^\[삭제\]\s*/,''):'(사유 기록 없음)' }; };
  const all=trashItems.filter(r=>r.callType===CALL_TYPE).map(r=>({r, ...info(r)})).sort((a,b)=>String(b.r.deleted).localeCompare(String(a.r.deleted)));
  const list=all.filter(o=>!q || [o.r.contact, o.r.note, o.r.takenBy, o.why, o.by].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && String(o.r.phone||'').replace(/\D/g,'').includes(qd)));
  $('#allCount').textContent = `${all.length}건${q?` · 찾은 ${list.length}건`:''}`;
  $('#allBody').innerHTML = list.map(o=>{ const d=String(o.r.date||'').slice(0,10);
    return `<tr class="trash"><td>${esc(dtLabel(o.r.deleted))}</td><td>${esc(o.by)}</td><td class="note">${esc(o.why)}</td><td><b>${esc(o.r.contact||'(이름 없음)')}</b></td><td>${esc(o.r.phone||'')}</td><td>${d?esc(dLabel(d)):''}</td><td class="note">${esc(String(o.r.note||'').split(/\n/)[0].slice(0,80))}</td><td class="owner">${esc(o.r.takenBy||o.r.owner||'')}</td></tr>`; }).join('')
    || `<tr><td colspan="8" class="empty">${q?'찾은 통화가 없습니다.':'삭제된 개인고객 통화가 없습니다.'}</td></tr>`;
}
async function setAllTrash(on){
  allTrash=on; $('#allName').textContent = on ? '삭제된 개인고객 통화' : '개인고객 통화 기록 전체'; $('#allTrash').textContent = on ? '← 통화 기록 전체' : '삭제된 통화';
  $('#allHead').innerHTML = on ? TRASH_HEAD : ALL_HEAD; $('#allSearch').value=''; renderAll();
  if(on){ trashItems=null; trashErr=''; renderAll();
    try{ const j=await callApi({action:'deleted'}); trashItems=j.items||[]; }
    catch(e){ trashErr = e.code==='bad_action' ? 'Apps Script를 새 버전으로 배포해야 삭제된 통화가 보입니다 (apps-script/group-intake.gs 의 deleted).' : '불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.'; }
    if(allTrash) renderAll(); }
}
$('#allTrash').onclick=()=>setAllTrash(!allTrash);
function renderAll(){
  const q=$('#allSearch').value.trim().replace(/\s/g,'').toLowerCase(), qd=q.replace(/\D/g,'');
  if(allTrash) return renderTrash(q, qd);
  const all=shown().sort((a,b)=>String(b.saved).localeCompare(String(a.saved)));
  const hit = r => !q || [r.contact, r.note, r.takenBy, r.history].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd));
  const list=all.filter(hit);
  $('#allCount').textContent = `${all.length}건${q?` · 찾은 ${list.length}건`:''}`;
  $('#allBody').innerHTML = list.map(r=>{ const left=tasksOfItem(r).filter(t=>!t.done).length, d=String(r.date||'').slice(0,10);
    return `<tr data-id="${esc(r.id)}"><td>${esc(dtLabel(r.saved))}</td><td>${(c=>c?`<span class="tag">${esc(c)}</span>`:'')(fromItem(r).cat)}<b>${esc(r.contact||'(이름 없음)')}</b></td><td>${esc(r.phone||'')}</td><td>${d?esc(dLabel(d)):''}</td><td>${esc(r.people||'')}</td><td class="note">${esc(String(r.note||'').split(/\n/)[0].slice(0,80))}</td><td>${left?`<span class="tag cb">${left}개</span>`:''}</td><td class="acts"><button type="button" class="btn danger pdel" data-pdel="${esc(r.id)}" title="이 통화 기록 삭제 (사유 필수)">삭제</button></td><td class="owner">${esc(r.takenBy||r.owner||'')}</td></tr>`; }).join('')
    || `<tr><td colspan="9" class="empty">${q?'찾은 통화가 없습니다.':'저장된 개인고객 통화가 없습니다.'}</td></tr>`;
}
// 통화 기록 삭제: 사유를 꼭 적어야 함. 사유는 그 기록의 수정 기록에 남긴 뒤 삭제 (시트에서는 줄을 지우지 않고 '삭제' 칸에 일시)
let pdelId=null;
function openPdel(id){ const r=shown().find(x=>x.id===id); if(!r) return; pdelId=id;
  $('#pdelWho').textContent=[r.contact||'(이름 없음)', r.phone, r.saved&&dtLabel(r.saved)].filter(Boolean).join(' · ');
  $('#pdelReason').innerHTML = '<option value="">사유를 고르세요</option>' + PDEL_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#pdelWhy').value=''; $('#pdelModal').hidden=false; setTimeout(()=>$('#pdelReason').focus(),0); }
const PDEL_REASONS = ['같은 통화를 두 번 저장 (중복)','잘못 입력 · 테스트','다른 고객 기록에 잘못 저장','단체 예약으로 옮김 (단체고객 화면에 입력)','고객이 기록 삭제를 요청','기타 (직접 입력)'];   // 단체 화면 삭제처럼 골라서
const closePdel = () => { $('#pdelModal').hidden=true; pdelId=null; };
$('#pdelCancel').onclick=closePdel;
$('#pdelModal').addEventListener('mousedown', e=>{ if(e.target.id==='pdelModal') closePdel(); });
$('#pdelWhy').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); $('#pdelOk').click(); } });
$('#pdelOk').onclick=()=>{
  const reason=$('#pdelReason').value, note=$('#pdelWhy').value.trim();
  if(!reason){ toast('삭제 사유를 골라 주세요.'); $('#pdelReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#pdelWhy').focus(); return; }
  const why = /^기타/.test(reason) ? note : reason + (note ? ` · ${note}` : '');
  const r=shown().find(x=>x.id===pdelId); if(!r){ closePdel(); return; }
  let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const now=new Date().toISOString();
  h.h=[...(Array.isArray(h.h)?h.h:[]), {t:now, by:user.name||'', what:`[삭제] ${why}`}];
  put({...r, history:JSON.stringify(h), saved:now});   // 사유를 먼저 남기고
  pending.push({action:'del', id:r.id}); writeJSON(PEND_LS,pending); items=items.filter(x=>x.id!==r.id);   // 그다음 삭제
  if(cur && cur.id===r.id){ cur=null; form=blankForm(); saved=JSON.stringify(form); paintForm(true); }
  closePdel(); renderLists(); if(!$('#allModal').hidden) renderAll(); flush(); toast(`삭제했습니다 · ${why}`);
};
const openAll = () => { $('#allModal').hidden=false; $('#allSearch').value=''; if(allTrash) setAllTrash(false); renderAll(); $('#allSearch').focus(); flush(); };
$('#allCallsBtn').onclick=openAll;
$('#allClose').onclick=()=>{ $('#allModal').hidden=true; };
$('#allModal').addEventListener('mousedown', e=>{ if(e.target.id==='allModal') $('#allModal').hidden=true; });
$('#allSearch').addEventListener('input', renderAll);
$('#allBody').addEventListener('click', e=>{ const del=e.target.closest('[data-pdel]'); if(del){ openPdel(del.dataset.pdel); return; } const tr=e.target.closest('tr[data-id]'); if(!tr) return; $('#allModal').hidden=true; openItem(tr.dataset.id); });

// ===================== 마감이 된 추후 과업 알림: 오전 8시 · 11시 · 오후 1시 · 5시 =====================
// 그 시각이 지나고 처음 화면을 볼 때 (시각마다 한 번, 단체 화면과 같은 기록이라 두 화면에서 두 번 뜨지 않음). 내 개인고객 과업 + 내가 영업 담당인 단체 과업
const TASK_SLOT_LS='sayuwon_task_slot', ALERT_HOURS=[8,11,13,17], QUIET_MS=30*60e3;
let groupMine=[];
// 마이페이지 버튼 옆 빨간 표시: 마감이 오늘이거나 지난 내 과업 수 (개인 + 내가 영업 담당인 단체, 단체 화면과 같은 모양)
function paintMyCount(){ const today=todayYmd(), me=user.name||''; let n=0;
  shown().filter(r=>(r.owner||r.takenBy)===me).forEach(r=>tasksOfItem(r).forEach(t=>{ if(!t.done && (t.due||today)<=today) n++; }));
  groupMine.forEach(r=>tasksOfItem(r).forEach(t=>{ if(!t.done && t.due && t.due<=today) n++; }));
  const b=$('#myCount'); b.hidden=!n; b.textContent = n ? `과업 ${n}` : ''; }
function checkDue(){
  if(document.querySelector('.modal:not([hidden])')) return;
  const nowD=new Date(), today=todayYmd(), h=nowD.getHours(), slotH=ALERT_HOURS.filter(x=>h>=x).pop(); if(slotH==null) return;
  let slots=''; try{ slots=localStorage.getItem(TASK_SLOT_LS)||''; }catch(_){} const key=`${today}|${slotH}`; if(slots.split(',').includes(key)) return;
  const me=user.name||'', fresh = t => +nowD - (+new Date(t.dueSetAt||t.at||0)||0) < QUIET_MS;
  const due=[];
  shown().filter(r=>(r.owner||r.takenBy)===me).forEach(r=>tasksOfItem(r).forEach(t=>{ const d=t.due||today; if(!t.done && d<=today && !fresh(t)) due.push({r, t:{...t, due:d}, personal:true}); }));
  groupMine.forEach(r=>tasksOfItem(r).forEach(t=>{ const d=t.due||String(r.saved||'').slice(0,10)||today; if(!t.done && d<=today && !fresh(t)) due.push({r, t:{...t, due:d}}); }));
  if(!due.length) return;
  try{ localStorage.setItem(TASK_SLOT_LS, [...slots.split(',').filter(s=>s.startsWith(today)), key].join(',')); }catch(_){}
  due.sort((a,b)=>a.t.due.localeCompare(b.t.due));
  $('#dueList').innerHTML = due.map(({r,t,personal})=>{ const late=t.due<today;
    return `<li class="${late?'late':''}"><span class="who"><span class="tag">${personal?'개인':'단체'}</span> <b>${esc(personal ? (r.contact||'(이름 없음)') : (r.org||r.contact||'(업체 미정)'))}</b>${personal&&r.phone?` · ${esc(r.phone)}`:''}${!personal&&r.date?` · 방문 ${esc(dLabel(r.date))}`:''}<br><b class="t">${esc(t.title)}</b> <small class="hint" style="display:inline">마감 ${esc(dLabel(t.due))} ${late?'(지남)':'(오늘)'}</small></span>`
      + (personal ? `<button class="btn primary" data-ddone="${esc(r.id)}|${esc(t.id)}">완료</button><button class="btn" data-dopen="${esc(r.id)}">열기</button>` : `<button class="btn" data-gopen="${esc(r.id)}">열기</button>`) + `</li>`; }).join('');
  $('#dueTitle').innerHTML = `마감이 된 추후 과업 <small>${due.length}개 · 단체 + 개인 · 알림은 오전 8시 · 11시 · 오후 1시 · 5시</small>`;
  $('#dueModal').hidden=false;
}
$('#dueClose').onclick=()=>{ $('#dueModal').hidden=true; };
$('#dueList').addEventListener('click', e=>{ const d=e.target.dataset;
  if(d.dopen){ $('#dueModal').hidden=true; openItem(d.dopen); return; }
  if(d.gopen){ $('#dueModal').hidden=true; location.href='group.html?open='+encodeURIComponent(d.gopen); return; }
  if(d.ddone){ const [rid,tid]=d.ddone.split('|'), r=shown().find(x=>x.id===rid); if(!r) return; const f=fromItem(r), t=f.tasks.find(x=>x.id===tid); if(!t) return;
    t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=user.name||''; (t.xsubs||[]).forEach(x=>x.done=true); const item=toItem(f, r); put(item);
    if(cur && cur.id===rid){ cur=item; form=fromItem(item); saved=JSON.stringify(form); paintForm(true); }
    e.target.closest('li').remove(); if(!$('#dueList').children.length) $('#dueModal').hidden=true; toast('과업을 완료로 표시했습니다.'); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if(!$('#pdelModal').hidden){ closePdel(); } else if(!$('#allModal').hidden){ $('#allModal').hidden=true; } else if(!$('#dueModal').hidden){ $('#dueModal').hidden=true; } } });
setInterval(checkDue, 60000);   // 1분마다 알림 시각인지 확인
// 마이페이지에서 개인고객 과업을 누르면 personal.html?open=통화ID → 그 통화를 엶 (목록을 받은 뒤)
let openId = new URLSearchParams(location.search).get('open');
function tryOpen(){ if(!openId) return; if(shown().some(x=>x.id===openId)){ const id=openId; openId=null; history.replaceState(null,'',location.pathname); openItem(id); } }
enhanceDates();   // 방문 희망일 / 예약일 · 과업 마감일: 누르면 달력 · 칸 안에 (요일)
paintForm(); renderLists(); paintSync(); tryOpen(); flush();
