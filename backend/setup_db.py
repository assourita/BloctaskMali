#!/usr/bin/env python
"""
Script pour créer la base de données PostgreSQL et l'utilisateur
Run: python setup_db.py
"""
import subprocess
import sys

def run_command(command):
    """Run a shell command and return output"""
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.returncode == 0, result.stdout, result.stderr

def setup_postgres():
    """Setup PostgreSQL database for BlockTask"""
    print("🚀 Setting up PostgreSQL for BlockTask...")
    
    # Create user
    print("\n1. Creating database user 'blocktask_user'...")
    success, out, err = run_command(
        'psql -U postgres -c "CREATE USER blocktask_user WITH PASSWORD \'blocktask_password\' CREATEDB;"'
    )
    if success or "already exists" in err:
        print("✅ User created or already exists")
    else:
        print(f"⚠️  User creation issue (may already exist): {err}")
    
    # Create database
    print("\n2. Creating database 'blocktask'...")
    success, out, err = run_command(
        'psql -U postgres -c "CREATE DATABASE blocktask OWNER blocktask_user;"'
    )
    if success or "already exists" in err:
        print("✅ Database created or already exists")
    else:
        print(f"⚠️  Database creation issue: {err}")
    
    # Grant privileges
    print("\n3. Granting privileges...")
    success, out, err = run_command(
        'psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE blocktask TO blocktask_user;"'
    )
    if success:
        print("✅ Privileges granted")
    else:
        print(f"⚠️  Grant issue: {err}")
    
    print("\n✅ PostgreSQL setup complete!")
    print("\nNext steps:")
    print("1. python manage.py migrate")
    print("2. python manage.py createsuperuser")
    print("3. python manage.py runserver")

if __name__ == "__main__":
    try:
        setup_postgres()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure PostgreSQL is installed and running.")
        sys.exit(1)
