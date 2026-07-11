Add-Type -AssemblyName System.Drawing

function Save-Jpeg($bitmap, $path, $quality) {
  if (-not $quality) { $quality = 92 }
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
  $bitmap.Save($path, $encoder, $params)
  $bitmap.Dispose()
}

$out = Join-Path $PSScriptRoot "..\public\images\products"
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Force -Path $out | Out-Null }

# Kids cotton socks
$bmp = New-Object System.Drawing.Bitmap 800, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(245, 248, 252))
$heelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 120, 90))
$g.FillEllipse($heelBrush, 120, 520, 220, 120)
$g.FillEllipse($heelBrush, 460, 520, 220, 120)
$colors = @(
  [System.Drawing.Color]::FromArgb(255, 99, 132),
  [System.Drawing.Color]::FromArgb(255, 205, 86),
  [System.Drawing.Color]::FromArgb(75, 192, 192),
  [System.Drawing.Color]::FromArgb(153, 102, 255)
)
foreach ($x in @(170, 510)) {
  for ($i = 0; $i -lt 4; $i++) {
    $b = New-Object System.Drawing.SolidBrush $colors[$i % 4]
    $g.FillRectangle($b, $x, 180 + ($i * 70), 120, 55)
  }
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillEllipse($white, $x - 10, 500, 140, 90)
}
$g.Dispose()
Save-Jpeg $bmp (Join-Path $out "k003.jpg")

# Sports wrist sweatbands
$bmp = New-Object System.Drawing.Bitmap 800, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(238, 242, 247))
$wristBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(250, 250, 250))
$border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 224, 230), 3)
foreach ($x in @(170, 430)) {
  $g.FillRectangle($wristBrush, $x, 290, 200, 90)
  $g.DrawRectangle($border, $x, 290, 200, 90)
  for ($line = 0; $line -lt 8; $line++) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(235, 238, 242), 2)
    $g.DrawLine($pen, $x + 15, 305 + ($line * 9), $x + 185, 305 + ($line * 9))
  }
}
$g.Dispose()
Save-Jpeg $bmp (Join-Path $out "s004.jpg")

# Hair scrunchie set of 5
$bmp = New-Object System.Drawing.Bitmap 800, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(255, 247, 251))
$colors = @(
  [System.Drawing.Color]::FromArgb(236, 72, 153),
  [System.Drawing.Color]::FromArgb(59, 130, 246),
  [System.Drawing.Color]::FromArgb(34, 197, 94),
  [System.Drawing.Color]::FromArgb(250, 204, 21),
  [System.Drawing.Color]::FromArgb(168, 85, 247)
)
$positions = @(@(250, 250), @(430, 210), @(360, 380), @(210, 410), @(520, 360))
for ($i = 0; $i -lt 5; $i++) {
  $brush = New-Object System.Drawing.SolidBrush $colors[$i]
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 255, 255, 255), 8)
  $x = $positions[$i][0]; $y = $positions[$i][1]
  $g.FillEllipse($brush, $x, $y, 120, 120)
  $g.DrawEllipse($pen, $x + 18, $y + 18, 84, 84)
}
$g.Dispose()
Save-Jpeg $bmp (Join-Path $out "w007.jpg")

# Cotton handkerchief pack
$bmp = New-Object System.Drawing.Bitmap 800, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 232, 240))
$border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225), 2)
foreach ($offset in @(0, 18, 36)) {
  $g.FillRectangle($shadow, 210 + $offset, 250 + $offset, 320, 320)
  $g.FillRectangle($white, 190 + $offset, 230 + $offset, 320, 320)
  $g.DrawRectangle($border, 190 + $offset, 230 + $offset, 320, 320)
}
$g.Dispose()
Save-Jpeg $bmp (Join-Path $out "m007.jpg")

Write-Host "Generated k003.jpg, s004.jpg, w007.jpg, m007.jpg in $out"
