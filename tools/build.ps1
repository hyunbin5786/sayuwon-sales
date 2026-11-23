# js/group/*.js (구역별 소스) → js/group.js (화면이 읽는 파일 하나) 로 합치기
#   고치는 곳은 js/group/ 안의 파일. js/group.js 는 직접 고치지 않음 (다음에 합칠 때 덮어씀)
#   쓰기:    powershell -ExecutionPolicy Bypass -File tools/build.ps1
#   확인만:  powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Check   (js/group.js 가 소스와 다르면 오류로 끝남)
# 파일 이름 순서(01- 02- …)대로 그대로 이어 붙임 — 한 파일일 때와 동작이 똑같음 (순서를 바꾸면 안 됨: 뒤 파일이 앞 파일의 이름을 씀)
param([switch]$Check)
$root = Split-Path $PSScriptRoot -Parent
$out  = Join-Path $root 'js\group.js'
$head = [Text.Encoding]::UTF8.GetBytes("// !! 자동으로 합친 파일 — 직접 고치지 마세요. 소스는 js/group/*.js, 고친 뒤 tools/build.ps1 실행 (README 14절) !!`n")
$ms = New-Object IO.MemoryStream
$ms.Write($head, 0, $head.Length)
Get-ChildItem (Join-Path $root 'js\group') -Filter '*.js' | Sort-Object Name | ForEach-Object {
  $b = [IO.File]::ReadAllBytes($_.FullName)
  $ms.Write($b, 0, $b.Length)
  if ($b.Length -and $b[$b.Length-1] -ne 10) { $ms.WriteByte(10) }   # 파일 끝에 줄바꿈이 없으면 붙임 (다음 파일 첫 줄과 붙지 않게)
}
$new = $ms.ToArray()
$old = if (Test-Path $out) { [IO.File]::ReadAllBytes($out) } else { @() }
$same = ($old.Length -eq $new.Length) -and ([Convert]::ToBase64String($old) -eq [Convert]::ToBase64String($new))
if ($Check) { if ($same) { Write-Output 'js/group.js = js/group/*.js (같음)'; exit 0 } else { Write-Output 'js/group.js 가 js/group/*.js 와 다릅니다. tools/build.ps1 을 실행하세요.'; exit 1 } }
if ($same) { Write-Output 'js/group.js: 바뀐 것 없음' } else { [IO.File]::WriteAllBytes($out, $new); Write-Output ("js/group.js: {0:N0} 바이트로 다시 만듦" -f $new.Length) }
