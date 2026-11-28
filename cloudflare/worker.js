// ===== 사유원 운영 보조 시스템 · 공유 기록 서버 (Cloudflare Worker + D1) =====
// 예전 서버(구글 Apps Script · legacy/apps-script/group-intake.gs)가 하던 일을 그대로 옮긴 것 (2026-11-23). 화면은 js/common.js 의 SY.call 로 예전과 같은 요청을 보냄 (docs 11절 「서버 동작 목록」)
//   요청: POST 본문 = JSON { action, who:{name, emp}, … }  (Content-Type 없이 보내도 됨 — 사전 확인 요청 없이 바로 옴)
//   응답: { ok:true, … } 또는 { ok:false, error }
// 연결(바인딩): DB = D1 데이터베이스 (cloudflare/schema.sql 로 표를 만든 것)
// 견적서 서버(품목 목록 · 발급 내역)도 여기에 (quoteGet · quotePost) · 틀린 로그인이 이어지면 그곳을 15분 막음 (too_many)
// 비밀 값(Worker 설정 → 변수와 비밀): MIGRATE_KEY (예전 서버에서 자료를 들여올 때만 · 끝나면 지움) · ADMIN_ID · ADMIN_PW (관리자 사이트 자동 가져오기를 쓸 때만)
// ── 다른 DB(사내 DB 등)로 옮길 때 (docs 20절) ──
//   · 화면과의 약속은 api() 의 action 목록뿐 — 새 서버가 같은 요청에 같은 답을 주면 화면은 js/common.js 의 주소만 바꾸면 됨
//   · 자료는 action 'export' 로 표마다 통째로 내려받음 (tools/export.html) — DB 종류와 상관없는 JSON
//   · SQL 은 표준 문법만 쓰되, 아래 셋만 SQLite(D1) 방식이라 다른 DB 에서는 그 DB 문법으로 바꿈:
//       ① 있으면 고치고 없으면 넣기  INSERT … ON CONFLICT(id) DO UPDATE  (MySQL: ON DUPLICATE KEY UPDATE · MSSQL/Oracle: MERGE)
//       ② 없을 때만 넣기  INSERT OR IGNORE / INSERT OR REPLACE
//       ③ 넣은 순서  rowid  (다른 DB: 자동 증가 번호 칸 seq 를 만들어 그 칸으로 정렬)
// 파일(이미지 · PDF)도 같은 DB 에 저장 (files · file_chunks). 볼 때는 GET /file/<id> — id 가 길고 무작위라 주소를 아는 사람만 열 수 있음
// 이 파일은 브라우저에서도 그대로 돌아감 (로컬 시험: js/devcf.js 가 SQLite 로 흉내 낸 DB 를 붙여 줌)

const KEYS = ['id', 'saved', 'callStart', 'takenBy', 'callType', 'summary', 'date', 'org', 'owner', 'pay', 'vehicle', 'inout', 'people',
  'sadam1', 'sadam2', 'sadamD', 'mabangL', 'mabangD', 'chabang', 'donghaeng', 'dangdu', 'yoga', 'gaga', 'teaMed', 'gayageum', 'cabin',
  'contact', 'phone', 'email', 'tin', 'tout', 'meal', 'mabangMenu', 'memo', 'note', 'updated', 'deleted', 'history'];   // 구글 시트 calls 의 38칸과 같은 이름 · 순서
