// Hôtellerie deck — /kikiscroll/hotels
//
// Même moteur et même grammaire visuelle que le leaflet wellness et le deck
// events : un geste = une slide, image plein écran, key figure au centre,
// légende courte en bas à gauche. Les slides « spéciales » (colonnes, cartes,
// équipe, finale) sortent de ce gabarit quand le propos l'exige.
//
// Tout le texte vit ici — édite sans toucher au JSX. La copie reste courte,
// au niveau des légendes du leaflet. Pas de tiret cadratin (—), jamais.
//
// IMAGES DE FOND : placeholders pris dans le jeu leaflet existant en attendant
// les visuels dédiés. Pour les remplacer, dépose les fichiers dans
// public/IMAGES/hotels/ et change `IMG` ci-dessous + les `src`.

const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/leaflet/${name}`;
// Visuels dédiés à la page hôtellerie (public/IMAGES/hotels/).
const HIMG = (name) => `${BASE}IMAGES/hotels/${name}`;
const LOGO = (file) => `${BASE}IMAGES/leaflet/logos/${file}.png`;

export const META = {
    title: 'Kikina⎜Le bien-être dans chaque recoin de l’hôtel',
    description:
        "Tout l'hôtel a été pensé pour le bien-être, sauf le son. Un paysage sonore génératif et neuro-informé, calibré espace par espace.",
};

export const ENTRY = {
    eyebrow: 'Kikina · Hôtellerie',
    title: ['Diffuser le bien-être', 'dans chaque recoin de l’hôtel.'],
    sub: 'Tout a été pensé pour le bien-être. Sauf le son.',
    button: 'Entrer',
};

// Roster client complet (logos disponibles + repli texte pour ceux sans SVG).
const CLIENTS = [
    { name: 'Kering', src: LOGO('kering') },
    { name: 'L’Oréal', src: LOGO('loreal') },
    { name: 'Guerlain', src: LOGO('guerlain') },
    { name: 'Pernod Ricard', src: LOGO('pernod-ricard') },
    { name: 'Puressentiel', src: LOGO('puressentiel') },
    { name: 'Pierre Fabre', src: LOGO('pierre-fabre') },
    { name: 'Harmonie Mutuelle', src: LOGO('harmonie-mutuelle') },
    { name: 'UNICEF', src: LOGO('unicef') },
    { name: 'Maisons du Monde', src: LOGO('maisons-du-monde') },
    { name: 'Publicis Groupe', src: LOGO('publicis') },
    { name: 'René Furterer', src: LOGO('furterer') },
    { name: 'PiLeJe', src: LOGO('pileje') },
    { name: 'bpifrance', src: LOGO('bpifrance') },
    { name: 'Institut du Monde Arabe', src: LOGO('institut-du-monde-arabe') },
    { name: 'ESCP Business School', src: LOGO('escp') },
    { name: 'Marie Claire', src: LOGO('marie-claire') },
    { name: 'Fédération Française du Prêt-à-Porter Féminin', src: LOGO('ffpapf') },
    { name: 'AP-HP, Hôpital Ambroise-Paré', src: LOGO('hopital-ambroise-pare') },
    { name: 'JCDecaux', src: LOGO('jcdecaux') },
];

export const SLIDES = [
    // 1 — Le bien-être n'est plus un service
    {
        key: 'dimension',
        src: HIMG('01-corridor.jpg'),
        dark: true,
        eyebrow: 'Le bien-être n’est plus un service',
        stat: '23,3 %',
        statSub: 'du tourisme bien-être passe par l’hébergement, devenu son premier poste de dépense.',
        body: [
            'Design, sommeil, nourriture, mouvement : tout l’hôtel a été pensé pour le bien-être.',
            'Une dimension est restée en retrait : le son, encore géré comme une playlist. C’est cette couche que nous concevons.',
        ],
        sources: ['Grand View Research / GWI, 2025'],
        label: 'Le bien-être n’est plus un service',
    },

    // 2 — Les deux tendances qui montent (= notre objectif + notre tech)
    {
        key: 'demande',
        src: HIMG('02-lounge.jpg'),
        eyebrow: 'Les deux secteurs du bien-être qui explosent',
        stats: [
            { figure: '+19,5 %', unit: 'par an', sub: 'La croissance de l’immobilier dédié au bien-être.' },
            { figure: '+12,4 %', unit: 'par an', sub: 'La croissance du bien-être mental.' },
        ],
        body: [
            'Ces deux tendances convergent dans l’hôtel : un lieu pensé pour le bien-être, où le client vient chercher un état mental.',
            'Kikina compose à cette intersection.',
        ],
        sources: ['Global Wellness Institute'],
        label: 'Les deux secteurs du bien-être qui explosent',
    },

    // 3 — La musique évolutive (le clou : présent/absent, vivant/figé)
    {
        key: 'evolutive',
        type: 'cols',
        src: IMG('11-score.webp'),
        eyebrow: 'La musique évolutive',
        title: 'Le souffle du live, sans la contrainte du live.',
        intro: 'Toute la musique connue tient en deux modèles. Nous ouvrons le troisième : un son composé par l’humain, porté par notre technologie et dirigé en direct par l’IA, pour amplifier l’expérience client, espace par espace, moment par moment.',
        columns: [
            { tag: 'Le live', artist: 'Artiste présent', music: 'Vivante', alive: true, living: false, body: 'Elle réagit à la salle et à l’instant. Mais elle ne dure qu’un soir.' },
            { tag: 'Le disque & le streaming', artist: 'Artiste absent', music: 'Figée', alive: false, living: false, body: 'Partout, tout le temps. Mais identique à chaque écoute, jusqu’à l’usure.' },
            { tag: 'Kikina', artist: 'Artiste absent', music: 'Vivante', alive: true, living: true, badge: 'IA chef d’orchestre', body: 'Générée en continu, jamais deux fois la même, calibrée pour le lieu et le moment.' },
        ],
        foot: 'La musique active le même circuit de récompense que la nourriture.',
        footSource: 'Salimpoor & Zatorre, Nature Neuroscience, 2011',
        label: 'La musique évolutive',
    },

    // 4 — Un objectif neurophysiologique par espace
    {
        key: 'espaces',
        type: 'cards',
        src: IMG('12-imprint.jpg'),
        eyebrow: 'Un objectif par espace',
        title: 'Chaque espace appelle un état mental précis.',
        cards: [
            {
                title: 'Réception',
                icon: 'reception',
                body: 'Faire retomber la tension de l’arrivée. Le client passe de l’agitation de la rue à l’état calme de l’hôtel, dès les premières secondes.',
                tag: '−65 %',
                tagLabel: 'Anxiété',
            },
            {
                title: 'Ascenseur',
                icon: 'elevator',
                body: 'Habiter un temps court et clos sans gêne. Une respiration tenue entre deux espaces, pour ne pas casser l’élan.',
                tag: '−40 %',
                tagLabel: 'Perception du temps',
            },
            {
                title: 'Couloirs',
                icon: 'corridor',
                body: 'Guider et préparer. L’activation redescend progressivement à mesure qu’on approche de la chambre.',
                tag: '+12 %',
                tagLabel: 'Calme ressenti',
            },
            {
                title: 'Zone de repos',
                icon: 'rest',
                body: 'Basculer en parasympathique. Le corps récupère vite, la charge mentale s’allège.',
                tag: '−25 %',
                tagLabel: 'Cortisol',
            },
            {
                title: 'Zone de travail',
                icon: 'work',
                body: 'Soutenir l’attention sans la fatiguer. Un fond stable qui tient la concentration sur la durée.',
                tag: '+7,4 %',
                tagLabel: 'Concentration',
            },
            {
                title: 'Spa',
                icon: 'spa',
                body: 'Lâcher-prise profond. Un tempo lent qui ralentit le souffle et le rythme cardiaque.',
                tag: '−10 BPM',
                tagLabel: 'Rythme cardiaque',
            },
        ],
        foot: 'Chaque espace est habillé selon l’état qu’il doit induire, pas selon un goût musical.',
        footSource: 'JMIR Mental Health, 2025 · Applied Ergonomics · Bernardi, Heart, 2006',
        label: 'Un objectif par espace',
    },

    // 5 — La chambre
    {
        key: 'chambre',
        src: HIMG('05-bedroom.jpg'),
        dark: true,
        eyebrow: 'La chambre',
        stats: [
            { figure: '+27 %', sub: 'de qualité de sommeil chez les patients exposés à de la musique avant l’endormissement.' },
            { figure: '+36 min', sub: 'de sommeil gagnées par nuit grâce à la musique avant l’endormissement.' },
            { figure: '62 %', sub: 'des gens ont déjà utilisé la musique pour s’endormir.' },
        ],
        body: [
            'C’est dans la chambre que le séjour se gagne ou se perd : ralentir le souffle, soutenir l’endormissement, récupérer vraiment.',
            'Le sommeil est la nouvelle frontière du bien-être, et il se joue ici, pas au spa. Plus d’un voyageur sur quatre prévoit déjà de réserver un soin pour mieux dormir pendant ses vacances.',
            'Une chambre qui agit sur le sommeil, c’est un avis qui change, un client qui revient, une nuit qu’on facture autrement.',
        ],
        sources: ['Méta-analyse, milieu de soins', 'Scientific Reports'],
        label: 'La chambre',
    },

    // 6 — Les moyens de diffusion (la chambre mise en avant)
    {
        key: 'diffusion',
        type: 'cards',
        src: IMG('04-heat.jpg'),
        eyebrow: 'Les moyens de diffusion',
        title: 'Une diffusion pensée pour chaque espace, jamais au hasard.',
        intro: 'Le dispositif s’adapte à l’existant, télé, écouteurs, enceintes ou induction, sans imposer de nouveau matériel.',
        cards: [
            {
                title: 'Chambre',
                icon: 'bed',
                feature: true,
                badge: 'Le cœur du dispositif',
                body: 'Via les écouteurs du client ou diffusé dans la pièce quand il est seul. L’expérience le suit dans sa chambre, à son volume, et le sommeil devient le moment clé.',
            },
            { title: 'Réception', icon: 'reception', body: 'Enceintes discrètes, intégrées ou posées selon l’existant. Champ large et enveloppant pour couvrir un grand volume ouvert.' },
            { title: 'Ascenseur', icon: 'elevator', body: 'Diffusion locale dédiée, calibrée pour un volume clos et un temps très court.' },
            { title: 'Couloirs', icon: 'corridor', body: 'Enceintes réparties à niveau bas et constant. Aucune rupture sonore d’une zone à l’autre.' },
            { title: 'Zone de repos', icon: 'rest', body: 'Enceintes directionnelles : un faisceau orienté vers les assises, qui s’efface dès qu’on s’éloigne.' },
            { title: 'Zone de travail', icon: 'work', body: 'Fond maîtrisé à niveau stable, sans pic, pour tenir l’attention sans la casser.' },
            { title: 'Spa', icon: 'spa', body: 'Diffusion immersive : transducteurs dans les tables de soin ou casque, pour un enveloppement complet.' },
        ],
        label: 'Les moyens de diffusion',
    },

    // 7 — L'expérience continue à la maison
    {
        key: 'maison',
        src: IMG('02-ear.jpg'),
        eyebrow: 'L’expérience continue à la maison',
        stats: [
            { figure: '5-25×', sub: 'Acquérir un client coûte 5 à 25 fois plus que le retenir.' },
            { figure: '+5 %', sub: '5 % de rétention en plus, c’est 25 à 95 % de profit en plus.' },
            { figure: '40 %', sub: 'du chiffre d’affaires vient de 8 % de clients fidèles.' },
        ],
        body: [
            'Le séjour finit, le son reste. Le client retrouve l’ambiance de l’hôtel sur une application ou un espace web aux couleurs de la marque.',
            'Il y prolonge chez lui l’expérience émotionnelle, validée par les neurosciences, vécue sur place. Et l’hôtel garde un point de contact vivant, bien après le départ.',
            'Un objet de fidélité qui ne ressemble pas à un programme de fidélité.',
        ],
        sources: ['Harvard Business Review', 'Forbes / Bain', 'smile.io'],
        label: 'L’expérience continue à la maison',
    },

    // 8 — L'équipe
    {
        key: 'equipe',
        type: 'team',
        src: IMG('03-threshold.jpg'),
        eyebrow: 'L’équipe',
        title: 'Création sonore et rigueur scientifique.',
        members: [
            {
                name: 'Jérémie Guez',
                role: 'Co-fondateur · Direction artistique',
                bio: 'Musicien et sound designer. Il façonne la signature sonore de chaque lieu et tient la cohérence artistique de bout en bout.',
                photo: HIMG('team/jeremie.jpg'),
            },
            {
                name: 'Bianca Guez',
                role: 'Co-fondatrice & présidente · Stratégie',
                bio: 'Elle relie la science, le son et la marque, et porte l’expérience Kikina auprès des hôtels.',
                photo: HIMG('team/bianca.webp'),
            },
            {
                name: 'Arthur Boval',
                role: 'Compositeur-développeur · Technologie',
                bio: 'Architecte du moteur génératif Kikina. Il rend la musique vivante : composée en continu, jamais deux fois la même.',
                photo: HIMG('team/arthur.webp'),
            },
            {
                name: 'Nicolas Decat',
                role: 'Neuroscientifique · Conseil scientifique',
                bio: 'Garant de la rigueur derrière chaque choix sonore : ce qui sépare une ambiance agréable d’un environnement qui agit sur le système nerveux.',
                photo: HIMG('team/nicolas.webp'),
            },
            {
                name: 'Michelle George',
                role: 'Docteure en neurosciences · Conseil scientifique',
                bio: 'Chercheuse à l’Institut du Cerveau (ICM), spécialisée sur le sommeil et les états de conscience. Elle valide les choix sonores qui agissent sur l’endormissement et la qualité du repos.',
                photo: null,
            },
        ],
        label: 'L’équipe',
    },

    // 9 — Contact et clients (finale)
    {
        key: 'contact',
        type: 'finale',
        src: IMG('09-presence.jpg'),
        eyebrow: 'Parlons de vos espaces',
        display: ['Écoutez par vous-même.'],
        // [À FOURNIR] : destination finale du bouton.
        cta: { label: 'Nous contacter', href: 'mailto:jeremie@kikinastudio.com' },
        logos: CLIENTS,
        label: 'Parlons de vos espaces',
    },
];
