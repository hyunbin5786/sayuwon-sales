// ===== 개인고객 전화응대 (personal.html) =====
// 공통 도구(SY: 공유 주소 · 날짜 · 전화 · esc · 저장소)는 js/common.js, 전체 구조는 README 14절
// 통화 기록(구분 · 보고전달자 · 예약 여부) · 추후 과업 · 통화 기록 전체 · 삭제된 통화 · 마감 알림 · 보고 글자 복사

const $ = s => document.querySelector(s);
const esc = SY.esc;   // 공통 도구 (js/common.js)
const readJSON = SY.readJSON;
const writeJSON = SY.writeJSON;
const DOW = SY.DOW;
const dLabel = d => { const t=new Date(String(d).slice(0,10)+'T00:00'); return isNaN(t)?'':`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
const dtLabel = s => { const t=new Date(s); return isNaN(t)?'':`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]}) ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`; };
const ymd = SY.ymd;
let toastT; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 2600); }
const user = readJSON('sy_user', {}) || {};
$('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';

// ===================== 공유 기록 (단체 화면과 같은 Apps Script · 같은 팀 비밀번호) =====================
const SHARED_URL = SY.API_URL;   // 공유 기록 Apps Script (js/common.js)
const KEY_LS=SY.KEY_LS, PEND_LS='sayuwon_personal_pending', CACHE_LS='sayuwon_personal_cache';
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
    const j=await SY.list();   // 같이 쓰는 사본 + 바뀐 것만 (2026-11-21)
    items=(j.items||[]).filter(r=>r.callType===CALL_TYPE); writeJSON(CACHE_LS, items.slice(-500));
    { const pc=(j.items||[]).find(r=>r.id==='pcats'); if(pc && !pending.some(p=>p.action==='put' && p.item.id==='pcats')){ pcatRec=pc; writeJSON(PCATS_LS, pc); } paintChips(); if(!memberNames.length) loadMembers(); }   // 모두가 추가한 구분 · 멤버 이름
    groupMine=(j.items||[]).filter(r=>r.callType!==CALL_TYPE && ['단체예약','예약상담','가예약','예약확정','예약접수','상담','공식예약'].includes(r.callType||'단체예약') && (r.owner||r.takenBy)===(user.name||''));   // 마감 알림용: 내가 영업 담당인 단체 예약
    setTimeout(checkDue, 300); setTimeout(paintMyCount, 0);
    $('#keyMsg').textContent=''; paintSync(); renderLists(); tryOpen();
    if(j.admin){ writeJSON('sayuwon_intake_admin', j.admin); }   // 사담 · 마방 현황 (단체 화면이 씀)
  }catch(e){ if(inFlush) throw e; handleErr(e); }
}
function put(item){
  item._localAt = new Date().toISOString();   // 나의 할일(단체 화면)이 시트보다 이 브라우저의 새 내용을 먼저 보이게
  pending = pending.filter(p=>!(p.action==='put' && p.item.id===item.id)); pending.push({action:'put', item}); writeJSON(PEND_LS,pending);
  const i=items.findIndex(x=>x.id===item.id); if(i>=0) items[i]=item; else items.push(item);
  writeJSON(CACHE_LS, items.slice(-500));
  renderLists(); paintSync(); flush(); paintMyCount();
}
$('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyInput').value.trim(); if(!v) return; try{ localStorage.setItem(KEY_LS, v); }catch(_){} $('#keyInput').value=''; flush(); });

// ===================== 날짜 칸 (단체 화면 방문일과 같은 방식) =====================
// 칸 안에 "2026-12-05 (토)". 누르면 바로 달력, 달력을 연 뒤 한 번 더 누르거나 숫자를 치면 글자로 직접 입력 (2026-12-05 · 12/5 · 1205)
// 원래 <input type="date"> 는 숨긴 달력으로 그대로 두어 값 · 이벤트(input · change)는 예전 그대로
const dateDisp = SY.dateDisp;   // 공통 (js/common.js)
function parseDateText(s){ return SY.parseDateText(s); }   // 공통 (js/common.js)
function makeDateBox(pick){
  if(!pick || pick.dataset.dbox) return; pick.dataset.dbox='1';
  const box=document.createElement('span'); box.className='dbox'; pick.parentNode.insertBefore(box, pick);
  const txt=document.createElement('input'); txt.className='dtxt'; txt.readOnly=true; txt.placeholder=pick.dataset.ph||'누르면 달력'; txt.title='누르면 달력 · 한 번 더 누르면 직접 입력'; txt.setAttribute('inputmode','numeric');
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
let reportShown='';   // 이 통화에서 보고 글자 팝업을 띄운 보고전달자 (저장할 때 보고전달자가 새로 정해졌으면 팝업)
let autoT=null, lastAuto=null; const AUTO_SAVE_MS = 30000;   // 자동 저장 (아래 scheduleAuto)
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
  $('#state').textContent = isDirty() ? '저장하지 않은 내용이 있습니다 (30초 뒤 자동 저장)' : (cur ? (lastAuto ? `자동 저장 ${new Date(lastAuto).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}` : '저장됨') : '');
  paintDirtyDots();   // 저장 안 한 변경: 저장 버튼 · 그 과업의 「저장」에 노란 점 (단체 화면과 같음)
  syncDates();   // 날짜 칸 글자 (요일)
}
// 이 통화의 추후 과업: 안 끝난 것(마감일 순) → 끝난 것
const isDirty = () => JSON.stringify(form)!==saved;
const fmtPhone = SY.fmtPhone;   // 공통 (js/common.js)
FIELDS.forEach(([id,k])=>{ $('#'+id).addEventListener('input', e=>{ let v=e.target.value; if(k==='people'){ v=v.replace(/[^\d+]/g,''); e.target.value=v; } if(k==='phone') v=phoneTyping(e); form[k]=v; touchSoon(); }); });
// 연락처를 치는 동안: 자릿수에 맞춰 - (어떤 번호든) · 자동 010- 뒤에 02 · 031 … 이면 010 뗌 (js/common.js, 단체 화면과 같음)
function phoneTyping(e){ const el=e.target; if(el.selectionStart!==el.value.length) return el.value; const f=SY.phoneTyping(el, e.inputType); el.value=f; return f; }
// 연락처: 빈 칸을 누르면 010- 부터 (커서는 끝), 아무것도 안 치고 나가면 다시 비움 (단체 화면과 같음)
$('#fPhone').addEventListener('focus', e=>{ const el=e.target; if(!el.value){ el.value='010-'; el.dataset.autop='1'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} },0); } });
$('#fPhone').addEventListener('blur', e=>{ delete e.target.dataset.autop; if(/^010-?$/.test(e.target.value)){ e.target.value=''; if(form.phone){ form.phone=''; touch(); } return; } const v=fmtPhone(e.target.value); if(v!==form.phone){ form.phone=v; e.target.value=v; touch(); } });
function touch(){ if(!startedAt && !cur) startedAt=new Date(); clearTimeout(touchT); touchT=0; paintForm(); if(typeof scheduleAuto==='function') scheduleAuto(); }
// 글자를 칠 때(문의 내용 · 이름 · 과업 메모 등): 값은 바로 넣고, 화면 다시 그리기는 멈추고 0.35초 뒤 한 번 (빠르게 · 칸을 나가면 바로, 2026-11-18)
let touchT=0;
function touchSoon(){ if(!startedAt && !cur) startedAt=new Date(); $('#state').textContent='저장하지 않은 내용이 있습니다 (30초 뒤 자동 저장)'; clearTimeout(touchT); touchT=setTimeout(()=>{ touchT=0; touch(); }, 350); }
document.addEventListener('focusout', e=>{ if(touchT && e.target.closest?.('#callForm, #taskList')) setTimeout(()=>{ if(touchT) touch(); }, 0); });
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
  box.innerHTML = sortedTasks().map(t=>{ const due=t.due||today, late=!t.done && due<today, subsDone=(t.xsubs||[]).every(x=>x.done), fold=t.done && subsDone && !openDone.has(t.id);   // 세부 과제가 다 체크돼야 접힘 (2026-11-18)
    return `<li class="task${t.done?' done':late?' late':''}${fold?' collapsed':''}" data-id="${esc(t.id)}">`
      + `<div class="task-h">${t.done?'':`<span class="tdrag" title="끌어서 순서 바꾸기">⠿</span>`}<span class="task-c"><input type="checkbox" data-tk="${esc(t.id)}"${t.done?' checked':''} title="체크하면 완료"><input class="ttl" data-tttl="${esc(t.id)}" value="${esc(t.title)}" data-ime="ko" spellcheck="false" autocomplete="off" title="눌러서 제목 고치기 (Enter로 확정)"></span>`
      + `${t.done && subsDone?`<button type="button" class="texp" data-texp="${esc(t.id)}">${fold?'자세히 ▾':'접기 ▴'}</button>`:''}`
      + `${t.done?'':`<span class="tmove"><button type="button" data-tmv="${esc(t.id)}|-1" title="위로">▲</button><button type="button" data-tmv="${esc(t.id)}|1" title="아래로">▼</button></span>`}`
      + `<label class="tdue" title="마감일 · 바꿀 수 있음">${late?'기한 지남 ':'마감 '}<input type="date" data-tdue="${esc(t.id)}" value="${esc(due)}"></label>`
      + `<button type="button" class="tsave" data-tsave="${esc(t.id)}" title="이 과업의 고친 내용(체크 · 제목 · 마감일 · 메모 · 세부 과제)을 지금 저장">저장</button>`
      + `<button type="button" class="del" data-tdel="${esc(t.id)}" title="이 과업 삭제 (확인 뒤)" aria-label="과업 삭제">×</button></div>`
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
  if(d.tttl){ const t=taskOf(d.tttl); if(!t) return; const v=e.target.value.trim(); if(!v){ e.target.value=t.title; return; } if(v!==t.title){ t.title=v; t.titleSet=1; taskChanged(); } return; }   // 과업 제목 고치기 (제목을 눌러서)
  if(d.xsub){ const [tid,xid]=d.xsub.split('|'), t=taskOf(tid), x=t&&(t.xsubs||[]).find(s=>s.id===xid); if(!x) return; x.done=e.target.checked;
    const all=(t.xsubs||[]).every(s=>s.done); if(all && !t.done){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=user.name||''; } if(!all && t.done && !t.manualDone){ t.done=false; t.doneAt=''; } taskChanged(); return; }   // 세부 과제가 모두 끝나면 완료 (위 체크로 끝낸 과업은 그대로)
  if(d.tdue){ const t=taskOf(d.tdue); if(t && e.target.value){ t.due=e.target.value; t.dueSet=1; taskChanged(); } return; }
  if(d.tk){ const t=taskOf(d.tk); if(!t) return; t.done=e.target.checked; t.doneAt=t.done?new Date().toISOString():''; t.doneBy=t.done?(user.name||''):''; if(t.done) t.manualDone=1; else { delete t.manualDone; if((t.due||'')<todayYmd()){ t.due=todayYmd(); t.dueSetAt=new Date().toISOString(); }   /* 다시 열면 오늘 마감 (2026-11-19) */ (t.xsubs||[]).forEach(x=>x.done=false); } taskChanged(); }   // 위 체크 = 완료 (세부 과제는 그대로, 다 체크될 때까지 접히지 않음)
});
$('#taskList').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.tsave){ document.activeElement?.blur(); setTimeout(()=>{ if(cur){ taskSave(); paintForm(); toast('저장했습니다.'); } else save(); },0); return; }   // 과업마다 「저장」 (새 통화면 통화 전체 저장)
  if(d.texp){ openDone.has(d.texp) ? openDone.delete(d.texp) : openDone.add(d.texp); paintTasks(); return; }
  if(d.tdel){ const t=taskOf(d.tdel), id=d.tdel; if(t) askDelete(`「${t.title}」 과업을 정말로 삭제할 건가요?`, ()=>{ form.tasks=form.tasks.filter(x=>x.id!==id); taskChanged(); toast('과업을 삭제했습니다.'); }); return; }   // 확인 팝업 뒤 삭제
  if(d.xdel){ const [tid,xid]=d.xdel.split('|'), t=taskOf(tid); if(t){ t.xsubs=(t.xsubs||[]).filter(s=>s.id!==xid); taskChanged(); } return; }
  if(d.xaddbtn){ addXsub(d.xaddbtn); return; }
  if(d.tmv){ const [id,dir]=d.tmv.split('|'), open=sortedTasks().filter(t=>!t.done), i=open.findIndex(t=>t.id===id), j=i+(+dir);   // ▲▼: 안 끝난 과업끼리
    if(i<0 || j<0 || j>=open.length) return; [open[i],open[j]]=[open[j],open[i]]; open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; }); taskChanged(); }
});
$('#taskList').addEventListener('keydown', e=>{ if(e.target.dataset.tttl!==undefined){ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); e.target.blur(); } else if(e.key==='Escape'){ const t=(typeof taskOf==='function'?taskOf:(id=>tasks.find(x=>x.id===id)))(e.target.dataset.tttl); if(t) e.target.value=t.title; e.target.blur(); } } });   // 과업 제목: Enter = 확정, Esc = 되돌리기
$('#taskList').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing && e.target.dataset.xadd!==undefined){ e.preventDefault(); addXsub(e.target.dataset.xadd); } });   // 세부 과제: 적고 Enter
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tm; if(!id) return; const t=taskOf(id); if(t){ t.memo=e.target.value; delete t.memoAuto; touchSoon(); } });   // 메모를 직접 고치면 문의 내용을 더 따라가지 않음
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
const CAT_DEFAULT='문의';   // 구분을 고르지 않고 저장하면 이 구분으로
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
  // 구분 칩은 끌어서 순서를 바꿈 (모든 사람 목록 순서, 2026-11-18)
  $('#catChips').innerHTML = cats.map(c=>`<button type="button"${list.includes(c)?' draggable="true"':''} data-cat="${esc(c)}" class="${form.cat===c?'on':''}${list.includes(c)?'':' gone'}" aria-pressed="${form.cat===c}" title="누르면 고르기 · 끌어서 순서 바꾸기">${esc(c)}${list.includes(c)?`<span class="x" data-catdel="${esc(c)}" title="'${esc(c)}' 구분 삭제 (모든 사람에게서)">×</span>`:''}</button>`).join('') + `<button type="button" class="add" data-catadd title="구분 추가 (모든 사람에게 보임)">＋</button>`;
  // 보고전달자 칸은 없앰 (2026-11-18). 예전 통화에 적힌 보고전달자는 기록에만 남음
}
$('#catChips').addEventListener('click', e=>{
  const x=e.target.closest('[data-catdel]');
  if(x){ e.stopPropagation(); const c=x.dataset.catdel; if(!confirm(`'${c}' 구분을 삭제할까요?\n모든 사람의 구분 목록에서 빠집니다. (이미 저장된 통화의 구분은 그대로 남습니다)`)) return;
    savePcats(pcats().filter(v=>v!==c), `'${c}' 삭제`); paintChips(); toast(`구분 '${c}'을(를) 삭제했습니다.`); return; }
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.catadd!==undefined){ const v=(prompt('추가할 구분 이름. 추가하면 모든 사람에게 보입니다.')||'').trim().replace(/\s+/g,' ').slice(0,20); if(!v) return;
    if(!pcats().includes(v)){ savePcats([...pcats(), v], `'${v}' 추가`); toast(`구분 '${v}'을(를) 추가했습니다. 모든 사람에게 보입니다.`); } form.cat=v; touch(); return; }
  form.cat = form.cat===b.dataset.cat ? '' : b.dataset.cat; touch(); });
// 구분 순서 바꾸기: 칩을 끌어다 다른 칩 위에 놓으면 그 자리로 (모든 사람 목록 순서로 저장)
let catDrag=null;
$('#catChips').addEventListener('dragstart', e=>{ const b=e.target.closest('button[data-cat][draggable]'); if(!b) return; catDrag=b.dataset.cat; b.classList.add('dragging'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', catDrag); }catch(_){} });
$('#catChips').addEventListener('dragover', e=>{ if(!catDrag) return; const b=e.target.closest('button[data-cat][draggable]'); if(!b || b.dataset.cat===catDrag) return; e.preventDefault(); document.querySelectorAll('#catChips .drop-to').forEach(x=>x.classList.remove('drop-to')); b.classList.add('drop-to'); });
$('#catChips').addEventListener('drop', e=>{ if(!catDrag) return; const b=e.target.closest('button[data-cat][draggable]'); e.preventDefault(); if(!b || b.dataset.cat===catDrag){ catDrag=null; paintChips(); return; }
  const list=pcats().filter(c=>c!==catDrag), at=list.indexOf(b.dataset.cat), from=pcats().indexOf(catDrag), to=pcats().indexOf(b.dataset.cat);
  list.splice(from<to ? at+1 : at, 0, catDrag); const moved=catDrag; catDrag=null; savePcats(list, `순서 바꿈 ('${moved}')`); paintChips(); toast(`구분 순서를 바꿨습니다. 모든 사람에게 같은 순서로 보입니다.`); });
$('#catChips').addEventListener('dragend', ()=>{ catDrag=null; document.querySelectorAll('#catChips .dragging, #catChips .drop-to').forEach(x=>x.classList.remove('dragging','drop-to')); });
// 멤버 이름 (멤버관리 · 공유 시트 members 탭): 이 브라우저에 기억해 두고 열 때마다 새로
const MEMBERS_LS='sayuwon_member_names';
let memberNames = readJSON(MEMBERS_LS, []);
async function loadMembers(){ if(!getKey()) return; try{ const j=await callApi({action:'members'}); memberNames=(j.members||[]).map(m=>String(m.name||'').trim()).filter(Boolean); writeJSON(MEMBERS_LS, memberNames); paintChips(); }catch(_){} }
setTimeout(loadMembers, 500); setInterval(loadMembers, 2*60e3); window.addEventListener('focus', loadMembers);   // 새 멤버는 2분마다 · 이 창으로 돌아올 때 다시 받아 자동으로 추가
// 예약 여부 칸은 없앰 (2026-11-18 · 안 씀). 예전 통화에 적힌 값은 기록에만 남음
// ===================== 카카오톡 보고용 글자 복사 =====================
// [구분] / 고객 이름 / 연락처 / 일시 / 인원 / 문의내용 (비어 있는 줄은 뺌)
function reportText(){ const f=form, who=(cur && cur.takenBy) || user.name || '';
  // 비어 있는 항목은 줄째 빼고 (첫 줄은 늘)
  const phone = /^010-?$/.test(String(f.phone||'').trim()) ? '' : f.phone;
  return [`[${f.cat||CAT_DEFAULT}]`,   // 첫 줄은 [구분]만 (받은 사람 이름 · 보고전달자는 넣지 않음, 2026-11-18)
    f.name && `고객 이름 : ${f.name}`, phone && `연락처 : ${phone}`, f.date && `일시 : ${dLabel(f.date)}`,
    f.people && `인원 : ${f.people}${/^\d+$/.test(f.people)?'명':''}`, String(f.note||'').trim() && `문의내용 : ${f.note}`].filter(Boolean).join('\n'); }
async function copyText(s){ try{ await navigator.clipboard.writeText(s); return true; }catch(_){ const t=document.createElement('textarea'); t.value=s; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(__){} t.remove(); return ok; } }
// 보고 글자 복사 → 미리보기 팝업 (글자를 고칠 수 있음) → 「복사하기」로 복사. 고친 글자는 이 팝업에서만 (통화 기록은 그대로)
const closeCopy = () => { $('#copyModal').hidden=true; };
$('#copyBtn').onclick=()=>{ $('#copyOut').value=reportText(); $('#copyModal').hidden=false; setTimeout(()=>{ const t=$('#copyOut'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); },0); };
$('#copyDo').onclick=async()=>{ const ok=await copyText($('#copyOut').value); toast(ok ? '보고 글자를 복사했습니다. 카카오톡에 붙여 넣으세요.' : '복사하지 못했습니다.'); if(ok) closeCopy(); };
$('#copyClose').onclick=closeCopy;
$('#copyModal').addEventListener('click', e=>{ if(e.target.id==='copyModal') closeCopy(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#copyModal').hidden){ e.preventDefault(); closeCopy(); } });
const hasContent = () => !!(form.note.trim() || form.name.trim() || form.phone.trim() || form.tasks.length);
function save(auto){
  clearTimeout(autoT);
  if(!hasContent()){ if(!auto) toast('문의 내용이나 고객 정보를 넣어 주세요.'); return; }
  if(!auto && $('#taskAddIn').value.trim()) $('#taskAdd').requestSubmit();   // 과업 칸에 적어 두고 추가를 안 누른 것도
  // 개인고객 문의는 처리가 필요한 것만 남기므로, 처음 저장할 때 추후 과업 하나(마감 오늘, 처리되면 체크). 지우면 다시 저장해도 다시 생기지 않음
  // 과업 이름 = 문의 내용 그대로 (2026-11-18 · 예전: 「문의 처리 현황 점검」 + 메모에 문의 내용). 과업 이름을 직접 고치기 전까지는 문의 내용을 고치면 같이 바뀜
  const inqTitle = () => form.note.trim().replace(/\s*\n+\s*/g,' / ') || '문의 처리 현황 점검';
  if(!cur && !form.tasks.some(t=>t.id==='inqcheck')) form.tasks.push({id:'inqcheck', title:inqTitle(), done:false, memo:'', titleAuto:1, at:new Date().toISOString(), due:todayYmd(), by:user.name||'', auto:1});
  { const ic=form.tasks.find(t=>t.id==='inqcheck');
    if(ic && ic.memoAuto){ if(ic.memo.trim()===form.note.trim() && !ic.titleSet){ ic.memo=''; ic.titleAuto=1; } delete ic.memoAuto; }   // 예전 모양(메모 = 문의 내용) → 이름 = 문의 내용
    if(ic && ic.titleAuto && !ic.titleSet) ic.title=inqTitle(); }
  if(!form.cat){ form.cat=CAT_DEFAULT; if(!pcats().includes(CAT_DEFAULT)) savePcats([CAT_DEFAULT, ...pcats()], `'${CAT_DEFAULT}' 추가 (구분 없이 저장)`); paintChips(); }   // 구분을 안 고르고 저장하면 '문의' (2026-11-18)
  const item=toItem(); put(item); cur=item; saved=JSON.stringify(form); startedAt=null;
  lastAuto = auto ? Date.now() : null; paintForm(); if(!auto) toast('저장했습니다.');
  // 보고전달자 칸을 없애서 저장할 때 보고 글자 팝업은 자동으로 띄우지 않음 (위 「보고 글자 복사」 버튼으로, 2026-11-18)
}
// 자동 저장 (단체 화면처럼): 마지막으로 고친 뒤 30초가 지나면 · 다른 창으로 가면 바로. 저장 버튼 · Ctrl+S 도 그대로


function scheduleAuto(){ clearTimeout(autoT); if(isDirty() && hasContent()) autoT=setTimeout(()=>{ if(isDirty()) save(true); }, AUTO_SAVE_MS); }
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && isDirty() && hasContent()) save(true); });
$('#callForm').addEventListener('submit', e=>{ e.preventDefault(); save(); });
document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); } });
// 새 통화: 고치던 내용이 있으면 바로 저장하고 새 통화 (내용이 없어 저장할 수 없을 때만 묻기, 2026-11-17)
function newCall(){ if(isDirty()){ if(hasContent()) save(true); else if(!confirm('저장하지 않은 내용이 있습니다. 버리고 새 통화를 시작할까요?')) return false; } clearTimeout(autoT); lastAuto=null; reportShown=''; cur=null; form=blankForm(); saved=JSON.stringify(form); startedAt=null; paintForm(true); $('#fName').focus(); return true; }
$('#newBtn').onclick=()=>{ const d=isDirty() && hasContent(); if(newCall()) toast(d ? '고치던 내용을 저장하고 새 통화를 시작합니다.' : '새 통화를 시작합니다.'); };
document.addEventListener('keydown', e=>{ if(e.altKey && !e.ctrlKey && (e.key==='n'||e.key==='N'||e.code==='KeyN')){ e.preventDefault(); $('#newBtn').click(); } });   // Alt+N = 새 통화 (단체 화면과 같음)
window.addEventListener('beforeunload', e=>{ if(isDirty()){ e.preventDefault(); e.returnValue=''; } });
function openItem(id){ const r=shown().find(x=>x.id===id); if(!r) return; if(cur && cur.id===id) return; if(isDirty() && !confirm('저장하지 않은 내용이 있습니다. 버리고 이 기록을 열까요?')) return; clearTimeout(autoT); lastAuto=null; cur=r; form=fromItem(r); reportShown=form.reportTo||''; saved=JSON.stringify(form); startedAt=null; paintForm(true); window.scrollTo({top:0, behavior:'smooth'}); }

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


// 문의 매뉴얼 (노션): 헤더 링크로 새 창에 엶
const MANUAL_URL = 'https://happyyy-monkeyyy.notion.site/3d645f859824807090f1df4f0815a7bd?source=copy_link';   // 새 창으로 열기
$('#manualOpen').href = MANUAL_URL;   // 문의 매뉴얼은 헤더의 링크로만 (새 창)
// ===================== 통화 기록 전체 (모든 직원이 받은 개인고객 통화) =====================
// 삭제된 통화 (Apps Script 'deleted', 보기 전용): 같은 창에서 「삭제된 통화」 ↔ 「← 통화 기록 전체」
const ALL_HEAD = '<tr><th>저장</th><th>고객</th><th>연락처</th><th>일시</th><th>인원</th><th>문의 내용</th><th>남은 과업</th><th></th><th class="owner">받은 사람</th></tr>';
const TRASH_HEAD = '<tr><th>삭제 일시</th><th>삭제한 사람</th><th>사유</th><th>고객</th><th>연락처</th><th>일시</th><th>문의 내용</th><th class="owner">받은 사람</th></tr>';
let allTrash=false, trashItems=null, trashErr='', allOthers=false, allPast=false;   // 통화 기록 전체: 다른 사람 통화도 · 지난 통화도 (기본 = 내가 받은 오늘 통화, 2026-11-19)
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
  $('#allHead').innerHTML = on ? TRASH_HEAD : ALL_HEAD; $('#allSearch').value=''; $('#allFlt').hidden=on; renderAll();
  if(on){ trashItems=null; trashErr=''; renderAll();
    try{ const j=await callApi({action:'deleted'}); trashItems=j.items||[]; }
    catch(e){ trashErr = e.code==='bad_action' ? 'Apps Script를 새 버전으로 배포해야 삭제된 통화가 보입니다 (apps-script/group-intake.gs 의 deleted).' : '불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.'; }
    if(allTrash) renderAll(); }
}
$('#allTrash').onclick=()=>setAllTrash(!allTrash);
function renderAll(){
  const q=$('#allSearch').value.trim().replace(/\s/g,'').toLowerCase(), qd=q.replace(/\D/g,'');
  if(allTrash) return renderTrash(q, qd);
  // 기본 = 내가 받은 오늘 통화 (2026-11-19) · 「다른 사람 통화도 보기」 · 「지난 통화 보기」 · 검색하면 모든 통화에서
  const me=String(user.name||'').trim(), today=ymd(new Date()), mineOf = r => String(r.takenBy||r.owner||'').trim()===me, dayOf = r => { const x=new Date(r.callStart||r.saved||''); return isNaN(x) ? '' : ymd(x); };
  const all=shown().sort((a,b)=>String(b.saved).localeCompare(String(a.saved)));
  const inFlt = r => (allOthers || !me || mineOf(r)) && (allPast || dayOf(r)===today);
  const hit = r => !q || [r.contact, r.note, r.takenBy, r.history].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd));
  const list = q ? all.filter(hit) : all.filter(inFlt);
  $('#allPast').textContent = allPast ? '오늘 통화만 보기' : '지난 통화 보기'; $('#allPast').setAttribute('aria-pressed', allPast); $('#allPast').classList.toggle('on', allPast); $('#allOthers').checked=allOthers;
  $('#allFltHint').textContent = q ? '검색은 모든 통화에서 찾습니다' : `${allOthers?'모든 사람':'내가 받은'} · ${allPast?'모든 날짜':'오늘'} 통화`;
  $('#allCount').textContent = q ? `전체 ${all.length}건 · 찾은 ${list.length}건` : `${list.length}건 (전체 ${all.length}건)`;
  $('#allBody').innerHTML = list.map(r=>{ const left=tasksOfItem(r).filter(t=>!t.done).length, d=String(r.date||'').slice(0,10);
    return `<tr data-id="${esc(r.id)}"><td>${esc(dtLabel(r.saved))}</td><td>${(c=>c?`<span class="tag">${esc(c)}</span>`:'')(fromItem(r).cat)}<b>${esc(r.contact||'(이름 없음)')}</b></td><td>${esc(r.phone||'')}</td><td>${d?esc(dLabel(d)):''}</td><td>${esc(r.people||'')}</td><td class="note">${esc(String(r.note||'').split(/\n/)[0].slice(0,80))}</td><td>${left?`<span class="tag cb">${left}개</span>`:''}</td><td class="acts"><button type="button" class="btn primary pdel" data-pdel="${esc(r.id)}" title="이 통화 기록 삭제 (사유 필수)">삭제</button></td><td class="owner">${esc(r.takenBy||r.owner||'')}</td></tr>`; }).join('')
    || `<tr><td colspan="9" class="empty">${q?'찾은 통화가 없습니다.':allPast||allOthers?'저장된 개인고객 통화가 없습니다.':'오늘 내가 받은 통화가 없습니다. 「지난 통화 보기」 · 「다른 사람 통화도 보기」로 더 볼 수 있습니다.'}</td></tr>`;
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
$('#allOthers').addEventListener('change', e=>{ allOthers=e.target.checked; renderAll(); });
$('#allPast').onclick=()=>{ allPast=!allPast; renderAll(); };
$('#allBody').addEventListener('click', e=>{ const del=e.target.closest('[data-pdel]'); if(del){ openPdel(del.dataset.pdel); return; } const tr=e.target.closest('tr[data-id]'); if(!tr) return; $('#allModal').hidden=true; openItem(tr.dataset.id); });

// ===================== 마감이 된 추후 과업 알림: 오전 8시 · 11시 · 오후 1시 · 5시 =====================
// 그 시각이 지나고 처음 화면을 볼 때 (시각마다 한 번, 단체 화면과 같은 기록이라 두 화면에서 두 번 뜨지 않음). 내 개인고객 과업 + 내가 영업 담당인 단체 과업
const TASK_SLOT_LS='sayuwon_task_slot', ALERT_HOURS=[8,11,13,17], QUIET_MS=30*60e3;
let groupMine=[];
// 나의 할일 버튼 옆 빨간 표시: 마감이 오늘이거나 지난 내 과업 수 (개인 + 내가 영업 담당인 단체, 단체 화면과 같은 모양)
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
    return `<li class="${late?'late':'today'}"><span class="who"><span class="tag">${personal?'개인':'단체'}</span> <b>${esc(personal ? (r.contact||'(이름 없음)') : (r.org||r.contact||'(업체 미정)'))}</b>${personal&&r.phone?` · ${esc(r.phone)}`:''}${!personal&&r.date?` · 방문 ${esc(dLabel(r.date))}`:''}<br><b class="t">${esc(t.title)}</b> <small class="hint" style="display:inline">마감 ${esc(dLabel(t.due))} ${late?'(지남)':'(오늘)'}</small></span>`
      + (personal ? `<button class="btn primary" data-ddone="${esc(r.id)}|${esc(t.id)}">완료</button><button class="btn" data-dopen="${esc(r.id)}">열기</button>` : `<button class="btn" data-gopen="${esc(r.id)}">열기</button>`) + `</li>`; }).join('');
  $('#dueTitle').innerHTML = `과업 알림 <small><b class="cnt-late">지남 ${due.filter(o=>o.t.due<today).length}</b> · <b class="cnt-today">오늘 ${due.filter(o=>o.t.due>=today).length}</b> · 단체 + 개인 · 알림은 오전 8시 · 11시 · 오후 1시 · 5시</small>`;
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
// 나의 할일에서 개인고객 과업을 누르면 personal.html?open=통화ID → 그 통화를 엶 (목록을 받은 뒤)
let openId = new URLSearchParams(location.search).get('open');
function tryOpen(){ if(!openId) return; if(shown().some(x=>x.id===openId)){ const id=openId; openId=null; history.replaceState(null,'',location.pathname); openItem(id); } }
enhanceDates();   // 방문 희망일 / 예약일 · 과업 마감일: 누르면 달력 · 칸 안에 (요일)
paintForm(); renderLists(); paintSync(); tryOpen(); flush();

// ===== 삭제 확인 팝업 (추후 과업 삭제 등): 「정말로 삭제할 건가요?」 → 삭제 · 취소 (Enter = 삭제, Esc = 취소) =====
let askOk=null;
function askDelete(msg, ok, title='삭제 확인', yes='삭제'){ askOk=ok; document.getElementById('askTitle').textContent=title; document.getElementById('askYes').textContent=yes; document.getElementById('askMsg').textContent=msg; document.getElementById('askModal').hidden=false; setTimeout(()=>document.getElementById('askNo').focus(),0); }
// ===== 단체고객 전화응대로 변경 (2026-11-19): 듣다 보니 단체 문의인 통화 → 같은 기록을 단체 예약(예약상담)으로 바꿔 단체 화면에서 이어서 =====
// 성함 · 연락처 · 방문일 · 인원 · 문의 내용(메모) · 지금까지 기록은 그대로, 개인고객 자동 과업(문의 처리)은 뺌, 영업 담당 = 바꾼 사람
async function toGroup(){
  if(!hasContent()){ toast('문의 내용이나 고객 정보를 넣어 주세요.'); return; }
  if(!getKey()){ toast('팀 비밀번호를 먼저 넣어 주세요.'); return; }
  clearTimeout(autoT);
  const it=toItem(), now=new Date().toISOString();
  let h={}; try{ h=JSON.parse(it.history||'{}')||{}; }catch(_){}
  const g={ ...it, callType:'예약상담', owner:user.name||it.takenBy||'', memo:'', pay:'미정', vehicle:'미정',
    summary:`예약상담 · ${String(it.note||'').split(/\n/)[0].slice(0,60)}`.replace(/ · $/,''),
    history: JSON.stringify({ h:[...(h.h||[]), {t:now, by:user.name||'', what:'[변경] 개인고객 전화응대 → 단체고객 전화응대 (예약상담)'}], tasks:(h.tasks||[]).filter(t=>t.id!=='inqcheck'), erp:[], memos:[] }) };
  $('#toGroupBtn').disabled=true; toast('단체고객 전화응대로 바꾸는 중…');
  try{
    pending=pending.filter(p=>!(p.item && p.item.id===g.id)); writeJSON(PEND_LS,pending);
    await callApi({action:'put', item:g});
    items=items.filter(x=>x.id!==g.id); writeJSON(CACHE_LS, items.slice(-500));
    saved=JSON.stringify(form=blankForm()); cur=null;   // 떠날 때 「저장하지 않은 내용」 경고가 안 뜨게
    location.href='group.html?open='+encodeURIComponent(g.id);
  }catch(e){ $('#toGroupBtn').disabled=false; handleErr(e); toast('바꾸지 못했습니다. 잠시 뒤 다시 눌러 주세요.'); }
}
$('#toGroupBtn').onclick=()=>askDelete('이 통화를 단체고객 전화응대로 옮깁니다. 단계는 「예약상담」이 되고, 성함 · 연락처 · 방문일 · 인원 · 문의 내용은 그대로 가져갑니다. 개인고객 목록에서는 빠집니다.', toGroup, '단체고객 전화응대로 변경', '변경');
const closeAsk = () => { document.getElementById('askModal').hidden=true; askOk=null; };
document.getElementById('askNo').onclick = closeAsk;
document.getElementById('askYes').onclick = () => { const f=askOk; closeAsk(); if(f) f(); };
document.getElementById('askModal').addEventListener('mousedown', e=>{ if(e.target.id==='askModal') closeAsk(); });
document.addEventListener('keydown', e=>{ if(document.getElementById('askModal').hidden) return; if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeAsk(); } }, true);

// ===== 저장 안 한 변경 표시 (노란 점): 저장 버튼 · 과업마다 「저장」 =====
function paintDirtyDots(){
  const d=isDirty(); $('#saveBtn').classList.toggle('dirty', d);
  let sv={}; try{ sv=JSON.parse(saved)||{}; }catch(_){}
  const old=new Map((sv.tasks||[]).map(t=>[t.id, JSON.stringify(t)]));
  document.querySelectorAll('#taskList [data-tsave]').forEach(b=>{ const t=(form.tasks||[]).find(x=>x.id===b.dataset.tsave); b.classList.toggle('dirty', !!t && (!cur || old.get(t.id)!==JSON.stringify(t))); });
}
document.addEventListener('input', e=>{ if(e.target.closest && (e.target.closest('#taskList') || e.target.closest('#callForm'))) setTimeout(paintDirtyDots, 60); });
setInterval(()=>{ if(!document.hidden) flush(); }, 30000); window.addEventListener('focus', ()=>flush());   // 30초마다 · 이 창으로 돌아오면 최신 기록 (다른 사람 · 다른 창에서 끝낸 과업이 바로 보이게, 2026-11-18)
