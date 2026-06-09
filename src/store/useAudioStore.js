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
//   pulsatingWave (parasympathetic)     → ceremonial fusion voices (anchored, vocal)
//   focusCognitif (attentional ground)  → roulements de piano   (gentle rhythmic pulse)
// NOTE: parasympathetic + attentional tracks were swapped — "roulements de piano"
// read as nearly identical to the flute it followed, so the middle state had no
// audible change. Voices now mark the parasympathetic shift clearly; the piano
// moves to attentional grounding where it contrasts against the voices before it.
//
// Section 4 camera (motion-driven): the gesture detector lifts the `strings`
// stem per-frame, and `motionPad` (Fender) plays underneath at a low constant
// volume as a warm ambient bed so movement layers onto an atmosphere instead of
// switching sound on/off against silence. The drone keeps playing below both.
const WELLNESS_TRACKS = {
    ...RETAIL_TRACKS,
    drone: { src: `${BASE}MUSIC/wellness/01 Drone Wellness.mp3`, initialVolume: 0.5 },
    jungle: { src: `${BASE}MUSIC/wellness/flute guerlain.mp3`, initialVolume: 0 },
    pulsatingWave: { src: `${BASE}MUSIC/wellness/ceremonial fusion voices.mp3`, initialVolume: 0 },
    focusCognitif: { src: `${BASE}MUSIC/wellness/roulements de piano.mp3`, initialVolume: 0 },
    entrance: { src: `${BASE}MUSIC/wellness/keysy.mp3`, initialVolume: 0 },
    rayon: { src: `${BASE}MUSIC/wellness/deep.mp3`, initialVolume: 0 },
    cabine: { src: `${BASE}MUSIC/wellness/less deep.mp3`, initialVolume: 0 },
    recuperation: { src: `${BASE}MUSIC/wellness/Instrumental (2).mp3`, initialVolume: 0 },
    motionPad: { src: `${BASE}MUSIC/wellness/Fender.mp3`, initialVolume: 0 },
};

// Per-track loudness compensation.
//
// Loudness is now fixed at the SOURCE: every wellness mp3 has been gain-adjusted
// on disk to a uniform -18 LUFS integrated loudness (see public/MUSIC/wellness;
// the pristine originals are kept in public/MUSIC/wellness/_pre-loudnorm/). They
// are all equal-loudness now, so they play at unity here — no more multiplying
// quiet files up (which amplified artifacts and forced the master to distort) and
// no more wild differences between tracks. Earlier attempts to balance this in
// code with peak- and then RMS-derived gains failed because neither matches
// perceived loudness; LUFS normalization of the files is the correct fix.
//
// The ONLY non-unity entries are the RETAIL stems reused inside wellness (the
// density-section stems, the gesture `strings`, the sculpting `crowd`). Those
// files are shared with retail mode, so we can't re-encode them — instead we trim
// them in code to the same -18 LUFS. Measured retail-stem loudness (LUFS) → gain:
//   1 Strings  -16.0 -> 0.80    2 Bass  -17.6 -> 0.95    3 Drums -16.0 -> 0.79
//   4 Keyboard -20.6 -> 1.35    Crowd   -14.7 -> 0.68
//
// Net result: no track exceeds ~0.8 at its section volume, the mix has real
// headroom, and the master soft-clip only ever touches the densest sums.
const LOUDNESS_GAIN = {
    // Wellness files — normalized to -18 LUFS on disk, so unity here.
    drone: 1.0,
    jungle: 1.0,
    pulsatingWave: 1.0,
    focusCognitif: 1.0,
    rayon: 1.0,
    cabine: 1.0,
    entrance: 1.0,
    recuperation: 1.0,
    motionPad: 1.0,
    // Retail stems reused in wellness — trimmed in code to the same -18 LUFS.
    strings: 0.8,
    bass: 0.95,
    drums: 0.79,
    keyboard: 1.35,
    crowd: 0.68,
};

// NOTE: the previous build seeked the drone to 55s on start, on the assumption
// that "01 Drone Wellness" was near-silent for its first ~50s. Measuring the
// file shows that's not true — it's fairly uniform (intro ~-22 dB vs body
// ~-18 dB, only ~4 dB), so the seek bought almost nothing while introducing a
// seek-immediately-after-play() race that could leave the drone stopped. The
// seek has been removed; the drone now simply plays from the top with its
// loudness gain applied on the `play` event (see startAllTracks).

