export type Vec2 = { x: number; y: number }

export const vec2 = (x: number, y: number): Vec2 => ({ x, y })
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x * b.x, y: a.y * b.y })
export const mulN = (a: Vec2, n: number): Vec2 => ({ x: a.x * n, y: a.y * n })
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y
export const length = (a: Vec2) => Math.sqrt(a.x * a.x + a.y * a.y)

export const normalize = (a: Vec2) => {
  const l = length(a)

  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }
}

export const abs = (a: Vec2): Vec2 => ({ x: Math.abs(a.x), y: Math.abs(a.y) })

export const max = (a: Vec2, b: Vec2): Vec2 => ({
  x: Math.max(a.x, b.x),
  y: Math.max(a.y, b.y)
})

export const min = (a: Vec2, b: Vec2): Vec2 => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y)
})

export const maxN = (a: Vec2, n: number): Vec2 => ({
  x: Math.max(a.x, n),
  y: Math.max(a.y, n)
})

export const rot = (a: Vec2, angle: number): Vec2 => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)

  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }
}

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

export const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t
export const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
export const step = (edge: number, x: number) => (x < edge ? 0 : 1)

export const PHI = 1.618033988749

export const tri = (t: number) => 1 - Math.abs(2 * (((t % 1) + 1) % 1) - 1)

export const easeSin = (t: number) => {
  const x = tri(t)

  return (-(Math.cos(Math.PI * x) - 1) / 2) * 2 - 1
}

export const easeCubic = (t: number) => {
  const x = tri(t)

  return (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2) * 2 - 1
}

// SDF primitives
export const sdCircle = (p: Vec2, r: number) => length(p) - r

export const sdBox = (p: Vec2, b: Vec2) => {
  const d = sub(abs(p), b)

  return length(maxN(d, 0)) + Math.min(Math.max(d.x, d.y), 0)
}

export const sdRoundedBox = (p: Vec2, b: Vec2, r: number) => sdBox(p, b) - r

export const sdSegment = (p: Vec2, a: Vec2, b: Vec2) => {
  const pa = sub(p, a)
  const ba = sub(b, a)
  const h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1)

  return length(sub(pa, mulN(ba, h)))
}

export const sdCapsule = (p: Vec2, a: Vec2, b: Vec2, r: number) =>
  sdSegment(p, a, b) - r

export const sdRhombus = (p: Vec2, b: Vec2) => {
  const q = abs(p)
  const h = clamp((-2 * dot(q, b) + dot(b, b)) / dot(b, b), -1, 1)
  const d = length(sub(q, mulN(b, vec2(1 - h, 1 + h).x * 0.5)))

  return d * sign(q.x * b.y + q.y * b.x - b.x * b.y)
}

export const sdEquilateralTriangle = (p: Vec2, r: number) => {
  const k = Math.sqrt(3)
  let px = Math.abs(p.x) - r
  let py = p.y + r / k

  if (px + k * py > 0) {
    const nx = (px - k * py) / 2
    const ny = (-k * px - py) / 2
    px = nx
    py = ny
  }

  px -= clamp(px, -2 * r, 0)

  return -length(vec2(px, py)) * sign(py)
}

export const sdIsoscelesTriangle = (p: Vec2, q: Vec2) => {
  const px = Math.abs(p.x)
  const a = sub(vec2(px, p.y), vec2(q.x, q.y))
  const b = sub(vec2(px, p.y), vec2(0, 0))
  const ba = sub(vec2(q.x, q.y), vec2(0, 0))
  const s = sign(q.x)
  const d1 = length(sub(a, mulN(ba, clamp(dot(a, ba) / dot(ba, ba), 0, 1))))

  const d2 =
    Math.abs(px - clamp(px, 0, q.x)) + Math.abs(p.y - q.y) * step(0, p.y - q.y)

  return (
    Math.sqrt(Math.min(d1 * d1, d2)) * s * sign(p.y * q.x - px * q.y + px * q.y)
  )
}

export const sdTriangle = (p: Vec2, p0: Vec2, p1: Vec2, p2: Vec2) => {
  const e0 = sub(p1, p0)
  const e1 = sub(p2, p1)
  const e2 = sub(p0, p2)
  const v0 = sub(p, p0)
  const v1 = sub(p, p1)
  const v2 = sub(p, p2)

  const pq0 = sub(v0, mulN(e0, clamp(dot(v0, e0) / dot(e0, e0), 0, 1)))
  const pq1 = sub(v1, mulN(e1, clamp(dot(v1, e1) / dot(e1, e1), 0, 1)))
  const pq2 = sub(v2, mulN(e2, clamp(dot(v2, e2) / dot(e2, e2), 0, 1)))

  const s = sign(e0.x * e2.y - e0.y * e2.x)

  const d = min(
    min(
      vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
      vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))
    ),
    vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x))
  )

  return -Math.sqrt(d.x) * sign(d.y)
}

