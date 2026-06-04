import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import GrainVignette from './GrainVignette';
import { parseUrlMode } from '../urlMode';

import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';

// Mode is parsed from URL at module load — same pattern as useAudioStore.
// Avoids React context propagation questions inside the R3F Canvas root.
const { mode: SCENE_MODE } = parseUrlMode();
const IS_WELLNESS = SCENE_MODE === 'wellness';

// --- Shaders ---
const vertexShader = `
  uniform float uTime;
  uniform float uScroll;
  uniform float uDeform;
  
  // Simplex 3D Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    float noise1 = snoise(position * 0.8 + uTime * 0.4);
    float noise2 = snoise(position * 1.5 - uTime * 0.8) * 0.5;
    
    float morphIntensity = 0.5 + (uScroll * 2.0) + (uDeform * 1.5); 
    float displacement = (noise1 + noise2) * morphIntensity;
    
    vec3 newPos = position + normal * displacement * 0.5;
    newPos.y *= 1.2 + uScroll * 0.5;
    
    csm_Position = newPos;
  }
`;

// Section 2 (Zones) - 3 zones: Entrée, Rayon, Cabine
const ZONES_ENVS = [
    { scale: 1.2, roughness: 0.8, transmission: 0.0, color: new THREE.Color('#a0b8c8'), rotSpeed: 0.02 },
    { scale: 1.0, roughness: 0.4, transmission: 0.0, color: new THREE.Color('#c8a060'), rotSpeed: 0.08 },
    { scale: 0.8, roughness: 0.1, transmission: 0.6, color: new THREE.Color('#c0a0b8'), rotSpeed: 0.03 },
];

// Wellness mode: light spa-luxe palette — pierre polie / nacre / cire chaude.
// Blob doit lire comme un objet calme et lumineux, jamais sombre.
const WELLNESS_ZONES_ENVS = [
    { roughness: 0.55, transmission: 0.15, color: new THREE.Color('#f0dbc4'), rotSpeed: 0.02 }, // seuil — nacre crème
    { roughness: 0.40, transmission: 0.25, color: new THREE.Color('#e8b8a0'), rotSpeed: 0.06 }, // enveloppe — pêche chaud
    { roughness: 0.25, transmission: 0.45, color: new THREE.Color('#e2c0b0'), rotSpeed: 0.03 }, // geste — rose pâle
    { roughness: 0.15, transmission: 0.60, color: new THREE.Color('#faecd8'), rotSpeed: 0.02 }, // empreinte — ivoire translucide
];

// Tonalités pierre polie / rose quartz / onyx chaud — assez saturées pour rester
// visibles sur fond sable, assez douces pour évoquer le calme.
const WELLNESS_INTRO_COLOR         = new THREE.Color('#c89484'); // rose quartz mat
const WELLNESS_NEUTRAL_COLOR       = new THREE.Color('#b8806c'); // pierre chaude
const WELLNESS_NEURO_COLOR         = new THREE.Color('#c08878'); // onyx rosé
const WELLNESS_DENSITY_COLOR       = new THREE.Color('#a87060'); // pierre profonde
const WELLNESS_ISOLATION_ON_COLOR  = new THREE.Color('#d8a890'); // calcaire chaud apaisé
const WELLNESS_ISOLATION_OFF_COLOR = new THREE.Color('#a86c5c'); // terre cuite plus présente

// Section 3 (Scénographie) environment configs: jungle, thunderstorm, sea
const SEC2_ENVS = [
    { roughness: 0.8, transmission: 0.0, color: new THREE.Color('#1a3a1a') },
    { roughness: 0.5, transmission: 0.2, color: new THREE.Color('#2a1a3a') },
    { roughness: 0.1, transmission: 0.6, color: new THREE.Color('#0a2a3a') },
];

