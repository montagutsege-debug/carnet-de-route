#!/bin/bash
# Double-cliquez sur ce fichier dans le Finder pour lancer Carnet de Route sur Mac.

cd "$(dirname "$0")" || exit 1

echo ""
echo "=== Carnet de Route ==="
echo ""

# Le Terminal ouvert par un double-clic ne charge pas toujours le PATH complet.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# 1. Node.js est-il installé ?
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé sur ce Mac."
  echo "La page de téléchargement va s'ouvrir : prenez la version « LTS » pour macOS (.pkg),"
  echo "installez-la, puis double-cliquez à nouveau sur ce fichier."
  open "https://nodejs.org/fr/download"
  read -r -p "Appuyez sur Entrée pour fermer..."
  exit 1
fi

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Votre version de Node.js ($(node -v)) est trop ancienne. Installez la version LTS."
  open "https://nodejs.org/fr/download"
  read -r -p "Appuyez sur Entrée pour fermer..."
  exit 1
fi

# 2. Installation des dépendances (la première fois seulement)
if [ ! -d node_modules ]; then
  echo "Première installation, cela peut prendre une à deux minutes..."
  npm install || { read -r -p "L'installation a échoué. Entrée pour fermer..."; exit 1; }
fi

# 3. Clé Gemini (facultative, pour les suggestions autour d'une étape)
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "Collez votre clé Gemini puis appuyez sur Entrée"
  echo "(ou appuyez directement sur Entrée pour vous en passer) :"
  read -r GEMINI_KEY
  if [ -n "$GEMINI_KEY" ]; then
    sed -i '' "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=\"$GEMINI_KEY\"|" .env.local
  fi
fi

# 4. Démarre l'application ; le navigateur s'ouvre tout seul sur la bonne adresse
echo ""
echo "Démarrage... le navigateur va s'ouvrir automatiquement."
echo "Laissez cette fenêtre ouverte pendant l'utilisation. Fermez-la pour arrêter l'application."
echo ""
OPEN_BROWSER=1 npm run dev
