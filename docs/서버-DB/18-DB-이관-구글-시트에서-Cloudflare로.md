# 18. DB 이관: 구글 시트 → Cloudflare (2026-11-23 전환함)

> 예전 README 의 **18절** 을 그대로 옮긴 것입니다 (2026-11-25 문서 정리). 글 안의 「N절」은 [docs/README.md](../README.md) 의 「번호로 찾기」 표에서 파일을 찾습니다. 쓴 때의 설명이라 **코드와 다르면 코드가 맞습니다.**


**정한 것**: 배포는 GitHub Pages 그대로, 공유 기록만 Cloudflare 로 옮김 (무료 요금제 · 안 써도 정지되지 않음). 로그인은 지금처럼 이름 + 사번. 화면 코드는 바꾸지 않고 `js/common.js` 의 `SY_BACKEND.API_URL` 한 줄만 새 주소로 바꿈. 견적서 서버(`QUOTE_URL` · 품목 · 발급 내역)는 이번에 옮기지 않음.

**지금 상태 (2026-11-23 전환)**: 공유 기록 서버 = `https://sayuwon-api.serendipity5786-9e7.workers.dev/` (Cloudflare Worker `sayuwon-api` + D1 DB `sayuwon`). 자료를 옮겨 대조함 (기록 92줄 · 지워진 줄 21줄 · 멤버 8명 · 멘트 이미지 2장 — 예전 서버와 같음, 이미지는 내용까지 같음). 구글 시트 · Apps Script 는 지우지 않고 그대로 둠 (되돌릴 때: `js/common.js` 의 `API_URL` 옆 주석에 예전 주소). 남은 일: Worker 비밀 값 `ADMIN_ID` · `ADMIN_PW` 넣기 + Cron `*/15 * * * *` (관리자 사이트 자동 가져오기) · 며칠 뒤 `MIGRATE_KEY` 지우기 · Apps Script 15분 트리거 끄기. **11절의 「설치 · 다시 배포」와 14-4절의 구글 시트 · 드라이브 설명은 예전 서버 기준** — 지금 서버는 이 절이 맞음.

### 18-1. 만든 것

| 파일 | 내용 |
|---|---|
| `cloudflare/schema.sql` | DB 표 만들기 (D1 = SQLite). `calls`(기록 · 38칸은 `data` JSON 한 칸에 통째로 + 통화 구분 · 방문일 · 수정 일시 · 삭제 칸) · `members` · `quotereq` · `files` + `file_chunks`(파일) · `locks`(고치는 중) · `kv`(관리자 사이트 현황 등) |
| `cloudflare/worker.js` | 서버 코드. `apps-script/group-intake.gs` 의 동작(11절 표)을 같은 요청 · 같은 응답으로 옮김 + `import`(자료 옮기기 전용) + `GET /file/<id>`(올린 서류 보기) + 15분마다 관리자 사이트 가져오기(`scheduled`) |
| `js/devcf.js` | 로컬 시험 장치: `?mock=cf` 로 켜면 위 서버 코드를 브라우저 안 SQLite(sql.js)에 붙여 화면과 함께 돌림. D1 의 제한(값 하나 2MB · 묶는 값 100개 · 요청 하나에 쿼리 50번)을 넘으면 오류를 냄. `SY_CF.sql('SELECT …')` 로 DB 를 들여다봄 · `SY_CF.reset()` 으로 처음 상태 |
| `tools/migrate.html` | 자료 옮기기: 예전 서버에서 읽어(기록 · 지워진 줄 · 멤버 · 견적 요청 · 멘트 이미지 · 관리자 사이트 현황) 새 서버로 보내고, 다시 읽어 줄마다 값이 같은지 대조. 예전 시트는 읽기만. 여러 번 돌려도 됨 |

**예전과 달라지는 점**

