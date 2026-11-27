// ▣ js/group/08-history-save.js — 수정 기록(무엇이 바뀌었나 · 되돌리기) · 저장(save) · 30초 자동 저장 · 저장 안 한 표시 · 나갈 때 확인
// ===================== 통화 메모 = 쌓이는 기록 (2026-11-27) =====================
// 예약 기록의 수정 기록 칸(history JSON · 서버는 정해진 칸만 받으므로 과업 · 메모 알림처럼 여기에)의 notes:[{id, t(적은 시각), by(적은 사람), text, ed:{t,by}(고침), del:{t,by}(지움 — 줄은 남김)}] 가 기록 목록이고,
//  note(글 한 덩어리 · 예전부터 있던 값)에는 지우지 않은 기록을 「[2026-11-27 14:20 이름] 내용」 줄로 이어 함께 넣는다 — 보고 글자 · 엑셀 · 다음날 준비 · 예전 화면이 note 를 읽으므로.
//  - 예전 예약(notes 없음 · note 만): 그 글을 「예전 메모」 기록 하나로 보임 (저장된 자료를 한꺼번에 바꾸지 않음 — 열어서 저장할 때 notes 가 더해짐)
//  - 예전 화면이 저장하면 notes 는 빠지고 note 만 남는다 → 열 때 notes 를 이은 글과 note 가 다르면 note(글)를 기준으로 기록을 다시 읽어 낸다 (noteFromText · 내용이 사라지지 않게)
//  - 적는 자리(#memoBox)의 글 = 아직 확정 안 한 기록 하나(noteDraftId). 자동 저장은 그 기록을 같은 id 로 저장만 하고, 「저장」 · Ctrl+S 가 기록으로 쌓는다(확정)
//  - 저장할 때: 그사이 남이 더한 기록은 살리고(noteMerge), 내가 이번에 손댄 기록(noteOwn)만 내 것으로 덮는다
const NOTE_HDR = /^\[(?:(\d{4}-\d\d-\d\d) (\d\d:\d\d)(?: ([^\]]*))?|덧붙인 글)\] ?/;
const noteStamp = t => { const d=new Date(t); if(!t || isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const noteKey = n => n.t ? noteStamp(n.t)+' '+(n.by||'') : '';
const noteHash = s => { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return (h>>>0).toString(36); };
const noteNewId = () => 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const noteSort = L => (L||[]).map((n,i)=>({n,i})).sort((a,b)=>String(a.n.t||'').localeCompare(String(b.n.t||'')) || a.i-b.i).map(x=>x.n);   // 적은 시각 순 (시각 모르는 예전 메모가 맨 위)
function noteJoin(L){ return noteSort(L).filter(n=>n && !n.del && String(n.text||'').trim()).map((n,i)=> n.t ? `[${noteStamp(n.t)}${n.by?' '+n.by:''}] ${n.text}` : i ? `[덧붙인 글] ${n.text}` : n.text).join('\n'); }
function noteSplit(text){   // 글 → [{t, by, text}] (머리표 「[날짜 시각 이름]」 로 시작하는 줄마다 기록 하나 · 머리표 앞의 글은 예전 메모)
  const out=[]; let cur=null;
  String(text||'').replace(/\r/g,'').split('\n').forEach(line=>{ const m=line.match(NOTE_HDR);
    if(m){ const d=m[1] ? new Date(m[1]+'T'+m[2]+':00') : null; cur={t: d && !isNaN(d) ? d.toISOString() : '', by:(m[3]||'').trim(), text:line.slice(m[0].length)}; out.push(cur); }
    else if(cur) cur.text+='\n'+line; else { cur={t:'', by:'', text:line}; out.push(cur); } });
  out.forEach(n=>{ n.text=n.text.replace(/\s+$/,''); }); return out.filter(n=>n.text.trim());
}
function noteFromText(text, L, who){   // 글이 기준: 글에 있는 기록은 살리고(같은 기록이면 id · 고침 표시 그대로), 글에 없는 기록은 지움 표시로 남김
  L=L||[]; const used=new Set(), ids=new Set(L.map(n=>n.id));
  const out=noteSplit(text).map(p=>{ const k=noteKey(p), free=n=>!n.del && !used.has(n.id) && noteKey(n)===k;
    const hit = L.find(n=>free(n) && String(n.text||'').trim()===p.text.trim()) || (k ? L.find(free) : null);
    if(hit){ used.add(hit.id); return {...hit, text:p.text}; }
    let id='p'+noteHash(k+'|'+p.text.trim()); while(ids.has(id)) id+='x'; ids.add(id); return {id, t:p.t, by:p.by, text:p.text}; });
  L.forEach(n=>{ if(!used.has(n.id)) out.push(n.del ? n : {...n, del:who||{t:'', by:''}}); });
  return out;
}
function notesOf(r){ r=r||{}; const hn=parseHist(r).notes, L=Array.isArray(hn) ? hn.filter(n=>n && n.id).map(n=>({...n})) : [], note=String(r.note||'');
  return noteJoin(L).trim()===note.trim() ? L : noteFromText(note, L); }
function noteDraft(){ const text=String($('#memoBox').value||'').trim(); if(!text) return null;
  if(!noteDraftId){ noteDraftId=noteNewId(); noteDraftT=new Date().toISOString(); noteOwn.add(noteDraftId); }
  return {id:noteDraftId, t:noteDraftT, by:savedOwner()||rec.owner||'', text}; }
const noteLive = () => { const d=noteDraft(); return d ? [...notes.filter(n=>n.id!==d.id), d] : notes.slice(); };
const noteFull = () => noteJoin(noteLive());
function noteMerge(theirs, mine){   // theirs = 지금 저장돼 있는 기록 · mine = 이 화면의 기록
  const T=(theirs||[]).filter(n=>n && n.id), tm=new Map(T.map(n=>[n.id,n])), ids=new Set(mine.map(n=>n.id)), same=new Set(mine.map(n=>noteKey(n)+'|'+String(n.text||'').trim()));
  return noteSort([...mine.map(n=>noteOwn.has(n.id) ? n : (tm.get(n.id)||n)), ...T.filter(n=>!ids.has(n.id) && !noteOwn.has(n.id) && !same.has(noteKey(n)+'|'+String(n.text||'').trim()))]); }
function noteLoad(r){ notes = r ? noteSort(notesOf(r)) : []; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); noteEditId=''; noteShown=new Set(); $('#memoBox').value=''; renderNotes(true); }
function noteCommit(){   // 적는 자리의 글을 기록으로 쌓음 (저장이 끝난 뒤에 부름)
  const d=noteDraft(); if(d) notes=noteSort([...notes.filter(n=>n.id!==d.id), d]);
  $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); renderNotes(true); }