// Density blob positions: 5 blobs on a circle (top-down, pentagonal layout)
const DENSITY_POSITIONS = [
    [3, 0, 0],                                          // 0° (East)
    [3 * Math.cos(2 * Math.PI / 5), 0, 3 * Math.sin(2 * Math.PI / 5)],   // 72°
    [3 * Math.cos(4 * Math.PI / 5), 0, 3 * Math.sin(4 * Math.PI / 5)],   // 144°
    [3 * Math.cos(6 * Math.PI / 5), 0, 3 * Math.sin(6 * Math.PI / 5)],   // 216°
    [3 * Math.cos(8 * Math.PI / 5), 0, 3 * Math.sin(8 * Math.PI / 5)],   // 288°
];

const DENSITY_SCALES = [0.65, 0.5, 0.45, 0.4, 0.38];

// --- Components ---

/**
 * CameraController - smoothly transitions camera based on active section.
 * Section 4 (Density): moves to a high, almost top-down orbit to see the 5 blobs in pentagon.
 */
function CameraController({ isDensitySection, sectionProgress }) {
    useFrame((state, delta) => {
        const cam = state.camera;
        const lerpSpeed = 1 - Math.pow(0.01, delta);

        let targetPos, targetLookAt;

        if (isDensitySection) {
            // Density: almost top-down view on the circle
            const t = Math.min(sectionProgress, 1);
            const height = THREE.MathUtils.lerp(6, 9, t);
            targetPos = new THREE.Vector3(0, height, 0.01);
            targetLookAt = new THREE.Vector3(0, 0, 0);
        } else {
            // Default camera - far enough to see the whole blob
            targetPos = new THREE.Vector3(0, 0, 12);
            targetLookAt = new THREE.Vector3(0, 0, 0);
        }

        cam.position.lerp(targetPos, lerpSpeed);

        // Smooth lookAt via quaternion slerp
        const dummyCam = cam.clone();
        dummyCam.position.copy(cam.position);
        dummyCam.lookAt(targetLookAt);
        cam.quaternion.slerp(dummyCam.quaternion, lerpSpeed);
    });

    return null;
}

/**
 * OrganicBlob - single blob instance.
 */
