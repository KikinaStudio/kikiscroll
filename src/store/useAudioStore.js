import { create } from 'zustand';
import { Howl } from 'howler';
import { parseUrlMode } from '../urlMode';

// Howler resolves relative paths against the current document URL, which breaks
// at sub-routes like /kikiscroll/wellness/en (audio would resolve to
// /kikiscroll/wellness/MUSIC/... instead of /kikiscroll/MUSIC/...). Always use
// the Vite base prefix so the URL is absolute regardless of the page route.
const BASE = import.meta.env.BASE_URL;

// Retail track list — exact match with /public/MUSIC/
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
    happy: { src: `${BASE}MUSIC/HAPPY.mp3`, initialVolume: 0 },
    sad: { src: `${BASE}MUSIC/SAD.mp3`, initialVolume: 0 },
    entrance: { src: `${BASE}MUSIC/Synthwave_1.mp3`, initialVolume: 0 },
    rayon: { src: `${BASE}MUSIC/Rap_1.mp3`, initialVolume: 0 },
    cabine: { src: `${BASE}MUSIC/Bossa.mp3`, initialVolume: 0 },
};

// Wellness track list — wellness reuses the retail audio set for now; replace
// individual entries once bespoke wellness pieces are delivered. `recuperation`
// is the only wellness-specific slot (4th zone), and currently points to the
// same source as `cabine` so all 4 wellness zones have audio.
// Section 2 ("One signature, many spaces") plays one continuous wellness piece.
// We DON'T reuse the same file across the 4 zone tracks because 4 Howl instances
// playing the same file would never crossfade perfectly in sync (fadeTrack has
// 150ms easing per call, so during transitions the sum of volumes briefly drifts
// above 0.6 = audible overlap). Instead we use a single dedicated track
// `wellnessSignature` and skip the per-zone crossfade entirely in section 2.
const WELLNESS_TRACKS = {
    ...RETAIL_TRACKS,
    // Keep the original 4 zone slots in the dictionary so any retail code path
    // that touches them stays safe (volumes stay at 0 in wellness mode).
    recuperation: { src: `${BASE}MUSIC/Bossa.mp3`, initialVolume: 0 },
    // The actual wellness section 2 signature, played continuously.
    wellnessSignature: { src: `${BASE}MUSIC/wellness/Instrumental-FX.wav`, initialVolume: 0 },
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