const noteCan = n => !editLockBy && (!lockOwner || (!!n.by && n.by===savedOwner()));   // 고치기 · 지우기: 영업 담당은 모두 · 담당이 아니면 내가 적은 기록만
function renderNotes(toEnd){
  const box=$('#noteList'); if(!box) return; const did=noteDraftId && String($('#memoBox').value||'').trim() ? noteDraftId : '';
  const L=noteSort(notes).filter(n=>n.id!==did && String(n.text||'').trim()), y=box.scrollTop;
  box.hidden=false;   // 채팅처럼: 기록 자리는 늘 보이고 위에서부터 쌓임 · 적는 자리는 맨 아래 (같은 날 다시 · 운영팀 요청)
  box.innerHTML=!L.length ? '<li class="note-empty">저장한 메모가 여기에 위에서부터 차례로 쌓입니다.</li>' : L.map(n=>{ const can=noteCan(n), id=esc(n.id), when = n.t ? `<b class="note-when num">${esc(dtLabel(n.t))}</b>${n.by?`<span class="note-by">${esc(n.by)}</span>`:''}` : '<b class="note-when">예전 메모</b>';
    if(n.del) return `<li class="note-it del" data-nid="${id}"><div class="note-h">${when}<span class="note-ed">지운 기록${n.del.by?` · ${esc(n.del.by)}`:''}${n.del.t?` ${esc(dtLabel(n.del.t))}`:''}</span><span class="note-acts"><button type="button" class="note-btn" data-nshow="${id}">${noteShown.has(n.id)?'내용 접기':'내용 보기'}</button>${can?`<button type="button" class="note-btn" data-nback="${id}">되살리기</button>`:''}</span></div>${noteShown.has(n.id)?`<div class="note-tx">${esc(n.text)}</div>`:''}</li>`;
    if(noteEditId===n.id) return `<li class="note-it editing" data-nid="${id}"><div class="note-h">${when}</div><textarea class="note-edit" data-ime="ko" lang="ko" spellcheck="false">${esc(n.text)}</textarea><div class="note-edit-btns"><button type="button" class="btn primary" data-nok="${id}">고친 내용 넣기</button><button type="button" class="btn" data-ncancel="${id}">취소</button></div></li>`;
    return `<li class="note-it" data-nid="${id}"><div class="note-h">${when}${n.ed?`<span class="note-ed">고침${n.ed.by?` · ${esc(n.ed.by)}`:''}${n.ed.t?` ${esc(dtLabel(n.ed.t))}`:''}</span>`:''}${can?`<span class="note-acts"><button type="button" class="note-btn" data-nedit="${id}">고치기</button><button type="button" class="note-btn" data-ndel="${id}">지우기</button></span>`:''}</div><div class="note-tx">${esc(n.text)}</div></li>`; }).join('');
  noteGrow(); box.scrollTop = toEnd ? box.scrollHeight : y;
}
// 적는 자리 높이: 평소 한두 줄(css) · 길게 적으면 칸의 55% 까지 늘어남 · 비우면 도로 (채팅 입력창처럼)
function noteGrow(){ const mb=$('#memoBox'), st=$('#memoStack'), box=$('#noteList'); if(!mb || !st) return; const end = box && box.scrollTop+box.clientHeight >= box.scrollHeight-4;
  mb.style.height=''; if(mb.value && mb.scrollHeight>mb.clientHeight+2) mb.style.height=Math.min(mb.scrollHeight+2, Math.round(st.clientHeight*0.55))+'px';
  if(end && box) box.scrollTop=box.scrollHeight; }
