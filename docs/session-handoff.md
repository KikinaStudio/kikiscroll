# Session Handoff — Kikiscroll Wellness

> Document destiné à une **autre session Claude Code** qui reprend ce projet sans contexte. Lis ce fichier **avant** d'agir. Il décrit l'état actuel du repo (pas l'historique). Pour l'historique, voir `git log`.

Dernière mise à jour : **2026-05-19** (après pistes audio bespoke, drone-only intro, caption sync, line breaks, swap rooms 2↔3)

---

## TL;DR (30 secondes)

1. Le site Kikiscroll a **deux variantes** : retail (`/kikiscroll/<lang>`) et wellness (`/kikiscroll/wellness/<lang>`), `<lang>` ∈ `{fr, en}`. 4 URLs au total. Tout est sur `main`, déployé sur GitHub Pages.
2. Le mode est résolu **une fois au chargement** depuis l'URL via `src/urlMode.js`, puis injecté dans `ModeContext` + lu par le store audio au module load. **Pas de switch runtime.**
3. La version retail est **inchangée** depuis l'origine. **Règle d'or** : ne pas casser le retail en travaillant sur wellness — tout le code wellness est gated `mode === 'wellness'`.
4. La version wellness « spa luxe 2026 » est complète : 4 chambres, palette warm, blob galet, vapeur, audio bespoke s2, sections réordonnées, phases du soin en s5.
5. **Audio wellness** : `WELLNESS_TRACKS = { ...RETAIL_TRACKS, entrance/rayon/cabine/recuperation: bespoke MP3 }`. 4 pistes wellness pour les chambres (keysy, deep, less deep, Instrumental (2)). Le reste hérite du retail.
6. **Sections wellness réordonnées** (intro → zones → neuro → sculpting → webcam → score) ; retail garde l'ordre id 0→5. Le code identifie chaque section par son `id` stable, pas sa position. Voir §"Architecture des sections (id vs position)".

---

## Arbre du repo et fichiers clés

```
Kikiscroll/
├── README.md                              ← Vue d'ensemble + URLs live
├── docs/
│   ├── session-handoff.md                 ← Ce fichier
│   ├── wellness-dev-handoff.md            ← Spec technique de la sous-page mode-aware (un peu stale, voir §"Docs à actualiser")
│   └── wellness-assets-brief.md           ← Brief production assets (stale, voir §"Docs à actualiser")
├── public/
│   ├── IMAGES/
│   │   ├── retail_panorama.jpg            ← Panorama retail (section 2 retail)
│   │   ├── wellness_panorama.jpg          ← ORPHELIN (pas référencé, à supprimer)
│   │   ├── wellness_zone_accueil.jpg      ← 4 zones spa luxe utilisées en section 2 wellness
│   │   ├── wellness_zone_chaleur.jpg
│   │   ├── wellness_zone_soin.jpg
│   │   └── wellness_zone_recuperation.jpg
│   ├── MUSIC/                              ← Pistes retail (14 fichiers, format MP3)
│   │   └── wellness/                       ← 4 pistes bespoke wellness (MP3)
│   │       ├── keysy.mp3
│   │       ├── deep.mp3
│   │       ├── less deep.mp3
│   │       └── Instrumental (2).mp3
│   └── logo-kikina.png                     ← Logo du footer (ATTENTION: référencer via BASE_URL)
└── src/
    ├── main.jsx                            ← Parsing URL + montage ModeProvider/LanguageProvider
    ├── urlMode.js                          ← parseUrlMode() — source unique URL → {mode, lang}
    ├── ModeContext.jsx                     ← React Context du mode
    ├── LanguageContext.jsx                 ← useTranslation() → {t, lang, mode}
    ├── translations/
    │   ├── index.js                        ← Bundle { retail, wellness }
    │   ├── retail.js
    │   └── wellness.js                     ← Toutes les clés wellness (FR + EN)
    ├── store/useAudioStore.js              ← RETAIL_TRACKS + WELLNESS_TRACKS, lu au module load
    ├── App.jsx                              ← Orchestre tout. Branche wellness pour panorama 4 zones, audio s2/s5, palette, park periods, captions inline
    ├── components/Scene.jsx                ← 3D blob. Branche wellness pour material + WellnessSteam vs SpaceDust
    └── index.css                            ← Palette wellness scopée par `html[data-mode="wellness"]` + classes `.spa-panorama__*`
```

**Pour comprendre l'architecture mode-aware** : lis dans l'ordre `urlMode.js`, `main.jsx`, `LanguageContext.jsx`, `useAudioStore.js`, puis `getSectionsData(t, mode)` dans `App.jsx`. ~5 minutes.

---

## URLs live

- https://kikinastudio.github.io/kikiscroll/fr (retail FR)
- https://kikinastudio.github.io/kikiscroll/en (retail EN)
- https://kikinastudio.github.io/kikiscroll/wellness/fr (wellness FR)
- https://kikinastudio.github.io/kikiscroll/wellness/en (wellness EN)
- `/kikiscroll/` redirect → `/kikiscroll/fr`
- `/kikiscroll/wellness` redirect → `/kikiscroll/wellness/fr`

Branche `main` est ce qui est live. Le CI build + déploie automatiquement via `.github/workflows/deploy.yml`. **Demander confirmation explicite avant tout `git push origin main`** (sécurité harness, exception faite quand le user a explicitement dit "push").

---

## État actuel de la version wellness

### Ordre des sections (wellness)

| Position DOM | id | Titre EN | Titre FR | Comportement |
|---|---|---|---|---|
| 0 | 0 | Sound, as a signature of care. | Le son, signature du soin. | Intro, drone only, blob proche sphère |
| 1 | 2 | One signature, many spaces. | Une signature, plusieurs espaces. | Panorama 4 zones |
| 2 | 3 | Compose the state, not the ambience. | Composer l'état, pas l'ambiance. | Neuro labels, crossfade jungle→pulsating→focus |
| 3 | 1 | The science of acoustic sculpting. | La science de la sculpture acoustique. | Isolation toggle, crowd track |
| 4 | 4 | Sound that listens to the gesture. | Le son à l'écoute du geste. | Webcam + démo capteur spatial |
| 5 | 5 | A score for every treatment. | Une partition par soin. | 5 phases du soin (blobs + stems audio) |

**Retail** garde l'ordre naturel id 0→5 (DOM position = id).

### Section 2 (Panorama, 4 chambres) — détails

**Ordre des chambres** (visuel) :
1. Reception & transitions (accueil) → audio `entrance` = **keysy.mp3**
2. Treatment rooms (soin) → audio `rayon` = **deep.mp3**
3. Heat rituals (chaleur) → audio `cabine` = **less deep.mp3**
4. Recovery spaces (recuperation) → audio `recuperation` = **Instrumental (2).mp3**

> Le mapping fichier→slot dans `useAudioStore.js` a été **swappé** pour que rooms 2 et 3 visuellement échangées gardent le bon caractère audio. Les fichiers MP3 ne sont PAS renommés.

**Timings (sectionProgress en wellness)** :
- Section length : **5.5× viewport height** (vs 3× en retail)
- Intro text visible : 0 → ~0.22 (introOpacity fade-out 0.16 → 0.22)
- Panorama fade-in : **0.18 → 0.26**
- Zone audio ramp-in : **0.20 → 0.28** (drone seul avant 0.20)
- Park-at-start : `mp = 0` jusqu'à `sectionProgress 0.28` (PARK_START)
- Pan horizontal : 0.28 → 0.86 (PARK_END)
- Park-at-end : 0.86 → 1.0 (slide 3 reste centrée)

**Audio crossfade en wellness** (en `mp` = remappé de sectionProgress sur [PARK_START, PARK_END]) :
- mp 0 → 0.10 : entrance solo @ 0.6
- mp 0.10 → 0.22 : entrance → rayon crossfade
- mp 0.22 → 0.45 : rayon solo @ 0.6
- mp 0.45 → 0.55 : rayon → cabine crossfade
- mp 0.55 → 0.78 : cabine solo @ 0.6
- mp 0.78 → 0.90 : cabine → recuperation crossfade
- mp 0.90 → 1.0 : recuperation solo @ 0.6

Tous les volumes sont multipliés par `zoneAudioRamp` (0→1 sur sectionProgress 0.20→0.28) pour le fade-in propre. Drone reste à 0.5 constant en arrière-plan.

**Captions sur les cards** (rendu inline, pas de class-based active) :
- `dist = abs(movingProgress - i/3)` (distance au centre dans l'espace mp)
- Plateau : `dist <= 0.10` → opacity 1
- Fade : `dist 0.10 → 0.22` → linear 1 → 0
- Past : `dist >= 0.22` → opacity 0
- **Pas de CSS transition** sur `.spa-panorama__caption` (l'inline opacity tracke le scroll frame par frame, 60fps)

**Visuel** :
- 4 images de fond (`/IMAGES/wellness_zone_*.jpg`) avec scale 1.05 → 1 quand active
- Overlay gradient sombre bas pour readability sur n'importe quelle image
- Captions blanc avec text-shadow
- **Pas de counter "01/04"** (retiré)

### Section 5 (Score, phases du soin) — détails

**Wellness only** :
- Titre : "A score for every treatment." / "Une partition par soin."
- 5 paragraphes (4 sauts de ligne visuels) — `withLineBreaks: true` dans sectionsData
- Section length : **5× viewport** (vs 3.5× en retail)
- `densityIntroCutoff = 0.20` en wellness (vs 0.82 en retail) — les 5 phases s'étalent sur 80% de la section
- Audio stem fade-in : **150ms** en wellness (vs 300ms en retail)
- Rendu : nom de la phase en H2 + ligne fine "N / 5 — phase du soin" au-dessus

**Phases** (mappées sur le compteur 1→5 driven par scroll) :
| # | EN | FR | Stem activé |
|---|---|---|---|
| 1 | Arrival | L'arrivée | drone only |
| 2 | First contact | La prise de contact | + strings |
| 3 | Depth | La profondeur | + bass |
| 4 | Release | Le relâchement | + drums |
| 5 | Return | Le retour | + keyboard |

Retail : compteur numérique `{densityBlobCount}` + `{t.density_label}` (inchangé).

### Footer

**Wellness uniquement** : bloc CTA pré-formulaire placé en haut du footer.
- Titre H2 : "What does your house sound like?" / "Quel est le son de votre maison ?"
- Body : "You have a fragrance. You have an architecture. You have a gesture. The sound of your spa should not be left to chance."
- Invite inline : "Let's compose it together."
- Mailto : `bianca@kikinastudio.com` (underline hover-thicker)

Tout dans un seul paragraphe (font-light body + font-medium invite + underlined mailto), `max-w-2xl`, marge `mb-12 md:mb-14`. Le formulaire de contact existant suit immédiatement après.

Retail : footer inchangé (logo + links + form).

---

## Gotchas et pièges à éviter

### 1. Paths relatifs en wellness — TOUJOURS utiliser `import.meta.env.BASE_URL`

Howler et `<img src>` résolvent les chemins relatifs contre l'URL du document. À `/kikiscroll/wellness/en`, un path `MUSIC/x.mp3` résout à `/kikiscroll/wellness/MUSIC/x.mp3` (404), au lieu de `/kikiscroll/MUSIC/x.mp3`.

**Solution** : tous les paths d'assets utilisent maintenant `import.meta.env.BASE_URL` comme préfixe (= `/kikiscroll/`). Voir `useAudioStore.js` ligne 8 (constante `BASE`) et `App.jsx` ligne ~1047 pour le logo footer.

Si tu ajoutes un nouvel asset, **toujours** préfixer avec `BASE` ou `import.meta.env.BASE_URL`.

### 2. CSS specificity wellness — `.text-white:not(...):not(...):not(...)...`

L'override `html[data-mode="wellness"] .text-white:not(.spa-keep-white):not(...):not(...):not(...):not(...)` dans `index.css` a une spécificité élevée (5 négations) qui peut battre d'autres règles. Si tu ajoutes un état hover qui change la couleur d'un élément `.text-white`, il faut soit :
- Utiliser une spécificité encore plus haute, soit
- Utiliser `!important` (voir `.hover\:bg-white:hover` dans index.css pour l'exemple existant)

### 3. `activeSection` vs `activeSectionId`

`activeSection` = position DOM (= index dans `sectionsData`). `activeSectionId` = le `id` stable (0-5).

**En wellness**, ces deux sont différents (sections réordonnées). **Toujours** switcher sur `activeSectionId` pour le comportement (audio, blob, états). `activeSection` ne sert qu'au DOM ordering (ScrollTrigger forEach, et le test `activeSection === index` dans le `.map((section, index) => ...)`).

### 4. Sections wellness réordonnées dans `getSectionsData(t, mode)`

Si tu ajoutes/déplaces une section, garde son `id` constant. Le code de comportement (audio crossfade, ScrollTrigger scroll lengths, etc.) en dépend.

### 5. NON_DRONE_TRACKS

Quand tu ajoutes une nouvelle piste audio (autre que `drone`), pense à l'ajouter à `NON_DRONE_TRACKS` dans `App.jsx` pour qu'elle se fade out proprement sur changement de section.

### 6. Audio overlap quand on réutilise un même fichier sur plusieurs slots

Si plusieurs `Howl` instances pointent vers le même fichier et qu'on les crossfade avec `fadeTrack` (150ms easing), les easings ne se synchronisent pas parfaitement et la somme des volumes peut brièvement dépasser la cible → overlap audible. **Solution** : utiliser des fichiers distincts pour chaque slot. C'est ce qu'on fait actuellement avec les 4 pistes bespoke s2.

---

## Architecture des sections (id vs position)

Référence pour qui éditerait l'ordre, la copie ou les comportements de section.

**Concept** : chaque section a deux notions distinctes :
- **`id`** (0 à 5) — stable, identifie le **comportement** :
  - `id 0` → Intro (drone only)
  - `id 1` → Sculpting / Isolation (crowd track, toggle automatique à 40 %)
  - `id 2` → Zones panorama (entrance/rayon/cabine/recuperation crossfade en wellness, entrance/rayon/cabine en retail)
  - `id 3` → Neuro (jungle → pulsatingWave → focusCognitif crossfade)
  - `id 4` → Webcam / Neuro-adaptive (happy/sad via face-api)
  - `id 5` → Score / Density (1→5 stems accumulation)
- **`activeSection`** — position dans le tableau `sectionsData`, qui correspond à la position DOM (= ordre de scroll). En retail, `activeSection === id`. En wellness, le tableau est réordonné, donc **non**.

**Règle d'or** : pour tout comportement, **toujours** switcher sur `activeSectionId = sectionsData[activeSection]?.id`. Jamais sur `activeSection`. Les seuls usages légitimes de `activeSection` (le numéro brut) sont :
- Le DOM ordering dans `gsap.utils.toArray('.pin-section').forEach((section, i) => ...)` — décide via `sd?.hasIsolationToggle`, `sd?.hasEnvironmentLabels`, `sd?.hasZonesPanorama`, `sd?.hasDensityLabels`.
- Le test `activeSection === index` dans `.map((section, index) => ...)` qui détermine si la section en cours de rendu est la section visible.

**Pour ajouter / réordonner des sections** :
1. Éditer `getSectionsData(t, mode)` dans `App.jsx`. Le retour est un array ordonné, chaque élément est un objet `{ id, title, paragrapheParts, has*: true, withLineBreaks?: true }`.
2. Pour réordonner par mode : un nouveau `if (mode === 'X')` avec un array dans l'ordre souhaité.
3. **Ne pas changer les `id`** des sections existantes — tout le code de comportement en dépend.

---

## Architecture audio (`useAudioStore.js`)

### Pistes retail (14 entrées)

| Slot | Fichier | Usage |
|---|---|---|
| drone | `MUSIC/0 Drone.mp3` | Toujours playing à 0.5, base layer |
| strings | `MUSIC/1 Strings.mp3` | Section 5 stem 2 |
| bass | `MUSIC/2 Bass.mp3` | Section 5 stem 3 |
| drums | `MUSIC/3 Drums.mp3` | Section 5 stem 4 |
| keyboard | `MUSIC/4 Keyboard.mp3` | Section 5 stem 5 |
| crowd | `MUSIC/Crowd.mp3` | Section 1 (sculpting/isolation) |
| jungle | `MUSIC/Jungle.mp3` | Section 3 phase 1 (relaxation) |
| pulsatingWave | `MUSIC/Pulsating Wave.mp3` | Section 3 phase 2 (régulation) |
| focusCognitif | `MUSIC/Focus Cognitif.mp3` | Section 3 phase 3 (focus) |
| happy | `MUSIC/HAPPY.mp3` | Section 4 webcam smile detected |
| sad | `MUSIC/SAD.mp3` | Section 4 webcam no smile |
| entrance | `MUSIC/Synthwave_1.mp3` | Section 2 zone 1 (retail) |
| rayon | `MUSIC/Rap_1.mp3` | Section 2 zone 2 (retail) |
| cabine | `MUSIC/Bossa.mp3` | Section 2 zone 3 (retail) |

### Pistes wellness

```js
WELLNESS_TRACKS = {
    ...RETAIL_TRACKS,
    entrance: 'MUSIC/wellness/keysy.mp3',           // Reception & transitions
    rayon:    'MUSIC/wellness/deep.mp3',            // Treatment rooms (room 2 visuel)
    cabine:   'MUSIC/wellness/less deep.mp3',       // Heat rituals (room 3 visuel)
    recuperation: 'MUSIC/wellness/Instrumental (2).mp3', // Recovery spaces (wellness-only slot)
};
```

Les autres slots (drone, strings, bass, drums, keyboard, crowd, jungle, pulsatingWave, focusCognitif, happy, sad) héritent des fichiers retail via spread.

> **Note** : le mapping room→fichier dans le store est swappé par rapport à l'ordre des fichiers (keysy/less deep/deep/Instrumental 2) parce que l'ordre des slides en s2 a été swappé rooms 2↔3. Le résultat : Treatment rooms (room 2 dans l'ordre visuel) entend `deep.mp3` et Heat rituals (room 3) entend `less deep.mp3`. Cohérent avec le caractère de chaque chambre.

---

## Ce qui reste à faire

### Audio (à la main de Jeremie)

1. **Musiques wellness bespoke pour les autres sections** — Jeremie a livré 4 pistes pour la section 2 (zones) et 1 piste pour la section initial (`Instrumental.mp3` ancien, plus utilisée — supprimée). Les pistes wellness pour les sections suivantes héritent toujours du retail :
   - `drone` (toujours playing) → retail's `0 Drone.mp3`
   - `strings`, `bass`, `drums`, `keyboard` → retail (section 5 stems, mappées aux 5 phases du soin)
   - `crowd` → retail (section 1 sculpting)
   - `jungle`, `pulsatingWave`, `focusCognitif` → retail (section 3 neuro)
   - `happy`, `sad` → retail (section 4 webcam)

   Si Jeremie envoie d'autres pistes, déposer dans `public/MUSIC/wellness/` et changer la valeur correspondante dans `WELLNESS_TRACKS`.

### Cleanup / dette technique

2. **`public/IMAGES/wellness_panorama.jpg`** est devenu un asset orphelin (plus référencé). À supprimer.

3. **Dead code dans `App.jsx`** : le bloc des 4 SVG zones wellness à l'intérieur d'un `mode !== 'wellness'` est unreachable. À nettoyer. Cherche `mode === 'wellness' ? [` dans App.jsx.

4. **Branche `wellness-spa-luxe-refonte`** : son contenu est intégralement sur `main`. Peut être supprimée localement et remote.

5. **Docs à actualiser** :
   - [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) — un peu stale (panorama unique → 4 slides, clés non strictement identiques entre modes, sections réordonnées, etc.)
   - [docs/wellness-assets-brief.md](./wellness-assets-brief.md) — stale (3 zones devenues 4, brief musique partiellement obsolète maintenant que 4 pistes ont été livrées)

### Non bloquant / observations conceptuelles

6. **Section 4 : démo webcam vs narratif capteur spatial** — la section parle de capteurs spatiaux qui lisent les gestes du praticien, mais la démo interactive reste une webcam qui lit l'expression du visage. Le texte le présente comme proxy (*"What you see here through a webcam, we deploy in the treatment room with spatial sensors"*), ce qui fonctionne pour la prez. Si on veut pousser plus loin un jour : remplacer la détection happy/sad par autre chose (mouvement de la main, posture).

---

## Décisions et arbitrages (à ne pas re-débattre)

| Décision | Raison | Source |
|---|---|---|
| Mode résolu à l'URL au chargement, pas de switch runtime | Store audio init au module load, a besoin du mode dès cet instant | `useAudioStore.js` |
| Sous-page séparée `/kikiscroll/wellness/<lang>` plutôt que toggle | Choix Jeremie session 1 (architecture cleaner, communication ciblée) | — |
| 4 zones wellness en section 2 au lieu de 3 retail | Un parcours spa a 4 catégories d'espace | Refonte spa luxe |
| Clés de traduction NON strictement identiques entre retail/wellness | Wellness a besoin de `zone_recuperation*`, `zone_*_body`, `cta_*`, `phase_*`, `phase_label` que retail n'a pas | — |
| Park periods 28%/86% en section 2 wellness | Donner le temps de lire le titre + paragraphe puis chaque chambre. Lié au scroll length 5.5× | Section 2 polish |
| Pas casser le retail | Tout le code wellness est gated `mode === 'wellness'`. Le retail est intact end-to-end. | — |
| Pas de tests automatisés | Le repo n'en a jamais eu | — |
| Push direct sur main = needs explicit user confirmation (sécurité harness) | Workflow de protection Claude Code | — |
| `dist/` est tracké en git par convention historique | Le CI rebuild de toute façon, mais on garde le tracking | — |
| Section 5 wellness = phases d'un soin, pas strates génériques | Le scroll s5 raconte l'arc d'un soin d'une heure | — |
| Section 4 wellness = capteur spatial + gestes (pas reco faciale) | Sert d'intro narrative à la section 5 (phases du soin) | — |
| Démo webcam s4 conservée comme proxy malgré le pivot narratif | Le hardware "capteur spatial" n'est pas démontrable côté web ; la webcam est le proxy lisible. Le texte le rend explicite. | — |
| s5 : compteur numérique en retail, nom de phase en wellness | Branche par mode dans le rendu — retail garde son identité, wellness gagne le storytelling | — |
| Wellness sections réordonnées, retail intact | Demande Jeremie. Code identifie chaque section par son `id` stable. | — |
| Section 1 wellness retitrée "The science of acoustic sculpting" | Aligné avec le narratif "piste nue continue + harmonisation" | — |
| 4 pistes bespoke pour section 2 wellness | Chaque chambre a son caractère sonore distinct. Crossfade entre pistes différentes ≠ overlap audible (pas de problème de phase) | — |
| Drone-only pendant l'intro de la section 2 wellness | `zoneAudioRamp` (0.20→0.28) silencie les zone tracks tant que le user lit le titre + paragraphe | — |
| Caption sync : inline opacity per-slide, pas de CSS transition | Toute transition CSS fixed-duration fait trainer le rendu derrière le scroll | — |
| Section 5 wellness : `densityIntroCutoff = 0.20` (vs 0.82 en retail) + section length 5× | Les 5 phases ont besoin d'air pour être lues, pas tassées dans les 18 derniers % | — |
| Audio fade-in 150ms pour les stems s5 en wellness (vs 300ms retail) | Tracker plus tight le snap visuel/textuel | — |
| Scroll hints "Scroll slowly" / "Keep scrolling slowly" | Encourager un scroll posé : les transitions wellness sont tunées pour ça | — |
| Counters "01 / 04" retirés des cards wellness | Le user a demandé des cards "pures" sans chrome | — |
| Rooms 2 et 3 swappées visuellement | Demande Jeremie. Audio file mapping swappé en parallèle dans le store pour garder le caractère par chambre | — |
| Line breaks : s4 (3 paragraphes, 2 breaks), s5 (5 paragraphes, 4 breaks) | Le user a demandé d'éviter les "big chunks of text". Flag `withLineBreaks: true` dans sectionsData | — |
| Tous les paths d'assets via `import.meta.env.BASE_URL` | Sinon ils cassent à `/kikiscroll/wellness/en` (Howler + `<img>` résolvent contre l'URL du document) | — |

---

## Comment vérifier que tout marche

```bash
# 1. État branches
git status
git log --oneline -10

# 2. Build (doit passer sans erreur ~5s)
npm run build

# 3. Dev server
npm run dev   # Vite démarre sur :5173

# 4. Routes à tester dans le navigateur (mute le son d'abord)
# http://localhost:5173/kikiscroll/fr            → retail FR
# http://localhost:5173/kikiscroll/en            → retail EN
# http://localhost:5173/kikiscroll/wellness/fr   → wellness FR
# http://localhost:5173/kikiscroll/wellness/en   → wellness EN
# http://localhost:5173/kikiscroll/              → redirect vers /kikiscroll/fr
# http://localhost:5173/kikiscroll/wellness      → redirect vers /kikiscroll/wellness/fr
```

### Checklist wellness rapide

1. **Section 0** : eyebrow "Composing presence.", titre "Sound, as a signature of care.", bouton "Start the sound experience". Au hover du bouton, texte ET fond doivent être lisibles (texte clair sur fond dark-brown).
2. **Section 2** : titre + paragraphe Guerlain visibles. Pendant l'intro, **seul le drone joue** (pas les 4 pistes zonales). Les chambres apparaissent en fade vers ~25% du scroll de la section. Quatre cards défilent dans l'ordre **Reception → Treatment rooms → Heat rituals → Recovery**. Pas de counter "01/04". Captions tracking le scroll (pas de lag perceptible).
3. **Section 3** : neuro labels (Somatic release / Parasympathetic regulation / Attentional grounding) avec crossfade audio jungle → pulsatingWave → focusCognitif.
4. **Section 1 (= sculpting, vient APRÈS s3 en wellness)** : titre "The science of acoustic sculpting", isolation toggle (passe de "Ambient noise" à "Situated listening active" à ~40% du scroll).
5. **Section 4** : bouton "Allow camera", texte sur le capteur spatial + gestes. 3 paragraphes (2 sauts de ligne visuels). En activant la caméra : indicateur d'émotion (relaxed / arriving / reading).
6. **Section 5** : titre "A score for every treatment". 5 paragraphes (4 sauts de ligne visuels). Les 5 phases (Arrival → First contact → Depth → Release → Return) s'enchaînent avec le compteur "N / 5 — treatment phase" et les blobs qui s'accumulent. Audio : drone + stems progressifs.
7. **Footer wellness** : bloc CTA "What does your house sound like?" + body + invite + mailto bianca@kikinastudio.com. Compact (max-w-2xl).

### Outils Claude utiles pour tester

- **Claude Preview MCP** (`mcp__Claude_Preview__preview_*`) — server local Vite, screenshot, eval. Configuration dans `.claude/launch.json` (untracked).
- Limitation connue : ScrollTrigger + Lenis ne se déclenchent pas bien sous scroll JS (`window.scrollTo`). Pour tester les transitions de section, utiliser le DOM snapshot ou demander au user de tester directement.

---

## Si on te demande de…

- **« Ajoute un troisième mode (hospitality / etc.) »** → recette dans [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) section "Comment ajouter un troisième mode". ~2h dev + production assets.
- **« Change un texte »** → `src/translations/{retail,wellness}.js`. Garder le format des clés. Si tu ajoutes une clé spécifique à un mode, vérifier qu'aucun consommateur ne suppose qu'elle existe partout.
- **« Remplace une musique »** → Déposer le `.mp3` dans `public/MUSIC/wellness/` (pour scope wellness) ou `public/MUSIC/` (retail), mettre à jour `useAudioStore.js`. Vérifier que la piste loop seamlessly (`loop: true` dans Howler), niveau cohérent (cible −14 LUFS).
- **« Déploie en prod »** → push sur `main`. CI déploie automatiquement. **Demande confirmation explicite avant `git push origin main`**.
- **« Crée une PR »** → `gh pr create --base main --head <branche>`. Titre court (< 70 chars), corps détaillé en bullets si besoin.
- **« Réordonne les sections »** → Éditer `getSectionsData(t, mode)` dans `App.jsx`. Garder les `id` constants. Vérifier que `getSectionsData` retourne la même longueur (6 sections).
- **« Ajoute une section »** → Définir un nouvel objet dans `getSectionsData` avec un nouvel `id` (6+), ajouter sa logique audio dans `useScrollAudio`, son cas dans le rendu `.map()`, et éventuellement son visuel spécifique (panorama, labels, etc.).

---

## Conventions du projet

- **Réponses en français** quand c'est pertinent (l'utilisateur écrit en français)
- **Pas d'em dash (—) dans les textes visibles utilisateur** ; préférer virgules, deux-points ou tirets courts. (Exception : OK dans le code, commentaires, doc, commits.)
- **Pas d'emojis** sauf demande explicite
- **Commits style** : titre concis (< 70 chars) + corps multi-lignes en bullet points si besoin. Toujours inclure le trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- **Ne PAS push sur `main` sans confirmation explicite** (action partagée, harness peut bloquer)
- **Ne PAS toucher au retail** en travaillant sur wellness — la garantie d'isolation est un asset

---

## Contacts

- **Utilisateur principal** : Jeremie Pavesi, jeremie@kikinastudio.com
- **Email contact site** (mailto wellness footer) : bianca@kikinastudio.com
- **Repo** : github.com/KikinaStudio/kikiscroll
- **Live** : https://kikinastudio.github.io/kikiscroll/
