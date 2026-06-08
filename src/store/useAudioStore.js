import { create } from 'zustand';
import { Howl, Howler } from 'howler';
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
// Section 4 camera (motion-driven): the gesture detector lifts the `strings`
// stem per-frame, and `motionPad` (Fender) plays underneath at a low constant
// volume as a warm ambient bed so movement layers onto an atmosphere instead of
// switching sound on/off against silence. The drone keeps playing below both.
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
    motionPad: { src: `${BASE}MUSIC/wellness/Fender.mp3`, initialVolume: 0 },
};

// Per-track loudness compensation. The wellness mp3 pack is unevenly mastered, so
// each track is brought to a consistent perceived level. The earlier version of
// this table was calibrated from a bad set of "peak amplitude" figures (it had
// Instrumental="4", Drone="9") and pushed several tracks WAY past full scale at
// their section volumes — e.g. deep 0.60peak × 0.7vol × 3.5 = 1.47, Instrumental
// 0.68 × 0.7 × 4.5 = 2.14. That constant overshoot is what made the master
// distort / "frétille": the limiter had to crush huge bass peaks on every section.
//
// These gains are recomputed from the files' real RMS (perceived loudness) so that
// filePeak × sectionVol × gain stays ≤ ~0.86 for every track — i.e. no single
// track clips, and only occasional correlated sums (the density stack, big webcam
// gestures) ever reach the master soft-clip. Measured RMS / peak (dBFS):
//
//   track          file                     RMS     peak    sectionVol
//   drone          01 Drone Wellness       -20.0   -5.5     0.50
//   jungle         flute guerlain          -18.0   -2.3     0.60
//   pulsatingWave  roulements de piano     -20.8   -3.4     0.60
//   focusCognitif  ceremonial fusion v.    -16.2   -2.2     0.60
//   rayon          deep                    -22.4   -4.5     0.70
//   cabine         less deep               -19.0   -2.6     0.70
//   entrance       keysy                   -18.5   -0.8     0.70
//   recuperation   Instrumental (2)        -16.5   -3.4     0.70
//   motionPad      Fender                  -18.6   -1.6     0.32 (kept softer: it's a bed)
//
// We multiply the requested volume by LOUDNESS_GAIN[key] and write it to the Web
// Audio gain node (Howler's .volume() clamps to [0,1]); see applyGain.
const LOUDNESS_GAIN = {
    drone: 1.6,
    jungle: 1.25,
    pulsatingWave: 1.7,
    focusCognitif: 1.0,
    rayon: 2.05,
    cabine: 1.4,
    entrance: 1.35,
    recuperation: 1.05,
    motionPad: 1.2,
};

// NOTE: the previous build seeked the drone to 55s on start, on the assumption
// that "01 Drone Wellness" was near-silent for its first ~50s. Measuring the
// file shows that's not true — it's fairly uniform (intro ~-22 dB vs body
// ~-18 dB, only ~4 dB), so the seek bought almost nothing while introducing a
// seek-immediately-after-play() race that could leave the drone stopped. The
// seek has been removed; the drone now simply plays from the top with its
// loudness gain applied on the `play` event (see startAllTracks).

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

