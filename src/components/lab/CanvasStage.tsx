import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { LabEngine } from '../../engine/LabEngine'
import type { CanvasSize, LabLayer, LayerGroup, MeshPoint, PointerState } from '../../types/lab'

type CanvasStageProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  engineRef: React.RefObject<LabEngine | null>
  layers: LabLayer[]
  selected: LabLayer | undefined
  size: CanvasSize
  background: string
  palette: string[]
  playing: boolean
  layerImages: ReadonlyMap<string, HTMLImageElement>
  shapeImages: ReadonlyMap<string, HTMLImageElement[]>
  groups: LayerGroup[]
  onPatch: (patch: Partial<LabLayer>) => void
  onFps: (fps: number) => void
  onDropImage: (file: File) => void
  onMoveText: (point: MeshPoint) => void
  onMeshChange: (points: MeshPoint[]) => void
}

export function CanvasStage({ canvasRef, engineRef, layers, selected, size, background, palette, playing, layerImages, shapeImages, groups, onPatch, onFps, onDropImage, onMoveText, onMeshChange }: CanvasStageProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<PointerState>({ x: 0.5, y: 0.5, active: false, hover: false })
  const dragTarget = useRef<{ type: 'text' | 'mesh' | 'split' | 'mask' | 'selection'; index?: number } | null>(null)
  const latest = useRef({ layers, selected, size, background, palette, playing, groups, onFps })
  const [readout, setReadout] = useState('X 0500 · Y 0500')
  const [dragging, setDragging] = useState(false)
  const [hoverPoint, setHoverPoint] = useState(-1)
  const hoverRef = useRef(-1)
  useEffect(() => { hoverRef.current = hoverPoint }, [hoverPoint])
  useEffect(() => { latest.current = { layers, selected, size, background, palette, playing, groups, onFps } })

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new LabEngine(canvasRef.current)
    engineRef.current = engine
    let animation = 0
    let time = 0
    let previous = performance.now()
    let fpsStart = previous
    let frames = 0
    const frame = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      if (latest.current.playing) time += delta
      engine.render(latest.current.layers, latest.current.size, time, pointerRef.current, latest.current.background, latest.current.palette, latest.current.groups)
      if (overlayRef.current) engine.renderMeshGuide(overlayRef.current, latest.current.selected, latest.current.size, hoverRef.current)
      frames += 1
      if (now - fpsStart >= 1000) {
        latest.current.onFps(Math.round(frames * 1000 / (now - fpsStart)))
        frames = 0
        fpsStart = now
      }
      animation = requestAnimationFrame(frame)
    }
    animation = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animation)
  }, [canvasRef, engineRef])

  useEffect(() => {
    engineRef.current?.setLayerImages(layerImages)
  }, [layerImages, engineRef])

  useEffect(() => {
    engineRef.current?.setLayerShapeImages(shapeImages)
  }, [shapeImages, engineRef])

  const coordinates = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }
  }

  const nearestMeshPoint = (point: MeshPoint) => {
    const engine = engineRef.current
    const layer = latest.current.selected
    if (!engine || !layer) return { index: -1, points: [] as MeshPoint[] }
    const pixels = engine.getMeshPoints(layer, latest.current.size)
    const points = pixels.map(([x, y]) => ({ x: x / latest.current.size.width, y: y / latest.current.size.height }))
    let index = -1
    let distance = 20
    pixels.forEach(([x, y], pointIndex) => {
      const dx = (x / latest.current.size.width - point.x) * latest.current.size.width
      const dy = (y / latest.current.size.height - point.y) * latest.current.size.height
      const next = Math.sqrt(dx * dx + dy * dy)
      if (next < distance) { index = pointIndex; distance = next }
    })
    return { index, points }
  }

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = coordinates(event)
    const activeDrag = dragTarget.current
    pointerRef.current = { ...point, active: event.buttons > 0 && !activeDrag, hover: true }
    setReadout(`X ${String(Math.round(point.x * 1000)).padStart(4, '0')} · Y ${String(Math.round(point.y * 1000)).padStart(4, '0')}`)
    if (activeDrag?.type === 'text') onMoveText(point)
    if (activeDrag?.type === 'split') {
      const paths = latest.current.selected?.splitPaths ?? []
      const activePath = paths[paths.length - 1] ?? []
      onPatch({ splitPaths: [...paths.slice(0, -1), [...activePath, point]] })
    }
    if (activeDrag?.type === 'mask') {
      const strokes = latest.current.selected?.maskStrokes ?? []
      const activeStroke = strokes[strokes.length - 1]
      if (activeStroke) onPatch({ maskStrokes: [...strokes.slice(0, -1), { ...activeStroke, points: [...activeStroke.points, point] }] })
    }
    if (activeDrag?.type === 'selection') {
      const selection = latest.current.selected?.selection
      if (selection) onPatch({ selection: { ...selection, points: selection.type === 'marquee' ? [selection.points[0], point] : [...selection.points, point] } })
    }
    if (activeDrag?.type === 'mesh' && activeDrag.index !== undefined) {
      const layer = latest.current.selected
      if (!layer) return
      const points = layer.meshPoints ?? nearestMeshPoint(point).points
      onMeshChange(points.map((entry, index) => index === activeDrag.index ? point : entry))
    } else if (latest.current.selected?.meshEditing) {
      setHoverPoint(nearestMeshPoint(point).index)
    }
  }

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = coordinates(event)
    const layer = latest.current.selected
    event.currentTarget.setPointerCapture(event.pointerId)
    if (layer?.maskEditing) {
      const stroke = { points: [point], size: layer.maskBrush, erase: layer.maskErase }
      onPatch({ maskStrokes: [...layer.maskStrokes, stroke] })
      dragTarget.current = { type: 'mask' }
      return
    }
    if (layer?.effect === 'sliced' && layer.splitEditing) {
      onPatch({ splitPaths: [...layer.splitPaths, [point]] })
      dragTarget.current = { type: 'split' }
      return
    }
    if (layer?.effect === 'displace' && layer.selectionEditing) {
      onPatch({ selection: { type: layer.selectionEditing, points: [point] } })
      dragTarget.current = { type: 'selection' }
      return
    }
    if ((layer?.kind === 'text' && !layer.shapes) || layer?.effect === 'sliced') {
      dragTarget.current = { type: 'text' }
      onMoveText(point)
      return
    }
    if (layer?.effect === 'triangulate' && layer.meshEditing) {
      const { index, points } = nearestMeshPoint(point)
      if (event.altKey && index >= 0) {
        if (points.length > 3) onMeshChange(points.filter((_, pointIndex) => pointIndex !== index))
        dragTarget.current = null
        return
      }
      if (index >= 0) dragTarget.current = { type: 'mesh', index }
      else {
        const next = [...points, point]
        onMeshChange(next)
        dragTarget.current = { type: 'mesh', index: next.length - 1 }
      }
      return
    }
    pointerRef.current = { ...point, active: true, hover: true }
  }

  const deletePoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const layer = latest.current.selected
    if (!layer?.meshEditing) return
    event.preventDefault()
    const { index, points } = nearestMeshPoint(coordinates(event))
    if (index >= 0 && points.length > 3) onMeshChange(points.filter((_, pointIndex) => pointIndex !== index))
  }

  const meshEditing = selected?.effect === 'triangulate' && selected.meshEditing
  const textSelected = (selected?.kind === 'text' && !selected.shapes) || selected?.effect === 'sliced'
  const customDrawing = Boolean(selected?.maskEditing || selected?.splitEditing || selected?.selectionEditing)
  const interactionLabel = selected?.maskEditing ? 'PAINT MASK / DRAG' : selected?.splitEditing ? 'DRAW SPLIT VECTOR / DRAG' : selected?.selectionEditing ? `DRAW ${selected.selectionEditing.toUpperCase()} SELECTION` : meshEditing ? 'MESH EDIT / ADD · DRAG · DELETE' : textSelected ? 'DRAG TYPE / DOUBLE-CLICK TO EDIT' : `POINTER FORCE / ${playing ? 'LIVE' : 'HOLD'}`

  return (
    <div
      className={`canvas-stage ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onDropImage(file)
      }}
    >
      <div className="canvas-checker" />
      <div className="canvas-fit">
        <canvas
          ref={canvasRef}
          className={`composition-canvas ${meshEditing ? 'mesh-cursor' : customDrawing ? 'drawing-cursor' : textSelected ? 'text-cursor' : ''}`}
          aria-label="Interactive generative composition. Move the pointer to influence effects, drag selected text, or edit triangulation points."
          onPointerMove={updatePointer}
          onPointerDown={pointerDown}
          onPointerUp={(event) => { dragTarget.current = null; pointerRef.current = { ...pointerRef.current, active: false }; event.currentTarget.releasePointerCapture(event.pointerId) }}
          onPointerLeave={() => { pointerRef.current = { ...pointerRef.current, active: false, hover: false }; setHoverPoint(-1) }}
          onContextMenu={deletePoint}
          onDoubleClick={() => {
            if (selected?.kind === 'text') document.querySelector<HTMLTextAreaElement>('.context-body textarea')?.focus()
            else if (selected?.effect === 'sliced') document.querySelector<HTMLInputElement>('.effect-text-controls input')?.focus()
          }}
        />
        <canvas ref={overlayRef} className="mesh-guide-overlay" aria-hidden="true" />
      </div>
      {dragging && <div className="drop-overlay"><ImagePlus size={28} /><strong>Drop onto {selected?.kind === 'effect' ? selected.name : 'an effect layer'}</strong><span>Only the selected layer changes. Your image stays in this browser.</span></div>}
      <div className="canvas-readout"><span>{readout}</span><span>{interactionLabel}</span></div>
    </div>
  )
}
