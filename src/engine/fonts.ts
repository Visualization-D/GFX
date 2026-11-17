import type { CanvasSize, LabLayer, PathCommand } from '../types/lab'

export type LocalFontData = {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob: () => Promise<Blob>
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>
  }
}

const fontData = new Map<string, LocalFontData[]>()

export const FALLBACK_FONTS = [
  'Inter', 'Arial', 'Helvetica', 'Arial Black', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Times New Roman', 'Georgia', 'Courier New', 'Impact', 'Lucida Console', 'monospace',
]

export async function scanLocalFonts() {
  if (!window.queryLocalFonts) {
    throw new Error('Local font access is not available in this browser. Chrome or Edge on desktop is recommended.')
  }
  const fonts = await window.queryLocalFonts()
  fontData.clear()
  for (const font of fonts) {
    const entries = fontData.get(font.family) ?? []
    entries.push(font)
    fontData.set(font.family, entries)
  }
  return [...fontData.keys()].sort((a, b) => a.localeCompare(b))
}

function transformCommand(command: PathCommand, angle: number, cx: number, cy: number): PathCommand {
  if (command.type === 'Z') return command
  const transform = (x?: number, y?: number) => {
    if (x === undefined || y === undefined) return { x, y }
    const dx = x - cx
    const dy = y - cy
    return { x: cx + dx * Math.cos(angle) - dy * Math.sin(angle), y: cy + dx * Math.sin(angle) + dy * Math.cos(angle) }
  }
  return {
    ...command,
    ...transform(command.x, command.y),
    ...(command.type === 'C' || command.type === 'Q' ? (() => {
      const control1 = transform(command.x1, command.y1)
      const control2 = command.type === 'C' ? transform(command.x2, command.y2) : {}
      return { x1: control1.x, y1: control1.y, ...control2 }
    })() : {}),
  }
}

export async function convertTextToShapes(layer: LabLayer, size: CanvasSize) {
  const candidates = fontData.get(layer.font)
  if (!candidates?.length) {
    throw new Error('Scan device fonts first, then choose a scanned font to convert it to vector outlines.')
  }
  const selected = candidates.find((font) => {
    const style = font.style.toLowerCase()
    return layer.fontWeight >= 600 ? style.includes('bold') : !style.includes('bold')
  }) ?? candidates[0]
  const opentype = await import('opentype.js')
  const font = opentype.parse(await selected.blob().then((blob) => blob.arrayBuffer()))
  const commands: PathCommand[] = []
  const lines = layer.text.split('\n')
  const scale = layer.fontSize / font.unitsPerEm
  const centerX = layer.x * size.width
  const centerY = layer.y * size.height

  lines.forEach((line, lineIndex) => {
    const lineWidth = font.getAdvanceWidth(line, layer.fontSize) + Math.max(0, line.length - 1) * layer.letterSpacing
    let penX = centerX + (layer.align === 'left' ? 0 : layer.align === 'right' ? -lineWidth : -lineWidth / 2)
    const baseline = centerY + (lineIndex - (lines.length - 1) / 2) * layer.fontSize * layer.lineHeight + layer.fontSize * 0.35
    for (const character of line) {
      const path = font.getPath(character, penX, baseline, layer.fontSize)
      commands.push(...(path.commands as PathCommand[]))
      const glyph = font.charToGlyph(character)
      penX += glyph.advanceWidth! * scale + layer.letterSpacing
    }
  })
  const angle = layer.rotation * Math.PI / 180
  return angle === 0 ? commands : commands.map((command) => transformCommand(command, angle, centerX, centerY))
}
