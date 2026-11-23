// ===================== 추후 과업 =====================
// 예약 단계·결제 방식에 따라 자동으로 생기는 과업 + 직접 추가한 과업. 과업마다 체크 · 메모
// ---- 사전답사 정보 (rec.tour = "성명: 홍길동, 연락처: 010-…, 일자: 2026-12-01, 인원: 2명, 시간: 10:00") ----
// 단체상담 입력의 '답사 요청 정보' · 예약 내용의 「사전답사」 팝업이 같은 칸에 씀. 성명 · 연락처가 비면 담당자(첫 줄) 이름 · 연락처
const TOUR_KEYS = [['name','성명',/성명|이름|신청자|담당자/],['phone','연락처',/연락처|전화|휴대|핸드폰/],['date','일자',/일자|날짜|일시|답사일/],['people','인원',/인원/],['time','입장시각',/입장|시간|시각/]];   // 시간 → 입장시각 (2026-11-17, 예전 '시간'도 읽음)
function tourParse(s){ const o={extra:[]}; String(s||'').split(/\s*,\s*/).filter(Boolean).forEach(p=>{ const m=p.match(/^([^:：]+?)\s*[:：]\s*(.*)$/); const hit=m && TOUR_KEYS.find(([,,re])=>re.test(m[1]));
    if(hit && !o[hit[0]]) o[hit[0]]=m[2].trim(); else o.extra.push(p.trim()); }); return o; }
function tourJoin(o){ return [...TOUR_KEYS.filter(([k])=>String(o[k]||'').trim()).map(([k,l])=>`${l}: ${String(o[k]).replace(/\s*,\s*/g,' ').trim()}`), ...(o.extra||[])].join(', '); }
function tourWithDefaults(r, s){ const o=tourParse(s), c=contactsOf(r)[0]||{}, org=String(r.org||'').trim();   // 성명 = 단체명(성명), 기본은 담당자
  if(!o.name && c.name) o.name=c.name; if(o.name && org && !o.name.includes(org)) o.name=`${org}(${o.name})`; if(!o.name && org) o.name=org;
  if(!o.phone && c.phone) o.phone=c.phone; return o; }
const tourPeople = r => numOf(tourParse(r.tour).people);
const tourNote = r => { const pay=tourPeople(r)-1; return `${String(r.org||'').trim()||'단체명'} 사전답사${pay>=1?`/${pay}명 현장결제 필요`:''}`; };   // 답사 1명은 무료 → 2명 이상이면 (인원 − 1)명 현장결제 필요 (2026-11-17)
const tourMemo = r => String(r.tour||'').split(/\s*,\s*/).filter(Boolean).join('\n');
const AUTO_TASKS = { erpcheck:'전산 내역 대조 (총 금액 · 할인)', tour:'사전답사 전산 예약', onsitecall:'현장 결제 인원 확인 연락', wkcheck:'다음주 예약 점검', mbcall:'몽몽마방 식당에 시간 확인', mbmenu:'몽몽마방 메뉴 선택', progstaff:'프로그램 · 굿즈 담당 입력', staffbrief:'담당자에게 일정 전달', goodsprep:'굿즈 준비', erp:'전산 예약', erpfix:'전산 예약 수정', quote:'견적서 발급', stmt:'거래명세서 발급', tax:'세금계산서 발행', linksend:'결제링크 전송', paycheck:'입금 확인', clergy:'대구대교구 정보 기입',
  pplchk:PPL_TITLE, erpkeep:'전산 예약을 예약 내용대로 수정' };   // 2026-11-23: 조건이 아니라 「일이 생겼을 때」 만들어지는 자동 과업 두 개도 추후과업 메시지 관리 목록에 (이름 · 마감 · 세부 과업 · 문구 · 끄기)
// ===== 과업이 끝났는지 = 사람이 체크한 것 (2026-11-23) =====
//  - 어느 화면(단체 화면 · 나의 할일 · 알림 · 첫 화면)에서든 체크하면 그 과업은 끝난 것 (t.done + t.manualDone). 코드가 「정말 끝났는지」 다시 따져서 되돌리지 않음
//  - 체크를 막는 것도 없음: 전산 예약 · 전산 예약 수정 · 전산 내역 대조도 전산 내역을 붙여넣지 않아도 체크하면 완료 (붙여넣기는 버튼으로 따로)
//  - 그대로 둔 것: ① 과업이 「생기는」 조건 ② 예약 내용이 바뀌어 조건이 사라지면 저절로 빠지거나 끝남 (담당을 채움 · 메뉴를 고름 · 전산 내역이 맞음 · 예약 내용이 전산에 올린 때로 돌아옴)
//    ③ 체크한 「뒤에」 새 일이 생기면 다시 열림 (새로 바뀐 내용 · 새로 빈 담당 · 새 미정 항목)
// 금액을 사유원(관람)과 신라(관람 외 전부)로 나눔. 관람+식사 패키지는 관람 가격만큼 사유원
// noMb: 몽몽마방 식사 금액은 빼고 (몽몽마방 결제가 '마방' = 손님이 식당에서 결제 → 전산 비고 현장결제 금액에 넣지 않음)
function moneySplit(r, noMb){
  if(r===rec && erpList.length){ const t=erpTotals(); let saw=t.saw, shilla=t.shilla; const E=erpByKey();
    if(noMb && E.m.mb){ const m=erpRowMoney('mb', E.m.mb); saw=Math.max(0, saw-m.tf); shilla=Math.max(0, shilla-m.tx); }
    // 예약 내역에는 있는데 전산 내역에 없는 품목(예: 몽몽마방 식사를 전산에 안 넣음)은 예약 칸으로 계산해 더함 — 관람은 사유원, 그 밖(식사 · 프로그램 · 굿즈)은 신라 (2026-11-16)
    erpMissing().forEach(x=>{ if(noMb && x.key==='mb') return; saw+=x.m.tf; shilla+=x.m.tx; });
    return {saw, shilla, etc:0, missing:false, erp:true}; }   // 전산 내역이 있으면 전산 금액 (세금계산서 문구 등)
  if(!quoteCat || !r.date || !numOf(r.people)) return null;
  const d=new Date(r.date+'T00:00'), viewSrc=viewSrcOf(r), vp=priceOf(viewSrc);
  let saw=0, shilla=0, missing=false;
  const {blocks, skipped} = quoteBlocks(r);
  blocks.forEach(b=>{ if(noMb && (b.key==='mb' || b.product==='몽몽마방 단품')) return; const m=blockMoney(b, r); if(!m){ missing=true; return; } saw+=m.tf; shilla+=m.tx; });   // 줄마다 비과세 = 사유원, 과세 = 신라 (할인 · 직접 고친 할인액 반영)
  void d; void viewSrc; void vp;
  const es=etcSplit(r), etc=es.tx+es.tf; saw=Math.max(0,saw-es.tf); shilla=Math.max(0,shilla-es.tx);   // 기타 할인: 비과세는 사유원, 과세는 신라에서
  return {saw, shilla, etc, missing: missing || skipped.length>0};
}
// 기타 할인: 금액 · 어느 쪽(사유원 / 신라, 기본 신라) · 사유
// 기타 할인: 과세(신라) · 비과세(사유원) 금액을 직접 (예전 기록: 금액 + 대상 신라/사유원 → 그쪽으로)
const numW = v => Math.max(0, parseInt(String(v||'').replace(/\D/g,''))||0);
function etcSplit(r){ let tx=numW(r.etcDiscTx), tf=numW(r.etcDiscTf); if(!tx && !tf && numW(r.etcDisc)){ if(r.etcDiscTo==='사유원') tf=numW(r.etcDisc); else tx=numW(r.etcDisc); } return {tx, tf}; }
const etcAmt = r => { const s=etcSplit(r); return s.tx+s.tf; };
document.querySelectorAll('[data-etc]').forEach(el=>{
  const take=()=>{ const k=el.dataset.etc; let v=el.value;
    if(/^etcDisc(Tx|Tf)$/.test(k)){ v=v.replace(/\D/g,''); if(v!==el.value) el.value=v;
      if(rec.etcDisc){ const o=etcSplit(rec); rec.etcDiscTx=String(o.tx||''); rec.etcDiscTf=String(o.tf||''); rec.etcDisc=''; rec.etcDiscTo=''; touched.add('etcDisc'); } }   // 예전 한 칸 금액은 두 칸으로 옮기고 지움
    rec[k]=v; touched.add(k); startTimer(); renderSide(); };
  el.addEventListener(el.tagName==='SELECT'?'change':'input', take);
});
const memoLines = () => $('#memoBox').value.split('\n').map(s=>s.trim()).filter(Boolean);
// 전산 내역 대조: 예약 내용으로 계산한 총 금액 · 할인 합계 = 전산 내역의 금액 · 할인 합계인지 (할인 버튼 % + 기타 할인 기준, 줄에서 고친 할인액은 넣지 않음)
function erpCheck(){
  if(!erpList.length) return {ok:false, pasted:false};
  const eTot=erpList.reduce((s,x)=>s+(+x.amount||0),0), eDisc=erpList.reduce((s,x)=>s+(+x.disc||0),0);
  if(!quoteCat || !rec.date) return {ok:false, pasted:true, eTot, eDisc, why:'방문일 · 품목 가격이 있어야 대조할 수 있습니다'};
  const plain={...rec, idamt:''}, {blocks, skipped}=quoteBlocks(rec); let tot=0, disc=0, missing=[...skipped];
  blocks.forEach(b=>{ const m=blockMoney(b, plain); if(!m){ missing.push(itemLabel(b.product)); return; } tot+=m.amount; disc+=m.full-m.amount; });
  const etc=etcAmt(rec); tot-=etc; disc+=etc;
  const okTot=Math.abs(tot-eTot)<1, okDisc=Math.abs(disc-eDisc)<1;
  return {ok: okTot && okDisc && !missing.length, pasted:true, tot, disc, eTot, eDisc, okTot, okDisc, missing};
}
const erpCheckHTML = c => !c.pasted ? '' : c.why ? `<span class="ck bad">대조 못 함: ${esc(c.why)}</span>`
  : `<span class="ck ${c.okDisc?'ok':'bad'}">${c.okDisc?'✓':'✗'} 할인 합계 · 예약 ${won(c.disc)}원 / 전산 ${won(c.eDisc)}원</span><span class="ck ${c.okTot?'ok':'bad'}">${c.okTot?'✓':'✗'} 총 금액 · 예약 ${won(c.tot)}원 / 전산 ${won(c.eTot)}원</span>${c.missing&&c.missing.length?`<span class="ck bad">가격 없는 품목: ${esc(c.missing.join(', '))}</span>`:''}`;
// 전산 비고에 붙여넣을 문구
// 2026-11-19 간소화: 「프로그램 / 현장결제 / 도착시간 입장문 (영업 담당)」 — 다음날 고객 응대 준비의 비고와 같은 모양
//  - 도착시간 · 입장문은 꼭 (9시 치허문 · 10:30 곡신문, 입장문을 아직 안 정했으면 「9시 입장」) · 관람만이면 「관람」은 안 씀
//  - 런치 · 디너 · 일출(해오름) · 프로그램(시간 · 코스 · 장소 · 담당은 괄호로) · 현장결제 · 입장 때 확인할 것(특별 할인 증빙 · 학생)만
//  - 금액 · 출입구 미정 · 인원 변경 · 몽몽마방 · 굿즈 · 메모는 넣지 않음. 끝에 항상 (영업 담당 이름)
const erpShortT = t => { const m=String(t||'').replace(/\s/g,'').match(/^(\d{1,2}):?(\d{2})$/); return m ? (m[2]==='00' ? `${+m[1]}시` : `${+m[1]}:${m[2]}`) : String(t||'').trim(); };
// 프로그램 이름은 비고 규칙의 말로 (런치 · 디너 · 일출 · 일몰 · 동행도슨트 · PPT세미나 · 자체세미나) — 대관은 자체세미나(장소)
// 프로그램 시간 (2026-11-19 점검): 정시~정시 범위는 「15-16시」, 그 밖은 시작 시각만 「14:30」 · 「14시」 (규칙 예: 13:30 동행도슨트 / 15-16시 자체세미나)
const erpProgT = t => { const s=String(t||'').replace(/\s/g,''); const m=s.match(/^(\d{1,2})(?::?(\d{2}))?[~\-–](\d{1,2})(?::?(\d{2}))?/);
  if(m){ const z=v=>!v||v==='00'; return z(m[2]) && z(m[4]) ? `${+m[1]}-${+m[3]}시` : erpShortT(`${m[1]}:${m[2]||'00'}`); }
  return erpShortT(s); };
