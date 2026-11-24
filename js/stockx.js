// ===== 재고관리 (stock.html · 2026-11-24 새로) — js/opsboard.js 다음에 읽음 (renderStock 을 이 파일 것으로 바꿈) =====
// 품목 = 품목관리의 굿즈 전부 (「품목 추가」 버튼 없음 · opslib.js opsGoodsCache). 품목마다 수량 두 곳: 붕정(창고) · 차방(판매대)
// 움직임 (모두 기록 · 누가 · 언제 · 몇 개):
//   입고 = 붕정에 들어옴 (붕정 +) · 붕정에서 가져가기 = 붕정 − (차방으로 가져가면 차방 +, 행사 · 기타는 메모)
//   차방 판매 = 차방 − · 스마트스토어 판매 = 붕정 − (주문 메모) · 재고조사 = 세어 본 수로 맞춤 (차이를 기록)
// 정기 재고조사: 2주(14일)마다. 설정 줄(id stockcfg)의 next(다음 조사일) — 그날이 되면 이 화면 · 첫 화면 대시보드에 모두에게 알림 (js/portal.js)
//   재고조사를 기록하면 last = 오늘, next = 오늘 + 14일
// 저장: 공유 기록(calls) 통화 구분 「재고」 한 줄 = 품목 하나 {kind:'stock', d:{name, wh, shop, min}, log:[{at, by, what, mv:{t, n, dw, ds, to, memo, date}}]} (최근 400개)
//   예전 기록의 qty(수량 한 칸)는 붕정 수량으로 읽음
(function(){
  const CFG_ID='stockcfg', CYCLE=14;
  const nsK = s => String(s||'').replace(/\s/g,'');
  const isCfg = x => x.r?.id===CFG_ID || !!(x.d && x.d.cfg);
  const cfgRow = () => rows.find(isCfg);
  const cfg = () => ({cycle:CYCLE, ...((cfgRow()||{}).d||{})});
  const addDays = (ymd, n) => { const d=new Date(ymd+'T00:00'); d.setDate(d.getDate()+n); return opsYmd(d); };
  const qWh = d => d.wh!=null && d.wh!=='' ? +d.wh||0 : (+d.qty||0);
  const qShop = d => +d.shop||0;
  const MV = { in:{l:'입고', c:'in'}, out:{l:'붕정에서 가져가기', c:'out'}, shop:{l:'차방 판매', c:'shop'}, web:{l:'스마트스토어 판매', c:'web'}, count:{l:'재고조사', c:'count'}, min:{l:'최소 수량', c:'min'} };
  let histType='', histMonth='', view='stock';
  // 품목 목록 = 굿즈 + (굿즈에 없지만 예전에 넣은 품목)
  function items(){
    const left=new Map(rows.filter(x=>!isCfg(x) && x.d && x.d.name).map(x=>[nsK(x.d.name), x])), out=[];
    opsGoodsCache.forEach(g=>{ const k=nsK(g.name), x=left.get(k); left.delete(k); out.push({name:g.name, row:x||null}); });
    left.forEach(x=>out.push({name:x.d.name, row:x, extra:true}));
    return out;
  }
  const dOf = it => it.row ? {...it.row.d, name:it.name} : {name:it.name, wh:0, shop:0, unit:'개'};
  // 한 품목 저장 (최신을 받아 그 위에 · 여러 사람이 같이 써도 덮어쓰지 않게)
  async function saveItem(name, fn, what){
    const it=items().find(x=>nsK(x.name)===nsK(name)); if(!it) throw new Error('품목 없음: '+name);
    const d=dOf(it), mv=fn(d); if(mv===false) return;
    d.wh=String(qWh(d)); d.shop=String(qShop(d)); delete d.qty;
    const now=new Date().toISOString(), r=(it.row && it.row.r)||{}, log=[...((it.row && it.row.log)||[]), {at:now, by:user.name||'', what, mv}].slice(-400);
    const item={...r, id:r.id||opsId(), callType:OPS_TYPES.stock, saved:r.saved||now, takenBy:r.takenBy||user.name||'', owner:r.owner||'', summary:`${d.name} 붕정 ${d.wh} · 차방 ${d.shop}`.slice(0,120), history:JSON.stringify({kind:'stock', d, log})};
    delete item.date; delete item.org;
    await SY.call({action:'put', item});
    const nr={r:item, d, log}, i=rows.findIndex(x=>x.r && x.r.id===item.id); if(i>=0) rows[i]=nr; else rows.push(nr);
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
    const c=cfg(), t=opsToday();
    if(!c.next) return `<div class="sk-ban"><b>정기 재고조사 (2주마다)</b> 첫 조사 날짜를 정해 주세요 <input type="date" id="skFirst" value="${t}"><button type="button" class="btn primary" id="skFirstOk">정하기</button></div>`;
    const due=c.next<=t;
    return `<div class="sk-ban${due?' due':''}">${due?`<b>📋 정기 재고조사 날입니다</b> (예정 ${esc(opsDateLabel(c.next))}${c.next<t?' · 지남':''}) — 붕정 · 차방을 세어 기록해 주세요 <button type="button" class="btn primary" data-skmv="count">재고조사 시작</button>`
      : `<b>다음 정기 재고조사</b> ${esc(opsDateLabel(c.next))} <span class="hint">(2주마다${c.last?` · 마지막 ${esc(opsDateLabel(c.last))}`:''})</span>`}
      <span class="sk-next-ed"><input type="date" id="skNext" value="${esc(c.next)}" title="다음 조사 날짜를 바꾸려면 고른 뒤 「날짜 바꾸기」"><button type="button" class="btn sm" id="skNextEdit">날짜 바꾸기</button></span></div>`;
  }
  function stockTable(hit){
    const L=items().filter(it=>hit({...dOf(it), name:it.name}));
    const low=d=>d.min!=='' && d.min!=null && (qWh(d)+qShop(d))<=+d.min;
    const last=it=>{ const g=(it.row && it.row.log)||[]; const x=g[g.length-1]; return x ? `${opsDateLabel(opsYmd(x.at))} ${x.by||''} · ${x.what||''}` : ''; };
    return `<div class="tw"><table class="tbl sk-t"><thead><tr><th>품목</th><th class="num">붕정</th><th class="num">차방</th><th class="num">합계</th><th class="num">최소</th><th>마지막 변동</th></tr></thead><tbody>`
      + (L.length ? L.map(it=>{ const d=dOf(it), w=qWh(d), s=qShop(d);
          return `<tr class="${low(d)?'low':''}"><td><b>${esc(it.name)}</b>${it.extra?' <small class="hint">(굿즈 목록에 없음)</small>':''}</td><td class="num${w<0?' neg':''}">${won(w)}</td><td class="num${s<0?' neg':''}">${won(s)}</td><td class="num"><b>${won(w+s)}</b></td>`
            + `<td class="num"><button type="button" class="sk-min" data-skmin="${esc(it.name)}" title="이 수 아래면 빨강 (누르면 바꾸기)">${d.min!=='' && d.min!=null ? won(d.min) : '—'}</button></td><td class="hint">${esc(last(it))}</td></tr>`; }).join('')
        : `<tr><td colspan="6" class="empty">${opsGoodsCache.length ? '찾은 품목이 없습니다.' : '품목관리의 굿즈 목록을 불러오는 중…'}</td></tr>`)
      + `</tbody></table></div>`;
  }
  function allMoves(){ const out=[]; rows.filter(x=>!isCfg(x)).forEach(x=>((x.log)||[]).forEach(g=>{ if(g.mv && g.mv.t && g.mv.t!=='min') out.push({...g, name:x.d.name}); })); return out.sort((a,b)=>String(b.mv.date||b.at).localeCompare(String(a.mv.date||a.at)) || String(b.at).localeCompare(String(a.at))); }
  function histView(hit){
    const all=allMoves(), months=[...new Set(all.map(g=>String(g.mv.date||opsYmd(g.at)).slice(0,7)))].sort().reverse();
    if(!histMonth) histMonth=months[0]||opsToday().slice(0,7);
    const L=all.filter(g=>String(g.mv.date||opsYmd(g.at)).startsWith(histMonth) && (!histType || g.mv.t===histType) && hit({name:g.name, memo:g.mv.memo, by:g.by}));
    const sum=t=>{ const by={}; all.filter(g=>g.mv.t===t && String(g.mv.date||opsYmd(g.at)).startsWith(histMonth)).forEach(g=>{ by[g.name]=(by[g.name]||0)+(+g.mv.n||0); }); return Object.entries(by).sort((a,b)=>b[1]-a[1]); };
    const sumBox=(t, l)=>{ const s=sum(t), n=s.reduce((a,x)=>a+x[1],0); return `<div class="sk-sum"><b>${l} ${won(n)}개</b>${s.length?`<span>${s.map(([k,v])=>`${esc(k)} ${won(v)}`).join(' · ')}</span>`:'<span class="hint">없음</span>'}</div>`; };
    const dlt=v=>v ? `<span class="${v>0?'up':'down'}">${v>0?'+':''}${won(v)}</span>` : '';
    return `<div class="sk-hf"><select id="skMonth">${(months.includes(histMonth)?months:[histMonth, ...months]).map(m=>`<option value="${m}"${m===histMonth?' selected':''}>${m.slice(0,4)}년 ${+m.slice(5)}월</option>`).join('')}</select>`
      + `<select id="skType"><option value="">모든 기록</option>${['in','out','shop','web','count'].map(t=>`<option value="${t}"${t===histType?' selected':''}>${MV[t].l}</option>`).join('')}</select></div>`
      + `<div class="sk-sums">${sumBox('shop','차방 판매')}${sumBox('web','스마트스토어 판매')}${sumBox('out','붕정에서 가져감')}</div>`
      + `<div class="tw"><table class="tbl sk-h"><thead><tr><th>날짜</th><th>종류</th><th>품목</th><th class="num">수량</th><th class="num">붕정</th><th class="num">차방</th><th>누가</th><th>메모</th></tr></thead><tbody>`
      + (L.length ? L.map(g=>`<tr><td class="nw">${esc(opsDateLabel(g.mv.date||opsYmd(g.at)))}</td><td><span class="sk-tag t-${g.mv.t}">${esc((MV[g.mv.t]||{}).l||g.mv.t)}</span></td><td>${esc(g.name)}</td><td class="num">${g.mv.t==='count'?'':won(g.mv.n)}</td><td class="num">${dlt(g.mv.dw)}</td><td class="num">${dlt(g.mv.ds)}</td><td>${esc(g.by||'')}</td><td class="hint">${esc([g.mv.to, g.mv.memo].filter(Boolean).join(' · '))}</td></tr>`).join('')
        : `<tr><td colspan="8" class="empty">이 달에 기록이 없습니다.</td></tr>`) + `</tbody></table></div>`;
  }
  renderStock = function(hit){
    $('#addBtn').hidden=true;   // 품목 추가 없음 (품목 = 품목관리의 굿즈)
    $('#bSum').textContent='품목 = 품목관리의 굿즈 · 붕정(창고) · 차방 수량';
    $('#filters').innerHTML = banner() + `<div class="sk-acts">${['in','out','shop','web','count'].map(t=>`<button type="button" class="btn ${t==='count'?'':'primary'} sk-a-${t}" data-skmv="${t}">${MV[t].l}</button>`).join('')}</div>`
      + `<div class="seg sk-tabs"><button type="button" class="${view==='stock'?'on':''}" data-skview="stock">재고 현황</button><button type="button" class="${view==='hist'?'on':''}" data-skview="hist">기록 · 판매</button></div>`;
    $('#list').innerHTML = view==='hist' ? histView(hit) : stockTable(hit);
  };
  // ---------- 움직임 기록 창 ----------
  let mvKind='', mvLines=[];
  function modal(){ let m=document.getElementById('skModal'); if(m) return m;
    m=document.createElement('div'); m.className='modal'; m.id='skModal'; m.hidden=true; m.innerHTML='<section class="panel edit-box sk-box" role="dialog" aria-modal="true"><h2 id="skTitle"></h2><div id="skBody"></div><p class="err" id="skErr"></p><div class="row-btns"><span class="sp"></span><button type="button" class="btn" id="skNo">취소</button><button type="button" class="btn primary" id="skOk">기록하기</button></div></section>';
    document.body.appendChild(m);
    m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; });
    m.querySelector('#skNo').onclick=()=>{ m.hidden=true; };
    m.querySelector('#skOk').onclick=()=>submit();
    m.addEventListener('click', e=>{ const a=e.target.closest('[data-skadd]'); if(a){ readLines(); mvLines.push({name:'', n:''}); paintMv(); return; }
      const x=e.target.closest('[data-skx]'); if(x){ readLines(); mvLines.splice(+x.dataset.skx,1); if(!mvLines.length) mvLines.push({name:'', n:''}); paintMv(); } });
    m.addEventListener('change', e=>{ if(e.target.id==='skTo') m.querySelector('#skToMemo').hidden = e.target.value==='차방'; });
    return m; }
  const goodsOpts = sel => `<option value="">품목 고르기</option>` + items().map(it=>`<option${it.name===sel?' selected':''}>${esc(it.name)}</option>`).join('');
  function readLines(){ const m=modal(); mvLines=[...m.querySelectorAll('.sk-line')].map(l=>({name:l.querySelector('select').value, n:l.querySelector('input').value})); }
  function paintMv(){ const m=modal(), t=mvKind, today=opsToday();
    if(t==='count'){ paintCount(); return; }
    const where = t==='in' ? '붕정(창고)에 들어온 물건' : t==='out' ? '붕정에서 가져가는 물건' : t==='shop' ? '차방에서 팔린 물건' : '스마트스토어로 팔린 물건 (붕정에서 보냄)';
    m.querySelector('#skBody').innerHTML = `<p class="hint">${where} · 여러 품목을 한 번에</p><label class="sk-f">날짜 <input type="date" id="skDate" value="${today}"></label>`
      + (t==='out' ? `<label class="sk-f">어디로 <select id="skTo"><option>차방</option><option>행사 · 증정</option><option>기타</option></select></label><input id="skToMemo" class="sk-memo" placeholder="어디에 쓰는지 (예: ○○ 단체 증정)" data-ime="ko" hidden>` : '')
      + `<div class="sk-lines">${mvLines.map((l,i)=>`<div class="sk-line"><select>${goodsOpts(l.name)}</select><input type="number" min="1" step="1" inputmode="numeric" placeholder="수량" value="${esc(l.n)}"><button type="button" class="btn sm" data-skx="${i}" title="이 줄 빼기">×</button></div>`).join('')}</div>`
      + `<button type="button" class="btn sm sk-addline" data-skadd>＋ 품목 한 줄 더</button>`
      + `<input id="skMemo" class="sk-memo" placeholder="${t==='web'?'주문번호 · 수취인 (선택)':'메모 (선택)'}" data-ime="ko">`; }
  function paintCount(){ const m=modal(), L=items();
    m.querySelector('#skBody').innerHTML = `<p class="hint">붕정 · 차방에서 실제로 센 수를 적어 주세요 (지금 시스템 수가 미리 들어 있음 · 다른 것만 고치면 됨)</p><label class="sk-f">조사일 <input type="date" id="skDate" value="${opsToday()}"></label>`
      + `<div class="tw"><table class="tbl sk-ct"><thead><tr><th>품목</th><th class="num">붕정</th><th class="num">차방</th></tr></thead><tbody>${L.map(it=>{ const d=dOf(it); return `<tr data-skc="${esc(it.name)}"><td>${esc(it.name)}</td><td class="num"><input type="number" step="1" inputmode="numeric" data-w value="${qWh(d)}" data-old="${qWh(d)}"></td><td class="num"><input type="number" step="1" inputmode="numeric" data-s value="${qShop(d)}" data-old="${qShop(d)}"></td></tr>`; }).join('')}</tbody></table></div>`
      + `<input id="skMemo" class="sk-memo" placeholder="메모 (선택)" data-ime="ko">`; }
  function openMv(t){ if(!opsKey()){ toast('로그인해야 기록할 수 있습니다.'); return; } mvKind=t; mvLines=[{name:'', n:''}]; const m=modal();
    m.querySelector('#skTitle').textContent = MV[t].l + (t==='count' ? ' (붕정 · 차방 세기)' : ''); m.querySelector('#skErr').textContent=''; m.querySelector('#skOk').disabled=false; paintMv(); m.hidden=false; }
  async function submit(){
    const m=modal(), err=m.querySelector('#skErr'), ok=m.querySelector('#skOk'), date=m.querySelector('#skDate').value || opsToday(), memo=(m.querySelector('#skMemo')||{}).value?.trim()||'';
    err.textContent='';
    try{
      if(mvKind==='count'){
        const ch=[...m.querySelectorAll('tr[data-skc]')].map(tr=>{ const w=tr.querySelector('[data-w]'), s=tr.querySelector('[data-s]'); return {name:tr.dataset.skc, w:+w.value||0, s:+s.value||0, ow:+w.dataset.old||0, os:+s.dataset.old||0}; }).filter(x=>x.w!==x.ow || x.s!==x.os);
        ok.disabled=true; ok.textContent='기록하는 중…'; await pull();
        for(const c of ch) await saveItem(c.name, d=>{ const dw=c.w-qWh(d), ds=c.s-qShop(d); d.wh=c.w; d.shop=c.s; return {t:'count', n:0, dw, ds, memo, date}; }, `재고조사 (붕정 ${c.w} · 차방 ${c.s})`);
        const cy=cfg().cycle||CYCLE; await saveCfg({last:date, next:addDays(date>opsToday()?date:opsToday(), cy)}, `재고조사 ${date} · 바뀐 품목 ${ch.length}개`);
        m.hidden=true; render(); toast(`재고조사를 기록했습니다 · 수가 바뀐 품목 ${ch.length}개 · 다음 조사 ${opsDateLabel(cfg().next)}`, 4000); return;
      }
      readLines(); const L=mvLines.filter(l=>l.name || l.n);
      if(!L.length){ err.textContent='품목과 수량을 넣어 주세요.'; return; }
      const bad=L.find(l=>!l.name || !(+l.n>0)); if(bad){ err.textContent='품목을 고르고 수량(1 이상)을 넣어 주세요.'; return; }
      const to=mvKind==='out' ? m.querySelector('#skTo').value : '', toMemo=mvKind==='out' && to!=='차방' ? (m.querySelector('#skToMemo').value.trim()) : '';
      ok.disabled=true; ok.textContent='기록하는 중…'; await pull();
      for(const l of L){ const n=Math.round(+l.n);
        await saveItem(l.name, d=>{ let dw=0, ds=0;
          if(mvKind==='in') dw=n; else if(mvKind==='out'){ dw=-n; if(to==='차방') ds=n; } else if(mvKind==='shop') ds=-n; else if(mvKind==='web') dw=-n;
          d.wh=qWh(d)+dw; d.shop=qShop(d)+ds; return {t:mvKind, n, dw, ds, to:to==='차방'?'차방으로':(to?[to, toMemo].filter(Boolean).join(' '):''), memo, date}; },
          `${MV[mvKind].l} ${n}${mvKind==='out'?` → ${to}`:''}`); }
      m.hidden=true; render(); toast(`${MV[mvKind].l} ${L.length}건을 기록했습니다.`);
    }catch(e){ err.textContent='기록하지 못했습니다: '+(e.code||e.message); }
    finally{ ok.disabled=false; ok.textContent='기록하기'; }
  }
  // ---------- 누르기 ----------
  document.addEventListener('click', async e=>{
    const a=e.target.closest('[data-skmv]'); if(a){ openMv(a.dataset.skmv); return; }
    const v=e.target.closest('[data-skview]'); if(v){ view=v.dataset.skview; render(); return; }
    if(e.target.id==='skFirstOk'){ const d=$('#skFirst').value; if(!d) return; try{ await saveCfg({next:d}, `첫 조사일 ${d}`); render(); toast(`정기 재고조사 첫 날짜를 ${opsDateLabel(d)}로 정했습니다 (그 뒤 2주마다).`); }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); } return; }
    if(e.target.id==='skNextEdit'){ const d=$('#skNext').value; if(!d){ toast('날짜를 골라 주세요.'); return; } if(d===cfg().next){ toast('같은 날짜입니다. 위 칸에서 날짜를 먼저 고르세요.'); return; }
      try{ await saveCfg({next:d}, `다음 조사일 ${d}`); render(); toast(`다음 정기 재고조사: ${opsDateLabel(d)}`); }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); } return; }
    // 최소 수량: 누르면 그 자리에 칸 → Enter 또는 다른 곳 누르면 저장
    const mn=e.target.closest('[data-skmin]'); if(mn){ const it=items().find(x=>x.name===mn.dataset.skmin), cur=it && it.row ? (it.row.d.min??'') : '';
      const inp=document.createElement('input'); inp.type='number'; inp.min='0'; inp.className='sk-minin'; inp.value=cur; inp.dataset.skminin=mn.dataset.skmin; inp.placeholder='없음'; mn.replaceWith(inp); inp.focus(); return; }
  });
  async function saveMin(inp){ if(inp.dataset.done) return; inp.dataset.done='1'; const name=inp.dataset.skminin, v=inp.value.trim()==='' ? '' : String(Math.max(0, Math.round(+inp.value)||0));
    try{ await saveItem(name, d=>{ if(String(d.min??'')===v) return false; d.min=v; return {t:'min', n:0, dw:0, ds:0}; }, `최소 수량 ${v||'없음'}`); }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
    render(); }
  document.addEventListener('keydown', e=>{ if(e.target.dataset && e.target.dataset.skminin!=null && e.key==='Enter'){ e.preventDefault(); saveMin(e.target); } if(e.target.dataset && e.target.dataset.skminin!=null && e.key==='Escape'){ e.target.dataset.done='1'; render(); } });
  document.addEventListener('focusout', e=>{ if(e.target.dataset && e.target.dataset.skminin!=null) saveMin(e.target); });
  document.addEventListener('change', e=>{ if(e.target.id==='skMonth'){ histMonth=e.target.value; render(); } if(e.target.id==='skType'){ histType=e.target.value; render(); } });
  opsLoadGoods().then(()=>render());   // 굿즈 목록 새로 받기
})();
