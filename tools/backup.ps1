# 공유 DB 전체를 파일 하나(JSON)로 내려받아 정해 둔 폴더에 저장 — 일주일에 한 번 자동으로 돌리려고 만든 것 (2026-11-23 · README 20-6절)
#   tools/export.html 의 「내려받기」와 같은 자료를 브라우저 없이 받음 (서버 동작 export · 읽기만 함)
#   처음 한 번:  이 파일을 실행하면 옆에 backup-config.json 이 생김 → 메모장으로 열어 name(이름) · emp(사번) 을 적고 저장
#   직접 돌려 보기:  powershell -ExecutionPolicy Bypass -File tools\backup.ps1
#   매주 자동:  README 20-6절의 「작업 스케줄러에 등록」 명령을 한 번 실행
# backup-config.json 에는 로그인(이름 · 사번)이 들어 있으므로 저장소에 올리지 않음 (.gitignore)
param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'
$cfgPath = Join-Path $PSScriptRoot 'backup-config.json'
$api = 'https://sayuwon-api.serendipity5786-9e7.workers.dev/'
$tables = 'calls', 'members', 'quotereq', 'quote_history', 'kv', 'files', 'file_chunks', 'clergy', 'press', 'manual'   # manual 은 2026-11-25 에 더함 (그 전 백업에는 매뉴얼이 없음)

# 서버 답 {"ok":true,"table":"…","rows":[ … ],"next":123} 에서 rows 안쪽 글자와 next 를 꺼냄 (큰 답도 통째로 풀지 않고 글자로만 다룸)
function Split-Page([string]$text) {
  if (-not $text.StartsWith('{"ok":true')) { throw ("서버가 거절했습니다: " + $text.Substring(0, [Math]::Min(200, $text.Length))) }
  $a = $text.IndexOf('"rows":['); $b = $text.LastIndexOf('],"next":')
  if ($a -lt 0 -or $b -lt $a) { throw '서버 답의 모양이 예상과 다릅니다 (cloudflare/worker.js 가 예전 버전일 수 있음)' }
  $next = $text.Substring($b + 9).TrimEnd('}')
  return @{ rows = $text.Substring($a + 8, $b - $a - 8); next = $next }
}

if ($SelfTest) {
  $p = Split-Page '{"ok":true,"table":"calls","rows":[{"seq":1,"id":"a","data":"{\"x\":[1],\"next\":2}"},{"seq":2,"id":"b"}],"next":2}'
  $q = Split-Page '{"ok":true,"table":"kv","rows":[],"next":null}'
  if ($p.next -ne '2' -or $p.rows -ne '{"seq":1,"id":"a","data":"{\"x\":[1],\"next\":2}"},{"seq":2,"id":"b"}' -or $q.next -ne 'null' -or $q.rows -ne '') { throw 'SelfTest 실패' }
  try { Split-Page '{"ok":false,"error":"bad_key"}' | Out-Null; throw 'SelfTest 실패 (거절을 못 알아봄)' } catch { if ($_.Exception.Message -notlike '서버가 거절*') { throw } }
  'SelfTest 통과'; exit 0
}

if (-not (Test-Path $cfgPath)) {
  $tpl = "{`r`n  `"name`": `"`",`r`n  `"emp`": `"`",`r`n  `"dest`": `"\\\\(서버 주소)\\(공유 이름)\\11. 운영보조플랫폼 자료다운`",`r`n  `"keep`": 4`r`n}`r`n"
  [IO.File]::WriteAllText($cfgPath, $tpl, (New-Object Text.UTF8Encoding $true))
  "설정 파일을 만들었습니다: $cfgPath"
  '메모장으로 열어 name(이름) 과 emp(사번) 의 "" 안에 로그인할 때 쓰는 값을 적고 저장한 뒤 다시 실행해 주세요.'
  exit 2
}
$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $cfg.name -or -not $cfg.emp) { "backup-config.json 에 name(이름) 과 emp(사번) 을 적어 주세요: $cfgPath"; exit 2 }
$dest = [string]$cfg.dest
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$logPath = Join-Path $dest 'backup-log.txt'
function Write-Log([string]$line) { $t = (Get-Date -Format 'yyyy-MM-dd HH:mm') + '  ' + $line; $t; try { [IO.File]::AppendAllText($logPath, $t + "`r`n", (New-Object Text.UTF8Encoding $true)) } catch {} }

try {
  if (-not (Test-Path -LiteralPath $dest)) { throw "저장할 폴더를 열 수 없습니다: $dest (네트워크 드라이브에 연결돼 있는지 확인)" }
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
  # 예전 백업 정리: 새 파일이 제대로 저장된 뒤에만, 최신 $keep 개(기본 1)만 남기고 지움. 이름이 sayuwon-backup-*.json 인 파일만 건드림. backup-config.json 에 "keep": 4 처럼 적으면 그만큼 남김 (0 = 지우지 않음)
  $keep = 1; if ($null -ne $cfg.keep -and "$($cfg.keep)" -match '^\d+$') { $keep = [int]$cfg.keep }
  $removed = 0
  if ($keep -gt 0 -and (Get-Item -LiteralPath $file).Length -gt 1000) {
    Get-ChildItem -LiteralPath $dest -Filter 'sayuwon-backup-*.json' -File | Sort-Object Name -Descending | Select-Object -Skip $keep | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force; $removed++ }
  }
  Write-Log ("성공  " + (Split-Path $file -Leaf) + "  $size  (" + ($counts -join ' · ') + ")" + $(if ($removed) { "  · 예전 백업 $removed 개 지움" } else { '' }))
  exit 0
} catch {
  $m = $_.Exception.Message
  if ($m -like '*bad_key*') { $m = '로그인이 확인되지 않았습니다 — backup-config.json 의 이름 · 사번이 멤버 목록에 있는지 확인' }
  if ($m -like '*too_many*') { $m = '틀린 로그인이 이어져 서버가 잠시 막았습니다 — 15분 뒤 다시' }
  Write-Log ("실패  " + $m)
  exit 1
}
