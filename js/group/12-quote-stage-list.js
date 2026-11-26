// ▣ js/group/12-quote-stage-list.js — 견적서에 넘길 품목 줄과 할인 줄 계산(quoteBlocks · 단체 할인은 줄 인원 기준) · 견적서 · 거래명세서 화면으로 넘기기 · 발급 내역 · 예약 단계(상담 · 가예약 · 확정 · 취소) · 단체상담 글 읽기 · 엑셀 내려받기 · 단체 예약 목록 · 목록의 「수정」
// ===================== 견적서 발급: 견적서&거래명세서 사이트로 넘기기 =====================
// 그 사이트의 '예약 정보 붙여넣기'가 읽는 형식(방문일자 · 상품정보 · 방문자정보 · 예약인원 · * 할인)으로 만들어
// 같은 사이트(hyunbin5786.github.io) 저장소에 두고 연다. 그쪽이 자동 채우기를 한다.
const QUOTE_URL = QUOTE_PAGE + '?from=intake';
// 관람권: 방문일 요일로 평일 / 주말·공휴일, 입장 시각이 13:00 이후면 13-18 관람권 (그 전이거나 모르면 9-18)
function tinHour(t){ t=String(t||''); const m=t.match(/(\d{1,2})\s*(?::|시)/) || t.match(/^\s*(\d{1,2})\s*$/); if(!m) return null; let h=+m[1]; if(/오후|저녁|pm/i.test(t) && h<12) h+=12; return h; }
// 공휴일 (대체공휴일 · 선거일 포함). 토·일이 아닌데 주말/공휴일 가격을 받는 날. 해마다 인사혁신처 고시를 보고 추가
const HOLIDAYS = new Set([
  // 2026
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-01','2026-05-05','2026-05-25','2026-06-03',
  '2026-07-17','2026-08-17','2026-09-24','2026-09-25','2026-10-05','2026-10-09','2026-12-25',
  // 2027
  '2027-01-01','2027-02-08','2027-02-09','2027-03-01','2027-05-03','2027-05-05','2027-05-13','2027-07-19',
  '2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-04','2027-10-11','2027-12-27',
]);
const isRedDay = date => { const d=new Date(date+'T00:00'); return !isNaN(d) && (d.getDay()===0 || d.getDay()===6 || HOLIDAYS.has(date)); };
function viewSrcOf(r){ const we=isRedDay(r.date), h=tinHour(r.tin), day=we?'주말/공휴일':'평일';
  if(r.viewSrc && !/\(\d\d:00~18:00\)/.test(r.viewSrc)){ const s=String(r.viewSrc).replace(/^(평일|주말\/공휴일)/, day); if(priceOf(s)!=null) return s; }   // 시간대 관람권(9~18 · 13~18)은 입장 시각으로 자동, 그 밖(학생 등)은 고른 것
  return `${day} 관람(${h!=null && h>=13 ? '13:00~18:00' : '09:00~18:00'})`; }
['focusout'].forEach(ev=>document.addEventListener(ev, e=>{ if(!e.target.closest || !e.target.closest('#form [data-k="tin"]')) return;   // 입장시각 칸을 나갈 때
  setTimeout(()=>{ if(fmtTime(rec.tin) && syncViewTime()){ renderItems(true); renderSide(); toast(`입장시각에 맞춰 관람권을 ${(tinHour(rec.tin)??0)>=13?'13~18시':'9~18시'}로 바꿨습니다.`); } }, 0); }));
