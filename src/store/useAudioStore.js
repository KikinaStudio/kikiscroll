import { create } from 'zustand';
import { Howl } from 'howler';
import { parseUrlMode } from '../urlMode';

// Retail track list — exact match with /public/MUSIC/
const RETAIL_TRACKS = {
    drone: { src: 'MUSIC/0 Drone.mp3', initialVolume: 0.5 },
    strings: { src: 'MUSIC/1 Strings.mp3', initialVolume: 0 },
    bass: { src: 'MUSIC/2 Bass.mp3', initialVolume: 0 },
    drums: { src: 'MUSIC/3 Drums.mp3', initialVolume: 0 },
    keyboard: { src: 'MUSIC/4 Keyboard.mp3', initialVolume: 0 },
    crowd: { src: 'MUSIC/Crowd.mp3', initialVolume: 0 },
    jungle: { src: 'MUSIC/Jungle.mp3', initialVolume: 0 },
    pulsatingWave: { src: 'MUSIC/Pulsating Wave.mp3', initialVolume: 0 },
    focusCognitif: { src: 'MUSIC/Focus Cognitif.mp3', initialVolume: 0 },
    happy: { src: 'MUSIC/HAPPY.mp3', initialVolume: 0 },
    sad: { src: 'MUSIC/SAD.mp3', initialVolume: 0 },
    entrance: { src: 'MUSIC/Synthwave_1.mp3', initialVolume: 0 },
    rayon: { src: 'MUSIC/Rap_1.mp3', initialVolume: 0 },
    cabine: { src: 'MUSIC/Bossa.mp3', initialVolume: 0 },
};

// Wellness track list — files in /public/MUSIC/wellness/.
// Tracks marked TODO currently fall back to the retail file so audio plays in wellness mode
// before bespoke wellness assets exist. Swap the path when each new piece is delivered.
const WELLNESS_TRACKS = {
    drone: { src: 'MUSIC/0 Drone.mp3', initialVolume: 0.5 },
    strings: { src: 'MUSIC/1 Strings.mp3', initialVolume: 0 }, // TODO: replace with wellness stem
    bass: { src: 'MUSIC/2 Bass.mp3', initialVolume: 0 },       // TODO: replace with wellness stem
    drums: { src: 'MUSIC/3 Drums.mp3', initialVolume: 0 },     // TODO: replace with wellness stem
    keyboard: { src: 'MUSIC/4 Keyboard.mp3', initialVolume: 0 }, // TODO: replace with wellness stem
    crowd: { src: 'MUSIC/Crowd.mp3', initialVolume: 0 },
    jungle: { src: 'MUSIC/Jungle.mp3', initialVolume: 0 },     // TODO: replace with wellness Relaxation track
    pulsatingWave: { src: 'MUSIC/Pulsating Wave.mp3', initialVolume: 0 },
    focusCognitif: { src: 'MUSIC/Focus Cognitif.mp3', initialVolume: 0 },
    happy: { src: 'MUSIC/HAPPY.mp3', initialVolume: 0 },       // TODO: validate or replace for wellness
    sad: { src: 'MUSIC/SAD.mp3', initialVolume: 0 },           // TODO: validate or replace for wellness
    entrance: { src: 'MUSIC/Synthwave_1.mp3', initialVolume: 0 }, // TODO: replace with MUSIC/wellness/Seuil.mp3 (Accueil & transitions)
    rayon: { src: 'MUSIC/Rap_1.mp3', initialVolume: 0 },       // TODO: replace with MUSIC/wellness/Enveloppe.mp3 (Rituels de chaleur)
    cabine: { src: 'MUSIC/Bossa.mp3', initialVolume: 0 },      // TODO: replace with MUSIC/wellness/Geste.mp3 (Cabines de soin)
    recuperation: { src: 'MUSIC/Bossa.mp3', initialVolume: 0 }, // TODO: replace with MUSIC/wellness/Empreinte.mp3 (Espaces de récupération)
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
