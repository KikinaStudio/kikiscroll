#!/bin/sh
# GitHub Pages a un statut 404 sur les routes SPA, donc les crawlers de
# social sharing (WhatsApp, iMessage, Facebook…) ignorent les og:image.
# On copie index.html (assets en chemins absolus /kikiscroll/) à chaque
# route pour servir un vrai 200.
set -e
cd "$(dirname "$0")/../dist"
for route in fr en leaflet leaflet2 events hotels wellness wellness/fr wellness/en; do
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

# La page events a son propre titre et texte de partage (image OG par défaut
# tant qu'un visuel dédié n'existe pas).
set_meta events/index.html title "Kikina⎜Le son qui marque les esprits"
set_meta events/index.html description "Le son ne décore pas votre soirée. Il décide ce qu'on en retiendra."

# La page leaflet2 (deck événementiel FR — clone du leaflet wellness).
set_meta leaflet2/index.html title "Kikina⎜Le son qui marque les esprits"
set_meta leaflet2/index.html description "Le son n'est plus un fond. Il devient un outil."

# La page hotels (paysage sonore pour l'hôtellerie de luxe — FR).
set_meta hotels/index.html title "Kikina⎜Le son, dernière couche du bien-être hôtelier"
set_meta hotels/index.html description "Tout l'hôtel a été conçu pour le bien-être, sauf le son. Un paysage sonore génératif et neuro-informé, calibré espace par espace."

# Les pages wellness ont leur propre titre et image.
for route in wellness wellness/fr wellness/en; do
  set_meta "$route/index.html" title "Kikina⎜Experience the living Sound"
  set_meta "$route/index.html" image "https://kikinastudio.github.io/kikiscroll/og-wellness.jpg"
done
