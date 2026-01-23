'use client'

import { shaderMaterial } from '@react-three/drei'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useRef } from 'react'
import * as THREE from 'three'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime, uAspect, uRadius, uSpeed, uJagged, uSparks;
  uniform vec2 uOrbit, uPan;
  uniform vec3 uColorCore, uColorGlow;
  uniform int uBoltCount;
  uniform bool uBranches;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define MAX_BOLTS 12
  #define SEGS 40

  float hash(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    return fract(p * p * 2.0);
  }

  float hash2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1, 0)), f.x),
      mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x),
      f.y
    );
  }

  float fbm(vec2 p, int oct) {
    float v = 0.0, a = 0.5;
    mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      v += a * noise(p);
      p = r * p;
      a *= 0.5;
    }
    return v;
  }

  vec2 rot(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  vec3 slerp(vec3 a, vec3 b, float t) {
    float d = clamp(dot(a, b), -1.0, 1.0);
    float th = acos(d);
    return th < 0.001 ? mix(a, b, t) : (sin((1.0 - t) * th) * a + sin(t * th) * b) / sin(th);
  }

  vec3 orbit(vec3 p) {
    p.xz = rot(p.xz, -uOrbit.y);
    p.yz = rot(p.yz, -uOrbit.x);
    return p;
  }

  vec2 proj(vec3 p) { return orbit(p).xy * uRadius - uPan; }
  float dep(vec3 p) { return orbit(p).z; }

  float seg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }

  vec3 sphere(float t, float p) {
    return vec3(cos(p) * cos(t), sin(p), cos(p) * sin(t));
  }

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
    if (length(uv) > uRadius * 1.3) discard;

    vec3 col = vec3(0.0);

    for (int b = 0; b < MAX_BOLTS; b++) {
      if (b >= uBoltCount) break;

      float seed = float(b) * 127.3 + floor(uTime * uSpeed + float(b) * 0.37) * 89.7;
      float t1 = float(b) * PI * 2.0 / float(uBoltCount) + hash(seed) * 0.8;
      float p1 = (hash(seed + 1.0) - 0.5) * PI * 0.85;
      vec3 start = sphere(t1, p1);

      float t2, p2;
      if (hash(seed + 2.0) < 0.4) {
        t2 = t1 + (hash(seed + 3.0) - 0.5);
        p2 = p1 + (hash(seed + 4.0) > 0.5 ? 1.0 : -1.0) * (1.2 + hash(seed + 5.0));
      } else {
        t2 = t1 + (hash(seed + 3.0) > 0.5 ? 1.0 : -1.0) * (1.5 + hash(seed + 6.0) * 1.5);
        p2 = p1 + (hash(seed + 4.0) - 0.5) * 1.5;
      }
      vec3 end = sphere(t2, clamp(p2, -PI * 0.48, PI * 0.48));

      float minD = 100.0;
      vec2 prev = vec2(0.0);
      bool prevOk = false;

      for (int i = 0; i <= SEGS; i++) {
        float st = float(i) / float(SEGS);
        vec3 pt = slerp(start, end, st);
        float taper = sin(st * PI);
        vec2 nc = vec2(st * 8.0 + seed, seed * 0.1);

        pt.y += (fbm(nc, 4) * 2.0 - 1.0) * uJagged * 1.5 * taper;
        pt = normalize(pt) * (1.04 + (fbm(nc + 100.0, 3) * 2.0 - 1.0) * uJagged * 0.8 * taper + taper * 0.04);

        vec2 scr = proj(pt);
        float vis = smoothstep(-0.5, 0.2, dep(pt));

        if (prevOk && vis > 0.05) minD = min(minD, seg(uv, prev, scr) / max(vis, 0.3));
        prev = scr;
        prevOk = vis > 0.05;
      }

      if (uBranches) {
        float bs = seed * 41.0;
        vec3 brO = slerp(start, end, 0.3 + hash(bs) * 0.4);
        vec3 brD = normalize(brO + normalize(cross(brO, start - end)) * (hash(bs + 1.0) > 0.5 ? 0.6 : -0.6));
        vec2 brPrev = proj(brO);

        for (int j = 1; j <= 6; j++) {
          float jt = float(j) / 6.0;
          vec3 brPt = slerp(brO, brD, jt * 0.35);
          float brTaper = sin(jt * PI);
          float brN = fbm(vec2(jt * 6.0 + bs, bs * 0.1), 3) * 2.0 - 1.0;

          brPt.y += brN * uJagged * 0.8 * brTaper;
          brPt = normalize(brPt) * (1.03 + brN * uJagged * 0.4 * brTaper);

          vec2 brScr = proj(brPt);
          float brVis = smoothstep(-0.5, 0.2, dep(brPt));
          if (brVis > 0.05) minD = min(minD, seg(uv, brPrev, brScr) * 1.5 / max(brVis, 0.3));
          brPrev = brScr;
        }
      }

      float core = smoothstep(0.002, 0.0, minD);
      float glow = exp(-minD * 500.0) * 0.4;
      float flicker = step(0.3, hash(floor(uTime * 12.0) + seed));

      col += mix(uColorGlow * vec3(0.7, 0.85, 1.3), uColorCore, core + glow * 0.4) * (core + glow) * flicker;

      float n1 = exp(-length(uv - proj(start)) * 70.0) * 0.8 * smoothstep(-0.3, 0.2, dep(start));
      float n2 = exp(-length(uv - proj(end)) * 70.0) * 0.8 * smoothstep(-0.3, 0.2, dep(end));
      col += uColorCore * (n1 + n2) * flicker;

      if (uSparks > 0.0) {
        for (int sp = 0; sp < 10; sp++) {
          float ss = seed * 17.0 + float(sp) * 31.7;
          vec3 base = (sp < 5) ? start : end;
          vec2 np = proj(base);
          float nv = smoothstep(-0.3, 0.1, dep(base));
          if (nv < 0.1) continue;

          float ang = float(sp % 5) * 1.257 + hash(ss) * 0.4;
          vec2 dir = vec2(cos(ang), sin(ang));
          float sd = (0.012 + hash(ss + 2.0) * 0.01) * uSparks;
          float ln = (0.008 + hash(ss + 1.0) * 0.012) * uSparks;

          col += uColorCore * exp(-seg(uv, np + dir * sd, np + dir * (sd + ln)) * 1200.0) * 0.35 * nv * flicker;
        }
      }
    }

    gl_FragColor = vec4(col, min(1.0, length(col)));
  }