function OrganicBlob({ scrollProgress, activeSection, sectionProgress, isIsolationActive, position: pos, scale, blobIndex = 0, isDensityClone = false }) {
    const meshRef = useRef();
    const matRef = useRef();
    const isWellness = IS_WELLNESS;

    const lerpedColor = useRef(new THREE.Color(isWellness ? '#3a2820' : '#0a0a0a'));
    const lerpedRoughness = useRef(0.2);
    const lerpedTransmission = useRef(0.0);
    const lerpedDeform = useRef(0.0);
    const lerpedRotSpeed = useRef(0.1);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uDeform: { value: 0 },
    }), []);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const rotOffset = blobIndex * 0.7;
            meshRef.current.rotation.y += lerpedRotSpeed.current * delta + rotOffset * 0.001;
            meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2 + rotOffset) * 0.2;
            meshRef.current.position.y = (pos ? pos[1] : 0) + Math.sin(state.clock.elapsedTime * 0.5 + rotOffset) * 0.3;
        }
        uniforms.uTime.value = state.clock.elapsedTime + blobIndex * 3;

        // Make Density section calmer by removing global scroll influence on the shader
        let shaderScroll = scrollProgress || 0;
        if (activeSection === 5) {
            shaderScroll = 0;
        }
        uniforms.uScroll.value = THREE.MathUtils.lerp(uniforms.uScroll.value, shaderScroll, 0.1);

        let targetColor = new THREE.Color('#0a0a0a');
        let targetRoughness = 0.2;
        let targetTransmission = 0.0;
        let targetDeform = 0.0;
        let targetRotSpeed = 0.1;
        const lerpSpeed = 1 - Math.pow(0.001, delta);

        if (isDensityClone) {
            targetColor.set('#0a0a0a');
            targetDeform = -0.25;
            targetRoughness = 0.15;
            targetRotSpeed = 0.04 + blobIndex * 0.015;
        } else {
            // SECTION INDICES: 0=Intro, 1=Isolation, 2=Zones, 3=Scénographie, 4=Neuro, 5=Density
            if (activeSection === 0) {
                // Intro: near-round, dark, slow rotation
                targetColor.set('#0a0a0a');
                targetDeform = -0.3;
                targetRoughness = 0.15;
                targetRotSpeed = 0.05;
            } else if (activeSection === 2) {
                // Zones: 3 zones with interpolated env
                if (sectionProgress < 0.33) {
                    const t = sectionProgress / 0.33;
                    targetColor = ZONES_ENVS[0].color.clone();
                    targetRoughness = ZONES_ENVS[0].roughness;
                    targetTransmission = ZONES_ENVS[0].transmission;
                    targetRotSpeed = ZONES_ENVS[0].rotSpeed;
                    targetDeform = 0.2;
                } else if (sectionProgress < 0.66) {
                    const t = (sectionProgress - 0.33) / 0.33;
                    targetColor = ZONES_ENVS[0].color.clone().lerp(ZONES_ENVS[1].color, t);
                    targetRoughness = THREE.MathUtils.lerp(ZONES_ENVS[0].roughness, ZONES_ENVS[1].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(ZONES_ENVS[0].transmission, ZONES_ENVS[1].transmission, t);
                    targetRotSpeed = THREE.MathUtils.lerp(ZONES_ENVS[0].rotSpeed, ZONES_ENVS[1].rotSpeed, t);
                    targetDeform = 0.2 + t * 0.2;
                } else {
                    const t = (sectionProgress - 0.66) / 0.34;
                    targetColor = ZONES_ENVS[1].color.clone().lerp(ZONES_ENVS[2].color, t);
                    targetRoughness = THREE.MathUtils.lerp(ZONES_ENVS[1].roughness, ZONES_ENVS[2].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(ZONES_ENVS[1].transmission, ZONES_ENVS[2].transmission, t);
                    targetRotSpeed = THREE.MathUtils.lerp(ZONES_ENVS[1].rotSpeed, ZONES_ENVS[2].rotSpeed, t);
                    targetDeform = 0.4 + t * 0.3;
                }
            } else if (activeSection === 1) {
                // Isolation: blob changes behavior when isolation activates
                if (isIsolationActive) {
                    targetColor.set('#1a1a2a');
                    targetDeform = -0.1;
                    targetRoughness = 0.05;
                    targetTransmission = 0.3;
                    targetRotSpeed = 0.02;
                } else {
                    targetColor.set('#1a0a0a');
                    targetDeform = 0.8;
                    targetRoughness = 0.4;
                    targetRotSpeed = 0.4;
                }
            } else if (activeSection === 3) {
                // Scénographie: interpolate 3 environments
                if (sectionProgress < 0.33) {
                    targetColor = SEC2_ENVS[0].color.clone();
                    targetRoughness = SEC2_ENVS[0].roughness;
                    targetTransmission = SEC2_ENVS[0].transmission;
                    targetDeform = 0.3 + (sectionProgress / 0.33) * 0.5;
                } else if (sectionProgress < 0.66) {
                    const t = (sectionProgress - 0.33) / 0.33;
                    targetColor = SEC2_ENVS[0].color.clone().lerp(SEC2_ENVS[1].color, t);
                    targetRoughness = THREE.MathUtils.lerp(SEC2_ENVS[0].roughness, SEC2_ENVS[1].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(SEC2_ENVS[0].transmission, SEC2_ENVS[1].transmission, t);
                    targetDeform = 0.8 + t * 0.4;
                } else {
                    const t = (sectionProgress - 0.66) / 0.34;
                    targetColor = SEC2_ENVS[1].color.clone().lerp(SEC2_ENVS[2].color, t);
                    targetRoughness = THREE.MathUtils.lerp(SEC2_ENVS[1].roughness, SEC2_ENVS[2].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(SEC2_ENVS[1].transmission, SEC2_ENVS[2].transmission, t);
                    targetDeform = 1.2 + t * 0.8;
                }
            } else if (activeSection === 4) {
                // Neuro: calm, deep, meditative
                targetColor.set('#0a0a1a');
                targetDeform = 0.1;
                targetRoughness = 0.1;
                targetTransmission = 0.4;
                targetRotSpeed = 0.03;
            } else if (activeSection === 5) {
                // Density: quasi-spherical, smooth
                targetColor.set('#0a0a0a');
                targetDeform = -0.25;
                targetRoughness = 0.15;
                targetRotSpeed = 0.08;
            } else {
                targetColor.set('#0a0a0a');
                targetDeform = 0.2;
                targetRoughness = 0.15;
            }
        }

        // Wellness override: warm palette across sections, 4-zone interpolation in section 2.
        // Color/material params are remapped; deform/scale logic kept intact so each section
        // keeps its visual personality.
        if (isWellness) {
            if (isDensityClone) {
                targetColor = WELLNESS_DENSITY_COLOR.clone();
                targetTransmission = 0.05;
            } else if (activeSection === 0) {
                targetColor = WELLNESS_INTRO_COLOR.clone();
                targetTransmission = 0.0;  // intro = pierre brute mate, pas de translucence
            } else if (activeSection === 1) {
                targetColor = (isIsolationActive ? WELLNESS_ISOLATION_ON_COLOR : WELLNESS_ISOLATION_OFF_COLOR).clone();
                targetTransmission = isIsolationActive ? 0.15 : 0.0;
            } else if (activeSection === 2) {
                // Quarters: seuil → enveloppe → geste → empreinte
                if (sectionProgress < 0.25) {
                    targetColor = WELLNESS_ZONES_ENVS[0].color.clone();
                    targetRoughness = WELLNESS_ZONES_ENVS[0].roughness;
                    targetTransmission = WELLNESS_ZONES_ENVS[0].transmission;
                    targetRotSpeed = WELLNESS_ZONES_ENVS[0].rotSpeed;
                    targetDeform = 0.2;
                } else if (sectionProgress < 0.5) {
                    const t = (sectionProgress - 0.25) / 0.25;
                    targetColor = WELLNESS_ZONES_ENVS[0].color.clone().lerp(WELLNESS_ZONES_ENVS[1].color, t);
                    targetRoughness = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[0].roughness, WELLNESS_ZONES_ENVS[1].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[0].transmission, WELLNESS_ZONES_ENVS[1].transmission, t);
                    targetRotSpeed = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[0].rotSpeed, WELLNESS_ZONES_ENVS[1].rotSpeed, t);
                    targetDeform = 0.2 + t * 0.15;
                } else if (sectionProgress < 0.75) {
                    const t = (sectionProgress - 0.5) / 0.25;
                    targetColor = WELLNESS_ZONES_ENVS[1].color.clone().lerp(WELLNESS_ZONES_ENVS[2].color, t);
                    targetRoughness = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[1].roughness, WELLNESS_ZONES_ENVS[2].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[1].transmission, WELLNESS_ZONES_ENVS[2].transmission, t);
                    targetRotSpeed = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[1].rotSpeed, WELLNESS_ZONES_ENVS[2].rotSpeed, t);
                    targetDeform = 0.35 + t * 0.15;
                } else {
                    const t = (sectionProgress - 0.75) / 0.25;
                    targetColor = WELLNESS_ZONES_ENVS[2].color.clone().lerp(WELLNESS_ZONES_ENVS[3].color, t);
                    targetRoughness = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[2].roughness, WELLNESS_ZONES_ENVS[3].roughness, t);
                    targetTransmission = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[2].transmission, WELLNESS_ZONES_ENVS[3].transmission, t);
                    targetRotSpeed = THREE.MathUtils.lerp(WELLNESS_ZONES_ENVS[2].rotSpeed, WELLNESS_ZONES_ENVS[3].rotSpeed, t);
                    targetDeform = 0.5 + t * 0.2;
                }
            } else if (activeSection === 3) {
                targetColor = WELLNESS_NEUTRAL_COLOR.clone();
                targetTransmission = 0.10;
            } else if (activeSection === 4) {
                targetColor = WELLNESS_NEURO_COLOR.clone();
                targetTransmission = 0.15;
            } else if (activeSection === 5) {
                targetColor = WELLNESS_DENSITY_COLOR.clone();
                targetTransmission = 0.05;
            } else {
                targetColor = WELLNESS_INTRO_COLOR.clone();
                targetTransmission = 0.05;
            }
        }

        // Smooth lerp
        lerpedColor.current.lerp(targetColor, lerpSpeed);
        lerpedRoughness.current = THREE.MathUtils.lerp(lerpedRoughness.current, targetRoughness, lerpSpeed);
        lerpedTransmission.current = THREE.MathUtils.lerp(lerpedTransmission.current, targetTransmission, lerpSpeed);
        lerpedDeform.current = THREE.MathUtils.lerp(lerpedDeform.current, targetDeform, lerpSpeed);
        lerpedRotSpeed.current = THREE.MathUtils.lerp(lerpedRotSpeed.current, targetRotSpeed, lerpSpeed * 0.5);

        uniforms.uDeform.value = lerpedDeform.current;

        if (matRef.current) {
            matRef.current.color.copy(lerpedColor.current);
            matRef.current.roughness = lerpedRoughness.current;
            matRef.current.transmission = lerpedTransmission.current;
        }
    });

    return (
        <mesh ref={meshRef} position={pos || [0, 0, 0]} scale={scale || 1}>
            <sphereGeometry args={[1.5, 128, 128]} />
            <CustomShaderMaterial
                ref={matRef}
                baseMaterial={THREE.MeshPhysicalMaterial}
                vertexShader={vertexShader}
                uniforms={uniforms}
                color={isWellness ? '#c89484' : '#0d0d0d'}
                emissive={isWellness ? '#2a1410' : '#000000'}
                emissiveIntensity={isWellness ? 0.05 : 0}
                metalness={isWellness ? 0.08 : 0.85}
                roughness={isWellness ? 0.78 : 0.25}
                clearcoat={isWellness ? 0.10 : 0.6}
                clearcoatRoughness={isWellness ? 0.7 : 0.25}
                specularIntensity={isWellness ? 0.25 : 1}
                transmission={0.0}
                wireframe={false}
                envMapIntensity={isWellness ? 0.22 : 0.8}
            />
        </mesh>
    );
}