// --- Master soft-clip safety -------------------------------------------------
// A WaveShaper soft-clip on Howler's master bus is the final guard against the
// output ever hard-clipping. With the recalibrated LOUDNESS_GAIN above, no single
// track exceeds ~0.86, so this stage is transparent (unity) almost all the time;
// it only rounds the occasional correlated SUM peak (the 5-layer density stack, a
// vigorous webcam gesture over the drone + pad). We deliberately use a soft-clip
// rather than a DynamicsCompressor here: a compressor's envelope follows the
// bass-heavy drone within its own waveform period and adds the gritty distortion /
// pumping ("frétille") the user heard. A static waveshaping curve has no time
// constant, so it never pumps and never distorts low frequencies by envelope
// tracking — it just smoothly tucks peaks under the ceiling. 4x oversampling keeps
// the curve from aliasing. Wired once; harmless to retail (it sits at unity there).
let masterSoftClipInstalled = false;
function makeSoftClipCurve() {
    const N = 2048;
    const curve = new Float32Array(N);
    const knee = 0.8; // |input| below this passes through at unity (transparent)
    const ceil = 0.97; // asymptotic output ceiling for hot peaks
    for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * 2 - 1; // -1 .. 1
        const ax = Math.abs(x);
        if (ax <= knee) {
            curve[i] = x;
        } else {
            const over = (ax - knee) / (1 - knee); // 0 .. 1 across the knee→1 region
            const shaped = knee + (ceil - knee) * (Math.tanh(over * 2) / Math.tanh(2));
            curve[i] = Math.sign(x) * shaped;
        }
    }
    return curve;
}
function installMasterSoftClip() {
    if (masterSoftClipInstalled) return;
    const ctx = Howler.ctx;
    const master = Howler.masterGain;
    if (!ctx || !master) return;
    try {
        const shaper = ctx.createWaveShaper();
        shaper.oversample = '4x';
        shaper.curve = makeSoftClipCurve();
        // Howler wires masterGain straight to ctx.destination; splice the shaper in.
        master.disconnect();
        master.connect(shaper);
        shaper.connect(ctx.destination);
        masterSoftClipInstalled = true;
        // Read-only handle for live inspection/debugging.
        Howler.__kikiMasterSoftClip = shaper;
    } catch (e) {
        // Fail open (no shaper) rather than silencing all audio if a future
        // Howler version changes the master routing.
        console.warn('Master soft-clip install skipped:', e);
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

    // Constructing the first Howl creates Howler.ctx + Howler.masterGain, so the
    // master soft-clip can be spliced in right away (re-armed in startAllTracks too).
    installMasterSoftClip();

    return {
        tracks: instances,
        isPlaying: false,
        isMuted: false,

        startAllTracks: () => {
            const { tracks, isPlaying } = get();
            if (isPlaying) return;

            // Now guaranteed to be inside a user gesture with a live context.
            installMasterSoftClip();

            Object.entries(tracks).forEach(([key, howlInstance]) => {
                const initialVol = TRACKS[key].initialVolume;
                // Apply the (possibly >1.0) gain exactly when Howler reports the
                // sound has actually started — the Web Audio gain node only
                // exists once the buffer source is live. The previous approach
                // (setTimeout 50ms after play) raced the async AudioContext
                // resume on the first gesture and could leave a track — most
                // visibly the drone — stuck at volume 0 for the whole session.
                // `once('play')` fires deterministically when playback begins.
                howlInstance.once('play', () => applyGain(howlInstance, key, initialVol));
                howlInstance.play();
                // If the node already exists synchronously (preloaded + context
                // already running), set it now too — idempotent with the above.
                applyGain(howlInstance, key, initialVol);
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

        // Per-frame volume set — used by the motion-detection loop (~60 Hz). The
        // value is already de-noised/smoothed upstream, but we still glide the Web
        // Audio gain with a short time constant (setTargetAtTime) instead of writing
        // gain.value directly: a hard per-frame write steps the gain and produces
        // audible zipper/clicks. The exponential glide makes the swell continuous.
        // Nothing else schedules this node while the gesture loop owns it, so the
        // glide is not clobbered.
        setVolume: (trackName, volume) => {
            const { tracks } = get();
            const howlInstance = tracks[trackName];
            if (!howlInstance) return;
            const gainMul = ACTIVE_GAINS[trackName] ?? 1;
            const desired = Math.max(0, volume) * gainMul;
            const sound = howlInstance._sounds && howlInstance._sounds[0];
            const node = sound && sound._node;
            const ctx = howlInstance._ctx;
            if (node && node.gain && ctx && typeof node.gain.setTargetAtTime === 'function') {
                // ~40 ms time constant: smooth but still responsive.
                node.gain.setTargetAtTime(desired, ctx.currentTime, 0.04);
            } else {
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
