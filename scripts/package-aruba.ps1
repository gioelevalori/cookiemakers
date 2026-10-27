param([string]$NodePath = 'node')

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $root
try {
    & $NodePath 'node_modules/@angular/cli/bin/ng.js' build --configuration production,aruba
    if ($LASTEXITCODE -ne 0) { throw 'Build Aruba non riuscita. Nessun nuovo archivio generato.' }

    $webRoot = (Resolve-Path 'dist/aruba/browser').Path
    $archive = [System.IO.Path]::GetFullPath((Join-Path $root 'dist/mycookiedelight-aruba.zip'))
    if (!$archive.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Il percorso di output non appartiene al progetto.'
    }
    foreach ($name in @('index.html', '.htaccess', 'assets/cookie-texture.jpg')) {
        if (!(Test-Path -LiteralPath (Join-Path $webRoot $name) -PathType Leaf)) { throw "File necessario mancante: $name" }
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($webRoot, $archive, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
    try {
        $names = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        if ('index.html' -notin $names -or '.htaccess' -notin $names) { throw "L'archivio non contiene i file direttamente nella root." }
        if ($names | Where-Object { $_ -match '^(?:src|node_modules|\.git)/' }) { throw "L'archivio include file di sviluppo." }
        Write-Output "Archivio verificato: $($names.Count) file."
    } finally { $zip.Dispose() }
    Get-Item -LiteralPath $archive | Select-Object FullName, Length
} finally { Pop-Location }
