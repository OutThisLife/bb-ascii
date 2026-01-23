'use client'

import { useMemo } from 'react'

import AsciiCanvas from '@/components/AsciiCanvas'
import { Noise } from '@/components/Noise'
import { sdRoundedBox, vec2 } from '@/lib/ops'
import type { MainFn } from '@/types/ascii'

const BG = '#dde1e6'
const TEXT = '#1d1d1d'
const BLUE = '#0040ff'
const EMPTY = { bg: BG, char: ' ', fg: BG }
const CHARS = ' ·:;+=░▒▓█'

const hash = (x: number, y: number) =>
  ((n: number) => n - Math.floor(n))(
    Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  )

const charAt = (t: number) =>
  CHARS[Math.min(CHARS.length - 1, Math.floor(t * CHARS.length))]

const NOUS = ['N', 'O', 'U', 'S'].map((letter, i) => ({
  letter,
  rows: [
    i === 0
      ? '██░░░██,██░░░██,███░░██,█░██░██,█░░████,█░░░███,██░░░██,██░░░██,██░░░██'
      : i === 1
        ? '░█████░,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,░█████░'
        : i === 2
          ? '██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,██░░░██,░█████░'
          : '░█████░,██░░░██,██░░░░░,░████░░,░░░░██░,░░░░░██,██░░░██,██░░░██,░█████░'
  ][0].split(',')
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

export default function Page() {
  const main = useMemo<MainFn>(
    () =>
      ({ x, y }, { cols, rows, time }) => {
        const t = time * 0.001
        const aspect = cols / rows / 2
        const nx = (x / cols - 0.5) * aspect
        const ny = y / rows - 0.5
        const h = 0.38
        const w = h * 2.6

        if (Math.abs(nx) > w / 2 || Math.abs(ny) > h / 2) {
          return EMPTY
        }

        const lx = (nx + w / 2) / w
        const ly = (ny + h / 2) / h

        // NOUS
        if (lx < 0.55) {
          const tx = (lx / 0.55) * 29.8
          const idx = Math.floor(tx / 7.6)
          const cx = Math.floor(tx - idx * 7.6)
          const cy = Math.floor(ly * 9)

          if (idx < 0 || idx > 3 || cx >= 7) {
            return EMPTY
          }

          const { letter, rows: r } = NOUS[idx]
          const row = r[cy]

          if (!row || cx >= row.length || row[cx] !== '█') {
            return EMPTY
          }

          const localT = Math.max(0, t - idx * 0.4)
          const phase1 = Math.min(1, localT)
          const phase2 = Math.min(1, Math.max(0, localT - 1))
          const reveal = phase1 * 1.5 - hash(cx, cy + idx * 10) * 0.5

          if (phase1 < 1) {
            if (reveal <= 0) {
              return EMPTY
            }

            const ci = Math.floor(reveal * (CHARS.length - 1))

            return {
              bg: BG,
              char: ci < CHARS.length - 1 ? CHARS[ci] : letter,
              fg: TEXT
            }
          }

          const morph = phase2 + hash(cx, cy) * 0.3

          return { bg: morph > 0.8 ? TEXT : BG, char: charAt(morph), fg: TEXT }
        }

        // NET
        const bx = ((lx - 0.55) / 0.45 - 0.05) / 0.9
        const rowIdx = Math.floor(ly * 8)
        const rowY = ly * 8 - rowIdx
        const col = Math.floor(bx * 17)
        const barT = Math.max(0, t - 2 - rowIdx * 0.15)

        if (
          bx < 0 ||
          bx > 1 ||
          rowIdx < 0 ||
          rowIdx >= 8 ||
          rowY < 0.18 ||
          rowY > 0.82 ||
          col < 0 ||
          col >= 17 ||
          NET[rowIdx][col] !== '█' ||
          barT <= 0 ||
          sdRoundedBox(
            vec2((bx * 17 - col - 0.5) * 2, ((rowY - 0.18) / 0.64 - 0.5) * 2),
            vec2(0.7, 0.7),
            0.4
          ) >= 0
        ) {
          return EMPTY
        }

        const fade = Math.min(1, barT * 2)

        return { bg: fade > 0.7 ? BLUE : BG, char: charAt(fade), fg: BLUE }
      },
    []
  )

  return (
    <>
      <AsciiCanvas bg={BG} main={main} />
      <Noise />
    </>
  )
}
