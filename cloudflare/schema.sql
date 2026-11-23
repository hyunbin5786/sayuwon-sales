-- 사유원 운영 보조 시스템 · 공유 기록 DB (Cloudflare D1 = SQLite)
-- 처음 한 번: Cloudflare 대시보드 → D1 → 만든 DB → Console 에 이 파일 내용을 통째로 붙여 넣고 실행 (여러 번 실행해도 됨)
-- 구글 시트 때와 같은 모양으로 옮김 (1단계): calls 한 줄 = 한 기록, 38칸은 data(JSON 글자) 한 칸에 통째로.
--   자주 거르는 값만 따로 칸으로 뺌 (통화 구분 · 방문일 · 수정 일시 · 삭제). 줄 순서(rowid) = 시트의 줄 순서(처음 저장한 순서)

CREATE TABLE IF NOT EXISTS calls (
  id         TEXT PRIMARY KEY,          -- 영문 소문자 · 숫자 4~40자 (화면이 만듦)
  call_type  TEXT NOT NULL DEFAULT '',  -- 통화 구분 (예약확정 · 개인고객 · 분실물 …  README 14-4절)
  visit_date TEXT NOT NULL DEFAULT '',  -- 방문일 YYYY-MM-DD
  updated    TEXT NOT NULL DEFAULT '',  -- 수정 일시 (ISO · 서버가 적음)
  deleted    TEXT NOT NULL DEFAULT '',  -- 삭제 일시 (지우면 줄을 없애지 않고 여기에 일시)
  data       TEXT NOT NULL              -- 기록 전체 JSON {id, saved, callStart, takenBy, callType, …, history}
);
CREATE INDEX IF NOT EXISTS calls_updated ON calls(updated);
CREATE INDEX IF NOT EXISTS calls_deleted ON calls(deleted);
CREATE INDEX IF NOT EXISTS calls_type_date ON calls(call_type, visit_date);

-- 멤버 (로그인 = 이름 + 사번)
CREATE TABLE IF NOT EXISTS members (
  emp     TEXT NOT NULL,                -- 사번 (글자 그대로 · 앞자리 0 유지)
  name    TEXT NOT NULL,
  added   TEXT NOT NULL DEFAULT '',     -- 추가 일시 (한국 시각 yyyy-MM-dd HH:mm)
  "by"      TEXT NOT NULL DEFAULT '',     -- 추가한 사람
  deleted TEXT NOT NULL DEFAULT ''      -- 뺀 일시 + 뺀 사람
);
CREATE INDEX IF NOT EXISTS members_emp ON members(emp);

-- 고객 견적 요청
CREATE TABLE IF NOT EXISTS quotereq (
  id TEXT PRIMARY KEY, at TEXT NOT NULL DEFAULT '', org TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', pax TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '접수', "by" TEXT NOT NULL DEFAULT '', doneAt TEXT NOT NULL DEFAULT '', deleted TEXT NOT NULL DEFAULT ''
);

-- 파일 (사업자등록증 등 단체 서류 kind='doc' · 전화응대 멘트 이미지 kind='ment'). 내용은 file_chunks 에 base64 글자로 나눠 담음 (값 하나 2MB 제한)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL DEFAULT '', "by" TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS file_chunks (
  id TEXT NOT NULL, n INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (id, n)
);

-- 예약 고치는 중 표시 (2분 30초 유지)
CREATE TABLE IF NOT EXISTS locks (
  id TEXT PRIMARY KEY, sid TEXT NOT NULL, "by" TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL
);

-- 그 밖의 값 하나짜리: admin(관리자 사이트 사담 · 마방 현황 JSON) · qr_rate(견적 요청 수 제한)
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY, v TEXT NOT NULL
);
