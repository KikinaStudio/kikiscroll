import { useEffect, useState, useRef, useCallback } from 'react';
import Lenis from '@studio-freight/lenis';
import Scene from './components/Scene';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAudioStore } from './store/useAudioStore';
import * as faceapi from 'face-api.js';

gsap.registerPlugin(ScrollTrigger);

// SECTION ORDER:
// 0 = Intro (drone only, near-round blob)
// 1 = Isolation Directionnelle (crowd → toggle at ~50% progress)
// 2 = Neuro-Sonore (jungle/relaxation → pulsatingWave/régulation → focusCognitif/focus)
// 3 = Musique Neuro-Adaptative (cut all non-drone, webcam → HAPPY/SAD)
// 4 = Densité Interactive (1→5 blobs + stems accumulate, quasi-spherical)

const sectionsData = [
    {
        id: 0,
        title: "Un lieu a une âme.",
        paragrapheParts: [
            "«La musique, c'est 50% d'un film.» Francis Ford Coppola.",
            "Dans nos boutiques et nos événements pourtant, cette magie disparaît. Le son y est subi : une playlist en boucle, aveugle à qui est là, à ce qu'ils ressentent, à l'histoire qu'on voudrait raconter.",
            "Au cinéma, la musique désigne le personnage principal : elle le suit, réagit à ses émotions, l'élève. Nous faisons la même chose, mais pour vos visiteurs.",
        ],
        isIntro: true,
    },
    {
        id: 1,
        title: "Elle s'entend.",
        paragrapheParts: [
            "Un salon bondé, une boutique un vendredi soir : le brouhaha s'accumule, fatigue, et pousse doucement vers la sortie.",
            "Au cinéma, le réalisateur sait isoler un personnage dans le chaos. Le monde s'efface, et il ne reste qu'une bulle d'intimité, le temps d'une scène.",
            "Nous faisons exactement cela dans le monde physique. Une bulle de clarté, invisible, au milieu du vacarme.",
        ],
        hasIsolationToggle: true,
    },
    {
        id: 2,
        title: "Elle se ressent.",
        paragrapheParts: [
            "Un simple changement d'accord transforme une scène de joie en nostalgie. La musique modifie notre rythme cardiaque, notre respiration, souvent avant même qu'on s'en rende compte.",
            "Près de 80% de la recherche sur les effets du son sur le cerveau a été publiée ces dix dernières années. Nous pouvons désormais l'utiliser avec une précision inédite.",
            "Concentration, apaisement, énergie : nous pouvons aujourd'hui composer l'état émotionnel d'un lieu comme un réalisateur compose sa bande originale.",
        ],
        hasEnvironmentLabels: true,
    },
    {
        id: 3,
        title: "Elle vit avec vous.",
        paragrapheParts: [
            "La musique ne joue plus pour remplir le silence. Grâce aux travaux de notre équipe en neurosciences, elle active en temps réel des paramètres émotionnels et comportementaux précis, propres à chaque moment, chaque intention, chaque client.",
            "Pour en faire l'expérience : activez votre caméra. Souriez, ou non. La musique vous lira.",
            "C'est ce que chacun de vos visiteurs peut vivre, sans le savoir, simplement en étant là.",
        ],
        hasWebcamButton: true,
    },
    {
        id: 4,
        title: "Et grandit avec vous.",
        paragrapheParts: [
            "Imaginez une pièce avec un simple drone sonore. Une personne entre et un violon s'éveille. Une deuxième s'approche et un rythme apparaît, doucement.",
            "La musique ne remplit plus l'espace : elle lui répond. Plus riche, plus dense, au rythme de ceux qui arrivent.",
            "Elle attire ceux qui passent. Elle accueille ceux qui entrent, et récompense ceux qui restent.",
        ],
        hasDensityLabels: true,
    },
];

