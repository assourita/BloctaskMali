// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LitigationContract
 * @dev Contrat de gestion des litiges BlockTask
 * Gère l'ouverture, l'arbitrage et l'exécution des décisions de litige
 */
contract LitigationContract is ReentrancyGuard, Ownable, Pausable {
    
    // Énumération des statuts de litige
    enum LitigationStatus {
        Open,      // Litige ouvert
        InProgress, // En cours d'arbitrage
        Resolved   // Résolu
    }
    
    // Énumération des décisions possibles
    enum Decision {
        ClientWins,     // Client gagne (remboursement)
        ProviderWins,   // Prestataire gagne (paiement)
        Split           // Partage (50/50)
    }
    
    // Structure d'un litige
    struct Litigation {
        uint256 id;
        uint256 missionId;
        address plaintiff;      // Celui qui ouvre le litige
        address defendant;      // L'autre partie
        string reason;
        LitigationStatus status;
        Decision decision;
        address arbitrator;
        string proofHash;
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    // Mapping des litiges
    mapping(uint256 => Litigation) public litigations;
    mapping(uint256 => bool) public missionHasLitigation;
    
    // Compteurs
    uint256 public litigationCounter;
    
    // Mapping des arbitres
    mapping(address => bool) public isArbitrator;
    
    // Référence au contrat Escrow
    address public escrowContract;
    
    // Événements
    event LitigationOpened(uint256 indexed litigationId, uint256 indexed missionId, address indexed plaintiff, string reason);
    event EvidenceSubmitted(uint256 indexed litigationId, string proofHash);
    event ArbitrationDecision(uint256 indexed litigationId, Decision decision, address indexed arbitrator);
    event DecisionExecuted(uint256 indexed litigationId);
    
    // Modificateurs
    modifier onlyArbitrator() {
        require(isArbitrator[msg.sender], "Not authorized as arbitrator");
        _;
    }
    
    modifier validLitigation(uint256 litigationId) {
        require(litigationId > 0 && litigationId <= litigationCounter, "Invalid litigation ID");
        _;
    }
    
    /**
     * @dev Constructeur
     */
    constructor(address _escrowContract) {
        escrowContract = _escrowContract;
        isArbitrator[msg.sender] = true;
    }
    
    /**
     * @dev Ouvre un litige pour une mission
     * @param missionId ID de la mission
     * @param reason Raison du litige
     */
    function openLitigation(uint256 missionId, string memory reason) 
        external 
        whenNotPaused 
        returns (uint256) 
    {
        require(!missionHasLitigation[missionId], "Mission already has litigation");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        litigationCounter++;
        uint256 litigationId = litigationCounter;
        
        litigations[litigationId] = Litigation({
            id: litigationId,
            missionId: missionId,
            plaintiff: msg.sender,
            defendant: address(0), // Sera déterminé par le contrat Escrow
            reason: reason,
            status: LitigationStatus.Open,
            decision: Decision.Split, // Valeur par défaut
            arbitrator: address(0),
            proofHash: "",
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        missionHasLitigation[missionId] = true;
        
        emit LitigationOpened(litigationId, missionId, msg.sender, reason);
        
        return litigationId;
    }
    
    /**
     * @dev Soumet des preuves pour l'arbitrage
     * @param litigationId ID du litige
     * @param proofHash Hash des preuves
     */
    function submitEvidence(uint256 litigationId, string memory proofHash) 
        external 
        whenNotPaused 
        validLitigation(litigationId) 
    {
        Litigation storage litigation = litigations[litigationId];
        
        require(
            litigation.status == LitigationStatus.Open || 
            litigation.status == LitigationStatus.InProgress,
            "Litigation not in correct status"
        );
        require(
            msg.sender == litigation.plaintiff || 
            msg.sender == litigation.defendant,
            "Not a party to the litigation"
        );
        
        litigation.proofHash = proofHash;
        litigation.status = LitigationStatus.InProgress;
        
        emit EvidenceSubmitted(litigationId, proofHash);
    }
    
    /**
     * @dev Soumet la décision d'arbitrage
     * @param litigationId ID du litige
     * @param decision Décision (0: client, 1: prestataire, 2: partage)
     */
    function submitArbitrationDecision(uint256 litigationId, Decision decision) 
        external 
        onlyArbitrator 
        whenNotPaused 
        validLitigation(litigationId) 
    {
        Litigation storage litigation = litigations[litigationId];
        
        require(litigation.status == LitigationStatus.InProgress, "Litigation not in progress");
        
        litigation.decision = decision;
        litigation.arbitrator = msg.sender;
        litigation.status = LitigationStatus.Resolved;
        litigation.resolvedAt = block.timestamp;
        
        emit ArbitrationDecision(litigationId, decision, msg.sender);
    }
    
    /**
     * @dev Exécute la décision d'arbitrage
     * @param litigationId ID du litige
     */
    function executeDecision(uint256 litigationId) 
        external 
        onlyArbitrator 
        whenNotPaused 
        validLitigation(litigationId) 
        nonReentrant 
    {
        Litigation storage litigation = litigations[litigationId];
        
        require(litigation.status == LitigationStatus.Resolved, "Litigation not resolved");
        
        // Ici, on devrait appeler le contrat Escrow pour exécuter la décision
        // Pour l'instant, on émet juste un événement
        // L'implémentation complète nécessiterait une interface avec le contrat Escrow
        
        emit DecisionExecuted(litigationId);
    }
    
    /**
     * @dev Récupère les informations d'un litige
     * @param litigationId ID du litige
     */
    function getLitigationInfo(uint256 litigationId) 
        external 
        view 
        validLitigation(litigationId) 
        returns (
            uint256 id,
            uint256 missionId,
            address plaintiff,
            address defendant,
            string memory reason,
            LitigationStatus status,
            Decision decision,
            address arbitrator,
            string memory proofHash,
            uint256 createdAt,
            uint256 resolvedAt
        ) 
    {
        Litigation memory litigation = litigations[litigationId];
        return (
            litigation.id,
            litigation.missionId,
            litigation.plaintiff,
            litigation.defendant,
            litigation.reason,
            litigation.status,
            litigation.decision,
            litigation.arbitrator,
            litigation.proofHash,
            litigation.createdAt,
            litigation.resolvedAt
        );
    }
    
    /**
     * @dev Vérifie si une mission a un litige en cours
     * @param missionId ID de la mission
     */
    function hasActiveLitigation(uint256 missionId) 
        external 
        view 
        returns (bool) 
    {
        if (!missionHasLitigation[missionId]) {
            return false;
        }
        
        // Trouver le litige correspondant
        for (uint256 i = 1; i <= litigationCounter; i++) {
            if (litigations[i].missionId == missionId) {
                return litigations[i].status != LitigationStatus.Resolved;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Met à jour l'adresse du contrat Escrow
     * @param _escrowContract Nouvelle adresse
     */
    function setEscrowContract(address _escrowContract) external onlyOwner {
        escrowContract = _escrowContract;
    }
    
    /**
     * @dev Ajoute un arbitre
     * @param arbitratorAddress Adresse de l'arbitre
     */
    function addArbitrator(address arbitratorAddress) external onlyOwner {
        isArbitrator[arbitratorAddress] = true;
    }
    
    /**
     * @dev Retire un arbitre
     * @param arbitratorAddress Adresse de l'arbitre
     */
    function removeArbitrator(address arbitratorAddress) external onlyOwner {
        isArbitrator[arbitratorAddress] = false;
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
}
