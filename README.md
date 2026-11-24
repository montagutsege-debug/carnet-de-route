# Carnet de Route

Carnet de voyage à compléter : 50 fiches doubles (aire de camping et étape à gauche, visites et rencontres à droite), carte des étapes, check-liste de départ et répertoire des rencontres.

- Plusieurs carnets (un par voyage), jusqu'à 8 photos par fiche.
- Bilan du voyage : nuits, kilomètres, budget, types d'étapes, régions.
- Export PDF du carnet complet (couverture, bilan, une page par fiche).
- Installable sur iPhone, iPad et Android, utilisable hors connexion.

Stack : React 19, Vite 8, Tailwind CSS 4, Leaflet, serveur Express (`server.ts`).

## Sur Mac (iMac, MacBook)

1. Installez Node.js (version « LTS », fichier .pkg) depuis https://nodejs.org/fr/download.
2. Téléchargez le projet : bouton vert **Code → Download ZIP** sur GitHub, puis double-cliquez sur le zip.
3. Dans le dossier, double-cliquez sur **Lancer Carnet de Route.command**.
   La première fois, macOS peut le bloquer : faites clic droit → **Ouvrir** → **Ouvrir**.
4. L'application s'ouvre dans votre navigateur. Gardez la fenêtre du Terminal ouverte pendant l'utilisation.

## Application Mac (Xcode)

Le dossier `mac/` contient une vraie application Mac « Carnet de Route » (macOS 13 ou plus récent).

1. Ouvrez `mac/CarnetDeRoute.xcodeproj` (double-clic) : Xcode s'ouvre.
2. Cliquez sur ▶︎ (ou Cmd+R). L'application se construit et s'ouvre. Aucun compte Apple payant n'est nécessaire.
3. Pour la garder : dans Xcode, panneau de gauche, dossier **Products**, clic droit sur **Carnet de Route.app** → **Show in Finder**, puis glissez l'app dans **Applications**.

À savoir :
- Le carnet de l'application Mac est séparé de celui du navigateur. Pour y reprendre vos fiches : **Sauvegarder (.json)** dans le navigateur, puis **Restaurer** dans l'application Mac.
- Suggestions « aux alentours » : indiquez l'adresse de votre appli en ligne (Vercel) dans `mac/CarnetDeRoute/AppConfig.swift`, puis relancez avec ▶︎.
- Après une modification de l'appli web, mettez à jour la copie embarquée avec `npm run build:mac`, puis ▶︎ dans Xcode.

## Lancer en local (ligne de commande)

Prérequis : Node.js 20 ou plus.

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés
npm run dev                  # http://127.0.0.1:5180
```

## Configuration (`.env.local`)

- `GEMINI_API_KEY` : suggestions « aux alentours » d'une étape (visites, randos, bonnes adresses). Fonctionne avec l'offre gratuite de Gemini. Le serveur essaie plusieurs modèles à la suite si l'un est surchargé (liste modifiable avec `GEMINI_MODELS`).
- `GEMINI_MAPS_GROUNDING` : `"true"` pour faire vérifier les lieux par Google Maps. Nécessite la facturation Google, donc désactivé par défaut. Sans cette option, vérifiez les adresses proposées.

La carte des étapes utilise OpenStreetMap (Leaflet) : gratuite, sans clé.

Sans clé Gemini, tout le reste de l'application fonctionne. Les données sont enregistrées dans le navigateur (localStorage) et peuvent être exportées ou restaurées en JSON.

## Production

```bash
npm run build
NODE_ENV=production npx tsx server.ts
```
