'use client'

import { folder, useControls } from 'leva'
import { useEffect, useRef } from 'react'

const hash = (x: number, y: number) =>
  (n => n - Math.floor(n))(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453)

export function Noise() {
  const ref = useRef<HTMLCanvasElement>(null)

  const { density, enabled, opacity, size } = useControls({
    Noise: folder(
      {
        density: { max: 1, min: 0, step: 0.01, value: 0.15 },
        enabled: { value: true },
        opacity: { max: 1, min: 0, step: 0.01, value: 0.4 },
        size: { max: 8, min: 1, step: 1, value: 2 }
      },
      { collapsed: true }
    )
  })

  useEffect(() => {
    if (!ref.current || !enabled) {
      return
    }

    const canvas = ref.current
    const ctx = canvas.getContext('2d')!

    const render = () => {
      const { devicePixelRatio: dpr, innerHeight: h, innerWidth: w } = window
      const px = size * dpr

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = `rgba(255,255,255,${opacity})`

      for (let y = 0; y < canvas.height / px; y++) {
        for (let x = 0; x < canvas.width / px; x++) {
          if (hash(x, y) < density) {
            ctx.fillRect(x * px, y * px, px, px)
          }
        }
      }
    }

    render()
    addEventListener('resize', render)

    return () => removeEventListener('resize', render)
  }, [density, enabled, opacity, size])

  if (!enabled) {
    return null
  }

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0"
      style={{ mixBlendMode: 'overlay' }}
    />
  )
}