$('#memoBox').addEventListener('input', noteGrow);
// ===================== 수정 기록 =====================
// 저장할 때마다 바뀐 항목을 시각·영업 담당과 함께 남긴다 (시트 '수정 기록' 칸에 JSON)
const mealSum = r => [r.sadam1&&`사담1부 ${r.sadam1}`, r.sadam2&&`사담2부 ${r.sadam2}`, r.sadamD&&`사담디너 ${r.sadamD}`, r.mabangL&&`마방 ${r.mabangTime?r.mabangTime+' ':''}${r.mabangL}`, r.mabangD&&`마방디너 ${r.mabangD}`].filter(Boolean).join(" · ") || r.meal || "";
Object.assign(LABEL, { etcDisc:'기타 할인', etcDiscTo:'기타 할인 대상', etcDiscWhy:'기타 할인 사유', etcDiscTx:'기타 할인 과세(신라)', etcDiscTf:'기타 할인 비과세(사유원)', erpList:'전산 내역', tour:'사전 답사', tbd:'미정 체크', tbdLate:'답변일 늦춘 사유', stage:'예약 단계', erp:'전산 등록', note:'통화 메모' });
function snap(){
  const o={}; allKeys().forEach(k=>{ if(k!=='owner') o[k]=rec[k]||''; });
  o.tbd=rec.tbd||''; o.tbdLate=rec.tbdLate||''; if(typeof SPECIAL!=='undefined') SPECIAL.forEach(s=>o[s.k]=rec[s.k]||'');
  o.stage=effStage(rec); o.erp=rec.erp||''; o.note=noteFull().trim();
  { const es=etcSplit(rec); if(es.tx) o.etcDiscTx=String(es.tx); if(es.tf) o.etcDiscTf=String(es.tf); } ['etcDiscWhy','readDone'].forEach(k=>{ if(rec[k]) o[k]=rec[k]; }); if(erpList.length) o.erpList=erpList.map(x=>`${x.product} ${x.people}명 ${x.amount}`).join(', ');   // 기타 할인 · 전산 내역도 변경으로
  tasks.forEach(t=>{ o['task:'+t.id]=t.done?'완료':''; o['tmemo:'+t.id]=t.memo||''; o['tfile:'+t.id]=(t.files||[]).map(f=>f.name).join(', '); if(t.custom) o['tadd:'+t.id]=t.title; });
  tasks.forEach(t=>{ if(t.dueSet) o['tdue:'+t.id]=t.due||''; if(t.titleSet && !t.custom) o['tttl:'+t.id]=t.title; });   // 직접 바꾼 마감일 · 제목도 변경으로 (자동 저장이 놓치지 않게)
  tasks.forEach(t=>{ if(t.noteEdit) o['tnote:'+t.id]=t.noteEdit; });   // 직접 고친 문구
  tasks.forEach(t=>{ const s=[...Object.entries(t.subs||{}).map(([k,v])=>k+(v?'✓':'')), ...(t.xsubs||[]).map(x=>x.title+(x.done?'✓':''))].join(', '); if(s) o['tsub:'+t.id]=s; });   // 하위 과업 · 세부 과제
  o.taskOrder = tasks.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord).map(t=>t.id).join(',');   // 직접 바꾼 순서만 (새 과업이 맨 아래 붙는 것은 변경 아님)   // ▲▼로 바꾼 과업 순서
  return o;
}
function diffSnap(a,b){
  const out=[];
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{
    const x=a[k]||'', y=b[k]||''; if(x===y) return;
    if(k==='note'){ out.push(y.length>x.length && y.startsWith(x) ? '통화 메모 기록 더함' : '통화 메모 수정'); return; }
    if(k==='taskOrder'){ out.push('과업 순서 바꿈'); return; }
    if(k==='readDone'){ out.push(y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소'); return; }
    const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):(.+)$/);
    if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
      out.push(tm[1]==='tdue' ? `[과업] ${title} 마감 ${y}` : tm[1]==='tttl' ? `[과업] 제목 → ${y}` : tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`); return; }
    const lab=LABEL[k]||k;
    out.push(!x ? `${lab} ${y} 입력` : !y ? `${lab} ${x} 지움` : `${lab} ${x} → ${y}`);
  });
  return out;
}
// 시트 '수정 기록' 칸: {h:[수정 기록], tasks:[추후 과업]} (예전 기록은 배열만)
function parseHist(r){ try{ const j=JSON.parse(r.history||'[]'); return Array.isArray(j) ? {h:j, tasks:[], erp:[], memos:[]} : {h:j.h||[], tasks:j.tasks||[], erp:j.erp||[], memos:j.memos||[], notes:Array.isArray(j.notes)?j.notes:undefined}; }catch(_){ return {h:[], tasks:[], erp:[], memos:[]}; } }   // memos: 담당이 아닌 사람이 남긴 메모 [{id,t,by,text,seen,seenAt}]
// ---- 바뀐 값의 흐름 (ch): {칸: [처음 값, 다음 값, …]} → "관람 인원 20 → 22 → 25". 자동 저장이 여러 번이어도 한 줄에 모든 변경이 남고, 되돌리기에도 씀
const fmtTime_ = t => dtLabel(t);
function chText(k, c){
  const x=c[0]||'', y=c[c.length-1]||'';
  if(k==='note') return y.length>x.length && y.startsWith(x) ? '통화 메모 기록 더함' : '통화 메모 수정';
  if(k==='taskOrder') return '과업 순서 바꿈';
  if(k==='erpList') return '전산 내역 붙여넣음';
  if(k==='readDone') return y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소';
  const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):(.+)$/);
  if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
    return tm[1]==='tdue' ? `[과업] ${title} 마감 ${y}` : tm[1]==='tttl' ? `[과업] 제목 → ${y}` : tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y||'없음'}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`; }
  const lab=LABEL[k]||k;
  if(c.length===2) return !x ? `${lab} ${y} 입력` : !y ? `${lab} ${x} 지움` : `${lab} ${x} → ${y}`;
  return `${lab} ${c.map(v=>v||'(빈칸)').join(' → ')}`;   // 여러 번 바뀐 것은 거쳐 간 값을 모두
}
const chWhat = ch => Object.entries(ch).map(([k,c])=>chText(k,c)).join(', ');
function addCh(ch, a, b){   // a(마지막 저장) → b(지금) 사이 바뀐 칸을 흐름에 이어 붙임
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{ const x=a[k]||'', y=b[k]||''; if(x===y) return;
    if(!ch[k]) ch[k]=[x]; if(ch[k][ch[k].length-1]!==y) ch[k].push(y); if(ch[k].length>20) ch[k].splice(1, ch[k].length-20); });
  return ch;
}
// 되돌리기: 기록 i 를 저장한 직후의 상태 = 지금 상태에서 i 보다 뒤 기록들의 흐름을 거꾸로 첫 값으로
const REVERT_SKIP = /^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):|^(taskOrder|erpList)$/;   // 과업 체크 · 메모 · 파일은 되돌리지 않음
function canRevertTo(i){ return i < hist.length-1 && hist.slice(i+1).every(h=>h.ch); }
function stateAt(i){
  const s={...(baseSnap||snap())};   // 마지막으로 저장한 상태에서 거꾸로
  for(let j=hist.length-1;j>i;j--) Object.entries(hist[j].ch||{}).forEach(([k,c])=>{ if(!REVERT_SKIP.test(k)) s[k]=c[0]||''; });
  return s;
}
function renderHist(){
  $('#histWrap').hidden = !hist.length; $('#histCount').textContent = hist.length ? hist.length+'건' : '';
  const n=hist.length;
  $('#histBox').innerHTML = hist.map((h,i)=>({h,i})).reverse().map(({h,i})=>`<li><time>${esc(fmtTime_(h.t))}</time><b>${esc(h.by||'담당 미입력')}</b>${esc(h.what)}`
    + (h.o && h.s===SID ? ' <span class="hist-open">자동 저장 중 · 저장 버튼을 누르면 확정</span>' : '')
    + (i===n-1 ? ' <span class="hist-now">지금 버전</span>' : canRevertTo(i) ? ` <button type="button" class="hist-rev" data-rev="${i}">이 버전으로 돌아가기</button>` : '')
    + `</li>`).join('');
  $('#autoSt').textContent = lastAuto ? `자동 저장 ${new Date(lastAuto).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}` : '';
}
// ---- 자동 저장: 마지막으로 고친 뒤 AUTO_SAVE_MS 가 지나면 저장. 한 번 열어 고치는 동안(세션)의 변경은 수정 기록 한 줄에 모임
// 저장 버튼을 누르면 그 줄을 확정하고, 다음 변경은 새 줄로
const AUTO_SAVE_MS = 30000;
let autoT=null, lastAuto=null, saving=false, emptySnap=null, SID=Math.random().toString(36).slice(2);
const canSave = () => !!(rec.org || rec.date);
const refSnap = () => baseSnap || emptySnap || {};
const isDirty = () => diffSnap(refSnap(), snap()).length>0;
function paintDirty(){ const ids=dirtyTaskIds(); document.querySelectorAll('#taskList textarea[data-tm]').forEach(ta=>{ const t=tasks.find(x=>x.id===ta.dataset.tm); if(t && ta.value!==(t.memo||'')) ids.add(t.id); });   // 치는 중인 과업 메모도 (칸을 벗어나야 반영되므로)
  $('#saveBtn').classList.toggle('dirty', isDirty() || ids.size>0); document.querySelectorAll('#taskList [data-tsave]').forEach(b=>b.classList.toggle('dirty', ids.has(b.dataset.tsave))); }   // 저장 안 한 변경: 저장 버튼 · 그 과업의 「저장」에 노란 점
