# Script final pour compléter le setup de BlockTask
# À exécuter après fix_postgres_auth.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BLOCKTASK - FINAL SETUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Activer venv
Write-Host "[1/5] Activation de l'environnement virtuel..." -ForegroundColor Yellow
.\venv\Scripts\activate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur activation venv" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Venv activé" -ForegroundColor Green

# 2. Installer requirements
Write-Host ""
Write-Host "[2/5] Installation des dépendances..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur installation" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépendances installées" -ForegroundColor Green

# 3. Créer la base de données
Write-Host ""
Write-Host "[3/5] Création de la base de données..." -ForegroundColor Yellow
python setup_db.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erreur création DB (peut-être déjà existante)" -ForegroundColor Yellow
}
Write-Host "✅ Database OK" -ForegroundColor Green

# 4. Migrer
Write-Host ""
Write-Host "[4/5] Migration Django..." -ForegroundColor Yellow
python manage.py migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur migration" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migrations OK" -ForegroundColor Green

# 5. Créer superuser
Write-Host ""
Write-Host "[5/5] Création du superutilisateur..." -ForegroundColor Yellow
Write-Host "(Répondez aux questions ou appuyez sur Entrée pour les valeurs par défaut)" -ForegroundColor Gray
$env:DJANGO_SUPERUSER_USERNAME = "admin"
$env:DJANGO_SUPERUSER_EMAIL = "admin@blocktask.ci"
$env:DJANGO_SUPERUSER_PASSWORD = "admin123"
python manage.py createsuperuser --noinput 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    python manage.py createsuperuser
}
Write-Host "✅ Superuser OK" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLET ! 🎉" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Démarrage du serveur..." -ForegroundColor Yellow
Write-Host ""
Write-Host "URLs :" -ForegroundColor White
Write-Host "  • API : http://localhost:8000/api" -ForegroundColor Cyan
Write-Host "  • Admin : http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host "  • Docs : http://localhost:8000/api/schema" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login admin :" -ForegroundColor White
Write-Host "  • Username: admin" -ForegroundColor Gray
Write-Host "  • Password: admin123" -ForegroundColor Gray
Write-Host ""

python manage.py runserver