const ADMIN_API = 'https://admin-api.sayuwon.com/api/v1';
const BIG_TEAM = 15;          // 이 인원 이상이면 목록에 자동 등록
const LOOKAHEAD_DAYS = 180;   // 오늘부터 며칠 뒤 예약까지 가져올지
const ID_OK = /^[a-z0-9]{4,40}$/;
const UPLOAD_MAX = 10 * 1024 * 1024, MENT_MAX = 5 * 1024 * 1024, CHUNK = 1000000;   // 파일 10MB · 멘트 사진 5MB · DB 값 하나에 base64 100만 자씩
const UPLOAD_TYPES = /^(image\/(jpeg|png|gif|webp|heic|heif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/;
const BOOK_KEYS = ['id', 'callType', 'date', 'org', 'owner', 'people', 'sadam1', 'sadam2', 'sadamD', 'mabangL', 'mabangD', 'chabang', 'donghaeng', 'dangdu', 'yoga', 'gaga', 'teaMed', 'gayageum', 'cabin', 'tin', 'tout', 'meal', 'mabangMenu', 'memo', 'saved', 'updated'];
const BOOK_DB_IDS = { mabangdb: '몽몽마방예약', bookdb: '예약현황추가' };
const GROUP_TYPES = ['단체예약', '예약상담', '가예약', '예약확정', '예약접수', '상담', '공식예약'];

// ---------- 작은 도구 ----------
const iso = () => new Date().toISOString();
const kstDate = (t = Date.now()) => new Date(t + 9 * 3600e3);                       // 한국 시각을 UTC 칸에 담은 Date
const kstYmd = t => kstDate(t).toISOString().slice(0, 10);                         // yyyy-MM-dd
const kstStamp = t => kstDate(t).toISOString().slice(0, 16).replace('T', ' ');     // yyyy-MM-dd HH:mm
const normName = v => String(v || '').replace(/\s+/g, '');
const normEmp = v => String(v || '').replace(/\s+/g, '').toUpperCase();
const fail = code => { const e = new Error(code); e.code = code; return e; };
const rand = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const q = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const rows = async (env, sql, ...args) => (await q(env, sql, ...args).all()).results || [];
const kvGet = async (env, k) => { const r = await q(env, 'SELECT v FROM kv WHERE k=?', k).first(); return r ? r.v : null; };
const kvSet = (env, k, v) => q(env, 'INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v=?2', k, v).run();

// ---------- 틀린 로그인 횟수 제한 (2026-11-23) ----------
//  같은 곳(IP)에서 10분 안에 「멤버 목록에 없는 이름 + 사번」을 서로 다른 것으로 8번 넣으면 그곳을 15분 동안 막음 (그동안은 맞는 이름 · 사번도 안 받음 → 사번을 하나씩 넣어 보며 맞추는 것을 막음)
//  - 같은 틀린 값을 되풀이하는 것(멤버에서 빠진 사람의 브라우저가 30초마다 다시 묻는 것 등)은 한 번으로 셈 → 사무실 전체가 막히지 않게
//  - 로그인하지 않은 요청(이름 · 사번이 없는 것)과 로그인 없이 되는 동작(멘트 보기 · 예약 현황 공유 · 고객 견적 요청)은 세지도 막지도 않음
const FAIL_WINDOW = 10 * 60e3, FAIL_MAX = 8, FAIL_BLOCK = 15 * 60e3;
const pairHash = (n, e) => { let h = 2166136261; const s = n + '|' + e; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
async function failState(env, ip) { if (!ip) return null; try { return JSON.parse((await kvGet(env, 'fail:' + ip)) || 'null'); } catch (x) { return null; } }
const isBlocked = st => !!(st && st.until > Date.now());
async function noteFail(env, ip, name, emp) {
  const n = normName(name), e = normEmp(emp); if (!ip || !n || !e) return;
  const now = Date.now(); let st = await failState(env, ip);
  if (!st || now - st.t0 > FAIL_WINDOW) st = { t0: now, set: [] };
  const h = pairHash(n, e); if (st.set.includes(h)) return;
  st.set.push(h); if (st.set.length >= FAIL_MAX) st.until = now + FAIL_BLOCK;
  await kvSet(env, 'fail:' + ip, JSON.stringify(st));
}

// ---------- 견적서 서버 (품목 관리에서 바꾼 것 · 발급 내역) — 예전에는 따로 있던 Apps Script(shared-catalog.gs)를 여기로 (2026-11-23) ----------
//  품목 목록: kv 'catalog' = { edits:{예약상품명:{바꾼 칸:값}}, added:[{uid, src, name, kind, form, price, disc}] } — 읽기는 로그인 없이(가격표), 고치기는 로그인한 사람만
//  발급 내역: quote_history 한 줄 = 한 번 발급 (data = 내역 전체 JSON). 읽기 · 쓰기 모두 로그인한 사람만 (고객 이름 · 금액이 들어 있음)
const readCatalog = async env => { try { return JSON.parse((await kvGet(env, 'catalog')) || '{}') || {}; } catch (x) { return {}; } };
function applyOp(d, o) {
  d = d || {};
  if (o.op === 'set') { d.edits = d.edits || {}; d.edits[o.src] = d.edits[o.src] || {}; d.edits[o.src][o.field] = o.value; }
  else if (o.op === 'setAdded') (d.added || []).forEach(a => { if (String(a.uid) === String(o.uid)) a[o.field] = o.value; });
  else if (o.op === 'add') { d.added = d.added || []; if (!d.added.some(a => String(a.uid) === String(o.item.uid))) d.added.unshift(o.item); }
  else if (o.op === 'delAdded') d.added = (d.added || []).filter(a => String(a.uid) !== String(o.uid));
  else if (o.op === 'reset') d = {};
  else if (o.op === 'replace') d = o.data || {};
  return d;
}
const histStmt = (env, h) => q(env, 'INSERT OR IGNORE INTO quote_history (id, at, data) VALUES (?, ?, ?)', String(h.id), String(h.at || ''), JSON.stringify(h));   // 같은 발급을 두 번 보내도 한 줄만
async function quotePost(env, req) {
  const out = { ok: true };
  const hist = (req.history || []).filter(h => h && h.id);
  if ((req.history || []).length) { for (let i = 0; i < hist.length; i += 40) await env.DB.batch(hist.slice(i, i + 40).map(h => histStmt(env, h))); out.saved = req.history.length; }
  if ((req.cancel || []).length) { let done = 0;
    for (const c of req.cancel) { if (!c || !c.id) continue;
      const row = await q(env, 'SELECT data FROM quote_history WHERE id=?', String(c.id)).first(); if (!row) continue;
      const h = JSON.parse(row.data); h.canceled = String(c.canceled || ''); h.cancelNote = String(c.cancelNote || '');
      await q(env, 'UPDATE quote_history SET data=? WHERE id=?', JSON.stringify(h), String(c.id)).run(); done++; }
    out.canceled = done; }
  if ((out.saved != null || out.canceled != null) && !(req.ops || []).length) return out;
  let d = await readCatalog(env);
  (req.ops || []).forEach(o => { d = applyOp(d, o); });
  await kvSet(env, 'catalog', JSON.stringify(d));
  return { ok: true, data: d };
}

// ---------- 멤버 · 로그인 ----------
// 멤버 연락처 칸 phone (2026-11-24): 예전 DB 에는 없으므로 처음 쓸 때 한 번 더함 (이미 있으면 오류 → 그냥 넘어감)
let memPhoneReady = false;
async function ensureMemberPhone(env) {
  if (memPhoneReady) return;
  try { await q(env, "ALTER TABLE members ADD COLUMN phone TEXT NOT NULL DEFAULT ''").run(); } catch (x) { /* 이미 있음 */ }
  memPhoneReady = true;
}
const memPhone = v => String(v || '').replace(/[^\d-]/g, '').slice(0, 20);
async function readMembers(env) {
  await ensureMemberPhone(env);
  return (await rows(env, "SELECT name, emp, phone, added, \"by\" FROM members WHERE deleted='' AND name<>'' AND emp<>'' ORDER BY rowid"));
}
async function setMemberPhone(env, emp, phone) {
  await ensureMemberPhone(env);
  const e = normEmp(emp); if (!e) throw fail('bad_emp');
  let n = 0;
  for (const m of await rows(env, "SELECT rowid AS r, emp FROM members WHERE deleted=''")) if (normEmp(m.emp) === e) { await q(env, 'UPDATE members SET phone=? WHERE rowid=?', memPhone(phone), m.r).run(); n++; }
  if (!n) throw fail('not_found');
}
// 담당 지정 (2026-11-23): kv 'role:quote' = 견적서 · 거래명세서 담당자의 사번 목록(JSON). 고객 견적 요청이 이 사람의 할일로 나옴 (표를 바꾸지 않으려고 kv 에 둠)
const ROLES = ['quote'];
async function readRoles(env) {
  const out = {};
  for (const r of ROLES) { try { const a = JSON.parse((await kvGet(env, 'role:' + r)) || '[]'); out[r] = Array.isArray(a) ? a.map(String) : []; } catch (x) { out[r] = []; } }
  return out;
}
async function setRole(env, role, emp, on) {
  if (!ROLES.includes(role)) throw fail('bad_role');
  const e = normEmp(emp); if (!e) throw fail('bad_emp');
  const cur = (await readRoles(env))[role].filter(x => normEmp(x) !== e);
  if (on) cur.push(String(emp).trim());
  await kvSet(env, 'role:' + role, JSON.stringify(cur));
}
async function memberLogin(env, name, emp) {
  const list = await readMembers(env);
  if (!list.length) return { ok: true, member: true, empty: true };   // 처음 설정: 멤버를 추가하기 전
  const n = normName(name), e = normEmp(emp);
  return { ok: true, member: list.some(m => normName(m.name) === n && normEmp(m.emp) === e) };
}
// 요청의 who = {name, emp} 가 멤버 목록에 있으면 OK (멤버가 한 명도 없으면 누구나 — 처음 설정용)
async function authOk(env, req) {
  const w = req.who || {}, n = normName(w.name), e = normEmp(w.emp);
  if (!n || !e) return false;
  const list = await readMembers(env);
  if (!list.length) return true;   // 처음 설정 (멤버가 아직 없음)
  return list.some(m => normName(m.name) === n && normEmp(m.emp) === e);
}
async function addMembers(env, list, by) {
  const have = {}; (await readMembers(env)).forEach(m => { have[normEmp(m.emp)] = true; });
  let added = 0;
  for (const m of (list || [])) {
    const name = String((m && m.name) || '').trim(), emp = String((m && m.emp) || '').trim();
    if (!name || !/^[0-9A-Za-z-]{2,20}$/.test(emp) || have[normEmp(emp)]) continue;   // 같은 사번은 한 번만
    await q(env, 'INSERT INTO members (emp, name, phone, added, "by", deleted) VALUES (?, ?, ?, ?, ?, \'\')', emp, name, memPhone(m.phone), kstStamp(), String(by || '')).run();
    have[normEmp(emp)] = true; added++;
  }
  return added;
}
async function delMember(env, emp, by) {
  const e = normEmp(emp), list = await rows(env, "SELECT rowid AS r, emp FROM members WHERE deleted=''");
  let done = 0;
  for (const m of list) if (normEmp(m.emp) === e) { await q(env, 'UPDATE members SET deleted=? WHERE rowid=?', kstStamp() + ' ' + String(by || ''), m.r).run(); done++; }
  return done;
}

// ---------- 기록 (calls) ----------
const getItem = async (env, id) => { const r = await q(env, 'SELECT data FROM calls WHERE id=?', id).first(); return r ? JSON.parse(r.data) : null; };
// 38칸만 · 모두 글자로 (구글 시트가 그랬던 것처럼). inout(입퇴장)은 입장 · 퇴장으로 만듦
function rowOf(item) {
  const it = {};
  KEYS.forEach(k => { const v = item[k]; it[k] = v == null ? '' : String(v); });
  it.inout = (it.tin || it.tout) ? it.tin + '~' + it.tout : '';
  return it;
}
const putStmt = (env, it) => q(env, 'INSERT INTO calls (id, call_type, visit_date, updated, deleted, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ' +
  'ON CONFLICT(id) DO UPDATE SET call_type=?2, visit_date=?3, updated=?4, deleted=?5, data=?6', it.id, it.callType, it.date, it.updated, it.deleted, JSON.stringify(it));
// 저장: 같은 id 가 있으면 그 줄을 덮어씀 (줄 순서는 그대로) · 수정 일시는 서버가 적음 · 지워졌던 줄이면 되살아남
async function put(env, item) {
  const id = String((item && item.id) || '');
  if (!ID_OK.test(id)) throw fail('bad_id');
  const it = rowOf({ ...item, updated: iso(), deleted: '' });
  await putStmt(env, it).run();
  return id;
}
async function del(env, id) {
  const it = await getItem(env, id); if (!it) return id;   // 없는 id 는 그냥 성공처럼 (예전 서버와 같음)
  it.deleted = iso();
  await q(env, 'UPDATE calls SET deleted=?, data=? WHERE id=?', it.deleted, JSON.stringify(it), id).run();
  return id;
}
// 목록 응답은 저장해 둔 JSON 글자를 그대로 이어 붙임 (줄마다 풀었다 다시 싸지 않음 — 무료 요금제 CPU 10ms 안에 들어오게)
const rawRows = (key, rs, extra) => ({ __raw: '{"ok":true,"' + key + '":[' + rs.map(r => r.data).join(',') + ']' + extra + '}' });
const rawList = (rs, extra) => rawRows('items', rs, extra);
const adminRaw = async env => (await kvGet(env, 'admin')) || 'null';

// 예약 현황 공유 목록 (로그인 없이): 단체 예약(지난 120일 ~)의 예약 현황에 쓰는 칸 + 몽몽마방 · 대관 등 직접 추가 목록. 고객 연락처 · 이메일 · 통화 메모 · 수정 기록은 보내지 않음
async function bookList(env) {
  const from = kstYmd(Date.now() - 120 * 864e5);
  const rs = await rows(env, "SELECT data FROM calls WHERE deleted='' AND (id IN ('mabangdb','bookdb') OR (call_type IN ('" + GROUP_TYPES.join("','") + "','') AND visit_date<>'' AND visit_date>=?)) ORDER BY rowid", from);
  return rs.map(r => { const o = JSON.parse(r.data);
    if (BOOK_DB_IDS[o.id]) return { id: o.id, callType: o.callType, saved: o.saved, updated: o.updated, history: o.history };   // 직접 추가 목록 (내용 = history)
    const p = {}; BOOK_KEYS.forEach(k => { p[k] = o[k]; });
    p.memo = String(p.memo || '').replace(/\+?\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '');   // 비고 안에 적힌 전화번호 · 이메일도 지움
    return p; });
}
// 로그인 없이 한 건 추가: {db:'mabangdb'|'bookdb', row:{…}, by:이름} → 그 목록 줄에 더함 (고치기 · 빼기는 로그인한 사람만)
async function bookAdd(env, req) {
  const db = String(req.db || ''); if (!BOOK_DB_IDS[db]) throw fail('bad_db');
  const by = String(req.by || '').trim().slice(0, 20); if (!by) throw fail('no_name');
  if (!(await rateOk(env, 'bookadd_rate', 40))) throw fail('busy');   // 10분에 너무 많이 오면 잠시 막음 (2026-11-28 · 분실물 접수와 같은 방식)
  const src = req.row || {}, row = {};
  Object.keys(src).slice(0, 20).forEach(k => { if (/^[a-zA-Z]{1,10}$/.test(k)) row[k] = String(src[k] == null ? '' : src[k]).slice(0, 300); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.d || '')) throw fail('bad_date');
  row.by = by; row.guest = '1'; if (db === 'bookdb') row.id = 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  row.at = iso();   // 넣은 일시 (2026-11-28 · 첫 화면 공통 업무 「예약 현황 직접 추가」 알림 · 아래 추가한 사람 줄의 열쇠)
  delete row.tel; delete row.phone; delete row.who;   // 연락처는 예약 줄에 넣지 않음 (이 줄은 로그인 없이 보는 목록 bookList 로 통째로 나감)
  const item = (await getItem(env, db)) || { id: db, callType: BOOK_DB_IDS[db], saved: iso() };
  let j = {}; try { j = JSON.parse(item.history || '{}') || {}; } catch (x) { j = {}; }
  j.rows = (Array.isArray(j.rows) ? j.rows : []).concat([row]); j.at = iso(); j.by = by;
  item.history = JSON.stringify(j); item.summary = (db === 'mabangdb' ? '몽몽마방 예약 목록 ' : '예약 현황 직접 추가 ') + j.rows.length + '건'; item.takenBy = by;
  await put(env, item);
  // 추가한 사람 이름 · 연락처 (2026-11-28 · api 14): 예약 줄과 따로 한 줄(id bookwho · 통화 구분 「예약현황추가자」 · {who:{줄 열쇠:{n, t, at}}})에 — bookList 는 이 줄을 보내지 않으므로 로그인한 사람만 봄
  const w = req.who || {}, wn = String(w.n || by).trim().slice(0, 20), wt = String(w.t || '').replace(/[^\d-]/g, '').slice(0, 20);
  if (wt) { const key = db === 'bookdb' ? row.id : row.at;
    const wi = (await getItem(env, 'bookwho')) || { id: 'bookwho', callType: '예약현황추가자', saved: iso() };
    let wj = {}; try { wj = JSON.parse(wi.history || '{}') || {}; } catch (x) { wj = {}; }
    wj.who = (wj.who && typeof wj.who === 'object') ? wj.who : {}; wj.who[key] = { n: wn, t: wt, at: row.at, guest: '1' }; wj.at = iso();
    wi.history = JSON.stringify(wj); wi.summary = '예약 현황 추가한 사람 ' + Object.keys(wj.who).length + '건'; wi.takenBy = by;
    await put(env, wi); }
  return { id: db, history: item.history };
}

// ---------- 분실물 찾기 · 로그인 없이 (2026-11-24 · lost.html) ----------
//  lostList: 분실물 목록 — 로그인하지 않은 사람에게는 신고자 · 습득자 이름 일부 · 연락처 가운데 · 메모를 가림
//  lostAdd {d, by}: 새 분실물 신고 · 습득 한 건 (상태는 처음 상태로) — 고치기 · 상태 바꾸기 · 지우기는 로그인한 사람만 (put · del)
//  lostImgPut: 습득물 사진 올리기 (멘트 이미지와 같은 그림 저장 · kind 'ment' → mentImgGet 으로 보임)
//  셋 다 10분에 너무 많이 오면 잠시 막음 (rateOk)
async function rateOk(env, key, max) {
  let r = {}; try { r = JSON.parse((await kvGet(env, key)) || '{}'); } catch (x) { r = {}; }
  const now = Date.now(); if (!(r.until > now)) r = { n: 0, until: now + 600e3 };
  if (r.n >= max) return false;
  r.n++; await kvSet(env, key, JSON.stringify(r)); return true;
}
const LOST_FIRST = { '습득': '보관중', '분실 신고': '찾는 중' };
const maskPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(0, 3) + '-****-' + d.slice(-4) : d ? '****' : ''; };
const maskName = n => { const s = String(n || '').trim(); return s.length <= 1 ? s : s.length === 2 ? s[0] + '*' : s[0] + '*'.repeat(s.length - 2) + s.slice(-1); };
async function lostList(env) {
  const rs = await rows(env, "SELECT data FROM calls WHERE deleted='' AND call_type='분실물' ORDER BY rowid");
  return rs.map(r => { const o = JSON.parse(r.data); let h = {}; try { h = JSON.parse(o.history || '{}') || {}; } catch (x) { h = {}; }
    const d = { ...(h.d || {}) }; d.person = maskName(d.person); d.phone = maskPhone(d.phone); d.returnTo = maskName(d.returnTo); delete d.memo;
    delete d.reporter; delete d.reporterPhone;   // 분실물 신고자(고객) 이름 · 전화번호는 로그인하지 않은 사람에게 아예 보내지 않음 (2026-11-27 · api 13)
    return { id: o.id, saved: o.saved, updated: o.updated, d }; });
}
async function lostAdd(env, req) {
  if (!(await rateOk(env, 'lost_rate', 30))) throw fail('busy');
  const s = req.d || {}, t = (k, n) => String(s[k] == null ? '' : s[k]).replace(/\r\n?/g, '\n').trim().slice(0, n || 200);
  const kind = s.kind === '분실 신고' ? '분실 신고' : '습득';
  const d = { kind, date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : kstYmd(), item: t('item', 100), feature: t('feature'), place: t('place'), person: t('person', 30), phone: t('phone', 20), memo: t('memo', 1000), status: LOST_FIRST[kind] };
  // 사진: 습득은 꼭 · 신고는 있으면 (2026-11-26 · api 11 — 고객이 보내 준 사진을 로그인 없이 넣는 신고에도. 예전에는 습득만 받고 신고의 사진은 버렸음)
  const photos = (Array.isArray(s.photos) ? s.photos : []).slice(0, 5).filter(p => p && /^m[0-9a-f]{32}$/.test(String(p.id || ''))).map(p => ({ id: String(p.id), name: cleanName(p.name || '사진') }));
  if (kind === '습득') { d.storage = t('storage'); d.photos = photos; } else if (photos.length) d.photos = photos;
  // 분실물 신고자(물건을 잃어버린 고객) 이름 · 전화번호 (2026-11-27 · api 13 · 신고만 · 적었을 때만). person · phone 은 이제 화면에서 「사유원 담당자」 칸 (저장 이름은 그대로)
  if (kind === '분실 신고') { const rp = t('reporter', 30), rt = t('reporterPhone', 20); if (rp) d.reporter = rp; if (rt) d.reporterPhone = rt; }
  if (!d.item) throw fail('no_item');
  if (kind === '습득' && !d.photos.length) throw fail('no_photo');
  const by = clT(req.by || d.person, 20) || '(로그인 없이)', now = iso();
  const item = { id: 'o' + Date.now().toString(36) + rand(3), callType: '분실물', saved: now, takenBy: by, owner: '', summary: `${kind} ${d.item} · ${d.status}`.slice(0, 120),
    history: JSON.stringify({ kind: 'lost', d, log: [{ at: now, by, what: '추가 (로그인 없이)' }] }) };
  await put(env, item);
  return item.id;
}
async function lostImgPut(env, req) {
  if (!(await rateOk(env, 'lostimg_rate', 60))) throw fail('busy');
  return mentImgPut(env, { ...req, name: '분실물 ' + cleanName(req.name || '사진', 50) });
}

// ---------- 고객 견적 요청 ----------
const QR_KEYS = ['id', 'at', 'org', 'name', 'phone', 'email', 'date', 'pax', 'memo', 'status', 'by', 'doneAt', 'deleted'];
const QR_COLS = QR_KEYS.map(k => '"' + k + '"').join(',');   // by 는 SQL 예약어라 따옴표로
const qrText = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, n);
async function quoteReqAdd(env, it) {
  if (it.hp) return '';   // 사람 눈에 안 보이는 칸이 채워져 있으면 자동 입력(스팸) — 저장하지 않고 성공처럼
  let rate = {}; try { rate = JSON.parse((await kvGet(env, 'qr_rate')) || '{}'); } catch (x) { rate = {}; }
  const now = Date.now(); if (!(rate.until > now)) rate = { n: 0, until: now + 600e3 };
  if (rate.n >= 30) throw fail('busy');   // 10분에 30건 넘게 오면 잠시 막음
  rate.n++; await kvSet(env, 'qr_rate', JSON.stringify(rate));
  const o = { org: qrText(it.org, 60), name: qrText(it.name, 30), phone: qrText(it.phone, 20), email: qrText(it.email, 100),
    date: String(it.date || ''), pax: String(it.pax || '').replace(/\D/g, '').slice(0, 5), memo: qrText(it.memo, 1000) };
  if (!o.org || !o.name) throw fail('need_name');
  if (o.phone.replace(/\D/g, '').length < 9) throw fail('bad_phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) throw fail('bad_email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw fail('bad_date');
  if (!it.agree) throw fail('need_agree');
  o.id = 'q' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  o.at = kstStamp(); o.status = '접수'; o.by = ''; o.doneAt = ''; o.deleted = '';
  await q(env, 'INSERT INTO quotereq (' + QR_COLS + ') VALUES (' + QR_KEYS.map(() => '?').join(',') + ')', ...QR_KEYS.map(k => o[k])).run();
  return o.id;
}
// 지난 1년 접수 (최근이 위)
const quoteReqList = env => rows(env, "SELECT " + QR_COLS + " FROM quotereq WHERE deleted='' AND substr(at,1,10)>=? ORDER BY rowid DESC", kstYmd(Date.now() - 365 * 864e5));
async function quoteReqMark(env, req) {
  const id = String(req.id || ''), st = String(req.status || ''), by = String((req.who && req.who.name) || req.by || '').slice(0, 20);
  if (!/^(접수|출력|완료|삭제)$/.test(st)) throw fail('bad_status');
  const now = kstStamp();
  const r = st === '삭제' ? await q(env, 'UPDATE quotereq SET deleted=? WHERE id=?', now + ' ' + by, id).run()
    : await q(env, 'UPDATE quotereq SET status=?, "by"=?, doneAt=? WHERE id=?', st, by, now, id).run();
  const o = await q(env, 'SELECT ' + QR_COLS + ' FROM quotereq WHERE id=?', id).first();
  if (!o) throw fail('not_found');
  return o;
}

// ---------- 예약 고치는 중 표시: { id, sid(창마다 다른 값), by(이름), release? } ----------
async function editLock(env, req) {
  const id = String(req.id || ''), sid = String(req.sid || '');
  if (!ID_OK.test(id) || !sid) return { ok: false, error: 'bad_id' };
  const v = await q(env, 'SELECT sid, "by", at FROM locks WHERE id=?', id).first(), now = Date.now();
  if (req.release) { if (v && v.sid === sid) await q(env, 'DELETE FROM locks WHERE id=? AND sid=?', id, sid).run(); return { ok: true, released: true }; }
  if (v && v.sid !== sid && now - v.at < 150000) return { ok: true, locked: true, by: v.by, at: v.at };
  await q(env, 'INSERT INTO locks (id, sid, "by", at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET sid=?2, "by"=?3, at=?4', id, sid, String(req.by || ''), now).run();
  return { ok: true, locked: false };
}

// ---------- 파일: base64 글자 그대로 100만 자씩 나눠 DB 에 (풀지 않고 넣고 꺼냄) ----------
const b64Bytes = s => Math.floor(s.length * 3 / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0);
async function saveFile(env, id, kind, name, mime, data, by) {
  const stmts = [q(env, 'INSERT OR REPLACE INTO files (id, kind, name, mime, size, at, "by") VALUES (?, ?, ?, ?, ?, ?, ?)', id, kind, name, mime, b64Bytes(data), iso(), String(by || '')),
    q(env, 'DELETE FROM file_chunks WHERE id=?', id)];
  for (let i = 0, n = 0; i < data.length; i += CHUNK, n++) stmts.push(q(env, 'INSERT INTO file_chunks (id, n, data) VALUES (?, ?, ?)', id, n, data.slice(i, i + CHUNK)));
  await env.DB.batch(stmts);
}
async function readFile(env, id) {
  const f = await q(env, 'SELECT id, kind, name, mime, size, at FROM files WHERE id=?', id).first(); if (!f) return null;
  f.data = (await rows(env, 'SELECT data FROM file_chunks WHERE id=? ORDER BY n', id)).map(r => r.data).join('');
  return f;
}
const cleanName = (s, n = 60) => String(s || '').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, n);
async function upload(env, req, origin) {
  const mime = String(req.mime || ''), data = String(req.data || '');
  if (!UPLOAD_TYPES.test(mime)) throw fail('이미지나 PDF만 올릴 수 있습니다');
  if (!data.length) throw fail('빈 파일');
  if (b64Bytes(data) > UPLOAD_MAX) throw fail('10MB 이하만 올릴 수 있습니다');
  const ext = (String(req.name || '').match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0];
  const name = [cleanName(req.date), cleanName(req.org) || '단체', cleanName(req.kind) || '서류'].filter(String).join(' ') + ext;
  const id = 'f' + rand(16);
  await saveFile(env, id, 'doc', name, mime, data, req.who && req.who.name);
  return { id, name, url: origin + '/file/' + id, at: iso() };
}
async function mentImgPut(env, req) {
  const mime = String(req.mime || ''), data = String(req.data || '');
  if (!/^image\/(jpeg|png|gif|webp)$/.test(mime)) throw fail('사진만 올릴 수 있습니다');
  if (!data.length) throw fail('빈 파일');
  if (b64Bytes(data) > MENT_MAX) throw fail('5MB 이하만 올릴 수 있습니다');
  const name = cleanName(req.name || '멘트 이미지') || '멘트 이미지', id = 'm' + rand(16);
  await saveFile(env, id, 'ment', name, mime, data, req.who && req.who.name);
  return { id, name, at: iso() };
}
async function mentImgGet(env, id) {
  if (!id) throw fail('no_id');
  const f = await readFile(env, id);
  if (!f || f.kind !== 'ment') throw fail('not_allowed');   // 멘트 이미지만 (단체 서류는 돌려주지 않음)
  return { id, mime: f.mime, data: f.data };
}

// ---------- 관리자 사이트(admin.sayuwon.com) 자동 가져오기 ----------
//  - 사담 런치1부 · 2부 · 디너, 몽몽마방 사유의 밥상: 날짜별 정원 · 현재 인원 · 팀 수 → kv 'admin' (JSON)
//  - BIG_TEAM 명 이상 예약 → calls 에 「자동 등록 · 전화 필요」로 한 줄씩 (관리자 예약번호 adm… 로 한 번만)
function slotOf(name) {
  name = String(name || '');
  if (/사담\s*런치\s*1부/.test(name)) return 'L1';
  if (/사담\s*런치\s*2부/.test(name)) return 'L2';
  if (/사담\s*디너/.test(name)) return 'D';
  if (/사유의\s*밥상/.test(name) && !/단체/.test(name)) return 'MB';
  return '';
}
async function syncAdmin(env) {
  if (!env.ADMIN_ID || !env.ADMIN_PW) throw fail('ADMIN_ID · ADMIN_PW 비밀 값이 없습니다');
  const lr = await fetch(ADMIN_API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: env.ADMIN_ID, password: env.ADMIN_PW }) });
  let lb = {}; try { lb = await lr.json(); } catch (x) { lb = {}; }
  if (lr.status !== 200 || !lb.access_token) throw fail('관리자 로그인 실패 (' + lr.status + ') ' + (lb.message || ''));
  const get = async path => { const r = await fetch(ADMIN_API + path, { headers: { Cookie: 'admin_access_token=' + lb.access_token } });
    if (r.status !== 200) throw fail('관리자 조회 실패 ' + path + ' (' + r.status + ') ' + (await r.text()).slice(0, 120)); return r.json(); };
  // 1) 사담 · 마방 현황: 이번 달부터 4개월
  const k = kstDate(), days = {};
  for (let i = 0; i < 4; i++) {
    const m = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + i, 1)), ym = m.toISOString().slice(0, 7).replace('-', '');
    (await get('/admin/product/sales-schedule/product/' + ym + '?search=')).forEach(p => {
      const slot = slotOf(p.name); if (!slot || !p.yyyymmdd) return;
      const d = String(p.yyyymmdd).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      (days[d] = days[d] || {})[slot] = { cur: p.current_confirm != null ? p.current_confirm : p.current, max: p.max_capacity, team: p.team_current, teamMax: p.team_max_capacity, close: p.close === 'Y' ? 1 : 0 };
    });
  }
  // 2) 15명 이상 예약 → calls 에 없으면 추가
  const list = await get('/admin/reservation/reservations?from_date=' + kstYmd() + '&to_date=' + kstYmd(Date.now() + LOOKAHEAD_DAYS * 864e5) + '&search=&product_gubun=&reservation_status=0');
  const big = list.filter(r => Number(r.all_cnt) >= BIG_TEAM), have = {};
  (await rows(env, "SELECT id FROM calls WHERE id LIKE 'adm%'")).forEach(r => { have[r.id] = true; });
  let added = 0;
  for (const r of big) {
    const id = 'adm' + r.seq; if (have[id] || !ID_OK.test(id)) continue;
    const cnt = String(r.all_cnt), slot = slotOf(r.product_name);
    await put(env, { id, saved: iso(), takenBy: '자동', callType: '단체예약', summary: '자동 등록 · 전화 필요 · ' + (r.product_name || ''),
      date: r.visit_date || '', people: cnt, contact: r.member_name || '', phone: r.phone_number || '',
      sadam1: slot === 'L1' ? cnt : '', sadam2: slot === 'L2' ? cnt : '', sadamD: slot === 'D' ? cnt : '', mabangL: slot === 'MB' ? cnt : '',
      note: '관리자 예약 ' + (r.number || r.seq) + ' · ' + (r.product_name || '') + ' · ' + (r.visitor_cnt || cnt + '명') +
        ' · 결제 ' + (r.payment_amount != null ? Number(r.payment_amount).toLocaleString('en-US') + '원' : '-') + ' · ' + (r.reservation_type_name || '') });
    have[id] = true; added++;
  }
  await kvSet(env, 'admin', JSON.stringify({ updated: iso(), days }));
  return { sadamDays: Object.keys(days).length, big: big.length, added };
}

