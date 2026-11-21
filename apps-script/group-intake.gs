/**
 * 사유원 단체 예약 접수 및 관리 도우미 — 공유 통화 기록 저장소 (구글 시트 Apps Script)
 *
 * 설치
 *  1. https://script.google.com 에서 '새 프로젝트'
 *  2. 기존 내용을 지우고 이 파일 내용을 통째로 붙여넣는다
 *  3. (2026-11-21부터 팀 비밀번호 없음) 사이트는 로그인(이름 + 사번 · members 시트)으로 확인합니다. 예전 PASSCODE 속성이 있으면 예전 화면도 그대로 됩니다
 *     예약 현황 공유(bookList · bookAdd)는 로그인 없이 — 그 목록에 필요한 칸만 보냅니다 (고객 연락처 · 이메일 · 통화 메모 · 수정 기록 없음)
 *  4. 위쪽 함수 목록에서 setup 을 골라 '실행' → 권한 승인 (내 드라이브에 '단체예약 접수 기록' 시트가 생김)
 *  5. 배포 → 새 배포 → 유형: 웹 앱 / 실행 사용자: 나 / 액세스 권한: 모든 사용자
 *  6. 나오는 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 group.html 의 SHARED_URL 에 넣는다
 *
 * 코드를 고친 뒤에는: 배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포 (주소는 그대로)
 *
 * 저장 형식: 'calls' 시트, 통화 1건 = 1줄. 지우면 줄을 없애지 않고 '삭제' 칸에 일시를 적는다.
 *
 * 비밀 값은 코드가 아니라 '프로젝트 설정(톱니바퀴) → 스크립트 속성'에 넣는다 (코드를 새로 붙여넣어도 그대로 남음)
 *   PASSCODE  : (예전) 팀 비밀번호 — 없어도 됨. 있으면 그 비밀번호를 기억한 예전 브라우저도 됨
 *   ADMIN_ID  : 관리자 사이트(admin.sayuwon.com) 아이디 — 조회 전용 계정 권장
 *   ADMIN_PW  : 그 비밀번호
 *
 * 멤버 (사유원 운영 보조 시스템 로그인 · 2026-11-14)
 *  - 이름 + 사번 목록은 이 스프레드시트의 'members' 시트에 둔다 (코드 · GitHub에는 두지 않음)
 *  - 새 버전으로 배포한 뒤, 사이트 첫 화면 → 멤버관리에서 추가 (멤버가 한 명도 없을 때만 아무 이름으로나 로그인 가능)
 *
 * 관리자 사이트 자동 가져오기 (사담 현황 + 15명 이상 예약)
 *  1. 스크립트 속성에 ADMIN_ID · ADMIN_PW 를 넣는다
 *  2. 함수 목록에서 testAdmin 실행 → 실행 로그에 "로그인 성공 · 사담 n일 · 15명 이상 n건" 이 나오면 정상
 *  3. 함수 목록에서 setupAdminSync 실행 → 15분마다 자동으로 가져온다 (트리거)
 */
var PASSCODE_FALLBACK = "여기에_팀_비밀번호";   // 예전 방식. 스크립트 속성 PASSCODE 가 있으면 그것을 쓴다
var ADMIN_API = "https://admin-api.sayuwon.com/api/v1";
var BIG_TEAM = 15;          // 이 인원 이상이면 목록에 자동 등록
var LOOKAHEAD_DAYS = 180;   // 오늘부터 며칠 뒤 예약까지 가져올지
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }
function passcode_() {
  var p = prop_("PASSCODE") || PASSCODE_FALLBACK;
  return p === "여기에_팀_비밀번호" ? "" : p;
}

