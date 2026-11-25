# 모든 HTML 의 ?v= 값을 새 값 하나로 한꺼번에 바꿈 (CSS · JS 를 고쳤으면 올리기 전에 한 번 · CLAUDE.md 「고치는 순서」)
#   실행:  powershell -ExecutionPolicy Bypass -File tools\bump.ps1
#   왜:    ?v= 가 그대로면 직원 브라우저가 예전 CSS · JS 를 계속 씀
#   새 값: 오늘 날짜 + a (예 20261127a). 지금 값이 그보다 크거나 같으면 지금 값의 끝 글자를 하나 올림 (…k → …l · …z → …za)
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}   # 한글 출력이 어디서 돌려도 깨지지 않게
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$rx = [regex]'\?v=(\d{8}[a-z0-9]*)'
$files = git -C $root -c core.quotepath=off ls-files '*.html' | ForEach-Object { Join-Path $root $_ }
$cur = ''
foreach ($f in $files) { foreach ($m in $rx.Matches([IO.File]::ReadAllText($f, $utf8))) { if ([string]::CompareOrdinal($m.Groups[1].Value, $cur) -gt 0) { $cur = $m.Groups[1].Value } } }
$new = (Get-Date -Format 'yyyyMMdd') + 'a'
if ($cur -and [string]::CompareOrdinal($new, $cur) -le 0) {
  $last = $cur[$cur.Length - 1]
  $new = if ($last -ge 'a' -and $last -lt 'z') { $cur.Substring(0, $cur.Length - 1) + [char]([int]$last + 1) } else { $cur + 'a' }
}
$n = 0
foreach ($f in $files) {
  $bytes = [IO.File]::ReadAllBytes($f); $bom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
  $t = [IO.File]::ReadAllText($f, $utf8); $u = $rx.Replace($t, '?v=' + $new)
  if ($u -ne $t) { [IO.File]::WriteAllText($f, $u, (New-Object Text.UTF8Encoding $bom)); $n++ }
}
"?v= : $cur → $new  (HTML $n 개)"
