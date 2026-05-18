# Session Handoff — Kikiscroll Wellness

> Document destiné à une **autre session Claude Code** qui reprend ce projet sans contexte. Lis ce fichier **avant** d'agir. Il résume l'état du repo, ce qui a été fait, ce qu'il reste à faire, et les décisions déjà prises (à ne pas re-débattre).

Dernière mise à jour : **2026-05-18** (après refonte copy spa luxe v2 + transformation s5 phases du soin)

---

## TL;DR (30 secondes)

1. Le site Kikiscroll a maintenant **deux variantes** : retail (`/kikiscroll/<lang>`) et wellness (`/kikiscroll/wellness/<lang>`), `<lang>` ∈ `{fr, en}`. 4 URLs au total.
2. Le mode est résolu **une seule fois au chargement** depuis l'URL via `src/urlMode.js`, puis injecté dans `ModeContext` + lu par le store audio au module load. Pas de switch runtime.
3. La version retail est **inchangée** depuis l'origine et reste live sur `main`.
4. La version wellness « spa luxe 2026 » est **mergée et déployée**. Itération copy v2 : narratif retravaillé bout en bout (s0 intro note + métaphore Guerlain s2 + s4 capteur spatial + s5 phases du soin).
5. **Audio wellness = audio retail** (décision Jeremie 2026-05-18). `WELLNESS_TRACKS` réutilise explicitement `RETAIL_TRACKS` via spread, avec `recuperation` en slot supplémentaire. Plus de TODO sur les pistes ; les vraies musiques wellness arriveront plus tard.
6. **Section 5 transformée** : ce n'est plus un compteur générique "1→5 strates sonores" mais **5 phases d'un soin exemple** d'une heure (Arrivée → Prise de contact → Profondeur → Relâchement → Retour). Wellness uniquement, retail garde le compteur numérique.

---

## Arbre du repo et fichiers clés à lire en priorité

```
Kikiscroll/
├── README.md                              ← Vue d'ensemble + URLs live (à lire en 1er)
├── docs/
│   ├── session-handoff.md                 ← Ce fichier
│   ├── wellness-dev-handoff.md            ← Spec technique de la sous-page mode-aware
│   └── wellness-assets-brief.md           ← Brief production assets (à jour à 80%, voir §"Docs à actualiser")
├── public/
│   ├── IMAGES/
│   │   ├── retail_panorama.jpg            ← Panorama retail (section 2 retail)
│   │   ├── wellness_panorama.jpg          ← ORPHELIN (pas référencé en code, à supprimer)
│   │   ├── wellness_zone_accueil.jpg      ← 4 zones spa luxe utilisées en section 2 wellness
│   │   ├── wellness_zone_chaleur.jpg
│   │   ├── wellness_zone_soin.jpg
│   │   └── wellness_zone_recuperation.jpg
│   └── MUSIC/                              ← Pistes retail uniquement. Wellness fallback sur retail.
└── src/
    ├── main.jsx                            ← Parsing URL + montage ModeProvider/LanguageProvider
    ├── urlMode.js                          ← parseUrlMode() — source unique URL → {mode, lang}
    ├── ModeContext.jsx                     ← React Context du mode
    ├── LanguageContext.jsx                 ← useTranslation() → {t, lang, mode}
    ├── translations/
    │   ├── index.js                        ← Bundle { retail, wellness }
    │   ├── retail.js
    │   └── wellness.js                     ← "spa luxe 2026" — nouvelles clés zone_*_body, zone_recuperation_*
    ├── store/useAudioStore.js              ← RETAIL_TRACKS + WELLNESS_TRACKS, lu au module load
    ├── App.jsx                             ← Orchestre tout. Branche wellness pour panorama 4 zones, audio s2, palette, park periods
    ├── components/Scene.jsx                ← 3D blob. Branche wellness pour material + WellnessSteam vs SpaceDust
    └── index.css                           ← Palette wellness scopée par `html[data-mode="wellness"]` + classes `.spa-panorama__*`
```

