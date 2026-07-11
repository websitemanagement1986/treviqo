Add-Type -AssemblyName System.Drawing

function Save-Jpeg($bitmap, $path, $quality) {
  if (-not $quality) { $quality = 93 }
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
  $bitmap.Save($path, $encoder, $params)
  $bitmap.Dispose()
}

function New-Canvas {
  $bmp = New-Object System.Drawing.Bitmap 800, 800
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $rect = New-Object System.Drawing.Rectangle 0, 0, 800, 800
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rect, [System.Drawing.Color]::FromArgb(252, 253, 255), [System.Drawing.Color]::FromArgb(236, 240, 245), 90)
  $g.FillRectangle($brush, $rect)
  $brush.Dispose()
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Draw-Shadow($g, $x, $y, $w, $h) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($x, $y + $h - 18, $w, 28)
  $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 15, 23, 42))
  $g.FillPath($shadow, $path)
  $path.Dispose(); $shadow.Dispose()
}

function Draw-RibCuff($g, $x, $y, $w, $h, $color) {
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.FillRectangle($brush, $x, $y, $w, $h)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 0, 0, 0), 1)
  for ($i = 1; $i -lt 5; $i++) {
    $g.DrawLine($pen, $x + 4, $y + ($i * ($h / 5)), $x + $w - 4, $y + ($i * ($h / 5)))
  }
  $brush.Dispose(); $pen.Dispose()
}

function Draw-Sock($g, $x, $y, $bodyColor, $heelColor, $stripeColors) {
  Draw-Shadow $g $x $y 95 210
  $body = New-Object System.Drawing.SolidBrush $bodyColor
  $heel = New-Object System.Drawing.SolidBrush $heelColor
  $outline = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(50, 100, 116, 139), 1.5)
  $g.FillEllipse($heel, $x + 8, $y + 118, 78, 58)
  $g.FillRectangle($body, $x + 12, $y + 34, 70, 110)
  $g.FillEllipse($body, $x + 6, $y + 150, 82, 52)
  if ($stripeColors) {
    for ($i = 0; $i -lt $stripeColors.Count; $i++) {
      $stripe = New-Object System.Drawing.SolidBrush $stripeColors[$i]
      $g.FillRectangle($stripe, $x + 14, $y + 48 + ($i * 18), 66, 12)
      $stripe.Dispose()
    }
  }
  Draw-RibCuff $g ($x + 10) ($y + 8) 74 28 $bodyColor
  $g.DrawEllipse($outline, $x + 6, $y + 150, 82, 52)
  $body.Dispose(); $heel.Dispose(); $outline.Dispose()
}

function Draw-SockPair($g, $x, $y, $bodyColor, $heelColor, $stripeColors) {
  Draw-Sock $g ($x + 8) ($y + 6) $bodyColor $heelColor $stripeColors
  Draw-Sock $g ($x + 44) ($y) $bodyColor $heelColor $stripeColors
}

function Draw-Wristband($g, $x, $y, $color) {
  Draw-Shadow $g $x $y 190 72
  $fill = New-Object System.Drawing.SolidBrush $color
  $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 203, 213, 225), 2)
  $g.FillRectangle($fill, $x, $y, 190, 72)
  $g.DrawRectangle($border, $x, $y, 190, 71)
  for ($i = 0; $i -lt 9; $i++) {
    $line = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 148, 163, 184), 1)
    $g.DrawLine($line, $x + 12, $y + 10 + ($i * 7), $x + 178, $y + 10 + ($i * 7))
    $line.Dispose()
  }
  $fill.Dispose(); $border.Dispose()
}

function Draw-Scrunchie($g, $x, $y, $radius, $color) {
  Draw-Shadow $g $x $y ($radius * 2) ($radius * 2)
  $outer = New-Object System.Drawing.SolidBrush $color
  $inner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
  $g.FillEllipse($outer, $x, $y, $radius * 2, $radius * 2)
  $g.FillEllipse($inner, $x + ($radius * 0.34), $y + ($radius * 0.34), $radius * 1.32, $radius * 1.32)
  for ($i = 0; $i -lt 16; $i++) {
    $angle = ($i / 16) * [Math]::PI * 2
    $bx = $x + $radius + [Math]::Cos($angle) * ($radius * 0.82)
    $by = $y + $radius + [Math]::Sin($angle) * ($radius * 0.82)
    $bump = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, $color.R, $color.G, $color.B))
    $g.FillEllipse($bump, $bx - 8, $by - 8, 16, 16)
    $bump.Dispose()
  }
  $outer.Dispose(); $inner.Dispose()
}

