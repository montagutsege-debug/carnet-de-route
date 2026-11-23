# Carnet de Route

Carnet de voyage à compléter : 50 fiches doubles (aire de camping et étape à gauche, visites et rencontres à droite), carte des étapes, check-liste de départ et répertoire des rencontres.

Stack : React 19, Vite 8, Tailwind CSS 4, Leaflet, serveur Express (`server.ts`).

## Sur Mac (iMac, MacBook)

1. Installez Node.js (version « LTS », fichier .pkg) depuis https://nodejs.org/fr/download.
2. Téléchargez le projet : bouton vert **Code → Download ZIP** sur GitHub, puis double-cliquez sur le zip.
3. Dans le dossier, double-cliquez sur **Lancer Carnet de Route.command**.
   La première fois, macOS peut le bloquer : faites clic droit → **Ouvrir** → **Ouvrir**.
4. L'application s'ouvre dans votre navigateur. Gardez la fenêtre du Terminal ouverte pendant l'utilisation.

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
