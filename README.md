# 사유원 운영 보조 시스템

사유원 예약 · 운영팀이 **전화 응대 · 단체 예약 접수 · 다음날 응대 준비 · 견적서 발급 · 할 일 관리 · 분실물 · 재고**를 한곳에서 하는 사내 웹 시스템입니다.

- 화면: 빌드 없는 HTML · CSS · JS → GitHub Pages 에 자동으로 올라감
- 자료: Cloudflare (서버 = Worker · DB = D1)
- 고치는 사람: 코드를 모르는 운영팀 직원이 **Claude Code 에게 말로 시켜서** 고칩니다
- 백업: **매주 수요일 9시**에 개발 담당 PC 가 자료 전체를 받아 사내 공유 폴더 `\\117.52.31.188\티시그린\11. 운영보조플랫폼 자료다운` 에 저장하고 있습니다 (2026-11-26 부터 · 최근 8개)

## 최근 바뀐 것

**개발을 시작할 때 읽고(마지막으로 올린 곳이 다른 PC 였을 때 — 이 PC 가 올린 것이 맨 끝이면 건너뜀), 개발이 끝나면 꼭 한 줄 적습니다** (운영팀이 정한 「헌법」 — [CLAUDE.md](CLAUDE.md) 0절). 여러 사람이 같이 고치므로, 남이 무엇을 바꿨는지 여기서 압니다. 새 것을 맨 위에 적습니다. 더 자세한 기록은 [docs/바뀐-것-기록.md](docs/바뀐-것-기록.md).

