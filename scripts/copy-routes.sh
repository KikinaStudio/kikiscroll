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

# set_meta <fichier> <champ> <valeur> — champ: title|description|image
set_meta() {
  f=$1; field=$2; value=$3
  case "$field" in
    title)
      sed -e "s|<title>[^<]*</title>|<title>$value</title>|" \
          -e "s|\(property=\"og:title\" content=\"\)[^\"]*|\1$value|" \
          -e "s|\(name=\"twitter:title\" content=\"\)[^\"]*|\1$value|" "$f" ;;
    description)
      sed -e "s|\(name=\"description\" content=\"\)[^\"]*|\1$value|" \
          -e "s|\(property=\"og:description\" content=\"\)[^\"]*|\1$value|" \
          -e "s|\(name=\"twitter:description\" content=\"\)[^\"]*|\1$value|" "$f" ;;
    image)
      sed -e "s|\(property=\"og:image\" content=\"\)[^\"]*|\1$value|" \
          -e "s|\(name=\"twitter:image\" content=\"\)[^\"]*|\1$value|" "$f" ;;
  esac > "$f.tmp" && mv "$f.tmp" "$f"
}

# La page leaflet a son propre titre et texte de partage.
set_meta leaflet/index.html title "Kikina⎜Sound as Care"
set_meta leaflet/index.html description "Sound is no longer a backdrop. It becomes care."
set_meta leaflet/index.html image "https://kikinastudio.github.io/kikiscroll/og-leaflet.jpg"

# Les pages wellness ont leur propre titre et image.
for route in wellness wellness/fr wellness/en; do
  set_meta "$route/index.html" title "Kikina⎜Experience the living Sound"
  set_meta "$route/index.html" image "https://kikinastudio.github.io/kikiscroll/og-wellness.jpg"
done
