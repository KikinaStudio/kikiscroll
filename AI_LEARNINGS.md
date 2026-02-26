# AI Learnings Log

## WebGL Context Loss

- **Cause**: `@react-three/postprocessing` `Noise` effect caused infinite GPU loop → context loss → black screen.
- **Fix**: Removed `EffectComposer` + `Noise`. Don't re-add `Noise` without testing on a simple scene first.
- **Note**: A transient `Context Lost` warning still appears occasionally but recovers. Monitor for stability.

## Lenis + GSAP ScrollTrigger Integration

- Must sync Lenis with GSAP: `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(time => lenis.raf(time * 1000))`.
- Call `gsap.ticker.lagSmoothing(0)` to prevent GSAP from throttling Lenis.
- **Pinning**: Use `ScrollTrigger.create({ pin: true, pinSpacing: true })` on `.pin-section` elements.
- **Per-section progress**: Use `onUpdate: (self) => setSectionProgress(self.progress)` to get 0→1 within each pinned section.

## Howler.js Synchronization

- All tracks must be started in a single synchronous loop for playhead sync.
- Use `html5: false` (Web Audio API) for tighter sync.
- Use `.fade(from, to, duration)` to change volume without touching playhead.
- Browser requires user interaction before AudioContext can start → use an Overlay with a Start button.

## CustomShaderMaterial Dynamic Properties

- You CAN dynamically update `color`, `roughness`, `transmission` etc. on `CustomShaderMaterial` via a ref (`matRef.current.color.copy(...)`, `matRef.current.roughness = ...`).
- Use frame-rate-independent lerp: `1 - Math.pow(0.001, delta)` for smooth transitions.
- Add extra uniforms (e.g. `uDeform`) to control shader-side deformation independently.

## Tailwind + Vite

- After modifying `tailwind.config.js`, you MUST restart the Vite dev server for changes to take effect.
- Use `theme('colors.tenbin.black')` in CSS `@layer base` for Tailwind-resolved values.

## @react-three/postprocessing Version Compatibility

- **v3.x requires React 19 + @react-three/fiber 9**. Using it with React 18 + fiber 8 causes silent WebGL Context Lost.
- **v2.16.3 is the correct version for React 18 + fiber 8** stacks.
- Must also add `resolve.dedupe: ['three']` to `vite.config.js` to prevent multiple Three.js instances.
- Use `multisampling={0}` on `<EffectComposer>` for performance.
- Use `BlendFunction.SOFT_LIGHT` for Noise instead of default to avoid GPU loops.
- `Bloom` with `luminanceThreshold={1}` only catches very bright highlights (good for subtle glow).

## Vertex Shader MorphIntensity

- The base `morphIntensity` in `vertexShader` is `0.5 + uScroll*2 + uDeform*1.5`.
- To make blob near-round, set `targetDeform = -0.3` (counteracts the 0.5 base).
- Adding a new section shifts ALL section indices — update `useScrollAudio`, `Scene.jsx` OrganicBlob, AND `onEnter`/`onLeaveBack` callbacks in App.jsx.
