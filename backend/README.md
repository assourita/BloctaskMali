# BlockTask Backend

Backend Django REST API pour la plateforme BlockTask.

## 🚀 Configuration PostgreSQL

### 1. Installer PostgreSQL

**Windows:**
```powershell
# Télécharger depuis https://www.postgresql.org/download/windows/
# Ou utiliser Chocolatey
choco install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

### 2. Configurer la base de données

**Option A: Script automatique (Windows)**
```powershell
cd backend
python setup_db.py
```

**Option B: Manuellement avec psql**
```sql
-- Se connecter en tant que postgres
psql -U postgres

-- Créer l'utilisateur
CREATE USER blocktask_user WITH PASSWORD 'blocktask_password' CREATEDB;

-- Créer la base de données
CREATE DATABASE blocktask OWNER blocktask_user;

-- Accorder les privilèges
GRANT ALL PRIVILEGES ON DATABASE blocktask TO blocktask_user;

-- Quitter
\q
```

### 3. Configuration environnement

```powershell
cd backend
copy .env.example .env
# Éditer .env avec vos paramètres
```

### 4. Lancer les migrations

```powershell
# Créer l'environnement virtuel
python -m venv venv
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Migrer la base de données
python manage.py migrate

# Créer un super utilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

## 📁 Structure des Apps

```
apps/
├── users/          # Authentification, profils, KYC
├── missions/       # Gestion des missions
├── escrow/         # Blockchain, paiements
├── reputation/     # Système de réputation
├── disputes/       # Gestion des litiges
├── tracking/       # GPS temps réel
├── proofs/         # Preuves d'exécution
├── enterprises/    # Solutions B2B
├── notifications/  # Push, SMS, Email
├── analytics/      # Statistiques
└── common/         # Utilitaires
```

## 🔗 Endpoints API Principaux

| Endpoint | Description |
|----------|-------------|
| `/api/auth/token/` | JWT login |
| `/api/users/register/` | Inscription |
| `/api/users/me/` | Profil utilisateur |
| `/api/missions/` | CRUD missions |
| `/api/missions/available/` | Missions ouvertes |
| `/api/categories/` | Catégories |
| `/admin/` | Admin Django |

## 🐛 Dépannage

**Erreur: psycopg2 not found**
```powershell
pip install psycopg2-binary
```

**Erreur: Cannot connect to PostgreSQL**
```powershell
# Vérifier que PostgreSQL est en cours d'exécution
# Windows: Services → postgresql-x64-XX
# Linux: sudo systemctl status postgresql
```

**Erreur: permission denied**
```sql
-- Dans psql en tant que postgres
ALTER USER blocktask_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE blocktask TO blocktask_user;
```
