import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import GrainVignette from './GrainVignette';

import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';

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

// Section 2 (Scénographie) environment configs: jungle, thunderstorm, sea
const SEC2_ENVS = [
    { roughness: 0.8, transmission: 0.0, color: new THREE.Color('#1a3a1a') },
    { roughness: 0.5, transmission: 0.2, color: new THREE.Color('#2a1a3a') },
    { roughness: 0.1, transmission: 0.6, color: new THREE.Color('#0a2a3a') },
];

// Density blob positions: 4 blobs on a circle (top-down view)
const DENSITY_POSITIONS = [
    [3, 0, 0],    // East
    [0, 0, 3],    // South
    [-3, 0, 0],   // West
    [0, 0, -3],   // North
];

const DENSITY_SCALES = [0.7, 0.5, 0.45, 0.4];

// --- Components ---

/**
 * CameraController - smoothly transitions camera based on active section.
 * Section 4 (Density): moves to a high, almost top-down orbit to see the 4 blobs in circle.
 */
function CameraController({ activeSection, sectionProgress }) {
    useFrame((state, delta) => {
        const cam = state.camera;
        const lerpSpeed = 1 - Math.pow(0.01, delta);

        let targetPos, targetLookAt;

        if (activeSection === 4) {
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

    const lerpedColor = useRef(new THREE.Color('#0a0a0a'));
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
        if (activeSection === 4) {
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
            // SECTION INDICES: 0=Intro, 1=Isolation, 2=Scénographie, 3=Neuro, 4=Density
            if (activeSection === 0) {
                // Intro: near-round, dark, slow rotation
                targetColor.set('#0a0a0a');
                targetDeform = -0.3;
                targetRoughness = 0.15;
                targetRotSpeed = 0.05;
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
            } else if (activeSection === 2) {
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
            } else if (activeSection === 3) {
                // Neuro: calm, deep, meditative
                targetColor.set('#0a0a1a');
                targetDeform = 0.1;
                targetRoughness = 0.1;
                targetTransmission = 0.4;
                targetRotSpeed = 0.03;
            } else if (activeSection === 4) {
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
                color="#0d0d0d"
                emissive="#000000"
                metalness={0.85}
                roughness={0.25}
                clearcoat={0.6}
                clearcoatRoughness={0.25}
                transmission={0.0}
                wireframe={false}
                envMapIntensity={0.8}
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

export default function Scene({ scrollProgress, activeSection, sectionProgress, densityBlobCount = 1, isIsolationActive = false }) {
    return (
        <Canvas camera={{ position: [0, 0, 12], fov: 45 }} dpr={[1, 1.5]}>
            {/* Dynamic Camera */}
            <CameraController activeSection={activeSection} sectionProgress={sectionProgress} />

            {/* Monochrome lighting - soft key + rim, no coloured fills */}
            <ambientLight intensity={0.8} />
            <directionalLight position={[8, 12, 10]} intensity={2.5} color="#e8e8e8" />
            <directionalLight position={[-6, -8, -6]} intensity={0.6} color="#c0c0c0" />
            <spotLight position={[0, 6, 5]} intensity={3.0} distance={18} angle={0.5} penumbra={1} color="#ffffff" />

            {/* Main Blob (always visible) */}
            <OrganicBlob
                scrollProgress={scrollProgress}
                activeSection={activeSection}
                sectionProgress={sectionProgress}
                isIsolationActive={isIsolationActive}
                position={DENSITY_POSITIONS[0]}
                scale={activeSection === 4 ? DENSITY_SCALES[0] : 1.0}
                blobIndex={0}
            />

            {/* Density Clones (section 4 only) */}
            {activeSection === 4 && densityBlobCount >= 2 && (
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
            {activeSection === 4 && densityBlobCount >= 3 && (
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
            {activeSection === 4 && densityBlobCount >= 4 && (
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

            {/* Space Dust */}
            <SpaceDust scrollProgress={scrollProgress} />

            {/* Monochrome reflections - neutral environment */}
            <Environment preset="night" />

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
