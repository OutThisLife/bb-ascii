'use client'

import { useControls } from 'leva'
import { useMemo } from 'react'

import AsciiCanvas from '@/components/AsciiCanvas'
import { Noise } from '@/components/Noise'
import { opSmoothUnion, sdBox, sdCircle, sdHexagon, vec2 } from '@/lib/ops'
import type { MainFn } from '@/types/ascii'

const density = ' ·:╱╲╳◢◣◆▓█'
const glitch = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▀▄▌▐■□▪▫●○◐◑◒◓'

const invert = (hex: string, alpha = 1) => {
  const c = hex.replace('#', '')
  const r = 255 - parseInt(c.slice(0, 2), 16)
  const g = 255 - parseInt(c.slice(2, 4), 16)
  const b = 255 - parseInt(c.slice(4, 6), 16)

  return `rgba(${r},${g},${b},${alpha})`
}

const gnarl = (x: number, y: number, s: number, n: number, t: number) => {
  for (let i = 0; i < n; i++) {
    const phase = t + i * 0.3
    const nx = x - s * Math.sin(y + Math.sin(y + phase))
    const ny = y + s * Math.cos(x + Math.cos(x - phase))
    x = nx
    y = ny
  }

  return { x, y }
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
    bg: { label: 'Window BG', value: '#000000' },
    c1: { label: 'Outer', value: '#b9dbeb' },
    c2: { label: 'Inner', value: '#669fb1' },
    c3: { label: 'Overlap', value: '#313131' },
    fluid: { label: 'Fluid', max: 0.5, min: 0.05, step: 0.01, value: 0.4 },
    frame: { label: 'Frame', value: '#ffffff' },
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

        // window grid - local coords for frame mask only
        const wx = (x / cols) * windows
        const wy = (y / rows) * windows
        const cellX = Math.floor(wx)
        const cellY = Math.floor(wy)
        const localX = (wx % 1) * 2 - 1
        const localY = (wy % 1) * 2 - 1

        // window frame check
        const frameD = sdBox(vec2(localX, localY), vec2(1 - gap, 1 - gap))

        if (frameD > 0) {
          return { bg: frameBg, char: ' ', fg: frameBg }
        }

        // middle window flag
        const midCell = Math.floor(windows / 2)
        const isMiddle = cellX === midCell && cellY === midCell

        // global coords - seamless flow across windows
        let px = ((x - cols / 2) / m) * scale * 0.5
        let py = ((y - rows / 2) / m) * scale

        // gnarl warp with time-varying phase
        const g = gnarl(px, py, fluid, iters, t)

        // breathing radius
        const breath = Math.sin(t * 2) * 0.08

        // tessellate in warped space
        const cell = 0.5 + breath * 0.3
        const gx = ((((g.x % cell) + cell) % cell) - cell / 2) * 2
        const gy = ((((g.y % cell) + cell) % cell) - cell / 2) * 2

        // morphing shapes
        const morph = Math.sin(t * 1.5) * 0.5 + 0.5
        const d1 = sdHexagon(vec2(gx, gy), 0.22 + breath)
        const d2 = sdCircle(vec2(gx * 1.2, gy * 0.8), 0.15 * (1 + morph * 0.5))

        const d3 = sdCircle(
          vec2(gx + Math.sin(t) * 0.1, gy + Math.cos(t * 1.3) * 0.1),
          0.1
        )

        // fluid blend
        let d = opSmoothUnion(d1, d2, 0.35 + morph * 0.15)
        d = opSmoothUnion(d, d3, 0.4)

        // undulating ripple
        const r = Math.sqrt(px * px + py * py)
        d += Math.sin(r * 8 - t * 4 + g.x * 2) * 0.03

        // parallax inversion layer - inverted coords, slower time, deeper scale
        const g2 = gnarl(-px * 1.5, -py * 1.5, fluid * 0.7, iters, -t * 0.6)
        const cell2 = 0.35
        const gx2 = ((((g2.x % cell2) + cell2) % cell2) - cell2 / 2) * 2
        const gy2 = ((((g2.y % cell2) + cell2) % cell2) - cell2 / 2) * 2

        const deep = sdHexagon(vec2(gx2, gy2), 0.18)

        // layer flags for color overlay
        const outerOn = d < 0.15 && d > -0.3 ? 1 : 0
        const innerOn = deep < 0.1 ? 2 : 0
        const layer = outerOn + innerOn

        // density from combined distance
        const edge = 1 - Math.exp(-6 * Math.abs(d))
        const inner = 1 - Math.exp(-8 * Math.abs(deep))
        const fill = d < 0 ? inner : edge

        const i = Math.floor(fill * (density.length - 1))

        // middle window - translucent glitch overlay + inverted pattern
        if (isMiddle) {
          // per-cell speed variation (4-30 updates per t unit)
          const cellSpeed = 4 + ((x * 7 + y * 13) % 26)
          const qt = Math.floor(t * cellSpeed)
          const hash = Math.sin(x * 12.9898 + y * 78.233 + qt) * 43758.5453
          const rand = hash - Math.floor(hash)

          // blend: ~33% glitch, 67% inverted pattern shows through
          if (rand < 0.33) {
            const gi = Math.floor(rand * 3 * glitch.length) % glitch.length

            return { bg: '#fff', char: glitch[gi], fg: '#000' }
          }

          // true color inversion, 50% fg opacity
          return {
            bg: invert(bg),
            char: density[i],
            fg: invert(colors[layer], 0.5)
          }
        }

        return { bg, char: density[i], fg: colors[layer] }
      },
    [bg, c1, c2, c3, colors, fluid, frameBg, gap, iters, scale, speed, windows]
  )

  return (
    <>
      <AsciiCanvas {...{ main }} />
      <Noise />
    </>
  )
}
