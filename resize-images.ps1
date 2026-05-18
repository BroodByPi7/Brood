Add-Type -AssemblyName System.Drawing

$dirs = @(
  Join-Path $PSScriptRoot "Images\Daily",
  Join-Path $PSScriptRoot "Images\Preorder"
)

$maxSize = 600

Get-ChildItem $dirs -Include "*.jpg" -Recurse | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $w = $img.Width
  $h = $img.Height

  if ($w -le $maxSize -and $h -le $maxSize) {
    $img.Dispose()
    return
  }

  $ratio = [Math]::Min($maxSize / $w, $maxSize / $h)
  $newW = [int]($w * $ratio)
  $newH = [int]($h * $ratio)

  $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $newW, $newH)
  $g.Dispose()
  $img.Dispose()

  # Save as JPEG quality 85
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]85)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
  $bmp.Save($_.FullName, $codec, $params)
  $bmp.Dispose()

  Write-Host "Resized $($_.Name) $($w)x$($h) -> $($newW)x$($newH)"
}

Write-Host "Done"
