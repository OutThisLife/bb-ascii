'use client'

import { useControls } from 'leva'
import { useMemo } from 'react'

import AsciiCanvas from '@/components/AsciiCanvas'
import { Noise } from '@/components/Noise'
import {
  easeCubic,
  easeSin,
  opSmoothUnion,
  PHI,
  sdBox,
  sdCircle,
  sdHexagon,
  vec2
} from '@/lib/ops'
import type { MainFn } from '@/types/ascii'

const CHARS = ' ·:╱╲╳◢◣◆▓█'
const GLITCH = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▀▄▌▐■□▪▫●○◐◑◒◓'

const invert = (hex: string, a = 1) => {
  const c = hex.replace('#', '')

  return `rgba(${255 - parseInt(c.slice(0, 2), 16)},${255 - parseInt(c.slice(2, 4), 16)},${255 - parseInt(c.slice(4, 6), 16)},${a})`
}

const gnarl = (x: number, y: number, s: number, n: number, t: number) => {
  for (let i = 0; i < n; i++) {
    const p = t + i / PHI

    ;[x, y] = [
      x - s * Math.sin(y + Math.sin(y + p)),
      y + s * Math.cos(x + Math.cos(x - p * PHI))
    ]
  }

  return { x, y }
}

const tile = (v: number, size: number) =>
  ((((v % size) + size) % size) - size / 2) * 2

const hash = (x: number, y: number, t: number) => {
  const h = Math.sin(x * 12.9898 + y * 78.233 + t) * 43758.5453

  return h - Math.floor(h)
}

export default function Page() {
  const {
    bg,
    c1,
    c2,
    c3,
    fluid,
    frame: frameBg,
    gap,
    iters,
    scale,
    speed,
    windows
  } = useControls({
    bg: { label: 'Window BG', value: '#08212a' },
    c1: { label: 'Outer', value: '#b9dbeb' },
    c2: { label: 'Inner', value: '#669fb1' },
    c3: { label: 'Overlap', value: '#313131' },
    fluid: { label: 'Fluid', max: 0.5, min: 0.05, step: 0.01, value: 0.4 },
    frame: { label: 'Frame', value: '#f9fafb' },
    gap: { label: 'Gap', max: 0.3, min: 0.02, step: 0.01, value: 0.08 },
    iters: { label: 'Iterations', max: 10, min: 2, step: 1, value: 2 },
    scale: { label: 'Scale', max: 5, min: 1, step: 0.1, value: 1.8 },
    speed: { label: 'Speed', max: 1.5, min: 0, step: 0.05, value: 0.1 },
    windows: { label: 'Windows', max: 6, min: 1, step: 1, value: 3 }
  })

  const colors = useMemo(() => [bg, c1, c2, c3], [bg, c1, c2, c3])

  const main = useMemo<MainFn>(
    () =>
      ({ x, y }, { cols, rows, time }) => {
        const m = Math.min(cols, rows)
        const t = time * 0.001 * speed

        // window grid
        const wx = (x / cols) * windows
        const wy = (y / rows) * windows
        const localX = (wx % 1) * 2 - 1
        const localY = (wy % 1) * 2 - 1

        if (sdBox(vec2(localX, localY), vec2(1 - gap, 1 - gap)) > 0) {
          return { bg: frameBg, char: ' ', fg: frameBg }
        }

        // coords
        const px = ((x - cols / 2) / m) * scale * 0.5
        const py = ((y - rows / 2) / m) * scale
        const g = gnarl(px, py, fluid, iters, t)

        // outer layer
        const breath = easeSin(t * PHI * 0.5) * 0.08
        const cell = 0.5 + breath * 0.3
        const gx = tile(g.x, cell)
        const gy = tile(g.y, cell)

        const morph = easeCubic((t / PHI) * 0.5) * 0.5 + 0.5

        let d = opSmoothUnion(
          sdHexagon(vec2(gx, gy), 0.22 + breath),
          sdCircle(vec2(gx * 1.2, gy * 0.8), 0.15 * (1 + morph * 0.5)),
          0.35 + morph * 0.15
        )

        d = opSmoothUnion(
          d,
          sdCircle(
            vec2(
              gx + easeSin((t / PHI) * 0.3) * 0.1,
              gy + easeCubic((t / PHI / PHI) * 0.3) * 0.1
            ),
            0.1
          ),
          0.4
        )

        d += Math.sin(Math.hypot(px, py) * 8 - t * PHI * 2 + g.x * PHI) * 0.03

        // inner layer (parallax)
        const g2 = gnarl(-px * 1.5, -py * 1.5, fluid * 0.7, iters, -t / PHI)
        const deep = sdHexagon(vec2(tile(g2.x, 0.35), tile(g2.y, 0.35)), 0.18)

        // combine
        const layer = (d < 0.15 && d > -0.3 ? 1 : 0) + (deep < 0.1 ? 2 : 0)

        const fill =
          d < 0
            ? 1 - Math.exp(-8 * Math.abs(deep))
            : 1 - Math.exp(-6 * Math.abs(d))

        const i = Math.floor(fill * (CHARS.length - 1))

        // middle window: glitch + invert
        const mid = Math.floor(windows / 2)

        if (Math.floor(wx) === mid && Math.floor(wy) === mid) {
          const rand = hash(x, y, Math.floor(t * (4 + ((x * 7 + y * 13) % 26))))

          return rand < 0.33
            ? {
                bg: '#fff',
                char: GLITCH[
                  Math.floor(rand * 3 * GLITCH.length) % GLITCH.length
                ],
                fg: '#000'
              }
            : { bg: invert(bg), char: CHARS[i], fg: invert(colors[layer], 0.5) }
        }

        return { bg, char: CHARS[i], fg: colors[layer] }
      },
    [bg, c1, c2, c3, colors, fluid, frameBg, gap, iters, scale, speed, windows]
  )

  return (
    <>
      <AsciiCanvas main={main} />
      <Noise />
    </>
  )
}
