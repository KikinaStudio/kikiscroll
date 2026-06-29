import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Howl } from 'howler';
import CursorCanvas from '../leaflet/CursorCanvas';
import SoundWave from './SoundWave';
import { SLIDES as FR_SLIDES, ENTRY as FR_ENTRY, META as FR_META, UI as FR_UI } from './content';
import '../leaflet/leaflet.css';
import './hotels.css';

// Hôtellerie deck — /kikiscroll/hotels.
// Same engine as the events/leaflet decks: one gesture → one slide, GSAP track,
// entry overlay, drone, cursor canvas. Only the content and a few "special"
// slide types (columns / cards / team) differ. All copy lives in content.js.

const MUSIC_SRC = `${import.meta.env.BASE_URL}MUSIC/wellness/01 Drone Wellness.mp3`;
const MUSIC_VOLUME = 0.6;

// ── Minimalist line icons for the per-space cards ────────────────────────────
const ICONS = {
    reception: <><path d="M4 18h16" /><path d="M6 18a6 6 0 0 1 12 0" /><path d="M12 6V4" /><circle cx="12" cy="6" r="0.9" /></>,
    elevator: <><rect x="5" y="3" width="14" height="18" rx="1.6" /><path d="M12 7l-2.2 3h4.4z" /><path d="M12 17l-2.2-3h4.4z" /></>,
    corridor: <><path d="M4 3 9 7v10l-5 4" /><path d="M20 3l-5 4v10l5 4" /></>,
    rest: <path d="M20 14.5A7 7 0 1 1 10.5 4 5.5 5.5 0 0 0 20 14.5z" />,
    work: <><rect x="4" y="5" width="16" height="11" rx="1.2" /><path d="M2.5 19.5h19" /></>,
    spa: <path d="M12 3c3.5 4.2 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2-5.8 5.5-10z" />,
    bed: <><path d="M3 18v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /><path d="M3 20v-2M21 20v-2" /><path d="M7 12V9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" /></>,
    treatment: <><ellipse cx="12" cy="16.6" rx="6" ry="2.3" /><ellipse cx="12" cy="11.8" rx="4.5" ry="1.9" /><ellipse cx="12" cy="7.6" rx="3.1" ry="1.5" /></>,
    // Brand slide (s06) — a distinct family, shown borderless + gold.
    signature: <path d="M3 16c2 0 3.1-8.5 4.9-8.5 1.6 0 1.7 10 3.4 10 1.2 0 1.8-3 3.1-3 1.1 0 1.6 1.2 3.6 1.2" />,
    story: <><path d="M12 6.6C10.4 5.4 8.3 4.8 5 5.1v12c3.3-.3 5.4.3 7 1.5 1.6-1.2 3.7-1.8 7-1.5v-12c-3.3-.3-5.4.3-7 1.5z" /><path d="M12 6.6v12.4" /></>,
    adaptation: <><path d="M6 4v16M12 4v16M18 4v16" /><circle cx="6" cy="14" r="2" /><circle cx="12" cy="8" r="2" /><circle cx="18" cy="12" r="2" /></>,
    evolution: <><path d="M3 17l5.5-5.5 4 4 8.5-9" /><path d="M16 6.5h5v5" /></>,
};

function Icon({ name }) {
    if (!ICONS[name]) return null;
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name]}
        </svg>
    );
}

// ── Centered key figures (one big, or a row of two/three) ────────────────────
function Stats({ slide }) {
    const stats = slide.stats || (slide.stat ? [{ figure: slide.stat, sub: slide.statSub, unit: slide.statUnit }] : null);
    if (!stats) return null;
    if (stats.length === 1) {
        const s = stats[0];
        return (
            <div className="leaflet-stat">
                <span className="leaflet-stat__figure">{s.figure}</span>
                {s.unit && <span className="h-stat__unit">{s.unit}</span>}
                {s.sub && <span className="leaflet-stat__sub">{s.sub}</span>}
                <Sources slide={slide} />
            </div>
        );
    }
    return (
        <div className="leaflet-stat leaflet-stat--multi">
            <div className={`h-stat-row h-stat-row--${stats.length}`}>
                {stats.map((s, i) => (
                    <div className="h-stat" key={i}>
                        <span className="h-stat__figure">{s.figure}</span>
                        {s.unit && <span className="h-stat__unit">{s.unit}</span>}
                        {s.sub && <span className="h-stat__sub">{s.sub}</span>}
                    </div>
                ))}
            </div>
            <Sources slide={slide} />
        </div>
    );
}

// Sources gathered to one small line at the bottom of the slide.
function Sources({ slide }) {
    if (!slide.sources || !slide.sources.length) return null;
    return <p className="h-sources" aria-hidden="true">{slide.sources.join(' · ')}</p>;
}

