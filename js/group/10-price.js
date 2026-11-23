// ===================== 가격표 =====================
// 가격은 견적서&거래명세서 사이트에서 그때그때 읽어 온다 → 그 사이트의 품목·가격이 바뀌면 여기도 바뀜
//  · 기본 품목: 그 사이트 페이지의 CATALOG_RAW (품목 | 가격 | 할인 대상)와 굿즈·단체 프로그램 목록
//  · 품목 관리에서 바꾼 것: 견적서 서버(SY.quote)의 가격·숨김·추가 품목
// 불러오기 전이나 실패하면 마지막으로 받은 것을 쓴다
const QUOTE_PAGE = 'document/index.html';   // 견적서 사이트 (이 사이트 안 document/ · 예전 주소 sayuwon-invoice-quotation 도 그대로)
const QUOTE_DATA = 'document/js/document.js';   // 품목 목록(CATALOG_RAW · 굿즈 · 단체 프로그램 · TAX_SPLIT)이 들어 있는 견적서 코드
// 견적서 서버(품목 관리에서 바꾼 것 · 발급 내역)는 SY.quote (js/common.js)
const PRICE_EXCLUDE = /쉐프\s*특선|^네이버/;   // 가격표에서 뺀 품목 (음료쿠폰(몽몽차방)은 품목 관리에서 굿즈가 되어 가격표에도 보임, 2026-11-18)
let quoteCat = readJSON('sayuwon_quote_cat', null), priceLoaded = null;
const normSrc = s => String(s||'').replace(/\s/g,'');
function parseQuotePage(html){
  const m = html.match(/var CATALOG_RAW = \[([\s\S]*?)\];/); if(!m) throw new Error('품목 목록을 찾지 못함');
  const raw = [...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
  const list = name => { const mm = html.match(new RegExp('\\[([^\\]]*)\\]\\.forEach\\(function\\(n\\)\\{\\s*' + name + '\\[n\\]')); return mm ? [...mm[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]) : []; };
  let mbName={}; try{ mbName=JSON.parse((html.match(/var MABANG_NAME = (\{[^}]*\});/)||[])[1]||'{}'); }catch(_){}
  let tax={}; try{ tax=JSON.parse((html.match(/var TAX_SPLIT = (\{[\s\S]*?\});/)||[])[1]||'{}'); }catch(_){}   // 기본 과세 · 비과세 [과세, 비과세]
  return { raw, gtime:list('GROUP_TIME'), geach:list('GROUP_EACH'), goods:list('GOODS'), mabang:list('MABANG'), mbName, tax };
}
async function loadQuotePrices(){
  try{
    const [html, shared] = await Promise.all([
      fetch(QUOTE_DATA + '?t=' + Date.now()).then(r=>r.text()),
      SY.quote.get().catch(()=>null)
    ]);
    const p = parseQuotePage(html);
    const data = (shared && shared.data) || (quoteCat && {edits:quoteCat.edits, added:quoteCat.added}) || {};
    quoteCat = { ...p, edits: data.edits||{}, added: data.added||[], at: new Date().toISOString() };
    writeJSON('sayuwon_quote_cat', quoteCat); priceLoaded = true; simVer++;   // 품목이 바뀌면 열지 않은 예약의 과업도 다시 계산
    addCatalogProgs(quoteCat).forEach(f=>{ document.querySelector('#opt_'+OPT[f[0]].id+' .fields')?.insertAdjacentHTML('beforeend', isSub(f[1]) ? fieldHTML(f[1], isStf(f[1]) ? '담당' : SUB_NAME[f[1].split('_')[0]], '', 'sub'+(isStf(f[1])?' sub-stf':''), isStf(f[1])) : fieldHTML(f[1],f[2],'','pbase',false)); paintFields(); });   // 견적서 품목에 새 단체 품목이 생기면 칸 추가
  }catch(_){ priceLoaded = false; }
  paintFields(); renderPrice(); if(window.__tasksReady) renderTasks();   // 몽몽마방 메뉴 · 가격도 새로
}
// 품목 관리: 견적서 사이트를 ?catalog=1 로 띄우면 품목 관리 창만 나옴. 저장 · 닫기를 알려 주면 가격 · 메뉴를 다시 불러옴
const QUOTE_CAT_URL = './#catalog';   // 품목관리 = 시스템의 #catalog (팝업 안에서는 품목 관리 창으로 바뀜)
function openCatalog(){ const [u,h]=QUOTE_CAT_URL.split('#'); $('#catFrame').src = u + '?t=' + Date.now() + '#' + h; $('#catModal').hidden = false; }
function closeCatalogModal(){ $('#catModal').hidden = true; $('#catFrame').src = 'about:blank'; loadQuotePrices(); }
document.addEventListener('click', e=>{ if(e.target.closest('[data-open-cat]')){ e.preventDefault(); openCatalog(); } });
window.addEventListener('message', e=>{
  if(!e.data || e.data.type!=='sy-catalog' || e.source!==$('#catFrame').contentWindow) return;
  if(e.data.ev==='close') closeCatalogModal();
  if(e.data.ev==='saved'){ loadQuotePrices(); markDb('cat'); }   // 품목 관리 저장도 DB 저장 시각에
});
// 바깥을 누르거나 Esc: 품목 관리 창에 닫기를 부탁 (저장 안 한 변경이 있으면 거기서 물음)
const askCatClose = () => $('#catFrame').contentWindow?.postMessage({type:'sy-catalog', ev:'close-request'}, '*');
$('#catModal').addEventListener('click', e=>{ if(e.target.id==='catModal') askCatClose(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#catModal').hidden){ e.preventDefault(); askCatClose(); } });
// 견적서 사이트와 같은 방식으로 품목 목록을 만든다 (숨긴 품목 제외, 바꾼 가격 반영, 추가 품목 포함)
// 품목 관리에서 '몽몽마방 메뉴' 구분을 없애고 식사로 (2026-11-14): 식사 중 품목명이 '몽몽마방 '으로 시작하는 것(예: 몽몽마방 런치)도 몽몽마방 메뉴로
const mbKind = (k, src) => k==='food' && /^몽몽마방\s/.test(String(src||'')) ? 'mabang' : k;
function catalogItems(){
  if(!quoteCat) return [];
  const has = (arr, s) => (arr||[]).some(x=>normSrc(x)===normSrc(s));
  const kindOf = src => /\(관람,/.test(src) ? 'package' : has(quoteCat.mabang?.length ? quoteCat.mabang : MB_DEF.map(m=>m[0]), src) ? 'mabang' : has(quoteCat.gtime,src) ? 'gtime' : has(quoteCat.geach,src) ? 'geach' : has(quoteCat.goods,src) ? 'goods'
    : (/관람/.test(src) && !/관람권|관람식사권/.test(src)) ? 'view' : 'food';
  const out=[], seen={};
  quoteCat.raw.forEach(line=>{
    const [src, price, disc] = line.split('|'); if(seen[normSrc(src)]) return; seen[normSrc(src)]=1;
    const e = (quoteCat.edits||{})[src] || {};
    if(e.hidden) return;
    out.push({ src, name: e.name, price: e.price!=null ? Number(e.price) : (price ? Number(price) : null), sprice: e.sprice!=null ? Number(e.sprice) : null, staxable: e.staxable!=null ? Number(e.staxable) : null, staxfree: e.staxfree!=null ? Number(e.staxfree) : null, nostu: !!e.nostu, disc: e.disc!=null ? !!e.disc : disc==='1', kind: mbKind((e.kind==='food' && MB_DEF.some(m=>normSrc(m[0])===normSrc(src))) ? 'mabang' : (e.kind || kindOf(src)), src),
      taxable: e.taxable!=null ? Number(e.taxable) : ((quoteCat.tax||{})[src]||[])[0], taxfree: e.taxfree!=null ? Number(e.taxfree) : ((quoteCat.tax||{})[src]||[])[1] });   // 과세 · 비과세 (품목 관리 값 우선)   // 예전에 '식사'로 바꿔 둔 기본 몽몽마방 메뉴도 메뉴로
  });
  (quoteCat.added||[]).forEach(a=>{ if(a.hidden) return; out.push({ src: a.src || a.name, name: a.name, price: a.price!=null ? Number(a.price) : null, sprice: a.sprice!=null ? Number(a.sprice) : null, staxable: a.staxable!=null ? Number(a.staxable) : null, staxfree: a.staxfree!=null ? Number(a.staxfree) : null, nostu: !!a.nostu, disc: !!a.disc, kind: mbKind(a.kind || 'food', a.src || a.name), taxable: a.taxable!=null ? Number(a.taxable) : undefined, taxfree: a.taxfree!=null ? Number(a.taxfree) : undefined }); });
  // 성인 · 학생 가격 (2026-11-20 · 견적서 품목 관리와 같음): 「(학생)」 품목은 그 성인 품목의 학생 가격(sprice)으로 합치고 merged 로 표시 (고르는 목록엔 안 보임 · 상품명으로 찾으면 가격 = 학생 가격)
  const by={}; out.forEach(it=>{ by[normSrc(it.src)] ||= it; });
  out.forEach(it=>{ const s=String(it.src||''); if(s.indexOf('(학생)')<0) return; it.merged=true;   /* 학생 품목은 성인 품목이 없어도(숨김 등) 고르는 목록에서 뺌 */ const base=[s.replace('(학생)',''), s.replace(/\s*관람\(학생\)/,'(관람)')].map(b=>by[normSrc(b)]).find(b=>b && b!==it); if(!base) return;
    it.stuOf=base.src; if(base.nostu) return;   // 품목 관리에서 「학생 빼기」
    if(base.sprice==null && it.price!=null) base.sprice=it.price; if(base.staxable==null && it.taxable!=null) base.staxable=it.taxable; if(base.staxfree==null && it.taxfree!=null) base.staxfree=it.taxfree;   // 학생 과세 · 비과세도 (학생 행)
    it.price = base.sprice!=null ? base.sprice : it.price; it.taxable=base.staxable; it.taxfree=base.staxfree; });
  return out;
}
// 과세 · 비과세 1인 금액 (품목 관리): 비과세 = 사유원(입장료), 과세 = 신라. 둘 다 없으면 null
const taxOf = src => { const it = catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(!it) return null; const tx=Number(it.taxable)||0, tf=Number(it.taxfree)||0; return (it.taxable==null && it.taxfree==null) || tx+tf<=0 ? null : {tx, tf}; };
const priceOf = src => { const it = catalogItems().find(x=>normSrc(x.src)===normSrc(src)); return it ? it.price : null; };
const won = n => n==null ? '-' : Number(n).toLocaleString('ko-KR');
// 품목 이름을 보기 좋게: "주말/공휴일(관람, 사담 런치1부)" → "관람 + 사담 런치1부", "해설사도슨트(수정)" → "해설사 도슨트"
function itemLabel(src){
  const mb = quoteCat && mbMenus().find(m=>normSrc(m.src)===normSrc(src)); if(mb) return '몽몽마방 '+mb.name;   // 몽몽마방 메뉴는 품목 관리의 품명
  let s = String(src||'').replace(/\((수정|변경)\)/g,'').replace(/\(\d{1,2}:\d{2}~\d{1,2}:\d{2}\)/,'').replace(/^(평일|주말\/공휴일|공휴일)\s*/,'').trim();
  const pk = s.match(/^\(관람,\s*(.+)\)$/); if(pk) s = '관람 + ' + pk[1];
  s = s.replace(/^관람\(학생\)$/,'관람 (학생)').replace(/^해설사도슨트$/,'해설사 도슨트').replace(/^임원도슨트$/,'임원 도슨트').replace(/^요가프로그램\(단체\)$/,'요가 프로그램').replace(/^\(관람\)$/,'관람');
  const sm = s.match(/^\((.+)\)$/); if(sm) s = sm[1];   // "(사담 다이닝 썸머 스페셜 런치)" → 괄호 벗기기
  return s || src;
}
// 전체 가격표: 묶음별로, 평일·주말 짝은 한 줄로
function priceSections(){
  const SEC = { view:'관람', package:'관람 + 식사', food:'식사', gtime:'단체 프로그램 (회당)', geach:'단체 프로그램 (1인)' };   // 품목 관리와 같은 순서, 몽몽마방 메뉴도 식사로
  const groups = {};
  catalogItems().forEach(it=>{
    if(!SEC[it.kind] || PRICE_EXCLUDE.test(it.src) || it.price==null) return;
    const label = it.kind==='mabang' ? ((mbMenus().find(m=>m.src===it.src)||{}).name || itemLabel(it.src)) : itemLabel(it.src), key = it.kind + '|' + label;
    const g = groups[key] || (groups[key] = { kind:it.kind, name:label, src:it.src, perTime: it.kind==='gtime' });
    if(/^평일/.test(it.src)){ if(g.wd==null) g.wd=it.price; }
    else if(/^(주말|공휴일)/.test(it.src)){ if(g.we==null) g.we=it.price; }
    else if(g.one==null) g.one=it.price;
  });
  return Object.keys(SEC).map(k=>[SEC[k], Object.values(groups).filter(g=>(g.kind==='mabang'?'food':g.kind)===k).map(g=>{
    if(g.one==null && (g.wd==null || g.we==null)) g.one = g.wd ?? g.we;   // 한쪽만 있으면 한 가격으로
    if(g.one!=null && g.wd!=null && g.we!=null) delete g.one;
    return g; })]).filter(([,rows])=>rows.length);
}
// ---------- 할인 ----------
// 단체 할인: 20명 미만 사전예약 5%, 20명 이상 단체예약 10% → 관람 · 관람+사담(런치 · 디너) 상품에만
// 특별 할인(사람마다): 그 사람은 단체 할인과 비교해 큰 쪽 하나만
const SPECIAL = [
  {k:'dKansong', name:'간송미술관 제휴', short:'간송', rate:.15, proof:'간송미술관 방문 티켓 (방문일 기준 6개월 이내 것)'},
  {k:'dMerit',   name:'국가유공자',       short:'국가유공자', rate:.30, proof:'국가유공자 증서'},
  {k:'dGunwi',   name:'군위 주민',        short:'군위 주민', rate:.50, proof:'주민등록증 또는 등본 (거주지 확인)'},
  {k:'dClergy',  name:'대구대교구 신부·수녀·신학생', short:'대구대교구', rate:1, proof:'소속 증명서 또는 신분증'},
  {k:'dStaff',   name:'직원',             short:'직원', rate:.30, proof:'사원증 (직원 확인)'},   // 2026-11-17 직원 할인 30%
  {k:'dGuide',   name:'가이드(무료)',     short:'가이드(무료)', rate:1, proof:''},   // 2026-11-20 여행사 가이드 무료 (전산: * 가이드(무료) 성인 1명 100%) · 증빙 없음
];
// ===== 특별 할인 종류 편집 (2026-11-17): 특별할인 팝업의 「편집」 → 이름 · 할인율 · 증빙을 고치고, 새 할인 추가 · 빼기 =====
// 공유 기록 한 줄(id spdisc, 통화 구분 '특별할인설정')의 수정 기록 칸에 {list:[{k,name,short,rate,proof,off,olds}], at, by} → 모든 직원이 같은 목록
//  k(저장 키)는 바뀌지 않음 → 이미 저장된 예약 인원은 그대로. 뺀 할인(off)은 팝업에서만 숨김 (그 할인이 들어간 예약은 계산 · 비고 그대로). 이름을 바꾸면 예전 이름(olds)도 읽음
var SPD_ID='spdisc', SPD_TYPE='특별할인설정';
const SPECIAL_BASE = SPECIAL.map(s=>({...s})), SPECIAL_LABEL_BASE = {...SPECIAL_LABEL};
let spdSig='';
function spdList(){ const r=(cache||[]).find(x=>x.id===SPD_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return Array.isArray(j.list)&&j.list.length ? j.list.concat(SPECIAL_BASE.filter(b=>!j.list.some(x=>x&&x.k===b.k))) : SPECIAL_BASE; }   // 공유 목록에 없는 새 기본 할인(가이드 무료 등)은 뒤에 붙임
function applySpd(){ try{
  const list=spdList(), sig=JSON.stringify(list); if(sig===spdSig) return false; spdSig=sig;
  SPECIAL.splice(0, SPECIAL.length, ...list.filter(s=>s && s.k && (s.short||s.name)).map(s=>({k:s.k, name:String(s.name||s.short), short:String(s.short||s.name), rate:Math.min(1, Math.max(0, +s.rate||0)), proof:String(s.proof||''), off:!!s.off, olds:Array.isArray(s.olds)?s.olds:[]})));
  SPECIAL.forEach(s=>{ const b=SPECIAL_BASE.find(x=>x.k===s.k); SPECIAL_LABEL[s.k] = b && b.short===s.short ? SPECIAL_LABEL_BASE[s.k] : s.short+' 할인'; LABEL[s.k]=SPECIAL_LABEL[s.k]; if(!SP_KEYS.includes(s.k)) SP_KEYS.push(s.k); });
  if(typeof spKey!=='undefined' && spKey!=null && !$('#spModal').hidden && $('#spEdit').hidden) openSp(spKey);   // 다른 직원이 바꾼 목록을 받으면 열린 팝업도
  return true; }catch(_){ return false; } }
function spdRowHTML(s){ return `<tr data-spdk="${esc(s.k)}"${s.off?' class="off"':''}><td><input class="spd-short" value="${esc(s.short)}" data-ime="ko" maxlength="20"></td>`
  + `<td><input class="spd-rate" value="${s.rate>=1?100:Math.round((s.rate||0)*100)||''}" inputmode="numeric" maxlength="3" placeholder="30">%</td>`
  + `<td><input class="spd-proof" value="${esc(s.proof)}" data-ime="ko" placeholder="방문 때 지참"></td>`
  + `<td><label class="spd-off" title="빼면 팝업에 안 보임 (이미 넣은 예약은 그대로)"><input type="checkbox" class="spd-offck"${s.off?' checked':''}> 빼기</label></td></tr>`; }
function openSpd(){ $('#spEditBody').innerHTML = SPECIAL.map(spdRowHTML).join(''); $('#spEdit').hidden=false; $('#spMain').hidden=true; $('#spEditBtn').hidden=true;
  $('#spEditMsg').textContent = (()=>{ const r=(cache||[]).find(x=>x.id===SPD_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return j.at ? `마지막 수정 ${fmt(j.at)}${j.by?' · '+j.by:''}` : ''; })(); }
function closeSpd(){ $('#spEdit').hidden=true; $('#spMain').hidden=false; $('#spEditBtn').hidden=false; }
async function saveSpd(){
  const rows=[...document.querySelectorAll('#spEditBody tr')], prev=Object.fromEntries(SPECIAL.map(s=>[s.k,s])), list=[];
  for(const tr of rows){ const short=tr.querySelector('.spd-short').value.trim(), rv=tr.querySelector('.spd-rate').value.replace(/\D/g,''), proof=tr.querySelector('.spd-proof').value.trim(), off=tr.querySelector('.spd-offck').checked, k=tr.dataset.spdk;
    if(!short && !rv && !proof && !prev[k]) continue;   // 비워 둔 새 줄은 건너뜀
    if(!short){ toast('할인 이름을 넣어 주세요.'); tr.querySelector('.spd-short').focus(); return; }
    const rate=+rv; if(!rv || rate<=0 || rate>100){ toast(`${short}: 할인율을 1~100으로 넣어 주세요 (100 = 무료).`); tr.querySelector('.spd-rate').focus(); return; }
    if(list.some(x=>x.short===short)){ toast(`'${short}' 이름이 두 번 있습니다.`); return; }
    const p=prev[k], olds=[...((p&&p.olds)||[])]; if(p && p.short!==short && !olds.includes(p.short)) olds.push(p.short);   // 이름을 바꾸면 예전 이름도 기억 (저장된 예약을 읽을 때)
    list.push({k, name: p && p.short===short ? p.name : short, short, rate: rate>=100 ? 1 : rate/100, proof, off, ...(olds.length?{olds}:{})}); }
  if(!list.some(s=>!s.off)){ toast('쓰는 특별 할인이 하나는 있어야 합니다.'); return; }
  const old=(cache||[]).find(x=>x.id===SPD_ID), now=new Date().toISOString(), me=savedOwner()||'';
  const item={...(old||{}), id:SPD_ID, callType:SPD_TYPE, saved:now, takenBy:me, summary:`특별 할인 종류 ${list.filter(s=>!s.off).length}개`, history:JSON.stringify({list, at:now, by:me})};
  try{ await store.put(item); }catch(e){ toast('저장하지 못했습니다: '+e.message); return; }
  const ci=cache.findIndex(x=>x.id===SPD_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  applySpd(); closeSpd(); if(spKey!=null) openSp(spKey); itemChanged(false, true); renderSide(); toast('특별 할인 종류를 저장했습니다. 모든 직원에게 같은 목록이 보입니다.');
}
document.addEventListener('click', e=>{
  if(e.target.id==='spEditBtn'){ openSpd(); return; }
  if(e.target.id==='spEditCancel'){ closeSpd(); return; }
  if(e.target.id==='spEditSave'){ saveSpd(); return; }
  if(e.target.id==='spEditAdd'){ $('#spEditBody').insertAdjacentHTML('beforeend', spdRowHTML({k:'dx'+Date.now().toString(36), short:'', rate:0, proof:''})); $('#spEditBody tr:last-child .spd-short').focus(); return; }
});
document.addEventListener('change', e=>{ if(e.target.classList?.contains('spd-offck')) e.target.closest('tr').classList.toggle('off', e.target.checked); });
applySpd();
function groupRate(n){ return !n ? 0 : n>=20 ? .10 : .05; }   // 20명부터 단체예약 10% (2026-11-17, 견적서와 같게)
function specialCounts(r){ return SPECIAL.map(s=>({...s, n: Math.max(0, parseInt(r[s.k])||0)})).filter(s=>s.n>0); }
// 선택한 항목 예상 금액 (견적서 발급과 같은 계산) + 전체 가격표(버튼으로)
const discPct = name => (/관람/.test(name) && !/\(관람,/.test(name)) || /사담\s*런치/.test(name);
function blockAmount(b, price){
  if(price==null) return null;
  // 학생(b.stu명)은 1인 가격이 b.stuDiff 만큼 낮음 (품목 관리의 학생 관람 가격) — 앞에서부터 성인, 뒤가 학생으로 셈 (2026-11-20)
  const ns=Math.min(b.stu||0, b.qty), na=b.qty-ns, sd=b.stuDiff||0; let pos=0;
  const val=(c, pct)=>{ const aC=Math.max(0, Math.min(c, na-pos)); pos+=c; return (aC*price + (c-aC)*(price-sd))*(1-pct/100); };
  let left=b.qty, sum=0; const parts=[];
  (b.notes||[]).forEach(nt=>{ const m=nt.match(/(\d+)\s*명\s+(\d+)%/); if(!m) return; const c=Math.min(+m[1],left), p=+m[2]; left-=c; sum+=val(c, p); parts.push(`${p}% ${c}명`); });
  sum+=val(left, 0);
  return { amount: Math.round(sum), disc: parts.join(' · ') };
}
// ===== 학생 (2026-11-20): 관람 · 관람+식사 줄은 모두 성인이 기본, 줄마다 「학생」 인원을 넣으면 그만큼 학생 가격 =====
// rec.istu = "sadam1=5; v:관람(09:00~18:00)=3" (줄 key = 할인 버튼과 같은 dkey) · 학생 가격 = 품목 관리의 「○○ 관람(학생)(시간대)」 · 관람+식사는 관람 부분만 학생 가격 (견적서와 같음)
const istuMap = r => Object.fromEntries(String((r&&r.istu)||'').split(/\s*;\s*/).map(s=>{ const i=s.lastIndexOf('='); return i>0 ? [s.slice(0,i).trim(), Math.max(0, parseInt(s.slice(i+1))||0)] : null; }).filter(x=>x && x[1]>0));
// 학생 가격이 성인과 다른 품목만 성인 · 학생으로 나눠 받음 (품목 관리의 「└ 학생」 행). 학생 가격이 없거나 같으면 인원을 한꺼번에 (2026-11-20)
const itemSrcOf = (k, r=rec) => itemKind(k)==='sadam' ? `${r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'}(관람, ${{sadam1:'사담 런치1부', sadam2:'사담 런치2부', sadamD:'사담 디너'}[k]})` : itemKind(k)==='varea' ? daySrc(k.slice(2), r) : '';
const stuItemOf = src => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); return it && !it.merged && it.sprice!=null && it.price!=null && it.sprice!==it.price ? it : null; };
const canStu = (k, r=rec) => (itemKind(k)==='sadam' || (itemKind(k)==='varea' && !/학생/.test(k) && !/해오름/.test(k))) && !!stuItemOf(itemSrcOf(k, r));
const itemStu = k => istuMap(rec)[dkey(k)] || 0;
function setItemStu(k, n){ const m=istuMap(rec), kk=dkey(k); n=Math.max(0, parseInt(n)||0); if(n) m[kk]=n; else delete m[kk]; const s=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); if(s!==String(rec.istu||'')){ rec.istu=s; touched.add('istu'); } }
function stuDiffOf(src){ const it=stuItemOf(src); return it ? it.price-it.sprice : 0; }   // 학생 1명당 차이 (성인 가격 − 학생 가격, 그 품목의 학생 행)
// 학생 1인 가격을 과세 · 비과세로: 학생 행의 과세 · 비과세(비율) → 관람+식사는 그날 관람권의 학생 가격(없으면 성인)만큼 비과세 → 관람권은 모두 비과세 → 그 밖은 과세
function stuSplitOf(src, sp, r){
  const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(!it) return {tx:sp, tf:0};
  const tx=Number(it.staxable)||0, tf=Number(it.staxfree)||0; if((it.staxable!=null || it.staxfree!=null) && tx+tf>0){ const f=Math.round(sp*tf/(tx+tf)); return {tx:sp-f, tf:f}; }
  if(/\(관람,/.test(src)){ const v=catalogItems().find(x=>normSrc(x.src)===normSrc(viewSrcOf(r||rec))), vp = v ? (v.sprice!=null && !v.nostu ? v.sprice : v.price) : null; if(vp!=null && vp<sp) return {tx:sp-vp, tf:vp}; }
  if(it.kind==='view') return {tx:0, tf:sp};
  return {tx:sp, tf:0}; }
// 1인 가격을 과세(신라) · 비과세(사유원)로: 품목 관리의 과세 · 비과세(비율) → 관람+식사는 그날 관람권 가격만큼 비과세 → 관람권은 모두 비과세 → 그 밖은 모두 과세
function splitOf(src, price, r){
  const tax=taxOf(src); if(tax){ const tf=Math.round(price*tax.tf/(tax.tx+tax.tf)); return {tx:price-tf, tf}; }
  if(/\(관람,/.test(src)){ const vp=priceOf(viewSrcOf(r||rec)); if(vp!=null && vp<price) return {tx:price-vp, tf:vp}; }
  const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(it && it.kind==='view') return {tx:0, tf:price};
  return {tx:price, tf:0};
}
// 줄 금액 (실제 결제 금액): 정상가 · 할인(과세 · 비과세 따로, 할인액을 직접 고쳤으면 그 값) · 결제 금액(과세 · 비과세)
function blockMoney(b, r){
  const p = b.price ?? priceOf(b.product), a = blockAmount(b, p); if(!a) return null;
  // 성인 · 학생 따로 (2026-11-20): 학생은 학생 가격 · 학생 과세 · 비과세 (품목 관리의 학생 행)
  const ns = Math.min(b.stu||0, b.qty), na = b.qty-ns, sp = p-(b.stuDiff||0);
  const u = b.price!=null ? {tx:p, tf:0} : splitOf(b.product, p, r), us = ns ? (b.price!=null ? {tx:sp, tf:0} : stuSplitOf(b.product, sp, r)) : {tx:0, tf:0};
  const fTx=u.tx*na + us.tx*ns, fTf=u.tf*na + us.tf*ns, full=fTx+fTf;
  const d=full-a.amount, aTf = full ? Math.round(d*fTf/full) : 0, aTx=d-aTf;   // 할인 버튼(%)으로 계산한 할인을 과세 · 비과세 비율로
  const ov=idamtMap(r||rec)[dkey(b.key||'')];
  const dTx = ov ? Math.min(ov.tx, fTx) : aTx, dTf = ov ? Math.min(ov.tf, fTf) : aTf;
  return { p, full, fTx, fTf, aTx, aTf, dTx, dTf, ov:!!ov, tx:fTx-dTx, tf:fTf-dTf, amount:full-dTx-dTf, disc:a.disc };
}
function renderPrice(){
  const box=$('#priceBox'); if(!box) return;
  let day=null; if(rec.date){ const d=new Date(rec.date+'T00:00'); if(!isNaN(d)) day = isRedDay(rec.date) ? 'we' : 'wd'; }
  const n = numOf(rec.people), g = groupRate(n), sp = specialCounts(rec);
  $('#priceHint').textContent = day ? `${dateLabel(rec.date)} → ${day==='we'?(HOLIDAYS.has(rec.date)?'공휴일(주말)':'주말'):'평일'} 가격` : '';
  $('#discGroup').innerHTML = n
    ? ''   // 특별 할인 요약은 없앰 (품목 줄의 「특별할인」 버튼에 바로 보임)
    : '<span class="hint" style="margin:0">관람 인원을 넣으면 할인(19명까지 사전예약 5% · 20명부터 단체예약 10%)이 계산됩니다</span>';
  SPECIAL.forEach(s=>{ const el=$('#'+s.k); if(el && document.activeElement!==el) el.value = rec[s.k]||''; el?.classList.toggle('has', !!rec[s.k]); });
  { const es=etcSplit(rec); [['etcDiscTx',es.tx],['etcDiscTf',es.tf],['etcDiscWhy',null]].forEach(([k,v])=>{ const el=$('#'+k); if(el && document.activeElement!==el) el.value = v==null ? (rec[k]||'') : (v?String(v):''); }); }   // 기타 할인 칸
  // 전산 내역을 붙여넣었으면 예약 칸으로 계산한 예상 금액 · 할인 칸은 숨기고 전산 내역이 가격표
  const useErp = erpList.length>0;
  $('.disc-box').style.display = useErp ? 'none' : '';
  $('#selTitle').hidden = useErp; box.hidden = useErp;
  $('#erpPasteBtn').textContent = '전산 내역 붙여넣기'; $('#erpPasteBtn').parentElement.hidden = useErp;   // 붙여넣은 뒤에는 전산 합계 제목 옆 「전산 내역 다시 붙여넣기」 (2026-11-19)
  priceInfo = null;
  if(useErp){ box.innerHTML=''; $('#priceHint').textContent = '전산 내역 기준'; }
  // 1) 선택한 항목
  else if(!rec.date || !n){   // 방문일 · 관람 인원이 둘 다 있어야 계산. 하나만 있으면 나머지를 넣어 달라고
    box.innerHTML = rec.date && !n ? '<p class="price-need"><b>관람 인원</b>을 입력해 주세요. 방문일과 관람 인원이 있어야 금액이 나옵니다.</p>'
      : n && !rec.date ? '<p class="price-need"><b>방문일</b>을 입력해 주세요. 평일 · 주말 가격이 달라 방문일이 있어야 금액이 나옵니다.</p>'
      : '<p class="hint" style="margin:0">방문일과 관람 인원을 넣으면, 예약 칸에서 고른 관람 · 식사 · 프로그램의 금액이 여기에 나옵니다.</p>';
  } else if(!quoteCat){
    box.innerHTML = '<p class="hint" style="margin:0">견적서 사이트에서 가격을 불러오는 중입니다.</p>';
  } else {
    const {blocks, skipped} = quoteBlocks(rec);
    let total=0; const missing=[]; priceInfo={};
    const rows = blocks.map(b=>{
      const p = b.price ?? priceOf(b.product), a = blockAmount(b, p), m = blockMoney(b, rec);
      priceInfo[normSrc(b.product)] = {qty:b.qty, p, a, b, m};   // 예약 내역 줄마다 금액 (b: 할인 버튼, m: 과세 · 비과세 · 할인액)
      if(m) total += m.amount; else missing.push(itemLabel(b.product));
      const unit = PROG_KEYS().some(k=>rec[k] && progSrc(k, rec)===b.product && UNIT(k)==='시간') ? '시간' : goodsParse(rec.goods).some(g=>normSrc(g.src)===normSrc(b.product)) ? '개' : '명';   // 굿즈는 개
      const tm = b.product.match(/^(평일|주말\/공휴일) 관람\((\d\d):00~(\d\d):00\)$/) || [];
      const lab = itemLabel(b.product) + (tm[2] ? ` (${+tm[2]}~${+tm[3]}시)` : '');   // 관람권 시간대 표시
      return `<tr><td>${esc(lab)}</td><td>${b.qty}${unit}</td><td>${p==null?'-':won(p)}</td><td>${a&&a.disc?`<span class="dtag">${esc(a.disc)}</span>`:''}</td><td class="tot">${a?won(a.amount):'가격 없음'}</td></tr>`;
    }).join('');
    const etc=etcAmt(rec); total=Math.max(0,total-etc);   // 기타 할인
    const etcRow = etc ? `<tr class="etc-row"><td>기타 할인${rec.etcDiscWhy?` (${esc(rec.etcDiscWhy)})`:''}</td><td></td><td></td><td><span class="dtag">${(es=>[es.tf&&`비과세(사유원) -${won(es.tf)}`, es.tx&&`과세(신라) -${won(es.tx)}`].filter(Boolean).join(' · '))(etcSplit(rec))}</span></td><td class="tot">-${won(etc)}</td></tr>` : '';
    const ms=moneySplit(rec);
    void rows;   // 품목별 금액은 예약 내역 줄에 (가격표와 예약 내역을 합침)
    box.innerHTML = `<table class="ptable sel"><tbody>${etcRow}</tbody>`
      + `<tfoot><tr><td colspan="4">예상 합계 (부가세 포함)</td><td class="tot">${won(total)}</td></tr>`
      + (ms ? `<tr class="split-row"><td colspan="4">└ 사유원 (비과세 · 입장료)</td><td class="tot">${won(ms.saw)}</td></tr><tr class="split-row"><td colspan="4">└ 신라 (과세)</td><td class="tot">${won(ms.shilla)}</td></tr>` : '')
      + `</tfoot></table>`
      + (skipped.length||missing.length ? `<p class="hint">${[...skipped,...missing].join(', ')}은(는) 견적서 품목에 없어 합계에서 빠졌습니다.</p>` : '');
  }
  // 2) 전체 가격표 (버튼으로 펼침)
  const all=$('#priceAll'); if(all && !all.hidden) all.innerHTML = fullPriceHTML(day, g);
  renderErp();   // 붙여넣은 전산 내역
  paintItemPrices();   // 예약 내역 줄마다 금액
  $('#priceSrc').textContent = '견적서&거래명세서 사이트 품목 기준' + (quoteCat&&quoteCat.at ? ` (${fmtAgo(quoteCat.at)} 불러옴)` : '') + ' · 부가세 포함 · 공휴일은 주말 가격' + (priceLoaded===false ? ' · 견적서 사이트를 불러오지 못해 마지막으로 받은 가격으로 표시' : '');
}
function fullPriceHTML(day, g){
  let html='';
  priceSections().forEach(([title, rows])=>{
    html += `<div class="psec"><div class="psec-t">${title}</div><table class="ptable"><thead><tr><th>항목</th><th>평일</th><th>주말</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const one = r.one!=null, disc = discPct(r.src||'') && g>0;
      const cell=(p,side)=>{ const active = one ? !!day : day===side; const cls = one ? (day?'on':'') : !day ? '' : active ? 'on' : 'off';
        return `<td class="${cls}"${one?' colspan="2"':''}>${active&&disc?`<s>${won(p)}</s>${won(Math.round(p*(1-g)))}`:won(p)}${r.perTime?' (회)':''}</td>`; };
      html += `<tr><td>${esc(r.name)}${disc?`<span class="dtag">-${Math.round(g*100)}%</span>`:''}</td>${one?cell(r.one):cell(r.wd,'wd')+cell(r.we,'we')}</tr>`;
    });
    html += '</tbody></table></div>';
  });
  return html || '<p class="hint">견적서 사이트 품목을 불러오는 중입니다.</p>';
}
// 전체 가격표 보기 / 접기
if($('#priceAllBtn')) $('#priceAllBtn').onclick=()=>{ const a=$('#priceAll'), open=a.hidden; a.hidden=!open; $('#priceAllBtn').textContent = open ? '전체 가격표 접기' : '전체 가격표 보기'; $('#priceAllBtn').setAttribute('aria-expanded', open); renderPrice(); };
