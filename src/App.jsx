import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Lenis from '@studio-freight/lenis';
import Scene from './components/Scene';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAudioStore } from './store/useAudioStore';
import { useTranslation } from './LanguageContext';

gsap.registerPlugin(ScrollTrigger);

// SECTION IDs (stable, identify the BEHAVIOR — not the position on screen):
//   0 = Intro (drone only, near-round blob)
//   1 = Isolation / Acoustic sculpting (crowd → toggle at ~40% progress)
//   2 = Zones panorama (entrance / rayon / cabine / + recuperation in wellness)
//   3 = Neuro-Sonore (jungle → pulsatingWave → focusCognitif)
//   4 = Webcam / Gesture-driven sound (motion detection drives strings + bass)
//   5 = Density / Score (1→5 blobs + stems accumulate)
//
// Retail keeps the original 0→5 narrative order. Wellness reorders to
// intro → zones → neuro → sculpting → webcam → score so the story reads
// "what we compose" → "for which spaces" → "for which states" → "how it
// stitches together" → "and how it listens in real time" → "score for the
// treatment". The behavior is bound to `id`, never to the array position.

function getSectionsData(t, mode) {
    const intro = {
        id: 0,
        title: t.s0_title,
        paragrapheParts: [t.s0_p1, t.s0_p2, t.s0_p3],
        isIntro: true,
        withLineBreaks: true, // 3 parts → 2 visible line breaks (matches the closing sections)
    };
    const sculpting = {
        id: 1,
        title: t.s1_title,
        paragrapheParts: [t.s1_p1, t.s1_p2, t.s1_p3],
        hasIsolationToggle: true,
        withLineBreaks: true,
    };
    const zones = {
        id: 2,
        title: t.s2_title,
        paragrapheParts: [t.s2_p1, t.s2_p2, t.s2_p3],
        hasZonesPanorama: true,
        withLineBreaks: true,
    };
    const neuro = {
        id: 3,
        title: t.s3_title,
        paragrapheParts: [t.s3_p1, t.s3_p2, t.s3_p3],
        hasEnvironmentLabels: true,
        withLineBreaks: true,
    };
    const webcam = {
        id: 4,
        title: t.s4_title,
        paragrapheParts: [t.s4_p1, t.s4_p2, t.s4_p3],
        hasWebcamButton: true,
        withLineBreaks: true, // 3 parts → 2 visible line breaks
    };
    const score = {
        id: 5,
        title: t.s5_title,
        paragrapheParts: [t.s5_p1, t.s5_p2, t.s5_p3],
        hasDensityLabels: true,
        withLineBreaks: true, // 3 parts → 2 visible line breaks
    };

    if (mode === 'wellness') {
        return [intro, zones, neuro, sculpting, webcam, score];
    }
    return [intro, sculpting, zones, neuro, webcam, score];
}

