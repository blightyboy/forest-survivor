'use strict';

/**
 * Builds build/icon.ico (multi-size) from icon.png for Windows exe embedding.
 * Run: node electron/make-icon.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'icon.png');
const outDir = path.join(root, 'build');
const out = path.join(outDir, 'icon.ico');

if (!fs.existsSync(src)) {
  console.error('Missing icon.png at project root');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const ps = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile(${JSON.stringify(src)})
$sizes = @(256, 128, 64, 48, 32, 16)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)
$imageData = @()
$offset = 6 + (16 * $sizes.Count)
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, 0, 0, $s, $s)
  $g.Dispose()
  $pngStream = New-Object System.IO.MemoryStream
  $bmp.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $pngStream.ToArray()
  $pngStream.Dispose()
  $bmp.Dispose()
  $w = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$w)
  $bw.Write([byte]$w)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$bytes.Length)
  $bw.Write([uint32]$offset)
  $offset += $bytes.Length
  $imageData += ,$bytes
}
foreach ($bytes in $imageData) { $bw.Write($bytes) }
$bw.Flush()
[System.IO.File]::WriteAllBytes(${JSON.stringify(out)}, $ms.ToArray())
$bw.Dispose(); $ms.Dispose(); $src.Dispose()
Write-Output "Wrote ${out.replace(/\\/g, '/')}"
`;

const tmp = path.join(outDir, '_make-icon.ps1');
fs.writeFileSync(tmp, ps, 'utf8');
try {
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmp], {
    stdio: 'inherit',
  });
} finally {
  try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
}

if (!fs.existsSync(out)) {
  console.error('Failed to write', out);
  process.exit(1);
}
console.log('Icon ready:', out, '(' + fs.statSync(out).size + ' bytes)');