// ---------- 자료 옮기기 (구글 시트 → 여기 · 한 번만): MIGRATE_KEY 비밀 값이 있어야 하고 요청의 mkey 가 같아야 함 ----------
//  수정 일시 · 삭제 표시를 그대로 둔 채 넣음 (put 은 수정 일시를 지금으로 바꾸므로 쓰지 않음). 여러 번 보내도 같은 결과
async function importData(env, req) {
  if (!env.MIGRATE_KEY || String(req.mkey || '') !== env.MIGRATE_KEY) throw fail('bad_key');
  const out = { calls: 0, members: 0, quotereq: 0, files: 0, quoteHistory: 0, catalog: 0, skipped: [] };
  const batch = async stmts => { for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40)); };
  const cs = (req.calls || []).filter(x => { const ok = x && ID_OK.test(String(x.id || '')); if (!ok) out.skipped.push(String((x && x.id) || '(id 없음)')); return ok; }).map(x => putStmt(env, rowOf(x)));
  await batch(cs); out.calls = cs.length;
  if (Array.isArray(req.members)) {
    await ensureMemberPhone(env);
    const have = {}; (await rows(env, 'SELECT emp FROM members')).forEach(m => { have[normEmp(m.emp)] = true; });
    const ms = req.members.filter(m => m && m.name && m.emp && !have[normEmp(m.emp)]).map(m => q(env, "INSERT INTO members (emp, name, phone, added, \"by\", deleted) VALUES (?, ?, ?, ?, ?, '')", String(m.emp), String(m.name), memPhone(m.phone), String(m.added || ''), String(m.by || '')));
    await batch(ms); out.members = ms.length;
  }
  const qs = (req.quotereq || []).filter(o => o && o.id).map(o => q(env, 'INSERT INTO quotereq (' + QR_COLS + ') VALUES (' + QR_KEYS.map((k, i) => '?' + (i + 1)).join(',') + ') ON CONFLICT(id) DO UPDATE SET ' + QR_KEYS.slice(1).map((k, i) => '"' + k + '"=?' + (i + 2)).join(','), ...QR_KEYS.map(k => String(o[k] == null ? '' : o[k]))));
  await batch(qs); out.quotereq = qs.length;
  for (const f of (req.files || [])) { if (!f || !f.id || !f.data) continue; await saveFile(env, String(f.id), ['doc', 'manual'].includes(f.kind) ? f.kind : 'ment', String(f.name || ''), String(f.mime || ''), String(f.data), '이관'); out.files++; }
  if (req.admin) await kvSet(env, 'admin', JSON.stringify(req.admin));
  if (Array.isArray(req.clergy) && req.clergy.length) {   // 무료입장 명부 (백업에서 되살리기 · 줄 그대로 · replace 면 같은 id 를 덮어씀)
    await ensureClergy(env);
    const C = ['id', 'visit_date', 'org', 'name', 'pos', 'phone', 'note', 'turn', 'who', 'added', 'by', 'updated', 'deleted'];
    const list = req.clergy.filter(r => r && r.id).map(r => Object.fromEntries(C.map(k => [k, String(r[k] == null ? '' : r[k])])));
    await q(env, 'INSERT OR ' + (req.replace ? 'REPLACE' : 'IGNORE') + ' INTO clergy (' + C.map(k => '"' + k + '"').join(',') + ') SELECT ' + C.map(k => "json_extract(value,'$." + k + "')").join(',') + ' FROM json_each(?)', JSON.stringify(list)).run();
    await kvSet(env, 'clergy_moved', '1'); out.clergy = list.length;
  }
  // 홍보 기자 리스트 · 고객 응대 매뉴얼 (2026-11-25 · 되살리기에 빠져 있던 것): export 가 준 줄 그대로 (수정 일시 · 지운 표시 유지) · replace 면 같은 id 를 덮어쓰고 아니면 없는 id 만
  for (const [t, ens] of [['press', ensurePress], ['manual', ensureManual]]) {
    const list = (Array.isArray(req[t]) ? req[t] : []).filter(r => r && r.id).map(r => Object.fromEntries(MIRROR[t].map(k => [k, k === 'ord' ? Number(r.ord) || 0 : k === 'data' ? (typeof r.data === 'string' ? r.data : JSON.stringify(r.data || {})) : String(r[k] == null ? '' : r[k])])));
    if (!list.length) continue;
    await ens(env);
    await q(env, 'INSERT OR ' + (req.replace ? 'REPLACE' : 'IGNORE') + ' INTO ' + t + ' (' + MIRROR[t].map(k => '"' + k + '"').join(',') + ') SELECT ' + MIRROR[t].map(k => "json_extract(value,'$." + k + "')").join(',') + ' FROM json_each(?)', JSON.stringify(list)).run();
    out[t] = list.length;
  }
  // 견적서 서버 자료: 발급 내역은 없는 id 만 더함 (있는 줄은 그대로 — 새 서버에서 한 발급 취소를 지우지 않게) · 품목 목록은 새 서버에 아직 없을 때만
  //   replace:true (tools/restore.html 의 「백업 때 모습으로 덮어쓰기」) 이면 발급 내역 · 품목 목록도 받은 것으로 바꿈
  const hs = (req.quoteHistory || []).filter(h => h && h.id).map(h => req.replace
    ? q(env, 'INSERT INTO quote_history (id, at, data) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET at=?2, data=?3', String(h.id), String(h.at || ''), JSON.stringify(h)) : histStmt(env, h));   // 있는 줄은 자리(순서)를 지킨 채 내용만 바꿈
  await batch(hs); out.quoteHistory = hs.length;
  if (req.catalog && (req.replace || !(await kvGet(env, 'catalog')))) { await kvSet(env, 'catalog', JSON.stringify(req.catalog)); out.catalog = 1; }
  return out;
}

