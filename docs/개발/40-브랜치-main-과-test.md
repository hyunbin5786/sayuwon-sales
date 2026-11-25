# 40. main = 배포 · test = 확인 (2026-11-24 · `.github/workflows/pages.yml` · `test-ping.yml`)

> 예전 README 의 **40절** 을 그대로 옮긴 것입니다 (2026-11-25 문서 정리). 글 안의 「N절」은 [docs/README.md](../README.md) 의 「번호로 찾기」 표에서 파일을 찾습니다. 쓴 때의 설명이라 **코드와 다르면 코드가 맞습니다.**

- **main** 브랜치 → 배포 사이트 `https://hyunbin5786.github.io/sayuwon-sales/` (직원들이 쓰는 곳)
- **test** 브랜치 → 테스트 사이트 `https://hyunbin5786.github.io/sayuwon-sales/test/` (왼쪽 아래 빨간 「테스트 사이트」 · 개발 중 기능도 모두 보임)
- 작업 순서 (2026-11-25 다시 정함 · **45절**): 고친 것은 **test 에 커밋 · push** → 1~2분 뒤 테스트 사이트에서 확인 → 「푸시」라고 하면 **test 를 main 에 합침** (`git checkout main && git merge test && git push`, 다시 `git checkout test`) · 다 만든 기능은 그때 `js/common.js` DEV_PAGES 에서 뺌
- 자동 배포: main 에 올리면 「사이트 배포」가 바로 · test 에 올리면 「test 브랜치 알림」이 끝난 뒤 「사이트 배포」가 main 에서 돌아 둘을 함께 올림 (GitHub 는 기본 브랜치에서만 Pages 배포를 허락해서 이렇게)
- 저장소 설정 › Pages › Build and deployment › Source = **GitHub Actions** (예전 「Deploy from a branch」 아님)
- 서버 · DB 는 사이트마다 따로 (2026-11-25): 배포 사이트 = `sayuwon-api` + D1 `sayuwon` · 테스트 사이트 = `sayuwon-api-test` + D1 `sayuwon-test` → **테스트 사이트에서 저장한 것은 테스트 DB 에만** · 두 사이트는 같은 github.io 지만 테스트 사이트는 브라우저 저장값 · 로그인을 「test:」로 따로 씀 (18-2b절 · 45절)