**Pour comprendre l'architecture mode-aware** : lis dans l'ordre `urlMode.js`, `main.jsx`, `LanguageContext.jsx`, `useAudioStore.js`. ~5 minutes.

---

## État des branches (au 2026-05-12)

| Branche | Tip | Live ? | Contenu |
|---|---|---|---|
| `main` | `9cfa4f8` Merge wellness branch | ✅ Déployé sur GitHub Pages | Wellness spa luxe 2026 complet (4 zones, palette warm, park periods, blob galet) |
| `wellness-spa-luxe-refonte` | `51ff698` (= ancêtre de main désormais) | — | Tout son contenu est dans `main`. La branche peut être supprimée. |

**URLs live actuelles** :
- https://kikinastudio.github.io/kikiscroll/fr (retail FR, inchangé)
- https://kikinastudio.github.io/kikiscroll/en (retail EN, inchangé)
- https://kikinastudio.github.io/kikiscroll/wellness/fr (wellness FR spa luxe)
- https://kikinastudio.github.io/kikiscroll/wellness/en (wellness EN spa luxe)

---

## Ce qui est fait (chronologie compactée)

### Architecture mode-aware (sur `main` depuis session 1)

1. **`1f9ae04` Add wellness sub-page with mode-aware routing, translations, and audio**
   - Création de l'architecture : `urlMode.js`, `ModeContext`, `translations/{retail,wellness}.js`, store mode-aware
   - Routes `/kikiscroll/wellness/{fr,en}` ajoutées et live
   - Assets wellness initialement = placeholders (copie du retail)

