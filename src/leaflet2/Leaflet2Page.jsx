import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Howl } from 'howler';
import CursorCanvas from '../leaflet/CursorCanvas';
import '../leaflet/leaflet.css';

const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/leaflet/${name}`;
const EVT = (name) => `${BASE}IMAGES/events/${name}`;

// Leaflet2 — /kikiscroll/leaflet2.
// Clone des mécaniques du leaflet wellness (LeafletPage) — entrée + drone +
// scroll-snap GSAP — mais contenu événementiel, repris du PDF
// "Prez leaflet wellness - engl" (en français malgré son nom).
//
// La slide 05 ("Ce qu'on a fait vivre") ajoute un layout 4-cas (Lido,
// Bourdelle, L'Amphi, Kering) avec mini-photos prises dans IMAGES/events/.
const SLIDES = [
    {
        key: 'cover',
        src: IMG('03-threshold.jpg'),
        display: ["Le son n'est plus un fond.", 'Il devient un outil.'],
        label: "Cover — Le son n'est plus un fond. Il devient un outil.",
    },
    {
        key: 'blind-spot',
        src: IMG('04-heat.jpg'),
        eyebrow: "L'angle mort",
        stat: '0,2 %',
        statSub: "du budget d'un événement va au son.",
        body: [
            "Vos publics sont saturés d'images, d'écrans, de slides. L'attention craque avant que le message ne passe.",
            "Vous maîtrisez la lumière, la scénographie, la prise de parole. Et le son ? Souvent une playlist qui tourne, choisie par défaut.",
        ],
        label: "0,2 % — L'angle mort",
    },
    {
        key: 'sound-acts',
        src: IMG('08-signature.jpg'),
        eyebrow: 'Le son agit',
        stat: '-30 %',
        statSub: "la baisse d'anxiété perçue avec des sons adaptés.",
        body: [
            "Le son n'est pas un décor. Il agit. Rythme cardiaque, respiration, attention, mémoire.",
            "En quelques minutes, une fréquence régule un système nerveux, recentre une audience, ancre un message. La neuroscience le mesure. La plupart des événements l'ignorent.",
        ],
        label: '-30 % — Le son agit',
    },
    {
        key: 'immersion',
        src: IMG('06-state.jpg'),
        eyebrow: 'Immersion collective',
        stat: '+31 %',
        statSub: "de mémorisation quand l'écoute se fait les yeux fermés.",
        body: [
            "Dans le noir, en audio 3D binaural, toute une salle est plongée dans un même voyage, en même temps. Un arc narratif émotionnel écrit à la frontière du storytelling et des neurosciences.",
            "Là où la vidéo informe et le discours convainc, l'immersion sonore fait ressentir. Un message vécu de l'intérieur ne s'oublie pas.",
        ],
        label: '+31 % — Immersion collective',
    },
    {
        key: 'lived',
        src: IMG('02-ear.jpg'),
        eyebrow: "Ce qu'on a fait vivre",
        stat: '1 sur 2',
        statSub: 'se dit gêné par le bruit sur son lieu de travail.',
        cases: [
            {
                key: 'lido',
                photo: EVT('07-signature.jpg'),
                name: 'Le Lido, 250 personnes',
                body: "Un sas de déconnexion sonore en ouverture d'événement, avant les premiers talks. 250 personnes coupées du brouhaha extérieur, recentrées dans l'instant présent, disponibles pour la suite.",
            },
            {
                key: 'bourdelle',
                photo: EVT('09-bourdelle.jpg'),
                name: 'Dîner au Musée Bourdelle',
                body: 'Les casques servis sur un plateau entre deux services. Une immersion qui se glisse à table, prolongement sensoriel du dîner.',
            },
            {
                key: 'sante',
                photo: EVT('04-coupe.jpg'),
                name: '200 leaders de la santé',
                body: "Une immersion binaurale qui plonge 200 dirigeants dans la perception réelle d'une crise d'anxiété, d'une schizophrénie. Le débat qui suit n'est plus le même.",
            },
            {
                key: 'kering',
                photo: EVT('05-cocreation.jpg'),
                name: 'Kering, sommet annuel à New York',
                body: "Faire ressentir la sustainability aux dirigeants, au-delà des chiffres RSE. Un voyage binaural qui les emmène du chaos urbain à l'harmonie naturelle.",
            },
        ],
        label: "1 sur 2 — Ce qu'on a fait vivre",
    },
    {
        key: 'adaptive',
        src: IMG('05-gesture.jpg'),
        eyebrow: 'Ambiance adaptative',
        display: ['Sur mesure,', 'en temps', 'réel'],
        body: [
            "Pas une playlist. Une matière sonore vivante, composée en continu, qui réagit à l'affluence, à l'énergie de la salle, aux moments forts du déroulé.",
            'Elle accompagne sans prendre le dessus : recentre en ouverture, intensifie en climax, apaise en transition, ancre en clôture.',
            "Une signature acoustique unique à votre événement, impossible à reproduire ailleurs.",
        ],
        label: 'Sur mesure, en temps réel',
    },
    {
        key: 'unique',
        src: IMG('11-score.webp'),
        eyebrow: 'Unique comme votre événement',
        stat: '∞',
        statSub: 'Une signature infinie, jamais répétée.',
        body: [
            'Votre événement est unique. Votre playlist, non.',
            "Kikina compose un son qui n'existe nulle part ailleurs, à l'image de votre marque, de votre récit, de votre moment. Pas un fond emprunté. Une signature qui vous appartient.",
        ],
        label: '∞ — Unique comme votre événement',
    },
    {
        key: 'our-signature',
        src: IMG('01-sun.jpg'),
        eyebrow: 'Notre signature',
        display: ['Composé par des humains.', 'Adapté en temps réel.', 'Validé par la neuroscience.'],
        body: [
            'Né du studio Kikina, qui a signé des expériences sonores immersives pour Kering, Pernod Ricard, UNICEF, Pierre Fabre.',
            'Pas une playlist de plus. Le son composé sur mesure, calibré par les neurosciences, pour transformer ce que vos publics ressentent et retiennent.',
        ],
        label: 'Notre signature',
    },
    {
        key: 'the-result',
        src: IMG('10-matter.jpg'),
        eyebrow: 'Le résultat',
        stat: '+96 %',
        statSub: "de mémorisation quand la musique épouse l'identité de marque.",
        body: [
            "Vos publics ne sauront pas pourquoi ils s'en souviennent. Ils s'en souviendront, simplement.",
            'Le son est la part invisible de votre événement. Faites entendre ce que votre récit promet déjà.',
        ],
        label: '+96 % — Le résultat',
    },
    {
        key: 'experience',
        src: IMG('09-presence.jpg'),
        eyebrow: "Faisons de l'événement une expérience",
        display: ['Contactez-nous.'],
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
        cta: { label: 'bianca@kikinastudio.com', href: 'mailto:bianca@kikinastudio.com' },
        label: "Faisons de l'événement une expérience",
    },
];

function LogoRow({ logos, position }) {
    return (
        <div className={`leaflet-stat__logos leaflet-stat__logos--${position}`}>
            {logos.map(([file, name]) => (
                <img key={file} src={IMG(`logos/${file}.png`)} alt={name} className="leaflet-logo-img" />
            ))}
        </div>
    );
}

function CaseGrid({ cases }) {
    return (
        <div className="leaflet-cases" aria-label="Références">
            {cases.map((c) => (
                <article key={c.key} className="leaflet-case">
                    <div className="leaflet-case__photo" style={{ backgroundImage: `url(${c.photo})` }} />
                    <p className="leaflet-case__name">{c.name}</p>
                    <p className="leaflet-case__body">{c.body}</p>
                </article>
            ))}
        </div>
    );
}

const MUSIC_SRC = `${BASE}MUSIC/wellness/01 Drone Wellness.mp3`;
const MUSIC_VOLUME = 0.65;

export default function Leaflet2Page() {
    const [index, setIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const trackRef = useRef(null);
    const indexRef = useRef(0);
    const animatingRef = useRef(false);
    const startedRef = useRef(false);
    const howlRef = useRef(null);
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
                setTimeout(() => { animatingRef.current = false; }, 250);
            },
        });
    }, []);

    const step = useCallback((dir) => goTo(indexRef.current + dir), [goTo]);

    useEffect(() => {
        const onWheel = (e) => {
            e.preventDefault();
            if (!startedRef.current) return;
            const now = performance.now();
            const { delta: prevDelta, at: prevAt } = lastWheelRef.current;
            const fresh = now - prevAt > 180;
            const growing = Math.abs(e.deltaY) > Math.abs(prevDelta);
            lastWheelRef.current = { delta: fresh ? 0 : e.deltaY, at: now };
            if (Math.abs(e.deltaY) < 4) return;
            if (!fresh && !growing) return;
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

    useEffect(() => {
        const howl = new Howl({ src: [MUSIC_SRC], loop: true, volume: 0, html5: true, preload: true });
        howlRef.current = howl;
        return () => { howl.unload(); howlRef.current = null; };
    }, []);

    const handleEnter = useCallback(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        setStarted(true);
        const howl = howlRef.current;
        if (howl) {
            howl.play();
            howl.fade(0, MUSIC_VOLUME, 1200);
        }
    }, []);

    const toggleMute = useCallback(() => {
        const howl = howlRef.current;
        if (!howl) return;
        setIsMuted((m) => {
            const next = !m;
            howl.fade(howl.volume(), next ? 0 : MUSIC_VOLUME, 400);
            return next;
        });
    }, []);

    return (
        <div className="leaflet-root">
            <div className="leaflet-track" ref={trackRef}>
                {SLIDES.map((slide, i) => (
                    <section
                        key={slide.key}
                        className={`leaflet-slide${i === index ? ' is-active' : ''}${slide.cases ? ' leaflet-slide--cases' : ''}`}
                        aria-hidden={i !== index}
                    >
                        <div className="leaflet-slide__img" style={{ backgroundImage: `url(${slide.src})` }} />
                        <div className="leaflet-slide__scrim" aria-hidden="true" />

                        {slide.stat && (
                            <div className="leaflet-stat">
                                <span className="leaflet-stat__figure">{slide.stat}</span>
                                {slide.statSub && <span className="leaflet-stat__sub">{slide.statSub}</span>}
                            </div>
                        )}
                        {slide.display && (
                            <div className={`leaflet-stat leaflet-stat--lines${slide.key === 'cover' ? ' leaflet-stat--cover' : ''}`}>
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

                        {(slide.eyebrow || slide.body) && (
                            <div className="leaflet-caption">
                                {slide.eyebrow && <p className="leaflet-caption__eyebrow">{slide.eyebrow}</p>}
                                {slide.body && slide.body.map((para) => (
                                    <p key={para} className="leaflet-caption__body">{para}</p>
                                ))}
                            </div>
                        )}

                        {slide.cases && slide.eyebrow && (
                            <p className="leaflet-cases__eyebrow">{slide.eyebrow}</p>
                        )}
                        {slide.cases && <CaseGrid cases={slide.cases} />}
                    </section>
                ))}
            </div>

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

            <nav className="leaflet-chrome leaflet-dots" aria-label="Slides">
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

            <div className="leaflet-chrome leaflet-counter" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
                <span className="leaflet-counter__sep" />
                {String(SLIDES.length).padStart(2, '0')}
            </div>

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

            <div className={`leaflet-enter${started ? ' is-hidden' : ''}`}>
                <p className="leaflet-enter__eyebrow">Kikina — Events</p>
                <h1 className="leaflet-enter__title">
                    Le son n'est plus un fond.
                    <br />
                    Il devient un outil.
                </h1>
                <p className="leaflet-enter__sub">Quelques minutes. Le son, en fond, pour mieux s'y plonger.</p>
                <button className="leaflet-enter__btn" onClick={handleEnter}>
                    Entrer
                </button>
            </div>

            <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.06 }} />

            <CursorCanvas />
        </div>
    );
}
