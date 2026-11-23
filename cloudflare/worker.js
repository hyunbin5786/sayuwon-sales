// ===== 사유원 운영 보조 시스템 · 공유 기록 서버 (Cloudflare Worker + D1) =====
// apps-script/group-intake.gs 가 하던 일을 그대로 옮긴 것 (2026-11-23). 화면은 js/common.js 의 SY.call 로 예전과 같은 요청을 보냄 (README 11절 「서버 동작 목록」)
//   요청: POST 본문 = JSON { action, who:{name, emp}, … }  (Content-Type 없이 보내도 됨 — 사전 확인 요청 없이 바로 옴)
//   응답: { ok:true, … } 또는 { ok:false, error }
// 연결(바인딩): DB = D1 데이터베이스 (cloudflare/schema.sql 로 표를 만든 것)
// 비밀 값(Worker 설정 → 변수와 비밀): ADMIN_ID · ADMIN_PW (관리자 사이트 조회 계정) · MIGRATE_KEY (자료를 옮길 때만 · 끝나면 지움) · PASSCODE (예전 팀 비밀번호 · 없어도 됨)
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

// ---------- 멤버 · 로그인 ----------
async function readMembers(env) {
  return (await rows(env, "SELECT name, emp, added, \"by\" FROM members WHERE deleted='' AND name<>'' AND emp<>'' ORDER BY rowid"));
}
async function memberLogin(env, name, emp) {
  const list = await readMembers(env);
  if (!list.length) return { ok: true, member: true, empty: true };   // 처음 설정: 멤버를 추가하기 전
  const n = normName(name), e = normEmp(emp);
  return { ok: true, member: list.some(m => normName(m.name) === n && normEmp(m.emp) === e) };
}
// 요청의 who = {name, emp} 가 멤버 목록에 있으면 OK (멤버가 한 명도 없으면 누구나 — 처음 설정용). 예전 팀 비밀번호(PASSCODE)도 통과
async function authOk(env, req) {
  if (env.PASSCODE && String(req.key || '') === env.PASSCODE) return true;
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
    await q(env, 'INSERT INTO members (emp, name, added, "by", deleted) VALUES (?, ?, ?, ?, \'\')', emp, name, kstStamp(), String(by || '')).run();
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
  const now = iso();
  await q(env, "UPDATE calls SET deleted=?1, data=json_set(data, '$.deleted', ?1) WHERE id=?2", now, id).run();
  return id;
}
// 목록 응답은 저장해 둔 JSON 글자를 그대로 이어 붙임 (줄마다 풀었다 다시 싸지 않음 — 무료 요금제 CPU 10ms 안에 들어오게)
const rawList = (rs, extra) => ({ __raw: '{"ok":true,"items":[' + rs.map(r => r.data).join(',') + ']' + extra + '}' });
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
  const src = req.row || {}, row = {};
  Object.keys(src).slice(0, 20).forEach(k => { if (/^[a-zA-Z]{1,10}$/.test(k)) row[k] = String(src[k] == null ? '' : src[k]).slice(0, 300); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.d || '')) throw fail('bad_date');
  row.by = by; row.guest = '1'; if (db === 'bookdb') row.id = 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  const item = (await getItem(env, db)) || { id: db, callType: BOOK_DB_IDS[db], saved: iso() };
  let j = {}; try { j = JSON.parse(item.history || '{}') || {}; } catch (x) { j = {}; }
  j.rows = (Array.isArray(j.rows) ? j.rows : []).concat([row]); j.at = iso(); j.by = by;
  item.history = JSON.stringify(j); item.summary = (db === 'mabangdb' ? '몽몽마방 예약 목록 ' : '예약 현황 직접 추가 ') + j.rows.length + '건'; item.takenBy = by;
  await put(env, item);
  return { id: db, history: item.history };
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
  const out = { calls: 0, members: 0, quotereq: 0, files: 0, skipped: [] };
  const batch = async stmts => { for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40)); };
  const cs = (req.calls || []).filter(x => { const ok = x && ID_OK.test(String(x.id || '')); if (!ok) out.skipped.push(String((x && x.id) || '(id 없음)')); return ok; }).map(x => putStmt(env, rowOf(x)));
  await batch(cs); out.calls = cs.length;
  if (Array.isArray(req.members)) {
    const have = {}; (await rows(env, 'SELECT emp FROM members')).forEach(m => { have[normEmp(m.emp)] = true; });
    const ms = req.members.filter(m => m && m.name && m.emp && !have[normEmp(m.emp)]).map(m => q(env, "INSERT INTO members (emp, name, added, \"by\", deleted) VALUES (?, ?, ?, ?, '')", String(m.emp), String(m.name), String(m.added || ''), String(m.by || '')));
    await batch(ms); out.members = ms.length;
  }
  const qs = (req.quotereq || []).filter(o => o && o.id).map(o => q(env, 'INSERT OR REPLACE INTO quotereq (' + QR_COLS + ') VALUES (' + QR_KEYS.map(() => '?').join(',') + ')', ...QR_KEYS.map(k => String(o[k] == null ? '' : o[k]))));
  await batch(qs); out.quotereq = qs.length;
  for (const f of (req.files || [])) { if (!f || !f.id || !f.data) continue; await saveFile(env, String(f.id), f.kind === 'doc' ? 'doc' : 'ment', String(f.name || ''), String(f.mime || ''), String(f.data), '이관'); out.files++; }
  if (req.admin) await kvSet(env, 'admin', JSON.stringify(req.admin));
  return out;
}

