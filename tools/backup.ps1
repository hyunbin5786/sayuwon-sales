# 배포 DB 전체를 파일 하나(JSON)로 내려받아 이 PC 의 폴더에 저장 — 개발을 맡은 사람이 **가장 먼저** 자기 PC 에 걸어 두는 것 (개발-시작하기.md 5절 · CLAUDE.md 2절)
#   처음 한 번 (지금 한 번 받고 + 매주 자동으로 걸기):   powershell -ExecutionPolicy Bypass -File tools\backup.ps1 -Setup
#   지금 한 번만 받기:                                    powershell -ExecutionPolicy Bypass -File tools\backup.ps1
#   걸려 있는지 · 마지막 백업이 언제인지:                 … -File tools\backup.ps1 -Status     (괜찮으면 종료 코드 0 · 손봐야 하면 3)
#   자동 걸어 둔 것 풀기 (담당이 바뀌어 이 PC 에서 그만둘 때): … -File tools\backup.ps1 -Unregister
# 서버 동작 export 로 읽기만 함 (DB 는 바뀌지 않음). tools/export.html 의 「내려받기」와 같은 자료 · tools/restore.html 이 이 파일을 읽어 되살림
# 로그인은 tools\my-login.json 의 name · emp (저장소에 올리지 않음 · tools\test-start.ps1 과 같은 파일). 같은 파일에 골라서 적을 수 있는 것:
#   "backupDest": "D:\\백업"   저장할 폴더 (안 적으면 내 문서\사유원-백업)        "backupKeep": 8   남길 개수 (안 적으면 8 = 약 두 달 · 0 = 지우지 않음)
# ※ 백업 파일에는 고객 연락처 · 멤버 이름 · 사번이 들어 있음 → 저장소 폴더 안에 두지 않음 · 메일 · 메신저로 보내지 않음
# ※ 매주 자동은 이 PC 의 작업 스케줄러가 돌림 → 이 PC 가 켜져 있을 때만 (꺼져 있었으면 켠 뒤에). 이 사람이 멤버에서 빠지면 「로그인이 확인되지 않았습니다」로 실패
param([switch]$Setup, [switch]$Status, [switch]$Unregister, [switch]$SelfTest)
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}   # 한글 출력이 어디서 돌려도 깨지지 않게
$ErrorActionPreference = 'Stop'
$api = 'https://sayuwon-api.serendipity5786-9e7.workers.dev/'   # 배포 서버 (읽기만)
$taskName = '사유원 백업'
$tables = 'calls', 'members', 'quotereq', 'quote_history', 'kv', 'files', 'file_chunks', 'clergy', 'press', 'manual'
$repo = Split-Path $PSScriptRoot -Parent

# 서버 답 {"ok":true,"table":"…","rows":[ … ],"next":123} 에서 rows 안쪽 글자와 next 를 꺼냄 (큰 답도 통째로 풀지 않고 글자로만 다룸)
function Split-Page([string]$text) {
  if (-not $text.StartsWith('{"ok":true')) { throw ("서버가 거절했습니다: " + $text.Substring(0, [Math]::Min(200, $text.Length))) }
  $a = $text.IndexOf('"rows":['); $b = $text.LastIndexOf('],"next":')
  if ($a -lt 0 -or $b -lt $a) { throw '서버 답의 모양이 예상과 다릅니다 (cloudflare/worker.js 가 예전 버전일 수 있음)' }
  return @{ rows = $text.Substring($a + 8, $b - $a - 8); next = $text.Substring($b + 9).TrimEnd('}') }
}
if ($SelfTest) {
  $p = Split-Page '{"ok":true,"table":"calls","rows":[{"seq":1,"id":"a","data":"{\"x\":[1],\"next\":2}"},{"seq":2,"id":"b"}],"next":2}'
  $q = Split-Page '{"ok":true,"table":"kv","rows":[],"next":null}'
  if ($p.next -ne '2' -or $p.rows -ne '{"seq":1,"id":"a","data":"{\"x\":[1],\"next\":2}"},{"seq":2,"id":"b"}' -or $q.next -ne 'null' -or $q.rows -ne '') { throw 'SelfTest 실패' }
  try { Split-Page '{"ok":false,"error":"bad_key"}' | Out-Null; throw 'SelfTest 실패 (거절을 못 알아봄)' } catch { if ($_.Exception.Message -notlike '서버가 거절*') { throw } }
  'SelfTest 통과'; exit 0
}
if ($Unregister) {
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false; '매주 자동 백업을 풀었습니다 (받아 둔 파일은 그대로).' } else { '걸려 있는 자동 백업이 없습니다.' }
  exit 0
}