function SpaceDust({ scrollProgress }) {
    const pointsRef = useRef();

    const [positions, scales] = useMemo(() => {
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const r = 3 + Math.random() * 8;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 15;
            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = r * Math.sin(theta);
            scales[i] = Math.random();
        }
        return [positions, scales];
    }, []);

    useFrame((state, delta) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y += delta * 0.05 + ((scrollProgress || 0) * 0.01);
            pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.5;
        }
    });

    return (
        <Points ref={pointsRef} positions={positions} stride={3}>
            <PointMaterial transparent color="#ffffff" size={0.03} sizeAttenuation={true} depthWrite={false} opacity={0.6} />
        </Points>
    );
}

/**
 * WellnessSteam — replaces SpaceDust in wellness mode.
 * Soft warm vapor sprites drifting upward with sinusoidal horizontal sway.
 * Uses NormalBlending and warm tint so it reads on the light spa palette.
 */
function WellnessSteam() {
    const pointsRef = useRef();
    const COUNT = 900;
    const VOL_X = 28;
    const VOL_Y = 24;
    const VOL_Z = 16;
    const Z_OFFSET = -6; // bulk of mist behind blob

    const initial = useMemo(() => {
        const positions = new Float32Array(COUNT * 3);
        const seeds = new Float32Array(COUNT);
        const speeds = new Float32Array(COUNT);
        for (let i = 0; i < COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * VOL_X;
            positions[i * 3 + 1] = (Math.random() - 0.5) * VOL_Y;
            positions[i * 3 + 2] = (Math.random() - 0.5) * VOL_Z + Z_OFFSET;
            seeds[i] = Math.random() * Math.PI * 2;
            speeds[i] = 0.2 + Math.random() * 0.4;
        }
        return { positions, seeds, speeds };
    }, []);

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const geom = pointsRef.current.geometry;
        const arr = geom.attributes.position.array;
        const t = state.clock.elapsedTime;
        for (let i = 0; i < COUNT; i++) {
            const yIdx = i * 3 + 1;
            arr[yIdx] += delta * initial.speeds[i] * 0.10;
            if (arr[yIdx] > VOL_Y / 2) {
                arr[yIdx] = -VOL_Y / 2;
                arr[i * 3] = (Math.random() - 0.5) * VOL_X;
            }
            arr[i * 3] += Math.sin(t * 0.10 + initial.seeds[i]) * delta * 0.06;
        }
        geom.attributes.position.needsUpdate = true;
    });

    return (
        <Points ref={pointsRef} positions={initial.positions} stride={3}>
            <PointMaterial
                transparent
                color="#fff4e6"
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.4}
                blending={THREE.NormalBlending}
            />
        </Points>
    );
}

