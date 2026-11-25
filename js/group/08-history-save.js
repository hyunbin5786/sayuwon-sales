// ▣ js/group/08-history-save.js — 수정 기록(무엇이 바뀌었나 · 되돌리기) · 저장(save) · 30초 자동 저장 · 저장 안 한 표시 · 나갈 때 확인
// ===================== 수정 기록 =====================
// 저장할 때마다 바뀐 항목을 시각·영업 담당과 함께 남긴다 (시트 '수정 기록' 칸에 JSON)
const mealSum = r => [r.sadam1&&`사담1부 ${r.sadam1}`, r.sadam2&&`사담2부 ${r.sadam2}`, r.sadamD&&`사담디너 ${r.sadamD}`, r.mabangL&&`마방 ${r.mabangTime?r.mabangTime+' ':''}${r.mabangL}`, r.mabangD&&`마방디너 ${r.mabangD}`].filter(Boolean).join(" · ") || r.meal || "";
Object.assign(LABEL, { etcDisc:'기타 할인', etcDiscTo:'기타 할인 대상', etcDiscWhy:'기타 할인 사유', etcDiscTx:'기타 할인 과세(신라)', etcDiscTf:'기타 할인 비과세(사유원)', erpList:'전산 내역', tour:'사전 답사', tbd:'미정 체크', tbdLate:'답변일 늦춘 사유', stage:'예약 단계', erp:'전산 등록', note:'통화 메모' });
function snap(){
  const o={}; allKeys().forEach(k=>{ if(k!=='owner') o[k]=rec[k]||''; });
  o.tbd=rec.tbd||''; o.tbdLate=rec.tbdLate||''; if(typeof SPECIAL!=='undefined') SPECIAL.forEach(s=>o[s.k]=rec[s.k]||'');
  o.stage=effStage(rec); o.erp=rec.erp||''; o.note=$('#memoBox').value.trim();
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
    if(k==='note'){ out.push('통화 메모 수정'); return; }
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
function parseHist(r){ try{ const j=JSON.parse(r.history||'[]'); return Array.isArray(j) ? {h:j, tasks:[], erp:[], memos:[]} : {h:j.h||[], tasks:j.tasks||[], erp:j.erp||[], memos:j.memos||[]}; }catch(_){ return {h:[], tasks:[], erp:[], memos:[]}; } }   // memos: 담당이 아닌 사람이 남긴 메모 [{id,t,by,text,seen,seenAt}]
// ---- 바뀐 값의 흐름 (ch): {칸: [처음 값, 다음 값, …]} → "관람 인원 20 → 22 → 25". 자동 저장이 여러 번이어도 한 줄에 모든 변경이 남고, 되돌리기에도 씀
const fmtTime_ = t => dtLabel(t);
function chText(k, c){
  const x=c[0]||'', y=c[c.length-1]||'';
  if(k==='note') return '통화 메모 수정';
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
  if(lockOwner) return saveLockedParts();   // 남이 담당인 예약: 예약 전체는 저장 안 함 — 통화 메모 · 내가 담당자인 과업만 (2026-11-24 · 15-lock-popups.js)
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
  const item={...rec, ...j, ...packExtra(rec), callType:effStage(rec), summary:autoSummary(), note:$('#memoBox').value, takenBy:rec.owner,
    callStart:startedAt?startedAt.toISOString():'', id:editingId||(Date.now().toString(36)+Math.random().toString(36).slice(2,5)), saved:now, history:JSON.stringify({h:newHist, tasks, erp:erpList, memos:mergeMemos(memos, parseHist(cache.find(x=>x.id===editingId)||{}).memos)})};   // 메모: 그사이 남이 남긴 것까지 합침
  // 구글 시트 칸 하나에는 5만 자까지만 들어감 → 수정 기록이 너무 길면 처음 저장 줄은 두고 오래된 기록부터 덜어 냄 (넘으면 저장이 계속 실패함)
  { const h2=fitHist(item); if(h2) newHist=h2; }
  Object.keys(item).forEach(k=>{ if(isCKey(k)) delete item[k]; });
  delete item.tbd; delete item.stage; delete item.erp; delete item.tbdDate; delete item.tbdLate; delete item.payContact;
  saving=true;
  try{ await store.put(item); editingId=item.id; openedRaw=rawPick(item); openedObj=liveVals(item); hist=newHist; baseSnap=cur;
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
    if(k==='note'){ $('#memoBox').value=v; return; } rec[k]=v; if(v) touched.add(k); });
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

