'use client'

import { useEffect, useRef } from 'react'

import type { Buffer, Context, MainFn, Pointer, PostFn } from '@/types/ascii'

export default function AsciiCanvas({
  bg = '#fff',
  className = 'fixed inset-0',
  fg = '#000',
  fontSize = 12,
  main,
  post,
  speed = 1
}: AsciiCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

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
    let prevW = 0
    let prevH = 0
    let raf = 0
    let t0 = 0
    let frame = 0

    const onMove = (e: MouseEvent) => {
      pointer.x = cellW ? e.clientX / cellW : -1
      pointer.y = e.clientY / fontSize
    }

    const onLeave = () => (pointer.x = pointer.y = -1)
    const onDown = () => (pointer.pressed = true)
    const onUp = () => (pointer.pressed = false)

    const render = (t: number) => {
      raf = requestAnimationFrame(render)

      if (!t0) {
        t0 = t
      }

      const { devicePixelRatio: dpr, innerHeight: h, innerWidth: w } = window

      if (w !== prevW || h !== prevH) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        prevW = w
        prevH = h
        cellW = 0
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.font = font
      ctx.textBaseline = 'top'

      if (!cellW) {
        cellW = ctx.measureText('M').width
      }

      const cols = Math.ceil(w / cellW)
      const rows = Math.ceil(h / fontSize)
      const time = (t - t0) * speed
      const context: Context = { cols, frame: frame++, rows, time }

      buffer.length = cols * rows

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          const result = main({ x, y }, context, pointer, buffer)

          buffer[i] = typeof result === 'string' ? { char: result } : result
        }
      }

      post?.(context, pointer, buffer)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = buffer[y * cols + x]

          if (cell.bg) {
            ctx.fillStyle = cell.bg
            ctx.fillRect(x * cellW, y * fontSize, cellW, fontSize)
          }

          ctx.fillStyle = cell.fg ?? fg
          ctx.fillText(cell.char, x * cellW, y * fontSize)
        }
      }
    }

    addEventListener('mousemove', onMove)
    addEventListener('mouseleave', onLeave)
    addEventListener('mousedown', onDown)
    addEventListener('mouseup', onUp)
    raf = requestAnimationFrame(render)

    return () => {
      removeEventListener('mousemove', onMove)
      removeEventListener('mouseleave', onLeave)
      removeEventListener('mousedown', onDown)
      removeEventListener('mouseup', onUp)
      cancelAnimationFrame(raf)
    }
  }, [bg, fg, fontSize, main, post, speed])

  return <canvas {...{ className, ref }} />
}

export interface AsciiCanvasProps {
  bg?: string
  className?: string
  fg?: string
  fontSize?: number
  main: MainFn
  post?: PostFn
  speed?: number
}