function Caption({ slide }) {
    if (!slide.eyebrow && !slide.body) return null;
    return (
        <div className="leaflet-caption">
            {slide.eyebrow && <p className="leaflet-caption__eyebrow">{slide.eyebrow}</p>}
            {slide.body && slide.body.map((para) => (
                <p key={para} className="leaflet-caption__body">{para}</p>
            ))}
        </div>
    );
}

// Header for the special (centered) slides — eyebrow + serif statement.
function SpecialHead({ slide }) {
    return (
        <div className="h-special__head">
            {slide.eyebrow && <p className="h-special__eyebrow">{slide.eyebrow}</p>}
            {slide.title && (
                <p className="h-special__title">
                    {Array.isArray(slide.title)
                        ? slide.title.map((line, i) => (
                            <span key={line}>
                                {line}
                                {i < slide.title.length - 1 && <br />}
                            </span>
                        ))
                        : slide.title}
                </p>
            )}
            {slide.intro && <p className="h-special__intro">{slide.intro}</p>}
        </div>
    );
}

// Foot zone pinned to the bottom of a special slide: an optional claim line
// plus the scientific source (cols/cards slides).
function SpecialFoot({ slide }) {
    const hasSources = slide.sources && slide.sources.length > 0;
    if (!slide.foot && !hasSources) return null;
    return (
        <div className="h-special__footzone">
            {slide.foot && <p className="h-special__foot">{slide.foot}</p>}
            {hasSources && <p className="h-special__src">{slide.sources.join(' · ')}</p>}
        </div>
    );
}

function LogoRow({ logos, position = 'bottom' }) {
    return (
        <div className={`leaflet-stat__logos leaflet-stat__logos--${position}`}>
            {logos.map((logo) =>
                logo.src ? (
                    <img key={logo.name} src={logo.src} alt={logo.name} className={`leaflet-logo-img${logo.small ? ' leaflet-logo-img--sm' : ''}`} />
                ) : (
                    <span key={logo.name} className="h-logo-text">{logo.name}</span>
                )
            )}
        </div>
    );
}

