#requires -Version 7.2
[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $env:USERPROFILE ".config\opencode\opencode.jsonc")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "opencode.long-task.jsonc"
$backup = "$ConfigPath.orca-before-long-task.bak"

if (-not (Test-Path -LiteralPath $source)) {
    throw "ملف الإعداد المؤقت غير موجود: $source"
}

$parent = Split-Path -Parent $ConfigPath
New-Item -ItemType Directory -Force -Path $parent | Out-Null

if (Test-Path -LiteralPath $ConfigPath) {
    if (-not (Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $ConfigPath -Destination $backup -Force
    }
} else {
    $original = Join-Path $PSScriptRoot "opencode.original.jsonc"
    if (Test-Path -LiteralPath $original) {
        Copy-Item -LiteralPath $original -Destination $backup -Force
    }
}

Copy-Item -LiteralPath $source -Destination $ConfigPath -Force

Write-Host "OPENCODE_LONG_TASK_MODE_ENABLED" -ForegroundColor Green
Write-Host "Config:  $ConfigPath"
Write-Host "Backup:  $backup"
Write-Host "أغلق OpenCode وافتحه من جديد لتطبيق الإعداد."
