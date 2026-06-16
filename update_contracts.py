"""
Script de mise à jour rapide des adresses de contrats BlockTask
Usage: python update_contracts.py
"""
import re

ENV_FILE = "backend/.env"

print("=== BlockTask - Mise à jour des adresses de contrats ===\n")
print("Colle les adresses depuis Remix Desktop après chaque redémarrage.\n")

escrow = input("EscrowContract address     : ").strip()
reputation = input("ReputationContract address : ").strip()
litigation = input("LitigationContract address : ").strip()

if not all([escrow, reputation, litigation]):
    print("\n❌ Toutes les adresses sont requises.")
    exit(1)

with open(ENV_FILE, 'r') as f:
    content = f.read()

content = re.sub(r'ESCROW_CONTRACT_ADDRESS=.*', f'ESCROW_CONTRACT_ADDRESS={escrow}', content)
content = re.sub(r'REPUTATION_CONTRACT_ADDRESS=.*', f'REPUTATION_CONTRACT_ADDRESS={reputation}', content)
content = re.sub(r'LITIGATION_CONTRACT_ADDRESS=.*', f'LITIGATION_CONTRACT_ADDRESS={litigation}', content)

with open(ENV_FILE, 'w') as f:
    f.write(content)

print(f"\n✅ backend/.env mis à jour :")
print(f"   ESCROW_CONTRACT_ADDRESS={escrow}")
print(f"   REPUTATION_CONTRACT_ADDRESS={reputation}")
print(f"   LITIGATION_CONTRACT_ADDRESS={litigation}")
print("\nRedémarre le serveur Django pour appliquer les changements.")