// 도슨트 코스 (2026-11-19 점검): 「앵당삼거리 시작」 → 「앵당~」 (규칙 예: 동행도슨트(앵당~, 김수정해설사))
const erpCrs = c => { const s=crsNorm(c); return s ? s.replace(/삼거리/g,'').replace(/~$/,'')+'~' : ''; };   // 출발지 → 「앵당~」 · 「치허문~」 (2026-11-19)
const ERP_PROG_NAME = { donghaeng:'동행도슨트', seminar:'PPT세미나', seminar2:'PPT세미나', haeorum:'일출', chabang:'자체세미나(차방)', dangdu:'자체세미나(당두)', yoga:'요가', sound:'사운드워킹', scent:'사유의 향' };
function erpNote(r, noMeal){   // noMeal: 「전산 예약 수정」 과업 문구는 런치 · 디너를 뺌 (2026-11-19)
  const items=[];
  // 런치 · 디너는 비고에 안 씀 (2026-11-19 · 상품으로 전산에 있음). noMeal 은 예전 호출 그대로 둠
  FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1]) && r[f[1]] && f[1]!=='gaga').forEach(f=>{   // 음료쿠폰은 굿즈라 뺌
    const k=f[1], sub=p=>String(r[`${p}_${k}`]||'').trim(), name=ERP_PROG_NAME[k] || String(f[2]).replace(/\s+/g,'');
    const paren=[erpCrs(sub('crs')), /\(/.test(name) ? '' : sub('plc')].filter(Boolean).join(', ');   // 괄호 = 도슨트 출발 위치 · 장소만 (담당자는 안 씀, 2026-11-19) · 자체세미나(당두)처럼 이름에 장소가 있으면 장소는 빼고
    items.push([erpProgT(sub('tm')), /\(/.test(name) && paren ? name.replace(/\)$/, `, ${paren})`) : name+(paren?`(${paren})`:'')].filter(Boolean).join(' '));
    if(k==='seminar' && numOf(r.seminar)>=2 && !r.seminar2 && (r.tm_seminar2||r.plc_seminar2)) items.push([erpProgT(r.tm_seminar2), name+(r.plc_seminar2?`(${String(r.plc_seminar2).trim()})`:'')].filter(Boolean).join(' '));
  });
  if(r.pay==='현장 결제' || r.onsite) items.push('현장결제');
  { const all=specialCounts(r), cl=all.find(s=>s.k==='dClergy'), sp=all.filter(s=>s.k!=='dClergy' && s.k!=='dGuide'); sp.forEach(s=>items.push(`${s.short} ${s.n}명 증빙서류 확인`)); if(cl) items.push(`${cl.short} ${cl.n}명 시트기입`); }   // 입장 때 확인할 것
  { const st=viewsParse(r.views).filter(x=>/학생/.test(x.src)).reduce((a,x)=>a+(+x.qty||0),0) + Object.values(istuMap(r)).reduce((a,n)=>a+n,0); if(st) items.push(`학생 ${st}명 확인 필요`); }
  const gate = r.gate && r.gate!=='미정' ? r.gate : '';
  const arrive = r.tin ? `${erpShortT(r.tin)} ${gate || '입장'}` : '';   // 입장문을 아직 안 정했으면 「9시 입장」 · 입장 시간이 미정이면 도착은 안 씀 (2026-11-19)
  // 시간이 적힌 프로그램이 있으면 도착부터 시간 순 (13시 곡신문 / 13:30 동행도슨트 / 15:00 세미나도슨트), 없으면 맨 뒤에 도착 (런치1부 / 현장결제 / 10:30 곡신문)
  const startMin = s => { const m=String(s).match(/^(\d{1,2})(?::(\d\d))?(?=시|\s|-|~)/); return m ? +m[1]*60+(+m[2]||0) : null; };
  const timed=items.filter(s=>startMin(s)!=null), rest=items.filter(s=>startMin(s)==null);
  const parts = timed.length && r.tin ? [...rest, ...[arrive, ...timed].sort((a,b)=>(startMin(a)??-1)-(startMin(b)??-1))] : [...items, arrive].filter(Boolean);
  const who=(r.owner||savedOwner()||'').trim();   // 끝에 항상 (영업 담당 이름)
  if(!r.tin) return '';   // 입장 시간이 미정이면 전산 비고에 남길 것이 없음 (2026-11-19)
  return parts.join(' / ') + (who ? ` (${who})` : '');
}
// 세금계산서 발행 요청 문구
function taxMsg(r){
  const m=moneySplit(r), email=(contactsOf(r).find(c=>c.email)||{}).email;
  return `[세금계산서] ${r.org||'(단체명)'}\n1. 금액\n- 사유원 : ${m?won(m.saw):'      '}원\n- 신라 : ${m?won(m.shilla):'      '}원\n2. 사업자 등록증 : 파일 첨부\n3. 이메일 : ${email||'(담당자 이메일)'}\n4. 발행일 : ${r.date?r.date.replace(/-/g,'.')+' '+dowTag(r.date):'(방문일자)'}\n5. 실제 방문일 : ${r.date?r.date.replace(/-/g,'.')+' '+dowTag(r.date):'(방문일자)'}\n감사합니다~`;   // 5. 실제 방문일 (2026-11-19)
}
// 현장 결제 인원 확인 연락: 전주 목요일에 읽을 문구
const onsiteMsg = r => `안녕하세요, 사유원입니다. ${r.org?`<${r.org}> `:''}${r.date?mdLabel(r.date)+' ':''}방문 건으로 연락드렸습니다.\n최종 인원이 ${r.people?`총 ${r.people}명`:'몇 분'} 맞으신가요?\n현장 결제로 진행되기 때문에 당일에는 인원 변경이 어려운 점 다시 한번 안내드립니다.\n변경이 있으시면 지금 말씀해 주세요. 감사합니다.`;
// 담당자에게 일정 전달 (방문 전날): 담당자별로 맡은 프로그램 · 굿즈
function staffMsg(r){
  const by={}, add=(who,s)=>{ who=String(who||'').trim()||'(담당 미정)'; (by[who] ||= []).push(s); };
  FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1]) && r[f[1]]).forEach(f=>{ const k=f[1], v=String(r[k]), sub=p=>String(r[`${p}_${k}`]||'').trim();
    const s2who = k==='seminar' && sem2On(r) && !r.seminar2 ? String(r.stf_seminar2||'').trim() : '', split = s2who && s2who!==sub('stf');   // 세미나 도슨트 두 번째 담당이 다르면 그 사람에게 따로
    const s2note = r===rec && itemNote('seminar2') ? ` (비고:${itemNote('seminar2')})` : '';
    add(sub('stf'), `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? (split ? '1'+UNIT(k) : v+UNIT(k)) : v}${sub('tm')?' '+sub('tm'):''}${sub('crs')?` (출발지:${sub('crs')})`:''}${sub('plc')?` (장소:${sub('plc')})`:''}${r===rec && itemNote(k)?` (비고:${itemNote(k)})`:''}${k==='seminar' && !split ? sem2Tag(r)+(sem2Tag(r) ? s2note : '') : ''}`);
    if(split){ const t=String(r.tm_seminar2||'').trim(), p=String(r.plc_seminar2||'').trim(); add(s2who, `${f[2]} 1${UNIT(k)}${t?' '+t:''}${p?` (장소:${p})`:''}${s2note}`); } });
  if(r.goods) add(r.stf_goods, '굿즈 '+goodsText(r)+(r===rec ? goodsParse(r.goods).map(g=>itemNote('g:'+g.src)?` (${goodsName(g.src)} 비고:${itemNote('g:'+g.src)})`:'').join('') : ''));
  const head=[r.org&&`<${r.org}>`, r.date&&dateLabel(r.date), r.people&&`${r.people}명`, r.tin&&`입장 ${r.tin}${r.gate&&r.gate!=='미정'?' '+r.gate:''}`].filter(Boolean).join(' · ');
  const c=contactsOf(r)[0]||{};
  return `[단체 일정 전달] ${head}\n` + Object.entries(by).map(([w,l])=>`- ${w}: ${l.join(', ')}`).join('\n') + (c.name||c.phone ? `\n고객 담당: ${[c.name,c.phone].filter(Boolean).join(' ')}` : '') + `\n영업 담당: ${(r.owner||savedOwner()||'').trim()||'-'}`;
}
const taskAuto = t => { const base=taskAutoBase(t); return typeof tcfgNote==='function' ? tcfgNote(t, base) : base; };   // 추후과업 메시지 관리에서 고친 문구 틀이 있으면 그것 (js/taskcfg.js, 2026-11-20)
const taskAutoBase = t => t.id==='erp' ? erpNote(rec) : t.id==='erpfix' ? erpNote(rec, true) : t.id==='tax' ? taxMsg(rec) : t.id==='tour' ? tourNote(rec) : '';   // 사전답사 전산 예약: 전산 비고 <단체명> 사전답사(/n명 현장결제 필요)   // 자동으로 만든 문구
const taskText = t => taskAuto(t) ? (t.noteEdit || taskAuto(t)) : '';   // 직접 고쳤으면 그 글 (전산 비고 등)
// 과업 기한(due): 생기면 그날이 기본, 각자 바꿀 수 있음(dueSet). 미정 항목 연락 = 답변일, 현장 결제 인원 확인 = 전주 목요일(지났으면 전날), 결제 확인 = 다음날
const todayYmd = () => ymd(new Date());
function autoDue(id, r){
  { const cd = typeof tcfgDue==='function' ? tcfgDue(id, r) : null; if(cd) return cd; }   // 추후과업 메시지 관리에서 만든 새 과업의 마감
  if(id==='wkcheck'){ const thu = r.date ? tbdLimit(r.date) : '';   // 다음주 예약 점검 = 방문일 전주 목요일. 미정 항목이 있고 그 답변일이 더 이르면 답변일 (2026-11-23 · 미정 항목 확인 연락을 여기로 합침)
    return r.tbd && r.tbdDate && (!thu || r.tbdDate < thu) ? r.tbdDate : (thu || todayYmd()); }
  if(id==='onsitecall') return r.date ? tbdLimit(r.date) : todayYmd();
  if(id==='paycheck') return ymd(nextDay(r.linkSent || new Date().toISOString()));   // 입금 확인 = 결제링크 보낸 다음날
  if(id==='staffbrief') return r.date ? staffFri(r.date) : todayYmd();   // 담당자에게 일정 전달 = 방문 전주 금요일 (2026-11-21 · 예전: 프로그램이 있으면 방문 주 월요일, 굿즈만이면 방문 전날)
  if(id==='goodsprep'){ if(!r.date) return todayYmd(); const d=new Date(r.date+'T00:00'); d.setDate(d.getDate()-1); return ymd(d); }   // 방문 전날
  return todayYmd();
}
const taskDue = t => t.due || (t.at ? ymd(new Date(t.at)) : todayYmd());   // 예전 과업은 생긴 날
const DOC_SUBS = { quote:[['make','견적서 생성'],['send','견적서 전송'],['nas','견적서 NAS에 업로드']], stmt:[['make','거래명세서 생성'],['send','거래명세서 전송'],['nas','거래명세서 NAS에 업로드']] , clergy:[['ask','예약자에게 정보 요청'],['sheet','대구대교구 시트 기입']] };   // 대구대교구 특별 할인이 들어가면 (2026-11-17)
// 방문 전주 금요일 (방문 주 월요일 − 3일). 이미 지났으면 방문일 전날, 그것도 지났으면 오늘 (전주 목요일 tbdLimit 와 같은 규칙)
function staffFri(d){ const t=new Date(d+'T00:00'); if(isNaN(t)) return todayYmd(); t.setDate(t.getDate()-((t.getDay()+6)%7)-3); const fri=ymd(t), today=todayYmd(); if(fri>=today) return fri; const p=new Date(d+'T00:00'); p.setDate(p.getDate()-1); const pd=ymd(p); return pd>=today ? pd : today; }
const staffFriName = d => d && staffFri(d)===(()=>{ const t=new Date(d+'T00:00'); t.setDate(t.getDate()-((t.getDay()+6)%7)-3); return ymd(t); })() ? '방문 전주 금요일' : '방문 전날';
const FOLLOW_DUE = new Set(['onsitecall','wkcheck','staffbrief','goodsprep','paycheck']);   // 답변일 · 방문일이 바뀌면 기한도 따라감 (직접 바꾸기 전까지)
// 예약에서 아직 안 넣은 칸 (예약 내역의 빨간 칸 · 관람 인원 · 입장시각) — 미정 항목 확인 연락의 세부 과업 (2026-11-20 · 프로그램 담당은 고객님께 묻는 것이 아니라 뺌)
function askMissing(){ const out=[];
  if(!String(rec.people||'').trim()) out.push('관람 인원'); if(!String(rec.tin||'').trim()) out.push('입장 시간');
  itemKeysFromRec().forEach(k=>{ const t=itemKind(k), nm=itemName(k);
    if(!String(itemQty(k)||'').trim() || String(itemQty(k)).trim()==='0') out.push(`${nm} ${itemUnit(k)==='명'?'인원':itemUnit(k)==='개'?'수량':'시간 수'}`);
    if(t==='mb' && !mbTimes()[0]) out.push(`${nm} 시간`);
    if(t==='prog' && !COUPON_IN_GOODS.includes(k)){ if(!tmTimes(k)[0]) out.push(`${nm} 시간`); if(FIELDS.some(f=>f[1]==='plc_'+k) && !rec['plc_'+k]) out.push(`${nm} 장소`); if(FIELDS.some(f=>f[1]==='crs_'+k) && !crsNorm(rec['crs_'+k])) out.push(`${nm} 출발지`); } });
  return out; }