// ---------- 요청 하나 처리 (apps-script 의 doPost 와 같은 순서) ----------
export async function api(req, env, origin = '') {
  const a = req.action, err = (pre, e) => ({ ok: false, error: pre + String((e && e.message) || e) });
  // 로그인 없이 되는 것
  if (a === 'login') return memberLogin(env, req.name, req.emp);
  if (a === 'mentList') { try { const o = await getItem(env, 'mentdb'); return { ok: true, ment: o && !o.deleted ? { history: o.history, saved: o.saved } : null }; } catch (e) { return err('mentlist: ', e); } }
  if (a === 'mentImgGet') { try { return { ok: true, file: await mentImgGet(env, String(req.id || '')) }; } catch (e) { return err('mentimg: ', e); } }
  if (a === 'bookList') { try { return { ok: true, items: await bookList(env), api: 6 }; } catch (e) { return err('booklist: ', e); } }
  if (a === 'bookAdd') { try { return { ok: true, item: await bookAdd(env, req), api: 6 }; } catch (e) { return err('bookadd: ', e); } }
  if (a === 'quoteReqAdd') { try { return { ok: true, id: await quoteReqAdd(env, req.item || {}), api: 7 }; } catch (e) { return err('', e); } }
  if (a === 'import') { try { return { ok: true, imported: await importData(env, req) }; } catch (e) { return err('', e); } }
  // 여기부터 로그인(멤버)만
  if (!(await authOk(env, req))) return { ok: false, error: 'bad_key' };
  if (a === 'quoteReqList') return { ok: true, items: await quoteReqList(env), api: 7 };
  if (a === 'quoteReqMark') { try { return { ok: true, item: await quoteReqMark(env, req), api: 7 }; } catch (e) { return err('', e); } }
  if (a === 'members') return { ok: true, members: await readMembers(env) };
  if (a === 'memberAdd') { try { return { ok: true, added: await addMembers(env, req.list || [], req.by), members: await readMembers(env) }; } catch (e) { return err('', e); } }
  if (a === 'memberDel') { try { return { ok: true, removed: await delMember(env, req.emp, req.by), members: await readMembers(env) }; } catch (e) { return err('', e); } }
  // 목록: since(ISO 일시)를 주면 그 뒤에 저장 · 삭제된 줄만 (delta · 삭제된 줄은 deleted 가 채워져 옴). 없으면 최근 2,000줄 중 지워지지 않은 것
  if (a === 'list') {
    const now = iso(), tail = ',"now":' + JSON.stringify(now) + ',"admin":' + (await adminRaw(env)) + ',"api":5';
    if (req.since) return rawList(await rows(env, 'SELECT data FROM calls WHERE updated>?1 OR deleted>?1 ORDER BY rowid', String(req.since)), ',"delta":true' + tail);
    const lim = Number(req.limit) || 2000;
    return rawList(await rows(env, "SELECT data FROM (SELECT rowid AS r, data, deleted FROM calls ORDER BY rowid DESC LIMIT ?) WHERE deleted='' ORDER BY r", lim), tail);
  }
  if (a === 'deleted') return rawList(await rows(env, "SELECT data FROM (SELECT rowid AS r, data FROM calls WHERE deleted<>'' ORDER BY rowid DESC LIMIT ?) ORDER BY r", Number(req.limit) || 1000), ',"api":4');
  if (a === 'lock') return editLock(env, req);
  if (a === 'upload') { try { return { ok: true, file: await upload(env, req, origin) }; } catch (e) { return err('upload: ', e); } }
  if (a === 'mentImgPut') { try { return { ok: true, file: await mentImgPut(env, req) }; } catch (e) { return err('mentimg: ', e); } }
  if (a === 'syncAdmin') { try { const result = await syncAdmin(env); return { ok: true, result, admin: JSON.parse(await adminRaw(env)) }; } catch (e) { return err('admin_sync: ', e); } }
  try {
    if (a === 'put') return { ok: true, id: await put(env, req.item || {}) };
    if (a === 'del') return { ok: true, id: await del(env, String(req.id || '')) };
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
      const m = url.pathname.match(/^\/file\/([a-zA-Z0-9_-]{8,80})$/);
      if (!m) return jsonRes({ ok: true, app: 'sayuwon-group-intake', api: 7, db: 'd1' });
      const f = await readFile(env, m[1]);
      if (!f || f.kind !== 'doc') return new Response('파일이 없습니다', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      const bin = atob(f.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': f.mime || 'application/octet-stream', 'Content-Disposition': "inline; filename*=UTF-8''" + encodeURIComponent(f.name), 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
    }
    let req; try { req = JSON.parse((await request.text()) || '{}'); } catch (e) { return jsonRes({ ok: false, error: 'bad_json' }); }
    try { const r = await api(req, env, url.origin); return jsonRes(r && r.__raw ? r.__raw : r); }
    catch (e) { return jsonRes({ ok: false, error: String((e && e.message) || e) }); }
  },
  // 예약 작업(Cron Trigger · 15분마다): 관리자 사이트에서 가져오기. 비밀 값이 없으면 아무것도 안 함
  async scheduled(event, env, ctx) {
    if (!env.ADMIN_ID || !env.ADMIN_PW) return;
    ctx.waitUntil(syncAdmin(env).catch(e => console.log('syncAdmin 실패: ' + ((e && e.message) || e))));
  },
};