// 시간대 관람권: 입장시각 13시 이후 = 13~18시, 그 밖(모름 포함) = 9~18시
const timedViewSrc = r => `${r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'} 관람(${(tinHour(r.tin)??0)>=13 ? '13:00~18:00' : '09:00~18:00'})`;
// 입장시각이 바뀌면 예약 내역의 시간대 관람권(9~18 ↔ 13~18)도 따라 바뀜 (인원 · 줄은 그대로)
function syncViewTime(){
  const list=viewsParse(rec.views), i=list.findIndex(x=>/관람\((09|13):00~18:00\)/.test(x.src)); if(i<0) return false;
  const wantT=(tinHour(rec.tin)??0)>=13 ? '13' : '09', curT=list[i].src.match(/\((\d\d):00~/)[1]; if(curT===wantT) return false;
  const old='v:'+list[i].src; list[i].src=list[i].src.replace(/\(\d\d:00~18:00\)/, `(${wantT}:00~18:00)`);
  rec.views=goodsJoin(list); touched.add('views'); const ri=itemRows.indexOf(old); if(ri>=0) itemRows[ri]='v:'+list[i].src; return true;
}
// 관람 영역: 기본 관람권 + 관람 포함 품목(관람+식사 패키지 · 다른 관람권 · 새벽 해오름 산책). 품목 이름의 평일 · 주말은 방문일에 맞춤
const daySrc = (src, r) => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일', s=String(src).replace(/^(평일|주말\/공휴일)/, day); return priceOf(s)!=null ? s : src; };
const viewsParse = v => goodsParse(v);   // "품목 x5 · 품목 x10"
const areaOthers = r => { const n=numOf(r.people), cnt=v=>v?(numOf(v)||n):0; return cnt(r.sadam1)+cnt(r.sadam2)+cnt(r.sadamD)+cnt(r.haeorum)+viewsParse(r.views).reduce((s,x)=>s+x.qty,0); };
const viewAuto = r => Math.max(0, numOf(r.people) - areaOthers(r));   // 기본 관람 줄 = 관람 인원 − 다른 관람 영역
const effViewN = r => String(r.viewN||'').trim()!=='' ? numOf(r.viewN) : viewAuto(r);   // 직접 줄였으면 그 수
const viewLabel = src => { const m=String(src).match(/\((\d\d):00~(\d\d):00\)/); return itemLabel(src) + (m ? ` (${+m[1]}~${+m[2]}시)` : ''); };   // "관람 (9~18시)" · "관람 (학생)"
// 예약 내역 관람 줄 드롭다운: 품목 관리의 관람 품목 중 방문일(평일 · 주말)에 맞는 것 (네이버 제외)
const viewItems = r => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'; return catalogItems().filter(it=>it.kind==='view' && !it.merged && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null); };
function quoteBlocks(r){
  const n = numOf(r.people), we = isRedDay(r.date);
  const DAY = we ? '주말/공휴일' : '평일';
  const cnt = v => v ? (numOf(v) || n) : 0;   // 'O' 처럼 숫자가 없으면 전체 인원
  const mbM = mbMenuOf(r);   // 몽몽마방은 단체도 관람과 따로: 관람권 + 고른 메뉴 품목 (사유의 밥상이면 사유의 밥상(단체))
  const blocks=[], skipped=[];
  const add=(product, qty, disc, key)=>{ if(!(qty>0)) return; const b={product, qty, disc, key};   // key = 예약 내역 줄 (할인 버튼)
    const ns = key && canStu(key, r) ? Math.min(qty, istuMap(r)[dkey(key)]||0) : 0, sd = ns ? stuDiffOf(product) : 0; if(ns && sd){ b.stu=ns; b.stuDiff=sd; }   // 학생 인원 (2026-11-20)
    blocks.push(b); };
  // 관람 자동 줄 없음 (2026-11-14): 관람권도 예약 내역에서 직접 고른 것만 계산
  // 관람 + 사담(런치 1부 · 2부 · 디너)은 모두 사전예약 5% · 단체예약 10% 할인 대상 (2026-11-20 디너도 · 견적서 품목과 같음). 품목 관리에서 할인 대상을 끄면 그대로 따름
  const sdDisc = s => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(s)); return it ? !!it.disc : true; };
  [['sadam1','사담 런치1부'],['sadam2','사담 런치2부'],['sadamD','사담 디너']].forEach(([k,nm])=>{ const s=`${DAY}(관람, ${nm})`; add(s, cnt(r[k]), sdDisc(s), k); });
  viewsParse(r.views).forEach(v=>{ const s=daySrc(v.src, r), it=catalogItems().find(x=>normSrc(x.src)===normSrc(s)); add(s, v.qty, it ? !!it.disc : /관람\(/.test(s), 'v:'+v.src); });   // 관람 영역의 다른 품목 (할인 대상은 품목 관리 기준)
  if(r.mabangL && mbM) add(mbM.src, cnt(r.mabangL), false, 'mb');   // 고른 메뉴 품목 (품목 리스트 가격)
  else if(r.mabangL && Number(r.mabangPrice)){ add('몽몽마방 단품', cnt(r.mabangL), false); blocks[blocks.length-1].price=Number(r.mabangPrice); }   // 예전 기록: 적어 둔 단가
  else if(r.mabangL) skipped.push('몽몽마방 (메뉴를 고르면 계산)');
  if(r.mabangD) skipped.push('몽몽마방 디너');
  goodsParse(r.goods).forEach(g=>add(g.src, g.qty, false, 'g:'+g.src));   // 굿즈: 품목 리스트 가격 그대로
  // 프로그램: 개별은 인원(숫자가 없으면 전체 인원), 시간은 시간 수(숫자가 없으면 1시간). 같은 견적서 품목이면 합침
  PROG_KEYS().forEach(k=>{ if(!r[k]) return; const src=progSrc(k, r); const q = UNIT(k)==='시간' ? (numOf(r[k])||1) : cnt(r[k]);
    if(!src){ skipped.push(LABEL[k]); return; } const b=blocks.find(b=>b.product===src); if(b) b.qty+=q; else add(src, q, false, k); });
  if(r.teaMed) skipped.push('티하우스 명상'); if(r.gayageum) skipped.push('가야금'); if(r.cabin) skipped.push('유루 캐빈');
  // 할인 줄: 특별 할인 인원을 할인 대상 블록에 앞에서부터 나눠 넣고, 나머지는 단체 할인
  const g = Math.round(groupRate(n)*100), gName = n>=20 ? '단체예약' : '사전예약';
  // 줄마다 넣은 특별 할인(rec.isp)이 있으면 그 줄에만, 없으면(예전 기록) 예약 전체 인원을 할인 대상 블록에 앞에서부터
  const ispOn = !!String(r.isp||'').trim(), im = ispOn ? ispMap(r) : {};
  const sp = ispOn ? [] : specialCounts(r).map(s=>({...s, left:s.n})), ov = idiscMap(r);
  blocks.forEach(b=>{
    b.notes=[];
    // 할인 버튼: 자동 = 할인 대상 품목이면 인원으로(19명까지 사전예약 5% · 20명부터 단체예약 10%), 줄마다 버튼으로 바꾼 것(항목 할인)이 있으면 그것
    // 2026-11-21: 그 품목(줄) 인원으로 — 관람만이든 관람+식사든 그 줄이 20명 이상이면 단체예약 10% (예전엔 전체 관람 인원)
    const autoP = b.disc ? Math.round(groupRate(b.qty)*100) : 0, o = ov[dkey(b.key||'')], pct = o==='none' ? 0 : o==='pre' ? 5 : o==='grp' ? 10 : autoP, nm = pct===10 ? '단체예약' : '사전예약';
    b.dauto = DISC_OF(autoP); b.dsel = o && DISC_OPTS.some(x=>x[0]===o) ? o : b.dauto; b.gN=0;   // gN = 사전예약 · 단체예약 할인을 받는 인원 (특별 할인이 더 큰 사람은 빼고)
    const mine = ispOn ? SPECIAL.filter(s=>((im[dkey(b.key||'')]||{}).sp||{})[s.k]).map(s=>({...s, left:im[dkey(b.key||'')].sp[s.k]})) : (b.disc ? sp : []);
    if(!mine.length && (o==='none' || (!b.disc && !pct))) return;
    let left=b.qty;
    mine.forEach(s=>{ const c=Math.min(s.left,left); if(c<=0) return; s.left-=c; left-=c;
      const sp2=Math.max(Math.round(s.rate*100), pct); if(sp2===pct) b.gN+=c; b.notes.push(`* ${sp2===pct?nm:s.short} ${c}명 ${sp2}%`); });
    if(left>0 && pct){ b.notes.push(`* ${nm} ${left}명 ${pct}%`); b.gN+=left; }
  });
  return {blocks, skipped};
}
function quoteRaw(r, blocks){
  const d = r.date.replace(/-/g,'.');
  return blocks.map(b=>[`방문일자(순번)\t${d} (0)`, `상품정보\t${b.product}`, `방문자정보\t${r.org||''}`, `예약인원\t${b.qty}명${b.stu ? `(어른 : ${b.qty-b.stu}명,학생 : ${b.stu}명)` : ''}`, ...b.notes].join('\n')).join('\n\n');
}
// 관람 인원이 바뀌었는데 예약 내역의 관람 줄은 그대로일 때 (2026-11-19): 시간대 관람권 줄(9~18 · 13~18) 인원을 「관람 인원 − 다른 관람 영역」에 맞춤
//  관람 인원을 고칠 때 · 견적서 · 거래명세서 · 사전답사를 누를 때. 줄이 없거나 맞추면 0명 이하가 되면 그대로
function fitViewToPeople(r){ const n=numOf(r.people); if(!n) return false;
  const list=viewsParse(r.views), i=list.findIndex(x=>/관람\((09|13):00~18:00\)/.test(x.src)); if(i<0) return false;
  const diff=n-areaOthers(r); if(!diff) return false; const q=list[i].qty+diff; if(q<=0) return false;
  list[i].qty=q; r.views=goodsJoin(list); return true; }
function fitViewNow(){ if(!fitViewToPeople(rec)) return false; touched.add('views'); if(typeof renderItems==='function') renderItems(true); renderSide(); return true; }
document.addEventListener('change', e=>{ if(e.target && e.target.id==='f_people') setTimeout(()=>{ pplTask(); if(fitViewNow()) toast(`관람 인원에 맞춰 예약 내역의 관람 줄 인원을 바꿨습니다 (${viewsParse(rec.views).map(x=>`${viewLabel(daySrc(x.src, rec))} ${x.qty}명`).join(', ')}).`, 3600); }, 0); });
// 저장한 예약의 관람 인원이 바뀌면 추후 과업 「예약 내역&전산 내역 확인」 (설명: 인원수 변경에 따른 예약 내역 확인, 2026-11-19)
function pplTask(){ const was=String((baseSnap||{}).people||'').trim(), now=String(rec.people||'').trim(); if(!editingId || !was || !now || was===now) return;
  if(typeof tcfgOf==='function' && (tcfgOf('pplchk')||{}).off) return;   // 추후과업 메시지 관리에서 끔 (2026-11-23)
  let t=tasks.find(x=>x.id==='pplchk');
  if(!t){ t={id:'pplchk', title:AUTO_TASKS.pplchk||PPL_TITLE, custom:true, done:false, at:new Date().toISOString(), due:(typeof tcfgDue==='function' && tcfgDue('pplchk', rec)) || todayYmd(), pplFrom:was}; tasks.push(t); }
  else if(t.done){ t.done=false; t.doneAt=''; t.at=new Date().toISOString(); t.due=todayYmd(); delete t.dueSet; t.pplFrom=was; t.changes=[]; }
  t.pplTo=now; t.changes=[...(t.changes||[]).filter(c=>!/^관람 인원 .* \(단체 화면\)$/.test(c)), `관람 인원 ${was} → ${now} (단체 화면)`]; renderTasks(); renderSide(); }   // 무엇이 바뀌었는지 과업 아래에 (2026-11-21)