| 날짜 | 화면 | 무엇이 바뀌었나 | 어디까지 |
|---|---|---|---|
| 2026-11-27 | 예약현황 공유 (직접 추가) | **「＋ 직접 추가」 단추를 없앰** (PC · 휴대폰 · 단체 화면의 예약 목록 창 모두) — 앞으로는 단체 예약에 있는 것만 이 목록에 나오게 하기로 해서. **예전에 직접 넣어 둔 예약은 지우지 않았고 목록에 그대로 보이며**, 그 줄의 「수정」 · 「×」와 「수정 기록」도 그대로. 「위 ＋ 직접 추가로 넣으세요」 같은 안내 글도 뺌 | test 에만 |
| 2026-11-27 | 예약현황 공유 (찾기 · 목록) | ① **「기간 설정」 단추를 없앰** — 날짜 칸을 바로 눌러 고름 (비어 있으면 전체 · 하나만 고르면 그날 하루 · 둘을 다르게 고르면 기간 · 「초기화」를 누르면 전체로) ② 목록 맨 끝 칸의 **「단체예약」 이름표를 없앰** (줄을 누르면 그 예약이 열리는 것은 그대로 · 직접 추가한 줄의 수정 · × 는 그대로) ③ 글자로 찾은 결과는 줄마다 이름표를 붙이는 대신 **목록마다 상자를 나눠** 그 안에 보임 (상자 제목 = 목록 이름 + 건수). 단체 화면의 예약 목록 창도 같음 | test 에만 |
| 2026-11-27 | 예약현황 공유 (휴대폰) | ① **휴대폰에서 화면이 아래로 내려가지 않던 것을 고침** (이 화면이 늘 「팝업이 떠 있음」으로 잡혀 스크롤이 잠겨 있었음 · PC 에서 목록이 길 때도 같았음) ② 휴대폰 **글자를 조금 줄임** — 예약 한 건 카드 · 제목 · 단추 (카드 글자 18 → 15) ③ PC 배치에 맞춤 — 「찾기」 · 「담당 일정 · 출력」 두 상자에 제목과 흰 카드 모양, 목록 단추 다섯 개는 한 줄, 날짜 칸은 한 줄 가득, 「출력하기」 · 「＋ 직접 추가」는 나란히. PC 모습은 그대로 | 메인까지 |
| 2026-11-27 | 예약현황 공유 (예약 목록 찾기) | 찾기 칸에 글자를 넣으면 지금 보던 목록 하나가 아니라 **몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 모든 목록에서 한꺼번에** 찾음 (한 사람이 여러 목록의 담당일 때 이름으로 한 번에 보려고). 줄마다 내용 앞에 어느 목록 것인지 이름표가 붙고, 「찾은 예약 4건 (대관 1 · 도슨트 3)」처럼 목록별 건수도 보임. 글자를 지우거나 위의 목록 단추를 누르면 그 목록 하나로 돌아감. 날짜(기간 설정)만 켠 것 · 찾기를 안 쓸 때의 모습은 그대로. PC · 휴대폰 · 로그인 전후 모두 · 단체 화면의 예약 목록 창도 같음 | 메인까지 |
| 2026-11-27 | 단체고객 응대 (휴대폰) | 휴대폰(폭 700px 아래)에서는 **통화 메모와 추후 과업만** 보임 — 맨 위에 어느 예약인지(단계 · 방문일 · 인원 · 업체명 · 읽기만)와 「다른 단체 찾기」, 맨 아래에 「구체적인 예약 정보 편집은 PC 에서 해 주세요.」 안내 글. 예약 내용 · 가격표 · 수정 기록 · 머리줄의 새 통화 / 단체예약 목록 등 버튼은 휴대폰에서 숨김. 예약은 첫 화면의 단체명 찾기로 고름. **새 통화도 됨**: 단체명을 적고 「○○ 새 통화로 시작」 → 통화 메모를 적어 「저장」하면 예약상담으로 저장 (단체명 없이는 안 됨 · 나머지 칸은 PC 에서). 휴대폰에서는 과업 체크가 바로 저장됨. PC 화면은 그대로 | 메인까지 |
| 2026-11-27 | 개인고객 응대 | 통화 기록의 「단체고객 응대로 변경」 버튼을 초록에서 흰색으로 (옆의 「보고 글자 복사」와 같은 모양 · 초록은 「저장」만) | 메인까지 |
| 2026-11-26 | 첫 화면 「매뉴얼」 | 매뉴얼 글을 「자료 백업 · 되살리기」에서 팀 안내로 바꿈: 시스템이 어떻게 생겼나(식당 비유 그림) · Claude 로 고치는 법 · 간단한 백업 안내 · 주소 모음 | 메인까지 |
| 2026-11-26 | 메뉴 | 메뉴를 열었을 때 맨 위의 「메뉴」 글자와 × 버튼을 없앰 — 헤더의 메뉴 버튼을 다시 누르면 접힘 (바깥을 누르거나 Esc 로도 닫힘) | 메인까지 |
| 2026-11-26 | 메뉴 · 첫 화면 헤더 | 헤더의 「로그아웃」 버튼을 없애고, 메뉴 맨 아래에 로그아웃을 둠 (PC · 휴대폰 같음) | 메인까지 |
| 2026-11-26 | 테스트 사이트 전체 | 테스트 사이트는 화면을 열 때마다 자료 전체를 새로 받음 — 테스트 DB 를 배포 DB 로 다시 복사한 뒤에도 브라우저의 옛 사본(나의 할일 등)이 30분까지 남던 것 고침 · 배포 사이트는 그대로 | 메인까지 |
| 2026-11-26 | 단체고객 응대 › 통화 메모 · 추후 과업 · 나의 할일 | 영업 담당이 아닌 사람이 통화 메모를 고쳐 저장하면 **예약 단계와 상관없이** 영업 담당에게 「통화 메모 확인」 과업이 뜸 — 예전엔 예약상담 · 예약취소 예약에서는 안 떴고, 영업 담당이 그 과업을 한 번 지운 예약에서도 다시 안 떴음 (원래 메모가 있었는지와는 상관없었음). 영업 담당 본인이 고치면 안 뜸. 추후과업 메시지 관리 「통화 메모 확인」의 규칙 글도 맞춤 | 메인까지 |
| 2026-11-26 | 나의 할일 › 설정 › 과업 알림 | 「알림이 저절로 뜨는지 시험」 버튼을 없앰 (같은 날 넣었다가 뺌 · 허용 방법 안내 상자와 「알림 허용」 버튼은 그대로) | 메인까지 |
| 2026-11-26 | 과업 알림 (모든 알림 뜨는 화면) | 안내 상자에 「알림 허용」 버튼 — 한 번 누르고 브라우저가 물을 때 「허용」하면, 알림 창이 막힌 PC 에서도 알림 시각에 화면 오른쪽 아래에 윈도우 알림이 뜸(누를 때까지 남고 · 누르면 과업 알림 창) · 사람마다 · 브라우저마다 한 번 · 운영 시스템 화면 하나는 열려 있어야 함 | 메인까지 |
| 2026-11-26 | 과업 알림 (모든 알림 뜨는 화면) · 나의 할일 › 설정 | 알림 창을 브라우저가 막은 사람에게만 화면 오른쪽 아래에 「팝업 허용 방법」 안내 상자가 뜸(하루 한 번 · 붙여 넣을 주소 「복사」 버튼 · 허용하면 다시 안 나옴) · 설정에 「알림 창이 저절로 뜨는지 시험」 버튼(6초 뒤 열어 봄) | 메인까지 |
| 2026-11-26 | (일하는 방법) | 헌법 고침: 새 개발을 시작할 때 README 읽기는 「마지막으로 올린 곳이 다른 PC 였을 때」만 — 계정을 같이 쓰므로 올린 사람이 아니라 이 PC 의 올린 기록으로 가림 | 메인까지 |
| 2026-11-26 | 과업 알림 | 알림 줄 맨 앞에 체크 칸 — 체크하면 그 자리에서 완료로 저장되고 줄이 사라짐 (나의 할일 「오늘 마감」과 같은 방식 · 예약을 열어야 끝나는 과업은 회색 체크 칸 = 그 예약을 엶 · 견적 요청은 체크 칸 없음) | 메인까지 |
| 2026-11-26 | 나의 할일 › 설정 › 과업 알림 | 알림 설정 칸을 쉽게: 「하루에 몇 번 알릴까요?」 − / ＋ 로 횟수(끔 ~ 8번)를 정하고, 시각마다 오전·오후 · 시 · 분을 골라 정함 · 「기본으로」 버튼은 없앰(처음 값은 그대로 오전 8시 · 11시 · 오후 1시 · 5시) | 메인까지 |
| 2026-11-26 | 과업 알림 (단체 · 개인고객 · 첫 화면) | 알림 창이 안 뜨던 것 고침 — 캘린더처럼 따로 뜨는 창으로, 브라우저가 막으면 그 시각 뒤 화면을 처음 누를 때 뜸(팝업 허용 필요 없음) · 알림의 초록 「완료」 버튼 없앰(「열기」 · 「닫기」만) · 단체 + 개인만 알리던 것을 나의 할일에 있는 것 모두로(직접 넣은 업무 · 내가 맡은 고객 견적 요청 포함) | 메인까지 |
| 2026-11-26 | (일하는 방법) | 「헌법」을 정함: 새 개발을 시작할 때마다 ① 남이 올린 코드를 받고 ② 이 README 를 읽고 ③ 배포 DB 를 테스트 DB 로 다시 가져온다 · 개발이 끝나면 이 표에 한 줄 적는다 | 메인까지 |

