$ErrorActionPreference = "Stop"

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$targetDir = Join-Path $codexHome "skills/public/kaspa-sovereign-architect-engine"
$sourceDir = Split-Path -Parent $PSScriptRoot

New-Item -ItemType Directory -Force -Path (Join-Path $codexHome "skills/public") | Out-Null
if (Test-Path $targetDir) {
  Remove-Item -Recurse -Force $targetDir
}

Copy-Item -Recurse -Force $sourceDir $targetDir

Write-Host "Installed skill to: $targetDir"
Write-Host "Invoke with: `$kaspa-sovereign-architect-engine"
