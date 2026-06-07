$root = "C:\Users\ali59\Desktop\REDC\components\views"
$files = Get-ChildItem -Path $root -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.next\\' }

$replacements = @(
    # ── #C4D8E5 → nc-text-dim (always text) ───
    @{ Old = 'text-[#C4D8E5]'; New = 'text-[var(--nc-text-dim)]' }
    @{ Old = 'text-[#c4d8e5]'; New = 'text-[var(--nc-text-dim)]' }

    # ── #E8ECEF → nc-text-primary (always text) ──
    @{ Old = 'text-[#E8ECEF]'; New = 'text-[var(--nc-text-primary)]' }

    # ── #8EB1D1 text → nc-text-secondary ─────
    @{ Old = 'text-[#8EB1D1]'; New = 'text-[var(--nc-text-secondary)]' }

    # ── #8EB1D1 bg with opacity → nc-accent-soft ──
    @{ Old = 'bg-[#8EB1D1]/10'; New = 'bg-[var(--nc-accent-soft)]' }
    @{ Old = 'bg-[#8EB1D1]/20'; New = 'bg-[var(--nc-accent-soft)]' }
    @{ Old = 'bg-[#8EB1D1]/15'; New = 'bg-[var(--nc-accent-soft)]' }
    @{ Old = 'hover:bg-[#8EB1D1]/20'; New = 'hover:bg-[var(--nc-accent-soft)]' }
    @{ Old = 'hover:bg-[#8EB1D1]'; New = 'hover:bg-[var(--nc-accent-hover)]' }
    @{ Old = 'focus:border-[#8EB1D1]'; New = 'focus:border-[var(--nc-accent-border)]' }

    # ── #8EB1D1 borders → nc-accent-border ────
    @{ Old = 'border-[#8EB1D1]/30'; New = 'border-[var(--nc-accent-border)]' }
    @{ Old = 'border-[#8EB1D1]/20'; New = 'border-[var(--nc-accent-border)]' }
    @{ Old = 'border-[#8EB1D1]'; New = 'border-[var(--nc-accent-border)]' }

    # ── #8EB1D1 bg (standalone) → nc-accent ───
    @{ Old = 'bg-[#8EB1D1]'; New = 'bg-[var(--nc-accent)]' }
    @{ Old = 'bg-[#8eb1d1]'; New = 'bg-[var(--nc-accent)]' }

    # ── #1C2B48 bg with opacity → nc-surface ──
    @{ Old = 'bg-[#1C2B48]/55'; New = 'bg-[var(--nc-surface)]' }
    @{ Old = 'bg-[#1C2B48]/40'; New = 'bg-[var(--nc-surface)]' }
    @{ Old = 'bg-[#1C2B48]/30'; New = 'bg-[var(--nc-surface)]' }
    @{ Old = 'bg-[#1C2B48]/60'; New = 'bg-[var(--nc-surface-strong)]' }
    @{ Old = 'bg-[#1C2B48]/50'; New = 'bg-[var(--nc-surface)]' }

    # ── #1C2B48 bg (standalone) → nc-surface-solid ──
    @{ Old = 'bg-[#1C2B48]'; New = 'bg-[var(--nc-surface-solid)]' }

    # ── #A7C7E7 borders → nc-glass-border ────
    @{ Old = 'border-[#A7C7E7]/80'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/60'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/30'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/20'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/10'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'hover:border-[#A7C7E7]/20'; New = 'hover:border-[var(--nc-glass-border-hover)]' }

    # ── #A7C7E7 bg hover → nc-accent-hover ──
    @{ Old = 'hover:bg-[#A7C7E7]'; New = 'hover:bg-[var(--nc-accent-hover)]' }

    # ── #A7C7E7 bg standalone → nc-surface ──
    @{ Old = 'bg-[#A7C7E7]'; New = 'bg-[var(--nc-surface)]' }
)

# Also add the tailwind.config replacement
$otherFiles = @(
    "C:\Users\ali59\Desktop\REDC\app\globals.css",
    "C:\Users\ali59\Desktop\REDC\app\operations\rental\page.tsx",
    "C:\Users\ali59\Desktop\REDC\app\login\LoginClient.tsx",
    "C:\Users\ali59\Desktop\REDC\app\register\RegisterForm.tsx",
    "C:\Users\ali59\Desktop\REDC\app\register\page.tsx",
    "C:\Users\ali59\Desktop\REDC\app\components\PricingGrid.tsx",
    "C:\Users\ali59\Desktop\REDC\app\context\UIBusContext.tsx",
    "C:\Users\ali59\Desktop\REDC\components\ErrorBoundary.tsx",
    "C:\Users\ali59\Desktop\REDC\components\ui\DateField.tsx",
    "C:\Users\ali59\Desktop\REDC\components\ui\Modal.tsx",
    "C:\Users\ali59\Desktop\REDC\components\features\ContractWizard.tsx",
    "C:\Users\ali59\Desktop\REDC\app\operations\onboarding\OnboardingForm.tsx",
    "C:\Users\ali59\Desktop\REDC\app\operations\onboarding\page.tsx",
    "C:\Users\ali59\Desktop\REDC\app\contract\[leadId]\page.tsx",
    "C:\Users\ali59\Desktop\REDC\components\settings\AutomationSettings.tsx"
)

foreach ($path in $otherFiles) {
    if (Test-Path -LiteralPath $path) {
        $files += Get-Item -LiteralPath $path
    }
}

$totalChanges = 0

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $original = $content
    $fileChangeCount = 0

    foreach ($r in $replacements) {
        $old = $r.Old
        $new = $r.New
        if ($content.Contains($old)) {
            $count = [regex]::Matches($content, [regex]::Escape($old)).Count
            $content = $content -replace [regex]::Escape($old), $new
            $fileChangeCount += $count
        }
    }

    if ($fileChangeCount -gt 0) {
        Set-Content -LiteralPath $file.FullName -Value $content -NoNewline
        $relPath = $file.FullName.Substring("C:\Users\ali59\Desktop\REDC".Length + 1)
        Write-Host "  $relPath → $fileChangeCount تغييرات"
        $totalChanges += $fileChangeCount
    }
}

Write-Host "`n✅ إجمالي التغييرات: $totalChanges استبدال"
