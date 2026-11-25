# legacy — 지금은 쓰지 않는 것

화면도 서버도 이 폴더의 파일을 읽지 않습니다. **고칠 일이 없습니다.** 지우지 않고 남겨 둔 까닭만 적습니다.

| 무엇 | 왜 남겼나 |
|---|---|
| `apps-script/group-intake.gs` | 2026-11-23 까지 쓰던 서버 (구글 시트 + Apps Script). 지금 서버는 `cloudflare/worker.js`. 예전 동작을 확인하거나 되돌릴 일이 생길 때 참고 |
| `migrate.html` | 구글 시트 → Cloudflare 로 자료를 옮길 때 한 번 쓴 도구. 끝났음 ([docs/서버-DB/18](../docs/서버-DB/18-DB-이관-구글-시트에서-Cloudflare로.md)) |
| `manual/status.html` · `manual/img/` | 「예약 현황 공유」 화면의 매뉴얼 글과 사진. 2026-11-24 에 매뉴얼 버튼을 첫 화면에만 두기로 해서 열 길이 없어짐. 화면별 매뉴얼을 다시 만들 때 `manual/` 로 되돌려 씀 |
