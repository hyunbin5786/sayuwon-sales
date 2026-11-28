// ===== 공통 (모든 화면이 맨 먼저 읽음) =====
// 여러 파일에 똑같이 복사돼 있던 설정 · 작은 도구를 한곳에. 각 화면은 이것을 그대로 쓰거나 (const esc = SY.esc) 감싸서 씀
//
// ── 서버(공유 기록)로 가는 길은 이 파일 하나 (2026-11-23 리팩토링) ──
//  화면 코드는 fetch 로 서버 주소를 직접 부르지 않고 아래 넷만 씀. DB · 서버를 바꿀 때는 맨 아래 SY_BACKEND(주소 · 보내는 방법)만 바꾸면 됨
//   SY.call(body)     공유 기록 서버에 요청 {action:'put'|'del'|'list'|…} → 응답(JSON). ok 가 아니면 Error(e.code = 서버가 준 error) 를 던짐
//   SY.callRaw(body)  같은 요청, 던지지 않고 응답 그대로 (로그인 확인처럼 ok:false 도 직접 보는 곳)
//   SY.beacon(body)   창을 닫는 순간에 보내는 요청 (고치는 중 표시 풀기) — 응답을 기다리지 않음
//   SY.quote.get(query) · SY.quote.post(body)   견적서 (품목 목록 · 발급 내역 — 같은 서버의 quoteGet · quotePost)
//  모든 요청에 로그인(이름 + 사번 = who)을 붙임 → 서버가 멤버 목록으로 확인 (예전 팀 비밀번호 key 는 2026-11-23에 완전히 없앰)
//
//  로컬 미리보기에서 진짜 DB 에 쓰지 않고 시험하기: 주소 끝에 ?mock=1 (끄기 ?mock=0) → js/devcf.js 가 서버 코드(cloudflare/worker.js)를 브라우저 안 SQLite 로 돌림 (localhost 에서만 · docs 13절)
//
// ── 시험용 모드 칸막이 (2026-11-25 사고 뒤) ──
//  시험용 모드 화면과 진짜 화면이 같은 브라우저 저장소(localStorage · IndexedDB · 화면끼리 알림 BroadcastChannel)를 같이 쓰면
//  시험용에서 만든 저장 대기열 · 예약 사본이 진짜 화면으로 넘어가 진짜 DB 에 올라감 (2026-11-25 테스트 사이트에서 실제로 일어남 → 가짜 예약이 배포 사이트에 보임)
//  → 시험용 모드에서는 저장소 이름 앞에 「mock:」을 붙여 완전히 따로 씀 (로그인 sy_user · sayuwon_owner · 시험용 스위치 · 가짜 DB 자체는 그대로)
//  시험용 모드는 이 컴퓨터(localhost)에서만 켜짐 — 배포 · 테스트 사이트(github.io)에서는 ?mock=1 을 붙여도 아무 일도 없음
// 저장소 칸막이: 이름 앞에 pre(「mock:」 · 「test:」)를 붙여 다른 환경과 완전히 따로 씀 (로그인 · 시험용 스위치 · 가짜 DB 자체는 그대로)
//  테스트 사이트(「test:」)는 로그인(sy_user · sayuwon_owner)도 따로 (2026-11-25 · 테스트 DB 멤버는 배포와 다름 — 테스트 사이트에서 「테스트」로 로그인해도 배포 사이트 로그인은 그대로)
//  HTML 머리의 로그인 확인 줄도 테스트 사이트면 test:sy_user 를 읽음
function syWall(pre){ try{
  const KEEP = pre==='test:' ? /^(sy_mock|sy_cf_db|sy_cf_ver|mock:.*|test:.*)$/ : /^(sy_mock|sy_cf_db|sy_cf_ver|sy_user|sayuwon_owner|mock:.*|test:.*)$/, K=k=>KEEP.test(String(k)) ? k : pre+k, P=Storage.prototype;
  const g=P.getItem, s=P.setItem, r=P.removeItem;
  P.getItem=function(k){ return g.call(this, K(k)); }; P.setItem=function(k,v){ return s.call(this, K(k), v); }; P.removeItem=function(k){ return r.call(this, K(k)); };
  if(window.indexedDB){ const o=indexedDB.open.bind(indexedDB), d=indexedDB.deleteDatabase.bind(indexedDB); indexedDB.open=(n,v)=>o(pre+n, v); indexedDB.deleteDatabase=n=>d(pre+n); }
  if(window.BroadcastChannel){ const BC=window.BroadcastChannel; window.BroadcastChannel=function(n){ return new BC(pre+n); }; }
}catch(_){} }
const SY_MOCK_ON = (function(){
  if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return false;
  try{ const q=new URLSearchParams(location.search).get('mock'); if(q==='1' || q==='cf') localStorage.setItem('sy_mock', '1'); if(q==='0') localStorage.removeItem('sy_mock');
    if(!localStorage.getItem('sy_mock')) return false;
    syWall('mock:'); return true;
  }catch(_){ return false; } })();
