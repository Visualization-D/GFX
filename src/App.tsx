import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Aperture, Check, ChevronDown, Circle, Download, ImagePlus, Layers3,
  Pause, Play, Settings2, SlidersHorizontal, Sparkles, Upload, X, Undo2, Redo2,
} from 'lucide-react'
import { CanvasStage } from './components/lab/CanvasStage'
import { LayersPanel, StyleLibrary } from './components/lab/Controls'
import { ContextPanel } from './components/lab/ContextPanel'
import { convertTextToShapes, scanLocalFonts } from './engine/fonts'
import { createDefaultSeed, type LabEngine } from './engine/LabEngine'
import { extractPalette } from './engine/palette'
import type { BlendMode as PsdBlendMode, Layer as PsdLayer } from 'ag-psd'
import type { BlendMode, CanvasSize, EffectType, LabLayer, LayerGroup, MeshPoint, PaletteGroup } from './types/lab'
import { DEFAULT_PARAMS, EFFECTS, makeLayer, makeTextLayer } from './types/lab'
import './App.css'

const DEFAULT_PALETTE = ['#f44f05', '#247c83', '#f3bf45', '#f4f1e8', '#111311']
const DEFAULT_PALETTE_GROUPS: PaletteGroup[] = [
  { id: 'signature', name: 'GFX Signature', colors: DEFAULT_PALETTE },
  { id: 'warm', name: 'Warm Print', colors: ['#f44f05', '#f3bf45'] },
  { id: 'cool', name: 'Cool Signal', colors: ['#247c83', '#55b8c4', '#d7f0e9'] },
  { id: 'mono', name: 'Monochrome', colors: ['#111311', '#f4f1e8'] },
]
const PSD_BLEND_MODES: Record<BlendMode, PsdBlendMode> = {
  'source-over': 'normal', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken',
  lighten: 'lighten', 'color-dodge': 'color dodge', difference: 'difference', exclusion: 'exclusion',
  hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity',
}

const CANVAS_PRESETS: { name: string; width: number; height: number }[] = [
  { name: 'A4 Portrait', width: 1240, height: 1754 },
  { name: 'Landscape', width: 1200, height: 800 },
  { name: 'Square', width: 1080, height: 1080 },
  { name: 'Widescreen', width: 1920, height: 1080 },
  { name: 'Portrait', width: 1080, height: 1920 },
  { name: 'Story', width: 1080, height: 1350 },
]

function initialLayers() {
  const base = makeLayer('shapes', 1)
  const type = makeTextLayer(1)
  type.fontSize = 136
  type.letterSpacing = -5
  return [type, base]
}

function loadSavedState(): { layers: LabLayer[]; size: CanvasSize; background: string; palette: string[]; groups: LayerGroup[]; paletteGroups: PaletteGroup[]; activePaletteGroup: string } {
  try {
    const saved = localStorage.getItem('seedshift-project-v1')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.layers) && parsed.layers.length && parsed.size?.width && parsed.size?.height) {
        const normalizedLayers = parsed.layers.map((layer: LabLayer) => ({
          ...makeLayer(layer.effect ?? 'liquid'), ...layer,
          params: { ...DEFAULT_PARAMS, ...layer.params },
        }))
        const paletteGroups = Array.isArray(parsed.paletteGroups) ? parsed.paletteGroups.filter((group: PaletteGroup) => Array.isArray(group.colors) && group.colors.length >= 2 && group.colors.length <= 10) : DEFAULT_PALETTE_GROUPS
        const groups = Array.isArray(parsed.groups) ? parsed.groups : []
        const activePaletteGroup = paletteGroups.some((group: PaletteGroup) => group.id === parsed.activePaletteGroup) ? parsed.activePaletteGroup : paletteGroups[0]?.id ?? 'signature'
        const activeColors = paletteGroups.find((group: PaletteGroup) => group.id === activePaletteGroup)?.colors
        return { ...parsed, layers: normalizedLayers, groups, paletteGroups, activePaletteGroup, palette: activeColors ?? (Array.isArray(parsed.palette) ? parsed.palette : DEFAULT_PALETTE) }
      }
    }
  } catch { /* Use a fresh composition if local data is unavailable. */ }
  return { layers: initialLayers(), size: { width: 1240, height: 1754 }, background: '#111311', palette: DEFAULT_PALETTE, groups: [], paletteGroups: DEFAULT_PALETTE_GROUPS, activePaletteGroup: 'signature' }
}

function recordingMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/mp4;codecs="avc1.42E01E"',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? ''
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function decodeImageFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} could not be decoded.`)) }
    image.src = url
  })
}

type ProjectSnapshot = {
  layers: LabLayer[]
  size: CanvasSize
  background: string
  palette: string[]
  groups: LayerGroup[]
  paletteGroups: PaletteGroup[]
  activePaletteGroup: string
  layerImages: ReadonlyMap<string, HTMLImageElement>
  shapeImages: ReadonlyMap<string, HTMLImageElement[]>
}

export default function App() {
  const saved = useRef(loadSavedState()).current
  const [layers, setLayers] = useState<LabLayer[]>(saved.layers)
  const [selectedId, setSelectedId] = useState(saved.layers.find((layer) => layer.kind === 'effect')?.id ?? saved.layers[0].id)
  const [size, setSize] = useState<CanvasSize>(saved.size)
  const [background, setBackground] = useState(saved.background)
  const [palette, setPalette] = useState<string[]>(saved.palette)
  const [groups, setGroups] = useState<LayerGroup[]>(saved.groups)
  const [paletteGroups, setPaletteGroups] = useState<PaletteGroup[]>(saved.paletteGroups)
  const [activePaletteGroup, setActivePaletteGroup] = useState(saved.activePaletteGroup)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [layerImages, setLayerImages] = useState<ReadonlyMap<string, HTMLImageElement>>(() => new Map())
  const [shapeImages, setShapeImages] = useState<ReadonlyMap<string, HTMLImageElement[]>>(() => new Map())
  const [fonts, setFonts] = useState<string[]>([])
  const [scanningFonts, setScanningFonts] = useState(false)
  const [converting, setConverting] = useState(false)
  const [exportingPsd, setExportingPsd] = useState(false)
  const [fps, setFps] = useState(60)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [sizeDraft, setSizeDraft] = useState(size)
  const [mobilePanel, setMobilePanel] = useState<'styles' | 'layers' | null>(null)
  const [toast, setToast] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(5)
  const [recordProgress, setRecordProgress] = useState(0)
  const [mime] = useState(recordingMime)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<LabEngine | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyRef = useRef<{ past: ProjectSnapshot[]; future: ProjectSnapshot[] }>({ past: [], future: [] })
  const previousSnapshot = useRef<ProjectSnapshot | null>(null)
  const restoringHistory = useRef(false)
  const [, setHistoryVersion] = useState(0)
  const selected = layers.find((layer) => layer.id === selectedId) ?? layers[0]
  const selectedImage = selected?.kind === 'effect' ? layerImages.get(selected.id) : undefined
  const selectedShapeAssetCount = selected ? shapeImages.get(selected.id)?.length ?? 0 : 0
  const selectedSeedName = selected?.kind !== 'effect'
    ? 'Select an effect layer'
    : selectedImage
      ? selected.seedName
      : selected.seedName !== 'Generative seed 001'
        ? `Reattach ${selected.seedName}`
        : selected.seedName

  const notify = (message: string) => setToast(message)
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    try { localStorage.setItem('seedshift-project-v1', JSON.stringify({ layers, size, background, palette, groups, paletteGroups, activePaletteGroup })) } catch { /* Storage can be unavailable in private contexts. */ }
  }, [layers, size, background, palette, groups, paletteGroups, activePaletteGroup])

  const captureSnapshot = useCallback((): ProjectSnapshot => ({
    layers: structuredClone(layers), size: { ...size }, background, palette: [...palette], groups: structuredClone(groups),
    paletteGroups: structuredClone(paletteGroups), activePaletteGroup, layerImages, shapeImages,
  }), [layers, size, background, palette, groups, paletteGroups, activePaletteGroup, layerImages, shapeImages])
  const applySnapshot = (snapshot: ProjectSnapshot) => {
    setLayers(structuredClone(snapshot.layers)); setSize({ ...snapshot.size }); setBackground(snapshot.background); setPalette([...snapshot.palette])
    setGroups(structuredClone(snapshot.groups)); setPaletteGroups(structuredClone(snapshot.paletteGroups)); setActivePaletteGroup(snapshot.activePaletteGroup)
    setLayerImages(snapshot.layerImages); setShapeImages(snapshot.shapeImages)
    if (!snapshot.layers.some((layer) => layer.id === selectedId)) setSelectedId(snapshot.layers[0]?.id ?? '')
  }
  useEffect(() => {
    const current = captureSnapshot()
    if (!previousSnapshot.current) { previousSnapshot.current = current; return }
    if (restoringHistory.current) { restoringHistory.current = false; previousSnapshot.current = current; return }
    historyRef.current.past.push(previousSnapshot.current)
    if (historyRef.current.past.length > 60) historyRef.current.past.shift()
    historyRef.current.future = []
    previousSnapshot.current = current
    setHistoryVersion((value) => value + 1)
  }, [captureSnapshot])

  function undo() {
    const snapshot = historyRef.current.past.pop()
    if (!snapshot) return
    historyRef.current.future.push(captureSnapshot())
    restoringHistory.current = true
    applySnapshot(snapshot)
    setHistoryVersion((value) => value + 1)
    notify('Undo')
  }
  function redo() {
    const snapshot = historyRef.current.future.pop()
    if (!snapshot) return
    historyRef.current.past.push(captureSnapshot())
    restoringHistory.current = true
    applySnapshot(snapshot)
    setHistoryVersion((value) => value + 1)
    notify('Redo')
  }

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement
      if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
      if (event.key === 'Escape') { setSizeOpen(false); setMobilePanel(null) }
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement)) {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  })

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
  }, [])

  const patchLayer = (id: string, patch: Partial<LabLayer>) => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer))
  }

  const addEffectLayer = (effect: EffectType) => {
    const layer = makeLayer(effect, layers.length + 1)
    const sourceLayer = selected?.kind === 'effect' ? selected : undefined
    const sourceImage = sourceLayer ? layerImages.get(sourceLayer.id) : undefined
    if (sourceLayer && sourceImage) {
      layer.seedName = sourceLayer.seedName
      setLayerImages((current) => new Map(current).set(layer.id, sourceImage))
    }
    setLayers((current) => [layer, ...current])
    setSelectedId(layer.id)
    setMobilePanel(null)
  }

  const applyEffect = (effect: EffectType) => {
    addEffectLayer(effect)
    notify(`${EFFECTS.find((item) => item.id === effect)?.name ?? 'Effect'} added as a new layer`)
  }

  const addEffect = () => addEffectLayer('liquid')

  const addText = () => {
    const layer = makeTextLayer(layers.length + 1)
    layer.text = 'NEW TYPE'
    layer.fontSize = Math.round(Math.min(size.width, size.height) * 0.16)
    setLayers((current) => [layer, ...current])
    setSelectedId(layer.id)
    setMobilePanel(null)
  }

  const duplicateLayer = (id: string) => {
    const source = layers.find((layer) => layer.id === id)
    if (!source) return
    const clone = structuredClone(source)
    clone.id = crypto.randomUUID()
    clone.name = `${source.name} copy`
    clone.meshEditing = false
    clone.splitEditing = false
    clone.maskEditing = false
    clone.selectionEditing = undefined
    const image = layerImages.get(id)
    if (image) setLayerImages((current) => new Map(current).set(clone.id, image))
    const assets = shapeImages.get(id)
    if (assets) setShapeImages((current) => new Map(current).set(clone.id, [...assets]))
    const index = layers.findIndex((layer) => layer.id === id)
    setLayers((current) => [...current.slice(0, index), clone, ...current.slice(index)])
    setSelectedId(clone.id)
  }

  const deleteLayer = (id: string) => {
    if (layers.length === 1) return
    const index = layers.findIndex((layer) => layer.id === id)
    const remaining = layers.filter((layer) => layer.id !== id)
    setLayers(remaining)
    setLayerImages((current) => {
      if (!current.has(id)) return current
      const next = new Map(current)
      next.delete(id)
      return next
    })
    setShapeImages((current) => {
      if (!current.has(id)) return current
      const next = new Map(current)
      next.delete(id)
      return next
    })
    if (selectedId === id) setSelectedId(remaining[Math.max(0, index - 1)].id)
  }

  const moveLayer = (id: string, direction: -1 | 1) => {
    const index = layers.findIndex((layer) => layer.id === id)
    const destination = index + direction
    if (destination < 0 || destination >= layers.length) return
    const next = [...layers]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    setLayers(next)
  }

  const loadImage = (file: File) => {
    const targetLayer = selected?.kind === 'effect' ? selected : undefined
    if (!targetLayer) { notify('Select an effect layer before assigning an image.'); return }
    if (!file.type.startsWith('image/')) { notify('Choose an image file to use as a seed.'); return }
    if (file.size > 25 * 1024 * 1024) { notify('Please choose an image smaller than 25 MB.'); return }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setLayerImages((current) => new Map(current).set(targetLayer.id, image))
      patchLayer(targetLayer.id, { seedName: file.name })
      URL.revokeObjectURL(url)
      notify(`${targetLayer.name} · ${file.name} · ${image.naturalWidth} × ${image.naturalHeight}`)
    }
    image.onerror = () => { URL.revokeObjectURL(url); notify('This image could not be decoded.') }
    image.src = url
  }

  const loadShapeImages = async (files: FileList) => {
    const target = selected?.kind === 'effect' && ['shapes', 'flow', 'displace'].includes(selected.effect) ? selected : undefined
    if (!target) { notify('Select Shape Field, Vector Flow, or RGB Displacement first.'); return }
    const accepted = [...files].filter((file) => file.type === 'image/png' || file.type === 'image/svg+xml' || /\.(png|svg)$/i.test(file.name)).slice(0, 10)
    if (!accepted.length) { notify('Choose PNG or SVG shape assets.'); return }
    try {
      const decoded = await Promise.all(accepted.map((file) => decodeImageFile(file)))
      setShapeImages((current) => new Map(current).set(target.id, [...(current.get(target.id) ?? []), ...decoded].slice(0, 10)))
      patchLayer(target.id, { shapeStyle: 'custom', shapeAssetNames: [...target.shapeAssetNames, ...accepted.map((file) => file.name)].slice(0, 10) })
      const assigned = Math.min(10, (shapeImages.get(target.id)?.length ?? 0) + decoded.length)
      notify(`${assigned} custom objects assigned to ${target.name}`)
    } catch (error) { notify(error instanceof Error ? error.message : 'Shape assets could not be loaded.') }
  }

  const addImageFileAsLayer = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const image = await decodeImageFile(file)
      const layer = makeLayer('image', layers.length + 1)
      layer.name = `Pasted image ${String(layers.length + 1).padStart(2, '0')}`
      layer.seedName = file.name || 'Clipboard screenshot'
      setLayerImages((current) => new Map(current).set(layer.id, image))
      setLayers((current) => [layer, ...current])
      setSelectedId(layer.id)
      notify('Clipboard image added as a new independent layer')
    } catch { notify('The clipboard image could not be decoded.') }
  }

  const addGroup = () => {
    const group: LayerGroup = { id: crypto.randomUUID(), name: `Group ${String(groups.length + 1).padStart(2, '0')}`, visible: true, collapsed: false }
    setGroups((current) => [...current, group])
    if (selected) patchLayer(selected.id, { groupId: group.id })
    notify('Layer group created')
  }
  const patchGroup = (id: string, patch: Partial<LayerGroup>) => setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group))
  const deleteGroup = (id: string) => {
    setGroups((current) => current.filter((group) => group.id !== id))
    setLayers((current) => current.map((layer) => layer.groupId === id ? { ...layer, groupId: undefined } : layer))
  }

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) { event.preventDefault(); void addImageFileAsLayer(file) }
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })

  const scanFonts = async () => {
    setScanningFonts(true)
    try {
      const names = await scanLocalFonts()
      setFonts(names)
      notify(`${names.length} device font families available`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Device font access was not granted.')
    } finally { setScanningFonts(false) }
  }

  const convertText = async () => {
    if (!selected || selected.kind !== 'text') return
    if (selected.shapes) {
      patchLayer(selected.id, { shapes: undefined })
      notify('Text is editable again')
      return
    }
    setConverting(true)
    try {
      await document.fonts.load(`${selected.fontWeight} ${selected.fontSize}px "${selected.font}"`)
      const shapes = await convertTextToShapes(selected, size)
      patchLayer(selected.id, { shapes })
      notify(`Converted to ${shapes.length} vector commands`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Text could not be converted.')
    } finally { setConverting(false) }
  }

  const randomize = () => {
    if (!selected) return
    const definition = EFFECTS.find((effect) => effect.id === selected.effect)
    if (!definition) return
    const params = { ...selected.params }
    definition.params.forEach((parameter) => {
      const raw = parameter.min + Math.random() * (parameter.max - parameter.min)
      params[parameter.key] = Math.round(raw / parameter.step) * parameter.step
    })
    patchLayer(selected.id, { params })
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) { downloadBlob(blob, `gfx-shift-v2-${Date.now()}.png`); notify('PNG exported at canvas resolution') }
    }, 'image/png')
  }

  const exportPsd = async () => {
    const engine = engineRef.current
    const composite = canvasRef.current
    if (!engine || !composite || exportingPsd) return
    setExportingPsd(true)
    notify('Rendering layered PSD…')
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const { writePsd } = await import('ag-psd')
      const backgroundCanvas = document.createElement('canvas')
      backgroundCanvas.width = size.width
      backgroundCanvas.height = size.height
      const backgroundCtx = backgroundCanvas.getContext('2d')!
      backgroundCtx.fillStyle = background
      backgroundCtx.fillRect(0, 0, size.width, size.height)
      const renderPsdLayer = (layer: LabLayer): PsdLayer => ({
        name: layer.name,
        canvas: engine.renderLayer(layer, size, palette),
        hidden: !layer.visible,
        opacity: layer.opacity,
        blendMode: PSD_BLEND_MODES[layer.blend],
      })
      const children: PsdLayer[] = []
      const renderedGroups = new Set<string>()
      layers.forEach((layer) => {
        const group = layer.groupId ? groups.find((item) => item.id === layer.groupId) : undefined
        if (!group) { children.push(renderPsdLayer(layer)); return }
        if (renderedGroups.has(group.id)) return
        renderedGroups.add(group.id)
        children.push({
          name: group.name,
          hidden: !group.visible,
          opened: !group.collapsed,
          children: layers.filter((item) => item.groupId === group.id).map(renderPsdLayer),
        })
      })
      groups.filter((group) => !renderedGroups.has(group.id)).forEach((group) => {
        children.push({ name: group.name, hidden: !group.visible, opened: !group.collapsed, children: [] })
      })
      children.push({ name: 'Canvas background', canvas: backgroundCanvas, hidden: false, opacity: 1, blendMode: 'normal' })
      const buffer = writePsd({ width: size.width, height: size.height, canvas: composite, children }, { generateThumbnail: true })
      downloadBlob(new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }), `gfx-shift-v2-${Date.now()}.psd`)
      notify(`Layered PSD exported · ${layers.length + 1} raster layers · ${groups.length} groups`)
    } catch (error) {
      notify(error instanceof Error ? `PSD export failed: ${error.message}` : 'PSD export failed in this browser.')
    } finally {
      setExportingPsd(false)
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    recordTimerRef.current = null
  }

  const startRecording = () => {
    if (recording) { stopRecording(); return }
    const canvas = canvasRef.current
    if (!canvas || !mime || !canvas.captureStream) {
      notify('Video capture is not supported in this browser. PNG export remains available.')
      return
    }
    try {
      const stream = canvas.captureStream(60)
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        const extension = mime.includes('mp4') ? 'mp4' : 'webm'
        downloadBlob(new Blob(chunks, { type: mime }), `gfx-shift-v2-${Date.now()}.${extension}`)
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
        setRecordProgress(0)
        notify(`${extension.toUpperCase()} recording exported`)
      }
      recorder.onerror = () => { notify('Recording failed. Try a shorter duration.'); setRecording(false) }
      recorderRef.current = recorder
      recorder.start(200)
      setRecording(true)
      setPlaying(true)
      const started = performance.now()
      recordTimerRef.current = setInterval(() => {
        const progress = Math.min(1, (performance.now() - started) / (recordDuration * 1000))
        setRecordProgress(progress)
        if (progress >= 1) stopRecording()
      }, 100)
    } catch { notify('Recording could not start in this browser.') }
  }

  const changePalette = (colors: string[]) => {
    const next = colors.slice(0, 10)
    if (next.length < 2) return
    setPalette(next)
    setPaletteGroups((current) => current.map((group) => group.id === activePaletteGroup ? { ...group, colors: next } : group))
  }
  const activatePaletteGroup = (id: string) => {
    const group = paletteGroups.find((item) => item.id === id)
    if (!group) return
    setActivePaletteGroup(id)
    setPalette([...group.colors])
  }

  const extractSeedPalette = () => {
    try {
      const colors = extractPalette(selectedImage ?? createDefaultSeed())
      changePalette(colors)
      if (selected?.kind === 'effect') patchLayer(selected.id, { colorMode: 'palette' })
      notify(`Extracted ${colors.join(' · ').toUpperCase()}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Colors could not be extracted from this seed.')
    }
  }

  const moveSelectedText = (point: MeshPoint) => {
    if (!selected || (selected.kind !== 'text' && selected.effect !== 'sliced')) return
    patchLayer(selected.id, { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) })
  }

  const updateSelectedMesh = (meshPoints: MeshPoint[]) => {
    if (selected?.effect === 'triangulate') patchLayer(selected.id, { meshPoints })
  }

  const applySize = () => {
    const width = Math.max(64, Math.min(4096, Math.round(sizeDraft.width)))
    const height = Math.max(64, Math.min(4096, Math.round(sizeDraft.height)))
    setSize({ width, height })
    setSizeDraft({ width, height })
    setSizeOpen(false)
    notify(`Canvas resized to ${width} × ${height}`)
  }

  const layerPanel = (
    <LayersPanel layers={layers} groups={groups} selectedId={selectedId} onSelect={setSelectedId} onAddEffect={addEffect} onAddText={addText} onAddGroup={addGroup} onPatchGroup={patchGroup} onDeleteGroup={deleteGroup} onPatch={patchLayer} onDuplicate={duplicateLayer} onDelete={deleteLayer} onMove={moveLayer} />
  )
  const stylePanel = <StyleLibrary onSelect={applyEffect} onUpload={() => uploadRef.current?.click()} paletteGroups={paletteGroups} activePaletteGroup={activePaletteGroup} onActivatePaletteGroup={activatePaletteGroup} onPaletteChange={changePalette} onExtractPalette={extractSeedPalette} />

  return (
    <main className="lab-shell">
      <header className="topbar">
        <div className="brand"><Aperture size={22} strokeWidth={1.6} /><span>GFX<span>_</span>Shift <b>V2</b></span><small>By Dr. Mohammad Lataifeh @ University of Sharjah</small></div>
        <div className="topbar-center">
          <button className="canvas-size-button" onClick={() => { setSizeDraft(size); setSizeOpen(true) }}><span>{size.width} × {size.height}</span><ChevronDown size={14} /></button>
          <span className="save-state"><Check size={12} /> Local autosave</span>
        </div>
        <div className="topbar-actions">
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) loadImage(file); event.target.value = '' }} />
          <div className="history-controls" aria-label="Edit history">
            <button className="icon-button" onClick={undo} disabled={!historyRef.current.past.length} aria-label="Undo" title="Undo · Ctrl/Cmd+Z"><Undo2 size={15} /></button>
            <button className="icon-button" onClick={redo} disabled={!historyRef.current.future.length} aria-label="Redo" title="Redo · Shift+Ctrl/Cmd+Z or Ctrl/Cmd+Y"><Redo2 size={15} /></button>
          </div>
          <button className="tool-button upload-button" onClick={() => uploadRef.current?.click()}><Upload size={15} /><span>Upload layer image</span></button>
          <button className="icon-button play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <button className="tool-button" onClick={exportPng}><Download size={15} /><span>PNG</span></button>
          <button className="tool-button" onClick={exportPsd} disabled={exportingPsd} title="Download all composition layers as a PSD"><Download size={15} /><span>{exportingPsd ? 'PSD…' : 'PSD'}</span></button>
          <div className={`record-control ${recording ? 'is-recording' : ''}`}>
            <button className="tool-button record-button" onClick={startRecording}><Circle size={12} fill="currentColor" /><span>{recording ? 'Stop' : 'Record'}</span></button>
            <select aria-label="Recording duration" value={recordDuration} disabled={recording} onChange={(event) => setRecordDuration(Number(event.target.value))}><option value={3}>3s</option><option value={5}>5s</option><option value={10}>10s</option><option value={15}>15s</option></select>
            {recording && <span className="record-progress" style={{ transform: `scaleX(${recordProgress})` }} />}
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-panel">{stylePanel}</aside>
        <section className="stage-column">
          <div className="mobile-toolbar">
            <button onClick={() => setMobilePanel('styles')}><Sparkles size={15} /> Styles</button>
            <span>{selected?.name}</span>
            <div className="mobile-history">
              <button onClick={undo} disabled={!historyRef.current.past.length} aria-label="Undo edit"><Undo2 size={14} /></button>
              <button onClick={redo} disabled={!historyRef.current.future.length} aria-label="Redo edit"><Redo2 size={14} /></button>
            </div>
            <button onClick={() => setMobilePanel('layers')}><Layers3 size={15} /> Layers</button>
          </div>
          <CanvasStage canvasRef={canvasRef} engineRef={engineRef} layers={layers} selected={selected} size={size} background={background} palette={palette} playing={playing} layerImages={layerImages} shapeImages={shapeImages} groups={groups} onPatch={(patch) => { if (selected) patchLayer(selected.id, patch) }} onFps={setFps} onDropImage={loadImage} onMoveText={moveSelectedText} onMeshChange={updateSelectedMesh} />
          {selected && <ContextPanel layer={selected} size={size} fonts={fonts} scanningFonts={scanningFonts} converting={converting} shapeAssetCount={selectedShapeAssetCount} onUploadShapes={(files) => void loadShapeImages(files)} onPatch={(patch) => patchLayer(selected.id, patch)} onScanFonts={scanFonts} onConvert={convertText} onRandomize={randomize} />}
          <div className="stage-status">
            <span><span className="status-light" /> WEB CANVAS / LIVE</span>
            <button onClick={() => uploadRef.current?.click()} title="Assign an image to the selected effect layer"><ImagePlus size={12} /> {selectedSeedName}</button>
            <span>{fps} FPS</span>
            <span>{mime.includes('mp4') ? 'MP4' : mime ? 'WEBM' : 'PNG ONLY'}</span>
          </div>
        </section>
        <aside className="right-panel">{layerPanel}</aside>
      </div>

      {mobilePanel && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobilePanel(null)}>
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close icon-button" onClick={() => setMobilePanel(null)} aria-label="Close panel"><X size={18} /></button>
            {mobilePanel === 'styles' ? stylePanel : layerPanel}
          </aside>
        </div>
      )}

      {sizeOpen && (
        <div className="modal-backdrop" onClick={() => setSizeOpen(false)}>
          <section className="size-modal" role="dialog" aria-modal="true" aria-labelledby="canvas-size-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span className="context-kicker">OUTPUT FORMAT</span><h2 id="canvas-size-title">Canvas dimensions</h2></div><button className="icon-button" onClick={() => setSizeOpen(false)} aria-label="Close canvas settings"><X size={18} /></button></header>
            <div className="preset-grid">
              {CANVAS_PRESETS.map((preset) => <button key={preset.name} className={sizeDraft.width === preset.width && sizeDraft.height === preset.height ? 'active' : ''} onClick={() => setSizeDraft({ width: preset.width, height: preset.height })}><span>{preset.name}</span><small>{preset.width} × {preset.height}</small></button>)}
            </div>
            <div className="custom-size-row">
              <label className="field-label">Width px<input autoFocus type="number" min={64} max={4096} value={sizeDraft.width} onChange={(event) => setSizeDraft({ ...sizeDraft, width: Number(event.target.value) })} /></label>
              <span>×</span>
              <label className="field-label">Height px<input type="number" min={64} max={4096} value={sizeDraft.height} onChange={(event) => setSizeDraft({ ...sizeDraft, height: Number(event.target.value) })} /></label>
            </div>
            <label className="color-field modal-color"><span>Canvas background</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /><output>{background.toUpperCase()}</output></label>
            <button className="primary-action full-width" onClick={applySize}><Settings2 size={16} /> Apply canvas settings</button>
            <p className="microcopy">Maximum 4096 × 4096. Existing vector text is baked at its conversion size.</p>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><SlidersHorizontal size={15} />{toast}</div>}
    </main>
  )
}
