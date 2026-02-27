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
// 4 = Densité Interactive (1→4 blobs + stems accumulate, quasi-spherical)

const sectionsData = [
    {
        id: 0,
        title: "Le son change tout",
        paragraphe:
            "Fermez les yeux une seconde. Ce que vous entendez autour de vous façonne votre humeur, votre concentration, votre envie de rester. Pourtant, le son reste le grand oublié du design d'expérience. Scrollez pour comprendre pourquoi.",
        isIntro: true,
    },
    {
        id: 1,
        title: "Dans la foule, le silence peut exister",
        paragraphe:
            "Un salon professionnel, c'est 80 décibels en continu. Des conversations qui se noient, des visiteurs qui repartent fatigués, un message de marque qui ne passe jamais vraiment. Et si on pouvait créer, au milieu du chaos, une bulle sonore où tout devient clair ? Pas en isolant la pièce. Juste en dirigeant le son.",
        hasIsolationToggle: true,
    },
    {
        id: 2,
        title: "Un espace peut changer d'âme en quelques secondes",
        paragraphe:
            "Pour la première fois, la composition agit directement sur le cerveau sans sacrifier la qualité musicale. Le son module l'amygdale, régule le système autonome et oriente l'attention. L'utilisateur expérimente relaxation, régulation autonome et focus cognitif, activés par l'architecture même du son.",
        hasEnvironmentLabels: true,
    },
    {
        id: 3,
        title: "Et si la musique vous écoutait, vous ?",
        paragraphe:
            "On a toujours pensé la musique comme quelque chose qu'on reçoit. Et si elle pouvait percevoir ce que vous vivez et s'y adapter en temps réel ? Pas de façon approximative, mais de façon mesurable et neuroscientifique. Une musique qui change parce que vous changez. Une expérience qui ne ressemble à aucune autre, parce qu'elle est la vôtre.",
        hasWebcamButton: true,
    },
    {
        id: 4,
        title: "Plus vous êtes nombreux, plus la musique vit",
        paragraphe:
            "Une personne entre dans l'espace. Une mélodie s'éveille. Deux, trois, quatre, chaque présence ajoute une couche, un rythme, une épaisseur. L'œuvre se compose en direct, nourrie par ceux qui la vivent. Ce n'est plus de la diffusion sonore. C'est une partition collective, écrite par le public, pour le public. C'est ça, le son vivant.",
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
            // Density: progressive stem accumulation (1→4 layers)
            prevPalierRef.current = -1;
            const stems = ['strings', 'bass', 'drums', 'keyboard'];
            const blobCount = Math.min(Math.floor(sectionProgress * 4) + 1, 4);
            for (let s = 0; s < blobCount; s++) {
                fadeTrack(stems[s], 0.4, 300);
            }
            for (let s = blobCount; s < stems.length; s++) {
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

    // Isolation: auto-driven by scroll progress in section 1
    const [isIsolationActive, setIsIsolationActive] = useState(false);

    // Density: how many blobs (1-4), driven by scroll in section 4
    const densityBlobCount = activeSection === 4
        ? Math.min(Math.floor(sectionProgress * 4) + 1, 4)
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
            ScrollTrigger.create({
                trigger: section,
                start: 'top top',
                end: `+=${window.innerHeight * 1.5}`,
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
            <header className="fixed top-8 left-8 md:top-10 md:left-[8vw] z-50 pointer-events-auto">
                <img src="logo-kikina.png" alt="Kikina Lab" className="h-6 md:h-8 w-auto" />
            </header>

            {/* Scroll encouragement - fixed bottom center */}
            {hasStarted && activeSection < sectionsData.length - 1 && (
                <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-3 text-tenbin-gray text-xs animate-pulse">
                        <span>↓</span>
                        <span className="uppercase tracking-widest">Continuez de scroller pour vivre l'expérience</span>
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
                                        AI · Neuroscience · Storytelling
                                    </p>
                                    <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8 leading-tight">
                                        {section.title}
                                    </h2>
                                    <p className="text-lg md:text-xl font-sans text-tenbin-gray tracking-wide leading-relaxed font-light mb-8">
                                        {section.paragraphe}
                                    </p>
                                    {!hasStarted ? (
                                        <button
                                            onClick={handleStartExperience}
                                            className="group relative px-10 py-5 overflow-hidden rounded-full bg-tenbin-dark border border-tenbin-gray/30 hover:border-white/60 transition-all duration-500 cursor-pointer"
                                        >
                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <span className="relative z-10 font-sans text-sm md:text-base font-semibold tracking-widest text-tenbin-offwhite group-hover:text-white transition-colors uppercase">
                                                Lancer l'expérience sonore
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 text-tenbin-gray text-sm animate-pulse">
                                            <span>↓</span>
                                            <span className="uppercase tracking-widest">Scrollez pour explorer</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8">
                                        {section.title}
                                    </h2>
                                    <p className="text-lg md:text-xl font-sans text-tenbin-gray tracking-wide leading-relaxed font-light mb-12">
                                        {section.paragraphe}
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
                                <div className="mt-8 border-t border-tenbin-gray/20 pt-8">
                                    <p className="text-sm md:text-base font-semibold uppercase tracking-widest text-white transition-all duration-500">
                                        Couches : {densityBlobCount}
                                    </p>
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
        </div>
    );
}

export default App;
