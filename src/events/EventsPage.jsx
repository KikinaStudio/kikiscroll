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
// Storytelling (v2 — Notion "Deck événementiel v2"): cover (entry overlay) →
// L'écart (le problème) → Ailleurs → Écouter vraiment → Le moment → La bascule
// (+37%) → Le sas en 3 mouvements (CARDS) → Un seul fil → Vivant → 4 cas clients
// (PiLeJe · UNICEF · Kering+Paris Podcast · Pernod Ricard+L'Amphi) → équipe →
// contact.
//
// Backgrounds live in public/IMAGES/events/. Slides whose dedicated image isn't
// in yet (10-ecoute, 11-vivant, 13-pernod-amphi, 14-equipe) render on a dark
// canvas until the file is dropped in — a dark base sits behind every slide.
// Videos: 06-ancrage.mp4 (PiLeJe, Lido) and 08-paris-podcast.mp4 (Paris Podcast
// Festival, Gaité Lyrique). Slide shapes: `stat`/`body` (statement), `pull`
// (right-side figure, slide "La bascule"), `cards` (the sas), `cases` (case
// studies — 1 or 2 blocks of Contexte/Notre rôle/Effet + optional citations),
// `members` (team, cloned from /hotels), `display`/`logos` (contact).
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
        key: 'ecart',
        src: IMG('01-cinema.jpg'),
        heavyScrim: true, // bright, busy B&W photo — needs a deeper veil for legibility
        stat: "L'écart",
        statSub: "Entre ce que vous donnez et ce qu'ils peuvent recevoir.",
        body: [
            "Vous mesurez le ROI d'un événement à ce qui en reste : un message retenu, une équipe alignée, une marque qui a marqué.",
            "Mais ce qui en reste ne dépend pas de ce que vous avez dit. Ça dépend de l'état dans lequel votre audience l'a entendu. C'est la variable que personne ne pilote.",
        ],
        label: "L'écart",
    },
    {
        key: 'ailleurs',
        src: IMG('02-habituation.jpg'),
        stat: 'Ailleurs',
        statSub: "Présents dans la salle, absents à l'instant.",
        body: [
            "Vos invités arrivent saturés : la réunion d'avant, 200 mails, les notifications, les transports. Ils sont dans la salle, mais la tête est ailleurs.",
            "Et un message, même excellent, ricoche sur un public absent. 70 % s'efface en 24 h.",
        ],
        label: 'Ailleurs',
    },
    {
        key: 'ecouter',
        src: IMG('10-ecoute.jpg'),
        stat: 'Écouter, vraiment',
        statSub: "Dans un monde saturé, l'attention est devenue rare.",
        body: [
            "Partout, une tendance émerge. Listening bars à Tokyo, sound meditations à New York, écoute collective dans les espaces culturels. Des moments où l'on s'assoit, où l'on éteint le téléphone, où l'on écoute vraiment.",
            "C'est devenu un rituel premium, une réponse culturelle à l'épuisement attentionnel. Nous l'apportons aux événements corporate : quelques minutes pour rendre votre audience à l'écoute, avant qu'elle ne reçoive votre message.",
        ],
        label: 'Écouter, vraiment',
    },
    {
        key: 'moment',
        src: IMG('03-contraste.jpg'),
        stat: 'Le moment',
        statSub: 'Quelques minutes qui décident du reste.',
        body: [
            "Dans un événement, il y a un moment qui change tout ce qui suit. Une rupture nette qui détache l'audience de son état d'arrivée et la fait basculer dans celui où votre message peut être reçu.",
            "C'est ce moment-là que nous composons.",
        ],
        label: 'Le moment',
    },
    {
        key: 'bascule',
        src: IMG('04-coupe.jpg'),
        stat: 'La bascule',
        statSub: 'Le son qui rend la salle disponible.',
        body: [
            "Quelques minutes, salle plongée dans le noir, une expérience sonore composée pour votre soirée. Pendant des années, on a cherché à parler plus fort : plus d'écrans, plus d'effets, plus de scénographie.",
            "Nous faisons l'inverse : nous suspendons le bruit, le temps que l'audience redevienne disponible. La tête revient dans le présent, le corps se cale au groupe, l'émotion s'installe. C'est là que vos messages atteignent, et qu'ils restent.",
        ],
        pull: { figure: '+37 %', legend: 'Les yeux fermés, le cerveau retient mieux (Vredeveldt et al., 2014).' },
        label: 'La bascule',
    },
    {
        key: 'sas',
        src: IMG('05-cocreation.jpg'),
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
        src: IMG('07-signature.jpg'),
        stat: 'Un seul fil',
        statSub: 'Une signature, du premier au dernier instant.',
        body: [
            "La plupart des événements collent de la musique par-dessus, morceau par morceau. Nous composons l'inverse : une signature sonore unique qui traverse toute la soirée.",
            "L'accueil, les montées sur scène, les transitions, le final : chaque moment avec sa propre intensité. Un fil continu, calé sur le rythme et l'histoire de votre événement.",
        ],
        label: 'Un seul fil',
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
        key: 'cas-pileje',
        video: IMG('06-ancrage.mp4'),
        cases: [
            {
                soustitre: 'PiLeJe · Lido, Paris · 250 commerciaux',
                titre: "Faire ressentir l'innovation avant de la présenter.",
                contexte: "Une journée innovation à enchaîner. Six heures de pitchs produits devant les équipes terrain.",
                role: "L'expérience sonore en ouverture. La science PiLeJe vécue par le corps avant d'être expliquée.",
                effet: "Une journée qui démarre dans l'écoute, pas dans la résistance.",
            },
        ],
        label: 'Cas · PiLeJe',
    },
    {
        key: 'cas-unicef',
        src: IMG('09-bourdelle.jpg'),
        cases: [
            {
                soustitre: 'UNICEF · Musée Bourdelle · dîner philanthropes',
                titre: "Porter un sujet grave dans un dîner de gala, sans tomber dans le pathos.",
                contexte: "Un dîner de gala. Une cause humanitaire à défendre. L'équilibre fragile entre légèreté de la soirée et gravité du propos.",
                role: "Les casques servis sur un plateau au moment de s'asseoir à table. Un sas d'écoute intérieure avant les discours.",
                effet: "Un ice-breaker collectif qui prépare la parole sans l'écraser.",
            },
        ],
        label: 'Cas · UNICEF',
    },
    {
        key: 'cas-kering',
        video: IMG('08-paris-podcast.mp4'),
        caseHeader: 'La même bascule, à toutes les échelles.',
        cases: [
            {
                soustitre: 'Kering · sommet international · New York',
                titre: "Aligner des leaders de la mode et du luxe autour d'un sujet commun, la sustainability.",
                contexte: "Dirigeants, scientifiques, journalistes et influenceurs réunis autour de la sustainability. Chacun avec son agenda, son angle, son audience à reconquérir.",
                role: "60e étage, vue sur Manhattan. Le son fait basculer la salle du chaos urbain vers le rythme des saisons, et les rythmes cardiaques des participants avec lui. Le sujet rendu sensible avant d'être discuté.",
                effet: "Un moment d'alignement silencieux. Les influenceurs présents repartent ambassadeurs, pas spectateurs.",
            },
            {
                soustitre: 'Paris Podcast Festival · Gaîté Lyrique · 400 personnes',
                titre: "Faire vivre une expérience sonore à 400 personnes, dans un lieu culturel ouvert.",
                contexte: "Festival culturel ouvert, audience large et exigeante.",
                role: "400 personnes plongées dans le noir, une expérience sonore collective. Suivie d'une table ronde que nous animons avec la direction sustainability et communication de Kering : l'audio peut-il être un accélérateur de conscience ?",
                effet: "La preuve par l'échelle. Une expérience qui tient dans une salle de 400, et qui ouvre une vraie conversation publique sur le pouvoir du son.",
            },
        ],
        label: 'Cas · Kering + Paris Podcast',
    },
    {
        key: 'cas-pernod',
        src: IMG('13-pernod-amphi.jpg'),
        caseHeader: 'Chaque format, un objectif précis.',
        cases: [
            {
                soustitre: 'Pernod Ricard · séminaire international · présidents de marques',
                titre: "Recentrer des dirigeants en compétition autour de l'identité du groupe.",
                contexte: "Un rassemblement des présidents de toutes les marques du groupe, au niveau monde. Des dirigeants par nature en compétition interne, qu'il faut fédérer autour de ce qu'ils incarnent ensemble.",
                role: "Une composition originale par un joueur de cristal Baschet, l'un des cinquante au monde à maîtriser cet instrument. Un temps de mise en présence au milieu du séminaire, feuilles et crayons sur les tables.",
                effet: "Les dirigeants reposent leur fonction le temps de l'expérience. Ce qui en sort, idées et réflexions, revient au groupe.",
            },
            {
                soustitre: "L'Amphi · Club des Leaders en Santé · 200 dirigeants",
                titre: "Faire vivre la santé mentale au lieu d'en parler.",
                contexte: "Un dîner de gala dans un secteur où l'on parle santé toute la journée. Comment faire passer la santé mentale du sujet de comité au vécu de salle ?",
                role: "7 minutes d'expérience sonore immersive, casques sur les oreilles, salle plongée dans le silence. Plongée collective dans le quotidien de personnes vivant avec des troubles psychiques.",
                effet: "Une salle de 200 dirigeants sans aucun bruit. La santé mentale comprise par l'expérience, pas par les chiffres.",
            },
        ],
        citations: [
            "« C'est quand la dernière fois que vous avez vu une salle de 200 personnes sans aucun bruit ? »",
            "« Au-delà de l'impact émotionnel, je crois à son impact diagnostique et son intérêt dans la formation professionnelle. »",
        ],
        label: "Cas · Pernod Ricard + L'Amphi",
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
        logosBottom: [
            ['pileje', 'PiLeJe'],
            ['publicis', 'Publicis Groupe'],
            ['marie-claire', 'Marie Claire'],
            ['hopital-ambroise-pare', 'Hôpital Ambroise-Paré AP-HP'],
            ['jcdecaux', 'JCDecaux'],
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
                        className={`leaflet-slide${slide.cards ? ' leaflet-slide--voyages' : ''}${slide.cases ? ' leaflet-slide--study' : ''}${slide.members ? ' leaflet-slide--team' : ''}${slide.heavyScrim ? ' leaflet-slide--heavy-scrim' : ''}${i === index ? ' is-active' : ''}`}
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
                        ) : (
                            <div className="leaflet-slide__img" style={{ backgroundImage: `url(${slide.src})` }} />
                        )}
                        <div className="leaflet-slide__scrim" aria-hidden="true" />

                        {/* Centered display — big serif stat (deck style) or multi-line statement */}
                        {slide.stat && (
                            <div className="leaflet-stat">
                                <span className="leaflet-stat__figure">{slide.stat}</span>
                                {slide.statSub && <span className="leaflet-stat__sub">{slide.statSub}</span>}
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

                        {/* Case-study slides — 1 or 2 blocks (Contexte / Notre rôle / Effet) */}
                        {slide.cases && (
                            <div className="leaflet-study-wrap">
                                {slide.caseHeader && <p className="leaflet-study__head">{slide.caseHeader}</p>}
                                <div className={`leaflet-study leaflet-study--${slide.cases.length}`}>
                                    {slide.cases.map((c) => (
                                        <article key={c.titre} className="leaflet-study-card">
                                            <p className="leaflet-study-card__sub">{c.soustitre}</p>
                                            <h3 className="leaflet-study-card__title">{c.titre}</h3>
                                            <div className="leaflet-study-field">
                                                <span className="leaflet-study-field__label">Contexte</span>
                                                <p className="leaflet-study-field__text">{c.contexte}</p>
                                            </div>
                                            <div className="leaflet-study-field">
                                                <span className="leaflet-study-field__label">Notre rôle</span>
                                                <p className="leaflet-study-field__text">{c.role}</p>
                                            </div>
                                            <div className="leaflet-study-field">
                                                <span className="leaflet-study-field__label">Effet</span>
                                                <p className="leaflet-study-field__text">{c.effet}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                {slide.citations && (
                                    <div className="leaflet-study__cites">
                                        {slide.citations.map((q) => (
                                            <p key={q} className="leaflet-study__cite">{q}</p>
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
                <p className="leaflet-enter__sub">Kikina compose le son de votre événement : une signature continue, et les moments qui font basculer.</p>
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