// ---------- 테스트 DB 를 배포 DB 와 똑같이 만들기 (2026-11-25 · tools/test-start.ps1 · docs 45절) ----------
//  비밀 값 TEST_SYNC_KEY 가 있는 서버에서만 됨 — 이 값은 테스트 서버(sayuwon-api-test)에만 넣음. 배포 서버에는 절대 넣지 않음 (넣지 않으면 이 동작은 늘 bad_key → 배포 DB 는 지워질 수 없음)
//  mirror {key, step:'begin'} 모든 표를 비움 → {key, table, rows:[export 가 준 줄 그대로]} 넣은 순서대로 넣음 → {key, step:'done'} 화면에 알리고 표마다 줄 수를 돌려줌
const MIRROR = { members: ['emp', 'name', 'phone', 'added', 'by', 'deleted'], calls: ['id', 'call_type', 'visit_date', 'updated', 'deleted', 'data'], quotereq: QR_KEYS, quote_history: ['id', 'at', 'data'],
  files: ['id', 'kind', 'name', 'mime', 'size', 'at', 'by'], file_chunks: ['id', 'n', 'data'], press: ['id', 'list', 'cat', 'media', 'name', 'pos', 'phone', 'email', 'memo', 'ord', 'updated', 'by', 'deleted'],
  manual: ['id', 'kind', 'cat', 'title', 'start', 'end', 'ord', 'data', 'updated', 'by', 'deleted'], clergy: ['id', 'visit_date', 'org', 'name', 'pos', 'phone', 'note', 'turn', 'who', 'added', 'by', 'updated', 'deleted'], kv: ['k', 'v'] };