function syncAutoTasks(){
  const want = [], consult = quietStage(effStage(rec));   // 예약상담은 기록용: 추후 과업 없음
  const needAsk = !!rec.tbd || askMissing().length>0;   // 미정 항목 · 아직 안 넣은 칸(빨간 칸)이 있음 → 다음주 예약 점검의 세부 과업으로 (2026-11-23 · 예전 「미정 항목 확인 연락」)   // 미정 항목 · 아직 안 넣은 칸(빨간 칸)이 있으면 연락 (2026-11-20)   // 미정 항목(결제 방법 포함)이 있으면 답변일에 연락
  if(rec.pay==='현장 결제' && rec.date) want.push('onsitecall');   // 현장 결제: 전주 목요일에 인원 확인 + 인원 변경 어려움 안내
  if((rec.date && (rec.date>=todayYmd() || tasks.some(t=>t.id==='wkcheck'))) || needAsk) want.push('wkcheck');   // 다음주 예약 점검 (2026-11-20 · 지난 방문일은 새로 만들지 않음): 미정 · 미입력 항목이 없어도 예약마다 방문일 전주 목요일에 점검 (예전엔 나의 할일에 한 줄로 모아서)
  if(needsErp(rec)) want.push('erp', 'erpcheck');   // 전산 예약 + 전산 내역을 붙여 넣어 예약 내용과 총 금액 · 할인이 같은지 대조 (같으면 자동 완료)
  if(rec.pay==='세금계산서') want.push('tax');
  if(rec.pay==='결제링크') want.push('linksend', 'paycheck');   // 결제링크: 보내기(오늘) · 입금 확인(보낸 다음날). 예약 내용의 버튼과 서로 맞춤
  if(rec.wantQuote) want.push('quote');
  if(rec.wantStmt) want.push('stmt');
  const ms=missingStaff(rec); if(ms.length) want.push('progstaff');   // 프로그램 담당이 비면 입력하라고
  const mbNeed=mbNeedsMenu(rec); if(mbNeed) want.push('mbmenu');   // 몽몽마방 예약인데 메뉴를 안 고름
  if(rec.goods) want.push('goodsprep');   // 굿즈가 들어가면 방문 전날까지 굿즈 준비 (그날 13시 · 17시 알림)
  if(rec.date && STAFF_BASES().some(k=>rec[k])) want.push('staffbrief');   // 프로그램 · 굿즈가 있으면 담당자에게 일정 전달 (마감 = 방문 전주 금요일, 2026-11-21) (영업 담당이 직접 체크)
  if(rec.mabangL || rec.mabangTime) want.push('mbcall');   // 몽몽마방이 들어가면 식당에 전화로 시간 확인 (직접 체크)
  if((parseInt(rec.dClergy)||0)>0) want.push('clergy');   // 대구대교구 특별 할인 → 대구대교구 정보 기입 (예약자에게 정보 요청 · 대구대교구 시트 기입)
  // 전산 예약 수정: 전산 등록을 마친 뒤 인원 · 날짜 · 식사 등이 바뀌면 생김
  const e0=tasks.find(t=>t.id==='erp');
  if(e0){ if(e0.done && e0.manualDone && !rec.erp){ rec.erp=ymd(new Date(e0.doneAt||Date.now())); touched.add('erp'); }   // 나의 할일 · 알림에서 체크한 전산 예약 → 전산 등록 날짜도
    if(rec.erp) e0.done=true; else if(!e0.manualDone) e0.done=false;
    if(e0.done && e0.base && e0.base.v!==5){ const f0=tasks.find(t=>t.id==='erpfix'); const T=[e0.doneAt, f0&&f0.done&&f0.doneAt, /^\d{4}-\d{2}-\d{2}$/.test(rec.erp||'') ? rec.erp+'T23:59:59' : ''].filter(Boolean).sort().pop() || ''; e0.base = T ? erpBaseUp(e0.base, T) : erpSnap(); }   // 예전 기준(v:3 · v:4) → 수정 기록으로 되살림
    if(e0.done && !e0.base){ const f0=tasks.find(t=>t.id==='erpfix' && !t.done && (t.changes||[]).length && t.at); e0.base = f0 ? erpBaseUp({v:0}, new Date(new Date(f0.at).getTime()-1).toISOString()) : erpSnap(); }   // 기준이 없는데 (다음날 고객 응대 준비 등에서 생긴) 전산 예약 수정이 열려 있으면 그 전 내용을 기준으로
    if(!e0.done) delete e0.base; }
  tasks.forEach(t=>{ if(t.noteEdit && /출입구\s*미정/.test(t.noteEdit)) t.noteEdit=t.noteEdit.split(/\s+\/\s+/).filter(p=>!/^출입구\s*미정$/.test(p.trim())).join(' / ').replace(/\s*출입구\s*미정\s*\/?\s*/g,' ').trim(); });   // 예전 문구의 「출입구 미정」은 안 씀 (2026-11-19)
  tasks.forEach(t=>{ if(t.id==='erpfix' && t.noteEdit && /런치|디너/.test(t.noteEdit)) t.noteEdit=t.noteEdit.split(/\s+\/\s+/).filter(p=>!/^(런치\s*[12]부|디너)$/.test(p.trim())).join(' / '); });   // 전산 예약 수정 문구엔 런치 · 디너 안 씀
  const fixes = e0 && e0.base ? erpDiff(e0.base, erpSnap()) : [];
  if(fixes.length) want.push('erpfix');
  if(rec.tour) want.push('tour');   // 사전 답사가 잡히면 답사도 전산에 예약
  if(typeof tcfgWant==="function") tcfgWant(rec, want);
  { const i=want.indexOf('tbdcall'); if(i>=0) want.splice(i,1);   // 「미정 항목 확인 연락」은 따로 만들지 않음 (다음주 예약 점검에 합침)
    if(needAsk && !want.includes('wkcheck') && !(typeof tcfgOf==='function' && (tcfgOf('wkcheck')||{}).off)) want.push('wkcheck'); }   // 방문일이 아직 없어도 물어볼 것이 있으면 점검 과업   // 추후과업 메시지 관리: 끈 과업은 빼고 조건이 맞는 새 과업은 넣음 (2026-11-20)
  if(consult){ const keep=want.filter(id=>id==='tour' || id==='clergy'); want.length=0; want.push(...keep); }   // 예약상담이면 자동 과업은 사전답사 전산 예약만 (손대지 않은 것은 아래에서 빠짐)
  want.forEach(id=>{ if(!tasks.some(t=>t.id===id)) tasks.push({id, title:AUTO_TASKS[id], done:false, memo: id==='tour' ? tourMemo(rec) : '', ...(id==='tour' ? {memoTour:tourMemo(rec)} : {}), at:new Date().toISOString(), due:autoDue(id, rec), ...(id==='wkcheck' && editingId && rec.date && wkDone(rec.owner||savedOwner()||'', prevWeekThu(rec.date))[editingId] ? {done:true, doneAt:wkDone(rec.owner||savedOwner()||'', prevWeekThu(rec.date))[editingId]} : {})}); });   // 사전 답사 과업 메모 = 답사 정보
  if(typeof tcfgSubs==="function") tcfgSubs(tasks);   // 추후과업 메시지 관리의 세부 과업 (2026-11-20)
  // 미정 항목 확인 연락 (2026-11-20): 미정 항목 + 빨간 칸(아직 안 넣은 것)을 세부 과업으로 — 하나씩 체크하며 고객님께 여쭘. 다 체크하면 완료
  { const tq=tasks.find(t=>t.id==='wkcheck' && !t.removed), old=tasks.find(t=>t.id==='tbdcall');
    if(old){   // 예전에 저장된 「미정 항목 확인 연락」: 체크해 둔 세부 과업 · 메모를 다음주 예약 점검으로 옮기고 없앰 (2026-11-23)
      if(tq && !old.removed){ const xs=tq.xsubs ||= []; (old.xsubs||[]).forEach(x=>{ if(!xs.some(y=>y.title===x.title)) xs.push(x); }); if(old.memo && !String(tq.memo||'').includes(old.memo)) tq.memo=[tq.memo, old.memo].filter(Boolean).join(' / '); }
      tasks.splice(tasks.indexOf(old), 1); }
    if(tq){ const want2=!want.includes('wkcheck') || (typeof tcfgNoAutoSubs==='function' && tcfgNoAutoSubs('wkcheck')) ? [] : [...String(rec.tbd||'').split(/\s*,\s*/).filter(Boolean).map(l=>`미정 · ${l}`), ...askMissing().map(l=>`미입력 · ${l}`)];
    const xs=tq.xsubs||[], keep=xs.filter(x=>!/^q:/.test(x.id) || want2.includes(x.title)); want2.forEach(l=>{ if(!keep.some(x=>x.title===l)){ keep.push({id:'q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), title:l, done:false}); if(tq.done){ tq.done=false; delete tq.doneAt; delete tq.doneBy; delete tq.autoDone; } } }); tq.xsubs=keep; } }   // 점검을 끝낸 뒤에 물어볼 것이 새로 생기면 다시 열림
  // 방문일 · 답변일 · 결제링크 전송일을 따라가는 마감: 이미 지난 마감은 그 바탕(dueKey)이 그대로면 그대로 둠 (2026-11-21 · 예전엔 지나면 「방문일 전날 · 오늘」로 밀려 빨간 「지남」이 사라졌음)
  { const dk=[rec.date||'', rec.tbdDate||'', rec.linkSent||''].join('|'), td=todayYmd();
    tasks.forEach(t=>{ if(FOLLOW_DUE.has(t.id) && !t.dueSet && !t.done){ const keep = t.due && t.due<td && (t.dueKey===undefined || t.dueKey===dk); if(!keep){ const d=autoDue(t.id, rec); if(t.due!==d) t.due=d; } t.dueKey=dk; } if(!t.due) t.due=taskDue(t); }); }
  tasks.forEach(t=>{ if(!t.custom && !t.titleSet && AUTO_TASKS[t.id] && t.title!==AUTO_TASKS[t.id]) t.title=AUTO_TASKS[t.id]; if((t.id==='pplchk' || t.id==='erpkeep') && !t.titleSet && AUTO_TASKS[t.id] && t.title!==AUTO_TASKS[t.id]) t.title=AUTO_TASKS[t.id]; });   // 추후과업 메시지 관리에서 바꾼 이름 (직접 고친 제목은 그대로)
  const fx=tasks.find(t=>t.id==='erpfix');
  if(fx && !fx.removed){ if(fixes.length){ const sig=fixes.join(' | '); if(fx.done && !(fx.manualDone && fx.ckSig===sig)){ fx.done=false; delete fx.manualDone; delete fx.ckSig; fx.at=new Date().toISOString(); fx.due=todayYmd(); delete fx.dueSet; } fx.changes=fixes; fx.v=4; } else if(!fx.done && e0 && e0.base){ fx.changes=[]; if(!(fx.xsubs||[]).length){ fx.done=true; fx.doneAt=new Date().toISOString(); fx.autoDone=true; } } }   // 예약 내용이 전산에 올린 때와 같아지면 저절로 완료 (2026-11-19)
  // 하위 과업: 견적서 · 거래명세서는 기본 3개(생성 · 전송 · NAS 업로드) + 누구나 직접 추가한 세부 과제(xsubs). 하위 과업이 있으면 모두 체크될 때 완료
  // (전산 예약 · 프로그램 담당 · 몽몽마방 메뉴처럼 칸을 채우면 끝나는 과업은 하위 과업과 상관없이 그 조건으로)
  tasks.forEach(t=>{ if(t.removed) return; const ds=DOC_SUBS[t.id]; if(ds && !t.subs) t.subs=Object.fromEntries(ds.map(([k])=>[k, !!t.done]));   // 삭제한 과업은 그대로
    if(ds && t.subs && t.done) ds.forEach(([k])=>{ if(!(k in t.subs)) t.subs[k]=true; });   // 추후과업 메시지 관리에서 세부 과업을 더해도 이미 끝난 과업은 다시 열리지 않게 (2026-11-21)
    if(['erp','erpcheck','progstaff','mbmenu'].includes(t.id)) return;
    const st=[...(ds ? ds.map(([k])=>!!t.subs[k]) : []), ...(t.xsubs||[]).map(x=>!!x.done)]; if(!st.length) return;
    const all=st.every(Boolean); if(all && !t.done){ t.done=true; t.doneAt=new Date().toISOString(); } if(!all && t.done && !t.manualDone){ t.done=false; t.doneAt=''; } });   // 위 체크로 끝낸 과업(manualDone)은 하위 과업이 남아도 완료 그대로
  tasks = tasks.filter(t=> t.custom || want.includes(t.id) || t.done || t.memo || (t.files||[]).length || (t.subs && Object.values(t.subs).some(Boolean)) || (t.xsubs||[]).length);   // 조건이 사라진 자동 과업은 (손대지 않았으면) 뺌
  const ps=tasks.find(t=>t.id==='progstaff' && !t.removed); if(ps){ const had=String(ps.ckSig||'').split(',');
    if(!ms.length) ps.done=true;   // 담당을 다 채움 → 저절로 끝남
    else if(ps.done && ps.manualDone && ms.every(k=>had.includes(k))) ps.done=true;   // 직접 체크했고 그 뒤 새로 빈 담당이 없으면 그대로 완료
    else { ps.done=false; delete ps.manualDone; delete ps.ckSig; }
    ps.missing=ms.map(k=>LABEL[k]||k); ps.mk=ms.join(','); }
  const mt=tasks.find(t=>t.id==='mbmenu'); if(mt){ if(!mbNeed) mt.done=true; else if(!mt.manualDone) mt.done=false; }   // 메뉴를 고르면 저절로 끝남 · 직접 체크했으면 그대로
  const ec=tasks.find(t=>t.id==='erpcheck'); if(ec){ const c=erpCheck(); const was=ec.done; ec.check=c; if(c.ok){ ec.done=true; if(!was) ec.doneAt=new Date().toISOString(); } else if(!ec.manualDone){ ec.done=false; ec.doneAt=''; } }   // 전산 내역 대조: 맞으면 저절로 완료 · 직접 체크했으면 금액이 달라도 완료 그대로 (2026-11-23)
  { const ls=tasks.find(t=>t.id==='linksend'); if(ls){ if(!rec.linkSent && ls.done && ls.manualDone){ rec.linkSent=ls.doneAt||new Date().toISOString(); touched.add('linkSent'); }   // 나의 할일 · 알림에서 체크한 것 → 전송 일시로
      ls.done=!!rec.linkSent; ls.doneAt=rec.linkSent||''; }   // 결제링크 전송 = 버튼을 누른 일시
    const pc=tasks.find(t=>t.id==='paycheck'); if(pc){ if(rec.paidAt){ pc.done=true; pc.doneAt=rec.paidAt; } else if(pc.done){ rec.paidAt=pc.doneAt||new Date().toISOString(); touched.add('paidAt'); } } }   // 입금 확인 (알림 팝업에서 완료한 것도 일시로)
  const ORDER=['tour','clergy','onsitecall','wkcheck','mbcall','mbmenu','progstaff','staffbrief','goodsprep','erp','erpcheck','erpfix','quote','stmt','tax','linksend','paycheck'];
  // 순서: 마감일이 빠른 순, 마감일이 같으면 최근에 추가된 것이 위. 직접 옮긴 과업(ordSet)은 그 순서 그대로 두고,
  // 옮기지 않은 과업은 그 사이에 마감일에 맞게 끼워 넣음 (같은 마감일이면 직접 옮긴 것보다 위). 끝난 과업은 맨 아래
  const byNew=(a,b)=>taskDue(a).localeCompare(taskDue(b)) || String(b.at||'').localeCompare(String(a.at||''));
  const openT=tasks.filter(t=>!t.done), doneT=tasks.filter(t=>t.done).sort(byNew);
  const list=openT.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord);
  openT.filter(t=>!t.ordSet).sort(byNew).forEach(t=>{ const d=taskDue(t); let i=list.findIndex(x=>x.ordSet && taskDue(x)>=d); if(i<0) i=list.length; list.splice(i,0,t); });
  tasks=[...list, ...doneT];
}
// 전산 예약 수정 (2026-11-19 v:5): 전산 등록(또는 전산 내역 다시 붙여넣기)을 마친 뒤 「예약 내용」이 하나라도 바뀌면 생김 (관람 인원 · 날짜 · 시간 · 식사 · 프로그램 · 결제 · 차량 …)
//  기준 = 전산에 올린 때의 예약 내용(erp 과업 base.s). 지금 내용이 기준과 같아지면(되돌리면) 전산 내역을 다시 붙여 넣지 않아도 저절로 완료
//  담당자 · 통화 메모 · 과업 · 전산 내역 · 미정 체크 · 견적서 요청 · 결제링크 · 사전답사처럼 전산 예약과 상관없는 칸은 보지 않음
const ERP_SKIP = /^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):|^(note|taskOrder|readDone|erp|erpList|tbd|tbdLate|tbdDate|stage|owner|wantQuote|wantStmt|linkSent|paidAt|tour|payContact|etcDiscWhy|inotes)$/;
const contentSnap = s => Object.fromEntries(Object.entries(s||{}).filter(([k,v])=>!ERP_SKIP.test(k) && !isCKey(k) && String(v??'').trim()!=='').map(([k,v])=>[k, String(v).trim()]));
const erpSnap = () => ({v:5, s:contentSnap(snap())});
// 예전 기준(v:3 · v:4)은 수정 기록으로 되살림: 전산에 올린 때(T) 뒤의 기록을 거꾸로 되돌린 내용
function erpBaseUp(b, T){ if(!b || b.v===5) return b;
  const s={...snap()}; for(let j=hist.length-1;j>=0;j--){ const h=hist[j]; if(!h || !(String(h.t||'')>T)) break; Object.entries(h.ch||{}).forEach(([k,c])=>{ if(Array.isArray(c)) s[k]=c[0]||''; }); }
  return {v:5, s:contentSnap(s)}; }
// 예약 내역(품목 · 인원 · 할인)이 전산에 올린 때와 다른지 (2026-11-19): 다르면 「전산 예약 수정」을 끝낼 때 전산 내역을 다시 붙여넣음, 아니면 체크만
const ERP_ITEM_KEY = k => ['people','istu','views','viewN','viewSrc','sadam1','sadam2','sadamD','mabangL','mabangD','mabangMenu','goods','idisc','isp','idamt','etcDisc','etcDiscTo','etcDiscTx','etcDiscTf'].includes(k) || PROG_KEYS().includes(k) || SPECIAL.some(s=>s.k===k);
function erpItemsChanged(){ const e0=tasks.find(t=>t.id==='erp'); if(!e0 || !e0.base || e0.base.v!==5) return true;
  const a=e0.base.s||{}, b=contentSnap(snap()); return [...new Set([...Object.keys(a), ...Object.keys(b)])].some(k=>ERP_ITEM_KEY(k) && (a[k]||'')!==(b[k]||'')); }
const erpDiff = (a,b) => { if(!a || a.v!==5 || !a.s) return [];
  return [...new Set([...Object.keys(a.s), ...Object.keys(b.s)])].filter(k=>(a.s[k]||'')!==(b.s[k]||'')).map(k=>{ const l=LABEL[k]||k, x=a.s[k]||'', y=b.s[k]||''; if(k==='views') return '관람 품목 · 인원이 바뀜'; return !x ? `${l} ${y} 입력` : !y ? `${l} ${x} 지움` : `${l} ${x} → ${y}`; }); };
const nextDay = iso => { const d=new Date(iso); d.setDate(d.getDate()+1); return d; };
// 하위 과업 칸: 기본 하위 과업(견적서 · 거래명세서) + 직접 추가한 세부 과제(× 로 빼기) + 추가 입력칸
function subsHTML(t){
  const ds=DOC_SUBS[t.id]||[];
  const rows=[...ds.map(([k,l])=>`<label class="tsub${t.subs&&t.subs[k]?' on':''}"><input type="checkbox" data-tsub="${esc(t.id)}|${k}"${t.subs&&t.subs[k]?' checked':''}> ${l}</label>`),
    ...(t.xsubs||[]).map(x=>`<div class="tsub-row"><label class="tsub${x.done?' on':''}"><input type="checkbox" data-xsub="${esc(t.id)}|${esc(x.id)}"${x.done?' checked':''}> ${esc(x.title)}</label><button type="button" class="tsub-del" data-xdel="${esc(t.id)}|${esc(x.id)}" title="세부 과제 빼기">×</button></div>`)];
  return `<div class="tsubs">${rows.join('')}<div class="tsub-add"><input data-ime="ko" data-xadd="${esc(t.id)}" placeholder="+ 세부 과제 추가 (적고 Enter)" autocomplete="off"><button type="button" class="btn" data-xaddbtn="${esc(t.id)}">추가</button></div></div>`;
}
function addXsub(tid){
  const inp=document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`), v=inp ? inp.value.trim() : ''; const t=tasks.find(x=>x.id===tid);
  if(!v || !t) return;
  (t.xsubs ||= []).push({id:'x'+Date.now().toString(36), title:v, done:false});
  inp.blur(); renderTasks(); renderSide(); autoSave();
  document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`)?.focus();   // 이어서 또 적을 수 있게
}
const consultTask = t => t.id==='tour' || t.id==='clergy' || t.custom;   // 예약상담에서 보이는 과업: 사전답사 전산 예약 + 직접 추가한 과업
function renderTasks(){
  syncAutoTasks();
  const consultOnly = quietStage(effStage(rec));   // 예약상담: 자동 과업은 없고(사전답사 전산 예약만) 직접 추가한 과업은 그대로
  $('#taskAdd').hidden = false;
  const shownTasks = (consultOnly ? tasks.filter(consultTask) : tasks).filter(t=>!t.removed);   // 삭제한 자동 과업(removed)은 숨김 (다시 생기지 않게 기록만 남김)
  if(consultOnly && !shownTasks.length){ paintDocBtns(); $('#taskList').innerHTML='<li class="hint" style="list-style:none;margin:0">예약상담은 자동으로 생기는 과업이 없습니다. 필요한 일은 위 칸에 직접 추가해 주세요.</li>'; $('#taskHint').textContent=''; return; }
  paintDocBtns();
  const box=$('#taskList'), ae=document.activeElement, focus=box.contains(ae) && (ae.tagName==='TEXTAREA' || (ae.tagName==='INPUT' && ae.type!=='checkbox' && !ae.readOnly && !ae.classList.contains('dpick')));   // 메모 · 글자 칸에 쓰는 중일 때만 다시 그리지 않음
  const changeTag = t => { const txt=taskText(t); return !t.copied ? '' : t.copied===txt ? '<span class="hint" style="margin:0">붙여넣은 내용과 같음</span>' : '<span class="chg">예약 내용이 바뀜 · 다시 복사해서 붙여넣기</span>'; };
  if(focus){   // 메모를 쓰는 중이면 문구만 새로
    tasks.forEach(t=>{ const pre=document.getElementById('tpre_'+t.id); if(pre && document.activeElement!==pre) pre.value=taskText(t); const c=document.getElementById('tchg_'+t.id); if(c) c.innerHTML=changeTag(t); });
    return;
  }
  const SUB = { erp:'전산에 예약을 등록하고, 아래 문구를 전산 비고에 붙여넣은 뒤 체크하세요.', tax:'고객 안내 후, 아래 내용으로 세금계산서 발행을 요청하세요.',
    quote:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 견적서 사이트에 예약 내용이 채워집니다. 출력하면 「견적서 생성」이 체크되고, 출력한 내용은 견적서 사이트 발급 내역에서 봅니다.',
    stmt:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 거래명세서로 채워집니다. 출력하면 「거래명세서 생성」이 체크되고, 출력한 내용은 견적서 사이트 발급 내역에서 봅니다.' };
  box.innerHTML = shownTasks.map(t=>{
    const txt=taskText(t);
    const sub = t.id==='paycheck' ? (rec.paidAt ? `입금 확인 ${esc(dtLabel(rec.paidAt))}` : rec.linkSent ? `결제링크를 ${esc(dtLabel(rec.linkSent))}에 보냈습니다. 입금되면 예약 내용의 <b>「입금 확인」</b>을 누르거나 체크하세요 (누른 일시가 기록됩니다). 보낸 다음날(${mdLabel(ymd(nextDay(rec.linkSent)))}) 아침에 이 창을 열면 확인 알림이 뜹니다.` : '결제링크를 먼저 보내세요 (결제링크 전송). 입금되면 예약 내용의 <b>「입금 확인」</b>을 누르거나 체크하세요.')
      : t.id==='linksend' ? (rec.linkSent ? `결제링크 전송 ${esc(dtLabel(rec.linkSent))}` : '고객님께 결제링크를 보내고, 예약 내용 결제 칸 아래 <b>「결제링크 전송」</b>을 누르거나 체크하세요 (누른 일시가 기록됩니다).')
      : t.id==='tour' ? `사전 답사를 사유원 전산에 예약하고 체크하세요. 답사 정보는 아래 메모에 있습니다.`
      : t.id==='wkcheck' ? `기한(${esc(mdLabel(taskDue(t)))} · ${t.dueSet || !rec.date ? '직접 정한 날' : tbdLimitName(rec.date)})에 이 예약을 점검하고 체크하세요. 인원 · 입장 시간 · 식사 · 프로그램 · 결제 · 전산 내역이 맞는지, 미정 · 미입력 항목이 남았는지 확인합니다.` + (rec.tbd ? `<br>미정: <b>${esc(rec.tbd)}</b>${rec.tbdDate ? ` · 답변일 ${esc(mdLabel(rec.tbdDate))}` : ''} — 고객님께 연락해 확인하고, 정해진 내용을 칸에 채운 뒤 아래 세부 과업을 하나씩 체크하세요.` : '')
      : t.id==='onsitecall' ? `현장 결제 예약입니다. 기한(${esc(mdLabel(taskDue(t)))} · ${t.dueSet || !rec.date ? '직접 정한 날' : tbdLimitName(rec.date)})에 고객님께 연락해 <b>최종 인원</b>을 확인하고, <b>당일 인원 변경이 어렵다는 점</b>을 다시 한번 안내하세요.`
      : t.id==='mbcall' ? `몽몽마방 식당에 전화해서 확인하고 체크하세요. (${esc([rec.date&&dateLabel(rec.date), rec.mabangL&&rec.mabangL+'명'].filter(Boolean).join(' · ')||'방문일 · 인원 미정')})<br>① 고객님이 말씀하신 시각 <b>${esc(rec.mabangTime||'(시간 미입력)')}</b> 가능한지<br>② 그날 예약 가능한 시간이 모두 언제인지 → 아래 메모에 적어 두기`
      : t.id==='mbmenu' ? (t.done ? '몽몽마방 메뉴를 골랐습니다.' : `몽몽마방 식사에서 메뉴(${esc(mbMenus().map(m=>m.name).join(' · '))}) 중 하나를 고르세요. 고르면 자동으로 완료됩니다.`)
      : t.id==='goodsprep' ? `굿즈: <b>${esc(goodsText(rec)||'없음')}</b>${goodsParse(rec.goods).map(g=>itemNote('g:'+g.src)?` · ${esc(goodsName(g.src))} 비고: ${esc(itemNote('g:'+g.src))}`:'').join('')}<br>방문 전날(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')})까지 준비하고 체크하세요. 그날 13시 · 17시에 알림이 뜹니다.`
      : t.id==='staffbrief' ? `${staffFriName(rec.date)}(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')}) 각 담당자에게 아래 일정을 전달하고 체크하세요. 영업 담당이 이 예약의 프로그램 · 굿즈를 모두 챙깁니다.`
      : t.id==='progstaff' ? ((t.missing||[]).length ? `담당이 비어 있는 칸: <b>${esc(t.missing.join(' · '))}</b><br>프로그램 · 굿즈 옆 <b>담당</b>에 이름을 넣으면 자동으로 완료됩니다. (개별 · 시간 프로그램 · 굿즈 모두 담당 필수)` : '프로그램 · 굿즈 담당을 모두 넣었습니다.')
      : t.id==='erpcheck' ? (!erpList.length ? '전산에 예약을 넣은 뒤 <b>전산 내역을 붙여 넣어</b> 실제 예약이 이 예약 내용과 같은지 확인하세요. <b>할인 합계</b>와 <b>총 금액</b>이 같으면 저절로 완료됩니다.'
          : `<span class="erp-ck">${erpCheckHTML(erpCheck())}</span><br>${t.done ? '전산 내역과 예약 내용이 같습니다.' : '다른 곳을 전산이나 예약 내용에서 고친 뒤 전산 내역을 다시 붙여 넣으세요 (예약 내역 줄의 할인 · 기타 할인 · 인원 확인).'}`)
      : t.id==='erpfix' ? ((t.changes||[]).length ? `전산 등록 후 바뀐 내용: <b>${esc(t.changes.join(' · '))}</b><br>전산 예약을 고치고 비고도 새 문구로 바꾼 뒤 체크하세요.${erpItemsChanged() ? ' <b>예약 내역(품목 · 인원 · 할인)이 바뀌어</b> 체크하면 전산 내역을 다시 붙여넣습니다.' : ''}` : '전산에 반영했습니다.')
      : t.id==='pplchk' ? `인원수 변경에 따른 예약 내역 확인${t.pplFrom||t.pplTo ? ` (관람 인원 ${esc(t.pplFrom||'?')}명 → ${esc(t.pplTo||'?')}명)` : ''}`
      : SUB[t.id] || '';
    const docBtn = (t.id==='quote'||t.id==='stmt') ? `<div class="tbtn"><button type="button" class="btn" data-tquote="${t.id==='stmt'?'statement':'quote'}">${t.id==='stmt'?'거래명세서 만들기':'견적서 만들기'}</button></div>` : '';
    // 견적서 · 거래명세서 파일 링크는 안 보임 (출력한 내용은 견적서 사이트 발급 내역에서, 2026-11-21)
    const files = !['tax','quote','stmt'].includes(t.id) && (t.files||[]).length ? `<div class="tfiles">${t.files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}</div>` : '';
    const due=taskDue(t), late=!t.done && due<todayYmd(); const subsDone=taskSubsDone(t), fold=t.done && subsDone && !openDone.has(t.id);   // 아래 하위 과업 · 세부 과제가 다 체크돼야 접힘   // 끝난 과업은 첫 줄만 (누르면 펼침)
    return `<li class="task${t.done?' done':late?' late':''}${fold?' collapsed':''}" data-id="${esc(t.id)}">
      <div class="task-h">${t.done?'':`<span class="tdrag" title="끌어서 순서 바꾸기">⠿</span>`}<span class="task-c"><input type="checkbox" data-tk="${esc(t.id)}"${t.done?' checked':''} title="체크하면 완료"><input class="ttl" data-tttl="${esc(t.id)}" value="${esc(t.title)}" data-ime="ko" spellcheck="false" autocomplete="off" title="눌러서 제목 고치기 (Enter로 확정)"></span>${t.done && subsDone?`<button type="button" class="texp" data-texp="${esc(t.id)}">${fold?'자세히 ▾':'접기 ▴'}</button>`:''}
        ${t.done?'':`<span class="tmove"><button type="button" data-tmv="${esc(t.id)}|-1" title="위로">▲</button><button type="button" data-tmv="${esc(t.id)}|1" title="아래로">▼</button></span>`}<label class="tdue" title="마감일 · 바꿀 수 있음">${late?'기한 지남 ':'마감 '}${dboxHTML(`data-tdue="${esc(t.id)}"`, due)}</label><button type="button" class="tsave" data-tsave="${esc(t.id)}" title="이 과업의 고친 내용(체크 · 제목 · 마감일 · 메모 · 세부 과제)을 지금 저장">저장</button><button type="button" class="del" data-tdel="${esc(t.id)}" title="이 과업 삭제 (확인 뒤)" aria-label="과업 삭제">×</button></div>
      ${t.id==='pplchk' && pplChanges(t).length ? `<div class="tk-chg tchg-line">바뀐 내용: ${pplChanges(t).map(esc).join(' · ')}</div>` : ''}${subsHTML(t)}${docBtn}${files}
      ${txt?`<textarea class="tnote${t.noteEdit?' edited':''}" id="tpre_${esc(t.id)}" data-tnote="${esc(t.id)}" spellcheck="false" title="자동으로 만든 문구 · 직접 고칠 수 있음">${esc(txt)}</textarea><div class="tbtn"><button type="button" class="btn" data-tcopy="${esc(t.id)}">${t.id.startsWith('erp')||t.id==='tour'?'비고 문구 복사':'문구 복사'}</button>${t.noteEdit?`<button type="button" class="btn" data-tregen="${esc(t.id)}" title="고친 내용을 버리고 예약 내용으로 다시 만들기">다시 만들기</button><span class="hint" style="margin:0">직접 고친 문구</span>`:''}<span id="tchg_${esc(t.id)}">${changeTag(t)}</span></div>`:''}
      ${typeof tcfgMsgHTML==="function" ? tcfgMsgHTML(t) : ""}
      ${t.id==='tax' ? `<div class="tfiles">${(t.files||[]).map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}
        <label class="btn up${upBusy?' busy':''}">${upBusy?'올리는 중…':(t.files||[]).length?'사업자등록증 추가로 올리기':'사업자등록증 올리기'}<input type="file" data-tup="${esc(t.id)}" accept="image/*,application/pdf" hidden${upBusy?' disabled':''}></label>
        <span class="hint" style="margin:0">사진 · PDF, 10MB 이하 · 구글 드라이브 '사유원 단체예약 서류' 폴더에 저장</span></div>` : ''}
      <textarea data-tm="${esc(t.id)}" placeholder="메모">${esc(t.memo||'')}</textarea>
    </li>`; }).join('');
  $('#taskHint').textContent = tasks.length ? (editingId ? '체크와 복사는 바로 저장됩니다. 메모는 칸을 벗어나면 저장됩니다.' : '저장하면 과업도 함께 저장됩니다.') : '';
  if(typeof paintDirty==='function' && window.__autoReady) paintDirty();   // 다시 그린 과업 「저장」에도 노란 점
}
const autoSave = () => { if(editingId) save({auto:true}); };   // 과업 체크 · 메모 등은 바로 자동 저장 (수정 기록은 이 세션 줄에 모임)
// 사업자등록증 올리기 → Apps Script 가 구글 드라이브에 저장하고 링크를 돌려줌 → 과업에 링크 보관
let upBusy=false;
async function uploadFile(t, file){
  if(!getKey()){ toast('공유 기록에 연결된 뒤에 올릴 수 있습니다.'); return; }
  if(!/^(image\/|application\/pdf$)/.test(file.type)){ toast('사진이나 PDF만 올릴 수 있습니다.'); return; }
  if(file.size > 10*1024*1024){ toast('10MB 이하 파일만 올릴 수 있습니다.'); return; }
  upBusy=true; renderTasks();
  try{
    const data = await new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]); fr.onerror=()=>no(fr.error); fr.readAsDataURL(file); });
    const j = await SY.call({action:'upload', name:file.name, mime:file.type, data, org:rec.org||'', date:rec.date||'', kind:'사업자등록증'});
    (t.files ||= []).push({name:j.file.name, url:j.file.url, at:j.file.at});
    toast(editingId ? '올렸습니다.' : '올렸습니다. 예약을 저장하면 링크가 함께 저장됩니다.');
    upBusy=false; renderTasks(); autoSave();
  }catch(e){
    upBusy=false; renderTasks();
    toast('올리지 못했습니다: '+e.message);
  }
}
$('#taskList').addEventListener('change', e=>{
  const tt=e.target.dataset.tttl; if(tt){ const t=tasks.find(x=>x.id===tt); if(!t) return; const v=e.target.value.trim(); if(!v){ e.target.value=t.title; return; } if(v!==t.title){ t.title=v; t.titleSet=1; startTimer(); renderSide(); autoSave(); } return; }   // 과업 제목 고치기 (제목을 눌러서)
  const xs=e.target.dataset.xsub; if(xs){ const [tid,xid]=xs.split('|'), t=tasks.find(x=>x.id===tid), x=t && (t.xsubs||[]).find(s=>s.id===xid); if(x){ x.done=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 직접 추가한 세부 과제 체크
  const ts=e.target.dataset.tsub; if(ts){ const [tid,k]=ts.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.subs=t.subs||{}; t.subs[k]=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 하위 과업 체크
  const du=e.target.dataset.tdue; if(du){ const t=tasks.find(x=>x.id===du); if(t && e.target.value){ t.due=e.target.value; t.dueSet=1; t.dueSetAt=new Date().toISOString(); e.target.blur(); renderTasks(); renderSide(); autoSave(); } return; }   // 마감일 바꾸기
  const up=e.target.dataset.tup;
  if(up){ const t=tasks.find(x=>x.id===up), f=e.target.files[0]; if(t && f) uploadFile(t, f); return; }
  const id=e.target.dataset.tk; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return;
  // 2026-11-23: 체크하면 바로 완료 — 전산 예약 · 전산 예약 수정 · 전산 내역 대조도 전산 내역 붙여넣기를 거치지 않고, 입금 확인도 결제링크 전송 체크와 상관없이 (전산 내역은 「전산 내역 붙여넣기」 버튼으로 따로)
  if(id==='linksend' && !e.target.checked && rec.paidAt){ if(!confirm('결제링크 전송을 해제하면 입금 확인도 함께 해제됩니다. 계속할까요?')){ e.target.checked=true; return; } rec.paidAt=''; touched.add('paidAt'); const pc=tasks.find(x=>x.id==='paycheck'); if(pc){ pc.done=false; pc.doneAt=''; delete pc.manualDone; } }   // 결제링크를 다시 보낼 때: 입금 확인도 함께 해제
  t.done=e.target.checked; t.doneAt=t.done?new Date().toISOString():'';
  if(t.done){ t.manualDone=1; t.doneBy=savedOwner()||''; if(id==='progstaff') t.ckSig=missingStaff(rec).join(',');   // 맨 위 체크 = 아래 세부 과업(기본 하위 과업 · 직접 추가한 세부 과제)도 모두 처리한 것으로 (2026-11-23 · 나의 할일에서 완료할 때와 같게)
    const ds=DOC_SUBS[t.id]||[]; if(ds.length || t.subs){ t.subs=t.subs||{}; ds.forEach(([k])=>{ t.subs[k]=true; }); Object.keys(t.subs).forEach(k=>{ t.subs[k]=true; }); }
    (t.xsubs||[]).forEach(x=>{ x.done=true; }); }
  else { delete t.manualDone; delete t.ckSig; if(taskDue(t)<todayYmd()){ t.due=todayYmd(); t.dueSet=1; t.dueSetAt=new Date().toISOString(); }   /* 다시 열면 마감이 지났어도 오늘 마감 (2026-11-19) */ if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=false); (t.xsubs||[]).forEach(x=>x.done=false); }   // 끄면 세부 과업도 모두 해제 (2026-11-18)
  if(id==='erp'){ rec.erp = t.done ? ymd(new Date()) : ''; touched.add('erp'); }
  if(id==='linksend' || id==='paycheck'){ const k=id==='linksend'?'linkSent':'paidAt'; rec[k] = t.done ? t.doneAt : ''; touched.add(k); paintFields(); }   // 과업 체크 = 예약 내용 버튼도 (일시 기록)
  if(id==='erpfix' && t.done){ const e=tasks.find(x=>x.id==='erp'); if(e) e.base=erpSnap(); t.changes=[]; }   // 전산에 고친 지금 내용을 기준으로
  renderSide(); autoSave();
});
$('#taskList').addEventListener('click', e=>{
  const rg=e.target.closest('[data-tregen]'); if(rg){ const t=tasks.find(x=>x.id===rg.dataset.tregen); if(t){ t.noteEdit=''; renderTasks(); renderSide(); autoSave(); toast('예약 내용으로 문구를 다시 만들었습니다.'); } return; }
  const tx=e.target.closest('[data-texp]'); if(tx){ const id=tx.dataset.texp; openDone.has(id) ? openDone.delete(id) : openDone.add(id); tx.blur(); renderTasks(); return; }   // 끝난 과업 펼치기 / 접기
  const xd=e.target.closest('[data-xdel]'); if(xd){ const [tid,xid]=xd.dataset.xdel.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.xsubs=(t.xsubs||[]).filter(s=>s.id!==xid); renderTasks(); renderSide(); autoSave(); } return; }   // 세부 과제 빼기
  const xb=e.target.closest('[data-xaddbtn]'); if(xb){ addXsub(xb.dataset.xaddbtn); return; }
  const mv=e.target.closest('[data-tmv]'); if(mv){ const [id,dir]=mv.dataset.tmv.split('|'), consult=quietStage(effStage(rec));   // 과업 순서 바꾸기 (안 끝난 과업끼리)
    const open=tasks.filter(t=>!t.done && (!consult || consultTask(t))), i=open.findIndex(t=>t.id===id), j=i+(+dir);
    if(i<0 || j<0 || j>=open.length) return; [open[i],open[j]]=[open[j],open[i]]; open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; });
    renderTasks(); autoSave(); return; }
  const sv=e.target.closest('[data-tsave]'); if(sv){ document.activeElement?.blur(); setTimeout(()=>{ if(!editingId && !canSave()){ toast('업체나 방문일을 먼저 입력하세요.'); return; } save(true); },0); return; }   // 과업마다 「저장」: 고치던 칸을 확정하고 바로 저장 (자동 저장도 그대로)
  const c=e.target.dataset.tcopy, d=e.target.dataset.tdel, q=e.target.dataset.tquote;
  if(q){ openQuote(q); return; }
  if(c){ const t=tasks.find(x=>x.id===c); const txt=taskText(t); copy(txt, '복사했습니다. 붙여넣으세요.'); t.copied=txt; renderTasks(); autoSave(); }
  if(d){ e.preventDefault(); document.activeElement.blur(); const t=tasks.find(x=>x.id===d); if(!t) return;   // 삭제: 확인 팝업 → 직접 추가한 과업은 지우고, 자동 과업은 다시 생기지 않게 숨김(removed · 완료로)
    askDelete(`「${t.title}」 과업을 정말로 삭제할 건가요?`, ()=>{ if(t.custom) tasks=tasks.filter(x=>x.id!==d); else { t.removed=1; t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; } renderTasks(); renderSide(); autoSave(); toast('과업을 삭제했습니다.'); }); }
});
// 과업 순서: 왼쪽 ⠿ 를 잡고 끌어서 놓기 (안 끝난 과업끼리, ▲▼ 와 같은 순서 값)
let dragId=null;
const dragOpen = () => { const consult=quietStage(effStage(rec)); return tasks.filter(t=>!t.done && (!consult || consultTask(t))); };
$('#taskList').addEventListener('mousedown', e=>{ const h=e.target.closest('.tdrag'); if(h) h.closest('li.task').draggable=true; });
$('#taskList').addEventListener('dragstart', e=>{ const li=e.target.closest('li.task'); if(!li || !li.draggable) return; dragId=li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', dragId); }catch(_){} });
$('#taskList').addEventListener('dragover', e=>{ if(!dragId) return; const li=e.target.closest('li.task'); if(!li || li.classList.contains('done')) return; e.preventDefault();
  document.querySelectorAll('#taskList li.task').forEach(x=>x.classList.remove('drop-before','drop-after'));
  if(li.dataset.id!==dragId){ const r=li.getBoundingClientRect(); li.classList.add(e.clientY < r.top+r.height/2 ? 'drop-before' : 'drop-after'); } });
$('#taskList').addEventListener('drop', e=>{ if(!dragId) return; e.preventDefault(); const li=e.target.closest('li.task'); if(!li || li.dataset.id===dragId) return;
  const before=li.classList.contains('drop-before'), open=dragOpen(), from=open.findIndex(t=>t.id===dragId); if(from<0) return;
  const [moved]=open.splice(from,1); let to=open.findIndex(t=>t.id===li.dataset.id); if(to<0) return; if(!before) to++;
  open.splice(to,0,moved); open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; }); dragId=null; renderTasks(); autoSave(); });