// ── 테스트 DB 분리 (2026-11-25) ──
//  테스트 사이트(…/sayuwon-sales/test/)와 이 컴퓨터(localhost, 시험용 모드가 아닐 때)는 배포 사이트와 다른 서버 · DB(TEST_API_URL)를 씀
//  TEST_API_URL 이 비어 있으면 아직 따로 만든 서버가 없다는 뜻 → 예전처럼 배포 DB 를 씀 (테스트 사이트 위 빨간 이름표에 「DB = 배포」로 표시)
//  테스트 사이트는 배포 사이트와 같은 주소(github.io)라 브라우저 저장소를 같이 씀 → 「test:」 칸막이로 따로 (저장 대기열 · 예약 사본이 섞여 다른 DB 로 새지 않게)
const SY_TEST_API_URL = "https://sayuwon-api-test.serendipity5786-9e7.workers.dev/";   // 테스트용 Cloudflare Worker sayuwon-api-test + D1 sayuwon-test (2026-11-25) — 테스트 사이트 · localhost 가 이 DB 를 씀 · 비우면 배포 DB
const SY_TEST_SITE = /^\/sayuwon-sales\/test(\/|$)/.test(location.pathname) || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !SY_MOCK_ON);
if(SY_TEST_SITE && /^\/sayuwon-sales\/test(\/|$)/.test(location.pathname)) syWall('test:');
const SY_DB_NAME = SY_MOCK_ON ? '시험용 가짜 DB' : SY_TEST_SITE && SY_TEST_API_URL ? '테스트 DB' : '배포 DB';
const SY_BACKEND = {
  API_URL:   (SY_TEST_SITE && SY_TEST_API_URL) || "https://sayuwon-api.serendipity5786-9e7.workers.dev/",   // 공유 기록 (cloudflare/worker.js · 2026-11-23 구글 시트에서 옮김 · 되돌릴 때: https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec)
  // Content-Type 을 붙이지 않아야 서버로 사전 확인(preflight) 요청 없이 바로 감 (cloudflare/worker.js 도 그렇게 받음)
  main(body){ return fetch(this.API_URL, {method:'POST', body:JSON.stringify(body)}).then(r=>r.json()); },
  beacon(body){ const s=JSON.stringify(body); try{ if(navigator.sendBeacon && navigator.sendBeacon(this.API_URL, s)) return; }catch(_){} fetch(this.API_URL, {method:'POST', body:s, keepalive:true}).catch(()=>{}); },
  // 견적서 서버(품목 목록 · 발급 내역)도 2026-11-23부터 같은 서버의 동작(quoteGet · quotePost) — 예전에는 QUOTE_URL(다른 Apps Script · 로그인 확인 없음)로 따로 갔음
  quoteGet(query){ const p=new URLSearchParams(query||''); return this.main(SY.sign({action:'quoteGet', history:p.get('history') ? 1 : 0, limit:+p.get('limit')||0})); },
  quotePost(body){ return this.main(SY.sign({...body, action:'quotePost'})); },
};
const SY = Object.freeze({
  API_URL: SY_BACKEND.API_URL,
  USER_LS: 'sy_user',
  DOW: '일월화수목금토',
  // ---- 서버 요청 ----
  // 요청에 로그인을 붙임 (이미 who 가 있으면 그대로)
  sign: body => { const b={...body}, u=SY.user(); if(u && !b.who) b.who={name:u.name, emp:u.emp}; return b; },
  // 시험용 가짜 예약(id mock0001 · fake001 · tst001 …)은 배포 DB 에 절대 저장하지 않음 (테스트 DB · 시험용 DB 는 됨) (2026-11-25 사고 뒤 안전장치 · 저장 대기열에 남아 있어도 「된 것」으로 치고 버림)
  callRaw: body => SY.fakePut(body) ? Promise.resolve({ok:true, skipped:'fake'}) : SY_BACKEND.main(SY.sign(body)),
  fakePut: body => SY_DB_NAME==='배포 DB' && !!body && body.action==='put' && !!body.item && /^(mock\d{4}|fake\d{3}|tst\d{3})$/.test(String(body.item.id||'')),
  call: async body => { if(SY.fakePut(body)) return {ok:true, skipped:'fake'}; const j=await SY_BACKEND.main(SY.sign(body)); if(!j || !j.ok){ const e=new Error((j && j.error)||'error'); e.code=j && j.error; throw e; } return j; },
  beacon: body => SY_BACKEND.beacon(SY.sign(body)),
  quote: Object.freeze({ get: query => SY_BACKEND.quoteGet(query||''), post: body => SY_BACKEND.quotePost(body) }),
  // HTML 에 넣을 글자 (따옴표까지 바꿈)
  esc: s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  // 날짜 → "YYYY-MM-DD" (그 컴퓨터 시간 기준)
  ymd: d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
  // 브라우저 저장소 (막혀 있으면 기본값 · 조용히 넘어감)
  readJSON: (k, d) => { try{ const v=JSON.parse(localStorage.getItem(k)); return v==null ? d : v; }catch(_){ return d; } },
  writeJSON: (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} },
  // ===== 스켈레톤 (2026-11-27): 서버에서 불러오는 동안, 곧 나올 내용의 자리를 회색 덩어리로 미리 그려 둠 =====
  //  SY.skel(kind, n, opt) → HTML 글자. 받을 자리에 innerHTML 로 넣고, 받은 뒤에는 화면이 평소대로 다시 그리면 사라짐 (실패 · 빈 결과 때도 그 화면의 글이 덮어씀)
  //   kind: 'list' 목록 줄(opt.lines 1|2) · 'table' 표의 줄 <tr>…(opt.cols 칸 수 — <tbody> 안에 넣음) · 'cards' 카드(opt.h 높이) · 'cal' 달력(7칸 × n줄 · opt.h) · 'text' 글 줄
  //   opt.label: 읽는 프로그램에 들려줄 말 (기본 「불러오는 중」)
  //  ★ 보여 줄 것이 아직 없을 때만 쓴다 — 브라우저 사본으로 내용이 이미 보이는 중에는 덮지 않는다 (보이던 것이 깜빡이면 더 나쁨)
  //  모양(CSS)은 이 파일 아래쪽에서 직접 넣음 (.sy-skel · 메뉴가 없는 화면 · 로그인 없이 보는 화면도 같이 쓰도록). 0.18초 안에 끝나는 요청에서는 보이지 않음 · 인쇄에는 안 나옴
  skel: (kind, n, opt) => { opt=opt||{}; n=Math.max(1, +n||3);
    const W=[62,48,74,40,56,68,44,80], w=i=>W[i%W.length], sr=`<span class="sy-skel-sr">${SY.esc(opt.label||'불러오는 중')}</span>`, bar=(pct, cls)=>`<span class="sy-skel-b${cls?' '+cls:''}" style="width:${pct}%"></span>`;
    const h = opt.h ? ` style="height:${SY.esc(opt.h)}"` : '';
    if(kind==='table'){ const cols=Math.max(1, +opt.cols||4); let s='';
      for(let r=0;r<n;r++){ s+=`<tr class="sy-skel-tr" aria-busy="true">`; for(let c=0;c<cols;c++) s+=`<td>${!r && !c ? sr : ''}${bar(w(r*3+c*5))}</td>`; s+='</tr>'; }
      return s; }
    let s='';
    if(kind==='cards') for(let i=0;i<n;i++) s+=`<div class="sy-skel-card"${h}>${bar(w(i)*.6, 'lg')}${bar(w(i+3))}${bar(w(i+5)*.7)}</div>`;
    else if(kind==='cal'){ for(let i=0;i<n*7;i++) s+=`<div class="sy-skel-cell"${h}>${bar(28)}${i%3===1 ? bar(w(i)) : ''}</div>`; }
    else if(kind==='text') for(let i=0;i<n;i++) s+=bar(i%4===0 ? 38 : 60+w(i)*.5, i%4===0 ? 'lg' : '');
    else for(let i=0;i<n;i++) s+=`<div class="sy-skel-row"${h}>${bar(w(i))}${opt.lines===1 ? '' : bar(w(i+2)*.6, 'sm')}</div>`;
    return `<div class="sy-skel sy-skel-${kind==='cards'||kind==='cal'||kind==='text' ? kind : 'list'}" role="status" aria-busy="true">${sr}${s}</div>`; },
  // 서버를 쓸 수 있는 상태인지 (= 로그인했는지). 이름은 예전 팀 비밀번호 때의 것 — 로그인했으면 'login', 아니면 ''
  getKey: () => SY.user() ? 'login' : '',
  // 서버가 「확인 안 됨」(bad_key)이면: 팀 비밀번호를 묻지 않고, 로그인을 다시 하도록 안내
  authFail: () => '로그인 정보를 확인할 수 없습니다. 첫 화면에서 다시 로그인해 주세요 (멤버 목록에 이름 · 사번이 있어야 합니다).',
  user: () => { try{ const u=JSON.parse(localStorage.getItem('sy_user')||'null'); return u && u.name && u.emp ? u : null; }catch(_){ return null; } },
  // 날짜 칸 글자: "2026-12-05" → "2026-12-05 (토)"
  dateDisp: v => { if(!v) return ''; const t=new Date(v+'T00:00'); return isNaN(t) ? v : `${v} (${'일월화수목금토'[t.getDay()]})`; },
  // 직접 친 날짜 → "YYYY-MM-DD" (2026-12-05 · 2026.12.5 · 12/5 · 1205 · 12월 5일). 연도가 없으면 올해, 이미 지났으면 내년. 빈 칸 = '', 알 수 없음 = null
  parseDateText: s => {
    s=String(s||'').replace(/\([^)]*\)\s*$/,'').trim(); if(!s) return '';
    let y, m, d, x;
    if((x=s.match(/^(\d{4})\s*[-./년 ]?\s*(\d{1,2})\s*[-./월 ]?\s*(\d{1,2})\s*일?$/))){ y=+x[1]; m=+x[2]; d=+x[3]; }
    else if((x=s.match(/^(\d{1,2})\s*[-./월 ]\s*(\d{1,2})\s*일?$/)) || (x=s.match(/^(\d{2})(\d{2})$/))){
      m=+x[1]; d=+x[2]; const now=new Date(); y=now.getFullYear(); const t=new Date(y,m-1,d); now.setHours(0,0,0,0); if(t<now) y++; }
    else return null;
    const t=new Date(y,m-1,d); if(t.getFullYear()!==y || t.getMonth()!==m-1 || t.getDate()!==d) return null;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  },
  // 전화번호에 - (어떤 번호든 자릿수에 맞춰): 010-1234-5678 · 010-123-4567 · 02-123-4567 · 031-1234-5678 · 070 · 0505-123-4567 · 1588-1234 · 1234-5678
  fmtPhone: v => {
    const d=String(v||'').replace(/\D/g,'').slice(0,12);
    if(!d) return '';
    const g=a=>d.length<=a ? d : d.length<=a+4 ? `${d.slice(0,a)}-${d.slice(a)}` : `${d.slice(0,a)}-${d.slice(a,d.length-4)}-${d.slice(-4)}`;   // 앞자리 a개 - 가운데 - 끝 4자리
    if(/^02/.test(d))    return g(2);
    if(/^050\d/.test(d)) return g(4);   // 0505 · 0507 등 안심번호
    if(/^0\d\d/.test(d)) return g(3);   // 010 · 011 · 031 · 070 …
    if(/^1[5-9]\d\d/.test(d) && d.length<=8) return d.length<=4 ? d : `${d.slice(0,4)}-${d.slice(4)}`;   // 대표번호 1588-1234
    return d.length<=4 ? d : `${d.slice(0,d.length-4)}-${d.slice(-4)}`;   // 내선 등
  },
  // 연락처 칸에서 치는 동안: 자동으로 넣은 "010-" 뒤에 0 으로 시작하는 번호(02 · 031 …)를 치면 010 을 떼고, 지우는 중에는 끝 - 를 다시 붙이지 않음
  phoneTyping: (el, inputType) => {
    if(el.dataset.autop==='1'){ const dg=el.value.replace(/\D/g,''); if(/^0100/.test(dg)) el.value=dg.slice(3); else if(dg.length>4) delete el.dataset.autop; }
    const del=/^delete/.test(inputType||''); let f=SY.fmtPhone(el.value);
    if(del && el.value.endsWith('-') && f===el.value.replace(/-$/,'')) f=el.value.replace(/-$/,'');
    return f;
  },
  telBlank: v => /^010-?$/.test(String(v||'').trim()),   // 저절로 넣은 010- 만 든 값 = 빈 것 (2026-11-28 · 맨 아래 「전화번호 · 연락처 칸 공통」)
  // 큰 사본 저장소 (2026-11-21): 브라우저 저장소(localStorage)는 사이트마다 약 5MB 라 단체 기록 사본이 커지면 조용히 못 씀 →
  // IndexedDB(수백 MB) 에 키 하나 = 값 하나. 막혀 있으면 null · 조용히 넘어감
  idb: (()=>{ let p=null; const open = () => p || (p = new Promise((ok, no)=>{ try{ const r=indexedDB.open('sayuwon', 1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); }catch(e){ no(e); } }));
    const run = (mode, fn) => open().then(db=>new Promise((ok, no)=>{ const tx=db.transaction('kv', mode), q=fn(tx.objectStore('kv')); tx.oncomplete=()=>ok(q && q.result); tx.onerror=()=>no(tx.error); tx.onabort=()=>no(tx.error); }));
    return { get: k => run('readonly', s=>s.get(k)).catch(()=>null), set: (k, v) => run('readwrite', s=>s.put(v, k)).catch(()=>null), del: k => run('readwrite', s=>s.delete(k)).catch(()=>null) }; })(),
  // ===== 공유 기록 목록 (2026-11-21): 모든 화면이 같이 쓰는 사본 + 바뀐 것만 받기 =====
  //  예전: 화면마다 열 때 · 20~30초마다 시트 전체(최대 2,000줄 · 수정 기록 포함)를 통째로 받음 → 몇 초씩
  //  지금: 전체 사본은 IndexedDB 한 곳(모든 화면 · 창이 같이 씀). 서버가 api 5 이상이면 마지막으로 받은 뒤 바뀐 줄만 받아 합침
  //        (90초 겹쳐 받음 · 30분마다 한 번은 전체로 다시 맞춤)
  //  SY.list() → {ok, items, admin, ...} (예전 callApi({action:'list'}) 와 같은 모양) · SY.listCached() → 사본 items (없으면 null)
  listCached: async () => { const st=await SY.idb.get('sy_list_v1'); return st && Array.isArray(st.items) ? st.items : null; },
  //  테스트 사이트 · 이 컴퓨터(localhost)는 화면을 열고 처음 받을 때 늘 전체로 (2026-11-26): 테스트 DB 는 「새 개발 시작」 때 배포 DB 로 통째로 바뀌는데, 복사된 줄의 수정 시각은 예전 그대로라 「바뀐 줄만」으로는 안 받아져 옛 사본이 30분까지 남았음. 배포 사이트는 그대로(바뀐 줄만)
  list: (()=>{ let inflight=null, firstFull=SY_TEST_SITE || SY_MOCK_ON;
    const go = async (full) => {
      const st=await SY.idb.get('sy_list_v1'), now0=Date.now();
      if(firstFull){ full=true; firstFull=false; }
      const delta = !full && st && Array.isArray(st.items) && st.since && now0-(st.fullAt||0) < 30*60000;
      const body={action:'list'}; if(delta) body.since=new Date(Date.parse(st.since)-90000).toISOString();
      const j=await SY.call(body);
      let items;
      if(j.delta && delta){ const m=new Map(st.items.map(x=>[x.id,x])); (j.items||[]).forEach(x=>{ if(x.deleted) m.delete(x.id); else m.set(x.id, x); }); items=[...m.values()]; }
      else items=(j.items||[]).filter(x=>!x.deleted);
      SY.idb.set('sy_list_v1', {items, since:j.now||new Date(now0).toISOString(), fullAt: j.delta ? st.fullAt : now0, api:+j.api||0});
      return {...j, items, delta:!!j.delta};
    };
    // fresh: 방금 저장한 뒤 다시 받을 때 (이미 가고 있는 요청을 같이 쓰지 않음)
    return (opt={}) => { if(inflight && !opt.full && !opt.fresh) return inflight; const p=go(!!opt.full).finally(()=>{ if(inflight===p) inflight=null; }); inflight=p; return p; }; })(),
  // ===== 바로 알리기 (2026-11-23): 기록을 저장 · 삭제하는 순간, 같은 브라우저에 열려 있는 모든 화면(다른 탭 · 나의 할일 팝업 · 첫 화면 대시보드)에 그 기록을 그대로 보냄 =====
  //  예전: 저장한 화면만 바로 바뀌고, 다른 화면은 20~30초마다 서버에서 다시 받을 때에야 바뀜 → 끝낸 과업이 한동안 남아 있다가 갑자기 사라짐
  //  SY.live.post({t:'put', item} 또는 {t:'del', id})  저장 · 삭제를 알림 (서버 저장과 별개 — 서버에는 지금까지처럼 따로 올라감) + 같이 쓰는 사본(IndexedDB)에도 바로 넣어 새로 여는 화면도 처음부터 최신
  //  SY.live.on(fn)                                   알림을 받으면 fn(m)
  //  SY.live.apply(items)                             서버에서 받은 목록에, 방금 알림 받은(보낸) 기록을 덮어 돌려줌 — 서버에 아직 안 올라갔거나 먼저 떠난 요청이 옛 목록을 들고 와도 되돌아가지 않게.
  //                                                   서버 쪽 그 줄의 수정 일시(updated)가 바뀌면(= 서버가 더 새것을 줌) 그때부터는 서버 것 · 길어도 5분
  //  SY.live.onRev(fn)   다른 컴퓨터에서 바뀜 (2026-11-23): 서버의 「바뀜 기다리기」(동작 wait · cloudflare/worker.js)가 답하면 fn() — 화면은 여기서 목록을 다시 받음 (약 1초 안)
  //    브라우저 하나에서 창(탭 · 팝업) 하나만 서버에 묻고(Web Locks 'sy-watch'), 나머지 창에는 이 통로로 알림 → 창이 많아도 요청은 하나. 그 창을 닫으면 다른 창이 이어받음
  //    서버가 예전 것이면(wait 를 모름) 조용히 그만둠 → 예전처럼 20~30초마다 받기만
  live: (()=>{ let ch=null; const subs=[], over=new Map(), revSubs=[]; let watching=false;
    const fireRev = () => revSubs.forEach(f=>{ try{ f(); }catch(_){} });
    const sleep = ms => new Promise(r=>setTimeout(r, ms));
    const watchLoop = async () => { let rev='', fail=0;
      for(;;){
        if(!SY.user()){ await sleep(5000); continue; }
        const t0=Date.now();
        try{ const j=await SY.callRaw({action:'wait', rev});
          if(j && j.error==='bad_action') return;   // 예전 서버
          if(!j || !j.ok){ await sleep(30000); continue; }
          fail=0;
          if(rev && j.rev!==rev){ fireRev(); try{ ch && ch.postMessage({t:'rev'}); }catch(_){} }
          rev=j.rev||'';
        }catch(_){ await sleep(Math.min(60000, 3000*(++fail))); continue; }
        if(Date.now()-t0 < 400) await sleep(400);   // 너무 빨리 도는 것 막기
      } };
    const startWatch = () => { if(watching) return; watching=true;
      if(navigator.locks && navigator.locks.request) navigator.locks.request('sy-watch', watchLoop).catch(()=>{}); else watchLoop(); };
    const idOf = m => m.t==='del' ? m.id : (m.item || {}).id;
    const take = m => { const id=idOf(m); if(!id) return false; over.set(id, {m, at:Date.now()}); return true; };
    try{ ch=new BroadcastChannel('sy-live'); ch.onmessage = e => { const m=e.data; if(m && m.t==='rev'){ fireRev(); return; } if(!m || !take(m)) return; subs.forEach(f=>{ try{ f(m); }catch(_){} }); }; }catch(_){ ch=null; }
    const patch = async m => { try{ const st=await SY.idb.get('sy_list_v1'); if(!st || !Array.isArray(st.items)) return; const id=idOf(m), i=st.items.findIndex(x=>x.id===id);
      if(m.t==='del'){ if(i<0) return; st.items.splice(i,1); } else { const it={...m.item}; delete it._pending; if(i>=0) st.items[i]={...st.items[i], ...it}; else st.items.push(it); }
      await SY.idb.set('sy_list_v1', st); }catch(_){} };
    return {
      post: m => { if(!take(m)) return; try{ ch && ch.postMessage(JSON.parse(JSON.stringify(m))); }catch(_){} patch(m); },
      on: f => { subs.push(f); },
      onRev: f => { revSubs.push(f); startWatch(); },
      apply: items => { if(!over.size) return items; const now=Date.now(), map=new Map((items||[]).map(x=>[x.id, x]));
        over.forEach((o, id)=>{ const s=map.get(id), stamp = s ? String(s.updated||'') : null;
          if(o.base===undefined) o.base=stamp;
          if(now-o.at > 300000 || stamp!==o.base){ over.delete(id); return; }   // 5분이 지났거나 서버가 그 뒤에 바뀐 줄을 줌 → 서버 것
          if(s && s._pending) return;   // 이 화면이 아직 올리는 중인 것이 더 새것
          if(o.m.t==='del') map.delete(id); else map.set(id, s ? {...s, ...o.m.item, updated:s.updated} : o.m.item); });
        return [...map.values()]; },
    }; })(),
});
// ===== 시험용 모드 (이 컴퓨터 localhost 에서만 · 2026-11-25: 테스트 사이트에서도 켜게 했다가 가짜 예약이 진짜 DB 로 새어 같은 날 되돌림) — 주소 끝에 ?mock=1 을 한 번 붙이면 그 브라우저에 기억 (끄기 ?mock=0) =====
//   js/devcf.js 가 서버 코드 cloudflare/worker.js 를 브라우저 안 SQLite 로 돌림 → 진짜 DB 에는 아무것도 가지 않음 (저장소 칸막이는 맨 위 SY_MOCK_ON)
(function(){ if(!SY_MOCK_ON) return;
  try{ const me=document.currentScript && document.currentScript.src; if(!me) return;
    document.write('<script src="'+me.replace(/common\.js.*$/, 'devcf.js')+'"><\/script>');
  }catch(_){} })();

