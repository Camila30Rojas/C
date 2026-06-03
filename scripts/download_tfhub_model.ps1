param(
    [Parameter(Mandatory=$true)][string]$ModelUrl,
    [Parameter(Mandatory=$true)][string]$OutDir
)

if (-not (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue)) {
    Write-Error "Invoke-WebRequest no disponible en este entorno PowerShell."
    exit 1
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Write-Host "Descargando model.json desde: $ModelUrl"
try {
    Invoke-WebRequest -Uri $ModelUrl -OutFile (Join-Path $OutDir 'model.json') -UseBasicParsing
} catch {
    Write-Error ("Fallo al descargar model.json: {0}" -f $_.Exception.Message)
    exit 1
}

$modelJson = Get-Content (Join-Path $OutDir 'model.json') -Raw | ConvertFrom-Json

if (-not $modelJson.weightsManifest) {
    Write-Host "No se encontraron weight shards en model.json."
    exit 0
}

# Determine base URL
$base = $ModelUrl.Split('?')[0]
if ($base.EndsWith('model.json')) {
    $base = $base.Substring(0, $base.LastIndexOf('/') + 1)
}

foreach ($manifest in $modelJson.weightsManifest) {
    foreach ($p in $manifest.paths) {
        $shardUrl = $base + $p
        $outFile = Join-Path $OutDir ([IO.Path]::GetFileName($p))
        Write-Host "Descargando shard: $shardUrl -> $outFile"
        try {
            Invoke-WebRequest -Uri $shardUrl -OutFile $outFile -UseBasicParsing
        } catch {
            Write-Warning ("Fallo al descargar {0}: {1}" -f $shardUrl, $_.Exception.Message)
        }
    }
}

Write-Host "Descarga completada. Archivos guardados en $OutDir"