// 「예약 내역&전산 내역 확인」 아래에 보이는 바뀐 내용 (예전 기록은 pplFrom → pplTo 로)
const pplChanges = t => (t.changes||[]).length ? t.changes : (t.pplFrom && t.pplTo ? [`관람 인원 ${t.pplFrom} → ${t.pplTo}`] : []);
// 열어 둔 예약이 다른 곳(다음날 고객 응대 준비 · 다른 PC)에서 바뀌면 (2026-11-19): 30초마다 받아 올 때 확인
//  고치던 것이 없으면 그 예약을 새로 불러오고, 고치는 중이면 내가 안 고친 칸만 받아 넣음 → 옛 내용으로 저장해 덮어쓰지 않게
const liveVals = r => { const x=unpackExtra(r||{}), o={}; ['org','people','date','tin','phone','vehicle','sadam1','sadam2','sadamD','mabangL'].forEach(k=>{ o[k]=String((r||{})[k]??'').trim(); }); o.gate=String(x.gate||'').trim(); o.views=String(x.views||'').trim(); return o; };
function liveSync(){
  try{
    if(!editingId || !openedObj || saving || lockOwner) return;
    const r=merged().find(x=>x.id===editingId); if(!r || r._pending || rawPick(r)===openedRaw) return;
    const nv=liveVals(r), keys=Object.keys(nv).filter(k=>nv[k]!==openedObj[k]);
    openedRaw=rawPick(r); if(!keys.length) return;
    const lab=k=>k==='views'?'관람 품목':(LABEL[k]||k), what=keys.map(k=>k==='views'?'관람 품목':`${lab(k)} ${openedObj[k]||'없음'} → ${nv[k]||'없음'}`).join(', ');
    if(!isDirty() && $('#listModal').hidden){ const y=window.scrollY; openRecord(r); window.scrollTo(0,y); toast(`다른 곳에서 바뀐 내용을 받아 왔습니다: ${what}`, 5000); return; }
    const took=keys.filter(k=>String(rec[k]??'').trim()===String(openedObj[k]??'').trim());
    took.forEach(k=>{ rec[k]=nv[k]; touched.add(k); });
    openedObj=nv;
    if(took.length){ renderForm(); if(typeof renderItems==='function') renderItems(true); renderSide(); toast(`다른 곳에서 바뀐 내용을 받아 넣었습니다: ${took.map(k=>k==='views'?'관람 품목':`${lab(k)} → ${nv[k]||'없음'}`).join(', ')}`, 5000); }
  }catch(e){ console.warn('liveSync', e); }
}
// 견적서 · 거래명세서 · 사전답사 버튼: 넘기기 전에 공유 기록의 최신 내용(다른 화면 · 다음날 고객 응대 준비에서 고친 것)으로 다시 불러옴 (2026-11-19)
//  이 화면에서 고치던 것이 있으면 그것이 지금 내용 → 그대로
async function freshRec(){
  if(!editingId || isDirty()) return false;
  try{ await pull(); }catch(_){ return false; }
  const r=(await store.list()||[]).find(x=>x.id===editingId); if(!r) return false;
  if(!openedRaw || rawPick(r)===openedRaw) return false;
  openRecord(r); toast('공유 기록의 최신 내용으로 다시 불러왔습니다.', 2400); return true;
}
// doc: 'quote'(견적서) | 'statement'(거래명세서). 저장된 예약이면 예약 ID도 넘겨, 견적서 사이트가 출력한 파일을 드라이브에 올리고 이 예약 과업에 링크를 돌려준다
async function openQuote(doc){
  const win=window.open('about:blank', '_blank');   // 누르는 순간 탭을 열어 둠 (불러오는 동안 팝업 차단 피하기)
  await freshRec(); fitViewNow();   // 최신 내용 + 관람 줄 인원을 관람 인원에 맞춤
  return openQuote2(doc, win);
}
async function openQuote2(doc, win){
  if(!rec.date || !numOf(rec.people)){ try{ win && win.close(); }catch(_){} toast('방문일과 관람 인원을 먼저 넣어 주세요.'); return; }
  // 버튼을 누르면 요청 체크가 켜지고(추후 과업 '견적서 발급' · '거래명세서 발급') 저장. 출력해서 파일이 돌아오면 하위 과업 '생성'이 체크됨
  const tid = doc==='statement' ? 'stmt' : 'quote';
  rec[tid==='stmt' ? 'wantStmt' : 'wantQuote'] = '있음'; touched.add(tid==='stmt' ? 'wantStmt' : 'wantQuote');
  renderSide();
  await save(true);   // 파일을 이 예약에 붙이려면 저장돼 있어야 함
  const {blocks, skipped} = quoteBlocks(rec);
  const c = contactsOf(rec)[0] || {};
  const email = (contactsOf(rec).map(x=>String(x.email||'').split(/[\s,;\/]+/).find(s=>/@/.test(s))||'').find(Boolean)) || '';   // 담당자 이메일 중 가장 위에 있는 것 → 견적서 메일 받는 사람 (2026-11-21)
  const h = { at:Date.now(), raw:quoteRaw(rec, blocks), client:rec.org||'', clientMgr:c.name||'', email, sender:savedOwner()||rec.owner||'', doc: doc||'quote', recId: editingId||'', org: rec.org||'', date: rec.date||'' };
  try{ localStorage.setItem('sy_intake_handoff', JSON.stringify(h)); }catch(_){ try{ win && win.close(); }catch(__){} toast('이 브라우저에서는 넘길 수 없습니다.'); return; }
  if(win && !win.closed) win.location.href=new URL(QUOTE_URL, location.href).href; else window.open(QUOTE_URL, '_blank');
  toast(`${doc==='statement'?'거래명세서':'견적서'} 사이트를 열었습니다 · ${blocks.length}개 상품${skipped.length?` · ${skipped.join(', ')}은(는) 직접 추가`:''} · 출력한 내용은 발급 내역에`);
}
// 발급 내역 (견적서 사이트 공유 저장소, 2026-11-21): 이 예약으로 발급한 견적서 · 거래명세서가 있으면 버튼에 ✓, 다시 누르면 발급 내역에서 그 문서를 엶
// 같은 예약 = 발급할 때 넘긴 예약 ID(snapshot.intakeRec) 또는 수신(업체) · 이용일(방문일)이 같은 것. 발급 취소한 것은 빼고
var quoteHist=null, quoteHistAt=0;   // var: paintDocBtns 가 먼저 불려도 되게
const QH_DATE = v => { v=String(v||''); if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const d=new Date(v); return isNaN(d) ? v.slice(0,10) : ymd(d); };
async function loadQuoteHist(force){
  if(BOOK_ONLY || (!force && Date.now()-quoteHistAt<60000)) return; quoteHistAt=Date.now();
  try{ const j=await SY.quote.get('history=1&limit=500');
    if(j && Array.isArray(j.history)){ quoteHist=j.history.map(h=>({ id:h.id, at:h.at, doc:h.doc, client:h.client, date:QH_DATE((h.snapshot&&h.snapshot.useDate)||h.useDate), rec:(h.snapshot&&h.snapshot.intakeRec)||'', canceled:h.canceled })); paintDocBtns(); } }catch(_){}
}
var DOC_KO = { quote:'견적서', statement:'거래명세서', stmt:'거래명세서' };
function issuedDocs(doc){
  if(!quoteHist || !rec) return [];
  const org=normSrc(rec.org), name=DOC_KO[doc];
  return quoteHist.filter(h=>!h.canceled && h.doc===name && ((editingId && h.rec===editingId) || (org && normSrc(h.client)===org && rec.date && h.date===rec.date)));
}
// 이미 발급했으면 발급 내역으로, 아니면 새로 발급
// 2026-11-25: 발급 내역으로 갈 때도 지금 예약 내용(최신으로 다시 불러온 것)을 같이 넘김 → 견적서 사이트에서 「수정발행」을 누르면
//  새 예약 내용으로 품목을 만들고 지난 발급의 결제 방식 · 내부용 / 외부용 · 외부용 바꾼 품목을 이어받음 (document/js/document.js reviseFresh)
async function docBtn(doc){
  // 2026-11-26: 이 문서는 아직 안 냈어도 다른 종류(견적서 ↔ 거래명세서)를 낸 적이 있으면 발급 내역으로 → 그 문서의 「수정발행」이 설정 · 외부용을 이어받아 이 문서를 만듦
  const mine=issuedDocs(doc).length, other=issuedDocs(doc==='statement'?'quote':'statement').length;
  if(!mine && !other){ openQuote(doc); return; }
  const win=window.open('about:blank', '_blank');   // 누르는 순간 탭을 열어 둠 (불러오는 동안 팝업 차단 피하기)
  await freshRec(); fitViewNow();
  if(!mine){   // 처음 내는 문서: 새로 발급할 때(openQuote2)처럼 요청 체크를 켜고 저장
    if(!rec.date || !numOf(rec.people)){ try{ win && win.close(); }catch(_){} toast('방문일과 관람 인원을 먼저 넣어 주세요.'); return; }
    const wk = doc==='statement' ? 'wantStmt' : 'wantQuote';
    rec[wk] = '있음'; touched.add(wk); renderSide();
    await save(true);
  }
  if(isDirty()) await save(true);   // 화면에서 고친 것까지 저장한 뒤 그 내용으로
  const {blocks} = quoteBlocks(rec), c = contactsOf(rec)[0] || {};
  const email = (contactsOf(rec).map(x=>String(x.email||'').split(/[\s,;\/]+/).find(s=>/@/.test(s))||'').find(Boolean)) || '';
  const h={ at:Date.now(), mode:'history', doc, recId:editingId||'', org:rec.org||'', date:rec.date||'',
    raw: blocks.length ? quoteRaw(rec, blocks) : '', client:rec.org||'', clientMgr:c.name||'', email, sender:savedOwner()||rec.owner||'' };
  try{ localStorage.setItem('sy_intake_handoff', JSON.stringify(h)); }catch(_){ try{ win && win.close(); }catch(__){} toast('이 브라우저에서는 넘길 수 없습니다.'); return; }
  if(win && !win.closed) win.location.href=new URL(QUOTE_URL, location.href).href; else window.open(QUOTE_URL, '_blank');
  toast(mine ? `${DOC_KO[doc]} 발급 내역을 열었습니다 · 예약이 바뀌었으면 「수정발행」 = 새 예약 내용 + 지난 설정`
    : `앞서 발급한 ${DOC_KO[doc==='statement'?'quote':'statement']}가 있어 발급 내역을 열었습니다 · 그 줄의 「수정발행」 = 그때 설정 · 외부용을 이어받아 ${DOC_KO[doc]} 만들기`, 5000);
}
$('#quoteBtn').onclick=()=>docBtn('quote');
$('#stmtBtn').onclick=()=>docBtn('statement');
window.addEventListener('focus', ()=>loadQuoteHist());   // 견적서 사이트에서 출력하고 돌아오면 ✓ 다시 (1분에 한 번)
setTimeout(()=>loadQuoteHist(true), 1500);
// 버튼 앞 체크: 켜면 추후 과업에 발급 과업(하위 과업 3개)이 생기고, 끄면 (손대지 않은) 과업이 빠짐
document.querySelectorAll('[data-want]').forEach(c=>c.addEventListener('change', ()=>{ const wk=c.dataset.want; rec[wk]=c.checked?'있음':''; touched.add(wk); startTimer(); renderSide(); }));