/**
 * WebcamMirrorBlob — replaces the OrganicBlob during the gesture section.
 * A smooth icosahedron with a polished, metallic material whose environment map
 * is the live webcam feed wrapped as an equirectangular texture. The visitor
 * literally sees themselves moving across the sphere as they wave at the
 * camera, which is what the section's narrative promises ("the music follows
 * your gesture") much more directly than a static blob would.
 *
 * We don't try to deform it — a clean mirror reads as the more elegant choice,
 * and the existing custom shader on OrganicBlob doesn't natively sample envMap.
 */
function WebcamMirrorBlob({ videoElRef }) {
    const meshRef = useRef();
    const textureRef = useRef(null);

    useFrame((state, delta) => {
        const video = videoElRef?.current;
        if (!video) return;

        // Lazy texture creation: we have to wait until the <video> has actual
        // frames before we can wrap it as a VideoTexture.
        if (!textureRef.current && video.readyState >= 2 && video.videoWidth > 0) {
            const tex = new THREE.VideoTexture(video);
            tex.mapping = THREE.EquirectangularReflectionMapping;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            textureRef.current = tex;
            if (meshRef.current?.material) {
                meshRef.current.material.envMap = tex;
                meshRef.current.material.needsUpdate = true;
            }
        }

        // Slow drift so the reflection slides across the sphere rather than
        // being a flat decal — feels like a moving sculpture.
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.05 * delta;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.08;
        }
    });

    useEffect(() => () => {
        if (textureRef.current) {
            textureRef.current.dispose();
            textureRef.current = null;
        }
    }, []);

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[2.4, 8]} />
            <meshPhysicalMaterial
                color="#f4ead8"
                metalness={1.0}
                roughness={0.18}
                envMapIntensity={1.6}
                clearcoat={0.6}
                clearcoatRoughness={0.12}
            />
        </mesh>
    );
}

