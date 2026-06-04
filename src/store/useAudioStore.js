import { create } from 'zustand';
import { Howl } from 'howler';
import { parseUrlMode } from '../urlMode';

// Howler resolves relative paths against the current document URL, which breaks
// at sub-routes like /kikiscroll/wellness/en (audio would resolve to
// /kikiscroll/wellness/MUSIC/... instead of /kikiscroll/MUSIC/...). Always use
// the Vite base prefix so the URL is absolute regardless of the page route.
const BASE = import.meta.env.BASE_URL;

// Retail track list — exact match with /public/MUSIC/
// HAPPY.mp3 and SAD.mp3 still live in /public/MUSIC/ but are no longer wired —
// the camera section is now driven by movement (strings + bass), not emotion.
const RETAIL_TRACKS = {
    drone: { src: `${BASE}MUSIC/0 Drone.mp3`, initialVolume: 0.5 },
    strings: { src: `${BASE}MUSIC/1 Strings.mp3`, initialVolume: 0 },
    bass: { src: `${BASE}MUSIC/2 Bass.mp3`, initialVolume: 0 },
    drums: { src: `${BASE}MUSIC/3 Drums.mp3`, initialVolume: 0 },
    keyboard: { src: `${BASE}MUSIC/4 Keyboard.mp3`, initialVolume: 0 },
    crowd: { src: `${BASE}MUSIC/Crowd.mp3`, initialVolume: 0 },
    jungle: { src: `${BASE}MUSIC/Jungle.mp3`, initialVolume: 0 },
    pulsatingWave: { src: `${BASE}MUSIC/Pulsating Wave.mp3`, initialVolume: 0 },
    focusCognitif: { src: `${BASE}MUSIC/Focus Cognitif.mp3`, initialVolume: 0 },
    entrance: { src: `${BASE}MUSIC/Synthwave_1.mp3`, initialVolume: 0 },
    rayon: { src: `${BASE}MUSIC/Rap_1.mp3`, initialVolume: 0 },
    cabine: { src: `${BASE}MUSIC/Bossa.mp3`, initialVolume: 0 },
};

// Wellness track list — wellness now prefers tracks from /public/MUSIC/wellness/
// wherever a fitting file exists, falling back to the retail master only for the
// crowd-noise slot (the sculpting section's "before isolation" texture).
//
// Section assignments:
//   drone              → 01 Drone Wellness   (new base layer, plays continuously)
//   strings/bass/      → retail 1–4 stems    (kept as-is: the "5-instrument" last
//   drums/keyboard                            section builds drone + these stems)
//   crowd              → retail Crowd         (no wellness "noise" equivalent)
//
// Section 2 zones (unchanged): entrance/rayon/cabine/recuperation already wellness.
//
// Section 3 neuro (3 states crossfaded):
//   jungle (somatic release)            → flute guerlain        (breathy, organic)
//   pulsatingWave (parasympathetic)     → roulements de piano   (gentle rhythmic pulse)
//   focusCognitif (attentional ground)  → ceremonial fusion voices (anchored, vocal)
//
// Section 4 camera (motion-driven): no dedicated mp3 — strings + bass volumes are
// modulated per-frame by the masseur-gesture detection. Fender.mp3 is kept on disk
// for now in case it's wanted later, but no track entry references it.
const WELLNESS_TRACKS = {
    ...RETAIL_TRACKS,
    drone: { src: `${BASE}MUSIC/wellness/01 Drone Wellness.mp3`, initialVolume: 0.5 },
    jungle: { src: `${BASE}MUSIC/wellness/flute guerlain.mp3`, initialVolume: 0 },
    pulsatingWave: { src: `${BASE}MUSIC/wellness/roulements de piano.mp3`, initialVolume: 0 },
    focusCognitif: { src: `${BASE}MUSIC/wellness/ceremonial fusion voices.mp3`, initialVolume: 0 },
    entrance: { src: `${BASE}MUSIC/wellness/keysy.mp3`, initialVolume: 0 },
    rayon: { src: `${BASE}MUSIC/wellness/deep.mp3`, initialVolume: 0 },
    cabine: { src: `${BASE}MUSIC/wellness/less deep.mp3`, initialVolume: 0 },
    recuperation: { src: `${BASE}MUSIC/wellness/Instrumental (2).mp3`, initialVolume: 0 },
};

const { mode } = parseUrlMode();
const TRACKS = mode === 'wellness' ? WELLNESS_TRACKS : RETAIL_TRACKS;

export const useAudioStore = create((set, get) => {
    const instances = {};

    // Preload all tracks
    Object.keys(TRACKS).forEach((key) => {
        instances[key] = new Howl({
            src: [TRACKS[key].src],
            loop: true,
            volume: 0,
            preload: true,
            html5: false, // Web Audio API preferred for exact sync
        });
    });

    return {
        tracks: instances,
        isPlaying: false,
        isMuted: false,

        startAllTracks: () => {
            const { tracks, isPlaying } = get();
            if (isPlaying) return;

            Object.entries(tracks).forEach(([key, howlInstance]) => {
                const initialVol = TRACKS[key].initialVolume;
                howlInstance.volume(initialVol);
                howlInstance.play();
            });

            set({ isPlaying: true });
        },

        fadeTrack: (trackName, targetVolume, duration = 1000) => {
            const { tracks } = get();
            const howlInstance = tracks[trackName];

            if (howlInstance) {
                const currentVolume = howlInstance.volume();
                if (Math.abs(currentVolume - targetVolume) > 0.01) {
                    howlInstance.fade(currentVolume, targetVolume, duration);
                }
            } else {
                console.warn(`Track ${trackName} not found in audio store.`);
            }
        },

        // Direct, per-frame volume set — used by the motion-detection loop where
        // smoothing is already done upstream, so a Howler crossfade would just
        // fight the inertia. Safe to call from rAF (~60 Hz).
        setVolume: (trackName, volume) => {
            const { tracks } = get();
            const howlInstance = tracks[trackName];
            if (howlInstance) {
                howlInstance.volume(Math.max(0, Math.min(1, volume)));
            }
        },

        toggleMute: () => {
            const { tracks, isMuted } = get();
            const newMuted = !isMuted;
            Object.values(tracks).forEach(howl => howl.mute(newMuted));
            set({ isMuted: newMuted });
        },

        stopAllTracks: () => {
            const { tracks } = get();
            Object.values(tracks).forEach(howl => howl.stop());
            set({ isPlaying: false });
        }
    };
});
