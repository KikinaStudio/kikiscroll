# Kikiscroll — Expérience sonore Kikina Lab

Site de démonstration scroll-driven pour **Kikina Lab**, décliné en **deux variantes** qui partagent 100 % du code et diffèrent uniquement par leurs textes, leurs assets visuels et leurs pistes audio :

- **Retail** — pour les boutiques, marques et lieux événementiels. URL : `/kikiscroll/<lang>`
- **Wellness** — pour les spas, instituts et centres de soin. URL : `/kikiscroll/wellness/<lang>`

Chacune se décline en français et en anglais (`fr` / `en`), soit 4 URLs au total. L'expérience reste la même : une narration scrollytelling en 6 sections, blob 3D Three.js, audio multi-pistes Howler.js, détection de mouvement par webcam (canvas + frame-diff, sans librairie), transition « nuit → aube » vers un footer de contact.

| URL live | Variante | Langue |
|---|---|---|
| https://kikinastudio.github.io/kikiscroll/fr | Retail | FR |
| https://kikinastudio.github.io/kikiscroll/en | Retail | EN |
| https://kikinastudio.github.io/kikiscroll/wellness/fr | Wellness | FR |
| https://kikinastudio.github.io/kikiscroll/wellness/en | Wellness | EN |

---

## Vue d’ensemble

- **Objectif** : Présenter l'offre Kikina Lab (son vivant, neuroscience, storytelling) via une expérience immersive pilotée par le scroll, en l'adaptant au contexte d'usage du prospect (retail ou wellness).
- **Stack** : React 18, Vite, Tailwind CSS, GSAP + ScrollTrigger, Lenis (smooth scroll), Three.js (R3F), Howler.js, Zustand. Détection de mouvement webcam en JS pur (frame-diff sur canvas 64×48, aucune librairie).
- **Contenu** : Textes traduits par variante × langue dans `src/translations/`, apparition progressive par « parties » (3 par section), bouton « Lancer l'expérience » qui débloque le scroll et l'audio.

---

## Variantes retail / wellness

Le mode (retail ou wellness) est résolu **une seule fois au chargement** depuis l'URL, puis stocké dans un React Context (`ModeContext`). Le `useTranslation()` hook lit le mode + la langue pour servir le bon objet de traduction. L'audio store et l'image panoramique de la section 2 deviennent mode-aware via le même mécanisme.

**Ce qui change entre les deux variantes** :
- Les textes (titres, paragraphes, libellés UI, footer) — voir `src/translations/retail.js` et `src/translations/wellness.js`
- Les noms de zones section 2 : Entrée / Rayon / Espace équipe (retail) vs Accueil / Cabine de soin / Espace praticien (wellness)
- L'image panoramique de fond section 2 : `public/IMAGES/retail_panorama.jpg` vs `wellness_panorama.jpg`
- Les pistes audio « de zone » section 2 (`entrance`, `rayon`, `cabine` dans le store)

**Statut wellness** : sous-page en ligne, contenu rédactionnel finalisé. **9 pistes audio bespoke** livrées (drone, neuro ×3, zones ×4, pad section 4), toutes **normalisées à -18 LUFS et levelées** sur disque ; seuls les stems de la section finale (5-instrument build) et la nappe `crowd` restent retail (trimés en code). L'image panoramique de la section 2 utilise les 4 visuels `wellness_zone_*.jpg`. Détails audio : [docs/session-handoff.md](docs/session-handoff.md) → « Architecture audio » ; pièges techniques : [AI_LEARNINGS.md](AI_LEARNINGS.md).

**Documentation détaillée** :
- [docs/wellness-assets-brief.md](docs/wellness-assets-brief.md) — spec image + musiques à commissionner (dimensions, ambiance, niveau de mix, références)
- [docs/wellness-dev-handoff.md](docs/wellness-dev-handoff.md) — architecture mode-aware, flow de routage, edge cases, recette pour ajouter un 3ème mode

---

## Démarrage rapide

```bash
npm install
npm run dev
```

- **Build** : `npm run build`
- **Preview build** : `npm run preview`
- **Lint** : `npm run lint`
- **Format** : `npm run format`

---

## Structure du projet

