// ▣ js/group/17-dev-fake.js — 시험용: 가짜 예약 채우기 · 비우기 (테스트 DB · 가짜 DB 에서만 · 배포 DB 에 샌 가짜 예약 청소)
// ===== 시험용 모드 전용: 가짜 예약 채우기 · 비우기 (2026-11-25) =====
//  주소 끝 ?mock=1 로 켠 시험용 모드(js/devcf.js · 이 브라우저 안의 가짜 DB)에서만 보임 — 진짜 기록(공유 DB)에는 절대 쓰지 않음
//  단체 화면 · 예약 현황 공유 오른쪽 아래 「가짜 예약 채우기」: 단체 예약 약 210건 · 11 ~ 12월은 날마다 0 ~ 7건 · 그 밖(1년 전 ~ 다음 해 2월)은 드문드문 (모두 관람 또는 관람+식사 · 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 · 여러 담당 · 지난 날짜 섞임)
//  「가짜 예약 비우기」: id 가 tst001 ~ (2026-11-25 예전 fake001 ~ 도) 인 것만 지움 (원래 있던 가상 예약 mock0001 등은 그대로)
//  id 를 fake··· → tst··· 로 바꾼 까닭 (2026-11-25): 예전 버전으로 열려 있던 창 · 첫 화면이 fake··· 를 「진짜 DB 에 샌 가짜」로 알고 테스트 DB 에서도 지워서 채운 것이 자꾸 사라짐 → 예전 버전이 모르는 이름으로
// 진짜 DB 청소 (2026-11-25 사고): 테스트 사이트의 시험용 모드에서 만든 가상 예약(mock0001 ~ · fake001 ~)이 같은 브라우저 저장소를 타고 진짜 DB 에 올라감
//  → 진짜 서버로 도는 단체 화면을 누가 열든, 목록에 그런 id 가 있으면 지움 (그 id 는 시험용 DB 만 만듦 · 진짜 예약 id 는 시각으로 만든 다른 모양) · 저장 대기열에 남은 것도 버림
(function(){
  if(typeof SY_DB_NAME==='undefined' || SY_DB_NAME!=='배포 DB') return;   // 청소는 배포 DB 에서만 (테스트 DB · 시험용 DB 의 가짜 예약은 그대로)
  const FAKE=/^(mock\d{4}|fake\d{3}|tst\d{3})$/;
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
  // 날짜 (2026-11-25 다시 · 테스트를 11 ~ 12월에서 하므로): 올해 11월 1일 ~ 12월 31일은 날마다 0 ~ 7건 (없는 날 · 1건 · … · 가장 많은 날 7건이 고루 섞임)
  //  그 밖은 드문드문: 1년 전 11월 ~ 올해 10월은 9일에 1건 · 다음 해 1 ~ 2월은 6일에 1건. 누를 때마다 같은 날짜가 나옴 (난수 없음)
  const FAKE_DATES=(()=>{ const out=[], t=new Date(), y=t.getMonth()<6 ? t.getFullYear()-1 : t.getFullYear(), W=[0,1,1,2,2,3,3,4,0,5,2,6,1,7,3,4];
    const add=(d,c)=>{ for(let k=0;k<c;k++) out.push(SY.ymd(d)); };
    for(let d=new Date(y-1,10,1), k=0; d<new Date(y,10,1); d.setDate(d.getDate()+1), k++) if(k%9===4) add(d,1);
    for(let d=new Date(y,10,1), k=0; d<new Date(y+1,0,1); d.setDate(d.getDate()+1), k++) add(d, W[(k*7+3)%16]);
    for(let d=new Date(y+1,0,1), k=0; d<new Date(y+1,2,1); d.setDate(d.getDate()+1), k++) if(k%6===2) add(d,1);
    return out; })();
  const FAKE_N=FAKE_DATES.length;
  function fakeRec(i){
    const people=10+((i*7)%31), owner='테스트';   // 영업 담당 = 테스트 (2026-11-25 · 테스트 멤버로 로그인해 모두 고쳐 보게 · 프로그램 담당은 여러 이름 그대로)
    const date=FAKE_DATES[i], tin=pick(TIMES,i);
    const x={ org:pick(ORGS,i)+(i>=ORGS.length?` ${Math.floor(i/ORGS.length)+1}차`:''), date, owner, people:String(people), contact:'가짜 담당 '+(i+1), phone:`010-9${String(1000+i).slice(-3)}-${String(2000+i)}`,
      tin, tout:'16:00', pay:i%3?'결제링크':'현장 결제', note:'가짜 예약 (시험용)' };
    // 모든 예약에 관람 또는 관람+식사 (2026-11-25): 관람만 · 관람+사담 런치1부 · 관람 일부 + 관람+사담 런치2부 · 관람+사담 디너 — 방문일 평일 / 주말·공휴일, 입장 13시 이후면 13~18시 관람권
    const dayName=typeof isRedDay==='function' && isRedDay(date) ? '주말/공휴일' : '평일', vt=(parseInt(tin)||0)>=13 ? '13:00~18:00' : '09:00~18:00', vsrc=`${dayName} 관람(${vt})`;
    const kind=i%4, part=Math.max(5, Math.round(people/2));
    if(kind===0) x.views=`${vsrc} x${people}`;
    else if(kind===1) x.sadam1=String(people);
    else if(kind===2){ x.sadam2=String(part); x.views=`${vsrc} x${people-part}`; }
    else x.sadamD=String(people);
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
    for(let i=0;i<n;i++){ const x=fakeRec(i), past=x.date<todayYmd(), stage=past ? (i%13===0?'예약취소':'예약확정') : i%6===5?'예약상담':i%3===2?'가예약':'예약확정';   // 지난 예약은 거의 예약확정 · 가끔 예약취소
      if(stage==='예약취소') x.cancelWhy='가짜 예약 (시험용 취소)';
      if(i%10===0) toast(`가짜 예약 넣는 중 · ${i}/${n}`, 1500);
      const item={...x, ...packExtra(x), callType:stage, summary:`가짜 예약 ${i+1}`, takenBy:x.owner, callStart:now, id:'tst'+String(i+1).padStart(3,'0'), saved:now, history:h};
      await store.put(item); }   // 화면이 저장할 때와 같은 모양 (칸 + packExtra 로 묶은 비고)
    await synced();
  }
  const synced = async () => { for(let i=0;i<1200 && pending.length;i++){ await new Promise(r=>setTimeout(r,250)); if(pending.length && i%8===7) flush(); } };   // 가짜 DB에 다 들어갈 때까지
  async function clear(){ const L=(cache||[]).filter(r=>/^(fake|tst)\d+$/.test(r.id)); for(const r of L) await store.del(r.id); await synced(); return L.length; }
  function bar(){ if(document.getElementById('fakeBar')) return; const b=document.createElement('div'); b.id='fakeBar';
    b.innerHTML='<b>'+(window.SY_CF?'시험용':'테스트 DB')+'</b><button type="button" class="btn primary" data-fake="fill" title="단체 예약 '+FAKE_N+'건 · 11 ~ 12월은 날마다 0 ~ 7건 · 그 밖은 드문드문 · 모두 관람 또는 관람+식사 (지금 DB 에만 · 배포 DB 에는 안 감 · 4~5분 걸림)">가짜 예약 채우기</button><button type="button" class="btn primary" data-fake="clear" title="가짜 예약(tst… · 예전 fake…)만 지움">가짜 예약 비우기</button>';
    document.body.appendChild(b); }
  document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-fake]'); if(!b) return; b.disabled=true;
    try{ if(b.dataset.fake==='fill'){ await fill(FAKE_N); toast(`가짜 예약 ${FAKE_N}건을 넣었습니다. 다시 불러옵니다.`); }
      else { const n=await clear(); toast(`가짜 예약 ${n}건을 지웠습니다. 다시 불러옵니다.`); }
      setTimeout(()=>location.reload(), 700); }
    catch(er){ b.disabled=false; toast('못 했습니다: '+(er.code||er.message)); console.error(er); } });
  if(document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
})();