// ===================== 예약 단계 (2026-11-18 · 4단계) =====================
// 1 예약상담(연한 초록) = 상담만 · 2 가예약(중간 초록) = 전산에 등록했지만 결제 방식 미정 · 3 예약확정(초록) = 모든 사항이 정해짐 · 4 예약취소(회색) = 가예약 · 예약확정에서만
// 자동(점선): 결제 방식을 정했으면 예약확정, 전산 등록만 했으면 가예약, 아니면 예약상담. 버튼으로 직접 고를 수 있음 (예약취소는 직접만)
// 시트 '통화 구분' 칸에 단계 이름 그대로. 예전 이름: 예약접수 · 공식예약 → 예약확정, 상담 → 예약상담
const STAGES = ['예약상담','가예약','예약확정','예약취소'];
const OLD_STAGE = { '상담':'예약상담', '예약접수':'예약확정', '공식예약':'예약확정' };
const normStage = s => OLD_STAGE[s] || s;
const stageAuto = r => r.pay && r.pay!=='미정' ? '예약확정' : r.erp ? '가예약' : '예약상담';
const effStage = r => (STAGES.includes(r.stage) ? r.stage : '') || stageAuto(r);
const isBooked = s => s==='가예약' || s==='예약확정';   // 그날 자리 · 프로그램을 잡고 있는 예약 (예약 현황 · 방문 예정에 들어감)
const quietStage = s => s==='예약상담' || s==='예약취소';   // 추후 과업을 만들지 않는 단계
const needsErp = r => !quietStage(effStage(r));
function renderStage(){
  const s=effStage(rec), manual=STAGES.includes(rec.stage);
  document.querySelectorAll('#stageSeg button').forEach(b=>{ b.classList.toggle('on', b.dataset.s===s && manual); b.classList.toggle('guess', b.dataset.s===s && !manual);
    if(b.dataset.s==='예약취소'){ const base=rec.stage==='예약취소' ? '' : s; b.disabled = base==='예약상담'; b.title = b.disabled ? '예약취소는 가예약 · 예약확정에서만' : '예약 취소 (회색 · 추후 과업 없음)'; } });
  { const cw=$('#cancelWhyTxt'); if(cw){ const on=s==='예약취소' && !!rec.cancelWhy; cw.hidden=!on; cw.textContent=on ? '사유: '+rec.cancelWhy : ''; cw.title='눌러서 사유 고치기'; } }   // 예약취소 사유를 버튼 옆에
  const lbl = $('#saveBtn').firstChild; if(lbl) lbl.textContent = '저장'; $('#saveBtn').title = `${s}으로 저장 (Ctrl+S)`;   // 단계는 왼쪽 버튼에 보이므로 글자는 짧게
}
// 단계 버튼: 같은 버튼을 다시 누르면 자동으로 · 예약취소는 사유를 받은 뒤 (2026-11-18) · 다른 단계로 바꾸면 취소 사유는 지움
const CANCEL_REASONS = ['일정 변경','인원 부족','다른 곳 이용','날씨','단체 사정','기타'];
function setStage(s){ rec.stage=s; touched.add('stage'); if(s!=='예약취소' && rec.cancelWhy){ rec.cancelWhy=''; touched.add('cancelWhy'); } renderSide(); }
document.querySelectorAll('#stageSeg button').forEach(b=>b.onclick=()=>{
  const s=b.dataset.s;
  if(s==='예약취소' && rec.stage!=='예약취소'){ openCancel(); return; }
  setStage(rec.stage===s ? '' : s); });
