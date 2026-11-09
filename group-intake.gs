/**
 * 사유원 예약 접수 도우미 — 공유 통화 기록 저장소 (구글 시트 Apps Script)
 *
 * 설치
 *  1. https://script.google.com 에서 '새 프로젝트'
 *  2. 기존 내용을 지우고 이 파일 내용을 통째로 붙여넣는다
 *  3. 바로 아래 PASSCODE 를 팀 공용 비밀번호로 바꾸고 저장
 *     (이 코드는 공개되지 않습니다. 사이트에서 처음 한 번 이 비밀번호를 넣으면 그 브라우저에 기억됩니다)
 *  4. 위쪽 함수 목록에서 setup 을 골라 '실행' → 권한 승인 (내 드라이브에 '단체예약 접수 기록' 시트가 생김)
 *  5. 배포 → 새 배포 → 유형: 웹 앱 / 실행 사용자: 나 / 액세스 권한: 모든 사용자
 *  6. 나오는 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 index.html 의 SHARED_URL 에 넣는다
 *
 * 코드를 고친 뒤에는: 배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포 (주소는 그대로)
 *
 * 저장 형식: 'calls' 시트, 통화 1건 = 1줄. 지우면 줄을 없애지 않고 '삭제' 칸에 일시를 적는다.
 */
var PASSCODE = "여기에_팀_비밀번호";

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
  ["updated", "수정 일시"], ["deleted", "삭제"]
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
  if (!PASSCODE || String(req.key || "") !== PASSCODE) return json_({ ok: false, error: "bad_key" });

  if (req.action === "list") return json_({ ok: true, items: list_(Number(req.limit) || 2000) });

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

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
