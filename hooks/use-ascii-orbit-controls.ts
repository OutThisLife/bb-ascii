import { useCallback, useEffect, useRef, useState } from 'react'

type Vec2 = { x: number; y: number }

interface DragState {
  isPan: boolean
  last: Vec2
  start: Vec2
  startOrbit: Vec2
  startPan: Vec2
}

export interface OrbitConfig {
  damping?: number
  initialOrbit?: Vec2
  initialPan?: Vec2
  sensitivity?: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

const ZERO: Vec2 = { x: 0, y: 0 }

export function useAsciiOrbitControls({
  damping = 0.85,
  initialOrbit = { x: 0.5, y: 0 },
  initialPan = ZERO,
  sensitivity = 2
}: OrbitConfig = {}) {
  const [orbit, setOrbit] = useState(initialOrbit)
  const [pan, setPan] = useState(initialPan)
  const [vel, setVel] = useState(ZERO)
  const drag = useRef<DragState | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      drag.current = {
        isPan: e.shiftKey || e.button === 2,
        last: { x: e.clientX, y: e.clientY },
        start: { x: e.clientX, y: e.clientY },
        startOrbit: orbit,
        startPan: pan
      }
      setVel(ZERO)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [orbit, pan]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current

      if (!d) {
        return
      }

      const s = sensitivity
      const dx = ((e.clientX - d.start.x) / innerWidth) * s
      const dy = ((e.clientY - d.start.y) / innerHeight) * s
      const vx = ((e.clientX - d.last.x) / innerWidth) * s
      const vy = ((e.clientY - d.last.y) / innerHeight) * s

      d.last = { x: e.clientX, y: e.clientY }

      if (d.isPan) {
        setPan({ x: d.startPan.x + dx * 0.5, y: d.startPan.y + dy * 0.5 })
        setVel({ x: vx * 0.5, y: vy * 0.5 })
      } else {
        setOrbit({
          x: clamp(d.startOrbit.x + dy * 2, -1.5, 1.5),
          y: d.startOrbit.y + dx * Math.PI * 2
        })
        setVel({ x: vy * 2, y: vx * Math.PI * 2 })
      }
    },
    [sensitivity]
  )

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => e.preventDefault(),
    []
  )

  useEffect(() => {
    if (drag.current || (Math.abs(vel.x) < 1e-4 && Math.abs(vel.y) < 1e-4)) {
      return
    }

    const raf = requestAnimationFrame(() => {
      if (!drag.current) {
        setOrbit(o => ({ x: clamp(o.x + vel.x, -1.5, 1.5), y: o.y + vel.y }))
        setVel(v => ({ x: v.x * damping, y: v.y * damping }))
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [damping, vel])

  return {
    handlers: { onContextMenu, onPointerDown, onPointerMove, onPointerUp },
    orbit,
    pan,
    setOrbit,
    setPan
  }
}
