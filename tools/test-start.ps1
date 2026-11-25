# 테스트 환경을 새로 시작 (2026-11-25 · README 45절) — 새 개발을 시작할 때마다 한 번
#   1) 코드:  test 브랜치를 main 과 똑같이 (test 에 main 에 없는 커밋이 있으면 멈추고 알림 — 지우지 않음)
#   2) DB:    배포 DB(sayuwon) 의 모든 표를 읽어 테스트 DB(sayuwon-test) 를 비우고 그대로 넣음 (배포 DB 는 읽기만 함)
#   실행:        powershell -ExecutionPolicy Bypass -File tools\test-start.ps1
#   DB 만:       … -DbOnly        코드만: … -CodeOnly
#   세어만 보기: … -DryRun        (배포 DB 를 읽어 줄 수만 셈 · 테스트 DB 는 건드리지 않음)
#   열쇠 복사:   … -CopyKey       (TEST_SYNC_KEY 값을 클립보드에 — Cloudflare 테스트 서버의 비밀 값에 붙여 넣을 때)
# 필요한 것 (처음 한 번):
#   · tools\backup-config.json 의 name · emp (배포 DB 를 읽을 로그인 · 백업과 같은 파일)
#   · tools\test-sync-key.txt (없으면 이 스크립트가 만듦 · 저장소에 올리지 않음) 의 값을 테스트 서버 sayuwon-api-test 의 비밀 값 TEST_SYNC_KEY 로
#     ※ 배포 서버 sayuwon-api 에는 TEST_SYNC_KEY 를 절대 넣지 않음 (넣지 않으면 배포 DB 는 이 동작으로 지워질 수 없음)
param([switch]$DbOnly, [switch]$CodeOnly, [switch]$DryRun, [switch]$CopyKey)
$ErrorActionPreference = 'Stop'
$src = 'https://sayuwon-api.serendipity5786-9e7.workers.dev/'        # 배포 서버 (읽기만)
$dst = 'https://sayuwon-api-test.serendipity5786-9e7.workers.dev/'   # 테스트 서버 (비우고 다시 채움)
if ($dst -notlike '*sayuwon-api-test*' -or $dst -eq $src) { throw '받는 쪽이 테스트 서버가 아닙니다 — 멈춤' }
$order = 'members', 'calls', 'quotereq', 'quote_history', 'kv', 'clergy', 'press', 'manual', 'files', 'file_chunks'   # 멤버를 맨 먼저 (멤버가 없는 동안은 누구나 로그인되므로)
$maxBytes = 700000   # 한 번에 보내는 줄 묶음의 크기 (D1 은 값 하나 2MB 까지)
$utf8 = New-Object Text.UTF8Encoding $false
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ---- 열쇠 (TEST_SYNC_KEY) ----
$keyPath = Join-Path $PSScriptRoot 'test-sync-key.txt'
if (-not (Test-Path $keyPath)) {
  $b = New-Object byte[] 24; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b)
  [IO.File]::WriteAllText($keyPath, (($b | ForEach-Object { $_.ToString('x2') }) -join ''), $utf8)
  "열쇠 파일을 만들었습니다: $keyPath"
}
$key = ([IO.File]::ReadAllText($keyPath)).Trim()
if ($CopyKey) { Set-Clipboard -Value $key; '열쇠(TEST_SYNC_KEY 값)를 클립보드에 복사했습니다. Cloudflare › sayuwon-api-test › Settings › Variables and Secrets 에 붙여 넣으세요.'; exit 0 }

# ---- 1) 코드: test = main ----
if (-not $DbOnly -and -not $DryRun) {
  $repo = Split-Path $PSScriptRoot -Parent
  if (git -C $repo status --porcelain) { '저장하지 않은 수정이 있습니다 — 먼저 커밋하거나 되돌린 뒤 다시 실행해 주세요.'; exit 1 }
  git -C $repo fetch --quiet origin; if ($LASTEXITCODE) { throw 'git fetch 실패' }
  $ahead = [int](git -C $repo rev-list --count origin/main..origin/test) + [int](git -C $repo rev-list --count origin/main..test)
  if ($ahead) { 'test 브랜치에 main 에 없는 커밋이 있습니다 (아직 메인에 푸시하지 않은 작업).'; '먼저 메인에 푸시할지, 버릴지 정한 뒤 다시 실행해 주세요.  확인: git log --oneline origin/main..test'; exit 1 }
  git -C $repo checkout --quiet test; if ($LASTEXITCODE) { throw 'git checkout test 실패' }
  git -C $repo merge --quiet --ff-only origin/main; if ($LASTEXITCODE) { throw 'test 를 main 에 맞추지 못했습니다' }
  git -C $repo push --quiet origin test; if ($LASTEXITCODE) { throw 'git push 실패' }
  '1) 코드: test 브랜치 = main  (' + (git -C $repo rev-parse --short test) + ')'
}
if ($CodeOnly) { exit 0 }

# ---- 2) DB: 배포 → 테스트 ----
function Post([string]$url, [string]$body) { $wc = New-Object Net.WebClient; $wc.Encoding = $utf8; try { return $wc.UploadString($url, 'POST', $body) } finally { $wc.Dispose() } }
function Need-Ok([string]$text, [string]$what) { if (-not $text.StartsWith('{"ok":true')) { throw ("$what — 서버가 거절했습니다: " + $text.Substring(0, [Math]::Min(200, $text.Length))) } }
# 서버 답 {"ok":true,"table":"…","rows":[ … ],"next":123} 에서 rows 안쪽 글자와 next 를 꺼냄 (큰 답도 통째로 풀지 않고 글자로만 다룸 · tools/backup.ps1 과 같음)
function Split-Page([string]$text) {
  Need-Ok $text '배포 DB 읽기'
  $a = $text.IndexOf('"rows":['); $b = $text.LastIndexOf('],"next":')
  if ($a -lt 0 -or $b -lt $a) { throw '서버 답의 모양이 예상과 다릅니다' }
  return @{ rows = $text.Substring($a + 8, $b - $a - 8); next = $text.Substring($b + 9).TrimEnd('}') }
}

