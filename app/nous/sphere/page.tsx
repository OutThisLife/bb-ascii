'use client'

import { useControls } from 'leva'
import { useMemo } from 'react'

import AsciiCanvas from '@/components/AsciiCanvas'
import { Noise } from '@/components/Noise'
import { useAsciiOrbitControls } from '@/hooks/use-ascii-orbit-controls'
import type { MainFn } from '@/types/ascii'

import { LightningCanvas } from './lightning'

const CHARS = ' ·:;+=░▒▓█'
const R = 0.4

const hexToRgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16)

  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

// NOUSNET logo data
const NOUS = ['N', 'O', 'U', 'S'].map((letter, i) => ({
  letter,
  rows: [
    '██░░░██,██░░░██,███░░██,█░██░██,█░░████,█░░░███,██░░░██,██░░░██,██░░░██',
    '░█████░,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,░█████░',
    '██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,░█████░',
    '░█████░,██░░░██,██░░░░░,░████░░,░░░░██░,░░░░░██,██░░░██,██░░░██,░█████░'
  ][i].split(',')
}))

const NET = [
  '█░░░█░█████░█████',
  '██░░█░█████░█████',
  '███░█░██░░░░░░█░░',
  '█░███░█████░░░█░░',
  '█░░██░█████░░░█░░',
  '█░░░█░██░░░░░░█░░',
  '█░░░█░█████░░░█░░',
  '█░░░█░█████░░░█░░'
]

const hash = (x: number, y: number) =>
  ((n: number) => n - Math.floor(n))(
    Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  )

const charAt = (t: number) =>
  CHARS[Math.min(CHARS.length - 1, Math.floor(t * CHARS.length))]

const rot = (a: number, b: number, angle: number) => {
  const c = Math.cos(angle),
    s = Math.sin(angle)

  return [a * c - b * s, a * s + b * c] as const
}

const gridDist = (v: number, step: number) =>
  Math.abs(v / step - Math.round(v / step)) * step

