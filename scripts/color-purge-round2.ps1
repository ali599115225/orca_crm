$root = "C:\Users\ali59\Desktop\REDC"
$targets = @(
    "ContractWizard.tsx", "ErrorBoundary.tsx", "ToursView.tsx", "TasksView.tsx",
    "SettingsView.tsx", "PropertiesView.tsx", "ProjectsView.tsx", "OffersView.tsx",
    "DocumentsView.tsx", "CalculatorView.tsx", "AgentManagementView.tsx",
    "AdvancedErpView.tsx", "Opportunities.tsx", "TopBarClient.tsx", "UIBusContext.tsx"
)

$files = Get-ChildItem -Path $root -Recurse -Include "*.tsx","*.ts" | Where-Object {
    $name = $_.Name
    $match = $false
    foreach ($t in $targets) { if ($name -eq $t) { $match = $true; break } }
    $match -and ($_.FullName -notmatch '\\node_modules\\|\\\.next\\|\.bak')
}

$replacements = @(
    # focus:ring-[#8EB1D1] → focus:ring-[var(--nc-accent-border)]
    @{ Old = 'focus:ring-[#8EB1D1]'; New = 'focus:ring-[var(--nc-accent-border)]' }

    # accent-[#8EB1D1] → accent-[var(--nc-accent)]
    @{ Old = 'accent-[#8EB1D1]'; New = 'accent-[var(--nc-accent)]' }
    @{ Old = 'accent-[#8eb1d1]'; New = 'accent-[var(--nc-accent)]' }

    # ring-[#8EB1D1] → ring-[var(--nc-accent-border)]
    @{ Old = 'ring-1 ring-[#8EB1D1]'; New = 'ring-1 ring-[var(--nc-accent-border)]' }

    # gradient to/from #1C2B48 → nc-surface-solid
    @{ Old = 'to-[#1C2B48]'; New = 'to-[var(--nc-surface-solid)]' }
    @{ Old = 'from-[#1C2B48]'; New = 'from-[var(--nc-surface-solid)]' }
    @{ Old = 'from-[#151f32] to-[var(--nc-surface-solid)]'; New = 'from-[var(--nc-surface-solid)] to-[var(--nc-surface-solid)]' }

    # bg-[#1C2B48]/XX that might remain
    @{ Old = 'bg-[#1C2B48]/60'; New = 'bg-[var(--nc-surface-strong)]' }
    @{ Old = 'bg-[#1C2B48]/50'; New = 'bg-[var(--nc-surface)]' }
    @{ Old = 'bg-[#1C2B48]/45'; New = 'bg-[var(--nc-surface)]' }
    @{ Old = 'bg-[#1C2B48]/40'; New = 'bg-[var(--nc-surface)]' }

    # standalone bg-[#1C2B48]
    @{ Old = 'bg-[#1C2B48]'; New = 'bg-[var(--nc-surface-solid)]' }

    # border-[#A7C7E7] with various opacities
    @{ Old = 'border-[#A7C7E7]/55'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/50'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/40'; New = 'border-[var(--nc-glass-border)]' }
    @{ Old = 'border-[#A7C7E7]/25'; New = 'border-[var(--nc-glass-border)]' }

    # hover:text-[#A7C7E7]
    @{ Old = 'hover:text-[#A7C7E7]'; New = 'hover:text-[var(--nc-text-secondary)]' }

    # text-[#A7C7E7] (standalone)
    @{ Old = 'text-[#A7C7E7]'; New = 'text-[var(--nc-text-secondary)]' }

    # text-[#E8ECEF]
    @{ Old = 'text-[#E8ECEF]'; New = 'text-[var(--nc-text-primary)]' }

    # radial-gradient with #8EB1D1
    @{ Old = 'radial-gradient(#8EB1D1_1px,transparent_1px)'; New = 'radial-gradient(var(--nc-accent-border) 1px,transparent 1px)' }
    @{ Old = 'radial-gradient(#8EB1D1_1.5px,transparent_1.5px)'; New = 'radial-gradient(var(--nc-accent-border) 1.5px,transparent 1.5px)' }

    # from-[#8EB1D1] to-[#A7C7E7]
    @{ Old = 'from-[#8EB1D1] to-[#A7C7E7]'; New = 'from-[var(--nc-accent)] to-[var(--nc-accent-hover)]' }
)

$totalChanges = 0

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $original = $content
    $fileChanges = 0

    foreach ($r in $replacements) {
        $old = $r.Old
        $new = $r.New
        if ($content.Contains($old)) {
            $count = [regex]::Matches($content, [regex]::Escape($old)).Count
            $content = $content -replace [regex]::Escape($old), $new
            $fileChanges += $count
        }
    }

    if ($fileChanges -gt 0) {
        Set-Content -LiteralPath $file.FullName -Value $content -NoNewline
        $relPath = $file.FullName.Substring($root.Length + 1)
        Write-Host "  $relPath → $fileChanges تغييرات"
        $totalChanges += $fileChanges
    }
}

Write-Host "`n✅ إجمالي التغييرات الإضافية: $totalChanges استبدال"
