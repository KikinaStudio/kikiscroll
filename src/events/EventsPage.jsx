import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Howl } from 'howler';
import CursorCanvas from '../leaflet/CursorCanvas';
import '../leaflet/leaflet.css';

// Events deck — /kikiscroll/events.
// Same mechanics and styling as the wellness leaflet (LeafletPage): one
// gesture → one slide, GSAP track, entry overlay, drone, cursor canvas. Only
// the content differs. Order, titles, taglines and body copy mirror the Notion
// deck "Slides Leaflet Events" slide by slide.
//
// Backgrounds live in public/IMAGES/events/. Slides 6 ("Ancrage") and 8
// ("Vivant") use silent looping background videos (06-ancrage.mp4 — PiLeJe at
// the Lido ; 08-paris-podcast.mp4 — Paris Podcast Festival at the Gaité
// Lyrique). A dark canvas shows behind a video slide's text if its clip is
// ever missing. `credit` carries the small photo/video caption (client +
// audience + venue) shown bottom-right on the experience slides.
const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/events/${name}`;
// The finale reuses the leaflet's partner logos and warm-glow backdrop — the
// client roster is the same studio's, so there's no need to duplicate assets.
const LEAFLET = (name) => `${BASE}IMAGES/leaflet/${name}`;
const LOGO = (file) => `${BASE}IMAGES/leaflet/logos/${file}.png`;

const SLIDES = [
    {
        key: 'oubli',
        src: IMG('01-oubli.jpg'),
        stat: '70%',
        statSub: 'Oublié sous 24h.',
        body: [
            "C'est la part de l'information passive que le cerveau efface en une journée (courbe d'Ebbinghaus). L'événement d'entreprise coche toutes les cases du jetable : écrans, slides, position assise, attention de façade.",
            "On ne prolonge pas la journée. On la fait oublier plus vite.",
        ],
        label: 'Oublié sous 24h — 70%',
    },
    {
        key: 'habituation',
        src: IMG('02-habituation.jpg'),
        stat: 'Habituation',
        statSub: 'Le réflexe qui ne marche plus.',
        body: [
            "Face à un événement plat, l'instinct du secteur est de frapper plus fort : plus de lumière, plus d'effets, plus de décibels, pour générer dopamine et souvenirs.",
            "Mais un cerveau saturé d'écrans vit en habituation permanente. Chaque stimulus supplémentaire produit une réponse plus faible que le précédent. On ajoute du bruit, pas de la mémoire.",
        ],
        label: 'Habituation',
    },
    {
        key: 'contraste',
        src: IMG('03-contraste.jpg'),
        stat: 'Contraste',
        statSub: 'La mémoire ne fonctionne pas au volume.',
        body: [
            "La dopamine ne répond pas au niveau absolu de stimulation, mais à l'écart entre l'attendu et le vécu (reward prediction error, Schultz, Science, 1997). C'est le mécanisme de récompense le plus solidement établi en neurosciences.",
            "Ce que le cerveau récompense, ce n'est pas l'intensité. C'est la rupture.",
        ],
        label: 'Contraste',
    },
    {
        key: 'coupe',
        src: IMG('04-coupe.jpg'),
        stat: '0,15 s',
        statSub: 'On coupe. Yeux fermés.',
        body: [
            "Le son atteint l'auditeur en 0,146 seconde, trois fois plus vite que l'image. En éteignant d'un coup la surstimulation visuelle, on libère des ressources attentionnelles massives et on crée l'écart exact que le cerveau récompense.",
            "Le signal sonore qui suit est traité avec une acuité que rien d'autre ne déclenche.",
        ],
        label: '0,15 s — On coupe',
        credit: { name: "L'Amphi", detail: '200 leaders en santé · Paris' },
    },
    {
        key: 'cocreation',
        src: IMG('05-cocreation.jpg'),
        stat: 'Co-création',
        statSub: 'Un sas de décompression, puis un voyage intérieur.',
        body: [
            "L'audience se déconnecte de son quotidien et entre dans un récit dont elle est co-auteure : elle y projette ses souvenirs, ses sensations, ses émotions. Personne ne vit la même chose.",
            "Le son touche avant que la raison n'intervienne. C'est précisément là, les yeux fermés, que le souvenir s'inscrit en profondeur.",
        ],
        label: 'Co-création',
        credit: { name: 'Kering', detail: 'International Fashion Summit · NYC' },
    },
    {
        key: 'ancrage',
        video: IMG('06-ancrage.mp4'),
        stat: 'Ancrage',
        statSub: 'Le storytelling qui structure la mémoire.',
        body: [
            "Dès l'ouverture, l'invité est plongé dans l'univers de l'événement comme aucune autre expérience ne le permet. Une étude Nature Communications (McClay et al., 2023) montre que les transitions émotionnelles d'une musique structurent l'encodage des souvenirs épisodiques : elles découpent le vécu en moments mémorables.",
            "Bien orchestrées, ces transitions gravent l'événement dans la mémoire longue.",
            "La musique ne décore pas l'événement. Elle dicte ce qu'on en retiendra.",
        ],
        label: 'Ancrage',
        credit: { name: 'PiLeJe', detail: '250 commerciaux · Lido, Paris' },
    },
    {
        key: 'signature',
        src: IMG('07-signature.jpg'),
        stat: '+76%',
        statSub: 'Ce que vous gagnez à signer le son de votre événement.',
        body: [
            "Les marques avec une identité sonore forte sont 76 % plus souvent choisies que les autres (Kantar). À l'échelle d'un événement, c'est la différence entre une convention oubliée le lundi matin et une marque qu'on associe encore, six mois plus tard, à une émotion précise.",
            "Pourtant, à votre événement, tout ce qui se voit est pensé sur mesure, et le son, jamais. Parce que c'était impossible. Plus aujourd'hui.",
        ],
        label: '+76% — La puissance du son',
        credit: { name: 'PiLeJe', detail: '250 commerciaux · Lido, Paris' },
    },
    {
        key: 'vivant',
        video: IMG('08-paris-podcast.mp4'),
        stat: 'Vivant',
        statSub: 'Vos convives deviennent les instruments.',
        body: [
            "Notre son est adaptatif et vivant : composé pour votre événement, il réagit à la salle en temps réel. Les gestes, les expressions et les déplacements de vos convives nourrissent la musique — chacun devient, sans le savoir, l'un de ses instruments.",
            "Le son atteint alors la puissance émotionnelle qu'on ne ressent d'ordinaire qu'au cinéma : porté par la salle, vivant, impossible à rejouer à l'identique.",
        ],
        label: 'Vivant — le son adaptatif',
        credit: { name: 'Paris Podcast Festival', detail: '400 personnes · Gaité Lyrique, Paris' },
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
                        className={`leaflet-slide${i === index ? ' is-active' : ''}`}
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
