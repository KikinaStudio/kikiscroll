import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../LanguageContext';

// Full-screen black intro shown before the scroll experience. Three lines fade in
// sequentially, a slow-pulsing arrow invites the visitor to scroll. The FIRST user
// interaction (wheel / touch / key / pointer) begins the experience: it calls
// onBegin synchronously inside the gesture handler — which is required for the
// Web Audio context to start — then fades the screen out and unmounts itself.
export default function IntroScreen({ onBegin }) {
    const { t } = useTranslation();
    const [leaving, setLeaving] = useState(false);
    const [hidden, setHidden] = useState(false);
    const startedRef = useRef(false);

    useEffect(() => {
        if (hidden) return undefined;
        const begin = () => {
            if (startedRef.current) return;
            startedRef.current = true;
            onBegin();              // startAllTracks (audio gesture) + setHasStarted
            setLeaving(true);       // fade out + drop the arrow
            window.setTimeout(() => setHidden(true), 900); // unmount after the fade
        };
        const passive = { passive: true };
        window.addEventListener('wheel', begin, passive);
        window.addEventListener('touchstart', begin, passive);
        window.addEventListener('keydown', begin);
        window.addEventListener('pointerdown', begin);
        return () => {
            window.removeEventListener('wheel', begin, passive);
            window.removeEventListener('touchstart', begin, passive);
            window.removeEventListener('keydown', begin);
            window.removeEventListener('pointerdown', begin);
        };
    }, [onBegin, hidden]);

    if (hidden) return null;

    return (
        <div className={`intro-screen${leaving ? ' intro-screen--leaving' : ''}`} role="presentation">
            <div className="intro-screen__lines">
                <p className="intro-line intro-line--1">{t.intro_line_1}</p>
                <p className="intro-line intro-line--2">{t.intro_line_2}</p>
                <p className="intro-line intro-line--3">{t.intro_line_3}</p>
            </div>
            {!leaving && (
                <div className="intro-arrow" aria-hidden="true">
                    <svg width="22" height="34" viewBox="0 0 22 34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 2v26" />
                        <path d="M3 21l8 8 8-8" />
                    </svg>
                </div>
            )}
        </div>
    );
}
