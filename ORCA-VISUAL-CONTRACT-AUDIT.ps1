$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$NodeArgs = @()

if (Test-Path ".env") {
    $NodeArgs += "--env-file=.env"
}
if (Test-Path ".env.local") {
    $NodeArgs += "--env-file=.env.local"
}

$NodeArgs += "scripts/orca-visual-contract-audit.mjs"

Write-Host "ORCA Visual Contract Auditor" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor DarkGray
Write-Host ""

& node @NodeArgs
$ExitCode = $LASTEXITCODE

if ($ExitCode -ne 0) {
    throw "ORCA visual contract audit exited with code $ExitCode"
}