async function mirror(env, req) {
  if (!env.TEST_SYNC_KEY || String(req.key || '') !== env.TEST_SYNC_KEY) throw fail('bad_key');
  await ensureMemberPhone(env); await ensureClergy(env); await ensurePress(env); await ensureManual(env);
  const names = Object.keys(MIRROR);
  if (req.step === 'begin') { await env.DB.batch(names.map(t => q(env, 'DELETE FROM ' + t + (t === 'kv' ? " WHERE k NOT LIKE 'fail:%'" : ''))).concat(q(env, 'DELETE FROM locks'))); return { wiped: names }; }   // 한 묶음(트랜잭션)
  if (req.step === 'done') { await bumpRev(env);
    return { counts: await q(env, 'SELECT ' + names.map(t => '(SELECT count(*) FROM ' + t + (t === 'kv' ? " WHERE k NOT LIKE 'fail:%' AND k<>'qr_rate' AND k<>'rev'" : '') + ') AS ' + t).join(', ')).first() }; }
  const t = String(req.table || ''), cols = MIRROR[t]; if (!cols) throw fail('bad_table');
  const list = (Array.isArray(req.rows) ? req.rows : []).filter(Boolean); if (!list.length) return { table: t, rows: 0 };
  const C = cols.map(k => '"' + k + '"').join(',');
  // 줄이 적으면(큰 파일 조각 등) 값을 그대로 묶고, 많으면 한 문장으로 (D1 은 요청 하나에 쿼리 50번 · 값 하나 2MB 까지 — 보내는 쪽이 한 번에 0.7MB 아래로 끊어 보냄)
  if (list.length <= 5) await env.DB.batch(list.map(r => q(env, 'INSERT OR REPLACE INTO ' + t + ' (' + C + ') VALUES (' + cols.map(() => '?').join(',') + ')', ...cols.map(k => r[k] == null ? '' : r[k]))));
  else await q(env, 'INSERT OR REPLACE INTO ' + t + ' (' + C + ') SELECT ' + cols.map(k => "json_extract(value,'$." + k + "')").join(',') + ' FROM json_each(?)', JSON.stringify(list)).run();
  return { table: t, rows: list.length };
}

// ---------- 홍보 기자 리스트 (press · 2026-11-24 · press.html) ----------
//  한 줄 = 기자 한 명 (리스트 · 구분 · 매체 · 이름 · 직위/소속 · 휴대폰 · 이메일 · 메모). 개인 연락처이므로 로그인한 사람만 · 화면 코드(GitHub)에는 넣지 않음
//  pressList → {items:[…]} 지워지지 않은 줄 전체 · pressSave {rows} 있으면 고치고 없으면 더함(id) · pressDel {ids} 지운 표시 · 모두 바꾸면 rev 를 올려 다른 화면이 바로 받음
const PRESS_COLS = ['id', 'list', 'cat', 'media', 'name', 'pos', 'phone', 'email', 'memo', 'ord'];
let pressReady = false;
async function ensurePress(env) {
  if (pressReady) return;
  await env.DB.batch([
    q(env, "CREATE TABLE IF NOT EXISTS press (id TEXT PRIMARY KEY, list TEXT NOT NULL DEFAULT '', cat TEXT NOT NULL DEFAULT '', media TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', memo TEXT NOT NULL DEFAULT '', ord REAL NOT NULL DEFAULT 0, updated TEXT NOT NULL DEFAULT '', \"by\" TEXT NOT NULL DEFAULT '', deleted TEXT NOT NULL DEFAULT '')"),
    q(env, 'CREATE INDEX IF NOT EXISTS press_list ON press(list)'),
  ]);
  pressReady = true;
}
const PRESS_JSON = "json_object('id',id,'list',list,'cat',cat,'media',media,'name',name,'pos',pos,'phone',phone,'email',email,'memo',memo,'ord',ord,'updated',updated,'by',\"by\")";
async function pressList(env) {
  const r = await q(env, "SELECT json_group_array(" + PRESS_JSON + ") AS j FROM (SELECT * FROM press WHERE deleted='' ORDER BY ord, rowid)").first();
  return { __raw: '{"ok":true,"items":' + ((r && r.j) || '[]') + ',"api":10}' };
}
async function pressSave(env, req) {
  const by = clT(req.who && req.who.name, 20), now = iso(), t = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, n);
  const list = (Array.isArray(req.rows) ? req.rows : []).slice(0, 3000).map((r, i) => ({ id: /^[a-z0-9]{4,40}$/.test(String(r.id || '')) ? String(r.id) : 'p' + rand(6) + i.toString(36),
    list: t(r.list, 80), cat: t(r.cat, 40), media: t(r.media, 80), name: t(r.name, 60), pos: t(r.pos, 120), phone: t(r.phone, 40), email: t(r.email, 120), memo: t(r.memo, 600), ord: Number(r.ord) || 0, updated: now, by }));
  if (!list.length) return [];
  // 한 문장으로 (D1 은 요청 하나에 쿼리 50번까지): 있으면 고치고 없으면 더함
  await q(env, 'INSERT INTO press (id, list, cat, media, name, pos, phone, email, memo, ord, updated, "by", deleted) SELECT ' + ['id','list','cat','media','name','pos','phone','email','memo','ord','updated','by'].map(k => "json_extract(value,'$." + k + "')").join(',') + ", '' FROM json_each(?1) WHERE true "
    + 'ON CONFLICT(id) DO UPDATE SET list=excluded.list, cat=excluded.cat, media=excluded.media, name=excluded.name, pos=excluded.pos, phone=excluded.phone, email=excluded.email, memo=excluded.memo, ord=excluded.ord, updated=excluded.updated, "by"=excluded."by", deleted=\'\'', JSON.stringify(list)).run();
  return list.map(r => r.id);
}
async function pressDel(env, req) {
  const ids = (Array.isArray(req.ids) ? req.ids : []).map(String).filter(x => /^[a-z0-9]{4,40}$/.test(x)).slice(0, 3000);
  if (!ids.length) return 0;
  const r = await q(env, "UPDATE press SET deleted=?1, updated=?2 WHERE deleted='' AND id IN (SELECT value FROM json_each(?3))", kstStamp() + ' ' + clT(req.who && req.who.name, 20), iso(), JSON.stringify(ids)).run();
  return (r.meta && r.meta.changes) || 0;
}

