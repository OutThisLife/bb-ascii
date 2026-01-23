'use client'

import { button, useControls } from 'leva'
import { useEffect, useRef } from 'react'

const CHARS = ' .·:+=░▒▓█'
const CHARS_WC = ' .·:;+=░▒▓█'
const CHARS_MAX = CHARS.length - 1
const PI = Math.PI
const FONT_SIZE = 12
const FULLSCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
const GRASS_CHARS = ['|', '/', '\\', '┃', '╱', '╲']

const rand = (s: number) => (((Math.sin(s * 9999) * 10000) % 1) + 1) % 1
const noise = (x: number, s: number) => rand(~~x * 73.97 + s) * 2 - 1

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h}, ${~~(s * 100)}%, ${~~(l * 100)}%)`

const fbm = (x: number, s: number, octaves = 4) => {
  let v = 0,
    amp = 0.5,
    freq = 0.02

  for (let i = 0; i < octaves; i++) {
    const x0 = ~~(x * freq),
      t = (x * freq) % 1

    v +=
      amp *
      (noise(x0, s + i * 1000) * (1 - t) + noise(x0 + 1, s + i * 1000) * t)
    amp *= 0.5
    freq *= 2
  }

  return v
}

const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2

  if (max === min) {
    return [0, 0, l]
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6

  return [h * 360, s, l]
}

const derivePalette = (seed: number) => {
  const r = (n: number) => {
    const x = Math.sin(seed * 9999 + n * 7777) * 43758.5453

    return x - Math.floor(x)
  }

  // Random mood selection
  const mood = r(0)
  const isNight = mood < 0.15
  const isDawn = mood >= 0.15 && mood < 0.25
  const isForest = mood >= 0.25 && mood < 0.4
  const isOcean = mood >= 0.4 && mood < 0.5
  const isDesert = mood >= 0.5 && mood < 0.6
  const isMono = mood >= 0.6 && mood < 0.7
  const isPsychedelic = mood >= 0.7 && mood < 0.8
  const isNoir = mood >= 0.8 && mood < 0.9
  // else: chaotic

  // Base hue - either fixed for mood or random
  const baseHue = isNight
    ? 230 + r(1) * 40
    : isDawn
      ? 20 + r(1) * 40
      : isForest
        ? 90 + r(1) * 50
        : isOcean
          ? 180 + r(1) * 40
          : isDesert
            ? 30 + r(1) * 25
            : isMono
              ? r(1) * 360
              : isPsychedelic
                ? r(1) * 360
                : isNoir
                  ? 0
                  : r(1) * 360

  // Saturation range
  const baseSat = isNight
    ? 0.3 + r(2) * 0.3
    : isDawn
      ? 0.5 + r(2) * 0.4
      : isForest
        ? 0.4 + r(2) * 0.4
        : isOcean
          ? 0.4 + r(2) * 0.4
          : isDesert
            ? 0.3 + r(2) * 0.4
            : isMono
              ? 0.2 + r(2) * 0.6
              : isPsychedelic
                ? 0.7 + r(2) * 0.3
                : isNoir
                  ? r(2) * 0.1
                  : 0.3 + r(2) * 0.6

  // Lightness range

  const baseLit = isNight
    ? 0.1 + r(3) * 0.2
    : isDawn
      ? 0.3 + r(3) * 0.3
      : isForest
        ? 0.25 + r(3) * 0.25
        : isOcean
          ? 0.2 + r(3) * 0.3
          : isDesert
            ? 0.4 + r(3) * 0.3
            : isMono
              ? 0.2 + r(3) * 0.4
              : isPsychedelic
                ? 0.4 + r(3) * 0.3
                : isNoir
                  ? 0.05 + r(3) * 0.1
                  : 0.2 + r(3) * 0.5

  // Sky hue

  const skyHue =
    isMono || isNoir ? baseHue : (baseHue + r(10) * 40 - 20 + 360) % 360

  // Ground MUST contrast with sky (90-180 degree hue shift unless mono/noir)

  const groundShift = 90 + r(11) * 90 // 90-180 degrees away

  const groundHue = isMono
    ? baseHue
    : isNoir
      ? baseHue
      : (skyHue + groundShift) % 360

  // Trees - lean green but can shift
  const treeHue = isMono
    ? baseHue
    : isNoir
      ? 120 + r(12) * 20 // dark greens for noir
      : isDesert
        ? 40 + r(12) * 30 // olive/brown for desert
        : isPsychedelic
          ? r(12) * 360 // wild
          : 80 + r(12) * 70 // 80-150 (yellow-green to teal-green)

  // Accent - always pop
  const accentHue = isPsychedelic
    ? (skyHue + 180) % 360
    : isNoir
      ? 5 + r(13) * 25 // red/orange
      : (skyHue + 120 + r(13) * 120) % 360

  // Ground/sky lightness contrast

  const skyL = baseLit

  const groundL = isNoir
    ? baseLit * 0.8
    : r(20) > 0.5
      ? baseLit + 0.15 + r(21) * 0.1 // lighter ground
      : baseLit - 0.1 + r(21) * 0.05 // darker ground

  return {
    accent: accentHue,
    accentL: Math.min(0.8, baseLit + 0.25),
    accentS: Math.min(1, baseSat + 0.3),
    bg: `hsl(${skyHue}, ${baseSat * 50}%, ${Math.max(2, skyL * 12)}%)`,
    flower: accentHue,
    ground: groundHue,
    groundL: Math.max(0.15, Math.min(0.6, groundL)),
    groundS: baseSat * (isDesert ? 0.5 : isNoir ? 0.3 : 0.75),
    mood: isNight
      ? 'night'
      : isDawn
        ? 'dawn'
        : isForest
          ? 'forest'
          : isOcean
            ? 'ocean'
            : isDesert
              ? 'desert'
              : isMono
                ? 'mono'
                : isPsychedelic
                  ? 'psyche'
                  : isNoir
                    ? 'noir'
                    : 'chaos',
    sky: skyHue,
    skyL,
    skyS: baseSat,
    tree: treeHue,
    treeL: Math.max(0.2, Math.min(0.55, baseLit + 0.05)),
    treeS: Math.max(0.3, baseSat * 0.85)
  }
}

// Shaders
const wcVert = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const wcDiffuseFrag = `
precision highp float;
uniform sampler2D uPrev, uSource;
uniform vec2 uRes;
uniform float uFirst, uTime, uBleed, uSplatter;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes, px = 1.0 / uRes;
  vec4 src = texture2D(uSource, uv);

  if (uFirst > 0.5) { gl_FragColor = src; return; }

  float bleedAmt = uBleed * 25.0;

  // Chained displacement bleed
  vec2 n1 = vec2(fbm(gl_FragCoord.xy * 0.02), fbm(gl_FragCoord.xy * 0.02 + vec2(50.0))) * 2.0 - 1.0;
  vec2 uv1 = uv + n1 * px * bleedAmt;
  vec2 n2 = vec2(fbm(uv1 * uRes * 0.02 + vec2(30.0)), fbm(uv1 * uRes * 0.02 + vec2(80.0))) * 2.0 - 1.0;
  vec2 uv2 = uv1 + n2 * px * bleedAmt * 0.7;
  vec2 n3 = vec2(fbm(uv2 * uRes * 0.02 + vec2(60.0)), fbm(uv2 * uRes * 0.02 + vec2(110.0))) * 2.0 - 1.0;
  vec2 uv3 = uv2 + n3 * px * bleedAmt * 0.5;

  vec4 bled = texture2D(uSource, uv1) * 0.4 + texture2D(uSource, uv2) * 0.35 + texture2D(uSource, uv3) * 0.25;
  vec4 Q = mix(src, bled, 0.7);

  // Paper grain
  Q.rgb *= 0.97 + noise(gl_FragCoord.xy * 0.08) * 0.06;

  // Edge strokes
  vec3 dx = texture2D(uSource, uv + vec2(px.x, 0.0)).rgb - texture2D(uSource, uv - vec2(px.x, 0.0)).rgb;
  vec3 dy = texture2D(uSource, uv + vec2(0.0, px.y)).rgb - texture2D(uSource, uv - vec2(0.0, px.y)).rgb;
  float edge = length(dx) + length(dy);

  if (edge > 0.05) {
    vec2 edgeNormal = normalize(vec2(length(dx), length(dy)));
    float edgeFbm = fbm(gl_FragCoord.xy * 0.03 + vec2(uTime * 0.1)) * 2.0 - 1.0;
    vec4 edgeSample = texture2D(uSource, uv + edgeNormal * edgeFbm * px * 8.0);
    Q = mix(Q, edgeSample, smoothstep(0.05, 0.2, edge) * 0.5);
  }

  gl_FragColor = mix(Q, texture2D(uPrev, uv), 0.12);
}
`

const wcOutputFrag = `
precision highp float;
uniform sampler2D uDiffuse;
uniform vec2 uRes;
uniform float uPaper;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = texture2D(uDiffuse, uv).rgb;
  col *= 1.0 - uPaper * 0.5 + uPaper * hash(gl_FragCoord.xy * 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`

const fireflyFrag = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uSeed;

float rand(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime * 0.001, aspect = uRes.x / uRes.y;
  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 60.0; i++) {
    float r1 = rand(i * 1.1 + 0.1), r2 = rand(i * 2.3 + 0.2);
    float r3 = rand(i * 3.7 + 0.3), r4 = rand(i * 5.1 + 0.4);

    vec2 pos = vec2(r1 + sin(t * (0.2 + r3 * 0.2) + i) * 0.05,
                    r2 + cos(t * (0.3 + r4 * 0.2) + i * 1.3) * 0.04);

    float period = 2.0 + r3 * 2.0, bt = mod(t + r4 * 6.28, period) / period;
    float blink = smoothstep(0.0, 0.1, bt) * smoothstep(0.55, 0.15, bt);

    vec2 delta = uv - pos;
    delta.x *= aspect;
    float glow = 0.00002 / (dot(delta, delta) + 0.00001) * blink;

    col += vec3(1.0, 0.95, 0.7) * glow;
  }

  col = min(col, vec3(1.0));
  gl_FragColor = vec4(col, (col.r + col.g + col.b) * 0.4);
}
`

const createShader = (gl: WebGLRenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)

  return s
}