export default function Scene({ scrollProgress, activeSection, activeSectionId, sectionProgress, densityBlobCount = 1, isIsolationActive = false, webcamMirrorActive = false, videoElRef }) {
    // The density visual + top-down camera are tied to the score *behavior* (id 5),
    // not its DOM position — wellness reorders the array so position 5 there is
    // the webcam, not the score.
    const effectiveSectionId = activeSectionId ?? activeSection;
    const isDensitySection = effectiveSectionId === 5;
    return (
        <Canvas
                camera={{ position: [0, 0, 12], fov: 45 }}
                dpr={[1, 1.5]}
                gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
                style={{ background: 'transparent' }}
            >
            {/* Dynamic Camera */}
            <CameraController isDensitySection={isDensitySection} sectionProgress={sectionProgress} />

            {/* Lighting — wellness uses warm diffuse fills for a calm/spa feel,
                retail keeps the cool monochrome key+rim. */}
            {IS_WELLNESS ? (
                <>
                    {/* Wellness : éclairage diffus quasi-uniforme, blob doit lire comme craie/pierre brute */}
                    <ambientLight intensity={2.4} color="#fcebda" />
                    <hemisphereLight args={["#ffe8d4", "#d8a890", 0.8]} />
                    <directionalLight position={[6, 10, 8]} intensity={0.35} color="#fff4e4" />
                </>
            ) : (
                <>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[8, 12, 10]} intensity={2.5} color="#e8e8e8" />
                    <directionalLight position={[-6, -8, -6]} intensity={0.6} color="#c0c0c0" />
                    <spotLight position={[0, 6, 5]} intensity={3.0} distance={18} angle={0.5} penumbra={1} color="#ffffff" />
                </>
            )}

            {/* Main Blob OR webcam mirror — when the visitor is in the gesture
                section with their camera on, the blob is replaced by a polished
                reflective sphere that uses the live webcam as its environment
                map. They literally see themselves on the surface. */}
            {webcamMirrorActive ? (
                <WebcamMirrorBlob videoElRef={videoElRef} />
            ) : (
                <OrganicBlob
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    isIsolationActive={isIsolationActive}
                    position={DENSITY_POSITIONS[0]}
                    scale={
                        activeSection === 2
                            ? (sectionProgress < 0.33 ? 1.2 : sectionProgress < 0.66 ? 1.0 : 0.8)
                            : (isDensitySection ? DENSITY_SCALES[0] : 1.0)
                    }
                    blobIndex={0}
                />
            )}

            {/* Density Clones — tied to the score *behavior* (id 5). */}
            {isDensitySection && densityBlobCount >= 2 && (
                <OrganicBlob
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    isIsolationActive={isIsolationActive}
                    position={DENSITY_POSITIONS[1]}
                    scale={DENSITY_SCALES[1]}
                    blobIndex={1}
                    isDensityClone={true}
                />
            )}
            {isDensitySection && densityBlobCount >= 3 && (
                <OrganicBlob
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    isIsolationActive={isIsolationActive}
                    position={DENSITY_POSITIONS[2]}
                    scale={DENSITY_SCALES[2]}
                    blobIndex={2}
                    isDensityClone={true}
                />
            )}
            {isDensitySection && densityBlobCount >= 4 && (
                <OrganicBlob
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    isIsolationActive={isIsolationActive}
                    position={DENSITY_POSITIONS[3]}
                    scale={DENSITY_SCALES[3]}
                    blobIndex={3}
                    isDensityClone={true}
                />
            )}
            {isDensitySection && densityBlobCount >= 5 && (
                <OrganicBlob
                    scrollProgress={scrollProgress}
                    activeSection={activeSection}
                    sectionProgress={sectionProgress}
                    isIsolationActive={isIsolationActive}
                    position={DENSITY_POSITIONS[4]}
                    scale={DENSITY_SCALES[4]}
                    blobIndex={4}
                    isDensityClone={true}
                />
            )}

            {/* Background particles: stars (retail) or vapor (wellness) */}
            {IS_WELLNESS ? <WellnessSteam /> : <SpaceDust scrollProgress={scrollProgress} />}

            {/* Environment reflections — diffuse studio in wellness (uniform soft light),
                neutral night in retail (dark contrast). */}
            <Environment preset={IS_WELLNESS ? 'apartment' : 'night'} />

            {/* Post-Processing - safe: no Noise effect, custom grain+vignette instead */}
            <EffectComposer multisampling={0}>
                <Bloom
                    luminanceThreshold={0.9}
                    luminanceSmoothing={0.4}
                    intensity={0.35}
                    mipmapBlur
                />
                <GrainVignette
                    grainAmount={0.05}
                    grainSpeed={50}
                    vignetteStrength={0.45}
                    vignetteOffset={0.3}
                />
            </EffectComposer>
        </Canvas>
    );
}