// --- Continuous audio logic driven by sectionProgress ---
function useScrollAudio(activeSection, sectionProgress, fadeTrack, isIsolationActive) {
    const prevPalierRef = useRef(-1);

    useEffect(() => {
        if (activeSection === 0) {
            // Intro: only drone plays (already at 0.5 from init)
            prevPalierRef.current = -1;
        } else if (activeSection === 1) {
            // Isolation: crowd is controlled by auto-toggle logic based on progress
            prevPalierRef.current = -1;
        } else if (activeSection === 2) {
            // Neuro-sonore: Crossfade jungle (relaxation) → pulsatingWave (régulation) → focusCognitif (focus)
            prevPalierRef.current = -1;
            let jungleVol = 0, pulsatingVol = 0, focusVol = 0;

            if (sectionProgress < 0.33) {
                jungleVol = 0.6;
            } else if (sectionProgress < 0.66) {
                const t = (sectionProgress - 0.33) / 0.33;
                jungleVol = 0.6 * (1 - t);
                pulsatingVol = 0.6 * t;
            } else {
                const t = (sectionProgress - 0.66) / 0.34;
                pulsatingVol = 0.6 * (1 - t);
                focusVol = 0.6 * t;
            }

            fadeTrack('jungle', jungleVol, 150);
            fadeTrack('pulsatingWave', pulsatingVol, 150);
            fadeTrack('focusCognitif', focusVol, 150);
        } else if (activeSection === 3) {
            // Neuro-Adaptative: happy/sad controlled by webcam state, handled in App
            prevPalierRef.current = -1;
        } else if (activeSection === 4) {
            // Density: progressive stem accumulation (1→5 layers, couche 1 = drone already playing)
            prevPalierRef.current = -1;
            const stems = ['strings', 'bass', 'drums', 'keyboard'];
            const blobCount = Math.min(Math.floor(sectionProgress * 5) + 1, 5);
            // blobCount 1 = drone only, 2 = +strings, 3 = +bass, 4 = +drums, 5 = +keyboard
            const stemsActive = Math.max(0, blobCount - 1);
            for (let s = 0; s < stemsActive; s++) {
                fadeTrack(stems[s], 0.4, 300);
            }
            for (let s = stemsActive; s < stems.length; s++) {
                fadeTrack(stems[s], 0, 300);
            }
        } else {
            prevPalierRef.current = -1;
        }
    }, [activeSection, sectionProgress, fadeTrack, isIsolationActive]);
}

// --- Face detection using face-api.js for real expression recognition ---

const FACE_API_MODELS_URL = import.meta.env.BASE_URL + 'models';
let faceApiModelsLoaded = false;
let faceApiModelsLoading = false;

async function loadFaceApiModels() {
    if (faceApiModelsLoaded || faceApiModelsLoading) return;
    faceApiModelsLoading = true;
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(FACE_API_MODELS_URL),
        ]);
        faceApiModelsLoaded = true;
    } catch (err) {
        console.error('Failed to load face-api.js models:', err);
    }
    faceApiModelsLoading = false;
}