// --- Continuous audio logic driven by sectionProgress ---
// activeSection is the DOM order index of the current pinned section. activeSectionId is the
// stable behavior id (0=intro, 1=isolation/sculpting, 2=zones, 3=neuro, 4=webcam, 5=density)
// — they are equal in retail, but the wellness sectionsData is reordered, so always switch on
// the id, never on the position.
function useScrollAudio(activeSectionId, sectionProgress, fadeTrack, isIsolationActive, isWellness) {
    const prevPalierRef = useRef(-1);
    // Wellness drives the 5 phases of an example soin and needs them spread across
    // most of the section so each phase has time to land (text + blob + stem).
    // Retail keeps the historical 0.82 cutoff so the "intro then quick reveal"
    // pacing stays intact.
    const densityIntroCutoff = isWellness ? 0.20 : 0.82;

    useEffect(() => {
        if (activeSectionId === 0) {
            // Intro: only drone plays (already at 0.5 from init)
            prevPalierRef.current = -1;
        } else if (activeSectionId === 1) {
            // Isolation / acoustic sculpting: crowd controlled by auto-toggle logic based on progress
            prevPalierRef.current = -1;
        } else if (activeSectionId === 2) {
            // Zones audio. Retail = 3 zones crossfaded (thirds).
            // Wellness = 4 distinct zone tracks. Each track has a clear "solo" window
            // matched to its slide being centered, with tight (~10% of movingProgress wide)
            // crossfades around the slide midpoints. Volumes always sum to 0.6.
            prevPalierRef.current = -1;
            let entranceVol = 0, rayonVol = 0, cabineVol = 0, recuperationVol = 0;
            if (isWellness) {
                const PARK_START = 0.28;
                const PARK_END = 0.86;
                const mp = sectionProgress <= PARK_START
                    ? 0
                    : sectionProgress >= PARK_END
                        ? 1
                        : (sectionProgress - PARK_START) / (PARK_END - PARK_START);
                // Crossfade midpoints are anchored to the visual activeIndex flips
                // (mp = 1/6, 3/6, 5/6). Half-width 0.05 keeps each fade tight enough
                // that the "current" slide always has its track at full volume — that
                // matters most for slide 4 (recuperation), which used to take until
                // mp = 0.90 to reach full while it was already visually centered at
                // mp = 0.833. Peak volume bumped from 0.6 → 0.7 so each zone is
                // clearly present over the drone.
                const X1 = 1 / 6;
                const X2 = 3 / 6;
                const X3 = 5 / 6;
                const HW = 0.05;
                const PEAK = 0.7;
                if (mp < X1 - HW) {
                    entranceVol = PEAK;
                } else if (mp < X1 + HW) {
                    const t = (mp - (X1 - HW)) / (2 * HW);
                    entranceVol = PEAK * (1 - t);
                    rayonVol = PEAK * t;
                } else if (mp < X2 - HW) {
                    rayonVol = PEAK;
                } else if (mp < X2 + HW) {
                    const t = (mp - (X2 - HW)) / (2 * HW);
                    rayonVol = PEAK * (1 - t);
                    cabineVol = PEAK * t;
                } else if (mp < X3 - HW) {
                    cabineVol = PEAK;
                } else if (mp < X3 + HW) {
                    const t = (mp - (X3 - HW)) / (2 * HW);
                    cabineVol = PEAK * (1 - t);
                    recuperationVol = PEAK * t;
                } else {
                    recuperationVol = PEAK;
                }
                // The 4 zone tracks should NOT play during the section's intro text
                // phase — the user wants drone-only while they read the title and
                // paragraph. Once the rooms start to enter focus, we ramp the zone
                // audio in smoothly so the first track (keysy.mp3 on slide 0) doesn't
                // pop. Ramp window matches the panorama visual fade-in roughly.
                const ZONE_AUDIO_RAMP_START = 0.20;
                const ZONE_AUDIO_RAMP_END = 0.28;
                const zoneAudioRamp = Math.max(0, Math.min(1,
                    (sectionProgress - ZONE_AUDIO_RAMP_START) /
                    (ZONE_AUDIO_RAMP_END - ZONE_AUDIO_RAMP_START)
                ));
                // Longer fade duration (250ms) than the visual transitions feels smoother
                // and gives the crossfade math a wider window to settle into the constant
                // sum, avoiding micro-bumps under fast scroll.
                fadeTrack('entrance', entranceVol * zoneAudioRamp, 250);
                fadeTrack('rayon', rayonVol * zoneAudioRamp, 250);
                fadeTrack('cabine', cabineVol * zoneAudioRamp, 250);
                fadeTrack('recuperation', recuperationVol * zoneAudioRamp, 250);
            } else {
                if (sectionProgress < 0.33) {
                    entranceVol = 0.6;
                } else if (sectionProgress < 0.66) {
                    const t = (sectionProgress - 0.33) / 0.33;
                    entranceVol = 0.6 * (1 - t);
                    rayonVol = 0.6 * t;
                } else {
                    const t = (sectionProgress - 0.66) / 0.34;
                    rayonVol = 0.6 * (1 - t);
                    cabineVol = 0.6 * t;
                }
                fadeTrack('entrance', entranceVol, 150);
                fadeTrack('rayon', rayonVol, 150);
                fadeTrack('cabine', cabineVol, 150);
            }
        } else if (activeSectionId === 3) {
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
        } else if (activeSectionId === 4) {
            // Gesture-driven: strings + bass volumes are set per frame by the
            // motion detector in handleMotion. Nothing to do here.
            prevPalierRef.current = -1;
        } else if (activeSectionId === 5) {
            // Density: progressive stem accumulation (1→5 layers, couche 1 = drone already playing)
            prevPalierRef.current = -1;
            const densityProgress = Math.max(
                0,
                Math.min(1, (sectionProgress - densityIntroCutoff) / (1 - densityIntroCutoff))
            );
            const stems = ['strings', 'bass', 'drums', 'keyboard'];
            const blobCount = Math.min(Math.floor(densityProgress * 5) + 1, 5);
            // blobCount 1 = drone only, 2 = +strings, 3 = +bass, 4 = +drums, 5 = +keyboard
            const stemsActive = Math.max(0, blobCount - 1);
            // Shorter fade (150ms) in wellness so the stem entry tracks the
            // blob/text snap more tightly — the user perceives all 3 cues
            // as the same phase change rather than audio trailing visuals.
            const fadeDur = isWellness ? 150 : 300;
            for (let s = 0; s < stemsActive; s++) {
                fadeTrack(stems[s], 0.4, fadeDur);
            }
            for (let s = stemsActive; s < stems.length; s++) {
                fadeTrack(stems[s], 0, fadeDur);
            }
        } else {
            prevPalierRef.current = -1;
        }
    }, [activeSectionId, sectionProgress, fadeTrack, isIsolationActive]);
}

// --- Motion detection: pure JS frame-diff on a hidden 64x48 canvas ---
//
// The webcam frame is drawn to a tiny offscreen canvas (64x48 = 3072 pixels) every
// rAF tick. We compare luminance with the previous frame to estimate how much
// movement is happening (motionIntensity, 0..1) and *where* the movement is
// concentrated vertically (motionY, 0..1 from top to bottom of frame).
//
// Both values are smoothed by an exponential follow (0.08 / frame) so the audio
// decelerates with the gesture instead of cutting on stillness — that slowness is
// the whole point of mapping it to a masseur's hand.
//
// The hook calls onMotion(intensity, y) every frame; the caller decides what to
// do with those values (in our case: drive Howler track volumes). The webcam
// stream stays in the page; nothing leaves the browser.
function useMotionDetection(isActive, videoRef, onMotion) {
    const onMotionRef = useRef(onMotion);
    useEffect(() => { onMotionRef.current = onMotion; }, [onMotion]);

    useEffect(() => {
        if (!isActive || !videoRef.current) return;

        const W = 64;
        const H = 48;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        let prevData = null;
        let smoothedIntensity = 0;
        let smoothedY = 0.5;
        let rafId = 0;
        let cancelled = false;

        const tick = () => {
            if (cancelled) return;
            const video = videoRef.current;
            if (!video || video.readyState < 2) {
                rafId = requestAnimationFrame(tick);
                return;
            }
            ctx.drawImage(video, 0, 0, W, H);
            const { data } = ctx.getImageData(0, 0, W, H);

            if (prevData) {
                // Single pass: luminance diff, with anything above NOISE_FLOOR contributing
                // both to the global intensity and to the y-centroid (weighted by diff).
                const NOISE_FLOOR = 10; // 0..255, ignore sensor/compression noise
                let total = 0;
                let weightedY = 0;
                for (let y = 0; y < H; y++) {
                    const rowOffset = y * W * 4;
                    for (let x = 0; x < W; x++) {
                        const i = rowOffset + x * 4;
                        const lumNow = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const lumPrev = (prevData[i] + prevData[i + 1] + prevData[i + 2]) / 3;
                        const d = Math.abs(lumNow - lumPrev);
                        if (d > NOISE_FLOOR) {
                            total += d;
                            weightedY += y * d;
                        }
                    }
                }
                // Intensity is normalised so a vigorous in-frame gesture saturates at ~1.
                // Divisor tuned empirically: full-frame motion ~= W*H*60 of summed diff.
                const targetIntensity = Math.min(1, total / (W * H * 60));
                const targetY = total > 0 ? (weightedY / total) / (H - 1) : 0.5;

                // Faster follow than the 0.08 we started with so the music responds
                // to a gesture without lagging by ~half a second; still slow enough
                // that stillness lets both layers ease down smoothly instead of
                // cutting on the first quiet frame.
                smoothedIntensity += (targetIntensity - smoothedIntensity) * 0.14;
                smoothedY += (targetY - smoothedY) * 0.14;
                onMotionRef.current(smoothedIntensity, smoothedY, data);
            } else {
                // First valid frame — still expose it so the consumer can paint the ASCII view.
                onMotionRef.current(0, 0.5, data);
            }

            prevData = new Uint8ClampedArray(data);
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            prevData = null;
        };
    }, [isActive, videoRef]);
}