document.addEventListener('mouseup', ()=>{ if(!dragId) document.querySelectorAll('#taskList li.task[draggable="true"]').forEach(x=>x.draggable=false); });   // 끌지 않고 놓으면 원래대로 (메모 글자 선택 등)
// 끌다가 화면 위 · 아래 끝에 가까이 가면 저절로 스크롤 (창과 과업 칸을 감싼 스크롤 영역 모두)
const scrollParents = el => { const out=[]; for(let p=el.parentElement; p; p=p.parentElement){ const s=getComputedStyle(p); if(/(auto|scroll)/.test(s.overflowY) && p.scrollHeight>p.clientHeight) out.push(p); } return out; };
document.addEventListener('dragover', e=>{ if(!dragId) return; const EDGE=70, H=window.innerHeight, sp=e.clientY<EDGE ? -Math.ceil((EDGE-e.clientY)/3) : e.clientY>H-EDGE ? Math.ceil((e.clientY-(H-EDGE))/3) : 0; if(!sp) return;
  window.scrollBy(0, sp); scrollParents($('#taskList')).forEach(p=>{ const r=p.getBoundingClientRect(); if(e.clientY<r.top+EDGE || e.clientY>r.bottom-EDGE) p.scrollTop+=sp; }); });
$('#taskList').addEventListener('dragend', ()=>{ dragId=null; document.querySelectorAll('#taskList li.task').forEach(x=>{ x.draggable=false; x.classList.remove('dragging','drop-before','drop-after'); }); });
$('#taskList').addEventListener('keydown', e=>{ if(e.target.dataset.tttl!==undefined){ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); e.target.blur(); } else if(e.key==='Escape'){ const t=(typeof taskOf==='function'?taskOf:(id=>tasks.find(x=>x.id===id)))(e.target.dataset.tttl); if(t) e.target.value=t.title; e.target.blur(); } } });   // 과업 제목: Enter = 확정, Esc = 되돌리기
$('#taskList').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing && e.target.dataset.xadd!==undefined){ e.preventDefault(); addXsub(e.target.dataset.xadd); } });   // 세부 과제: 적고 Enter
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; t.noteEdit=e.target.value; e.target.classList.add('edited'); startTimer(); });   // 문구 직접 고치기
$('#taskList').addEventListener('focusout', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; if(e.target.value.trim()===taskAuto(t).trim()) t.noteEdit=''; setTimeout(()=>{ renderTasks(); autoSave(); },0); });   // 자동 문구와 같아지면 자동으로
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tm; if(!id) return; const t=tasks.find(x=>x.id===id); if(t) t.memo=e.target.value; });
$('#taskList').addEventListener('focusout', e=>{ if(e.target.dataset.tm!==undefined) autoSave(); });
$('#taskAdd').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#taskAddIn').value.trim(); if(!v) return;
  tasks.push({id:'c'+Date.now().toString(36), title:v, custom:true, done:false, memo:'', at:new Date().toISOString(), due:todayYmd()}); $('#taskAddIn').value=''; renderTasks(); autoSave(); });   // 마감은 오늘 (바꿀 수 있음)
