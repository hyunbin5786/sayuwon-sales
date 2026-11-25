// ===== 시험용 모드 전용: 가짜 예약 채우기 · 비우기 (2026-11-25) =====
//  주소 끝 ?mock=1 로 켠 시험용 모드(js/devcf.js · 이 브라우저 안의 가짜 DB)에서만 보임 — 진짜 기록(공유 DB)에는 절대 쓰지 않음
//  예약 현황 공유 · 단체 화면 왼쪽 아래 「가짜 예약 채우기」: 오늘 앞뒤 몇 주에 단체 예약 40건 (몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 · 여러 담당 · 지난 날짜 섞임)
//  「가짜 예약 비우기」: id 가 fake 로 시작하는 것만 지움 (원래 있던 가상 예약 mock0001 등은 그대로)
// 진짜 DB 청소 (2026-11-25 사고): 테스트 사이트의 시험용 모드에서 만든 가상 예약(mock0001 ~ · fake001 ~)이 같은 브라우저 저장소를 타고 진짜 DB 에 올라감
//  → 진짜 서버로 도는 단체 화면을 누가 열든, 목록에 그런 id 가 있으면 지움 (그 id 는 시험용 DB 만 만듦 · 진짜 예약 id 는 시각으로 만든 다른 모양) · 저장 대기열에 남은 것도 버림
(function(){
  if(typeof SY_DB_NAME==='undefined' || SY_DB_NAME!=='배포 DB') return;   // 청소는 배포 DB 에서만 (테스트 DB · 시험용 DB 의 가짜 예약은 그대로)
  const FAKE=/^(mock\d{4}|fake\d{3})$/;
  // 2026-11-25 고침: 한 번만 돌던 것을 계속 (예전 코드로 열려 있던 창이 다시 올려도 또 지움) · 지운 것은 화면 목록에서 바로 뺌 · 열어 둔 게 가상 예약이면 새 화면으로
  const sent={};   // id → 지우라고 보낸 시각 (같은 것을 2분 안에 또 보내지 않음)
  let busy=false;
  const sweep=async ()=>{ if(busy || !window.__tasksReady || !Array.isArray(cache)) return; busy=true;
    try{ const before=pending.length; pending=pending.filter(p=>!(p.action==='put' && p.item && FAKE.test(String(p.item.id)))); if(pending.length!==before) writeJSON(PEND_LS, pending);
      const L=cache.filter(r=>FAKE.test(String(r.id)));
      for(const r of L){ if(Date.now()-(sent[r.id]||0) < 120e3) continue; sent[r.id]=Date.now(); await store.del(r.id); console.info('[청소] 시험용 가상 예약을 진짜 DB 에서 지움:', r.id, r.org||r.contact||''); }
      if(L.length){ cache=cache.filter(r=>!FAKE.test(String(r.id))); if(typeof renderList==='function') try{ renderList(); }catch(_){} }
      if(typeof editingId!=='undefined' && FAKE.test(String(editingId||''))){ location.replace('group.html'); }
    }catch(e){ console.warn('[청소] 실패', e); } finally{ busy=false; } };
  setInterval(sweep, 5000);
})();
(function(){
  if(!window.SY_CF && !(typeof SY_DB_NAME!=='undefined' && SY_DB_NAME==='테스트 DB')) return;   // 시험용 DB · 테스트 DB 에서만 (배포 DB 에서는 아무것도 안 함 · 2026-11-25 테스트 DB 도)
  const ORGS=['대구시교육청','중앙교육연수원','대구정책연구원','한국은행 대구본부','경북대학교 평생교육원','영남일보 독자모임','포항제철 신우회','안동시청 문화과','계명대 경영학과','대구가톨릭대 동문회','칠곡군 여성단체','삼성전자 구미 동호회','대구은행 퇴직자회','경산시 노인복지관','청송 산림조합','군위군청 관광과'];
  const STAFF=['문현빈','김수정','사공유빈','김사유','이정원','박도슨트'];
  const MENUS=['사유의 밥상','몽몽 정식','사유의 밥상(단체)','몽몽 도시락'];
  const TIMES=['09:30','10:00','10:30','11:00','13:00','13:30','14:00','15:00'];
  const pick=(a,i)=>a[i%a.length];
  const day=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return SY.ymd(d); };
  function fakeRec(i){
    const people=10+((i*7)%31), off=-10+((i*5)%45), owner=pick(STAFF,i+1);
    const x={ org:pick(ORGS,i)+(i>=ORGS.length?` ${Math.floor(i/ORGS.length)+1}차`:''), date:day(off), owner, people:String(people), contact:'가짜 담당 '+(i+1), phone:`010-9${String(1000+i).slice(-3)}-${String(2000+i)}`,
      tin:pick(TIMES,i), tout:'16:00', pay:i%3?'결제링크':'현장 결제', note:'가짜 예약 (시험용)' };
    // 다섯 목록에 고루: 몽몽마방 · 대관(차방 · 당두봉갈) · 도슨트(동행 · 세미나) · 프로그램(요가 · 사운드워킹 · 사유의 향) · 음료쿠폰(가가빈빈)
    if(i%2===0){ x.mabangL=String(people); x.mabangTime=pick(['12:00','12:30','11:30'],i); x.mabangMenu=pick(MENUS,i); }
    if(i%4===1){ x.chabang='2'; x.tm_chabang=pick(TIMES,i+2); x.stf_chabang=pick(STAFF,i+2); }
    if(i%5===2){ x.dangdu='1'; x.tm_dangdu=pick(TIMES,i+3); x.stf_dangdu=pick(STAFF,i+3); }
    if(i%3===0){ x.donghaeng='1'; x.tm_donghaeng=pick(TIMES,i+1); x.stf_donghaeng=pick(STAFF,i); x.crs_donghaeng=pick(['앵당','치허문'],i); }
    if(i%7===3){ x.seminar='1'; x.tm_seminar='15:00'; x.stf_seminar=pick(STAFF,i+4); x.plc_seminar='당두봉갈'; }
    if(i%3===1){ const k=pick(['yoga','sound','scent'],i); x[k]=String(Math.min(people,20)); x['tm_'+k]=pick(TIMES,i+5); x['stf_'+k]=pick(STAFF,i+5); }
    if(i%4===2){ x.gaga=String(people); x.stf_gaga=pick(STAFF,i); }
    return x;
  }
  async function fill(n){
    const now=new Date().toISOString(), h=JSON.stringify({h:[{t:now, by:'시험', what:'가짜 예약 (시험용)'}], tasks:[], erp:[], memos:[]});
    for(let i=0;i<n;i++){ const x=fakeRec(i), stage=i%6===5?'예약상담':i%3===2?'가예약':'예약확정';
      const item={...x, ...packExtra(x), callType:stage, summary:`가짜 예약 ${i+1}`, takenBy:x.owner, callStart:now, id:'fake'+String(i+1).padStart(3,'0'), saved:now, history:h};
      await store.put(item); }   // 화면이 저장할 때와 같은 모양 (칸 + packExtra 로 묶은 비고)
    await synced();
  }
  const synced = async () => { for(let i=0;i<360 && pending.length;i++){ await new Promise(r=>setTimeout(r,250)); if(pending.length && i%8===7) flush(); } };   // 가짜 DB에 다 들어갈 때까지
  async function clear(){ const L=(cache||[]).filter(r=>/^fake\d+$/.test(r.id)); for(const r of L) await store.del(r.id); await synced(); return L.length; }
  function bar(){ if(document.getElementById('fakeBar')) return; const b=document.createElement('div'); b.id='fakeBar';
    b.innerHTML='<b>'+(window.SY_CF?'시험용':'테스트 DB')+'</b><button type="button" class="btn primary" data-fake="fill" title="오늘 앞뒤 몇 주에 단체 예약 40건 (지금 DB 에만 · 배포 DB 에는 안 감)">가짜 예약 채우기</button><button type="button" class="btn primary" data-fake="clear" title="가짜 예약(fake…)만 지움">가짜 예약 비우기</button>';
    document.body.appendChild(b); }
  document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-fake]'); if(!b) return; b.disabled=true;
    try{ if(b.dataset.fake==='fill'){ await fill(40); toast('가짜 예약 40건을 넣었습니다. 다시 불러옵니다.'); }
      else { const n=await clear(); toast(`가짜 예약 ${n}건을 지웠습니다. 다시 불러옵니다.`); }
      setTimeout(()=>location.reload(), 700); }
    catch(er){ b.disabled=false; toast('못 했습니다: '+(er.code||er.message)); console.error(er); } });
  if(document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
})();
