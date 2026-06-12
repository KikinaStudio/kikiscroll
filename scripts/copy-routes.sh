#!/bin/sh
# GitHub Pages a un statut 404 sur les routes SPA, donc les crawlers de
# social sharing (WhatsApp, iMessage, Facebook…) ignorent les og:image.
# On copie index.html (assets en chemins absolus /kikiscroll/) à chaque
# route pour servir un vrai 200.
set -e
cd "$(dirname "$0")/../dist"
for route in fr en leaflet wellness wellness/fr wellness/en; do
  mkdir -p "$route"
  cp index.html "$route/index.html"
done

# La page leaflet a son propre texte de partage.
LEAFLET_DESC="Sound is no longer a backdrop. It becomes care."
sed -i '' \
  -e "s|\(name=\"description\" content=\"\)[^\"]*|\1$LEAFLET_DESC|" \
  -e "s|\(property=\"og:description\" content=\"\)[^\"]*|\1$LEAFLET_DESC|" \
  -e "s|\(name=\"twitter:description\" content=\"\)[^\"]*|\1$LEAFLET_DESC|" \
  leaflet/index.html