```
Kikiscroll/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .eslintrc.cjs
├── .prettierrc
├── docs/
│   ├── wellness-assets-brief.md   # Brief de production des assets wellness
│   └── wellness-dev-handoff.md    # Spec technique de la sous-page wellness
├── public/
│   ├── favicon.png                # Favicon Kikina (K + flèche)
│   ├── logo-kikina.png            # Logo PNG (footer)
│   ├── IMAGES/
│   │   ├── retail_panorama.jpg    # Panorama 3 zones retail (section 2)
│   │   └── wellness_panorama.jpg  # Panorama 3 zones wellness (placeholder)
│   ├── MUSIC/                     # Pistes audio (voir liste ci-dessous)
│   └── Fonts/
└── src/
    ├── main.jsx                   # Parse l'URL, monte ModeProvider + LanguageProvider
    ├── App.jsx                    # Orchestration scroll, sections, audio, UI
    ├── index.css                  # Tailwind + grain overlay + animations
    ├── urlMode.js                 # parseUrlMode() — source unique du parsing URL
    ├── ModeContext.jsx            # React Context du mode (retail | wellness)
    ├── LanguageContext.jsx        # React Context de la langue, hook useTranslation
    ├── translations/
    │   ├── index.js               # Bundle { retail, wellness }
    │   ├── retail.js              # FR + EN retail
    │   └── wellness.js            # FR + EN wellness
    ├── store/
    │   └── useAudioStore.js       # Howler, RETAIL_TRACKS + WELLNESS_TRACKS mode-aware
    └── components/
        ├── Scene.jsx              # Canvas R3F, blobs, caméra, post-process
        ├── GrainVignette.jsx
        ├── GrainVignetteEffect.js
        └── Overlay.jsx
```

### Pistes audio

**Retail (`public/MUSIC/`)**

