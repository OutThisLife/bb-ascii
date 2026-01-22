export type Coord = { x: number; y: number }
export type Context = {
  cols: number
  rows: number
  frame: number
  time: number
}
export type Pointer = { x: number; y: number; pressed: boolean }
export type Cell = { char: string; fg?: string; bg?: string }
export type Buffer = Cell[]

export type MainFn = (
  coord: Coord,
  context: Context,
  pointer: Pointer,
  buffer: Buffer
) => string | Cell

export type PostFn = (
  context: Context,
  pointer: Pointer,
  buffer: Buffer
) => void
