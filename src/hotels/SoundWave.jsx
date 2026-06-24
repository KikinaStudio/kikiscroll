import { useEffect, useRef } from 'react';

// Generative sound wave — the page's "fil sonore vivant".
// Layered sine waves whose phases drift slowly and independently, drawn with an
// additive composite in the warm gold accent so overlapping strands glow.
// Nothing here touches layout: it paints a <canvas> sized to its box.
//
// Behaviour, per the brief:
//   - moves slowly and continuously (transform/opacity-free, just canvas paint);
//   - pauses when scrolled offscreen (IntersectionObserver) to keep 60fps;
//   - prefers-reduced-motion → draws a single static frame, no rAF loop.
//
// Props:
//   lines       number of stacked waves (default 5)
//   amplitude   peak height as a fraction of canvas height (default 0.16)
//   speed       phase drift per frame (default 0.006)
//   accent      stroke hue [h,s,l] (default warm gold)
//   alpha       per-line stroke alpha (default 0.5)
//   className   forwarded to the canvas element
export default function SoundWave({
    lines = 5,
    amplitude = 0.16,
    speed = 0.006,
    accent = [40, 55, 62],
    alpha = 0.5,
    className = '',
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        let rafId = 0;
        let running = false;

        // Per-line generative parameters: each wave has its own frequency,
        // phase, vertical offset and a slow secondary modulation so the bundle
        // never reads as a single repeating shape.
        const waves = Array.from({ length: lines }, (_, i) => ({
            phase: (i / lines) * Math.PI * 2,
            freq: 1.1 + i * 0.55,
            offset: (i / Math.max(1, lines - 1) - 0.5) * 0.5,
            modPhase: i * 1.7,
            modFreq: 0.4 + i * 0.12,
            ampScale: 1 - i * 0.08,
            drift: speed * (0.7 + i * 0.12),
        }));

        const [hue, sat, light] = accent;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = Math.max(1, h * 0.004);
            const mid = h / 2;
            const step = Math.max(6, Math.floor(w / 90));

            for (const wave of waves) {
                ctx.beginPath();
                for (let x = 0; x <= w; x += step) {
                    const t = x / w;
                    const mod = 0.65 + 0.35 * Math.sin(t * Math.PI * wave.modFreq + wave.modPhase);
                    const y =
                        mid +
                        wave.offset * h +
                        Math.sin(t * Math.PI * 2 * wave.freq + wave.phase) *
                            amplitude *
                            h *
                            wave.ampScale *
                            mod;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
                ctx.stroke();
            }
        };

        const tick = () => {
            if (!running) return;
            for (const wave of waves) {
                wave.phase += wave.drift;
                wave.modPhase += wave.drift * 0.5;
            }
            draw();
            rafId = requestAnimationFrame(tick);
        };

        const start = () => {
            if (running || reduce) return;
            running = true;
            rafId = requestAnimationFrame(tick);
        };
        const stop = () => {
            running = false;
            cancelAnimationFrame(rafId);
        };

        resize();
        draw(); // first static frame (also the only frame under reduced motion)

        // Pause painting while the canvas is scrolled out of view.
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) start();
                else stop();
            },
            { threshold: 0 }
        );
        io.observe(canvas);

        const onResize = () => {
            resize();
            draw();
        };
        window.addEventListener('resize', onResize);

        return () => {
            stop();
            io.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [lines, amplitude, speed, accent, alpha]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
