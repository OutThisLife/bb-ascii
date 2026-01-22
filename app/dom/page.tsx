'use client'

import { useEffect, useRef, useState } from 'react'

const chars = 'Ñ@#W$987654321░0?!abc;:+=-,._ '
const n = chars.length
const mod = (x: number) => ((x % n) + n) % n

const style = { fontFamily: 'monospace', fontSize: 12, lineHeight: '12px' }

export default function Page() {
  const ref = useRef<HTMLPreElement>(null)
  const [grid, setGrid] = useState<string[]>([])

  useEffect(() => {
    const el = ref.current

    if (!el) {
      return
    }

    let frame = 0
    let last = 0
    let cellW = 0
    let raf: number

    const render = (t: number) => {
      raf = requestAnimationFrame(render)

      if (t - last < 33) {
        return
      }

      last = t

      const { height, width } = el.getBoundingClientRect()

      if (!width || !height) {
        return
      }

      if (!cellW) {
        const span = document.createElement('span')
        span.textContent = 'X'.repeat(50)
        el.appendChild(span)
        cellW = span.getBoundingClientRect().width / 50
        el.removeChild(span)
      }

      const cols = Math.ceil(width / cellW)
      const rows = Math.ceil(height / 12)

      setGrid(Array.from({ length: rows }, () => '?'.repeat(cols)))

      // setGrid(
      //   Array.from({ length: rows }, (_, y) => {
      //     const sign = (y % 2) * 2 - 1

      //     return Array.from(
      //       { length: cols },
      //       (_, x) => chars[mod(cols + y + x * sign + frame)]
      //     ).join('')
      //   })
      // )

      frame++
    }

    const ro = new ResizeObserver(() => (cellW = 0))
    ro.observe(el)

    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <pre
      ref={ref}
      className="m-0 h-dvh w-dvw overflow-hidden p-0"
      {...{ style }}
    >
      {grid.map((row, i) => (
        <span key={i} className="block" {...{ style }}>
          {row}
        </span>
      ))}
    </pre>
  )
}
