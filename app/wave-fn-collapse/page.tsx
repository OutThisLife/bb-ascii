'use client'

import gsap from 'gsap'
import { useControls } from 'leva'
import { useEffect, useRef } from 'react'

import { Noise } from '@/components/Noise'

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0, 1);
}`

const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_seed;
uniform float u_scale;
uniform float u_warp;
uniform float u_moisture;
uniform float u_octaves;
uniform float u_hexScale;
uniform float u_hexOpacity;
uniform float u_elevShade;
uniform vec2 u_res;

// ═══════════════════════════════════════════════════════════════════
// NOISE (GPU)
// ═══════════════════════════════════════════════════════════════════

vec2 hash22(vec2 p) {
  p = p + u_seed;
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  float a = dot(hash22(i + vec2(0,0)), f - vec2(0,0));
  float b = dot(hash22(i + vec2(1,0)), f - vec2(1,0));
  float c = dot(hash22(i + vec2(0,1)), f - vec2(0,1));
  float d = dot(hash22(i + vec2(1,1)), f - vec2(1,1));
  
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, float oct) {
  float sum = 0.0, amp = 1.0, freq = 1.0, max_val = 0.0;
  for (float i = 0.0; i < 8.0; i++) {
    if (i >= oct) break;
    sum += perlin(p * freq) * amp;
    max_val += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / max_val;
}

vec2 warp(vec2 p, float strength, float t) {
  float wx = fbm(p + vec2(t, 0), 3.0) * strength;
  float wy = fbm(p + vec2(5.2, 1.3 + t), 3.0) * strength;
  return p + vec2(wx, wy);
}

// ═══════════════════════════════════════════════════════════════════
// BIOMES
// ═══════════════════════════════════════════════════════════════════

vec3 DEEP_WATER = vec3(20, 50, 80) / 255.0;
vec3 WATER = vec3(40, 100, 150) / 255.0;
vec3 SHALLOW = vec3(70, 140, 170) / 255.0;
vec3 SAND = vec3(210, 190, 140) / 255.0;
vec3 GRASS = vec3(90, 150, 60) / 255.0;
vec3 FOREST = vec3(40, 85, 35) / 255.0;
vec3 DENSE_FOREST = vec3(25, 55, 20) / 255.0;

vec3 getBiome(float e, float m) {
  if (e < -0.2) return DEEP_WATER;
  if (e < -0.1) return mix(DEEP_WATER, WATER, smoothstep(-0.2, -0.1, e));
  if (e < 0.0) return mix(WATER, SHALLOW, smoothstep(-0.1, 0.0, e));
  if (e < 0.08) return mix(SHALLOW, SAND, smoothstep(0.0, 0.08, e));
  if (e < 0.15) return mix(SAND, GRASS, smoothstep(0.08, 0.15, e));
  
  vec3 baseGreen = mix(GRASS, FOREST, smoothstep(-0.2, 0.3, m));
  vec3 dense = mix(baseGreen, DENSE_FOREST, smoothstep(0.3, 0.6, m));
  
  if (e < 0.2) return mix(SAND, dense, smoothstep(0.15, 0.2, e));
  return dense;
}

// ═══════════════════════════════════════════════════════════════════
// HEX GRID
// ═══════════════════════════════════════════════════════════════════

float hexEdgeDist(vec2 p, float hexScale) {
  vec2 hp = p * hexScale;
  
  int approxCol = int(floor(hp.x / 1.5));
  int approxRow = int(floor(hp.y / 1.5));
  
  float minDist = 1e10;
  float secondDist = 1e10;
  
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      int col = approxCol + dx;
      int row = approxRow + dy;
      float cx = float(col) * 1.5;
      float cy = 1.5 * (float(row) + ((col & 1) == 1 ? 0.5 : 0.0));
      float dist = length(hp - vec2(cx, cy));
      if (dist < minDist) { secondDist = minDist; minDist = dist; }
      else if (dist < secondDist) { secondDist = dist; }
    }
  }
  
  return min(1.0, (secondDist - minDist) * 2.0);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = (v_uv - 0.5) * u_scale;
  uv.x *= aspect;
  
  vec2 p = warp(uv, u_warp, u_time);
  
  float e = fbm(p, u_octaves);
  float m = fbm(p + vec2(100, 100), u_octaves - 1.0) + u_moisture;
  
  vec3 col = getBiome(e, m);
  
  // elevation shading
  float shade = 1.0 - u_elevShade * (1.0 - (e + 0.5));
  col *= shade;
  
  // hex overlay
  if (u_hexOpacity > 0.0) {
    float edgeDist = hexEdgeDist(p, u_hexScale);
    float darken = (1.0 - edgeDist) * u_hexOpacity * 0.5;
    col *= (1.0 - darken);
  }
  
  fragColor = vec4(col, 1.0);
}`

function createShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

function createProgram(gl: WebGL2RenderingContext) {
  const p = gl.createProgram()!
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(p)
  return p
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const progRef = useRef<WebGLProgram | null>(null)
  const animRef = useRef({ t: 0 })
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const { blendMode, cycleDur, elevShade, fgColor, fgOpacity, hexOpacity, hexScale, hueRotate, moisture, octaves, scale, seed, warpAmt } = useControls({
    seed: { label: 'Seed', min: 0, max: 1000, step: 1, value: Math.floor(Math.random() * 1000) },
    scale: { label: 'Scale', min: 0.5, max: 5, step: 0.1, value: 1.7 },
    octaves: { label: 'Detail', min: 2, max: 8, step: 1, value: 8 },
    warpAmt: { label: 'Warp', min: 0, max: 2, step: 0.1, value: 2 },
    moisture: { label: 'Moisture', min: -0.5, max: 0.5, step: 0.05, value: -0.1 },
    cycleDur: { label: 'Cycle (sec)', min: 30, max: 300, step: 10, value: 60 },
    hexScale: { label: 'Hex Density', min: 2, max: 20, step: 0.5, value: 13.5 },
    hexOpacity: { label: 'Hex Lines', min: 0, max: 1, step: 0.05, value: 0.4 },
    hueRotate: { label: 'Hue Rotate', min: 0, max: 360, step: 1, value: 166 },
    fgColor: { label: 'FG Color', value: '#8c7868' },
    fgOpacity: { label: 'FG Opacity', min: 0, max: 1, step: 0.05, value: 1 },
    blendMode: { label: 'Blend Mode', options: ['difference', 'multiply', 'screen', 'overlay', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'], value: 'difference' },
    elevShade: { label: 'Elev Shade', min: 0, max: 1, step: 0.05, value: 0.3 }
  })

  // init webgl
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2')!
    glRef.current = gl
    progRef.current = createProgram(gl)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(progRef.current, 'a_pos')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
  }, [])

  // render
  useEffect(() => {
    const gl = glRef.current
    const prog = progRef.current
    const canvas = canvasRef.current
    if (!gl || !prog || !canvas) return

    const draw = () => {
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)

      gl.useProgram(prog)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), animRef.current.t)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_seed'), seed)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_scale'), scale)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_warp'), warpAmt)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_moisture'), moisture)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_octaves'), octaves)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_hexScale'), hexScale)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_hexOpacity'), hexOpacity)
      gl.uniform1f(gl.getUniformLocation(prog, 'u_elevShade'), elevShade)
      gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), w, h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    tweenRef.current?.kill()
    tweenRef.current = gsap.to(animRef.current, {
      t: '+=1.5',
      duration: cycleDur,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      onUpdate: draw
    })

    draw()
    window.addEventListener('resize', draw)
    return () => {
      tweenRef.current?.kill()
      window.removeEventListener('resize', draw)
    }
  }, [cycleDur, elevShade, hexOpacity, hexScale, moisture, octaves, scale, seed, warpAmt])

  return (
    <div style={{ height: '100vh', position: 'relative', width: '100vw' }}>
      <canvas
        ref={canvasRef}
        style={{ background: '#0a0a0a', display: 'block', filter: `hue-rotate(${hueRotate}deg)`, height: '100%', width: '100%' }}
      />
      <div
        style={{
          background: fgColor,
          height: '100%',
          left: 0,
          mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
          opacity: fgOpacity,
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          width: '100%'
        }}
      />
      <Noise />
    </div>
  )
}
