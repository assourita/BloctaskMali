# BlockTask Mobile (React Native / Expo)

Application mobile **React Native** (Expo) pour les **clients** et **prestataires** du marché malien BlockTask.

## Stack

- **Expo SDK 52** + **TypeScript** (compatible Expo Go)
- **Expo Router** (navigation fichier)
- API REST Django existante (`/api`)

## Fonctionnalités (MVP)

| Client | Prestataire |
|--------|-------------|
| Connexion / inscription | Connexion / inscription |
| Tableau de bord | Tableau de bord |
| Liste des missions créées | Missions assignées |
| Créer une mission | Missions disponibles (GPS) |
| Détail + valider / annuler | Postuler, caution, démarrer |
| Voir les preuves | **Upload photo** (caméra) + checklist |
| Notifications in-app | Partage GPS + notifications |
| Profil + changement de rôle | Profil + changement de rôle |

## Démarrage

### 1. Backend Django

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

> Utilisez `0.0.0.0` pour accepter les connexions depuis l'émulateur ou le téléphone.

### 2. App mobile

```bash
cd mobile
npm install
npm start
```

- **Android émulateur** : API par défaut `http://10.0.2.2:8000/api`
- **iOS simulateur** : `http://localhost:8000/api`
- **Téléphone physique** : créez `mobile/.env` :

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

(Remplacez par l'IP locale de votre PC.)

### 3. Tester

1. Installez **Expo Go** à jour depuis le Play Store / App Store (SDK 52)
2. Scannez le QR code affiché par `npm start`
3. Ou lancez `npm run android` / `npm run ios`

### Dépannage

| Erreur | Solution |
|--------|----------|
| « Project incompatible with Expo Go » | Projet en SDK **52** — mettez Expo Go à jour, ou relancez `npm install` |
| `assets/images` introuvable | Dossier créé sous `mobile/assets/images/` |
| API inaccessible sur téléphone | `EXPO_PUBLIC_API_URL=http://VOTRE_IP:8000/api` dans `mobile/.env` |
| Backend refuse la connexion | `python manage.py runserver 0.0.0.0:8000` |

## Structure

```
mobile/
├── app/                 # Écrans Expo Router
│   ├── (tabs)/          # Onglets accueil, missions, disponibles, profil
│   ├── mission/[id].tsx # Détail mission
│   ├── login.tsx
│   └── register.tsx
└── src/
    ├── api/             # Client HTTP + auth + missions
    ├── context/         # AuthContext
    └── components/      # UI réutilisable
```

## Notes

- Paiement Mobile Money complet : à finaliser via le web ou une prochaine itération mobile.
- KYC : consultation du statut dans le profil ; soumission documents = web pour l'instant.
- GPS : permission demandée pour les missions disponibles (prestataire).

## Build production

```bash
npx eas build --platform android
npx eas build --platform ios
```

(Compte Expo + configuration EAS requis.)
