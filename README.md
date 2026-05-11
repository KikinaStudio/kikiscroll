# Kikiscroll — Expérience sonore Kikina Lab

Site de démonstration scroll-driven pour **Kikina Lab**, décliné en **deux variantes** qui partagent 100 % du code et diffèrent uniquement par leurs textes, leurs assets visuels et leurs pistes audio :

- **Retail** — pour les boutiques, marques et lieux événementiels. URL : `/kikiscroll/<lang>`
- **Wellness** — pour les spas, instituts et centres de soin. URL : `/kikiscroll/wellness/<lang>`

Chacune se décline en français et en anglais (`fr` / `en`), soit 4 URLs au total. L'expérience reste la même : une narration scrollytelling en 6 sections, blob 3D Three.js, audio multi-pistes Howler.js, détection d'émotion par webcam (face-api.js), transition « nuit → aube » vers un footer de contact.

| URL live | Variante | Langue |
|---|---|---|
| https://kikinastudio.github.io/kikiscroll/fr | Retail | FR |
| https://kikinastudio.github.io/kikiscroll/en | Retail | EN |
| https://kikinastudio.github.io/kikiscroll/wellness/fr | Wellness | FR |
| https://kikinastudio.github.io/kikiscroll/wellness/en | Wellness | EN |

---

## Vue d’ensemble

- **Objectif** : Présenter l'offre Kikina Lab (son vivant, neuroscience, storytelling) via une expérience immersive pilotée par le scroll, en l'adaptant au contexte d'usage du prospect (retail ou wellness).
- **Stack** : React 18, Vite, Tailwind CSS, GSAP + ScrollTrigger, Lenis (smooth scroll), Three.js (R3F), Howler.js, face-api.js, Zustand.
- **Contenu** : Textes traduits par variante × langue dans `src/translations/`, apparition progressive par « parties » (3 par section), bouton « Lancer l'expérience » qui débloque le scroll et l'audio.

---

## Variantes retail / wellness

Le mode (retail ou wellness) est résolu **une seule fois au chargement** depuis l'URL, puis stocké dans un React Context (`ModeContext`). Le `useTranslation()` hook lit le mode + la langue pour servir le bon objet de traduction. L'audio store et l'image panoramique de la section 2 deviennent mode-aware via le même mécanisme.

**Ce qui change entre les deux variantes** :
- Les textes (titres, paragraphes, libellés UI, footer) — voir `src/translations/retail.js` et `src/translations/wellness.js`
- Les noms de zones section 2 : Entrée / Rayon / Espace équipe (retail) vs Accueil / Cabine de soin / Espace praticien (wellness)
- L'image panoramique de fond section 2 : `public/IMAGES/retail_panorama.jpg` vs `wellness_panorama.jpg`
- Les pistes audio « de zone » section 2 (`entrance`, `rayon`, `cabine` dans le store)

**Statut wellness** : sous-page en ligne, contenu rédactionnel finalisé. L'image panoramique et la majorité des pistes audio sont des **placeholders pointant vers les assets retail** en attendant la production des assets définitifs. Chaque ligne à remplacer est marquée `// TODO` dans [src/store/useAudioStore.js](src/store/useAudioStore.js). Brief de production : [docs/wellness-assets-brief.md](docs/wellness-assets-brief.md).

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
│   ├── models/                    # Modèles face-api.js (détection visage)
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

### Pistes audio (`public/MUSIC/`)

- **Drone** : `0 Drone.mp3` (volume initial 0.5)
- **Stems densité** : `1 Strings.mp3`, `2 Bass.mp3`, `3 Drums.mp3`, `4 Keyboard.mp3`
- **Environnements** : `Jungle.mp3`, `Pulsating Wave.mp3`, `Focus Cognitif.mp3`
- **Autres** : `Crowd.mp3`, `HAPPY.mp3`, `SAD.mp3`

---

## Les 5 sections (ordre et comportement)

