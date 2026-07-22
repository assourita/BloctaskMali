from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.missions.models import Mission
from apps.escrow.services import escrow_service, blockchain_service


def _explorer_tx_url(tx_hash: str) -> str:
    from django.conf import settings
    chain_id = getattr(settings, 'BLOCKCHAIN_CONFIG', {}).get('CHAIN_ID', 11155111)
    if chain_id == 11155111:
        return f'https://sepolia.etherscan.io/tx/{tx_hash}'
    return f'https://etherscan.io/tx/{tx_hash}'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_mission_on_chain(request):
    """
    Enregistre une transaction blockchain après création on-chain côté client (MetaMask).
    Body: mission_id, tx_hash, mission_contract_id, block_number?, gas_used?
    """
    mission_id = request.data.get('mission_id')
    tx_hash = request.data.get('tx_hash')
    contract_id = request.data.get('mission_contract_id')

    if not all([mission_id, tx_hash]):
        return Response({'error': 'mission_id et tx_hash requis'}, status=400)

    try:
        mission = Mission.objects.get(id=mission_id, client=request.user)
    except Mission.DoesNotExist:
        return Response({'error': 'Mission introuvable'}, status=404)

    escrow = escrow_service.confirm_escrow_deposit(
        mission,
        tx_hash=tx_hash,
        blockchain_mission_id=int(contract_id) if contract_id is not None else None,
        block_number=request.data.get('block_number'),
        gas_used=request.data.get('gas_used'),
    )

    if mission.status == Mission.Status.PENDING:
        mission.status = Mission.Status.FUNDED
        mission.save(update_fields=['status'])

    return Response({
        'escrow_id': str(escrow.id) if escrow else None,
        'mission_status': mission.status,
        'blockchain_status': mission.blockchain_status,
        'etherscan_url': _explorer_tx_url(tx_hash),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_provider_deposit(request):
    """
    Enregistre acceptMission on-chain après blocage caution côté prestataire.
    Body: mission_id, tx_hash, block_number?, gas_used?
    """
    mission_id = request.data.get('mission_id')
    tx_hash = request.data.get('tx_hash')

    if not all([mission_id, tx_hash]):
        return Response({'error': 'mission_id et tx_hash requis'}, status=400)

    try:
        mission = Mission.objects.get(id=mission_id, provider=request.user)
    except Mission.DoesNotExist:
        return Response({'error': 'Mission introuvable'}, status=404)

    if not mission.deposit_paid:
        return Response(
            {'error': 'Déposez d\'abord la caution (Mobile Money / solde)'},
            status=400,
        )

    deposit = escrow_service.confirm_provider_deposit_on_chain(
        mission,
        request.user,
        tx_hash=tx_hash,
        block_number=request.data.get('block_number'),
        gas_used=request.data.get('gas_used'),
    )

    return Response({
        'deposit_id': str(deposit.id) if deposit else None,
        'blockchain_status': mission.blockchain_status,
        'etherscan_url': _explorer_tx_url(tx_hash),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def blockchain_status(request):
    """État de la connexion blockchain et adresses des contrats (Sepolia). Public pour le diagnostic."""
    from django.conf import settings
    cfg = getattr(settings, 'BLOCKCHAIN_CONFIG', {})
    connected = blockchain_service.is_connected()
    chain_id = cfg.get('CHAIN_ID')
    escrow_address = cfg.get('ESCROW_CONTRACT_ADDRESS', '') or ''
    reputation_address = cfg.get('REPUTATION_CONTRACT_ADDRESS', '') or ''
    litigation_address = cfg.get('LITIGATION_CONTRACT_ADDRESS', '') or ''

    latest_block = None
    relayer_balance_wei = None
    relayer_address = getattr(settings, 'BLOCKCHAIN_RELAYER_ADDRESS', '') or ''
    contracts_loaded = {
        'escrow': bool(getattr(blockchain_service, 'escrow_contract', None)),
        'reputation': bool(getattr(blockchain_service, 'reputation_contract', None)),
        'litigation': bool(getattr(blockchain_service, 'litigation_contract', None)),
    }

    if connected and blockchain_service.web3:
        try:
            latest_block = blockchain_service.web3.eth.block_number
        except Exception:
            latest_block = None
        relayer_key = getattr(settings, 'BLOCKCHAIN_RELAYER_PRIVATE_KEY', '')
        if relayer_key:
            try:
                from eth_account import Account
                acct = Account.from_key(relayer_key)
                relayer_address = acct.address
                relayer_balance_wei = blockchain_service.web3.eth.get_balance(acct.address)
            except Exception:
                relayer_balance_wei = None

    network_name = 'Sepolia Testnet' if chain_id == 11155111 else (
        'Hardhat Local' if chain_id == 31337 else f'Chain {chain_id}'
    )

    return Response({
        'connected': connected,
        'chain_id': chain_id,
        'network_name': network_name,
        'latest_block': latest_block,
        'escrow_address': escrow_address,
        'reputation_address': reputation_address,
        'litigation_address': litigation_address,
        'contracts_loaded': contracts_loaded,
        'blockchain_enabled': escrow_service.is_blockchain_enabled(),
        'relayer_address': relayer_address,
        'relayer_balance_wei': str(relayer_balance_wei) if relayer_balance_wei is not None else None,
        'explorer_base_url': (
            'https://sepolia.etherscan.io' if chain_id == 11155111 else ''
        ),
        'deployment_ready': connected and all([escrow_address, reputation_address, litigation_address]),
        'setup_hint': (
            None if escrow_service.is_blockchain_enabled()
            else 'Déployez via: cd smart-contracts && npm run deploy:sepolia:full'
        ),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_blockchain_events(request):
    """Synchronise les événements on-chain (admin)."""
    if not (request.user.is_staff or getattr(request.user, 'user_type', '') == 'admin'):
        return Response({'error': 'Accès réservé aux administrateurs'}, status=403)

    from_block = int(request.data.get('from_block', 0))
    result = blockchain_service.sync_events(from_block=from_block)
    if result.get('error'):
        return Response(result, status=503)

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_proof_on_chain(request):
    """Enregistre submitProof on-chain après soumission prestataire."""
    mission_id = request.data.get('mission_id')
    tx_hash = request.data.get('tx_hash')
    proof_hash = request.data.get('proof_hash', '')

    if not all([mission_id, tx_hash]):
        return Response({'error': 'mission_id et tx_hash requis'}, status=400)

    try:
        mission = Mission.objects.get(id=mission_id, provider=request.user)
    except Mission.DoesNotExist:
        return Response({'error': 'Mission introuvable'}, status=404)

    if mission.status not in (Mission.Status.SUBMITTED, Mission.Status.IN_PROGRESS):
        return Response({'error': 'Mission non éligible pour preuve on-chain'}, status=400)

    mission.blockchain_status = 'proof_submitted'
    mission.save(update_fields=['blockchain_status'])

    from apps.escrow.models import BlockchainEvent
    BlockchainEvent.objects.get_or_create(
        transaction_hash=tx_hash,
        log_index=0,
        defaults={
            'event_type': 'proof_submitted',
            'mission': mission,
            'contract_address': '',
            'block_number': request.data.get('block_number', 0),
            'event_data': {'proof_hash': proof_hash, 'mission_id': mission.mission_contract_id},
            'processed': True,
        },
    )

    return Response({
        'blockchain_status': mission.blockchain_status,
        'etherscan_url': _explorer_tx_url(tx_hash),
    })
