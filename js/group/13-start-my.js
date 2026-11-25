// ▣ js/group/13-start-my.js — 시작(처음 한 번 그리기 · 받기) · 내가 영업 담당인 예약 고르기(myRecords) · 저장된 과업 맞추기
// ===================== 시작 =====================
resetState(); buildForm(); mergePriceLayout(); renderForm();
paintSync(); renderList();
flush();
window.__priceReady=true; renderPrice(); loadQuotePrices();
// ===================== 공통: 저장된 예약 하나 읽기 =====================
const xOf = r => ({...r, ...unpackExtra(r)});   // 비고 칸에 모아 둔 값(미정 · 입력 기한 등)까지 펼침
const stageOfRec = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약확정' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto(xOf(r));
const isGroupRec = r => ['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약');
const ownerOf = r => (r.owner||r.takenBy||'').trim();
const daysFrom = (a,b) => Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);   // a → b 며칠
const firstContact = r => { const n=String(r.contact||'').split(/\s*\/\s*/)[0]||'', p=String(r.phone||'').split(/\s*\/\s*/)[0]||''; return n||p ? `${n}${p?`(${p})`:''}` : ''; };

// ===================== 나의 할일: 내가 영업 담당인 예약 =====================
// 헤더 '영업 담당' 이름과 같은 예약만. 연락할 미정 항목 · 남은 과업 · 방문 예정 순서로
function myRecords(){ const me=savedOwner(); return me ? (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me) : []; }
// 열어 둔 예약의 과업 상태(화면에서 저절로 완료 · 정리된 것)가 저장된 것과 다르면, 과업만 조용히 저장 (2026-11-18)
//  - 다른 칸은 건드리지 않고 수정 기록에도 남기지 않음 · 고치는 중(저장 안 한 변경)이면 원래 저장 때 함께 · 남이 담당 · 다른 창에서 고치는 중이면 안 함
function syncSavedTasks(id){
  if(editingId!==id || lockOwner || editLockBy || isDirty()) return;
  const r=cache.find(x=>x.id===id); if(!r) return;
  const ph=parseHist(r), clean=ts=>JSON.stringify((ts||[]).map(t=>({id:t.id, done:!!t.done, removed:!!t.removed})));
  if(clean(ph.tasks)===clean(tasks)) return;
  let old={}; try{ old=JSON.parse(r.history||'{}')||{}; }catch(_){}
  const item={...r, history:JSON.stringify({...old, h:ph.h, tasks, erp:ph.erp, memos:ph.memos})};
  store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
}
// 저장된 과업을 추후 과업 칸(화면)과 같은 기준으로 맞춤 (2026-11-18): 화면에서 저절로 완료된 과업이 저장 전이라 나의 할일 · 알림에 「오늘 마감」으로 남던 것
//  - 삭제한 과업(removed) 빼기 · 전산 예약 = 전산 등록 · 결제링크 전송 = 전송 일시 · 입금 확인 = 입금 일시 · 프로그램 담당 = 담당이 다 차면
//  - 견적서 · 거래명세서 등 하위 과업이 모두 체크되면 완료 · 예전 기준(담당자 이름 등)으로 생긴 전산 예약 수정은 빼기
function settleTasks(list, r, x){
  return (list||[]).filter(t=>!t.removed)
    .filter(t=>!(t.id==='erpfix' && !t.done && !(t.v===4 && (t.changes||[]).length) && !(t.changes||[]).some(c=>/전산 비고/.test(c)) && !t.memo && !(t.xsubs||[]).length))
    .map(t=>{ const u={...t};
      if(u.id==='staffbrief' && !u.dueSet && !u.done && r && r.date) u.due=staffFri(r.date);   // 열지 않은 예약도 방문 전주 금요일 (2026-11-21 · 직접 바꾼 마감은 그대로)
      if(u.id==='erp') u.done = !!u.done || !!x.erp || /^adm/.test(r.id);   // 저장된 체크가 먼저 (2026-11-23)
      else if(u.id==='linksend') u.done = !!u.done || !!x.linkSent;
      else if(u.id==='paycheck'){ if(x.paidAt) u.done=true; }
      else if(u.id==='progstaff'){ if(!u.done){ try{ u.done = !missingStaff(x).length; }catch(_){} } }
      else { const ds=DOC_SUBS[u.id], st=[...(ds && u.subs ? ds.map(([k])=>!!u.subs[k]) : []), ...(u.xsubs||[]).map(s=>!!s.done)]; if(st.length && st.every(Boolean)) u.done=true; }
      return u; });
}
