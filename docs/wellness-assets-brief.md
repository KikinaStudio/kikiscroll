# Wellness Assets — Brief de production

Brief destiné aux photographes / designers (image) et compositeurs / sound designers (musique) pour produire les assets manquants de la version wellness du site Kikiscroll.

Le code de la sous-page wellness est déjà en ligne sur `https://kikinastudio.github.io/kikiscroll/wellness/fr` (et `/en`) ; il consomme actuellement les assets retail comme placeholders. Cette doc précise ce qu'il faut produire pour les remplacer.

---

## 1. Image panoramique — `wellness_panorama.jpg`

### Rôle
Fond de la **section 2** (« Chaque espace a son propre rôle »). L'image est pannée horizontalement au scroll pour révéler successivement les 3 zones (Accueil → Cabine de soin → Espace praticien). Elle apparaît derrière une 3D blob translucide à `opacity: 0.5`.

### Spécifications techniques

| Paramètre | Valeur | Note |
|---|---|---|
| Format | JPEG (qualité 85+) | Ratio cohérent avec retail_panorama |
| Dimensions | **4128 × 1024 px** (ratio ~4:1) | À calquer sur l'existante pour ne pas toucher au code |
| Poids cible | < 1.2 Mo | retail_panorama.jpg pèse ~1 Mo |
| Profil colorimétrique | sRGB | Web standard |
| Orientation | Paysage | Lecture gauche → droite |

### Composition narrative — 3 zones, lecture horizontale

L'image est divisée mentalement en 3 tiers, mais la **transition doit être fluide et continue** (pas de coupure franche entre les zones). Le code panne le `backgroundPositionX` ainsi :

| Position pan | Zone visible | Intention |
|---|---|---|
| 0 % → 20 % | **Accueil / Réception** | Préparer le lâcher-prise |
| 20 % → 55 % | **Cabine de soin** | Approfondir la détente |
| 55 % → 85 % | **Espace praticien** | Soutenir la concentration |

> Le viewport montre une fenêtre de l'image à la fois. Pendant la transition entre Accueil et Cabine (entre 20 % et 35 % de pan), on voit un mélange visuel entre les deux zones — donc prévoir une **continuité spatiale crédible** (un long couloir, un open-space, ou une déambulation logique d'un spa).

### Ambiance et direction artistique

- **Palette** : neutre / chaude. Sable, lin, bois clair, vert sauge, terracotta sourdes. **Pas de blanc clinique pur**, pas de couleurs saturées.
- **Lumière** : douce, diffuse, légèrement dorée. Pas de contre-jour fort. Évoquer le « jour qui s'étire ».
- **Style** : épuré, qualité éditoriale. Référence type *Aesop store*, *Ten Thousand Waves*, *Aman Tokyo*, *Six Senses*. **Pas de sur-décoration**, pas de bougies/galets cliché.
- **Présence humaine** : aucune ou minimale. Si présence, silhouettes floues, dos tournés. Privilégier les espaces vides qui « attendent » le curiste.
- **Profondeur** : éviter le plan totalement frontal. Donner de la perspective, de la profondeur de champ — l'œil doit pouvoir entrer dans la scène.

### Détail par zone

#### Zone Accueil (0–20 %)
**Intention** : « Préparer le lâcher-prise ».
- Réception épurée d'un spa / institut. Comptoir bois, plantes vivantes, lumière naturelle généreuse.
- Banquette ou fauteuil d'attente vide, eau infusée, plaid plié.
- Rien d'agressif, ambiance de seuil — on entre dans un autre monde.

#### Zone Cabine de soin (20–55 %)
**Intention** : « Approfondir la détente ».
- Table de massage drapée, parée. Linge blanc cassé, oreiller cervical.
- Lumière tamisée, source indirecte (lampe sol, bougie LED).
- Détails techniques mais sobres : une serviette pliée, un bol en céramique. Pas d'huiles affichées comme un magasin.

#### Zone Espace praticien (55–85 %)
**Intention** : « Soutenir la concentration ».
- Poste de travail / desk du praticien : un meuble bas en bois, une tablette ou un cahier ouvert, peut-être un PC discret.
- Espace de transition / arrière-boutique d'un institut, organisé, fonctionnel mais doux.
- Lumière de travail (focalisée mais chaude), ambiance « concentration calme ».

### À éviter
- Décor « spa luxe ostentatoire » (or, marbre rose, palmiers en plastique)
- Personnes en peignoir blanc qui sourient à la caméra
- Mots / logos / typographie incrustés
- Vignettage marqué, flou artistique excessif
- Surexposition / hautes lumières cramées (le blob 3D devant noiera tout)

