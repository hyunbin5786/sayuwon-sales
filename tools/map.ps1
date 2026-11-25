# 코드 지도(docs\코드-지도.md)를 코드에서 뽑아 다시 만듦 — 손으로 고치지 않는 문서
#   실행:    powershell -ExecutionPolicy Bypass -File tools\map.ps1
#   확인만:  powershell -ExecutionPolicy Bypass -File tools\map.ps1 -Check   (지금 코드와 다르면 종료 코드 1)
#   언제:    화면(HTML) · JS · CSS 파일을 더하거나 뺐을 때 · 서버 동작이나 DB 표를 더했을 때 · 파일 맨 위 설명 줄을 고쳤을 때
# 뽑는 것: HTML 이 읽는 css · js(읽는 순서) · 각 파일 맨 위 설명 줄 · cloudflare\worker.js 의 서버 동작(로그인 필요 여부) · DB 표와 칸 · tools 의 도구
param([switch]$Check)
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}   # 한글 출력이 어디서 돌려도 깨지지 않게
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$out = Join-Path $root 'docs\코드-지도.md'
function Read-Text([string]$p) { [IO.File]::ReadAllText($p, $utf8) }
function Rel([string]$p) { $p.Substring($root.Length + 1).Replace('\', '/') }
function Cell([string]$s) { ($s -replace '\|', '\|' -replace '\r?\n', ' ').Trim() }
# 파일 맨 위 설명: 첫 주석 줄에서 기호를 뗀 것 (JS · CSS · PS1 · SQL · HTML 주석)
function Head-Line([string]$p, [int]$max = 170) {
  if ($p -like "*.html") { $h = [IO.File]::ReadAllText($p, $utf8); if ($h -match "(?is)<title>(.*?)</title>") { return ($Matches[1] -replace "s*·s*사유원 운영 보조 시스템s*$", "").Trim() }; return "" }
  foreach ($l in ([IO.File]::ReadAllLines($p, $utf8) | Select-Object -First 12)) {
    $t = $l.Trim().TrimStart([char]0xFEFF)
    if ($t -match '^(//|/\*|\*|#|--|<!--)\s*(.*)$') {
      $s = ($Matches[2] -replace '\*/\s*$', '' -replace '-->\s*$', '' -replace '^[=\-\s!]+', '' -replace '[=\s]+$', '').Trim()
      if ($s.Length -ge 4 -and $s -notmatch '^(eslint|global |jshint|@ts-)') { if ($s.Length -gt $max) { $s = $s.Substring(0, $max) + '…' }; return $s }
    } elseif ($t -and $t -notmatch '^(<!doctype|<html|<head|<meta|param\(|\$ErrorAction)') { break }
  }
  return ''
}
function Size([string]$p) { '{0:N0}' -f [Math]::Ceiling((Get-Item -LiteralPath $p).Length / 1KB) + ' KB' }

$L = New-Object Collections.Generic.List[string]
$L.Add('# 코드 지도')
$L.Add('')
$L.Add('> **자동으로 만든 문서입니다. 직접 고치지 않습니다.** 코드에서 뽑아 `tools\map.ps1` 이 다시 만듭니다 (화면 · JS · CSS 파일을 더하거나 뺐을 때, 서버 동작 · DB 표를 더했을 때). 설명 글은 각 파일 맨 위 주석 첫 줄입니다 — 설명을 고치려면 그 파일의 첫 줄을 고칩니다.')
$L.Add('')
$L.Add('목차: [1. 화면이 읽는 파일](#1-화면이-읽는-파일) · [2. JS 파일](#2-js-파일) · [3. 단체 화면 소스](#3-단체-화면-소스-jsgroup) · [4. CSS 파일](#4-css-파일) · [5. 서버 동작](#5-서버-동작-cloudflareworkerjs) · [6. DB 표](#6-db-표) · [7. 도구](#7-도구-tools)')
$L.Add('')

# ---- 1. 화면 ----
$pages = @(Get-ChildItem -LiteralPath $root -Filter '*.html' -File | Sort-Object Name) + @(Get-ChildItem -LiteralPath (Join-Path $root 'document') -Filter '*.html' -File | Sort-Object Name) + @(Get-ChildItem -LiteralPath (Join-Path $root 'tools') -Filter '*.html' -File | Sort-Object Name)
$usedBy = @{}
$L.Add('## 1. 화면이 읽는 파일')
$L.Add('')
$L.Add('JS 는 적힌 순서대로 읽습니다 (앞 파일이 만든 이름을 뒤 파일이 씀). `(밖)` = 인터넷에서 받는 도구(CDN).')
$L.Add('')
$L.Add('| 화면 | 제목 | CSS | JS (읽는 순서) |')
$L.Add('|---|---|---|---|')
foreach ($pg in $pages) {
  $t = Read-Text $pg.FullName; $rel = Rel $pg.FullName; $dir = Split-Path $pg.FullName -Parent
  $title = if ($t -match '(?is)<title>(.*?)</title>') { $Matches[1].Trim() } else { '' }
  $css = @(); $js = @()
  foreach ($m in [regex]::Matches($t, '(?i)<link[^>]+rel=["'']stylesheet["''][^>]*href=["'']([^"'']+)["'']|<link[^>]+href=["'']([^"'']+)["''][^>]*rel=["'']stylesheet["'']')) {
    $h = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { $m.Groups[2].Value }
    if ($h -match '^https?:') { if ($h -notmatch 'fonts\.googleapis') { $css += '(밖) ' + ([uri]$h).Host } } else { $f = Rel ([IO.Path]::GetFullPath((Join-Path $dir ($h -replace '\?.*$', '')))); $css += '`' + $f + '`'; $usedBy[$f] = @($usedBy[$f]) + $rel }
  }
  foreach ($m in [regex]::Matches($t, '(?i)<script[^>]+src=["'']([^"'']+)["'']')) {
    $h = $m.Groups[1].Value
    if ($h -match '^https?:') { $js += '(밖) ' + (($h -replace '\?.*$', '') -replace '^.*/', '') } else { $f = Rel ([IO.Path]::GetFullPath((Join-Path $dir ($h -replace '\?.*$', '')))); $js += '`' + $f + '`'; $usedBy[$f] = @($usedBy[$f]) + $rel }
  }
  $L.Add('| `' + $rel + '` | ' + (Cell $title) + ' | ' + ($css -join '<br>') + ' | ' + ($js -join ' → ') + ' |')
}
$L.Add('')
$frag = @(Get-ChildItem -LiteralPath (Join-Path $root 'manual') -Filter '*.html' -File | Sort-Object Name)
if ($frag) { $L.Add('화면 위 「매뉴얼」 버튼이 불러오는 글 조각 (`js/menu.js` 가 읽음 · 혼자 열리는 화면이 아님): ' + (($frag | ForEach-Object { '`' + (Rel $_.FullName) + '`' }) -join ' · ')); $L.Add('') }

# ---- 2. JS ----
$L.Add('## 2. JS 파일')
$L.Add('')
$L.Add('| 파일 | 크기 | 읽는 화면 | 맨 위 설명 |')
$L.Add('|---|---|---|---|')
$jsFiles = @(Get-ChildItem -LiteralPath (Join-Path $root 'js') -Filter '*.js' -File | Sort-Object Name) + @(Get-ChildItem -LiteralPath (Join-Path $root 'document\js') -Filter '*.js' -File | Sort-Object Name)
foreach ($f in $jsFiles) {
  $rel = Rel $f.FullName; $u = @($usedBy[$rel] | Where-Object { $_ } | Sort-Object -Unique)
  $who = if (-not $u) { '**(어느 HTML 도 직접 읽지 않음)**' } elseif ($u.Count -gt 6) { "화면 $($u.Count)곳" } else { ($u | ForEach-Object { '`' + $_ + '`' }) -join ' ' }
  $L.Add('| `' + $rel + '` | ' + (Size $f.FullName) + ' | ' + $who + ' | ' + (Cell (Head-Line $f.FullName)) + ' |')
}
$L.Add('')

# ---- 3. 단체 화면 소스 ----
$L.Add('## 3. 단체 화면 소스 (`js/group/`)')
$L.Add('')
$L.Add('이 파일들을 이름 순서대로 이어 붙인 것이 `js/group.js` 입니다 (`tools\build.ps1`). **고치는 곳은 여기, `js/group.js` 는 직접 고치지 않습니다.** 파일 순서 · 번호는 바꾸지 않습니다.')
$L.Add('')
$L.Add('| 파일 | 크기 | 맨 위 설명 |')
$L.Add('|---|---|---|')
foreach ($f in (Get-ChildItem -LiteralPath (Join-Path $root 'js\group') -Filter '*.js' -File | Sort-Object Name)) { $L.Add('| `' + (Rel $f.FullName) + '` | ' + (Size $f.FullName) + ' | ' + (Cell (Head-Line $f.FullName)) + ' |') }
$L.Add('')

# ---- 4. CSS ----
$L.Add('## 4. CSS 파일')
$L.Add('')
$L.Add('| 파일 | 크기 | 읽는 화면 |')
$L.Add('|---|---|---|')
foreach ($f in (@(Get-ChildItem -LiteralPath (Join-Path $root 'css') -Filter '*.css' -File | Sort-Object Name) + @(Get-ChildItem -LiteralPath (Join-Path $root 'document\css') -Filter '*.css' -File))) {
  $rel = Rel $f.FullName; $u = @($usedBy[$rel] | Where-Object { $_ } | Sort-Object -Unique)
  $who = if (-not $u) { '**(어느 HTML 도 읽지 않음)**' } elseif ($u.Count -gt 6) { "화면 $($u.Count)곳" } else { ($u | ForEach-Object { '`' + $_ + '`' }) -join ' ' }
  $L.Add('| `' + $rel + '` | ' + (Size $f.FullName) + ' | ' + $who + ' |')
}
$L.Add('')

# ---- 5. 서버 동작 ----
$w = [IO.File]::ReadAllLines((Join-Path $root 'cloudflare\worker.js'), $utf8)
$L.Add('## 5. 서버 동작 (`cloudflare/worker.js`)')
$L.Add('')
$L.Add('화면은 `SY.call({action:''이름'', …})` 로만 부릅니다 (`js/common.js`). 아래는 `api()` 함수에 적힌 순서이고, 줄 번호는 `worker.js` 의 줄입니다. 무엇을 받고 무엇을 돌려주는지는 그 줄과, 그 줄이 부르는 함수 위의 설명을 읽습니다.')
$L.Add('')
$inApi = $false; $login = $false; $pub = @(); $mem = @()
for ($i = 0; $i -lt $w.Length; $i++) {
  $ln = $w[$i]
  if ($ln -match '^export async function api\(') { $inApi = $true; continue }
  if (-not $inApi) { continue }
  if ($ln -match '^}') { break }
  if ($ln -match '여기부터 로그인') { $login = $true }
  foreach ($m in [regex]::Matches($ln, "a === '(\w+)'")) {
    $name = $m.Groups[1].Value; $note = if ($ln -match '//\s*(.+)$') { $Matches[1].Trim() } else { '' }
    if ($note.Length -gt 110) { $note = $note.Substring(0, 110) + '…' }
    $row = '| `' + $name + '` | ' + ($i + 1) + ' | ' + (Cell $note) + ' |'
    if ($login) { if (-not ($mem -like ('| `' + $name + '` |*'))) { $mem += $row } } else { if (-not ($pub -like ('| `' + $name + '` |*'))) { $pub += $row } }
  }
}
$L.Add('**로그인 없이 되는 것** (' + $pub.Count + '개 · 이 목록에 새로 넣을 때는 꼭 필요한지 따져 봄)')
$L.Add('')
$L.Add('| action | 줄 | 그 줄의 설명 |'); $L.Add('|---|---|---|'); $pub | ForEach-Object { $L.Add($_) }
$L.Add('')
$L.Add('**로그인(멤버)해야 되는 것** (' + $mem.Count + '개)')
$L.Add('')
$L.Add('| action | 줄 | 그 줄의 설명 |'); $L.Add('|---|---|---|'); $mem | ForEach-Object { $L.Add($_) }
$L.Add('')
$L.Add('- `import`(되살리기) 는 비밀 값 `MIGRATE_KEY`, `mirror`(테스트 DB 를 배포 DB 와 같게) 는 `TEST_SYNC_KEY` 가 서버에 있을 때만 됩니다 — 로그인 대신 그 값으로 확인합니다.')
$L.Add('- `quoteGet` 은 두 표에 다 나옵니다: 이름은 같고, 품목 목록(가격표)은 로그인 없이 · 발급 내역(`history`)은 로그인해야 줍니다.')
$L.Add('- 주소로 바로 여는 것(GET): `/` = 서버 상태(`api` 번호) · `/file/<id>/<이름>` = 올린 서류 열기.')
$L.Add('')

# ---- 6. DB 표 ----
$L.Add('## 6. DB 표')
$L.Add('')
$L.Add('표는 `cloudflare/schema.sql` 에 있고, 일부는 서버가 처음 쓸 때 스스로 만듭니다 (`worker.js` 의 `ensure…`). 뜻과 지키는 규칙은 `CLAUDE.md` 4 · 5절.')
$L.Add('')
$L.Add('| 표 | 칸 | 어디서 만드나 |')
$L.Add('|---|---|---|')
$seen = @{}
$sql = Read-Text (Join-Path $root 'cloudflare\schema.sql')
$sqlNoComment = ($sql -split "`n" | ForEach-Object { $_ -replace '--.*$', '' }) -join "`n"
foreach ($m in [regex]::Matches($sqlNoComment, '(?is)CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\);')) {
  $cols = [regex]::Matches($m.Groups[2].Value, '(?m)(?:^|,)\s*"?(\w+)"?\s+(?:TEXT|INTEGER|REAL)') | ForEach-Object { $_.Groups[1].Value }
  $seen[$m.Groups[1].Value] = 1; $L.Add('| `' + $m.Groups[1].Value + '` | ' + ($cols -join ' · ') + ' | `schema.sql` |')
}
$wAll = $w -join "`n"
foreach ($m in [regex]::Matches($wAll, '(?is)CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\)["'']')) {
  if ($seen[$m.Groups[1].Value]) { continue }
  $body = $m.Groups[2].Value -replace '\\"', '' -replace "'\s*\+\s*'", ''
  $cols = [regex]::Matches($body, '(?:^|,)\s*"?(\w+)"?\s+(?:TEXT|INTEGER|REAL)') | ForEach-Object { $_.Groups[1].Value }
  $seen[$m.Groups[1].Value] = 1; $L.Add('| `' + $m.Groups[1].Value + '` | ' + ($cols -join ' · ') + ' | 서버가 스스로 (`worker.js`) |')
}
foreach ($m in [regex]::Matches($wAll, 'ALTER TABLE (\w+) ADD COLUMN (\w+)')) { $L.Add('| `' + $m.Groups[1].Value + '` 에 더한 칸 | ' + $m.Groups[2].Value + ' | 서버가 스스로 (`worker.js`) |') }
$L.Add('')

# ---- 7. 도구 ----
$L.Add('## 7. 도구 (`tools/`)')
$L.Add('')
$L.Add('| 파일 | 맨 위 설명 |')
$L.Add('|---|---|')
foreach ($f in (Get-ChildItem -LiteralPath (Join-Path $root 'tools') -File | Where-Object { $_.Extension -in '.ps1', '.html' } | Sort-Object Name)) { $L.Add('| `' + (Rel $f.FullName) + '` | ' + (Cell (Head-Line $f.FullName 200)) + ' |') }
$L.Add('')

$text = ($L -join "`n") + "`n"
if ($Check) {
  $old = if (Test-Path -LiteralPath $out) { (Read-Text $out) -replace "`r`n", "`n" } else { '' }
  if ($old -eq $text) { 'docs\코드-지도.md = 지금 코드 (같음)'; exit 0 } else { 'docs\코드-지도.md 가 지금 코드와 다릅니다. tools\map.ps1 을 실행하세요.'; exit 1 }
}
[IO.File]::WriteAllText($out, $text, $utf8)
"docs\코드-지도.md 를 다시 만들었습니다 (화면 $($pages.Count) · JS $($jsFiles.Count) · 서버 동작 $($pub.Count + $mem.Count))"