`

const LightningMaterial = shaderMaterial(
  {
    uAspect: 1,
    uBoltCount: 12,
    uBranches: false,
    uColorCore: new THREE.Color('#aacaff'),
    uColorGlow: new THREE.Color('#ffffff'),
    uJagged: 0.2,
    uOrbit: new THREE.Vector2(),
    uPan: new THREE.Vector2(),
    uRadius: 0.4,
    uSparks: 1.5,
    uSpeed: 0.75,
    uTime: 0
  },
  VERT,
  FRAG
)

extend({ LightningMaterial })

type Mat = THREE.ShaderMaterial & {
  uAspect: number
  uBoltCount: number
  uBranches: boolean
  uColorCore: THREE.Color
  uColorGlow: THREE.Color
  uJagged: number
  uOrbit: THREE.Vector2
  uPan: THREE.Vector2
  uRadius: number
  uSparks: number
  uSpeed: number
  uTime: number
}

declare module '@react-three/fiber' {
  interface ThreeElements {
    lightningMaterial: object
  }
}

interface Props {
  autoSpin?: number
  boltCount?: number
  branches?: boolean
  className?: string
  colorCore?: string
  colorGlow?: string
  intensity?: number
  jagged?: number
  orbit: { x: number; y: number }
  pan: { x: number; y: number }
  radius?: number
  sparks?: number
  speed?: number
  syncSpin?: boolean
}

export default function LightningOverlay({
  autoSpin = 0,
  boltCount = 12,
  branches = false,
  className = '',
  colorCore = '#aacaff',
  colorGlow = '#ffffff',
  intensity = 0.95,
  jagged = 0.2,
  orbit,
  pan,
  radius = 0.4,
  sparks = 1.5,
  speed = 0.75,
  syncSpin = true
}: Props) {
  const ref = useRef<Mat>(null)
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    const m = ref.current

    if (!m) {
      return
    }

    const t = clock.elapsedTime
    m.uTime = t
    m.uAspect = viewport.aspect
    m.uOrbit.set(
      syncSpin ? orbit.x : 0,
      syncSpin ? orbit.y + t * autoSpin : t * autoSpin
    )
    m.uPan.set(pan.x, pan.y)
    m.uRadius = radius
    m.uBoltCount = boltCount
    m.uSpeed = speed
    m.uJagged = jagged
    m.uSparks = sparks
    m.uBranches = branches
    m.uColorCore.set(colorCore)
    m.uColorGlow.set(colorGlow)
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <lightningMaterial
        ref={ref}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export function LightningCanvas({
  className = '',
  intensity = 0.95,
  ...props
}: Props) {
  return (
    <div className={className} style={{ pointerEvents: 'none' }}>
      <Canvas
        gl={{ alpha: true }}
        orthographic
        camera={{ position: [0, 0, 1] }}
        style={{ background: 'transparent', height: '100%', width: '100%' }}
      >
        <LightningOverlay {...props} />

        <EffectComposer>
          <Bloom
            intensity={intensity}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.6}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