try {
  $cfgPath = Join-Path $PSScriptRoot 'backup-config.json'
  if (-not (Test-Path $cfgPath)) { throw "tools\backup-config.json 이 없습니다 — tools\backup.ps1 을 한 번 실행해 만들고 name · emp 를 적어 주세요" }
  $cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $cfg.name -or -not $cfg.emp) { throw 'backup-config.json 에 name(이름) 과 emp(사번) 을 적어 주세요' }
  $who = '{"name":' + (ConvertTo-Json ([string]$cfg.name)) + ',"emp":' + (ConvertTo-Json ([string]$cfg.emp)) + '}'
  $keyJson = ConvertTo-Json $key

  if (-not $DryRun) {
    $wc = New-Object Net.WebClient; $wc.Encoding = $utf8; $st = $wc.DownloadString($dst) | ConvertFrom-Json; $wc.Dispose()
    if (-not $st.testSync) {
      '테스트 서버가 아직 준비되지 않았습니다 (처음 한 번 · README 45-3절):'
      '  ① Cloudflare › Workers & Pages › sayuwon-api-test › Edit code → cloudflare\worker.js 를 통째로 붙여 넣고 Deploy'
      '  ② 같은 서버 › Settings › Variables and Secrets › Add › Type = Secret · 이름 TEST_SYNC_KEY · 값 = 열쇠  (열쇠 복사: tools\test-start.ps1 -CopyKey)'
      exit 2
    }
  }
  $have = (Post $src ('{"action":"export","who":' + $who + '}') | ConvertFrom-Json)
  if (-not $have.ok) { throw ('배포 DB 로그인이 확인되지 않았습니다 (' + $have.error + ') — backup-config.json 의 이름 · 사번 확인') }
  $tables = $order | Where-Object { $have.tables -contains $_ }
  $extra = $have.tables | Where-Object { $order -notcontains $_ }
  if ($extra) { throw ('배포 DB 에 이 스크립트가 모르는 표가 있습니다: ' + ($extra -join ', ') + ' — tools\test-start.ps1 의 $order 와 cloudflare\worker.js 의 MIRROR 에 더해 주세요') }

  if (-not $DryRun) { Need-Ok (Post $dst ('{"action":"mirror","key":' + $keyJson + ',"step":"begin"}')) '테스트 DB 비우기'; '2) DB: 테스트 DB 를 비웠습니다. 배포 DB 에서 복사하는 중…' }
  $counts = @{}
  foreach ($t in $tables) {
    $after = '0'; $n = 0; $limit = if ($t -eq 'file_chunks') { 1 } else { 100 }
    while ($true) {
      $p = Split-Page (Post $src ('{"action":"export","table":"' + $t + '","after":' + $after + ',"limit":' + $limit + ',"who":' + $who + '}'))
      if ($limit -gt 1 -and $utf8.GetByteCount($p.rows) -gt $maxBytes) { $limit = [Math]::Max(1, [int][Math]::Floor($limit / 4)); continue }   # 묶음이 너무 크면 더 잘게 다시 받음
      if ($p.rows.Length) {
        $n += ([regex]::Matches($p.rows, '\{"seq":\d+,')).Count
        if (-not $DryRun) { Need-Ok (Post $dst ('{"action":"mirror","key":' + $keyJson + ',"table":"' + $t + '","rows":[' + $p.rows + ']}')) "테스트 DB 에 넣기 ($t)" }
      }
      if ($p.next -eq 'null') { break }
      $after = $p.next
    }
    $counts[$t] = $n; ('   {0,-14} {1,6} 줄' -f $t, $n)
  }
  if ($DryRun) { '세어만 봤습니다 (테스트 DB 는 그대로).'; exit 0 }

  $done = Post $dst ('{"action":"mirror","key":' + $keyJson + ',"step":"done"}'); Need-Ok $done '마무리'
  $got = ($done | ConvertFrom-Json).counts; $bad = @()
  foreach ($t in $tables) { if ([int]$got.$t -ne $counts[$t]) { $bad += "$t (배포 $($counts[$t]) · 테스트 $($got.$t))" } }
  if ($bad) { '⚠ 줄 수가 맞지 않습니다: ' + ($bad -join ' · ') + ' — 다시 실행해 주세요 (그사이 배포 DB 가 바뀌었을 수 있음)'; exit 1 }
  '끝났습니다. 테스트 DB 가 지금의 배포 DB 와 같습니다 (' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ').'
  '테스트 사이트는 새로고침(F5) · 로그인은 배포 사이트와 같은 이름 · 사번입니다.'
  exit 0
} catch {
  $m = $_.Exception.Message
  if ($m -like '*too_many*') { $m = '틀린 로그인이 이어져 서버가 잠시 막았습니다 — 15분 뒤 다시' }
  elseif ($m -like '*bad_key*') { $m += '  (테스트 서버의 TEST_SYNC_KEY 가 tools\test-sync-key.txt 와 같은지 확인)' }
  '실패: ' + $m
  if (-not $DryRun) { '테스트 DB 가 반쯤 채워진 상태일 수 있습니다 — 다시 실행하면 처음부터 다시 채웁니다.' }
  exit 1
}
