import { useState } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export default function Overlay({ onStart }) {
    const [isFading, setIsFading] = useState(false);
    const startAllTracks = useAudioStore((state) => state.startAllTracks);

    const handleStart = () => {
        setIsFading(true);
        startAllTracks();

        // Wait for CSS fade out transition before removing from DOM
        setTimeout(() => {
            if (onStart) onStart();
        }, 1200);
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-tenbin-black transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
            <h1 className="text-5xl md:text-8xl font-heading tracking-tight text-white mb-4">KIKINA LAB</h1>
            <p className="text-lg md:text-xl font-sans text-tenbin-gray mb-12 tracking-wide font-light text-center px-4">
                At the crossroads of science, sound, and storytelling.
            </p>
            <button
                onClick={handleStart}
                className="group relative px-10 py-5 overflow-hidden rounded-full bg-tenbin-dark border border-tenbin-gray/30 hover:border-white/60 transition-all duration-500 cursor-pointer"
            >
                {/* Background glow effect on hover */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <span className="relative z-10 font-sans text-sm md:text-base font-semibold tracking-widest text-tenbin-offwhite group-hover:text-white transition-colors uppercase">
                    Vivre l'expérience sonore
                </span>
            </button>
        </div>
    );
}
