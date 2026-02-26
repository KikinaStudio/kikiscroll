import { Effect } from 'postprocessing';
import { Uniform } from 'three';

const fragmentShader = /* glsl */ `
  uniform float uGrainAmount;
  uniform float uGrainSpeed;
  uniform float uVignetteStrength;
  uniform float uVignetteOffset;
  uniform float uTime;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = inputColor;

    // Film grain
    float grain = hash(uv * 1000.0 + uTime * uGrainSpeed) - 0.5;
    color.rgb += grain * uGrainAmount;

    // Vignette
    vec2 center = uv - 0.5;
    float dist = length(center);
    float vignette = smoothstep(0.8 - uVignetteOffset, 0.8 + uVignetteStrength, dist);
    color.rgb = mix(color.rgb, color.rgb * 0.15, vignette);

    outputColor = color;
  }
`;

export class GrainVignetteEffect extends Effect {
  constructor({
    grainAmount = 0.06,
    grainSpeed = 60.0,
    vignetteStrength = 0.45,
    vignetteOffset = 0.35,
  } = {}) {
    super('GrainVignetteEffect', fragmentShader, {
      uniforms: new Map([
        ['uGrainAmount', new Uniform(grainAmount)],
        ['uGrainSpeed', new Uniform(grainSpeed)],
        ['uVignetteStrength', new Uniform(vignetteStrength)],
        ['uVignetteOffset', new Uniform(vignetteOffset)],
        ['uTime', new Uniform(0)],
      ]),
    });
  }

  update(_renderer, _inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += deltaTime;
  }
}
