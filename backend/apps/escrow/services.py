"""
Services pour l'intégration blockchain Web3
"""
import json
import os
import logging
from decimal import Decimal
from typing import Optional, Dict, Any, Callable

from django.conf import settings

from .models import EscrowTransaction, ProviderDeposit, EnterpriseDeposit, BlockchainEvent

logger = logging.getLogger(__name__)

WEB3_AVAILABLE = False
Web3 = None
geth_poa_middleware = None

try:
    from web3 import Web3 as _Web3
    try:
        from web3.middleware import ExtraDataToPOAMiddleware as _poa_middleware
    except ImportError:
        from web3.middleware import geth_poa_middleware as _poa_middleware
    Web3 = _Web3
    geth_poa_middleware = _poa_middleware
    WEB3_AVAILABLE = True
except ImportError:
    logger.warning(
        'web3 non installé — blockchain désactivée. '
        'Installez les deps: .\\venv\\Scripts\\python.exe -m pip install -r requirements.txt'
    )

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


# Fallbacks si le RPC principal (Render / rate-limit) échoue
_SEPOLIA_RPC_FALLBACKS = (
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://1rpc.io/sepolia',
    'https://sepolia.drpc.org',
)


class BlockchainService:
    """Service pour interagir avec la blockchain Ethereum"""

    def __init__(self):
        self.web3 = None
        self.escrow_contract = None
        self.reputation_contract = None
        self.litigation_contract = None
        self.last_rpc_url = ''
        self.last_error = ''
        self._connect()

    def _rpc_candidates(self) -> list:
        blockchain_cfg = getattr(settings, 'BLOCKCHAIN_CONFIG', {})
        primary = (
            blockchain_cfg.get('ETHEREUM_RPC_URL')
            or getattr(settings, 'ETHEREUM_RPC_URL', '')
            or ''
        ).strip()
        urls = []
        if primary and 'YOUR_KEY' not in primary:
            urls.append(primary)
        for u in _SEPOLIA_RPC_FALLBACKS:
            if u not in urls:
                urls.append(u)
        return urls

    def _try_provider(self, provider_url: str):
        """Tente un RPC ; retourne (web3, chain_id) ou lève."""
        w3 = Web3(Web3.HTTPProvider(provider_url, request_kwargs={'timeout': 25}))
        if geth_poa_middleware is not None:
            try:
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            except Exception:
                # déjà injecté / non nécessaire sur Sepolia
                pass
        # is_connected() seul est parfois flaky — on force un appel RPC
        if not w3.is_connected():
            raise ConnectionError(f'RPC non joignable: {provider_url}')
        chain_id = w3.eth.chain_id
        return w3, chain_id

    def _connect(self):
        """Établit la connexion à la blockchain (avec fallbacks RPC)."""
        if not WEB3_AVAILABLE or Web3 is None:
            self.last_error = 'web3 non installé'
            logger.warning('web3 indisponible — connexion blockchain ignorée')
            return False

        errors = []
        for provider_url in self._rpc_candidates():
            try:
                w3, chain_id = self._try_provider(provider_url)
                self.web3 = w3
                self.last_rpc_url = provider_url
                self.last_error = ''
                self._load_contracts()
                logger.info(
                    'Connecté à la blockchain - Chain ID: %s via %s',
                    chain_id,
                    provider_url,
                )
                return True
            except Exception as e:
                errors.append(f'{provider_url}: {e}')
                logger.warning('RPC échoué (%s): %s', provider_url, e)

        self.web3 = None
        self.escrow_contract = None
        self.reputation_contract = None
        self.litigation_contract = None
        self.last_error = ' | '.join(errors)[:500] or 'Impossible de se connecter à la blockchain'
        logger.error(self.last_error)
        return False

    def ensure_connected(self) -> bool:
        """Reconnecte si besoin (cold start Render / RPC momentanément down)."""
        if self.is_connected():
            return True
        return self._connect()

    def _load_contracts(self):
        """Charge les smart contracts depuis les ABIs compilés"""
        blockchain_cfg = getattr(settings, 'BLOCKCHAIN_CONFIG', {})

        escrow_address = blockchain_cfg.get('ESCROW_CONTRACT_ADDRESS', '')
        reputation_address = blockchain_cfg.get('REPUTATION_CONTRACT_ADDRESS', '')
        litigation_address = blockchain_cfg.get('LITIGATION_CONTRACT_ADDRESS', '')

        self.escrow_contract = None
        self.reputation_contract = None
        self.litigation_contract = None

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
        """Vérifie si la connexion est active (appel RPC léger)."""
        if self.web3 is None:
            return False
        try:
            _ = self.web3.eth.chain_id
            return True
        except Exception:
            return False
    
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

    def sync_events(self, from_block: int = 0) -> dict:
        """Synchronise les événements EscrowContract vers la base."""
        from apps.escrow.models import BlockchainEvent
        from apps.missions.models import Mission

        if not self.is_connected() or not self.escrow_contract:
            return {'error': 'Blockchain non connectée', 'synced': 0}

        counts = {}
        for event_name in ('MissionCreated', 'MissionValidated', 'MissionAccepted'):
            try:
                event = getattr(self.escrow_contract.events, event_name)
                logs = event.get_logs(fromBlock=from_block)
                for evt in logs:
                    BlockchainEvent.objects.get_or_create(
                        transaction_hash=evt.transactionHash.hex(),
                        log_index=evt.logIndex,
                        defaults={
                            'event_type': event_name.lower(),
                            'contract_address': self.escrow_contract.address,
                            'block_number': evt.blockNumber,
                            'event_data': dict(evt.args),
                            'processed': False,
                        },
                    )
                    if event_name == 'MissionValidated':
                        mission_id = evt.args.get('missionId')
                        if mission_id is not None:
                            Mission.objects.filter(mission_contract_id=mission_id).update(
                                blockchain_status='completed',
                            )
                counts[event_name] = len(logs)
            except Exception as exc:
                logger.warning(f'Erreur sync {event_name}: {exc}')
                counts[event_name] = 0

        return {'synced': sum(counts.values()), 'by_event': counts}