- **이미지 · 파일도 같은 DB 안에** 들어감 (base64 글자를 100만 자씩 나눠 `file_chunks` 에). 구글 드라이브를 쓰지 않음. 멘트 이미지는 예전 드라이브 파일 id 그대로 옮겨서 멘트 내용을 고칠 필요 없음
- **단체 서류(사업자등록증 등)**: 전환 뒤에 올리는 것부터 새 DB 에 들어가고, 링크는 `https://(새 서버)/file/f…` 모양 — id 가 32자 무작위라 **주소를 아는 사람만** 열 수 있음 (예전에는 드라이브 폴더를 공유받은 구글 계정만). 전환 전에 올린 파일은 과업에 붙은 드라이브 링크로 그대로 열림 (옮기지 않음)
- **잠금(LockService) 없음**: 예전에는 저장을 한 번에 하나씩 줄 세웠음. 새 서버는 저장 한 건이 SQL 한 문장이라 줄 세울 필요가 없음. 로그인 없이 한 건 더하는 `bookAdd` 만 「읽고 → 더해서 → 쓰기」라 두 사람이 같은 1초 안에 추가하면 한쪽이 빠질 수 있음 (예전에도 화면 쪽 목록 저장은 같은 성질)
- **목록 응답**: 저장해 둔 JSON 글자를 그대로 이어 붙여 보냄 → 빠름. 값은 예전과 같이 모두 글자, 38칸 밖의 값은 버림(예전과 같음)
- 멤버 목록 5분 기억(캐시) 없음 — 요청마다 DB 에서 확인 (멤버를 빼면 바로 막힘)

**무료 요금제 한도와 걸릴 수 있는 곳** (2026-11 확인 · 가입 화면에서 다시 볼 것): 하루 요청 10만 · DB 500MB · 하루 쓰기 10만 줄 · 요청 하나에 CPU 10ms · 예약 작업 5개
- 지금 자료는 시트 약 60KB · 파일은 건당 수십~수백 KB → 용량은 한참 여유
- **CPU 10ms**: 큰 파일(수 MB)을 올릴 때, 관리자 사이트 180일치 예약을 읽을 때 넘을 수 있음 (오류 1102). 넘으면 그 요청만 실패하고 자료는 그대로. 자주 넘으면 Workers 유료(월 5달러)로
- 10명이 하루 8시간 화면을 열어 두면 요청은 하루 1만 건 안팎 (30초마다 다시 받기) → 한도의 1/10

### 18-2. Cloudflare 에 올리기 (사람이 하는 일 · 한 번)

메뉴 이름은 Cloudflare 화면이 바뀌면 조금 다를 수 있습니다.

1. https://dash.cloudflare.com 가입 (무료 · 이메일 인증)
2. **DB 만들기**: 왼쪽 「Storage & Databases」 → 「D1 SQL Database」 → Create → 이름 `sayuwon` (위치는 아시아 태평양) → 만든 DB 의 「Console」에 `cloudflare/schema.sql` 내용을 통째로 붙여 넣고 실행. 한꺼번에 안 되면 `CREATE …;` 문장을 하나씩
3. **서버 만들기**: 「Workers & Pages」 → Create → 「Hello World」로 시작 → 이름 `sayuwon-api` → Deploy → 「Edit code」 → 들어 있는 코드를 지우고 `cloudflare/worker.js` 내용을 통째로 붙여 넣기 → Deploy
4. **DB 연결**: 그 Worker 의 Settings → Bindings → Add → D1 database → Variable name 에 **`DB`** (대문자 그대로) → Database 는 `sayuwon` → 저장
5. **비밀 값**: Settings → Variables and Secrets → Add (Type 은 Secret)
   - `MIGRATE_KEY` : 아무 긴 글자 (자료 옮길 때만 씀 · 메모해 둘 것) — 화면에서는 Add → Select environment 는 Production · Key / Value 칸 · Secret 켜기
   - `ADMIN_ID` · `ADMIN_PW` : 관리자 사이트 조회 계정 (지금 Apps Script 스크립트 속성에 있는 값)
6. **15분마다**: Settings → Trigger Events(또는 Triggers) → Cron Triggers → Add → `*/15 * * * *`
7. 확인: 브라우저로 `https://sayuwon-api.(계정 이름).workers.dev` 를 열어 `{"ok":true,"app":"sayuwon-group-intake","api":7,"db":"d1"}` 가 보이면 됨