| Section | Titre | Comportement principal |
|--------|--------|-------------------------|
| 0 | Un lieu a une âme. | Intro : drone seul, bouton « Lancer l’expérience », texte en 3 parties au scroll. Bloc centré en hauteur puis remonte. |
| 1 | Elle s'entend. | Foule (Crowd) + toggle isolation à ~40 % du scroll (volume foule → 5 %). Blob : agité → calme bleu. |
| 2 | Elle se ressent. | Crossfade Jungle → Pulsating Wave → Focus Cognitif. 3 icônes : Relaxation, Régulation émotionnelle, Focus cognitif. |
| 3 | Elle vit avec vous. | Webcam + face-api.js : sourire → HAPPY, neutre → SAD. Bouton « Autoriser la caméra ». |
| 4 | Et grandit avec vous. | 5 couches sonores (drone + 4 stems), 5 blobs en pentagone. Compteur « couches sonores » (chiffre gros + label petit). Scroll long (3.5× hauteur écran). |

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
- **Face-api.js** : Modèles dans `public/models/`, chargés via `BASE_URL + 'models'`. Détection au même rythme que les mises à jour d’émotion (ex. 500 ms). Pas d’envoi d’images à un serveur (RGPD).

---

## Handover : déploiement et maintenance

### Déploiement (ex. Vercel / Netlify)

- Build : `npm run build` (sortie dans `dist/`).
- Pas de variables d’environnement obligatoires pour le build. Les pistes et modèles sont servis depuis `public/`.
- Vérifier que la base URL est correcte si le site est en sous‑chemin (pour `face-api.js` et éventuels assets).

### Modifier les textes

- Tous les textes du parcours sont dans `src/translations/retail.js` et `src/translations/wellness.js`, structurés par langue (`fr`, `en`) et par clé (`s0_title`, `s0_p1`, etc.). Modifier uniquement ces valeurs pour garder le comportement d'apparition progressive.
- Les deux fichiers de traductions doivent partager **strictement les mêmes clés** ; si une clé manque dans wellness, l'app crashera côté wellness. Ajouter une clé dans les 4 emplacements (retail.fr, retail.en, wellness.fr, wellness.en) lors d'ajouts.
- L'objet `sectionsData` dans `src/App.jsx` consomme ces traductions via `useTranslation()` (helper `getSectionsData(t)`).

### Ajouter / remplacer une piste audio

- Fichier dans `public/MUSIC/` (ou `public/MUSIC/wellness/` pour une piste spécifique au mode wellness).
- Référence dans `src/store/useAudioStore.js` : ajouter ou modifier une entrée dans `RETAIL_TRACKS` ET/OU `WELLNESS_TRACKS` selon le scope. Si la clé doit exister dans les deux modes, mettre à jour les deux objets.
- Si la piste ne doit pas rester en fond (comme le drone), l'ajouter dans `NON_DRONE_TRACKS` dans `App.jsx` (strings, bass, drums, keyboard, crowd, jungle, pulsatingWave, focusCognitif, happy, sad) pour qu'elle soit coupée à chaque changement de section. Adapter ensuite `useScrollAudio` et les callbacks ScrollTrigger (`onEnter` / `onLeave`) selon la section.
- Pour le détail des assets wellness à produire / remplacer, voir [docs/wellness-assets-brief.md](docs/wellness-assets-brief.md).

### Contacts et liens

- **Contact site** : bianca@kikinastudio.com (mailto, non affiché).
- **Qui sommes-nous** : https://kikinalab.com
- **LinkedIn** : https://www.linkedin.com/company/kikinastudio/
- **Mentions légales** : panneau dépliant dans le footer (éditeur, siège, hébergement, note face-api.js).

### Lint / format

- `npm run lint` : ESLint (React, hooks, jsx-a11y, Prettier désactivé pour les conflits).
- `npm run format` : Prettier sur `src/**/*.{js,jsx,css,md}`.

---

## Licence et crédits

Projet privé Kikina Lab.  
Pistes audio et visuels : droits réservés.  
Face-api.js, Lenis, GSAP, Three.js, Howler, etc. : voir les licences des paquets npm respectifs.