// Smoothly move a Howl's Web Audio gain toward `target` over `durationMs` using a
// SAMPLE-ACCURATE scheduled ramp. This replaces an earlier approach that wrote
// node.gain.value ~60×/second from a requestAnimationFrame loop: each per-frame
// write is a tiny step discontinuity (a click), and across the constant zone /
// density crossfades that stacked into audible "grésille" while scrolling. A
// linearRampToValueAtTime is continuous at audio rate, so it never clicks.
//
// Because the files are now loudness-normalized, every effective volume is ≤ ~0.8,
// so we no longer need to push the node above 1.0 (which is what forced the old
// gain.value hack in the first place). We keep Howler's own _volume field in sync
// so mute() restores the right level, but we never call Howler's volume()/fade()
// here (those would schedule a competing ramp on the same node).
function rampGain(howlInstance, target, durationMs) {
    if (!howlInstance) return;
    const t = Math.max(0, target);
    const sound = howlInstance._sounds && howlInstance._sounds[0];
    const node = sound && sound._node;
    const ctx = Howler.ctx; // the live AudioContext (Howl instances don't expose _ctx)
    if (node && node.gain && ctx && typeof node.gain.linearRampToValueAtTime === 'function') {
        const now = ctx.currentTime;
        const from = node.gain.value;
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(from, now); // anchor at the current value (no jump)
        node.gain.linearRampToValueAtTime(t, now + Math.max(0.005, durationMs / 1000));
        howlInstance._volume = Math.min(1, t);
    } else if (node && node.gain) {
        node.gain.value = t;
    } else {
        howlInstance.volume(Math.min(1, t));
    }
}

// Instant-ish gain set (track's requested volume × its loudness gain), used at
// startup. A 15 ms ramp keeps even the first set click-free.
function applyGain(howlInstance, trackName, requestedVolume) {
    if (!howlInstance) return;
    const gain = ACTIVE_GAINS[trackName] ?? 1;
    rampGain(howlInstance, requestedVolume * gain, 15);
}

// --- Master soft-clip safety -------------------------------------------------
// A WaveShaper soft-clip on Howler's master bus is the final guard against the
// output ever hard-clipping. With the normalized files + LOUDNESS_GAIN above, no
// single track exceeds ~0.5 at its section volume, so this stage is fully
// transparent almost all the time; it only rounds the occasional correlated SUM
// peak (the 5-layer density stack, a vigorous webcam gesture over the bed). We use
// a soft-clip rather than a DynamicsCompressor on purpose: a compressor's envelope
// follows the bass-heavy drone within its own waveform period and adds gritty
// distortion / pumping. A static waveshaping curve has no time constant, so it
// never pumps and never distorts low frequencies by envelope tracking.
//
// CRITICAL: the curve must be smooth (C1-continuous) at the knee. An earlier
// version bent UPWARD just past the knee (slope jumped 1.0 → 1.34), and that kink
// injected harmonic distortion ("grésille") on any signal that reached it. The
// tanh soft-knee below is tangent to the unity line at the knee (slope exactly 1),
// then bends monotonically toward the ceiling — no kink. 4x oversampling keeps the
// curve from aliasing. Wired once; harmless to retail (it sits at unity there).
let masterSoftClipInstalled = false;
function makeSoftClipCurve() {
    const N = 2048;
    const curve = new Float32Array(N);
    const knee = 0.7; // |input| below this passes through at unity (transparent)
    for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * 2 - 1; // -1 .. 1
        const ax = Math.abs(x);
        if (ax <= knee) {
            curve[i] = x;
        } else {
            // tanh, tangent to y=x at the knee (slope 1 → no kink), asymptotic
            // toward ~0.93 at |input|=1; inputs beyond 1 clamp to that ceiling.
            const over = (ax - knee) / (1 - knee); // 0 .. 1 across the knee→1 region
            const shaped = knee + (1 - knee) * Math.tanh(over);
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
            // Sample-accurate scheduled ramp (no per-frame stepping → no clicks).
            // Safe to call repeatedly from the scroll handler: each call re-anchors
            // at the current value and ramps toward the latest target, so a moving
            // crossfade is followed smoothly.
            rampGain(howlInstance, targetVolume * gain, duration);
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
            const ctx = Howler.ctx;
            if (node && node.gain && ctx && typeof node.gain.setTargetAtTime === 'function') {
                // ~40 ms time constant: smooth but still responsive.
                node.gain.setTargetAtTime(desired, ctx.currentTime, 0.04);
                howlInstance._volume = Math.min(1, desired); // keep mute() coherent
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