- **Drone** : `0 Drone.mp3` (volume initial 0.5)
- **Stems densité (5-instruments)** : `1 Strings.mp3`, `2 Bass.mp3`, `3 Drums.mp3`, `4 Keyboard.mp3`
- **Environnements** : `Jungle.mp3`, `Pulsating Wave.mp3`, `Focus Cognitif.mp3`
- **Autres** : `Crowd.mp3`
- `HAPPY.mp3` et `SAD.mp3` restent sur disque mais ne sont plus câblés (la section caméra est désormais pilotée par le mouvement, pas l'émotion).

**Wellness (`public/MUSIC/wellness/`)** — priorise les pistes wellness sur les pistes retail partout, sauf pour les 4 stems de la section finale (5-instrument build) qui restent retail. Le drone wellness `01 Drone Wellness.mp3` remplace `0 Drone.mp3` partout en mode wellness, y compris pendant le 5-instrument finale.

| Slot | Fichier wellness | Section |
|---|---|---|
| `drone` | `01 Drone Wellness.mp3` | base continue |
| `entrance` | `keysy.mp3` | section 2 (accueil) |
| `rayon` | `deep.mp3` | section 2 (soin) |
| `cabine` | `less deep.mp3` | section 2 (chaleur) |
| `recuperation` | `Instrumental (2).mp3` | section 2 (récupération) |
| `jungle` | `flute guerlain.mp3` | section 3 (somatic release) |
| `pulsatingWave` | `roulements de piano.mp3` | section 3 (régulation) |
| `focusCognitif` | `ceremonial fusion voices.mp3` | section 3 (focus) |
| `motionPad` | `Fender.mp3` | section 4 (bed ambiant sous le mouvement, vol 0.32) |
| `crowd` | retail `Crowd.mp3` | section 1 (pas d'équivalent wellness) |

> Les 9 fichiers wellness sont **normalisés à -18 LUFS + levelés** (LRA ~5-7) sur disque ; originaux pristine dans `.audio-backup/` (gitignored). Voir [docs/session-handoff.md](docs/session-handoff.md) → « Architecture audio ».

---

## Les 5 sections (ordre et comportement)

| Section | Titre | Comportement principal |
|--------|--------|-------------------------|
| 0 | Un lieu a une âme. | Intro : drone seul, bouton « Lancer l’expérience », texte en 3 parties au scroll. Bloc centré en hauteur puis remonte. |
| 1 | Elle s'entend. | Foule (Crowd) + toggle isolation à ~40 % du scroll (volume foule → 5 %). Blob : agité → calme bleu. |
| 2 | Elle se ressent. | Crossfade Jungle → Pulsating Wave → Focus Cognitif. 3 icônes : Relaxation, Régulation émotionnelle, Focus cognitif. |
| 3 | Elle vit avec vous (wellness : avant-dernière) | 5 couches sonores (drone + 4 stems), 5 blobs en pentagone. Wellness : la section finit l'avant-dernier acte avant le finale caméra. |
| 4 | Et grandit avec vous (wellness : finale) | Webcam + détection de mouvement JS pur (canvas 64×48, frame-diff avec rejet de l'auto-exposition). `motionIntensity` pilote **une seule** couche (`strings`) au-dessus d'un pad ambiant continu (`motionPad`) ; lissage asymétrique + gate. Meter de mouvement live + instructions sous le bouton « Autoriser la caméra ». |

Après les sections : transition « aube » (dégradé noir → #f5f3f0) + footer (liens, formulaire mailto, mentions légales dépliantes).

---

## Préférences et conventions (handover)

- **Langue** : Réponses et commentaires utiles en français quand c’est pertinent.
- **Typo** : Pas d’em dash (—) dans les textes visibles ; préférer virgules ou tirets courts. Titre onglet avec tiret court : « Kikina Lab - Sound Experience ».
- **UI** : Logo Kikina en SVG inline, haut gauche, `mix-blend-difference` pour inversion noir/blanc selon le fond. Mute en haut à droite. Même style de « label » (10px, uppercase, tracking-widest) pour « Relaxation », « Régulation émotionnelle », « Focus cognitif » et « couches sonores ».
- **Footer** : Liens « Qui sommes-nous » (kikinalab.com), « Mentions légales » (panneau dépliant), « LinkedIn » (page entreprise Kikina). Formulaire contact → `mailto:bianca@kikinastudio.com` (ne pas afficher l’email). Favicon : Favicon_Kikina_Noir (K + flèche).
- **Audio** : Une seule section « audible » à la fois : au changement de section, toutes les pistes non‑drone sont coupées (fade 300 ms) avant d’appliquer la logique de la nouvelle section.
- **Densité** : 5 couches (drone compte comme 1), 5 blobs ; libellé « couches sonores » avec chiffre mis en avant, label en dessous.

---

## Erreurs rencontrées et corrections

1. **Email contact mal orthographié**  
   - **Erreur** : `bianca@kikinastiudio.com` (typo « st »).  
   - **Correction** : Remplacé par `bianca@kikinastudio.com` dans le `mailto` du formulaire et dans les mentions légales.

2. **Grain overlay trop fort**  
   - **Erreur** : Opacité du grain à 0.35 après passage au fond #0a0a0a, rendu trop bruité.  
   - **Correction** : Opacité réduite à 0.12 dans `.grain-overlay` (`index.css`).

3. **Confusion compteur section 4**  
   - **Erreur** : Afficher « X / 4 couches » ou des points + noms de pistes alors que le besoin était « couches sonores » avec un chiffre (1–5) bien mis en avant et le label en petit en dessous.  
   - **Correction** : Un seul bloc avec chiffre en grand (`text-3xl md:text-4xl`) et sous lui le texte « couches sonores » en style label (10px, uppercase, tracking-widest).

4. **Section 0 : tout le paragraphe apparaissait d’un coup**  
   - **Erreur** : La première « partie » contenait tout le premier paragraphe (citation Coppola + boutiques/événements).  
   - **Correction** : Découpage en 3 parties dans `sectionsData[0].paragrapheParts` : 1) Citation Coppola seule ; 2) Boutiques/événements ; 3) Cinéma + « Nous faisons la même chose… ».

5. **Logo / mute : positions inversées ou incohérentes**  
   - **Erreur** : Logo à droite, mute en bas à droite selon une itération.  
   - **Correction** : Logo en haut à gauche (`left-8` / `md:left-[8vw]`), mute en haut à droite (`right-8` / `md:right-[8vw]`), alignés avec la marge du contenu (8vw).

6. **ESLint : plugin manquant**  
   - **Erreur** : `.eslintrc.cjs` référence `plugins: ['react-refresh']` ; si le plugin n’est pas installé, `npm run lint` échoue.  
   - **Correction** : Installer `eslint-plugin-react-refresh` en devDependency (`npm i -D eslint-plugin-react-refresh`), ou retirer la ligne `plugins: ['react-refresh']` et la règle associée dans la config.

---

## Apprentissages techniques

- **ScrollTrigger + Lenis** : Les sections sont en `pin` avec une `end` en `+= (window.innerHeight * facteur)`. La section 4 utilise un facteur plus grand (3.5) pour étirer le scroll des couches sonores.
- **Audio par section** : Un `useEffect` qui réagit à `activeSection` fait un fade out de toutes les pistes non‑drone à chaque changement de section ; `useScrollAudio` applique ensuite les volumes de la section active. Évite les résidus sonores en remontant.
- **Texte progressif** : Chaque section a `paragrapheParts` (tableau de 3 strings). Le rendu utilise `sectionProgress` et des seuils (0, 0.33, 0.66) pour l’opacité de chaque partie (formule du type `(sectionProgress - partThreshold) / 0.15`).
- **Logo inversé** : SVG en `fill="currentColor"` + `mix-blend-difference` sur le header + `text-white` : le logo reste lisible sur fond sombre et s’inverse sur fond clair (ex. footer).
- **Détection de mouvement webcam** : implémentée à la main dans `src/App.jsx` (`useMotionDetection`). Le flux vidéo est dessiné dans un canvas caché 64×48 (= 3072 pixels) à chaque tick de `requestAnimationFrame`, puis frame-diff de luminance en **deux passes** : (1) on soustrait la variation moyenne de toute la frame pour rejeter l'auto-exposition / balance des blancs du webcam (sinon lue comme un gros mouvement aléatoire) ; (2) on compte la **fraction de pixels en mouvement** (plus stable qu'une somme de diffs). Résultat lissé asymétriquement (montée rapide, descente lente) + gate, puis envoyé au store audio (couche `strings`). Pas d'envoi réseau, aucune librairie ni modèle ML. Détails et pièges : [AI_LEARNINGS.md](AI_LEARNINGS.md).
- **Rendu ASCII** : la même frame est repassée à `pixelsToAscii()` (palette à 10 caractères, `' .:-=+*#%@'`) et affichée dans un `<pre>` monospace pendant la section finale wellness. Le blob 3D est masqué via la prop `hideMainBlob` de `<Scene>` pour laisser la place à la vue caractères.

