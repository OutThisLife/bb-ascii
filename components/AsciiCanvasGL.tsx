'use client'

import { useEffect, useRef } from 'react'

import type { Buffer, Context, MainFn, Pointer, PostFn } from '@/types/ascii'

const VERT = `#version 300 es
layout(location = 0) in vec2 a_quad;
layout(location = 1) in vec2 a_pos;
layout(location = 2) in float a_char;

uniform vec2 u_resolution;
uniform vec2 u_cellSize;
uniform float u_atlasCols;

out vec2 v_uv;

void main() {
  v_uv = vec2((mod(a_char, u_atlasCols) + a_quad.x) / u_atlasCols, a_quad.y);
  vec2 ndc = (a_pos + a_quad) * u_cellSize / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0, 1);
}
`

const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_atlas;
uniform vec3 u_fg;
uniform vec3 u_bg;

void main() {
  fragColor = vec4(mix(u_bg, u_fg, texture(u_atlas, v_uv).a), 1);
}
`

const hex = (s: string) => {
  const c = s.replace('#', '')
  const x = c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c

  return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255)
}

export default function AsciiCanvasGL({
  bg = '#fff',
  chars = ' .:-=+*#%@',
  className = 'fixed inset-0',
  fg = '#000',
  fontSize = 12,
  main,
  post,
  speed = 1
}: AsciiCanvasGLProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current

    if (!canvas) {
      return
    }

    const gl = canvas.getContext('webgl2', { antialias: false })

    if (!gl) {
      return console.error('WebGL2 not supported')
    }

    const font = `${fontSize}px monospace`
    const measure = document.createElement('canvas').getContext('2d')!

    measure.font = font

    const cellW = Math.ceil(measure.measureText('M').width)
    const cellH = fontSize
    const atlasCols = chars.length

    const atlas = document.createElement('canvas')

    atlas.width = atlasCols * cellW
    atlas.height = cellH

    const actx = atlas.getContext('2d')!

    actx.font = font
    actx.fillStyle = 'white'
    actx.textBaseline = 'top'

    for (let i = 0; i < chars.length; i++) {
      actx.fillText(chars[i], i * cellW, 0)
    }

    const vertShader = gl.createShader(gl.VERTEX_SHADER)!
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!

    gl.shaderSource(vertShader, VERT)
    gl.shaderSource(fragShader, FRAG)
    gl.compileShader(vertShader)
    gl.compileShader(fragShader)

    const program = gl.createProgram()!

    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)

    const u = {
      atlasCols: gl.getUniformLocation(program, 'u_atlasCols'),
      bg: gl.getUniformLocation(program, 'u_bg'),
      cellSize: gl.getUniformLocation(program, 'u_cellSize'),
      fg: gl.getUniformLocation(program, 'u_fg'),
      resolution: gl.getUniformLocation(program, 'u_resolution')
    }

    const texture = gl.createTexture()!

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const quadBuffer = gl.createBuffer()!
    const indexBuffer = gl.createBuffer()!
    const posBuffer = gl.createBuffer()!
    const charBuffer = gl.createBuffer()!
    const vao = gl.createVertexArray()!

    gl.bindVertexArray(vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      gl.STATIC_DRAW
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(1, 1)

    gl.bindBuffer(gl.ARRAY_BUFFER, charBuffer)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(2, 1)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    )

    gl.bindVertexArray(null)

    const pointer: Pointer = { pressed: false, x: -1, y: -1 }
    const buffer: Buffer = []

    let posData = new Float32Array(0)
    let charData = new Float32Array(0)
    let prevCols = 0
    let prevRows = 0
    let raf = 0
    let t0 = 0
    let frame = 0

    const onMove = (e: MouseEvent) => {
      pointer.x = e.clientX / cellW
      pointer.y = e.clientY / cellH
    }

    const onLeave = () => (pointer.x = pointer.y = -1)
    const onDown = () => (pointer.pressed = true)
    const onUp = () => (pointer.pressed = false)

    const render = (t: number) => {
      raf = requestAnimationFrame(render)

      if (!t0) {
        t0 = t
      }

      const dpr = devicePixelRatio
      const w = innerWidth
      const h = innerHeight

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      gl.viewport(0, 0, canvas.width, canvas.height)

      const cols = Math.ceil(w / cellW)
      const rows = Math.ceil(h / cellH)
      const total = cols * rows

      if (cols !== prevCols || rows !== prevRows) {
        prevCols = cols
        prevRows = rows
        posData = new Float32Array(total * 2)
        charData = new Float32Array(total)
        buffer.length = total

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x

            posData[i * 2] = x
            posData[i * 2 + 1] = y
          }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, posData, gl.STATIC_DRAW)
      }

      const time = (t - t0) * speed

      const context: Context = {
        cols,
        frame: frame++,
        height: h,
        rows,
        time,
        width: w
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          const result = main({ x, y }, context, pointer, buffer)
          const cell = typeof result === 'string' ? { char: result } : result

          buffer[i] = cell
          charData[i] = Math.max(0, chars.indexOf(cell.char))
        }
      }

      post?.(context, pointer, buffer)

      gl.bindBuffer(gl.ARRAY_BUFFER, charBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, charData, gl.DYNAMIC_DRAW)

      const [bgR, bgG, bgB] = hex(bg)

      gl.clearColor(bgR, bgG, bgB, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)

      gl.uniform2f(u.resolution, w, h)
      gl.uniform2f(u.cellSize, cellW, cellH)
      gl.uniform1f(u.atlasCols, atlasCols)
      gl.uniform3fv(u.fg, hex(fg))
      gl.uniform3fv(u.bg, hex(bg))

      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, total)
      gl.bindVertexArray(null)
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
      gl.deleteProgram(program)
      gl.deleteShader(vertShader)
      gl.deleteShader(fragShader)
      gl.deleteTexture(texture)
      gl.deleteBuffer(quadBuffer)
      gl.deleteBuffer(indexBuffer)
      gl.deleteBuffer(posBuffer)
      gl.deleteBuffer(charBuffer)
      gl.deleteVertexArray(vao)
    }
  }, [bg, chars, fg, fontSize, main, post, speed])

  return <canvas {...{ className, ref }} />
}

export interface AsciiCanvasGLProps {
  bg?: string
  chars?: string
  className?: string
  fg?: string
  fontSize?: number
  main: MainFn
  post?: PostFn
  speed?: number
}
