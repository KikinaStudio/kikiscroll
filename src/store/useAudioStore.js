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

// Per-track loudness compensation. The wellness mp3 pack arrived very unevenly
// mastered — measuring peak amplitude in the browser:
//
//   01 Drone Wellness ........ 9 (retail 0 Drone is 26 for comparison)
//   flute guerlain ........... 12
//   roulements de piano ...... 10
//   ceremonial fusion voices.. 39
//   deep ..................... 8
//   Instrumental (2) ......... 4
//   keysy .................... 105   ← already very loud
//   less deep ................ 93    ← already very loud
//
// Without this table the drone-only intro feels silent, the neuro section's two
// quiet tracks drop out, and zones 1 and 3 (keysy / less deep) bury everything
// else. We multiply the requested volume by `LOUDNESS_GAIN[key]` and rely on the
// underlying Web Audio gain node, which Howler exposes via .gain — values above
// 1.0 actually boost the signal, unlike Howler's clamped .volume() helper.
const LOUDNESS_GAIN = {
    drone: 4.5,
    jungle: 3.0,
    pulsatingWave: 3.2,
    focusCognitif: 1.0,
    rayon: 3.5,
    cabine: 0.6,
    entrance: 0.5,
    recuperation: 4.5,
};

// Some wellness files have a very quiet intro (the drone is near-silent for
// ~50s, then ~5× louder in the body). Seek the looped track past that intro
// once it starts so the page doesn't *sound* silent at first load. Times are
// in seconds; tracks not listed start at 0.
const START_SEEK = {
    drone: 55,
};

// Apply gain directly to the Howl's Web Audio gain node so we can go above 1.0.
// Howler's `.volume()` clamps to [0, 1] AND schedules a gain ramp on the same
// node we'd otherwise set above 1, so any value-at-time/ramp calls we make
// would be overwritten on Howler's next tick. The escape hatch that DOES
// stick is the bare `gain.value` setter (direct AudioParam value write), so
// we use that. We still call .volume() first with the clamped value so that
// Howler's internal bookkeeping (used by .fade(), .mute()) stays coherent.
function applyGain(howlInstance, trackName, requestedVolume) {
    if (!howlInstance) return;
    const gain = ACTIVE_GAINS[trackName] ?? 1;
    const desired = Math.max(0, requestedVolume * gain);
    howlInstance.volume(Math.min(1, desired));
    const sound = howlInstance._sounds && howlInstance._sounds[0];
    const node = sound && sound._node;
    if (node && node.gain) {
        // Cancel any scheduled ramps Howler may have queued before clobbering.
        if (typeof node.gain.cancelScheduledValues === 'function' && howlInstance._ctx) {
            node.gain.cancelScheduledValues(howlInstance._ctx.currentTime);
        }
        node.gain.value = desired;
    }
}

const { mode } = parseUrlMode();
const TRACKS = mode === 'wellness' ? WELLNESS_TRACKS : RETAIL_TRACKS;
// Retail tracks were mastered consistently; no compensation needed.
const ACTIVE_GAINS = mode === 'wellness' ? LOUDNESS_GAIN : {};

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
                howlInstance.play();
                const seek = START_SEEK[key];
                if (typeof seek === 'number' && seek > 0) {
                    howlInstance.seek(seek);
                }
                // Defer the gain write: when play() returns, Howler has
                // queued sound-node creation but it can still overwrite the
                // gain on its first internal tick. A microtask + small delay
                // lets us land *after* Howler is done initialising, so our
                // above-1.0 boost actually sticks.
                setTimeout(() => applyGain(howlInstance, key, initialVol), 50);
            });

            set({ isPlaying: true });
        },

        fadeTrack: (trackName, targetVolume, duration = 1000) => {
            const { tracks } = get();
            const howlInstance = tracks[trackName];

            if (!howlInstance) {
                console.warn(`Track ${trackName} not found in audio store.`);
                return;
            }

            const gain = ACTIVE_GAINS[trackName] ?? 1;
            const sound = howlInstance._sounds && howlInstance._sounds[0];
            const node = sound && sound._node;
            if (!node || !node.gain) {
                // Fallback for non-Web-Audio backends.
                const currentVolume = howlInstance.volume();
                if (Math.abs(currentVolume - targetVolume) > 0.01) {
                    howlInstance.fade(currentVolume, Math.min(1, targetVolume), duration);
                }
                return;
            }

            const fromGain = node.gain.value;
            const toGain = Math.max(0, targetVolume * gain);
            if (Math.abs(fromGain - toGain) < 0.005) return;

            // We can't use Web Audio's setValueAtTime / linearRampToValueAtTime
            // here: Howler runs an internal scheduler on this same gain node
            // (its own fade/volume logic) and overwrites scheduled values on
            // every tick. Manual rAF-stepped interpolation lands reliably and
            // can park above 1.0, which is the whole point of this code path.
            howlInstance.volume(Math.min(1, toGain));
            if (typeof node.gain.cancelScheduledValues === 'function' && howlInstance._ctx) {
                node.gain.cancelScheduledValues(howlInstance._ctx.currentTime);
            }

            // Each track has at most one active rAF fade — cancel the previous.
            const fadeKey = '__kikiFade_' + trackName;
            const prev = get()[fadeKey];
            if (prev) cancelAnimationFrame(prev);

            const start = performance.now();
            const end = start + Math.max(1, duration);
            const step = () => {
                const now = performance.now();
                const k = Math.min(1, (now - start) / (end - start));
                node.gain.value = fromGain + (toGain - fromGain) * k;
                if (k < 1) {
                    set({ [fadeKey]: requestAnimationFrame(step) });
                } else {
                    set({ [fadeKey]: 0 });
                }
            };
            set({ [fadeKey]: requestAnimationFrame(step) });
        },

        // Direct, per-frame volume set — used by the motion-detection loop where
        // smoothing is already done upstream, so a Howler crossfade would just
        // fight the inertia. Safe to call from rAF (~60 Hz).
        setVolume: (trackName, volume) => {
            const { tracks } = get();
            const howlInstance = tracks[trackName];
            if (howlInstance) {
                applyGain(howlInstance, trackName, Math.max(0, volume));
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
