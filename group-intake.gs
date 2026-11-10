/**
 * 사유원 단체 예약 접수 및 관리 도우미 — 공유 통화 기록 저장소 (구글 시트 Apps Script)
 *
 * 설치
 *  1. https://script.google.com 에서 '새 프로젝트'
 *  2. 기존 내용을 지우고 이 파일 내용을 통째로 붙여넣는다
 *  3. 프로젝트 설정(톱니바퀴) → 스크립트 속성에 PASSCODE(팀 공용 비밀번호)를 추가
 *     (이 코드는 공개되지 않습니다. 사이트에서 처음 한 번 이 비밀번호를 넣으면 그 브라우저에 기억됩니다)
 *  4. 위쪽 함수 목록에서 setup 을 골라 '실행' → 권한 승인 (내 드라이브에 '단체예약 접수 기록' 시트가 생김)
 *  5. 배포 → 새 배포 → 유형: 웹 앱 / 실행 사용자: 나 / 액세스 권한: 모든 사용자
 *  6. 나오는 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 index.html 의 SHARED_URL 에 넣는다
 *
 * 코드를 고친 뒤에는: 배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포 (주소는 그대로)
 *
 * 저장 형식: 'calls' 시트, 통화 1건 = 1줄. 지우면 줄을 없애지 않고 '삭제' 칸에 일시를 적는다.
 *
 * 비밀 값은 코드가 아니라 '프로젝트 설정(톱니바퀴) → 스크립트 속성'에 넣는다 (코드를 새로 붙여넣어도 그대로 남음)
 *   PASSCODE  : 팀 비밀번호 (사이트에서 처음 한 번 입력)
 *   ADMIN_ID  : 관리자 사이트(admin.sayuwon.com) 아이디 — 조회 전용 계정 권장
 *   ADMIN_PW  : 그 비밀번호
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
  var pc = passcode_();
  if (!pc || String(req.key || "") !== pc) return json_({ ok: false, error: "bad_key" });

  if (req.action === "list") return json_({ ok: true, items: list_(Number(req.limit) || 2000), admin: readAdmin_(), api: 3 });
  if (req.action === "upload") {
    try { return json_({ ok: true, file: upload_(req) }); }
    catch (err) { return json_({ ok: false, error: "upload: " + String(err && err.message || err) }); }
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
var UPLOAD_TYPES = /^(image\/(jpeg|png|gif|webp|heic|heif)|application\/pdf)$/;
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
