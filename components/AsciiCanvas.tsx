'use client'

import { useEffect, useRef } from 'react'

import type { Buffer, Context, MainFn, Pointer, PostFn } from '@/types/ascii'

export default function AsciiCanvas({
  bg = '#fff',
  canvasRef,
  className = 'fixed inset-0',
  fg = '#000',
  fontSize = 12,
  main,
  post,
  speed = 1
}: AsciiCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null)
  const ref = canvasRef || internalRef

  useEffect(() => {
    const canvas = ref.current

    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')!
    const font = `${fontSize}px monospace`
    const pointer: Pointer = { pressed: false, x: -1, y: -1 }
    const buffer: Buffer = []

    let cellW = 0
    let cols = 0
    let rows = 0
    let viewW = 0
    let viewH = 0
    let prevDpr = 0
    let colX = new Float32Array(0)
    let rowY = new Float32Array(0)
    let raf = 0
    let t0 = 0
    let frame = 0

    ctx.font = font
    ctx.textBaseline = 'top'

    const onMove = (e: MouseEvent) => {
      pointer.x = cellW ? e.clientX / cellW : -1
      pointer.y = e.clientY / fontSize
    }

    const onLeave = () => (pointer.x = pointer.y = -1)
    const onDown = () => (pointer.pressed = true)
    const onUp = () => (pointer.pressed = false)

    const resize = () => {
      const { devicePixelRatio: dpr, innerHeight: h, innerWidth: w } = window

      if (w === viewW && h === viewH && dpr === prevDpr) {
        return
      }

      viewW = w
      viewH = h
      prevDpr = dpr

      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!cellW) {
        cellW = ctx.measureText('M').width
      }

      cols = Math.max(1, Math.ceil(w / cellW))
      rows = Math.max(1, Math.ceil(h / fontSize))
      buffer.length = cols * rows

      colX = new Float32Array(cols)

      for (let x = 0; x < cols; x++) {
        colX[x] = x * cellW
      }

      rowY = new Float32Array(rows)

      for (let y = 0; y < rows; y++) {
        rowY[y] = y * fontSize
      }
    }

    const render = (t: number) => {
      raf = requestAnimationFrame(render)

      if (!t0) {
        t0 = t
      }

      if (!cols || !rows) {
        return
      }

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, viewW, viewH)
      const time = (t - t0) * speed

      const context: Context = {
        cols,
        frame: frame++,
        height: viewH,
        rows,
        time,
        width: viewW
      }

      let lastFill = bg

      const setFill = (color: string) => {
        if (color !== lastFill) {
          ctx.fillStyle = color
          lastFill = color
        }
      }

      if (post) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x
            const result = main({ x, y }, context, pointer, buffer)

            buffer[i] = typeof result === 'string' ? { char: result } : result
          }
        }

        post(context, pointer, buffer)

        for (let y = 0; y < rows; y++) {
          const py = rowY[y]

          for (let x = 0; x < cols; x++) {
            const cell = buffer[y * cols + x]
            const px = colX[x]

            if (cell.bg && cell.bg !== bg) {
              setFill(cell.bg)
              ctx.fillRect(px, py, cellW, fontSize)
            }

            if (cell.char !== ' ') {
              setFill(cell.fg ?? fg)
              ctx.fillText(cell.char, px, py)
            }
          }
        }
      } else {
        for (let y = 0; y < rows; y++) {
          const py = rowY[y]

          for (let x = 0; x < cols; x++) {
            const i = y * cols + x
            const result = main({ x, y }, context, pointer, buffer)
            const cell = typeof result === 'string' ? { char: result } : result

            buffer[i] = cell

            if (cell.bg && cell.bg !== bg) {
              setFill(cell.bg)
              ctx.fillRect(colX[x], py, cellW, fontSize)
            }

            if (cell.char !== ' ') {
              setFill(cell.fg ?? fg)
              ctx.fillText(cell.char, colX[x], py)
            }
          }
        }
      }
    }

    addEventListener('mousemove', onMove)
    addEventListener('mouseleave', onLeave)
    addEventListener('mousedown', onDown)
    addEventListener('mouseup', onUp)
    addEventListener('resize', resize)
    resize()
    raf = requestAnimationFrame(render)

    return () => {
      removeEventListener('mousemove', onMove)
      removeEventListener('mouseleave', onLeave)
      removeEventListener('mousedown', onDown)
      removeEventListener('mouseup', onUp)
      removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [bg, fg, fontSize, main, post, speed])

  return <canvas {...{ className, ref }} />
}

export interface AsciiCanvasProps {
  bg?: string
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
  className?: string
  fg?: string
  fontSize?: number
  main: MainFn
  post?: PostFn
  speed?: number
}
