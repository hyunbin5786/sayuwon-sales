# 지금 상태 한눈에 보기 — 일을 시작할 때 맨 먼저 돌림 (CLAUDE.md 2절 · 개발-시작하기.md 4절). 아무것도 바꾸지 않음 (git fetch 만 함)
#   실행:  powershell -ExecutionPolicy Bypass -File tools\check.ps1
#   보는 것: Git · 저장에 남을 이름 · 브랜치 · 저장 안 한 수정 · test 와 main 의 차이 · 백업 · 내 로그인 · 열쇠 · 두 서버 · 합친 파일(js/group.js) · ?v= · 코드 지도
#   끝에 「먼저 할 일」을 적어 줌.  종료 코드: 0 = 바로 일해도 됨 · 3 = 먼저 할 일이 있음
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}   # 한글 출력이 어디서 돌려도 깨지지 않게
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$todo = New-Object Collections.Generic.List[string]; $note = New-Object Collections.Generic.List[string]
function Row([string]$name, [string]$state, [string]$text) { '{0}  {1,-14} {2}' -f $state, $name, $text }
$OK = '[ 좋음 ]'; $NO = '[ 할 일 ]'; $IN = '[ 참고 ]'

'사유원 운영 보조 시스템 · 상태 점검  (' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ')'
''
# ---- Git ----
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { Row 'Git' $NO '설치돼 있지 않음 → https://git-scm.com/download/win'; $todo.Add('Git 을 설치합니다 (https://git-scm.com/download/win).') }
else {
  $branch = (git -C $root rev-parse --abbrev-ref HEAD 2>$null)
  if ($branch -eq 'test') { Row '브랜치' $OK 'test (개발하는 곳)' } else { Row '브랜치' $NO "$branch — 개발은 test 에서 합니다"; $todo.Add('브랜치를 test 로 바꿉니다:  git checkout test') }
  $gname = (git -C $root config user.name 2>$null); $gmail = (git -C $root config user.email 2>$null)
  if ($gname -and $gmail) { Row 'Git 이름' $OK '저장(커밋)에 남을 이름 · 메일이 정해져 있음' } else { Row 'Git 이름' $NO '저장(커밋)에 남을 이름 · 메일이 없음 — 이대로는 저장이 실패함'; $todo.Add('저장(커밋)에 남을 이름을 정합니다. 사람에게 어떤 이름으로 남길지 묻고(공개 저장소라 누구나 봄 · 별명도 됨), 이 폴더에만:  git config user.name "이름"   그리고  git config user.email "GitHub아이디@users.noreply.github.com"  (GitHub 아이디를 모르면 사람에게 물음)') }
  $dirty = @(git -C $root status --porcelain)
  if ($dirty.Count) { Row '저장 안 한 수정' $IN "$($dirty.Count)개 파일 (git status 로 확인)"; $note.Add("저장(커밋)하지 않은 수정이 $($dirty.Count)개 있습니다 — 지난 작업이 남은 것인지 먼저 확인합니다.") } else { Row '저장 안 한 수정' $OK '없음' }
  $fetched = $true; git -C $root fetch --quiet origin 2>$null; if ($LASTEXITCODE) { $fetched = $false }
  if (-not $fetched) { Row 'GitHub' $IN '연결하지 못함 (인터넷 · 권한) — 아래 차이는 마지막으로 받은 때 기준' }
  $ahead = [int](git -C $root rev-list --count origin/main..origin/test 2>$null); $behind = [int](git -C $root rev-list --count origin/test..origin/main 2>$null)
  $local = if ($branch -eq 'test') { [int](git -C $root rev-list --count origin/test..test 2>$null) } else { 0 }
  $localBehind = if ($branch -eq 'test') { [int](git -C $root rev-list --count test..origin/test 2>$null) } else { 0 }
  if ($ahead) { Row 'test → main' $IN "테스트에만 있고 아직 메인에 「푸시」하지 않은 작업 $ahead 건"; $note.Add("테스트에만 있는 작업이 $ahead 건 있습니다 (git log --oneline origin/main..origin/test). 「새 개발 시작」은 이것을 푸시하거나 버린 뒤에 됩니다.") } else { Row 'test → main' $OK '테스트와 메인의 코드가 같음' }
  if ($behind) { Row 'main → test' $NO "메인에만 있는 커밋 $behind 건"; $todo.Add('메인에만 있는 커밋이 있습니다 — test 에 합칩니다:  git merge origin/main') }
  if ($local) { Row '올리지 않은 것' $IN "이 PC 의 test 에만 있는 커밋 $local 건 (테스트 사이트에 아직 안 올라감)"; $note.Add("이 PC 에만 있는 커밋 $local 건 — git push origin test 로 올려야 테스트 사이트에서 볼 수 있습니다.") }
  if ($localBehind) { Row '받지 않은 것' $NO "GitHub 의 test 가 이 PC 보다 $localBehind 건 앞섬"; $todo.Add('GitHub 의 최신 코드를 받습니다:  git pull --ff-only') }
}
''
# ---- 백업 · 로그인 · 열쇠 ----
$login = Join-Path $PSScriptRoot 'my-login.json'; $hasLogin = $false
if (Test-Path $login) { try { $c = Get-Content $login -Raw -Encoding UTF8 | ConvertFrom-Json; $hasLogin = [bool]($c.name -and $c.emp) } catch {} }
if ($hasLogin) { Row '내 로그인' $OK 'tools\my-login.json 에 이름 · 사번 있음' } else { Row '내 로그인' $NO 'tools\my-login.json 이 없거나 비어 있음'; $todo.Add('★ 백업의 첫걸음: 사람이 메모장으로 tools\my-login.json 에 내 이름 · 사번을 적습니다 (없으면 tools\backup.ps1 을 한 번 돌리면 빈 틀이 생김 · 사번은 Claude 에게 말하지 않고 직접).') }
$task = Get-ScheduledTask -TaskName '사유원 백업' -ErrorAction SilentlyContinue
$dest = if ($hasLogin -and $c.backupDest) { [string]$c.backupDest } else { Join-Path ([Environment]::GetFolderPath('MyDocuments')) '사유원-백업' }
$last = if (Test-Path -LiteralPath $dest) { Get-ChildItem -LiteralPath $dest -Filter 'sayuwon-backup-*.json' -File | Sort-Object Name -Descending | Select-Object -First 1 } else { $null }
$days = if ($last) { [int]((Get-Date) - $last.LastWriteTime).TotalDays } else { 9999 }
if ($task -and $days -le 8) { Row '백업' $OK "매주 자동 걸려 있음 · 마지막 $days 일 전 ($dest)" }
else { Row '백업' $NO ($(if ($task) { '걸려 있으나 ' } else { '매주 자동이 안 걸려 있음 · ' }) + $(if ($last) { "마지막 백업 $days 일 전" } else { '받아 둔 백업 없음' })); $todo.Add('★ 가장 먼저 백업: 자료는 DB 한 곳에만 있고, 백업은 개발을 맡은 사람의 PC 가 받습니다. 사람이 「백업 걸어 줘」 라고 하면 →  powershell -ExecutionPolicy Bypass -File tools\backup.ps1 -Setup   (내 로그인이 먼저 있어야 함 · 이 PC 에 매주 월요일로 걸림)') }
if (Test-Path (Join-Path $PSScriptRoot 'test-sync-key.txt')) { Row '열쇠' $OK 'tools\test-sync-key.txt 있음 (「새 개발 시작」 때 테스트 DB 복사에 씀)' } else { Row '열쇠' $IN 'tools\test-sync-key.txt 없음 — 「새 개발 시작」(테스트 DB 복사) 때 필요'; $note.Add('열쇠(TEST_SYNC_KEY)가 없습니다 — 앞 담당자에게 받아 tools\test-sync-key.txt 에 넣거나, 새로 만들어 Cloudflare 테스트 서버의 값을 바꿉니다 (개발-시작하기.md 6절).') }
''
# ---- 서버 ----
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Server([string]$name, [string]$url, [bool]$isTest) {
  try { $wc = New-Object Net.WebClient; $wc.Encoding = [Text.Encoding]::UTF8; $j = $wc.DownloadString($url) | ConvertFrom-Json; $wc.Dispose()
    $extra = if ($isTest) { if ($j.testSync) { ' · 열쇠 받음' } else { ' · TEST_SYNC_KEY 없음' } } elseif ($j.testSync) { ' · ★ 배포 서버에 TEST_SYNC_KEY 가 있습니다 — 지워야 합니다' } else { '' }
    Row $name $(if (-not $isTest -and $j.testSync) { $NO } else { $OK }) ("응답함 · api $($j.api)" + $extra)
    if (-not $isTest -and $j.testSync) { $script:todo.Insert(0, '★ 위험: 배포 서버(sayuwon-api)에 TEST_SYNC_KEY 가 들어 있습니다. Cloudflare › sayuwon-api › Settings › Variables and Secrets 에서 지웁니다 (CLAUDE.md 철칙 4).') }
    $script:lastApi = [int]$j.api
  } catch { Row $name $IN '응답 없음 (인터넷 확인)'; $script:lastApi = -1 }
}
Server '배포 서버' 'https://sayuwon-api.serendipity5786-9e7.workers.dev/' $false; $apiProd = $script:lastApi
Server '테스트 서버' 'https://sayuwon-api-test.serendipity5786-9e7.workers.dev/' $true; $apiTest = $script:lastApi
$apiCode = 0; if ((Get-Content (Join-Path $root 'cloudflare\worker.js') -Raw -Encoding UTF8) -match "app: 'sayuwon-group-intake', api: (\d+)") { $apiCode = [int]$Matches[1] }
if ($apiCode) {
  if ($apiTest -ge 0 -and $apiTest -lt $apiCode) { Row '서버 코드' $IN "이 폴더의 worker.js 는 api $apiCode — 테스트 서버(api $apiTest)에 아직 안 올라감"; $note.Add("테스트 서버가 예전 코드입니다 (api $apiTest < $apiCode) — cloudflare\worker.js 를 Cloudflare 의 sayuwon-api-test 에 붙여 넣습니다 (CLAUDE.md 7절).") }
  if ($apiProd -ge 0 -and $apiProd -lt $apiCode) { Row '서버 코드' $IN "배포 서버(api $apiProd)는 이 폴더의 worker.js(api $apiCode)보다 예전 — 「푸시」할 때 올림" }
}
''
# ---- 코드가 서로 맞는지 ----
$out = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build.ps1') -Check 2>$null
if ($LASTEXITCODE -eq 0) { Row '합친 파일' $OK 'js/group.js = js/group/*.js' } else { Row '합친 파일' $NO 'js/group.js 가 js/group/*.js 와 다름'; $todo.Add('단체 화면 소스를 합칩니다:  powershell -ExecutionPolicy Bypass -File tools\build.ps1') }
$vs = @{}; foreach ($f in (git -C $root -c core.quotepath=off ls-files '*.html')) { foreach ($m in [regex]::Matches([IO.File]::ReadAllText((Join-Path $root $f)), '\?v=(\d{8}[a-z0-9]*)')) { $vs[$m.Groups[1].Value] = 1 } }
if ($vs.Count -le 1) { Row '?v= 값' $OK ("모든 화면이 같은 값 (" + (@($vs.Keys) -join '') + ")") } else { Row '?v= 값' $IN ("화면마다 다름: " + ((@($vs.Keys) | Sort-Object) -join ' · ') + ' → tools\bump.ps1 로 맞춤') }
$out = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'map.ps1') -Check 2>$null
if ($LASTEXITCODE -eq 0) { Row '코드 지도' $OK 'docs\코드-지도.md = 지금 코드' } else { Row '코드 지도' $NO 'docs\코드-지도.md 가 지금 코드와 다름'; $todo.Add('코드 지도를 다시 만듭니다:  powershell -ExecutionPolicy Bypass -File tools\map.ps1') }
''
if ($todo.Count) { '먼저 할 일:'; $n = 1; foreach ($t in $todo) { "  $n. $t"; $n++ } } else { '먼저 할 일: 없음 — 바로 일해도 됩니다.' }
if ($note.Count) { ''; '알아 둘 것:'; foreach ($t in $note) { "  - $t" } }
exit $(if ($todo.Count) { 3 } else { 0 })