export default function Page() {
  const { autoSpin, bg, fg, lat, logo, lon, wire } = useControls('Sphere', {
    autoSpin: { label: 'Spin', max: 0.5, min: 0, step: 0.01, value: 0.05 },
    bg: { label: 'Background', value: '#003aff' },
    fg: { label: 'Foreground', value: '#ffffff' },
    lat: { label: 'Latitude', max: 48, min: 8, step: 1, value: 19 },
    logo: { label: 'Logo', value: true },
    lon: { label: 'Longitude', max: 48, min: 8, step: 1, value: 30 },
    wire: { label: 'Wire', max: 0.2, min: 0.01, step: 0.005, value: 0.05 }
  })

  const {
    bolts,
    branches,
    colorCore,
    colorGlow,
    intensity,
    jagged,
    sparks,
    speed,
    syncSpin
  } = useControls('Lightning', {
    bolts: { label: 'Bolts', max: 12, min: 0, step: 1, value: 12 },
    branches: { label: 'Branches', value: false },
    colorCore: { label: 'Core', value: '#aacaff' },
    colorGlow: { label: 'Glow', value: '#ffffff' },
    intensity: { label: 'Bloom', max: 1.5, min: 0, step: 0.05, value: 0.95 },
    jagged: { label: 'Jagged', max: 0.4, min: 0, step: 0.01, value: 0.2 },
    sparks: { label: 'Sparks', max: 3, min: 0, step: 0.1, value: 1.5 },
    speed: { label: 'Speed', max: 1.5, min: 0.1, step: 0.05, value: 0.75 },
    syncSpin: { label: 'Sync Spin', value: true }
  })

  const { handlers, orbit, pan } = useAsciiOrbitControls({ damping: 0.85 })

  const [fgR, fgG, fgB] = hexToRgb(fg)
  const empty = { bg, char: ' ', fg: bg }

  const main = useMemo<MainFn>(
    () =>
      ({ x, y }, { cols, height, rows, time, width }) => {
        const aspect = cols / rows / 2
        const nx = (x / cols - 0.5) * aspect
        const ny = y / rows - 0.5

        // Logo rendering (on top)
        if (logo) {
          const t = time * 0.001

          const lh = 0.32,
            lw = lh * 2.6

          if (Math.abs(nx) <= lw / 2 && Math.abs(ny) <= lh / 2) {
            const lx = (nx + lw / 2) / lw
            const ly = (ny + lh / 2) / lh

            // NOUS
            if (lx < 0.55) {
              const tx = (lx / 0.55) * 29.8
              const idx = Math.floor(tx / 7.6)
              const cx = Math.floor(tx - idx * 7.6)
              const cy = Math.floor(ly * 9)

              if (idx >= 0 && idx <= 3 && cx < 7) {
                const { letter, rows: r } = NOUS[idx]
                const row = r[cy]

                if (row && cx < row.length && row[cx] === '█') {
                  const localT = Math.max(0, t - idx * 0.4)
                  const phase1 = Math.min(1, localT)
                  const phase2 = Math.min(1, Math.max(0, localT - 1))
                  const reveal = phase1 * 1.5 - hash(cx, cy + idx * 10) * 0.5

                  if (phase1 < 1) {
                    if (reveal <= 0) {
                      return empty
                    }

                    const ci = Math.floor(reveal * (CHARS.length - 1))

                    return {
                      bg,
                      char: ci < CHARS.length - 1 ? CHARS[ci] : letter,
                      fg
                    }
                  }

                  const morph = phase2 + hash(cx, cy) * 0.3

                  return { bg: morph > 0.8 ? fg : bg, char: charAt(morph), fg }
                }
              }
            } else {
              // NET
              const bx = ((lx - 0.55) / 0.45 - 0.05) / 0.9
              const rowIdx = Math.floor(ly * 8)
              const rowY = ly * 8 - rowIdx
              const col = Math.floor(bx * 17)
              const barT = Math.max(0, t - 2 - rowIdx * 0.15)

              if (
                bx >= 0 &&
                bx <= 1 &&
                rowIdx >= 0 &&
                rowIdx < 8 &&
                col >= 0 &&
                col < 17
              ) {
                if (
                  NET[rowIdx][col] === '█' &&
                  barT > 0 &&
                  rowY >= 0.18 &&
                  rowY <= 0.82
                ) {
                  const fade = Math.min(1, barT * 2)

                  return { bg: fade > 0.7 ? fg : bg, char: charAt(fade), fg }
                }
              }
            }
          }
        }

        // Sphere rendering
        const px = (x / cols - 0.5 - pan.x) * (width / height)
        const py = y / rows - 0.5 - pan.y
        const d2 = px * px + py * py

        if (d2 > R * R) {
          return empty
        }

        const pz = Math.sqrt(R * R - d2)
        const depth = (pz / R) * 0.5 + 0.5

        let [sx, sy, sz] = [px / R, py / R, pz / R]

        ;[sy, sz] = rot(sy, sz, orbit.x)
        ;[sx, sz] = rot(sx, sz, orbit.y + time * 0.001 * autoSpin)

        const latD = gridDist(
          Math.asin(Math.max(-1, Math.min(1, sy))) + Math.PI / 2,
          Math.PI / lat
        )

        const lonD = gridDist(Math.atan2(sz, sx) + Math.PI, (Math.PI * 2) / lon)
        const w = wire * (0.3 + depth * 0.7)

        if (Math.min(latD, lonD) > w) {
          return empty
        }

        const edge = 1 - Math.min(latD, lonD) / w

        const i = Math.min(
          CHARS.length - 1,
          Math.floor(edge * (0.4 + depth * 0.6) * CHARS.length)
        )

        const m = 0.4 + depth * 0.6

        return {
          bg,
          char: CHARS[i],
          fg: `rgba(${(fgR * m) | 0},${(fgG * m) | 0},${(fgB * m) | 0},${depth})`
        }
      },
    [autoSpin, bg, empty, fg, fgB, fgG, fgR, lat, logo, lon, orbit, pan, wire]
  )

  return (
    <div
      className="fixed inset-0 cursor-grab active:cursor-grabbing"
      {...handlers}
    >
      <AsciiCanvas
        bg={bg}
        className="pointer-events-none size-full"
        main={main}
      />
      <LightningCanvas
        autoSpin={autoSpin}
        boltCount={bolts}
        branches={branches}
        className="fixed inset-0 z-10"
        colorCore={colorCore}
        colorGlow={colorGlow}
        intensity={intensity}
        jagged={jagged}
        orbit={orbit}
        pan={pan}
        radius={R}
        sparks={sparks}
        speed={speed}
        syncSpin={syncSpin}
      />
      <Noise />
    </div>
  )
}
