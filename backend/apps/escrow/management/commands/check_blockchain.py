"""Vérifie la connexion blockchain et les contrats déployés."""
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.escrow.services import blockchain_service, escrow_service


class Command(BaseCommand):
    help = 'Affiche le statut blockchain (RPC, contrats, bloc courant).'

    def handle(self, *args, **options):
        cfg = getattr(settings, 'BLOCKCHAIN_CONFIG', {})
        connected = blockchain_service.ensure_connected()
        chain_id = cfg.get('CHAIN_ID')

        self.stdout.write(self.style.HTTP_INFO('=== BlockTask — Statut blockchain ==='))
        self.stdout.write(f'RPC           : {(blockchain_service.last_rpc_url or cfg.get("ETHEREUM_RPC_URL", ""))[:80]}')
        self.stdout.write(f'Connecté      : {"OUI" if connected else "NON"}')
        if blockchain_service.last_error:
            self.stdout.write(self.style.WARNING(f'Erreur        : {blockchain_service.last_error}'))
        self.stdout.write(f'Chain ID      : {chain_id}')
        self.stdout.write(f'Escrow        : {cfg.get("ESCROW_CONTRACT_ADDRESS") or "(non configuré)"}')
        self.stdout.write(f'Réputation    : {cfg.get("REPUTATION_CONTRACT_ADDRESS") or "(non configuré)"}')
        self.stdout.write(f'Litiges       : {cfg.get("LITIGATION_CONTRACT_ADDRESS") or "(non configuré)"}')
        self.stdout.write(f'Escrow actif  : {"OUI" if escrow_service.is_blockchain_enabled() else "NON"}')

        if connected and blockchain_service.web3:
            try:
                block = blockchain_service.web3.eth.block_number
                self.stdout.write(f'Dernier bloc  : {block}')
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'Bloc courant  : erreur ({exc})'))

        if not connected:
            self.stdout.write(self.style.ERROR(
                '\nAction : configurez ETHEREUM_RPC_URL et déployez avec '
                'cd smart-contracts && npm run deploy:sepolia:full'
            ))
        elif not escrow_service.is_blockchain_enabled():
            self.stdout.write(self.style.WARNING(
                '\nAction : renseignez ESCROW_CONTRACT_ADDRESS dans backend/.env'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('\nBlockchain opérationnelle.'))