// ---------- 고객 응대 매뉴얼 (manual · 2026-11-24 · manual.html · js/manual.js) ----------
//  한 줄 = 매뉴얼의 한 조각. kind: sec(장 · 글) · prod(상품) · faq(응대 FAQ) · proc(내부 업무 절차) · notice(올린 안내문) · prop(안내문을 정리한 반영 제안)
//  title · cat(구분/카테고리) · start/end(판매 · 운영 기간, 비면 늘) · ord(순서) · data(그 밖의 칸 JSON 글자: 본문 · 가격 · 시간 · 고친 이력 hist 등)
//  manualList → 지워지지 않은 줄 전체 · manualSave {rows} 있으면 고치고 없으면 더함 · manualDel {ids} 지운 표시 · 로그인한 사람만 (내부 연락처 · 링크가 들어 있어 화면 코드(GitHub)에는 넣지 않음)
//  안내문 파일(이미지 · PDF · 워드): manualFilePut {name, mime, data(base64)} → {id} · manualFileGet {id} → {mime, name, data}
let manualReady = false;
async function ensureManual(env) {
  if (manualReady) return;
  await env.DB.batch([
    q(env, "CREATE TABLE IF NOT EXISTS manual (id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT '', cat TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', start TEXT NOT NULL DEFAULT '', \"end\" TEXT NOT NULL DEFAULT '', ord REAL NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}', updated TEXT NOT NULL DEFAULT '', \"by\" TEXT NOT NULL DEFAULT '', deleted TEXT NOT NULL DEFAULT '')"),
    q(env, 'CREATE INDEX IF NOT EXISTS manual_kind ON manual(kind)'),
  ]);
  manualReady = true;
}
const MANUAL_JSON = "json_object('id',id,'kind',kind,'cat',cat,'title',title,'start',start,'end',\"end\",'ord',ord,'data',data,'updated',updated,'by',\"by\")";
async function manualList(env) {
  const r = await q(env, "SELECT json_group_array(" + MANUAL_JSON + ") AS j FROM (SELECT * FROM manual WHERE deleted='' ORDER BY ord, rowid)").first();
  return { __raw: '{"ok":true,"items":' + ((r && r.j) || '[]') + ',"api":11}' };
}
const MANUAL_KINDS = /^(sec|prod|faq|proc|notice|prop)$/;
async function manualSave(env, req) {
  const by = clT(req.who && req.who.name, 20), now = iso(), t = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, n), ymd = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  const list = (Array.isArray(req.rows) ? req.rows : []).slice(0, 1000).map((r, i) => { const d = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || {});
    if (d.length > 200000) throw fail('한 항목이 너무 깁니다');
    return { id: /^[a-z0-9]{4,40}$/.test(String(r.id || '')) ? String(r.id) : 'm' + rand(6) + i.toString(36), kind: MANUAL_KINDS.test(String(r.kind || '')) ? String(r.kind) : 'sec',
      cat: t(r.cat, 60), title: t(r.title, 200), start: ymd(r.start), end: ymd(r.end), ord: Number(r.ord) || 0, data: d, updated: now, by }; });
  if (!list.length) return [];
  await q(env, 'INSERT INTO manual (id, kind, cat, title, start, "end", ord, data, updated, "by", deleted) SELECT ' + ['id','kind','cat','title','start','end','ord','data','updated','by'].map(k => "json_extract(value,'$." + k + "')").join(',') + ", '' FROM json_each(?1) WHERE true "
    + 'ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, cat=excluded.cat, title=excluded.title, start=excluded.start, "end"=excluded."end", ord=excluded.ord, data=excluded.data, updated=excluded.updated, "by"=excluded."by", deleted=\'\'', JSON.stringify(list)).run();
  return list.map(r => r.id);
}
async function manualDel(env, req) {
  const ids = (Array.isArray(req.ids) ? req.ids : []).map(String).filter(x => /^[a-z0-9]{4,40}$/.test(x)).slice(0, 1000);
  if (!ids.length) return 0;
  const r = await q(env, "UPDATE manual SET deleted=?1, updated=?2 WHERE deleted='' AND id IN (SELECT value FROM json_each(?3))", kstStamp() + ' ' + clT(req.who && req.who.name, 20), iso(), JSON.stringify(ids)).run();
  return (r.meta && r.meta.changes) || 0;
}
const MANUAL_FILE_TYPES = /^(image\/(jpeg|png|gif|webp)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/;
async function manualFilePut(env, req) {
  const mime = String(req.mime || ''), data = String(req.data || '');
  if (!MANUAL_FILE_TYPES.test(mime)) throw fail('이미지 · PDF · 워드(docx) · 글(txt)만 올릴 수 있습니다');
  if (!data.length) throw fail('빈 파일');
  if (b64Bytes(data) > UPLOAD_MAX) throw fail('10MB 이하만 올릴 수 있습니다');
  const id = 'n' + rand(16), name = cleanName(req.name || '안내문', 80) || '안내문';
  await saveFile(env, id, 'manual', name, mime, data, req.who && req.who.name);
  return { id, name, mime, at: iso() };
}
async function manualFileGet(env, id) {
  const f = await readFile(env, String(id || ''));
  if (!f || f.kind !== 'manual') throw fail('not_allowed');
  return { id: f.id, name: f.name, mime: f.mime, data: f.data };
}

// ---------- 대구대교구 무료입장 명부 (clergy · 2026-11-23) ----------
//  한 줄 = 한 번 방문. 화면(js/clergy.js)은 열 때 · 바뀔 때(rev) 명부 전체를 받아 그 안에서 찾음 (천여 줄 · 약 150KB)
//  clergyList → {items:[{id, date, org, name, pos, phone, note, turn, added, by}], moved}
//  clergyAdd {row} → 회차(그해 같은 사람 방문 수 + 1)를 서버가 세어 넣음 (넣는 문장 안에서 세므로 둘이 같이 넣어도 맞음)
//  clergyDel {id} · clergyImport {rows, replace} (엑셀 불러오기 · replace 면 지금 명부를 지운 표시를 하고 바꿈 · 문장 하나로 모두 넣음 — D1 은 요청 하나에 쿼리 50번까지라)
let clergyReady = false;
async function ensureClergy(env) {   // 표가 없으면 만듦 (schema.sql 을 Console 에서 다시 돌리지 않아도 되게)
  if (clergyReady) return;
  await env.DB.batch([
    q(env, 'CREATE TABLE IF NOT EXISTS clergy (id TEXT PRIMARY KEY, visit_date TEXT NOT NULL DEFAULT \'\', org TEXT NOT NULL DEFAULT \'\', name TEXT NOT NULL DEFAULT \'\', ' +
      'pos TEXT NOT NULL DEFAULT \'\', phone TEXT NOT NULL DEFAULT \'\', note TEXT NOT NULL DEFAULT \'\', turn TEXT NOT NULL DEFAULT \'\', who TEXT NOT NULL DEFAULT \'\', ' +
      'added TEXT NOT NULL DEFAULT \'\', "by" TEXT NOT NULL DEFAULT \'\', updated TEXT NOT NULL DEFAULT \'\', deleted TEXT NOT NULL DEFAULT \'\')'),
    q(env, 'CREATE INDEX IF NOT EXISTS clergy_who ON clergy(who)'),
    q(env, 'CREATE INDEX IF NOT EXISTS clergy_date ON clergy(visit_date)'),
  ]);
  await clergyRewho(env);
  clergyReady = true;
}
const clT = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
// 같은 사람 = 소속 · 이름 · 연락처가 모두 같음 (2026-11-23 · 화면 js/clergy.js 의 who 와 같은 규칙). 회차는 이것으로 셈
const clOrg = v => normName(v).replace(/^\((재|복|사)\)/, '').replace(/^천주교/, '');
const clWho = (org, name, phone) => clOrg(org) + '|' + normName(name) + '|' + String(phone || '').replace(/\D/g, '');
async function clergyRewho(env) {   // 예전 규칙(이름 · 연락처)으로 적힌 who 를 한 번 다시 적음 (kv clergy_who = '2')
  if ((await kvGet(env, 'clergy_who')) === '2') return;
  const list = (await rows(env, 'SELECT id, org, name, phone FROM clergy')).map(r => ({ id: r.id, w: clWho(r.org, r.name, r.phone) }));
  if (list.length) await q(env, "UPDATE clergy SET who=j.w FROM (SELECT json_extract(value,'$.id') AS id, json_extract(value,'$.w') AS w FROM json_each(?)) AS j WHERE clergy.id=j.id", JSON.stringify(list)).run();
  await kvSet(env, 'clergy_who', '2');
}
function clRow(r, by, i) {
  const o = { id: 'c' + rand(6) + (i == null ? '' : i.toString(36)), date: clT(r.date, 10), org: clT(r.org, 80), name: clT(r.name, 40), pos: clT(r.pos, 30),
    phone: clT(r.phone, 30), note: clT(r.note, 300), turn: clT(r.turn, 20), added: kstStamp(), by: clT(by, 20), updated: iso() };
  o.who = clWho(o.org, o.name, o.phone);
  return o;
}
const CL_JSON = "json_object('id',id,'date',visit_date,'org',org,'name',name,'pos',pos,'phone',phone,'note',note,'turn',turn,'added',added,'by',\"by\")";
async function clergyList(env) {
  const r = await q(env, "SELECT json_group_array(" + CL_JSON + ") AS j FROM (SELECT * FROM clergy WHERE deleted='' ORDER BY visit_date DESC, rowid)").first();
  return { __raw: '{"ok":true,"items":' + ((r && r.j) || '[]') + ',"moved":' + (await kvGet(env, 'clergy_moved') ? 'true' : 'false') + ',"api":8}' };
}
async function clergyAdd(env, req) {
  const o = clRow(req.row || {}, req.who && req.who.name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw fail('bad_date');
  if (!o.name) throw fail('no_name');
  await q(env, 'INSERT INTO clergy (id, visit_date, org, name, pos, phone, note, turn, who, added, "by", updated, deleted) ' +
    "SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT COUNT(*) + 1 FROM clergy WHERE who=?8 AND deleted='' AND substr(visit_date,1,4)=substr(?2,1,4)) || '회차', ?8, ?9, ?10, ?11, ''",
    o.id, o.date, o.org, o.name, o.pos, o.phone, o.note, o.who, o.added, o.by, o.updated).run();
  const r = await q(env, 'SELECT ' + CL_JSON + ' AS j FROM clergy WHERE id=?', o.id).first();
  return JSON.parse(r.j);
}
async function clergyDel(env, req) {
  const id = String(req.id || ''), by = clT(req.who && req.who.name, 20);
  const r = await q(env, "UPDATE clergy SET deleted=?, updated=? WHERE id=? AND deleted=''", kstStamp() + ' ' + by, iso(), id).run();
  return (r.meta && r.meta.changes) || 0;
}
async function clergyImport(env, req, by) {
  const list = (Array.isArray(req.rows) ? req.rows : []).slice(0, 5000).map((r, i) => clRow(r || {}, by, i)).filter(o => o.name);
  const stmts = [];
  if (req.replace) stmts.push(q(env, "UPDATE clergy SET deleted=?, updated=? WHERE deleted=''", kstStamp() + ' ' + clT(by, 20) + ' (엑셀로 바꿈)', iso()));
  if (list.length) stmts.push(q(env, 'INSERT OR IGNORE INTO clergy (id, visit_date, org, name, pos, phone, note, turn, who, added, "by", updated, deleted) ' +
    "SELECT json_extract(value,'$.id'), json_extract(value,'$.date'), json_extract(value,'$.org'), json_extract(value,'$.name'), json_extract(value,'$.pos'), json_extract(value,'$.phone'), " +
    "json_extract(value,'$.note'), json_extract(value,'$.turn'), json_extract(value,'$.who'), json_extract(value,'$.added'), json_extract(value,'$.by'), json_extract(value,'$.updated'), '' FROM json_each(?)", JSON.stringify(list)));
  stmts.push(q(env, "INSERT INTO kv (k, v) VALUES ('clergy_moved', '1') ON CONFLICT(k) DO UPDATE SET v='1'"));
  await env.DB.batch(stmts);   // 한 묶음(트랜잭션) — 중간에 실패하면 지운 표시도 되돌아감
  return list.length;
}

// 내려받기에 쓰는 SQL (표마다 · seq = 넣은 순서). 틀린 로그인 횟수 · 견적 요청 수 제한 같은 잠깐 쓰는 값은 뺌
const EXPORT_SQL = () => { const tail = ' WHERE rowid>? ORDER BY rowid LIMIT ?'; return {
  calls: 'SELECT rowid AS seq, id, call_type, visit_date, updated, deleted, data FROM calls' + tail,
  members: 'SELECT rowid AS seq, emp, name, phone, added, "by", deleted FROM members' + tail,
  quotereq: 'SELECT rowid AS seq, ' + QR_COLS + ' FROM quotereq' + tail,
  quote_history: 'SELECT rowid AS seq, id, at, data FROM quote_history' + tail,
  files: 'SELECT rowid AS seq, id, kind, name, mime, size, at, "by" FROM files' + tail,
  file_chunks: 'SELECT rowid AS seq, id, n, data FROM file_chunks' + tail,
  press: 'SELECT rowid AS seq, id, list, cat, media, name, pos, phone, email, memo, ord, updated, "by", deleted FROM press' + tail,
  manual: 'SELECT rowid AS seq, id, kind, cat, title, start, "end", ord, data, updated, "by", deleted FROM manual' + tail,
  clergy: 'SELECT rowid AS seq, id, visit_date, org, name, pos, phone, note, turn, who, added, "by", updated, deleted FROM clergy' + tail,
  kv: "SELECT rowid AS seq, k, v FROM kv WHERE rowid>? AND k NOT LIKE 'fail:%' AND k<>'qr_rate' AND k<>'rev' ORDER BY rowid LIMIT ?",
}; };

// ---------- 바뀜 기다리기 (2026-11-23 · 다른 컴퓨터에도 바로) ----------
//  kv 'rev' = 공유 기록이 마지막으로 바뀐 일시. 저장 · 삭제 · 고객 견적 요청 · 담당 지정 때마다 올림 (bumpRev)
//  동작 wait {rev}: 화면이 알고 있는 rev 와 달라질 때까지 서버가 붙잡고 기다렸다가(1초마다 확인 · 길어야 약 25초) 바뀌는 순간 답함 → 화면은 답을 받자마자 목록을 다시 받고 곧바로 또 기다림
//  = 서버가 먼저 알려 주는 것과 같은 효과 (약 1초 안). 요청 수는 화면이 25초마다 묻던 예전과 비슷 (바뀐 것이 없으면 25초에 한 번)
//  무료 요금제: 기다리는 시간은 CPU 시간에 안 들어감 · D1 조회는 요청 하나에 50번까지 → 25번만 확인
const bumpRev = env => kvSet(env, 'rev', iso());
const WAIT_TICKS = 25, WAIT_MS = 1000;
async function waitRev(env, have) {
  let cur = '';
  for (let i = 0; i < WAIT_TICKS; i++) {
    cur = (await kvGet(env, 'rev')) || '0';
    if (!have || cur !== have) return { ok: true, rev: cur, changed: !!have };
    await new Promise(r => setTimeout(r, WAIT_MS));
  }
  return { ok: true, rev: cur, changed: false };
}

// ---------- 요청 하나 처리 (예전 Apps Script 의 doPost 와 같은 순서) ----------
export async function api(req, env, origin = '', ip = '') {
  const a = req.action, err = (pre, e) => ({ ok: false, error: pre + String((e && e.message) || e) });
  // 로그인 없이 되는 것
  if (a === 'login') { if (isBlocked(await failState(env, ip))) return { ok: false, error: 'too_many' };   // 로그인 확인 (이름 + 사번이 멤버인지) · 틀린 로그인이 이어지면 잠시 막음
    const r = await memberLogin(env, req.name, req.emp); if (!r.member) await noteFail(env, ip, req.name, req.emp); return r; }
  if (a === 'quoteGet' && !req.history) return { ok: true, data: await readCatalog(env), historyApi: 3 };   // 품목 목록(가격표)은 로그인 없이 읽기
  if (a === 'mentList') { try { const o = await getItem(env, 'mentdb'); return { ok: true, ment: o && !o.deleted ? { history: o.history, saved: o.saved } : null }; } catch (e) { return err('mentlist: ', e); } }   // 전화응대 멘트 읽기
  if (a === 'menuGet') { try { const o = await getItem(env, 'menudb'); return { ok: true, menu: o && !o.deleted ? { history: o.history, updated: o.updated } : null, api: 12 }; } catch (e) { return err('menuget: ', e); } }   // 메뉴 설정 읽기 (PC · 모바일에 보일 메뉴 · 2026-11-26 · api 12 — 로그인하지 않은 화면의 메뉴도 이 설정을 따라야 해서 로그인 없이)
  if (a === 'mentImgGet') { try { return { ok: true, file: await mentImgGet(env, String(req.id || '')) }; } catch (e) { return err('mentimg: ', e); } }   // 멘트 이미지 한 장
  if (a === 'bookList') { try { return { ok: true, items: await bookList(env), api: 6, srv: 14 }; } catch (e) { return err('booklist: ', e); } }   // 예약 현황 공유 목록 (연락처 칸은 빼고 줌)
  if (a === 'lostList') { try { return { ok: true, items: await lostList(env), api: 13 }; } catch (e) { return err('lostlist: ', e); } }   // 분실물 목록 (로그인 없이 보는 화면용)
  if (a === 'lostAdd') { try { const id = await lostAdd(env, req); await bumpRev(env); return { ok: true, id, api: 9 }; } catch (e) { return err('', e); } }   // 분실물 접수
  if (a === 'lostImgPut') { try { return { ok: true, file: await lostImgPut(env, req), api: 9 }; } catch (e) { return err('', e); } }   // 습득물 사진 올리기
  if (a === 'bookAdd') { try { const item = await bookAdd(env, req); await bumpRev(env); return { ok: true, item, api: 6 }; } catch (e) { return err('bookadd: ', e); } }   // 예약 현황에 직접 추가
  if (a === 'quoteReqAdd') { try { const id = await quoteReqAdd(env, req.item || {}); await bumpRev(env); return { ok: true, id, api: 7 }; } catch (e) { return err('', e); } }   // 고객 견적 요청 넣기 (고객이 로그인 없이)
  if (a === 'import') { try { return { ok: true, imported: await importData(env, req) }; } catch (e) { return err('', e); } }   // 백업에서 되살리기 (서버에 MIGRATE_KEY 가 있을 때만)
  if (a === 'mirror') { try { return { ok: true, ...(await mirror(env, req)) }; } catch (e) { return err('', e); } }   // 테스트 서버에서만 (TEST_SYNC_KEY)
  // 여기부터 로그인(멤버)만
  if (req.who && isBlocked(await failState(env, ip))) return { ok: false, error: 'too_many' };
  if (!(await authOk(env, req))) { if (req.who) await noteFail(env, ip, req.who.name, req.who.emp); return { ok: false, error: 'bad_key' }; }
  // 견적서 발급 내역(최근 것부터) · 품목 목록 고치기 · 발급 내역 더하기 · 발급 취소
  if (a === 'quoteGet') return rawRows('history', await rows(env, 'SELECT data FROM (SELECT rowid AS r, data FROM quote_history ORDER BY rowid DESC LIMIT ?) ORDER BY r DESC', Number(req.limit) || 500), '');   // 견적서 발급 내역 (최근 것부터)
  if (a === 'quotePost') { try { return await quotePost(env, req); } catch (e) { return err('', e); } }   // 품목 고치기 · 발급 내역 더하기 · 발급 취소
  // 전체 내려받기 (백업 · 다른 DB 로 옮길 때): 표 하나를 넣은 순서대로 조금씩 — {table, after(마지막으로 받은 seq), limit} → {rows, next}. table 이 없으면 표 이름 목록
  if (a === 'pressList') { await ensurePress(env); return pressList(env); }   // 홍보 기자 리스트 (2026-11-24)
  if (a === 'pressSave') { try { await ensurePress(env); const ids = await pressSave(env, req); await bumpRev(env); return { ok: true, ids, api: 10 }; } catch (e) { return err('', e); } }   // 기자 리스트 저장 (있으면 고치고 없으면 더함)
  if (a === 'pressDel') { try { await ensurePress(env); const n = await pressDel(env, req); await bumpRev(env); return { ok: true, removed: n, api: 10 }; } catch (e) { return err('', e); } }   // 기자 리스트에서 지운 표시
  if (a === 'manualList') { await ensureManual(env); return manualList(env); }   // 고객 응대 매뉴얼 (2026-11-24)
  if (a === 'manualSave') { try { await ensureManual(env); const ids = await manualSave(env, req); await bumpRev(env); return { ok: true, ids, api: 11 }; } catch (e) { return err('', e); } }   // 매뉴얼 저장 (있으면 고치고 없으면 더함)
  if (a === 'manualDel') { try { await ensureManual(env); const n = await manualDel(env, req); await bumpRev(env); return { ok: true, removed: n, api: 11 }; } catch (e) { return err('', e); } }   // 매뉴얼에서 지운 표시
  if (a === 'manualFilePut') { try { return { ok: true, file: await manualFilePut(env, req), api: 11 }; } catch (e) { return err('', e); } }   // 매뉴얼 안내문 파일 올리기
  if (a === 'manualFileGet') { try { return { ok: true, file: await manualFileGet(env, req.id), api: 11 }; } catch (e) { return err('', e); } }   // 매뉴얼 안내문 파일 읽기
  if (a === 'clergyList') { await ensureClergy(env); return clergyList(env); }   // 무료입장 명부 읽기
  if (a === 'clergyAdd') { try { await ensureClergy(env); const item = await clergyAdd(env, req); await bumpRev(env); return { ok: true, item, api: 8 }; } catch (e) { return err('', e); } }   // 무료입장 명부에 한 명 추가 (그해 몇 회차인지 서버가 셈)
  if (a === 'clergyDel') { try { await ensureClergy(env); const n = await clergyDel(env, req); await bumpRev(env); return { ok: true, removed: n, api: 8 }; } catch (e) { return err('', e); } }   // 무료입장 명부에서 지운 표시
  if (a === 'clergyImport') { try { await ensureClergy(env); const n = await clergyImport(env, req, req.who && req.who.name); await bumpRev(env); return { ok: true, imported: n, api: 8 }; } catch (e) { return err('', e); } }   // 무료입장 명부 엑셀로 한꺼번에 넣기
  if (a === 'export') { if (req.table === 'clergy') await ensureClergy(env); if (req.table === 'press') await ensurePress(env); if (req.table === 'manual') await ensureManual(env); if (req.table === 'members') await ensureMemberPhone(env); const t = String(req.table || ''), sql = EXPORT_SQL()[t]; if (!sql) return { ok: true, tables: Object.keys(EXPORT_SQL()) };   // 전체 내려받기: 표 하나를 넣은 순서대로 조금씩 (백업 · 테스트 DB 복사가 씀)
    const lim = t === 'file_chunks' ? 1 : Math.min(Number(req.limit) || 200, 500), rs = await rows(env, sql, Number(req.after) || 0, lim);
    return { ok: true, table: t, rows: rs, next: rs.length === lim ? rs[rs.length - 1].seq : null }; }
  if (a === 'wait') return waitRev(env, String(req.rev || ''));   // 바뀜 기다리기: 다른 화면이 저장하면 그 순간 답함 (다른 컴퓨터에 바로 알리기)
  if (a === 'quoteReqList') return { ok: true, items: await quoteReqList(env), api: 7 };   // 고객 견적 요청 목록
  if (a === 'quoteReqMark') { try { const item = await quoteReqMark(env, req); await bumpRev(env); return { ok: true, item, api: 7 }; } catch (e) { return err('', e); } }   // 고객 견적 요청 처리 표시 (완료 · 삭제)
  if (a === 'members') return { ok: true, members: await readMembers(env), roles: await readRoles(env), srv: 14 };   // srv = 서버 번호 (맨 아래 api 와 같은 숫자 · 2026-11-27 · 로그인한 분실물 화면이 「분실물 신고자」 칸을 보여도 되는 서버인지 봄)   // 멤버 목록 · 담당 지정
  if (a === 'memberRole') { try { await setRole(env, String(req.role || ''), req.emp, !!req.on); await bumpRev(env); return { ok: true, members: await readMembers(env), roles: await readRoles(env) }; } catch (e) { return err('', e); } }   // 담당 지정 (견적서 담당 등)
  if (a === 'memberAdd') { try { return { ok: true, added: await addMembers(env, req.list || [], req.by), members: await readMembers(env), roles: await readRoles(env) }; } catch (e) { return err('', e); } }   // 멤버 추가
  if (a === 'memberPhone') { try { await setMemberPhone(env, req.emp, req.phone); return { ok: true, members: await readMembers(env), roles: await readRoles(env) }; } catch (e) { return err('', e); } }   // 멤버 연락처 고치기 (2026-11-24)
  if (a === 'memberDel') { try { return { ok: true, removed: await delMember(env, req.emp, req.by), members: await readMembers(env), roles: await readRoles(env) }; } catch (e) { return err('', e); } }   // 멤버 빼기 (지운 표시)
  // 목록: since(ISO 일시)를 주면 그 뒤에 저장 · 삭제된 줄만 (delta · 삭제된 줄은 deleted 가 채워져 옴). 없으면 최근 2,000줄 중 지워지지 않은 것
  if (a === 'list') {   // 기록 목록: 전체 또는 since 뒤에 바뀐 것만 (예약 · 통화 · 업무 · 설정 줄 모두)
    const now = iso(), tail = ',"now":' + JSON.stringify(now) + ',"admin":' + (await adminRaw(env)) + ',"api":5';
    if (req.since) return rawList(await rows(env, 'SELECT data FROM calls WHERE updated>?1 OR deleted>?1 ORDER BY rowid', String(req.since)), ',"delta":true' + tail);
    const lim = Number(req.limit) || 2000;
    return rawList(await rows(env, "SELECT data FROM (SELECT rowid AS r, data, deleted FROM calls ORDER BY rowid DESC LIMIT ?) WHERE deleted='' ORDER BY r", lim), tail);
  }
  if (a === 'deleted') return rawList(await rows(env, "SELECT data FROM (SELECT rowid AS r, data FROM calls WHERE deleted<>'' ORDER BY rowid DESC LIMIT ?) ORDER BY r", Number(req.limit) || 1000), ',"api":4');   // 지운 기록 목록 (화면의 「삭제된 …」)
  if (a === 'lock') return editLock(env, req);   // 「고치는 중」 표시 잡기 · 풀기 (두 PC 가 같은 예약을 동시에 못 고치게)
  if (a === 'upload') { try { return { ok: true, file: await upload(env, req, origin) }; } catch (e) { return err('upload: ', e); } }   // 단체 서류 올리기 (사업자등록증 등)
  if (a === 'mentImgPut') { try { return { ok: true, file: await mentImgPut(env, req) }; } catch (e) { return err('mentimg: ', e); } }   // 멘트 이미지 올리기
  if (a === 'syncAdmin') { try { const result = await syncAdmin(env); return { ok: true, result, admin: JSON.parse(await adminRaw(env)) }; } catch (e) { return err('admin_sync: ', e); } }   // 관리자 사이트에서 지금 가져오기 (사담 · 마방 현황 · 큰 단체 자동 등록)
  try {
    if (a === 'put') { const id = await put(env, req.item || {}); await bumpRev(env); return { ok: true, id }; }   // 기록 한 줄 저장 (있으면 고치고 없으면 더함 · 수정 일시는 서버가 적음)
    if (a === 'del') { const id = await del(env, String(req.id || '')); await bumpRev(env); return { ok: true, id }; }   // 기록 한 줄 삭제 = 지운 표시 (줄은 남음)
    return { ok: false, error: 'bad_action' };
  } catch (e) { return err('Error: ', e); }
}

// ---------- Cloudflare 가 부르는 곳 ----------
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const jsonRes = body => new Response(typeof body === 'string' ? body : JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method === 'GET') {
      // 2026-11-23: /file/<id>/<보이는 이름> 도 받음 — 브라우저는 탭 제목 · 저장 이름을 주소 끝에서 가져가므로 화면에 보이는 이름을 주소 끝에 붙임 (뒤 이름은 무시하고 id 로 찾음)
      const m = url.pathname.match(/^\/file\/([a-zA-Z0-9_-]{8,80})(?:\/[^/]*)?$/);
      if (!m) return jsonRes({ ok: true, app: 'sayuwon-group-intake', api: 14, db: 'd1', ...(env.TEST_SYNC_KEY ? { testSync: true } : {}) });   // api 14 = 예약 현황 로그인 없는 직접 추가(bookAdd)가 추가한 사람 이름 · 연락처를 따로 받아 둠 · bookList 응답에 srv (2026-11-28) / api 13 = 분실물 신고자(고객) 이름 · 전화번호: lostAdd 가 받고 lostList 는 로그인 없는 사람에게 보내지 않음 · members 가 srv 를 돌려줌 (2026-11-27) · api 8 = /file/<id>/<이름> 받음 · api 9 = mirror · api 10 = import 가 press · manual 도 받음 · api 11 = lostAdd 가 분실 신고의 사진도 받음 (lostList 도 api 11 을 돌려줌) · api 12 = menuGet (메뉴 설정 읽기) (testSync 는 테스트 서버에서만 보임)
      const f = await readFile(env, m[1]);
      if (!f || f.kind !== 'doc') return new Response('파일이 없습니다', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      const bin = atob(f.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': f.mime || 'application/octet-stream', 'Content-Disposition': "inline; filename*=UTF-8''" + encodeURIComponent(f.name), 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
    }
    let req; try { req = JSON.parse((await request.text()) || '{}'); } catch (e) { return jsonRes({ ok: false, error: 'bad_json' }); }
    try { const r = await api(req, env, url.origin, request.headers.get('CF-Connecting-IP') || ''); return jsonRes(r && r.__raw ? r.__raw : r); }
    catch (e) { return jsonRes({ ok: false, error: String((e && e.message) || e) }); }
  },
  // 예약 작업(Cron Trigger · 15분마다): 관리자 사이트에서 가져오기. 비밀 값이 없으면 아무것도 안 함
  async scheduled(event, env, ctx) {
    if (!env.ADMIN_ID || !env.ADMIN_PW) return;
    ctx.waitUntil(syncAdmin(env).catch(e => console.log('syncAdmin 실패: ' + ((e && e.message) || e))));
  },
};
