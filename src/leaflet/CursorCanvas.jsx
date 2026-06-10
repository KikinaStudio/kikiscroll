import { useEffect, useRef } from 'react';

// Spring-trail mouse canvas, adapted from the 21st.dev "canvas" component
// (aliimam / designali-in). A bundle of lines whose head node spring-follows
// the pointer while every later node follows the one before it, drawn with an
// additive ("lighter") composite so the overlapping strands glow.
//
// Two changes from the original besides the React lifecycle wrapper:
//   - the hue oscillator is retuned from the purple band (offset 285) to the
//     warm copper/gold band so the trail sits with the Kikina wellness palette
//     (sand / peach / rose) instead of fighting it;
//   - listeners and the rAF loop are torn down on unmount, and the trail only
//     boots on the first real pointer move (the original behaved the same).
const CONFIG = {
    trails: 40,
    size: 50,
    friction: 0.5,
    dampening: 0.025,
    tension: 0.99,
    lineWidth: 8,
    // hue drifts inside 18..46 — copper to gold
    hueOffset: 32,
    hueAmplitude: 14,
    hueFrequency: 0.0015,
};

class Oscillator {
    constructor({ phase = 0, offset = 0, frequency = 0.001, amplitude = 1 }) {
        this.phase = phase;
        this.offset = offset;
        this.frequency = frequency;
        this.amplitude = amplitude;
    }
    update() {
        this.phase += this.frequency;
        return this.offset + Math.sin(this.phase) * this.amplitude;
    }
}

class TrailNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
    }
}

class TrailLine {
    constructor(spring, pos) {
        this.spring = spring + 0.1 * Math.random() - 0.05;
        this.friction = CONFIG.friction + 0.01 * Math.random() - 0.005;
        this.nodes = Array.from({ length: CONFIG.size }, () => new TrailNode(pos.x, pos.y));
    }
    update(pos) {
        let spring = this.spring;
        const head = this.nodes[0];
        head.vx += (pos.x - head.x) * spring;
        head.vy += (pos.y - head.y) * spring;
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (i > 0) {
                const prev = this.nodes[i - 1];
                node.vx += (prev.x - node.x) * spring;
                node.vy += (prev.y - node.y) * spring;
                node.vx += prev.vx * CONFIG.dampening;
                node.vy += prev.vy * CONFIG.dampening;
            }
            node.vx *= this.friction;
            node.vy *= this.friction;
            node.x += node.vx;
            node.y += node.vy;
            spring *= CONFIG.tension;
        }
    }
    draw(ctx) {
        let x = this.nodes[0].x;
        let y = this.nodes[0].y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let i = 1;
        for (; i < this.nodes.length - 2; i++) {
            const a = this.nodes[i];
            const b = this.nodes[i + 1];
            x = 0.5 * (a.x + b.x);
            y = 0.5 * (a.y + b.y);
            ctx.quadraticCurveTo(a.x, a.y, x, y);
        }
        const a = this.nodes[i];
        const b = this.nodes[i + 1];
        ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        ctx.stroke();
        ctx.closePath();
    }
}

export default function CursorCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const hue = new Oscillator({
            phase: Math.random() * 2 * Math.PI,
            offset: CONFIG.hueOffset,
            amplitude: CONFIG.hueAmplitude,
            frequency: CONFIG.hueFrequency,
        });
        let lines = [];
        let rafId = 0;
        let running = true;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const render = () => {
            if (!running) return;
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (lines.length) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${Math.round(hue.update())}, 85%, 55%, 0.028)`;
                ctx.lineWidth = CONFIG.lineWidth;
                for (const line of lines) {
                    line.update(pos);
                    line.draw(ctx);
                }
            }
            rafId = requestAnimationFrame(render);
        };

        const readPointer = (e) => {
            if (e.touches && e.touches.length) {
                pos.x = e.touches[0].pageX;
                pos.y = e.touches[0].pageY;
            } else {
                pos.x = e.clientX;
                pos.y = e.clientY;
            }
        };

        const onMove = (e) => {
            readPointer(e);
            if (!lines.length) {
                lines = Array.from(
                    { length: CONFIG.trails },
                    (_, i) => new TrailLine(0.45 + (i / CONFIG.trails) * 0.025, pos)
                );
            }
        };

        resize();
        rafId = requestAnimationFrame(render);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchstart', onMove, { passive: true });
        window.addEventListener('resize', resize);

        return () => {
            running = false;
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchstart', onMove);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="leaflet-cursor-canvas" aria-hidden="true" />;
}