## 처음이라면

| 누구 | 읽을 것 |
|---|---|
| **사람** (새로 맡은 직원) | [개발-시작하기.md](개발-시작하기.md) — 준비물 · 내 PC 로 가져오기 · Claude 에게 이렇게 말하면 된다 · 철칙 · 문제가 생겼을 때 |
| **Claude Code 등 AI** | [CLAUDE.md](CLAUDE.md) — 일하는 순서 · DB 구조 · 철칙 (이 폴더를 열면 자동으로 읽힘) |

**AI 코딩 도구(Claude Code 등)에게 — 이 저장소 주소만 받았다면 이 순서로:**

1. `git clone https://github.com/hyunbin5786/sayuwon-sales.git` → 그 폴더에서 `git checkout test` (개발은 늘 `test` 에서)
2. [CLAUDE.md](CLAUDE.md) 를 끝까지 읽고 그대로 따른다 (요청한 사람은 개발자가 아니다 — 쉬운 한국어로)
3. `powershell -ExecutionPolicy Bypass -File tools\check.ps1` — 지금 상태와 「먼저 할 일」이 나온다 (저장에 남을 이름이 맨 먼저 · 종료 코드 3 은 오류가 아니라 「할 일이 있다」는 뜻)
4. 어느 파일이 무엇인지는 [docs/코드-지도.md](docs/코드-지도.md), 화면의 규칙은 [docs/README.md](docs/README.md) 의 「화면별로 찾기」
5. 받은 폴더가 세션을 연 폴더와 다르면, 사람에게 「다음부터는 Claude Code 에서 `sayuwon-sales` 폴더를 열어 주세요」 라고 알린다 (그래야 CLAUDE.md 가 자동으로 읽힌다)

