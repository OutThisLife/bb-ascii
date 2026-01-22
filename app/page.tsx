'use client'

import { useControls } from 'leva'
import { useMemo } from 'react'

import AsciiCanvas from '@/components/AsciiCanvas'
import { Noise } from '@/components/Noise'
import type { MainFn } from '@/types/ascii'

const chars = ' ░▒▓█'

const hex = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16)

export default function Page() {
  const { bg, color1, color2, speed } = useControls({
    bg: { label: 'Background', value: '#fff8f5' },
    color1: { label: 'Color 1', value: '#c7077b' },
    color2: { label: 'Color 2', value: '#ffcdcd' },
    speed: { label: 'Speed', max: 3, min: 0.2, value: 1 }
  })

  const main: MainFn = useMemo(() => {
    const c1 = { b: hex(color1, 5), g: hex(color1, 3), r: hex(color1, 1) }
    const c2 = { b: hex(color2, 5), g: hex(color2, 3), r: hex(color2, 1) }

    return ({ x, y }, { cols, rows, time }) => {
      const t = time * 0.001 * speed
      const nx = (x - cols / 2) / (rows * 0.8)
      const ny = (y - rows / 2) / (rows * 0.4)
      const dist = Math.sqrt(nx * nx + ny * ny)

      if (dist > 0.9) {
        return { bg, char: ' ' }
      }

      const angle = Math.atan2(ny, nx)
      const twist = Math.sin(angle * 3 + t * 2) * 0.3

      const shade =
        Math.sin(dist * 8 - t * 3) * 0.4 +
        Math.sin(angle * 6 + t * 2) * 0.3 +
        twist +
        0.5

      const blend =
        (Math.sin(((angle + Math.PI + t) / (Math.PI * 2)) * Math.PI * 2) + 1) /
        2

      const r = Math.floor(c1.r * blend + c2.r * (1 - blend))
      const g = Math.floor(c1.g * blend + c2.g * (1 - blend))
      const b = Math.floor(c1.b * blend + c2.b * (1 - blend))

      return {
        bg,
        char: chars[Math.floor(Math.max(0, Math.min(4, shade * 5)))],
        fg: `rgb(${r},${g},${b})`
      }
    }
  }, [bg, color1, color2, speed])

  return (
    <>
      <AsciiCanvas {...{ main }} />
      <Noise />
    </>
  )
}