function useFaceDetection(isActive, videoRef) {
    const [isSmiling, setIsSmiling] = useState(null);
    const intervalRef = useRef(null);
    const modelsReadyRef = useRef(false);

    useEffect(() => {
        if (!isActive || !videoRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsSmiling(null);
            return;
        }

        let cancelled = false;

        (async () => {
            await loadFaceApiModels();
            if (cancelled) return;
            modelsReadyRef.current = faceApiModelsLoaded;

            if (!faceApiModelsLoaded) {
                console.warn('face-api.js models could not be loaded');
                return;
            }

            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

            intervalRef.current = setInterval(async () => {
                const video = videoRef.current;
                if (!video || video.readyState < 2) return;

                try {
                    const result = await faceapi
                        .detectSingleFace(video, options)
                        .withFaceExpressions();

                    if (result) {
                        const { expressions } = result;
                        setIsSmiling(expressions.happy > 0.5);
                    } else {
                        setIsSmiling(null);
                    }
                } catch (e) {
                    // Silently ignore transient detection errors
                }
            }, 500);
        })();

        return () => {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, videoRef]);

    return isSmiling;
}

function App() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState(0);
    const [sectionProgress, setSectionProgress] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [showMentions, setShowMentions] = useState(false);

    // Isolation: auto-driven by scroll progress in section 1
    const [isIsolationActive, setIsIsolationActive] = useState(false);

    // Density: how many blobs (1-5), driven by scroll in section 4
    // Couche 1 = drone (always on), couches 2-5 = strings, bass, drums, keyboard
    const densityBlobCount = activeSection === 4
        ? Math.min(Math.floor(sectionProgress * 5) + 1, 5)
        : 1;

    // Webcam state for Neuro-Adaptative section (section 3)
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const isSmiling = useFaceDetection(isCameraActive, videoRef);

    const lenisRef = useRef(null);
    const fadeTrack = useAudioStore((state) => state.fadeTrack);

    const NON_DRONE_TRACKS = [
        'strings',
        'bass',
        'drums',
        'keyboard',
        'crowd',
        'jungle',
        'pulsatingWave',
        'focusCognitif',
        'happy',
        'sad',
    ];

    // Hard-reset all non-drone tracks on every section change
    const prevSectionRef = useRef(activeSection);
    useEffect(() => {
        if (prevSectionRef.current !== activeSection) {
            NON_DRONE_TRACKS.forEach(t => fadeTrack(t, 0, 300));
            prevSectionRef.current = activeSection;
        }
    }, [activeSection, fadeTrack, NON_DRONE_TRACKS]);

    // Continuous scroll-driven audio
    useScrollAudio(activeSection, sectionProgress, fadeTrack, isIsolationActive);

    // Auto-toggle isolation at 50% progress in section 1
    useEffect(() => {
        if (activeSection === 1) {
            if (sectionProgress >= 0.4 && !isIsolationActive) {
                setIsIsolationActive(true);
                fadeTrack('crowd', 0.05, 800);
            } else if (sectionProgress < 0.4 && isIsolationActive) {
                setIsIsolationActive(false);
                fadeTrack('crowd', 0.6, 400);
            }
        }
    }, [activeSection, sectionProgress, isIsolationActive, fadeTrack]);

    // Neuro-Adaptative: react to smile detection
    useEffect(() => {
        if (activeSection !== 3 || !isCameraActive) return;

        if (isSmiling === true) {
            fadeTrack('happy', 0.5, 600);
            fadeTrack('sad', 0, 600);
        } else if (isSmiling === false) {
            fadeTrack('happy', 0, 600);
            fadeTrack('sad', 0.5, 600);
        } else {
            // No face detected
            fadeTrack('happy', 0, 400);
            fadeTrack('sad', 0, 400);
        }
    }, [isSmiling, isCameraActive, activeSection, fadeTrack]);

    // Camera activation handler
    const handleCameraToggle = useCallback(async () => {
        if (isCameraActive) {
            // Stop camera
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setIsCameraActive(false);
            fadeTrack('happy', 0, 400);
            fadeTrack('sad', 0, 400);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setIsCameraActive(true);
            } catch (err) {
                console.warn('Camera access denied:', err);
            }
        }
    }, [isCameraActive, fadeTrack]);

    // Cleanup camera on unmount or section change
    useEffect(() => {
        if (activeSection !== 3 && isCameraActive) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setIsCameraActive(false);
            fadeTrack('happy', 0, 300);
            fadeTrack('sad', 0, 300);
        }
    }, [activeSection, isCameraActive, fadeTrack]);

    // Initial setup for Lenis
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
        });

        lenisRef.current = lenis;

        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        lenis.on('scroll', (e) => {
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const progress = maxScroll > 0 ? e.animatedScroll / maxScroll : 0;
            setScrollProgress(progress);
        });

        lenis.stop();

        return () => {
            lenis.destroy();
            gsap.ticker.remove((time) => lenis.raf(time * 1000));
        };
    }, []);

    // ScrollTrigger setup after start
    useEffect(() => {
        if (!hasStarted || !lenisRef.current) return;

        lenisRef.current.start();

        const sections = gsap.utils.toArray('.pin-section');

        sections.forEach((section, i) => {
            const scrollLength = i === 4 ? window.innerHeight * 3.5 : window.innerHeight * 1.5;
            ScrollTrigger.create({
                trigger: section,
                start: 'top top',
                end: `+=${scrollLength}`,
                pin: true,
                pinSpacing: true,
                onUpdate: (self) => {
                    setActiveSection(i);
                    setSectionProgress(self.progress);
                },
                onEnter: () => {
                    setActiveSection(i);
                    // Section 1 (Isolation): start crowd
                    if (i === 1) fadeTrack('crowd', 0.6, 500);
                    // Section 2 (Scénographie): start jungle
                    if (i === 2) fadeTrack('jungle', 0.6, 500);
                    // Section 3 (Neuro): all non-drone tracks are reset just before via onLeave
                    // Section 4 (Density): stems will be handled by useScrollAudio
                },
                onLeave: () => {
                    // When leaving any section forward, fade all non-drone tracks to zero
                    NON_DRONE_TRACKS.forEach(t => fadeTrack(t, 0, 500));
                    if (i === 1) {
                        setIsIsolationActive(false);
                    }
                },
                onLeaveBack: () => {
                    // When scrolling back above any section, also fade all non-drone tracks to zero
                    NON_DRONE_TRACKS.forEach(t => fadeTrack(t, 0, 500));
                    if (i === 1) {
                        setIsIsolationActive(false);
                    }
                }
            });
        });

        ScrollTrigger.refresh();

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, [hasStarted, fadeTrack]);

    const startAllTracks = useAudioStore((state) => state.startAllTracks);
    const toggleMute = useAudioStore((state) => state.toggleMute);
    const isMuted = useAudioStore((state) => state.isMuted);

    const handleStartExperience = useCallback(() => {
        startAllTracks();
        setHasStarted(true);
    }, [startAllTracks]);

    return (
        <div className="bg-tenbin-black min-h-screen text-tenbin-offwhite font-sans selection:bg-white/20">
            {/* Hidden video element for webcam */}
            <video ref={videoRef} className="hidden" playsInline muted />

            {/* 3D Background */}
            <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
                <Scene
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    densityBlobCount={densityBlobCount}
                    isIsolationActive={isIsolationActive}
                />
            </div>

            {/* Header */}
            <header className="fixed top-8 right-8 md:top-10 md:right-[8vw] z-50 pointer-events-auto mix-blend-difference">
                <svg 
                    width="110" 
                    height="24" 
                    viewBox="0 0 1096 237" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                >
                    <rect x="153.016" width="236.924" height="69.1027" rx="34.5513" transform="rotate(90 153.016 0)" fill="currentColor"/>
                    <rect x="67.8672" width="236.924" height="67.8687" rx="33.9344" transform="rotate(90 67.8672 0)" fill="currentColor"/>
                    <path d="M174.331 139.318C164.015 127.334 164.015 109.59 174.331 97.6058L248.761 11.1464C268.063 -11.2755 304.799 2.39677 304.799 32.0025V204.921C304.799 234.527 268.063 248.199 248.761 225.777L174.331 139.318Z" fill="currentColor"/>
                    <path d="M577.641 36.7897V54.4629H596.596H615.551V36.7897V19.1165H596.596H577.641V36.7897Z" fill="currentColor"/>
                    <path d="M631.977 116.949V214.783H650.932H669.887V192.313L670.014 169.969L679.112 160.122L688.337 150.402L702.869 179.689C710.957 195.848 717.907 210.365 718.413 211.88C719.297 214.783 719.676 214.783 740.78 214.783C752.532 214.783 762.136 214.531 762.136 214.152C762.136 213.773 751.9 193.575 739.264 169.212C726.627 144.974 716.644 124.397 717.023 123.514C717.402 122.756 728.017 110.637 740.78 96.7514L763.905 71.5039L741.917 71.1252C729.786 70.999 719.171 71.1252 718.413 71.3777C717.655 71.6302 706.534 84.0014 693.771 98.6449L670.519 125.407L670.14 72.2613L669.887 19.1155H650.932H631.977V116.949Z" fill="currentColor"/>
                    <path d="M772.242 36.7897V54.4629H791.198H810.153V36.7897V19.1165H791.198H772.242V36.7897Z" fill="currentColor"/>
                    <path d="M400.719 118.212V214.783H420.938H441.157V181.457V148.256L451.266 138.536C456.826 133.234 461.881 128.942 462.387 128.942C463.019 128.942 476.287 148.256 491.831 171.863L520.137 214.783H544.526C557.795 214.783 568.789 214.531 568.789 214.152C568.789 213.773 551.35 187.39 529.994 155.452L491.199 97.2563L528.983 59.5114L566.894 21.6402H540.862H514.703L478.309 60.395L441.789 99.0236L441.409 60.395L441.157 21.6402H420.938H400.719V118.212Z" fill="currentColor"/>
                    <path d="M894.823 68.4742C884.461 70.2415 875.615 75.1648 868.412 82.9915L862.094 89.9346L861.715 80.7192L861.335 71.5039L843.391 71.1252L825.32 70.7465V142.828V214.783H844.276H863.231V170.221C863.231 120.863 863.863 116.318 870.939 108.239C876.373 101.927 883.703 99.5286 895.329 100.16C906.323 100.665 910.493 102.937 914.41 110.764C916.811 115.434 916.938 118.59 917.317 165.172L917.696 214.783H936.651H955.48V161.385C955.48 101.801 955.101 98.2662 947.266 86.3999C939.684 74.9123 927.553 68.7267 910.872 67.7168C905.817 67.4643 898.614 67.7168 894.823 68.4742Z" fill="currentColor"/>
                    <path d="M1018.92 68.3476C990.104 72.3872 975.066 86.1471 972.286 110.89L971.528 117.58H989.22H1006.91L1008.3 112.657C1011.71 101.548 1018.41 97.3822 1033.2 97.3822C1048.74 97.3822 1056.57 102.305 1056.57 111.899C1056.57 122.377 1052.03 124.649 1022.83 129.573C995.033 134.117 985.302 137.904 976.962 147.498C969.506 155.956 967.484 162.016 967.484 176.912C967.484 188.904 967.863 190.798 971.023 197.362C975.193 205.946 981.259 211.248 990.863 215.035C996.802 217.434 1000.34 217.812 1014.24 217.812C1032.56 217.812 1039.39 216.045 1051.52 207.84C1058.09 203.421 1059.1 203.421 1059.1 207.966C1059.1 214.657 1059.35 214.783 1078.18 214.783H1095.75V163.909C1095.75 123.513 1095.37 111.521 1093.85 105.209C1089.3 85.8946 1078.94 75.2907 1059.86 70.3674C1050.51 67.9689 1029.28 66.8328 1018.92 68.3476ZM1056.57 166.686C1054.05 176.659 1045.33 185.874 1035.22 189.283C1030.04 191.176 1017.53 191.303 1013.1 189.535C1007.8 187.516 1004.51 181.077 1005.14 174.008C1006.15 162.268 1012.85 157.597 1036.1 152.422C1043.81 150.654 1051.77 148.382 1053.79 147.372L1057.21 145.605L1057.59 153.305C1057.84 157.597 1057.33 163.657 1056.57 166.686Z" fill="currentColor"/>
                    <path d="M577.641 142.828V214.783H596.596H615.551V142.828V70.8727H596.596H577.641V142.828Z" fill="currentColor"/>
                    <path d="M772.242 142.828V214.783H791.198H810.153V142.828V70.8727H791.198H772.242V142.828Z" fill="currentColor"/>
                </svg>
            </header>

            {/* Mute toggle */}
            {hasStarted && (
                <button
                    onClick={toggleMute}
                    className={`fixed bottom-8 right-8 md:bottom-10 md:right-[8vw] z-50 pointer-events-auto transition-all duration-500 ${isMuted ? 'text-tenbin-gray opacity-50' : 'text-white opacity-80 hover:opacity-100'}`}
                    aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                </button>
            )}

            {/* Scroll encouragement - double chevron */}
            {hasStarted && activeSection < sectionsData.length - 1 && (
                <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-0">
                        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="text-tenbin-gray animate-chevron-top">
                            <path d="M2 2L10 10L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="text-tenbin-gray animate-chevron-bottom -mt-1">
                            <path d="M2 2L10 10L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            )}

            {/* Sections */}
            <main className="relative z-10 w-full flex flex-col items-start px-8 md:px-[8vw]">
                {sectionsData.map((section, index) => (
                    <section key={section.id} className="pin-section min-h-screen w-full flex flex-col justify-center pointer-events-none relative py-32">
                        <div className="max-w-2xl w-full pointer-events-auto filter drop-shadow-2xl z-10">
                            {/* Intro section */}
                            {section.isIntro ? (
                                <div className="flex flex-col items-start">
                                    <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em] text-tenbin-gray mb-6">
                                        Rendre le son vivant.
                                    </p>
                                    <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8 leading-tight">
                                        {section.title}
                                    </h2>
                                    {!hasStarted ? (
                                        <button
                                            onClick={handleStartExperience}
                                            className="px-8 py-4 border border-white bg-transparent text-white hover:bg-white hover:text-black transition-all duration-500 font-sans text-xs uppercase tracking-widest rounded-full cursor-pointer mb-8"
                                        >
                                            Lancer l'expérience sonore
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 text-tenbin-gray text-sm animate-pulse mb-8">
                                            <span>↓</span>
                                            <span className="uppercase tracking-widest">Scrollez pour explorer</span>
                                        </div>
                                    )}
                                    <p className="text-base md:text-lg font-sans text-tenbin-gray tracking-wide leading-relaxed font-light">
                                        {section.paragrapheParts.map((part, pi) => {
                                            const partThreshold = pi * 0.33;
                                            const partProgress = activeSection === index
                                                ? Math.min(1, Math.max(0, (sectionProgress - partThreshold) / 0.15))
                                                : 0;
                                            return (
                                                <span
                                                    key={pi}
                                                    className="transition-opacity duration-500"
                                                    style={{ opacity: partProgress }}
                                                >
                                                    {pi > 0 ? ' ' : ''}{part}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8">
                                        {section.title}
                                    </h2>
                                    <p className="text-base md:text-lg font-sans text-tenbin-gray tracking-wide leading-relaxed font-light mb-12">
                                        {section.paragrapheParts.map((part, pi) => {
                                            const partThreshold = pi * 0.33;
                                            const partProgress = activeSection === index
                                                ? Math.min(1, Math.max(0, (sectionProgress - partThreshold) / 0.15))
                                                : 0;
                                            return (
                                                <span
                                                    key={pi}
                                                    className="transition-opacity duration-500"
                                                    style={{ opacity: partProgress }}
                                                >
                                                    {pi > 0 ? ' ' : ''}{part}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </>
                            )}

                            {/* Section 1: Isolation Toggle (auto-driven by scroll progress) */}
                            {section.hasIsolationToggle && (
                                <div className="flex items-center gap-6 mt-8">
                                    <div
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-700 ${isIsolationActive ? 'bg-white' : 'bg-tenbin-gray/40'}`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-tenbin-black transition-transform duration-700 ${isIsolationActive ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </div>
                                    <span className={`text-sm font-medium uppercase tracking-widest transition-all duration-700 ${isIsolationActive ? 'text-white' : 'text-tenbin-gray'}`}>
                                        {isIsolationActive ? 'Isolation activée' : 'Bruit ambiant'}
                                    </span>
                                </div>
                            )}

                            {/* Section 4: Density - musical layers counter */}
                            {section.hasDensityLabels && activeSection === index && (
                                <div className="mt-8 border-t border-tenbin-gray/20 pt-8 flex flex-col items-start gap-1">
                                    <span className="text-3xl md:text-4xl font-heading font-medium text-white transition-all duration-500">
                                        {densityBlobCount}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-white transition-all duration-500">
                                        couches sonores
                                    </span>
                                </div>
                            )}

                            {/* Section 2: Neuro-sonore Icons */}
                            {section.hasEnvironmentLabels && activeSection === index && (
                                <div className="flex gap-10 mt-8 border-t border-tenbin-gray/20 pt-8">
                                    {[
                                        { key: 'relaxation', label: 'Relaxation', icon: (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2.1 7.7A7 7 0 0 1 11 20z"/>
                                                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 12 13"/>
                                            </svg>
                                        )},
                                        { key: 'regulation', label: 'Régulation émotionnelle', icon: (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/>
                                                <path d="M12 6v15"/>
                                            </svg>
                                        )},
                                        { key: 'focus', label: 'Focus cognitif', icon: (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"/>
                                                <circle cx="12" cy="12" r="6"/>
                                                <circle cx="12" cy="12" r="2"/>
                                            </svg>
                                        )},
                                    ].map((env, i) => {
                                        const isActive = (i === 0 && sectionProgress < 0.33) ||
                                            (i === 1 && sectionProgress >= 0.33 && sectionProgress < 0.66) ||
                                            (i === 2 && sectionProgress >= 0.66);
                                        return (
                                            <div key={env.key} className={`flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-white opacity-100 scale-110' : 'text-tenbin-gray opacity-30 scale-100'}`}>
                                                {env.icon}
                                                <span className="text-[10px] uppercase tracking-widest">{env.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Section 3: Webcam Button + Status */}
                            {section.hasWebcamButton && (
                                <div className="mt-8 flex flex-col gap-4">
                                    <button
                                        onClick={handleCameraToggle}
                                        className={`px-8 py-4 border transition-all duration-500 font-sans text-xs uppercase tracking-widest rounded-full cursor-pointer ${isCameraActive
                                                ? 'bg-white text-black border-white'
                                                : 'bg-transparent border-white hover:bg-white hover:text-black text-white'
                                            }`}
                                    >
                                        {isCameraActive ? 'Caméra active' : 'Autoriser la caméra'}
                                    </button>

                                    {/* Emotion indicator */}
                                    {isCameraActive && (
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`w-3 h-3 rounded-full transition-all duration-500 ${isSmiling === true ? 'bg-green-400 animate-pulse' :
                                                    isSmiling === false ? 'bg-blue-400 animate-pulse' :
                                                        'bg-tenbin-gray/50'
                                                }`} />
                                            <span className="text-sm uppercase tracking-widest text-tenbin-gray">
                                                {isSmiling === true ? 'Détecté : Joyeux → Piste HAPPY' :
                                                    isSmiling === false ? 'Détecté : Neutre → Piste SAD' :
                                                        'Analyse en cours...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                ))}
            </main>

            {/* Dawn transition + Footer */}
            <div className="relative z-20">
                {/* Evanescent black-to-white transition */}
                <div className="h-[60vh] relative" style={{
                    background: 'linear-gradient(to bottom, #000000 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.3) 50%, rgba(245,243,240,0.6) 75%, #f5f3f0 100%)',
                }}>
                    <div className="absolute inset-0 animate-aurora opacity-30" style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(200,180,160,0.4) 0%, transparent 70%)',
                    }} />
                </div>

                {/* Footer content */}
                <footer className="bg-[#f5f3f0] text-[#1a1a1a] px-8 md:px-[8vw] pt-16 pb-12">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
                        <div className="flex-shrink-0">
                            <img src="logo-kikina.png" alt="Kikina Lab" className="h-6 md:h-8 w-auto invert" />
                        </div>
                        <div className="flex flex-col md:flex-row gap-8 md:gap-12 text-sm flex-1">
                            <div className="flex flex-col gap-3 flex-shrink-0 md:w-36">
                                <a href="https://kikinalab.com" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#1a1a1a] transition-colors">Qui sommes-nous</a>
                                <button 
                                    onClick={() => setShowMentions(!showMentions)} 
                                    className="text-left text-[#555] hover:text-[#1a1a1a] transition-colors focus:outline-none"
                                >
                                    Mentions légales
                                </button>
                                <a href="https://www.linkedin.com/company/kikinastudio/" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#1a1a1a] transition-colors">LinkedIn</a>
                            </div>
                            <div className="flex flex-col gap-3 flex-1 max-w-lg">
                                <span className="font-semibold uppercase tracking-widest text-xs mb-1">Nous contacter</span>
                                <form className="flex flex-col gap-3" onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target;
                                    const email = form.email.value;
                                    const message = form.message.value;
                                    window.location.href = `mailto:bianca@kikinastudio.com?subject=Contact depuis Kikiscroll&body=${encodeURIComponent(message + '\n\nDe : ' + email)}`;
                                }}>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="Votre email"
                                        className="bg-transparent border-b border-[#ccc] focus:border-[#1a1a1a] outline-none py-2 text-sm text-[#1a1a1a] placeholder-[#999] transition-colors"
                                    />
                                    <textarea
                                        name="message"
                                        required
                                        placeholder="Votre message"
                                        rows={3}
                                        className="bg-transparent border-b border-[#ccc] focus:border-[#1a1a1a] outline-none py-2 text-sm text-[#1a1a1a] placeholder-[#999] transition-colors resize-none"
                                    />
                                    <button
                                        type="submit"
                                        className="self-start mt-2 px-6 py-2 text-xs uppercase tracking-widest font-semibold border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f3f0] transition-colors rounded-full"
                                    >
                                        Envoyer
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-[#d0d0d0] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <span className="text-xs text-[#999]">© 2026 Kikina Lab. Tous droits réservés.</span>
                    </div>

                    {/* Large brand name */}
                    <div className="mt-8 overflow-hidden">
                        <p className="text-[15vw] md:text-[12vw] font-heading font-medium leading-none tracking-tighter text-[#1a1a1a] select-none">
                            Kikina
                        </p>
                    </div>
                </footer>

                {/* Quick Mentions Légales section */}
                {showMentions && (
                    <div className="bg-[#f5f3f0] text-[#1a1a1a] px-8 md:px-[8vw] py-16 text-[10px] leading-relaxed border-t border-[#d0d0d0]">
                        <div className="max-w-2xl">
                            <h3 className="font-bold uppercase mb-4 text-xs">Mentions Légales</h3>
                            <p className="mb-2"><strong>Éditeur du site :</strong> Kikina Lab / Kikina Studio</p>
                            <p className="mb-2"><strong>Siège social :</strong> Paris, France</p>
                            <p className="mb-2"><strong>Contact :</strong> bianca@kikinastudio.com</p>
                            <p className="mb-2"><strong>Hébergement :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723</p>
                            <p className="mt-6 italic opacity-60">
                                Ce site utilise des technologies de détection d'expressions faciales (face-api.js). 
                                Aucune donnée d'image n'est enregistrée ou transmise à des serveurs tiers ; 
                                l'Analyse est effectuée localement dans votre navigateur en temps réel.
                            </p>
                            <button 
                                onClick={() => setShowMentions(false)}
                                className="mt-8 text-[#555] hover:text-[#1a1a1a] underline uppercase tracking-widest font-bold"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
