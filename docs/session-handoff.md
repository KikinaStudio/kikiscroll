# Session Handoff — Kikiscroll Wellness

> Document destiné à une **autre session Claude Code** qui reprend ce projet sans contexte. Lis ce fichier **avant** d'agir. Il résume l'état du repo, ce qui a été fait, ce qu'il reste à faire, et les décisions déjà prises (à ne pas re-débattre).

Dernière mise à jour : **2026-05-12**

---

## TL;DR (30 secondes)

1. Le site Kikiscroll a maintenant **deux variantes** : retail (`/kikiscroll/<lang>`) et wellness (`/kikiscroll/wellness/<lang>`), `<lang>` ∈ `{fr, en}`. 4 URLs au total.
2. Le mode est résolu **une seule fois au chargement** depuis l'URL via `src/urlMode.js`, puis injecté dans `ModeContext` + lu par le store audio au module load. Pas de switch runtime.
3. La version retail est **inchangée** et reste en prod sur `main`.
4. La version wellness existe en **deux états** :
   - **Sur `main`** (déployé) : version simple — 3 zones réutilisant les couleurs retail, assets placeholders (panorama copié du retail, musiques retail).
   - **Sur la branche `wellness-spa-luxe-refonte`** (pushée mais pas mergée) : refonte complète "spa luxe 2026" — 4 zones (parallax carousel), 4 vraies images de zone, palette warm spa (sable/pêche/rose), Scene 3D recolorée galet, vapeur sprite. **Pas encore live**, en attente de validation et de musiques bespoke.
5. Tu es probablement sur `wellness-spa-luxe-refonte`. Vérifie avec `git branch --show-current`.

---

## Arbre du repo et fichiers clés à lire en priorité

```
Kikiscroll/
├── README.md                              ← Vue d'ensemble du projet (à lire en 1er)
├── docs/
│   ├── session-handoff.md                 ← Ce fichier
│   ├── wellness-dev-handoff.md            ← Spec technique (peut être un peu en retard sur le spa luxe refonte — voir §“Évolutions depuis sa rédaction”)
│   └── wellness-assets-brief.md           ← Brief de production assets (idem, à mettre à jour pour 4 zones)
├── public/
│   ├── IMAGES/
│   │   ├── retail_panorama.jpg            ← Panorama retail (section 2)
│   │   ├── wellness_panorama.jpg          ← Placeholder, UTILISÉ UNIQUEMENT sur main, plus utilisé en spa luxe refonte (4 images séparées)
│   │   ├── wellness_zone_accueil.jpg      ← 4 zones spa luxe (uniquement sur branche)
│   │   ├── wellness_zone_chaleur.jpg
│   │   ├── wellness_zone_soin.jpg
│   │   └── wellness_zone_recuperation.jpg
│   └── MUSIC/                              ← Pistes retail. Pas encore de sous-dossier wellness/ (les wellness fallback vers retail)
└── src/
    ├── main.jsx                            ← Parsing URL + montage ModeProvider/LanguageProvider
    ├── urlMode.js                          ← parseUrlMode() — source unique URL → {mode, lang}
    ├── ModeContext.jsx                     ← React Context du mode
    ├── LanguageContext.jsx                 ← useTranslation() → {t, lang, mode}
    ├── translations/
    │   ├── index.js                        ← Bundle { retail, wellness }
    │   ├── retail.js
    │   └── wellness.js                     ← Réécrit "spa luxe 2026" sur la branche (nouvelles clés zone_*_body, zone_recuperation_*)
    ├── store/useAudioStore.js              ← RETAIL_TRACKS + WELLNESS_TRACKS, lu au module load
    ├── App.jsx                             ← Orchestre tout (sections, audio, UI). Branche wellness pour panorama, audio s2, palette
    ├── components/Scene.jsx                ← 3D blob. Branche wellness pour material + WellnessSteam vs SpaceDust
    └── index.css                           ← Palette wellness scopée par `html[data-mode="wellness"]` + classes `.spa-panorama__*`
```

**Pour comprendre l'architecture mode-aware** : lis dans l'ordre `urlMode.js`, `main.jsx`, `LanguageContext.jsx`, `useAudioStore.js`. ~5 minutes.