// 저장 안 한 변경이 있는 과업 id (체크 · 메모 · 파일 · 마감 · 제목 · 문구 · 하위 과업)
function dirtyTaskIds(){ const a=refSnap(), b=snap(), s=new Set(); new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k=>{ const m=k.match(/^(task|tmemo|tfile|tadd|tdue|tttl|tnote|tsub):(.+)$/); if(m && String(a[k]||'')!==String(b[k]||'')) s.add(m[2]); }); return s; }
let dirtyT=0; document.addEventListener('input', e=>{ if(!e.target.closest?.('#taskList')) return; clearTimeout(dirtyT); dirtyT=setTimeout(paintDirty, 60); });   // 과업 메모를 치는 동안에도
function scheduleAuto(){
  paintDirty(); clearTimeout(autoT);
  if(isDirty() && canSave()) autoT=setTimeout(()=>save({auto:true}), AUTO_SAVE_MS);
}
async function save(opt){
  const auto = !!(opt && opt.auto), quiet = opt===true || auto;
  if(saving){ if(auto){ clearTimeout(autoT); autoT=setTimeout(()=>save(opt), 3000); return; }   // 자동 저장 중이면: 자동은 잠시 뒤, 저장 버튼은 끝나기를 기다렸다가
    await new Promise(ok=>{ const iv=setInterval(()=>{ if(!saving){ clearInterval(iv); ok(); } }, 50); }); return save(opt); }
  if(editLockBy){ if(!auto) toast(`${editLockBy}님이 다른 PC(창)에서 이 예약을 고치는 중이라 저장할 수 없습니다.`); return; }   // 같은 예약을 두 곳에서 고치지 않게
  if(lockOwner) return auto ? saveLockedParts() : saveLockedCommit();   // 남이 담당인 예약: 예약 전체는 저장 안 함 — 통화 메모 · 내가 담당자인 과업만 (2026-11-24 · 15-lock-popups.js)
  if(!canSave()){ if(!auto) toast('업체나 방문일을 먼저 입력하세요.'); return; }
  if(typeof tbdIsLate==='function' && tbdIsLate(rec) && !rec.tbdLate){ if(!auto) openLate(()=>save(opt)); return; }   // 입력 기한을 전주 목요일보다 늦게 잡았으면 사유부터 (자동 저장은 기다림)
  if(auto && !isDirty()) return;
  clearTimeout(autoT);
  if(!rec.owner) rec.owner=savedOwner();
  const wasSaved=!!editingId, now=new Date().toISOString(), cur=snap(), me=savedOwner()||rec.owner||'';
  // 이 세션의 줄(열려 있는 줄)에 이어 적기
  const last=hist[hist.length-1], open = last && last.o && last.s===SID ? last : null;
  let row = open ? {...open, ch:{...(open.ch||{})}} : null;
  if(!baseSnap){ row = row || {t:now, by:me, what:'처음 저장', s:SID, first:1}; }   // 새 예약: 첫 줄은 '처음 저장'
  else { const ch=addCh(row?row.ch:{}, baseSnap, cur); if(Object.keys(ch).length){ row = {...(row||{s:SID}), t:now, by:me, ch, what:(row&&row.first?'처음 저장 · ':'')+chWhat(ch)}; } }
  if(row){ row.t=now; if(auto) row.o=1; else delete row.o; }
  if(row && opt && opt.revert) row.what = `[되돌리기] ${opt.revert} 버전으로 · ${row.what}`;
  const changes = row && row.ch ? Object.keys(row.ch) : row ? ['처음 저장'] : [];
  let newHist = row ? [...(open ? hist.slice(0,-1) : hist), row].slice(-200) : hist;
  const j=joinContacts(rec);
  const typed0=$('#memoBox').value, nl=noteMerge(editingId ? notesOf(cache.find(x=>x.id===editingId)||{}) : [], noteLive());   // 통화 메모 기록: 그사이 남이 더한 것까지 합침 (2026-11-27)
  const item={...rec, ...j, ...packExtra(rec), callType:effStage(rec), summary:autoSummary(), note:noteJoin(nl), takenBy:rec.owner,
    callStart:startedAt?startedAt.toISOString():'', id:editingId||(Date.now().toString(36)+Math.random().toString(36).slice(2,5)), saved:now, history:JSON.stringify({h:newHist, tasks, erp:erpList, memos:mergeMemos(memos, parseHist(cache.find(x=>x.id===editingId)||{}).memos), notes:nl})};   // 메모: 그사이 남이 남긴 것까지 합침
  // 구글 시트 칸 하나에는 5만 자까지만 들어감 → 수정 기록이 너무 길면 처음 저장 줄은 두고 오래된 기록부터 덜어 냄 (넘으면 저장이 계속 실패함)
  { const h2=fitHist(item); if(h2) newHist=h2; }
  Object.keys(item).forEach(k=>{ if(isCKey(k)) delete item[k]; });
  delete item.tbd; delete item.stage; delete item.erp; delete item.tbdDate; delete item.tbdLate; delete item.payContact;
  saving=true;
  try{ await store.put(item); editingId=item.id; openedRaw=rawPick(item); openedObj=liveVals(item); hist=newHist; baseSnap=cur;
    { const did=noteDraftId, same=$('#memoBox').value===typed0;   // 통화 메모: 저장 버튼 · Ctrl+S = 적은 글을 기록으로 쌓고 적는 자리를 비움 · 자동 저장 = 적는 자리는 그대로 (저장하는 사이 더 적었으면 그대로 둠)
      if(!auto && same){ notes=nl; $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); } else notes=nl.filter(n=>n.id!==did || !String($('#memoBox').value||'').trim());
      renderNotes(!auto && same); if(same) baseSnap.note=noteFull().trim(); }
    if(auto) lastAuto=now; renderHist(); paintDirty(); await renderList();
    if(!auto) toast(quiet ? `저장했습니다.` : `${item.callType}으로 저장했습니다.${changes.length?' 수정 기록에 반영했습니다.':' (바뀐 내용 없음)'}${needsErp(rec)&&!rec.erp?' 전산 등록을 잊지 마세요.':''}`);
    if(!auto) SID=Math.random().toString(36).slice(2);   // 저장 버튼 = 이 줄 확정, 다음 변경은 새 줄
  }
  catch(e){ toast('저장하지 못했습니다: '+e.message); }
  finally{ saving=false; }
}
$('#saveBtn').onclick=()=>save();
// ---- 저장하지 않은 변경이 있으면: 창을 닫을 때 브라우저가 묻고, 새 통화 · 다른 예약으로 넘어갈 때 팝업
window.addEventListener('beforeunload', e=>{ if(isDirty()){ e.preventDefault(); e.returnValue=''; } });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && isDirty() && canSave()) save({auto:true}); });   // 다른 창으로 가면 바로 자동 저장
let leaveNext=null;
function guardLeave(fn){
  if(!isDirty()){ fn(); return; }
  leaveNext=fn;
  $('#leaveList').innerHTML = diffSnap(refSnap(), snap()).slice(0,12).map(s=>`<li>${esc(s)}</li>`).join('');
  $('#leaveMsg').textContent = canSave() ? '아래 내용을 아직 저장하지 않았습니다. 저장하지 않고 나가시겠어요?' : '업체나 방문일이 없어 저장할 수 없습니다. 저장하지 않고 나가면 입력한 내용이 사라집니다.';
  $('#leaveSave').hidden = !canSave();
  $('#leaveModal').hidden=false; setTimeout(()=>($('#leaveSave').hidden?$('#leaveCancel'):$('#leaveSave')).focus(),0);
}
const closeLeave = () => { $('#leaveModal').hidden=true; };
$('#leaveCancel').onclick=()=>{ leaveNext=null; closeLeave(); };
$('#leaveDiscard').onclick=()=>{ const f=leaveNext; leaveNext=null; closeLeave(); clearTimeout(autoT); baseSnap=snap(); emptySnap=baseSnap; f&&f(); };   // 버리고 이동
$('#leaveSave').onclick=async()=>{ const f=leaveNext; leaveNext=null; closeLeave(); await save(); if(!isDirty()) f&&f(); };
$('#leaveModal').addEventListener('click', e=>{ if(e.target.id==='leaveModal') $('#leaveCancel').click(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#leaveModal').hidden){ e.preventDefault(); $('#leaveCancel').click(); } });
const openRecordG = r => guardLeave(()=>openRecord(r));
// ---- 수정 기록: 이 버전으로 돌아가기 → 미리보기(지금 / 돌아갈 버전) → 선택
let revTarget=null;
const revVal = (k,v) => k==='note' ? (v ? (v.length>40 ? v.slice(0,40)+'…' : v) : '') : v;
$('#histBox').addEventListener('click', e=>{
  const b=e.target.closest('[data-rev]'); if(!b) return;
  const i=+b.dataset.rev; if(!canRevertTo(i)) return;
  const target=stateAt(i), cur=snap();
  const keys=[...new Set([...Object.keys(target),...Object.keys(cur)])].filter(k=>!REVERT_SKIP.test(k) && (target[k]||'')!==(cur[k]||''));
  revTarget={i, target, label:fmtTime_(hist[i].t)};
  $('#revMsg').textContent = `${fmtTime_(hist[i].t)} 버전 (${hist[i].by||'담당 미입력'}) · 지금과 다른 항목 ${keys.length}개`;
  $('#revBody').innerHTML = keys.length ? keys.map(k=>`<tr><td>${esc(LABEL[k]||k)}</td><td>${esc(revVal(k,cur[k]||''))||'<span class="hint" style="margin:0">(빈칸)</span>'}</td><td><b>${esc(revVal(k,target[k]||''))||'<span class="hint" style="margin:0">(빈칸)</span>'}</b></td></tr>`).join('')
    : '<tr><td colspan="3" class="hint">지금과 같은 내용입니다.</td></tr>';
  $('#revOk').disabled = !keys.length;
  $('#revModal').hidden=false;
});
const closeRev = () => { $('#revModal').hidden=true; revTarget=null; };
$('#revCancel').onclick=closeRev;
$('#revModal').addEventListener('click', e=>{ if(e.target.id==='revModal') closeRev(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#revModal').hidden){ e.preventDefault(); closeRev(); } });
$('#revOk').onclick=async()=>{
  if(!revTarget) return; const {target, label}=revTarget; closeRev();
  const lr=hist[hist.length-1]; if(isDirty() || (lr && lr.o && lr.s===SID)) await save();   // 지금까지 고친 것은 먼저 한 줄로 확정
  Object.entries(target).forEach(([k,v])=>{ if(REVERT_SKIP.test(k) || k==='stage') return;
    if(k==='note'){ notes=noteSort(noteFromText(v, notes, {t:new Date().toISOString(), by:savedOwner()||''})); $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; notes.forEach(n=>noteOwn.add(n.id)); renderNotes(true); return; }   // 통화 메모: 그 버전의 글에 있던 기록만 남기고 뒤에 더한 기록은 지움 표시로 (2026-11-27)
    rec[k]=v; if(v) touched.add(k); });
  rec.stage = target.stage && target.stage!==stageAuto(rec) ? target.stage : '';   // 결제로 정해지는 단계와 다를 때만 직접 고른 단계
  nContacts=Math.max(1,nContactsOf(rec)); renderContacts(); renderForm();
  await save({revert:label});
};
// 헤더의 영업 담당: 이 컴퓨터에 기억, 새 예약의 담당이 됨, 수정 기록에 이 이름이 남음
(()=>{ const el=$('#f_owner'), wrap=el.closest('.me');
  const paint=()=>wrap.classList.toggle('empty', !el.value.trim());
  el.value=savedOwner(); paint(); const mn=$('#meName'); if(mn) mn.textContent=savedOwner()||'(로그인 필요)';   // 영업 담당 = 로그인한 이름 (첫 화면에서 로그인)
  el.addEventListener('input', ()=>{ try{ localStorage.setItem('sayuwon_owner', el.value.trim()); }catch(_){} if(!editingId) rec.owner=el.value.trim(); paint(); renderSide(); });
})();
// 맨 위 예약 단계 줄의 미정 항목 입력 기한
$('#f_tbdDate').addEventListener('input', e=>{ rec.tbdDate=e.target.value; tbdAuto=false; touched.add('tbdDate'); startTimer(); paintFields(); renderSide(); });

