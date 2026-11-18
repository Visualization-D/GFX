import Delaunator from 'delaunator'
import type { CanvasSelection, CanvasSize, LabLayer, LayerGroup, PathCommand, PointerState } from '../types/lab'

const TAU = Math.PI * 2
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const random = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function coverDraw(ctx: CanvasRenderingContext2D, source: HTMLImageElement | HTMLCanvasElement, width: number, height: number) {
  const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const scale = Math.max(width / sw, height / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh)
}

function traceGeometricShape(ctx: CanvasRenderingContext2D, type: number, radius: number, fluidity = 0, phase = 0) {
  ctx.beginPath()
  if (type === 0) {
    ctx.arc(0, 0, radius, 0, TAU)
  } else if (type === 1) {
    ctx.rect(-radius, -radius, radius * 2, radius * 2)
  } else if (type === 2) {
    ctx.moveTo(0, -radius)
    ctx.lineTo(radius * 0.866, radius * 0.5)
    ctx.lineTo(-radius * 0.866, radius * 0.5)
    ctx.closePath()
  } else if (type === 3) {
    ctx.arc(0, 0, radius, Math.PI, 0)
    ctx.closePath()
  } else if (type === 4) {
    const arm = radius * 0.32
    ctx.moveTo(-arm, -radius)
    ctx.lineTo(arm, -radius)
    ctx.lineTo(arm, -arm)
    ctx.lineTo(radius, -arm)
    ctx.lineTo(radius, arm)
    ctx.lineTo(arm, arm)
    ctx.lineTo(arm, radius)
    ctx.lineTo(-arm, radius)
    ctx.lineTo(-arm, arm)
    ctx.lineTo(-radius, arm)
    ctx.lineTo(-radius, -arm)
    ctx.lineTo(-arm, -arm)
    ctx.closePath()
  } else if (type === 5) {
    if (fluidity > 0) {
      const bend = radius * fluidity * 1.5 * (0.78 + Math.sin(phase) * 0.22)
      ctx.moveTo(-radius, 0)
      ctx.bezierCurveTo(-radius * 0.45, -bend, radius * 0.45, bend, radius, 0)
    } else {
      ctx.rect(-radius, -radius * 0.22, radius * 2, radius * 0.44)
    }
  } else if (type === 6) {
    for (let point = 0; point < 6; point += 1) {
      const angle = point * TAU / 6 - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (point === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  } else if (type === 7) {
    ctx.moveTo(0, -radius)
    ctx.lineTo(radius, 0)
    ctx.lineTo(0, radius)
    ctx.lineTo(-radius, 0)
    ctx.closePath()
  } else if (type === 8) {
    ctx.ellipse(0, 0, radius, radius * 0.68, 0, 0, TAU)
  } else {
    ctx.arc(0, 0, radius, 0, TAU)
    ctx.arc(0, 0, radius * 0.52, 0, TAU, true)
  }
}

function traceSelection(ctx: CanvasRenderingContext2D, selection: CanvasSelection, width: number, height: number) {
  ctx.beginPath()
  if (selection.type === 'marquee' && selection.points.length === 2) {
    const [a, b] = selection.points
    ctx.rect(a.x * width, a.y * height, (b.x - a.x) * width, (b.y - a.y) * height)
  } else {
    selection.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x * width, point.y * height)
      else ctx.lineTo(point.x * width, point.y * height)
    })
    ctx.closePath()
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function createDefaultSeed() {
  const canvas = makeCanvas(1400, 1000)
  const ctx = canvas.getContext('2d')!
  const paper = ctx.createLinearGradient(0, 0, 1400, 1000)
  paper.addColorStop(0, '#f4f1e8')
  paper.addColorStop(0.52, '#d8ddd5')
  paper.addColorStop(1, '#9fb8b4')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, 1400, 1000)

  const orange = ctx.createRadialGradient(1080, 260, 20, 1080, 260, 590)
  orange.addColorStop(0, '#ffb13b')
  orange.addColorStop(0.38, '#f44f05')
  orange.addColorStop(1, 'rgba(244,79,5,0)')
  ctx.fillStyle = orange
  ctx.fillRect(0, 0, 1400, 1000)

  const teal = ctx.createRadialGradient(220, 790, 30, 220, 790, 650)
  teal.addColorStop(0, '#247c83')
  teal.addColorStop(0.55, 'rgba(36,124,131,.78)')
  teal.addColorStop(1, 'rgba(36,124,131,0)')
  ctx.fillStyle = teal
  ctx.fillRect(0, 0, 1400, 1000)

  ctx.fillStyle = '#111311'
  ctx.beginPath()
  ctx.moveTo(-120, 170)
  ctx.bezierCurveTo(270, 20, 480, 510, 810, 380)
  ctx.bezierCurveTo(1080, 270, 1230, 500, 1510, 710)
  ctx.lineTo(1510, 900)
  ctx.bezierCurveTo(1180, 650, 1010, 520, 760, 630)
  ctx.bezierCurveTo(400, 770, 220, 270, -120, 430)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.translate(700, 500)
  ctx.rotate(-0.18)
  for (let line = 0; line < 11; line += 1) {
    ctx.beginPath()
    ctx.moveTo(-850, -330 + line * 64)
    ctx.bezierCurveTo(-320, -520 + line * 58, 170, 100 + line * 35, 850, -220 + line * 61)
    ctx.strokeStyle = `rgba(244,241,232,${0.16 + line * 0.035})`
    ctx.lineWidth = 3 + (line % 3)
    ctx.stroke()
  }
  ctx.restore()

  ctx.fillStyle = '#f3bf45'
  ctx.beginPath()
  ctx.arc(1110, 730, 118, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#111311'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(1110, 730, 154, 0, TAU)
  ctx.stroke()
  return canvas
}

function drawTextureTriangle(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  sourcePoints: number[][],
  destinationPoints: number[][],
) {
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = sourcePoints
  const [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = destinationPoints
  const denominator = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1)
  if (Math.abs(denominator) < 0.001) return
  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denominator
  const b = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denominator
  const c = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denominator
  const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denominator
  const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denominator
  const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denominator
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(dx0, dy0)
  ctx.lineTo(dx1, dy1)
  ctx.lineTo(dx2, dy2)
  ctx.closePath()
  ctx.clip()
  ctx.transform(a, c, b, d, e, f)
  ctx.drawImage(source, 0, 0)
  ctx.restore()
}

export class LabEngine {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private layerSeeds: ReadonlyMap<string, HTMLImageElement> = new Map()
  private layerShapeImages: ReadonlyMap<string, HTMLImageElement[]> = new Map()
  private kineticSprings = new Map<string, { x: number; y: number; vx: number; vy: number }>()
  private defaultSeed = createDefaultSeed()
  private sourceCache = new Map<string, HTMLCanvasElement>()
  private layerCache = new Map<string, HTMLCanvasElement>()
  private pointers = new Map<string, PointerState>()
  private meshCache = new Map<string, number[][]>()
  private palette: string[] = ['#f44f05', '#247c83', '#f3bf45', '#f4f1e8', '#111311']
  private lastTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
  }

  setLayerImages(images: ReadonlyMap<string, HTMLImageElement>) {
    this.layerSeeds = images
    this.sourceCache.clear()
    this.meshCache.clear()
  }

  setLayerShapeImages(images: ReadonlyMap<string, HTMLImageElement[]>) {
    this.layerShapeImages = images
  }

  private source(size: CanvasSize, layerId?: string) {
    const key = `${layerId ?? 'default'}-${size.width}x${size.height}`
    const cached = this.sourceCache.get(key)
    if (cached) return cached
    const canvas = makeCanvas(size.width, size.height)
    const ctx = canvas.getContext('2d')!
    const image = layerId ? this.layerSeeds.get(layerId) : undefined
    coverDraw(ctx, image ?? this.defaultSeed, size.width, size.height)
    this.sourceCache.set(key, canvas)
    return canvas
  }

  private sample(size: CanvasSize, maxWidth = 260, layerId?: string) {
    const key = `sample-${layerId ?? 'default'}-${size.width}x${size.height}-${maxWidth}`
    const cached = this.sourceCache.get(key)
    if (cached) return cached
    const width = Math.min(maxWidth, size.width)
    const height = Math.max(1, Math.round(width * size.height / size.width))
    const canvas = makeCanvas(width, height)
    canvas.getContext('2d', { willReadFrequently: true })!.drawImage(this.source(size, layerId), 0, 0, width, height)
    this.sourceCache.set(key, canvas)
    return canvas
  }

  private layerCanvas(layer: LabLayer, size: CanvasSize) {
    const key = `${layer.id}-${size.width}x${size.height}`
    let canvas = this.layerCache.get(key)
    if (!canvas) {
      canvas = makeCanvas(size.width, size.height)
      this.layerCache.set(key, canvas)
    }
    return canvas
  }

  private smoothPointer(layer: LabLayer, target: PointerState) {
    const previous = this.pointers.get(layer.id) ?? { x: 0.5, y: 0.5, active: false, hover: false }
    const latency = layer.params.latency ?? 0.18
    const factor = 1 - latency
    const next = {
      x: previous.x + (target.x - previous.x) * factor,
      y: previous.y + (target.y - previous.y) * factor,
      active: target.active,
      hover: target.hover,
    }
    this.pointers.set(layer.id, next)
    return next
  }

  render(layers: LabLayer[], size: CanvasSize, time: number, pointer: PointerState, background: string, palette: string[], groups: LayerGroup[] = []) {
    this.lastTime = time
    this.palette = palette.length ? palette : this.palette
    if (this.canvas.width !== size.width || this.canvas.height !== size.height) {
      this.canvas.width = size.width
      this.canvas.height = size.height
    }
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.globalAlpha = 1
    this.ctx.fillStyle = background
    this.ctx.fillRect(0, 0, size.width, size.height)

    for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
      const layer = layers[layerIndex]
      if (!layer.visible || layer.opacity <= 0) continue
      const group = layer.groupId ? groups.find((item) => item.id === layer.groupId) : undefined
      if (group && !group.visible) continue
      const canvas = this.layerCanvas(layer, size)
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, size.width, size.height)
      if (layer.kind === 'text') this.renderText(ctx, layer, size)
      else this.renderEffect(ctx, canvas, layer, size, time, this.smoothPointer(layer, pointer))
      this.applyLayerMask(ctx, layer, size)
      this.ctx.save()
      this.ctx.globalAlpha = layer.opacity
      this.ctx.globalCompositeOperation = layer.blend
      this.ctx.drawImage(canvas, 0, 0)
      this.ctx.restore()
    }
  }

  renderLayer(layer: LabLayer, size: CanvasSize, palette: string[], includeMask = true) {
    this.palette = palette.length ? palette : this.palette
    const canvas = makeCanvas(size.width, size.height)
    const ctx = canvas.getContext('2d')!
    const pointer = this.pointers.get(layer.id) ?? { x: 0.5, y: 0.5, active: false, hover: false }
    if (layer.kind === 'text') this.renderText(ctx, layer, size)
    else this.renderEffect(ctx, canvas, layer, size, this.lastTime, pointer)
    if (includeMask) this.applyLayerMask(ctx, layer, size)
    return canvas
  }

  renderLayerMask(layer: LabLayer, size: CanvasSize) {
    const alphaMask = this.createLayerMask(layer, size)
    if (!alphaMask) return null
    const mask = makeCanvas(size.width, size.height)
    const ctx = mask.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.drawImage(alphaMask, 0, 0)
    return mask
  }

  private createLayerMask(layer: LabLayer, size: CanvasSize) {
    if (!layer.maskStrokes?.length) return null
    const mask = makeCanvas(size.width, size.height)
    const maskCtx = mask.getContext('2d')!
    maskCtx.fillStyle = '#ffffff'
    maskCtx.fillRect(0, 0, size.width, size.height)
    maskCtx.lineCap = 'round'
    maskCtx.lineJoin = 'round'
    for (const stroke of layer.maskStrokes) {
      maskCtx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
      maskCtx.strokeStyle = '#ffffff'
      maskCtx.fillStyle = '#ffffff'
      maskCtx.lineWidth = Math.max(1, stroke.size)
      maskCtx.beginPath()
      stroke.points.forEach((point, index) => {
        const x = point.x * size.width
        const y = point.y * size.height
        if (index === 0) maskCtx.moveTo(x, y)
        else maskCtx.lineTo(x, y)
      })
      if (stroke.points.length === 1) {
        maskCtx.arc(stroke.points[0].x * size.width, stroke.points[0].y * size.height, stroke.size / 2, 0, TAU)
        maskCtx.fill()
      } else maskCtx.stroke()
    }
    return mask
  }

  private applyLayerMask(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize) {
    const mask = this.createLayerMask(layer, size)
    if (!mask) return
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(mask, 0, 0)
    ctx.restore()
  }

  private renderEffect(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    layer: LabLayer,
    size: CanvasSize,
    time: number,
    pointer: PointerState,
  ) {
    switch (layer.effect) {
      case 'shapes': return this.renderShapeField(ctx, layer, size, time, pointer)
      case 'image': return coverDraw(ctx, this.source(size, layer.id), size.width, size.height)
      case 'liquid': return this.renderLiquid(ctx, layer, size, time, pointer)
      case 'flow': return this.renderFlow(ctx, layer, size, time, pointer)
      case 'sketch': return this.renderSketch(ctx, layer, size, time)
      case 'displace': return this.renderDisplace(ctx, layer, size, time, pointer)
      case 'spray': return this.renderSpray(ctx, layer, size, time, pointer)
      case 'triangulate': return this.renderTriangulate(ctx, layer, size)
      case 'kinetic': return this.renderKinetic(ctx, canvas, layer, size, time, pointer)
      case 'sliced': return this.renderSliced(ctx, layer, size, time, pointer)
      case 'masked': return this.renderMaskedLetterGrid(ctx, layer, size, time, pointer)
      case 'receding': return this.renderRecedingCells(ctx, layer, size, time, pointer)
    }
  }

  private colorFor(layer: LabLayer, seedColor: string, index: number) {
    if (layer.colorMode === 'palette') return this.palette[index % this.palette.length]
    if (layer.colorMode === 'solid') return layer.color
    return seedColor
  }

  private applyColorTreatment(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize) {
    if (layer.colorMode === 'seed') return
    ctx.save()
    ctx.globalCompositeOperation = 'color'
    if (layer.colorMode === 'solid') {
      ctx.fillStyle = layer.color
    } else {
      const gradient = ctx.createLinearGradient(0, 0, size.width, size.height)
      this.palette.forEach((color, index) => gradient.addColorStop(index / Math.max(1, this.palette.length - 1), color))
      ctx.fillStyle = gradient
    }
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.restore()
  }

  private renderShapeField(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    ctx.fillStyle = layer.secondaryColor
    ctx.fillRect(0, 0, size.width, size.height)
    const columns = Math.round(layer.params.density)
    const rows = Math.round(layer.params.rows ?? 10)
    const margin = Math.min(size.width, size.height) * 0.055
    const cellWidth = (size.width - margin * 2) / columns
    const cellHeight = (size.height - margin * 2) / rows
    const families: Partial<Record<LabLayer['shapeStyle'], number[]>> = {
      mixed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      round: [0, 3, 8, 9],
      angular: [1, 2, 4, 6, 7],
      linear: [4, 5],
    }
    const family = families[layer.shapeStyle] ?? families.mixed ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const shapeAssets = this.layerShapeImages.get(layer.id) ?? []
    const textItems = (layer.shapeText ?? '').split(/\n+/).map((item) => item.trim()).filter(Boolean)
    const geometrySeed = Math.round(layer.params.seed ?? 21) * 1009
    const aspectVariation = layer.params.depth / 100
    const positionJitter = layer.params.jitter / 100
    const fluidity = (layer.params.fluidity ?? 0) / 100
    const sample = this.sample(size, 260, layer.id)
    const pixels = layer.colorMode === 'seed' ? sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data : null
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = layer.params.lineWeight

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column
        const shapeSeed = geometrySeed + index * 37
        const baseX = margin + (column + 0.5) * cellWidth
        const baseY = margin + (row + 0.5) * cellHeight
        const drift = Math.sin(time * layer.params.speed + random(shapeSeed + 1) * TAU) * cellWidth * 0.035
        let x = baseX + (random(shapeSeed + 2) - 0.5) * cellWidth * positionJitter + drift
        let y = baseY + (random(shapeSeed + 3) - 0.5) * cellHeight * positionJitter
        let rotation = layer.params.vector * Math.PI / 180 + random(shapeSeed + 4) * TAU + time * layer.params.speed * (random(shapeSeed + 5) - 0.5) * 0.6
        let pulse = 1
        if (pointer.active) {
          const dx = baseX / size.width - pointer.x
          const dy = baseY / size.height - pointer.y
          const force = Math.exp(-Math.sqrt(dx * dx + dy * dy) * 9)
          x += dx * force * size.width * 0.08
          y += dy * force * size.height * 0.08
          rotation += force * 0.8
          pulse += force * 0.35
        }
        const radius = Math.min(cellWidth, cellHeight) * 0.5 * layer.params.intensity / 100
          * (0.65 + random(shapeSeed + 6) * 0.5) * pulse
        const scaleX = clamp(1 + (random(shapeSeed + 7) - 0.5) * aspectVariation * 1.6, 0.35, 2.2)
        const scaleY = clamp(1 + (random(shapeSeed + 8) - 0.5) * aspectVariation * 1.6, 0.35, 2.2)
        const type = family[Math.floor(random(shapeSeed + 9) * family.length)]
        let color = layer.color
        if (layer.colorMode === 'palette') {
          color = this.palette[Math.floor(random(shapeSeed + 10) * this.palette.length)]
        } else if (layer.colorMode === 'seed' && pixels) {
          const px = Math.max(0, Math.min(sample.width - 1, Math.floor(baseX / size.width * sample.width)))
          const py = Math.max(0, Math.min(sample.height - 1, Math.floor(baseY / size.height * sample.height)))
          const pixel = (py * sample.width + px) * 4
          color = `rgb(${pixels[pixel]},${pixels[pixel + 1]},${pixels[pixel + 2]})`
        }

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rotation)
        ctx.scale(scaleX, scaleY)
        ctx.globalAlpha = 0.74 + random(shapeSeed + 11) * 0.26
        ctx.fillStyle = color
        ctx.strokeStyle = color
        if (layer.shapeStyle === 'custom' && shapeAssets.length) {
          const asset = shapeAssets[Math.floor(random(shapeSeed + 14) * shapeAssets.length)]
          const ratio = asset.naturalWidth / Math.max(1, asset.naturalHeight)
          const width = radius * 2 * Math.min(1, ratio)
          const height = radius * 2 / Math.max(1, ratio)
          ctx.drawImage(asset, -width, -height, width * 2, height * 2)
        } else if (layer.shapeStyle === 'text' && textItems.length) {
          const token = textItems[Math.floor(random(shapeSeed + 15) * textItems.length)]
          ctx.font = `${layer.fontWeight} ${Math.max(8, radius * 1.25)}px "${layer.font}", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          if (random(shapeSeed + 12) < layer.params.threshold / 100) ctx.fillText(token, 0, 0, radius * 2.4)
          else ctx.strokeText(token, 0, 0, radius * 2.4)
        } else {
          traceGeometricShape(ctx, type, radius, fluidity, random(shapeSeed + 13) * TAU + time * layer.params.speed * 2)
          if (type !== 5 || fluidity === 0) {
            if (random(shapeSeed + 12) < layer.params.threshold / 100) ctx.fill('evenodd')
            else ctx.stroke()
          } else ctx.stroke()
        }
        ctx.restore()
      }
    }
  }

  private renderLiquid(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const source = this.source(size, layer.id)
    const density = Math.round(layer.params.density)
    const columns = density
    const rows = Math.max(4, Math.round(density * size.height / size.width))
    const amplitude = layer.params.intensity
    const angle = layer.params.vector * Math.PI / 180
    const phase = time * layer.params.speed
    const vertices: number[][][] = []
    for (let y = 0; y <= rows; y += 1) {
      const row: number[][] = []
      for (let x = 0; x <= columns; x += 1) {
        const px = x * size.width / columns
        const py = y * size.height / rows
        const wave = Math.sin(x * 0.63 + y * 0.38 + phase * 2.1) * amplitude * 0.34
        const cross = Math.cos(y * 0.71 - x * 0.21 - phase * 1.4) * amplitude * 0.25
        const dxToPointer = px / size.width - pointer.x
        const dyToPointer = py / size.height - pointer.y
        const distance = Math.sqrt(dxToPointer * dxToPointer + dyToPointer * dyToPointer)
        const proximity = Math.exp(-distance * 7)
        const force = pointer.hover ? proximity * amplitude * (pointer.active ? 2.4 : 0.95) : 0
        const swirl = force * 0.7
        row.push([
          px + Math.cos(angle) * wave + Math.sin(angle) * cross + dxToPointer * force - dyToPointer * swirl,
          py + Math.sin(angle) * wave - Math.cos(angle) * cross + dyToPointer * force + dxToPointer * swirl,
        ])
      }
      vertices.push(row)
    }
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const sx0 = x * size.width / columns
        const sy0 = y * size.height / rows
        const sx1 = (x + 1) * size.width / columns
        const sy1 = (y + 1) * size.height / rows
        const a = vertices[y][x]
        const b = vertices[y][x + 1]
        const c = vertices[y + 1][x + 1]
        const d = vertices[y + 1][x]
        drawTextureTriangle(ctx, source, [[sx0, sy0], [sx1, sy0], [sx1, sy1]], [a, b, c])
        drawTextureTriangle(ctx, source, [[sx0, sy0], [sx1, sy1], [sx0, sy1]], [a, c, d])
      }
    }
    this.applyColorTreatment(ctx, layer, size)
  }

  private renderFlow(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const sample = this.sample(size, 260, layer.id)
    const data = sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data
    const assets = this.layerShapeImages.get(layer.id) ?? []
    const tokens = (layer.shapeText ?? '').split(/\n+/).map((item) => item.trim()).filter(Boolean)
    ctx.fillStyle = layer.secondaryColor ?? '#111311'
    ctx.fillRect(0, 0, size.width, size.height)
    const density = Math.round(layer.params.density)
    const step = size.width / density
    const rows = Math.ceil(size.height / step)
    const bias = layer.params.vector * Math.PI / 180
    const curvature = (layer.params.fluidity ?? 0) / 100
    ctx.lineCap = 'round'
    for (let y = 0; y <= rows; y += 1) {
      for (let x = 0; x <= density; x += 1) {
        const indexSeed = y * (density + 1) + x
        const px = x * step
        const py = y * step
        const ix = Math.min(sample.width - 1, Math.floor(x / density * sample.width))
        const iy = Math.min(sample.height - 1, Math.floor(y / rows * sample.height))
        const index = (iy * sample.width + ix) * 4
        const light = (data[index] * 0.22 + data[index + 1] * 0.7 + data[index + 2] * 0.08) / 255
        const pointerAngle = Math.atan2(py / size.height - pointer.y, px / size.width - pointer.x)
        const angle = bias + light * Math.PI * layer.params.depth / 45 + Math.sin(time * layer.params.speed + x * 0.2) * 0.3 + (pointer.hover ? pointerAngle * (pointer.active ? 0.5 : 0.2) : 0)
        const length = layer.params.intensity * (0.35 + light * 0.85)
        const seedColor = `rgb(${data[index]},${data[index + 1]},${data[index + 2]})`
        const color = this.colorFor(layer, seedColor, indexSeed)
        ctx.globalAlpha = 0.45 + light * 0.55
        ctx.fillStyle = color
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(0.5, layer.params.lineWeight * (0.55 + light * 0.9))
        if (layer.shapeStyle === 'custom' && assets.length) {
          const asset = assets[indexSeed % assets.length]
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(angle)
          ctx.drawImage(asset, -length / 2, -length / 2, length, length)
          ctx.restore()
        } else if (layer.shapeStyle === 'text' && tokens.length) {
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(angle)
          ctx.font = `${layer.fontWeight} ${Math.max(8, length * 0.65)}px "${layer.font}", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(tokens[indexSeed % tokens.length], 0, 0, length * 1.5)
          ctx.restore()
        } else {
          const dx = Math.cos(angle) * length / 2
          const dy = Math.sin(angle) * length / 2
          const bend = Math.sin(time * layer.params.speed * 2 + indexSeed) * length * curvature * 0.45
          ctx.beginPath()
          ctx.moveTo(px - dx, py - dy)
          ctx.quadraticCurveTo(px - Math.sin(angle) * bend, py + Math.cos(angle) * bend, px + dx, py + dy)
          ctx.stroke()
        }
      }
    }
    ctx.globalAlpha = 1
  }

  private renderSketch(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number) {
    const sample = this.sample(size, 260, layer.id)
    const data = sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data
    const paper = layer.colorMode === 'palette' ? this.palette[this.palette.length - 1] : layer.secondaryColor
    const ink = layer.colorMode === 'palette' ? this.palette[0] : layer.colorMode === 'solid' ? layer.color : '#1b1e1b'
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, size.width, size.height)
    const lines = Math.round(layer.params.density)
    const angle = layer.params.vector * Math.PI / 180
    ctx.save()
    ctx.translate(size.width / 2, size.height / 2)
    ctx.rotate(angle)
    ctx.translate(-size.width / 2, -size.height / 2)
    ctx.lineCap = 'round'
    for (let row = -10; row < lines + 10; row += 1) {
      const baseY = row / lines * size.height
      ctx.beginPath()
      let drawing = false
      for (let x = 0; x <= sample.width; x += 1) {
        const sx = Math.min(sample.width - 1, x)
        const sy = clamp(Math.floor(baseY / size.height * sample.height), 0, sample.height - 1)
        const index = (sy * sample.width + sx) * 4
        const light = (data[index] * 0.22 + data[index + 1] * 0.7 + data[index + 2] * 0.08)
        const px = x / sample.width * size.width
        const noise = Math.sin(x * 0.47 + row * 1.71 + time * layer.params.speed) * layer.params.jitter
        const py = baseY + (light / 255 - 0.5) * layer.params.intensity + noise
        if (light > layer.params.threshold - 80) {
          if (!drawing) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
          drawing = true
        } else drawing = false
      }
      ctx.strokeStyle = ink
      ctx.globalAlpha = 0.64 + random(row + 99) * 0.3
      ctx.lineWidth = Math.max(0.3, layer.params.lineWeight * (0.72 + random(row + 4) * 0.55))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private channels(size: CanvasSize, layerId: string) {
    const key = `channels-${layerId}-${size.width}x${size.height}`
    const cached = this.sourceCache.get(key)
    if (cached) return { red: cached, cyan: this.sourceCache.get(`${key}-cyan`)! }
    const source = this.source(size, layerId)
    const red = makeCanvas(size.width, size.height)
    const cyan = makeCanvas(size.width, size.height)
    for (const [canvas, color] of [[red, '#ff0000'], [cyan, '#00ffff']] as const) {
      const context = canvas.getContext('2d')!
      context.drawImage(source, 0, 0)
      context.globalCompositeOperation = 'multiply'
      context.fillStyle = color
      context.fillRect(0, 0, size.width, size.height)
    }
    this.sourceCache.set(key, red)
    this.sourceCache.set(`${key}-cyan`, cyan)
    return { red, cyan }
  }

  private renderDisplace(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const source = this.source(size, layer.id)
    const band = Math.round(layer.params.density)
    const intensity = layer.params.intensity
    const fx = makeCanvas(size.width, size.height)
    const fxCtx = fx.getContext('2d')!
    const angle = (layer.params.vector ?? 0) * Math.PI / 180
    if (layer.shapeStyle === 'angular' || (layer.shapeStyle === 'custom' && (this.layerShapeImages.get(layer.id)?.length ?? 0) > 0)) {
      const assets = this.layerShapeImages.get(layer.id) ?? []
      const radius = Math.max(8, layer.params.depth)
      const count = layer.shapeStyle === 'custom' ? assets.length : Math.ceil(size.width / (radius * 2.4)) * Math.ceil(size.height / (radius * 2.4))
      for (let index = 0; index < count; index += 1) {
        const columns = Math.max(1, Math.ceil(size.width / (radius * 2.4)))
        const x = layer.shapeStyle === 'custom' ? (index + 0.5) / count * size.width : (index % columns + 0.5) * size.width / columns
        const y = layer.shapeStyle === 'custom' ? size.height * (0.35 + 0.3 * Math.sin(index * 2.1 + time * layer.params.speed)) : (Math.floor(index / columns) + 0.5) * size.height / Math.ceil(count / columns)
        const dx = Math.sin(index * 1.7 + time * layer.params.speed * 2) * intensity * 0.55
        const dy = Math.cos(index * 0.9 + time * layer.params.speed) * intensity * 0.25
        fxCtx.save()
        fxCtx.translate(x, y)
        fxCtx.rotate(angle + index * 0.17)
        if (layer.shapeStyle === 'custom') {
          const stampSize = Math.ceil(radius * 2)
          const stamp = makeCanvas(stampSize, stampSize)
          const stampCtx = stamp.getContext('2d')!
          stampCtx.drawImage(assets[index % assets.length], 0, 0, stampSize, stampSize)
          stampCtx.globalCompositeOperation = 'source-in'
          stampCtx.drawImage(source, -x + radius + dx, -y + radius + dy)
          fxCtx.drawImage(stamp, -radius, -radius)
        } else {
          fxCtx.beginPath()
          if (index % 2) {
            fxCtx.moveTo(0, -radius)
            fxCtx.lineTo(radius, 0)
            fxCtx.lineTo(0, radius)
            fxCtx.lineTo(-radius, 0)
            fxCtx.closePath()
          } else fxCtx.arc(0, 0, radius, 0, TAU)
          fxCtx.clip()
          fxCtx.drawImage(source, -x + dx, -y + dy)
        }
        fxCtx.restore()
      }
    } else {
      for (let y = 0; y < size.height; y += band) {
        const signal = Math.sin(y * 0.025 + time * layer.params.speed * 3) + Math.sin(y * 0.006 - time * 0.7)
        const pointerForce = pointer.hover ? Math.exp(-Math.abs(y / size.height - pointer.y) * 12) * (pointer.x - 0.5) * (pointer.active ? 2 : 0.6) : 0
        const dx = signal * intensity * 0.36 + pointerForce * intensity * 2
        fxCtx.drawImage(source, 0, y, size.width, Math.min(band, size.height - y), dx, y, size.width, Math.min(band, size.height - y))
      }
    }
    const { red, cyan } = this.channels(size, layer.id)
    const shift = layer.params.rgbShift * (0.5 + Math.sin(time * layer.params.speed) * 0.5)
    fxCtx.save()
    fxCtx.globalCompositeOperation = 'screen'
    fxCtx.globalAlpha = 0.48
    fxCtx.drawImage(red, -shift + (layer.params.redX ?? 0), (layer.params.redY ?? 0))
    fxCtx.drawImage(cyan, shift + (layer.params.blueX ?? 0), (layer.params.blueY ?? 0))
    fxCtx.restore()
    this.applyColorTreatment(fxCtx, layer, size)
    ctx.drawImage(source, 0, 0)
    ctx.save()
    if (layer.selection?.points.length) {
      traceSelection(ctx, layer.selection, size.width, size.height)
      ctx.clip()
    }
    ctx.drawImage(fx, 0, 0)
    ctx.restore()
  }

  private renderSpray(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const sample = this.sample(size, 260, layer.id)
    const data = sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data
    ctx.fillStyle = layer.secondaryColor ?? '#111311'
    ctx.fillRect(0, 0, size.width, size.height)
    const count = Math.round(layer.params.density)
    const force = layer.params.intensity / 100
    for (let i = 0; i < count; i += 1) {
      const rx = random(i * 2.11 + 2)
      const ry = random(i * 3.17 + 9)
      const originX = rx * size.width
      const originY = ry * size.height
      const progress = (random(i + 91) + time * layer.params.speed * 0.12) % 1
      const radial = Math.atan2(originY - size.height / 2, originX - size.width / 2)
      const spread = Math.pow(progress, 1.7) * force * Math.max(size.width, size.height) * 0.8
      let x = originX + Math.cos(radial) * spread
      let y = originY + Math.sin(radial) * spread
      if (pointer.active) {
        const dx = x / size.width - pointer.x
        const dy = y / size.height - pointer.y
        const proximity = Math.exp(-(dx * dx + dy * dy) * 65) * force * 90
        x += dx * proximity
        y += dy * proximity
      }
      const ix = Math.min(sample.width - 1, Math.floor(rx * sample.width))
      const iy = Math.min(sample.height - 1, Math.floor(ry * sample.height))
      const index = (iy * sample.width + ix) * 4
      const baseGrainSize = Math.max(1, layer.params.depth)
      const grainSize = baseGrainSize <= 2.5 ? baseGrainSize : baseGrainSize * (0.7 + random(i + 30) * 0.6)
      const seedColor = `rgb(${data[index]},${data[index + 1]},${data[index + 2]})`
      ctx.fillStyle = this.colorFor(layer, seedColor, i)
      ctx.globalAlpha = 0.68 + (1 - progress) * 0.32
      if (grainSize <= 2.5) ctx.fillRect(Math.round(x), Math.round(y), grainSize, grainSize)
      else {
        ctx.beginPath()
        ctx.arc(x, y, grainSize / 2, 0, TAU)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  private meshPoints(layer: LabLayer, size: CanvasSize) {
    if (layer.meshPoints?.length) return layer.meshPoints.map((point) => [point.x * size.width, point.y * size.height])
    const key = `${layer.id}-${size.width}x${size.height}-${layer.params.density}-${layer.params.intensity}-${layer.params.vector}`
    const cached = this.meshCache.get(key)
    if (cached) return cached
    const density = Math.round(layer.params.density)
    const columns = density
    const rows = Math.max(3, Math.round(density * size.height / size.width))
    const points: number[][] = [[0, 0], [size.width, 0], [size.width, size.height], [0, size.height]]
    const angle = layer.params.vector * Math.PI / 180
    for (let y = 0; y <= rows; y += 1) {
      for (let x = 0; x <= columns; x += 1) {
        const jitter = layer.params.intensity / 100
        const px = x / columns * size.width
        const py = y / rows * size.height
        const jx = (random(x * 33 + y * 71 + 4) - 0.5) * size.width / columns * jitter
        const jy = (random(x * 51 + y * 21 + 7) - 0.5) * size.height / rows * jitter
        points.push([px + jx * Math.cos(angle), py + jy * Math.cos(angle) + jx * Math.sin(angle)])
      }
    }
    this.meshCache.set(key, points)
    return points
  }

  getMeshPoints(layer: LabLayer, size: CanvasSize) {
    return this.meshPoints(layer, size)
  }

  renderMeshGuide(overlay: HTMLCanvasElement, layer: LabLayer | undefined, size: CanvasSize, hoverIndex = -1) {
    if (overlay.width !== size.width || overlay.height !== size.height) {
      overlay.width = size.width
      overlay.height = size.height
    }
    const ctx = overlay.getContext('2d')!
    ctx.clearRect(0, 0, size.width, size.height)
    if (!layer || !layer.visible) return
    if (layer.effect === 'sliced' && layer.splitEditing) {
      ctx.save()
      ctx.strokeStyle = '#f44f05'
      ctx.fillStyle = '#f4f1e8'
      ctx.lineWidth = Math.max(2, size.width / 500)
      ctx.setLineDash([10, 7])
      for (const path of layer.splitPaths ?? []) {
        ctx.beginPath()
        path.forEach((point, index) => {
          const x = point.x * size.width
          const y = point.y * size.height
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          if (index === 0 || index === path.length - 1) {
            ctx.moveTo(x + 5, y)
            ctx.arc(x, y, 5, 0, TAU)
          }
        })
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    if (layer.selection?.points.length) {
      const selection = layer.selection
      ctx.save()
      ctx.strokeStyle = '#f4f1e8'
      ctx.lineWidth = Math.max(1.5, size.width / 700)
      ctx.setLineDash([12, 8])
      ctx.beginPath()
      traceSelection(ctx, selection, size.width, size.height)
      ctx.stroke()
      ctx.restore()
    }
    if (layer.effect !== 'triangulate' || !layer.meshEditing) return
    const points = this.meshPoints(layer, size)
    ctx.save()
    ctx.font = `${Math.max(10, size.width / 100)}px Courier New, monospace`
    points.forEach((point, index) => {
      const active = index === hoverIndex
      ctx.beginPath()
      ctx.arc(point[0], point[1], active ? 8 : 5, 0, TAU)
      ctx.fillStyle = active ? '#f4f1e8' : '#f44f05'
      ctx.fill()
      ctx.strokeStyle = '#111311'
      ctx.lineWidth = 2
      ctx.stroke()
      if (active) {
        ctx.fillStyle = '#f4f1e8'
        ctx.fillText(String(index + 1), point[0] + 12, point[1] - 10)
      }
    })
    ctx.restore()
  }

  private renderTriangulate(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize) {
    const points = this.meshPoints(layer, size)
    const delaunay = Delaunator.from(points)
    const sample = this.sample(size, 260, layer.id)
    const data = sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data
    const mix = layer.colorMode === 'seed' ? 0 : layer.params.depth / 100
    ctx.fillStyle = '#111311'
    ctx.fillRect(0, 0, size.width, size.height)
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const a = points[delaunay.triangles[i]]
      const b = points[delaunay.triangles[i + 1]]
      const c = points[delaunay.triangles[i + 2]]
      const cx = clamp((a[0] + b[0] + c[0]) / 3 / size.width)
      const cy = clamp((a[1] + b[1] + c[1]) / 3 / size.height)
      const index = (Math.floor(cy * (sample.height - 1)) * sample.width + Math.floor(cx * (sample.width - 1))) * 4
      const target = hexToRgb(layer.colorMode === 'palette' ? this.palette[(i / 3) % this.palette.length] : layer.color)
      const red = Math.round(data[index] * (1 - mix) + target.r * mix)
      const green = Math.round(data[index + 1] * (1 - mix) + target.g * mix)
      const blue = Math.round(data[index + 2] * (1 - mix) + target.b * mix)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.lineTo(c[0], c[1])
      ctx.closePath()
      ctx.fillStyle = `rgb(${red},${green},${blue})`
      ctx.fill()
      if (layer.params.threshold > 0) {
        ctx.strokeStyle = `rgba(15,18,17,${layer.params.threshold / 160})`
        ctx.lineWidth = 0.7
        ctx.stroke()
      }
    }
  }

  private renderMaskedLetterGrid(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    ctx.fillStyle = layer.secondaryColor
    ctx.fillRect(0, 0, size.width, size.height)
    const letters = Array.from((layer.text || 'SHARP').replace(/\s+/g, ''))
    if (!letters.length) letters.push('S')
    const density = Math.max(6, Math.round(layer.params.density))
    const cellWidth = size.width / density
    const cellHeight = cellWidth * layer.params.depth / 100
    const rows = Math.ceil(size.height / cellHeight)
    const block = layer.params.threshold / 100
    const occupancy = layer.params.jitter / 100
    const zoom = layer.params.scaleY / 100
    const rotationRange = layer.params.vector * Math.PI / 180
    const shiftAmount = layer.params.intensity / 100
    const seed = Math.round(layer.params.seed) * 1009
    const sample = layer.colorMode === 'seed' ? this.sample(size, 260, layer.id) : null
    const pixels = sample ? sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data : null
    const forms = makeCanvas(size.width, size.height)
    const formsCtx = forms.getContext('2d')!
    formsCtx.textAlign = 'center'
    formsCtx.textBaseline = 'middle'

    letters.forEach((glyph, letterIndex) => {
      const formSeed = seed + letterIndex * 271
      const formX = size.width * (0.15 + random(formSeed + 1) * 0.7)
      const rowCenter = (letterIndex + 0.5) / letters.length
      const formY = size.height * (rowCenter + (random(formSeed + 2) - 0.5) * 0.16)
      const dx = formX / size.width - pointer.x
      const dy = formY / size.height - pointer.y
      const proximity = pointer.hover ? Math.exp(-Math.sqrt(dx * dx + dy * dy) * 5) : 0
      const drift = Math.sin(time * layer.params.speed + random(formSeed + 3) * TAU)
      const shiftX = (random(formSeed + 4) - 0.5) * size.width * shiftAmount * 0.3 + dx * proximity * size.width * (pointer.active ? 0.16 : 0.045)
      const shiftY = (random(formSeed + 5) - 0.5) * size.height * shiftAmount * 0.12 + dy * proximity * size.height * (pointer.active ? 0.1 : 0.025)
      const glyphSize = size.width * (0.38 + Math.pow(random(formSeed + 6), 1.4) * 1.05) * zoom * (1 + proximity * (pointer.active ? 0.32 : 0.1))
      const rotation = (random(formSeed + 7) - 0.5) * rotationRange * 2 + drift * 0.025 + proximity * (pointer.active ? 0.32 : 0.08)
      let color = layer.color
      if (layer.colorMode === 'palette') color = this.palette[letterIndex % this.palette.length]
      else if (sample && pixels) {
        const px = Math.max(0, Math.min(sample.width - 1, Math.floor(formX / size.width * sample.width)))
        const py = Math.max(0, Math.min(sample.height - 1, Math.floor(formY / size.height * sample.height)))
        const pixel = (py * sample.width + px) * 4
        color = `rgb(${pixels[pixel]},${pixels[pixel + 1]},${pixels[pixel + 2]})`
      }

      formsCtx.save()
      formsCtx.translate(formX + shiftX, formY + shiftY)
      formsCtx.rotate(rotation)
      formsCtx.font = `${layer.fontWeight} ${Math.max(8, glyphSize)}px "${layer.font}", sans-serif`
      formsCtx.fillStyle = color
      formsCtx.fillText(glyph, 0, 0)
      formsCtx.restore()
    })

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < density; column += 1) {
        const cellSeed = seed + (row * density + column) * 41
        if (random(cellSeed + 1) > occupancy) continue
        const cx = (column + 0.5) * cellWidth
        const cy = (row + 0.5) * cellHeight
        const x = cx - cellWidth * block / 2
        const y = cy - cellHeight * block / 2
        const width = cellWidth * block
        const height = cellHeight * block
        ctx.drawImage(forms, x, y, width, height, x, y, width, height)
      }
    }
  }

  private renderRecedingCells(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    ctx.fillStyle = layer.secondaryColor
    ctx.fillRect(0, 0, size.width, size.height)
    const rows = Math.max(4, Math.round(layer.params.density))
    const angle = layer.params.vector * Math.PI / 180
    const cos = Math.abs(Math.cos(angle))
    const sin = Math.abs(Math.sin(angle))
    const fieldWidth = size.width * cos + size.height * sin
    const fieldHeight = size.width * sin + size.height * cos
    const strength = layer.params.depth / 100
    const widthCurve = Math.max(0.2, layer.params.scaleY)
    const lengthCurve = Math.max(0.2, layer.params.elasticity)
    const positionCurve = Math.max(0.2, layer.params.jitter)
    const curveBend = layer.params.fluidity / 100
    const fade = layer.params.rgbShift / 100
    const stripes = Math.round(layer.params.lineWeight)
    const seed = Math.round(layer.params.seed) * 7919
    const sample = layer.colorMode === 'seed' ? this.sample(size, 260, layer.id) : null
    const pixels = sample ? sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height).data : null
    const progress = Array.from({ length: rows }, (_, row) => {
      const linear = row / Math.max(1, rows - 1)
      const wave = Math.sin(time * layer.params.speed + row * 0.37) * 0.003
      return clamp(linear + curveBend * Math.sin(linear * Math.PI) * 0.35 + wave)
    })
    const weights = progress.map((value) => Math.max(0.015, Math.pow(1 - value * 0.985, widthCurve * (0.7 + strength * 2))))
    const weightTotal = weights.reduce((sum, value) => sum + value, 0)

    ctx.save()
    ctx.translate(size.width / 2, size.height / 2)
    ctx.rotate(angle)
    ctx.translate(-fieldWidth / 2, -fieldHeight / 2)
    let rowY = 0
    for (let row = 0; row < rows; row += 1) {
      const u = progress[row]
      const rowHeight = weights[row] / weightTotal * fieldHeight
      const centerY = rowY + rowHeight / 2
      const pointerDistance = Math.abs(centerY / fieldHeight - pointer.y)
      const pointerForce = pointer.hover ? Math.exp(-pointerDistance * 10) * (pointer.active ? 1 : 0.3) : 0
      const hardEdge = fieldWidth * (0.86 + Math.pow(u, positionCurve) * 0.12 + (pointer.x - 0.5) * pointerForce * 0.12)
      const cellCount = 1 + Math.floor(Math.pow(u, lengthCurve) * layer.params.intensity / 100 * 10)
      const rawWidths = Array.from({ length: cellCount }, (_, cell) => 0.68 + random(seed + row * 103 + cell * 29) * 0.64)
      const widthTotal = rawWidths.reduce((sum, value) => sum + value, 0)
      const gap = Math.min(hardEdge / cellCount * 0.42, fieldWidth * layer.params.threshold / 100 * 0.08 * (0.4 + u * 0.6))
      const rowGap = Math.min(rowHeight * 0.18, fieldHeight * layer.params.threshold / 100 * 0.0005)
      let x = 0
      for (let cell = 0; cell < cellCount; cell += 1) {
        const segment = hardEdge * rawWidths[cell] / widthTotal
        const rectX = x + gap / 2
        const rectWidth = Math.max(0.5, segment - gap)
        const rectY = rowY + rowGap / 2
        const rectHeight = Math.max(0.5, rowHeight - rowGap)
        const colorIndex = row + cell
        let color = layer.color
        if (layer.colorMode === 'palette') color = this.palette[colorIndex % this.palette.length]
        else if (sample && pixels) {
          const px = Math.max(0, Math.min(sample.width - 1, Math.floor((rectX + rectWidth / 2) / fieldWidth * sample.width)))
          const py = Math.max(0, Math.min(sample.height - 1, Math.floor(centerY / fieldHeight * sample.height)))
          const pixel = (py * sample.width + px) * 4
          color = `rgb(${pixels[pixel]},${pixels[pixel + 1]},${pixels[pixel + 2]})`
        }
        const localFade = clamp(fade * (0.82 + random(seed + row * 47 + cell * 17) * 0.28))
        const gradient = ctx.createLinearGradient(rectX, rectY, rectX + rectWidth, rectY)
        gradient.addColorStop(0, color)
        if (localFade <= 0.001) gradient.addColorStop(1, color)
        else {
          gradient.addColorStop(Math.max(0, 1 - localFade), color)
          gradient.addColorStop(1, layer.secondaryColor)
        }
        ctx.save()
        ctx.beginPath()
        ctx.rect(rectX, rectY, rectWidth, rectHeight)
        ctx.clip()
        ctx.fillStyle = gradient
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight)
        if (stripes > 1) {
          const stripeStep = rectHeight / stripes
          ctx.fillStyle = layer.secondaryColor
          for (let stripe = 1; stripe < stripes; stripe += 2) ctx.fillRect(rectX, rectY + stripe * stripeStep, rectWidth, stripeStep * 0.46)
        }
        ctx.restore()
        x += segment
      }
      rowY += rowHeight
    }
    ctx.restore()
  }

  private renderKinetic(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const mask = makeCanvas(size.width, size.height)
    const maskCtx = mask.getContext('2d')!
    const rows = Math.round(layer.params.density)
    const fontSize = layer.params.depth
    const elasticity = (layer.params.elasticity ?? 60) / 100
    const spring = this.kineticSprings.get(layer.id) ?? { x: 0.5, y: 0.5, vx: 0, vy: 0 }
    const targetX = pointer.hover ? pointer.x : 0.5
    const targetY = pointer.hover ? pointer.y : 0.5
    const stiffness = 0.025 + elasticity * 0.11
    const damping = 0.82 - elasticity * 0.18
    spring.vx = (spring.vx + (targetX - spring.x) * stiffness) * damping
    spring.vy = (spring.vy + (targetY - spring.y) * stiffness) * damping
    spring.x += spring.vx
    spring.y += spring.vy
    this.kineticSprings.set(layer.id, spring)
    maskCtx.fillStyle = '#ffffff'
    maskCtx.textAlign = 'center'
    maskCtx.textBaseline = 'middle'
    maskCtx.font = `${layer.fontWeight} ${fontSize}px "${layer.font}", sans-serif`
    for (let row = 0; row < rows; row += 1) {
      const y = (row + 0.5) / rows * size.height
      const phase = time * layer.params.speed * 3.2 + row * 0.73
      const wave = Math.sin(phase) + Math.sin(phase * 0.43 + row) * 0.45
      const proximity = Math.exp(-Math.abs(y / size.height - spring.y) * 5)
      const drag = (spring.x - 0.5) * size.width * proximity * (pointer.active ? 0.85 : 0.35)
      const scatter = (random(row + 91) - 0.5) * (layer.params.jitter ?? 0) * 2
      const twist = (layer.params.vector ?? 0) * Math.PI / 180 * Math.sin(phase * 0.55)
      maskCtx.save()
      maskCtx.translate(size.width / 2 + wave * layer.params.intensity * 2.2 + drag + scatter, y)
      maskCtx.rotate(twist * proximity)
      const stretch = 1 + wave * layer.params.intensity / 500 + Math.abs(spring.vx) * elasticity * 5 * proximity
      maskCtx.scale(stretch, 1 + Math.cos(phase * 1.3) * elasticity * 0.16)
      maskCtx.fillText(layer.text.replace(/\n/g, ' ') || 'GFXSHIFT', 0, 0)
      maskCtx.restore()
    }
    maskCtx.globalCompositeOperation = 'source-in'
    if (layer.colorMode === 'seed') maskCtx.drawImage(this.source(size, layer.id), 0, 0)
    else if (layer.colorMode === 'solid') {
      maskCtx.fillStyle = layer.color
      maskCtx.fillRect(0, 0, size.width, size.height)
    } else {
      const gradient = maskCtx.createLinearGradient(0, 0, size.width, size.height)
      this.palette.forEach((color, index) => gradient.addColorStop(index / Math.max(1, this.palette.length - 1), color))
      maskCtx.fillStyle = gradient
      maskCtx.fillRect(0, 0, size.width, size.height)
    }
    ctx.fillStyle = layer.secondaryColor ?? '#111311'
    ctx.fillRect(0, 0, size.width, size.height)
    const shift = layer.params.rgbShift
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.3
    ctx.drawImage(mask, -shift, 0)
    ctx.drawImage(mask, shift, 0)
    ctx.restore()
    ctx.drawImage(mask, 0, 0)
    canvas.dataset.rendered = 'true'
  }

  private renderSliced(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize, time: number, pointer: PointerState) {
    const text = layer.text.replace(/\n/g, ' ').trim() || 'GFXSHIFT'
    const baseFontSize = 200
    const font = `${layer.fontWeight} ${baseFontSize}px "${layer.font}", sans-serif`
    const measureCanvas = makeCanvas(8, 8)
    const measureCtx = measureCanvas.getContext('2d')!
    measureCtx.font = font
    measureCtx.letterSpacing = `${layer.letterSpacing}px`
    const metrics = measureCtx.measureText(text)
    const left = metrics.actualBoundingBoxLeft || 0
    const right = metrics.actualBoundingBoxRight || metrics.width
    const ascent = metrics.actualBoundingBoxAscent || baseFontSize * 0.76
    const descent = metrics.actualBoundingBoxDescent || baseFontSize * 0.2
    const baseWidth = Math.max(1, left + right)
    const baseHeight = Math.max(1, ascent + descent)
    const wordScale = Math.max(0.1, layer.scale ?? 1)
    const targetWidth = size.width * layer.params.depth / 100 * wordScale
    const targetHeight = size.height * layer.params.scaleY / 100 * wordScale
    const originX = layer.x * size.width - targetWidth / 2
    const originY = layer.y * size.height - targetHeight / 2
    const scaleX = targetWidth / baseWidth
    const scaleY = targetHeight / baseHeight

    // Every cell clips a vector text draw at its final output scale. No small
    // glyph bitmap is ever stretched, so curves stay sharp at any X/Y ratio.
    const sliced = makeCanvas(size.width, size.height)
    const sliceCtx = sliced.getContext('2d')!
    sliceCtx.font = font
    sliceCtx.letterSpacing = `${layer.letterSpacing}px`
    sliceCtx.textBaseline = 'alphabetic'
    sliceCtx.fillStyle = '#ffffff'

    const columns = Math.max(3, Math.round(layer.params.density))
    const cell = targetWidth / columns
    const wordRows = Math.max(1, Math.ceil(targetHeight / cell))
    const totalColumns = columns + 6
    const totalRows = wordRows + 4
    const windowSize = cell * 1.04
    const centerX = layer.x * size.width
    const centerY = layer.y * size.height
    const angle = layer.params.vector * Math.PI / 180
    const gap = Math.min(layer.params.threshold, windowSize * 0.4)
    const rowShift = cell * layer.params.intensity / 100
    const jitter = cell * (layer.params.jitter ?? 0) / 100
    const turnedCells = (layer.params.turnedCells ?? 0) / 100
    const seed = Math.round(layer.params.seed ?? 7) * 97

    if (layer.splitPaths?.length) {
      layer.splitPaths.forEach((path, pathIndex) => {
        for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
          const a = path[pointIndex - 1]
          const b = path[pointIndex]
          const ax = a.x * size.width
          const ay = a.y * size.height
          const bx = b.x * size.width
          const by = b.y * size.height
          const length = Math.hypot(bx - ax, by - ay)
          const pathAngle = Math.atan2(by - ay, bx - ax)
          const steps = Math.max(1, Math.ceil(length / Math.max(4, cell * 0.7)))
          for (let step = 0; step <= steps; step += 1) {
            const progress = step / steps
            const cx = ax + (bx - ax) * progress
            const cy = ay + (by - ay) * progress
            const shift = (pathIndex % 2 ? 1 : -1) * cell * layer.params.intensity / 50
            sliceCtx.save()
            sliceCtx.translate(cx, cy)
            sliceCtx.rotate(pathAngle)
            sliceCtx.rect(-cell, -cell * 0.6, cell * 2, cell * 1.2)
            sliceCtx.clip()
            sliceCtx.rotate(-pathAngle)
            sliceCtx.translate(-cx - Math.sin(pathAngle) * shift, -cy + Math.cos(pathAngle) * shift)
            sliceCtx.translate(originX, originY)
            sliceCtx.scale(scaleX, scaleY)
            sliceCtx.fillText(text, left, ascent)
            sliceCtx.restore()
          }
        }
      })
    }
    if (!layer.splitPaths?.length) for (let row = 0; row < totalRows; row += 1) {
      for (let column = 0; column < totalColumns; column += 1) {
        const index = row * totalColumns + column
        const cx = centerX + (column - (totalColumns - 1) / 2) * cell
        const cy = centerY + (row - (totalRows - 1) / 2) * cell
        const drift = Math.sin(time * layer.params.speed * 2 + row * 0.73 + column * 0.13) * cell * 0.025
        let slip = (row - (totalRows - 1) / 2) * rowShift + drift
        if (pointer.active) {
          const dx = cx / size.width - pointer.x
          const dy = cy / size.height - pointer.y
          slip += Math.exp(-(dx * dx + dy * dy) * 36) * cell * 0.65
        }
        const jitterX = (random(seed + index * 2 + 1) - 0.5) * jitter * 2
        const jitterY = (random(seed + index * 2 + 2) - 0.5) * jitter * 2
        const offsetX = Math.cos(angle) * slip + jitterX
        const offsetY = Math.sin(angle) * slip + jitterY
        const window = Math.max(0.5, windowSize - gap)
        const turned = random(seed + index * 5 + 11) < turnedCells
        const quarterTurn = turned ? (random(seed + index * 7 + 17) > 0.5 ? 1 : -1) * Math.PI / 2 : 0

        sliceCtx.save()
        sliceCtx.beginPath()
        sliceCtx.rect(cx - window / 2, cy - window / 2, window, window)
        sliceCtx.clip()
        sliceCtx.translate(cx, cy)
        sliceCtx.rotate(quarterTurn)
        // The grid stays fixed; only its view of the vector word moves.
        sliceCtx.translate(-cx + offsetX, -cy + offsetY)
        sliceCtx.translate(originX, originY)
        sliceCtx.scale(scaleX, scaleY)
        sliceCtx.fillText(text, left, ascent)
        sliceCtx.restore()
      }
    }

    sliceCtx.globalCompositeOperation = 'source-in'
    if (layer.colorMode === 'seed') {
      sliceCtx.drawImage(this.source(size, layer.id), 0, 0)
    } else if (layer.colorMode === 'solid') {
      sliceCtx.fillStyle = layer.color
      sliceCtx.fillRect(0, 0, size.width, size.height)
    } else {
      const gradient = sliceCtx.createLinearGradient(0, 0, size.width, size.height)
      this.palette.forEach((color, index) => gradient.addColorStop(index / Math.max(1, this.palette.length - 1), color))
      sliceCtx.fillStyle = gradient
      sliceCtx.fillRect(0, 0, size.width, size.height)
    }

    ctx.fillStyle = layer.secondaryColor
    ctx.fillRect(0, 0, size.width, size.height)
    const echo = layer.params.rgbShift
    if (echo > 0) {
      ctx.save()
      ctx.globalAlpha = 0.24
      ctx.drawImage(sliced, -echo, 0)
      ctx.drawImage(sliced, echo, 0)
      ctx.restore()
    }
    ctx.drawImage(sliced, 0, 0)
  }

  private renderText(ctx: CanvasRenderingContext2D, layer: LabLayer, size: CanvasSize) {
    ctx.save()
    ctx.fillStyle = layer.color
    ctx.strokeStyle = layer.color
    ctx.lineWidth = Math.max(1, layer.fontSize / 45)
    const x = layer.x * size.width
    const y = layer.y * size.height
    const scale = Math.max(0.01, layer.scale ?? 1)
    if (layer.shapes?.length) {
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      ctx.translate(-x, -y)
      const path = this.commandsToPath(layer.shapes)
      if (layer.outline) ctx.stroke(path)
      else ctx.fill(path, 'evenodd')
      ctx.restore()
      return
    }
    ctx.translate(x, y)
    ctx.rotate(layer.rotation * Math.PI / 180)
    ctx.scale(scale, scale)
    ctx.font = `${layer.fontWeight} ${layer.fontSize}px "${layer.font}", sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const lines = layer.text.split('\n')
    lines.forEach((line, lineIndex) => {
      const width = ctx.measureText(line).width + Math.max(0, line.length - 1) * layer.letterSpacing
      let cursor = layer.align === 'left' ? 0 : layer.align === 'right' ? -width : -width / 2
      const lineY = (lineIndex - (lines.length - 1) / 2) * layer.fontSize * layer.lineHeight
      for (const character of line) {
        if (layer.outline) ctx.strokeText(character, cursor, lineY)
        else ctx.fillText(character, cursor, lineY)
        cursor += ctx.measureText(character).width + layer.letterSpacing
      }
    })
    ctx.restore()
  }

  private commandsToPath(commands: PathCommand[]) {
    const path = new Path2D()
    for (const command of commands) {
      if (command.type === 'M') path.moveTo(command.x!, command.y!)
      if (command.type === 'L') path.lineTo(command.x!, command.y!)
      if (command.type === 'C') path.bezierCurveTo(command.x1!, command.y1!, command.x2!, command.y2!, command.x!, command.y!)
      if (command.type === 'Q') path.quadraticCurveTo(command.x1!, command.y1!, command.x!, command.y!)
      if (command.type === 'Z') path.closePath()
    }
    return path
  }
}