---

## État des branches (au 2026-05-12)

| Branche | Dernier commit | Live ? | Contenu |
|---|---|---|---|
| `main` | `d6779fe` Add wellness handoff docs | ✅ Déployé sur GitHub Pages | Wellness "v1" simple, assets placeholders pointant retail |
| `wellness-spa-luxe-refonte` | `84d6eda` Refonte ambiance wellness: spa luxe 2026 | ❌ Pas mergé, push uniquement | Wellness "v2" spa luxe — 4 zones, palette warm, blob galet, vapeur. Retail intact. |

**URL live actuelle** : https://kikinastudio.github.io/kikiscroll/wellness/fr → version v1 simple.

**Pour merger la spa luxe refonte en prod** :
```
git checkout main
git merge wellness-spa-luxe-refonte  # ou PR via gh pr create
git push origin main
```
L'action `Deploy Vite site to GitHub Pages` (`.github/workflows/deploy.yml`) redéploiera automatiquement.

⚠️ **Avant de merger**, demander confirmation à l'utilisateur (Jeremie, jeremie@kikinastudio.com). La refonte spa luxe est prête techniquement mais peut-être pas validée éditorialement.

---

## Ce qui est fait (chronologie compactée)

### Sessions précédentes (déjà sur `main`)

1. **`1f9ae04` Add wellness sub-page with mode-aware routing, translations, and audio**
   - Création de l'architecture mode-aware : `urlMode.js`, `ModeContext`, `translations/{retail,wellness}.js`, store mode-aware
   - Routes `/kikiscroll/wellness/{fr,en}` ajoutées et live
   - Assets wellness = placeholders (copie du retail)
   - Contenu wellness "v1" : narratif curiste / cabine de soin, ton naïf

2. **`d6779fe` Add wellness handoff docs (assets brief + dev spec)**
   - `docs/wellness-dev-handoff.md` — architecture, routing, edge cases
   - `docs/wellness-assets-brief.md` — brief production image panorama + 3 musiques

### Session "spa luxe" (sur la branche `wellness-spa-luxe-refonte`)

