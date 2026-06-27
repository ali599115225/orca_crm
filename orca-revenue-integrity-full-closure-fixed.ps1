#requires -Version 7.2
<#
ORCA CRM — Revenue Integrity Full Closure Runner
=================================================
الغرض:
- تنفيذ إغلاق تحققي واحد بعد دمج العمل في فرع تكامل نظيف.
- منع الإغلاق الوهمي، ومنع لمس الإنتاج، ومنع SQL اليدوي وdb push وmigrate reset.
- لا يعدّل كود التطبيق أو schema.prisma أو migrations.
- يخرج PASS فقط عند اكتمال Dev DB + Runtime/E2E + Browser Login + Sync +
  Revenue Leak Radar + Conversation-to-Action + Predictive Intelligence +
  Saudi Trust Gates + Authorization + Event/Audit.

الاستخدام:
1) اضبط متغيرات البيئة في جلسة PowerShell فقط:
   $env:DATABASE_URL       = "<DEV_DATABASE_URL>"
   $env:DIRECT_URL         = "<DEV_DIRECT_URL>"           # إن كان المشروع يستخدمه
   $env:ORCA_TEST_EMAIL    = "<DEV_TEST_USER_EMAIL>"
   $env:ORCA_TEST_PASSWORD = "<DEV_TEST_USER_PASSWORD>"
   $env:JWT_SECRET         = "<DEV_JWT_SECRET>"
   $env:CRON_SECRET        = "<DEV_CRON_SECRET>"

2) شغّل:
   pwsh -NoProfile -ExecutionPolicy Bypass `
     -File .\orca-revenue-integrity-full-closure.ps1 `
     -RepoPath "C:\Users\ali59\Desktop\REDC-INTEGRATION" `
     -ExpectedBranch "integration/revenue-integrity" `
     -BaseUrl "http://127.0.0.1:3000"

مهم:
- لا تضع أسرارًا داخل هذا الملف.
- لا تستخدم قاعدة Production.
- Exit code:
  0 = READY_FOR_MANUAL_INTEGRATION
  2 = NOT_READY_FOR_MANUAL_INTEGRATION
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedBranch,

    [string]$BaseUrl = "http://127.0.0.1:3000",

    [int]$Port = 3000,

    [switch]$SkipInstall,

    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# -----------------------------
# ثابت: مؤشرات الإنتاج المحظورة
# -----------------------------
$ForbiddenProductionMarkers = @(
    "ep-fragrant-dream-aqbliivf",
    "br-cold-bread-aqb1e020",
    "orca.az-ez.pro",
    "production"
)

$RunId = Get-Date -Format "yyyyMMdd-HHmmss"
$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
$WorkRoot = Join-Path ([System.IO.Path]::GetTempPath()) "ORCA-Closure"
$ResultDir = Join-Path $WorkRoot "revenue-integrity-closure-$RunId"
$LogDir = Join-Path $ResultDir "logs"
$ReportPath = Join-Path $ResultDir "FINAL-REPORT.md"
$JsonPath = Join-Path $ResultDir "FINAL-REPORT.json"

# يوضع ملف Browser المؤقت داخل جذر المشروع لكي يحل Node حزمة playwright
# من node_modules، ثم يُحذف حتمًا في finally قبل فحص Git النهائي.
$BrowserScriptPath = Join-Path $RepoPath ".orca-browser-runtime-$RunId.mjs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$State = [ordered]@{
    runId = $RunId
    repoPath = $RepoPath
    expectedBranch = $ExpectedBranch
    actualBranch = $null
    startHead = $null
    endHead = $null
    startGitClean = $false
    endGitClean = $false
    databaseHost = $null
    gates = [ordered]@{}
    evidence = [ordered]@{}
    blockers = [System.Collections.Generic.List[string]]::new()
    warnings = [System.Collections.Generic.List[string]]::new()
    final = "NOT_READY_FOR_MANUAL_INTEGRATION"
}

$ServerProcess = $null
$stdoutTask = $null
$stderrTask = $null
$serverStdout = $null
$serverStderr = $null

function Write-Stage {
    param([string]$Text)
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Add-Gate {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail
    )
    $State.gates[$Name] = [ordered]@{
        passed = $Passed
        detail = $Detail
    }
    if ($Passed) {
        Write-Host "[PASS] $Name — $Detail" -ForegroundColor Green
    } else {
        Write-Host "[BLOCKED] $Name — $Detail" -ForegroundColor Red
        $State.blockers.Add("${Name}: $Detail")
    }
}

