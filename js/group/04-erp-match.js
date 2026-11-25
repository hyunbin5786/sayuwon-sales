// ▣ js/group/04-erp-match.js — 전산 내역 ↔ 예약 내역 맞추기: 같은 품목 찾기 · 전산 할인 버튼 · 줄 금액 · 할인 표시 그리기(paintItemPrices)
// 전산 상품 → 예약 내역 줄 key (erpFields와 같은 기준)
// 전산 같은 품목 (2026-11-21): 「전산 내역과 예약 내용이 다릅니다」의 「같은 품목 (이름만 다름)」 → {전산 쪽 칸: 예약 쪽 칸}
const erpSameMap = (r=rec) => Object.fromEntries(String((r&&r.erpSame)||'').split(/\s*;\s*/).map(s=>s.split('>')).filter(p=>p.length===2 && p[0] && p[1]));
function erpSameApply(o){ Object.entries(erpSameMap()).forEach(([ek, rk])=>{ if(o[ek]){ if(!o[rk]) o[rk]=rec[rk]||o[ek]; o[ek]=''; } }); return o; }   // 전산 쪽 수량은 예약 쪽 칸으로 (단위가 달라도 같은 것으로 봄)
function erpKeyOf(p){ const k=erpKeyOf0(p), al=erpSameMap(); return (k && al[k]) || k; }
function erpKeyOf0(p){ const ns=normSrc(p);
  if(/\(관람,\s*사담\s*런치\s*1부\)/.test(p)) return 'sadam1';
  if(/\(관람,\s*사담\s*런치\s*2부\)/.test(p)) return 'sadam2';
  if(/\(관람,\s*사담\s*디너\)/.test(p)) return 'sadamD';
  if(/해오름/.test(p)) return 'haeorum';
  const vrow = viewsParse(rec.views).find(v=>normSrc(daySrc(v.src, rec))===ns || normSrc(v.src)===ns); if(vrow) return 'v:'+vrow.src;   // 관람 영역의 다른 품목 줄
  if(/\(관람,/.test(p)) return 'v:'+p;
  if(/관람/.test(p) && !/관람권|관람식사권/.test(p)) return 'v:'+p;
  const pk=PROG_KEYS().find(k=>normSrc(PROG_SRC[k]||'')===ns || normSrc(progSrc(k, rec)||'')===ns); if(pk) return /당두봉갈/.test(p) ? 'dangdu' : pk;
  if(mbMenus().some(m=>normSrc(m.src)===ns)) return 'mb';
  if(goodsItems().some(g=>normSrc(g.src)===ns)) return 'g:'+goodsItems().find(g=>normSrc(g.src)===ns).src;
  return null; }
// 전산 내역을 줄 key별로 합침 (같은 상품이 순번 여러 개면 더함)
function erpByKey(){ const m={}, other=[];
  erpList.forEach(x=>{ const k=erpKeyOf(x.product); if(!k){ other.push(x); return; }
    const o = m[k] ||= {product:x.product, date:x.date, people:0, students:0, base:0, disc:0, amount:0, notes:[], seqs:[]};
    o.people+=x.people; o.students+=x.students||0; o.base+=x.base; o.disc+=x.disc; o.amount+=x.amount; o.notes.push(...x.notes); if(x.seq) o.seqs.push(x.seq); });
  return {m, other}; }
const cleanErpNote = n => String(n).replace(/\s*-\s*[\d,]+\(.*$/,'').replace(/\s*-\s*([\d,]+)\s*$/,' $1원');
// 관람+식사 패키지 "평일(관람, 사담 런치1부)" → 1인 관람 · 식사 가격. 품목 관리의 비과세(관람) · 과세(식사)가 있으면 그것, 없으면 그날 기본 관람권 가격만큼 관람
// 그 밖의 품목도 품목 관리에 과세 · 비과세가 나뉘어 있으면(예: 새벽 해오름 산책) 같은 모양으로. v = 비과세(사유원 · 입장료), m = 과세(신라)
function pkgSplit(src){
  if(!src) return null;
  const p=priceOf(src); if(p==null) return null;
  const tx=taxOf(src); if(tx && tx.tx>0 && tx.tf>0 && tx.tx+tx.tf===p) return {v:tx.tf, m:tx.tx};
  if(!/\(관람,/.test(src)) return null;
  const v=priceOf(viewSrcOf(rec)); return v!=null && v<p ? {v, m:p-v} : null;
}
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-idisc]'); if(!b) return;
  const k=b.dataset.idisc, v=b.dataset.dv;
  if(b.dataset.erp){   // 전산 내역 줄: 고른 %로 계산한 할인액을 그 줄 할인액으로 (전산 할인과 같으면 전산 그대로) → 대조에서 전산과 다르면 ✗ (전산 수정 필요)
    const E=erpByKey(), x=E.m[k], info=x && erpDiscInfo(k, x), ex=x && erpRowMoney(k, x); if(!info) return;
    setItemDisc(k, v, info.auto); const c=info.cand[v]; if(v===info.guess){ setItemDamt(k, null); startTimer(); renderSide(); return; }   // 전산과 같은 할인 → 전산 할인액 그대로
    setItemDamt(k, (c.tx===ex.aTx && c.tf===ex.aTf) ? null : {tx:Math.min(c.tx, ex.fTx), tf:Math.min(c.tf, ex.fTf)}); startTimer(); renderSide(); return; }
  setItemDisc(k, v, b.dataset.da); startTimer(); renderSide(); });   // 할인 버튼
