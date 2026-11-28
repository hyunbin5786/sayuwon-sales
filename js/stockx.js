// ===== 재고관리 (stock.html · 2026-11-24 · 「2026 굿즈 재고조사 파일」 엑셀 모양으로 다시) — js/opsboard.js 다음에 읽음 (renderStock 을 이 파일 것으로 바꿈) =====
// 화면 = 월별 수불현황 (엑셀과 같은 칸):
//   상품명 · 색상 · 사이즈 · 원가 · 판매단가 |
//   붕정창고: 기초 · 입고 · 출고(온라인 판매 · 자체소진 · 선물/접대) · 출고 합계 · 기말(장부) · 실사 |
//   차방창고: 기초 · 입고 · 출고(F&B 음료제조 · 오프라인 판매) · 출고 합계 · 기말(장부) · 실사 | 총 기말 · 총 실사 · 장부상 재고차이 · 차이 사유
//   기초 = 그달 1일 전까지 기록으로 계산한 재고 (지난달 실사가 있으면 그 수부터) · 기말 = 기초 + 입고 − 출고 · 실사 = 그달 재고조사로 센 수 · 차이 = 실사 − 기말
// 기록 (누가 · 언제): 「붕정 기록」(입고 · 온라인 판매 · 자체소진 · 선물/접대) · 「차방 기록」(입고 · F&B 음료제조 · 오프라인 판매) = 품목 표에 수를 적음
//   「붕정 재고조사」 · 「차방 재고조사」 = 예상 재고(기록으로 계산) · 실제 재고 · 차이 · 차이 사유 — 붕정 · 차방 담당이 따로
//   「엑셀 불러오기」 = 이 엑셀(월마다 쓰던 파일)로 품목 · 원가 · 단가 · 그달 말 재고(실사, 없으면 기말)를 넣음 (처음 한 번 · 다시 넣으면 그 날짜 재고로 맞춤)
//   「이 달 엑셀로」 = 화면의 월별 수불현황을 엑셀 파일로 내려받기
// 정기 재고조사: 2주(14일)마다 · 붕정 · 차방 둘 다 세면 다음 주기 (설정 줄 id stockcfg · d:{next, last, cycle, done:{wh,shop}, mgr:{wh,shop}, base})
// 저장: 공유 기록(calls) 통화 구분 「재고」 한 줄 = 품목 하나 {kind:'stock', d:{key, no, name, color, size, cost, price, wh, shop}, log:[{at, by, what, mv:{t, loc, n, date, memo}}]} (최근 600개)
//   mv.t: open(엑셀 재고 · 그 수로 맞춤) · count(재고조사 · 그 수로 맞춤) · in(입고 +) · online · self · gift(붕정 −) · fnb · offline(차방 −)
//   예전 기록(web · shop · out · loc 없는 count)도 읽음 · 품목 = 이 목록(엑셀) — 품목관리 굿즈 중 목록에 없는 것은 아래에 따로 (「재고 목록에 넣기」)
(function(){
  const CFG_ID='stockcfg', CYCLE=14;
  const LOC = { wh:'붕정', shop:'차방' };
  const OUTS = { wh:[['online','온라인 판매'],['self','자체소진'],['gift','선물/접대']], shop:[['fnb','F&B 음료제조'],['offline','오프라인 판매']] };
  const TYPE_L = { open:'엑셀 재고', count:'재고조사', in:'입고', online:'온라인 판매', self:'자체소진', gift:'선물/접대', fnb:'F&B 음료제조', offline:'오프라인 판매', adj:'예전 조사 차이' };
  const nsK = s => String(s||'').replace(/\s/g,'').toLowerCase();
  const keyOf = d => [d.name, d.color, d.size].map(nsK).join('|');
  const label = d => [d.name, d.color, d.size].filter(Boolean).join(' · ');
  const isCfg = x => x.r?.id===CFG_ID || !!(x.d && x.d.cfg);
  const cfgRow = () => rows.find(isCfg);
  const cfg = () => ({cycle:CYCLE, ...((cfgRow()||{}).d||{})});
  const addDays = (ymd, n) => { const d=new Date(ymd+'T00:00'); d.setDate(d.getDate()+n); return opsYmd(d); };
  const monthEnd = ym => { const [y,m]=ym.split('-').map(Number); return opsYmd(new Date(y, m, 0)); };
  const num = v => { const s=String(v??'').replace(/[,\s원]/g,''); if(s==='') return null; if(/^-+$/.test(s)) return 0; const n=Number(s); return isNaN(n) ? null : n; };
  const f0 = v => v==null || v==='' ? '' : won(v);
  let month=opsToday().slice(0,7), view='simple', showPrice=false, histType='', skF='', skOpen=new Set();   // view: simple(품목별 보기 · 기본) · ledger(엑셀 표) · hist(기록) · skF: ''|diff|moved

  // ---------- 품목 · 기록 ----------
  // 품목 = 품목관리에서 굿즈로 분류된 상품만 (2026-11-24) — 재고 줄은 이름으로 맞춤 (색상 · 사이즈가 다른 줄은 모두) · 아직 재고 줄이 없는 굿즈는 0 으로 보이고 처음 기록할 때 줄을 만듦(vid)
  //  굿즈가 아닌 재고 줄은 숨김 (hiddenRows) · 굿즈 목록을 아직 못 받았으면 재고 줄 그대로
  const stockRows = () => rows.filter(x=>!isCfg(x) && x.d && x.d.name);
  const bySort = (a,b)=>(+a.d.no||9999)-(+b.d.no||9999) || label(a.d).localeCompare(label(b.d),'ko');
  const items = () => { const G=opsGoodsCache||[]; if(!G.length) return stockRows().sort(bySort);
    const gs=new Set(G.map(g=>nsK(g.name))), have=stockRows().filter(x=>gs.has(nsK(x.d.name))), hn=new Set(have.map(x=>nsK(x.d.name)));
    const virt=G.map((g,i)=>({g,i})).filter(({g})=>!hn.has(nsK(g.name))).map(({g,i})=>({r:{}, d:{name:g.name, price:g.price!=null?String(Math.round(g.price/1.1)):''}, log:[], vid:'gv'+i}));
    return [...have.sort(bySort), ...virt.sort(bySort)]; };
  const hiddenRows = () => { const G=opsGoodsCache||[]; if(!G.length) return []; const gs=new Set(G.map(g=>nsK(g.name))); return stockRows().filter(x=>!gs.has(nsK(x.d.name))); };
  const rid = x => (x.r && x.r.id) || x.vid;
  // 한 품목의 한 장소 기록 → [{date, at, t, n, memo, by}] (예전 모양도 바꿔 읽음)
  function moves(x, loc){ const out=[];
    (x.log||[]).forEach(g=>{ const m=g.mv; if(!m || !m.t) return; const date=m.date||opsYmd(g.at), base={date, at:g.at||'', by:g.by||'', memo:m.memo||''};
      if(m.loc){ if(m.loc===loc) out.push({...base, t:m.t, n:+m.n||0}); return; }
      // 예전 기록 (2026-11-24 앞 화면)
      if(m.t==='web' && loc==='wh') out.push({...base, t:'online', n:+m.n||0});
      else if(m.t==='shop' && loc==='shop') out.push({...base, t:'offline', n:+m.n||0});
      else if(m.t==='in' && loc==='wh' && m.dw) out.push({...base, t:'in', n:+m.dw});
      else if(m.t==='out'){ if(loc==='wh') out.push({...base, t:'self', n:+m.n||0}); else if(m.ds) out.push({...base, t:'in', n:+m.ds}); }
      else if(m.t==='count'){ const dv=loc==='wh'?m.dw:m.ds; if(dv) out.push({...base, t:'adj', n:+dv}); } });
    return out.sort((a,b)=>a.date.localeCompare(b.date) || a.at.localeCompare(b.at)); }
  const apply = (bal, e) => e.t==='open' || e.t==='count' ? e.n : e.t==='in' || e.t==='adj' ? bal+e.n : bal-e.n;
  const balNow = (x, loc) => moves(x, loc).reduce(apply, 0);
  // 그달 한 장소 수불: {open, in, out:{…}, outSum, end, count, reason}
  function ledger(x, loc, ym){ const s=ym+'-01', e=monthEnd(ym), L=moves(x, loc); let open=0, cnt=null, reason=''; const o={in:0}; OUTS[loc].forEach(([k])=>o[k]=0);
    L.forEach(m=>{ if(m.date<s){ open=apply(open, m); return; } if(m.date>e) return;
      if(m.t==='count' || m.t==='open'){ cnt=m.n; reason=m.memo; }
      else if(m.t==='in' || m.t==='adj') o.in+=m.n; else if(m.t in o) o[m.t]+=m.n; });
    const outSum=OUTS[loc].reduce((a,[k])=>a+o[k],0), end=open+o.in-outSum;
    return {open, in:o.in, out:o, outSum, end, count:cnt, reason}; }
  // 한 품목 저장 (기록 한 줄을 더함 · mv 가 null 이면 품목 정보만)
  async function saveItem(x, fn, what){
    const cur=x && x.r && x.r.id ? (rows.find(y=>y.r && y.r.id===x.r.id) || x) : x;
    const d={...((cur && cur.d) || {})}, mv=fn(d, cur); if(mv===false) return cur;
    const now=new Date().toISOString(), r=(cur && cur.r)||{}, log=[...((cur && cur.log)||[]), ...(mv ? [{at:now, by:user.name||'', what, mv}] : [])].slice(-600), tmp={r, d, log};
    d.wh=String(balNow(tmp,'wh')); d.shop=String(balNow(tmp,'shop')); d.key=keyOf(d); delete d.qty;
    const item={...r, id:r.id||opsId(), callType:OPS_TYPES.stock, saved:r.saved||now, takenBy:r.takenBy||user.name||'', owner:'', summary:`${label(d)} 붕정 ${d.wh} · 차방 ${d.shop}`.slice(0,120), history:JSON.stringify({kind:'stock', d, log})};
    delete item.date; delete item.org;
    await SY.call({action:'put', item});
    const nr={r:item, d, log}, i=rows.findIndex(y=>y.r && y.r.id===item.id); if(i>=0) rows[i]=nr; else rows.push(nr); return nr;
  }
  async function saveCfg(patch, what){
    const x=cfgRow(), d={...cfg(), ...patch, cfg:true}, now=new Date().toISOString(), r=(x && x.r)||{}, log=[...((x && x.log)||[]), {at:now, by:user.name||'', what}].slice(-100);
    const item={...r, id:CFG_ID, callType:OPS_TYPES.stock, saved:r.saved||now, takenBy:r.takenBy||user.name||'', owner:'', summary:`정기 재고조사 · 다음 ${d.next||'-'}`, history:JSON.stringify({kind:'stock', d, log})};
    delete item.date; delete item.org;
    await SY.call({action:'put', item});
    const nr={r:item, d, log}, i=rows.findIndex(isCfg); if(i>=0) rows[i]=nr; else rows.push(nr);
  }

  // ---------- 화면 ----------
  function banner(){
    const c=cfg(), t=opsToday(), mg=c.mgr||{};
    const who = `<span class="sk-mgr">붕정 담당 <b>${esc(mg.wh||'—')}</b> · 차방 담당 <b>${esc(mg.shop||'—')}</b></span>`;
    if(!c.next) return `<div class="sk-ban"><b>정기 재고조사 (2주마다)</b> 첫 조사 날짜를 정해 주세요 <input type="date" id="skFirst" value="${t}"><button type="button" class="btn primary" id="skFirstOk">정하기</button>${who}</div>`;
    const due=c.next<=t, dn=(c.done||{}), part=k=>{ const x=dn[k], ok=x && x.date && x.date>=addDays(c.next,-7);
      return ok ? `<span class="sk-part ok">${LOC[k]} ✓ ${esc(opsDateLabel(x.date))} ${esc(x.by||'')}</span>` : `<button type="button" class="btn primary" data-skmv="count" data-loc="${k}">${LOC[k]} 재고조사</button>`; };
    return `<div class="sk-ban${due?' due':''}">${due?`<b>📋 정기 재고조사 날입니다</b> (예정 ${esc(opsDateLabel(c.next))}${c.next<t?' · 지남':''}) ${part('wh')} ${part('shop')}`
      : `<b>다음 정기 재고조사</b> ${esc(opsDateLabel(c.next))} <span class="hint">(2주마다${c.last?` · 마지막 ${esc(opsDateLabel(c.last))}`:''})</span>`}
      ${who}<span class="sk-next-ed"><input type="date" id="skNext" value="${esc(c.next)}"><button type="button" class="btn sm" id="skNextEdit">날짜 바꾸기</button></span></div>`;
  }
  function months(){ const set=new Set([opsToday().slice(0,7), month]); items().forEach(x=>(x.log||[]).forEach(g=>{ const dt=(g.mv && g.mv.date)||opsYmd(g.at); if(dt) set.add(dt.slice(0,7)); })); return [...set].sort().reverse(); }
  function ledgerTable(hit){
    const L=items().filter(x=>hit({...x.d, name:label(x.d)}));
    const th2 = loc => `<th class="num">기초</th><th class="num">입고</th>${OUTS[loc].map(([,l])=>`<th class="num">${l}</th>`).join('')}<th class="num">출고 합계</th><th class="num">기말</th><th class="num sk-real">실사</th>`;
    const tot = {wh:{}, shop:{}};
    const tds = (x, loc) => { const g=ledger(x, loc, month), T=tot[loc]; ['open','in','outSum','end'].forEach(k=>T[k]=(T[k]||0)+g[k]); OUTS[loc].forEach(([k])=>T[k]=(T[k]||0)+g.out[k]); if(g.count!=null) T.count=(T.count||0)+g.count;
      return {g, html:`<td class="num">${f0(g.open)}</td><td class="num">${g.in?won(g.in):''}</td>${OUTS[loc].map(([k])=>`<td class="num">${g.out[k]?won(g.out[k]):''}</td>`).join('')}<td class="num">${g.outSum?won(g.outSum):''}</td><td class="num${g.end<0?' neg':''}"><b>${won(g.end)}</b></td><td class="num sk-real">${g.count!=null?`<b>${won(g.count)}</b>`:''}</td>`}; };
    let totEnd=0, totReal=0, totDiff=0;
    const body = L.map((x,i)=>{ const a=tds(x,'wh'), b=tds(x,'shop'), d=x.d, end=a.g.end+b.g.end, hasReal=a.g.count!=null || b.g.count!=null;
      const real=(a.g.count!=null?a.g.count:a.g.end)+(b.g.count!=null?b.g.count:b.g.end), diff=hasReal ? real-end : null, reason=[a.g.reason, b.g.reason].filter(Boolean).join(' · ');
      totEnd+=end; if(hasReal){ totReal+=real; totDiff+=diff; }
      const cost=num(d.cost);
      return `<tr><td class="num sk-no">${esc(d.no||i+1)}</td><td class="sk-nm"><b>${esc(d.name)}</b></td><td>${esc(d.color||'')}</td><td>${esc(d.size||'')}</td>`
        + (showPrice ? `<td class="num">${cost!=null ? won(cost) : esc(d.cost||'')}</td><td class="num">${f0(num(d.price))}</td>` : '')
        + a.html + b.html + `<td class="num"><b>${won(end)}</b></td><td class="num">${hasReal?`<b>${won(real)}</b>`:''}</td><td class="num${diff?(diff>0?' up':' down'):''}">${diff==null?'':diff?(diff>0?'+':'')+won(diff):'-'}</td><td class="sk-why">${esc(reason)}</td></tr>`; }).join('');
    const sum = loc => { const T=tot[loc]; return `<td class="num">${won(T.open||0)}</td><td class="num">${won(T.in||0)}</td>${OUTS[loc].map(([k])=>`<td class="num">${won(T[k]||0)}</td>`).join('')}<td class="num">${won(T.outSum||0)}</td><td class="num"><b>${won(T.end||0)}</b></td><td class="num sk-real">${T.count!=null?won(T.count):''}</td>`; };
    const mg=cfg().mgr||{};
    return `<div class="tw sk-lw"><table class="tbl sk-led"><thead><tr><th rowspan="2" class="sk-no">NO</th><th rowspan="2" class="sk-nm">상품명</th><th rowspan="2">색상</th><th rowspan="2">사이즈</th>${showPrice?'<th rowspan="2" class="num">원가<br><small>부가세 별도</small></th><th rowspan="2" class="num">판매단가<br><small>부가세 별도</small></th>':''}`
      + `<th colspan="${5+OUTS.wh.length}" class="sk-g wh">붕정창고 수불${mg.wh?` <small>(재고담당 ${esc(mg.wh)})</small>`:''}</th><th colspan="${5+OUTS.shop.length}" class="sk-g shop">차방창고 수불${mg.shop?` <small>(재고담당 ${esc(mg.shop)})</small>`:''}</th><th rowspan="2" class="num">총 기말</th><th rowspan="2" class="num">총 실사</th><th rowspan="2" class="num">장부상<br>재고차이</th><th rowspan="2">재고 차이 사유</th></tr>`
      + `<tr>${th2('wh')}${th2('shop')}</tr></thead><tbody>`
      + (L.length ? body : `<tr><td colspan="${22+(showPrice?2:0)}" class="empty">${items().length ? '찾은 품목이 없습니다.' : '재고 목록이 비어 있습니다. 「엑셀 불러오기」로 재고조사 엑셀을 넣어 주세요.'}</td></tr>`)
      + `</tbody>${L.length?`<tfoot><tr><td></td><td><b>합계</b></td><td></td><td></td>${showPrice?'<td></td><td></td>':''}${sum('wh')}${sum('shop')}<td class="num"><b>${won(totEnd)}</b></td><td class="num">${won(totReal)}</td><td class="num">${totDiff?(totDiff>0?'+':'')+won(totDiff):''}</td><td></td></tr></tfoot>`:''}</table></div>`
      + goodsMissing();
  }
  // ---------- 품목별 보기 (2026-11-24 · 기본 화면): 엑셀 표 24칸이 한눈에 안 읽혀서 ----------
  //  위 = 이 달 요약 칸 · 아래 = 품목마다 한 줄 (붕정 · 차방 기말과 실사 · 총 재고 · 차이) → 줄을 누르면 그 품목의 모든 칸(기초 · 입고 · 출고 종류별 · 출고 합계 · 기말 · 실사 · 원가 · 판매단가 · 차이 사유)
  function simpleView(hit){
    const all=items().filter(x=>hit({...x.d, name:label(x.d)}));
    const first = stockRows().length ? '' : `<div class="sk-first"><b>처음 한 번만</b> 지금까지 쓰던 엑셀(굿즈 재고조사 파일)의 재고를 넣어 주세요 — 그 뒤로는 이 화면에서 입고 · 출고 · 재고조사로 기록합니다. <label class="btn primary">엑셀로 처음 재고 넣기<input type="file" id="skXl" accept=".xlsx,.xls" hidden></label></div>`;
    if(!all.length) return first + `<p class="sk-empty">${items().length ? '찾은 품목이 없습니다.' : '품목관리에 굿즈로 분류된 상품이 없습니다.'}</p>`;
    const R=all.map((x,i)=>{ const a=ledger(x,'wh',month), b=ledger(x,'shop',month), end=a.end+b.end, hasReal=a.count!=null || b.count!=null;
      const real=(a.count!=null?a.count:a.end)+(b.count!=null?b.count:b.end), diff=hasReal ? real-end : null;
      return {x, i, a, b, end, real:hasReal?real:null, diff, moved:!!(a.in||a.outSum||b.in||b.outSum), reason:[a.reason, b.reason].filter(Boolean).join(' · ')}; });
    const T={end:0, real:0, nReal:0, diff:0, nDiff:0, inW:0, inS:0, outW:0, outS:0, nMoved:0};
    R.forEach(r=>{ T.end+=r.end; if(r.real!=null){ T.real+=r.real; T.nReal++; } if(r.diff){ T.diff+=r.diff; T.nDiff++; } T.inW+=r.a.in; T.inS+=r.b.in; T.outW+=r.a.outSum; T.outS+=r.b.outSum; if(r.moved) T.nMoved++; });
    const L=R.filter(r=>!skF || (skF==='diff' ? !!r.diff : r.moved));
    const sgn = n => n>0 ? '+'+won(n) : won(n);
    const tile = (l, v, s, cls) => `<div class="sk-tile${cls?' '+cls:''}"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
    const tiles = `<div class="sk-tiles">${tile('품목', `${R.length}개`, `이 달 움직인 품목 ${T.nMoved}개`)}${tile('총 재고 (장부 기말)', won(T.end)+'개', `붕정 ${won(R.reduce((s,r)=>s+r.a.end,0))} · 차방 ${won(R.reduce((s,r)=>s+r.b.end,0))}`)}`
      + `${tile('입고', won(T.inW+T.inS)+'개', `붕정 ${won(T.inW)} · 차방 ${won(T.inS)}`)}${tile('출고', won(T.outW+T.outS)+'개', `붕정 ${won(T.outW)} · 차방 ${won(T.outS)}`)}`
      + `${tile('재고조사 차이', T.nDiff ? sgn(T.diff)+'개' : '없음', T.nReal ? `실사한 품목 ${T.nReal}개 중 차이 ${T.nDiff}개` : '이 달 재고조사 기록 없음', T.nDiff?'warn':'')}</div>`;
    const chips = `<div class="sk-chips">${[['','전체',R.length],['diff','차이 있는 것만',T.nDiff],['moved','이 달 움직인 것만',T.nMoved]].map(([k,l,n])=>`<button type="button" class="chip${skF===k?' on':''}" data-skf="${k}">${l} <small>${n}</small></button>`).join('')}`
      + `<span class="sp"></span><button type="button" class="chip" data-skall="${skOpen.size?'close':'open'}">${skOpen.size?'모두 접기':'모두 펼치기'}</button></div>`;
    const locCell = g => `<div class="sk-c"><b class="${g.end<0?'neg':''}">${won(g.end)}</b>${g.count!=null?`<span class="real${g.count!==g.end?' off':''}">실사 ${won(g.count)}</span>`:''}${g.in||g.outSum?`<small>${g.in?`+${won(g.in)}`:''}${g.in&&g.outSum?' ':''}${g.outSum?`−${won(g.outSum)}`:''}</small>`:''}</div>`;
    const detLoc = (loc, g) => `<div class="sk-dc ${loc}"><h4>${LOC[loc]}창고</h4><dl>`
      + `<dt>기초</dt><dd>${won(g.open)}</dd><dt>입고</dt><dd class="in">${g.in?'+'+won(g.in):'0'}</dd>`
      + OUTS[loc].map(([k,l])=>`<dt>${l}</dt><dd class="out">${g.out[k]?'−'+won(g.out[k]):'0'}</dd>`).join('')
      + `<dt>출고 합계</dt><dd class="out">${g.outSum?'−'+won(g.outSum):'0'}</dd><dt class="end">기말 (장부)</dt><dd class="end${g.end<0?' neg':''}">${won(g.end)}</dd><dt>실사</dt><dd class="real">${g.count!=null?won(g.count):'—'}</dd></dl></div>`;
    const det = r => { const d=r.x.d, cost=num(d.cost);
      return `<div class="sk-det">${detLoc('wh', r.a)}${detLoc('shop', r.b)}<div class="sk-dc info"><h4>합계 · 품목 정보</h4><dl>`
        + `<dt>총 기말</dt><dd><b>${won(r.end)}</b></dd><dt>총 실사</dt><dd>${r.real!=null?won(r.real):'—'}</dd><dt>장부상 재고차이</dt><dd class="${r.diff?(r.diff>0?'up':'down'):''}">${r.diff==null?'—':r.diff?sgn(r.diff):'없음'}</dd>`
        + `<dt>재고 차이 사유</dt><dd>${esc(r.reason||'—')}</dd><dt>색상</dt><dd>${esc(d.color||'—')}</dd><dt>사이즈</dt><dd>${esc(d.size||'—')}</dd>`
        + `<dt>원가 <small>부가세 별도</small></dt><dd>${cost!=null?won(cost)+'원':esc(d.cost||'—')}</dd><dt>판매단가 <small>부가세 별도</small></dt><dd>${num(d.price)!=null?won(num(d.price))+'원':'—'}</dd></dl></div></div>`; };
    const id = r => esc(rid(r.x) || 'i'+r.i);
    return first + tiles + chips + `<div class="sk-list"><div class="sk-row sk-hd"><span>NO</span><span>상품</span><span class="wh">붕정</span><span class="shop">차방</span><span>총 재고</span><span>차이</span><span></span></div>`
      + (L.length ? L.map(r=>{ const d=r.x.d, op=skOpen.has(id(r));
        return `<div class="sk-item${op?' open':''}${r.diff?' has-diff':''}"><div class="sk-row" data-skrow="${id(r)}" tabindex="0" role="button" aria-expanded="${op}"><span class="no">${esc(d.no||r.i+1)}</span>`
          + `<span class="nm"><b>${esc(d.name)}</b>${d.color||d.size?`<small>${esc([d.color,d.size].filter(Boolean).join(' · '))}</small>`:''}</span>`
          + `<span class="wh" data-l="붕정">${locCell(r.a)}</span><span class="shop" data-l="차방">${locCell(r.b)}</span><span class="tot" data-l="총 재고"><b>${won(r.end)}</b></span>`
          + `<span class="df" data-l="차이">${r.diff==null?'<i>—</i>':r.diff?`<b class="${r.diff>0?'up':'down'}">${sgn(r.diff)}</b>`:'<i>없음</i>'}</span><span class="ar">${op?'▾':'▸'}</span></div>${op?det(r):''}</div>`; }).join('')
        : `<p class="sk-empty">${skF==='diff'?'재고조사 차이가 있는 품목이 없습니다.':'이 달 입고 · 출고가 있는 품목이 없습니다.'}</p>`)
      + `</div>` + goodsMissing();
  }
  // 품목관리 굿즈 중 재고 목록에 없는 것 (이름으로 비교) → 「재고 목록에 넣기」
  // (2026-11-24) 품목 = 품목관리 굿즈 → 굿즈가 아닌 재고 줄은 숨기고 몇 개인지만 (이름이 다르게 적혀 굿즈와 안 맞는 것일 수도)
  function goodsMissing(){ const H=hiddenRows(); if(!H.length) return '';
    return `<details class="sk-miss"><summary>품목관리 굿즈에 없는 재고 품목 ${H.length}개는 숨김 (이름이 다르게 적혀 있을 수도 있음 · 굿즈로 보이려면 품목관리에서 굿즈로)</summary><div>${H.map(x=>`<span class="sk-mi">${esc(label(x.d))}</span>`).join('')}</div></details>`; }
  function histView(hit){
    const all=[]; items().forEach(x=>['wh','shop'].forEach(loc=>moves(x, loc).forEach(m=>all.push({...m, loc, name:label(x.d)}))));
    const L=all.filter(m=>m.date.startsWith(month) && (!histType || m.t===histType) && hit({name:m.name, memo:m.memo, by:m.by})).sort((a,b)=>b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
    const types=['in','online','self','gift','fnb','offline','count','open'];
    return `<div class="sk-hf"><select id="skType"><option value="">모든 기록</option>${types.map(t=>`<option value="${t}"${t===histType?' selected':''}>${TYPE_L[t]}</option>`).join('')}</select></div>`
      + `<div class="tw"><table class="tbl sk-h"><thead><tr><th>날짜</th><th>장소</th><th>종류</th><th>품목</th><th class="num">수량</th><th>누가</th><th>메모 · 사유</th></tr></thead><tbody>`
      + (L.length ? L.map(m=>`<tr><td class="nw">${esc(opsDateLabel(m.date))}</td><td>${LOC[m.loc]}</td><td><span class="sk-tag t-${m.t}">${esc(TYPE_L[m.t]||m.t)}</span></td><td>${esc(m.name)}</td><td class="num">${m.t==='count'||m.t==='open'?`= ${won(m.n)}`:won(m.n)}</td><td>${esc(m.by)}</td><td class="hint">${esc(m.memo)}</td></tr>`).join('')
        : `<tr><td colspan="7" class="empty">이 달에 기록이 없습니다.</td></tr>`) + `</tbody></table></div>`;
  }
  renderStock = function(hit){
    $('#addBtn').hidden=true;
    $('#bSum').textContent = '';
    $('#filters').innerHTML = banner()
      // 2026-11-24: 입고 · 출고 · 재고조사를 붕정 · 차방으로 나눈 버튼 (엑셀 불러오기 · 이 달 엑셀로는 없앰 — 재고는 이 화면에서 기록 · 처음 한 번만 품목별 보기의 「엑셀로 처음 재고 넣기」)
      + `<div class="sk-acts">${[['in','입고'],['out','출고'],['count','재고조사']].map(([k,l])=>`<span class="sk-ag"><small>${l}</small><button type="button" class="btn primary" data-skmv="${k}" data-loc="wh">붕정 ${l}</button><button type="button" class="btn primary" data-skmv="${k}" data-loc="shop">차방 ${l}</button></span>`).join('')}</div>`
      + `<div class="sk-bar"><select id="skMonth">${months().map(m=>`<option value="${m}"${m===month?' selected':''}>${m.slice(0,4)}년 ${+m.slice(5)}월</option>`).join('')}</select>`
      + `<div class="seg sk-tabs"><button type="button" class="${view==='simple'?'on':''}" data-skview="simple">품목별 보기</button><button type="button" class="${view==='ledger'?'on':''}" data-skview="ledger">엑셀 표</button><button type="button" class="${view==='hist'?'on':''}" data-skview="hist">기록</button></div>`
      + (view==='ledger' ? `<label class="hint sk-pc"><input type="checkbox" id="skPrice"${showPrice?' checked':''}> 원가 · 판매단가 보기</label>` : '') + `</div>`;
    $('#list').innerHTML = view==='hist' ? histView(hit) : view==='ledger' ? ledgerTable(hit) : simpleView(hit);
  };

  // ---------- 기록 창 (붕정 기록 · 차방 기록 · 재고조사 · 엑셀 불러오기) ----------
  let mvKind='', mvLoc='wh', xlData=null;
  function modal(){ let m=document.getElementById('skModal'); if(m) return m;
    m=document.createElement('div'); m.className='modal'; m.id='skModal'; m.hidden=true; m.innerHTML='<section class="panel edit-box sk-box" role="dialog" aria-modal="true"><h2 id="skTitle"></h2><div id="skBody"></div><p class="err" id="skErr"></p><div class="row-btns"><span class="sp"></span><button type="button" class="btn" id="skNo">취소</button><button type="button" class="btn primary" id="skOk">기록하기</button></div></section>';
    document.body.appendChild(m);
    m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; });
    m.querySelector('#skNo').onclick=()=>{ m.hidden=true; };
    m.querySelector('#skOk').onclick=()=>{ if(mvKind==='xl') doXl(); else submit(); };
    m.addEventListener('click', e=>{
      const lc=e.target.closest('[data-skloc]'); if(lc){ if(lc.dataset.skloc===mvLoc) return; if(dirty() && !window.confirm('적은 수가 있습니다. 장소를 바꾸면 적은 것이 지워집니다. 바꿀까요?')) return; mvLoc=lc.dataset.skloc; paint(); return; }
      const sm=e.target.closest('[data-sksame]'); if(sm){ const tr=sm.closest('tr'), i=tr.querySelector('input[data-v]'); i.value=tr.dataset.exp; calc(tr); return; }
      if(e.target.id==='skAllSame'){ m.querySelectorAll('tr[data-skid]').forEach(tr=>{ const i=tr.querySelector('input[data-v]'); if(i.value===''){ i.value=tr.dataset.exp; calc(tr); } }); return; } });
    m.addEventListener('input', e=>{ if(e.target.matches('input[data-v]')) calc(e.target.closest('tr')); if(e.target.id==='skFind') find(e.target.value); });
    return m; }
  const dirty = () => [...modal().querySelectorAll('input[data-v]')].some(i=>i.value!=='');
  function find(q){ const n=nsK(q); modal().querySelectorAll('tr[data-skid]').forEach(tr=>{ tr.hidden = !!n && !nsK(tr.dataset.nm).includes(n); }); }
  function calc(tr){ const exp=+tr.dataset.exp||0, out=tr.querySelector('.sk-out'), ins=[...tr.querySelectorAll('input[data-v]')];
    if(mvKind==='count'){ const v=ins[0].value, why=tr.querySelector('.sk-whyin');
      if(v===''){ out.textContent=''; out.className='num sk-out'; if(why) why.hidden=true; return; }
      const df=(+v||0)-exp; out.textContent = df ? (df>0?'+':'')+won(df) : '같음'; out.className='num sk-out '+(df>0?'up':df<0?'down':'same'); if(why) why.hidden=!df; return; }
    if(!ins.some(i=>i.value!=='')){ out.textContent=''; return; }
    let v=exp; ins.forEach(i=>{ const n=+i.value||0; v += i.dataset.v==='in' ? n : -n; }); out.textContent=won(v); out.className='num sk-out'+(v<0?' down':''); }
  // mvKind: in(입고) · out(출고: 붕정 = 온라인 판매 · 자체소진 · 선물/접대 / 차방 = F&B 음료제조 · 오프라인 판매) · count(재고조사) · rec(예전: 입고 + 출고) — 장소는 누른 버튼대로 (2026-11-24 붕정 · 차방 나눔)
  function paint(){ const m=modal(), cnt=mvKind==='count', loc=mvLoc, L=items();
    m.querySelector('#skTitle').textContent = `${LOC[loc]} ${cnt?'재고조사':mvKind==='in'?'입고':mvKind==='out'?'출고':'기록'}`;
    const cols = cnt ? [] : mvKind==='in' ? [['in','입고']] : mvKind==='out' ? OUTS[loc] : [['in','입고'], ...OUTS[loc]];
    m.querySelector('#skBody').innerHTML = ``
      + `<div class="sk-f2"><label class="sk-f">${cnt?'조사일':'날짜'} <input type="date" id="skDate" value="${opsToday()}"></label><input id="skFind" type="search" placeholder="품목 찾기" data-ime="ko" autocomplete="off">${cnt?'<button type="button" class="btn sm" id="skAllSame">빈 칸 모두 예상과 같음</button>':''}</div>`
      + `<div class="tw sk-tw"><table class="tbl sk-ct"><thead><tr><th>품목</th><th class="num">${cnt?'예상 재고':'지금'}</th>${cnt?'<th class="num">실제 재고</th><th class="num">차이</th><th></th>':cols.map(([,l])=>`<th class="num">${l}</th>`).join('')+'<th class="num">기록 뒤</th>'}</tr></thead><tbody>`
      + (L.length ? L.map(x=>{ const e=balNow(x, loc); return `<tr data-skid="${esc(rid(x))}" data-nm="${esc(label(x.d))}" data-exp="${e}"><td>${esc(label(x.d))}</td><td class="num">${won(e)}</td>`
          + (cnt ? `<td class="num"><input type="number" min="0" step="1" inputmode="numeric" data-v="n" placeholder="센 수"></td><td class="num sk-out"></td><td class="sk-ctl"><button type="button" class="btn sm" data-sksame>예상과 같음</button><input class="sk-whyin" placeholder="차이 사유" data-ime="ko" hidden></td>`
            : cols.map(([k])=>`<td class="num"><input type="number" min="1" step="1" inputmode="numeric" data-v="${k}"></td>`).join('') + `<td class="num sk-out"></td>`) + `</tr>`; }).join('')
        : `<tr><td colspan="7" class="empty">품목관리에 굿즈로 분류된 상품이 없습니다.</td></tr>`)
      + `</tbody></table></div><input id="skMemo" class="sk-memo" placeholder="메모 (선택 · 적은 모든 줄에 같이 남음)" data-ime="ko">`; }
  function openMv(t, loc){ if(!opsKey()){ toast('로그인해야 기록할 수 있습니다.'); return; } mvKind=t; mvLoc=loc||'wh'; const m=modal(); m.querySelector('#skErr').textContent=''; m.querySelector('#skOk').disabled=false; m.querySelector('#skOk').textContent='기록하기'; paint(); m.hidden=false; }
  const inCycle = (c, day) => !!day && !!c.next && day >= addDays(c.next, -7);
  async function submit(){
    const m=modal(), err=m.querySelector('#skErr'), ok=m.querySelector('#skOk'), date=m.querySelector('#skDate').value || opsToday(), memo=m.querySelector('#skMemo').value.trim(), loc=mvLoc, cnt=mvKind==='count';
    err.textContent='';
    const L=[...m.querySelectorAll('tr[data-skid]')].map(tr=>({id:tr.dataset.skid, vals:[...tr.querySelectorAll('input[data-v]')].filter(i=>i.value!=='').map(i=>({k:i.dataset.v, n:Math.round(+i.value)})), why:(tr.querySelector('.sk-whyin')||{}).value||''})).filter(x=>x.vals.length);
    if(!L.length){ err.textContent = cnt ? '센 수를 하나 이상 적어 주세요 (같으면 「예상과 같음」).' : '수를 하나 이상 적어 주세요.'; return; }
    if(L.some(x=>x.vals.some(v=>!(v.n>=0) || (!cnt && !(v.n>0))))){ err.textContent='수량은 숫자로 적어 주세요 (기록은 1 이상).'; return; }
    ok.disabled=true; ok.textContent='기록하는 중…';
    try{ await pull(); let changed=0, n=0;
      for(const x of L){ let row=rows.find(y=>y.r && y.r.id===x.id);
        if(!row){ const v0=items().find(y=>y.vid===x.id); if(!v0) continue;   // 아직 재고 줄이 없는 굿즈 → 처음 기록할 때 줄을 만듦
          if(cnt && x.vals[0].n===0) continue; row=await saveItem({r:{}, d:{...v0.d}, log:[]}, ()=>null, ''); x.id=row.r.id; }
        if(cnt){ const v=x.vals[0].n, before=balNow(row, loc); if(v===before) continue; changed++;
          await saveItem(row, ()=>({t:'count', loc, n:v, date, memo:[x.why.trim(), memo].filter(Boolean).join(' · ')}), `${LOC[loc]} 재고조사 = ${v} (예상 ${before})`); continue; }
        for(const v of x.vals){ n++; await saveItem(rows.find(y=>y.r && y.r.id===x.id), ()=>({t:v.k, loc, n:v.n, date, memo}), `${LOC[loc]} ${TYPE_L[v.k]} ${v.n}`); } }
      if(cnt){ const c=cfg(), done={...(c.done||{}), [loc]:{date, by:user.name||''}}, other=done[loc==='wh'?'shop':'wh'], both=!!c.next && inCycle(c, date) && !!other && inCycle(c, other.date);
        await saveCfg(both ? {done, last:date, next:addDays(date>opsToday()?date:opsToday(), c.cycle||CYCLE)} : {done}, `${LOC[loc]} 재고조사 ${date} · ${L.length}개 · 다른 품목 ${changed}개${both?' · 두 곳 모두 끝':''}`);
        month=date.slice(0,7); m.hidden=true; render(); toast(`${LOC[loc]} 재고조사를 기록했습니다 · ${L.length}개 중 예상과 다른 품목 ${changed}개${both?` · 붕정 · 차방 모두 끝 — 다음 조사 ${opsDateLabel(cfg().next)}`:''}`, 4500); return; }
      month=date.slice(0,7); m.hidden=true; render(); toast(`${LOC[loc]} 기록 ${n}건을 남겼습니다.`);
    }catch(e){ err.textContent='기록하지 못했습니다: '+(e.code||e.message); }
    finally{ ok.disabled=false; ok.textContent='기록하기'; }
  }

  // ---------- 엑셀 불러오기 (2026 굿즈 재고조사 파일 모양) ----------
  //  머리줄: NO · 상품명 · 색상 · 사이즈 · 제품 원가 · 판매 단가 · 기초 붕정재고 · 입고 · 온라인 · 자체소진 · 선물/접대 · 출고 합계 · 기말 붕정재고 · 실사 · 기초 차방재고 · 입고 · F&B · 오프라인 · 출고 합계 · 기말 차방재고 · 실사 · … · 재고 차이 사유
  //  넣는 것: 품목(이름 · 색상 · 사이즈 · 원가 · 단가 · NO) + 그달 말 재고 = 실사 수량(비었으면 기말)을 「엑셀 재고」(open)로. 같은 품목(이름 · 색상 · 사이즈)이 있으면 고쳐 씀
  function parseXl(wb){
    const ws=wb.Sheets[wb.SheetNames[0]], A=XLSX.utils.sheet_to_json(ws,{header:1, defval:'', raw:false}), S=v=>String(v||'').replace(/\s/g,'');
    const hi=A.findIndex(r=>r.some(c=>S(c)==='상품명')); if(hi<0) throw new Error('「상품명」 머리줄을 찾지 못했습니다.');
    const H=A[hi].map(S), col=re=>H.findIndex(h=>re.test(h)), cWh=col(/^기초붕정/), cSh=col(/^기초차방/);
    if(cWh<0 || cSh<0) throw new Error('「기초 붕정재고」 · 「기초 차방재고」 칸을 찾지 못했습니다.');
    const C={no:col(/^NO$/i), name:col(/^상품명/), color:col(/^색상/), size:col(/^사이즈/), cost:col(/원가/), price:col(/판매단가/), why:col(/차이사유/)};
    const flat=A.slice(0, hi).flat().map(String).join(' '), base=(flat.match(/기준일\s*[:：]?\s*(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)||[]);
    const mg={}; for(const m of flat.matchAll(/(붕정|차방)\S*\s*수불현황\s*\[\s*재고담당자\s*[:：]\s*([^\]]+)\]/g)) mg[m[1]==='붕정'?'wh':'shop']=m[2].trim();
    const out=[]; A.slice(hi+2).forEach(r=>{ const name=String(r[C.name]||'').trim(); if(!name || /^<</.test(name)) return;
      const wEnd=num(r[cWh+6]), wReal=num(r[cWh+7]), sEnd=num(r[cSh+5]), sReal=num(r[cSh+6]);
      out.push({no:String(r[C.no]||'').trim(), name, color:String(r[C.color]||'').trim(), size:String(r[C.size]||'').trim(), cost:String(r[C.cost]||'').trim(), price:String(r[C.price]||'').trim(),
        wh: wReal!=null ? wReal : (wEnd!=null ? wEnd : 0), shop: sReal!=null ? sReal : (sEnd!=null ? sEnd : 0), why:C.why>=0 ? String(r[C.why]||'').trim() : ''}); });
    return {rows:out, base: base[1] ? `${base[1]}-${base[2].padStart(2,'0')}-${base[3].padStart(2,'0')}` : '', mgr:mg};
  }
  async function openXl(file){
    if(!opsKey()){ toast('로그인해야 넣을 수 있습니다.'); return; }
    try{ await loadXLSX(); xlData=parseXl(XLSX.read(await file.arrayBuffer(), {type:'array'})); }catch(e){ toast('엑셀을 읽지 못했습니다: '+(e.message||e), 4000); return; }
    if(!xlData.rows.length){ toast('엑셀에서 품목을 찾지 못했습니다.'); return; }
    const b=xlData.base || opsToday(), bd=new Date(b+'T00:00'), prev = bd.getDate()<=10 ? opsYmd(new Date(bd.getFullYear(), bd.getMonth(), 0)) : b;   // 11/2 기준 = 10월 말 재고
    const m=modal(); mvKind='xl'; m.querySelector('#skTitle').textContent='엑셀 불러오기'; m.querySelector('#skErr').textContent=''; m.querySelector('#skOk').disabled=false; m.querySelector('#skOk').textContent='넣기';
    m.querySelector('#skBody').innerHTML = `<p>품목 <b>${xlData.rows.length}개</b>${xlData.base?` · 기준일 ${esc(xlData.base)}`:''}${xlData.mgr.wh?` · 붕정 담당 ${esc(xlData.mgr.wh)}`:''}${xlData.mgr.shop?` · 차방 담당 ${esc(xlData.mgr.shop)}`:''}</p>`
      + ``
      + `<label class="sk-f">이 재고의 날짜 (그달 말) <input type="date" id="skXlDate" value="${prev}"></label>`
      + `<div class="tw sk-tw"><table class="tbl sk-ct"><thead><tr><th>NO</th><th>품목</th><th class="num">붕정</th><th class="num">차방</th></tr></thead><tbody>${xlData.rows.map(r=>`<tr><td>${esc(r.no)}</td><td>${esc(label(r))}</td><td class="num">${won(r.wh)}</td><td class="num">${won(r.shop)}</td></tr>`).join('')}</tbody></table></div>`;
    m.hidden=false; }
  async function doXl(){
    const m=modal(), ok=m.querySelector('#skOk'), err=m.querySelector('#skErr'), date=m.querySelector('#skXlDate').value; if(!date){ err.textContent='날짜를 골라 주세요.'; return; }
    ok.disabled=true; err.textContent=''; let n=0;
    try{ await pull();
      for(const r of xlData.rows){ ok.textContent=`넣는 중 ${n}/${xlData.rows.length}…`; const k=keyOf(r), have=stockRows().find(x=>(x.d.key||keyOf(x.d))===k);
        const row=await saveItem(have || {r:{}, d:{}, log:[]}, d=>{ Object.assign(d, {no:r.no, name:r.name, color:r.color, size:r.size, cost:r.cost, price:r.price}); return null; }, '');
        const r2=await saveItem(row, ()=>({t:'open', loc:'wh', n:r.wh, date, memo:'엑셀 불러오기'+(r.why?` · ${r.why}`:'')}), `엑셀 재고 붕정 = ${r.wh}`);
        await saveItem(r2, ()=>({t:'open', loc:'shop', n:r.shop, date, memo:'엑셀 불러오기'}), `엑셀 재고 차방 = ${r.shop}`); n++; }
      await saveCfg({mgr:{...(cfg().mgr||{}), ...xlData.mgr}, base:date}, `엑셀 불러오기 ${date} · ${n}개`);
      month=date.slice(0,7); mvKind=''; m.hidden=true; render(); toast(`엑셀에서 ${n}개 품목을 넣었습니다 (${opsDateLabel(date)} 재고).`, 4000);
    }catch(e){ err.textContent=`넣다가 멈췄습니다 (${n}개 넣음 · 다시 눌러도 됨): `+(e.code||e.message); }
    finally{ ok.disabled=false; ok.textContent='넣기'; }
  }
  // ---------- 이 달 엑셀로 내려받기 ----------
  async function exportXl(){
    try{ await loadXLSX(); }catch(_){ toast('엑셀 도구를 불러오지 못했습니다.'); return; }
    const mg=cfg().mgr||{}, H1=['NO','상품명','색상','사이즈','제품 원가(원) 부가세 별도','판매 단가(원) 부가세 별도','기초 붕정재고','입고 수량','온라인 판매','자체소진','선물/접대(본사비용청구)','출고량 합계','기말 붕정재고','실사 수량','기초 차방재고','입고 수량','F&B 음료제조','오프라인 판매','출고량 합계','기말 차방재고','실사 수량','총 기말 재고량','총 실사수량 합계','장부상 재고차이','재고 차이 사유'];
    const aoa=[[`${month.slice(0,4)}년 ${+month.slice(5)}월 굿즈 수불현황 · 붕정 재고담당 ${mg.wh||''} · 차방 재고담당 ${mg.shop||''} · 내려받은 날 ${opsToday()}`], H1];
    items().forEach((x,i)=>{ const a=ledger(x,'wh',month), b=ledger(x,'shop',month), d=x.d, end=a.end+b.end, has=a.count!=null || b.count!=null, real=(a.count??a.end)+(b.count??b.end);
      aoa.push([d.no||i+1, d.name, d.color||'', d.size||'', num(d.cost)??(d.cost||''), num(d.price)??'', a.open, a.in, a.out.online, a.out.self, a.out.gift, a.outSum, a.end, a.count??'', b.open, b.in, b.out.fnb, b.out.offline, b.outSum, b.end, b.count??'', end, has?real:'', has?real-end:'', [a.reason,b.reason].filter(Boolean).join(' · ')]); });
    const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(aoa); XLSX.utils.book_append_sheet(wb, ws, `${+month.slice(5)}월`);
    XLSX.writeFile(wb, `굿즈 재고 수불현황_${month}.xlsx`); }

  // ---------- 누르기 ----------
  document.addEventListener('click', async e=>{
    const a=e.target.closest('[data-skmv]'); if(a){ openMv(a.dataset.skmv, a.dataset.loc); return; }
    const v=e.target.closest('[data-skview]'); if(v){ view=v.dataset.skview; render(); return; }
    const sr=e.target.closest('[data-skrow]'); if(sr){ const k=sr.dataset.skrow; skOpen.has(k) ? skOpen.delete(k) : skOpen.add(k); render(); return; }   // 품목별 보기: 줄을 누르면 펼치기 · 접기
    const sf=e.target.closest('[data-skf]'); if(sf){ skF=sf.dataset.skf; render(); return; }
    const sa=e.target.closest('[data-skall]'); if(sa){ if(sa.dataset.skall==='close') skOpen.clear(); else document.querySelectorAll('[data-skrow]').forEach(x=>skOpen.add(x.dataset.skrow)); render(); return; }
    if(e.target.id==='skXlOut'){ exportXl(); return; }
    const ag=e.target.closest('[data-skaddg]'); if(ag){ const g=opsGoodsCache.find(x=>x.name===ag.dataset.skaddg); if(!g) return; ag.disabled=true;
      try{ await saveItem({r:{}, d:{}, log:[]}, d=>{ Object.assign(d, {name:g.name, price:g.price!=null?String(Math.round(g.price/1.1)):'', no:String(items().length+1)}); return null; }, ''); render(); toast(`「${g.name}」을 재고 목록에 넣었습니다.`); }catch(err){ ag.disabled=false; toast('넣지 못했습니다: '+(err.code||err.message)); } return; }
    if(e.target.id==='skFirstOk'){ const d=$('#skFirst').value; if(!d) return; try{ await saveCfg({next:d}, `첫 조사일 ${d}`); render(); }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); } return; }
    if(e.target.id==='skNextEdit'){ const d=$('#skNext').value; if(!d || d===cfg().next){ toast('위 칸에서 날짜를 먼저 고르세요.'); return; } try{ await saveCfg({next:d}, `다음 조사일 ${d}`); render(); toast(`다음 정기 재고조사: ${opsDateLabel(d)}`); }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); } return; }
  });
  document.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.matches && e.target.matches('[data-skrow]')){ e.preventDefault(); e.target.click(); } });
  document.addEventListener('change', e=>{
    if(e.target.id==='skMonth'){ month=e.target.value; render(); }
    if(e.target.id==='skType'){ histType=e.target.value; render(); }
    if(e.target.id==='skPrice'){ showPrice=e.target.checked; render(); }
    if(e.target.id==='skXl'){ const f=e.target.files[0]; e.target.value=''; if(f) openXl(f); } });
  opsLoadGoods().then(()=>render());
})();