function Resolve-Executable {
    param([Parameter(Mandatory = $true)][string]$Name)
    $candidate = Get-Command $Name -ErrorAction SilentlyContinue
    if ($candidate) { return $candidate.Source }

    if ($IsWindows) {
        $candidate = Get-Command "$Name.cmd" -ErrorAction SilentlyContinue
        if ($candidate) { return $candidate.Source }
    }
    throw "الأمر غير موجود: $Name"
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$LogName,
        [switch]$AllowFailure,
        [hashtable]$ExtraEnv = @{}
    )

    $exe = Resolve-Executable $File
    $stdoutPath = Join-Path $LogDir "$LogName.stdout.log"
    $stderrPath = Join-Path $LogDir "$LogName.stderr.log"

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $exe
    $psi.WorkingDirectory = $RepoPath
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    foreach ($arg in $Arguments) {
        [void]$psi.ArgumentList.Add($arg)
    }

    foreach ($key in $ExtraEnv.Keys) {
        $psi.Environment[$key] = [string]$ExtraEnv[$key]
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()

    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    Set-Content -Path $stdoutPath -Value $stdout -Encoding UTF8
    Set-Content -Path $stderrPath -Value $stderr -Encoding UTF8

    $result = [ordered]@{
        exitCode = $process.ExitCode
        stdout = $stdout
        stderr = $stderr
        stdoutLog = $stdoutPath
        stderrLog = $stderrPath
    }

    if (-not $AllowFailure -and $process.ExitCode -ne 0) {
        throw "فشل الأمر: $File $($Arguments -join ' ') — ExitCode=$($process.ExitCode). راجع $stderrPath"
    }

    return $result
}

function Get-GitOutput {
    param([string[]]$Arguments, [string]$LogName)
    $r = Invoke-External -File "git" -Arguments $Arguments -LogName $LogName
    return $r.stdout.Trim()
}

function Test-DatabaseSafety {
    param([string]$Url)

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return [ordered]@{ safe = $false; detail = "DATABASE_URL غير موجود في بيئة الجلسة."; host = $null }
    }

    try {
        $uri = [System.Uri]$Url
        $hostName = $uri.Host
    } catch {
        return [ordered]@{ safe = $false; detail = "DATABASE_URL غير صالح."; host = $null }
    }

    $lower = $Url.ToLowerInvariant()
    foreach ($marker in $ForbiddenProductionMarkers) {
        if ($lower.Contains($marker.ToLowerInvariant())) {
            return [ordered]@{
                safe = $false
                detail = "DATABASE_URL يحتوي مؤشر إنتاج محظور: $marker"
                host = $hostName
            }
        }
    }

    if ($env:PRODUCTION_DATABASE_URL -and $env:PRODUCTION_DATABASE_URL -eq $Url) {
        return [ordered]@{
            safe = $false
            detail = "DATABASE_URL مطابق لـ PRODUCTION_DATABASE_URL."
            host = $hostName
        }
    }

    return [ordered]@{
        safe = $true
        detail = "قاعدة Dev منفصلة ولا تحمل مؤشرات الإنتاج المعروفة."
        host = $hostName
    }
}

function Test-HttpReady {
    param([string]$Url, [int]$TimeoutSeconds = 120)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # يستمر حتى انتهاء المهلة.
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Find-EvidenceFiles {
    param(
        [string[]]$Patterns,
        [string[]]$AllowedRoots = @("tests", "e2e", "playwright", "test")
    )

    $roots = foreach ($root in $AllowedRoots) {
        $full = Join-Path $RepoPath $root
        if (Test-Path $full) { $full }
    }

    if (-not $roots) { return @() }

    $files = Get-ChildItem -Path $roots -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs") }

    $matches = [System.Collections.Generic.List[string]]::new()
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        foreach ($pattern in $Patterns) {
            if ($content -match $pattern -or $file.Name -match $pattern) {
                $matches.Add($file.FullName)
                break
            }
        }
    }
    return @($matches | Sort-Object -Unique)
}

