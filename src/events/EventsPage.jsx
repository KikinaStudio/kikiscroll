import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Howl } from 'howler';
import CursorCanvas from '../leaflet/CursorCanvas';
import '../leaflet/leaflet.css';

// Events deck — /kikiscroll/events.
// Same mechanics and styling as the wellness leaflet (LeafletPage): one
// gesture → one slide, GSAP track, entry overlay, drone, cursor canvas. Only
// the content differs.
//
// Storytelling (v3 — Notion "Deck événementiel v3"): cover (entry overlay) →
// Le problème (70% stat) → Ailleurs (+37% stat) → Écouter vraiment → Kikina ·
// architectes sonores (studio intro + client logos band) → Le sas en 3
// mouvements (CARDS) → Une signature → Vivant → 6 cas clients, un par slide
// (Kering · PiLeJe · UNICEF · L'Amphi · Paris Podcast · Pernod Ricard) → équipe →
// contact.
//
// Backgrounds live in public/IMAGES/events/. The client photos sit on their
// own case slides (05-cocreation = Kering, 04-coupe = L'Amphi, 07-signature =
// PiLeJe, 09-bourdelle = UNICEF). Images not in yet (13-pernod, 14-equipe) render
// on a dark canvas until dropped in. A dark base sits behind every slide. Videos:
// 06-ancrage.mp4 (on "Ailleurs" / +37%) and 08-paris-podcast.mp4 (Paris Podcast
// case). Slide shapes: `stat`/`body` (statement, optional small `source` line),
// `statLogos` (auto-scrolling client-logo marquee under the stat, studio slide,
// paired with `blurBg`), `cards` (the sas), `cases` (full-bleed panels, single
// Notion `texte` paragraph + optional `citations` testimonial cards with
// fictional attribution names), `members` (team), `display`/`logos` (contact,
// bottom logos in two explicit rows).
const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/events/${name}`;
// The finale reuses the leaflet's partner logos and warm-glow backdrop — the
// client roster is the same studio's, so there's no need to duplicate assets.
const LEAFLET = (name) => `${BASE}IMAGES/leaflet/${name}`;
const LOGO = (file) => `${BASE}IMAGES/leaflet/logos/${file}.png`;
// Team photos are shared with the /hotels deck (same people).
const HTEAM = (file) => `${BASE}IMAGES/hotels/team/${file}`;

const SLIDES = [
    {
        key: 'probleme',
        src: IMG('01-cinema.jpg'),
        heavyScrim: true, // bright, busy B&W photo — needs a deeper veil for legibility
        stat: '70 %',
        statSub: "de ce qu'on entend à un événement s'efface en 24 h.",
        body: [
            "La courbe d'Ebbinghaus, validée par plus d'un siècle de psychologie expérimentale. Vous mesurez le ROI d'un événement à ce qui en reste : un message retenu, une équipe alignée, une marque qui a marqué.",
            "Ce qui en reste ne dépend pas de ce que vous avez dit, mais de l'état dans lequel votre audience l'a entendu.",
        ],
        label: 'Le problème',
    },
    {
        key: 'ailleurs',
        video: IMG('06-ancrage.mp4'),
        stat: '+37 %',
        statSub: 'de mémorisation quand le public a les yeux fermés.',
        body: [
            "Les yeux fermés, le cerveau alloue plus de ressources à l'écoute et au traitement émotionnel. C'est précisément ce que produit une expérience sonore composée, salle dans le noir : l'audience décroche du visuel et retient ce qui suit.",
        ],
        source: 'Vredeveldt et al., Memory, 2014.',
        label: 'Ailleurs',
    },
    {
        key: 'ecouter',
        src: IMG('10-ecoute.jpg'),
        stat: 'Écouter, vraiment',
        statSub: "Dans un monde saturé, l'attention est devenue rare.",
        body: [
            "Partout, une tendance émerge. Tokyo, New York, Berlin. Les listening venues, sound meditations et écoutes collectives ne sont plus une niche underground : elles sont devenues des codes premium adoptés par l'hospitality, le retail et la culture.",
            "Kikina amène cette grammaire à votre événement, avec une rigueur scientifique en plus.",
        ],
        label: 'Écouter, vraiment',
    },
    {
        key: 'studio',
        src: IMG('03-contraste.jpg'),
        blurBg: true, // low-res source photo — heavy blur turns it into a colour wash
        stat: 'Kikina',
        statSub: 'Architectes sonores fondés sur les neurosciences.',
        statLogos: [
            ['kering', 'Kering'],
            ['pernod-ricard', 'Pernod Ricard'],
            ['loreal', "L'Oréal"],
            ['guerlain', 'Guerlain'],
            ['pierre-fabre', 'Pierre Fabre'],
            ['unicef', 'Unicef'],
            ['jcdecaux', 'JCDecaux'],
            ['harmonie-mutuelle', 'Harmonie Mutuelle'],
            ['hopital-ambroise-pare', 'AP-HP'],
        ],
        body: [
            "Studio de création sonore et laboratoire de recherche appliquée. Nous composons des expériences sonores pour des événements, des espaces et des marques.",
            "Toutes nos compositions sont conçues avec des neuroscientifiques et leurs effets mesurés cliniquement, notamment dans le cadre d'un pilote en cours à l'hôpital Ambroise Paré (AP-HP).",
        ],
        label: 'Kikina · architectes sonores',
    },
    {
        key: 'sas',
        src: IMG('12-sas.jpg'),
        cards: {
            title: 'Le sas, en trois mouvements.',
            subtitle: 'Trois leviers physiologiques, validés par les neurosciences.',
            intro: "Nos expériences sont des sas qui préparent votre audience à recevoir ce qui suit. Quelques minutes qui la déconnectent de l'extérieur et la reconnectent à l'instant présent, ensemble. 200, 400 ou 1000 personnes basculent dans le même état mental.",
            items: [
                { titre: 'Déconnexion', body: "Le public lâche prise. La journée, les notifications, la charge mentale s'effacent. L'audience arrête de penser à autre chose et revient pleinement dans la salle." },
                { titre: 'Synchronisation', body: "Le son cale le rythme collectif. Les respirations, les corps, l'attention s'alignent. Le message passe par le corps avant la tête." },
                { titre: 'Ancrage', body: "Une rupture musicale forte grave un souvenir (McClay et al., 2023). Ce que le public ressent ensemble, il le retient." },
            ],
            note: "Le son active le même circuit de récompense que la nourriture. Salimpoor & Zatorre, Nature Neuroscience, 2011.",
        },
        label: 'Le sas, en trois mouvements',
    },
    {
        key: 'fil',
        src: IMG('15-fil.jpg'),
        stat: 'Une signature',
        statSub: 'Du premier au dernier instant, une seule composition originale.',
        body: [
            "La plupart des événements collent de la musique par-dessus, morceau par morceau. Nous composons l'inverse : une signature sonore unique qui traverse toute la soirée.",
            "L'accueil, les montées sur scène, les transitions, le final : chaque moment avec sa propre intensité. Un fil continu, calé sur le rythme et l'histoire de votre événement.",
        ],
        label: 'Une signature',
    },
    {
        key: 'vivant',
        src: IMG('11-vivant.jpg'),
        stat: 'Vivant',
        statSub: 'Un son qui réagit à ce qui se passe dans la salle.',
        body: [
            "Cette signature peut aussi devenir vivante. Grâce à des capteurs placés dans la salle, le son réagit en temps réel à ce qui s'y passe : densité de l'audience, intensité d'un moment, transitions du programme.",
            "Le fil ne se contente plus de traverser la soirée, il la suit. Chaque diffusion devient unique, jamais identique à la précédente.",
        ],
        label: 'Vivant',
    },
    {
        key: 'cas-kering',
        cases: [
            {
                img: IMG('05-cocreation.jpg'),
                soustitre: 'Kering · sommet international · New York',
                titre: "Aligner des leaders mondiaux autour d'un sujet commun : la sustainability.",
                texte: "60e étage à Manhattan. Dirigeants, scientifiques, journalistes, influenceurs réunis autour d'un sujet compliqué et galvaudé. Le son fait passer la salle du chaos urbain au rythme plus lent des saisons. Effet documenté en neurosciences : le rythme cardiaque ralentit, la disponibilité mentale augmente. Sensibiliser, rendre mémorable, et faire repartir les influenceurs comme premiers ambassadeurs.",
            },
        ],
        label: 'Cas · Kering',
    },
    {
        key: 'cas-pileje',
        cases: [
            {
                img: IMG('07-signature.jpg'),
                soustitre: 'PiLeJe · Journée Innovation · Le Lido, Paris',
                titre: "Faire ressentir l'innovation avant de la présenter.",
                texte: "Journée innovation, 250 commerciaux, six heures de pitchs produits à enchaîner. Il fallait ouvrir autrement, par le corps, pour que la science PiLeJe soit vécue avant d'être expliquée. Expérience sonore en ouverture, suivie des talks. Une journée qui démarre dans l'écoute, pas dans la résistance.",
            },
        ],
        // Testimonial names are fictional placeholders (per retours) — swap for
        // real attributions when the client provides them.
        citations: [
            { quote: "Complètement immersif. J'ai adoré avec immodération.", name: 'Claire Moreau', role: 'Équipe marketing' },
            { quote: "Une expérience incroyable. Ça m'a fait monter les larmes.", name: 'Julien Barret', role: 'Réseau terrain' },
        ],
        label: 'Cas · PiLeJe',
    },
    {
        key: 'cas-unicef',
        cases: [
            {
                img: IMG('09-bourdelle.jpg'),
                soustitre: 'UNICEF · Musée Bourdelle · dîner philanthropes',
                titre: "Porter un sujet grave dans un dîner de gala, sans tomber dans le pathos : la malnutrition.",
                texte: "Une cause humanitaire dans un dîner de gala, équilibre fragile. Casques servis sur un plateau au moment où les invités s'assoient à table. Un sas d'écoute intérieure qui bascule les invités dans le sujet avant les discours, sans les écraser. Ice-breaker collectif, mémorable, qui sert le propos de la soirée.",
            },
        ],
        label: 'Cas · UNICEF',
    },
    {
        key: 'cas-amphi',
        cases: [
            {
                img: IMG('04-coupe.jpg'),
                soustitre: "L'Amphi · Club des Leaders en Santé · dirigeants",
                titre: "Faire vivre la santé mentale au lieu d'en parler.",
                texte: "Ramener à l'humain des dirigeants qui passent leur vie dans les chiffres et les comités. Dans un secteur où on parle santé toute la journée, leur faire vivre une vraie expérience de présence à soi, pour incarner ce qu'ils défendent professionnellement. Sept minutes au casque, plongée simultanée dans l'esprit de personnes qui souffrent de problèmes psychiques. Puissant et propre à chacun, mobilise souvenirs et vécus. Expérience collective et individuelle.",
            },
        ],
        citations: [
            { quote: "C'est quand la dernière fois que vous avez vu une salle de 200 personnes sans aucun bruit ?", name: 'Hélène Vasseur', role: 'Dirigeante · secteur santé' },
            { quote: "Au-delà de l'impact émotionnel, je crois à son impact diagnostique et son intérêt dans la formation professionnelle.", name: 'Dr Marc Lavigne', role: 'Directeur médical' },
        ],
        label: "Cas · L'Amphi",
    },
    {
        key: 'cas-paris-podcast',
        cases: [
            {
                video: IMG('08-paris-podcast.mp4'),
                soustitre: 'Paris Podcast Festival · Gaîté Lyrique',
                titre: "La preuve par l'échelle : 400 personnes dans le noir.",
                texte: "400 personnes plongées dans le noir, une expérience sonore collective. Suivie d'une table ronde que nous animons avec la direction sustainability et communication de Kering, autour de la question : l'audio peut-il être un accélérateur de conscience ? Une expérience qui tient dans une salle de 400, et qui ouvre une vraie conversation publique sur le pouvoir du son.",
            },
        ],
        label: 'Cas · Paris Podcast',
    },
    {
        key: 'cas-pernod',
        cases: [
            {
                img: IMG('13-pernod.jpg'),
                soustitre: 'Pernod Ricard · séminaire international · présidents de marques',
                titre: "Recentrer des dirigeants en compétition autour de ce qu'ils incarnent ensemble.",
                texte: "Rassemblement des présidents de toutes les marques du groupe au niveau monde. Un moment où ils ne sont plus la marque qu'ils dirigent, mais le groupe qu'ils incarnent ensemble. Composition au cristal Baschet avec l'un des cinquante joueurs au monde. Feuilles et crayons sur les tables, un temps pour poser idées et réflexions. Se recentrer et renforcer l'imaginaire, donc la créativité.",
            },
        ],
        label: 'Cas · Pernod Ricard',
    },
    {
        key: 'equipe',
        src: IMG('14-equipe.jpg'),
        // Team section cloned from the /hotels deck (same five people, same look).
        team: { eyebrow: "L'équipe", title: 'Création sonore et rigueur scientifique.' },
        members: [
            {
                name: 'Jérémie Guez',
                role: 'Co-fondateur · Direction artistique',
                bio: 'Musicien et sound designer. Il façonne la signature sonore de chaque événement et tient la cohérence artistique de bout en bout.',
                photo: HTEAM('jeremie.jpg'),
            },
            {
                name: 'Bianca Guez',
                role: 'Co-fondatrice & présidente · Stratégie',
                bio: "Elle relie la science, le son et la marque, et porte l'expérience Kikina auprès des organisateurs.",
                photo: HTEAM('bianca.jpg'),
            },
            {
                name: 'Arthur Boval',
                role: 'Compositeur-développeur · Technologie',
                bio: 'Architecte du moteur génératif maison. Il rend la musique vivante : générée en continu, jamais deux fois la même.',
                photo: HTEAM('arthur.webp'),
            },
            {
                name: 'Nicolas Decat',
                role: 'Neuroscientifique · Conseil scientifique',
                bio: "Garant de la rigueur derrière chaque choix sonore : ce qui sépare une ambiance agréable d'un environnement qui agit sur le système nerveux.",
                highlight: true,
                photo: HTEAM('nicolas.webp'),
            },
            {
                name: 'Michelle George',
                role: 'Docteure en neurosciences · Conseil scientifique',
                bio: "Chercheuse à l'Institut du Cerveau (ICM), spécialisée dans les états de conscience. Elle veille à ce que chaque choix sonore agisse vraiment sur l'attention et la mémoire.",
                photo: HTEAM('michelle.jpg'),
            },
        ],
        label: "L'équipe",
    },
    {
        key: 'contact',
        src: LEAFLET('09-presence.jpg'),
        display: ['Parlons de votre prochain événement.'],
        displaySub: 'Écoutez par vous-même.',
        logosTop: [
            ['kering', 'Kering'],
            ['pernod-ricard', 'Pernod Ricard'],
            ['loreal', "L'Oréal"],
            ['guerlain', 'Guerlain'],
            ['pierre-fabre', 'Pierre Fabre'],
            ['unicef', 'Unicef'],
            ['puressentiel', 'Puressentiel'],
            ['harmonie-mutuelle', 'Harmonie Mutuelle'],
            ['maisons-du-monde', 'Maisons du Monde'],
            ['furterer', 'René Furterer'],
        ],
        // Two explicit rows so flex-wrap can never strand a lone logo (FFPAPF
        // used to wrap alone under the group).
        logosBottom: [
            ['pileje', 'PiLeJe'],
            ['publicis', 'Publicis Groupe'],
            ['marie-claire', 'Marie Claire'],
            ['hopital-ambroise-pare', 'Hôpital Ambroise-Paré AP-HP'],
            ['jcdecaux', 'JCDecaux'],
        ],
        logosBottom2: [
            ['bpifrance', 'bpifrance'],
            ['escp', 'ESCP Business School'],
            ['institut-du-monde-arabe', 'Institut du Monde Arabe'],
            ['ffpapf', 'Fédération Française du Prêt à Porter Féminin'],
        ],
        cta: { label: 'Organiser votre événement', href: 'mailto:jeremie@kikinastudio.com' },
        label: 'Parlons de votre prochain événement',
    },
];

function LogoRow({ logos, position }) {
    return (
        <div className={`leaflet-stat__logos leaflet-stat__logos--${position}`}>
            {logos.map(([file, name]) => (
                <img key={file} src={LOGO(file)} alt={name} className="leaflet-logo-img" />
            ))}
        </div>
    );
}

const MUSIC_SRC = `${BASE}MUSIC/wellness/01 Drone Wellness.mp3`;
const MUSIC_VOLUME = 0.65;

export default function EventsPage() {
    const [index, setIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const trackRef = useRef(null);
    const indexRef = useRef(0);
    const animatingRef = useRef(false);
    const startedRef = useRef(false);
    const howlRef = useRef(null);
    // Wheel-intent filtering: a Mac trackpad keeps emitting decaying inertia
    // deltas for ~1s after a flick. Only a GROWING delta is a new gesture; a
    // shrinking one is the tail of the previous flick and must not re-trigger.
    const lastWheelRef = useRef({ delta: 0, at: 0 });
    const touchStartYRef = useRef(null);

    useEffect(() => {
        document.title = 'Kikina · Le son qui marque les esprits';
    }, []);

    const goTo = useCallback((target) => {
        const clamped = Math.max(0, Math.min(SLIDES.length - 1, target));
        if (clamped === indexRef.current || animatingRef.current || !trackRef.current) return;
        animatingRef.current = true;
        indexRef.current = clamped;
        setIndex(clamped);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        gsap.to(trackRef.current, {
            yPercent: -(100 / SLIDES.length) * clamped,
            duration: reduceMotion ? 0 : 1.25,
            ease: 'power3.inOut',
            onComplete: () => {
                // Small cooldown so the transition can't be chained by the same gesture.
                setTimeout(() => { animatingRef.current = false; }, 250);
            },
        });
    }, []);

    const step = useCallback((dir) => goTo(indexRef.current + dir), [goTo]);

    // Wheel / touch / keyboard → one gesture, one slide.
    useEffect(() => {
        const onWheel = (e) => {
            e.preventDefault();
            if (!startedRef.current) return;
            const now = performance.now();
            const { delta: prevDelta, at: prevAt } = lastWheelRef.current;
            // After 180ms of silence the previous gesture is over.
            const fresh = now - prevAt > 180;
            const growing = Math.abs(e.deltaY) > Math.abs(prevDelta);
            lastWheelRef.current = { delta: fresh ? 0 : e.deltaY, at: now };
            if (Math.abs(e.deltaY) < 4) return;
            if (!fresh && !growing) return; // inertia tail
            step(e.deltaY > 0 ? 1 : -1);
        };
        const onTouchStart = (e) => {
            touchStartYRef.current = e.touches[0].clientY;
        };
        const onTouchEnd = (e) => {
            if (!startedRef.current || touchStartYRef.current == null) return;
            const dy = touchStartYRef.current - e.changedTouches[0].clientY;
            touchStartYRef.current = null;
            if (Math.abs(dy) < 50) return;
            step(dy > 0 ? 1 : -1);
        };
        const onKeyDown = (e) => {
            if (!startedRef.current) return;
            if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); step(1); }
            else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
            else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
            else if (e.key === 'End') { e.preventDefault(); goTo(SLIDES.length - 1); }
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [goTo, step]);

    // Background music — created at mount so the file preloads and Howler's
    // mobile audio-unlock listeners arm before the first tap. html5: true plays
    // through a media element (iOS allows it from a tap and keeps playing with
    // the hardware silent switch on; Web Audio would be muted by that switch).
    useEffect(() => {
        const howl = new Howl({ src: [MUSIC_SRC], loop: true, volume: 0, html5: true, preload: true });
        howlRef.current = howl;
        return () => {
            howl.unload();
            if (howlRef.current === howl) howlRef.current = null;
        };
    }, []);

    // Entry click (a user gesture, so the browser allows playback) — fade the
    // music in rather than snapping it on.
    const handleEnter = useCallback(() => {
        if (startedRef.current) return;
        const howl = howlRef.current;
        if (howl) {
            // Fade only once the 'play' event fires: an html5 sound holds a
            // play-lock until its play() promise resolves, and a fade queued
            // during that lock never drains (volume would stay at 0).
            howl.once('play', () => howl.fade(0, MUSIC_VOLUME, 2000));
            howl.play();
        }
        startedRef.current = true;
        setStarted(true);
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((muted) => {
            if (howlRef.current) howlRef.current.mute(!muted);
            return !muted;
        });
    }, []);

    return (
        <div className="leaflet-root">
            {/* Slides */}
            <div className="leaflet-track" ref={trackRef}>
                {SLIDES.map((slide, i) => (
                    <section
                        key={slide.key}
                        className={`leaflet-slide${slide.cards ? ' leaflet-slide--voyages' : ''}${slide.cases ? ' leaflet-slide--study' : ''}${slide.members ? ' leaflet-slide--team' : ''}${slide.heavyScrim ? ' leaflet-slide--heavy-scrim' : ''}${slide.blurBg ? ' leaflet-slide--blur' : ''}${i === index ? ' is-active' : ''}`}
                        aria-hidden={i !== index}
                    >
                        {/* Dark base shows through if an image/clip is ever missing */}
                        <div className="leaflet-slide__img leaflet-slide__img--dark" />
                        {slide.video ? (
                            <video
                                className="leaflet-slide__video"
                                src={slide.video}
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="auto"
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                        ) : slide.src ? (
                            <div className="leaflet-slide__img" style={{ backgroundImage: `url(${slide.src})` }} />
                        ) : null}
                        <div className="leaflet-slide__scrim" aria-hidden="true" />

                        {/* Centered display — big serif stat (deck style) or multi-line statement */}
                        {slide.stat && (
                            <div className="leaflet-stat">
                                <span className="leaflet-stat__figure">{slide.stat}</span>
                                {slide.statSub && <span className="leaflet-stat__sub">{slide.statSub}</span>}
                                {/* Client logos on an auto-scrolling band (studio slide). Two
                                    copies of the row make the -50% keyframe loop seamless. */}
                                {slide.statLogos && (
                                    <div className="leaflet-marquee" aria-hidden="true">
                                        <div className="leaflet-marquee__track">
                                            {[0, 1].map((dup) => (
                                                <div key={dup} className="leaflet-marquee__group">
                                                    {slide.statLogos.map(([file, name]) => (
                                                        <img key={file} src={LOGO(file)} alt={dup === 0 ? name : ''} className="leaflet-logo-img" />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {slide.display && (
                            <div className="leaflet-stat leaflet-stat--lines">
                                {slide.logosTop && <LogoRow logos={slide.logosTop} position="top" />}
                                {slide.display.map((line) => (
                                    <span key={line} className="leaflet-stat__line">{line}</span>
                                ))}
                                {slide.displaySub && <span className="leaflet-stat__sub">{slide.displaySub}</span>}
                                {slide.cta && (
                                    <a className="leaflet-stat__btn" href={slide.cta.href}>
                                        {slide.cta.label}
                                    </a>
                                )}
                                {slide.logosBottom && <LogoRow logos={slide.logosBottom} position="bottom" />}
                                {slide.logosBottom2 && <LogoRow logos={slide.logosBottom2} position="bottom2" />}
                            </div>
                        )}

                        {/* The sas — title + intro + three movement cards + footnote */}
                        {slide.cards && (
                            <div className="leaflet-voyages-wrap">
                                <div className="leaflet-voyages__heading">
                                    {slide.cards.title && <p className="leaflet-voyages__title">{slide.cards.title}</p>}
                                    {slide.cards.subtitle && <p className="leaflet-voyages__subtitle">{slide.cards.subtitle}</p>}
                                    {slide.cards.intro && <p className="leaflet-voyages__intro">{slide.cards.intro}</p>}
                                </div>
                                <div className="leaflet-voyages">
                                    {slide.cards.items.map((card, ci) => (
                                        <div key={card.titre} className="leaflet-voyage">
                                            <span className="leaflet-voyage__index">{String(ci + 1).padStart(2, '0')}</span>
                                            <h3 className="leaflet-voyage__title">{card.titre}</h3>
                                            <p className="leaflet-voyage__body">{card.body}</p>
                                        </div>
                                    ))}
                                </div>
                                {slide.cards.note && <p className="leaflet-voyages__note">{slide.cards.note}</p>}
                            </div>
                        )}

                        {/* Case-study slides — full-bleed panels (1 or 2), one image each */}
                        {slide.cases && (
                            <div className="leaflet-study-wrap">
                                {slide.caseHeader && <p className="leaflet-study__head">{slide.caseHeader}</p>}
                                <div className={`leaflet-study leaflet-study--${slide.cases.length}`}>
                                    {slide.cases.map((c) => (
                                        <article key={c.titre} className="leaflet-study-panel">
                                            {c.video ? (
                                                <video className="leaflet-study-panel__media" src={c.video} autoPlay muted loop playsInline preload="auto" tabIndex={-1} aria-hidden="true" />
                                            ) : (
                                                <div className="leaflet-study-panel__media" style={{ backgroundImage: `url(${c.img})` }} />
                                            )}
                                            <div className="leaflet-study-panel__veil" aria-hidden="true" />
                                            <div className="leaflet-study-panel__content">
                                                <p className="leaflet-study__sub">{c.soustitre}</p>
                                                <h3 className="leaflet-study__title">{c.titre}</h3>
                                                <p className="leaflet-study__text">{c.texte}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                {/* Testimonials — quote-mark cards, right side of the panel */}
                                {slide.citations && (
                                    <div className="leaflet-testimonials">
                                        {slide.citations.map((t) => (
                                            <figure key={t.quote} className="leaflet-testimonial">
                                                <span className="leaflet-testimonial__mark" aria-hidden="true">“</span>
                                                <blockquote className="leaflet-testimonial__quote">{t.quote}</blockquote>
                                                <figcaption className="leaflet-testimonial__author">
                                                    <span className="leaflet-testimonial__name">{t.name}</span>
                                                    <span className="leaflet-testimonial__role">{t.role}</span>
                                                </figcaption>
                                            </figure>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Team, cloned from the /hotels deck */}
                        {slide.members && (
                            <div className="h-special">
                                <div className="h-special__head">
                                    {slide.team?.eyebrow && <p className="h-special__eyebrow">{slide.team.eyebrow}</p>}
                                    {slide.team?.title && <p className="h-special__title">{slide.team.title}</p>}
                                </div>
                                <div className={`h-team h-team--${slide.members.length}`}>
                                    {slide.members.map((m, mi) => (
                                        <article key={m.name + mi} className={`h-member${m.highlight ? ' h-member--highlight' : ''}`}>
                                            <div className="h-member__photo" aria-hidden="true">
                                                {m.photo ? (
                                                    <img src={m.photo} alt="" />
                                                ) : (
                                                    <span className="h-member__initials">
                                                        {m.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="h-member__name">{m.name}</h3>
                                            <p className="h-member__role">{m.role}</p>
                                            <p className="h-member__bio">{m.bio}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom-left caption — section label + deck body copy */}
                        {(slide.eyebrow || slide.body) && (
                            <div className="leaflet-caption">
                                {slide.eyebrow && <p className="leaflet-caption__eyebrow">{slide.eyebrow}</p>}
                                {slide.body && slide.body.map((para) => (
                                    <p key={para} className="leaflet-caption__body">{para}</p>
                                ))}
                                {slide.source && <p className="leaflet-caption__source">{slide.source}</p>}
                            </div>
                        )}

                        {/* Pull-stat (slide "La bascule") — big figure + legend, right side */}
                        {slide.pull && (
                            <div className="leaflet-pull" aria-hidden="true">
                                <span className="leaflet-pull__figure">{slide.pull.figure}</span>
                                <span className="leaflet-pull__legend">{slide.pull.legend}</span>
                            </div>
                        )}

                        {/* Photo/video credit (experience slides) — bottom-right */}
                        {slide.credit && (
                            <div className="leaflet-credit" aria-hidden="true">
                                <span className="leaflet-credit__name">{slide.credit.name}</span>
                                <span className="leaflet-credit__detail">{slide.credit.detail}</span>
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {/* Header — Kikina wordmark (same mark as the main experience) */}
            <header className="leaflet-chrome leaflet-logo">
                <svg width="96" height="21" viewBox="0 0 1096 237" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="153.016" width="236.924" height="69.1027" rx="34.5513" transform="rotate(90 153.016 0)" fill="currentColor" />
                    <rect x="67.8672" width="236.924" height="67.8687" rx="33.9344" transform="rotate(90 67.8672 0)" fill="currentColor" />
                    <path d="M174.331 139.318C164.015 127.334 164.015 109.59 174.331 97.6058L248.761 11.1464C268.063 -11.2755 304.799 2.39677 304.799 32.0025V204.921C304.799 234.527 268.063 248.199 248.761 225.777L174.331 139.318Z" fill="currentColor" />
                    <path d="M577.641 36.7897V54.4629H596.596H615.551V36.7897V19.1165H596.596H577.641V36.7897Z" fill="currentColor" />
                    <path d="M631.977 116.949V214.783H650.932H669.887V192.313L670.014 169.969L679.112 160.122L688.337 150.402L702.869 179.689C710.957 195.848 717.907 210.365 718.413 211.88C719.297 214.783 719.676 214.783 740.78 214.783C752.532 214.783 762.136 214.531 762.136 214.152C762.136 213.773 751.9 193.575 739.264 169.212C726.627 144.974 716.644 124.397 717.023 123.514C717.402 122.756 728.017 110.637 740.78 96.7514L763.905 71.5039L741.917 71.1252C729.786 70.999 719.171 71.1252 718.413 71.3777C717.655 71.6302 706.534 84.0014 693.771 98.6449L670.519 125.407L670.14 72.2613L669.887 19.1155H650.932H631.977V116.949Z" fill="currentColor" />
                    <path d="M772.242 36.7897V54.4629H791.198H810.153V36.7897V19.1165H791.198H772.242V36.7897Z" fill="currentColor" />
                    <path d="M400.719 118.212V214.783H420.938H441.157V181.457V148.256L451.266 138.536C456.826 133.234 461.881 128.942 462.387 128.942C463.019 128.942 476.287 148.256 491.831 171.863L520.137 214.783H544.526C557.795 214.783 568.789 214.531 568.789 214.152C568.789 213.773 551.35 187.39 529.994 155.452L491.199 97.2563L528.983 59.5114L566.894 21.6402H540.862H514.703L478.309 60.395L441.789 99.0236L441.409 60.395L441.157 21.6402H420.938H400.719V118.212Z" fill="currentColor" />
                    <path d="M894.823 68.4742C884.461 70.2415 875.615 75.1648 868.412 82.9915L862.094 89.9346L861.715 80.7192L861.335 71.5039L843.391 71.1252L825.32 70.7465V142.828V214.783H844.276H863.231V170.221C863.231 120.863 863.863 116.318 870.939 108.239C876.373 101.927 883.703 99.5286 895.329 100.16C906.323 100.665 910.493 102.937 914.41 110.764C916.811 115.434 916.938 118.59 917.317 165.172L917.696 214.783H936.651H955.48V161.385C955.48 101.801 955.101 98.2662 947.266 86.3999C939.684 74.9123 927.553 68.7267 910.872 67.7168C905.817 67.4643 898.614 67.7168 894.823 68.4742Z" fill="currentColor" />
                    <path d="M1018.92 68.3476C990.104 72.3872 975.066 86.1471 972.286 110.89L971.528 117.58H989.22H1006.91L1008.3 112.657C1011.71 101.548 1018.41 97.3822 1033.2 97.3822C1048.74 97.3822 1056.57 102.305 1056.57 111.899C1056.57 122.377 1052.03 124.649 1022.83 129.573C995.033 134.117 985.302 137.904 976.962 147.498C969.506 155.956 967.484 162.016 967.484 176.912C967.484 188.904 967.863 190.798 971.023 197.362C975.193 205.946 981.259 211.248 990.863 215.035C996.802 217.434 1000.34 217.812 1014.24 217.812C1032.56 217.812 1039.39 216.045 1051.52 207.84C1058.09 203.421 1059.1 203.421 1059.1 207.966C1059.1 214.657 1059.35 214.783 1078.18 214.783H1095.75V163.909C1095.75 123.513 1095.37 111.521 1093.85 105.209C1089.3 85.8946 1078.94 75.2907 1059.86 70.3674C1050.51 67.9689 1029.28 66.8328 1018.92 68.3476ZM1056.57 166.686C1054.05 176.659 1045.33 185.874 1035.22 189.283C1030.04 191.176 1017.53 191.303 1013.1 189.535C1007.8 187.516 1004.51 181.077 1005.14 174.008C1006.15 162.268 1012.85 157.597 1036.1 152.422C1043.81 150.654 1051.77 148.382 1053.79 147.372L1057.21 145.605L1057.59 153.305C1057.84 157.597 1057.33 163.657 1056.57 166.686Z" fill="currentColor" />
                    <path d="M577.641 142.828V214.783H596.596H615.551V142.828V70.8727H596.596H577.641V142.828Z" fill="currentColor" />
                    <path d="M772.242 142.828V214.783H791.198H810.153V142.828V70.8727H791.198H772.242V142.828Z" fill="currentColor" />
                </svg>
            </header>

            {/* Mute toggle */}
            {started && (
                <button
                    onClick={toggleMute}
                    className={`leaflet-chrome leaflet-mute${isMuted ? ' is-muted' : ''}`}
                    aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                </button>
            )}

            {/* Progress dots */}
            <nav className="leaflet-chrome leaflet-dots" aria-label="Diapositives">
                {SLIDES.map((slide, i) => (
                    <button
                        key={slide.key}
                        className={`leaflet-dot${i === index ? ' is-active' : ''}`}
                        aria-label={`Diapositive ${i + 1} : ${slide.label || slide.eyebrow}`}
                        aria-current={i === index}
                        onClick={() => goTo(i)}
                    />
                ))}
            </nav>

            {/* Counter */}
            <div className="leaflet-chrome leaflet-counter" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
                <span className="leaflet-counter__sep" />
                {String(SLIDES.length).padStart(2, '0')}
            </div>

            {/* Scroll hint (first slide only) */}
            {started && index === 0 && (
                <div className="leaflet-chrome leaflet-hint" aria-hidden="true">
                    <span className="leaflet-hint__text">Défiler</span>
                    <svg width="18" height="11" viewBox="0 0 20 12" fill="none" className="animate-chevron-top">
                        <path d="M2 2L10 10L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg width="18" height="11" viewBox="0 0 20 12" fill="none" className="animate-chevron-bottom leaflet-hint__chevron2">
                        <path d="M2 2L10 10L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Entry overlay — starts the music inside a user gesture */}
            <div className={`leaflet-enter${started ? ' is-hidden' : ''}`}>
                <p className="leaflet-enter__eyebrow">Kikina · Events</p>
                <h1 className="leaflet-enter__title">
                    Le son ne décore pas votre événement.
                    <br />
                    Il décide ce qu'on en retiendra.
                </h1>
                <p className="leaflet-enter__sub">Kikina compose le son de votre événement. Une signature continue, et les moments qui font basculer.</p>
                <button className="leaflet-enter__btn" onClick={handleEnter}>
                    Entrer
                </button>
            </div>

            {/* Grain (same treatment as the main site, softer over photography) */}
            <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.06 }} />

            <CursorCanvas />
        </div>
    );
}
