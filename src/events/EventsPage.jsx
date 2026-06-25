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
// Storytelling (2026 rewrite): 1 constat → 2 fausse solution → 3 mécanisme
// (rupture) → 4 yeux fermés (+37%) → 5 les trois mouvements (CARDS) → 6 install
// interactive → 7 fil sonore → 8 manifeste Kikina → 9 équipe → 10 contact.
//
// Backgrounds live in public/IMAGES/events/. Two slides use silent looping
// videos: "installations" (08-paris-podcast.mp4 — Paris Podcast Festival, Gaité
// Lyrique) and "fil-sonore" (06-ancrage.mp4 — PiLeJe at the Lido). A dark canvas
// shows behind a video slide's text if its clip is missing. `credit` carries the
// bottom-right photo/video caption. Slide 5 ("voyages") renders `cards` (an intro
// + three movement cards) instead of the centered stat / bottom-left caption.
const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/events/${name}`;
// The finale reuses the leaflet's partner logos and warm-glow backdrop — the
// client roster is the same studio's, so there's no need to duplicate assets.
const LEAFLET = (name) => `${BASE}IMAGES/leaflet/${name}`;
const LOGO = (file) => `${BASE}IMAGES/leaflet/logos/${file}.png`;

const SLIDES = [
    {
        key: 'ressemblance',
        src: IMG('01-oubli.jpg'),
        stat: 'Déjà vu',
        statSub: 'Le visuel ne suffit plus.',
        body: [
            "Tous les événements corporate finissent par se ressembler. On passe d'un écran à l'autre : keynote, slides, vidéo. L'invité regarde, applaudit aux bons moments, puis oublie presque tout.",
            "70 % de ce qu'on reçoit passivement s'efface en 24 h. Le visuel sature et ne marque plus. Pour qu'un message reste, il faut sortir de la routine et toucher l'émotion, pas seulement l'œil.",
        ],
        label: 'Tout se ressemble',
    },
    {
        key: 'plus',
        src: IMG('02-habituation.jpg'),
        stat: 'Toujours plus',
        statSub: "Plus de spectacle, moins d'effet.",
        body: [
            "Le réflexe du secteur, c'est d'en faire toujours plus. Plus d'effets, plus de spectacle, plus de waouh, pour créer de l'émotion.",
            "Mais un public habitué aux écrans s'en lasse très vite : chaque effet supplémentaire produit moins d'effet que le précédent. On monte la facture et on marque moins. La solution n'est pas d'ajouter une couche. Elle est à l'opposé du trop-plein.",
        ],
        label: 'En faire plus ne suffit plus',
    },
    {
        key: 'rupture',
        src: IMG('03-contraste.jpg'),
        stat: 'La rupture',
        statSub: 'On retient ce qui rompt.',
        body: [
            "Le cerveau retient ce qui rompt, pas ce qui dure. Ce qui déclenche la récompense, c'est l'écart entre l'attendu et le vécu (Schultz, 1997).",
            "Le vrai levier : créer une vraie coupure dans le programme. On déconnecte le public, puis on le reconnecte. Il revient au présent, concentré et disponible, prêt à recevoir les messages qui comptent vraiment.",
        ],
        label: 'La rupture',
    },
    {
        key: 'yeux-fermes',
        src: IMG('04-coupe.jpg'),
        stat: '+37 %',
        statSub: 'Les yeux fermés, on retient plus.',
        body: [
            "Quelques minutes les yeux fermés, écrans éteints. La surstimulation tombe d'un coup, et le public arrête de regarder pour se mettre à ressentir.",
            "Les yeux fermés, on retient nettement plus : +37 % de souvenirs corrects (effet eye-closure, Vredeveldt et al.). Chacun associe vos messages à ses propres émotions, et les garde bien après la soirée.",
        ],
        label: 'Et si on fermait les yeux — +37 %',
    },
    {
        key: 'voyages',
        src: IMG('05-cocreation.jpg'),
        cards: {
            intro: "Nos voyages sonores, c'est :",
            items: [
                { titre: 'Déconnexion', body: "Le public sort de sa journée, de son téléphone, de sa charge mentale. Il revient vraiment dans la salle." },
                { titre: 'Synchronisation', body: "Le son cale le rythme du groupe, de l'agitation vers le calme. Le message passe par le corps, pas seulement par la tête." },
                { titre: 'Ancrage', body: "Une transition musicale forte fixe le souvenir (McClay et al., 2023). Ce que le public ressent, il le retient." },
            ],
        },
        label: 'Nos voyages sonores',
    },
    {
        key: 'installations',
        video: IMG('08-paris-podcast.mp4'),
        stat: 'Au centre',
        statSub: "L'invité devient l'instrument.",
        body: [
            "Une installation audiovisuelle simple et puissante, posée le temps d'un festival ou d'une soirée de marque. L'invité est placé au centre : sa voix et ses gestes pilotent le son et une image générative projetée en direct.",
            "Rien n'est préenregistré, donc impossible à reproduire. Au lieu d'assister à un spectacle, vos invités le fabriquent eux-mêmes, et s'en souviennent.",
        ],
        label: "Vos invités deviennent l'instrument",
        credit: { name: 'Paris Podcast Festival', detail: '400 personnes · Gaité Lyrique, Paris' },
    },
    {
        key: 'fil-sonore',
        video: IMG('06-ancrage.mp4'),
        stat: 'Un seul fil',
        statSub: 'Une signature, du premier au dernier instant.',
        body: [
            "La plupart des événements posent de la musique par-dessus, morceau par morceau : un jingle à l'accueil, un titre pour le final, des moments isolés sans lien.",
            "Nous faisons l'inverse. Une seule signature sonore, composée pour vous, tient toute la soirée : accueil, montées sur scène, transitions, final. Un fil continu et cohérent, du premier au dernier instant.",
        ],
        label: 'Un seul fil sonore',
        credit: { name: 'PiLeJe', detail: '250 commerciaux · Lido, Paris' },
    },
    {
        key: 'kikina',
        src: IMG('07-signature.jpg'),
        stat: 'Kikina',
        statSub: 'Un son qui réagit à vos invités.',
        body: [
            "Kikina réunit trois expertises : les neurosciences, le son et le storytelling. Les neurosciences disent comment un souvenir se grave. Le son atteint l'émotion en 0,146 s, plus vite que l'image. Le storytelling donne du sens.",
            "À cette intersection, nous composons un son sur mesure, vivant en salle, qui réagit à vos invités. L'objectif est clair : qu'ils repartent en s'en souvenant.",
        ],
        label: 'Kikina',
    },
    {
        key: 'equipe',
        src: IMG('09-bourdelle.jpg'),
        // Team section cloned from the /hotels deck (same four people, same look).
        team: { eyebrow: "L'équipe", title: 'Création sonore et rigueur scientifique.' },
        members: [
            {
                name: 'Jérémie Guez',
                role: 'Co-fondateur · Direction artistique',
                bio: 'Musicien et sound designer. Il façonne la signature sonore de chaque événement et tient la cohérence artistique de bout en bout.',
                photo: null,
            },
            {
                name: 'Bianca Guez',
                role: 'Co-fondatrice & présidente · Stratégie',
                bio: 'Elle relie la science, le son et la marque, et porte l’expérience Kikina auprès des organisateurs.',
                photo: null,
            },
            {
                name: 'Arthur Boval',
                role: 'Composer-développeur · Technologie',
                bio: 'Architecte du moteur génératif maison. Il rend la musique vivante : générée en continu, jamais deux fois la même.',
                photo: null,
            },
            {
                name: 'Nicolas Decat',
                role: 'Neuroscientifique',
                bio: 'Garant de la rigueur derrière chaque choix sonore : ce qui sépare une ambiance agréable d’un environnement qui agit sur le système nerveux.',
                highlight: true,
                photo: null,
            },
        ],
        label: "L'équipe",
    },
    {
        key: 'contact',
        src: LEAFLET('09-presence.jpg'),
        eyebrow: 'Faisons de votre événement un souvenir',
        display: ['Écoutez par vous-même.'],
        logosTop: [
            ['kering', 'Kering'],
            ['puressentiel', 'Puressentiel'],
            ['loreal', "L'Oréal"],
            ['guerlain', 'Guerlain'],
            ['maisons-du-monde', 'Maisons du Monde'],
            ['pernod-ricard', 'Pernod Ricard'],
            ['harmonie-mutuelle', 'Harmonie Mutuelle'],
            ['unicef', 'Unicef'],
            ['pierre-fabre', 'Pierre Fabre'],
            ['furterer', 'René Furterer'],
        ],
        logosBottom: [
            ['pileje', 'PiLeJe'],
            ['bpifrance', 'bpifrance'],
            ['hopital-ambroise-pare', 'Hôpital Ambroise-Paré AP-HP'],
            ['publicis', 'Publicis Groupe'],
            ['ffpapf', 'Fédération Française du Prêt à Porter Féminin'],
            ['escp', 'ESCP Business School'],
            ['institut-du-monde-arabe', 'Institut du Monde Arabe'],
            ['marie-claire', 'Marie Claire'],
        ],
        cta: { label: 'Organiser votre événement', href: 'mailto:jeremie@kikinastudio.com' },
        label: 'Faisons de votre événement un souvenir',
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
        document.title = 'Kikina — Le son qui marque les esprits';
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
                        className={`leaflet-slide${slide.cards ? ' leaflet-slide--voyages' : ''}${slide.members ? ' leaflet-slide--team' : ''}${i === index ? ' is-active' : ''}`}
                        aria-hidden={i !== index}
                    >
                        {slide.video ? (
                            <>
                                {/* Dark base shows through if the clip is ever missing */}
                                <div className="leaflet-slide__img leaflet-slide__img--dark" />
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
                            </>
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
                                {slide.cta && (
                                    <a className="leaflet-stat__btn" href={slide.cta.href}>
                                        {slide.cta.label}
                                    </a>
                                )}
                                {slide.logosBottom && <LogoRow logos={slide.logosBottom} position="bottom" />}
                            </div>
                        )}

                        {/* Section 5 — the three movements, presented as cards */}
                        {slide.cards && (
                            <div className="leaflet-voyages-wrap">
                                <p className="leaflet-voyages__head">{slide.cards.intro}</p>
                                <div className="leaflet-voyages">
                                    {slide.cards.items.map((card, ci) => (
                                        <div key={card.titre} className="leaflet-voyage">
                                            <span className="leaflet-voyage__index">{String(ci + 1).padStart(2, '0')}</span>
                                            <h3 className="leaflet-voyage__title">{card.titre}</h3>
                                            <p className="leaflet-voyage__body">{card.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 9 — team, cloned from the /hotels deck */}
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
                <p className="leaflet-enter__eyebrow">Kikina — Events</p>
                <h1 className="leaflet-enter__title">
                    Le son ne décore pas votre événement.
                    <br />
                    Il décide ce qu'on en retiendra.
                </h1>
                <p className="leaflet-enter__sub">Quelques minutes. Le son, en fond, pour mieux s'y plonger.</p>
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