### Livrable
- 1 fichier `wellness_panorama.jpg` aux dimensions exactes 4128 × 1024
- Optionnel : 1 version `@2x` (8256 × 2048) pour écrans haute densité, si le poids reste sous 2.5 Mo
- À déposer dans `public/IMAGES/wellness_panorama.jpg` (remplace le placeholder)

---

## 2. Musiques — 3 pistes prioritaires

### Contexte technique commun

| Paramètre | Valeur | Justification |
|---|---|---|
| Format | **MP3, 48 kHz, 128 kbps minimum** | Cohérent avec retail (Bossa.mp3 est en 256 kbps, c'est OK aussi) |
| Canaux | Stéréo | Web Audio API / Howler.js |
| Durée | **3 à 4 minutes** | Pour varier sans forcer la boucle ; les pistes retail font ~3:44 |
| Boucle | **Seamless loop** | `loop: true` dans Howler — pas de silence en fin, pas de claquement au retour début. Tester en bouclant 5 fois sans fade. |
| Niveau de mix | **−14 LUFS intégré (target broadcast streaming)** | Toutes les pistes du site doivent avoir un niveau cohérent : le moteur audio fait des crossfades (`fadeTrack`) avec des volumes 0→1, donc une piste plus forte qu'une autre déséquilibre l'expérience. |
| Peak max | **−1 dBTP (true peak)** | Headroom pour éviter clipping sur les fades |
| Dynamique | **Plage dynamique réduite** | Ne PAS être très contrasté en intensité — les fades de section enveloppent déjà le rendu, donc une piste très dynamique sonnera incohérente. Compresser modérément. |
| Tonalité de référence | À aligner si possible sur le drone existant (`0 Drone.mp3`) | Les pistes jouent **simultanément** et se mélangent : éviter les frottements harmoniques avec le drone. À écouter en superposition au drone et ajuster. |

### Comment les pistes seront jouées

Le moteur audio (Howler.js) charge **toutes les pistes en parallèle au démarrage**, et fait varier leurs volumes selon le scroll. À l'entrée d'une zone section 2, la piste correspondante monte de 0 à ~0.7 en 800 ms ; à la sortie, redescend à 0. Le **drone reste toujours actif** en fond à un volume autour de 0.5.

Ça veut dire :
- Les pistes section 2 doivent **bien sonner avec le drone par-dessus**
- L'entrée / sortie de chaque piste doit être **non-événementielle** : pas de gros coup de cymbale ou de note marquée à 0:00 et 0:03:44 — sinon le fade les exposera
- Privilégier les pistes qui démarrent doucement et finissent en suspension

### Piste 1 — Accueil (`MUSIC/wellness/Accueil.mp3`)

> Remplace : `MUSIC/Synthwave_1.mp3` dans le store sous la clé `entrance`

**Brief émotionnel** : « Préparer le lâcher-prise ». Le curiste arrive, encore dans le monde du dehors. La musique doit acter une transition — un seuil — mais sans agresser. Bienvenue tactile.

| Paramètre | Recommandation |
|---|---|
| Tempo | 50–65 BPM (sous-jacent, pas marqué) |
| Tonalité | Majeure douce ou modale (lydien, mixolydien). Éviter le mineur trop mélancolique. |
| Instrumentation | Pads ambient, nappes de cordes filtrées, hang drum éparse, bols tibétains éloignés, peut-être une touche de piano feutré |
| Texture | Aérée, beaucoup d'air, réverb moyen-long (90–120 % wet) |
| Ce qu'il faut éviter | Beat clair, percussions sèches, voix, motifs reconnaissables, synthwave 80s |
| Référence | Brian Eno *Music for Airports*, Nils Frahm *Spaces* (les morceaux les plus calmes), Sigur Rós *( )* |

### Piste 2 — Cabine de soin (`MUSIC/wellness/Cabine.mp3`)

> Remplace : `MUSIC/Rap_1.mp3` dans le store sous la clé `rayon` (la clé garde son nom retail mais le sens change en wellness)

**Brief émotionnel** : « Approfondir la détente ». Le client est allongé, la séance commence. La musique doit dissoudre la perception du temps et du corps — état hypnagogique, lâcher-prise profond.

| Paramètre | Recommandation |
|---|---|
| Tempo | Pas de tempo perceptible (40–50 BPM si métrique, mais plutôt drone) |
| Tonalité | Drone profond, modale ou microtonale. Une fondamentale stable. |
| Instrumentation | Drone synthétique ou cordes, harmonics aiguës, souffle, parfois un singing bowl très lointain. Basse fréquence (40–80 Hz) **présente mais non agressive**. |
| Texture | Très enveloppante, longues notes tenues, micro-variations imperceptibles. Réverb très long (3–6 sec) ou convolution cathédrale. |
| Ce qu'il faut éviter | Toute mélodie reconnaissable, percussion, transitions marquées, voix |
| Référence | Stars of the Lid, William Basinski *Disintegration Loops*, Hammock |

### Piste 3 — Espace praticien (`MUSIC/wellness/Praticien.mp3`)

> Remplace : `MUSIC/Bossa.mp3` dans le store sous la clé `cabine` (idem, la clé garde son nom retail)

**Brief émotionnel** : « Soutenir la concentration ». Cette piste joue dans l'espace de travail du praticien : il/elle prépare, range, consulte un planning. La musique doit aider à rester focus sans somnolence — calme mais légèrement plus présente que les deux autres.

| Paramètre | Recommandation |
|---|---|
| Tempo | 60–80 BPM, marqué très subtilement (pulsation discrète, pas de beat) |
| Tonalité | Modale, tonique stable. Peut explorer un peu plus de mouvement harmonique que les deux autres. |
| Instrumentation | Piano feutré, vibraphone, kalimba ou cordes légères, basse acoustique discrète. Plus organique, moins « ambient pur ». |
| Texture | Plus narrative que les deux autres mais toujours sobre. Moins de réverb (50–80 % wet). |
| Ce qu'il faut éviter | Bossa traditionnelle, jazz mainstream, musique « lounge cliché », beats marqués, voix |
| Référence | Nils Frahm *Felt*, Goldmund, Ólafur Arnalds *Some Kind of Peace*, Hauschka |

### À écouter en contexte avant validation

Avant de bookler les compositions, écouter **en simultané avec `0 Drone.mp3`** au volume 0.5. Si une piste « lutte » avec le drone (frottement harmonique, clash dynamique), ajuster.

---

## 3. Pistes secondaires — à évaluer en contexte

Les pistes suivantes existent déjà (utilisées par le retail) et sont **réutilisées en wellness pour l'instant**. Elles sont marquées `TODO: validate or replace for wellness` dans [src/store/useAudioStore.js](../src/store/useAudioStore.js). Décision à prendre piste par piste **après écoute sur le site déployé** :

| Clé | Fichier actuel | Section | Verdict initial | Action |
|---|---|---|---|---|
| `jungle` | `Jungle.mp3` | s3 état Relaxation (0–33 %) | Probablement à remplacer (trop « extérieur tropical » pour un spa) | Composer une nappe organique de respiration, 3 min |
| `pulsatingWave` | `Pulsating Wave.mp3` | s3 état Régulation parasympathique (33–66 %) | Probablement OK | Écouter, valider |
| `focusCognitif` | `Focus Cognitif.mp3` | s3 état Ancrage attentionnel (66–100 %) | Probablement OK | Écouter, valider |
| `happy` | `HAPPY.mp3` | s4 quand caméra détecte sourire | À vérifier — l'idéal serait une version « détente apaisée » plutôt que joyeuse | Écouter, remplacer si trop pop |
| `sad` | `SAD.mp3` | s4 quand caméra détecte visage neutre/tendu | À vérifier — wellness veut « respiration en attente » plutôt que mélancolique | Écouter, remplacer si trop triste |
| `strings`, `bass`, `drums`, `keyboard` | `1–4.mp3` | s5 stems densité (4 couches qui s'empilent) | Si trop « morceau pop », remplacer par couches texturales (souffle aigu, drone basse, gouttes, tissu) | Tester l'effet d'empilement, juger l'ensemble |
| `crowd` | `Crowd.mp3` | s1 bruit de foule à isoler | OK universel | Garder |
| `drone` | `0 Drone.mp3` | base permanente | OK universel | Garder |

---

## 4. Livraison

### Image
- Fichier : `wellness_panorama.jpg`
- Destination : `public/IMAGES/wellness_panorama.jpg` (remplace le placeholder existant)

### Musique (3 pistes prioritaires)
- Fichiers : `Accueil.mp3`, `Cabine.mp3`, `Praticien.mp3`
- Destination : créer `public/MUSIC/wellness/` puis y déposer les 3 fichiers
- Mise à jour code : remplacer les 3 chemins dans [src/store/useAudioStore.js#L40-42](../src/store/useAudioStore.js#L40) :
  - `entrance.src` → `MUSIC/wellness/Accueil.mp3`
  - `rayon.src` → `MUSIC/wellness/Cabine.mp3`
  - `cabine.src` → `MUSIC/wellness/Praticien.mp3`
- Supprimer les commentaires `// TODO` correspondants

### Process de validation
1. Écouter chaque piste **seule** en boucle 5 fois → valider seamless loop, valider niveau LUFS
2. Écouter en superposition avec `0 Drone.mp3` → valider absence de frottement
3. Déployer en local (`npm run dev`) → tester sur la sous-page wellness le scroll de la section 2
4. Valider la transition entre zones (les fades sont en 800 ms par défaut)
5. Tester avec et sans casque, à différents volumes
