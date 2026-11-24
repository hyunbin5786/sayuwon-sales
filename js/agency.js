// ===== 예약보조 › 고객 응대 보조 › 협업 여행사 할인 현황 (agency.html · 2026-11-24) =====
// ① 표 = 구분 · 여행사 · 소재지 · 할인율 · 비고 · 찾는 이름(다른 이름 · 쉼표) — 칸을 눌러 바로 고치기 · ＋ 추가 · × 삭제 (js/stable.js)
// ② 집계기록 = 기간(분기 · 반기)마다 방문기록 엑셀을 넣으면 줄마다 여행사 이름을 찾아 여행사별 예약 건수 · 방문 명수 · 인원 비중 · 매출액 · 매출 비중
//    비중 = 여행사끼리 나눈 몫 (합계가 꼭 100.0% · 남는 자리는 큰 나머지부터) — 어느 여행사가 모객을 더 잘하는지 비교
//    엑셀 칸은 자동으로 고르고(여행사를 찾을 칸: 성명 · 예약자 · 단체 · 업체 · 비고 등 / 인원: 어른 + 학생 또는 인원 / 매출: 결제금액 · 금액 등) 미리 보기에서 바꿀 수 있음
//    한 칸에 여러 줄(상품마다)이 있으면: 인원은 가장 큰 줄(같은 사람이 여러 상품) · 금액은 모두 더함
//    끝난 기간의 기록이 없으면 첫 화면 공통 업무에 「협업 여행사 집계기록 넣기」 (opslib.js opsAggDue)
// 저장: 공유 기록 한 줄 id agencydb · 통화 구분 「협업여행사」 {rows, cycle, records:[{id, label, from, to, file, at, by, tot:{rows, n, amt}, items:[{name, rows, n, amt, pn, pa}], miss}], log}
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2800) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  let askFn=null; const ask=(html, fn, yes='삭제')=>{ $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; };
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; }; $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  const won = n => Math.round(+n||0).toLocaleString('ko-KR');
  const N='2026\n신규 선정', K='2026\n선정 유지', D='관람 15% 할인, 사담 10% 할인, 티하우스 15% 할인';
  const R = (id, cat, name, area, rate, note) => ({id, cat, name, area, rate, note, alias:''});
  const SEED = [
    R('a01',N,'알레','경기도 성남','관람 10% 할인, 사담 10% 할인','1년간 한시적 운영'), R('a02',N,'모키드여행사','대구 달서구',D,'-'), R('a03',N,'낯선트래킹','경남 김해','관람 10% 할인, 사담 10% 할인','1년간 한시적 운영'),
    R('a04',N,'아트프렌즈','서울 서초구',D,'-'), R('a05',N,'이철구여행사','서울 서초구',D,'-'), R('a06',N,'로망스투어','서울 구로구',D,'-'), R('a07',N,'공감컨설팅','대구 달서구',D,'-'), R('a08',N,'여필남','부산 기장',D,'-'),
    R('a09',K,'해밀/감동여행사','서울 종로/중구',D,'-'), R('a10',K,'아너드','서울 성동구',D,'-'), R('a11',K,'여행그룹 명인','서울 강남구',D,'-'), R('a12',K,'리산애감성여행','성남 분당구',D,'-'),
    R('a13',K,'명인방투어','서울 강남구',D,'-'), R('a14',K,'연두의 여행이야기','울산 남구',D,'-'),
  ];
  const COLS = [{k:'cat',l:'구분',cls:'nw'},{k:'name',l:'여행사',cls:'nm'},{k:'area',l:'소재지',cls:'nw'},{k:'rate',l:'할인율',cls:'wide'},{k:'note',l:'비고'},{k:'alias',l:'찾는 이름',cls:'code'}];
  const T = syTable({ id:'agencydb', type:'협업여행사', cols:COLS, seed:SEED, nameKey:'name', focusKey:'name', toast, ask, blank:{cat:'2026\n신규 선정'},
    el:{table:'#tbl', add:'#addBtn', q:'#q', st:'#st', sum:'#sum', log:'#log'}, onData:paintRecords });

  // ---------- 집계기록 ----------
  const ns = s => String(s||'').replace(/[\s()·.,\-_/]/g,'').toLowerCase();
  // 여행사마다 찾을 이름: 여행사(「/」로 나뉜 것 각각) + 찾는 이름(쉼표) — 긴 것부터 맞춤
  const aliasesOf = r => [...String(r.name||'').split('/'), ...String(r.alias||'').split(/[,，\n]/)].map(ns).filter(s=>s.length>=2);
  // 비중: 합계가 꼭 100.0 이 되게 (0.1% 단위 · 큰 나머지부터 0.1 씩)
  function shares(vals){ const tot=vals.reduce((a,b)=>a+b,0); if(!tot) return vals.map(()=>0);
    const raw=vals.map(v=>v/tot*1000), fl=raw.map(Math.floor); let left=1000-fl.reduce((a,b)=>a+b,0);
    raw.map((v,i)=>[v-fl[i], i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{ if(left>0){ fl[i]++; left--; } });
    return fl.map(v=>v/10); }
  function paintRecords(data){
    $('#cycle').value=String(data.cycle||6);
    const due=opsAggDue(data, opsToday()); $('#aggDue').innerHTML = due ? `<b style="color:#b5442c">「${esc(due.label)}」(${esc(opsDateLabel(due.from))} ~ ${esc(opsDateLabel(due.to))}) 집계기록을 넣어 주세요</b> — 첫 화면 공통 업무에도 떠 있음` : '끝난 기간의 집계기록이 모두 있습니다';
    const recs=(data.records||[]).slice().sort((a,b)=>String(b.to).localeCompare(String(a.to)) || String(b.at).localeCompare(String(a.at)));
    $('#records').innerHTML = recs.length ? recs.map(r=>{ const maxPn=Math.max(...r.items.map(x=>x.pn),1), maxPa=Math.max(...r.items.map(x=>x.pa),1);
      return `<div class="ag-rec"><h3>${esc(r.label)} <small>${esc(opsDateLabel(r.from))} ~ ${esc(opsDateLabel(r.to))} · ${esc(r.file||'')} · ${esc(r.by||'')} ${esc(new Date(r.at).toLocaleDateString('ko-KR'))} 넣음${r.miss?` · 여행사를 못 찾은 줄 ${won(r.miss)}`:''}</small><span class="sp"></span><button type="button" class="btn sm" data-recdel="${esc(r.id)}">이 집계 삭제</button></h3>`
        + `<table class="ag-st"><thead><tr><th>순위</th><th>여행사</th><th class="num">예약 건수</th><th class="num">방문 명수</th><th>인원 비중</th><th class="num">매출액</th><th>매출 비중</th></tr></thead><tbody>`
        + r.items.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${won(x.rows)}</td><td class="num">${won(x.n)}명</td><td class="num">${x.pn.toFixed(1)}%<span class="ag-bar" style="width:${Math.round(x.pn/maxPn*80)}px"></span></td><td class="num">${won(x.amt)}원</td><td class="num">${x.pa.toFixed(1)}%<span class="ag-bar amt" style="width:${Math.round(x.pa/maxPa*80)}px"></span></td></tr>`).join('')
        + `</tbody><tfoot><tr><td></td><td>합계</td><td class="num">${won(r.tot.rows)}</td><td class="num">${won(r.tot.n)}명</td><td class="num">100.0%</td><td class="num">${won(r.tot.amt)}원</td><td class="num">100.0%</td></tr></tfoot></table></div>`; }).join('')
      : '<p class="hint">아직 집계기록이 없습니다. 기간이 끝나면 그 기간의 방문기록 엑셀을 「방문기록 엑셀로 집계하기」로 넣어 주세요.</p>';
  }
  $('#cycle').addEventListener('change', e=>{ const c=+e.target.value; T.change(d=>{ d.cycle=c; return d; }, `집계 주기 ${c===3?'분기':'반기'}`); });
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-recdel]'); if(!b) return; const r=(T.data().records||[]).find(x=>x.id===b.dataset.recdel); if(!r) return;
    ask(`「<b>${esc(r.label)}</b>」 집계기록을 삭제할까요?`, ()=>T.change(d=>{ d.records=(d.records||[]).filter(x=>x.id!==r.id); return d; }, `집계 삭제: ${r.label}`)); });

  // ---------- 방문기록 엑셀 → 집계 ----------
  let X=null;   // {file, head:[칸 이름], rows:[[…]], textCols:Set, pplCols:Set, amtCols:Set, label}
  const NUMS = v => (String(v??'').match(/-?\d[\d,]*(\.\d+)?/g)||[]).map(s=>+s.replace(/,/g,''));
  const cellLines = v => String(v??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  function readSheet(wb){
    const ws=wb.Sheets[wb.SheetNames[0]], A=XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
    const KW=/(성명|이름|예약자|단체|업체|여행사|고객|인원|어른|학생|금액|결제|매출|비고|메모|할인|상품|프로그램|연락처)/;
    let hi=-1, best=0; A.slice(0, 20).forEach((r,i)=>{ const n=r.filter(c=>KW.test(String(c))).length; if(n>best){ best=n; hi=i; } });
    if(hi<0 || best<2) throw new Error('머리줄(성명 · 인원 · 금액 등)을 찾지 못했습니다.');
    // 합친 칸(어른 · 학생처럼 두 줄 머리) — 아랫줄이 글자뿐이면 「윗칸·아랫칸」 이름
    let top=A[hi].map(c=>String(c).replace(/\s+/g,'')), sub=A[hi+1]||[], subHead=sub.filter(c=>String(c).trim() && !/^\d/.test(String(c).trim())).length>=2 && sub.filter(c=>/^\d/.test(String(c).trim())).length===0;
    for(let i=1;i<top.length;i++) if(!top[i] && subHead && String(sub[i]||'').trim()) top[i]=top[i-1];
    const head=top.map((h,i)=>subHead && String(sub[i]||'').trim() && String(sub[i]).trim()!==h ? `${h}·${String(sub[i]).replace(/\s+/g,'')}` : h);
    const rows=A.slice(hi+(subHead?2:1)).filter(r=>r.some(c=>String(c).trim()));
    // 날짜 (기간 고르기 도움): 칸 중 날짜 모양
    const dates=[]; rows.forEach(r=>r.forEach(c=>{ const m=String(c).match(/(20\d{2})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/); if(m) dates.push(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`); }));
    return {head, rows, dates:dates.sort()};
  }
  function autoCols(head){ const t=new Set(), p=new Set(), a=new Set();
    head.forEach((h,i)=>{ if(/(성명|이름|예약자|단체|업체|여행사|고객명|비고|메모|할인)/.test(h) && !/(금액|인원)/.test(h)) t.add(i); });
    const ad=head.findIndex(h=>/어른/.test(h)), st=head.findIndex(h=>/학생/.test(h));
    if(ad>=0){ p.add(ad); if(st>=0) p.add(st); } else { const n=head.findIndex(h=>/(인원|명수|수량)/.test(h)); if(n>=0) p.add(n); }
    const am=[/실결제/, /결제금액/, /결제/, /매출/, /총액|합계금액/, /금액/].map(re=>head.findIndex(h=>re.test(h))).find(i=>i>=0); if(am!=null && am>=0) a.add(am);
    return {t, p, a}; }
  function compute(){ const agencies=T.data().rows.filter(r=>String(r.name||'').trim()).map(r=>({r, al:aliasesOf(r).sort((x,y)=>y.length-x.length)}));
    const by=new Map(agencies.map(x=>[x.r.id, {name:String(x.r.name).split('\n')[0], rows:0, n:0, amt:0}])); let miss=0;
    X.rows.forEach(row=>{ const text=ns([...X.textCols].map(i=>row[i]).join(' ')); if(!text) return;
      const hit=agencies.find(x=>x.al.some(a=>text.includes(a))); if(!hit){ miss++; return; }
      // 인원: 칸마다 줄별 수 → 줄마다 (어른 + 학생) 합의 가장 큰 값 (같은 사람이 여러 상품)
      const P=[...X.pplCols].map(i=>cellLines(row[i]).map(s=>NUMS(s)[0]||0)), L=Math.max(0, ...P.map(a=>a.length)); let n=0;
      for(let k=0;k<L;k++) n=Math.max(n, P.reduce((s,a)=>s+(a[k]||0),0)); if(!L) n=0;
      const amt=[...X.amtCols].reduce((s,i)=>s+NUMS(row[i]).reduce((a,b)=>a+b,0),0);
      const g=by.get(hit.r.id); g.rows++; g.n+=n; g.amt+=amt; });
    const items=[...by.values()].filter(g=>g.rows), pn=shares(items.map(g=>g.n)), pa=shares(items.map(g=>g.amt));
    items.forEach((g,i)=>{ g.pn=pn[i]; g.pa=pa[i]; }); items.sort((a,b)=>b.n-a.n || b.amt-a.amt);
    return {items, miss, tot:{rows:items.reduce((s,g)=>s+g.rows,0), n:items.reduce((s,g)=>s+g.n,0), amt:items.reduce((s,g)=>s+g.amt,0)}}; }
  function periodOpts(){ const c=T.data().cycle||6, out=[]; let d=opsToday(); for(let i=0;i<8;i++){ const p=opsAggPeriod(d, c); out.push(p); d=opsYmd(new Date(new Date(p.from+'T00:00').getTime()-864e5)); } return out; }
  function paintAgg(){ const res=compute(), P=periodOpts();
    const chips=(set, key)=>`<div class="chips">${X.head.map((h,i)=>h?`<label><input type="checkbox" data-col="${key}|${i}"${set.has(i)?' checked':''}>${esc(h)}</label>`:'').join('')}</div>`;
    $('#aggBody').innerHTML = `<p class="hint">📄 ${esc(X.file)} · ${won(X.rows.length)}줄${X.dates.length?` · 날짜 ${esc(X.dates[0])} ~ ${esc(X.dates[X.dates.length-1])}`:''}</p>`
      + `<div class="ag-map"><b>기간</b><select id="aggPeriod">${P.map(p=>`<option value="${esc(p.label)}"${p.label===X.label?' selected':''}>${esc(p.label)} (${p.from} ~ ${p.to})</option>`).join('')}</select>`
      + `<b>여행사를 찾을 칸</b>${chips(X.textCols,'t')}<b>인원 칸</b>${chips(X.pplCols,'p')}<b>매출 칸</b>${chips(X.amtCols,'a')}</div>`
      + `<table class="ag-st"><thead><tr><th>여행사</th><th class="num">예약 건수</th><th class="num">방문 명수</th><th class="num">인원 비중</th><th class="num">매출액</th><th class="num">매출 비중</th></tr></thead><tbody>`
      + (res.items.length ? res.items.map(g=>`<tr><td><b>${esc(g.name)}</b></td><td class="num">${won(g.rows)}</td><td class="num">${won(g.n)}명</td><td class="num">${g.pn.toFixed(1)}%</td><td class="num">${won(g.amt)}원</td><td class="num">${g.pa.toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="6" class="hint">찾은 여행사가 없습니다. 「여행사를 찾을 칸」을 확인하거나 표의 「찾는 이름」에 엑셀에 적힌 이름을 더해 주세요.</td></tr>')
      + `</tbody>${res.items.length?`<tfoot><tr><td>합계</td><td class="num">${won(res.tot.rows)}</td><td class="num">${won(res.tot.n)}명</td><td class="num">100.0%</td><td class="num">${won(res.tot.amt)}원</td><td class="num">100.0%</td></tr></tfoot>`:''}</table>`
      + `<p class="hint">여행사를 못 찾은 줄 ${won(res.miss)}개 (개인 예약 등 · 집계에 넣지 않음)</p>`;
    X.res=res; }
  $('#aggFile').addEventListener('change', async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ let wb; if(/\.(html?|xls)$/i.test(f.name)){ const txt=await f.text(); wb = /<table/i.test(txt) ? XLSX.read(txt, {type:'string'}) : XLSX.read(await f.arrayBuffer(), {type:'array'}); } else wb=XLSX.read(await f.arrayBuffer(), {type:'array'});
      const s=readSheet(wb), c=autoCols(s.head), due=opsAggDue(T.data(), opsToday());
      X={file:f.name, head:s.head, rows:s.rows, dates:s.dates, textCols:c.t, pplCols:c.p, amtCols:c.a, label: due ? due.label : opsAggPeriod(s.dates[0]||opsToday(), T.data().cycle||6).label};
      paintAgg(); $('#aggErr').textContent=''; $('#aggModal').hidden=false; }
    catch(err){ toast('엑셀을 읽지 못했습니다: '+(err.message||err), 4500); } });
  $('#aggBody').addEventListener('change', e=>{ const c=e.target.closest('[data-col]'); if(c){ const [k,i]=c.dataset.col.split('|'), set=k==='t'?X.textCols:k==='p'?X.pplCols:X.amtCols; c.checked ? set.add(+i) : set.delete(+i); paintAgg(); return; }
    if(e.target.id==='aggPeriod'){ X.label=e.target.value; } });
  $('#aggNo').onclick=()=>{ $('#aggModal').hidden=true; X=null; };
  $('#aggOk').onclick=async()=>{ if(!X || !X.res) return; if(!X.res.items.length){ $('#aggErr').textContent='찾은 여행사가 없어 저장할 것이 없습니다.'; return; }
    const p=periodOpts().find(x=>x.label===X.label) || opsAggPeriod(opsToday(), T.data().cycle||6), have=(T.data().records||[]).some(r=>r.label===p.label);
    const go=async()=>{ const rec={id:'g'+Date.now().toString(36), label:p.label, from:p.from, to:p.to, file:X.file, at:new Date().toISOString(), by:user.name||'', tot:X.res.tot, items:X.res.items, miss:X.res.miss};
      if(await T.change(d=>{ d.records=[...(d.records||[]).filter(r=>r.label!==p.label), rec]; return d; }, `집계 ${p.label}`)){ $('#aggModal').hidden=true; X=null; toast(`「${p.label}」 집계를 저장했습니다.`); } };
    if(have) ask(`「<b>${esc(p.label)}</b>」 집계기록이 이미 있습니다. 이 엑셀 집계로 바꿀까요?`, go, '바꾸기'); else go(); };
})();
