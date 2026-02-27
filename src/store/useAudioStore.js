import { create } from 'zustand';
import { Howl } from 'howler';

// Track list exact match with /public/MUSIC/
const TRACKS = {
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
};

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

        stopAllTracks: () => {
            const { tracks } = get();
            Object.values(tracks).forEach(howl => howl.stop());
            set({ isPlaying: false });
        }
    };
});