// [키, 시트 머리글] — 엑셀 메인 시트 D~V열 순서를 가운데에 그대로 둔다
var COLS = [
  ["id", "ID"], ["saved", "저장 일시"], ["callStart", "통화 시작"], ["takenBy", "받은 사람"],
  ["callType", "통화 구분"], ["summary", "요약"], ["date", "방문일"],
  ["org", "업체"], ["owner", "담당"], ["pay", "결제"], ["vehicle", "차량"], ["inout", "입퇴장"], ["people", "관람"],
  ["sadam1", "사담 1부"], ["sadam2", "사담 2부"], ["sadamD", "사담 디너"], ["mabangL", "마방 런치"], ["mabangD", "마방 디너"],
  ["chabang", "차방"], ["donghaeng", "동행"], ["dangdu", "당두"], ["yoga", "요가/명상"], ["gaga", "가가 바우처"],
  ["teaMed", "티하우스 명상"], ["gayageum", "가야금"], ["cabin", "유루 캐빈"],
  ["contact", "고객 담당자"], ["phone", "연락처"], ["email", "이메일"], ["tin", "입장"], ["tout", "퇴장"],
  ["meal", "식사 여부"], ["mabangMenu", "마방 메뉴"], ["memo", "비고"], ["note", "통화 메모"],
  ["updated", "수정 일시"], ["deleted", "삭제"], ["history", "수정 기록"]
];
var KEYS = COLS.map(function (c) { return c[0]; });

function doGet() {
  return json_({ ok: true, app: "sayuwon-group-intake", api: 1 });
}

