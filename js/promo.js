// ===== 운영보조 › 기업 프로모션 할인 (promo.html · 2026-11-24) =====
// 표 = 구분(신규 · 연장 · 유지) · 업체명(오름차순) · 대상 인원 · 할인 코드 · 증빙 확인 · 허용 인원 · 기간 · 사유원 할인(관람 · 식사 등) · 몽몽차방 · 몽몽마방 · 가가빈빈 · 업체 할인 · 기타 · [만료]
//  칸을 눌러 바로 고치기 · ＋ 추가 · × 삭제 (js/stable.js) — 공유 기록 한 줄 id promodb · 통화 구분 「기업프로모션」 {rows, acks:{줄id:{m2, m1}}, log}
//  만료: 기간 글자에서 끝나는 날을 읽어(opslib.js opsPeriod) 남은 날 · 만료 2달 전 · 1달 전이 되면 첫 화면 공통 업무에 알림(「확인」을 누르면 그 알림은 끝) · 캘린더에 시작 · 만료 표시
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2800) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  let askFn=null; const ask=(html, fn, yes='삭제')=>{ $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; };
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; }; $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  const R = (id, tag, name, target, code, proof, ppl, period, view, food, cha, ma, gaga, corp, etc) => ({id, tag, name, target, code, proof, ppl, period, view, food, cha, ma, gaga, corp, etc});
  // 처음 내용 (2026-11-24 받은 표)
  const SEED = [
    R('p01','신규','아트앤힐링스테이','예약고객','','','','2026.09.15(화)~12.27(일)','','','','','','',''),
    R('p02','신규','롯데백화점 대구점, 상인점 VIP 고객','2,200명','LOTTEDEPARTD26-대구점\nLOTTEDEPARTS26-상인점','롯데백화점 APP 내 VIP 회원 또는\n라운지 이용 대상 화면 확인','동반 1인 포함 4명까지','26.09.01(화)~26.12.31(목)','10%','10%','','','','',''),
    R('p03','신규','한국지능정보사회진흥원','700명','NIASAYU26','*현장 할인 적용 시\n현장에서 사원증, 명함을 통해 신분 확인 진행\n*온라인 예약 시\n사전 발급된 할인 코드로 예약 후,\n현장에서 사원증, 명함을 통해 신분 확인 진행','동반 1인 포함 4명까지','26.09.01(화)~27.09.30(목)','10%','10%','','','','',''),
    R('p04','신규','현대백화점 VIP 고객 전 지점','','thehyundai2026','현대백화점 APP 내 등급 인증\n(더현대 대구 쟈스민 회원)','동반 1인 포함 총 2명까지','26.05.18(월)~26.12.31(목)','10%','','모과차 1잔','','','',''),
    R('p05','신규','현대백화점 전 지점 직원 및 협력사','','thehyundai2026','1. 현대백화점 통합인사 시스템(현대백화점 전 지점 임직원)\n2. H.Partners 앱 화면 인증(현대백화점 전 지점 협력사)','동반 1인 포함 총 2명까지','26.05.18(월)~26.12.31(목)','10%','','모과차 1잔','','','',''),
    R('p06','신규','천주교 대구대교구 성직자·수도자·신학생 관람료 면제','','','신분 확인 후','본인만 허용','26.05.11(월)','무료 입장','','','','','',''),
    R('p07','신규','국립백두대간수목원','','','할인 티켓','티켓 소지 전원','26.03.28(토)~27.12.31(금)','10%','','','','','','국립세종수목원(세종), 한국자생식물원(평창), 국립정원문화원(담양) 포함'),
    R('p08','신규','대구소방안전본부','3,000명','FAS2026SS','공무원증','동반 3인 포함 총 4명까지','26.03.16(월)~28.03.15(수)','20%','-','-','-','','-','인허가'),
    R('p09','신규','간송미술관','','kansong26ss','할인 티켓','사유원->간송 고객 기획전 관람료 30% 할인\n간송->사유원 관람료 15% 할인','26.09.23(화)~26.12.31(목)','15%','','','','','',''),
    R('p10','신규','대구시청공무원노동조합','3,000명','DAEGUGE2026','사원증, 재직증명서','동반 1인 포함 총 2명까지','26.01.20(화)~26.12.31(목)','10%','-','-','-','','-','-'),
    R('p11','신규','대구교통공사','3,300명','dtro26ssfw','사원증, 명함 등','동반 1인 포함 총 2명까지','26.01.01(목)~26.12.31(목)','20%','-','-','-','vip: 모과차 바우처','-','12개월 광고'),
    R('p12','신규','프린트베이커리','2,000명','pb26ssfw','모바일 멤버십','동반 1인 포함 총 2명까지','26.01.01(목)~26.12.31(목)','10%','-','아메 1잔','-','','-','-'),
    R('p13','연장','경주엑스포대공원','450,000명','GYEONGJUEXPO25S','경주엑스포 티켓','동반 1인 포함 총 2명까지','26.03.01(월)~26.12.31(목)','10%','-','-','-','','-','-'),
    R('p14','유지','메르세데스 벤츠','180,000명','MERCEDESBENZ25F','메르세데스 벤츠-미 케어\n어플리케이션 화면 제시','동반 1인 포함 총 2명까지','25.09.01(월)~27.08.31(화)','10%','-','아메 1잔','-','','-','-'),
    R('p15','유지','오레브리조트(제주)','150명','oreve2526','실물 회원 카드','동반 1인 포함 총 2명까지','25.03.01(토)~26.12.31(목)','10%','10%','-','-','','-','-'),
    R('p16','유지','무브먼트랩(가구편집숍)','6,800명','CLUBML25A','어플 회원 확인\n(클럽무브먼트, 유료)','동반 1인 포함 총 2명까지','26.01.01(수)~26.12.31(수)','10%','10%','-','-','','-',''),
  ];
  const COLS = [{k:'tag',l:'구분',cls:'nw'},{k:'name',l:'업체명',cls:'nm'},{k:'target',l:'대상 인원',cls:'nw'},{k:'code',l:'할인 코드',cls:'code'},{k:'proof',l:'증빙 확인',cls:'wide'},{k:'ppl',l:'허용 인원'},{k:'period',l:'기간',cls:'nw'},
    {k:'view',l:'관람',cls:'pct'},{k:'food',l:'식사 등',cls:'pct'},{k:'cha',l:'몽몽차방',cls:'pct'},{k:'ma',l:'몽몽마방',cls:'pct'},{k:'gaga',l:'가가빈빈',cls:'pct'},{k:'corp',l:'업체 할인'},{k:'etc',l:'기타',cls:'wide'}];
  const today = () => opsToday();
  const dday = to => Math.round((new Date(to+'T00:00') - new Date(today()+'T00:00'))/864e5);
  let T=null;
  function expCell(r){ const p=opsPeriod(r.period); if(!p.to) return `<td class="exp"><span class="hint">${p.from?'끝 없음':''}</span></td>`;
    const d=dday(p.to), acks=(T && T.data().acks||{})[r.id]||{}, al=opsPromoAlerts({rows:[r], acks:(T && T.data().acks)||{}}, today()).filter(a=>a.due<=today());
    const cls = d<0 ? 'over' : d<=31 ? 'red' : d<=62 ? 'warn' : '';
    return `<td class="exp ${cls}"><b>${d<0?`만료 ${-d}일 지남`:d===0?'오늘 만료':`D-${d}`}</b><small>${esc(opsDateLabel(p.to))}</small>`
      + al.map(a=>`<button type="button" class="btn sm pm-ack" data-ack="${esc(r.id)}|${a.kind}" title="공통 업무 알림을 끝냄">${a.label} 확인</button>`).join('')
      + (acks.m1 ? '<small class="hint">알림 확인함</small>' : acks.m2 ? '<small class="hint">2달 전 확인함</small>' : '') + `</td>`; }
  T = syTable({ id:'promodb', type:'기업프로모션', cols:COLS, seed:SEED, nameKey:'name', focusKey:'name', blank:{tag:'신규'},
    sort:(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'),   // 업체명 오름차순
    extraHead:'<th class="exp">만료</th>', extraCell:expCell, toast, ask,
    el:{table:'#tbl', add:'#addBtn', q:'#q', st:'#st', sum:'#sum', log:'#log'} });
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-ack]'); if(!b) return; const [id,k]=b.dataset.ack.split('|'), r=T.data().rows.find(x=>x.id===id); if(!r) return;
    T.change(d=>{ d.acks=d.acks||{}; d.acks[id]={...(d.acks[id]||{}), [k]:{at:new Date().toISOString(), by:user.name||''}}; if(k==='m1') d.acks[id].m2=d.acks[id].m2||d.acks[id].m1; return d; }, `알림 확인: ${String(r.name).split('\n')[0]} ${k==='m2'?'2달 전':'1달 전'}`)
      .then(ok=>{ if(ok) toast('알림을 확인했습니다 · 공통 업무에서 빠집니다.'); }); });
})();
