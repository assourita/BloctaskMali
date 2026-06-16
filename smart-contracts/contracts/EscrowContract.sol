// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title EscrowContract
 * @dev Contrat de gestion des fonds en escrow pour les missions BlockTask
 * Gère le blocage des fonds, les cautions et les paiements conditionnels
 */
contract EscrowContract is ReentrancyGuard, Ownable, Pausable {
    
    // Énumération des statuts de mission
    enum MissionStatus {
        Created,       // Mission créée, fonds bloqués
        Funded,        // Mission financée
        Accepted,      // Mission acceptée par prestataire
        InProgress,    // Mission en cours
        Submitted,     // Preuves soumises
        Completed,     // Mission validée et payée
        Cancelled,     // Mission annulée
        Disputed       // Litige en cours
    }
    
    // Structure d'une mission
    struct Mission {
        uint256 id;
        string missionHash;
        address client;
        address provider;
        uint256 amount;
        uint256 deposit;
        uint256 deadline;
        MissionStatus status;
        string proofHash;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Mapping des missions
    mapping(uint256 => Mission) public missions;
    mapping(string => uint256) public missionHashToId;
    
    // Compteurs
    uint256 public missionCounter;
    uint256 public platformFeePercentage = 5; // 5% de frais de plateforme
    
    // Événements
    event MissionCreated(uint256 indexed missionId, string missionHash, address indexed client, uint256 amount, uint256 deadline);
    event MissionFunded(uint256 indexed missionId, address indexed client, uint256 amount);
    event MissionAccepted(uint256 indexed missionId, address indexed provider, uint256 deposit);
    event ProofSubmitted(uint256 indexed missionId, string proofHash);
    event MissionValidated(uint256 indexed missionId);
    event MissionCancelled(uint256 indexed missionId);
    event FundsReleased(uint256 indexed missionId, address indexed provider, uint256 amount);
    event DepositRefunded(uint256 indexed missionId, address indexed provider, uint256 deposit);
    event ClientRefunded(uint256 indexed missionId, address indexed client, uint256 amount);
    
    // Modificateurs
    modifier onlyClient(uint256 missionId) {
        require(missions[missionId].client == msg.sender, "Not the client");
        _;
    }
    
    modifier onlyProvider(uint256 missionId) {
        require(missions[missionId].provider == msg.sender, "Not the provider");
        _;
    }
    
    modifier validMission(uint256 missionId) {
        require(missionId > 0 && missionId <= missionCounter, "Invalid mission ID");
        _;
    }
    
    /**
     * @dev Crée une nouvelle mission
     * @param missionHash Hash unique de la mission
     * @param deadline Délai d'exécution (timestamp)
     */
    function createMission(string memory missionHash, uint256 deadline) 
        external 
        payable 
        whenNotPaused 
        returns (uint256) 
    {
        require(msg.value > 0, "Amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(missionHashToId[missionHash] == 0, "Mission hash already exists");
        
        missionCounter++;
        uint256 missionId = missionCounter;
        
        missions[missionId] = Mission({
            id: missionId,
            missionHash: missionHash,
            client: msg.sender,
            provider: address(0),
            amount: msg.value,
            deposit: 0,
            deadline: deadline,
            status: MissionStatus.Funded,
            proofHash: "",
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        missionHashToId[missionHash] = missionId;
        
        emit MissionCreated(missionId, missionHash, msg.sender, msg.value, deadline);
        emit MissionFunded(missionId, msg.sender, msg.value);
        
        return missionId;
    }
    
    /**
     * @dev Accepte une mission et dépose la caution
     * @param missionId ID de la mission
     */
    function acceptMission(uint256 missionId) 
        external 
        payable 
        whenNotPaused 
        validMission(missionId) 
        nonReentrant 
    {
        Mission storage mission = missions[missionId];
        
        require(mission.status == MissionStatus.Funded, "Mission not available for acceptance");
        require(mission.provider == address(0), "Mission already accepted");
        require(msg.value > 0, "Deposit must be greater than 0");
        
        mission.provider = msg.sender;
        mission.deposit = msg.value;
        mission.status = MissionStatus.Accepted;
        mission.updatedAt = block.timestamp;
        
        emit MissionAccepted(missionId, msg.sender, msg.value);
    }
    
    /**
     * @dev Soumet des preuves d'exécution
     * @param missionId ID de la mission
     * @param proofHash Hash des preuves
     */
    function submitProof(uint256 missionId, string memory proofHash) 
        external 
        whenNotPaused 
        validMission(missionId) 
        onlyProvider(missionId) 
    {
        Mission storage mission = missions[missionId];
        
        require(mission.status == MissionStatus.Accepted || mission.status == MissionStatus.InProgress, 
                "Mission not in correct status");
        
        mission.proofHash = proofHash;
        mission.status = MissionStatus.Submitted;
        mission.updatedAt = block.timestamp;
        
        emit ProofSubmitted(missionId, proofHash);
    }
    
    /**
     * @dev Valide la mission et libère les fonds
     * @param missionId ID de la mission
     */
    function validateMission(uint256 missionId) 
        external 
        whenNotPaused 
        validMission(missionId) 
        onlyClient(missionId) 
        nonReentrant 
    {
        Mission storage mission = missions[missionId];
        
        require(mission.status == MissionStatus.Submitted, "Mission not submitted");
        
        uint256 platformFee = (mission.amount * platformFeePercentage) / 100;
        uint256 providerPayment = mission.amount - platformFee;
        
        mission.status = MissionStatus.Completed;
        mission.updatedAt = block.timestamp;
        
        // Transférer le paiement au prestataire
        payable(mission.provider).transfer(providerPayment);
        
        // Rembourser la caution
        if (mission.deposit > 0) {
            payable(mission.provider).transfer(mission.deposit);
            emit DepositRefunded(missionId, mission.provider, mission.deposit);
        }
        
        // Transférer les frais de plateforme au propriétaire
        if (platformFee > 0) {
            payable(owner()).transfer(platformFee);
        }
        
        emit MissionValidated(missionId);
        emit FundsReleased(missionId, mission.provider, providerPayment);
    }
    
    /**
     * @dev Annule une mission et rembourse le client
     * @param missionId ID de la mission
     */
    function cancelMission(uint256 missionId) 
        external 
        whenNotPaused 
        validMission(missionId) 
        onlyClient(missionId) 
        nonReentrant 
    {
        Mission storage mission = missions[missionId];
        
        require(mission.status == MissionStatus.Funded, "Mission cannot be cancelled");
        
        mission.status = MissionStatus.Cancelled;
        mission.updatedAt = block.timestamp;
        
        // Rembourser le client
        payable(mission.client).transfer(mission.amount);
        
        emit MissionCancelled(missionId);
        emit ClientRefunded(missionId, mission.client, mission.amount);
    }
    
    /**
     * @dev Met à jour le pourcentage de frais de plateforme
     * @param newPercentage Nouveau pourcentage
     */
    function setPlatformFeePercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= 20, "Fee percentage too high");
        platformFeePercentage = newPercentage;
    }
    
    /**
     * @dev Récupère les informations d'une mission
     * @param missionId ID de la mission
     */
    function getMissionInfo(uint256 missionId) 
        external 
        view 
        validMission(missionId) 
        returns (
            uint256 id,
            string memory missionHash,
            address client,
            address provider,
            uint256 amount,
            uint256 deposit,
            uint256 deadline,
            MissionStatus status,
            string memory proofHash,
            uint256 createdAt,
            uint256 updatedAt
        ) 
    {
        Mission memory mission = missions[missionId];
        return (
            mission.id,
            mission.missionHash,
            mission.client,
            mission.provider,
            mission.amount,
            mission.deposit,
            mission.deadline,
            mission.status,
            mission.proofHash,
            mission.createdAt,
            mission.updatedAt
        );
    }
    
    /**
     * @dev Met le contrat en pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Relance le contrat
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Récupère les fonds bloqués en cas d'urgence
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
