# Mise à jour des diagrammes — juillet 2026

Les sources Mermaid dans `rapport memoire/mermaid/` ont été alignées sur l’état actuel du projet.

## Fichiers mis à jour

| Fichier | Contenu actualisé |
|---------|-------------------|
| `01-contexte-c4.mmd` | Mobile, invites, cartographie |
| `02-conteneurs-c4.mmd` | Angular + Expo, Celery Beat |
| `03-composants-backend.mmd` | Apps réelles, Celery |
| `04-cas-utilisation*.mmd` | Sollicitation, Mes entreprises, email, 2FA, formulaire adaptatif |
| `06-etats-mission.mmd` | Auto-start, auto-validation 48h, expired, purge 30j |
| `07-sequence-creation-mission.mmd` | category_rules, sollicitation, auto-start |
| `08-sequence-execution.mmd` | Analyse preuves, auto-validation 48h |
| `09-activite-mission.mmd` | Flux global à jour |
| `10-deploiement.mmd` | Render + local + Sepolia |
| `11-architecture-hybride.mmd` | Mobile + Celery + category_rules |
| `diagramme_etats_mission.md` | Légende synchronisée |

## Comment régénérer les figures Word

1. Ouvrir https://mermaid.live
2. Coller le contenu d’un `.mmd`
3. Exporter PNG (largeur ≥ 1920 px)
4. Remplacer la figure correspondante dans `memoire_sanogo_corrige.docx`
5. Mettre à jour la légende (Figure 3.x)

Ou ouvrir `mermaid/index.html` si présent pour capturer plusieurs diagrammes.

## Nouveaux UC à citer dans le texte

- UC21 Vérification email  
- UC22 Sollicitation prestataire  
- UC23 Invitation multi-entreprises  
- UC24 Mes entreprises (accept / refus)  
- Formulaire mission adaptatif + estimation caution (`category_rules`)
