<#
.SYNOPSIS
  Refreshes this repository from the Obsidian vault as the course progresses.

.DESCRIPTION
  1. Regenerates the graph inside the vault (generar-grafo.mjs).
  2. Syncs the vault tools (generator + viewer template) into vault-tools/.
  3. Builds the sanitized public graph (index.html) and refreshes the vault's grafo-publico.html.
  4. Optionally re-records the demo video (-Video) and commits + pushes (-Push).

.EXAMPLE
  .\scripts\update-from-vault.ps1
  .\scripts\update-from-vault.ps1 -Video -Push
#>
param(
  [string]$VaultPath = (Join-Path $env:USERPROFILE "Desktop\FP ASIR"),
  [switch]$Video,
  [switch]$Push
)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$GraphDir = Join-Path $VaultPath "Sistema\Grafo"

if (-not (Test-Path $GraphDir)) { throw "No se encuentra $GraphDir. Indica la bóveda con -VaultPath." }

Write-Host "1/4 Regenerando el grafo en la bóveda..."
node (Join-Path $GraphDir "generar-grafo.mjs")
if ($LASTEXITCODE -ne 0) { throw "generar-grafo.mjs ha fallado" }

Write-Host "2/4 Sincronizando vault-tools/..."
Copy-Item (Join-Path $GraphDir "generar-grafo.mjs"), (Join-Path $GraphDir "grafo-asir.html") (Join-Path $Root "vault-tools") -Force

Write-Host "3/4 Generando index.html público (saneado)..."
node (Join-Path $Root "scripts\build-public.mjs") --vault $VaultPath
if ($LASTEXITCODE -ne 0) { throw "build-public.mjs ha fallado: no se publica nada" }
node (Join-Path $GraphDir "sanear-para-publicar.mjs")
if ($LASTEXITCODE -ne 0) { throw "sanear-para-publicar.mjs ha fallado (grafo-publico.html de la bóveda)" }

if ($Video) {
  Write-Host "4/4 Grabando el vídeo (servidor local en :8765)..."
  $server = Start-Process python -ArgumentList "-m", "http.server", "8765", "--bind", "127.0.0.1", "--directory", $Root -PassThru -WindowStyle Hidden
  try {
    Start-Sleep -Seconds 2
    node (Join-Path $Root "scripts\record-video.cjs")
    if ($LASTEXITCODE -ne 0) { throw "record-video.cjs ha fallado" }
  } finally {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "4/4 Vídeo sin cambios (usa -Video para regrabarlo)."
}

git -C $Root status --short
if ($Push) {
  git -C $Root add -A
  git -C $Root commit -m "docs: update knowledge graph snapshot"
  git -C $Root push
}