function openCancel(){
  $('#cancelChips').innerHTML = CANCEL_REASONS.map(c=>`<button type="button" class="chip" data-cr="${esc(c)}">${esc(c)}</button>`).join('');
  $('#cancelWhy').value = rec.cancelWhy||''; $('#cancelModal').hidden=false; setTimeout(()=>$('#cancelWhy').focus(), 0); }
$('#cancelChips').addEventListener('click', e=>{ const c=e.target.closest('[data-cr]'); if(!c) return; const t=$('#cancelWhy'); t.value = c.dataset.cr==='기타' ? t.value : (t.value.trim() ? t.value.trim()+' · ' : '')+c.dataset.cr; t.focus(); });
$('#cancelNo').onclick=()=>{ $('#cancelModal').hidden=true; };
$('#cancelOk').onclick=()=>{ const v=$('#cancelWhy').value.trim().replace(/\s*\n+\s*/g,' · ');
  if(!v){ toast('취소 사유를 적어 주세요.'); $('#cancelWhy').focus(); return; }
  $('#cancelModal').hidden=true; rec.cancelWhy=v.replace(/\s\/\s/g,' · '); touched.add('cancelWhy'); setStage('예약취소');
  if(editingId) save({auto:true}); toast(`예약취소로 바꿨습니다 · 사유: ${rec.cancelWhy}`); };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#cancelModal').hidden){ e.preventDefault(); $('#cancelModal').hidden=true; } });
LABEL.stage='예약 단계'; LABEL.erp='전산 등록';

// ===================== 단체상담 입력: "항목<탭>값" 줄을 칸으로 =====================
// 머리말이 달라도 알아듣도록 비슷한 이름을 같이 둔다. 모르는 항목은 통화 메모에 "항목: 값" 으로 남김
const CONSULT_KEYS = [
  [/^(신청\s*번호|상담\s*번호|접수\s*번호)$/, 'consultNo'],
  [/^(상품|상품명|프로그램)$/, 'product'],
  [/^(기관명|단체명|업체명|회사명|학교명)$/, 'org'],
  [/^(소속|직책|직위|부서)$/, 'title'],
  [/^(성명|이름|담당자|담당자\s*성함|신청자)$/, 'name'],
  [/^(연락처|전화|전화번호|휴대폰|핸드폰|휴대전화)$/, 'phone'],
  [/^(이메일|메일|e-?mail)$/i, 'email'],
  [/^(일자|방문일|방문\s*일자|날짜|이용일)$/, 'date'],
  [/^(인원|인원수|방문\s*인원|총\s*인원)$/, 'people'],
  [/^(시간|방문\s*시간|이용\s*시간)$/, 'time'],
  [/^(교통수단|차량|차종)$/, 'vtype'],
  [/^(주차\s*대수|차량\s*대수|대수)$/, 'vcount'],
  [/^(출발지|출발\s*지역)$/, 'origin'],
];
function parseConsult(text){
  const got={}, extra=[]; let sect='';   // sect: '답사' 이면 '답사 요청 정보' 아래 줄 (예약 칸을 덮지 않고 통화 메모로)
  String(text||'').split(/\r?\n/).forEach(line=>{
    const bare=line.replace(/[\t:：]+\s*$/,'').trim();   // 표에서 복사하면 제목 줄 끝에 탭이 붙기도 함
    if(/(요청\s*정보|상담\s*정보|답사\s*정보)$/.test(bare) && !/\t/.test(bare)){ sect = /답사/.test(bare) ? '답사' : ''; return; }   // 구역 제목 줄
    if(sect==='답사' && bare && !/\t/.test(line) && !/\s{2,}|[:：]/.test(bare)){ const s=bare.match(/^(\S+)\s+(.+)$/); if(s) extra.push(`[답사] ${s[1]}: ${s[2]}`); return; }   // 답사 줄은 띄어쓰기 한 칸이어도 메모로
    let m=null;
    if(!/\t/.test(line)){ const s=line.match(/^\s*(\S+)\s*[:：]?\s+(.+?)\s*$/); if(s && CONSULT_KEYS.some(([re])=>re.test(s[1].replace(/[:：]$/,'')))) m=[s[0],s[1].replace(/[:：]$/,''),s[2]]; }   // 띄어쓰기로 복사된 경우 (아는 항목 먼저)
    if(!m) m=line.match(/^\s*([^\t:：]+?)\s*(?:\t+|[:：]\s*|\s{2,})(.+?)\s*$/);
    if(!m) return;
    const key=m[1].trim(), val=m[2].trim(); if(!val) return;
    if(sect==='답사'){ extra.push(`[답사] ${key}: ${val}`); return; }   // 사전 답사 일정은 메모로 (방문일 · 인원을 덮지 않음)
    const hit=CONSULT_KEYS.find(([re])=>re.test(key));
    if(hit && !(hit[1] in got)) got[hit[1]]=val; else extra.push(`${key}: ${val}`);   // 같은 항목이 또 나오면 처음 것을 씀
  });
  const o={};
  if(got.org) o.org=got.org;   // 신청번호는 쓰지 않음
  // 상품: "관람+런치1부,도슨트프로그램" → 사담 1부 · 동행 도슨트 등 (인원 단위는 관람 인원, 시간 단위는 1시간)
  if(got.product){
    const p=got.product.replace(/\s/g,''), ppl=(String(got.people||'').match(/\d+/)||[''])[0]||'O';
    if(/런치\s*1부|1부/.test(p)) o.sadam1=ppl;
    if(/런치\s*2부|2부/.test(p)) o.sadam2=ppl;
    if(/디너/.test(p) && !/몽몽마방/.test(p)) o.sadamD=ppl;
    if(/몽몽마방|마방|사유의밥상/.test(p)){ o.mabangL=ppl; if(/사유의밥상/.test(p)) o.mabangMenu='사유의 밥상'; }
    if(/도슨트/.test(p)) o.donghaeng='1';
    if(/세미나/.test(p)) o.seminar='1';
    if(/차방/.test(p)) o.chabang='1';
    if(/당두|봉갈/.test(p)) o.dangdu='1';
    if(/요가/.test(p)) o.yoga=ppl;
    if(/사운드/.test(p)) o.sound=ppl;
    if(/사유의향/.test(p)) o.scent=ppl;
    if(/해오름/.test(p)) o.haeorum=ppl;
    extra.unshift(`상품: ${got.product}`);   // 원래 상품명도 메모에
  }
  if(got.origin) extra.unshift(`출발지: ${got.origin}`);   // 출발지는 통화 메모에
  if(got.name) o.c0_name = got.title ? `${got.name} ${got.title}` : got.name;
  if(got.phone) o.c0_phone = fmtPhone(got.phone);
  if(got.email) o.c0_email = got.email.toLowerCase();
  if(got.date){ const d=got.date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if(d) o.date=`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`; }
  if(got.people){ const n=got.people.match(/\d+(\s*\+\s*\d+)*/); if(n) o.people=n[0].replace(/\s/g,''); }
  if(got.time){ const t=[...got.time.matchAll(/(\d{1,2})\s*[:시]\s*(\d{2})?/g)].map(x=>`${x[1].padStart(2,'0')}:${x[2]||'00'}`); if(t[0]) o.tin=t[0]; if(t[1]) o.tout=t[1]; }
  if(got.vtype || got.vcount){ const t=VTYPES.find(x=>(got.vtype||'').includes(x)) || (/(승용|자가|자차)/.test(got.vtype||'')?'승용':'버스'); const n=(String(got.vcount||'').match(/\d+/)||[''])[0]; o.vehicle = vehJoin(t,n) || t; }
  // 사전 답사 정보 → 예약에 보관 (추후 과업 '사전답사 전산 예약'과 그 메모)
  const tour=extra.filter(x=>x.startsWith('[답사] ')).map(x=>x.slice(5).replace(/[\/]/g,' ').trim());
  if(tour.length) o.tour=tour.join(', ');
  return { fields:o, extra };
}
function openConsult(){ $('#consultModal').hidden=false; $('#consultMsg').textContent=''; $('#consultBox').focus(); }
function closeConsult(){ $('#consultModal').hidden=true; }
$('#consultOpenBtn').onclick=openConsult;
$('#consultCloseBtn').onclick=closeConsult;
$('#consultModal').addEventListener('mousedown', e=>{ if(e.target.id==='consultModal') closeConsult(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#consultModal').hidden){ e.preventDefault(); closeConsult(); } });
$('#consultApplyBtn').onclick=()=>{
  if(isErpText($('#consultBox').value) && parseErp($('#consultBox').value).length){ const v=$('#consultBox').value; closeConsult(); $('#consultBox').value=''; erpPendingTask=null; takeErpText(v); return; }   // 전산 상품 정보를 여기에 붙여넣어도 전산 내역으로 (예약 칸도 채움)
  const {fields, extra} = parseConsult($('#consultBox').value);
  const n=Object.keys(fields).length;
  if(!n){ $('#consultMsg').textContent='알아볼 수 있는 항목이 없습니다. "항목 [탭] 값" 형식인지 확인해 주세요.'; return; }
  if($('#consultNew').checked) newCall(false);
  Object.entries(fields).forEach(([k,v])=>{ rec[k]=v; touched.add(k); });
  if(fields.tour){ rec.tour=tourJoin(tourWithDefaults(rec, fields.tour)); syncTourTask(); }   // 답사 신청: 성명 · 연락처가 없으면 담당자 이름 · 연락처 → 과업 「사전답사 전산 예약」 메모도
  staffDefaults();   // 단체상담 상품으로 채운 프로그램 담당 = 영업 담당
  Object.keys(fields).forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g) optOpen.add(g.id); });   // 식사 · 프로그램이 채워졌으면 그 묶음을 펼침
  if(extra.length){ const box=$('#memoBox'); box.value = (box.value ? box.value.replace(/\s*$/,'\n') : '') + extra.join('\n'); }
  nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); startTimer(); renderForm();
  closeConsult(); $('#consultBox').value='';
  toast(`${n}개 항목을 채웠습니다${extra.length?` · ${extra.length}줄은 통화 메모에`:''}`);
};

