// Hospitality deck (EN) — /kikiscroll/hotels/en
//
// English version of the hotels deck, translated from the Notion page
// "Prez Kikina Hospitality EN - Mohari (Hector Vericel)". Same engine and visual
// grammar as the FR deck (src/hotels/content.js): one gesture = one slide,
// full-screen image, key figure centred, short caption bottom-left, with a few
// "special" slides (columns, cards, team, finale).
//
// Modifications vs. the FR deck (per the Notion brief):
//   · Slide 4 gains a 7th card, "Treatment".
//   · The FR "Diffusion" slide is replaced by "The sound of your brand" (4-card
//     grid on a brand-signature theme).
//   · Slide 8 (team) adds the research partners Lullabyte & Audition Conseil.
//   · Slide 9 (finale) puts Dior back into the client wall.
//
// All copy lives here. No em dash (—), ever — use comma / colon / period / middot.

const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/leaflet/${name}`;
const HIMG = (name) => `${BASE}IMAGES/hotels/${name}`;
const LOGO = (file) => `${BASE}IMAGES/leaflet/logos/${file}.png`;

export const META = {
    title: 'Kikina⎜Composing wellbeing into every corner of the hotel',
    description:
        'The whole hotel has been designed for wellbeing, except the sound. A living, neuro-informed generative soundscape, calibrated space by space.',
};

export const ENTRY = {
    eyebrow: 'Kikina · Hospitality',
    title: ['Composing wellbeing into', 'every corner of the hotel.'],
    sub: [
        'The first living sound system for hospitality.',
        'Composed by humans, directed in real time, never twice the same.',
    ],
    button: 'Enter',
};

// Localised chrome strings (mute control, scroll hint, slide labels).
export const UI = {
    mute: 'Mute',
    unmute: 'Unmute',
    scroll: 'Scroll',
    slidesNav: 'Slides',
    slideLabel: (n, label) => `Slide ${n}: ${label}`,
};

// Client roster — same wall as the FR finale. Dior is to be added back as a real
// logo: drop dior.png in IMAGES/leaflet/logos/ and uncomment the line below
// (no text fallback wanted in the wall).
const CLIENTS = [
    // { name: 'Dior', src: LOGO('dior') },
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
    // 1 — Wellbeing is no longer a service
    {
        key: 'dimension',
        src: HIMG('01-corridor.jpg'),
        dark: true,
        eyebrow: 'Wellbeing is no longer a service',
        stat: '23.3%',
        statSub: 'of wellness tourism spending goes to accommodation, its largest category.',
        body: [
            'Design, sleep, food, movement: the whole hotel has been designed for wellbeing.',
            'Sound remains the last frontier, still treated like a playlist. We give it back its power: living, adaptive, calibrated for each space and each moment.',
        ],
        sources: ['Grand View Research / GWI, 2025'],
        label: 'Wellbeing is no longer a service',
    },

    // 2 — The two booming wellness sectors
    {
        key: 'demande',
        src: HIMG('02-lounge.jpg'),
        eyebrow: 'The two booming wellness sectors',
        stats: [
            { figure: '+19.5%', unit: 'per year', sub: 'The growth of real estate dedicated to wellness.' },
            { figure: '+12.4%', unit: 'per year', sub: 'The growth of mental wellness.' },
        ],
        body: [
            'These two trends converge in the hotel: a place designed for wellbeing, where the guest comes looking for a mental state.',
            'Kikina composes living, adaptive sound at that intersection: music that breathes with the space, responds to the moment, and acts on the body.',
        ],
        sources: ['Global Wellness Institute'],
        label: 'The two booming wellness sectors',
    },

    // 3 — Evolving music (the third model: present/absent, living/frozen)
    {
        key: 'evolutive',
        type: 'cols',
        src: IMG('11-score.webp'),
        eyebrow: 'Evolving music',
        title: ['The breath of live,', 'without the constraint of live.'],
        intro: 'All known music fits into two models. We open a third: sound composed by humans, powered by our technology and directed in real time by AI, to amplify the guest experience, space by space, moment by moment.',
        columns: [
            { tag: 'Live', artist: 'Artist present', music: 'Living music', alive: true, living: false, body: 'It reacts to the room and the moment. But it only lasts one evening.' },
            { tag: 'Record & streaming', artist: 'Artist absent', music: 'Frozen music', alive: false, living: false, body: 'Everywhere, all the time. But identical at every listen, until it wears out.' },
            { tag: 'Kikina', artist: 'Artist absent', music: 'Living music', alive: true, living: true, badge: 'AI conductor', body: 'Generated continuously, never twice the same, calibrated for each space and moment.' },
        ],
        foot: 'Music activates the same reward circuit as food.',
        sources: ['Salimpoor & Zatorre, Nature Neuroscience, 2011'],
        label: 'Evolving music',
    },

    // 4 — One objective per space (FR + a 7th card, Treatment)
    {
        key: 'espaces',
        type: 'cards',
        src: IMG('12-imprint.jpg'),
        eyebrow: 'One objective per space',
        title: 'Each space calls for a precise mental state.',
        intro: 'Each space is dressed according to the state it must induce, not according to musical taste.',
        cards: [
            {
                title: 'Reception',
                icon: 'reception',
                body: 'Letting the tension of arrival settle. The guest moves from the agitation of the street to the calm of the hotel, within the first seconds.',
                tag: '−65%',
                tagLabel: 'Anxiety',
            },
            {
                title: 'Elevator',
                icon: 'elevator',
                body: 'Inhabiting a short, enclosed time without discomfort. A subtle breath between two spaces, to keep the momentum.',
                tag: '−40%',
                tagLabel: 'Time perception',
            },
            {
                title: 'Corridors',
                icon: 'corridor',
                body: 'Guiding and preparing. Activation gradually decreases as one approaches the room.',
                tag: '+12%',
                tagLabel: 'Perceived calm',
            },
            {
                title: 'Rest area',
                icon: 'rest',
                body: 'Switching to parasympathetic. The body recovers quickly, mental load eases.',
                tag: '−25%',
                tagLabel: 'Cortisol',
            },
            {
                title: 'Workspace',
                icon: 'work',
                body: 'Holding attention without tiring it. A stable background that sustains concentration over time.',
                tag: '+7.4%',
                tagLabel: 'Concentration',
            },
            {
                title: 'Spa',
                icon: 'spa',
                body: 'Deep letting go. A slow tempo that lowers the breath and the heart rate.',
                tag: '−10 BPM',
                tagLabel: 'Heart rate',
            },
            {
                title: 'Treatment',
                icon: 'treatment',
                body: 'Scoring the ritual. Through motion sensors, the sound follows the practitioner’s gestures and the body’s response, deepening the letting go.',
                tag: '+11%',
                tagLabel: 'Relaxation',
            },
        ],
        sources: ['JMIR Mental Health, 2025 · Applied Ergonomics · Bernardi, Heart, 2006'],
        label: 'One objective per space',
    },

    // 5 — The bedroom
    {
        key: 'chambre',
        src: HIMG('05-bedroom.jpg'),
        dark: true,
        eyebrow: 'The bedroom',
        stats: [
            { figure: '+27%', sub: 'sleep quality among patients exposed to music before falling asleep.' },
            { figure: '+36 min', sub: 'of sleep gained per night thanks to music before falling asleep.' },
            { figure: '62%', sub: 'of people have already used music to fall asleep.' },
        ],
        body: [
            'This is where the stay is won or lost: slowing the breath, supporting sleep onset, truly recovering.',
            'Sleep is the new frontier of wellbeing, and it plays out here, not at the spa. More than one traveler in four already plans to book a treatment to sleep better during their vacation.',
            'A bedroom that acts on sleep means a review that changes, a guest who returns, a night that is priced differently.',
        ],
        sources: ['Meta-analysis, healthcare setting', 'Scientific Reports'],
        label: 'The bedroom',
    },

    // 6 — The sound of your brand (replaces the FR diffusion slide)
    {
        key: 'marque',
        type: 'cards',
        mod: 'h-brand', // borderless gold icons + wider head (distinct from slide 4)
        src: IMG('04-heat.jpg'),
        eyebrow: 'The sound of your brand',
        title: ['One signature.', 'Layers that tell a story.'],
        intro: 'A hotel sounds like itself, end to end: not a different playlist per room, but one coherent voice carried across the journey. The brand becomes audible.',
        cards: [
            {
                title: 'The signature',
                icon: 'signature',
                body: 'A sonic DNA defined with the brand: instruments, harmonic colors, narrative tone. Recognizable in every space.',
            },
            {
                title: 'The story',
                icon: 'story',
                body: 'A continuous arc from arrival to departure. The guest moves through spaces, but stays inside one coherent world.',
            },
            {
                title: 'Adaptation',
                icon: 'adaptation',
                body: 'Layers of tempo, density and texture adjusted space by space, in real time, to support what each moment requires.',
            },
            {
                title: 'Evolution',
                icon: 'evolution',
                body: 'The signature grows with the brand over time: seasons, collaborations, special moments.',
            },
        ],
        label: 'The sound of your brand',
    },

    // 7 — The experience continues at home
    {
        key: 'maison',
        src: IMG('02-ear.jpg'),
        eyebrow: 'The experience continues at home',
        stats: [
            { figure: '5-25×', sub: 'Acquiring a guest costs 5 to 25 times more than keeping one.' },
            { figure: '+5%', sub: '5% more retention means 25 to 95% more profit.' },
            { figure: '40%', sub: 'of revenue comes from 8% of loyal guests.' },
        ],
        body: [
            'The stay ends, the sound remains. The guest finds the hotel’s atmosphere again, beyond the stay, in everyday life.',
            'The emotional experience lived on site, validated by neuroscience, continues at home. And the hotel keeps a living point of contact, well after departure.',
            'A presence that doesn’t fade at checkout.',
        ],
        sources: ['Harvard Business Review', 'Forbes / Bain', 'smile.io'],
        label: 'The experience continues at home',
    },

    // 8 — The collective (team) + research partners
    {
        key: 'equipe',
        type: 'team',
        src: IMG('03-threshold.jpg'),
        eyebrow: 'The collective',
        title: 'Sound creation and scientific rigor.',
        members: [
            {
                name: 'Jérémie Guez',
                role: 'Co-founder · Artistic direction',
                bio: 'Musician and sound designer. He shapes the sonic signature of each place and holds the artistic coherence from end to end.',
                photo: HIMG('team/jeremie.jpg'),
            },
            {
                name: 'Bianca Guez',
                role: 'Co-founder & president · Strategy',
                bio: 'She connects science, sound and brand, and carries the Kikina experience to hotels.',
                photo: HIMG('team/bianca.jpg'),
            },
            {
                name: 'Arthur Boval',
                role: 'Composer-developer · Technology',
                bio: 'Architect of Kikina’s generative engine. He makes the music alive: composed continuously, never twice the same.',
                photo: HIMG('team/arthur.webp'),
            },
            {
                name: 'Nicolas Decat',
                role: 'Neuroscientist · Scientific advisor',
                bio: 'Guarantor of the rigor behind every sonic choice: what separates a pleasant atmosphere from an environment that acts on the nervous system.',
                photo: HIMG('team/nicolas.webp'),
            },
            {
                name: 'Michelle George',
                role: 'PhD in Neuroscience',
                bio: 'Researcher at the Paris Brain Institute (ICM), specialized in sleep and states of consciousness. She validates the sonic choices that act on sleep onset and rest quality.',
                photo: HIMG('team/michelle.jpg'),
            },
        ],
        partners: [
            { name: 'Lullabyte', note: 'The European research network on music and sleep' },
            { name: 'Audition Conseil', note: 'Scientific committee & foundation supporting research in hearing health' },
        ],
        label: 'The collective',
    },

    // 9 — Let's talk about your spaces (finale)
    {
        key: 'contact',
        type: 'finale',
        src: IMG('09-presence.jpg'),
        eyebrow: 'Let’s talk about your spaces',
        display: ['Listen for yourself.'],
        cta: { label: 'Contact us', href: 'mailto:jeremie@kikinastudio.com' },
        logos: CLIENTS,
        label: 'Let’s talk about your spaces',
    },
];