2. **`d6779fe` Add wellness handoff docs (assets brief + dev spec)**
   - `docs/wellness-dev-handoff.md` — architecture, routing, edge cases
   - `docs/wellness-assets-brief.md` — brief production image panorama + 3 musiques (3 zones à l'époque)

### Refonte spa luxe (mergée via PR #1 puis follow-up via merge `9cfa4f8`)

3. **`84d6eda` Refonte ambiance wellness: spa luxe 2026**
   - **Contenu** : wellness FR + EN réécrit ton premium (hôtels/instituts/thermes/retraites longévité, "signature sonore par espace"). S0–S5 entièrement nouveaux.
   - **Section 2 → 4 zones** au lieu de 3 :
     - Accueil & transitions (Le seuil)
     - Rituels de chaleur (L'enveloppe)
     - Cabines de soin (Le geste)
     - Espaces de récupération (L'empreinte)
   - **Nouvelles clés de traduction** spécifiques wellness : `zone_entree_body`, `zone_rayon_body`, `zone_equipe_body`, `zone_recuperation`, `zone_recuperation_sub`, `zone_recuperation_body`. Retail n'a PAS ces clés (rupture du contrat "clés identiques" — voir §"Décisions et arbitrages").
   - **Nouvelle piste audio** : `recuperation` ajoutée à `WELLNESS_TRACKS` (utilise Bossa.mp3 en placeholder).
   - **Section 2 visuels** : remplace le panorama unique par un carousel parallax 4 slides (`.spa-panorama` dans `index.css`) avec image bg + counter "01 / 04" + caption (sub/title/body).
   - **Audio crossfade s2** étendu à 4 pistes en wellness (quarters). Retail garde 3 pistes en tiers.
   - **Palette CSS wellness** : `html[data-mode="wellness"]` reçoit un fond gradient warm (sable → pêche → rose), grain réduit, surcharges typo. Retail intact.
   - **Scene.jsx** : `WellnessSteam` (sprites vapeur) remplace `SpaceDust` quand `IS_WELLNESS`. Blob recoloré galet/pierre polie matte avec lumière diffuse.
   - **Logo header** : `mix-blend-difference` désactivé en wellness, couleur `#3a2820` à la place.
   - **Footer / transition aube** : conditionnelle (noir en retail, palette warm en wellness).
   - **4 images zones wellness** ajoutées dans `public/IMAGES/wellness_zone_*.jpg`.

4. **`073fcfd` Add session handoff doc + rebuild dist** — première version de ce document.

5. **`51ff698` Section 2 polish + wellness copy refresh**
   - **Park periods en section 2 wellness** : `PARK_START = 0.15`, `PARK_END = 0.85`. Le pan horizontal et les crossfades audio utilisent le même remap `mp`. L'utilisateur a le temps de lire la première et la dernière carte sans devoir scroller au pixel près.
   - **Section 2 wellness scroll length** : 3× → 4.5× viewport pour absorber le parking.
   - **Section 2 wellness intro block** (title + paragraph) : fade out à `sectionProgress > 0.20` pour ne pas rivaliser avec les cards.
   - **Wellness copy refresh FR + EN** : s0 + s2 raccourcis, métaphore parfum Guerlain pour s2, zone bodies entree + recuperation polish, `intro_eyebrow → "Composer la présence" / "Composing presence"`.
   - **CSS** : gradient sombre en bas des slides panorama + captions blanches text-shadow pour readability sur n'importe quelle image.

6. **`9cfa4f8` Merge wellness-spa-luxe-refonte: section 2 polish + session handoff** — merge des commits 073fcfd + 51ff698 (la première moitié du contenu spa luxe avait déjà été mergée via PR #1 `50319a3`).

### Itération copy v2 + transformation section 5 (session 2026-05-18, ce commit)

7. **Refonte copy wellness v2 — narratif retravaillé bout en bout** (`src/translations/wellness.js`)
   - **Section 0** : titre `Sound, as a signature of care` / `Le son, signature du soin`. Eyebrow `Composing presence` / `Composer la présence`. Paragraphe principal allégé (3 parts). Ajout d'une nouvelle clé `s0_note` rendue en italique sous le paragraphe (fade-in à `sectionProgress > 0.55`) : explique en une phrase ce que l'expérience démontre — *"a Kikina soundscape: one identifiable signature, the brand's red thread, with intelligent layers responding to each space, each movement"*.
   - **Section 2** : titre `One signature, many spaces` / `Une signature, plusieurs espaces`. Paragraphe réécrit avec métaphore parfum Guerlain (tête / cœur / base). Le paragraphe est désormais affiché en wellness (auparavant null) avec compress reveal et fade-out coordonné avec l'apparition des cartes.
   - **Section 4** : pivot complet. Plus de "lecture faciale" mais **capteur spatial** qui lit la cabine, ajuste la musique à la structure du soin et aux gestes du praticien. Sert d'intro narrative à la section 5. Titre : `Sound that listens to the gesture` / `Le son à l'écoute du geste`. La démo webcam reste fonctionnelle mais le texte la présente comme proxy : *"What you see here through a webcam, we deploy in the treatment room with spatial sensors"*.
   - **Section 5** : **transformation totale**. Plus de "matière qui s'épaissit" / "5 strates" génériques. Désormais : **un soin d'une heure a un arc en 5 phases**, et la composition épouse cet arc. Titre : `A score for every treatment` / `Une partition par soin`. Nouvelles clés `phase_1` à `phase_5` + `phase_label` :
     - 1 → Arrival / L'arrivée
     - 2 → First contact / La prise de contact
     - 3 → Depth / La profondeur
     - 4 → Release / Le relâchement
     - 5 → Return / Le retour
   - **Bodies des cards section 2** (Receptions+transitions + Recovery spaces) raffinés. Les 2 autres (Heat rituals + Treatment rooms) inchangés.

8. **Section 2 timings rebalanced** (`src/App.jsx`) — la copy v2 a besoin de plus d'air pour la lecture du paragraphe avant l'apparition des chambres :
   - `section2Length` : 4.5× → **5.5× viewport** en wellness
   - Park periods : `PARK_START 0.15 → 0.28`, `PARK_END 0.85 → 0.86` (visuel + audio crossfade) — alignés dans `useScrollAudio` et dans le rendu panorama
   - Panorama fade-in : était `0 → 0.06`, devient **`0.18 → 0.26`** (les chambres n'apparaissent qu'une fois le paragraphe en train de disparaître)
   - Intro block fade-out : était `0.20 - 0.06/0.06`, devient `0.22 - 0.06/0.06` (le titre + paragraphe restent lisibles légèrement plus longtemps)
   - Paragraph reveal compressé : threshold/ramp `0.04/0.05` → `0.03/0.04` pour que les 3 parts soient toutes visibles avant `sectionProgress 0.10`
   - Résultat : le user lit le paragraphe en clair pendant 0→0.16, fade crossfade 0.16→0.26, première chambre parquée pleinement visible jusqu'à 0.28, puis pan horizontal jusqu'à 0.86, dernière chambre parquée 0.86→1.0.

9. **Section 5 rendering branché par mode** (`src/App.jsx#L763`) — auparavant `{densityBlobCount}` + `{t.density_label}` indifféremment. Désormais :
   - Wellness : nom de la phase (`{t['phase_' + densityBlobCount]}`) en heading + ligne fine `"N / 5 — phase du soin"` au-dessus.
   - Retail : compteur numérique + `density_label` (inchangé).
   - `density_label` retiré de `wellness.js` (plus utilisé), `phase_*` + `phase_label` ajoutés.

10. **Audio wellness = audio retail** (`src/store/useAudioStore.js`)
    - `WELLNESS_TRACKS` était une duplication des 14 entrées retail avec TODOs sur 11 d'entre elles. Réécrit en `{ ...RETAIL_TRACKS, recuperation: { src: 'MUSIC/Bossa.mp3', initialVolume: 0 } }` — explicite et concis.
    - Décision Jeremie : *"je veux que tu utilise pour le site wellness les memes sons du site retail, je les modifierai moi meme plus tard"*. Le swap vers des pistes bespoke se fera plus tard, à sa main.

---

## Ce qui reste à faire

### Audio (décision : à la main de Jeremie)

1. **Musiques wellness bespoke** — Jeremie a choisi explicitement (2026-05-18) de **garder les pistes retail** pour le wellness pour l'instant, et de les remplacer lui-même plus tard. La doc [wellness-assets-brief.md](./wellness-assets-brief.md) reste utile comme spec si jamais des pistes bespoke sont produites, mais ce n'est plus bloquant côté dev.
   - Si swap futur : déposer `public/MUSIC/wellness/<nom>.mp3` et changer les valeurs dans `WELLNESS_TRACKS` (actuellement `{ ...RETAIL_TRACKS, recuperation }`). Les noms de pistes à cibler côté wellness (en lien avec les 4 zones + 5 phases) :
     - `entrance` → Accueil & transitions / Le seuil
     - `rayon` → Rituels de chaleur / L'enveloppe
     - `cabine` → Cabines de soin / Le geste
     - `recuperation` → Espaces de récupération / L'empreinte (slot wellness-only)
     - 5 stems section 5 (`drone`, `strings`, `bass`, `drums`, `keyboard`) → phases du soin (arrivée / contact / profondeur / relâchement / retour)
     - `happy` / `sad` (section 4) → variantes "gesture-following" si production faite

### Non bloquant / cleanup

2. **Dead code à supprimer** : dans [src/App.jsx#L723](../src/App.jsx#L723), le bloc `{section.hasZonesPanorama && activeSection === index && mode !== 'wellness' && (...)}` contient un ternaire `mode === 'wellness' ? [...] : [...]` qui est unreachable (la condition extérieure exclut déjà wellness). Les 4 SVG wellness à l'intérieur ne s'affichent jamais. À nettoyer.

3. **`public/IMAGES/wellness_panorama.jpg`** est devenu un asset orphelin (plus référencé dans le code — la section 2 wellness utilise les 4 zone images individuelles). À supprimer.

4. **Branche `wellness-spa-luxe-refonte`** : son contenu est intégralement sur `main`. Peut être supprimée localement (`git branch -d wellness-spa-luxe-refonte`) et remote (`git push origin --delete wellness-spa-luxe-refonte`).

5. **Docs à actualiser** :
   - [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) — section "Edge cases" affirme que les clés sont strictement identiques entre modes, ce n'est plus vrai. La section sur le panorama unique n'est plus valide en wellness (carousel 4 slides). Section "Modèle des traductions" mentionne un contrat "strictement identique" à corriger. Mentionner aussi les nouvelles clés `s0_note`, `phase_1`...`phase_5`, `phase_label`.
   - [docs/wellness-assets-brief.md](./wellness-assets-brief.md) — 3 zones devenues 4. Noms changés. Image panorama unique remplacée par 4 zone images. Brief musique à adapter (4 pistes au lieu de 3 + 5 stems section 5 phases du soin). À noter aussi : ce brief n'est plus bloquant, Jeremie produit lui-même les musiques.

6. **Section 4 : démo webcam vs narratif capteur spatial** — la section 4 parle désormais de capteurs spatiaux qui lisent les gestes du praticien, mais la démo interactive reste une webcam qui lit l'expression du visage. Le texte le présente comme proxy *"What you see here through a webcam, we deploy in the treatment room with spatial sensors"*, ce qui marche pour la prez. Si tu veux pousser plus loin : remplacer la détection happy/sad par autre chose (mouvement de la main devant la caméra, posture, etc.). Pas demandé, mais c'est l'écart conceptuel le plus visible.

---

## Décisions et arbitrages (à ne pas re-débattre)

| Décision | Raison | Source |
|---|---|---|
| Mode résolu à l'URL au chargement, pas de switch runtime | Simplicité, le store audio s'initialise au module load et a besoin du mode dès cet instant | `useAudioStore.js` |
| Sous-page séparée `/kikiscroll/wellness/<lang>` plutôt que toggle | Choix Jeremie en début de session 1 (architecture cleaner, communication ciblée) | Question 1 du AskUserQuestion initial |
| 4 zones wellness en section 2 au lieu de 3 retail | Refonte spa luxe : un parcours spa a 4 catégories d'espace | Commit `84d6eda` |
| Clés de traduction NON strictement identiques entre retail/wellness | Wellness a besoin de `zone_recuperation*` et `zone_*_body` que retail n'a pas | Idem |
| Park periods 15 %/85 % en section 2 wellness | Donner le temps de lire la 1ère et la 4ème carte sans scroll au pixel | Commit `51ff698` |
| Pas casser le retail | Tout le code wellness est gated `mode === 'wellness'`, le retail est intact | Vérifié dans chaque commit |
| Pas de tests automatisés | Le repo n'en a jamais eu | — |
| Push direct sur main = needs explicit user confirmation (sécurité harness) | Workflow de protection Claude Code | Bloqué une fois en session 1 |
| `dist/` est tracké en git par convention historique | Le CI rebuild de toute façon, mais on garde le tracking | Convention du repo |
| Audio wellness = audio retail (pas de bespoke pour l'instant) | Décision Jeremie 2026-05-18, il remplacera les pistes lui-même | `useAudioStore.js` |
| Section 5 wellness = phases d'un soin, pas strates génériques | Refonte narrative 2026-05-18 : le scroll s5 raconte l'arc d'un soin d'une heure | Commits 2026-05-18 |
| Section 4 wellness = capteur spatial + gestes (pas reco faciale) | Pivot 2026-05-18 : sert d'intro narrative à la section 5 (phases du soin) | Idem |
| Démo webcam s4 conservée comme proxy malgré le pivot narratif | Le hardware "capteur spatial" n'est pas démontrable côté web ; la webcam est le proxy lisible. Le texte le rend explicite. | Idem |
| s5 : compteur numérique en retail, nom de phase en wellness | Branche par mode dans le rendu (`mode === 'wellness' ? ... : ...`) — retail garde son identité, wellness gagne le storytelling | Idem |

---

## Comment vérifier que tout marche (procédure rapide)

```bash
# 1. État branches
git branch -a
git status

# 2. Build
npm run build           # Doit passer sans erreur (~5s)

# 3. Dev server
npm run dev             # Vite démarre sur :5173

# 4. Routes à tester dans le navigateur
# http://localhost:5173/kikiscroll/fr            → retail FR
# http://localhost:5173/kikiscroll/en            → retail EN
# http://localhost:5173/kikiscroll/wellness/fr   → wellness FR (palette warm, 4 zones)
# http://localhost:5173/kikiscroll/wellness/en   → wellness EN
# http://localhost:5173/kikiscroll/              → redirect vers /kikiscroll/fr
# http://localhost:5173/kikiscroll/wellness      → redirect vers /kikiscroll/wellness/fr

# 5. En console dans chaque route, vérifier :
document.documentElement.dataset.mode    // "retail" ou "wellness"
document.documentElement.lang            // "fr" ou "en"

# 6. Scroller jusqu'à la section 2 wellness, vérifier :
# - Park au début (~15% du scroll de la section sans rien bouger côté pan)
# - Pan progressif Accueil → Chaleur → Soin → Récupération
# - Park à la fin (~85% à 100% sur Récupération sans pan supplémentaire)
# - Le titre + paragraphe disparaissent en fade quand le pan commence
# - Counter "01 / 04" → "04 / 04" change avec la zone active
```

### Outils Claude utiles pour tester

- **Claude Preview MCP** (`mcp__Claude_Preview__preview_*`) — server local Vite, screenshot, eval. Configuration dans `.claude/launch.json` (créé par moi, non commit). Server config : `name: "vite"`, `runtimeArgs: ["run", "dev"]`, `port: 5173`.
- Pour démarrer : `mcp__Claude_Preview__preview_start({ name: "vite" })`

---

## Si on te demande de…

- **« Ajoute un troisième mode (hospitality / hôtel-restaurant / etc.) »** → recette dans [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) section "Comment ajouter un troisième mode". ~2h dev + le temps de produire les assets.
- **« Change un texte »** → `src/translations/{retail,wellness}.js`. Garder le format des clés. Si tu ajoutes une clé spécifique à un mode, vérifier qu'aucun consommateur ne suppose qu'elle existe partout (le code wellness est gated `mode === 'wellness'` pour ce genre de clés).
- **« Remplace une musique »** → Déposer le `.mp3` dans `public/MUSIC/` (ou `public/MUSIC/wellness/` pour scope wellness), mettre à jour `useAudioStore.js`. Vérifier que la piste loop seamlessly (`loop: true` dans Howler), niveau cohérent avec les autres (cible −14 LUFS).
- **« Déploie en prod »** → push sur `main`. CI déploie automatiquement via `.github/workflows/deploy.yml`. **Demande confirmation explicite avant de push sur main** (sécurité harness peut bloquer sinon).
- **« Crée une PR »** → `gh pr create --base main --head <branche>`. Écrire un summary à partir des commits inclus. Convention dans le repo : titre court (< 70 chars), corps détaillé en bullets si besoin.

---

## Conventions du projet

Récupérées des sessions précédentes, à respecter :
- **Réponses en français** quand c'est pertinent
- **Pas d'em dash (—) dans les textes visibles utilisateur** ; préférer virgules, deux-points ou tirets courts
- **Pas d'emojis** sauf demande explicite
- **Commits style** : titre concis + corps multi-lignes en bullet points si besoin. Toujours inclure le trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- **Ne PAS push sans confirmation explicite** sur `main` (action partagée, le harness peut bloquer)
- **Ne PAS toucher au retail** en travaillant sur wellness — la garantie d'isolation est un asset

---

## Contacts

- **Utilisateur principal** : Jeremie Pavesi, jeremie@kikinastudio.com
- **Email contact site** : bianca@kikinastudio.com (mailto, ne pas afficher publiquement)
- **Repo** : github.com/KikinaStudio/kikiscroll
- **Live** : https://kikinastudio.github.io/kikiscroll/