// ===== 개발 중 기능 가리기 (2026-11-24) =====
// 배포 사이트(main = hyunbin5786.github.io/sayuwon-sales/)에서는 아래 화면을 열면 「아직 개발 중입니다」 · 테스트 사이트(…/sayuwon-sales/test/ · 다른 주소) · 이 컴퓨터(localhost)에서는 그대로
// 기능을 배포할 때 = 아래 DEV_PAGES 에서 그 줄을 지우면 끝 (메뉴의 「개발 중」 표시 · 첫 화면 공통 업무 알림도 같이 풀림)
// 이 컴퓨터에서 배포 사이트처럼 보기: 주소 끝에 ?asprod=1
const SY_DEV = (function(){
  const DEV_PAGES = {
    'clergy.html':'대구대교구 무료입장 명부', 'cancel.html':'예약 취소 요청', 'rent.html':'대관 규정 및 상품', 'agency.html':'협업 여행사 할인 현황',
    'accident.html':'사고현황 접수', 'stock.html':'재고관리', 'promo.html':'기업 프로모션 할인', 'press.html':'홍보 기자 리스트', 'manual.html':'고객 응대 매뉴얼',
  };
  const host=location.hostname, path=location.pathname;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || /\.localhost$/.test(host);
  const isTest = /^\/sayuwon-sales\/test(\/|$)/.test(path) || /[?&]test=1\b/.test(location.search);
  const isProd = /[?&]asprod=1\b/.test(location.search) || (host==='hyunbin5786.github.io' && /^\/sayuwon-sales(\/|$)/.test(path) && !isTest);
  const page = path.split('/').pop() || 'index.html';
  const devPage = p => Object.prototype.hasOwnProperty.call(DEV_PAGES, String(p||'').replace(/^.*\//,'').replace(/[?#].*$/,''));
  const off = p => isProd && devPage(p);
  const tag = p => !isProd && devPage(p);   // 메뉴 이름표 「test에만 보임」: 테스트 사이트 · 이 컴퓨터에서만 (배포 사이트엔 이름표 없음 · 2026-11-25)
  function block(){
    const name=DEV_PAGES[page]||'이 기능';
    const d=document.createElement('div'); d.id='syDevBlock';
    d.setAttribute('style','position:fixed;inset:0;z-index:99999;background:#f6f4ee;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Noto Sans KR",system-ui,sans-serif');
    d.innerHTML='<div style="background:#fff;border:1px solid #dfdace;border-radius:16px;padding:32px 28px;max-width:440px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08)">'
      +'<div style="font-size:42px;line-height:1">🛠️</div><h1 style="font:600 22px \'Noto Serif KR\',serif;color:#3f5236;margin:14px 0 8px">아직 개발 중입니다</h1>'
      +'<p style="margin:0 0 20px;color:#4a4740;line-height:1.7;font-size:14.5px">「'+SY.esc(name)+'」은(는) 지금 만들고 확인하는 중인 기능입니다.<br>준비가 끝나면 이 메뉴에서 바로 쓸 수 있습니다.</p>'
      +'<a href="./" style="display:inline-block;background:#3f5236;color:#fff;text-decoration:none;border-radius:9px;padding:10px 22px;font-weight:700;font-size:14px">첫 화면으로</a></div>';
    document.body.appendChild(d); document.documentElement.style.overflow='hidden';
  }
  if(off(page)){ if(document.body) block(); else document.addEventListener('DOMContentLoaded', block); }
  if(isTest && (!isLocal || /[?&]test=1\b/.test(location.search))){   // 테스트 사이트 표시 (배포 사이트와 헷갈리지 않게 · 2026-11-24: 화면 가장자리 빨간 테두리 + 왼쪽 아래 이름표 + 탭 제목 앞 [테스트])
    const t=()=>{ if(document.getElementById('syTestFrame')) return;
      const f=document.createElement('div'); f.id='syTestFrame'; f.setAttribute('aria-hidden','true');
      f.setAttribute('style','position:fixed;inset:0;z-index:99998;border:5px solid #d32f2f;pointer-events:none;box-sizing:border-box');
      const top=document.createElement('div'); top.textContent='테스트 사이트 · 배포 사이트 아님';
      top.setAttribute('style','position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#d32f2f;color:#fff;font:700 12.5px "Noto Sans KR",sans-serif;padding:3px 14px 5px;border-radius:0 0 10px 10px;pointer-events:none;letter-spacing:.02em;white-space:nowrap');
      const b=document.createElement('div'); b.textContent='테스트 사이트 · '+(SY_DB_NAME==='배포 DB' ? 'DB = 배포 (아직 분리 전)' : SY_DB_NAME);   // 어느 DB 를 쓰는지 (2026-11-25)
      b.setAttribute('style','position:fixed;left:12px;bottom:12px;z-index:99999;background:#d32f2f;color:#fff;font:700 12px "Noto Sans KR",sans-serif;padding:4px 10px;border-radius:999px;pointer-events:none');
      document.body.append(f, b); document.title='[테스트] '+document.title; };   // 위 가운데 이름표(top)는 머리 줄 버튼을 가려서 안 붙임
    if(document.body) t(); else document.addEventListener('DOMContentLoaded', t);
  }
  return Object.freeze({isProd, isTest, isLocal, off, tag, DEV_PAGES});
})();

// ===== 스켈레톤 모양 (2026-11-27 · SY.skel 이 만드는 것) — 모든 화면이 이 파일을 읽으므로 여기서 직접 넣음 =====
//  색은 화면 바탕(#f6f4ee) · 선(#dfdace) 사이의 회색 · 크기는 em (글자 크기 조절을 따라감) · 0.18초 뒤에야 보임(금방 끝나는 요청에서 번쩍이지 않게) · 움직임 줄이기 설정이면 반짝임을 멈춤 · 인쇄 · 이미지 저장 자리에는 안 나옴
(function(){
  const st=document.createElement('style'); st.id='sySkelCss';
  st.textContent='@keyframes sySkelIn{from{opacity:0}to{opacity:1}}@keyframes sySkelMove{from{background-position:100% 0}to{background-position:0 0}}'
    +'.sy-skel{display:block;grid-column:1/-1;opacity:0;animation:sySkelIn .2s ease .18s forwards;pointer-events:none;user-select:none;text-align:left}'
    +'.sy-skel-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}'
    +'.sy-skel-b{display:block;height:.85em;max-width:100%;border-radius:.4em;background:#e9e5da linear-gradient(90deg,#e9e5da 0,#e9e5da 40%,#f5f2ea 50%,#e9e5da 60%,#e9e5da 100%) 0 0/300% 100% no-repeat;animation:sySkelMove 1.6s linear infinite}'
    +'.sy-skel-b.lg{height:1.1em}.sy-skel-b.sm{height:.7em}'
    +'.sy-skel-row{display:flex;flex-direction:column;justify-content:center;gap:.5em;padding:.75em .2em;border-bottom:1px solid #eeeae0;box-sizing:border-box}.sy-skel-row:last-child{border-bottom:0}'
    +'.sy-skel-cards{display:grid;gap:.7em}.sy-skel-card{display:flex;flex-direction:column;justify-content:center;gap:.6em;padding:1em;border:1px solid #e6e1d5;border-radius:10px;background:#fff;box-sizing:border-box}'
    +'.sy-skel-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.sy-skel-cell{display:flex;flex-direction:column;gap:.4em;min-height:4.2em;padding:.4em;border:1px solid #eeeae0;border-radius:6px;background:#fff;box-sizing:border-box}'
    +'.sy-skel-text{display:flex;flex-direction:column;gap:.75em;padding:.4em 0}'
    +'tr.sy-skel-tr{pointer-events:none}tr.sy-skel-tr td{padding-top:.8em;padding-bottom:.8em}tr.sy-skel-tr .sy-skel-b{opacity:0;animation:sySkelIn .2s ease .18s forwards,sySkelMove 1.6s linear infinite}'
    +'@media (prefers-reduced-motion:reduce){.sy-skel-b{animation:none}.sy-skel{animation:none;opacity:1}tr.sy-skel-tr .sy-skel-b{animation:none;opacity:1}}'
    +'@media print{.sy-skel,tr.sy-skel-tr{display:none!important}}'
    +'.sheet .sy-skel,.sheet tr.sy-skel-tr,#shot .sy-skel,#shot tr.sy-skel-tr,#stShot .sy-skel,#stShot tr.sy-skel-tr,#stPrev .sy-skel,#stPrev tr.sy-skel-tr{display:none!important}';
  document.head.appendChild(st);
})();

// 팝업이 떠 있으면 뒤 화면은 스크롤 안 됨 (2026-11-24 · 모든 화면) — 팝업 안은 그대로 스크롤
//  팝업 = 화면 전체를 덮는 것들 (.modal · .pmodal · .mypop · 매뉴얼 · 사진 크게 보기 · 메뉴 등). 옆 패널(.peek) · 작은 시간 고르기(.tp-pop)는 뺌
(function(){
  const SEL='.modal,.pmodal,.mypop,.mn-modal,.cm-modal,.bk-imgview,.m-zoom,.man-zoom,.ph-view,.man-wrap,.smenu,.dg-wrap';
  const st=document.createElement('style');
  st.textContent='html.sy-noscroll{overflow:hidden!important;scrollbar-gutter:stable}html.sy-noscroll body{overflow:hidden!important;overscroll-behavior:none}';
  document.head.appendChild(st);
  // 예약 현황 공유(group.html?book=… · html.book-only)의 #bookModal 은 팝업이 아니라 화면 그 자체(position:static)라 뺌 — 이것 때문에 그 화면이 늘 잠겨 휴대폰에서 스크롤이 안 됐음 (2026-11-27)
  const page = el => el.id==='bookModal' && document.documentElement.classList.contains('book-only');
  const shown = el => !el.hidden && !page(el) && el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden';
  let t0=0;
  const check = () => { t0=0; const on=[...document.querySelectorAll(SEL)].some(shown); document.documentElement.classList.toggle('sy-noscroll', on); };
  const q = () => { if(!t0) t0=setTimeout(check, 0); };   // requestAnimationFrame 은 창이 뒤에 있으면 안 돌아서 setTimeout
  const start = () => { new MutationObserver(q).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden','class','style','open']}); q(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// ===== 직접 넣은 업무(기타 개인 업무)의 날짜 규칙 (2026-11-26 · js/opslib.js 에서 옮김 — 개인고객 화면의 과업 알림도 같은 규칙을 쓰게) =====
// d = {repeat:'none'|'later'|'daily'|'weekly'|'monthly', dows:[0..6], dom:1..31 (31 = 말일까지), start, due, stop, done:{날짜:{at,by}}}
const SY_TASK = (function(){
  const ymd = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  // 이 업무가 그 날짜(YYYY-MM-DD)에 해야 하는 날인지
  const occurs = (d, day) => {
    if(d.stop && day > d.stop) return false;
    if(d.repeat==='none' || !d.repeat) return day===(d.due||d.start);
    if(d.start && day < d.start) return false;
    const t=new Date(day+'T00:00');
    if(d.repeat==='daily') return true;
    if(d.repeat==='weekly') return (d.dows||[]).includes(t.getDay());
    if(d.repeat==='monthly'){ const last=new Date(t.getFullYear(), t.getMonth()+1, 0).getDate(), want=Math.min(+d.dom||1, last); return t.getDate()===want; }
    return false; };
  // 아직 안 한 날짜들: 오늘 할 것 + 지난 것 (반복 업무는 최근 7일까지만, 한 번 하는 업무는 마감이 지났으면 계속)
  const pending = (d, today=ymd(new Date())) => { const done=d.done||{}, out=[];
    if(d.repeat==='none' || !d.repeat){ const due=d.due||d.start||today; if(!done[due] && due<=today) out.push(due); return out; }
    for(let i=7;i>=0;i--){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()-i); const day=ymd(x); if(occurs(d, day) && !done[day]) out.push(day); }
    return out; };
  return Object.freeze({ occurs, pending });
})();

// ===== 과업 알림 시각 (2026-11-25 · 나의 할일 설정에서 사람마다 · 시각 · 횟수) =====
//  분 단위 목록(480 = 오전 8시) · 이 컴퓨터(sy_alert_times)에 두고, 단체 화면이 공유 기록(내 개인업무목록 줄의 alertTimes)과 맞춤
//  알림은 캘린더 새 창처럼 따로 뜨는 창(group.html?alert=1 · 창 이름 sy_alert)으로.
//  2026-11-26: 브라우저는 「누르지도 않았는데 뜨는 새 창」을 막는다(팝업 허용을 해 둔 브라우저만 됨) → 막히면 그 시각 뒤 화면을 처음 누를 때 연다
//  (누를 때 여는 창은 캘린더 ↗ 버튼처럼 팝업 허용 없이 열린다). 그래도 안 열리면 그 화면 안 팝업(fallback)으로.
//  한 시각에 한 번: 본 시각을 이 브라우저(sayuwon_task_slot)에 적어 두어 다른 화면 · 다른 탭으로 옮겨도 다시 뜨지 않는다.
const SY_ALERT = (function(){
  const SLOT_LS='sayuwon_task_slot';
  const keyNow = () => { const d=new Date(), s=slot(d); return s==null ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}|${s}`; };
  const seen = key => { try{ return (localStorage.getItem(SLOT_LS)||'').split(',').includes(key); }catch(_){ return false; } };
  const mark = key => { try{ const day=key.split('|')[0]; localStorage.setItem(SLOT_LS, [...(localStorage.getItem(SLOT_LS)||'').split(',').filter(s=>s.startsWith(day) && s!==key), key].join(',')); }catch(_){} };
  let armed=false;
  // ── 팝업 허용 안내 (2026-11-26): 알림 창이 저절로 안 뜬(브라우저가 막은) 사람에게만, 화면 오른쪽 아래 상자로 · 하루 한 번(force = 설정의 시험 버튼에서는 늘)
  //    허용해 두면 창이 저절로 떠서 이 안내는 다시 나오지 않는다. 첫 화면의 보이지 않는 과업 계산 창에서도 바깥 화면에 그린다 (그래서 모양을 여기서 직접 줌)
  const HELP_LS='sy_alert_help_day';
  const help = force => { try{
    const d=new Date(), day=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    if(!force && navigator.maxTouchPoints>0 && innerWidth<700) return;   // 휴대폰에서는 안내하지 않음 (설정하는 곳이 다름)
    if(!force){ let last=''; try{ last=localStorage.getItem(HELP_LS)||''; }catch(_){} if(last===day) return; }
    try{ localStorage.setItem(HELP_LS, day); }catch(_){}
    let T=window; try{ if(window.top!==window && window.top.document) T=window.top; }catch(_){}
    const D=T.document; if(!D.body) return; D.getElementById('syAlertHelp')?.remove();
    const edge=/Edg\//.test(navigator.userAgent), cfg=(edge?'edge':'chrome')+'://settings/content/popups', site=location.origin;
    const el = (tag, css, text) => { const x=D.createElement(tag); if(css) x.style.cssText=css; if(text!=null) x.textContent=text; return x; };
    const BTN='border:0;border-radius:6px;background:#3e4f33;color:#fff;font:600 13px/1 inherit;padding:7px 10px;cursor:pointer;white-space:nowrap';
    const box=el('div', 'position:fixed;right:16px;bottom:44px;z-index:2147483000;width:min(380px,calc(100vw - 32px));max-height:calc(100vh - 80px);overflow:auto;box-sizing:border-box;background:#fff;color:#222;border:1px solid #cfc9b8;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.22);padding:14px 14px 12px;font:14px/1.55 "Noto Sans KR",system-ui,sans-serif');
    box.id='syAlertHelp'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','과업 알림 창 허용 안내');
    box.appendChild(el('b', 'display:block;font-size:15px;margin-bottom:4px', '과업 알림이 저절로 뜨게 해 주세요'));
    box.appendChild(el('div', 'margin-bottom:8px', '브라우저가 알림 창을 막아서, 지금은 화면을 한 번 눌러야 뜹니다. 아래 가운데 하나를 한 번만 해 두면 만지지 않아도 알림을 받습니다.'));
    const row = (text, copy) => { const r=el('div', 'display:flex;gap:8px;align-items:center;margin:4px 0'); r.appendChild(el('span', 'flex:1;min-width:0;word-break:break-all', text));
      if(copy){ const b=el('button', BTN, '복사'); b.type='button'; b.onclick=()=>{ const done=()=>{ b.textContent='복사됨'; T.setTimeout(()=>{ b.textContent='복사'; }, 1500); };
        try{ T.navigator.clipboard.writeText(copy).then(done, ()=>T.prompt('아래 글자를 복사하세요', copy)); }catch(_){ T.prompt('아래 글자를 복사하세요', copy); } }; r.appendChild(b); }
      return r; };
    // 가장 쉬운 방법 (2026-11-26): 버튼 한 번 → 브라우저가 「알림을 표시하려고 합니다 · 허용 / 차단」을 물음 → 허용하면 알림 시각에 윈도우 알림이 뜸 (noti)
    const perm = notiPerm();
    if(perm==='default'){
      box.appendChild(el('b', 'display:block;margin-top:6px', '가장 쉬운 방법 — 버튼 한 번'));
      const r=row('아래 버튼을 누르고, 브라우저가 물으면 「허용」을 누르세요. 그러면 알림 시각에 화면 오른쪽 아래에 알림이 뜨고, 그것을 누르면 과업 알림 창이 열립니다.'); box.appendChild(r);
      const ab=el('button', BTN+';padding:10px 14px;font-size:14px;margin:4px 0 2px', '알림 허용'); ab.type='button'; box.appendChild(ab);
      const say=el('div', 'margin-top:4px;color:#555'); box.appendChild(say);
      ab.onclick=()=>{ try{ const done = p => { if(p==='granted'){ ab.remove(); say.textContent='허용됐습니다. 이제 알림 시각에 화면 오른쪽 아래에 알림이 뜹니다. (방금 시험 알림을 하나 보냈습니다)'; noti('과업 알림 시험', '이렇게 뜹니다. 누르면 과업 알림 창이 열립니다.'); }
            else say.textContent = p==='denied' ? '차단됐습니다. 주소 칸 왼쪽 끝의 그림을 누르고 「알림」을 「허용」으로 바꾼 뒤 새로 고치면 됩니다.' : '아직 고르지 않았습니다. 버튼을 다시 눌러 「허용」을 골라 주세요.'; };
          const q=T.Notification.requestPermission(done); if(q && q.then) q.then(done, ()=>{}); }catch(_){ say.textContent='이 브라우저에서는 알림을 켤 수 없습니다. 아래 방법을 써 주세요.'; } };
    } else if(perm==='denied') box.appendChild(row('이 브라우저에서 이 사이트의 알림이 차단돼 있습니다. 주소 칸 왼쪽 끝의 그림을 누르고 「알림」을 「허용」으로 바꾸면, 알림 시각에 화면 오른쪽 아래에 알림이 뜹니다.'));
    box.appendChild(el('b', 'display:block;margin-top:10px', '알림 창이 바로 뜨게 하려면 (팝업 허용)'));
    box.appendChild(row('주소 칸 오른쪽 끝에 「팝업 차단됨」 그림이 보이면 누르고 → 「항상 허용」 → 「완료」'));
    box.appendChild(el('b', 'display:block;margin-top:8px', '그림이 안 보이면'));
    box.appendChild(row('① 새 탭의 주소 칸에 붙여 넣고 Enter:  '+cfg, cfg));
    box.appendChild(row('② 「팝업 전송 및 리디렉션 사용이 허용됨」 옆 「추가」를 누르고 붙여 넣기:  '+site, site));
    box.appendChild(row('③ 「추가」를 누르고, 이 화면으로 돌아와 새로 고침'));
    const foot=el('div', 'display:flex;justify-content:flex-end;margin-top:10px'); const c=el('button', BTN, '닫기'); c.type='button'; c.onclick=()=>box.remove(); foot.appendChild(c); box.appendChild(foot);
    D.body.appendChild(box);
  }catch(_){} };
  // ── 윈도우 알림 (2026-11-26): 브라우저에서 이 사이트의 「알림」을 허용한 사람은, 알림 창이 막혀도 화면을 만지지 않고 알림을 받음 (화면 오른쪽 아래 · 누를 때까지 남음 · 누르면 과업 알림 창)
  //    운영 시스템 화면이 하나는 열려 있어야 함 (닫아 둔 브라우저에는 못 보냄)
  const topWin = () => { try{ if(window.top!==window && window.top.document) return window.top; }catch(_){} return window; };
  const notiPerm = () => { try{ const N=topWin().Notification; return N ? N.permission : 'none'; }catch(_){ return 'none'; } };
  let lastNoti=null;
  const noti = (title, body, onclick) => { try{ const T=topWin(); if(notiPerm()!=='granted') return null;
    const n=new T.Notification(title, {body, tag:'sy-alert', requireInteraction:true}); lastNoti=n;
    n.onclick=()=>{ try{ T.focus(); }catch(_){} try{ if(onclick) onclick(); else openWin(T); }catch(_){} try{ n.close(); }catch(_){} }; return n; }catch(_){ return null; } };
  // 설정의 「저절로 뜨는지 시험」: 누른 지 몇 초 지난 뒤(= 사람이 누르지 않은 것과 같은 때) 불러 봄 → 창이 열리면 'win' · 창은 막혔지만 윈도우 알림을 보냈으면 'noti' · 둘 다 안 되면 안내를 보이고 ''
  const test = () => { if(openWin()){ try{ topWin().document.getElementById('syAlertHelp')?.remove(); }catch(_){} return 'win'; }
    if(noti('과업 알림 시험', '이렇게 뜹니다. 누르면 과업 알림 창이 열립니다.')) return 'noti'; help(true); return ''; };
  // 지금 시각의 알림을 띄움 (이미 본 시각이면 아무것도 안 함). fallback = 새 창이 끝내 안 열릴 때 그 화면 안에서 보일 함수(없어도 됨) · count = 알릴 것의 수(윈도우 알림 글에 씀)
  //  ① 창을 열어 봄(팝업을 허용한 브라우저는 여기서 끝) ② 막히면: 알림을 허용한 사람에게는 윈도우 알림 · 아닌 사람에게는 허용 방법 안내(하루 한 번) ③ 그리고 화면을 처음 누를 때 창을 엶
  const show = (fallback, count) => { const k=keyNow(); if(!k || seen(k) || armed) return;
    if(openWin()){ mark(k); return; }
    armed=true; const docs=[document]; try{ if(window.top!==window && window.top.document) docs.push(window.top.document); }catch(_){}   // 첫 화면의 보이지 않는 과업 계산 창: 바깥 화면을 누를 때
    let myNoti=null;
    const go = e => { docs.forEach(d=>{ try{ d.removeEventListener('click', go, true); }catch(_){} }); armed=false; try{ if(myNoti) myNoti.close(); }catch(_){}
      try{ const k2=keyNow(); if(!k2 || seen(k2)) return;   // 그사이 다른 탭이 띄웠으면 또 띄우지 않음
        const v=e && e.view, ok = openWin(v) || (v!==window && openWin()) || (v!==topWin() && openWin(topWin())); mark(k2); if(!ok && fallback) fallback(); }catch(_){} };
    docs.forEach(d=>d.addEventListener('click', go, true));
    myNoti = noti('과업 알림', `${count ? `확인할 할 일이 ${count}건 있습니다.` : '확인할 할 일이 있습니다.'} 눌러서 보기`, ()=>go(null));
    if(!myNoti) help(); };   // 알림도 허용하지 않은 브라우저: 허용 방법 안내 (하루 한 번)
  const LS='sy_alert_times', DEF=[480,660,780,1020];
  const clean = a => [...new Set((a||[]).map(Number).filter(n=>Number.isFinite(n) && n>=0 && n<1440))].sort((x,y)=>x-y);
  const times = () => { try{ const a=JSON.parse(localStorage.getItem(LS)||'null'); if(Array.isArray(a)) return clean(a); }catch(_){} return DEF.slice(); };
  const set = a => { const L=clean(a); try{ localStorage.setItem(LS, JSON.stringify(L)); }catch(_){} return L; };
  const hm = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const say = n => { const h=Math.floor(n/60), m=n%60, ap=h<12?'오전':'오후', hh=h%12||12; return `${ap} ${hh}시${m?` ${m}분`:''}`; };
  const label = (L=times()) => L.length ? L.map(say).join(' · ') : '알림 끔';
  // 지금 시각이 지난 마지막 알림 시각의 이름 (예전 기록과 같게 정시는 「8」, 그 밖은 분 「510」) · 없으면 null
  const slot = d => { const m=d.getHours()*60+d.getMinutes(), t=times().filter(x=>m>=x).pop(); return t==null ? null : String(t%60 ? t : t/60); };
  const openWin = from => { let w=null; try{ w=(from||window).open(new URL('group.html?alert=1', location.href).href, 'sy_alert', 'width=760,height=560,resizable=yes,scrollbars=yes'); }catch(_){} if(w){ try{ w.focus(); }catch(_){} } return !!w; };
  // 내가 맡은 고객 견적 요청 (나의 할일 메인의 「고객 견적 요청」과 같은 기준 · 단체 화면이 받아 이 브라우저에 적어 둔 것 sy_my_quotereq)
  const quoteReqs = me => { try{ const q=JSON.parse(localStorage.getItem('sy_my_quotereq')||'null')||{}; return me && (!(q.owners||[]).length || q.owners.includes(me)) ? (q.items||[]) : []; }catch(_){ return []; } };
  return Object.freeze({ DEF, times, set, hm, say, label, slot, openWin, show, keyNow, seen, mark, quoteReqs, help, test, notiPerm });
})();
// ===== 전화번호 · 연락처 칸 공통 (2026-11-28 · 운영팀이 정한 화면 규칙 — CLAUDE.md 8절): 입력 칸에 data-tel 만 붙이면 됨 =====
//  ① 빈 칸을 누르면(들어가면) 010- 이 저절로 · 커서는 그 뒤  ② 치는 동안 - 를 저절로 (SY.phoneTyping — 02 · 031 · 1588 도 자릿수에 맞춰)  ③ 아무것도 더 안 치고 나가면 도로 비움 · 나갈 때 모양을 한 번 더 맞춤
//  값을 읽는 쪽은 그냥 el.value 를 읽으면 됨 (010- 만 든 채 저장을 누르는 경우만 SY.telBlank 로 거름). 예전부터 있던 칸(단체 · 개인 · 분실물)은 저마다 같은 동작을 따로 갖고 있어 그대로 둠
(function(){ const T = e => { const el=e.target; return el && el.matches && el.matches('input[data-tel]') && !el.readOnly && !el.disabled ? el : null; };
  document.addEventListener('focusin', e=>{ const el=T(e); if(!el || el.value) return; el.value='010-'; el.dataset.autop='1'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} }, 0); });
  document.addEventListener('input', e=>{ const el=T(e); if(!el) return; if(/^delete/.test(e.inputType||'')) delete el.dataset.autop; el.value=SY.phoneTyping(el, e.inputType); });
  document.addEventListener('focusout', e=>{ const el=T(e); if(!el) return; delete el.dataset.autop; if(SY.telBlank(el.value)){ el.value=''; return; } const f=SY.fmtPhone(el.value); if(f) el.value=f; });
})();
