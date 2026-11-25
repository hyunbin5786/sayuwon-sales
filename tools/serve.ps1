# 이 컴퓨터에서 화면을 띄워 보는 작은 서버 (개발-시작하기.md 3절)
#   실행:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#   → 브라우저에서 http://localhost:8767/  (끄기: 이 창에서 Ctrl+C 또는 창 닫기)
#   다른 번호로:  … -Port 8770
# localhost 로 연 화면은 테스트 DB 를 씀 (배포 DB 아님 · js/common.js SY_TEST_SITE)
param([int]$Port = 8767)
$root = Split-Path $PSScriptRoot -Parent
$types = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.sql' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'; '.wasm' = 'application/wasm' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
try { $l.Start() } catch { "포트 $Port 를 열 수 없습니다 (이미 쓰는 중일 수 있음) — 다른 번호로:  -Port 8770"; exit 1 }
"열렸습니다: http://localhost:$Port/   (끄기: Ctrl+C)"
try {
  while ($l.IsListening) {
    $c = $l.GetContext()
    try {
      $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if (-not $p -or $p.EndsWith('/')) { $p += 'index.html' }
      $f = [IO.Path]::GetFullPath((Join-Path $root $p))
      if ($f.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $f -PathType Leaf)) {   # 이 폴더 밖은 주지 않음
        $ct = $types[[IO.Path]::GetExtension($f).ToLower()]; if (-not $ct) { $ct = 'application/octet-stream' }
        $b = [IO.File]::ReadAllBytes($f); $c.Response.ContentType = $ct; $c.Response.Headers['Cache-Control'] = 'no-store'; $c.Response.OutputStream.Write($b, 0, $b.Length)
      } else { $c.Response.StatusCode = 404 }
    } catch { try { $c.Response.StatusCode = 500 } catch {} }
    try { $c.Response.Close() } catch {}
  }
} finally { $l.Stop() }
