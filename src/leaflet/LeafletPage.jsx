import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Howl } from 'howler';
import CursorCanvas from './CursorCanvas';
import './leaflet.css';

const BASE = import.meta.env.BASE_URL;
const IMG = (name) => `${BASE}IMAGES/leaflet/${name}`;

// Order, titles, stats and body copy mirror the Canva deck
// "Prez leaflet wellness - engl (Publication Instagram (4:5))" page by page.
// Omitted on purpose: the deck's page 5 ("DOUZE HEURES PAR JOUR") — a French
// leftover that duplicates page 4's message.
//
// Image substitutions (the deck originals are not in the asset folder):
//   - The blind spot  → 04-heat.jpg   (deck: dark auditorium with ring light)
//   - Bespoke         → 12-imprint.jpg (deck: darker crop of the massage photo)
//   - Get in touch    → 09-presence.jpg (deck: plain orange glow gradient)
// Drop the Canva exports into public/IMAGES/leaflet/ and update `src` here to
// swap them back. One wording fix vs the deck: "goes to sound" (deck has the
// typo "is so sound").
const SLIDES = [
    {
        key: 'cover',
        src: IMG('03-threshold.jpg'),
        display: ['Sound is no longer', 'a backdrop.', 'It becomes care.'],
        label: 'Cover — Sound is no longer a backdrop. It becomes care.',
    },
    {
        key: 'blind-spot',
        src: IMG('04-heat.jpg'),
        eyebrow: 'The blind spot',
        stat: '0.2%',
        statSub: "of a venue's budget goes to sound.",
        body: [
            'Your clients come looking for a pause. You master light, materials, scent.',
            'And the sound? Often a looping playlist, designed for no one. The ear never rests. Neither does the body.',
        ],
    },
    {
        key: 'sound-acts',
        src: IMG('08-signature.jpg'),
        eyebrow: 'Sound acts',
        stat: '-65 %',
        statSub: 'the drop in anxiety with adapted sound.',
        body: [
            "Sound isn't decor. It acts. Heart rate, breath, cortisol, attention. Within minutes, a frequency soothes a nervous system or exhausts it.",
            'Neuroscience measures it. Most spaces ignore it.',
        ],
    },
    {
        key: 'staff',
        src: IMG('06-state.jpg'),
        eyebrow: 'Staff hear it all day',
        stat: '62%',
        statSub: 'of retail employees rank repetition as their top complaint about in-store music.',
        body: [
            'Your clients spend an hour. Your team hears the same playlist from morning to night. The same tracks, on repeat.',
            "What relaxes a visitor wears out those who run the place. A care brand shouldn't wear down its own people.",
        ],
    },
    {
        key: 'one-of-a-kind',
        src: IMG('11-score.webp'),
        eyebrow: 'One of a kind',
        stat: '∞',
        statSub: 'Endless music, never repeated.',
        body: [
            "Your space is unique. Your playlist isn't.",
            'Kikina composes a sound that exists nowhere else, shaped to your space and your brand. Not a borrowed backdrop. A signature that belongs to you.',
        ],
    },
    {
        key: 'listens-alive',
        src: IMG('05-gesture.jpg'),
        eyebrow: 'Sound that listens',
        stat: 'Alive',
        body: [
            'Our sound is alive. Composed for the treatment, tuned continuously to the life of the space.',
            "In a treatment room fitted with a sensor, it follows the therapist's movements. When the hands slow, it stretches. When the movement quickens, it grows denser.",
            'Beyond the treatment room, it amplifies what each space is meant to create: soothe at rest, recenter in treatment, welcome in transition.',
        ],
    },
    {
        key: 'listens-bespoke',
        src: IMG('12-imprint.jpg'),
        eyebrow: 'Sound that listens',
        stat: 'Bespoke',
        body: [
            'Our sound is alive. It adapts in real time to footfall, the time of day, and the energy of the room, with no loop and no fatigue.',
            'It amplifies what each space is trying to produce: calming in rest, centering in care, welcoming in transition.',
        ],
    },
    {
        key: 'our-signature',
        src: IMG('01-sun.jpg'),
        eyebrow: 'Our signature',
        display: ['Composed by humans.', 'Adapted in real time.', 'Validated by neuroscience.'],
        body: [
            'Born from the Kikina studio, which has composed sonic experiences for Kering, Guerlain and Pernod Ricard. Now deployed in a hospital setting, where its effect is clinically measured.',
            'Not one more playlist. A signature sound: alive, measurable, unmistakable.',
        ],
    },
    {
        key: 'the-result',
        src: IMG('10-matter.jpg'),
        eyebrow: 'The result',
        stat: '85 %',
        statSub: 'of clients say music influences their experience.',
        body: [
            "Your clients won't know why they feel better. They'll just come back.",
            'Sound is an invisible part of your brand. Let people hear what your space already promises.',
        ],
    },
    {
        key: 'experience',
        src: IMG('09-presence.jpg'),
        eyebrow: "Let's turn sound into care",
        display: ['Hear it for yourself.'],
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
        cta: { label: 'Enter the sound experience', href: `${BASE}wellness/en` },
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

const MUSIC_SRC = `${BASE}MUSIC/leaflet/demo1.mp3`;
const MUSIC_VOLUME = 0.65;

export default function LeafletPage() {
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
        document.title = 'Kikina Lab — The Sound of Care';
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

    // Background music — created on the entry click (a user gesture, so the
    // browser allows playback) and faded in rather than snapped on.
    const handleEnter = useCallback(() => {
        if (startedRef.current) return;
        if (!howlRef.current) {
            howlRef.current = new Howl({ src: [MUSIC_SRC], loop: true, volume: 0 });
        }
        const howl = howlRef.current;
        howl.play();
        howl.fade(0, MUSIC_VOLUME, 2000);
        startedRef.current = true;
        setStarted(true);
    }, []);

    useEffect(() => () => {
        if (howlRef.current) {
            howlRef.current.unload();
            howlRef.current = null;
        }
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
                        <div className="leaflet-slide__img" style={{ backgroundImage: `url(${slide.src})` }} />
                        <div className="leaflet-slide__scrim" aria-hidden="true" />

                        {/* Centered display — big serif stat (deck style) or multi-line statement */}
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

                        {/* Bottom-left caption — section label + deck body copy */}
                        {(slide.eyebrow || slide.body) && (
                            <div className="leaflet-caption">
                                {slide.eyebrow && <p className="leaflet-caption__eyebrow">{slide.eyebrow}</p>}
                                {slide.body && slide.body.map((para) => (
                                    <p key={para} className="leaflet-caption__body">{para}</p>
                                ))}
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
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                </button>
            )}

            {/* Progress dots */}
            <nav className="leaflet-chrome leaflet-dots" aria-label="Slides">
                {SLIDES.map((slide, i) => (
                    <button
                        key={slide.key}
                        className={`leaflet-dot${i === index ? ' is-active' : ''}`}
                        aria-label={`Slide ${i + 1}: ${slide.label || slide.eyebrow}`}
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
                    <span className="leaflet-hint__text">Scroll</span>
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
                <p className="leaflet-enter__eyebrow">Kikina Lab — Wellness</p>
                <h1 className="leaflet-enter__title">
                    Sound is no longer a backdrop.
                    <br />
                    It becomes care.
                </h1>
                <p className="leaflet-enter__sub">A short visual walk-through. Sound on.</p>
                <button className="leaflet-enter__btn" onClick={handleEnter}>
                    Enter
                </button>
            </div>

            {/* Grain (same treatment as the main site, softer over photography) */}
            <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.06 }} />

            <CursorCanvas />
        </div>
    );
}