### 18-2b. 테스트 DB 따로 만들기 (2026-11-25 · 사람이 하는 일 · 한 번)

테스트 사이트(`…/sayuwon-sales/test/`)와 이 컴퓨터(localhost · 시험용 모드가 아닐 때)는 **`js/common.js` 의 `SY_TEST_API_URL`** 주소의 서버 · DB 를 씁니다. 비어 있으면 예전처럼 배포 DB 를 쓰고, 테스트 사이트 왼쪽 아래 빨간 이름표에 「DB = 배포 (아직 분리 전)」이 보입니다. 테스트 사이트는 배포 사이트와 같은 주소(github.io)라 브라우저 저장소를 같이 쓰므로, 테스트 사이트는 저장소 이름 앞에 「test:」를 붙여 따로 씁니다(저장 대기열 · 예약 사본이 섞여 다른 DB 로 새지 않게 · 로그인은 같이 씀).

1. **DB 만들기**: D1 SQL Database → Create → 이름 `sayuwon-test` → Console 에 **`cloudflare/schema-console.sql`**(schema.sql 에서 설명 줄을 뺀 것) 을 통째로 붙여 넣고 실행 — schema.sql 을 붙이면 Console 이 줄바꿈을 없애 첫 `--` 설명 뒤가 모두 설명이 되어 「No SQL statements detected」
2. **서버 만들기**: Workers & Pages → Create → Hello World → 이름 `sayuwon-api-test` → Deploy → Edit code → `cloudflare/worker.js` 를 통째로 붙여 넣고 Deploy (배포 서버와 **같은 코드**)
3. **DB 연결**: 그 Worker 의 Settings → Bindings → D1 database → Variable name **`DB`** → Database 는 **`sayuwon-test`** (← 배포용 `sayuwon` 을 고르면 안 됨)
4. **비밀 값 (골라서)**: `ADMIN_ID` · `ADMIN_PW` 는 관리자 사이트 자동 가져오기를 시험할 때만 · `MIGRATE_KEY` 는 배포 자료를 복사해 올 때만. 15분 예약 작업(Cron)은 안 걸어도 됨
5. 확인: 브라우저로 `https://sayuwon-api-test.(계정 이름).workers.dev` → `{"ok":true,…}`
6. 주소를 `js/common.js` 의 `const SY_TEST_API_URL = "";` 따옴표 안에 넣고 → 버전 올려 main 에 푸시 → test 에 합침. 테스트 사이트 이름표가 「테스트 사이트 · 테스트 DB」로 바뀌면 끝
7. 처음 테스트 DB 는 비어 있음: 멤버도 없으므로 **처음 로그인한 사람이 그대로 들어감**(멤버가 없으면 누구나 통과 · 서버 `authOk`) → 멤버관리에서 다른 사람을 넣음. 배포 자료를 통째로 복사해 오려면 **`tools/test-start.ps1`** (45절 · 멤버까지 배포와 같아짐)

### 18-3. 옮기고 전환하기

1. 로컬 미리보기에서 `http://localhost:8767/tools/migrate.html` 열기 → 이름 · 사번(진짜 로그인) · 새 서버 주소 · `MIGRATE_KEY` → 먼저 「세기만」으로 줄 수 확인 → 「옮기기 시작」 → 마지막 줄이 초록 「끝났습니다. 예전 서버와 새 서버의 기록이 같습니다.」 인지 확인
2. `js/common.js` 의 `SY_BACKEND.API_URL` 을 새 서버 주소로 바꾸고, 로컬에서 **가짜 서버를 끈 채**(`?mock=0`) 진짜 로그인으로 주요 화면을 확인 (목록 · 저장 · 멘트 이미지 · 서류 올리기 · 「관리자 사이트에서 지금 가져오기」)
   - `migrate.html` 은 **전환 뒤에 다시 돌려도 안전**: 새 서버에 이미 있는 줄과 견줘 예전 서버 쪽이 더 나중에 바뀐 줄(또는 없는 줄)만 보냄 → 새 서버에서 고친 내용을 덮어쓰지 않음. 전환 직후 아직 새로고침하지 않은 사람이 시트에 저장한 것을 마저 가져올 때 씀
