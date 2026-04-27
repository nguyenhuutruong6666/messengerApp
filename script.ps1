Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:\1_thuctap\messengerApp\assets\logo.png")
$newWidth = 300
$newHeight = 300
$bmp = New-Object System.Drawing.Bitmap $newWidth, $newHeight
$graph = [System.Drawing.Graphics]::FromImage($bmp)
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.DrawImage($img, 0, 0, $newWidth, $newHeight)
$bmp.Save("d:\1_thuctap\messengerApp\assets\logo_small.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graph.Dispose()
$bmp.Dispose()
$img.Dispose()