export const sdEllipse = (p: Vec2, ab: Vec2) => {
  const px = Math.abs(p.x)
  const py = Math.abs(p.y)

  const abi = vec2(1 / ab.x, 1 / ab.y)
  const e = vec2(ab.x * ab.x - ab.y * ab.y, ab.y * ab.y - ab.x * ab.x)

  let t = 0.7071067811865476

  for (let i = 0; i < 3; i++) {
    const xy = vec2(ab.x * t, ab.y * Math.sqrt(1 - t * t))
    const ex = e.x * t * t * t * abi.x
    const ey = e.y * (1 - t * t) * Math.sqrt(1 - t * t) * abi.y
    const rx = px - xy.x - ex
    const ry = py - xy.y - ey
    const qx = px - xy.x + ex
    const qy = py - xy.y + ey
    const r = length(vec2(rx, ry))
    const q = length(vec2(qx, qy))
    t = clamp((q * t + r * Math.sqrt(1 - t * t)) / (r + q), 0, 1)
  }

  const xy = vec2(ab.x * t, ab.y * Math.sqrt(1 - t * t))
  const d = length(sub(vec2(px, py), xy))

  return d * sign(py - xy.y)
}

export const sdParabola = (p: Vec2, k: number) => {
  const px = Math.abs(p.x)
  const ik = 1 / k
  const u = ik * (k * k + px - Math.sqrt(k * k * k * k + px * px))
  const d1 = length(vec2(px, p.y)) - 0.25 * ik
  const d2 = length(sub(vec2(px, p.y), vec2(u, k * u * u)))

  return p.y < 0 ? d1 : d2
}

export const sdArc = (p: Vec2, sc: Vec2, ra: number, rb: number) => {
  const px = Math.abs(p.x)

  return sc.y * px > sc.x * p.y
    ? length(sub(vec2(px, p.y), mulN(sc, ra))) - rb
    : Math.abs(length(vec2(px, p.y)) - ra) - rb
}

export const sdRing = (p: Vec2, n: Vec2, r: number, th: number) =>
  sdArc(p, n, r, th)

export const sdPie = (p: Vec2, c: Vec2, r: number) => {
  const px = Math.abs(p.x)
  const l = length(vec2(px, p.y)) - r

  const m = length(
    sub(vec2(px, p.y), mulN(c, clamp(dot(vec2(px, p.y), c), 0, r)))
  )

  return Math.max(l, m * sign(c.y * px - c.x * p.y))
}

export const sdHorseshoe = (
  p: Vec2,
  c: Vec2,
  r: number,
  w: number,
  h: number
) => {
  let px = Math.abs(p.x)
  let py = p.y
  const l = length(vec2(px, py))
  const nx = -c.x * px + c.y * py
  const ny = c.y * px + c.x * py
  px = nx < 0 ? l * sign(-c.x) : nx
  py = ny

  return vec2(
    (px - clamp(px, 0, w)) * (px - clamp(px, 0, w)) +
      (py - r) * (py - r) * step(py, r) +
      (py + h) * (py + h) * step(-h, -py),
    0
  ).x
}

export const sdVesica = (p: Vec2, r: number, d: number) => {
  const px = Math.abs(p.x)
  const py = Math.abs(p.y)
  const b = Math.sqrt(r * r - d * d)

  return py - b > d * px
    ? length(sub(vec2(px, py), vec2(0, b)))
    : length(sub(vec2(px, py), vec2(-d, 0))) - r
}

export const sdMoon = (p: Vec2, d: number, ra: number, rb: number) => {
  const py = Math.abs(p.y)
  const a = (ra * ra - rb * rb + d * d) / (2 * d)
  const b = Math.sqrt(Math.max(ra * ra - a * a, 0))

  if (d * (p.x * b - py * a) > d * d * Math.max(b - py, 0)) {
    return length(sub(vec2(p.x, py), vec2(a, b)))
  }

  return Math.max(
    length(vec2(p.x, py)) - ra,
    -(length(sub(vec2(p.x, py), vec2(d, 0))) - rb)
  )
}

export const sdCross = (p: Vec2, b: Vec2) => {
  let px = Math.abs(p.x)
  let py = Math.abs(p.y)

  if (py > px) {
    ;[px, py] = [py, px]
  }

  const q = sub(vec2(px, py), b)
  const k = Math.max(q.y, q.x)
  const w = k > 0 ? q : vec2(b.y - px, -k)

  return sign(k) * length(maxN(w, 0))
}

export const sdRoundedX = (p: Vec2, w: number, r: number) => {
  const px = Math.abs(p.x)
  const py = Math.abs(p.y)

  return (
    length(sub(vec2(px, py), mulN(vec2(1, 1), Math.min(px + py, w) * 0.5))) - r
  )
}