// 전산 내역 줄의 할인 버튼: 할인 대상 품목이면 할인 없음 · 사전예약 5% · 단체예약 10%로 계산한 할인액(과세 · 비과세)과, 전산 할인이 어느 것과 같은지(guess)
function erpDiscInfo(k, x){
  const b0=quoteBlocks(rec).blocks.find(b=>b.key===k); if(!b0) return null;   // 모든 품목 (할인 대상이 아니면 인원 기준 = 할인 없음)
  const cand={none:{tx:0, tf:0}};
  ['pre','grp'].forEach(v=>{ const m=idiscMap(rec); m[dkey(k)]=v; const r2={...rec, idamt:'', idisc:Object.entries(m).map(([a,c])=>`${a}=${c}`).join('; ')};
    const b=quoteBlocks(r2).blocks.find(y=>y.key===k), mm=b && blockMoney(b, r2); cand[v] = mm ? {tx:mm.aTx, tf:mm.aTf} : {tx:0, tf:0}; });
  const tot=c=>c.tx+c.tf, pc=[...new Set((x.notes||[]).flatMap(s=>[...String(s).matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>+m[1])))];   // 전산 할인 줄의 % (사전예약자 성인 19명 5% → 사전예약)
  const guess = !(+x.disc) ? 'none' : pc.length===1 && pc[0]===5 ? 'pre' : pc.length===1 && pc[0]===10 ? 'grp' : (['pre','grp'].find(v=>Math.abs(tot(cand[v])-(+x.disc||0))<1) || '');
  return { cand, guess, auto:b0.dauto, n:b0.qty, gN:b0.gN||0 };   // n = 그 품목 인원 (2026-11-21)
}
function erpDiscBtns(k, x, ex){
  const info=erpDiscInfo(k, x); if(!info) return '';
  const cur=ex.dTx+ex.dTf, on = !ex.ov ? info.guess : (['none','pre','grp'].find(v=>Math.abs(info.cand[v].tx+info.cand[v].tf-cur)<1) || '');   // 고치지 않았으면 전산 할인 그대로
  const L=v=>(DISC_OPTS.find(o=>o[0]===v)||[])[1]||'';
  const cntOf = v => !ex.ov ? (x.notes||[]).reduce((a,s)=>{ const m=String(s).match(/(\d+)\s*명\s*(\d+(?:\.\d+)?)\s*%/); return a + (m && +m[2]===(v==='pre'?5:10) ? +m[1] : 0); }, 0) : info.gN;   // 그 할인을 받는 인원 (전산 할인 줄 · 버튼으로 고쳤으면 계산)
  const diff = info.guess && info.guess!==info.auto && !ex.ov;   // 전산 할인이 인원 기준과 다르면: 인원 기준 버튼에 빨간 테두리 (설명은 툴팁)
  const tip = diff ? `인원 ${info.n}명 → ${L(info.auto)} 대상인데 전산은 ${L(info.guess)}` : `인원 기준: ${L(info.auto)}`;
  return `<span class="im dsel" title="${esc(tip)} · 누르면 그 %로 할인액을 다시 계산">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${on===v?' on':''}${diff&&v===info.auto?' should':''}" data-idisc="${esc(k)}" data-dv="${v}" data-erp="1" title="${v===info.auto?esc(tip):''}">${l}${on===v && v!=='none' && cntOf(v) ? ` ${cntOf(v)}명` : ''}</button>`).join('')}${spBtnHTML(k)}</span>`;
}
let openDisc=new Set();   // 할인 대상이 아닌 품목에서 「할인 넣기」를 눌러 연 할인 줄
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('#itemsBox [data-dopen]'); if(!b) return; openDisc.add(b.dataset.dopen); paintItemPrices(); const i=document.querySelector(`#itemsBox [data-idamt="${CSS.escape(b.dataset.dopen)}"]`); if(i){ i.focus(); i.select(); } });
// 할인액 칸 (예약 칸 계산 · 전산 내역 공통)
const damIn = (k, side, v, max) => `<span class="dam"><i>${side==='tx'?'과세(신라)':'비과세(사유원)'}</i>-${won(v)}원</span>`;   // 할인액은 버튼 · 특별할인으로만 (직접 고치지 않음, 2026-11-17)
// 전산 내역 줄 금액: 전산 상품금액 · 할인을 과세(신라) · 비과세(사유원)로 (자동 = 전산 사유원/신라 나누기와 같은 계산), 할인액을 고쳤으면 그 값
function erpRowMoney(k, x){
  const src=itemSrc(k), p=src ? priceOf(src) : null, u = p ? splitOf(src, p, rec) : {tx:1, tf:0}, rt=(u.tx+u.tf) ? u.tf/(u.tx+u.tf) : 0;
  const sTf = x.students ? erpFullTf(x) : null;   // 학생이 있으면 어른 · 학생 비과세를 따로 더함
  const fTf = sTf!=null ? Math.min(x.base, sTf) : Math.round(x.base*rt), fTx=x.base-fTf;
  const lines=erpList.filter(y=>erpKeyOf(y.product)===k), autoSaw=lines.reduce((s,y)=>s+erpSplit(y).saw,0);
  const aTf=Math.max(0, Math.min(x.disc, fTf-autoSaw)), aTx=x.disc-aTf;
  const ov=idamtMap(rec)[dkey(k)], dTx = ov ? Math.min(ov.tx, fTx) : aTx, dTf = ov ? Math.min(ov.tf, fTf) : aTf;
  return { fTx, fTf, aTx, aTf, dTx, dTf, ov:!!ov, tx:fTx-dTx, tf:fTf-dTf, amount:x.base-dTx-dTf };
}
function rowMoneyOf(k){ if(erpList.length){ const E=erpByKey(); return E.m[k] ? erpRowMoney(k, E.m[k]) : null; } const x=priceInfo && priceInfo[normSrc(itemSrc(k))]; return x && x.m; }
// 할인액 칸: 고치면 그 줄만 직접 고친 할인액으로 (할인 버튼 계산과 같으면 다시 자동), ↺ = 자동으로
document.addEventListener('change', e=>{ const el=e.target.closest?.('#itemsBox [data-idamt]'); if(!el) return;
  const k=el.dataset.idamt, m=rowMoneyOf(k); if(!m) return;
  const get = side => { const i=document.querySelector(`#itemsBox [data-idamt="${CSS.escape(k)}"][data-side="${side}"]`); return i ? Math.max(0, parseInt(String(i.value).replace(/\D/g,''))||0) : (side==='tx'?m.dTx:m.dTf); };
  const tx=Math.min(get('tx'), m.fTx), tf=Math.min(get('tf'), m.fTf);
  setItemDamt(k, tx===m.aTx && tf===m.aTf ? null : {tx, tf}); startTimer(); renderSide(); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.closest?.('#itemsBox [data-idamt]')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-idamtreset]'); if(!b) return; setItemDamt(b.dataset.idamtreset, null); startTimer(); renderSide(); });
// 예약 내역 할인 줄 하나 (모든 품목 같은 모양): [할인 없음 · 사전예약 5% · 단체예약 10% · 특별할인] … [할인액 비과세 · 과세 · 금액]
function discRowHTML(k, b, m, money){
  return `<span class="im dsel" title="할인 (자동: ${esc((DISC_OPTS.find(o=>o[0]===b.dauto)||[])[1]||'')}) · 잘못 들어갔으면 눌러서 바꾸기">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${b.dsel===v && (v==='none' || b.gN>0)?' on':''}" data-idisc="${esc(k)}" data-dv="${v}" data-da="${b.dauto}">${l}${b.dsel===v && v!=='none' && b.gN>0 ? ` ${b.gN}명` : ''}</button>`).join('')}${spBtnHTML(k)}</span>`
    + `<span class="im-r"><span class="im dams" title="${esc(m.disc||'할인액')}">${m.fTf>0?damIn(k,'tf', m.dTf, m.fTf):''}${m.fTx>0?damIn(k,'tx', m.dTx, m.fTx):''}</span>${money}</span>`;
}
// 줄마다 [단가 · 할인 · 금액] (전산 내역이 있으면 인원 · 상품금액 · 할인 · 금액, 인원이 다르면 빨갛게)
function paintItemPrices(){
  // 줄 구성 (2026-11-14): ① [품목 · 가격(관람+식사는 관람 · 식사 따로) · 인원 · 담당 · ×] ② 할인(할인 대상 품목만: 버튼 · 할인 금액 · 할인 단가 · 금액) ③ 비고 (할인 줄이 없으면 금액은 비고 줄 끝)
  const seen=new Set(), E = erpList.length ? erpByKey() : null, MISS = E ? erpMissing() : [];   // MISS: 전산에 없는 품목 (품목 관리 가격으로 계산)
  const cell=(l,v,cls='')=>`<span class="im ${cls}"><i>${l}</i>${v}</span>`;
  const upHTML = src => { const sp=pkgSplit(src); if(sp) return `<span><i>비과세(사유원)</i>${won(sp.v)}원</span><span><i>과세(신라)</i>${won(sp.m)}원</span>`; const p=src?priceOf(src):null; return p==null ? '' : `<span><i>${/대관|도슨트|세미나/.test(src)?'회당':'1인'}</i>${won(p)}</span>`; };
  document.querySelectorAll('#itemsBox [data-ip]').forEach(el=>{ const k=el.dataset.ip, src=itemSrc(k), up=document.querySelector(`#itemsBox [data-iup="${CSS.escape(k)}"]`), am=document.querySelector(`#itemsBox [data-iamt="${CSS.escape(k)}"]`);
    let h='', amt='';
    // 가격 칸: 할인까지 빼고 실제로 결제하는 금액을 과세(신라) · 비과세(사유원)로 (전산 내역 모드 · 금액을 모르면 1인 가격)
    // 전산 내역이 있으면 전산 금액 · 할인을 그 품목의 과세 · 비과세 비율로 나눔
    const ex = E && E.m[k] ? erpRowMoney(k, E.m[k]) : null;
    const mi = E && !ex ? MISS.find(x=>x.key===k) : null;   // 전산에 없는 품목: 품목 관리 가격 (과세(신라) · 비과세(사유원))
    const pm = ex || (mi && mi.m) || (!E && priceInfo && src ? (priceInfo[normSrc(src)]||{}).m : null);
    if(up) up.innerHTML = !quoteCat && !ex && !mi ? '' : pm && !seen.has(src) ? [pm.fTf>0 && `<span title="할인 전 금액 (할인 ${won(pm.dTf)}원 · 할인 뒤 ${won(pm.tf)}원)"><i>비과세(사유원)</i>${won(pm.fTf)}원</span>`, pm.fTx>0 && `<span title="할인 전 금액 (할인 ${won(pm.dTx)}원 · 할인 뒤 ${won(pm.tx)}원)"><i>과세(신라)</i>${won(pm.fTx)}원</span>`].filter(Boolean).join('') : upHTML(src);
    if(E){ const x=E.m[k];
      if(!x){ const inView = /^v:/.test(k) && /\(학생\)/.test(k) && E.m[k.replace(/\(학생\)/,'')];   // 관람(학생): 전산은 관람 한 줄에 어른 · 학생 함께
        h = k==='seminar2' && E.m.seminar ? cell('전산', '세미나 도슨트 줄에 함께 (전산은 세미나 한 품목 · 금액은 첫 세미나 도슨트 줄)') : inView ? cell('전산', '관람 줄에 함께 (어른 · 학생이 한 줄 · 금액은 관람 줄)') : k==='view' && !effViewN(rec) ? cell('전산', '관람권 따로 없음 (모두 관람 포함 품목)') : cell('전산', `<b class="bad">전산 내역에 없음</b>${mi?' <small>· 품목 관리 가격으로 합계에 넣음</small>':''}`, 'warn');
        if(mi){   // 전산에 없는 품목도 예약 내역과 같은 할인 줄 (할인 버튼 · 특별할인 · 할인액 · 금액, 2026-11-21 · 예전엔 「전산 내역에 없음」 + 비고 옆 특별할인 버튼)
          const money = cell('금액', mi.atMabang ? `<s>${won(mi.m.amount)}</s> <small>마방에서 결제</small>` : `<b>${won(mi.m.amount)}</b>`, 'amt');
          h = discRowHTML(k, mi.b, mi.m, money) + cell('전산', `<b class="bad">전산 내역에 없음</b> <small>· 품목 관리 가격으로 합계에 넣음</small>`, 'warn erp-none'); } }
      else h = erpDiscBtns(k, x, ex) + `<span class="im dams" title="${esc(x.notes.map(cleanErpNote).join(' · ')||'전산 할인')}">${ex.fTf>0?damIn(k,'tf', ex.dTf, ex.fTf):''}${ex.fTx>0?damIn(k,'tx', ex.dTx, ex.fTx):''}</span>`;   // 전산 내역 줄: 할인만 (과세 · 비과세 할인액은 고칠 수 있음)
      }
    // 금액을 아직 계산할 수 없을 때도 할인 줄은 늘 같은 모양 (할인 버튼 · 특별할인 · 오른쪽 금액 자리) — 처음 추가할 때 예전 모양이 잠깐 보이지 않게 (2026-11-18)
    else if(!priceInfo || !(src && priceInfo[normSrc(src)]) && !(k==='view')){
      const unitW=itemUnit(k)==='명'?'인원':'수량', known = src && priceOf(src)!=null, q=numOf(itemQty(k));
      const tryKey = k+'|'+q+'|'+rec.date+'|'+rec.people, retry = known && q && priceInfo && Date.now()-(PRICE_RETRIED.get(tryKey)||0) > 2000;
      const msg = !rec.date || !numOf(rec.people) && !effViewN(rec) ? `<small>방문일 · 관람 인원을 넣으면 계산</small>` : !known ? '가격 없음' : !q ? `<small>${unitW}을 넣으면 계산</small>` : retry ? '<small>계산 중…</small>' : '가격 없음';
      if(retry){ PRICE_RETRIED.set(tryKey, Date.now()); setTimeout(()=>{ renderSide(); paintItemPrices(); }, 0); }   // 가격 · 수량은 있는데 계산이 한 박자 늦은 것 → 한 번만 바로 다시 계산 (그래도 없으면 가격 없음)
      h = `<span class="im dsel" title="${unitW}을 넣으면 할인을 고를 수 있습니다">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${v==='none'?' on':''}" disabled>${l}</button>`).join('')}${spBtnHTML(k)}</span>` + `<span class="im amt${known?'':' warn'}"><i>금액</i>${msg}</span>`; }
    else { const x=src ? priceInfo[normSrc(src)] : null;
      if(k==='view' && !x) h=cell('관람권', numOf(rec.people)?'0명 (모두 관람 포함 품목으로 계산)':'인원 입력');
      else if(!x){ amt = cell('금액', '가격 없음', 'warn'); }
      else if(seen.has(src)) amt=cell('금액', '위 줄과 합산');   // 같은 견적서 품목(예: 대관)은 한 줄로 계산
      else { seen.add(src); const m=x.m;
        const money = cell('금액', `<b>${m?won(m.amount):'가격 없음'}</b>`, 'amt');
        const eligible = x.b && (x.b.disc || x.b.dsel!=='none');   // 할인 대상 품목 (할인 버튼)
        const discRow = m && x.b;   // 모든 품목에 같은 할인 줄 (버튼 · 할인액) — 할인 대상이 아닌 품목도 할인을 넣을 수 있게 (2026-11-17)   // 할인 대상이 아니어도 「할인 넣기」를 눌렀거나 할인액을 넣은 줄은 할인 줄
        // 할인액: 과세(신라) · 비과세(사유원) 따로, 칸에서 바로 고칠 수 있음 (고치면 「직접 고침」, ↺ = 할인 버튼 계산으로 되돌리기)
        const dIn = (side, v, max) => damIn(k, side, v, max);
        if(discRow) h = discRowHTML(k, x.b, m, money);   // 할인액 · 금액은 오른쪽 묶음 (2026-11-18)
        else amt = money + (m && x.b ? `<button type="button" class="dopen" data-dopen="${esc(k)}" title="이 품목에 할인 넣기 (과세 · 비과세 할인액)">할인 넣기</button>` : ''); } }
    el.innerHTML=h; if(am) am.innerHTML=amt; });
  // 전산에만 있는 상품 (예약 내역 줄로 못 옮긴 것)
  if(E) erpList.forEach(x=>{ const k=erpKeyOf(x.product); if(k && !itemRows.includes(k) && !E.other.includes(x)) E.other.push(x); });   // 품목은 알지만 예약 내역에 줄이 없는 것도
  const ex=$('#erpExtra'); if(ex){ ex.innerHTML = E && E.other.length ? `<div class="it-row it-erponly"><b>전산에만 있는 상품</b>${E.other.map(x=>`<div class="it-money">${`<span class="im"><i>상품</i>${esc(x.product)}</span><span class="im"><i>인원</i>${x.people}</span><span class="im"><i>할인</i>${x.disc?'-'+won(x.disc):'없음'}</span><span class="im amt"><i>금액</i><b>${won(x.amount)}</b></span>`}<span class="erp-acts">${erpKeyOf(x.product) ? `<button type="button" class="btn it-erpadd" data-erpadd="${erpList.indexOf(x)}" title="이 상품을 예약 내역 줄로 추가 (인원 · 수량은 전산 그대로)">＋ 항목으로 추가</button>` : `<span class="im warn">품목 관리에 없는 상품</span><button type="button" class="btn it-erpadd" data-erpcat="${erpList.indexOf(x)}" title="이 상품을 품목 관리에 추가하고(가격 = 전산 상품금액 ÷ 인원) 예약 내역 줄로도 넣습니다">＋ 품목 관리에 추가</button>`}<button type="button" class="btn it-erpadd it-erpdrop" data-erpdrop="${erpList.indexOf(x)}" title="필요 없는 상품: 붙여 넣은 전산 내역에서 뺌 (전산 합계 · 대조에서도 빠짐 · 전산 내역을 다시 붙여 넣으면 돌아옴)">빼기</button></span></div>`).join('')}</div>` : ''; }
}
// 전산에만 있는 상품 「빼기」 (2026-11-21): 필요 없는 상품은 붙여 넣은 전산 내역에서 뺌 → 합계 · 대조에서도 빠짐 (다시 붙여 넣으면 돌아옴)
document.addEventListener('click', e=>{ const b=e.target.closest('#itemsBox [data-erpdrop]'); if(!b) return; const x=erpList[+b.dataset.erpdrop]; if(!x) return;
  erpList=erpList.filter(y=>y!==x); touched.add('erpList'); startTimer(); renderTasks(); renderSide(); autoSave();
  toast(`전산 내역에서 「${x.product}」을(를) 뺐습니다. 전산 내역을 다시 붙여 넣으면 돌아옵니다.`, 3600); });
// 전산에만 있는 상품 → 예약 내역 줄로 (인원 · 수량은 전산 그대로)
document.addEventListener('click', e=>{ const b=e.target.closest('#itemsBox [data-erpadd]'); if(!b) return; const x=erpList[+b.dataset.erpadd]; if(!x) return;
  const k=erpKeyOf(x.product); if(!k){ toast('품목 관리에 없는 상품이라 줄로 넣을 수 없습니다.'); return; }
  if(k==='mb'){ const m=mbMenus().find(m=>normSrc(m.src)===normSrc(x.product)); if(m){ rec.mabangMenu=m.name; touched.add('mabangMenu'); } }   // 몽몽마방은 그 메뉴로
  setItemQty(k, String(numOf(itemQty(k)) + (x.people||0))); if(!itemRows.includes(k)) itemRows.push(k);
  itemChanged(true); toast(`${itemLabel(x.product)} ${x.people}${erpUnit(x)}을(를) 예약 내역에 추가했습니다. 담당 · 비고를 확인하세요.`);
});
// 품목 관리에 없는 전산 상품 → 품목 관리(공유 품목 목록)에 자동 추가 → 바로 예약 내역 줄로 (2026-11-16)
//  가격 = 전산 상품금액(할인 전) ÷ 인원 · 구분: 이름에 관람 → 관람(비과세 · 사유원, 할인 대상) / 식사 · 런치 등 → 식사 / 그 밖 → 굿즈 (과세 · 신라). 품목 관리에서 고칠 수 있음
document.addEventListener('click', async e=>{ const b=e.target.closest('#itemsBox [data-erpcat]'); if(!b) return; const x=erpList[+b.dataset.erpcat]; if(!x) return;
  const name=String(x.product||'').trim(), n=Math.max(1, x.people||1), unit=Math.round((x.base||x.amount||0)/n);
  if(!name){ toast('상품 이름이 없습니다.'); return; }
  if(catalogItems().some(it=>normSrc(it.src)===normSrc(name))){ toast('이미 품목 관리에 있는 상품입니다. 화면을 새로고침해 주세요.'); return; }
  const kind = /관람/.test(name) && !/관람권|관람식사권/.test(name) ? 'view' : /식사|정식|런치|디너|밥상|도시락|비빔밥/.test(name) ? 'food' : 'goods', KL={view:'관람', food:'식사', goods:'굿즈'};
  if(!confirm(`품목 관리에 추가할까요? (모두가 쓰는 품목 목록)\n\n상품: ${name}\n가격: ${won(unit)}원 (${kind==='goods'?'1개':'1인'} · 전산 상품금액 ${won(x.base||x.amount)}원 ÷ ${n})\n구분: ${KL[kind]} · ${kind==='view'?'비과세(사유원)':'과세(신라)'}\n\n추가한 뒤 이 예약 내역에도 줄로 넣습니다. 가격 · 구분은 품목 관리에서 고칠 수 있습니다.`)) return;
  b.disabled=true; b.textContent='추가하는 중…';
  const item={uid:Date.now(), src:name, name, kind, form: kind==='view'?'sayuwon':'shilla', price:unit, disc: kind==='view'};
  try{
    const r=await SY.quote.post({ops:[{op:'add', item}]});
    if(!r || r.ok===false) throw new Error((r && r.error) || '저장 실패');
    if(r.data && quoteCat){ quoteCat.added=r.data.added||quoteCat.added; quoteCat.edits=r.data.edits||quoteCat.edits; writeJSON('sayuwon_quote_cat', quoteCat); }
    else if(quoteCat){ (quoteCat.added ||= []).unshift(item); writeJSON('sayuwon_quote_cat', quoteCat); }
    markDb('cat');
  }catch(err){ b.disabled=false; b.textContent='＋ 품목 관리에 추가'; toast('품목 관리에 추가하지 못했습니다: '+err.message); return; }
  toast(`「${name}」을(를) 품목 관리에 추가했습니다 (${KL[kind]} · ${won(unit)}원).`);
  renderSide(); paintItemPrices();
  const k=erpKeyOf(x.product); if(k){ setItemQty(k, String(numOf(itemQty(k)) + (x.people||0))); if(!itemRows.includes(k)) itemRows.push(k); itemChanged(true); }   // 그대로 예약 내역 줄로
});