const createProgram = (gl: WebGLRenderingContext, vs: string, fs: string) => {
  const p = gl.createProgram()!
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)

  return p
}

const createFBO = (gl: WebGLRenderingContext, w: number, h: number) => {
  const fb = gl.createFramebuffer()!,
    tex = gl.createTexture()!

  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  )
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return { fb, tex }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const seed = useRef(Date.now())
  const paletteRef = useRef(derivePalette(seed.current))
  const needsRegen = useRef(false)

  const { bleed, edge, mode, paper, splatter } = useControls('Watercolor', {
    bleed: { max: 1.0, min: 0, step: 0.01, value: 0.4 },
    edge: { max: 0.5, min: 0, step: 0.01, value: 0.25 },
    mode: { options: ['final', 'raw', 'watercolor'], value: 'final' },
    paper: { max: 0.1, min: 0, step: 0.01, value: 0.03 },
    splatter: { max: 5, min: 0, step: 0.1, value: 1.0 }
  })

  useControls('Scene', {
    'New Scene': button(() => {
      seed.current = Date.now()
      paletteRef.current = derivePalette(seed.current)
      needsRegen.current = true
    })
  })

  const paramsRef = useRef({ bleed, edge, mode, paper, splatter })
  paramsRef.current = { bleed, edge, mode, paper, splatter }

  const segs = useRef<Seg[]>([])
  const frogs = useRef<Frog[]>([])
  const clouds = useRef<Cloud[]>([])
  const grid = useRef<Float32Array | null>(null)
  const hueG = useRef<Float32Array | null>(null)
  const satG = useRef<Float32Array | null>(null)
  const lumG = useRef<Float32Array | null>(null)
  const charG = useRef<(string | null)[] | null>(null)
  const ready = useRef(false)
  const dims = useRef({ cols: 0, groundY: 0, rows: 0 })

  const asciiCanvas = useRef<HTMLCanvasElement | null>(null)
  const glCanvas = useRef<HTMLCanvasElement | null>(null)
  const fireflyCanvas = useRef<HTMLCanvasElement | null>(null)

  const fireflyGlRef = useRef<FireflyRef | null>(null)

  const glRef = useRef<GlRef | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')!
    const font = `${FONT_SIZE}px monospace`
    ctx.font = font
    ctx.textBaseline = 'top'

    let cellW = ctx.measureText('M').width

    let cols = 0,
      rows = 0,
      viewW = 0,
      viewH = 0,
      prevDpr = 0

    let colX = new Float32Array(0),
      rowY = new Float32Array(0)

    let asciiCtx: CanvasRenderingContext2D | null = null

    let t0 = 0,
      raf = 0

    // Offscreen canvases
    asciiCanvas.current = document.createElement('canvas')
    glCanvas.current = document.createElement('canvas')

    asciiCtx = asciiCanvas.current.getContext('2d')!
    asciiCtx.font = font
    asciiCtx.textBaseline = 'top'

    const gl = glCanvas.current.getContext('webgl', {
      preserveDrawingBuffer: true
    })!

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

    const diffuseProg = createProgram(gl, wcVert, wcDiffuseFrag)
    const outputProg = createProgram(gl, wcVert, wcOutputFrag)
    const srcTex = gl.createTexture()!

    gl.bindTexture(gl.TEXTURE_2D, srcTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD, gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(diffuseProg, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const diffuseUniforms = {
      uBleed: gl.getUniformLocation(diffuseProg, 'uBleed')!,
      uFirst: gl.getUniformLocation(diffuseProg, 'uFirst')!,
      uPrev: gl.getUniformLocation(diffuseProg, 'uPrev')!,
      uRes: gl.getUniformLocation(diffuseProg, 'uRes')!,
      uSource: gl.getUniformLocation(diffuseProg, 'uSource')!,
      uSplatter: gl.getUniformLocation(diffuseProg, 'uSplatter')!,
      uTime: gl.getUniformLocation(diffuseProg, 'uTime')!
    }

    const outputUniforms = {
      uDiffuse: gl.getUniformLocation(outputProg, 'uDiffuse')!,
      uEdge: gl.getUniformLocation(outputProg, 'uEdge')!,
      uPaper: gl.getUniformLocation(outputProg, 'uPaper')!,
      uRes: gl.getUniformLocation(outputProg, 'uRes')!
    }

    glRef.current = {
      diffuseProg,
      fbo: [
        { fb: null!, tex: null! },
        { fb: null!, tex: null! }
      ],
      firstFrame: true,
      gl,
      outputProg,
      pingPong: 0,
      srcTex,
      uniforms: { diffuse: diffuseUniforms, output: outputUniforms }
    }

    // Firefly canvas
    fireflyCanvas.current = document.createElement('canvas')
    const ffDpr = window.devicePixelRatio || 1
    fireflyCanvas.current.width = ~~(window.innerWidth * ffDpr)
    fireflyCanvas.current.height = ~~(window.innerHeight * ffDpr)
    fireflyCanvas.current.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:150;width:${window.innerWidth}px;height:${window.innerHeight}px`
    document.body.appendChild(fireflyCanvas.current)

    const ffGl = fireflyCanvas.current.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false
    })!

    const ffProg = createProgram(ffGl, wcVert, fireflyFrag)
    ffGl.bindBuffer(ffGl.ARRAY_BUFFER, ffGl.createBuffer())
    ffGl.bufferData(ffGl.ARRAY_BUFFER, FULLSCREEN_QUAD, ffGl.STATIC_DRAW)
    const ffAPos = ffGl.getAttribLocation(ffProg, 'aPos')
    ffGl.enableVertexAttribArray(ffAPos)
    ffGl.vertexAttribPointer(ffAPos, 2, ffGl.FLOAT, false, 0, 0)
    ffGl.enable(ffGl.BLEND)
    ffGl.blendFunc(ffGl.SRC_ALPHA, ffGl.ONE)
    ffGl.clearColor(0, 0, 0, 0)

    const ffUniforms = {
      uRes: ffGl.getUniformLocation(ffProg, 'uRes')!,
      uSeed: ffGl.getUniformLocation(ffProg, 'uSeed')!,
      uTime: ffGl.getUniformLocation(ffProg, 'uTime')!
    }

    fireflyGlRef.current = { gl: ffGl, prog: ffProg, uniforms: ffUniforms }

    const generateScene = (cols: number, rows: number) => {
      const groundY = ~~(rows * 0.7),
        n = cols * rows,
        bs = seed.current

      dims.current = { cols, groundY, rows }
      grid.current = new Float32Array(n)
      hueG.current = new Float32Array(n)
      satG.current = new Float32Array(n)
      lumG.current = new Float32Array(n)
      charG.current = Array(n).fill(null)
      segs.current = []
      frogs.current = []

      const add = (
        x: number,
        y: number,
        p: number,
        h: number,
        s: number,
        l: number,
        b: number,
        c?: string,
        t?: number
      ) => segs.current.push({ b, c, h, l, p, s, t, x, y })

      const terrainAmp = rows * 0.12
      const terrain = (x: number) => groundY + fbm(x, bs + 5000) * terrainAmp
      const pal = paletteRef.current

      // Sky
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (y < terrain(x)) {
            const t = y / groundY
            const swirl = Math.sin(x * 0.1 + y * 0.15 + rand(bs + x) * 2) * 12
            add(
              x,
              y,
              0.1,
              pal.sky + swirl + rand(bs + x * 0.1) * 15 - 7,
              pal.skyS * 0.8 + rand(bs + y) * 0.2,
              pal.skyL * 0.5 + t * 0.2 + rand(bs + x + y) * 0.08,
              0,
              rand(bs + x + y) < 0.15 ? '·' : '░'
            )
          }
        }
      }

      // Stars
      for (let s = 0; s < 20 + ~~(rand(bs + 150) * 30); s++) {
        add(
          rand(bs + 8000 + s) * cols,
          rand(bs + 8001 + s) * groundY * 0.8,
          0.25,
          pal.accent + rand(bs + s) * 20 - 10,
          0.9,
          0.7 + rand(bs + 8002 + s) * 0.3,
          20 + s,
          rand(bs + s) < 0.3 ? '✦' : '·'
        )
      }

      // Clouds
      clouds.current = []

      for (let c = 0; c < 3 + ~~(rand(bs + 200) * 3); c++) {
        const cs = bs + 1000 + c * 100
        clouds.current.push({
          dir: rand(cs + 5) < 0.5 ? 1 : -1,
          seed: cs,
          speed: 0.002 + rand(cs + 4) * 0.004,
          w: 10 + rand(cs + 2) * 12,
          x: rand(cs) * cols,
          y: rows * 0.1 + rand(cs + 1) * rows * 0.15
        })
      }

      // Sun
      const sunX = cols * 0.75 + rand(bs) * cols * 0.15,
        sunY = rows * 0.12,
        sunR = 5

      for (let ox = -sunR; ox <= sunR; ox++) {
        for (let oy = -sunR; oy <= sunR; oy++) {
          if (ox * ox + oy * oy < sunR * sunR) {
            add(
              sunX + ox,
              sunY + oy * 0.5,
              0.25,
              pal.accent,
              0.9,
              0.92,
              50,
              '█'
            )
          }
        }
      }

      // Birds
      for (let b = 0; b < 3 + ~~(rand(bs + 300) * 4); b++) {
        add(
          rand(bs + 2000 + b * 100) * cols,
          rows * 0.1 + rand(bs + 2001 + b * 100) * rows * 0.2,
          0.3,
          30,
          0.3,
          0.2,
          150 + b * 80,
          '∧'
        )
      }

      // Ground
      for (let x = 0; x < cols; x++) {
        const ty = ~~terrain(x)

        for (let y = ty; y < rows; y++) {
          const d = (y - ty) / (rows - ty + 1)
          add(
            x,
            y,
            0.4,
            pal.ground + rand(bs + x * 3 + y * 7) * 25 - 12,
            pal.groundS + rand(bs + x) * 0.2,
            pal.groundL + d * 0.12 + rand(bs + x * y) * 0.08,
            x + (y - ty) * 2,
            rand(bs + x + y * 2) < 0.4 ? '▓' : '░'
          )
        }
      }

      // Pond
      if (rand(bs + 400) > 0.3) {
        const px = cols * 0.3 + rand(bs + 401) * cols * 0.4,
          pw = 12 + rand(bs + 402) * 14

        const waterLevel = terrain(px) + 2

        for (let ox = -pw; ox <= pw; ox++) {
          const x = px + ox,
            ty = terrain(x)

          if (ty > waterLevel - 3) {
            for (let y = ~~waterLevel; y < Math.min(rows, ty + 2); y++) {
              add(
                x,
                y,
                0.5,
                pal.sky + 10,
                0.6,
                0.35 + rand(bs + ox + y) * 0.1,
                120 + Math.abs(ox) * 4,
                rand(bs + ox + y) < 0.3 ? '~' : '≈'
              )
            }
          }
        }

        for (let l = 0; l < 2 + ~~(rand(bs + 403) * 2); l++) {
          const lx = px + (rand(bs + 410 + l) - 0.5) * pw * 0.8
          add(lx, waterLevel, 0.55, 120, 0.6, 0.35, 350 + l * 60, '◎')

          if (rand(bs + 420 + l) > 0.5) {
            add(
              lx,
              waterLevel - 1,
              0.6,
              pal.accent,
              0.15,
              0.9,
              400 + l * 60,
              '✿'
            )
          }
        }
      }

      // Trees
      const drawBranch = (
        x: number,
        y: number,
        angle: number,
        len: number,
        thick: number,
        depth: number,
        s: number,
        birth: number,
        isWhite: boolean
      ) => {
        if (depth > 5 || len < 3) {
          return
        }

        for (let i = 0; i < len; i++) {
          const wobble = Math.sin(i * 0.4 + depth) * 0.05
          x += Math.cos(angle + wobble)
          y += Math.sin(angle + wobble)
          const t = thick * (1 - (i / len) * 0.4)

          for (let w = -t; w <= t; w++) {
            const char = depth === 0 ? (rand(s + i + w) < 0.3 ? '║' : '│') : '│'

            if (isWhite) {
              add(
                x + w * 0.4,
                y,
                0.68,
                40,
                0.08,
                0.82 - depth * 0.03,
                birth + i * 2,
                char
              )
            } else {
              add(
                x + w * 0.4,
                y,
                0.68,
                25 + rand(s + i) * 8,
                0.35,
                0.15 + depth * 0.02,
                birth + i * 2,
                char
              )
            }
          }
        }

        if (depth < 4) {
          const numB =
            depth === 0 ? 3 + ~~(rand(s + 100) * 2) : 2 + ~~(rand(s + 200) * 2)

          for (let b = 0; b < numB; b++) {
            const spread = depth === 0 ? 0.8 : 0.6

            const bAngle =
              angle +
              (rand(s + b * 50) - 0.5) * spread +
              (b - (numB - 1) / 2) * 0.25

            drawBranch(
              x,
              y,
              bAngle,
              len * (0.5 + rand(s + b * 60) * 0.3),
              thick * 0.6,
              depth + 1,
              s + b * 1000,
              birth + len * 2,
              isWhite
            )
          }
        }

        if (depth >= 2) {
          const leafHue = pal.tree + (rand(s + 400) - 0.5) * 25

          for (let f = 0; f < 5 + ~~(rand(s + 300) * 5); f++) {
            const fAngle =
              angle + (f / 10 - 0.5) * PI * 1.2 + (rand(s + f * 10) - 0.5) * 0.4

            const fLen = 6 + rand(s + f * 20) * 8,
              droop = 0.04 + rand(s + f * 30) * 0.04

            let fx = x,
              fy = y

            for (let i = 0; i < fLen; i++) {
              const t = i / fLen,
                droopAngle = fAngle + t * t * droop * 3

              fx += Math.cos(droopAngle) * 0.9
              fy += Math.sin(droopAngle) * 0.7
              const fw = (1 - t) * 2 + 0.5

              for (let w = -fw; w <= fw; w++) {
                add(
                  fx + w * 0.35,
                  fy,
                  0.73,
                  leafHue + (rand(s + f + i) - 0.5) * 25,
                  pal.treeS,
                  pal.treeL - 0.1 + rand(s + i) * 0.15,
                  birth + len * 2 + f * 10 + i * 2,
                  rand(s + f + i + w) < 0.4 ? '▓' : '░'
                )
              }
            }
          }
        }
      }

      for (let t = 0; t < 3 + ~~(rand(bs + 1) * 4); t++) {
        const ts = bs + t * 1000,
          slot = (t + 0.5) / (3 + ~~(rand(bs + 1) * 4))

        const tx =
          cols * 0.1 + slot * cols * 0.8 + (rand(ts) - 0.5) * cols * 0.12

        drawBranch(
          tx,
          terrain(tx),
          -PI / 2 + (rand(ts + 2) - 0.5) * 0.4,
          rows * 0.3 + rand(ts + 1) * rows * 0.2,
          2.5 + rand(ts + 5) * 3.5,
          0,
          ts,
          t * 200,
          rand(ts + 4) < 0.35
        )
      }

      // Flowers
      const flowerHues = [350, 45, 280, 320, 25]

      for (let f = 0; f < 8 + ~~(rand(bs + 100) * 10); f++) {
        const fs = bs + 2000 + f * 100,
          fx = cols * 0.05 + rand(fs) * cols * 0.9,
          fy = terrain(fx) - 1

        const roll = rand(fs + 50)

        const fh =
          roll < 0.55
            ? pal.flower
            : roll < 0.8
              ? 45
              : flowerHues[f % 5] + rand(fs + 1) * 15

        const isWhite = roll >= 0.55 && roll < 0.8

        const sh = 2 + rand(fs + 2) * 3,
          birth = 250 + f * 60

        for (let s = 0; s < sh; s++) {
          add(fx, fy - s, 0.8, 110, 0.5, 0.3, birth + s * 8, undefined, 0.3)
        }

        for (let p = 0; p < 5 + ~~(rand(fs + 3) * 3); p++) {
          const pa = (p / (5 + ~~(rand(fs + 3) * 3))) * PI * 2
          add(
            fx + Math.cos(pa) * 1.3,
            fy - sh + Math.sin(pa) * 0.7,
            0.82,
            fh,
            isWhite ? 0.1 : 0.85,
            isWhite ? 0.9 : 0.65,
            birth + sh * 8 + p * 6,
            '✿',
            0.45
          )
        }

        add(fx, fy - sh, 0.85, 45, 0.9, 0.85, birth + sh * 10, '●')
      }

      // Grass
      const grassTint = rand(bs + 999) * 15 - 7

      for (let g = 0; g < 25 + ~~(rand(bs + 300) * 20); g++) {
        const gs = bs + 4000 + g * 50,
          gx = rand(gs) * cols,
          gy = terrain(gx) - 1,
          birth = 100 + g * 10

        for (let b = 0; b < 3 + ~~(rand(gs + 2) * 3); b++) {
          const ba = -PI / 2 + (rand(gs + b) - 0.5) * 0.7,
            bl = 1 + rand(gs + b + 10) * 3.5

          let bx = gx + (b - 1.5) * 0.3,
            by = gy

          for (let s = 0; s < bl; s++) {
            bx += Math.cos(ba + Math.sin(s * 0.5) * 0.1)
            by += Math.sin(ba)
            add(
              bx,
              by,
              0.6,
              pal.tree + grassTint + rand(gs + s) * 30 - 15,
              pal.treeS,
              pal.treeL - 0.05,
              birth + b * 5 + s * 4,
              undefined,
              0.2
            )
          }
        }
      }

      // Frogs
      for (let fr = 0; fr < 1 + ~~(rand(bs + 500) * 2); fr++) {
        const frogX = cols * 0.2 + rand(bs + 6000 + fr * 100) * cols * 0.6
        frogs.current.push({
          b: 500 + fr * 120,
          h: 115 + rand(bs + 6000 + fr * 100) * 25,
          x: frogX,
          y: terrain(frogX) - 1
        })
      }

      // Mushrooms
      const mushHues = [5, 25, 35, 350]

      for (let m = 0; m < 2 + ~~(rand(bs + 200) * 3); m++) {
        const ms = bs + 3000 + m * 100,
          mx = cols * 0.1 + rand(ms) * cols * 0.8,
          my = terrain(mx) - 1

        const mh =
          rand(ms + 10) < 0.5 ? pal.accent : mushHues[m % 4] + rand(ms + 1) * 15

        const birth = 400 + m * 100
        add(mx, my, 0.75, 40, 0.2, 0.7, birth, '│')
        add(mx - 1, my - 1, 0.76, mh, 0.7, 0.5, birth + 15, '▄')
        add(mx, my - 1, 0.77, mh, 0.8, 0.55, birth + 25, '█')
        add(mx + 1, my - 1, 0.76, mh, 0.7, 0.5, birth + 35, '▄')
      }

      // Butterflies
      const butterflyHues = [340, 30, 280, 200, 50]

      for (let b = 0; b < 3 + ~~(rand(bs + 600) * 5); b++) {
        const bseed = bs + 7000 + b * 100

        const bx = cols * 0.15 + rand(bseed) * cols * 0.7,
          by = groundY * 0.35 + rand(bseed + 1) * groundY * 0.4

        const bh =
          rand(bseed + 10) < 0.35
            ? pal.accent
            : butterflyHues[b % 5] + rand(bseed + 2) * 20

        const birth = 600 + b * 100
        add(bx - 1, by, 0.9, bh, 0.85, 0.65, birth, ')')
        add(bx + 1, by, 0.9, bh, 0.9, 0.65, birth + 5, '(')
        add(bx, by, 0.9, 30, 0.3, 0.25, birth + 10, '·')
      }

      ready.current = true
    }

    const renderToBuffers = (time: number) => {
      const { cols, groundY, rows } = dims.current

      const g = grid.current!,
        hG = hueG.current!,
        sG = satG.current!,
        lG = lumG.current!,
        cG = charG.current!,
        segList = segs.current

      g.fill(0)
      hG.fill(0)
      sG.fill(0.5)
      lG.fill(0)
      cG.fill(null)

      for (let i = 0, l = segList.length; i < l; i++) {
        const seg = segList[i]
        const age = time - seg.b

        if (age < 0) {
          continue
        }

        const fade = Math.min(1, age / 80),
          ix = ~~seg.x,
          iy = ~~seg.y

        if (ix < 0 || ix >= cols || iy < 0 || iy >= rows) {
          continue
        }

        if (seg.c) {
          const i = iy * cols + ix,
            priority = seg.p * fade

          if (priority > g[i]) {
            g[i] = priority
            hG[i] = seg.h
            sG[i] = seg.s
            lG[i] = seg.l
            cG[i] = seg.c
          }
        } else if (seg.t) {
          const r = Math.ceil(seg.t)

          for (let ox = -r; ox <= r; ox++) {
            for (let oy = -r; oy <= r; oy++) {
              const px = ix + ox,
                py = iy + oy

              if (px >= 0 && px < cols && py >= 0 && py < rows) {
                const i = py * cols + px,
                  dist = Math.sqrt(ox * ox + oy * oy)

                const falloff = Math.max(0, 1 - dist / (seg.t + 0.5)),
                  priority = seg.p * fade * falloff

                if (priority > g[i]) {
                  g[i] = priority
                  hG[i] = seg.h
                  sG[i] = seg.s
                  lG[i] = seg.l
                  cG[i] = null
                }
              }
            }
          }
        }
      }

      // Clouds
      const cloudList = clouds.current

      for (let i = 0, l = cloudList.length; i < l; i++) {
        const cloud = cloudList[i]
        const drift = time * cloud.speed * cloud.dir

        const cx =
          ((cloud.x + drift) % (cols + cloud.w * 2 + 40)) - cloud.w - 20

        const t = time * 0.0003

        for (let i = 0; i < cloud.w * 5; i++) {
          const phase = t + i * 0.1

          const ox =
            (rand(cloud.seed + i * 2) - 0.5 + Math.sin(phase) * 0.08) * cloud.w

          const oy =
            (rand(cloud.seed + i * 2 + 1) -
              0.5 +
              Math.sin(phase * 0.6 + i) * 0.12) *
            2

          const px = ~~(cx + ox),
            py = ~~(cloud.y + oy)

          if (px >= 0 && px < cols && py >= 0 && py < rows) {
            const idx = py * cols + px

            if (0.2 > g[idx]) {
              g[idx] = 0.2
              hG[idx] = 40
              sG[idx] = 0.12
              lG[idx] = 0.93
              cG[idx] = rand(cloud.seed + i) < 0.4 ? '░' : '▒'
            }
          }
        }
      }

      // Frogs (in watercolor pass - skip first, it renders on top)
      const frogList = frogs.current

      for (let fi = 1, l = frogList.length; fi < l; fi++) {
        const frog = frogList[fi]
        const age = time - frog.b

        if (age < 0) {
          continue
        }

        const fade = Math.min(1, age / 80)
        const fx = ~~(frog.x + Math.sin(time * 0.0012 + frog.b) * 3)
        const fy = ~~(frog.y + Math.sin(time * 0.004 + frog.x) * 0.5)

        const draw = (
          x: number,
          y: number,
          c: string,
          h: number,
          s: number,
          l: number
        ) => {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            const i = y * cols + x

            if (0.95 * fade > g[i]) {
              g[i] = 0.95 * fade
              hG[i] = h
              sG[i] = s
              lG[i] = l
              cG[i] = c
            }
          }
        }

        // Black body
        draw(fx, fy - 1, '█', 0, 0, 0.05)
        draw(fx + 1, fy - 1, '█', 0, 0, 0.05)
        draw(fx, fy, '█', 0, 0, 0.05)
        draw(fx + 1, fy, '█', 0, 0, 0.05)
        // Eyes
        draw(fx, fy - 1, '°', 0, 0, 0.95)
        draw(fx + 1, fy - 1, '°', 0, 0, 0.95)
        // Tummy
        draw(fx, fy, '◖', frog.h, 0.8, 0.55)
        draw(fx + 1, fy, '◗', frog.h, 0.8, 0.55)
        // Arms
        draw(fx - 1, fy, '<', frog.h, 0.7, 0.45)
        draw(fx + 2, fy, '>', frog.h, 0.7, 0.45)
      }
    }

    const renderAscii = () => {
      const { cols, rows } = dims.current

      const g = grid.current!,
        hG = hueG.current!,
        sG = satG.current!,
        lG = lumG.current!,
        cG = charG.current!

      const aCtx = asciiCtx!,
        aCanvas = asciiCanvas.current!

      aCtx.fillStyle = paletteRef.current.bg
      aCtx.fillRect(0, 0, aCanvas.width, aCanvas.height)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x

          if (g[i] > 0.005) {
            aCtx.fillStyle = hsl(hG[i], sG[i], lG[i])
            aCtx.fillText(
              cG[i] || CHARS[~~(lG[i] * CHARS_MAX)],
              x * cellW,
              y * FONT_SIZE
            )
          }
        }
      }
    }

    const applyWatercolor = (
      time: number,
      params: { bleed: number; edge: number; paper: number; splatter: number }
    ) => {
      const ref = glRef.current!
      const { diffuseProg, fbo, gl, outputProg, srcTex, uniforms } = ref
      const { diffuse, output } = uniforms

      const glC = glCanvas.current!,
        w = glC.width,
        h = glC.height

      gl.bindTexture(gl.TEXTURE_2D, srcTex)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        asciiCanvas.current!
      )
      gl.viewport(0, 0, w, h)

      gl.useProgram(diffuseProg)
      gl.uniform2f(diffuse.uRes, w, h)
      gl.uniform1f(diffuse.uTime, time * 0.001)
      gl.uniform1f(diffuse.uBleed, params.bleed)
      gl.uniform1f(diffuse.uSplatter, params.splatter)

      for (let i = 0; i < 6; i++) {
        const src = ref.pingPong,
          dst = 1 - src

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[dst].fb)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, ref.firstFrame ? srcTex : fbo[src].tex)
        gl.uniform1i(diffuse.uPrev, 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, srcTex)
        gl.uniform1i(diffuse.uSource, 1)
        gl.uniform1f(diffuse.uFirst, ref.firstFrame && i === 0 ? 1.0 : 0.0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        ref.pingPong = dst

        if (i === 0) {
          ref.firstFrame = false
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.useProgram(outputProg)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fbo[ref.pingPong].tex)
      gl.uniform1i(output.uDiffuse, 0)
      gl.uniform2f(output.uRes, w, h)
      gl.uniform1f(output.uEdge, params.edge)
      gl.uniform1f(output.uPaper, params.paper)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const renderFinal = (time: number) => {
      const { cols, groundY, rows } = dims.current
      ctx.drawImage(glCanvas.current!, 0, 0, viewW, viewH)

      const pal = paletteRef.current,
        bs = seed.current

      // Sparkles
      for (let s = 0; s < 15; s++) {
        const sx = ~~(rand(bs + 9000 + s) * cols),
          sy = ~~(rand(bs + 9001 + s) * groundY * 0.7)

        const twinkle = Math.sin(time * 0.005 + s * 2) * 0.5 + 0.5

        if (twinkle > 0.3 && sy < rows && sx < cols) {
          ctx.fillStyle = `hsl(${pal.accent}, 90%, ${70 + twinkle * 25}%)`
          ctx.fillText(twinkle > 0.7 ? '✦' : '·', colX[sx], rowY[sy])
        }
      }

      // Flowers
      for (let f = 0; f < 5; f++) {
        const fx = ~~(rand(bs + 9500 + f) * cols * 0.9 + cols * 0.05)

        const fy = ~~(groundY + rand(bs + 9501 + f) * (rows - groundY) * 0.3)

        if (fx < cols && fy < rows) {
          ctx.fillStyle = `hsl(${pal.accent}, 85%, ${60 + (Math.sin(time * 0.002 + f) * 0.3 + 0.7) * 20}%)`
          ctx.fillText('✿', colX[fx], rowY[fy])
        }
      }

      // First frog (rendered after watercolor - escapes the pass)
      if (frogs.current.length > 0) {
        const frog = frogs.current[0]
        const age = time - frog.b

        if (age >= 0) {
          const fade = Math.min(1, age / 80)
          const fx = ~~(frog.x + Math.sin(time * 0.0012 + frog.b) * 3)
          const fy = ~~(frog.y + Math.sin(time * 0.004 + frog.x) * 0.5)

          if (fx >= 1 && fx + 2 < cols && fy >= 1 && fy < rows) {
            ctx.globalAlpha = fade

            // Black body background
            ctx.fillStyle = '#000'
            ctx.fillText('█', colX[fx], rowY[fy - 1])
            ctx.fillText('█', colX[fx + 1], rowY[fy - 1])
            ctx.fillText('█', colX[fx], rowY[fy])
            ctx.fillText('█', colX[fx + 1], rowY[fy])

            // White eyes
            ctx.fillStyle = '#fff'
            ctx.fillText('°', colX[fx], rowY[fy - 1])
            ctx.fillText('°', colX[fx + 1], rowY[fy - 1])

            // Green tummy
            ctx.fillStyle = `hsl(${frog.h}, 80%, 55%)`
            ctx.fillText('◖', colX[fx], rowY[fy])
            ctx.fillText('◗', colX[fx + 1], rowY[fy])

            // Green arms
            ctx.fillStyle = `hsl(${frog.h}, 70%, 45%)`
            ctx.fillText('<', colX[fx - 1], rowY[fy])
            ctx.fillText('>', colX[fx + 2], rowY[fy])

            ctx.globalAlpha = 1

            // Grass strands over frog for depth
            ctx.fillStyle = `hsl(${pal.tree}, ${pal.treeS * 100}%, ${pal.treeL * 80}%)`

            for (let gx = fx - 2; gx <= fx + 3; gx++) {
              if (gx >= 0 && gx < cols && rand(bs + gx * 7 + fy * 13) > 0.6) {
                const gc =
                  GRASS_CHARS[~~(rand(bs + gx * 11) * GRASS_CHARS.length)]

                ctx.globalAlpha = 0.7
                ctx.fillText(gc, colX[gx], rowY[fy])
              }
            }

            ctx.globalAlpha = 1
          }
        }
      }
    }

    const renderFireflies = (time: number) => {
      const ff = fireflyGlRef.current

      if (!ff) {
        return
      }

      const { gl: ffGl, prog, uniforms } = ff,
        c = fireflyCanvas.current!

      ffGl.viewport(0, 0, c.width, c.height)
      ffGl.clear(ffGl.COLOR_BUFFER_BIT)
      ffGl.useProgram(prog)
      ffGl.uniform2f(uniforms.uRes, c.width, c.height)
      ffGl.uniform1f(uniforms.uTime, time)
      ffGl.uniform1f(uniforms.uSeed, seed.current)
      ffGl.drawArrays(ffGl.TRIANGLE_STRIP, 0, 4)
    }

    const resize = () => {
      const { devicePixelRatio: dpr, innerHeight: h, innerWidth: w } = window

      if (w === viewW && h === viewH && dpr === prevDpr) {
        return
      }

      viewW = w
      viewH = h
      prevDpr = dpr
      canvas.width = ~~(w * dpr)
      canvas.height = ~~(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = font
      ctx.textBaseline = 'top'

      asciiCanvas.current!.width = ~~(w * dpr)
      asciiCanvas.current!.height = ~~(h * dpr)
      const aCtx = asciiCtx!
      aCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      aCtx.font = font
      aCtx.textBaseline = 'top'

      glCanvas.current!.width = ~~(w * dpr)
      glCanvas.current!.height = ~~(h * dpr)
      fireflyCanvas.current!.width = ~~(w * dpr)
      fireflyCanvas.current!.height = ~~(h * dpr)
      fireflyCanvas.current!.style.width = `${w}px`
      fireflyCanvas.current!.style.height = `${h}px`

      if (glRef.current) {
        const { gl } = glRef.current,
          gw = glCanvas.current!.width,
          gh = glCanvas.current!.height

        glRef.current.fbo[0] = createFBO(gl, gw, gh)
        glRef.current.fbo[1] = createFBO(gl, gw, gh)
        glRef.current.firstFrame = true
      }

      cols = Math.max(1, Math.ceil(w / cellW))
      rows = Math.max(1, Math.ceil(h / FONT_SIZE))
      colX = new Float32Array(cols)
      rowY = new Float32Array(rows)

      for (let x = 0; x < cols; x++) {
        colX[x] = x * cellW
      }

      for (let y = 0; y < rows; y++) {
        rowY[y] = y * FONT_SIZE
      }

      generateScene(cols, rows)
    }

    const render = (t: number) => {
      raf = requestAnimationFrame(render)

      if (needsRegen.current && cols && rows) {
        needsRegen.current = false
        generateScene(cols, rows)

        if (glRef.current) {
          glRef.current.firstFrame = true
        }
      }

      if (!t0) {
        t0 = t
      }

      if (!cols || !rows) {
        return
      }

      const time = t - t0
      renderToBuffers(time)
      renderAscii()

      const params = paramsRef.current

      if (params.mode === 'raw') {
        ctx.drawImage(asciiCanvas.current!, 0, 0, viewW, viewH)
      } else {
        applyWatercolor(time, params)

        if (params.mode === 'watercolor') {
          ctx.drawImage(glCanvas.current!, 0, 0, viewW, viewH)
        } else {
          renderFinal(time)
        }
      }

      renderFireflies(time)
    }

    addEventListener('resize', resize)
    resize()
    raf = requestAnimationFrame(render)

    return () => {
      removeEventListener('resize', resize)
      cancelAnimationFrame(raf)

      if (fireflyCanvas.current) {
        document.body.removeChild(fireflyCanvas.current)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0" />
}

interface Cloud {
  dir: number
  seed: number
  speed: number
  w: number
  x: number
  y: number
}

interface FireflyRef {
  gl: WebGLRenderingContext
  prog: WebGLProgram
  uniforms: FireflyUniforms
}

interface FireflyUniforms {
  uRes: WebGLUniformLocation
  uSeed: WebGLUniformLocation
  uTime: WebGLUniformLocation
}

interface Frog {
  b: number
  h: number
  x: number
  y: number
}

interface GlFbo {
  fb: WebGLFramebuffer
  tex: WebGLTexture
}

interface GlRef {
  diffuseProg: WebGLProgram
  fbo: [GlFbo, GlFbo]
  firstFrame: boolean
  gl: WebGLRenderingContext
  outputProg: WebGLProgram
  pingPong: number
  srcTex: WebGLTexture
  uniforms: GlUniforms
}

interface GlUniforms {
  diffuse: GlUniformsDiffuse
  output: GlUniformsOutput
}

interface GlUniformsDiffuse {
  uBleed: WebGLUniformLocation
  uFirst: WebGLUniformLocation
  uPrev: WebGLUniformLocation
  uRes: WebGLUniformLocation
  uSource: WebGLUniformLocation
  uSplatter: WebGLUniformLocation
  uTime: WebGLUniformLocation
}

interface GlUniformsOutput {
  uDiffuse: WebGLUniformLocation
  uEdge: WebGLUniformLocation
  uPaper: WebGLUniformLocation
  uRes: WebGLUniformLocation
}

interface Seg {
  b: number
  c?: string
  h: number
  l: number
  p: number
  s: number
  t?: number
  x: number
  y: number
}
