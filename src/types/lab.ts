export type EffectType =
  | 'shapes'
  | 'liquid'
  | 'flow'
  | 'sketch'
  | 'displace'
  | 'spray'
  | 'triangulate'
  | 'kinetic'
  | 'sliced'
  | 'image'

export type LayerKind = 'effect' | 'text'
export type ColorMode = 'seed' | 'palette' | 'solid'
export type ShapeStyle = 'mixed' | 'round' | 'angular' | 'linear' | 'text' | 'custom'
export type LayerGroup = { id: string; name: string; visible: boolean; collapsed: boolean }
export type PaletteGroup = { id: string; name: string; colors: string[] }
export type CanvasSelection = { type: 'marquee' | 'free'; points: MeshPoint[] }
export type MaskStroke = { points: MeshPoint[]; size: number; erase: boolean }
export type MeshPoint = { x: number; y: number }
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'

export type PathCommand = {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z'
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export type LabLayer = {
  id: string
  name: string
  kind: LayerKind
  effect: EffectType
  visible: boolean
  opacity: number
  blend: BlendMode
  color: string
  secondaryColor: string
  seedName: string
  colorMode: ColorMode
  shapeStyle: ShapeStyle
  shapeText: string
  shapeAssetNames: string[]
  groupId?: string
  params: Record<string, number>
  text: string
  font: string
  fontSize: number
  scale: number
  fontWeight: number
  letterSpacing: number
  x: number
  y: number
  outline: boolean
  rotation: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
  shapes?: PathCommand[]
  meshPoints?: MeshPoint[]
  meshEditing?: boolean
  splitPaths: MeshPoint[][]
  splitEditing?: boolean
  selection?: CanvasSelection
  selectionEditing?: 'marquee' | 'free'
  maskStrokes: MaskStroke[]
  maskEditing?: boolean
  maskBrush: number
  maskErase: boolean
}

export type CanvasSize = { width: number; height: number }
export type PointerState = { x: number; y: number; active: boolean; hover: boolean }

export type ParamDefinition = {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit?: string
}

export type EffectDefinition = {
  id: EffectType
  name: string
  short: string
  description: string
  params: ParamDefinition[]
}

export const EFFECTS: EffectDefinition[] = [
  {
    id: 'shapes', name: 'Shape field', short: 'SF', description: 'A customizable field of vector forms with deterministic geometry and pointer response.',
    params: [
      { key: 'density', label: 'Columns', min: 3, max: 16, step: 1 },
      { key: 'rows', label: 'Rows', min: 3, max: 24, step: 1 },
      { key: 'intensity', label: 'Shape size', min: 20, max: 140, step: 1, unit: '%' },
      { key: 'jitter', label: 'Position jitter', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'depth', label: 'Aspect variation', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'vector', label: 'Base rotation', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'threshold', label: 'Fill amount', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'lineWeight', label: 'Line width', min: 0.5, max: 40, step: 0.5, unit: 'px' },
      { key: 'fluidity', label: 'Line fluidity', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'speed', label: 'Motion speed', min: 0, max: 2, step: 0.01 },
      { key: 'seed', label: 'Geometry seed', min: 0, max: 999, step: 1 },
      { key: 'latency', label: 'Pointer latency', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  {
    id: 'image', name: 'Image layer', short: 'IM', description: 'A direct full-canvas image layer for pasted screenshots, clipboard images, and uploaded artwork.',
    params: [],
  },
  {
    id: 'liquid', name: 'Liquid grid', short: 'LG', description: 'A pointer-reactive image mesh with traveling waves.',
    params: [
      { key: 'density', label: 'Grid density', min: 5, max: 32, step: 1 },
      { key: 'intensity', label: 'Amplitude', min: 0, max: 100, step: 1, unit: 'px' },
      { key: 'vector', label: 'Vector angle', min: 0, max: 360, step: 1, unit: '°' },
      { key: 'speed', label: 'Flow speed', min: 0, max: 2, step: 0.01 },
      { key: 'latency', label: 'Pointer latency', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  {
    id: 'flow', name: 'Vector flow', short: 'VF', description: 'Image luminance steers a field of responsive vectors.',
    params: [
      { key: 'density', label: 'Field density', min: 8, max: 55, step: 1 },
      { key: 'intensity', label: 'Vector length', min: 4, max: 180, step: 1, unit: 'px' },
      { key: 'lineWeight', label: 'Vector width', min: 0.5, max: 24, step: 0.5, unit: 'px' },
      { key: 'fluidity', label: 'Vector curvature', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'depth', label: 'Luminance depth', min: 0, max: 100, step: 1 },
      { key: 'speed', label: 'Drift speed', min: 0, max: 2, step: 0.01 },
      { key: 'vector', label: 'Bias angle', min: 0, max: 360, step: 1, unit: '°' },
    ],
  },
  {
    id: 'sketch', name: 'Sketchy lines', short: 'SL', description: 'Layered hand-drawn contours reconstructed from light.',
    params: [
      { key: 'density', label: 'Line count', min: 18, max: 140, step: 1 },
      { key: 'intensity', label: 'Contour depth', min: 0, max: 80, step: 1 },
      { key: 'threshold', label: 'Ink threshold', min: 0, max: 255, step: 1 },
      { key: 'lineWeight', label: 'Stroke weight', min: 0.5, max: 8, step: 0.1, unit: 'px' },
      { key: 'jitter', label: 'Hand jitter', min: 0, max: 30, step: 0.5, unit: 'px' },
      { key: 'speed', label: 'Jitter speed', min: 0, max: 2, step: 0.01 },
      { key: 'vector', label: 'Stroke angle', min: -45, max: 45, step: 1, unit: '°' },
    ],
  },
  {
    id: 'displace', name: 'RGB displacement', short: 'RD', description: 'Band displacement and chromatic channel separation.',
    params: [
      { key: 'intensity', label: 'Displacement', min: 0, max: 160, step: 1, unit: 'px' },
      { key: 'rgbShift', label: 'Master RGB shift', min: 0, max: 120, step: 1, unit: 'px' },
      { key: 'redX', label: 'Red channel X', min: -120, max: 120, step: 1, unit: 'px' },
      { key: 'redY', label: 'Red channel Y', min: -120, max: 120, step: 1, unit: 'px' },
      { key: 'blueX', label: 'Cyan channel X', min: -120, max: 120, step: 1, unit: 'px' },
      { key: 'blueY', label: 'Cyan channel Y', min: -120, max: 120, step: 1, unit: 'px' },
      { key: 'depth', label: 'Pattern shape size', min: 12, max: 240, step: 1, unit: 'px' },
      { key: 'density', label: 'Band size', min: 2, max: 60, step: 1, unit: 'px' },
      { key: 'speed', label: 'Signal speed', min: 0, max: 2, step: 0.01 },
      { key: 'latency', label: 'Pointer latency', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  {
    id: 'spray', name: 'Spray explosion', short: 'SP', description: 'Thousands of image-colored particles with pointer force.',
    params: [
      { key: 'density', label: 'Grain count', min: 200, max: 10000, step: 100 },
      { key: 'intensity', label: 'Explosion force', min: 0, max: 100, step: 1 },
      { key: 'depth', label: 'Grain size', min: 1, max: 18, step: 0.5, unit: 'px' },
      { key: 'speed', label: 'Motion speed', min: 0, max: 2, step: 0.01 },
      { key: 'latency', label: 'Pointer latency', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  {
    id: 'triangulate', name: 'Triangulator', short: 'TR', description: 'Delaunay geometry colored by the source image.',
    params: [
      { key: 'density', label: 'Mesh detail', min: 4, max: 28, step: 1 },
      { key: 'intensity', label: 'Point jitter', min: 0, max: 100, step: 1 },
      { key: 'threshold', label: 'Wireframe', min: 0, max: 100, step: 1 },
      { key: 'depth', label: 'Color mix', min: 0, max: 100, step: 1 },
      { key: 'vector', label: 'Mesh angle', min: -45, max: 45, step: 1, unit: '°' },
    ],
  },
  {
    id: 'kinetic', name: 'Kinetic type', short: 'KT', description: 'A rhythmic typographic mask fed by the seed image.',
    params: [
      { key: 'density', label: 'Repetitions', min: 2, max: 18, step: 1 },
      { key: 'intensity', label: 'Wave scale', min: 0, max: 180, step: 1 },
      { key: 'depth', label: 'Type size', min: 30, max: 300, step: 1, unit: 'px' },
      { key: 'speed', label: 'Motion speed', min: 0, max: 3, step: 0.01 },
      { key: 'elasticity', label: 'Elasticity', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'jitter', label: 'Row scatter', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'vector', label: 'Twist', min: -90, max: 90, step: 1, unit: '°' },
      { key: 'rgbShift', label: 'Echo shift', min: 0, max: 60, step: 1, unit: 'px' },
    ],
  },
  {
    id: 'sliced', name: 'Sliced word', short: 'SW', description: 'Vector-scaled type viewed through shifting grid windows, with jittered and quarter-turned cells.',
    params: [
      { key: 'density', label: 'Columns', min: 3, max: 40, step: 1 },
      { key: 'intensity', label: 'Shift per row', min: -50, max: 50, step: 1, unit: '%' },
      { key: 'jitter', label: 'Cell jitter', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'turnedCells', label: 'Turned cells', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'seed', label: 'Variation seed', min: 0, max: 999, step: 1 },
      { key: 'depth', label: 'Horizontal expansion', min: 20, max: 200, step: 1, unit: '%' },
      { key: 'scaleY', label: 'Vertical expansion', min: 20, max: 200, step: 1, unit: '%' },
      { key: 'threshold', label: 'Cell gap', min: 0, max: 20, step: 0.5, unit: 'px' },
      { key: 'vector', label: 'Slip direction', min: 0, max: 360, step: 1, unit: '°' },
      { key: 'speed', label: 'Drift speed', min: 0, max: 2, step: 0.01 },
      { key: 'rgbShift', label: 'Chromatic echo', min: 0, max: 60, step: 1, unit: 'px' },
    ],
  },
]

export const DEFAULT_PARAMS: Record<string, number> = {
  density: 16,
  rows: 10,
  intensity: 42,
  vector: 30,
  speed: 0.55,
  latency: 0.18,
  depth: 45,
  threshold: 115,
  rgbShift: 14,
  lineWeight: 1.4,
  jitter: 5,
  scaleY: 100,
  turnedCells: 8,
  fluidity: 0,
  elasticity: 68,
  redX: 0,
  redY: 0,
  blueX: 0,
  blueY: 0,
  seed: 7,
}

const EFFECT_PARAM_OVERRIDES: Partial<Record<EffectType, Record<string, number>>> = {
  liquid: { density: 18, intensity: 64, speed: 0.7, latency: 0.12 },
  spray: { density: 2800, depth: 1, intensity: 38, speed: 0.45 },
  flow: { lineWeight: 2, fluidity: 24, intensity: 56 },
  kinetic: { density: 10, intensity: 72, depth: 150, speed: 1.15, elasticity: 72, jitter: 18, vector: 0 },
  shapes: { density: 7, rows: 10, intensity: 78, jitter: 22, depth: 38, vector: 0, threshold: 72, lineWeight: 3, fluidity: 0, speed: 0.12, seed: 21, latency: 0.18 },
  sliced: { density: 13, intensity: -50, jitter: 100, turnedCells: 90, seed: 652, depth: 96, scaleY: 27, threshold: 0, vector: 0, speed: 0, rgbShift: 0 },
}

export const BLEND_MODES: BlendMode[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
]

export function makeLayer(effect: EffectType = 'liquid', index = 1): LabLayer {
  const definition = EFFECTS.find((item) => item.id === effect) ?? EFFECTS[0]
  const isSliced = effect === 'sliced'
  const isShapeField = effect === 'shapes'
  return {
    id: crypto.randomUUID(),
    name: `${definition.name} ${String(index).padStart(2, '0')}`,
    kind: 'effect', effect, visible: true, opacity: 1, blend: 'source-over', color: isSliced ? '#e9e5da' : '#f44f05',
    secondaryColor: isSliced || isShapeField ? '#111311' : '#e9e5da', colorMode: isSliced ? 'solid' : isShapeField ? 'palette' : 'seed',
    seedName: 'Generative seed 001',
    shapeStyle: effect === 'displace' || effect === 'flow' ? 'linear' : 'mixed',
    shapeText: 'GFX\nSHIFT\nFORM\nTYPE\nإبداع\nتحول\nلون\nحرف',
    shapeAssetNames: [],
    splitPaths: [],
    maskStrokes: [],
    maskBrush: 72,
    maskErase: true,
    params: { ...DEFAULT_PARAMS, ...EFFECT_PARAM_OVERRIDES[effect] }, text: isSliced ? 'SHAPES' : effect === 'kinetic' ? 'GFXSHIFT' : 'GFX\nSHIFT', font: isSliced ? 'Inter' : 'Arial', fontSize: 150, scale: 1,
    fontWeight: isSliced ? 800 : 700, letterSpacing: -4, x: 0.5, y: 0.5, outline: false, rotation: 0,
    lineHeight: 0.86, align: 'center',
  }
}

export function makeTextLayer(index = 1): LabLayer {
  return {
    ...makeLayer('kinetic', index), id: crypto.randomUUID(), name: `Type ${String(index).padStart(2, '0')}`,
    kind: 'text', text: 'GFX\nSHIFT', fontSize: 150, fontWeight: 800, color: '#f4f1e8',
    blend: 'source-over', params: { ...DEFAULT_PARAMS },
  }
}