function Draw-Handkerchief($g, $x, $y, $size, $rotation) {
  $state = $g.Save()
  $g.TranslateTransform($x + ($size / 2), $y + ($size / 2))
  $g.RotateTransform($rotation)
  $g.TranslateTransform(-($size / 2), -($size / 2))
  Draw-Shadow $g 0 8 $size ($size - 8)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(252, 252, 253))
  $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225), 2)
  $g.FillRectangle($white, 0, 0, $size, $size)
  $g.DrawRectangle($edge, 0, 0, $size, $size)
  for ($i = 1; $i -lt 4; $i++) {
    $fold = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 148, 163, 184), 1)
    $g.DrawLine($fold, 8, ($i * ($size / 4)), $size - 8, ($i * ($size / 4)) + 10)
    $fold.Dispose()
  }
  $white.Dispose(); $edge.Dispose()
  $g.Restore($state)
}

$out = Join-Path $PSScriptRoot "..\public\images\products"
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Force -Path $out | Out-Null }

# Men's ankle socks - pack of 3
$ctx = New-Canvas
$g = $ctx.Graphics
$white = [System.Drawing.Color]::FromArgb(248, 250, 252)
$heel = [System.Drawing.Color]::FromArgb(148, 163, 184)
Draw-SockPair $g 90 250 $white $heel $null
Draw-SockPair $g 300 220 $white $heel $null
Draw-SockPair $g 510 250 $white $heel $null
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "m006.jpg")

# Women's ankle socks - pack of 2
$ctx = New-Canvas
$g = $ctx.Graphics
$pink = [System.Drawing.Color]::FromArgb(251, 207, 232)
$heelPink = [System.Drawing.Color]::FromArgb(244, 114, 182)
Draw-SockPair $g 170 230 $pink $heelPink $null
Draw-SockPair $g 430 230 $pink $heelPink $null
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "w006.jpg")

# Kids cotton socks - pack of 3
$ctx = New-Canvas
$g = $ctx.Graphics
$set1Body = [System.Drawing.Color]::FromArgb(254, 226, 226)
$set1Heel = [System.Drawing.Color]::FromArgb(248, 113, 113)
$set1Stripes = @([System.Drawing.Color]::FromArgb(252, 165, 165), [System.Drawing.Color]::FromArgb(254, 240, 138))
$set2Body = [System.Drawing.Color]::FromArgb(219, 234, 254)
$set2Heel = [System.Drawing.Color]::FromArgb(96, 165, 250)
$set2Stripes = @([System.Drawing.Color]::FromArgb(147, 197, 253), [System.Drawing.Color]::FromArgb(167, 243, 208))
$set3Body = [System.Drawing.Color]::FromArgb(237, 233, 254)
$set3Heel = [System.Drawing.Color]::FromArgb(167, 139, 250)
$set3Stripes = @([System.Drawing.Color]::FromArgb(196, 181, 253), [System.Drawing.Color]::FromArgb(253, 186, 116))
Draw-SockPair $g 80 240 $set1Body $set1Heel $set1Stripes
Draw-SockPair $g 300 240 $set2Body $set2Heel $set2Stripes
Draw-SockPair $g 520 240 $set3Body $set3Heel $set3Stripes
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "k003.jpg")

# Sports wrist sweatbands - pair
$ctx = New-Canvas
$g = $ctx.Graphics
$bandWhite = [System.Drawing.Color]::FromArgb(248, 250, 252)
Draw-Wristband $g 150 330 $bandWhite
Draw-Wristband $g 430 330 $bandWhite
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "s004.jpg")

# Hair scrunchie set of 5
$ctx = New-Canvas
$g = $ctx.Graphics
$colors = @(
  [System.Drawing.Color]::FromArgb(236, 72, 153),
  [System.Drawing.Color]::FromArgb(59, 130, 246),
  [System.Drawing.Color]::FromArgb(34, 197, 94),
  [System.Drawing.Color]::FromArgb(250, 204, 21),
  [System.Drawing.Color]::FromArgb(168, 85, 247)
)
Draw-Scrunchie $g 300 180 58 $colors[0]
Draw-Scrunchie $g 470 250 52 $colors[1]
Draw-Scrunchie $g 210 290 54 $colors[2]
Draw-Scrunchie $g 390 390 50 $colors[3]
Draw-Scrunchie $g 560 360 48 $colors[4]
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "w007.jpg")

# Cotton handkerchief pack of 3
$ctx = New-Canvas
$g = $ctx.Graphics
Draw-Handkerchief $g 250 260 220 -8
Draw-Handkerchief $g 290 290 220 6
Draw-Handkerchief $g 330 320 220 14
$g.Dispose()
Save-Jpeg $ctx.Bitmap (Join-Path $out "m007.jpg")

Write-Host "Generated m006, w006, k003, s004, w007, m007 product flat-lays in $out"
