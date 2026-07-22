# Diagramme d'états — Cycle de vie d'une mission BlockTask

```mermaid
stateDiagram-v2
    [*] --> pending : Création

    pending --> funded : Paiement escrow
    pending --> cancelled : Annulation client
    pending --> expired : Échéance sans paiement

    funded --> applied : Candidature prestataire
    funded --> cancelled : Annulation client
    funded --> expired : Échéance sans candidature acceptée

    applied --> accepted : Client accepte candidature
    applied --> funded : Client refuse candidature

    accepted --> deposit_pending : Délai de caution déclenché

    deposit_pending --> in_progress : Caution payée
    deposit_pending --> funded : Caution non payée (4h)

    in_progress --> submitted : Soumission des preuves
    in_progress --> disputed : Litige client/prestataire
    in_progress --> cancelled : Annulation mutuelle

    submitted --> completed : Validation client
    submitted --> disputed : Rejet client / contestation
    submitted --> refunded : Remboursement client

    disputed --> completed : Arbitrage admin valide
    disputed --> refunded : Arbitrage admin rembourse
    disputed --> cancelled : Accord / annulation

    completed --> [*] : Mission clôturée
    refunded --> [*] : Remboursement effectué
    cancelled --> [*] : Mission annulée
    expired --> [*] : Mission expirée

    note right of pending
        Mission créée par le client.
        En attente de paiement escrow.
    end note

    note right of funded
        Fonds bloqués en escrow.
        Prestataires peuvent postuler.
    end note

    note right of accepted
        Prestataire assigné.
        Délai de 4h pour payer la caution.
    end note

    note right of in_progress
        Mission en cours d'exécution.
        Suivi GPS et preuves actifs.
    end note

    note right of submitted
        Preuves soumises.
        En attente de validation client.
    end note

    note right of disputed
        Litige ouvert.
        Arbitrage administrateur.
    end note

    note right of completed
        Fonds libérés (95% prestataire, 5% plateforme).
    end note
```

## Légende

- **pending** : Mission créée, en attente de paiement.
- **funded** : Paiement escrow confirmé, mission ouverte aux candidatures.
- **applied** : Au moins une candidature en attente de décision.
- **accepted** : Prestataire choisi par le client.
- **deposit_pending** : Délai de 4 heures pour payer la caution.
- **in_progress** : Mission démarrée et en cours d'exécution.
- **submitted** : Preuves soumises par le prestataire.
- **completed** : Mission validée et payée.
- **disputed** : Litige en cours d'arbitrage.
- **cancelled** : Mission annulée par l'une ou l'autre des parties.
- **expired** : Mission non exécutée dans les délais.
- **refunded** : Fonds remboursés au client.
