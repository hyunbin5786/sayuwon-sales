// ===== 공통 (모든 화면이 맨 먼저 읽음) =====
// 여러 파일에 똑같이 복사돼 있던 설정 · 작은 도구를 한곳에. 각 화면은 이것을 그대로 쓰거나 (const esc = SY.esc) 감싸서 씀
//
// ── 서버(공유 기록)로 가는 길은 이 파일 하나 (2026-11-23 리팩토링) ──
//  화면 코드는 fetch 로 서버 주소를 직접 부르지 않고 아래 넷만 씀. DB · 서버를 바꿀 때는 맨 아래 SY_BACKEND(주소 · 보내는 방법)만 바꾸면 됨
//   SY.call(body)     공유 기록 서버에 요청 {action:'put'|'del'|'list'|…} → 응답(JSON). ok 가 아니면 Error(e.code = 서버가 준 error) 를 던짐
//   SY.callRaw(body)  같은 요청, 던지지 않고 응답 그대로 (로그인 확인처럼 ok:false 도 직접 보는 곳)
//   SY.beacon(body)   창을 닫는 순간에 보내는 요청 (고치는 중 표시 풀기) — 응답을 기다리지 않음
//   SY.quote.get(query) · SY.quote.post(body)   견적서 서버 (품목 목록 · 발급 내역 — 다른 Apps Script)
//  모든 요청에 로그인(이름 + 사번 = who)과 예전 팀 비밀번호(key · 기억해 둔 브라우저만)를 붙임 → 서버가 멤버 목록으로 확인
//
//  로컬 미리보기에서 진짜 시트에 쓰지 않고 시험하기: 주소 끝에 ?mock=1 (끄기 ?mock=0) → js/devmock.js 가 가짜 서버가 됨 (localhost 에서만 · README 13절)
const SY_BACKEND = {
  API_URL:   "https://sayuwon-api.serendipity5786-9e7.workers.dev/",   // 공유 기록 (cloudflare/worker.js · 2026-11-23 구글 시트에서 옮김 · 되돌릴 때: https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec)
  QUOTE_URL: "https://script.google.com/macros/s/AKfycbyFMeWFtokUB9FW44ZRrOMssIA_2jJzKC9dhjDR7c4WgdPxsaqzT1aLbLWmpIwvVMmY/exec",   // 견적서 품목 목록 · 발급 내역 (저장소 sayuwon-invoice-quotation 의 Apps Script)
  // Content-Type 을 붙이지 않아야 Apps Script 로 사전 확인(preflight) 요청 없이 바로 감
  main(body){ return fetch(this.API_URL, {method:'POST', body:JSON.stringify(body)}).then(r=>r.json()); },
  beacon(body){ const s=JSON.stringify(body); try{ if(navigator.sendBeacon && navigator.sendBeacon(this.API_URL, s)) return; }catch(_){} fetch(this.API_URL, {method:'POST', body:s, keepalive:true}).catch(()=>{}); },
  quoteGet(query){ return fetch(this.QUOTE_URL + (query ? '?'+query : '')).then(r=>r.json()); },
  quotePost(body){ return fetch(this.QUOTE_URL, {method:'POST', body:JSON.stringify(body)}).then(r=>r.json()); },
};
const SY = Object.freeze({
  API_URL: SY_BACKEND.API_URL,
  KEY_LS: 'sayuwon_intake_key',
  USER_LS: 'sy_user',
  DOW: '일월화수목금토',
  // ---- 서버 요청 ----
  // 요청에 로그인 · 예전 팀 비밀번호를 붙임 (이미 who 가 있으면 그대로)
  sign: body => { const b={...body}, u=SY.user(); let k=''; try{ k=localStorage.getItem(SY.KEY_LS)||''; }catch(_){}
    if(k && b.key==null) b.key=k; if(u && !b.who) b.who={name:u.name, emp:u.emp}; return b; },
  callRaw: body => SY_BACKEND.main(SY.sign(body)),
  call: async body => { const j=await SY_BACKEND.main(SY.sign(body)); if(!j || !j.ok){ const e=new Error((j && j.error)||'error'); e.code=j && j.error; throw e; } return j; },
  beacon: body => SY_BACKEND.beacon(SY.sign(body)),
  quote: Object.freeze({ get: query => SY_BACKEND.quoteGet(query||''), post: body => SY_BACKEND.quotePost(body) }),
  // HTML 에 넣을 글자 (따옴표까지 바꿈)
  esc: s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  // 날짜 → "YYYY-MM-DD" (그 컴퓨터 시간 기준)
  ymd: d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
  // 브라우저 저장소 (막혀 있으면 기본값 · 조용히 넘어감)
  readJSON: (k, d) => { try{ const v=JSON.parse(localStorage.getItem(k)); return v==null ? d : v; }catch(_){ return d; } },
  writeJSON: (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} },
  // 서버 확인용 값: 예전 팀 비밀번호(있으면) — 없으면 로그인 표시('login')로 「연결됨」처럼 다룸 (2026-11-21 · 실제 확인은 서버가 로그인으로)
  getKey: () => { try{ const k=localStorage.getItem('sayuwon_intake_key'); if(k) return k; const u=JSON.parse(localStorage.getItem('sy_user')||'null'); return u && u.name && u.emp ? 'login' : ''; }catch(_){ return ''; } },
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
  // 큰 사본 저장소 (2026-11-21): 브라우저 저장소(localStorage)는 사이트마다 약 5MB 라 단체 기록 사본이 커지면 조용히 못 씀 →
  // IndexedDB(수백 MB) 에 키 하나 = 값 하나. 막혀 있으면 null · 조용히 넘어감
  idb: (()=>{ let p=null; const open = () => p || (p = new Promise((ok, no)=>{ try{ const r=indexedDB.open('sayuwon', 1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); }catch(e){ no(e); } }));
    const run = (mode, fn) => open().then(db=>new Promise((ok, no)=>{ const tx=db.transaction('kv', mode), q=fn(tx.objectStore('kv')); tx.oncomplete=()=>ok(q && q.result); tx.onerror=()=>no(tx.error); tx.onabort=()=>no(tx.error); }));
    return { get: k => run('readonly', s=>s.get(k)).catch(()=>null), set: (k, v) => run('readwrite', s=>s.put(v, k)).catch(()=>null), del: k => run('readwrite', s=>s.delete(k)).catch(()=>null) }; })(),
  // ===== 공유 기록 목록 (2026-11-21): 모든 화면이 같이 쓰는 사본 + 바뀐 것만 받기 =====
  //  예전: 화면마다 열 때 · 20~30초마다 시트 전체(최대 2,000줄 · 수정 기록 포함)를 통째로 받음 → 몇 초씩
  //  지금: 전체 사본은 IndexedDB 한 곳(모든 화면 · 창이 같이 씀). 서버가 api 5 이상이면 마지막으로 받은 뒤 바뀐 줄만 받아 합침
  //        (90초 겹쳐 받음 · 30분마다 한 번은 전체로 다시 맞춤). 서버가 예전 버전이면 예전처럼 전체
  //  SY.list() → {ok, items, admin, ...} (예전 callApi({action:'list'}) 와 같은 모양) · SY.listCached() → 사본 items (없으면 null)
  listCached: async () => { const st=await SY.idb.get('sy_list_v1'); return st && Array.isArray(st.items) ? st.items : null; },
  list: (()=>{ let inflight=null;
    const go = async (full) => {
      const st=await SY.idb.get('sy_list_v1'), now0=Date.now();
      const delta = !full && st && Array.isArray(st.items) && st.api>=5 && st.since && now0-(st.fullAt||0) < 30*60000;
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
});
// ===== 로컬 미리보기 전용 (운영 주소에서는 절대 읽지 않음) — localhost 에서 주소 끝에 한 번 붙이면 그 브라우저에 기억 =====
//   ?mock=1  가짜 서버 (js/devmock.js)   ·   ?mock=cf  새 서버 코드 cloudflare/worker.js 를 브라우저 SQLite 로 (js/devcf.js)   ·   ?mock=0  끄기
(function(){ if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  try{ const q=new URLSearchParams(location.search).get('mock'); if(q==='1' || q==='cf') localStorage.setItem('sy_mock', q); if(q==='0') localStorage.removeItem('sy_mock');
    const m=localStorage.getItem('sy_mock'), me=document.currentScript && document.currentScript.src; if(!me || (m!=='1' && m!=='cf')) return;
    const tag = f => '<script src="'+me.replace(/common\.js.*$/, f)+'"><\/script>';
    document.write(tag('devmock.js') + (m==='cf' ? tag('devcf.js') : ''));
  }catch(_){} })();