# ---- 내 로그인 · 저장할 폴더 ----
$cfgPath = Join-Path $PSScriptRoot 'my-login.json'
$cfg = if (Test-Path $cfgPath) { Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
$dest = if ($cfg -and $cfg.backupDest) { [string]$cfg.backupDest } else { Join-Path ([Environment]::GetFolderPath('MyDocuments')) '사유원-백업' }
$keep = 8; if ($cfg -and $null -ne $cfg.backupKeep -and "$($cfg.backupKeep)" -match '^\d+$') { $keep = [int]$cfg.backupKeep }
$logPath = Join-Path $dest 'backup-log.txt'

if ($Status) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  $last = if (Test-Path -LiteralPath $dest) { Get-ChildItem -LiteralPath $dest -Filter 'sayuwon-backup-*.json' -File | Sort-Object Name -Descending | Select-Object -First 1 } else { $null }
  '로그인 파일 : ' + $(if ($cfg -and $cfg.name -and $cfg.emp) { '있음' } else { '없음 또는 비어 있음 (tools\my-login.json)' })
  '매주 자동   : ' + $(if ($task) { '걸려 있음 (' + $task.State + ')' } else { '안 걸려 있음' })
  '저장 폴더   : ' + $dest
  if ($last) { $days = [int]((Get-Date) - $last.LastWriteTime).TotalDays; '마지막 백업 : ' + $last.Name + '  (' + $days + '일 전 · ' + ('{0:N1} MB' -f ($last.Length / 1MB)) + ')' } else { $days = 9999; '마지막 백업 : 없음' }
  if ($task -and $days -le 8) { '→ 괜찮습니다.'; exit 0 }
  '→ 백업 설정이 필요합니다:  powershell -ExecutionPolicy Bypass -File tools\backup.ps1 -Setup'; exit 3
}

