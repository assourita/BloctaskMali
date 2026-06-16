"""
Services pour l'intégration blockchain Web3
"""
import json
import os
import logging
from decimal import Decimal
from typing import Optional, Dict, Any, Callable

from django.conf import settings
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account

from .models import EscrowTransaction, ProviderDeposit, BlockchainEvent

logger = logging.getLogger(__name__)

ABI_DIR = os.path.join(os.path.dirname(__file__), 'abis')


def _load_abi(contract_name: str) -> list:
    """Charge l'ABI d'un contrat depuis le fichier JSON"""
    path = os.path.join(ABI_DIR, f'{contract_name}.json')
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"ABI non trouvé: {path}")
        return []


class BlockchainService:
    """Service pour interagir avec la blockchain Ethereum"""
    
    def __init__(self):
        self.web3 = None
        self.escrow_contract = None
        self.reputation_contract = None
        self.litigation_contract = None
        self._connect()
    
    def _connect(self):
        """Établit la connexion à la blockchain"""
        try:
            # Connexion au provider (Infura, Alchemy, ou local)
            provider_url = settings.ETHEREUM_RPC_URL
            self.web3 = Web3(Web3.HTTPProvider(provider_url))
            
            # Ajouter le middleware POA pour les réseaux de test (Sepolia, etc.)
            self.web3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            # Vérifier la connexion
            if not self.web3.is_connected():
                logger.error("Impossible de se connecter à la blockchain")
                return False
            
            # Charger les contrats
            self._load_contracts()
            
            logger.info(f"Connecté à la blockchain - Chain ID: {self.web3.eth.chain_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur connexion blockchain: {e}")
            return False
    
    def _load_contracts(self):
        """Charge les smart contracts depuis les ABIs compilés"""
        blockchain_cfg = getattr(settings, 'BLOCKCHAIN_CONFIG', {})

        escrow_address = blockchain_cfg.get('ESCROW_CONTRACT_ADDRESS', '')
        reputation_address = blockchain_cfg.get('REPUTATION_CONTRACT_ADDRESS', '')
        litigation_address = blockchain_cfg.get('LITIGATION_CONTRACT_ADDRESS', '')

        if escrow_address:
            self.escrow_contract = self.web3.eth.contract(
                address=Web3.to_checksum_address(escrow_address),
                abi=_load_abi('EscrowContract')
            )
            logger.info(f"EscrowContract chargé: {escrow_address}")

        if reputation_address:
            self.reputation_contract = self.web3.eth.contract(
                address=Web3.to_checksum_address(reputation_address),
                abi=_load_abi('ReputationContract')
            )
            logger.info(f"ReputationContract chargé: {reputation_address}")

        if litigation_address:
            self.litigation_contract = self.web3.eth.contract(
                address=Web3.to_checksum_address(litigation_address),
                abi=_load_abi('LitigationContract')
            )
            logger.info(f"LitigationContract chargé: {litigation_address}")
    
    def is_connected(self) -> bool:
        """Vérifie si la connexion est active"""
        return self.web3 is not None and self.web3.is_connected()
    
    def get_balance(self, address: str) -> Decimal:
        """Récupère le solde d'une adresse"""
        if not self.is_connected():
            return Decimal('0')
        
        try:
            balance_wei = self.web3.eth.get_balance(address)
            return Decimal(self.web3.from_wei(balance_wei, 'ether'))
        except Exception as e:
            logger.error(f"Erreur récupération solde: {e}")
            return Decimal('0')
    
    def create_mission_on_chain(
        self,
        mission_hash: str,
        deadline: int,
        amount_eth: Decimal,
        from_address: str,
        private_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Crée une mission sur la blockchain
        
        Args:
            mission_hash: Hash unique de la mission
            deadline: Timestamp Unix de la deadline
            amount_eth: Montant à déposer en ETH
            from_address: Adresse du client
            private_key: Clé privée pour signer
        
        Returns:
            Dict avec tx_hash et mission_id ou None si erreur
        """
        if not self.is_connected() or not self.escrow_contract:
            logger.error("Blockchain non connectée ou contrat non chargé")
            return None
        
        try:
            # Construire la transaction
            amount_wei = self.web3.to_wei(amount_eth, 'ether')
            
            tx = self.escrow_contract.functions.createMission(
                mission_hash,
                deadline
            ).build_transaction({
                'from': from_address,
                'value': amount_wei,
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price,
                'nonce': self.web3.eth.get_transaction_count(from_address),
            })
            
            # Signer et envoyer
            signed_tx = self.web3.eth.account.sign_transaction(tx, private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Attendre la confirmation
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                logger.info(f"Mission créée on-chain: {tx_hash.hex()}")
                
                # Extraire le mission_id des événements
                mission_id = None
                logs = self.escrow_contract.events.MissionCreated().process_receipt(receipt)
                if logs:
                    mission_id = logs[0]['args']['missionId']
                
                return {
                    'tx_hash': tx_hash.hex(),
                    'mission_id': mission_id,
                    'block_number': receipt['blockNumber'],
                    'gas_used': receipt['gasUsed']
                }
            else:
                logger.error(f"Transaction échouée: {tx_hash.hex()}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur création mission on-chain: {e}")
            return None
    
    def listen_to_events(
        self,
        event_name: str,
        from_block: int,
        callback: Callable
    ):
        """
        Écoute les événements du contrat
        
        Args:
            event_name: Nom de l'événement à écouter
            from_block: Bloc de départ
            callback: Fonction à appeler pour chaque événement
        """
        if not self.is_connected() or not self.escrow_contract:
            return
        
        try:
            event = getattr(self.escrow_contract.events, event_name)
            
            # Récupérer les événements passés
            events = event.get_logs(fromBlock=from_block)
            
            for evt in events:
                # Sauvegarder l'événement
                BlockchainEvent.objects.get_or_create(
                    transaction_hash=evt.transactionHash.hex(),
                    log_index=evt.logIndex,
                    defaults={
                        'event_type': event_name.lower(),
                        'contract_address': self.escrow_contract.address,
                        'block_number': evt.blockNumber,
                        'event_data': dict(evt.args),
                        'processed': False
                    }
                )
                
                # Appeler le callback
                callback(evt)
                
        except Exception as e:
            logger.error(f"Erreur écoute événements: {e}")
    
    def validate_mission_on_chain(
        self,
        mission_id: int,
        from_address: str,
        private_key: str
    ) -> Optional[str]:
        """
        Valide une mission sur la blockchain (libère le paiement)
        
        Returns:
            tx_hash ou None
        """
        if not self.is_connected() or not self.escrow_contract:
            return None
        
        try:
            tx = self.escrow_contract.functions.validateMission(mission_id).build_transaction({
                'from': from_address,
                'gas': 100000,
                'gasPrice': self.web3.eth.gas_price,
                'nonce': self.web3.eth.get_transaction_count(from_address),
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(tx, private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                logger.info(f"Mission validée on-chain: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                logger.error(f"Validation échouée: {tx_hash.hex()}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur validation on-chain: {e}")
            return None


class EscrowService:
    """Service métier pour la gestion des escrows"""
    
    def __init__(self):
        self.blockchain = BlockchainService()
    
    def create_escrow_for_mission(self, mission) -> Optional[EscrowTransaction]:
        """
        Crée un escrow pour une mission
        
        En production, cela interagirait avec la blockchain.
        Pour l'instant, on crée juste l'enregistrement en DB.
        """
        try:
            escrow = EscrowTransaction.objects.create(
                mission=mission,
                client=mission.client,
                transaction_type='deposit',
                status='pending',
                amount=mission.budget,
                currency=mission.currency,
                blockchain_mission_id='',  # Sera mis à jour après création on-chain
                reason='Dépôt initial pour mission'
            )
            
            # TODO: Appeler blockchain.create_mission_on_chain()
            # et mettre à jour blockchain_mission_id
            
            return escrow
            
        except Exception as e:
            logger.error(f"Erreur création escrow: {e}")
            return None
    
    def release_payment_to_provider(self, mission) -> bool:
        """
        Libère le paiement au prestataire après validation
        """
        try:
            # Récupérer l'escrow de la mission
            escrow = EscrowTransaction.objects.filter(
                mission=mission,
                transaction_type='deposit',
                status='confirmed'
            ).first()
            
            if not escrow:
                logger.error(f"Aucun escrow confirmé trouvé pour mission {mission.id}")
                return False
            
            # Créer la transaction de libération
            release = EscrowTransaction.objects.create(
                mission=mission,
                client=mission.client,
                provider=mission.provider,
                transaction_type='release',
                status='pending',
                amount=mission.provider_accepted_price or mission.budget,
                currency=mission.currency,
                reason='Paiement libéré après validation'
            )
            
            # TODO: Appeler blockchain.validate_mission_on_chain()
            # et mettre à jour release_tx_hash
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur libération paiement: {e}")
            return False
    
    def calculate_dynamic_deposit(self, provider) -> Decimal:
        """
        Calcule le montant de la caution dynamique pour un prestataire
        basé sur son score de réputation
        """
        try:
            reputation_score = provider.provider_profile.current_reputation_score
            
            # Formule: caution diminue avec la réputation
            # Base: 50 USDT
            # Réputation > 90: caution = 10 USDT
            # Réputation 50-90: caution = 50 - (score - 50) * 0.5
            # Réputation < 50: caution = 50 USDT
            
            if reputation_score >= 90:
                return Decimal('10.00')
            elif reputation_score >= 50:
                reduction = (reputation_score - 50) * Decimal('0.5')
                return Decimal('50.00') - reduction
            else:
                return Decimal('50.00')
                
        except Exception as e:
            logger.error(f"Erreur calcul caution: {e}")
            return Decimal('50.00')


# Instance singleton
blockchain_service = BlockchainService()
escrow_service = EscrowService()