export const sdStar5 = (p: Vec2, r: number, rf: number) => {
  const k1 = vec2(0.809016994, -0.587785252)
  const k2 = vec2(-k1.x, k1.y)
  let px = Math.abs(p.x)
  let py = p.y
  px -= 2 * Math.max(dot(k1, vec2(px, py)), 0) * k1.x
  py -= 2 * Math.max(dot(k1, vec2(px, py)), 0) * k1.y
  px -= 2 * Math.max(dot(k2, vec2(px, py)), 0) * k2.x
  py -= 2 * Math.max(dot(k2, vec2(px, py)), 0) * k2.y
  px = Math.abs(px)
  py -= r

  const ba = mulN(vec2(-k1.y, k1.x), rf)
  const h = clamp(dot(vec2(px, py), ba) / dot(ba, ba), 0, r)

  return length(sub(vec2(px, py), mulN(ba, h))) * sign(py * ba.x - px * ba.y)
}

export const sdHexagon = (p: Vec2, r: number) => {
  const k = vec2(-0.866025404, 0.5)
  let px = Math.abs(p.x)
  let py = Math.abs(p.y)
  px -= 2 * Math.min(dot(k, vec2(px, py)), 0) * k.x
  py -= 2 * Math.min(dot(k, vec2(px, py)), 0) * k.y
  px -= clamp(px, -r * k.x * 2, r * k.x * 2)

  return length(vec2(px, py - r)) * sign(py - r)
}

export const sdPentagon = (p: Vec2, r: number) => {
  const k = vec2(0.809016994, 0.587785252)
  let px = Math.abs(p.x)
  let py = -p.y
  px -= 2 * Math.min(dot(vec2(-k.x, k.y), vec2(px, py)), 0) * -k.x
  py -= 2 * Math.min(dot(vec2(-k.x, k.y), vec2(px, py)), 0) * k.y
  px -= 2 * Math.min(dot(vec2(k.x, k.y), vec2(px, py)), 0) * k.x
  py -= 2 * Math.min(dot(vec2(k.x, k.y), vec2(px, py)), 0) * k.y
  px -= clamp(px, -r * k.y, r * k.y)
  py -= r

  return length(vec2(px, py)) * sign(py)
}

export const sdOctagon = (p: Vec2, r: number) => {
  const k = vec2(-0.9238795325, 0.3826834323)
  let px = Math.abs(p.x)
  let py = Math.abs(p.y)
  px -= 2 * Math.min(dot(k, vec2(px, py)), 0) * k.x
  py -= 2 * Math.min(dot(k, vec2(px, py)), 0) * k.y
  px -= 2 * Math.min(dot(vec2(-k.x, k.y), vec2(px, py)), 0) * -k.x
  py -= 2 * Math.min(dot(vec2(-k.x, k.y), vec2(px, py)), 0) * k.y
  px -= clamp(px, -r * k.y * 2, r * k.y * 2)

  return length(vec2(px, py - r)) * sign(py - r)
}

export const sdHeart = (p: Vec2) => {
  const px = Math.abs(p.x)
  const py = p.y

  if (py + px > 1) {
    return Math.sqrt((px - 0.25) ** 2 + (py - 0.75) ** 2) - Math.sqrt(2) / 4
  }

  return (
    Math.sqrt(Math.min((px - 0.5) ** 2 + py ** 2, (px + py - 1) ** 2 / 2)) *
    sign(px - py)
  )
}

export const opUnion = (d1: number, d2: number) => Math.min(d1, d2)
export const opSubtraction = (d1: number, d2: number) => Math.max(-d1, d2)
export const opIntersection = (d1: number, d2: number) => Math.max(d1, d2)
export const opXor = (d1: number, d2: number) =>
  Math.max(Math.min(d1, d2), -Math.max(d1, d2))

export const opSmoothUnion = (d1: number, d2: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (d2 - d1)) / k, 0, 1)

  return mix(d2, d1, h) - k * h * (1 - h)
}

export const opSmoothSubtraction = (d1: number, d2: number, k: number) => {
  const h = clamp(0.5 - (0.5 * (d2 + d1)) / k, 0, 1)

  return mix(d2, -d1, h) + k * h * (1 - h)
}

export const opSmoothIntersection = (d1: number, d2: number, k: number) => {
  const h = clamp(0.5 - (0.5 * (d2 - d1)) / k, 0, 1)

  return mix(d2, d1, h) + k * h * (1 - h)
}

export const opRound = (d: number, r: number) => d - r
export const opOnion = (d: number, r: number) => Math.abs(d) - r

export const opRepeat = (p: Vec2, c: Vec2): Vec2 => ({
  x: ((((p.x + c.x * 0.5) % c.x) + c.x) % c.x) - c.x * 0.5,
  y: ((((p.y + c.y * 0.5) % c.y) + c.y) % c.y) - c.y * 0.5
})

export const opSymX = (p: Vec2): Vec2 => ({ x: Math.abs(p.x), y: p.y })
export const opSymY = (p: Vec2): Vec2 => ({ x: p.x, y: Math.abs(p.y) })
export const opSymXY = (p: Vec2): Vec2 => abs(p)