class EscrowService:
    """Service métier pour la gestion des escrows"""

    def __init__(self, blockchain=None):
        # Utilise le singleton partagé si fourni (évite 2 connexions RPC)
        self.blockchain = blockchain

    def is_blockchain_enabled(self) -> bool:
        bc = self.blockchain or blockchain_service
        if not WEB3_AVAILABLE:
            return False
        if not getattr(settings, 'BLOCKCHAIN_CONFIG', {}).get('ESCROW_CONTRACT_ADDRESS'):
            return False
        return bc.ensure_connected()
    
    def create_escrow_for_mission(self, mission) -> Optional[EscrowTransaction]:
        """Crée un enregistrement escrow DB (blockchain enregistrée séparément)."""
        try:
            escrow, created = EscrowTransaction.objects.get_or_create(
                mission=mission,
                transaction_type='deposit',
                defaults={
                    'client': mission.client,
                    'status': 'pending',
                    'amount': mission.budget,
                    'currency': mission.currency,
                    'blockchain_mission_id': '',
                    'reason': 'Dépôt initial pour mission',
                },
            )
            return escrow
        except Exception as e:
            logger.error(f"Erreur création escrow: {e}")
            return None

    def confirm_escrow_deposit(
        self,
        mission,
        *,
        tx_hash: str,
        blockchain_mission_id: int = None,
        block_number: int = None,
        gas_used: int = None,
    ) -> Optional[EscrowTransaction]:
        """Confirme un dépôt escrow (Mobile Money ou blockchain)."""
        escrow = self.create_escrow_for_mission(mission)
        if not escrow:
            return None

        escrow.status = 'confirmed'
        escrow.deposit_tx_hash = tx_hash
        if blockchain_mission_id is not None:
            escrow.blockchain_mission_id = str(blockchain_mission_id)
        if block_number:
            escrow.block_number = block_number
        if gas_used:
            escrow.gas_used = gas_used
        escrow.save()

        mission.escrow_tx_hash = tx_hash
        if blockchain_mission_id is not None:
            mission.mission_contract_id = blockchain_mission_id
        mission.blockchain_status = 'funded'
        mission.save(update_fields=['escrow_tx_hash', 'mission_contract_id', 'blockchain_status'])
        return escrow

    def confirm_provider_deposit_on_chain(
        self,
        mission,
        provider,
        *,
        tx_hash: str,
        block_number: int = None,
        gas_used: int = None,
    ):
        """Enregistre acceptMission on-chain après blocage caution DB."""
        deposit = ProviderDeposit.objects.filter(
            locked_for_mission=mission,
            provider=provider,
            status='locked',
        ).first()
        if deposit:
            deposit.deposit_tx_hash = tx_hash
            deposit.save(update_fields=['deposit_tx_hash'])

        mission.deposit_tx_hash = tx_hash
        if mission.blockchain_status in ('funded', 'pending'):
            mission.blockchain_status = 'accepted'
        mission.save(update_fields=['deposit_tx_hash', 'blockchain_status'])
        return deposit

    def calculate_enterprise_deposit(self, enterprise) -> Decimal:
        """Caution mission pour une entreprise (basée sur réputation entreprise)."""
        try:
            score = float(enterprise.reputation_score or 50)
            if score >= 50:
                reduction = (score - 50) * Decimal('60')
                return max(Decimal('2000'), Decimal('5000') - reduction)
            return Decimal('5000')
        except Exception as e:
            logger.error(f'Erreur calcul caution entreprise: {e}')
            return Decimal('5000')

    def lock_enterprise_deposit(self, mission, enterprise):
        """Bloque la caution sur le solde entreprise."""
        try:
            amount = self.calculate_enterprise_deposit(enterprise)
            mission.required_deposit = amount
            mission.deposit_amount = amount
            mission.save(update_fields=['required_deposit', 'deposit_amount'])

            if enterprise.deposit_balance < amount:
                logger.warning(
                    f'Caution entreprise insuffisante: {enterprise.deposit_balance} < {amount}'
                )
                return None

            enterprise.deposit_locked += amount
            enterprise.deposit_balance = max(Decimal('0'), enterprise.deposit_balance - amount)
            enterprise.save(update_fields=['deposit_locked', 'deposit_balance'])

            from django.utils import timezone
            deposit = EnterpriseDeposit.objects.create(
                enterprise=enterprise,
                amount=amount,
                currency=mission.currency,
                status='locked',
                locked_for_mission=mission,
                locked_at=timezone.now(),
            )

            mission.deposit_paid = True
            mission.deposit_tx_hash = f'ent-deposit-{deposit.id}'
            mission.save(update_fields=['deposit_paid', 'deposit_tx_hash'])

            from apps.notifications.services import create_notification
            create_notification(
                enterprise.user,
                'deposit_locked',
                'Caution entreprise bloquée',
                f'{amount} {mission.currency} bloqués pour « {mission.title} »',
                mission=mission,
            )
            return deposit
        except Exception as e:
            logger.error(f'Erreur blocage caution entreprise: {e}')
            return None

    def release_enterprise_deposit(self, mission) -> bool:
        """Libère la caution entreprise."""
        try:
            deposit = EnterpriseDeposit.objects.filter(
                locked_for_mission=mission,
                status='locked',
            ).first()
            if not deposit:
                return False

            enterprise = deposit.enterprise
            enterprise.deposit_locked = max(Decimal('0'), enterprise.deposit_locked - deposit.amount)
            enterprise.deposit_balance += deposit.amount
            enterprise.save(update_fields=['deposit_locked', 'deposit_balance'])

            from django.utils import timezone
            deposit.status = 'released'
            deposit.released_at = timezone.now()
            deposit.save()

            from apps.notifications.services import create_notification
            create_notification(
                enterprise.user,
                'deposit_released',
                'Caution entreprise libérée',
                f'Votre caution de {deposit.amount} {deposit.currency} a été libérée.',
                mission=mission,
            )
            return True
        except Exception as e:
            logger.error(f'Erreur libération caution entreprise: {e}')
            return False

    def lock_provider_deposit(self, mission, provider) -> Optional[ProviderDeposit]:
        """Bloque la caution du prestataire à l'acceptation de la mission."""
        try:
            amount = self.calculate_dynamic_deposit(provider)
            profile = provider.provider_profile
            mission.required_deposit = amount
            mission.deposit_amount = amount
            mission.save(update_fields=['required_deposit', 'deposit_amount'])

            if profile.deposit_balance < amount:
                logger.warning(
                    f"Caution insuffisante pour {provider.id}: {profile.deposit_balance} < {amount}"
                )
                return None

            profile.deposit_locked += amount
            profile.deposit_balance = max(Decimal('0'), profile.deposit_balance - amount)
            profile.save(update_fields=['deposit_locked', 'deposit_balance'])

            deposit = ProviderDeposit.objects.create(
                provider=provider,
                amount=amount,
                currency=mission.currency,
                status='locked',
                locked_for_mission=mission,
            )

            mission.deposit_paid = True
            mission.deposit_tx_hash = f'deposit-{deposit.id}'
            mission.save(update_fields=['deposit_paid', 'deposit_tx_hash'])

            from apps.notifications.services import create_notification
            create_notification(
                provider,
                'deposit_locked',
                'Caution bloquée',
                f'{amount} {mission.currency} bloqués pour la mission « {mission.title} »',
                mission=mission,
            )
            return deposit
        except Exception as e:
            logger.error(f"Erreur blocage caution: {e}")
            return None

    def release_provider_deposit(self, mission) -> bool:
        """Libère la caution après validation réussie."""
        if mission.assigned_enterprise_id:
            return self.release_enterprise_deposit(mission)
        try:
            deposit = ProviderDeposit.objects.filter(
                locked_for_mission=mission,
                status='locked',
            ).first()
            if not deposit:
                return False

            provider = deposit.provider
            profile = provider.provider_profile
            profile.deposit_locked = max(Decimal('0'), profile.deposit_locked - deposit.amount)
            profile.deposit_balance += deposit.amount
            profile.save(update_fields=['deposit_locked', 'deposit_balance'])

            from django.utils import timezone
            deposit.status = 'released'
            deposit.released_at = timezone.now()
            deposit.save()

            from apps.notifications.services import create_notification
            create_notification(
                provider,
                'deposit_released',
                'Caution libérée',
                f'Votre caution de {deposit.amount} {deposit.currency} a été libérée.',
                mission=mission,
            )
            return True
        except Exception as e:
            logger.error(f"Erreur libération caution: {e}")
            return False
    
    def release_payment_to_provider(self, mission) -> Optional[dict]:
        """Libère le paiement au prestataire après validation."""
        try:
            escrow = EscrowTransaction.objects.filter(
                mission=mission,
                transaction_type='deposit',
                status='confirmed',
            ).first()
            
            if not escrow:
                escrow = self.create_escrow_for_mission(mission)
                if escrow:
                    escrow.status = 'confirmed'
                    escrow.save(update_fields=['status'])
            
            release = EscrowTransaction.objects.create(
                mission=mission,
                client=mission.client,
                provider=mission.provider,
                transaction_type='release',
                status='pending',
                amount=mission.final_price or mission.budget,
                currency=mission.currency,
                reason='Paiement libéré après validation',
            )

            tx_hash = None
            if (
                self.is_blockchain_enabled()
                and mission.mission_contract_id
            ):
                relayer_key = os.getenv('BLOCKCHAIN_RELAYER_PRIVATE_KEY', '')
                relayer_address = os.getenv('BLOCKCHAIN_RELAYER_ADDRESS', '')
                if relayer_key and relayer_address:
                    tx_hash = self.blockchain.validate_mission_on_chain(
                        mission.mission_contract_id,
                        relayer_address,
                        relayer_key,
                    )
                    if tx_hash:
                        release.release_tx_hash = tx_hash
                        release.status = 'confirmed'
                        release.save(update_fields=['release_tx_hash', 'status'])
                        mission.blockchain_status = 'completed'
                        mission.save(update_fields=['blockchain_status'])

            self.release_provider_deposit(mission)
            return {'release_id': str(release.id), 'tx_hash': tx_hash}
            
        except Exception as e:
            logger.error(f"Erreur libération paiement: {e}")
            return None

    def refund_provider_deposit(self, mission) -> bool:
        """Rembourse la caution bloquée au prestataire (annulation / expiration)."""
        return self.release_provider_deposit(mission)

    def refund_client(self, mission, reason: str = '') -> Optional[dict]:
        """Rembourse les fonds escrow au client (annulation ou expiration)."""
        from django.utils import timezone
        from apps.payments.models import Payment, PaymentRefund

        try:
            if EscrowTransaction.objects.filter(
                mission=mission,
                transaction_type='refund',
                status='confirmed',
            ).exists():
                return {'already_refunded': True}

            escrow = EscrowTransaction.objects.filter(
                mission=mission,
                transaction_type='deposit',
                status='confirmed',
            ).first()

            amount = escrow.amount if escrow else (mission.budget or Decimal('0'))
            if amount <= 0:
                logger.warning(f'Aucun montant à rembourser pour mission {mission.id}')
                return None

            refund = EscrowTransaction.objects.create(
                mission=mission,
                client=mission.client,
                provider=mission.provider,
                transaction_type='refund',
                status='pending',
                amount=amount,
                currency=mission.currency,
                reason=reason or 'Remboursement client',
            )

            tx_id = None
            payment = getattr(mission, 'payment', None)
            if payment and payment.status == Payment.Status.COMPLETED:
                from apps.payments.mobile_money import MobileMoneyService
                try:
                    result = MobileMoneyService.refund_to_client(payment, reason=reason)
                    tx_id = result.get('transaction_id')
                except Exception as exc:
                    logger.error(f'Erreur remboursement Mobile Money: {exc}')
                    refund.status = 'failed'
                    refund.reason = f'{reason} — échec MM: {exc}'
                    refund.save(update_fields=['status', 'reason'])
                    return None

                PaymentRefund.objects.create(
                    payment=payment,
                    amount=payment.escrow_amount or amount,
                    reason=PaymentRefund.Reason.MISSION_CANCELLED,
                    reason_details=reason,
                    status=PaymentRefund.Status.COMPLETED,
                    transaction_id=tx_id or '',
                    processed_at=timezone.now(),
                )
                payment.status = Payment.Status.REFUNDED
                payment.refunded_at = timezone.now()
                payment.save(update_fields=['status', 'refunded_at'])

            refund.status = 'confirmed'
            refund.release_tx_hash = tx_id or ''
            refund.confirmed_at = timezone.now()
            refund.save(update_fields=['status', 'release_tx_hash', 'confirmed_at'])

            if mission.blockchain_status not in ('completed', 'refunded'):
                mission.blockchain_status = 'refunded'
                mission.save(update_fields=['blockchain_status'])

            from apps.notifications.services import create_notification
            create_notification(
                mission.client,
                'payment_refunded',
                'Remboursement effectué',
                f'Vos fonds ({amount} {mission.currency}) ont été remboursés pour « {mission.title} ».',
                mission=mission,
            )

            return {
                'refund_id': str(refund.id),
                'tx_hash': tx_id,
                'amount': str(amount),
            }
        except Exception as e:
            logger.error(f'Erreur remboursement client: {e}')
            return None
    
    def calculate_dynamic_deposit(self, provider) -> Decimal:
        """Caution dynamique en FCFA (marché Mali)."""
        try:
            reputation_score = provider.provider_profile.reputation_score

            if reputation_score >= 90:
                return Decimal('2000')
            if reputation_score >= 50:
                reduction = (reputation_score - 50) * Decimal('60')
                return max(Decimal('2000'), Decimal('5000') - reduction)
            return Decimal('5000')

        except Exception as e:
            logger.error(f"Erreur calcul caution: {e}")
            return Decimal('5000')


# Instance singleton
blockchain_service = BlockchainService()
escrow_service = EscrowService(blockchain_service)
