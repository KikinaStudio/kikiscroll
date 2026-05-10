# Wellness Sub-Page — Dev Handoff

Spec technique de la sous-page wellness (`/kikiscroll/wellness/<lang>`) déployée dans le commit [`1f9ae04`](https://github.com/KikinaStudio/kikiscroll/commit/1f9ae04).

Document destiné à un développeur qui doit (a) onboarder sur l'architecture multi-mode, (b) substituer les assets placeholders par les assets définitifs, ou (c) ajouter un troisième mode dans le futur.

---

## Overview

Le site Kikiscroll sert deux variantes (modes) du même parcours scrollytelling :
- **Retail** (existant) — `/kikiscroll/<lang>` — orienté boutiques, événements, expérience client
- **Wellness** (nouveau) — `/kikiscroll/wellness/<lang>` — orienté spas, instituts, soin

Les deux modes partagent **100 % du code** (composants React, moteur audio Howler.js, scène Three.js, détection émotion face-api.js, animations GSAP). Seuls divergent :
1. Les **traductions** (FR/EN par mode)
2. Les **chemins audio** (par mode)
3. L'**image panoramique** de la section 2 (par mode)

Le mode est résolu **une seule fois au chargement** depuis l'URL, puis stocké dans un React Context. Pas de toggle runtime, pas de switch dynamique — chaque session est mono-mode.

---

## Architecture

### Stack

| Technologie | Usage |
|---|---|
| React 18 + Vite 5 | App SPA |
| Zustand | Store audio (`useAudioStore`) |
| Howler.js | Lecteur audio multi-piste avec crossfade |
| Three.js / @react-three/fiber | Blob 3D animée |
| GSAP ScrollTrigger | Pinning des sections au scroll |
| @studio-freight/lenis | Scroll smooth |
| face-api.js | Détection émotion section 4 |
| GitHub Pages + Actions | Déploiement (workflow `.github/workflows/deploy.yml`) |

### Flow de routage

```
Browser hits /kikiscroll/wellness/fr
  │
  ▼
GitHub Pages 404.html (rafgraph SPA shim)
  │  Redirect via JS to /kikiscroll/?/wellness/fr
  ▼
GitHub Pages serves /kikiscroll/index.html
  │  Inline script reads ?/wellness/fr → history.replaceState to /kikiscroll/wellness/fr
  ▼
main.jsx executes
  │  parseUrlMode() → { mode: "wellness", lang: "fr" }
  │  document.documentElement.dataset.mode = "wellness"
  │  document.documentElement.lang = "fr"
  ▼
React tree mounts
  <ModeProvider mode="wellness">
    <LanguageProvider lang="fr">
      <App />
    </LanguageProvider>
  </ModeProvider>
  │
  ▼
useTranslation() → translations.wellness.fr
useAudioStore → instances built from WELLNESS_TRACKS (resolved at module load)
```

### Layered context wiring

`ModeProvider` enveloppe `LanguageProvider`. Le hook `useTranslation()` lit les deux contexts et résout `translations[mode][lang]`. Le `useAudioStore` ne consomme pas le React Context — il importe `parseUrlMode()` directement depuis `urlMode.js` et l'invoque au chargement du module (avant que React ne monte). Cohérent : le mode ne change pas après chargement.

---

## Fichiers critiques

### Nouveaux fichiers (commit `1f9ae04`)

| Fichier | Rôle |
|---|---|
| [src/urlMode.js](../src/urlMode.js) | Source unique de parsing URL — exporte `parseUrlMode()` et `buildPath()`. Consommé par main.jsx (routing) ET useAudioStore (sélection de tracks au module load). |
| [src/ModeContext.jsx](../src/ModeContext.jsx) | React Context du mode. Expose `<ModeProvider>` et `useMode()`. |
| [src/translations/index.js](../src/translations/index.js) | Bundle `{ retail, wellness }` exporté par défaut. |
| [src/translations/retail.js](../src/translations/retail.js) | Traductions FR/EN du mode retail (contenu inchangé vs ancien `src/translations.js`). |
| [src/translations/wellness.js](../src/translations/wellness.js) | Traductions FR/EN du mode wellness. |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| [src/main.jsx](../src/main.jsx) | Utilise `parseUrlMode()` au lieu d'un parsing inline. Wrappe `<App />` dans `<ModeProvider>` + `<LanguageProvider>`. Set `document.documentElement.dataset.mode`. |
| [src/LanguageContext.jsx](../src/LanguageContext.jsx) | `useTranslation()` lit `useMode()` en plus du `LanguageContext`, retourne `{ t, lang, mode }`. |
| [src/store/useAudioStore.js](../src/store/useAudioStore.js) | Définit `RETAIL_TRACKS` et `WELLNESS_TRACKS`. Sélectionne `TRACKS = mode === 'wellness' ? WELLNESS_TRACKS : RETAIL_TRACKS` au module load via `parseUrlMode()`. |
| [src/App.jsx](../src/App.jsx#L463) | `useTranslation()` destructure aussi `mode`. Le panorama image utilise `url(/kikiscroll/IMAGES/${mode}_panorama.jpg)`. |

### Fichier supprimé

- `src/translations.js` (remplacé par le dossier `src/translations/`)

---

## URL routing — règles complètes

| URL | Comportement |
|---|---|
| `/kikiscroll/` | Redirect 302 (côté JS) vers `/kikiscroll/fr` |
| `/kikiscroll/fr` | Mode retail, langue FR — render |
| `/kikiscroll/en` | Mode retail, langue EN — render |
| `/kikiscroll/wellness` | Redirect vers `/kikiscroll/wellness/fr` |
| `/kikiscroll/wellness/` | idem |
| `/kikiscroll/wellness/fr` | Mode wellness, langue FR — render |
| `/kikiscroll/wellness/en` | Mode wellness, langue EN — render |
| `/kikiscroll/foo` | Mode retail, langue invalide → redirect `/kikiscroll/fr` |
| `/kikiscroll/wellness/foo` | Mode wellness, langue invalide → redirect `/kikiscroll/wellness/fr` |
| `/kikiscroll/wellness/fr/extra` | Segments en trop ignorés — render mode wellness FR |

Implémentation : voir [src/urlMode.js](../src/urlMode.js) et [src/main.jsx](../src/main.jsx).

---

## Modèle des traductions

Toutes les clés de traduction sont **strictement identiques** entre `retail.fr`, `retail.en`, `wellness.fr`, `wellness.en`. Cela garantit que tout consommateur (`t['s0_title']` etc.) fonctionne dans les 4 combinaisons sans branche conditionnelle.

Les zones de la section 2 utilisent les clés `zone_entree`, `zone_rayon`, `zone_equipe` (héritées du retail). En mode wellness, leurs **valeurs** changent (Accueil / Cabine de soin / Espace praticien) mais les clés restent.

Les clés du store audio (`entrance`, `rayon`, `cabine`, etc.) gardent aussi leurs noms retail. Le mapping entre clés audio et zones traductions reste implicite dans App.jsx.

---

## Audio store — modèle mode-aware

### Initialisation

```js
// src/store/useAudioStore.js
import { parseUrlMode } from '../urlMode';

const RETAIL_TRACKS = { drone: { src: 'MUSIC/0 Drone.mp3', initialVolume: 0.5 }, ... };
const WELLNESS_TRACKS = { drone: { src: 'MUSIC/0 Drone.mp3', initialVolume: 0.5 }, ... };

const { mode } = parseUrlMode();
const TRACKS = mode === 'wellness' ? WELLNESS_TRACKS : RETAIL_TRACKS;

export const useAudioStore = create((set, get) => {
    const instances = {};
    Object.keys(TRACKS).forEach((key) => {
        instances[key] = new Howl({ src: [TRACKS[key].src], loop: true, ... });
    });
    // ...
});
```

### Pourquoi pas via React Context ?

Le store Zustand est un **module singleton** qui s'initialise au premier import (ici dans `App.jsx`). Le tree React monte APRÈS l'initialisation du store, donc impossible de lire un Context React au moment de la création. Conclusion : le mode doit venir d'une source disponible au module load — l'URL.

Si on voulait permettre le switch de mode runtime (par ex. un bouton « passer en wellness »), il faudrait refactorer en :
- Stocker `tracks` dans un état Zustand
- Exposer un `setMode(mode)` qui détruit les Howl instances actuelles et en crée de nouvelles
- Couper l'audio en cours pendant la transition

Pas implémenté car non demandé. Mode = page reload-driven.

### Statut actuel des pistes wellness

11 des 14 pistes wellness pointent **vers les fichiers retail** (commentaires `// TODO` à chaque ligne dans [useAudioStore.js#L24-39](../src/store/useAudioStore.js#L24)). Voir [docs/wellness-assets-brief.md](./wellness-assets-brief.md) pour le brief de production des nouveaux assets.

Quand un asset wellness est livré :
1. Déposer le `.mp3` dans `public/MUSIC/wellness/<NomFichier>.mp3`
2. Modifier la ligne correspondante dans `WELLNESS_TRACKS` :
   ```diff
   -    entrance: { src: 'MUSIC/Synthwave_1.mp3', initialVolume: 0 }, // TODO: replace with MUSIC/wellness/Accueil.mp3
   +    entrance: { src: 'MUSIC/wellness/Accueil.mp3', initialVolume: 0 },
   ```
3. Tester en local : `npm run dev`, ouvrir `localhost:5173/kikiscroll/wellness/fr`, scroller jusqu'à la section 2

---

## Composants & states

Pas de nouveaux composants UI introduits par le wellness. La sous-page consomme exactement la même App qu'en retail. Les seules différences perceptibles à l'utilisateur :

| Élément | Retail | Wellness |
|---|---|---|
| Overlay tagline | « Au croisement de la science, du son et du storytelling. » | « Au croisement de la science, du son et du soin. » |
| Section 1 toggle | « Isolation activée » / « Bruit ambiant » | « Bulle de calme active » / « Bruit ambiant » |
| Section 2 zone names | Entrée / Rayon / Espace équipe | Accueil / Cabine de soin / Espace praticien |
| Section 4 instruction | « Souriez, ou non. » | « Souriez, ou laissez votre visage au repos. » |
| Section 4 webcam state | « Joyeux » / « Neutre » | « Détendu » / « Neutre » |
| Background image S2 | `retail_panorama.jpg` | `wellness_panorama.jpg` |
| Section 2 ambient music | Synthwave / Rap / Bossa | (placeholder identique) → 3 nouvelles pistes à venir |

---

## Responsive behavior

Aucun changement vs retail. La page utilise les mêmes media queries (cf. [src/App.jsx](../src/App.jsx) et [src/index.css](../src/index.css)).

À noter : le pan horizontal du panorama (section 2) reste basé sur `backgroundSize: 'auto 100%'`, donc sur très petit écran l'image est zoomée et le pan reste fonctionnel mais montre moins de contexte horizontal. Pas de breakpoint spécial mobile pour cette section.

---

## Edge cases

| Cas | Comportement |
|---|---|
| Asset wellness manquant (404 sur `MUSIC/wellness/X.mp3`) | Howler échoue silencieusement à charger ; la piste reste muette en boucle (`volume: 0`). Pas de crash. **Mais le parcours wellness perd une couche audio.** |
| Asset retail manquant en mode wellness | Idem. Tant que le drone (`0 Drone.mp3`) est OK, le site fonctionne. |
| Image `wellness_panorama.jpg` manquante | Background CSS échoue à charger, le fond reste noir derrière le blob. Pas de crash. |
| URL malformée (`/kikiscroll/wellness/fr/extra/segments`) | Les segments en trop sont ignorés. Mode = wellness, lang = fr, render. |
| Browser sans Web Audio API support | Howler bascule en mode HTML5 audio (mais on a `html5: false` actuellement → silence). À surveiller pour très vieux navigateurs. |
| Caméra refusée en section 4 | Comportement existant inchangé entre les modes. |

---

## Animation / Motion

Aucune nouvelle animation introduite. Les transitions du panorama (pan horizontal `backgroundPositionX`) et les fades audio (`fadeTrack` durée 300–800 ms) sont identiques en retail et wellness.

---

## Accessibility

Pas de régression vs retail. Les chaînes traduites en wellness respectent les mêmes règles que retail (pas d'acronymes obscurs, contraste assuré par les mêmes styles CSS).

À noter : `document.documentElement.lang` est correctement set pour les screen readers en français ou anglais selon la route. `document.documentElement.dataset.mode` est exposé pour debug / future analytics mais n'est pas une API ARIA standard.

---

## Build & Deploy

Inchangé. Le workflow [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) :
1. Trigger : push sur `main`
2. `npm ci` → `npm run build` → upload `./dist` comme Pages artifact → deploy
3. Disponible sur `https://kikinastudio.github.io/kikiscroll/...` en ~50 s

Le `dist/` est tracké dans le repo (convention de cette base de code) et a été reconstruit dans le commit. Si un futur dev n'a pas commit ses changements de `dist/`, le CI rebuild de toute façon — pas de blocage.

---

## Comment ajouter un troisième mode (ex. « hospitality »)

1. **Traductions** : créer `src/translations/hospitality.js` en copiant la structure de `wellness.js`. Adapter les valeurs.
2. **Index** : ajouter `import hospitality from './hospitality'` et l'inclure dans le bundle :
   ```js
   const translations = { retail, wellness, hospitality };
   ```
3. **URL parser** : ajouter `'hospitality'` à `SUPPORTED_MODES` dans [src/urlMode.js](../src/urlMode.js) et étendre le `if (segments[0] === 'wellness')` pour matcher les autres modes :
   ```js
   if (SUPPORTED_MODES.slice(1).includes(segments[0])) {
     mode = segments[0];
     lang = SUPPORTED_LANGS.includes(segments[1]) ? segments[1] : null;
   } else { ... }
   ```
4. **Audio store** : ajouter un `HOSPITALITY_TRACKS` et étendre la sélection :
   ```js
   const TRACKS = { retail: RETAIL_TRACKS, wellness: WELLNESS_TRACKS, hospitality: HOSPITALITY_TRACKS }[mode];
   ```
5. **Assets** : déposer un `hospitality_panorama.jpg` dans `public/IMAGES/` (le code lit déjà `${mode}_panorama.jpg` dynamiquement, rien à changer côté `App.jsx`).
6. **URLs** : `/kikiscroll/hospitality/fr` et `/kikiscroll/hospitality/en` deviennent automatiquement valides.

Total estimé : ~2 h de dev + temps de production des assets.

---

## Limitations connues

1. **Mode figé après chargement** — pas de switch retail ↔ wellness sans rechargement de page. Acceptable pour l'usage actuel (chaque cible commerciale aura son URL).
2. **Tous les Howl chargés au démarrage** — 14 fichiers MP3 préchargés (~30–50 Mo total). Si on ajoute beaucoup de modes, envisager le lazy-loading par mode.
3. **`dist/` tracké en git** — alourdit le repo (~2 Mo par build). Convention historique de ce projet, à reconsidérer un jour.
4. **Pas de tests automatisés** — il n'y a actuellement aucun test dans le repo. Toute régression doit être détectée manuellement.

---

## Vérification end-to-end

Avant de merger un changement qui touche au routing, traductions ou audio :

1. `npm run build` — vérifier qu'aucune erreur de build (les imports cassés crashent ici)
2. `npm run dev`, ouvrir successivement :
   - `http://localhost:5173/kikiscroll/fr` → contenu retail FR, audio retail
   - `http://localhost:5173/kikiscroll/en` → contenu retail EN, audio retail
   - `http://localhost:5173/kikiscroll/wellness/fr` → contenu wellness FR, audio (placeholder ou final)
   - `http://localhost:5173/kikiscroll/wellness/en` → contenu wellness EN
   - `http://localhost:5173/kikiscroll/` → redirect vers `/kikiscroll/fr`
   - `http://localhost:5173/kikiscroll/wellness` → redirect vers `/kikiscroll/wellness/fr`
3. Pour chaque route, vérifier dans la console DevTools : `document.documentElement.dataset.mode` retourne la valeur attendue
4. Scroller chaque section, vérifier qu'aucune erreur n'apparaît dans la console et que les bonnes pistes audio jouent (vérifiable visuellement via les transitions ou en monitoring `useAudioStore.getState().tracks`)
5. Tester section 4 webcam — la détection face-api.js doit fonctionner identique entre les modes