3. 전환하는 날: 직원들에게 「저장 대기 0건」을 확인하고 잠깐 쓰지 말라고 알림 → `migrate.html` 을 **한 번 더** 돌려 그사이 바뀐 것까지 옮김 → 모든 HTML 의 `?v=` 를 올리고 푸시 → 각자 새로고침
   - 각 브라우저에 남아 있던 저장 대기 · 받은 목록 사본은 그대로 새 서버로 이어짐 (주소가 같으므로). 사본은 「마지막으로 받은 뒤 바뀐 것」을 새 서버에 물어 맞추고, 30분 안에 한 번은 전체를 다시 받음
4. 전환 뒤: Worker 의 `MIGRATE_KEY` 비밀 값을 지움 (지우면 `import` 가 막힘). Apps Script 의 15분 트리거(`syncAdmin`)는 꺼도 됨. **구글 시트 · Apps Script 는 지우지 않음** — 문제가 생기면 `API_URL` 을 예전 주소로 되돌리면 예전 방식으로 돌아감 (단, 전환 뒤 새 DB 에만 저장된 것은 시트에 없음)
5. README 11절 「설치 · 다시 배포」 · 14-4절 「파일」 설명을 새 서버 기준으로 고침

### 18-4. 로컬 시험 기록 (2026-11-23 · `?mock=cf`)

| 확인한 것 | 결과 |
|---|---|
| 동작 하나씩: `login`(띄어쓰기 · 대소문자 무시) · `list`(38칸 · `inout` 계산 · `now` · `admin`) · `put`(38칸 밖 값 버림 · 틀린 id 는 `Error: bad_id`) · `list since`(바뀐 줄만 · 지운 줄은 `deleted` 가 채워짐) · `del` · `deleted` · `lock`(다른 창이면 `locked` · 풀면 다시 잡힘) · 멤버 아님 → `bad_key` · 모르는 동작 → `bad_action` | 예전 서버와 같은 답 |
| `memberAdd`(같은 사번 · 빈 이름 건너뜀) · `memberDel` · `quoteReqAdd`(틀린 연락처 → `bad_phone` · 인원은 숫자만) · `quoteReqList` · `quoteReqMark`(완료 = 처리한 사람 · 시각 / 삭제 / 없는 id → `not_found`) · `bookList`(연락처 칸 없음 · 26칸) · `bookAdd`(틀린 날짜 → `bad_date` · 이상한 칸 이름 버림) | 같은 답 |
| 파일: `mentImgPut` → `mentImgGet` 으로 같은 내용 · `upload` 2.6MB → 3조각으로 저장 · `GET /file/<id>` 로 195만 바이트 PDF 가 그대로 · 서류 id 로 `mentImgGet` → `not_allowed` · 멘트 이미지 id 로 `/file/` → 404 · 허용하지 않는 형식 거절 | 정상 |
| `import`: 키가 틀리면 `bad_key` · 수정 일시 · 삭제 표시 유지 · 멤버 중복 안 생김 · 드라이브 파일 id 그대로 이미지가 열림 · 두 번 돌려도 같은 결과 · id 모양이 틀린 줄은 건너뛰고 알려 줌 | 정상 |
| Worker 입구: `POST`(CORS `*`) · `OPTIONS` 204 · `GET /` 상태 · 깨진 JSON → `bad_json` | 정상 |
| 화면: 첫 화면 대시보드 · 단체 저장(`put` → `list`) · 예약 열기(`lock` · 자동 과업 4개) · 삭제 · 분실물 추가 · 나의 할일 · 멘트 | 콘솔 오류 없음 |
| `tools/migrate.html`: 가상 예전 서버 → 새 서버 코드로 옮기고 대조 | 정상 |

**로컬에서 확인할 수 없는 것** (Cloudflare 에 올린 뒤 볼 것): 진짜 D1 에서 `schema.sql` 이 그대로 도는지 · CPU 10ms 안에 드는지(특히 `syncAdmin` · 큰 파일) · 관리자 사이트가 Cloudflare 에서 오는 요청을 받아 주는지 · 15분 예약 작업