// 통화 메모: 칠 때마다 과업 · 자동 저장 계산을 하면 느려져서, 치기를 멈추고 0.4초 뒤에 한 번만 (한글 조합 중에는 안 함)
let memoT=0;
$('#memoBox').addEventListener('input', e=>{ clearTimeout(memoT); if(e.isComposing) return; memoT=setTimeout(()=>{ renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } }, 400); });
$('#memoBox').addEventListener('compositionend', ()=>{ clearTimeout(memoT); memoT=setTimeout(()=>{ renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } }, 400); });
$('#memoBox').addEventListener('blur', ()=>{ if(!memoT) return; clearTimeout(memoT); memoT=0; renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } });   // 칸을 나가면 바로

// 견적서 사이트가 출력 후 드라이브에 올린 파일 링크를 같은 사이트 저장소(sy_intake_docs)로 돌려줌 → 그 예약의 견적서/거래명세서 과업에 붙이고 완료
const DOCS_LS='sy_intake_docs';
let takingDocs=false;
async function takeDocs(){
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
  if(takingDocs) return; takingDocs=true;
  try{
    let list=[]; try{ list=JSON.parse(localStorage.getItem(DOCS_LS)||'[]'); }catch(_){}
    if(!list.length) return;
    const left=[];
    for(const d of list){
      const id = d.doc==='statement' ? 'stmt' : 'quote', title = AUTO_TASKS[id], now=new Date().toISOString();
      const attach = ts => { let t=ts.find(x=>x.id===id); if(!t){ t={id, title, done:false, memo:'', at:now, due:todayYmd()}; ts.push(t); } t.files=[...(t.files||[]), ...d.files];
        const ds=DOC_SUBS[id]; t.subs={...Object.fromEntries(ds.map(([k])=>[k, !!t.done])), ...(t.subs||{}), make:true}; t.done=ds.every(([k])=>t.subs[k]); t.doneAt=t.done?now:''; };   // 출력해서 파일이 오면 하위 과업 '생성' 체크
      if(d.recId && d.recId===editingId){ attach(tasks); renderTasks(); await save(true); continue; }
      const r=(cache||[]).find(x=>x.id===d.recId);
      if(!r){ if(Date.now()-new Date(d.at)<7*864e5) left.push(d); continue; }   // 목록을 아직 못 받았으면 다음에
      const ph=parseHist(r); attach(ph.tasks); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${title} 출력`});
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
    }
    try{ left.length ? localStorage.setItem(DOCS_LS, JSON.stringify(left)) : localStorage.removeItem(DOCS_LS); }catch(_){}
    if(list.length>left.length){ await store.list(); toast('견적서 사이트에서 출력해 과업 「생성」을 체크했습니다.'); }
  } finally { takingDocs=false; }
}
window.addEventListener('storage', e=>{ if(e.key===DOCS_LS && e.newValue) takeDocs(); });
window.addEventListener('focus', ()=>{ if(window.__tasksReady) takeDocs(); });

// 결제 확인 알림:결제링크를 보낸 다음날부터, 이 창을 열면 아직 확인 안 한 예약을 띄움 (하루 한 번)
function duePayChecks(){
  const today=ymd(new Date());
  // 결제링크를 보낸(「결제링크 전송」) 다음날부터. 보내기 전이면 알림 없음 (예전 기록은 과업이 생긴 다음날부터)
  return (cache||[]).map(r=>{ const ph=parseHist(r), t=ph.tasks.find(t=>t.id==='paycheck' && !t.done); if(!t) return null; const x=xOf(r); if(x.paidAt) return null;
    const base = x.linkSent || (ph.tasks.some(y=>y.id==='linksend') ? '' : t.at); return base && ymd(new Date(base))<today ? {r,t} : null; }).filter(Boolean);
}
function checkPayPopup(force){
  if(BOOK_ONLY || MY_EMBED) return;   // 예약 현황 공유 페이지 · 나의 할일 팝업 안에서는 안 함
  const today=ymd(new Date()); let seen=''; try{ seen=sessionStorage.getItem('sayuwon_paycheck_seen')||''; }catch(_){}
  if(!force && seen===today) return;
  const due=duePayChecks();
  if(!due.length){ $('#payModal').hidden=true; return; }
  try{ sessionStorage.setItem('sayuwon_paycheck_seen', today); }catch(_){}
  $('#payList').innerHTML = due.map(({r,t})=>`<li><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date))}${r.owner?` · ${esc(r.owner)}`:''}<br><small class="hint" style="margin:0">결제링크 ${esc(mdLabel(ymd(new Date(t.at))))} 전송${t.memo?` · ${esc(t.memo)}`:''}</small></span><button class="btn primary" data-pcdone="${esc(r.id)}">입금 확인함</button><button class="btn" data-pcopen="${esc(r.id)}">열기</button></li>`).join('');
  $('#payModal').hidden=false;
}
$('#payLater').onclick=()=>{ $('#payModal').hidden=true; };
$('#payList').addEventListener('click', async e=>{
  const done=e.target.dataset.pcdone, open=e.target.dataset.pcopen;
  if(open){ const r=cache.find(x=>x.id===open); $('#payModal').hidden=true; if(r) openRecordG(r); }
  if(done){
    const r=cache.find(x=>x.id===done); if(!r) return;
    if(editingId===done){ const t=tasks.find(x=>x.id==='paycheck'); if(t){ t.done=true; t.doneAt=new Date().toISOString(); } await save(true); }
    else {
      const ph=parseHist(r), now=new Date().toISOString(), t=ph.tasks.find(x=>x.id==='paycheck'); if(t){ t.done=true; t.doneAt=now; }
      ph.h.push({t:now, by:savedOwner()||'', what:'[과업] 결제 확인 완료'});
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
    }
    await store.list(); toast('결제 확인으로 표시했습니다.'); checkPayPopup(true);
  }
});
const fmt=s=>dtLabel(s);
const LIST_SHOW_DEF = {'예약상담':false, '가예약':true, '예약확정':true, '예약취소':false};   // 단체예약 목록에 보일 단계 (기본 = 가예약 · 예약확정, 버튼으로 켜고 끔 · 브라우저에 기억, 2026-11-18)
let listShow = {...LIST_SHOW_DEF, ...SY.readJSON('sayuwon_list_show', {})};
let listSort = (()=>{ try{ return localStorage.getItem('sayuwon_list_sort')||'date'; }catch(_){ return 'date'; } })();   // 기본 방문일 순
document.addEventListener('click', e=>{ const b=e.target.closest('#sortSeg button'); if(b){ listSort=b.dataset.o; try{ localStorage.setItem('sayuwon_list_sort', listSort); }catch(_){} renderList(); } });
// 정렬: 방문일 순(가까운 날부터, 날짜 없으면 뒤) · 접수 순(최근 접수부터)
const listOrder = (a,b) => listSort==='saved' ? String(b.saved||'').localeCompare(String(a.saved||'')) : ((a.date||'9999')).localeCompare(b.date||'9999') || String(a.saved||'').localeCompare(String(b.saved||''));
// 담당자: 이름(전화번호), 여러 명이면 쉼표로
function contactCell(r){ const sp=v=>String(v||'').split(/\s*\/\s*/); const n=sp(r.contact), p=sp(r.phone);
  return n.map((x,i)=>[x.trim(), (p[i]||'').trim()]).filter(([x,y])=>x||y).map(([x,y])=>y ? `${esc(x)}(${esc(y)})` : esc(x)).join(', '); }
document.addEventListener('click', e=>{ const b=e.target.closest('#stageFilter button'); if(!b) return; const s=b.dataset.f; listShow[s]=!listShow[s]; SY.writeJSON('sayuwon_list_show', listShow); renderList(); });   // 단계 버튼: 누르면 켜고 끔
let listSearchT=null; document.addEventListener('input', e=>{ if(e.target.id!=='listSearch') return; clearTimeout(listSearchT); listSearchT=setTimeout(renderList, 150); });
async function renderList(){
  // 예전 기록의 '단체예약'도 함께 (일반 문의·기타는 제외)
  const all=(await store.list()).filter(r=>['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약'));
  const del=id=>`<span class="row-acts"><button class="btn act-fix" data-fix="${id}" title="목록에 보이는 단계 · 전산 · 견적서 · 거래명세서 상태 고치기">수정</button><button class="btn act-del" data-del="${id}" title="이 예약 삭제 (사유를 고른 뒤)">삭제</button></span>`;
  const needCall = r => /^자동 등록/.test(r.summary||'');
  const nCall = all.filter(needCall).length;
  // 단계: 시트 '통화 구분' 칸 (예전 이름은 normStage). 예전 '단체예약'은 결제 · 전산으로 판단. 관리자 사이트에서 온 예약은 예약확정
  const stageOf = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약확정' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto({...r, ...unpackExtra(r)});
  const erpOf = r => /^adm/.test(r.id) || !!unpackExtra(r).erp;
  // 목록 = 전체 (지난 예약 포함). 기본은 가예약 · 예약확정만, 「예약상담」 · 「예약취소」는 버튼으로 켜고 끔 (2026-11-18)
  const today=todayYmd(), isPast = r => !!r.date && r.date < today;
  const counts = Object.fromEntries(STAGES.map(s=>[s, all.filter(r=>stageOf(r)===s).length]));
  $('#callCount').hidden = !nCall; $('#callCount').textContent = `전화 필요 ${nCall}`; $('#listCount').textContent = counts['가예약']+counts['예약확정'];
  $('#adminHint').textContent = adminData?.updated ? `관리자 사이트 ${fmtAgo(adminData.updated)} 갱신 · ` : '';
  document.querySelectorAll('#stageFilter button').forEach(b=>{ const s=b.dataset.f; b.classList.toggle('on', !!listShow[s]); b.textContent=`${s} ${counts[s]||0}`; b.title=listShow[s] ? '누르면 숨기기' : '누르면 보이기'; });
  { const ss=$('#stageSum'); if(ss) ss.textContent=''; }   // 「보기」 글자는 없앰 (2026-11-18)
  // 검색어가 있으면 단계 버튼과 상관없이 모두에서 업체명 · 담당자 이름 · 전화번호(숫자만 비교) · 영업 담당으로 찾음
  const q=String($('#listSearch')?.value||'').trim(), qd=q.replace(/\D/g,''), qs=q.replace(/\s/g,'').toLowerCase();
  const hit = r => { const t=[r.org, r.contact, r.owner, r.takenBy, r.email].join(' ').replace(/\s/g,'').toLowerCase(); return (qs && t.includes(qs)) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd)); };
  const stageOn = s => !!listShow[s];
  const shown = q ? all.filter(hit) : all.filter(r=>stageOn(stageOf(r)));
  document.querySelectorAll('#stageFilter button').forEach(b=>b.classList.toggle('dim', !!q));   // 검색 중에는 단계 버튼이 적용 안 됨
  document.querySelectorAll('#sortSeg button').forEach(b=>b.classList.toggle('on', b.dataset.o===listSort));
  listView = { shown, stageOf, erpOf };   // 엑셀로 내려받기에 씀
  const stageTag = r => { const s=stageOf(r), cw=s==="예약취소" ? unpackExtra(r).cancelWhy : ""; return `<span class="tag st-${s}"${cw?` title="취소 사유: ${esc(cw)}"`:""}>${s}</span>`; };   // 예약취소는 마우스를 올리면 사유
  // 방문일 순: 오늘부터 가까운 날 → 날짜 없음 → 지난 예약(최근 방문부터, 흐리게)
  const order = listSort==='date' ? (a,b)=>{ const pa=isPast(a), pb=isPast(b); if(pa!==pb) return pa?1:-1; return pa ? String(b.date).localeCompare(String(a.date)) : listOrder(a,b); } : listOrder;
  $('#listBody').innerHTML=shown.slice().sort(order).map(r=>`<tr class="r${isPast(r)?' past':''}${stageOf(r)==='예약취소'?' cancel':''}" data-id="${r.id}"><td class="num">${dateLabel(r.date)}</td><td>${stageTag(r)}</td><td>${needCall(r)?'<span class="tag call">전화 필요</span> ':''}${esc(r.org||(needCall(r)?`예약자 ${r.contact||''}`:''))}${needCall(r)?`<br><small class="hint">${esc((r.summary||'').replace(/^자동 등록 · 전화 필요 · /,''))}</small>`:''}</td><td class="contacts-cell">${contactCell(r)}</td><td class="num">${esc(r.people)}</td><td class="num">${esc((r.tin||'')+(r.tout?'~'+r.tout:''))}</td><td>${esc(mealSum(r))}</td><td>${docTag(r,"quote")}</td><td>${docTag(r,"stmt")}</td><td class="owner">${esc(r.owner||r.takenBy)}</td><td class="num">${fmt(r.saved)}</td><td class="acts">${del(r.id)}</td></tr>`).join('')
    || `<tr><td colspan="12" class="hint">${q ? `'${esc(q)}'(으)로 찾은 예약이 없습니다.` : all.length?'보이는 단계에 해당하는 예약이 없습니다.':'저장한 단체예약이 없습니다.'}</td></tr>`;
  // 캘린더 보기: 같은 단계 버튼 · 검색으로 고른 예약을 달력에
  const calList = shown;
  paintListView(); if(listViewMode==='cal') renderListCal(calList, stageOf, erpOf, needCall);
  document.querySelectorAll('#listBody tr.r').forEach(tr=>tr.onclick=async e=>{
    if(e.target.dataset.del){ e.stopPropagation(); openDel(e.target.dataset.del); return; }
    if(e.target.dataset.fix){ e.stopPropagation(); openFix(e.target.dataset.fix); return; }
    const r=cache.find(x=>x.id===tr.dataset.id); if(!r) return;
    openRecordG(r);
  });
  renderInfo(curInfoKey);
}
// ---- 단체예약 목록 · 캘린더 보기 (2026-11-18): 표 / 캘린더 버튼, 고른 보기는 이 브라우저에 기억 ----
let listViewMode = (()=>{ try{ return localStorage.getItem('sayuwon_list_view')==='cal' ? 'cal' : 'table'; }catch(_){ return 'table'; } })();
let calMonth = todayYmd().slice(0,7);   // 보고 있는 달 YYYY-MM
function paintListView(){
  document.querySelectorAll('#viewSeg button').forEach(b=>b.classList.toggle('on', b.dataset.v===listViewMode));
  $('#listModal .tw').hidden = listViewMode==='cal'; $('#listCal').hidden = listViewMode!=='cal';
  $('#sortSeg').style.visibility = listViewMode==='cal' ? 'hidden' : '';   // 캘린더는 날짜 순이라 정렬이 필요 없음
}
document.addEventListener('click', e=>{ const b=e.target.closest('#viewSeg button'); if(!b) return; listViewMode=b.dataset.v; try{ localStorage.setItem('sayuwon_list_view', listViewMode); }catch(_){} renderList(); });
function renderListCal(list, stageOf, erpOf, needCall){
  const [Y,M]=calMonth.split('-').map(Number), first=new Date(Y,M-1,1), days=new Date(Y,M,0).getDate(), lead=first.getDay(), today=todayYmd();
  const byDay={}; list.forEach(r=>{ if(r.date && r.date.slice(0,7)===calMonth) (byDay[r.date]=byDay[r.date]||[]).push(r); });
  const nMonth=Object.values(byDay).reduce((a,x)=>a+x.length,0), noDate=list.filter(r=>!r.date).length;
  const ev = r => { const s=stageOf(r), noE = false;   // 전산 미등록 표시는 없앰 (2026-11-18)
    return `<button type="button" class="lc-ev st-${esc(s)}${noE?' noerp':''}" data-cid="${esc(r.id)}" title="${esc([r.org||r.contact, s, noE?'전산 미등록':'', r.people?r.people+'명':'', r.tin?'입장 '+r.tin+(r.tout?'~'+r.tout:''):'', r.owner||r.takenBy].filter(Boolean).join(' · '))}">${r.tin?`<i>${esc(r.tin)}</i>`:''}${needCall(r)?'☎ ':''}${esc(r.org||r.contact||'(업체 미정)')}${r.people?` <em>${esc(r.people)}명</em>`:''}</button>`; };
  let cells=''; for(let i=0;i<lead;i++) cells+='<div class="lc-d lc-off"></div>';
  for(let d=1; d<=days; d++){ const k=`${calMonth}-${String(d).padStart(2,'0')}`, dow=new Date(Y,M-1,d).getDay(), evs=(byDay[k]||[]).sort((a,b)=>String(a.tin||'99').localeCompare(String(b.tin||'99')));
    cells+=`<div class="lc-d${k===today?' lc-today':''}${k<today?' lc-past':''}"><div class="lc-n${dow===0?' sun':dow===6?' sat':''}">${d}${evs.length>1?`<small>${evs.length}건</small>`:''}</div>${evs.map(ev).join('')}</div>`; }
  const tail=(7-(lead+days)%7)%7; for(let i=0;i<tail;i++) cells+='<div class="lc-d lc-off"></div>';
  $('#listCal').innerHTML = `<div class="lc-bar"><button type="button" class="btn" data-cm="-1" title="이전 달">‹</button><b>${Y}년 ${M}월</b><button type="button" class="btn" data-cm="1" title="다음 달">›</button><button type="button" class="btn" data-cm="0">이번 달</button><small class="hint">이 달 ${nMonth}건${noDate?` · 방문일 없는 예약 ${noDate}건은 표에서`:''} · 연한 초록 = 예약상담 · 중간 초록 = 가예약 · 초록 = 예약확정 · 회색 = 예약취소 · 누르면 예약 열기</small></div>`
    + `<div class="lc-grid">${[...DOW].map((w,i)=>`<div class="lc-h${i===0?' sun':i===6?' sat':''}">${w}</div>`).join('')}${cells}</div>`;
}
$('#listCal').addEventListener('click', e=>{
  const m=e.target.closest('[data-cm]'); if(m){ const v=+m.dataset.cm; if(!v) calMonth=todayYmd().slice(0,7); else { const [y,mo]=calMonth.split('-').map(Number), d=new Date(y, mo-1+v, 1); calMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; } renderList(); return; }
  const c=e.target.closest('[data-cid]'); if(c){ const r=cache.find(x=>x.id===c.dataset.cid); if(r) openRecordG(r); }
});
// 저장된 예약 하나를 칸에 불러오기
function openRecord(r){
    newCall(false);
    KEYS.forEach(k=>{ rec[k]=r[k]||''; if(rec[k]) touched.add(k); });
    LEGACY_KEYS.forEach(k=>{ if(r[k]) rec[k]=r[k]; });   // 예전 프로그램 값은 그대로 들고 있다가 다시 저장
    if(r.mabangD) rec.mabangD=r.mabangD;   // 예전 '마방 디너' 값도 그대로
    if(!rec.owner) rec.owner=savedOwner();   // 자동 등록된 예약 등 담당이 비어 있으면 이 컴퓨터의 영업 담당
    rec.tbd='';   // 새 통화 기본 미정(차량 대수 · 결제 방법)이 저장된 예약에 섞이지 않게 — 그 예약의 미정 항목만 (2026-11-18)
    const ex=unpackExtra(r); Object.assign(rec,ex); Object.keys(ex).forEach(k=>touched.add(k));
    if(!rec.pay) rec.pay='미정';   // 결제를 안 고른 예전 기록은 미정으로
    if(!rec.gate) rec.gate='미정';   // 입장문을 안 고른 예전 기록도 미정으로
    if(rec.seminar2){ rec.seminar=String((numOf(rec.seminar)||1)+(numOf(rec.seminar2)||1)); rec.seminar2=''; }   // 예전 「세미나 도슨트(2)」 줄 → 세미나 도슨트 수량 2 (시간 · 장소 · 비고는 두 번째 칸 그대로, 2026-11-18)
    { const gl=goodsParse(rec.goods), mv=gl.filter(g=>goodsKeyOf(g.src)); if(mv.length){ mv.forEach(g=>{ const c=goodsKeyOf(g.src); rec[c]=String((numOf(rec[c])||0)+(g.qty||0)); }); rec.goods=goodsJoin(gl.filter(g=>!goodsKeyOf(g.src))); } }   // 굿즈로 넣은 음료쿠폰(가가빈빈) → 예전 칸 gaga 한 줄로 (같은 품목이 두 줄이 되지 않게, 2026-11-18)
    syncPayTbd(rec);   // 결제가 미정이면 미정 항목 '결제 방법'
    if(/^adm/.test(r.id) && !rec.erp) rec.erp='관리자 예약';   // 관리자 사이트에서 온 예약은 이미 전산에 있음
    rec.stage = STAGES.includes(normStage(r.callType)) && normStage(r.callType)!==stageAuto(rec) ? normStage(r.callType) : '';   // 결제로 정해지는 단계와 다를 때만 직접 고른 것으로
    const cs=splitContacts(r); Object.assign(rec,cs); Object.keys(cs).forEach(k=>{ if(cs[k]) touched.add(k); });
    nContacts=Math.max(1,nContactsOf(rec)); editingId=r.id; openedRaw=rawPick(r); openedObj=liveVals(r); $('#memoBox').value=r.note||'';
    const ph=parseHist(r); hist=ph.h; tasks=ph.tasks; erpList=ph.erp||[]; memos=ph.memos||[];
    { const o=(r.owner||r.takenBy||'').trim(), me=savedOwner(); lockOwner = o && me && o!==me ? o : ''; } paintLock(); acquireEdit(r.id);   // 남이 담당인 예약: 잠금 (메모만)
    renderContacts(); renderForm(); resetWarn(true); baseSnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty(); closeList(); window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>syncSavedTasks(r.id), 1200);   // 화면에서 저절로 바뀐 과업 상태를 저장된 예약에도 (나의 할일 · 대시보드가 같게)
}

// 관리자 사이트에서 지금 가져오기 (평소에는 Apps Script 가 15분마다 자동으로)
$('#adminSyncBtn').onclick=async()=>{
  const b=$('#adminSyncBtn'); b.disabled=true; b.textContent='가져오는 중…';
  try{
    const j=await SY.call({action:'syncAdmin'});
    if(j.admin) { adminData=j.admin; writeJSON(ADMIN_LS,adminData); }
    toast(`가져왔습니다 · 15명 이상 ${j.result.big}건 중 새로 ${j.result.added}건 등록`);
    await pull();
  }catch(e){
    toast('가져오지 못했습니다: '+e.message);
  }finally{ b.disabled=false; b.textContent='관리자 사이트에서 지금 가져오기'; }
};

// ===================== 새 통화·단축키 =====================
function newCall(withToast=true){
  resetState(); clearInterval(timerInt); tick(); $('#memoBox').value=''; status('');
  hist=[]; baseSnap=null; tasks=[]; erpList=[]; tbdAuto=false; memos=[]; lockOwner=''; if(typeof releaseEdit==='function') releaseEdit(); { const hd=document.getElementById('histDet'); if(hd) hd.open=false; }   // 수정 기록은 예약을 열 때마다 접어 둠
  renderHist(); if(typeof paintLock==='function') paintLock();
  renderContacts(); renderForm(); resetWarn(false); emptySnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty();
  if(withToast){ toast('새 통화를 시작합니다.'); $('#memoBox').focus(); }
}
$('#newBtn').onclick=async()=>{   // 새 통화: 고치던 내용이 있으면 바로 저장하고 새 통화 (저장할 수 없으면 예전처럼 묻기, 2026-11-17)
  if(isDirty() && canSave() && !lockOwner){ await save({auto:true}); if(!isDirty()){ newCall(false); toast('고치던 내용을 저장하고 새 통화를 시작합니다.'); $('#f_org')?.focus(); return; } }
  guardLeave(()=>newCall()); };
