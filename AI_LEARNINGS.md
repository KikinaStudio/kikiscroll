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

## Audio loudness & dynamics (2026-06 audio overhaul)

The wellness mp3 pack was unevenly mastered and the cause of "no drone", "ça
sature / frétille" and "very different volumes between tracks". Lessons:

- **Equalize by LUFS, not peak or RMS.** Peak says nothing about perceived
  volume; RMS is closer but still wrong (it's not K-weighted). Two tracks at the
  same RMS can sound very different. Measure integrated loudness with
  `ffmpeg -i f -af loudnorm=print_format=json -f null -` (`input_i`) and gain each
  file so it matches a common target (we use **-18 LUFS**).
- **Loudness equality is not enough — check the loudness RANGE (LRA).** These
  ambient files had LRA 11–17 LU: long near-silent passages and loud swells. Even
  at equal integrated loudness, at any instant two looping tracks sit at very
  different points in their envelopes (measured 25–60 dB apart). That *is* the
  "volume difference between tracks" a listener hears. Fix = dynamic leveling
  (`ffmpeg -af dynaudnorm=f=200:g=13:m=8:s=6:p=0.9`) to bring LRA to ~5–7, then a
  final `volume=NdB` pass to land back on -18 LUFS. Pristine originals are kept in
  `.audio-backup/` (gitignored) so the leveling amount can be retuned.
- A pure `volume=NdB` gain (no dynamic processing) is the cleanest loudness match
  when the files have peak headroom — it preserves loops and character exactly.
  Use `loudnorm`/`dynaudnorm` only when you also need range control.
- Re-encode mp3→mp3 at `-b:a 192k -ar 44100`. Verify with a second loudnorm pass.

## Web Audio gain automation (avoid clicks / "grésille")

- **Never set `node.gain.value` from a requestAnimationFrame loop.** Each per-frame
  write is a step discontinuity = a click; across continuous crossfades it stacks
  into audible crackle while scrolling. Use **scheduled, sample-accurate** ramps:
  `cancelScheduledValues(now)` → `setValueAtTime(current, now)` →
  `linearRampToValueAtTime(target, now + dur)`. For per-frame drivers (the gesture
  loop) use `setTargetAtTime(target, now, ~0.04)` (one-pole glide).
- **Howler `Howl` instances do NOT expose `_ctx`.** Code that guarded smoothing on
  `howlInstance._ctx` silently fell back to instant writes (the "smooth" path never
  ran). Use the global **`Howler.ctx`** for `currentTime`.
- When ramping the gain node directly (bypassing Howler's `volume()`), keep
  `howlInstance._volume` in sync manually so `mute()`/`unmute()` restore the right
  level. Don't call Howler's `volume()`/`fade()` in the same path — they schedule a
  competing ramp on the same node.
- Gains can stay ≤ 1.0 once files are normalized, so none of the old "push the gain
  node above 1.0 to fight Howler's clamp" hacks are needed.

## Master soft-clip safety (WaveShaper)

- A `WaveShaperNode` spliced between `Howler.masterGain` and `ctx.destination`
  catches summed peaks so the output never hard-clips. Use it instead of a
  `DynamicsCompressor`: a compressor's envelope tracks the bass-heavy drone within
  its own waveform period and adds gritty pumping; a static curve has no time
  constant.
- **The curve must be C1-continuous (smooth slope) at the knee.** A first version
  bent upward just past the knee (slope jumped 1.0 → 1.34) and that kink injected
  harmonic distortion on every peak that reached it. Correct soft-knee:
  `y = knee + (1-knee)*tanh((|x|-knee)/(1-knee))` for `|x| > knee` (tangent to
  unity at the knee, slope ≤ 1 above). Set `oversample = '4x'` to avoid aliasing.
- Exposed as `Howler.__kikiMasterSoftClip` for live inspection.

## Motion detection (gesture section, webcam)

- A naive luminance frame-diff reads webcam **auto-exposure / white-balance** drift
  (the whole frame brightening at once) as a huge burst of motion → random, twitchy
  response. **Reject the global component**: subtract the mean signed delta across
  the frame, so only LOCAL change survives the threshold. Verified: a +25 whole-
  frame shift → intensity 0.0; a real local gesture → proportional.
- Count the **fraction of moving pixels** (steadier) rather than summing raw diffs
  (a few bright edges dominate). Smooth asymmetrically (fast attack, slow release)
  and gate small values so it sits clean on the bed when still.

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