function App() {
    const { t, mode } = useTranslation();
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState(0);
    const [sectionProgress, setSectionProgress] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const sectionsData = useMemo(() => getSectionsData(t, mode), [t, mode]);

    // Map the currently-pinned section position (DOM order) to its stable behavior id.
    // In retail, position === id. In wellness, the array is reordered (zones first, then neuro,
    // then sculpting, then webcam, then score), so we must always go through sectionsData.
    const activeSectionId = sectionsData[activeSection]?.id ?? activeSection;

    // Isolation: auto-driven by scroll progress in the sculpting/isolation section (id 1)
    const [isIsolationActive, setIsIsolationActive] = useState(false);

    // Density: how many blobs (1-5), driven by scroll in the score section (id 5)
    // Couche 1 = drone (always on), couches 2-5 = strings, bass, drums, keyboard.
    // Wellness lowers the intro cutoff so the 5 phases span 80% of the section
    // (rather than the last 18%), giving each phase room to breathe visually.
    // MUST match the same constant in useScrollAudio so visual blobs, phase text,
    // and audio stems all change at the same sectionProgress thresholds.
    const densityIntroCutoff = mode === 'wellness' ? 0.20 : 0.82;
    const densityExperienceProgress = activeSectionId === 5
        ? Math.max(0, Math.min(1, (sectionProgress - densityIntroCutoff) / (1 - densityIntroCutoff)))
        : 0;
    const densityBlobCount = activeSectionId === 5
        ? Math.min(Math.floor(densityExperienceProgress * 5) + 1, 5)
        : 1;

    // Webcam state for the gesture-driven sound section (id 4)
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Shared motion state — the motion-detection callback writes here every frame
    // and the 3D scene reads it inside its useFrame to pulse the webcam-mirror blob
    // in sync with the music. A ref (not state) so it doesn't churn React.
    const motionRef = useRef({ intensity: 0, y: 0.5 });

    const lenisRef = useRef(null);
    const fadeTrack = useAudioStore((state) => state.fadeTrack);
    const setVolume = useAudioStore((state) => state.setVolume);

    const NON_DRONE_TRACKS = [
        'strings',
        'bass',
        'drums',
        'keyboard',
        'crowd',
        'jungle',
        'pulsatingWave',
        'focusCognitif',
        'entrance',
        'rayon',
        'cabine',
        'recuperation',
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
    useScrollAudio(activeSectionId, sectionProgress, fadeTrack, isIsolationActive, mode === 'wellness');

    // Auto-toggle isolation at 40% progress in the sculpting/isolation section (id 1)
    useEffect(() => {
        if (activeSectionId === 1) {
            if (sectionProgress >= 0.4 && !isIsolationActive) {
                setIsIsolationActive(true);
                fadeTrack('crowd', 0.05, 800);
            } else if (sectionProgress < 0.4 && isIsolationActive) {
                setIsIsolationActive(false);
                fadeTrack('crowd', 0.6, 400);
            }
        }
    }, [activeSectionId, sectionProgress, isIsolationActive, fadeTrack]);

    // Motion → audio (gesture-driven sound, webcam section, id 4).
    // ONE parameter only: motionIntensity lifts a single layer (strings). The
    // drone keeps playing underneath; bass stays silent. The user moves more,
    // the music swells; they stop, it eases back down. That 1:1 relationship
    // was the missing piece — the previous Y-driven bass made the mapping feel
    // unpredictable because moving the *same* amount got a different result
    // depending on hand height.
    const handleMotion = useCallback((intensity /* , y */) => {
        if (activeSectionId !== 4 || !isCameraActive) return;
        setVolume('strings', Math.min(1, intensity * 2.5));
        motionRef.current.intensity = intensity;
    }, [activeSectionId, isCameraActive, setVolume]);

    useMotionDetection(isCameraActive && activeSectionId === 4, videoRef, handleMotion);

    // Camera activation handler. We fade the motion-driven layers to silence on
    // disable so the strings/bass don't linger on whatever the last frame held.
    const handleCameraToggle = useCallback(async () => {
        if (isCameraActive) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setIsCameraActive(false);
            fadeTrack('strings', 0, 400);
            fadeTrack('bass', 0, 400);
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

    // Cleanup camera on unmount or section change (away from webcam section, id 4)
    useEffect(() => {
        if (activeSectionId !== 4 && isCameraActive) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setIsCameraActive(false);
            fadeTrack('strings', 0, 300);
            fadeTrack('bass', 0, 300);
        }
    }, [activeSectionId, isCameraActive, fadeTrack]);

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

        const isWellness = mode === 'wellness';
        sections.forEach((section, i) => {
            // Resolve this DOM-position to its stable behavior id so the trigger config
            // doesn't break when wellness reorders the sections array.
            const sd = sectionsData[i];
            const sectionLength2 = isWellness ? window.innerHeight * 5.5 : window.innerHeight * 3;
            // Density (id 5) needs more time in wellness because the 5 phases now span
            // 80% of the section (cutoff = 0.20) instead of 18% — without extending the
            // scroll length each phase would feel rushed and out of sync with the audio.
            const sectionLength5 = isWellness ? window.innerHeight * 5 : window.innerHeight * 3.5;
            const scrollLength = sd?.hasZonesPanorama
                ? sectionLength2
                : sd?.hasDensityLabels
                    ? sectionLength5
                    : window.innerHeight * 1.5;
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
                    // Sculpting/Isolation section: start crowd
                    if (sd?.hasIsolationToggle) fadeTrack('crowd', 0.6, 500);
                    // Neuro section: start jungle
                    if (sd?.hasEnvironmentLabels) fadeTrack('jungle', 0.6, 500);
                    // Zones section: tracks faded in by useScrollAudio
                    // Webcam section: non-drone tracks reset just before via onLeave
                    // Score section: stems handled by useScrollAudio
                },
                onLeave: () => {
                    NON_DRONE_TRACKS.forEach(t => fadeTrack(t, 0, 500));
                    if (sd?.hasIsolationToggle) {
                        setIsIsolationActive(false);
                    }
                },
                onLeaveBack: () => {
                    NON_DRONE_TRACKS.forEach(t => fadeTrack(t, 0, 500));
                    if (sd?.hasIsolationToggle) {
                        setIsIsolationActive(false);
                    }
                }
            });
        });

        ScrollTrigger.refresh();

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, [hasStarted, fadeTrack, mode, sectionsData]);

    const startAllTracks = useAudioStore((state) => state.startAllTracks);
    const toggleMute = useAudioStore((state) => state.toggleMute);
    const isMuted = useAudioStore((state) => state.isMuted);

    const handleStartExperience = useCallback(() => {
        startAllTracks();
        setHasStarted(true);
    }, [startAllTracks]);

    return (
        <div className={`min-h-screen font-sans selection:bg-white/20 ${mode === 'wellness' ? 'bg-transparent text-[#3a2820]' : 'bg-[#0a0a0a] text-tenbin-offwhite'}`}>
            {/* Grain overlay */}
            <div className="grain-overlay" aria-hidden="true" />
            {/* Hidden video element for webcam */}
            <video ref={videoRef} className="hidden" playsInline muted />

            {/* Zones panorama (fond, derrière le blob) - uniquement en section 2 */}
            {(activeSectionId === 2) && (() => {
                if (mode === 'wellness') {
                    // Wellness: 4 zones premium (parallaxe + scale + caption fade)
                    // Order: Reception → Treatment rooms → Heat rituals → Recovery.
                    // The audio store mirrors this order: keysy → deep → less deep → Instrumental (2).
                    const slides = [
                        { key: 'accueil',      src: '/kikiscroll/IMAGES/wellness_zone_accueil.jpg',      placeholder: '#e8c5a8',
                          sub: t.zone_entree_sub,        title: t.zone_entree,        body: t.zone_entree_body },
                        { key: 'soin',         src: '/kikiscroll/IMAGES/wellness_zone_soin.jpg',         placeholder: '#d49a8a',
                          sub: t.zone_equipe_sub,        title: t.zone_equipe,        body: t.zone_equipe_body },
                        { key: 'chaleur',      src: '/kikiscroll/IMAGES/wellness_zone_chaleur.jpg',      placeholder: '#c47b6e',
                          sub: t.zone_rayon_sub,         title: t.zone_rayon,         body: t.zone_rayon_body },
                        { key: 'recuperation', src: '/kikiscroll/IMAGES/wellness_zone_recuperation.jpg', placeholder: '#f4e6d6',
                          sub: t.zone_recuperation_sub,  title: t.zone_recuperation,  body: t.zone_recuperation_body },
                    ];
                    // Parked progress: hold slide 0 in view at the start and slide 3 at the end
                    // so the user has time to actually read those cards before/after the horizontal pan.
                    // PARK_START is pushed late enough that the intro title + paragraph have time
                    // to be read and fade out before the rooms become the focus.
                    const PARK_START = 0.28;
                    const PARK_END = 0.86;
                    const movingProgress = sectionProgress <= PARK_START
                        ? 0
                        : sectionProgress >= PARK_END
                            ? 1
                            : (sectionProgress - PARK_START) / (PARK_END - PARK_START);
                    const translateX = 12 - 192 * movingProgress; // vw
                    const activeIndex = movingProgress < 1/6 ? 0
                                      : movingProgress < 3/6 ? 1
                                      : movingProgress < 5/6 ? 2
                                      : 3;
                    // Delay panorama fade-in so the rooms only appear once the intro paragraph
                    // has had time to be read and is fading out.
                    const FADE_IN_START = 0.18;
                    const FADE_IN_END = 0.26;
                    const FADE_OUT_START = 0.94;
                    const fadeIn = Math.max(0, Math.min(1, (sectionProgress - FADE_IN_START) / (FADE_IN_END - FADE_IN_START)));
                    const fadeOut = Math.min(1, (1 - sectionProgress) / (1 - FADE_OUT_START));
                    const panoramaOpacity = Math.max(0, Math.min(fadeIn, fadeOut));
                    return (
                        <div className="spa-panorama" aria-hidden="true" style={{ opacity: panoramaOpacity, transition: 'opacity 300ms ease-out' }}>
                            <div className="spa-panorama__track" style={{ transform: `translateX(${translateX}vw)` }}>
                                {slides.map((s, i) => {
                                    // Caption opacity is driven inline by the slide's distance
                                    // from the viewport-center in movingProgress space (slide i
                                    // is centered when mp = i/3). Plateau is 0.10 wide on each
                                    // side of center, then a 0.12 mp linear fade to 0. With
                                    // slides 1/3 apart in mp, that means the caption starts
                                    // appearing as soon as its slide is 2/3 of the way to
                                    // centered, and stays fully visible for ~60% of the time
                                    // its slide is the nearest one. CSS transition is removed
                                    // so the opacity tracks the live scroll position frame by
                                    // frame instead of trailing it by ~120ms.
                                    const slideCenter = i / 3;
                                    const dist = Math.abs(movingProgress - slideCenter);
                                    const captionOpacity = dist <= 0.10
                                        ? 1
                                        : dist >= 0.22
                                            ? 0
                                            : 1 - (dist - 0.10) / 0.12;
                                    return (
                                        <div
                                            key={s.key}
                                            className={`spa-panorama__slide${i === activeIndex ? ' spa-panorama__slide--active' : ''}`}
                                            style={{ backgroundColor: s.placeholder }}
                                        >
                                            <div className="spa-panorama__bg" style={{ backgroundImage: `url(${s.src})` }} />
                                            <div
                                                className="spa-panorama__caption"
                                                style={{
                                                    opacity: captionOpacity,
                                                    transform: `translateY(${(1 - captionOpacity) * 8}px)`,
                                                }}
                                            >
                                                <span className="spa-panorama__sub">{s.sub}</span>
                                                <span className="spa-panorama__title">{s.title}</span>
                                                <span className="spa-panorama__body">{s.body}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }
                // Retail: single panorama image with horizontal background-position interpolation (3 zones)
                let bgX;
                if (sectionProgress < 0.33) {
                    bgX = (sectionProgress / 0.33) * 20;
                } else if (sectionProgress < 0.66) {
                    bgX = 20 + ((sectionProgress - 0.33) / 0.33) * 35;
                } else {
                    bgX = 55 + ((sectionProgress - 0.66) / 0.34) * 30;
                }
                return (
                    <div
                        className="fixed inset-0 z-0 w-full h-full pointer-events-none"
                        style={{
                            backgroundImage: `url(/kikiscroll/IMAGES/${mode}_panorama.jpg)`,
                            backgroundSize: 'auto 100%',
                            backgroundPositionX: `${bgX}%`,
                            backgroundPositionY: 'center',
                            backgroundRepeat: 'no-repeat',
                            opacity: 0.5,
                        }}
                    />
                );
            })()}

            {/* 3D Blob (devant le panorama, opaque). We pass both `activeSection`
                (DOM position) for legacy visual transitions and `activeSectionId`
                (stable behavior id) so the density clones / top-down camera stay
                tied to the score section even when wellness reorders the array.
                `motionRef` lets the blob breathe a little with the visitor's
                movement in the webcam section. */}
            <div className="fixed top-0 left-0 w-full h-full z-[5] pointer-events-none">
                <Scene
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    activeSectionId={activeSectionId}
                    sectionProgress={sectionProgress}
                    densityBlobCount={densityBlobCount}
                    isIsolationActive={isIsolationActive}
                    motionRef={motionRef}
                />
            </div>

            {/* Header */}
            <header className={`fixed top-8 left-8 md:top-10 md:left-[8vw] z-50 pointer-events-auto ${mode === 'wellness' ? '' : 'mix-blend-difference'}`}>
                <svg
                    width="110"
                    height="24"
                    viewBox="0 0 1096 237"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={mode === 'wellness' ? 'text-[#3a2820]' : 'text-white'}
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
                    className={`fixed top-8 right-8 md:top-10 md:right-[8vw] z-50 pointer-events-auto transition-all duration-500 ${isMuted ? 'text-tenbin-gray opacity-50' : 'text-white opacity-80 hover:opacity-100'}`}
                    aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                </button>
            )}

            {/* Scroll encouragement - double chevron. Visible on every section including
                the last (score) so the phase strip invites the user to keep scrolling through
                all five phases. */}
            {hasStarted && (
                <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <span className="scroll-prompt-text text-[10px] md:text-xs uppercase tracking-[0.28em] text-white/80">
                            {t.scroll_prompt}
                        </span>
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
                                <div 
                                    className="flex flex-col items-start transition-transform duration-700 ease-out"
                                    style={{
                                        transform: `translateY(${Math.max(0, (1 - sectionProgress * 5)) * 15}vh)`,
                                    }}
                                >
                                    <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em] text-tenbin-gray mb-6">
                                        {t.intro_eyebrow}
                                    </p>
                                    <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8 leading-tight">
                                        {section.title}
                                    </h2>
                                    {!hasStarted ? (
                                        <button
                                            onClick={handleStartExperience}
                                            className="px-8 py-4 border border-white bg-transparent text-white hover:bg-white hover:text-black transition-all duration-500 font-sans text-xs uppercase tracking-widest rounded-full cursor-pointer mb-8"
                                        >
                                            {t.intro_start}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 text-tenbin-gray text-sm animate-pulse mb-8">
                                            <span>↓</span>
                                            <span className="uppercase tracking-widest">{t.intro_scroll}</span>
                                        </div>
                                    )}
                                    <p className="text-base md:text-lg font-sans text-tenbin-gray tracking-wide leading-relaxed font-light">
                                        {section.paragrapheParts.map((part, pi) => {
                                            const partThreshold = pi * 0.33;
                                            const partProgress = activeSection === index
                                                ? Math.min(1, Math.max(0, (sectionProgress - partThreshold) / 0.15))
                                                : 0;
                                            // Mirror the non-intro renderer: withLineBreaks turns each
                                            // span into a block so paragraphs separate visually.
                                            const breakClasses = section.withLineBreaks
                                                ? ` block${pi > 0 ? ' mt-4' : ''}`
                                                : '';
                                            return (
                                                <span
                                                    key={pi}
                                                    className={`transition-opacity duration-500${breakClasses}`}
                                                    style={{
                                                        opacity: partProgress,
                                                        color: partProgress > 0 && partProgress < 1 ? '#ffffff' : undefined,
                                                        textShadow: partProgress > 0 && partProgress < 1
                                                            ? `0 0 ${14 * partProgress}px rgba(255,255,255,${0.42 * partProgress})`
                                                            : 'none',
                                                    }}
                                                >
                                                    {pi > 0 && !section.withLineBreaks ? ' ' : ''}{part}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                            ) : (() => {
                                // Wellness section 2: fade out the intro block once the horizontal pan starts,
                                // so the title + paragraph don't compete with the spa cards mid-scroll.
                                const isWellnessSection2 = section.hasZonesPanorama && mode === 'wellness';
                                const introOpacity = isWellnessSection2 && activeSection === index
                                    ? Math.max(0, Math.min(1, (0.22 - sectionProgress) / 0.06))
                                    : 1;
                                return (
                                    <div
                                        style={{
                                            opacity: introOpacity,
                                            transition: 'opacity 300ms ease-out',
                                        }}
                                    >
                                        <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-white mb-8">
                                            {section.title}
                                        </h2>
                                        <p className={"text-base md:text-lg font-sans tracking-wide leading-relaxed font-light mb-12 " + (section.hasZonesPanorama ? "text-white" : "text-tenbin-gray")}>
                                            {section.paragrapheParts.map((part, pi) => {
                                                const numParts = section.paragrapheParts.length;
                                                // For wellness section 2, compress the reveal so the whole paragraph
                                                // is fully visible by ~0.10 progress — well before the cards appear.
                                                // For sections with line breaks (s4, s5), spread the reveal evenly
                                                // across the section regardless of how many parts there are.
                                                const partThreshold = isWellnessSection2
                                                    ? pi * 0.03
                                                    : pi * (0.66 / Math.max(1, numParts - 1));
                                                const revealRamp = isWellnessSection2 ? 0.04 : 0.15;
                                                const partProgress = activeSection === index
                                                    ? Math.min(1, Math.max(0, (sectionProgress - partThreshold) / revealRamp))
                                                    : 0;
                                                // withLineBreaks turns the inline span into a block with margin,
                                                // creating proper paragraph separation (avoids the "wall of text" feel).
                                                const breakClasses = section.withLineBreaks
                                                    ? ` block${pi > 0 ? ' mt-4' : ''}`
                                                    : '';
                                                return (
                                                    <span
                                                        key={pi}
                                                        className={`transition-opacity duration-500${breakClasses}`}
                                                        style={{
                                                            opacity: partProgress,
                                                            color: partProgress > 0 && partProgress < 1 ? '#ffffff' : undefined,
                                                            textShadow: partProgress > 0 && partProgress < 1
                                                                ? `0 0 ${14 * partProgress}px rgba(255,255,255,${0.42 * partProgress})`
                                                                : 'none',
                                                        }}
                                                    >
                                                        {pi > 0 && !section.withLineBreaks ? ' ' : ''}{part}
                                                    </span>
                                                );
                                            })}
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Section 1: Isolation status — auto-driven by scroll progress.
                                Previously a pill-toggle, which read as interactive and frustrated users who tried
                                to click it. Now a passive status indicator: pulsing dot + label, like the camera
                                section's emotion readout. Nothing invites a click. */}
                            {section.hasIsolationToggle && (
                                <div className="flex items-center gap-3 mt-8 select-none" aria-live="polite">
                                    <span className={`w-2.5 h-2.5 rounded-full transition-all duration-700 ${isIsolationActive ? 'bg-white animate-pulse' : 'bg-tenbin-gray/50'}`} />
                                    <span className={`text-xs font-medium uppercase tracking-[0.28em] transition-all duration-700 ${isIsolationActive ? 'text-white' : 'text-tenbin-gray'}`}>
                                        {isIsolationActive ? t.isolation_on : t.isolation_off}
                                    </span>
                                </div>
                            )}

                            {/* Section 5: density indicator
                                — Retail: numeric counter (1 → 5 strates sonores)
                                — Wellness: the 5 treatment phases sit side-by-side with massage-themed
                                  icons; the active phase is white, the rest are dimmed. A "Treatment phases"
                                  title sits above so the reader knows what they're looking at. */}
                            {section.hasDensityLabels && activeSection === index && densityExperienceProgress > 0 && (
                                mode === 'wellness' ? (
                                    <div className="mt-8 border-t border-tenbin-gray/20 pt-8 flex flex-col gap-5">
                                        <span className="text-[10px] uppercase tracking-[0.28em] text-white/70">
                                            {t.phases_title}
                                        </span>
                                        <div className="flex flex-wrap gap-6 md:gap-10">
                                            {[
                                                // 1 — Welcome: open arc / threshold rising up.
                                                (<svg key="i1" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 21V11a9 9 0 0 1 18 0v10" />
                                                    <path d="M2 21h20" />
                                                </svg>),
                                                // 2 — Opening: two arcs unfurling outward from a stem.
                                                (<svg key="i2" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 21V11" />
                                                    <path d="M6 14C6 10 8 6 12 4" />
                                                    <path d="M18 14C18 10 16 6 12 4" />
                                                </svg>),
                                                // 3 — Depth: pressure point (concentric rings with a solid centre).
                                                (<svg key="i3" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="9" />
                                                    <circle cx="12" cy="12" r="4.5" />
                                                    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                                                </svg>),
                                                // 4 — Release: a slow exhale / drifting wave.
                                                (<svg key="i4" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 10c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                                                    <path d="M3 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
                                                </svg>),
                                                // 5 — Return: closing circle with a return arrow.
                                                (<svg key="i5" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                                                    <path d="M21 4v5h-5" />
                                                </svg>),
                                            ].map((icon, idx) => {
                                                const phaseNum = idx + 1;
                                                const isActive = phaseNum === densityBlobCount;
                                                return (
                                                    <div
                                                        key={phaseNum}
                                                        className={`flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-white opacity-100 scale-110' : 'text-tenbin-gray opacity-30 scale-100'}`}
                                                    >
                                                        {icon}
                                                        <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">
                                                            {t[`phase_${phaseNum}`]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-8 border-t border-tenbin-gray/20 pt-8 flex flex-col items-center gap-2 w-fit">
                                        <span className="text-3xl md:text-4xl font-heading font-medium text-white transition-all duration-500 scale-110">
                                            {densityBlobCount}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-widest text-white transition-all duration-500 opacity-100">
                                            {t.density_label}
                                        </span>
                                    </div>
                                )
                            )}

                            {/* Section 2 (Zones): Icônes zones — uniquement en retail (en wellness les cards portent l'info). */}
                            {section.hasZonesPanorama && activeSection === index && mode !== 'wellness' && (
                                <div className="flex gap-10 mt-8 border-t border-tenbin-gray/20 pt-8">
                                    {(mode === 'wellness' ? [
                                        {
                                            key: 'accueil',
                                            label: t.zone_entree,
                                            subtitle: t.zone_entree_sub,
                                            start: 0.0,
                                            end: 0.25,
                                            icon: (
                                                // Seuil — porte ouverte
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 21V5l8-2v18" />
                                                    <path d="M12 21h8V8l-8-3" />
                                                    <circle cx="10" cy="12" r="0.6" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            key: 'chaleur',
                                            label: t.zone_rayon,
                                            subtitle: t.zone_rayon_sub,
                                            start: 0.25,
                                            end: 0.5,
                                            icon: (
                                                // Enveloppe — vapeur montante
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M7 16c-1 -1.5 -1 -3 0 -4.5s1 -3 0 -4.5" />
                                                    <path d="M12 16c-1 -1.5 -1 -3 0 -4.5s1 -3 0 -4.5" />
                                                    <path d="M17 16c-1 -1.5 -1 -3 0 -4.5s1 -3 0 -4.5" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            key: 'soin',
                                            label: t.zone_equipe,
                                            subtitle: t.zone_equipe_sub,
                                            start: 0.5,
                                            end: 0.75,
                                            icon: (
                                                // Geste — main + point d'appui
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12c2 -3 5 -4.5 8 -4.5s6 1.5 8 4.5" />
                                                    <path d="M5 12c2 3 5 4.5 8 4.5s6 -1.5 8 -4.5" />
                                                    <circle cx="13" cy="12" r="1" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            key: 'recuperation',
                                            label: t.zone_recuperation,
                                            subtitle: t.zone_recuperation_sub,
                                            start: 0.75,
                                            end: 1.0,
                                            icon: (
                                                // Empreinte — onde apaisée
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 12h3" />
                                                    <path d="M6 9c1 0 1 6 2 6s1 -10 2 -10s1 12 2 12s1 -8 2 -8s1 4 2 4" />
                                                    <path d="M18 12h3" />
                                                </svg>
                                            ),
                                        },
                                    ] : [
                                        {
                                            key: 'entree',
                                            label: t.zone_entree,
                                            subtitle: t.zone_entree_sub,
                                            start: 0.0,
                                            end: 0.33,
                                            icon: (
                                                // Porte stylisée
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="6" y="3" width="12" height="18" rx="1.5" />
                                                    <circle cx="14" cy="12" r="0.8" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            key: 'rayon',
                                            label: t.zone_rayon,
                                            subtitle: t.zone_rayon_sub,
                                            start: 0.33,
                                            end: 0.66,
                                            icon: (
                                                // Loupe
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="5" />
                                                    <line x1="15" y1="15" x2="20" y2="20" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            key: 'equipe',
                                            label: t.zone_equipe,
                                            subtitle: t.zone_equipe_sub,
                                            start: 0.66,
                                            end: 1.0,
                                            icon: (
                                                // Collaborateurs
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="9" cy="8" r="2.5" />
                                                    <circle cx="15" cy="9" r="2" />
                                                    <path d="M4.5 18c.8-2.7 2.8-4 4.5-4s3.7 1.3 4.5 4" />
                                                    <path d="M13 18c.5-1.8 1.8-2.8 3.5-2.8c1.3 0 2.4.6 3 1.8" />
                                                </svg>
                                            ),
                                        },
                                    ]).map((zone, idx) => {
                                        const zoneLen = zone.end - zone.start;
                                        const localP = sectionProgress <= zone.start
                                            ? 0
                                            : sectionProgress >= zone.end
                                                ? 1
                                                : (sectionProgress - zone.start) / zoneLen;
                                        const isActive = sectionProgress >= zone.start && sectionProgress < zone.end;
                                        const opacity = Math.max(0.2, Math.min(localP / 0.2, 1, (1 - localP) / 0.2));
                                        return (
                                            <div
                                                key={zone.key}
                                                className={`flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'text-white opacity-100 scale-110' : 'text-tenbin-gray opacity-30 scale-100'}`}
                                            >
                                                {zone.icon}
                                                <span className="text-[10px] uppercase tracking-widest">{zone.label}</span>
                                                <span className="text-[10px] uppercase tracking-widest opacity-70">{zone.subtitle}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Section 3: Neuro-sonore Icons */}
                            {section.hasEnvironmentLabels && activeSection === index && (
                                <div className="flex gap-10 mt-8 border-t border-tenbin-gray/20 pt-8">
                                    {[
                                        { key: 'relaxation', label: t.neuro_relaxation, icon: (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2.1 7.7A7 7 0 0 1 11 20z"/>
                                                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 12 13"/>
                                            </svg>
                                        )},
                                        { key: 'regulation', label: t.neuro_regulation, icon: (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/>
                                                <path d="M12 6v15"/>
                                            </svg>
                                        )},
                                        { key: 'focus', label: t.neuro_focus, icon: (
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
                                        {isCameraActive ? t.webcam_active : t.webcam_authorize}
                                    </button>

                                    {/* Camera-active status. No emotion read-out: the audio is
                                        driven continuously by movement, not by discrete labels. */}
                                    {isCameraActive && (
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                            <span className="text-[10px] uppercase tracking-[0.28em] text-tenbin-gray">
                                                {t.webcam_reading}
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
                {/* Dawn transition vers footer — adapté au mode (sombre en retail, chaud en wellness) */}
                <div className="h-[60vh] relative" style={{
                    background: mode === 'wellness'
                        ? 'linear-gradient(to bottom, rgba(244,230,214,0) 0%, rgba(232,197,168,0.4) 30%, rgba(212,154,138,0.5) 55%, rgba(245,243,240,0.88) 85%, #f5f3f0 100%)'
                        : 'linear-gradient(to bottom, #000000 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.3) 50%, rgba(245,243,240,0.6) 75%, #f5f3f0 100%)',
                }}>
                    <div className="absolute inset-0 animate-aurora opacity-30" style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(200,180,160,0.4) 0%, transparent 70%)',
                    }} />
                </div>

                {/* Footer content */}
                <footer className="bg-[#f5f3f0] text-[#1a1a1a] px-8 md:px-[8vw] pt-16 pb-12">
                    {/* Wellness CTA — centered editorial block that replaces the contact form.
                        cta_title sets the question, the prose answers it, and the email closes it. */}
                    {mode === 'wellness' && (
                        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
                            <h2 className="text-2xl md:text-4xl font-heading font-medium tracking-tight leading-snug mb-6">
                                {t.cta_title}
                            </h2>
                            <p className="text-base md:text-lg text-[#3a3a3a] leading-relaxed font-light">
                                {t.cta_body}{' '}<span className="font-medium text-[#1a1a1a]">{t.cta_invite}</span>{' '}
                                <a
                                    href={`mailto:${t.cta_email}`}
                                    className="underline decoration-1 underline-offset-4 hover:decoration-2 transition-all"
                                >
                                    {t.cta_email}
                                </a>
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
                        <div className="flex-shrink-0">
                            <img src={`${import.meta.env.BASE_URL}logo-kikina.png`} alt="Kikina Lab" className="h-6 md:h-8 w-auto invert" />
                        </div>
                        <div className="flex flex-col md:flex-row gap-8 md:gap-12 text-sm flex-1 md:justify-end">
                            <div className="flex flex-col gap-3 flex-shrink-0 md:w-36">
                                <a href="https://kikinalab.com" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#1a1a1a] transition-colors">{t.footer_about}</a>
                                <button
                                    onClick={() => setShowMentions(!showMentions)}
                                    className="text-left text-[#555] hover:text-[#1a1a1a] transition-colors focus:outline-none"
                                >
                                    {t.footer_legal}
                                </button>
                                <a href="https://www.linkedin.com/company/kikinastudio/" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#1a1a1a] transition-colors">LinkedIn</a>
                            </div>
                            {mode !== 'wellness' && (
                                <div className="flex flex-col gap-3 flex-1 max-w-lg">
                                    <span className="font-semibold uppercase tracking-widest text-xs mb-1">{t.footer_contact}</span>
                                    <form className="flex flex-col gap-3" onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target;
                                        const email = form.email.value;
                                        const message = form.message.value;
                                        window.location.href = `mailto:bianca@kikinastudio.com?subject=${encodeURIComponent(t.footer_mailto_subject)}&body=${encodeURIComponent(message + '\n\n' + t.footer_mailto_body_prefix + email)}`;
                                    }}>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            placeholder={t.footer_email_placeholder}
                                            className="bg-transparent border-b border-[#ccc] focus:border-[#1a1a1a] outline-none py-2 text-sm text-[#1a1a1a] placeholder-[#999] transition-colors"
                                        />
                                        <textarea
                                            name="message"
                                            required
                                            placeholder={t.footer_message_placeholder}
                                            rows={3}
                                            className="bg-transparent border-b border-[#ccc] focus:border-[#1a1a1a] outline-none py-2 text-sm text-[#1a1a1a] placeholder-[#999] transition-colors resize-none"
                                        />
                                        <button
                                            type="submit"
                                            className="self-start mt-2 px-6 py-2 text-xs uppercase tracking-widest font-semibold border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f3f0] transition-colors rounded-full"
                                        >
                                            {t.footer_send}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-[#d0d0d0] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <span className="text-xs text-[#999]">{t.footer_copyright}</span>
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
                            <h3 className="font-bold uppercase mb-4 text-xs">{t.legal_title}</h3>
                            <p className="mb-2"><strong>{t.legal_editor}</strong> {t.legal_editor_value}</p>
                            <p className="mb-2"><strong>{t.legal_address_label}</strong> {t.legal_address_value}</p>
                            <p className="mb-2"><strong>{t.legal_contact_label}</strong> bianca@kikinastudio.com</p>
                            <p className="mb-2"><strong>{t.legal_hosting_label}</strong> {t.legal_hosting_value}</p>
                            <p className="mt-6 italic opacity-60">
                                {t.legal_privacy}
                            </p>
                            <button
                                onClick={() => setShowMentions(false)}
                                className="mt-8 text-[#555] hover:text-[#1a1a1a] underline uppercase tracking-widest font-bold"
                            >
                                {t.legal_close}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