// 요청: { key, action: "list" | "put" | "del", item?, id? }
function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return json_({ ok: false, error: "bad_json" }); }
  // 로그인 확인 (팀 비밀번호 없이): 이름 + 사번이 멤버 목록에 있는지만 알려 준다 (목록은 돌려주지 않음)
  if (req.action === "login") return json_(memberLogin_(req.name, req.emp));
  // 전화응대 멘트는 팀 비밀번호 없이 읽기만 (주로 휴대폰에서 봄, 2026-11-18): 멘트 목록(mentdb 한 줄의 내용) · 멘트 이미지. 고치기(put)는 그대로 비밀번호 필요
  if (req.action === "mentList") {
    try { return json_({ ok: true, ment: mentRow_() }); }
    catch (err) { return json_({ ok: false, error: "mentlist: " + String(err && err.message || err) }); }
  }
  if (req.action === "mentImgGet") {
    try { return json_({ ok: true, file: mentImgGet_(String(req.id || "")) }); }
    catch (err) { return json_({ ok: false, error: "mentimg: " + String(err && err.message || err) }); }
  }
  // 예약 현황 공유 (2026-11-21 · api 6): 담당자 휴대폰에서 로그인 없이 보기 · 이름을 적고 한 건 추가 — 이 목록에 필요한 칸만 (고객 연락처 · 이메일 · 통화 메모 · 수정 기록은 보내지 않음)
  if (req.action === "bookList") {
    try { return json_({ ok: true, items: bookList_(), api: 6 }); }
    catch (err) { return json_({ ok: false, error: "booklist: " + String(err && err.message || err) }); }
  }
  if (req.action === "bookAdd") {
    var bl = LockService.getScriptLock(); bl.waitLock(20000);
    try { return json_({ ok: true, item: bookAdd_(req), api: 6 }); }
    catch (err) { return json_({ ok: false, error: "bookadd: " + String(err && err.message || err) }); }
    finally { bl.releaseLock(); }
  }
  // 팀 비밀번호 대신 로그인 (2026-11-21 · api 6): 화면이 보내는 로그인(이름 + 사번)이 멤버 목록에 있으면 됨.
  // 예전 팀 비밀번호(스크립트 속성 PASSCODE)를 기억한 브라우저도 그대로 됨 (예전 화면이 섞여 있어도 끊기지 않게)
  if (!authOk_(req)) return json_({ ok: false, error: "bad_key" });

  // 멤버관리 (팀 비밀번호 필요)
  if (req.action === "members") return json_({ ok: true, members: readMembers_() });
  if (req.action === "memberAdd" || req.action === "memberDel") {
    var ml = LockService.getScriptLock(); ml.waitLock(20000);
    try { CacheService.getScriptCache().remove("members_v1");   // 로그인 확인에 쓰는 멤버 목록을 바로 새로
      if (req.action === "memberAdd") return json_({ ok: true, added: addMembers_(req.list || [], req.by), members: readMembers_() });
      return json_({ ok: true, removed: delMember_(req.emp, req.by), members: readMembers_() });
    } catch (err) { return json_({ ok: false, error: String(err) }); }
    finally { ml.releaseLock(); }
  }

  // 목록 (2026-11-21 · api 5): since(ISO 일시)를 주면 그 뒤에 저장 · 삭제된 줄만 (delta:true · 삭제된 줄은 deleted 칸이 채워져 옴) → 화면은 가진 사본에 합침
  //  now = 이 서버 시각 (다음 since 로). since 가 없으면 예전처럼 전체
  if (req.action === "list") {
    var now = new Date().toISOString();
    if (req.since) return json_({ ok: true, items: listSince_(String(req.since)), delta: true, now: now, admin: readAdmin_(), api: 5 });
    return json_({ ok: true, items: list_(Number(req.limit) || 2000), now: now, admin: readAdmin_(), api: 5 });
  }
  // 삭제된 기록 (단체예약 · 개인고객 통화): 시트에서는 줄을 지우지 않고 '삭제' 칸에 일시만 적으므로 그 줄들을 돌려줌 (보기 전용)
  if (req.action === "deleted") return json_({ ok: true, items: listDeleted_(Number(req.limit) || 1000), api: 4 });
  // 같은 예약을 두 PC(창)에서 동시에 고치지 않도록: 예약을 열면 '고치는 중' 표시 (2분 30초 유지, 열어 둔 화면이 1분마다 연장 · 닫으면 풀림)
  if (req.action === "lock") return json_(editLock_(req));
  if (req.action === "upload") {
    try { return json_({ ok: true, file: upload_(req) }); }
    catch (err) { return json_({ ok: false, error: "upload: " + String(err && err.message || err) }); }
  }
  // 전화응대 멘트 이미지 (2026-11-18): 드라이브 '사유원 단체예약 서류' 안 '응대멘트 이미지' 폴더에만 올리고 · 그 폴더 파일만 돌려줌
  if (req.action === "mentImgPut") {
    try { return json_({ ok: true, file: mentImgPut_(req) }); }
    catch (err) { return json_({ ok: false, error: "mentimg: " + String(err && err.message || err) }); }
  }
  if (req.action === "syncAdmin") {
    try { return json_({ ok: true, result: syncAdmin(), admin: readAdmin_() }); }
    catch (err) { return json_({ ok: false, error: "admin_sync: " + String(err && err.message || err) }); }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (req.action === "put") return json_({ ok: true, id: put_(req.item || {}) });
    if (req.action === "del") return json_({ ok: true, id: del_(String(req.id || "")) });
    return json_({ ok: false, error: "bad_action" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// 멤버 (사유원 운영 보조 시스템 로그인): 'members' 시트 [이름, 사번, 추가 일시, 추가한 사람, 삭제]
//  - 이름 · 사번은 공개 저장소(코드)에 두지 않고 이 시트에만 둔다
//  - 멤버가 한 명도 없으면 아무 이름 · 사번으로나 로그인 가능 (처음 설정용) → 멤버관리에서 추가하면 그때부터 확인
// =====================================================================
var MEMBER_COLS = ["이름", "사번", "추가 일시", "추가한 사람", "삭제"];
function membersSheet_() {
  var ss = sheet_().getParent(), s = ss.getSheetByName("members");
  if (!s) {
    s = ss.insertSheet("members");
    s.getRange(1, 1, s.getMaxRows(), MEMBER_COLS.length).setNumberFormat("@");   // 사번 앞자리 0이 사라지지 않게 글자로
    s.appendRow(MEMBER_COLS); s.setFrozenRows(1);
  }
  return s;
}
function normName_(v) { return String(v || "").replace(/\s+/g, ""); }
function normEmp_(v) { return String(v || "").replace(/\s+/g, "").toUpperCase(); }
function memberRows_() {
  var s = membersSheet_(), n = s.getLastRow();
  return n < 2 ? [] : s.getRange(2, 1, n - 1, MEMBER_COLS.length).getDisplayValues();
}
function readMembers_() {
  return memberRows_().filter(function (r) { return r[0] && r[1] && !r[4]; })
    .map(function (r) { return { name: r[0], emp: r[1], added: r[2], by: r[3] }; });
}
function memberLogin_(name, emp) {
  var list = readMembers_();
  if (!list.length) return { ok: true, member: true, empty: true };   // 처음 설정: 멤버를 추가하기 전
  var n = normName_(name), e = normEmp_(emp);
  var hit = list.some(function (m) { return normName_(m.name) === n && normEmp_(m.emp) === e; });
  return { ok: true, member: hit };
}
// 로그인 확인 (팀 비밀번호 대신): req.who = {name, emp} 가 멤버 목록에 있으면 OK. 멤버 목록은 5분 동안 기억 (매번 시트를 읽지 않게)
function authOk_(req) {
  var pc = passcode_();
  if (pc && String(req.key || "") === pc) return true;
  var w = req.who || {}, n = normName_(w.name), e = normEmp_(w.emp);
  if (!n || !e) return false;
  var c = CacheService.getScriptCache(), raw = c.get("members_v1"), list = null;
  try { list = raw ? JSON.parse(raw) : null; } catch (x) { list = null; }
  if (!list) { list = readMembers_().map(function (m) { return [normName_(m.name), normEmp_(m.emp)]; }); try { c.put("members_v1", JSON.stringify(list), 300); } catch (x) {} }
  if (!list.length) return true;   // 처음 설정 (멤버가 아직 없음)
  return list.some(function (m) { return m[0] === n && m[1] === e; });
}
// 예약 현황 공유 목록: 단체 예약(가예약 · 예약확정 등, 지난 120일 ~)의 예약 현황에 쓰는 칸 + 몽몽마방 · 대관 등 직접 추가 목록
var BOOK_KEYS = ["id", "callType", "date", "org", "owner", "people", "sadam1", "sadam2", "sadamD", "mabangL", "mabangD", "chabang", "donghaeng", "dangdu", "yoga", "gaga", "teaMed", "gayageum", "cabin", "tin", "tout", "meal", "mabangMenu", "memo", "saved", "updated"];
var BOOK_DB_IDS = { mabangdb: "몽몽마방예약", bookdb: "예약현황추가" };
function bookList_() {
  var s = sheet_(), n = s.getLastRow(); if (n < 2) return [];
  var rows = s.getRange(2, 1, n - 1, COLS.length).getDisplayValues(), out = [];
  var from = Utilities.formatDate(new Date(Date.now() - 120 * 864e5), "Asia/Seoul", "yyyy-MM-dd");
  var GROUP = { "단체예약": 1, "예약상담": 1, "가예약": 1, "예약확정": 1, "예약접수": 1, "상담": 1, "공식예약": 1 };
  rows.forEach(function (r) {
    var o = {}; KEYS.forEach(function (k, i) { o[k] = r[i]; });
    if (!o.id || o.deleted) return;
    if (BOOK_DB_IDS[o.id]) { out.push({ id: o.id, callType: o.callType, saved: o.saved, updated: o.updated, history: o.history }); return; }   // 직접 추가 목록 (내용 = history)
    if (!GROUP[o.callType || "단체예약"] || !o.date || o.date < from) return;
    var p = {}; BOOK_KEYS.forEach(function (k) { p[k] = o[k]; }); out.push(p);
  });
  return out;
}
// 로그인 없이 한 건 추가: {db:'mabangdb'|'bookdb', row:{…}, by:이름} → 그 목록 줄에 더함 (고치기 · 빼기는 로그인한 사람만)
function bookAdd_(req) {
  var db = String(req.db || ""); if (!BOOK_DB_IDS[db]) throw new Error("bad_db");
  var by = String(req.by || "").trim().slice(0, 20); if (!by) throw new Error("no_name");
  var src = req.row || {}, row = {};
  Object.keys(src).slice(0, 20).forEach(function (k) { if (/^[a-zA-Z]{1,10}$/.test(k)) row[k] = String(src[k] == null ? "" : src[k]).slice(0, 300); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.d || "")) throw new Error("bad_date");
  row.by = by; row.guest = "1"; if (db === "bookdb") row.id = "b" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  var s = sheet_(), r = findRow_(s, db), item;
  if (r > 0) { var v = s.getRange(r, 1, 1, COLS.length).getValues()[0]; item = {}; KEYS.forEach(function (k, i) { item[k] = v[i]; }); }
  else item = { id: db, callType: BOOK_DB_IDS[db], saved: new Date().toISOString() };
  var j = {}; try { j = JSON.parse(item.history || "{}") || {}; } catch (x) { j = {}; }
  j.rows = (Array.isArray(j.rows) ? j.rows : []).concat([row]); j.at = new Date().toISOString(); j.by = by;
  item.history = JSON.stringify(j); item.summary = (db === "mabangdb" ? "몽몽마방 예약 목록 " : "예약 현황 직접 추가 ") + j.rows.length + "건"; item.takenBy = by;
  put_(item);
  return { id: db, history: item.history };
}
function addMembers_(list, by) {
  var have = {}, s = membersSheet_(), added = 0;
  readMembers_().forEach(function (m) { have[normEmp_(m.emp)] = true; });
  (list || []).forEach(function (m) {
    var name = String((m && m.name) || "").trim(), emp = String((m && m.emp) || "").trim();
    if (!name || !/^[0-9A-Za-z-]{2,20}$/.test(emp) || have[normEmp_(emp)]) return;   // 같은 사번은 한 번만
    var row = s.getLastRow() + 1;   // 글자 형식으로 써서 사번 앞자리 0 · 날짜가 바뀌지 않게
    s.getRange(row, 1, 1, MEMBER_COLS.length).setNumberFormat("@").setValues([[name, emp, Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm"), String(by || ""), ""]]);
    have[normEmp_(emp)] = true; added++;
  });
  return added;
}
function delMember_(emp, by) {
  var s = membersSheet_(), rows = memberRows_(), e = normEmp_(emp), done = 0;
  rows.forEach(function (r, i) {
    if (normEmp_(r[1]) === e && !r[4]) { s.getRange(i + 2, 5).setNumberFormat("@").setValue(Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm") + " " + String(by || "")); done++; }
  });
  return done;
}

// 배포 전에 한 번 실행해서 권한을 승인하고 시트를 만든다
function setup() {
  var s = sheet_();
  Logger.log("저장 시트: " + s.getParent().getUrl());
}

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  var ss = id ? SpreadsheetApp.openById(id) : null;
  if (!ss) {
    ss = SpreadsheetApp.create("단체예약 접수 기록");
    props.setProperty("SHEET_ID", ss.getId());
  }
  var s = ss.getSheetByName("calls");
  if (!s) {
    s = ss.insertSheet("calls");
    var first = ss.getSheets()[0];
    if (first.getName() !== "calls" && first.getLastRow() === 0) ss.deleteSheet(first);
    s.getRange(1, 1, s.getMaxRows(), COLS.length).setNumberFormat("@");   // 날짜·전화번호가 숫자나 날짜값으로 바뀌지 않게 모두 글자로
    s.getRange(1, 1, 1, COLS.length).setValues([COLS.map(function (c) { return c[1]; })]).setFontWeight("bold");
    s.setFrozenRows(1);
  }
  // 열이 늘어났으면(예: 수정 기록) 시트에도 열과 머리글을 맞춘다
  if (s.getMaxColumns() < COLS.length) s.insertColumnsAfter(s.getMaxColumns(), COLS.length - s.getMaxColumns());
  if (!s.getRange(1, COLS.length).getValue()) {
    s.getRange(1, 1, s.getMaxRows(), COLS.length).setNumberFormat("@");
    s.getRange(1, 1, 1, COLS.length).setValues([COLS.map(function (c) { return c[1]; })]).setFontWeight("bold");
  }
  return s;
}

function rowOf_(item) {
  var it = {};
  KEYS.forEach(function (k) { it[k] = item[k]; });
  it.inout = (item.tin || item.tout) ? (item.tin || "") + "~" + (item.tout || "") : "";
  return KEYS.map(function (k) {
    var v = it[k];
    if (v == null) return "";
    v = String(v);
    // 시트가 날짜·숫자로 바꾸지 않도록 ' 를 붙여 글자로 둔다
    return /^[\d+\-=]/.test(v) ? "'" + v : v;
  });
}

function findRow_(s, id) {
  var n = s.getLastRow();
  if (n < 2 || !id) return -1;
  var ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function put_(item) {
  var id = String(item.id || "");
  if (!/^[a-z0-9]{4,40}$/.test(id)) throw new Error("bad_id");
  item.updated = new Date().toISOString();
  item.deleted = "";
  var s = sheet_();
  var row = rowOf_(item);
  var r = findRow_(s, id);
  if (r > 0) s.getRange(r, 1, 1, row.length).setValues([row]);
  else s.appendRow(row);
  return id;
}

function del_(id) {
  var s = sheet_();
  var r = findRow_(s, id);
  if (r < 0) return id;
  s.getRange(r, KEYS.indexOf("deleted") + 1).setValue(new Date().toISOString());
  return id;
}

// 예약 고치는 중 표시: { id, sid(창마다 다른 값), by(이름), release? }
//  - 다른 창이 고치는 중이면 { locked:true, by, at } (그 창은 읽기 전용)
//  - 아니면 이 창이 고치는 중으로 잡고 { locked:false }. release 면 이 창의 표시를 지움
function editLock_(req) {
  var id = String(req.id || ""), sid = String(req.sid || "");
  if (!/^[a-z0-9]{4,40}$/.test(id) || !sid) return { ok: false, error: "bad_id" };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var c = CacheService.getScriptCache(), k = "lk_" + id, raw = c.get(k), v = raw ? JSON.parse(raw) : null, now = Date.now();
    if (req.release) { if (v && v.sid === sid) c.remove(k); return { ok: true, released: true }; }
    if (v && v.sid !== sid && now - v.at < 150000) return { ok: true, locked: true, by: v.by, at: v.at };
    c.put(k, JSON.stringify({ sid: sid, by: String(req.by || ""), at: now }), 150);
    return { ok: true, locked: false };
  } finally { lock.releaseLock(); }
}

// 삭제 표시가 된 줄 (최근 limit개)
function listDeleted_(limit) {
  var s = sheet_();
  var n = s.getLastRow();
  if (n < 2) return [];
  var rows = s.getRange(2, 1, n - 1, COLS.length).getDisplayValues();
  var out = [];
  rows.forEach(function (r) {
    var o = {};
    KEYS.forEach(function (k, i) { o[k] = r[i]; });
    if (o.deleted && o.id) out.push(o);
  });
  return out.slice(-limit);
}
// since 뒤에 저장(수정 일시) · 삭제(삭제 칸)된 줄만 — 두 칸만 먼저 읽고, 바뀐 줄만 통째로 읽음 (전체 2,000줄 × 38칸을 매번 읽지 않게)
function listSince_(since) {
  var s = sheet_();
  var n = s.getLastRow();
  if (n < 2) return [];
  var ui = KEYS.indexOf("updated"), di = KEYS.indexOf("deleted");   // 붙어 있는 두 칸
  var uv = s.getRange(2, ui + 1, n - 1, di - ui + 1).getDisplayValues(), hit = [];
  uv.forEach(function (r, i) { if ((r[0] && r[0] > since) || (r[di - ui] && r[di - ui] > since)) hit.push(i + 2); });
  if (!hit.length) return [];
  var toObj = function (r) { var o = {}; KEYS.forEach(function (k, i) { o[k] = r[i]; }); return o; }, out = [];
  if (hit.length > 40) {   // 많으면 한 번에 (처음 ~ 끝 줄)
    var a = hit[0], rows = s.getRange(a, 1, hit[hit.length - 1] - a + 1, COLS.length).getDisplayValues();
    hit.forEach(function (r) { out.push(toObj(rows[r - a])); });
  } else hit.forEach(function (r) { out.push(toObj(s.getRange(r, 1, 1, COLS.length).getDisplayValues()[0])); });
  return out.filter(function (o) { return o.id; });
}
function list_(limit) {
  var s = sheet_();
  var n = s.getLastRow();
  if (n < 2) return [];
  var from = Math.max(2, n - limit + 1);
  var rows = s.getRange(from, 1, n - from + 1, COLS.length).getDisplayValues();
  var out = [];
  rows.forEach(function (r) {
    var o = {};
    KEYS.forEach(function (k, i) { o[k] = r[i]; });
    if (!o.deleted && o.id) out.push(o);
  });
  return out;
}

// =====================================================================
// 사업자등록증 등 파일 올리기 → 내 드라이브 '사유원 단체예약 서류' 폴더 (폴더는 처음 올릴 때 생김)
// 파일은 비공개(시트 주인 드라이브). 팀원이 열어 보려면 그 폴더를 팀원에게 공유해 두면 된다.
var UPLOAD_MAX = 10 * 1024 * 1024;   // 10MB
var UPLOAD_TYPES = /^(image\/(jpeg|png|gif|webp|heic|heif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/;   // 사진 · PDF · 엑셀(견적서)
function uploadFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("UPLOAD_FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder("사유원 단체예약 서류");
  props.setProperty("UPLOAD_FOLDER_ID", f.getId());
  return f;
}
function upload_(req) {
  var mime = String(req.mime || "");
  if (!UPLOAD_TYPES.test(mime)) throw new Error("이미지나 PDF만 올릴 수 있습니다");
  var bytes = Utilities.base64Decode(String(req.data || ""));
  if (!bytes.length) throw new Error("빈 파일");
  if (bytes.length > UPLOAD_MAX) throw new Error("10MB 이하만 올릴 수 있습니다");
  var clean = function (s) { return String(s || "").replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 60); };
  var ext = (String(req.name || "").match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0];
  var name = [clean(req.date), clean(req.org) || "단체", clean(req.kind) || "서류"].filter(String).join(" ") + ext;
  var file = uploadFolder_().createFile(Utilities.newBlob(bytes, mime, name));
  return { id: file.getId(), name: name, url: file.getUrl(), at: new Date().toISOString() };
}
// 처음 한 번: 함수 목록에서 setupUpload 실행 → 드라이브 권한 승인 + 폴더 생성
function setupUpload() { Logger.log("폴더: " + uploadFolder_().getUrl()); }
// ===== 전화응대 멘트 이미지 (2026-11-18) =====
// 사진만 (5MB 이하) · '응대멘트 이미지' 폴더 (처음 올릴 때 만듦). 불러오기도 이 폴더 안 파일만 (단체 서류는 돌려주지 않음)
function mentImgFolder_() {
  var parent = uploadFolder_(), it = parent.getFoldersByName("응대멘트 이미지");
  return it.hasNext() ? it.next() : parent.createFolder("응대멘트 이미지");
}
function mentImgPut_(req) {
  var mime = String(req.mime || "");
  if (!/^image\/(jpeg|png|gif|webp)$/.test(mime)) throw new Error("사진만 올릴 수 있습니다");
  var bytes = Utilities.base64Decode(String(req.data || ""));
  if (!bytes.length) throw new Error("빈 파일");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("5MB 이하만 올릴 수 있습니다");
  var name = String(req.name || "멘트 이미지").replace(/[\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 60) || "멘트 이미지";
  var file = mentImgFolder_().createFile(Utilities.newBlob(bytes, mime, name));
  return { id: file.getId(), name: name, at: new Date().toISOString() };
}
// 멘트 목록 한 줄(id mentdb)의 내용만 (다른 기록은 돌려주지 않음)
function mentRow_() {
  var s = sheet_(), n = s.getLastRow(); if (n < 2) return null;
  var idCol = KEYS.indexOf("id") + 1, hCol = KEYS.indexOf("history") + 1, sCol = KEYS.indexOf("saved") + 1, dCol = KEYS.indexOf("deleted") + 1;
  var cell = s.getRange(2, idCol, n - 1, 1).createTextFinder("mentdb").matchEntireCell(true).findNext();
  if (!cell) return null;
  var r = cell.getRow();
  if (dCol > 0 && s.getRange(r, dCol).getDisplayValue()) return null;
  return { history: s.getRange(r, hCol).getValue(), saved: sCol > 0 ? s.getRange(r, sCol).getDisplayValue() : "" };
}
function mentImgGet_(id) {
  if (!id) throw new Error("no_id");
  var f = DriveApp.getFileById(id), folderId = mentImgFolder_().getId(), ok = false, ps = f.getParents();
  while (ps.hasNext()) { if (ps.next().getId() === folderId) { ok = true; break; } }
  if (!ok) throw new Error("not_allowed");
  var b = f.getBlob();
  return { id: id, mime: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// =====================================================================
// 관리자 사이트(admin.sayuwon.com) 자동 가져오기
//  - 사담 런치1부·2부·디너, 몽몽마방 사유의 밥상: 날짜별 정원·현재 인원·팀 수 → 'admin' 시트 A1 (JSON)
//  - BIG_TEAM 명 이상 예약 → 'calls' 시트에 "자동 등록 · 전화 필요" 로 한 줄씩 (관리자 예약번호로 한 번만)
// =====================================================================
function adminLogin_() {
  var id = prop_("ADMIN_ID"), pw = prop_("ADMIN_PW");
  if (!id || !pw) throw new Error("스크립트 속성에 ADMIN_ID · ADMIN_PW 가 없습니다");
  var res = UrlFetchApp.fetch(ADMIN_API + "/auth/login", {
    method: "post", contentType: "application/json",
    payload: JSON.stringify({ user_id: id, password: pw }), muteHttpExceptions: true
  });
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) {}
  if (res.getResponseCode() !== 200 || !body.access_token) throw new Error("관리자 로그인 실패 (" + res.getResponseCode() + ") " + (body.message || ""));
  return body.access_token;
}
function adminGet_(token, path) {
  var res = UrlFetchApp.fetch(ADMIN_API + path, {
    headers: { Cookie: "admin_access_token=" + token }, muteHttpExceptions: true
  });
  var text = res.getContentText();
  if (res.getResponseCode() !== 200) throw new Error("관리자 조회 실패 " + path + " (" + res.getResponseCode() + ") " + text.slice(0, 120));
  return JSON.parse(text);
}
function ymd_(d) { return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd"); }

function slotOf_(name) {
  name = String(name || "");
  if (/사담\s*런치\s*1부/.test(name)) return "L1";
  if (/사담\s*런치\s*2부/.test(name)) return "L2";
  if (/사담\s*디너/.test(name)) return "D";
  if (/사유의\s*밥상/.test(name) && !/단체/.test(name)) return "MB";
  return "";
}

// 트리거·사이트 버튼·testAdmin 이 부른다
function syncAdmin() {
  var token = adminLogin_();
  var now = new Date();

  // 1) 사담·마방 현황: 이번 달부터 4개월
  var days = {};
  for (var i = 0; i < 4; i++) {
    var m = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var ym = Utilities.formatDate(m, "Asia/Seoul", "yyyyMM");
    adminGet_(token, "/admin/product/sales-schedule/product/" + ym + "?search=").forEach(function (p) {
      var slot = slotOf_(p.name);
      if (!slot || !p.yyyymmdd) return;
      var d = String(p.yyyymmdd).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      days[d] = days[d] || {};
      days[d][slot] = { cur: p.current_confirm != null ? p.current_confirm : p.current, max: p.max_capacity,
        team: p.team_current, teamMax: p.team_max_capacity, close: p.close === "Y" ? 1 : 0 };
    });
  }

  // 2) 15명 이상 예약 → calls 에 없으면 추가 (사이트 저장과 겹치지 않게 잠금)
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
  var to = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000);
  var list = adminGet_(token, "/admin/reservation/reservations?from_date=" + ymd_(now) + "&to_date=" + ymd_(to) + "&search=&product_gubun=&reservation_status=0");
  var big = list.filter(function (r) { return Number(r.all_cnt) >= BIG_TEAM; });
  var s = sheet_();
  var n = s.getLastRow(), have = {};
  if (n > 1) s.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { have[String(r[0])] = true; });
  var added = 0;
  big.forEach(function (r) {
    var id = "adm" + r.seq;
    if (have[id]) return;
    var cnt = String(r.all_cnt), slot = slotOf_(r.product_name);
    var item = {
      id: id, saved: new Date().toISOString(), takenBy: "자동", callType: "단체예약",
      summary: "자동 등록 · 전화 필요 · " + (r.product_name || ""),
      date: r.visit_date || "", people: cnt, contact: r.member_name || "", phone: r.phone_number || "",
      sadam1: slot === "L1" ? cnt : "", sadam2: slot === "L2" ? cnt : "", sadamD: slot === "D" ? cnt : "", mabangL: slot === "MB" ? cnt : "",
      note: "관리자 예약 " + (r.number || r.seq) + " · " + (r.product_name || "") + " · " + (r.visitor_cnt || cnt + "명") +
            " · 결제 " + (r.payment_amount != null ? Number(r.payment_amount).toLocaleString() + "원" : "-") + " · " + (r.reservation_type_name || "")
    };
    put_(item);
    have[id] = true; added++;
  });

  var data = { updated: new Date().toISOString(), days: days };
  var a = adminSheet_();
  a.getRange("A1").setValue(JSON.stringify(data));
  a.getRange("B1").setValue(new Date());
  return { sadamDays: Object.keys(days).length, big: big.length, added: added };
  } finally { lock.releaseLock(); }
}
function adminSheet_() {
  var ss = sheet_().getParent();
  return ss.getSheetByName("admin") || ss.insertSheet("admin");
}
function readAdmin_() {
  try { var v = adminSheet_().getRange("A1").getValue(); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

// 한 번 실행해서 연결 확인
function testAdmin() {
  var r = syncAdmin();
  Logger.log("로그인 성공 · 사담 " + r.sadamDays + "일 · 15명 이상 " + r.big + "건 (새로 등록 " + r.added + "건)");
}
// 한 번 실행하면 15분마다 자동으로 가져온다 (다시 실행해도 트리거는 하나만)
function setupAdminSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "syncAdmin") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("syncAdmin").timeBased().everyMinutes(15).create();
  Logger.log("15분마다 관리자 사이트에서 가져옵니다");
}
