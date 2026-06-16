# Script PowerShell pour configurer PostgreSQL en mode TRUST (pas de mot de passe local)
# Execute en Administrateur si possible

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Configuration PostgreSQL - Mode TRUST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Trouver le répertoire PostgreSQL
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\16\data",
    "C:\Program Files\PostgreSQL\15\data",
    "C:\Program Files\PostgreSQL\14\data",
    "C:\Program Files\PostgreSQL\13\data",
    "C:\ProgramData\PostgreSQL\16\data",
    "C:\ProgramData\PostgreSQL\15\data"
)

$pgDataPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $pgDataPath = $path
        break
    }
}

if (-not $pgDataPath) {
    Write-Host "❌ Répertoire PostgreSQL non trouvé !" -ForegroundColor Red
    Write-Host "Chemins testés :" -ForegroundColor Yellow
    $possiblePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "Entrez le chemin manuellement (ex: C:\Program Files\PostgreSQL\16\data):" -ForegroundColor Yellow
    $pgDataPath = Read-Host
    if (-not (Test-Path $pgDataPath)) {
        Write-Host "❌ Chemin invalide !" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ PostgreSQL trouvé : $pgDataPath" -ForegroundColor Green

# 2. Sauvegarder pg_hba.conf
$hbaPath = Join-Path $pgDataPath "pg_hba.conf"
$hbaBackup = Join-Path $pgDataPath "pg_hba.conf.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"

if (Test-Path $hbaPath) {
    Copy-Item $hbaPath $hbaBackup -Force
    Write-Host "✅ Backup créé : $hbaBackup" -ForegroundColor Green
} else {
    Write-Host "❌ pg_hba.conf non trouvé !" -ForegroundColor Red
    exit 1
}

# 3. Lire le contenu
$content = Get-Content $hbaPath -Raw
Write-Host ""
Write-Host "Contenu actuel (extrait) :" -ForegroundColor Yellow
$content -split "`n" | Select-String "^(host|local)" | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}

# 4. Créer nouvelle configuration
$newConfig = @"
# BlockTask PostgreSQL Configuration - Mode TRUST (local development)
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections - TRUST (no password needed for local dev)
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust

# Unix domain socket
local   replication     all                                     trust
host    replication     all             127.0.0.1/32            trust
host    replication     all             ::1/128                 trust
"@

Write-Host ""
Write-Host "Nouvelle configuration :" -ForegroundColor Cyan
Write-Host $newConfig -ForegroundColor Green

# 5. Confirmer
Write-Host ""
$confirm = Read-Host "Appliquer cette configuration ? (O/n)"
if ($confirm -ne 'O' -and $confirm -ne 'o' -and $confirm -ne '') {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
}

# 6. Écrire la nouvelle configuration
Set-Content $hbaPath $newConfig -Force
Write-Host "✅ pg_hba.conf mis à jour !" -ForegroundColor Green

# 7. Redémarrer PostgreSQL
Write-Host ""
Write-Host "Redémarrage de PostgreSQL..." -ForegroundColor Yellow

$services = Get-Service | Where-Object { $_.Name -like "postgresql*" }
if ($services) {
    foreach ($service in $services) {
        Write-Host "  Service trouvé : $($service.Name)" -ForegroundColor Gray
        try {
            Restart-Service $service.Name -Force
            Write-Host "  ✅ $($service.Name) redémarré !" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Impossible de redémarrer automatiquement" -ForegroundColor Yellow
            Write-Host "     Redémarrez manuellement : services.msc → $($service.Name)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  Service PostgreSQL non trouvé automatiquement" -ForegroundColor Yellow
    Write-Host "   Redémarrez manuellement : services.msc → postgresql-x64-XX" -ForegroundColor Yellow
}

# 8. Tester la connexion
Write-Host ""
Write-Host "Test de connexion..." -ForegroundColor Yellow

$env:PGPASSWORD = ""  # Pas de mot de passe en mode trust
try {
    $testResult = psql -U postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connexion PostgreSQL réussie !" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Test de connexion échoué (mais config appliquée)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  psql non trouvé dans le PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURATION TERMINÉE !" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor White
Write-Host "  1. cd c:\Users\PC\Documents\blocktask_myself\backend" -ForegroundColor Yellow
Write-Host "  2. python setup_db.py" -ForegroundColor Yellow
Write-Host "  3. python manage.py migrate" -ForegroundColor Yellow
Write-Host "  4. python manage.py runserver" -ForegroundColor Yellow
Write-Host ""
Write-Host "En cas de problème :" -ForegroundColor Gray
Write-Host "  - Backup : $hbaBackup" -ForegroundColor Gray
Write-Host "  - Redémarrer PostgreSQL via services.msc" -ForegroundColor Gray
Write-Host ""