3. **`84d6eda` Refonte ambiance wellness: spa luxe 2026**
   - **Contenu** : wellness FR + EN réécrit avec un ton beaucoup plus premium (hôtels/instituts/thermes/retraites longévité, "composer le silence", "signature sonore par espace"). S0–S5 entièrement nouveaux.
   - **Section 2 → 4 zones** au lieu de 3 :
     - Accueil & transitions (Le seuil)
     - Rituels de chaleur (L'enveloppe)
     - Cabines de soin (Le geste)
     - Espaces de récupération (L'empreinte)
   - **Nouvelles clés de traduction** spécifiques wellness : `zone_entree_body`, `zone_rayon_body`, `zone_equipe_body`, `zone_recuperation`, `zone_recuperation_sub`, `zone_recuperation_body`. Retail n'a PAS ces clés (rupture du contrat "clés identiques" — voir §“Décisions et arbitrages”).
   - **Nouvelle piste audio** : `recuperation` ajoutée à `WELLNESS_TRACKS` (utilise Bossa.mp3 en placeholder).
   - **Section 2 visuels** : refonte complète. Plus de panorama unique. À la place, un carousel parallax 4 slides (.spa-panorama dans index.css) avec image bg + counter "01 / 04" + caption (sub/title/body).
   - **Audio crossfade s2** étendu à 4 pistes en wellness (quarters : 0–25 %, 25–50 %, 50–75 %, 75–100 %). Retail garde 3 pistes en tiers, code identique pour le retail.
   - **Section 2 icônes** : 4 SVG dédiés wellness (seuil/enveloppe/geste/empreinte). **Note : ce code est actuellement unreachable** (voir §“Dead code / cleanup à faire”).
   - **Palette CSS wellness** : `html[data-mode="wellness"]` reçoit un fond gradient warm (sable → pêche → rose), grain réduit, surcharges `text-white → text-deep`, `text-tenbin-gray → text-soft`. Le retail est intact.
   - **Scene.jsx** : `WellnessSteam` (sprites vapeur) remplace `SpaceDust` quand `IS_WELLNESS`. Blob recoloré galet/pierre polie matte avec lumière diffuse.
   - **Logo header** : `mix-blend-difference` désactivé en wellness (sinon illisible sur fond chaud), couleur `#3a2820` à la place.
   - **Footer / transition aube** : conditionnelle (noir en retail, palette warm en wellness).
   - **4 images zones wellness** ajoutées dans `public/IMAGES/wellness_zone_*.jpg` — semblent être des photos / AI dignes de production (95–212 KB chacune).

---

## Ce qui reste à faire

### Bloquant / prioritaire

1. **Décider si on merge `wellness-spa-luxe-refonte` dans `main`.** La refonte est techniquement prête. C'est une décision éditoriale de Jeremie. Tant que ce n'est pas mergé, le site live reste la v1 simple.

2. **Musiques wellness bespoke** — 4 pistes manquantes (actuellement fallback retail) :
   - `entrance` → "Accueil & transitions / Le seuil" → besoin d'une piste qui masque sans s'imposer, prépare le système nerveux
   - `rayon` → "Rituels de chaleur / L'enveloppe" → basses chaudes et textures organiques, relaxation alerte
   - `cabine` → "Cabines de soin / Le geste" → soutien du geste, pas d'aléatoire
   - `recuperation` → "Espaces de récupération / L'empreinte" → étirement parasympathique, prolongement post-soin
   - Cible `public/MUSIC/wellness/Seuil.mp3`, `Enveloppe.mp3`, `Geste.mp3`, `Empreinte.mp3` ; mettre à jour `useAudioStore.js` lignes 38–41 quand livrées.
   - Specs détaillées (tempo, références, niveaux LUFS) dans [docs/wellness-assets-brief.md](./wellness-assets-brief.md) — **doc est désormais légèrement obsolète** (4 zones au lieu de 3, noms zones différents). À mettre à jour si on commande maintenant.

3. **Validation à l'écoute des autres pistes wellness** (`jungle`, `happy`, `sad`, stems s5) — actuellement marquées TODO dans `useAudioStore.js`, on garde retail par défaut. Décider piste par piste.

### Non bloquant / cleanup

4. **Dead code à supprimer** : dans [src/App.jsx#L723](../src/App.jsx#L723), le bloc `{section.hasZonesPanorama && activeSection === index && mode !== 'wellness' && (...)}` contient un ternaire `mode === 'wellness' ? [...] : [...]` qui est unreachable (la condition extérieure exclut déjà wellness). Les 4 SVG wellness à l'intérieur (~lignes 725–786) ne s'affichent jamais. À nettoyer pour éviter la confusion.

5. **`public/IMAGES/wellness_panorama.jpg`** est devenu un asset orphelin sur la branche spa luxe refonte (plus référencé dans le code — la section 2 wellness utilise les 4 zone images individuelles). À supprimer si la branche est mergée.

6. **Docs à actualiser** une fois la spa luxe refonte mergée :
   - [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) — section "Edge cases" parle de keys strictement identiques entre modes, ce n'est plus vrai. Section sur le panorama 3 zones, plus vrai en wellness.
   - [docs/wellness-assets-brief.md](./wellness-assets-brief.md) — 3 zones devenues 4, image panorama unique remplacée par 4 zone images.

---

## Décisions et arbitrages (à ne pas re-débattre)

| Décision | Raison | Source |
|---|---|---|
| Mode résolu à l'URL au chargement, pas de switch runtime | Simplicité, le store audio s'initialise au module load et a besoin du mode dès cet instant | `useAudioStore.js` |
| Sous-page séparée `/kikiscroll/wellness/<lang>` plutôt que toggle | Choix Jeremie en début de session 1 (architecture cleaner, communication ciblée) | Question 1 du AskUserQuestion initial |
| 4 zones wellness en section 2 au lieu de 3 retail | Refonte spa luxe : un parcours spa a 4 catégories d'espace, pas 3 | Commit `84d6eda` |
| Clés de traduction NON strictement identiques entre retail/wellness | Wellness a besoin de `zone_recuperation*` et `zone_*_body` que retail n'a pas | Idem |
| Assets wellness ne pas casser le retail | Tout le code wellness est gated `mode === 'wellness'`, le retail est intact | Vérifié dans commit 84d6eda message |
| Pas de tests automatisés | Le repo n'en a jamais eu | — |
| Push direct sur main = needs explicit user confirmation (sécurité harness) | Workflow de protection Claude Code | Bloqué une fois en session 1 |

---

## Comment vérifier que tout marche (procédure rapide)

```bash
# 1. État branches
git branch --show-current
git status

# 2. Build
npm run build           # Doit passer sans erreur

# 3. Dev server
npm run dev             # Vite démarre sur :5173

# 4. Routes à tester dans le navigateur
# http://localhost:5173/kikiscroll/fr            → retail FR (inchangé)
# http://localhost:5173/kikiscroll/en            → retail EN (inchangé)
# http://localhost:5173/kikiscroll/wellness/fr   → wellness FR (spa luxe sur la branche)
# http://localhost:5173/kikiscroll/wellness/en   → wellness EN
# http://localhost:5173/kikiscroll/              → redirect vers /kikiscroll/fr
# http://localhost:5173/kikiscroll/wellness      → redirect vers /kikiscroll/wellness/fr

# 5. En console dans chaque route, vérifier :
document.documentElement.dataset.mode    // "retail" ou "wellness"
document.documentElement.lang            // "fr" ou "en"
```

### Outils Claude utiles pour tester

- **Claude Preview MCP** (`mcp__Claude_Preview__preview_*`) — server local Vite, screenshot, eval. Configuration dans `.claude/launch.json` (déjà créé, non commit). Server config : `name: "vite"`, `runtimeArgs: ["run", "dev"]`, `port: 5173`.
- Pour démarrer : `mcp__Claude_Preview__preview_start({ name: "vite" })`

---

## Si on te demande de…

- **« Ajoute un troisième mode (hospitality / hôtel-restaurant / etc.) »** → recette dans [docs/wellness-dev-handoff.md](./wellness-dev-handoff.md) section "Comment ajouter un troisième mode". Tu peux le faire en ~2h dev + le temps de produire les assets.
- **« Change un texte »** → `src/translations/{retail,wellness}.js`. Garder le format des clés ; si tu ajoutes une clé spécifique à un mode, vérifier qu'aucun consommateur ne suppose qu'elle existe partout.
- **« Remplace une musique »** → Déposer le `.mp3` dans `public/MUSIC/` (ou `public/MUSIC/wellness/` pour scope wellness), mettre à jour `useAudioStore.js`. Vérifier que la piste loop seamlessly (`loop: true` dans Howler).
- **« Déploie en prod »** → push sur `main`. CI déploie automatiquement via `.github/workflows/deploy.yml`. Demande confirmation explicite avant de push sur main.
- **« Crée une PR »** → `gh pr create --base main --head wellness-spa-luxe-refonte` (ou la branche courante). Le PR template n'existe pas, écrire un summary à partir des commits inclus.

---

## Conventions du projet

Récupérées des sessions précédentes, à respecter :
- **Réponses en français** quand c'est pertinent
- **Pas d'em dash (—) dans les textes visibles utilisateur** ; préférer virgules, deux-points ou tirets courts
- **Pas d'emojis** sauf demande explicite
- **Commits style** : titre concis + corps multi-lignes en bullet points si besoin. Toujours inclure le trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` (les commits du repo le font systématiquement)
- **Ne PAS push sans confirmation explicite** sur `main` (action partagée, le harness peut bloquer)
- **Ne PAS toucher au retail** en travaillant sur wellness — la garantie d'isolation est un asset

---

## Contacts

- **Utilisateur principal** : Jeremie Pavesi, jeremie@kikinastudio.com
- **Email contact site** : bianca@kikinastudio.com (mailto, ne pas afficher publiquement)
- **Repo** : github.com/KikinaStudio/kikiscroll
- **Live** : https://kikinastudio.github.io/kikiscroll/