// ===================== 단체예약 목록 엑셀로 내려받기 (2026-11-26 되살림 · 「지난 예약 보기」를 켰을 때 그 아래 줄의 버튼): 표에 보이는 예약 그대로 · 같은 순서 =====================
let listView = null;
function loadExcelJS(){
  if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; s.onload=()=>window.ExcelJS?ok(window.ExcelJS):no(new Error('엑셀 모듈')); s.onerror=()=>no(new Error('엑셀 모듈을 불러오지 못했습니다')); document.head.appendChild(s); });
}
async function downloadXlsx(){
  if(!listView || !listView.shown.length){ toast('내려받을 예약이 없습니다.'); return; }
  const btn=$('#xlsxBtn'); btn.disabled=true; btn.textContent='만드는 중…';
  try{
    const ExcelJS = await loadExcelJS();
    const rows = listView.shown.slice();   // 표에 보이는 것 그대로 (같은 순서 · renderList 가 정렬해 둠)
    const COLS = [['방문일',12],['단계',9],['전산',8],['업체',22],['영업 담당',9],['결제',16],['차량',10],['입장',7],['입장문',8],['퇴장',7],['관람',8],
      ['사담 1부',8],['사담 2부',8],['사담 디너',9],['마방 시간',12],['마방 인원',9],['마방 메뉴',22],['마방 단가',10],['마방 결제',9],['마방 비고',16],...PROG_KEYS().map(k=>[LABEL[k]+(UNIT(k)==='시간'?' (시간)':''),11]),['기타 프로그램',14],
      ['견적서',10],['거래명세서',10],['담당자',14],['연락처',16],['이메일',24],['인원 변경',9],['현장 재결제',10],['미정 항목',16],['특별 할인',16],['통화 메모',40],['접수',16]];
    const wb = new ExcelJS.Workbook(); wb.creator='사유원 단체 예약 도우미'; wb.created=new Date();
    const ws = wb.addWorksheet('단체예약 현황', { views:[{ state:'frozen', ySplit:1 }] });
    ws.columns = COLS.map(([h,w])=>({ header:h, width:w }));
    rows.forEach(r=>{
      const x={...r, ...unpackExtra(r)}, sp=(String(r.memo||'').match(/(?:^|\s\/\s)특별 할인\s+([^/]+)/)||[])[1]||'';   // 칸 맨 앞 '특별 할인' 만 ('항목 특별 할인' 과 헷갈리지 않게)
      ws.addRow([r.date||'', listView.stageOf(r), listView.erpOf(r)?'등록':(listView.stageOf(r)==='예약상담'?'':'미등록'), r.org||'', r.owner||r.takenBy||'', r.pay||'', r.vehicle||'', r.tin||'', x.gate||'', r.tout||'', r.people||'',
        r.sadam1||'', r.sadam2||'', r.sadamD||'', x.mabangTime||'', (r.mabangL||'')+(r.mabangD?` (예전 디너 ${r.mabangD})`:''), r.mabangMenu||'', (mbUnit({...r,...x})||''), x.mabangPay||'', x.mabangNote||'', ...PROG_KEYS().map(k=>x[k]||''), Object.keys(x).filter(k=>x[k] && (LEGACY_KEYS.includes(k) || (/^px:/.test(k) && !PROG_KEYS().includes(k)))).map(k=>`${LABEL[k]||k.slice(3)} ${x[k]}`).join(', '),
        docState(r,'quote'), docState(r,'stmt'),         r.contact||'', r.phone||'', r.email||'', x.pchg?'있음':'', x.onsite?'있음':'', x.tbd?(x.tbd+(x.tbdDate?` (${x.tbdDate}까지)`:'')):'', sp.trim(), r.note||'', r.saved?fmt(r.saved):'']);
    });
    const head = ws.getRow(1); head.font={ bold:true, color:{argb:'FFFFFFFF'} }; head.alignment={ vertical:'middle', horizontal:'center' }; head.height=22;
    head.eachCell(c=>{ c.fill={ type:'pattern', pattern:'solid', fgColor:{argb:'FF3F5236'} }; });
    ws.eachRow((row,i)=>{ if(i>1) row.alignment={ vertical:'top', wrapText:true }; row.eachCell(c=>{ c.border={ bottom:{ style:'thin', color:{argb:'FFDDDDDD'} } }; }); });
    ws.autoFilter = { from:{row:1,column:1}, to:{row:1,column:COLS.length} };
    const buf = await wb.xlsx.writeBuffer();
    const pf=$('#pastFrom').value, pt=$('#pastTo').value, tag = $('#listSearch')?.value.trim() ? '_검색' : (pf||pt) ? `_${(pf||'처음').replace(/-/g,'')}-${(pt||'끝').replace(/-/g,'')}` : '';   // 검색 · 고른 기간을 파일 이름에
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    a.download=`사유원_단체예약현황${tag}_${ymd(new Date()).replace(/-/g,'')}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    toast(`${rows.length}건을 엑셀로 내려받았습니다.`);
  }catch(e){ toast('엑셀을 만들지 못했습니다: '+e.message); }
  btn.disabled=false; btn.textContent='엑셀로 내려받기';
}
// 견적서 · 거래명세서 버튼: 발급했으면 체크 표시
function paintDocBtns(){
  [['ckQuote','wantQuote'],['ckStmt','wantStmt']].forEach(([c,wk])=>{ const el=document.getElementById(c); if(el) el.checked=!!rec[wk]; });   // 버튼 앞 체크 = 과업 요청
  paintTourCk();   // 사전답사 체크 = 답사 정보 있음
  [['quoteBtn','quote','견적서','quote'],['stmtBtn','stmt','거래명세서','statement']].forEach(([b,id,name,doc])=>{ const el=document.getElementById(b); if(!el) return;
    const hs=typeof issuedDocs==='function' ? issuedDocs(doc) : [], last=hs.map(h=>h.at).sort().pop();   // 발급 내역에 있으면 ✓ (2026-11-21)
    el.classList.toggle('issued', !!hs.length); el.textContent = name;
    el.title = hs.length ? `${name} 발급함 ${last?dtLabel(last):''} · 누르면 발급 내역(재발행 · 수정발행)` : `${name} 발급`; });
}
$('#xlsxBtn').onclick=downloadXlsx;

// 목록 · 엑셀: 견적서 / 거래명세서 발행 여부 (추후 과업 기준)
function docState(r, id){
  const t = parseHist(r).tasks.find(x=>x.id===id), x = unpackExtra(r);
  const asked = id==='quote' ? x.wantQuote : x.wantStmt;
  return t && t.done ? '발행' : (t || asked) ? '요청' : '';
}
const docTag = (r,id) => { const s=docState(r,id); return s==='발행' ? '<span class="tag st-공식예약">발행</span>' : s==='요청' ? '<span class="tag tbd-tag">요청 · 미발행</span>' : ''; };

// ===================== 예약 삭제: 사유 고르기 =====================
// 사유 목록 (피드백 받아 고칠 것)
const DEL_REASONS = ['고객 취소 (방문 취소)','일정 연기 · 날짜 다시 잡기로','다른 예약과 중복 등록','잘못 입력 · 테스트','인원이 줄어 단체 예약 아님 (개인 예약으로)','다른 곳으로 결정 · 견적 후 진행 안 함','연락 두절','기타 (직접 입력)'];
// ===================== 단체예약 목록 '수정': 상태가 실제와 다를 때 사유를 받고 고침 =====================
// 사유 기본 목록 (피드백 받아 고칠 것)
const FIX_REASONS = ['영업 담당 변경 (인수인계 · 담당 바뀜)','잘못 눌러 발행으로 표시됨 (실제로는 발행 안 함)','다른 경로로 이미 발행함 (메일 · 수기 등)','고객이 서류 요청을 취소함','전산 등록 상태가 실제와 다름','예약 단계가 실제와 다름 (결제 · 확정 여부 변경)','기타 (직접 입력)'];
let fixId=null, fixBase=null;
const DOC_LABEL = { '발행':'발행', '요청':'요청 · 미발행', '':'없음' };
function fixStateOf(r){ return { owner: ownerOf(r), stage: stageOfRec(r), erp: (/^adm/.test(r.id) || !!unpackExtra(r).erp) ? '1' : '', quote: docState(r,'quote'), stmt: docState(r,'stmt') }; }
function fixDiffList(a,b){ const out=[];
  if(a.owner!==b.owner) out.push(`영업 담당 ${a.owner||'없음'} → ${b.owner||'없음'}`);
  if(a.stage!==b.stage) out.push(`예약 단계 ${a.stage} → ${b.stage}`);
  if(a.erp!==b.erp) out.push(`전산 ${a.erp?'등록':'미등록'} → ${b.erp?'등록':'미등록'}`);
  if(a.quote!==b.quote) out.push(`견적서 ${DOC_LABEL[a.quote]} → ${DOC_LABEL[b.quote]}`);
  if(a.stmt!==b.stmt) out.push(`거래명세서 ${DOC_LABEL[a.stmt]} → ${DOC_LABEL[b.stmt]}`);
  return out; }
const fixCur = () => ({ owner:$('#fixOwner').value.trim(), stage:$('#fixStage').value, erp:$('#fixErp').value, quote:$('#fixQuote').value, stmt:$('#fixStmt').value });
function paintFixDiff(){ const c=fixCur(), d=fixDiffList(fixBase, c); $('#fixDiff').textContent = (d.length ? '바뀌는 것: '+d.join(', ') : '바꿀 상태를 고르세요.') + (c.owner!==fixBase.owner ? ' · 영업 담당을 바꾸면 자세한 사유를 꼭 적어 주세요.' : ''); $('#fixOk').disabled=!d.length; }
function openFix(id){
  const r=cache.find(x=>x.id===id); if(!r) return;
  // 2026-11-25: 남이 담당인 예약도 열림 — 영업 담당만 바꿀 수 있음(사유 직접 입력 필수) · 단계 · 전산 · 서류는 담당만
  const o=ownerOf(r), me=savedOwner(), other=!!(o && me && o!==me);
  fixId=id; fixBase=fixStateOf(r);
  ['#fixStage','#fixErp','#fixQuote','#fixStmt'].forEach(s=>{ $(s).disabled=other; $(s).title=other?`${o}님 담당 예약이라 영업 담당만 바꿀 수 있습니다.`:''; });
  // 2026-11-25: 영업 담당 = 멤버관리의 사람 모두 (고르기) · 지금 담당이 멤버가 아니면 「(멤버 아님)」으로 그대로
  const paintOwner=()=>{ const cur=fixBase.owner, L=MEMBER_NAMES.slice(); $('#fixOwner').innerHTML=(cur?'':'<option value="">담당 고르기</option>') + L.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('') + (cur && !L.includes(cur) ? `<option value="${esc(cur)}">${esc(cur)} (멤버 아님)</option>` : ''); $('#fixOwner').value=cur; };
  paintOwner(); loadMemberNames().then(()=>{ if(fixId===id && $('#fixOwner').value===fixBase.owner){ paintOwner(); paintFixDiff(); } });
  // 예약 단계 목록은 지금 단계 이름(STAGES)으로 — 예전 목록(예약상담 · 예약접수)엔 가예약 · 예약확정이 없어 그 예약을 고치면 단계가 비던 것 (2026-11-25)
  $('#fixStage').innerHTML=[...new Set([...STAGES, fixBase.stage].filter(Boolean))].map(s=>`<option>${esc(s)}</option>`).join('');
  $('#fixWho').textContent = [r.org||r.contact||'(업체 미정)', r.date&&dateLabel(r.date)].filter(Boolean).join(' · ');
  $('#fixStage').value=fixBase.stage; $('#fixErp').value=fixBase.erp; $('#fixQuote').value=fixBase.quote; $('#fixStmt').value=fixBase.stmt;
  $('#fixReason').innerHTML = '<option value="">사유를 고르세요</option>' + FIX_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#fixNote').value=''; paintFixDiff(); $('#fixModal').hidden=false; $('#fixStage').focus();
}
const closeFix = () => { $('#fixModal').hidden=true; fixId=null; };
['#fixStage','#fixErp','#fixQuote','#fixStmt'].forEach(s=>$(s).addEventListener('change', paintFixDiff)); $('#fixOwner').addEventListener('change', paintFixDiff);
$('#fixCancel').onclick=closeFix;
$('#fixModal').addEventListener('mousedown', e=>{ if(e.target.id==='fixModal') closeFix(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#fixModal').hidden){ e.preventDefault(); closeFix(); } });
$('#fixOk').onclick=async ()=>{
  const cur=fixCur(), diff=fixDiffList(fixBase, cur); if(!diff.length) return;
  const reason=$('#fixReason').value, note=$('#fixNote').value.trim();
  if(!reason){ toast('수정 사유를 골라 주세요.'); $('#fixReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#fixNote').focus(); return; }
  if(cur.owner!==fixBase.owner){
    if(!cur.owner){ toast('영업 담당을 골라 주세요.'); $('#fixOwner').focus(); return; }
    if(!note){ toast('영업 담당을 바꾸는 사유를 적어 주세요.'); $('#fixNote').focus(); return; } }
  const r=cache.find(x=>x.id===fixId); if(!r){ closeFix(); return; }
  if(editingId===r.id && baseSnap && diffSnap(baseSnap, snap()).length){ toast('이 예약을 지금 고치는 중입니다. 먼저 저장한 뒤 수정해 주세요.'); return; }
  const now=new Date().toISOString(), ph=parseHist(r), x=unpackExtra(r), why = /^기타/.test(reason) ? note : reason + (note ? ` · ${note}` : '');
  // 전산 등록
  const ex={...r, ...x};
  if(cur.erp!==fixBase.erp){ ex.erp = cur.erp ? (x.erp || '목록에서 수정') : ''; const t=ph.tasks.find(t=>t.id==='erp'); if(t){ t.done=!!cur.erp; t.doneAt=cur.erp?now:''; } }
  // 견적서 · 거래명세서: 발행 = 과업 완료, 요청 = 과업 미완료, 없음 = 과업 · 요청 없앰
  [['quote','wantQuote'],['stmt','wantStmt']].forEach(([id,wk])=>{ if(cur[id]===fixBase[id]) return;
    let t=ph.tasks.find(t=>t.id===id);
    if(!cur[id]){ ph.tasks=ph.tasks.filter(t=>t.id!==id); ex[wk]=''; return; }
    if(!t){ t={id, title:AUTO_TASKS[id], done:false, memo:'', at:now}; ph.tasks.push(t); }
    t.done = cur[id]==='발행'; t.doneAt = t.done ? now : ''; t.subs=Object.fromEntries(DOC_SUBS[id].map(([k])=>[k, t.done])); ex[wk]='있음'; });
  ph.h.push({t:now, by:savedOwner()||'', what:`[목록 수정] ${diff.join(', ')} · 사유: ${why}`});
  const pk=packExtra(ex);
  const item={...r, ...(cur.owner!==fixBase.owner ? {owner:cur.owner} : {}), pay:pk.pay, memo:pk.memo, callType:cur.stage, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now};
  await store.put(item); closeFix(); await renderList();
  if(editingId===r.id){ openRecord(cache.find(x=>x.id===r.id)||item); $('#listModal').hidden=false; }   // 열어 둔 예약이면 고친 상태로 다시 불러옴
  toast('목록 상태를 고쳤습니다. 사유는 수정 기록에 남았습니다.');
};

let delId=null;
function openDel(id){
  const r=cache.find(x=>x.id===id); if(!r) return; if(notMineMsg(r)) return;   // 남이 담당인 예약은 지울 수 없음
  delId=id;
  $('#delWho').textContent = [r.org||r.contact||'(업체 미정)', r.date&&dateLabel(r.date), r.people&&`${r.people}명`].filter(Boolean).join(' · ');
  $('#delReason').innerHTML = '<option value="">사유를 고르세요</option>' + DEL_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#delNote').value=''; $('#delModal').hidden=false; $('#delReason').focus();
}
const closeDel = () => { $('#delModal').hidden=true; delId=null; };
$('#delCancel').onclick=closeDel;
$('#delModal').addEventListener('mousedown', e=>{ if(e.target.id==='delModal') closeDel(); });
$('#delOk').onclick=async ()=>{
  const reason=$('#delReason').value, note=$('#delNote').value.trim();
  if(!reason){ toast('삭제 사유를 골라 주세요.'); $('#delReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#delNote').focus(); return; }
  const r=cache.find(x=>x.id===delId); if(!r){ closeDel(); return; }
  const now=new Date().toISOString(), ph=parseHist(r), why = /^기타/.test(reason) ? note : reason + (note ? ` · ${note}` : '');
  ph.h.push({t:now, by:savedOwner()||'', what:`[삭제] ${why}`});
  // 사유를 수정 기록에 남긴 뒤 삭제 (시트에서는 줄을 지우지 않고 '삭제' 칸에 일시를 적으므로 사유도 남음)
  await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
  await store.del(r.id, true);
  if(editingId===r.id) newCall(false);
  closeDel(); renderList(); toast(`삭제했습니다 · ${why}`);
};

// ===================== 단체예약 목록 창 =====================
function openList(){ $('#listModal').hidden=false; renderList(); if(pending.length) flush(); else pull(); $('#listCloseBtn').focus(); }
function closeList(){ $('#listModal').hidden=true; }
$('#listOpenBtn').onclick=openList;
$('#listCloseBtn').onclick=closeList;
$('#listModal').addEventListener('mousedown', e=>{ if(e.target.id==='listModal') closeList(); });   // 바깥 누르면 닫힘
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#delModal').hidden){ e.preventDefault(); closeDel(); return; } if(e.key==='Escape' && !$('#listModal').hidden){ e.preventDefault(); closeList(); } });

document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); }
  if(e.altKey && e.key.toLowerCase()==='n'){ e.preventDefault(); guardLeave(()=>newCall()); }
});

