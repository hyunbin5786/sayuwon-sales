// ===== 로컬 미리보기 전용: 새 서버(Cloudflare Worker) 코드를 브라우저 안에서 돌려 보기 (2026-11-23) =====
// localhost 에서 주소 끝에 ?mock=1 을 한 번 붙이면 켜짐 (끄기 ?mock=0). js/common.js 맨 아래가 이 파일을 읽음. (손으로 흉내 낸 가짜 서버 js/devmock.js 는 2026-11-23에 없앰 — 진짜 서버 코드를 돌리는 이쪽 하나로)
//  - cloudflare/worker.js (진짜 서버 코드) 를 그대로 불러와, cloudflare/schema.sql 로 만든 SQLite DB(sql.js) 에 붙여 돌림
//    → 서버에 올리기 전에 「화면 + 서버 코드 + SQL」이 맞물리는지 확인. Cloudflare D1 의 제한(값 하나 2MB · 묶는 값 100개 · 요청 하나에 쿼리 50번)도 넘으면 오류를 냄
//  - 2026-11-25: 테스트 사이트(/sayuwon-sales/test/)에서도 켜짐 (배포 사이트는 안 됨 · js/common.js)
//  - DB 는 이 브라우저 localStorage 'sy_cf_db' 에만 (지우기: SY_CF.reset()). 처음엔 멤버 테스트 / T001 · 김영업 / T002 와 가상 예약
//  - 견적서 서버(SY.quote)도 서버 코드의 quoteGet · quotePost 로 감. 틀린 로그인 제한을 시험하려면 콘솔에서 SY_CF_IP='1.2.3.4' (IP 가 없으면 세지 않음)
(function(){
  const base = document.currentScript.src.replace(/js\/devcf\.js.*$/, ''), CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';
  const LS = 'sy_cf_db', VER = 'sy_cf_ver';
  let SQL, db, ver = '', queries = 0;
  const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = b => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const load = () => { const b = localStorage.getItem(LS); db = b ? new SQL.Database(fromB64(b)) : new SQL.Database(); ver = localStorage.getItem(VER) || ''; };
  const persist = () => { try { localStorage.setItem(LS, toB64(db.export())); ver = String(Date.now()) + Math.random(); localStorage.setItem(VER, ver); } catch (e) { console.warn('[cf] DB 를 브라우저에 기억하지 못함', e); } };
  // D1 과 같은 모양의 DB (prepare → bind → first / all / run · batch)
  const check = (sql, args) => { if (++queries > 50) throw new Error('D1 제한: 요청 하나에 쿼리 50번 초과'); if (sql.length > 100000) throw new Error('D1 제한: SQL 100KB 초과');
    if (args.length > 100) throw new Error('D1 제한: 묶는 값 100개 초과');
    args.forEach(a => { if (a === undefined) throw new Error('D1: undefined 는 묶을 수 없음'); if (typeof a === 'string' && a.length > 600000 && new Blob([a]).size > 2000000) throw new Error('D1 제한: 값 하나 2MB 초과'); }); };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async all(){ check(sql, args); const st = db.prepare(sql); st.bind(args); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return { results: out, success: true, meta: {} }; },
    async first(){ return (await this.all()).results[0] || null; },
    async run(){ check(sql, args); db.run(sql, args); return { success: true, meta: { changes: db.getRowsModified() } }; },
  });
  const DB = { prepare: sql => stmt(sql), async batch(list){ db.run('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.run('COMMIT'); return out; } catch (e) { db.run('ROLLBACK'); throw e; } } };
  const env = { DB };
  const ready = (async () => {
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = CDN + 'sql-wasm.js'; s.onload = ok; s.onerror = () => no(new Error('sql.js 를 불러오지 못함')); document.head.appendChild(s); });
    SQL = await initSqlJs({ locateFile: f => CDN + f });
    load(); db.exec(await (await fetch(base + 'cloudflare/schema.sql?t=' + Date.now())).text());
    const mod = await import(base + 'cloudflare/worker.js?t=' + Date.now());
    if (!db.exec('SELECT count(*) FROM members')[0].values[0][0]) {   // 처음: 시험용 멤버 · 가상 예약
      const who = { name: '테스트', emp: 'T001' }, day = n => { const d = new Date(); d.setDate(d.getDate() + n); return SY.ymd(d); }, now = new Date().toISOString(), h = JSON.stringify({ h: [], tasks: [], erp: [], memos: [] });
      await mod.api({ action: 'memberAdd', who, by: '시험', list: [who, { name: '김영업', emp: 'T002' }] }, env);
      for (const item of [
        { id: 'mock0001', saved: now, callStart: now, takenBy: '테스트', callType: '예약확정', summary: '가상 단체 · 관람 + 사담', date: day(1), org: '가상여행사', owner: '테스트', pay: '현장 결제', vehicle: '버스 1', people: '20', sadam1: '20', contact: '홍길동', phone: '010-0000-0001', email: 'test@example.com', tin: '10:00', tout: '15:00', note: '시험용 예약', history: h },
        { id: 'mock0002', saved: now, callStart: now, takenBy: '김영업', callType: '가예약', summary: '가상 단체 2', date: day(9), org: '가상고등학교', owner: '김영업', people: '35', mabangL: '35', contact: '이선생', phone: '010-0000-0002', tin: '11:00', tout: '16:00', history: h },
        { id: 'mock0003', saved: now, callStart: now, takenBy: '테스트', callType: '개인고객', summary: '가상 개인 문의', contact: '박고객', phone: '010-0000-0003', owner: '테스트', note: '주차 문의', history: JSON.stringify({ h: [], tasks: [], cat: '문의', reportTo: '', reserved: '' }) },
      ]) { queries = 0; await mod.api({ action: 'put', who, item }, env); }
      persist();
    }
    // 지금 로그인한 사람도 시험용 멤버로 (2026-11-25 · 테스트 사이트에서 진짜 이름으로 로그인한 채 시험용 모드를 켜도 저장이 막히지 않게 · 같은 사번은 한 번만)
    try { const u = JSON.parse(localStorage.getItem('sy_user') || 'null'); if (u && u.name && u.emp) { queries = 0; await mod.api({ action: 'memberAdd', who: { name: '테스트', emp: 'T001' }, by: '시험', list: [{ name: u.name, emp: u.emp }] }, env); persist(); } } catch (e) { console.warn('[cf] 로그인한 사람을 시험용 멤버로 넣지 못함', e); }
    return mod;
  })();
  ready.catch(e => console.error('[cf] 시작 실패', e));
  const log = [];
  const call = async body => { const mod = await ready; if ((localStorage.getItem(VER) || '') !== ver) load();   // 다른 창 · 팝업이 고쳤으면 다시 읽음
    queries = 0; const req = JSON.parse(JSON.stringify(body)); log.push(req); if (log.length > 300) log.shift();
    let r; try { r = await mod.api(req, env, location.origin + '/cf', window.SY_CF_IP || ''); } catch (e) { r = { ok: false, error: String((e && e.message) || e) }; console.error('[cf] 서버 코드 오류', req.action, e); }
    if (!/^(list|deleted|members|mentList|mentImgGet|bookList|quoteReqList|quoteGet|wait)$/.test(req.action)) persist();
    return JSON.parse(r && r.__raw ? r.__raw : JSON.stringify(r)); };
  SY_BACKEND.main = call;
  SY_BACKEND.beacon = body => { call(body); };
  window.SY_CF = { log, ready, env, q0(){ queries = 0; },   // q0: 서버 코드를 직접 부르는 시험에서 쿼리 수 세기를 0으로

    sql: (s, a) => { const st = db.prepare(s); st.bind(a || []); const o = []; while (st.step()) o.push(st.getAsObject()); st.free(); return o; },
    reset(){ localStorage.removeItem(LS); localStorage.removeItem(VER); try { indexedDB.deleteDatabase('sayuwon'); } catch (_) {} location.reload(); } };
  console.info('[cf] js/devcf.js — cloudflare/worker.js 를 브라우저 SQLite 로 돌리는 중 (진짜 서버에는 쓰지 않음 · 끄기 ?mock=0)');
  document.addEventListener('DOMContentLoaded', () => { const b = document.createElement('div'); b.textContent = '시험용 (로컬 SQLite · 진짜 DB 아님)'; b.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;background:#1d4ed8;color:#fff;font:12px sans-serif;padding:3px 8px;border-radius:4px;opacity:.85;pointer-events:none'; document.body.appendChild(b); });
})();