## 바로가기

| | 배포 (직원들이 쓰는 진짜) | 테스트 (고쳐 보는 곳 · 빨간 테두리) |
|---|---|---|
| 사이트 | https://hyunbin5786.github.io/sayuwon-sales/ | https://hyunbin5786.github.io/sayuwon-sales/test/ |
| 코드 (브랜치) | [`main`](https://github.com/hyunbin5786/sayuwon-sales/tree/main) | [`test`](https://github.com/hyunbin5786/sayuwon-sales/tree/test) |
| 서버 (Cloudflare Worker) | `sayuwon-api` | `sayuwon-api-test` |
| DB (Cloudflare D1) | `sayuwon` | `sayuwon-test` |

- 올라갔는지 보기: [GitHub Actions 「사이트 배포」](https://github.com/hyunbin5786/sayuwon-sales/actions) (올리고 1~2분)
## 화면

메뉴에 나오는 순서입니다. 「배포」 · 「테스트」를 누르면 그 화면이 열립니다 (로그인 = 이름 + 사번). **상태**의 「테스트에만」은 아직 만드는 중이라 배포 사이트에서는 가려 둔 화면입니다.

| 메뉴 | 화면 | 파일 | 열기 | 상태 |
|---|---|---|---|---|
| — | 첫 화면 (로그인 · 대시보드 · 캘린더 · 공지사항) | `index.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/) | 쓰는 중 |
| — | 나의 할일 | `group.html?my=1` | [배포](https://hyunbin5786.github.io/sayuwon-sales/group.html?my=1) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/group.html?my=1) | 쓰는 중 |
| 예약보조 › 고객 응대 접수 | 개인고객 응대 | `personal.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/personal.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/personal.html) | 쓰는 중 |
| 예약보조 › 고객 응대 접수 | 단체고객 응대 | `group.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/group.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/group.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 예약 현황 공유 (공지용 표) | `status.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/status.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/status.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 네이버 예약 → 사유원 전산 이관 | `naver.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/naver.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/naver.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 전화응대 멘트 (로그인 없이 보기) | `ment.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/ment.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/ment.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 견적서 / 거래명세서 발급 | `document/` | [배포](https://hyunbin5786.github.io/sayuwon-sales/document/) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/document/) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 고객 견적 요청 (고객이 로그인 없이 적음) | `document/request.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/document/request.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/document/request.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 다음날 고객 응대 준비 | `prep.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/prep.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/prep.html) | 쓰는 중 |
| 예약보조 › 고객 응대 보조 | 대구대교구 무료입장 명부 | `clergy.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/clergy.html) | 테스트에만 |
| 예약보조 › 고객 응대 보조 | 예약 취소 요청 | `cancel.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/cancel.html) | 테스트에만 |
| 예약보조 › 고객 응대 보조 | 대관 규정 및 상품 | `rent.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/rent.html) | 테스트에만 |
| 예약보조 › 고객 응대 보조 | 협업 여행사 할인 현황 | `agency.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/agency.html) | 테스트에만 |
| 운영보조 › 예약현황 공유 | 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 예약 목록 (로그인 없이 보기) | `group.html?book=mb` (`rent` · `docent` · `prog` · `coupon`) | [배포](https://hyunbin5786.github.io/sayuwon-sales/group.html?book=mb) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/group.html?book=mb) | 쓰는 중 |
| 운영보조 › 운영 참고 자료 | 분실물 찾기 (접수 · 찾기는 로그인 없이) | `lost.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/lost.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/lost.html) | 쓰는 중 |
| 운영보조 › 운영 참고 자료 | 사고현황 접수 | `accident.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/accident.html) | 테스트에만 |
| 운영보조 › 운영 참고 자료 | 재고관리 | `stock.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/stock.html) | 테스트에만 |
| 운영보조 › 운영 참고 자료 | 기업 프로모션 할인 | `promo.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/promo.html) | 테스트에만 |
| 운영보조 › 운영 참고 자료 | 스마트스토어 발송 보고 | `ship.html` | [배포](https://hyunbin5786.github.io/sayuwon-sales/ship.html) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/ship.html) | 메뉴에서 뺌 (주소로만) |
| 홍보 보조 | 홍보 기자 리스트 | `press.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/press.html) | 테스트에만 |
| 매뉴얼 | 고객 응대 매뉴얼 | `manual.html` | [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/manual.html) | 테스트에만 |
| 기타 설정 | 품목관리 · 멤버관리 | `index.html#catalog` · `#members` | [배포](https://hyunbin5786.github.io/sayuwon-sales/#catalog) · [테스트](https://hyunbin5786.github.io/sayuwon-sales/test/#catalog) | 쓰는 중 |

화면마다 무엇을 어떻게 하는지 · 왜 그렇게 정했는지는 [docs/README.md](docs/README.md) 의 「화면별로 찾기」.

## 폴더

```
README.md             이 글
CLAUDE.md             Claude 가 일하는 법 (순서 · DB 구조 · 철칙) — Claude Code 가 자동으로 읽음
개발-시작하기.md      사람이 처음 읽는 안내

*.html                화면 하나에 파일 하나 (틀만 있음 — 위 「화면」 표)
css/                  화면 모양        (화면 이름.css · 여럿이 같이 쓰는 것: menu · ops · prep · mypop · stable)
js/                   화면 동작        (화면 이름.js · 모두가 먼저 읽는 것: common.js)
js/group/             단체고객 화면의 소스 17조각 → 합쳐서 js/group.js (직접 고치지 않음 · tools\build.ps1)
document/             견적서 / 거래명세서 · 고객 견적 요청 (화면 + css + js · 품목 · 가격 목록도 여기)
manual/               첫 화면 「매뉴얼」 버튼이 보여 주는 글
cloudflare/           서버 코드 worker.js · DB 표 schema.sql  (Cloudflare 화면에 붙여 넣어 올림 — git push 로는 안 올라감)
tools/                도구: check(상태 점검) · serve(내 PC 에서 띄우기) · test-start(새 개발 시작)
                            build(단체 화면 합치기) · bump(?v= 올리기) · map(코드 지도 다시 만들기)docs/                 문서: 코드-지도.md(자동) · 바뀐-것-기록.md · 화면/ · 서버-DB/ · 개발/
.github/workflows/    main · test 에 올리면 사이트를 자동으로 올리는 설정
```

어느 화면이 어느 파일을 읽는지 · 파일마다 무엇을 하는지 · 서버 동작 · DB 표는 **[docs/코드-지도.md](docs/코드-지도.md)** (코드에서 자동으로 뽑은 것).

## 일하는 순서 (한눈에)

1. **새 개발을 시작할 때마다** — 남이 올린 코드를 받고 · (다른 PC 가 마지막으로 올렸으면) 이 README 의 「최근 바뀐 것」을 읽고 · 배포 DB 를 테스트 DB 로 다시 가져온다 (`tools\test-start.ps1` · 테스트 DB 는 그때 복사한 사본이라, 다시 가져오기 전에는 그 뒤 배포에서 생긴 자료가 안 보인다)
2. **고치고 → 내 PC 에서 확인 → 「최근 바뀐 것」에 한 줄 → `test` 에 올림 → 테스트 사이트에서 확인** (되풀이)
3. **「푸시」** — `test` 의 코드를 `main` 으로 (자료는 가지 않음)

꼭 지키는 것: 배포 DB 는 화면으로만 바꾼다 · 지우지 않는다(지운 표시만) · 자료는 배포 → 테스트로만 간다 · 열쇠(`TEST_SYNC_KEY`)는 테스트 서버에만 · 이름 · 사번 · 고객 자료 · 열쇠를 이 저장소에 올리지 않는다(공개 저장소). 전체는 [CLAUDE.md](CLAUDE.md) 5절.

## 문서

| 문서 | 무엇 |
|---|---|
| [개발-시작하기.md](개발-시작하기.md) | 사람용 시작 안내 |
| [CLAUDE.md](CLAUDE.md) | 일하는 규칙 · DB 구조 · 철칙 |
| [docs/README.md](docs/README.md) | 문서 안내 — 화면별로 찾기 · 서버 · DB · 개발 방법 · 번호로 찾기 |
| [docs/코드-지도.md](docs/코드-지도.md) | 화면 ↔ 파일 · 파일마다 하는 일 · 서버 동작 · DB 표 (자동) |
| [docs/바뀐-것-기록.md](docs/바뀐-것-기록.md) | 고칠 때마다 한 줄씩 적는 기록 |