function SlideBody({ slide }) {
    switch (slide.type) {
        case 'cols':
            return (
                <div className="h-special">
                    <div className="h-special__main">
                        <SpecialHead slide={slide} />
                        <div className="h-cols">
                            {slide.columns.map((col) => (
                                <article key={col.tag} className={`h-col${col.living ? ' h-col--living' : ' h-col--static'}`}>
                                    {col.living && <SoundWave className="h-col__wave" lines={3} amplitude={0.3} alpha={0.6} speed={0.011} />}
                                    {col.living && <span className="h-col__pulse" aria-hidden="true" />}
                                    <span className="h-col__tag">{col.tag}</span>
                                    <div className="h-col__axes">
                                        <span className="h-col__axis">{col.artist}</span>
                                        <span className={`h-col__axis h-col__axis--${col.alive ? 'alive' : 'fixed'}`}>
                                            {col.music}
                                        </span>
                                    </div>
                                    {col.badge && <span className="h-col__badge">{col.badge}</span>}
                                    <p className="h-col__body">{col.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                    <SpecialFoot slide={slide} />
                </div>
            );

        case 'cards':
            return (
                <div className="h-special">
                    <div className="h-special__main">
                        <SpecialHead slide={slide} />
                        <div className={`h-cards h-cards--${slide.cards.length}`}>
                            {slide.cards.map((card) => (
                                <article key={card.title} className={`h-card${card.feature ? ' h-card--feature' : ''}`}>
                                    {card.badge && <span className="h-card__badge">{card.badge}</span>}
                                    <span className="h-card__head">
                                        {card.icon && (
                                            <span className="h-card__icon">
                                                <Icon name={card.icon} />
                                            </span>
                                        )}
                                        <h3 className="h-card__title">{card.title}</h3>
                                    </span>
                                    <p className="h-card__body">{card.body}</p>
                                    {card.tag && (
                                        <span className="h-card__tag">
                                            <span className="h-card__tag-fig">{card.tag}</span>
                                            {card.tagLabel && <span className="h-card__tag-label">{card.tagLabel}</span>}
                                        </span>
                                    )}
                                </article>
                            ))}
                        </div>
                    </div>
                    <SpecialFoot slide={slide} />
                </div>
            );

        case 'team':
            return (
                <div className="h-special">
                    <SpecialHead slide={slide} />
                    <div className={`h-team h-team--${slide.members.length}`}>
                        {slide.members.map((m, i) => (
                            <article key={m.name + i} className={`h-member${m.highlight ? ' h-member--highlight' : ''}`}>
                                <div className="h-member__photo" aria-hidden="true">
                                    {m.photo ? (
                                        <img src={m.photo} alt="" />
                                    ) : (
                                        <span className="h-member__initials">
                                            {m.name.replace(/\[.*?\]/g, '·').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                        </span>
                                    )}
                                </div>
                                <div className="h-member__info">
                                    <h3 className="h-member__name">{m.name}</h3>
                                    <p className="h-member__role">{m.role}</p>
                                    <p className="h-member__bio">{m.bio}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                    {slide.partners && (
                        <div className="h-partners">
                            {slide.partners.map((p) => (
                                <span key={p.name} className="h-partner">
                                    <span className="h-partner__name">{p.name}</span>
                                    {p.note && <span className="h-partner__note">{p.note}</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            );

        case 'finale': {
            // CTA sits in the middle of the client wall (logos above + below),
            // matching the leaflet/events finales.
            const logos = slide.logos || [];
            const mid = Math.ceil(logos.length / 2);
            return (
                <div className="leaflet-stat leaflet-stat--lines leaflet-stat--finale">
                    {logos.length > 0 && <LogoRow logos={logos.slice(0, mid)} position="top" />}
                    {slide.eyebrow && <p className="h-finale__eyebrow">{slide.eyebrow}</p>}
                    {slide.display && slide.display.map((line) => (
                        <span key={line} className="leaflet-stat__line">{line}</span>
                    ))}
                    {slide.cta && (
                        <a className="leaflet-stat__btn" href={slide.cta.href}>{slide.cta.label}</a>
                    )}
                    {logos.length > 0 && <LogoRow logos={logos.slice(mid)} position="bottom" />}
                </div>
            );
        }

        default:
            return (
                <>
                    <Stats slide={slide} />
                    <Caption slide={slide} />
                </>
            );
    }
}

export default function HotelsPage({ slides = FR_SLIDES, entry = FR_ENTRY, meta = FR_META, ui = FR_UI } = {}) {
    // FR by default; the EN route (main.jsx) passes the English content + chrome.
    const SLIDES = slides;
    const ENTRY = entry;
    const META = meta;
    const UI = ui;

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
        document.title = META.title.replace('⎜', ' · ');
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

    // Wheel / touch / keyboard → one gesture, one slide.
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
        const onTouchStart = (e) => { touchStartYRef.current = e.touches[0].clientY; };
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
        return () => {
            howl.unload();
            if (howlRef.current === howl) howlRef.current = null;
        };
    }, []);

    const handleEnter = useCallback(() => {
        if (startedRef.current) return;
        const howl = howlRef.current;
        if (howl) {
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
                        className={`leaflet-slide${slide.type ? ` leaflet-slide--${slide.type}` : ''}${slide.dark ? ' leaflet-slide--dark-mood' : ''}${slide.heavy ? ' leaflet-slide--heavy-scrim' : ''}${slide.mod ? ` ${slide.mod}` : ''}${i === index ? ' is-active' : ''}`}
                        aria-hidden={i !== index}
                    >
                        <div className="leaflet-slide__img" style={{ backgroundImage: `url(${slide.src})` }} />
                        <div className="leaflet-slide__scrim" aria-hidden="true" />
                        <SlideBody slide={slide} />
                    </section>
                ))}
            </div>

            {/* Header — Kikina wordmark */}
            <header className="leaflet-chrome leaflet-logo">
                <svg width="96" height="21" viewBox="0 0 1096 237" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
                    aria-label={isMuted ? UI.unmute : UI.mute}
                >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                </button>
            )}

            {/* Progress dots */}
            <nav className="leaflet-chrome leaflet-dots" aria-label={UI.slidesNav}>
                {SLIDES.map((slide, i) => (
                    <button
                        key={slide.key}
                        className={`leaflet-dot${i === index ? ' is-active' : ''}`}
                        aria-label={UI.slideLabel(i + 1, slide.label || slide.eyebrow)}
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
                    <span className="leaflet-hint__text">{UI.scroll}</span>
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
                <p className="leaflet-enter__eyebrow">{ENTRY.eyebrow}</p>
                <h1 className="leaflet-enter__title">
                    {ENTRY.title.map((line, i) => (
                        <span key={line}>
                            {line}
                            {i < ENTRY.title.length - 1 && <br />}
                        </span>
                    ))}
                </h1>
                <p className="leaflet-enter__sub">
                    {Array.isArray(ENTRY.sub)
                        ? ENTRY.sub.map((line, i) => (
                            <span key={line}>
                                {line}
                                {i < ENTRY.sub.length - 1 && <br />}
                            </span>
                        ))
                        : ENTRY.sub}
                </p>
                <button className="leaflet-enter__btn" onClick={handleEnter}>{ENTRY.button}</button>
            </div>

            {/* Grain */}
            <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.06 }} />

            <CursorCanvas />
        </div>
    );
}