function Test-IsRuntimeEvidence {
    param([string]$Path)
    $normalized = $Path.Replace("\", "/").ToLowerInvariant()
    if ($normalized -match "/(e2e|runtime|playwright|integration)/") { return $true }

    $content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    return (
        $content -match "page\.goto|request\.(get|post|put|patch|delete)|fetch\(" -and
        $content -match "http|baseURL|BASE_URL"
    )
}

function Write-FinalReport {
    $closed = @()
    $open = @()
    foreach ($entry in $State.gates.GetEnumerator()) {
        if ($entry.Value.passed) { $closed += $entry.Key } else { $open += $entry.Key }
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# ORCA CRM — Revenue Integrity Full Closure Result")
    $lines.Add("")
    $lines.Add("**Run ID:** ``$($State.runId)``")
    $lines.Add("")
    $lines.Add("## الحكم النهائي")
    $lines.Add("")
    $lines.Add("``$($State.final)``")
    $lines.Add("")
    $lines.Add("## Git")
    $lines.Add("")
    $lines.Add("| البند | القيمة |")
    $lines.Add("|---|---|")
    $lines.Add("| Branch | ``$($State.actualBranch)`` |")
    $lines.Add("| HEAD قبل | ``$($State.startHead)`` |")
    $lines.Add("| HEAD بعد | ``$($State.endHead)`` |")
    $lines.Add("| Git clean قبل | $($State.startGitClean) |")
    $lines.Add("| Git clean بعد | $($State.endGitClean) |")
    $lines.Add("")
    $lines.Add("## البوابات")
    $lines.Add("")
    $lines.Add("| البوابة | الحكم | الدليل |")
    $lines.Add("|---|---|---|")
    foreach ($entry in $State.gates.GetEnumerator()) {
        $status = if ($entry.Value.passed) { "PASS" } else { "BLOCKED" }
        $detail = ([string]$entry.Value.detail).Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
        $lines.Add("| $($entry.Key) | **$status** | $detail |")
    }

    $lines.Add("")
    $lines.Add("## ما تم إغلاقه")
    $lines.Add("")
    if ($closed.Count -eq 0) {
        $lines.Add("- لا شيء.")
    } else {
        foreach ($item in $closed) { $lines.Add("- $item") }
    }

    $lines.Add("")
    $lines.Add("## ما لم يتم إغلاقه")
    $lines.Add("")
    if ($open.Count -eq 0) {
        $lines.Add("- لا شيء.")
    } else {
        foreach ($item in $open) { $lines.Add("- $item") }
    }

    $lines.Add("")
    $lines.Add("## الحواجز")
    $lines.Add("")
    if ($State.blockers.Count -eq 0) {
        $lines.Add("- لا توجد.")
    } else {
        foreach ($item in $State.blockers) { $lines.Add("- $item") }
    }

    $lines.Add("")
    $lines.Add("## التحذيرات")
    $lines.Add("")
    if ($State.warnings.Count -eq 0) {
        $lines.Add("- لا توجد.")
    } else {
        foreach ($item in $State.warnings) { $lines.Add("- $item") }
    }

    $lines.Add("")
    $lines.Add("## الأدلة")
    $lines.Add("")
    foreach ($entry in $State.evidence.GetEnumerator()) {
        $value = if ($entry.Value -is [System.Array]) {
            ($entry.Value -join "<br>")
        } else {
            [string]$entry.Value
        }
        $lines.Add("- **$($entry.Key):** $value")
    }

    Set-Content -Path $ReportPath -Value ($lines -join "`r`n") -Encoding UTF8
    $State | ConvertTo-Json -Depth 12 | Set-Content -Path $JsonPath -Encoding UTF8

    Write-Host "`nالتقرير: $ReportPath" -ForegroundColor Yellow
    Write-Host "JSON:     $JsonPath" -ForegroundColor Yellow
}

try {
    Set-Location $RepoPath

    # -----------------------------
    # Gate 1 — Git isolation
    # -----------------------------
    Write-Stage "Gate 1 — Git isolation"
    $State.actualBranch = Get-GitOutput -Arguments @("branch", "--show-current") -LogName "git-branch"
    $State.startHead = Get-GitOutput -Arguments @("rev-parse", "HEAD") -LogName "git-head-start"
    $startStatus = Get-GitOutput -Arguments @("status", "--short") -LogName "git-status-start"
    $State.startGitClean = [string]::IsNullOrWhiteSpace($startStatus)

    Add-Gate -Name "Git branch" -Passed ($State.actualBranch -eq $ExpectedBranch) `
        -Detail "المتوقع=$ExpectedBranch، الفعلي=$($State.actualBranch)"
    Add-Gate -Name "Git clean before" -Passed $State.startGitClean `
        -Detail $(if ($State.startGitClean) { "شجرة العمل نظيفة." } else { "تغييرات موجودة قبل التشغيل: $startStatus" })

    if (-not $State.startGitClean -or $State.actualBranch -ne $ExpectedBranch) {
        throw "توقف آمن: فرع غير مطابق أو Git غير نظيف."
    }

    # -----------------------------
    # Gate 2 — Dev database safety
    # -----------------------------
    Write-Stage "Gate 2 — Dev database safety"
    $dbSafety = Test-DatabaseSafety -Url $env:DATABASE_URL
    $State.databaseHost = $dbSafety.host
    Add-Gate -Name "Dev DB isolation" -Passed $dbSafety.safe -Detail $dbSafety.detail
    if (-not $dbSafety.safe) { throw "توقف آمن: قاعدة البيانات غير آمنة." }

    $requiredSecrets = @("JWT_SECRET", "CRON_SECRET")
    $missingSecrets = @($requiredSecrets | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) })
    Add-Gate -Name "Dev secrets present" -Passed ($missingSecrets.Count -eq 0) `
        -Detail $(if ($missingSecrets.Count -eq 0) { "JWT_SECRET وCRON_SECRET موجودان في بيئة الجلسة دون طباعتهما." } else { "مفقود: $($missingSecrets -join ', ')" })
    if ($missingSecrets.Count -gt 0) { throw "توقف آمن: أسرار Dev المطلوبة مفقودة." }

    # -----------------------------
    # Gate 3 — Dependencies
    # -----------------------------
    Write-Stage "Gate 3 — Dependencies"
    $packageJsonPath = Join-Path $RepoPath "package.json"
    if (-not (Test-Path $packageJsonPath)) { throw "package.json غير موجود." }

    if (-not $SkipInstall -and -not (Test-Path (Join-Path $RepoPath "node_modules"))) {
        $install = Invoke-External -File "npm" -Arguments @("ci", "--no-audit", "--no-fund") -LogName "npm-ci" -AllowFailure
        Add-Gate -Name "Dependencies install" -Passed ($install.exitCode -eq 0) `
            -Detail "npm ci exit=$($install.exitCode)"
        if ($install.exitCode -ne 0) { throw "فشل تثبيت الاعتمادات." }
    } else {
        Add-Gate -Name "Dependencies install" -Passed $true `
            -Detail $(if ($SkipInstall) { "تم التخطي بطلب صريح." } else { "node_modules موجود؛ لم يُكرر npm ci." })
    }

    # -----------------------------
    # Gate 4 — Prisma + zero drift
    # -----------------------------
    Write-Stage "Gate 4 — Prisma and schema drift"
    $prismaValidate = Invoke-External -File "npx" -Arguments @("prisma", "validate") -LogName "prisma-validate" -AllowFailure
    Add-Gate -Name "Prisma validate" -Passed ($prismaValidate.exitCode -eq 0) `
        -Detail "exit=$($prismaValidate.exitCode)"
    if ($prismaValidate.exitCode -ne 0) { throw "prisma validate فشل." }

    $migrateStatus = Invoke-External -File "npx" -Arguments @("prisma", "migrate", "status") -LogName "prisma-migrate-status" -AllowFailure
    Add-Gate -Name "Prisma migrate status" -Passed ($migrateStatus.exitCode -eq 0) `
        -Detail "exit=$($migrateStatus.exitCode)"
    if ($migrateStatus.exitCode -ne 0) { throw "prisma migrate status فشل." }

    $drift = Invoke-External -File "npx" `
        -Arguments @("prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script") `
        -LogName "prisma-schema-drift" -AllowFailure

    $driftText = ($drift.stdout + "`n" + $drift.stderr).Trim()
    $driftSql = $drift.stdout.Trim()
    $hasDrift = (
        $drift.exitCode -ne 0 -or
        (
            -not [string]::IsNullOrWhiteSpace($driftSql) -and
            $driftSql -notmatch "(?i)No difference detected|empty migration"
        )
    )

    $State.evidence["Schema drift log"] = $drift.stdoutLog
    Add-Gate -Name "Schema drift = 0" -Passed (-not $hasDrift) `
        -Detail $(if (-not $hasDrift) { "لا فرق بين Dev DB وschema.prisma." } else { "يوجد Schema Drift أو فشل diff. يمنع Runtime والإغلاق. راجع $($drift.stdoutLog)" })

    if ($hasDrift) {
        throw "توقف آمن: Schema Drift غير صفري. ممنوع db push أو SQL أو migration تلقائية."
    }

    $generate = Invoke-External -File "npx" -Arguments @("prisma", "generate") -LogName "prisma-generate" -AllowFailure
    Add-Gate -Name "Prisma generate" -Passed ($generate.exitCode -eq 0) -Detail "exit=$($generate.exitCode)"
    if ($generate.exitCode -ne 0) { throw "prisma generate فشل." }

    # -----------------------------
    # Gate 5 — Static compilation
    # -----------------------------
    Write-Stage "Gate 5 — TypeScript and build"
    $tsc = Invoke-External -File "npx" -Arguments @("tsc", "--noEmit") -LogName "tsc-noemit" -AllowFailure
    Add-Gate -Name "TypeScript" -Passed ($tsc.exitCode -eq 0) -Detail "exit=$($tsc.exitCode)"
    if ($tsc.exitCode -ne 0) { throw "TypeScript فشل." }

    if (-not $SkipBuild) {
        $build = Invoke-External -File "npm" -Arguments @("run", "build") -LogName "npm-build" -AllowFailure
        Add-Gate -Name "Final build" -Passed ($build.exitCode -eq 0) -Detail "exit=$($build.exitCode)"
        if ($build.exitCode -ne 0) { throw "Build فشل." }
    } else {
        Add-Gate -Name "Final build" -Passed $false -Detail "تم تخطي Build؛ الإغلاق النهائي لا يُقبل."
        throw "Build مطلوب للإغلاق النهائي."
    }

    # -----------------------------
    # Gate 6 — Evidence discovery
    # -----------------------------
    Write-Stage "Gate 6 — Runtime/E2E evidence discovery"

    $Capabilities = [ordered]@{
        "Sync runtime E2E" = @("realtime.?sync", "sync.?event", "deal.?sync", "sales.?sync")
        "Revenue Leak Radar E2E" = @("revenue.?leak", "leak.?radar", "revenue.?integrity")
        "Conversation-to-Action E2E" = @("conversation.?to.?action", "create.?task", "schedule.?tour", "follow.?up")
        "Predictive Intelligence E2E" = @("predictive.?intelligence", "risk.?score", "prediction")
        "Saudi Trust Gates E2E" = @("ejar", "zatca", "saudi.?trust")
        "Authorization E2E" = @("authorization", "api.?bypass", "tenant.?admin", "forbidden")
        "Event/Audit E2E" = @("audit.?event", "event.?audit", "outbox", "idempotenc")
    }

    $RuntimeFiles = [System.Collections.Generic.List[string]]::new()

    foreach ($capability in $Capabilities.GetEnumerator()) {
        $found = Find-EvidenceFiles -Patterns $capability.Value
        $runtime = @($found | Where-Object { Test-IsRuntimeEvidence -Path $_ })

        $State.evidence[$capability.Key] = @($runtime | ForEach-Object {
            $_.Substring($RepoPath.Length).TrimStart("\", "/")
        })

        Add-Gate -Name $capability.Key -Passed ($runtime.Count -gt 0) `
            -Detail $(if ($runtime.Count -gt 0) { "$($runtime.Count) ملف Runtime/E2E: $($runtime -join ', ')" } else { "لا يوجد دليل Runtime/E2E؛ اختبارات source/mocks لا تكفي." })

        foreach ($file in $runtime) { $RuntimeFiles.Add($file) }
    }

    if (@($State.gates.Values | Where-Object { -not $_.passed }).Count -gt 0) {
        throw "اختبارات Runtime/E2E المطلوبة غير مكتملة."
    }

    $RuntimeFiles = @($RuntimeFiles | Sort-Object -Unique)

    # -----------------------------
    # Gate 7 — Unit/integration suite
    # -----------------------------
    Write-Stage "Gate 7 — Unit and integration tests"
    $package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $scripts = @{}
    if ($package.scripts) {
        $package.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = [string]$_.Value }
    }

    if ($scripts.ContainsKey("test")) {
        $unit = Invoke-External -File "npm" -Arguments @("test", "--", "--runInBand") -LogName "unit-tests" -AllowFailure
        if ($unit.exitCode -ne 0 -and ($unit.stderr + $unit.stdout) -match "(?i)unknown option.*runInBand") {
            $unit = Invoke-External -File "npm" -Arguments @("test") -LogName "unit-tests-retry-without-runinband" -AllowFailure
        }
    } else {
        $unit = Invoke-External -File "npx" -Arguments @("vitest", "run") -LogName "vitest-run" -AllowFailure
    }

    Add-Gate -Name "Unit/integration tests" -Passed ($unit.exitCode -eq 0) `
        -Detail "exit=$($unit.exitCode). أي timeout أو failure يمنع PASS."
    if ($unit.exitCode -ne 0) { throw "الاختبارات ليست كاملة النجاح." }

    # -----------------------------
    # Gate 8 — Start server
    # -----------------------------
    Write-Stage "Gate 8 — Server runtime"

    $serverStdout = Join-Path $LogDir "server.stdout.log"
    $serverStderr = Join-Path $LogDir "server.stderr.log"
    $npmExe = Resolve-Executable "npm"

    $serverPsi = [System.Diagnostics.ProcessStartInfo]::new()
    $serverPsi.FileName = $npmExe
    $serverPsi.WorkingDirectory = $RepoPath
    $serverPsi.UseShellExecute = $false
    $serverPsi.RedirectStandardOutput = $true
    $serverPsi.RedirectStandardError = $true
    $serverPsi.CreateNoWindow = $true
    [void]$serverPsi.ArgumentList.Add("run")
    [void]$serverPsi.ArgumentList.Add("start")
    [void]$serverPsi.ArgumentList.Add("--")
    [void]$serverPsi.ArgumentList.Add("-p")
    [void]$serverPsi.ArgumentList.Add([string]$Port)

    $serverPsi.Environment["PORT"] = [string]$Port
    $serverPsi.Environment["NODE_ENV"] = "production"

    $ServerProcess = [System.Diagnostics.Process]::new()
    $ServerProcess.StartInfo = $serverPsi
    [void]$ServerProcess.Start()

    $stdoutTask = $ServerProcess.StandardOutput.ReadToEndAsync()
    $stderrTask = $ServerProcess.StandardError.ReadToEndAsync()

    $ready = Test-HttpReady -Url "$BaseUrl/login" -TimeoutSeconds 120
    Add-Gate -Name "Server startup" -Passed $ready `
        -Detail $(if ($ready) { "/login أعاد HTTP 200 بلا redirect." } else { "الخادم لم يصبح جاهزًا أو /login لم يعد 200." })
    if (-not $ready) { throw "الخادم لم يبدأ بنجاح." }

    # -----------------------------
    # Gate 9 — Browser login + page runtime
    # -----------------------------
    Write-Stage "Gate 9 — Browser login and Revenue Integrity runtime"

    $testEmail = $env:ORCA_TEST_EMAIL
    $testPassword = $env:ORCA_TEST_PASSWORD
    $credentialsPresent = -not [string]::IsNullOrWhiteSpace($testEmail) -and -not [string]::IsNullOrWhiteSpace($testPassword)
    Add-Gate -Name "Browser credentials present" -Passed $credentialsPresent `
        -Detail $(if ($credentialsPresent) { "بيانات مستخدم Dev موجودة في البيئة ولم تُطبع." } else { "ORCA_TEST_EMAIL أو ORCA_TEST_PASSWORD مفقود." })
    if (-not $credentialsPresent) { throw "بيانات Browser Login مفقودة." }

    $browserScript = @'
import { chromium } from "playwright";

const baseURL = process.env.ORCA_BASE_URL;
const email = process.env.ORCA_TEST_EMAIL;
const password = process.env.ORCA_TEST_PASSWORD;

function fail(message) {
  console.error(`BROWSER_RUNTIME_BLOCKED: ${message}`);
  process.exitCode = 2;
}

const forbiddenStatuses = new Set([307, 401, 500]);
const actionResponses = [];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("response", (response) => {
    const url = response.url();
    if (
      url.includes("/api/") ||
      url.includes("/operations/revenue-integrity")
    ) {
      actionResponses.push({ url, status: response.status(), method: response.request().method() });
    }
  });

  const loginResponse = await page.goto(`${baseURL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  if (!loginResponse || loginResponse.status() !== 200) {
    throw new Error(`/login status=${loginResponse?.status() ?? "NO_RESPONSE"}`);
  }

  const emailSelector = [
    'input[type="email"]',
    'input[name="email"]',
    'input[autocomplete="email"]',
  ].join(",");

  const passwordSelector = [
    'input[type="password"]',
    'input[name="password"]',
    'input[autocomplete="current-password"]',
  ].join(",");

  await page.locator(emailSelector).first().fill(email);
  await page.locator(passwordSelector).first().fill(password);

  const submit = page.locator('button[type="submit"], input[type="submit"]').first();
  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {}),
    submit.click(),
  ]);

  if (page.url().includes("/login")) {
    throw new Error("Browser login لم يغادر صفحة /login");
  }

  const pageResponse = await page.goto(`${baseURL}/operations/revenue-integrity`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  if (!pageResponse || pageResponse.status() !== 200) {
    throw new Error(`revenue-integrity status=${pageResponse?.status() ?? "NO_RESPONSE"}`);
  }

  const bodyText = await page.locator("body").innerText();

  const rawTechnicalLeaks = [
    "EXECUTION_FAILED",
    "LEAD_ID_REQUIRED_FOR_TOUR",
    "LEAD_ID_REQUIRED_FOR_TASK",
  ];

  for (const leak of rawTechnicalLeaks) {
    if (bodyText.includes(leak)) {
      throw new Error(`تسرب تقني ظاهر: ${leak}`);
    }
  }

  const pageSignals = [
    /Revenue Integrity/i,
    /سلامة الإيرادات/i,
    /تسرب الإيرادات/i,
    /Revenue Leak/i,
  ];

  if (!pageSignals.some((rx) => rx.test(bodyText))) {
    throw new Error("صفحة Revenue Integrity لم تعرض هوية المكوّن.");
  }

  async function clickAction(selectors, textPatterns, label) {
    let target = null;

    for (const selector of selectors) {
      const locator = page.locator(selector);
      if (await locator.count()) {
        target = locator.first();
        break;
      }
    }

    if (!target) {
      const buttons = page.getByRole("button");
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const text = (await buttons.nth(i).innerText().catch(() => "")).trim();
        if (textPatterns.some((rx) => rx.test(text))) {
          target = buttons.nth(i);
          break;
        }
      }
    }

    if (!target) {
      throw new Error(`زر ${label} غير موجود.`);
    }

    const before = actionResponses.length;
    await target.click();
    await page.waitForTimeout(2500);

    const newResponses = actionResponses.slice(before);
    const bad = newResponses.find((r) => forbiddenStatuses.has(r.status) || r.status >= 500);
    if (bad) {
      throw new Error(`${label} أعاد HTTP ${bad.status}: ${bad.url}`);
    }

    const success = newResponses.find((r) => r.status >= 200 && r.status < 300);
    if (!success) {
      throw new Error(`${label} لم ينتج استجابة API ناجحة 2xx.`);
    }

    return success;
  }

  const assessment = await clickAction(
    ['[data-testid="run-revenue-assessment"]', '[data-testid="run-assessment"]'],
    [/تشغيل.*تقييم/i, /Run.*assessment/i, /Run.*evaluation/i],
    "تشغيل التقييم"
  );

  const outbox = await clickAction(
    ['[data-testid="process-outbox"]', '[data-testid="process-outbox-batch"]'],
    [/معالجة.*Outbox/i, /Process.*Outbox/i, /معالجة.*دفعة/i],
    "معالجة Outbox"
  );

  const finalBody = await page.locator("body").innerText();
  const successSignals = [
    /اكتمل تشغيل التقييم/i,
    /assessment.*completed/i,
    /تمت معالجة.*Outbox/i,
    /Outbox.*processed/i,
  ];

  if (!successSignals.some((rx) => rx.test(finalBody))) {
    throw new Error("لم تظهر رسالة نجاح تشغيلية بعد الإجراءات.");
  }

  console.log("BROWSER_LOGIN_HTTP_200");
  console.log(`ASSESSMENT_HTTP_${assessment.status}`);
  console.log(`OUTBOX_HTTP_${outbox.status}`);
  console.log("REVENUE_INTEGRITY_RUNTIME_PASS");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  if (browser) await browser.close();
}
'@

    Set-Content -Path $BrowserScriptPath -Value $browserScript -Encoding UTF8

    $browserRun = Invoke-External -File "node" -Arguments @($BrowserScriptPath) -LogName "browser-runtime" -AllowFailure `
        -ExtraEnv @{
            ORCA_BASE_URL = $BaseUrl
            ORCA_TEST_EMAIL = $testEmail
            ORCA_TEST_PASSWORD = $testPassword
        }

    $browserOutput = $browserRun.stdout + "`n" + $browserRun.stderr
    $browserPassed = (
        $browserRun.exitCode -eq 0 -and
        $browserOutput -match "BROWSER_LOGIN_HTTP_200" -and
        $browserOutput -match "REVENUE_INTEGRITY_RUNTIME_PASS" -and
        $browserOutput -notmatch "HTTP_(307|401|500)"
    )

    Add-Gate -Name "Browser Login + Revenue Integrity runtime" -Passed $browserPassed `
        -Detail $(if ($browserPassed) { "Login=200، الصفحة=200، assessment/outbox=2xx، دون 307/401/500." } else { "Browser Runtime فشل. راجع $($browserRun.stdoutLog) و$($browserRun.stderrLog)" })
    if (-not $browserPassed) { throw "Browser Runtime/E2E فشل." }

    # -----------------------------
    # Gate 10 — Run discovered Playwright E2E
    # -----------------------------
    Write-Stage "Gate 10 — Full Runtime/E2E suite"

    $relativeRuntimeFiles = @($RuntimeFiles | ForEach-Object {
        [System.IO.Path]::GetRelativePath($RepoPath, $_)
    })

    $playwrightArgs = @("playwright", "test") + $relativeRuntimeFiles + @("--reporter=line")
    $e2e = Invoke-External -File "npx" -Arguments $playwrightArgs -LogName "playwright-runtime-e2e" -AllowFailure

    $e2eText = $e2e.stdout + "`n" + $e2e.stderr
    $e2ePassed = (
        $e2e.exitCode -eq 0 -and
        $e2eText -notmatch "(?i)\bfailed\b|\btimeout\b"
    )

    Add-Gate -Name "Full Runtime/E2E execution" -Passed $e2ePassed `
        -Detail $(if ($e2ePassed) { "جميع ملفات Runtime/E2E المكتشفة نجحت دون timeout." } else { "فشل أو timeout في Runtime/E2E. راجع $($e2e.stdoutLog)" })
    if (-not $e2ePassed) { throw "Runtime/E2E ليس كامل النجاح." }

    # -----------------------------
    # Gate 11 — Security and secret leakage
    # -----------------------------
    Write-Stage "Gate 11 — Security and leakage scan"

    $trackedDiff = Get-GitOutput -Arguments @("diff", "--", ".") -LogName "git-diff-final"
    $secretPatterns = @(
        "postgres(ql)?://[^ \r\n]+:[^ \r\n]+@",
        "Bearer\s+[A-Za-z0-9._-]{16,}",
        "JWT_SECRET\s*=\s*[^<\s][^\r\n]+",
        "CRON_SECRET\s*=\s*[^<\s][^\r\n]+",
        "sk-[A-Za-z0-9_-]{20,}"
    )

    $leaks = @()
    foreach ($pattern in $secretPatterns) {
        if ($trackedDiff -match $pattern) { $leaks += $pattern }
    }

    Add-Gate -Name "No secret leakage" -Passed ($leaks.Count -eq 0) `
        -Detail $(if ($leaks.Count -eq 0) { "لا توجد أنماط أسرار في git diff." } else { "اكتُشفت أنماط حساسة في git diff." })
    if ($leaks.Count -gt 0) { throw "تسرب أسرار محتمل." }

    # -----------------------------
    # Gate 12 — Final Git integrity
    # -----------------------------
    Write-Stage "Gate 12 — Final Git integrity"
    $State.endHead = Get-GitOutput -Arguments @("rev-parse", "HEAD") -LogName "git-head-end"
    $endStatus = Get-GitOutput -Arguments @("status", "--short") -LogName "git-status-end"
    $State.endGitClean = [string]::IsNullOrWhiteSpace($endStatus)

    Add-Gate -Name "HEAD unchanged" -Passed ($State.endHead -eq $State.startHead) `
        -Detail "قبل=$($State.startHead)، بعد=$($State.endHead)"
    Add-Gate -Name "Git clean after" -Passed $State.endGitClean `
        -Detail $(if ($State.endGitClean) { "شجرة العمل نظيفة بعد الإغلاق." } else { "تغييرات غير متوقعة: $endStatus" })

    if ($State.endHead -ne $State.startHead -or -not $State.endGitClean) {
        throw "السكريبت لا يسمح بتغييرات كود أثناء التحقق."
    }

    $allPassed = @($State.gates.Values | Where-Object { -not $_.passed }).Count -eq 0
    if ($allPassed) {
        $State.final = "READY_FOR_MANUAL_INTEGRATION"
    }
}
catch {
    $message = $_.Exception.Message
    $State.blockers.Add("Execution stopped: $message")
    Write-Host "`n[STOPPED SAFELY] $message" -ForegroundColor Red
}
finally {
    if (Test-Path $BrowserScriptPath) {
        Remove-Item -LiteralPath $BrowserScriptPath -Force -ErrorAction SilentlyContinue
    }

    if ($ServerProcess) {
        try {
            if (-not $ServerProcess.HasExited) {
                $ServerProcess.Kill($true)
                $ServerProcess.WaitForExit(10000)
            }

            if ($stdoutTask) {
                $serverOut = $stdoutTask.GetAwaiter().GetResult()
                Set-Content -Path $serverStdout -Value $serverOut -Encoding UTF8
            }
            if ($stderrTask) {
                $serverErr = $stderrTask.GetAwaiter().GetResult()
                Set-Content -Path $serverStderr -Value $serverErr -Encoding UTF8
            }
        } catch {
            $State.warnings.Add("تعذر إغلاق أو جمع سجل الخادم بالكامل: $($_.Exception.Message)")
        }
    }

    if (-not $State.endHead) {
        try {
            $State.endHead = Get-GitOutput -Arguments @("rev-parse", "HEAD") -LogName "git-head-finally"
            $finalStatus = Get-GitOutput -Arguments @("status", "--short") -LogName "git-status-finally"
            $State.endGitClean = [string]::IsNullOrWhiteSpace($finalStatus)
        } catch {
            $State.warnings.Add("تعذر جمع حالة Git النهائية.")
        }
    }

    Write-FinalReport
}

if ($State.final -eq "READY_FOR_MANUAL_INTEGRATION") {
    Write-Host "`nREADY_FOR_MANUAL_INTEGRATION" -ForegroundColor Green
    exit 0
}

Write-Host "`nNOT_READY_FOR_MANUAL_INTEGRATION" -ForegroundColor Red
exit 2