if (-not $cfg) {
  $old = Join-Path $PSScriptRoot 'backup-config.json'; $o = if (Test-Path $old) { Get-Content $old -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
  [IO.File]::WriteAllText($cfgPath, ("{`r`n  `"name`": " + (ConvertTo-Json ([string]$o.name)) + ",`r`n  `"emp`": " + (ConvertTo-Json ([string]$o.emp)) + "`r`n}`r`n"), (New-Object Text.UTF8Encoding $true))
  $cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $cfg.name -or -not $cfg.emp) { "로그인 파일을 만들었습니다: $cfgPath"; '메모장으로 열어 name 의 "" 안에 내 이름, emp 의 "" 안에 내 사번을 적고 저장한 뒤 다시 실행해 주세요.'; exit 2 }
}
if (-not $cfg.name -or -not $cfg.emp) { "tools\my-login.json 에 name(이름) 과 emp(사번) 을 적어 주세요: $cfgPath"; exit 2 }
if ([IO.Path]::GetFullPath($dest).StartsWith([IO.Path]::GetFullPath($repo), [StringComparison]::OrdinalIgnoreCase)) { '저장할 폴더가 저장소 폴더 안입니다 — 고객 자료가 공개 저장소에 올라갈 수 있어 멈춥니다. my-login.json 의 backupDest 를 다른 곳으로.'; exit 2 }

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
function Write-Log([string]$line) { $t = (Get-Date -Format 'yyyy-MM-dd HH:mm') + '  ' + $line; $t; try { [IO.File]::AppendAllText($logPath, $t + "`r`n", (New-Object Text.UTF8Encoding $true)) } catch {} }

try {
  if (-not (Test-Path -LiteralPath $dest)) {
    if ($cfg.backupDest) { throw "저장할 폴더를 열 수 없습니다: $dest (네트워크 드라이브면 연결돼 있는지 확인)" }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
  }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $utf8 = New-Object Text.UTF8Encoding $false
  $who = '{"name":' + (ConvertTo-Json ([string]$cfg.name)) + ',"emp":' + (ConvertTo-Json ([string]$cfg.emp)) + '}'
  $tmp = Join-Path $env:TEMP ("sayuwon-backup-$stamp.json")
  $out = New-Object IO.StreamWriter($tmp, $false, $utf8)
  $counts = @()
  try {
    # 파일 모양 (format "raw-1"): 표마다 서버가 준 줄 그대로. calls.data · quote_history.data · kv.v 는 JSON 글자, 파일 내용은 file_chunks 에 base64 조각 (id · n 순서로 이으면 됨)
    $out.Write('{"app":"sayuwon-group-intake","format":"raw-1","exportedAt":"' + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + '","tables":{')
    $firstTable = $true
    foreach ($t in $tables) {
      if (-not $firstTable) { $out.Write(',') }; $firstTable = $false
      $out.Write('"' + $t + '":[')
      $after = '0'; $n = 0; $firstRow = $true
      while ($true) {
        $limit = if ($t -eq 'file_chunks') { 1 } else { 100 }
        $body = '{"action":"export","table":"' + $t + '","after":' + $after + ',"limit":' + $limit + ',"who":' + $who + '}'
        $wc = New-Object Net.WebClient; $wc.Encoding = $utf8
        $text = $wc.UploadString($api, 'POST', $body); $wc.Dispose()
        $p = Split-Page $text
        if ($p.rows.Length) { if (-not $firstRow) { $out.Write(',') }; $firstRow = $false; $out.Write($p.rows); $n += ([regex]::Matches($p.rows, '\{"seq":\d+,')).Count }
        if ($p.next -eq 'null') { break }
        $after = $p.next
      }
      $out.Write(']'); $counts += "$t $n"
    }
    $out.Write('}}')
  } finally { $out.Close() }
  $file = Join-Path $dest ("sayuwon-backup-$stamp.json")
  Copy-Item -LiteralPath $tmp -Destination $file -Force
  $size = '{0:N2} MB' -f ((Get-Item -LiteralPath $file).Length / 1MB)
  Remove-Item -LiteralPath $tmp -Force
  # 예전 백업 정리: 새 파일이 제대로 저장된 뒤에만, 최신 $keep 개만 남기고 지움. 이름이 sayuwon-backup-*.json 인 파일만 건드림
  $removed = 0
  if ($keep -gt 0 -and (Get-Item -LiteralPath $file).Length -gt 1000) {
    Get-ChildItem -LiteralPath $dest -Filter 'sayuwon-backup-*.json' -File | Sort-Object Name -Descending | Select-Object -Skip $keep | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force; $removed++ }
  }
  Write-Log ("성공  " + (Split-Path $file -Leaf) + "  $size  (" + ($counts -join ' · ') + ")" + $(if ($removed) { "  · 예전 백업 $removed 개 지움" } else { '' }))
} catch {
  $m = $_.Exception.Message
  if ($m -like '*bad_key*') { $m = '로그인이 확인되지 않았습니다 — tools\my-login.json 의 이름 · 사번이 멤버 목록에 있는지 확인' }
  if ($m -like '*too_many*') { $m = '틀린 로그인이 이어져 서버가 잠시 막았습니다 — 15분 뒤 다시' }
  Write-Log ("실패  " + $m)
  exit 1
}

if ($Setup) {
  # 매주 수요일 9시 · 그때 꺼져 있었으면 켠 뒤에. 이미 걸려 있으면 이 PC · 이 폴더 것으로 다시 검
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + $PSCommandPath + '"')
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 9am
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -Force | Out-Null
  "매주 자동 백업을 걸었습니다 (수요일 9시 · 꺼져 있었으면 켠 뒤에).  저장 폴더: $dest"
  '이 저장소 폴더를 옮기면 다시 -Setup 을 해 주세요.'
}
exit 0