---

## Handover : déploiement et maintenance

### Déploiement (ex. Vercel / Netlify)

- Build : `npm run build` (sortie dans `dist/`).
- Pas de variables d'environnement obligatoires pour le build. Les pistes audio sont servies depuis `public/MUSIC/`.
- Vérifier que la base URL est correcte si le site est en sous-chemin (pour les assets et les pistes audio).

### Modifier les textes

- Tous les textes du parcours sont dans `src/translations/retail.js` et `src/translations/wellness.js`, structurés par langue (`fr`, `en`) et par clé (`s0_title`, `s0_p1`, etc.). Modifier uniquement ces valeurs pour garder le comportement d'apparition progressive.
- Les deux fichiers de traductions doivent partager **strictement les mêmes clés** ; si une clé manque dans wellness, l'app crashera côté wellness. Ajouter une clé dans les 4 emplacements (retail.fr, retail.en, wellness.fr, wellness.en) lors d'ajouts.
- L'objet `sectionsData` dans `src/App.jsx` consomme ces traductions via `useTranslation()` (helper `getSectionsData(t)`).

### Ajouter / remplacer une piste audio

- Fichier dans `public/MUSIC/` (ou `public/MUSIC/wellness/` pour une piste spécifique au mode wellness).
- Référence dans `src/store/useAudioStore.js` : ajouter ou modifier une entrée dans `RETAIL_TRACKS` ET/OU `WELLNESS_TRACKS` selon le scope. Si la clé doit exister dans les deux modes, mettre à jour les deux objets.
- Si la piste ne doit pas rester en fond (comme le drone), l'ajouter dans `NON_DRONE_TRACKS` dans `App.jsx` pour qu'elle soit coupée à chaque changement de section. Adapter ensuite `useScrollAudio` et les callbacks ScrollTrigger (`onEnter` / `onLeave`) selon la section.
- Pour le détail des assets wellness à produire / remplacer, voir [docs/wellness-assets-brief.md](docs/wellness-assets-brief.md).

### Contacts et liens

- **Contact site** : bianca@kikinastudio.com (mailto, non affiché).
- **Qui sommes-nous** : https://kikinalab.com
- **LinkedIn** : https://www.linkedin.com/company/kikinastudio/
- **Mentions légales** : panneau dépliant dans le footer (éditeur, siège, hébergement, note RGPD sur la détection de mouvement webcam locale).

### Lint / format

- `npm run lint` : ESLint (React, hooks, jsx-a11y, Prettier désactivé pour les conflits).
- `npm run format` : Prettier sur `src/**/*.{js,jsx,css,md}`.

---

## Licence et crédits

Projet privé Kikina Lab.  
Pistes audio et visuels : droits réservés.  
Face-api.js, Lenis, GSAP, Three.js, Howler, etc. : voir les licences des paquets npm respectifs.
