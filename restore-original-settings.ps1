#requires -Version 7.2
[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $env:USERPROFILE ".config\opencode\opencode.jsonc")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$backup = "$ConfigPath.orca-before-long-task.bak"
$bundledOriginal = Join-Path $PSScriptRoot "opencode.original.jsonc"

if (Test-Path -LiteralPath $backup) {
    Copy-Item -LiteralPath $backup -Destination $ConfigPath -Force
    Remove-Item -LiteralPath $backup -Force
} elseif (Test-Path -LiteralPath $bundledOriginal) {
    Copy-Item -LiteralPath $bundledOriginal -Destination $ConfigPath -Force
} else {
    throw "لا توجد نسخة أصلية للاسترجاع."
}

Write-Host "OPENCODE_ORIGINAL_SETTINGS_RESTORED" -ForegroundColor Green
Write-Host "Config: $ConfigPath"
Write-Host "أغلق OpenCode وافتحه من جديد لتطبيق الإعداد الأصلي."
