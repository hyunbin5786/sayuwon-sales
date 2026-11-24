// ===== 고객 응대 매뉴얼 (2026-11-24 · manual.html) =====
// 노션 「고객응대(주로 전화)」를 이 시스템으로 옮김. 내용은 서버 DB manual 표 (cloudflare/worker.js manualList · manualSave · manualDel · manualFilePut · manualFileGet)
// 한 줄(row) = {id, kind, cat, title, start, end, ord, data:{…}}  kind:
//   sec    장 안의 글 한 덩이 — cat = 장 키(CH) · data.body = 글 (아래 md() 모양: ## 제목 · - 목록 · 1. 번호 · **굵게** · | 표 | · ::: 색 상자 ::: · [글](주소))
//   prod   상품 — cat = 구분 · data {days 운영일, time 이용 시간, pWeek 평일, pEnd 주말·공휴일, cap 정원, deadline 예약 마감, caution 응대 주의사항, link 상세 링크, body 자세한 내용}
//   faq    응대 FAQ — title = 질문 · cat = 카테고리 · data {a 답변, boss 상급자 확인 필요, catAI 카테고리를 AI가 붙임, body}
//   proc   내부 업무 절차 — data {when 언제 쓰나, screen 사용 화면, owner 담당·보고, body 순서}
//   notice 올린 안내문 — data {files:[{id,name,mime}], memo, status:'정리 대기'|'제안 있음'|'반영됨'|'보류', props:[id]}
//   prop   안내문을 정리한 반영 제안 — data {noticeId, src:'AI'|'사람', status:'검토 대기'|'반영됨'|'보류', note, changes:[{op:'add'|'edit', kind, id(edit), row:{title,cat,start,end,data}}], doneAt, doneBy}
// start/end = 운영 · 판매 기간 (비면 늘). 기간이 지난 것은 「지난 것도 보기」를 켜면 보임 (찾기에는 늘 나오되 「지난」 표시 · 아래로)
// 고칠 때마다 data.hist 에 바로 앞 내용을 남김 (최근 30개 · 자세히 보기의 「고친 이력」에서 되돌리기)
// 찾기: 서버 · AI 없이 이 화면 안에서 — 낱말 · 문장 모두. 조사 떼기 · 비슷한 말(SYN) · 붙여 쓰기 무시 · 제목에 있으면 더 높게 · 가장 맞는 것 하나를 크게 + 나머지 목록
// 나중 과제 (README 35절): 멤버 권한 — 모두 고칠 수 있게 두었음. 관리자 검토 후 반영으로 바꿀 자리 = canApprove()
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc, user = SY.user() || {};
  const today = () => opsToday();
  let rows = [], loaded = false, view = location.hash.slice(1) || 'home', showPast = false, prodCat = '', faqCat = '', busy = false;
  let toastT; const toast = (m, ms=2800) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (t, c) => { const el=$('#st'); el.textContent=t; el.className='mn-st '+(c||''); };
  const canApprove = () => true;   // TODO(멤버 권한): 관리자만 「반영」 — README 35절
  if($('#me')) $('#me').textContent = user.name ? `${user.name} 님` : '';

  // ---------- 장 (목차) ----------
  // 장 = 글이 붙는 자리(sec 의 cat 키 · 저장된 값이라 바꾸지 않음). 화면 차례는 아래 PARTS 4묶음 (2026-11-24 재구성)
  const CH = [
    ['intro','처음 읽기'],['call','전화 받는 순서'],['dont','절대 하지 말 것'],['glance','한눈에 보기'],['prod','상품'],['faq','응대 FAQ'],
    ['rule','공통 규정'],['trans','교통 · 숙박'],['ticket','매표소 응대'],['proc','내부 업무 절차'],['link','자주 쓰는 링크'],
  ];
  const CH_NAME = Object.fromEntries(CH);
  // 차례: 1. 공통 규정(절대 하지 말 것 · 공통 규정 · 한눈에 보기) 2. 상품 3. 응대 FAQ(FAQ · 교통 · 숙박 · 전화 받는 순서 · 매표소 응대) 4. 내부 업무 절차(절차 · 자주 쓰는 링크) · 처음 읽기는 「전체 보기」 맨 위
  const PARTS = [['p1','1. 공통 규정',['dont','rule','glance']],['p2','2. 상품',['prod']],['p3','3. 응대 FAQ',['faq','trans','call','ticket']],['p4','4. 내부 업무 절차',['proc','link']]];
  const PART_NAME = Object.fromEntries(PARTS.map(p=>[p[0],p[1]]));
  const partOf = k => (PARTS.find(p=>p[2].includes(k))||[])[0] || '';
  const chLabel = k => partOf(k) ? `${PART_NAME[partOf(k)]} › ${CH_NAME[k]}` : CH_NAME[k]||k;
  const toView = h => !h || h==='home' ? 'home' : h==='notice' || PART_NAME[h] ? h : partOf(h) || 'home';   // 예전 주소(#prod · #intro …)도 그 묶음으로
  view = toView(view);
  const PROD_CATS = ['관람','관람+식사','체험 프로그램','카페·식당','대관'];

  // ---------- 서버 ----------
  async function load(quiet){
    if(!quiet) st('불러오는 중…','');
    try{ const j=await SY.call({action:'manualList'}); rows=(j.items||[]).map(r=>({...r, data: typeof r.data==='string' ? (()=>{ try{ return JSON.parse(r.data||'{}'); }catch(_){ return {}; } })() : (r.data||{})})); loaded=true; st('',''); buildIndex(); paint(); }
    catch(e){ st(e.code==='bad_action' ? '서버(Cloudflare)를 새 코드로 올려야 합니다' : e.code==='bad_key' ? SY.authFail() : '불러오지 못함','bad');
      if(!loaded) $('#main').innerHTML = `<div class="mn-empty"><p><b>매뉴얼을 불러오지 못했습니다.</b></p><p class="hint">${e.code==='bad_action' ? '서버(Cloudflare Worker)에 cloudflare/worker.js 새 코드를 붙여 넣어 주세요 (manual 표).' : esc(e.code||e.message)}</p></div>`; }
  }
  async function save(list, what){   // list: 고친 줄들 (전체 모양) · 40줄씩 나눠 보냄
    st('저장 중…','');
    try{ for(let i=0;i<list.length;i+=40) await SY.call({action:'manualSave', rows:list.slice(i,i+40).map(r=>({...r, data:JSON.stringify(r.data||{})}))});
      list.forEach(r=>{ const i=rows.findIndex(x=>x.id===r.id), nr={...r, updated:new Date().toISOString(), by:user.name||''}; if(i>=0) rows[i]=nr; else rows.push(nr); });
      st(`저장됨 ${new Date().toTimeString().slice(0,5)}${what?' · '+what:''}`,'ok'); buildIndex(); return true; }
    catch(e){ st('저장 못 함','bad'); toast(e.code==='bad_key' ? SY.authFail() : e.code==='bad_action' ? '서버(Cloudflare)를 새 코드로 올려야 저장됩니다.' : '저장하지 못했습니다: '+(e.code||e.message), 4500); return false; }
  }
  async function remove(ids, what){
    try{ await SY.call({action:'manualDel', ids}); rows=rows.filter(r=>!ids.includes(r.id)); buildIndex(); st('지움 · '+what,'ok'); return true; }
    catch(e){ toast('지우지 못했습니다: '+(e.code||e.message)); return false; }
  }
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const withHist = (old, next) => { const {hist, ...od}=old.data||{}; const h=[...(hist||[]), {at:new Date().toISOString(), by:user.name||'', title:old.title, cat:old.cat, start:old.start, end:old.end, data:od}].slice(-30); return {...next, data:{...next.data, hist:h}}; };

  // ---------- 기간 ----------
  const phase = r => { const t=today(); return r.end && r.end<t ? 'past' : r.start && r.start>t ? 'soon' : 'live'; };
  const md2 = d => d ? `${+d.slice(5,7)}/${+d.slice(8)}` : '';
  const perTag = r => { const p=phase(r); if(!r.start && !r.end) return '';
    return p==='past' ? `<span class="tag past">지난 · ${md2(r.end)} 끝</span>` : p==='soon' ? `<span class="tag soon">예정 · ${md2(r.start)}부터</span>` : `<span class="tag per">${r.start?md2(r.start):''}~${r.end?md2(r.end):''}</span>`; };
  const visible = r => showPast || phase(r)!=='past';
  const byKind = k => rows.filter(r=>r.kind===k).sort((a,b)=>(a.ord||0)-(b.ord||0) || String(a.title).localeCompare(String(b.title),'ko'));

  // ---------- 글 그리기 (작은 마크다운) ----------
  function inline(s){
    return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\[확인 필요\]/g,'<span class="chk">[확인 필요]</span>')
      .replace(/`([^`]+)`/g,'<code>$1</code>');
  }
  function md(src){
    const L=String(src||'').replace(/\r/g,'').split('\n'); let out='', i=0;
    const list = (re, tag) => { let h=`<${tag}>`; while(i<L.length && re.test(L[i])){ const ind=L[i].match(/^\s*/)[0].length, txt=L[i].replace(re,''); h+=`<li${ind>=2?' style="margin-left:'+Math.min(ind,8)*8+'px"':''}>${inline(txt)}</li>`; i++; } return h+`</${tag}>`; };
    while(i<L.length){ const l=L[i];
      if(/^\s*$/.test(l)){ i++; continue; }
      if(/^:::\s*(\w+)?/.test(l)){ const c=(l.match(/^:::\s*(\w+)/)||[])[1]||'gray'; const buf=[]; i++; while(i<L.length && !/^:::\s*$/.test(L[i])){ buf.push(L[i]); i++; } i++; out+=`<div class="call ${esc(c)}">${md(buf.join('\n'))}</div>`; continue; }
      const h=l.match(/^(#{1,4})\s+(.*)$/); if(h){ const n=Math.min(4, h[1].length+1); out+=`<h${n}>${inline(h[2])}</h${n}>`; i++; continue; }
      if(/^---+\s*$/.test(l)){ out+='<hr>'; i++; continue; }
      if(/^\s*\|/.test(l)){ const tr=[]; while(i<L.length && /^\s*\|/.test(L[i])){ tr.push(L[i]); i++; }
        const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()); const body=tr.filter(r=>!/^\s*\|?\s*:?-{2,}/.test(r));
        out+='<table>'+body.map((r,k)=>`<tr>${cells(r).map(c=>k===0&&tr.length>1&&/^\s*\|?\s*:?-{2,}/.test(tr[1]||'')?`<th>${inline(c).replace(/&lt;br\s*\/?&gt;/g,'<br>')}</th>`:`<td>${inline(c).replace(/&lt;br\s*\/?&gt;/g,'<br>')}</td>`).join('')}</tr>`).join('')+'</table>'; continue; }
      if(/^\s*[-*]\s+/.test(l)){ out+=list(/^\s*[-*]\s+/, 'ul'); continue; }
      if(/^\s*\d+[.)]\s+/.test(l)){ out+=list(/^\s*\d+[.)]\s+/, 'ol'); continue; }
      if(/^>\s?/.test(l)){ const buf=[]; while(i<L.length && /^>\s?/.test(L[i])){ buf.push(L[i].replace(/^>\s?/,'')); i++; } out+=`<div class="call gray">${md(buf.join('\n'))}</div>`; continue; }
      const buf=[]; while(i<L.length && !/^\s*$/.test(L[i]) && !/^(#{1,4}\s|\s*[-*]\s+|\s*\d+[.)]\s+|\s*\||:::|>|---+\s*$)/.test(L[i])){ buf.push(inline(L[i])); i++; }
      out+=`<p>${buf.join('<br>')}</p>`;
    }
    return out;
  }
  const won = n => n==null || n==='' ? '' : Number(n).toLocaleString('ko-KR')+'원';
  const catCls = c => 'c-'+String(c||'').replace(/[\s+·]/g,'');

  // ---------- 화면 ----------
  function nav(){
    const nP=byKind('prop').filter(p=>(p.data.status||'검토 대기')==='검토 대기').length, nN=byKind('notice').filter(n=>(n.data.status||'정리 대기')==='정리 대기').length;
    const cnt = k => k==='prod' ? byKind('prod').filter(visible).length : k==='faq' ? byKind('faq').filter(visible).length : k==='proc' ? byKind('proc').filter(visible).length : 0;
    $('#nav').innerHTML = `<div class="mn-nav-h">차례</div><a data-go="home" class="${view==='home'?'on':''}">📖 전체 보기</a>`
      + PARTS.map(([pk,pn,subs])=>`<a data-go="${pk}" class="pt${view===pk?' on':''}">${esc(pn)}${subs.length===1&&cnt(subs[0])?`<span class="n">${cnt(subs[0])}</span>`:''}</a>`   // 장이 하나뿐인 묶음(2. 상품)은 아래 줄 없이
        + (subs.length>1 ? subs.map(k=>`<a data-go="${pk}" data-jump="${k}" class="sub">${esc(CH_NAME[k])}${cnt(k)?`<span class="n">${cnt(k)}</span>`:''}</a>`).join('') : '')).join('')
      + `<hr><a data-go="notice" class="${view==='notice'?'on':''}">📥 안내문 · 반영${nP+nN?`<span class="n hot">${nP+nN}</span>`:''}</a>`
      + `<label class="past-t" title="운영 기간이 끝난 상품 · 글도 보기 (예전 것 다시 보기)"><input type="checkbox" id="pastT"${showPast?' checked':''}> 지난 것도 보기</label>`;
  }
  const secBlocks = k => byKind('sec').filter(r=>r.cat===k && visible(r));
  const blockHTML = r => `<div class="mn-blk${phase(r)==='past'?' past':''}" id="r-${esc(r.id)}">${r.title?`<h3>${esc(r.title)} ${perTag(r)}<span class="mn-meta">${r.by?esc(r.by)+' · ':''}${r.updated?esc(String(r.updated).slice(0,10)):''}</span><button type="button" class="ed" data-edit="${esc(r.id)}">고치기</button></h3>`:`<div style="text-align:right"><button type="button" class="ed" data-edit="${esc(r.id)}">고치기</button></div>`}<div class="md">${md(r.data.body)}</div></div>`;
  function chapter(k, solo){   // solo: 묶음에 장이 하나뿐 → 장 이름은 묶음 제목과 같아서 안 씀
    const name=solo ? '' : CH_NAME[k], secs=secBlocks(k);
    let h=`<section class="mn-sec" id="ch-${k}"><h2>${esc(name)}<span class="sp"></span><button type="button" class="btn primary sm" data-add="sec" data-cat="${k}">＋ 글 더하기</button>`
      + (k==='prod'?`<button type="button" class="btn primary sm" data-add="prod">＋ 상품 더하기</button>`:k==='faq'?`<button type="button" class="btn primary sm" data-add="faq">＋ FAQ 더하기</button>`:k==='proc'?`<button type="button" class="btn primary sm" data-add="proc">＋ 절차 더하기</button>`:'')
      + `</h2>${secs.map(blockHTML).join('')}`;
    if(k==='prod') h+=prodHTML(); if(k==='faq') h+=faqHTML(); if(k==='proc') h+=procHTML();
    if(!secs.length && !['prod','faq','proc'].includes(k)) h+='<p class="hint">아직 글이 없습니다. 「＋ 글 더하기」로 적어 주세요.</p>';
    return h+'</section>';
  }
  function prodCard(r){ const d=r.data||{};
    return `<div class="pc${phase(r)==='past'?' past':''}" data-peek="${esc(r.id)}" tabindex="0"><div class="h"><b>${esc(r.title)}</b>${r.cat?`<span class="tag ${catCls(r.cat)}">${esc(r.cat)}</span>`:''}</div>`
      + (perTag(r)?`<div>${perTag(r)}</div>`:'')
      + ((d.pWeek!=null&&d.pWeek!=='')||(d.pEnd!=null&&d.pEnd!=='') ? `<div class="price">${d.pWeek!=null&&d.pWeek!==''?`<span>평일</span><b>${won(d.pWeek)}</b>`:''}${d.pEnd!=null&&d.pEnd!==''?` <span>주말·공휴일</span><b>${won(d.pEnd)}</b>`:''}</div>` : '')
      + `<dl>${d.days?`<dt>운영일</dt><dd>${inline(d.days)}</dd>`:''}${d.time?`<dt>시간</dt><dd>${inline(d.time)}</dd>`:''}${d.cap?`<dt>정원</dt><dd>${inline(d.cap)}</dd>`:''}${d.deadline?`<dt>예약 마감</dt><dd>${inline(d.deadline)}</dd>`:''}</dl>`
      + (d.caution?`<div class="cau">${inline(d.caution)}</div>`:'') + `</div>`; }
  function prodHTML(){
    const all=byKind('prod').filter(visible), cats=[...new Set([...PROD_CATS, ...all.map(r=>r.cat).filter(Boolean)])].filter(c=>all.some(r=>r.cat===c)), none=all.filter(r=>!r.cat).length;
    const L=all.filter(r=>!prodCat || (prodCat==='-' ? !r.cat : r.cat===prodCat)).sort((a,b)=>({live:0,soon:1,past:2}[phase(a)]-{live:0,soon:1,past:2}[phase(b)]) || (PROD_CATS.indexOf(a.cat)+1||9)-(PROD_CATS.indexOf(b.cat)+1||9) || String(a.title).localeCompare(String(b.title),'ko'));
    return `<div class="mn-bar"><button type="button" class="chip${!prodCat?' on':''}" data-pcat="">전체<small>${all.length}</small></button>${cats.map(c=>`<button type="button" class="chip${prodCat===c?' on':''}" data-pcat="${esc(c)}">${esc(c)}<small>${all.filter(r=>r.cat===c).length}</small></button>`).join('')}${none?`<button type="button" class="chip${prodCat==='-'?' on':''}" data-pcat="-">구분 없음<small>${none}</small></button>`:''}</div>`
      + (L.length ? `<div class="pgrid">${L.map(prodCard).join('')}</div>` : '<p class="hint">상품이 없습니다.</p>');
  }
  function faqItem(r, open){ const d=r.data||{};
    return `<details class="fq${phase(r)==='past'?' past':''}" id="r-${esc(r.id)}"${open?' open':''}><summary><span class="q">${esc(r.title)}</span>${d.boss?'<span class="tag boss">상급자 확인 필요</span>':''}${perTag(r)}${r.cat?`<span class="tag">${esc(r.cat)}</span>`:''}</summary>`
      + `<div class="a md">${md(d.a)}${d.body?md(d.body):''}<div style="text-align:right;margin-top:4px">${d.catAI?'<span class="tag ai" title="노션에서 카테고리가 비어 있어 AI가 붙인 것 — 맞지 않으면 「고치기」">카테고리 AI 추천</span> ':''}<button type="button" class="ed" style="opacity:1" data-edit="${esc(r.id)}">고치기</button></div></div></details>`; }
  function faqHTML(){
    const all=byKind('faq').filter(visible), cats=[...new Set(all.map(r=>r.cat||'(카테고리 없음)'))].sort((a,b)=>a.localeCompare(b,'ko'));
    const L=all.filter(r=>!faqCat || (r.cat||'(카테고리 없음)')===faqCat);
    return `<div class="fq-cats"><button type="button" class="chip${!faqCat?' on':''}" data-fcat="">전체<small>${all.length}</small></button>${cats.map(c=>`<button type="button" class="chip${faqCat===c?' on':''}" data-fcat="${esc(c)}">${esc(c)}<small>${all.filter(r=>(r.cat||'(카테고리 없음)')===c).length}</small></button>`).join('')}</div>`
      + (L.length ? L.map(r=>faqItem(r,false)).join('') : '<p class="hint">FAQ가 없습니다.</p>');
  }
  function procHTML(){ const L=byKind('proc').filter(visible);
    return L.length ? L.map(r=>`<div class="pr" data-peek="${esc(r.id)}" tabindex="0"><b>${esc(r.title)}</b> ${perTag(r)}<div class="w">${r.data.when?'언제: '+inline(r.data.when):''}${r.data.screen?' · 화면: '+inline(r.data.screen):''}${r.data.owner?' · 담당: '+inline(r.data.owner):''}</div></div>`).join('') : '<p class="hint">절차가 없습니다.</p>'; }

  function paint(){
    nav();
    if(!loaded) return;
    const q=$('#q').value.trim(); document.body.classList.toggle('mn-searching', !!q);
    if(q){ $('#main').innerHTML=searchHTML(q); markIn($('#main'), lastTerms); return; }
    if(!rows.filter(r=>['sec','prod','faq','proc'].includes(r.kind)).length && view!=='notice'){ $('#main').innerHTML=emptyHTML(); return; }
    if(view==='notice'){ $('#main').innerHTML=noticeHTML(); return; }
    const part = ([pk,pn,subs]) => `<div class="mn-part" id="pt-${pk}"><h1 class="mn-ph">${esc(pn)}</h1>${subs.map(k=>chapter(k, subs.length===1)).join('')}</div>`;
    $('#main').innerHTML = view==='home' ? chapter('intro') + PARTS.map(part).join('') : part(PARTS.find(p=>p[0]===view) || PARTS[0]);
  }
  function jump(k){ const el=document.getElementById('ch-'+k); if(el) el.scrollIntoView({block:'start'}); }
  const emptyHTML = () => `<div class="mn-empty"><p><b>아직 매뉴얼 내용이 없습니다.</b></p><p class="hint">노션에서 옮긴 파일(<code>manual-import.json</code>)을 불러오면 1~10장 · 상품 · FAQ · 내부 절차가 한 번에 들어갑니다.</p>`
    + `<p><label class="btn primary">매뉴얼 파일 불러오기<input type="file" id="impFile" accept=".json" hidden></label></p><p class="hint">또는 왼쪽 장을 골라 「＋ 글 더하기」로 직접 적을 수 있습니다.</p></div>`;

  // ---------- 자세히 보기 (오른쪽 옆) ----------
  let peekId='';
  function peek(id){ const r=rows.find(x=>x.id===id); if(!r){ closePeek(); return; } peekId=id; const d=r.data||{}, P=$('#peek');
    const kv=(l,v)=>v!=null&&v!==''?`<tr><th>${l}</th><td>${inline(String(v))}</td></tr>`:'';
    let body='';
    if(r.kind==='prod') body=`<table class="kv">${kv('구분',r.cat)}${kv('운영 기간', r.start||r.end ? `${r.start?SY.dateDisp(r.start):'처음부터'} ~ ${r.end?SY.dateDisp(r.end):'계속'}` : '')}${kv('운영일',d.days)}${kv('이용 시간',d.time)}${kv('평일',won(d.pWeek))}${kv('주말·공휴일',won(d.pEnd))}${kv('정원',d.cap)}${kv('예약 마감',d.deadline)}${kv('응대 주의사항',d.caution)}${d.link?`<tr><th>상세 링크</th><td><a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a></td></tr>`:''}</table>${d.body?`<div class="md">${md(d.body)}</div>`:''}`;
    else if(r.kind==='proc') body=`<table class="kv">${kv('언제 쓰나',d.when)}${kv('사용 화면',d.screen)}${kv('담당 · 보고',d.owner)}</table><div class="md">${md(d.body)}</div>`;
    else if(r.kind==='faq') body=`<div class="md">${md(d.a)}${md(d.body)}</div>`;
    else body=`<div class="md">${md(d.body)}</div>`;
    const H=(d.hist||[]).slice().reverse();
    P.innerHTML=`<div class="ph"><h2>${esc(r.title||CH_NAME[r.cat]||'')}</h2><button type="button" class="x" data-close title="닫기 (Esc)">×</button></div><div>${r.cat&&r.kind!=='sec'?`<span class="tag ${catCls(r.cat)}">${esc(r.cat)}</span> `:''}${perTag(r)} ${r.kind==='faq'&&d.boss?'<span class="tag boss">상급자 확인 필요</span>':''}</div>${body}`
      + `<div class="acts"><button type="button" class="btn primary sm" data-edit="${esc(r.id)}">고치기</button><button type="button" class="btn primary sm" data-del="${esc(r.id)}">지우기</button><span class="hint" style="margin-left:auto">${r.by?esc(r.by)+' · ':''}${esc(String(r.updated||'').slice(0,16).replace('T',' '))}</span></div>`
      + (H.length?`<details class="hist"><summary>고친 이력 ${H.length}개 (예전 내용 보기 · 되돌리기)</summary><ul>${H.map((h,i)=>`<li>${esc(new Date(h.at).toLocaleString('ko-KR'))} · ${esc(h.by||'')} 고치기 전 <button type="button" class="ed" style="opacity:1" data-hview="${esc(r.id)}" data-hi="${H.length-1-i}">보기</button> <button type="button" class="ed" style="opacity:1" data-hback="${esc(r.id)}" data-hi="${H.length-1-i}">이 내용으로 되돌리기</button></li>`).join('')}</ul></details>`:'');
    P.hidden=false; markIn(P, $('#q').value.trim() ? lastTerms : []);
  }
  const closePeek = () => { $('#peek').hidden=true; peekId=''; };

  // ---------- 고치기 창 ----------
  let form=null;   // {id|null, kind, cat}
  const F = {   // 칸 [키, 이름, 모양, 넓게]
    prod:[['title','상품명','t',1],['cat','구분','cat'],['period','운영 · 판매 기간','per',1],['days','운영일','ta'],['time','이용 시간','ta'],['pWeek','평일 가격 (원)','n'],['pEnd','주말·공휴일 가격 (원)','n'],['cap','정원','t'],['deadline','예약 마감','t'],['caution','응대 주의사항','ta',1],['link','상세 링크','t',1],['body','자세한 내용 (도착 안내 · 비건 응대 등)','big',1]],
    faq:[['title','질문','t',1],['cat','카테고리','fcat'],['boss','상급자 확인 필요','ck'],['a','답변','big',1],['body','덧붙임','ta',1],['period','적용 기간 (비우면 늘)','per',1]],
    proc:[['title','절차명','t',1],['when','언제 쓰나','t',1],['screen','사용 화면','t'],['owner','담당 · 보고','t'],['body','순서','big',1],['period','적용 기간 (비우면 늘)','per',1]],
    sec:[['cat','장','ch'],['title','작은 제목 (없어도 됨)','t'],['body','내용','big',1],['period','보일 기간 (비우면 늘 · 예: 겨울 시즌 안내)','per',1]],
  };
  const KIND_NAME={prod:'상품',faq:'FAQ',proc:'내부 절차',sec:'글'};
  function openForm(kind, id, cat, preset){
    const r=id ? rows.find(x=>x.id===id) : null; if(id && !r) return;
    const v=r ? {title:r.title, cat:r.cat, start:r.start, end:r.end, ...r.data} : {cat:cat||'', ...(preset||{})};
    form={id:id||null, kind, preset:preset||null};
    const fcats=[...new Set(byKind('faq').map(x=>x.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')), pcats=[...new Set([...PROD_CATS, ...byKind('prod').map(x=>x.cat).filter(Boolean)])];
    const fld=([k,l,t,w])=>{ const val=v[k]==null?'':v[k];
      if(t==='per') return `<label class="full">${l}<span style="display:flex;gap:8px;align-items:center">${dateBox('start', v.start)} ~ ${dateBox('end', v.end)}<span class="hint">시작만 · 끝만 넣어도 됨</span></span></label>`;
      if(t==='ck') return `<label class="ck"><input type="checkbox" data-f="${k}"${val?' checked':''}> ${l}</label>`;
      if(t==='ch') return `<label>${l}<select data-f="cat">${CH.map(([ck,cn])=>`<option value="${ck}"${ck===(val||cat)?' selected':''}>${esc(chLabel(ck))}</option>`).join('')}</select></label>`;
      if(t==='cat'||t==='fcat'){ const opts=t==='cat'?pcats:fcats; return `<label>${l}<input data-f="cat" list="dl-${t}" value="${esc(val)}" data-ime="ko"><datalist id="dl-${t}">${opts.map(o=>`<option value="${esc(o)}">`).join('')}</datalist></label>`; }
      if(t==='ta'||t==='big') return `<label class="${w?'full':''}">${l}<textarea data-f="${k}" class="${t==='big'?'big':''}" data-ime="ko">${esc(val)}</textarea></label>`;
      return `<label class="${w?'full':''}">${l}<input data-f="${k}" value="${esc(val)}" ${t==='n'?'inputmode="numeric" data-ime="num"':'data-ime="ko"'}></label>`; };
    $('#modal').innerHTML=`<div class="mf" role="dialog" aria-modal="true"><h2>${KIND_NAME[kind]} ${id?'고치기':'더하기'}${form.preset&&form.preset._prop?' <small class="hint">(반영 제안으로 저장 — 「반영」을 눌러야 매뉴얼에 들어감)</small>':''}</h2><div class="g">${F[kind].map(fld).join('')}</div>`
      + (kind==='sec'||kind==='prod'||kind==='proc'?`<p class="hint">글 모양: <code>## 제목</code> · <code>- 목록</code> · <code>1. 번호</code> · <code>**굵게**</code> · 표 <code>| 칸 | 칸 |</code> · 색 상자 <code>::: green</code> … <code>:::</code> (green · red · orange · blue · gray) · <code>[확인 필요]</code>는 주황으로 보임</p>`:'')
      + `<p class="err" id="fErr"></p><div class="btns"><button type="button" class="btn primary" data-fclose>닫기</button><button type="button" class="btn primary" id="fSave">저장</button></div></div>`;
    $('#modal').hidden=false; $('#modal').querySelectorAll('.dpick').forEach(makeDateBox);
    const first=$('#modal [data-f="title"]')||$('#modal textarea'); if(first) first.focus();
  }
  const dateBox = (k, v) => `<span class="dbox"><input class="dtxt" readonly placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력 · 지우려면 직접 입력에서 비우기" inputmode="numeric"><input type="date" class="dpick" data-f="${k}" value="${esc(v||'')}" tabindex="-1" aria-hidden="true"></span>`;
  function makeDateBox(pick){   // 단체 방문일과 같은 날짜 칸 (칸 안에 「날짜 (요일)」 · 누르면 달력 · 한 번 더 누르거나 숫자를 치면 직접 입력)
    const txt=pick.parentElement.querySelector('.dtxt');
    const paint=()=>{ if(!txt.dataset.editing) txt.value=SY.dateDisp(pick.value); };
    const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
    const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value=blank?'':pick.value; txt.focus(); if(!blank) txt.select(); };
    txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return; if(Date.now()-(+txt.dataset.pickAt||0)<20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; } txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
    txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } else if(!txt.dataset.editing && (e.key==='Backspace'||e.key==='Delete')){ pick.value=''; paint(); } });
    txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const raw=txt.value.trim(), d=raw==='' ? '' : SY.parseDateText(raw); delete txt.dataset.editing; txt.readOnly=true;
      if(d===null){ toast('날짜를 알아볼 수 없습니다. 2026-12-05 · 12/5 처럼 적어 주세요.'); paint(); return; } pick.value=d; paint(); });
    pick.addEventListener('input', paint); pick.addEventListener('change', paint); paint();
  }
  function formRow(){
    const M=$('#modal'), g=k=>{ const el=M.querySelector(`[data-f="${k}"]`); return !el ? undefined : el.type==='checkbox' ? el.checked : String(el.value).replace(/\r/g,'').trim(); };
    const kind=form.kind, data={};
    F[kind].forEach(([k,,t])=>{ if(['title','cat','period'].includes(k)) return; let v=g(k); if(t==='n'){ v=String(v||'').replace(/[^\d]/g,''); v=v===''?null:+v; } data[k]=v; });
    return {kind, title:g('title')||'', cat:g('cat')||'', start:g('start')||'', end:g('end')||'', data};
  }
  async function saveForm(){
    const err=$('#fErr'), n=formRow(); err.textContent='';
    if(n.kind!=='sec' && !n.title){ err.textContent=`${n.kind==='faq'?'질문':'이름'}을 적어 주세요.`; return; }
    if(n.kind==='sec' && !n.data.body){ err.textContent='내용을 적어 주세요.'; return; }
    if(n.start && n.end && n.end<n.start){ err.textContent='기간의 끝이 시작보다 앞입니다.'; return; }
    if(busy) return; busy=true; $('#fSave').disabled=true;
    try{
      if(form.preset && form.preset._prop){   // 안내문을 사람이 정리 → 반영 제안으로
        const p=form.preset._prop; const prop=rows.find(x=>x.id===p);
        const ch={op:'add', kind:n.kind, row:{title:n.title, cat:n.cat, start:n.start, end:n.end, data:n.data}};
        if(prop){ await save([{...prop, data:{...prop.data, changes:[...(prop.data.changes||[]), ch]}}], '제안에 더함'); }
        $('#modal').hidden=true; paint(); toast('반영 제안에 넣었습니다 · 「반영」을 누르면 매뉴얼에 들어갑니다.'); return;
      }
      const old=form.id ? rows.find(x=>x.id===form.id) : null;
      const sameKind = rows.filter(x=>x.kind===n.kind && (n.kind!=='sec' || x.cat===n.cat));
      let r = old ? withHist(old, {...old, ...n, data:{...n.data}}) : {id:newId(n.kind[0]), ord:(Math.max(0, ...sameKind.map(x=>x.ord||0))+1), ...n};
      if(old && old.data && old.data.catAI && old.cat!==n.cat) r.data.catAI=false;   // 사람이 카테고리를 고치면 AI 표시를 뗌
      else if(old && old.data && old.data.catAI) r.data.catAI=true;
      if(await save([r], `${KIND_NAME[n.kind]} ${old?'고침':'더함'}: ${(n.title||CH_NAME[n.cat]||'').slice(0,30)}`)){ $('#modal').hidden=true; paint(); if(peekId===r.id) peek(r.id); }
    } finally { busy=false; const b=$('#fSave'); if(b) b.disabled=false; }
  }

  // ---------- 찾기 ----------
  // 비슷한 말: 한 묶음 안의 말은 서로 같게 봄 (자주 묻는 것 위주 · 늘려 가면 됨)
  const SYN = [
    ['유모차','휠체어','보행기','웨건'],['반려동물','반려견','강아지','애견','고양이','펫','애완'],['주차','주차장','차량','자가용','승용차','차타고','차로'],
    ['환불','취소','반환','돈돌려'],['할인','감면','우대','싸게','프로모션'],['아이','아동','어린이','유아','미취학','아기','애기','초등','자녀','키즈','8세'],
    ['우천','비오','비가','비와','우의','강우','우산','장마','날씨'],['식사','밥상','런치','디너','점심','저녁','레스토랑','식당','코스','다이닝','사담','마방'],
    ['카페','커피','음료','티하우스','가가빈빈','몽몽차방','요요빈빈','다과'],['대중교통','버스','급행','택시','지하철','팔거','교통','정류장'],['셔틀','픽업'],
    ['숙박','숙소','호텔','스테이','인터불고','잠잘','묵을'],['흡연','담배','금연'],['촬영','사진','카메라','스냅','드론','삼각대','웨딩'],
    ['경로','어르신','노인','장애인','장애'],['학생','청소년','학생증','중학생','고등학생'],['단체','20인','20명','단체예약','인솔'],
    ['외부음식','도시락','김밥','반입','음식','주류','콜키지','텀블러','생수'],['결제','카드','현금','상품권','관람권','계좌','바코드'],
    ['휴무','쉬는','휴장','휴일','명절','설날','추석','쉬나','영업일','운영일','월요일'],['입장','입장시간','입장마감','도착','들어가'],
    ['퇴장','재입장','나가','나갔다'],['예약','예매'],['변경','바꾸','옮기','일정변경','날짜변경','예약변경'],['겨울','윈터','시즌','크리스마스','송년','동지'],
    ['가격','요금','금액','얼마','비용','관람료','입장료','티켓'],['시간','몇시','운영시간','언제','오픈','마감'],['지각','늦','늦어','지연'],
    ['비건','채식','알레르기','알러지','고기'],['도슨트','해설','가이드','투어'],['대관','행사','세미나','촬영대관'],['군위','주민'],['국가유공자','보훈'],['간송'],
  ];
  const STOP = new Set('알려주세 알려주 주세 궁금 궁금해 어떻게 어떡해 되나요 되요 돼요 되는지 가능 가능한가요 가능해요 가능한지 있나요 있어요 있는지 알려줘 알려주세요 문의 하나요 해요 하는지 뭐 뭐야 무엇 무엇인가요 인가요 건가요 할 수 있는 좀 혹시 그리고 그럼 네 저 제가 우리 고객 손님 하면 하려면 싶어요 싶은데 데 때 경우 요 거 것 이 그 안내 말씀 대해 대한 관련 해야 하나 되나 맞나요 인지 어디 어디서'.split(' '));
  const JOSA = ['에서는','으로는','이라도','에서도','까지는','부터는','이에요','인가요','인데요','이랑은','에서','으로','에게','까지','부터','처럼','이랑','하고','이나','라도','은','는','이','가','을','를','에','도','만','의','로','와','과','랑','요','나'];
  const norm = s => String(s||'').toLowerCase().replace(/\s+/g,'');
  function variants(tok){ const out=new Set([tok]); JOSA.forEach(j=>{ if(tok.endsWith(j) && tok.length-j.length>=2) out.add(tok.slice(0,-j.length)); });
    ['하나요','되나요','인가요','할까요','될까요','해요','돼요','되요','가능','하면','했는데','인데','나요','어요','아요'].forEach(e=>{ if(tok.endsWith(e) && tok.length-e.length>=2) out.add(tok.slice(0,-e.length)); });
    return [...out]; }
  function terms(q){   // [[같게 볼 말들], …]
    const toks=String(q).toLowerCase().replace(/[?!.,~'"“”‘’()·/]/g,' ').split(/\s+/).filter(Boolean);
    const groups=[];
    toks.forEach(t=>{ const vs=variants(t).filter(v=>v.length>=2 || SYN.some(g=>g.includes(v))); if(!vs.length || vs.some(v=>STOP.has(v))) return;   // 조사를 뗀 모양이라도 흔한 말(되나요 · 알려주세요 …)이면 뺌
      const set=new Set(vs.filter(v=>!STOP.has(v)));
      const base=[...set]; SYN.forEach(g=>{ if(g.some(w=>base.some(v=>v===w || (w.length>=2 && v.includes(w))))) g.forEach(w=>set.add(w)); });   // 내 말이 비슷한 말을 품고 있을 때만 (단체예약 ⊃ 예약 처럼 거꾸로는 넓어져서 안 함)
      if(set.size) groups.push({main:vs.find(v=>!STOP.has(v))||vs[0], words:[...set]}); });
    // 띄어 쓴 말 사이에 걸친 비슷한 말도 (예: 「비 오면」 → 비오 → 우천 묶음)
    const cq=norm(q); SYN.forEach(g=>{ if(g.some(w=>w.length>=2 && cq.includes(w)) && !groups.some(x=>x.words.some(w=>g.includes(w)))) groups.push({main:g.find(w=>cq.includes(w)), words:[...g]}); });
    if(!groups.length && toks.length) groups.push({main:norm(q), words:[norm(q)]});
    groups.forEach(g=>{ g.soft = SOFT.includes(g.main); });   // 흔한 말(예약 · 시간 · 가격)은 맞으면 조금 더하고, 없어도 덜 깎음
    return groups; }
  const SOFT = ['예약','시간','가격','번호','방법','얼마','몇시','언제','금액','요금'];
  let DOCS=[], lastTerms=[];
  function buildIndex(){
    DOCS=[];
    rows.forEach(r=>{ const d=r.data||{}, past=phase(r)==='past';
      if(r.kind==='prod') DOCS.push({r, kind:'prod', title:r.title, cat:r.cat, key:[d.caution, d.days, d.time, d.cap, d.deadline, won(d.pWeek), won(d.pEnd)].join(' '), body:d.body||'', past, price:true});
      else if(r.kind==='faq') DOCS.push({r, kind:'faq', title:r.title, cat:r.cat, key:d.a||'', body:d.body||'', past});
      else if(r.kind==='proc') DOCS.push({r, kind:'proc', title:r.title, cat:'', key:[d.when,d.screen,d.owner].join(' '), body:d.body||'', past});
      else if(r.kind==='sec'){   // 글은 작은 제목(##)마다 · 너무 길면 문단 묶음으로 나눔
        const parts=[]; let cur={h:r.title||'', lines:[]};
        String(d.body||'').split('\n').forEach(l=>{ const h=l.match(/^#{1,4}\s+(.*)$/); if(h){ if(cur.lines.join('').trim()) parts.push(cur); cur={h:h[1], lines:[]}; } else cur.lines.push(l); });
        if(cur.lines.join('').trim()) parts.push(cur);
        parts.forEach((p,i)=>{ const txt=p.lines.join('\n'); const chunks=txt.length>900 ? txt.split(/\n\s*\n/).reduce((a,b)=>{ if(!a.length || a[a.length-1].length+b.length>700) a.push(b); else a[a.length-1]+='\n\n'+b; return a; },[]) : [txt];
          chunks.forEach((c,j)=>DOCS.push({r, kind:'sec', title:[CH_NAME[r.cat]||'', r.title, p.h!==r.title?p.h:''].filter(Boolean).join(' › '), cat:'', key:'', body:c, past, part:i+'.'+j})); });
      } });
    DOCS.forEach(x=>{ x.nT=norm(x.title); x.nC=norm(x.cat); x.nK=norm(x.key); x.nB=norm(x.body); });
  }
  function score(doc, groups, intent){
    let s=0, hit=0;
    groups.forEach(g=>{ let best=0; g.words.forEach(w0=>{ const w=norm(w0), main=w0===g.main; if(w.length<2 && !main) return; const f=main?1:0.7;
        if(doc.nT.includes(w)) best=Math.max(best, 6*f); else if(doc.nC.includes(w)) best=Math.max(best, 3*f); else if(doc.nK.includes(w)) best=Math.max(best, 2.4*f); else if(doc.nB.includes(w)) best=Math.max(best, 1.3*f); });
      if(best){ const m=norm(g.main), n=[doc.nT,doc.nC,doc.nK,doc.nB].filter(x=>x.includes(m)).length; if(n && best<6) best+=0.8*n; }   // 손님이 쓴 그 말이 그대로 있으면 조금 더 (비슷한 말로만 맞은 것보다 위로)
      if(!best && g.main.length>=3){ const w=norm(g.main); for(let i=0;i<w.length-1;i++){ const bg=w.slice(i,i+2); if(doc.nT.includes(bg)) best=Math.max(best,0.9); else if((doc.nK+doc.nB).includes(bg)) best=Math.max(best,0.35); } }
      if(best){ s+=g.soft ? best*0.5 : best; hit+=g.soft?0.5:1; g.hit=1; } else g.hit=0; });
    if(!hit) return 0;
    const den=groups.reduce((a,g)=>a+(g.soft?(g.hit?0.5:0):1),0)||1, cov=hit/den; s*=cov*cov;
    if(intent.price && doc.price) s*=1.3;
    if(doc.kind==='faq') s*=1.12;
    if(doc.past) s*=0.45;
    if(phase(doc.r)==='soon') s*=0.9;
    return s; }
  function searchHTML(q){
    const groups=terms(q); lastTerms=[...new Set(groups.flatMap(g=>g.words))].filter(w=>w.length>=2 || SYN.some(s=>s.includes(w)));
    const intent={price:/얼마|가격|요금|금액|비용|원\b|관람료/.test(q)};
    const R=DOCS.map(d=>({d, s:score(d, groups, intent)})).filter(x=>x.s>0.6).sort((a,b)=>b.s-a.s);
    const seen=new Set(), L=R.filter(x=>{ const k=x.d.r.id+(x.d.kind==='sec'?':'+x.d.part:''); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,25);
    if(!L.length) return `<div class="sr-none"><b>「${esc(q)}」에 맞는 내용을 찾지 못했습니다.</b><p class="hint">다른 말로 바꿔 보세요 (예: 「유모차」 → 「휠체어 유모차 반입」). 매뉴얼에 없는 내용이면 <b>답하지 말고</b> "확인 후 연락드리겠습니다" → 상급자 확인 → 콜백.</p></div>`;
    const top=L[0], rest=L.slice(1);
    const label = d => `${d.kind==='prod'?'상품':d.kind==='faq'?'FAQ':d.kind==='proc'?'내부 절차':'매뉴얼'}${d.cat?' · '+esc(d.cat):''}${d.past?' <span class="tag past">지난 것</span>':''}${d.kind==='faq'&&d.r.data.boss?' <span class="tag boss">상급자 확인 필요</span>':''}${/\[확인 필요\]/.test(d.key+d.body+d.title)?' <span class="chk">[확인 필요] 있음</span>':''}`;
    const full = d => d.kind==='prod' ? prodCard(d.r).replace('class="pc','class="pc sr-pc') + (d.r.data.body?`<details style="margin-top:6px"><summary class="hint">자세한 내용</summary><div class="md">${md(d.r.data.body)}</div></details>`:'')
      : d.kind==='faq' ? `<h3>Q. ${esc(d.title)}</h3><div class="md">${md(d.r.data.a)}${md(d.r.data.body)}</div>`
      : d.kind==='proc' ? `<h3>${esc(d.title)}</h3><div class="md">${md(d.r.data.body)}</div>`
      : `<h3>${esc(d.title)}</h3><div class="md">${md(d.body)}</div>`;
    const snip = d => { const t=(d.kind==='faq' ? d.r.data.a : d.kind==='prod' ? [d.key, d.body].join('\n') : d.body)||''; return esc(String(t).replace(/^:::.*$/gm,'').replace(/^\s*\|?\s*:?-{2,}.*$/gm,'').replace(/[#*|>]+/g,' ').replace(/\n{2,}/g,'\n').trim().slice(0,220)); };
    return `<p class="sr-hint">「${esc(q)}」 · ${L.length}개 찾음 · 숫자(가격 · 시간)는 꼭 아래 원문 그대로 안내하세요</p>`
      + `<div class="sr-top"><div class="lbl">가장 맞는 내용 · ${label(top.d)}<span style="flex:1"></span><button type="button" class="ed" style="opacity:1" data-goto="${esc(top.d.r.id)}">매뉴얼에서 보기</button></div>${full(top.d)}</div>`
      + (rest.length?`<div class="sr-list">${rest.map(x=>`<div class="sr" data-goto="${esc(x.d.r.id)}" tabindex="0"><div class="lbl">${label(x.d)}</div><b>${esc(x.d.title)}</b><div class="snip">${snip(x.d)}</div></div>`).join('')}</div>`:'');
  }
  function markIn(root, words){   // 찾은 말을 노란 칠로 (글자 칸만 · 링크 · 버튼 안은 그대로)
    if(!root || !words || !words.length) return;
    const W=[...new Set(words)].filter(w=>w.length>=1).sort((a,b)=>b.length-a.length).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if(!W.length) return; const re=new RegExp('('+W.join('|')+')','gi');
    const walk=n=>{ if(n.nodeType===3){ if(!re.test(n.nodeValue)) return; re.lastIndex=0; const span=document.createElement('span'); span.innerHTML=esc(n.nodeValue).replace(re,'<mark>$1</mark>'); n.replaceWith(...span.childNodes); return; }
      if(n.nodeType===1 && !/^(MARK|BUTTON|INPUT|TEXTAREA|SCRIPT|STYLE|SELECT|A)$/.test(n.tagName)) [...n.childNodes].forEach(walk); };
    walk(root); }
  function goto(id){ const r=rows.find(x=>x.id===id); if(!r) return; $('#q').value='';
    if(r.kind==='prod' || r.kind==='proc'){ view=partOf(r.kind); if(phase(r)==='past') showPast=true; paint(); peek(id); return; }
    view = partOf(r.kind==='faq' ? 'faq' : r.cat) || 'home'; if(phase(r)==='past') showPast=true; if(r.kind==='faq') faqCat='';
    paint(); const el=document.getElementById('r-'+id); if(el){ if(el.tagName==='DETAILS') el.open=true; el.scrollIntoView({block:'center'}); el.style.outline='3px solid #f0c64a'; setTimeout(()=>el.style.outline='',2200); } }

  // ---------- 안내문 · 반영 제안 ----------
  const fileIcon = m => /^image/.test(m) ? '🖼' : /pdf/.test(m) ? '📄' : /word/.test(m) ? '📝' : '📃';
  function noticeHTML(){
    const N=byKind('notice').sort((a,b)=>String(b.updated).localeCompare(String(a.updated))), P=byKind('prop');
    const propOf = n => P.filter(p=>p.data.noticeId===n.id);
    const nst = n => n.data.status||'정리 대기', pst = p => p.data.status||'검토 대기';
    const wait=P.filter(p=>pst(p)==='검토 대기');
    return `<section class="mn-sec"><h2>📥 안내문 · 반영<small>새 상품 · 바뀐 내용의 안내문(이미지 · PDF · 워드 · 글)을 올리면 → 정리한 「반영 제안」을 → 확인하고 「반영」을 눌러야 매뉴얼에 들어갑니다</small></h2>`
      + `<div class="nt-up"><label>제목<input id="ntTitle" placeholder="예: 26/27 겨울 시즌 상품 안내" data-ime="ko"></label><label>파일 (여러 개 · 10MB까지)<input type="file" id="ntFiles" multiple accept="image/*,.pdf,.docx,.txt"></label>`
      + `<label class="full">메모 · 글로 된 안내 (붙여 넣어도 됨)<textarea id="ntMemo" data-ime="ko" placeholder="예: 12/1부터 판매 · 기존 사담 런치를 대체하는지 확인 중"></textarea></label><div class="row"><span class="hint" id="ntSt"></span><button type="button" class="btn primary" id="ntSave">안내문 올리기</button></div></div>`
      + `<div class="cc-box"><b>AI(Claude Code)로 정리하기</b> — 추가 요금 없이<ol>`
      + `<li><button type="button" class="btn primary sm" id="ccOut">정리 대기 안내문 내려받기</button> <span class="hint">「정리 대기」 안내문 ${N.filter(n=>nst(n)==='정리 대기').length}개 + 지금 매뉴얼을 묶은 파일 1개 (내려받기 폴더에)</span></li>`
      + `<li>Claude Code 에 <b>"매뉴얼 안내문 정리해줘"</b>라고 말하기 → 정리 결과 파일(<code>…정리결과….json</code>)을 만들어 줌</li>`
      + `<li><label class="btn primary sm" style="display:inline-flex">정리 결과 불러오기 (JSON)<input type="file" id="impFile" accept=".json" hidden></label> → 아래 「반영 제안」에서 확인하고 「반영」</li></ol>`
      + `<p class="hint">사람이 직접 하려면 올린 안내문의 「직접 정리」. 어느 쪽이든 「반영」을 눌러야 매뉴얼에 들어갑니다.</p></div></section>`
      + `<section class="mn-sec"><h2>반영 제안 <small>검토 대기 ${wait.length}개</small></h2>${P.length ? P.sort((a,b)=>(pst(a)==='검토 대기'?0:1)-(pst(b)==='검토 대기'?0:1) || String(b.updated).localeCompare(String(a.updated))).map(propHTML).join('') : '<p class="hint">아직 없습니다.</p>'}</section>`
      + `<section class="mn-sec"><h2>올린 안내문 <small>${N.length}개</small></h2>${N.length ? N.map(n=>`<div class="nt"><div class="h"><b>${esc(n.title||'(제목 없음)')}</b><span class="st-tag${nst(n)==='반영됨'?' done':nst(n)==='보류'?' hold':''}">${esc(nst(n))}</span><span class="hint">${esc(n.by||'')} · ${esc(String(n.updated||'').slice(0,10))}</span></div>`
          + `<div class="files">${(n.data.files||[]).map(f=>`<button type="button" data-file="${esc(f.id)}" data-fname="${esc(f.name)}">${fileIcon(f.mime)} ${esc(f.name)}</button>`).join('')}</div>${n.data.memo?`<div class="memo">${esc(n.data.memo)}</div>`:''}`
          + `<div class="pp-acts" style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">${propOf(n).length?`<span class="hint">제안 ${propOf(n).length}개</span>`:''}<button type="button" class="btn primary sm" data-nself="${esc(n.id)}">직접 정리 (상품으로)</button><button type="button" class="btn primary sm" data-nselff="${esc(n.id)}">직접 정리 (FAQ로)</button><button type="button" class="btn primary sm" data-nhold="${esc(n.id)}">${nst(n)==='보류'?'보류 풀기':'보류'}</button><button type="button" class="btn primary sm" data-del="${esc(n.id)}">지우기</button></div></div>`).join('') : '<p class="hint">아직 올린 안내문이 없습니다.</p>'}</section>`;
  }
  const FIELD_L = {title:'이름 · 질문', cat:'구분', start:'시작', end:'끝', days:'운영일', time:'이용 시간', pWeek:'평일', pEnd:'주말·공휴일', cap:'정원', deadline:'예약 마감', caution:'응대 주의사항', link:'상세 링크', body:'자세한 내용', a:'답변', boss:'상급자 확인', when:'언제 쓰나', screen:'사용 화면', owner:'담당 · 보고'};
  const flat = r => r ? {title:r.title, cat:r.cat, start:r.start, end:r.end, ...Object.fromEntries(Object.entries(r.data||{}).filter(([k])=>!['hist','catAI'].includes(k)))} : {};
  function propHTML(p){ const d=p.data, s=d.status||'검토 대기', open=s==='검토 대기';
    const chs=(d.changes||[]).map((c,i)=>{ const cur=c.op==='edit' ? rows.find(x=>x.id===c.id) : null, a=c.before || flat(cur), b={...a, ...Object.fromEntries(Object.entries(flat(c.row)).filter(([,v])=>v!==undefined))};   // 고침 제안에 없는 칸은 그대로
      const keys=Object.keys(FIELD_L).filter(k=>String(a[k]??'')!==String(b[k]??''));
      return `<div class="ch"><div class="t">${open?`<input type="checkbox" data-pch="${esc(p.id)}" data-i="${i}" checked> `:''}${c.op==='edit'?'고침':'새로'} ${KIND_NAME[c.kind]||c.kind} · ${esc(b.title||CH_NAME[b.cat]||'')}${c.op==='edit'&&!cur?' <span class="chk">원래 항목이 없음</span>':''}</div>`
        + `<table>${keys.map(k=>`<tr><th>${FIELD_L[k]}</th>${c.op==='edit'?`<td class="old">${esc(fmtV(k,a[k]))}</td>`:''}<td class="new">${esc(fmtV(k,b[k]))}</td></tr>`).join('') || '<tr><td class="hint">바뀌는 칸 없음</td></tr>'}</table></div>`; }).join('');
    return `<div class="pp${s==='반영됨'?' done':s==='보류'?' hold':''}"><div class="h"><b>${esc(p.title||'반영 제안')}</b><span class="st-tag${s==='반영됨'?' done':s==='보류'?' hold':''}">${esc(s)}</span><span class="hint">${esc(d.src||'')} · ${esc(p.by||'')} · ${esc(String(p.updated||'').slice(0,10))}${d.doneBy?` · ${esc(s)}: ${esc(d.doneBy)}`:''}</span></div>`
      + (d.note?`<div class="md">${md(d.note)}</div>`:'') + chs
      + (open?`<div class="acts"><button type="button" class="btn primary sm" data-padd="${esc(p.id)}">＋ 이 제안에 상품 더하기</button><button type="button" class="btn primary sm" data-phold="${esc(p.id)}">보류</button><button type="button" class="btn primary" data-papply="${esc(p.id)}">체크한 것 반영</button></div>`:'') + `</div>`; }
  const fmtV = (k,v) => v==null||v==='' ? '(비움)' : (k==='pWeek'||k==='pEnd') ? won(v) : k==='boss' ? (v?'예':'아니오') : String(v);
  async function applyProp(pid){ const p=rows.find(x=>x.id===pid); if(!p || !canApprove()) return;
    const picks=[...document.querySelectorAll(`[data-pch="${CSS.escape(pid)}"]`)].filter(x=>x.checked).map(x=>+x.dataset.i);
    if(!picks.length){ toast('반영할 것을 체크해 주세요.'); return; }
    const out=[];
    picks.forEach(i=>{ const c=p.data.changes[i], R=c.row||{};
      if(c.op==='edit'){ const cur=rows.find(x=>x.id===c.id); if(!cur) return; out.push(withHist(cur, {...cur, title:R.title??cur.title, cat:R.cat??cur.cat, start:R.start??cur.start, end:R.end??cur.end, data:{...cur.data, ...(R.data||{}), src:p.id}})); }
      else { const same=rows.filter(x=>x.kind===c.kind); out.push({id:newId(c.kind[0]), kind:c.kind, title:R.title||'', cat:R.cat||'', start:R.start||'', end:R.end||'', ord:Math.max(0,...same.map(x=>x.ord||0))+1, data:{...(R.data||{}), src:p.id}}); } });
    const n=rows.find(x=>x.id===p.data.noticeId);
    out.push({...p, data:{...p.data, changes:p.data.changes.map((c,i)=>c.op==='edit' && picks.includes(i) ? {...c, before:flat(rows.find(x=>x.id===c.id))} : c), status:'반영됨', applied:picks, doneAt:new Date().toISOString(), doneBy:user.name||''}});
    if(n) out.push({...n, data:{...n.data, status:'반영됨'}});
    if(await save(out, `반영: ${p.title||''}`.slice(0,40))){ paint(); toast(`${picks.length}개를 매뉴얼에 반영했습니다.`); }
  }
  async function uploadNotice(){
    const files=[...($('#ntFiles').files||[])], title=$('#ntTitle').value.trim(), memo=$('#ntMemo').value.trim(), stEl=$('#ntSt');
    if(!files.length && !memo){ toast('파일을 고르거나 메모(글)를 적어 주세요.'); return; }
    if(busy) return; busy=true; $('#ntSave').disabled=true;
    try{ const up=[];
      for(const f of files){ if(f.size>10*1024*1024){ toast(`${f.name}: 10MB가 넘습니다.`); continue; }
        stEl.textContent=`올리는 중… ${f.name}`;
        const mime=f.type || (/\.docx$/i.test(f.name)?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':/\.txt$/i.test(f.name)?'text/plain':'');
        const data=await new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]||''); fr.onerror=no; fr.readAsDataURL(f); });
        const j=await SY.call({action:'manualFilePut', name:f.name, mime, data}); up.push({id:j.file.id, name:j.file.name, mime:j.file.mime}); }
      const nid=newId('n'), pid=newId('p');
      const notice={id:nid, kind:'notice', title:title||(files[0]&&files[0].name)||'안내문', cat:'', start:'', end:'', ord:0, data:{files:up, memo, status:'정리 대기'}};
      if(await save([notice], '안내문 올림')){ $('#ntTitle').value=''; $('#ntMemo').value=''; $('#ntFiles').value=''; stEl.textContent=''; paint(); toast('안내문을 올렸습니다 · 「직접 정리」로 반영 제안을 만들 수 있습니다.'); }
    }catch(e){ stEl.textContent=''; toast('올리지 못했습니다: '+(e.code==='bad_action'?'서버(Cloudflare)를 새 코드로 올려 주세요':(e.code||e.message)), 4500); }
    finally{ busy=false; const b=$('#ntSave'); if(b) b.disabled=false; }
  }
  async function openFile(id, name){
    try{ st('파일 받는 중…',''); const j=await SY.call({action:'manualFileGet', id}); st('','');
      const bin=atob(j.file.data), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([u8], {type:j.file.mime}));
      if(/^image|pdf|text/.test(j.file.mime)) window.open(url, '_blank'); else { const a=document.createElement('a'); a.href=url; a.download=name||j.file.name; a.click(); }
      setTimeout(()=>URL.revokeObjectURL(url), 60000);
    }catch(e){ st('',''); toast('파일을 열지 못했습니다: '+(e.code||e.message)); }
  }
  async function propForNotice(nid){   // 사람이 정리: 그 안내문의 반영 제안(없으면 새로)을 만들고 그 안에 상품/FAQ 를 적음
    const n=rows.find(x=>x.id===nid); if(!n) return null;
    let p=byKind('prop').find(x=>x.data.noticeId===nid && (x.data.status||'검토 대기')==='검토 대기' && x.data.src==='사람');
    if(!p){ p={id:newId('p'), kind:'prop', title:`${n.title} 정리`, cat:'', start:'', end:'', ord:0, data:{noticeId:nid, src:'사람', status:'검토 대기', changes:[]}};
      if(!(await save([p, {...n, data:{...n.data, status:'제안 있음'}}], '반영 제안 만듦'))) return null; }
    return p.id; }

  // ---------- Claude Code 에 맡길 묶음 내려받기 (2026-11-24 · 추가 요금 없이 AI 정리) ----------
  // 사유원-매뉴얼-정리대기-날짜.zip = 정리요청.json(안내문 목록 · 지금 매뉴얼 · 결과 모양) + files/안내문id/파일들
  //  Claude Code 가 이 zip 을 읽고 「…정리결과….json」(type sayuwon-manual-proposals) 을 만들면 → 「정리 결과 불러오기」 → 반영 제안 → 「반영」
  async function ccOut(){
    const W=byKind('notice').filter(n=>(n.data.status||'정리 대기')==='정리 대기');
    if(!W.length){ toast('「정리 대기」 안내문이 없습니다. 먼저 안내문을 올려 주세요.'); return; }
    if(typeof JSZip==='undefined'){ toast('압축 도구를 불러오지 못했습니다. 새로고침 해 주세요.'); return; }
    const b=$('#ccOut'); b.disabled=true;
    try{ const zip=new JSZip(), notices=[];
      for(const n of W){ const files=[];
        for(const f of (n.data.files||[])){ st(`파일 받는 중… ${f.name}`,''); const j=await SY.call({action:'manualFileGet', id:f.id}); const path=`files/${n.id}/${f.name}`; zip.file(path, j.file.data, {base64:true}); files.push({name:f.name, mime:f.mime, path}); }
        notices.push({noticeId:n.id, title:n.title, memo:n.data.memo||'', by:n.by||'', at:n.updated||'', files}); }
      const manual=rows.filter(r=>['sec','prod','faq','proc'].includes(r.kind)).map(r=>{ const {hist, ...d}=r.data||{}; return {id:r.id, kind:r.kind, title:r.title, cat:r.cat, start:r.start, end:r.end, data:d}; });
      zip.file('정리요청.json', JSON.stringify({type:'sayuwon-manual-ai-request', made:new Date().toISOString(), by:user.name||'', today:today(),
        howto:'안내문(files/)을 읽고 지금 매뉴얼(manual)과 비교해, 새 상품 · 바뀐 내용을 정리한 반영 제안을 만든다. 숫자(가격 · 시간 · 날짜)는 안내문 그대로. 이미 있는 항목이 바뀌면 op:edit + id, 새것은 op:add. 기간이 있으면 start/end(YYYY-MM-DD). 애매한 것은 [확인 필요]. 결과는 아래 result 모양의 JSON 파일.',
        result:{type:'sayuwon-manual-proposals', proposals:[{noticeId:'안내문 id', title:'제안 제목', note:'정리하며 알게 된 것 · 확인할 것', src:'AI', changes:[{op:'add|edit', kind:'prod|faq|proc|sec', id:'edit 일 때 manual 의 id', row:{title:'', cat:'', start:'', end:'', data:{}}}]}]},
        kinds:{prod:'data {days 운영일, time 이용 시간, pWeek 평일 가격(숫자), pEnd 주말·공휴일 가격(숫자), cap 정원, deadline 예약 마감, caution 응대 주의사항, link, body 자세한 내용}', faq:'title=질문 · cat=카테고리 · data {a 답변, boss 상급자 확인 필요(true/false), body}', proc:'data {when, screen, owner, body}', sec:'cat=장 키(intro call dont glance prod faq rule trans ticket proc link) · data {body}'},
        notices, manual}, null, 1));
      const blob=await zip.generateAsync({type:'blob'}), a=document.createElement('a'), d=new Date();
      a.href=URL.createObjectURL(blob); a.download=`사유원-매뉴얼-정리대기-${today().replace(/-/g,'')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.zip`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 60000);
      st('',''); toast(`안내문 ${W.length}개를 내려받았습니다 · Claude Code 에 "매뉴얼 안내문 정리해줘"라고 말해 주세요.`, 5000);
    }catch(e){ st('',''); toast('내려받지 못했습니다: '+(e.code||e.message), 4500); }
    finally{ b.disabled=false; }
  }

  // ---------- 불러오기 (노션 옮긴 파일 · 정리 결과) ----------
  // 모양: {type:'sayuwon-manual', rows:[{kind, title, cat, start, end, ord, data}]} → 매뉴얼에 바로 (처음 한 번 · 이미 있으면 물어봄)
  //       {type:'sayuwon-manual-proposals', proposals:[{title, note, noticeId?, changes:[{op, kind, id?, match?(이름으로 찾기), row}]}]} → 반영 제안으로 (「반영」을 눌러야 들어감)
  async function importFile(f){
    let j; try{ j=JSON.parse(await f.text()); }catch(_){ toast('JSON 파일을 읽지 못했습니다.'); return; }
    if(j.type==='sayuwon-manual' && Array.isArray(j.rows)){
      const have=rows.filter(r=>['sec','prod','faq','proc'].includes(r.kind)).length;
      if(have && !confirm(`이미 매뉴얼 내용이 ${have}개 있습니다. 파일의 ${j.rows.length}개를 더할까요? (같은 id 는 덮어씀)`)) return;
      const list=j.rows.map((r,i)=>({id:r.id||newId((r.kind||'s')[0]), kind:r.kind, title:r.title||'', cat:r.cat||'', start:r.start||'', end:r.end||'', ord:r.ord ?? i, data:r.data||{}}));
      if(await save(list, `매뉴얼 ${list.length}개 불러옴`)){ view='home'; paint(); toast(`매뉴얼 ${list.length}개를 넣었습니다.`, 3500); }
      return; }
    if(j.type==='sayuwon-manual-proposals' && Array.isArray(j.proposals)){
      const list=j.proposals.map(p=>({id:newId('p'), kind:'prop', title:p.title||'반영 제안', cat:'', start:'', end:'', ord:0, data:{noticeId:p.noticeId||'', src:p.src||'AI', status:'검토 대기', note:p.note||'',
        changes:(p.changes||[]).map(c=>{ if(c.op==='edit' && !c.id && c.match){ const t=rows.find(x=>x.kind===c.kind && norm(x.title)===norm(c.match)); if(t) return {...c, id:t.id}; return {...c, op:'add'}; } return c; })}}));
      const marks=[...new Set(list.map(p=>p.data.noticeId).filter(Boolean))].map(id=>rows.find(x=>x.id===id && x.kind==='notice')).filter(n=>n && (n.data.status||'정리 대기')==='정리 대기').map(n=>({...n, data:{...n.data, status:'제안 있음'}}));   // 정리된 안내문은 「제안 있음」으로
      if(await save([...list, ...marks], `반영 제안 ${list.length}개`)){ view='notice'; paint(); toast(`반영 제안 ${list.length}개를 넣었습니다 · 확인하고 「반영」을 눌러 주세요.`, 4000); }
      return; }
    toast('사유원 매뉴얼 파일 모양이 아닙니다.');
  }

  // ---------- 이벤트 ----------
  document.addEventListener('click', async e=>{
    const t=e.target.closest('#ccOut,[data-go],[data-pcat],[data-fcat],[data-peek],[data-close],[data-edit],[data-add],[data-del],[data-fclose],#fSave,[data-goto],[data-file],#ntSave,[data-nself],[data-nselff],[data-nhold],[data-papply],[data-phold],[data-padd],[data-hview],[data-hback]'); if(!t) return;
    if(t.dataset.go!=null){ view=t.dataset.go; $('#q').value=''; history.replaceState(null,'',view==='home'?location.pathname+location.search:'#'+view); closePeek(); paint(); window.scrollTo(0,0); if(t.dataset.jump) jump(t.dataset.jump); return; }
    if(t.dataset.pcat!=null){ prodCat=t.dataset.pcat; paint(); return; }
    if(t.dataset.fcat!=null){ faqCat=t.dataset.fcat; paint(); return; }
    if(t.dataset.goto){ goto(t.dataset.goto); return; }
    if(t.dataset.peek){ peek(t.dataset.peek); return; }
    if(t.dataset.close!=null){ closePeek(); return; }
    if(t.dataset.edit){ const r=rows.find(x=>x.id===t.dataset.edit); if(r) openForm(r.kind, r.id); return; }
    if(t.dataset.add){ openForm(t.dataset.add, null, t.dataset.cat||''); return; }
    if(t.dataset.fclose!=null){ $('#modal').hidden=true; return; }
    if(t.id==='fSave'){ saveForm(); return; }
    if(t.id==='ntSave'){ uploadNotice(); return; }
    if(t.id==='ccOut'){ ccOut(); return; }
    if(t.dataset.file){ openFile(t.dataset.file, t.dataset.fname); return; }
    if(t.dataset.del){ const r=rows.find(x=>x.id===t.dataset.del); if(!r) return;
      if(!confirm(`「${(r.title||CH_NAME[r.cat]||'이 항목').slice(0,40)}」을(를) 지울까요?`)) return;
      if(await remove([r.id], (r.title||'').slice(0,30))){ closePeek(); paint(); } return; }
    if(t.dataset.nself || t.dataset.nselff){ const pid=await propForNotice(t.dataset.nself||t.dataset.nselff); if(pid) openForm(t.dataset.nself?'prod':'faq', null, '', {_prop:pid}); return; }
    if(t.dataset.padd){ openForm('prod', null, '', {_prop:t.dataset.padd}); return; }
    if(t.dataset.nhold){ const n=rows.find(x=>x.id===t.dataset.nhold); if(n && await save([{...n, data:{...n.data, status:(n.data.status==='보류'?'정리 대기':'보류')}}], '안내문 보류')) paint(); return; }
    if(t.dataset.phold){ const p=rows.find(x=>x.id===t.dataset.phold); if(p && await save([{...p, data:{...p.data, status:'보류', doneAt:new Date().toISOString(), doneBy:user.name||''}}], '제안 보류')) paint(); return; }
    if(t.dataset.papply){ applyProp(t.dataset.papply); return; }
    if(t.dataset.hview || t.dataset.hback){ const r=rows.find(x=>x.id===(t.dataset.hview||t.dataset.hback)), h=r && (r.data.hist||[])[+t.dataset.hi]; if(!h) return;
      if(t.dataset.hview){ const P=$('#peek'); P.innerHTML=`<div class="ph"><h2>${esc(h.title||'')} <small class="hint">${esc(new Date(h.at).toLocaleString('ko-KR'))} 고치기 전</small></h2><button type="button" class="x" data-close>×</button></div><table class="kv">${Object.entries(flat({title:h.title,cat:h.cat,start:h.start,end:h.end,data:h.data})).filter(([k,v])=>v!==''&&v!=null&&FIELD_L[k]).map(([k,v])=>`<tr><th>${FIELD_L[k]}</th><td>${esc(fmtV(k,v))}</td></tr>`).join('')}</table><div class="acts"><button type="button" class="btn primary sm" data-peek="${esc(r.id)}">지금 내용으로 돌아가기</button></div>`; return; }
      if(!confirm('이 예전 내용으로 되돌릴까요? (지금 내용은 고친 이력에 남습니다)')) return;
      const next=withHist(r, {...r, title:h.title, cat:h.cat, start:h.start||'', end:h.end||'', data:{...h.data}}); if(await save([next], '되돌림')){ paint(); peek(r.id); } return; }
  });
  document.addEventListener('change', e=>{
    if(e.target.id==='pastT'){ showPast=e.target.checked; paint(); return; }
    if(e.target.id==='impFile' && e.target.files[0]){ importFile(e.target.files[0]); e.target.value=''; }
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ if(!$('#modal').hidden){ $('#modal').hidden=true; return; } if(!$('#peek').hidden){ closePeek(); return; } if($('#q').value){ $('#q').value=''; paint(); } }
    if(e.key==='/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); $('#q').focus(); }
    if(e.key==='Enter' && e.target.matches && e.target.matches('[data-peek],[data-goto]')) e.target.click();
  });
  let qT; $('#q').addEventListener('input', ()=>{ clearTimeout(qT); qT=setTimeout(()=>{ closePeek(); paint(); window.scrollTo(0,0); }, 180); });
  window.addEventListener('hashchange', ()=>{ const h=toView(location.hash.slice(1)); if(h!==view){ view=h; paint(); } });
  // 머리 · 찾기 칸 고정 (2026-11-24): 높이를 재서 차례 · 고정 위치에 씀 (--mn-hh 머리 · --mn-th 찾기 칸)
  const fixTop = () => { const h=document.querySelector('body > header'), t=$('.mn-top'); const R=document.documentElement.style; R.setProperty('--mn-hh', (h?h.offsetHeight:0)+'px'); R.setProperty('--mn-th', (t?t.offsetHeight:0)+'px'); };
  fixTop(); window.addEventListener('resize', fixTop); setTimeout(fixTop, 500);
  load();
  SY.live.onRev(()=>{ if($('#modal').hidden && !busy) load(true); });
  window.SY_MANUAL = { terms, rows:()=>rows, search:q=>{ const g=terms(q); return DOCS.map(d=>({t:d.title, k:d.kind, s:score(d,g,{price:/얼마|가격|요금/.test(q)})})).filter(x=>x.s>0.6).sort((a,b)=>b.s-a.s).slice(0,8); } };   // 시험용
})();
