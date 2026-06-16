// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ReputationContract
 * @dev Contrat de gestion du système de réputation BlockTask
 * Calcule et stocke les scores de réputation des utilisateurs
 */
contract ReputationContract is Ownable, Pausable {
    
    // Structure de réputation
    struct Reputation {
        uint256 score;              // Score de réputation (0-100)
        uint256 totalMissions;      // Nombre total de missions
        uint256 successfulMissions;  // Nombre de missions réussies
        uint256 failedMissions;     // Nombre de missions échouées
        uint256 totalRating;        // Somme des évaluations
        uint256 ratingCount;        // Nombre d'évaluations
        uint256 disputeCount;       // Nombre de litiges
        uint256 lastUpdated;        // Dernière mise à jour
    }
    
    // Mapping des réputations par adresse
    mapping(address => Reputation) public reputations;
    
    // Mapping pour suivre les missions déjà évaluées
    mapping(uint256 => bool) public missionEvaluated;
    
    // Événements
    event ReputationUpdated(address indexed user, uint256 oldScore, uint256 newScore);
    event MissionEvaluated(uint256 indexed missionId, address indexed user, bool success, uint256 rating);
    event DisputeRecorded(address indexed user, uint256 missionId);
    
    // Modificateurs
    modifier onlyArbitrator() {
        require(msg.sender == owner() || isArbitrator[msg.sender], "Not authorized");
        _;
    }
    
    // Mapping des arbitres
    mapping(address => bool) public isArbitrator;
    
    /**
     * @dev Constructeur
     */
    constructor() {
        // Initialiser avec quelques arbitres par défaut
        isArbitrator[msg.sender] = true;
    }
    
    /**
     * @dev Récupère le score de réputation d'un utilisateur
     * @param userAddress Adresse de l'utilisateur
     */
    function getReputationScore(address userAddress) 
        external 
        view 
        returns (uint256) 
    {
        return reputations[userAddress].score;
    }
    
    /**
     * @dev Met à jour la réputation après une mission
     * @param userAddress Adresse de l'utilisateur
     * @param missionId ID de la mission
     * @param success true si la mission a réussi
     * @param rating Évaluation (1-5)
     */
    function updateReputation(
        address userAddress, 
        uint256 missionId, 
        bool success, 
        uint256 rating
    ) 
        external 
        onlyArbitrator 
        whenNotPaused 
    {
        require(!missionEvaluated[missionId], "Mission already evaluated");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        
        Reputation storage rep = reputations[userAddress];
        uint256 oldScore = rep.score;
        
        // Marquer la mission comme évaluée
        missionEvaluated[missionId] = true;
        
        // Mettre à jour les statistiques
        rep.totalMissions++;
        if (success) {
            rep.successfulMissions++;
        } else {
            rep.failedMissions++;
        }
        
        rep.totalRating += rating;
        rep.ratingCount++;
        
        // Calculer le nouveau score de réputation
        rep.score = calculateScore(rep);
        rep.lastUpdated = block.timestamp;
        
        emit ReputationUpdated(userAddress, oldScore, rep.score);
        emit MissionEvaluated(missionId, userAddress, success, rating);
    }
    
    /**
     * @dev Enregistre un litige pour un utilisateur
     * @param userAddress Adresse de l'utilisateur
     * @param missionId ID de la mission
     */
    function recordDispute(address userAddress, uint256 missionId) 
        external 
        onlyArbitrator 
        whenNotPaused 
    {
        Reputation storage rep = reputations[userAddress];
        uint256 oldScore = rep.score;
        
        rep.disputeCount++;
        
        // Pénaliser le score pour le litige
        rep.score = calculateScore(rep);
        rep.lastUpdated = block.timestamp;
        
        emit ReputationUpdated(userAddress, oldScore, rep.score);
        emit DisputeRecorded(userAddress, missionId);
    }
    
    /**
     * @dev Calcule le score de réputation basé sur les statistiques
     * @param rep Structure de réputation
     */
    function calculateScore(Reputation memory rep) 
        internal 
        pure 
        returns (uint256) 
    {
        if (rep.totalMissions == 0) {
            return 50; // Score par défaut pour les nouveaux utilisateurs
        }
        
        // Facteur de taux de réussite (40% du score)
        uint256 successRate = (rep.successfulMissions * 100) / rep.totalMissions;
        uint256 successScore = successRate * 40 / 100;
        
        // Facteur d'évaluation moyenne (30% du score)
        uint256 avgRating = rep.ratingCount > 0 ? (rep.totalRating / rep.ratingCount) : 3;
        uint256 ratingScore = (avgRating - 1) * 30 / 4; // Normalisé sur 0-30
        
        // Facteur de litiges (20% du score)
        uint256 disputeRate = rep.totalMissions > 0 ? (rep.disputeCount * 100) / rep.totalMissions : 0;
        uint256 disputeScore = disputeRate >= 20 ? 0 : (20 - disputeRate);
        
        // Facteur de volume de missions (10% du score)
        uint256 volumeScore = rep.totalMissions >= 10 ? 10 : (rep.totalMissions);
        
        // Score total (max 100)
        uint256 totalScore = successScore + ratingScore + disputeScore + volumeScore;
        
        return totalScore > 100 ? 100 : totalScore;
    }
    
    /**
     * @dev Calcule la caution requise basée sur la réputation
     * @param userAddress Adresse de l'utilisateur
     * @param missionAmount Montant de la mission
     */
    function calculateRequiredDeposit(address userAddress, uint256 missionAmount) 
        external 
        view 
        returns (uint256) 
    {
        uint256 score = reputations[userAddress].score;
        
        // Pourcentage de caution basé sur le score :
        // - Score 90-100: 5%
        // - Score 70-89: 10%
        // - Score 50-69: 15%
        // - Score < 50: 20%
        
        uint256 percentage;
        if (score >= 90) {
            percentage = 5;
        } else if (score >= 70) {
            percentage = 10;
        } else if (score >= 50) {
            percentage = 15;
        } else {
            percentage = 20;
        }
        
        return (missionAmount * percentage) / 100;
    }
    
    /**
     * @dev Vérifie si un utilisateur est éligible pour une mission
     * @param userAddress Adresse de l'utilisateur
     * @param requiredScore Score minimum requis
     */
    function isEligible(address userAddress, uint256 requiredScore) 
        external 
        view 
        returns (bool) 
    {
        return reputations[userAddress].score >= requiredScore;
    }
    
    /**
     * @dev Récupère les statistiques complètes d'un utilisateur
     * @param userAddress Adresse de l'utilisateur
     */
    function getUserStats(address userAddress) 
        external 
        view 
        returns (
            uint256 score,
            uint256 totalMissions,
            uint256 successfulMissions,
            uint256 failedMissions,
            uint256 averageRating,
            uint256 disputeCount,
            uint256 lastUpdated
        ) 
    {
        Reputation memory rep = reputations[userAddress];
        uint256 avgRating = rep.ratingCount > 0 ? (rep.totalRating / rep.ratingCount) : 0;
        
        return (
            rep.score,
            rep.totalMissions,
            rep.successfulMissions,
            rep.failedMissions,
            avgRating,
            rep.disputeCount,
            rep.lastUpdated
        );
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
