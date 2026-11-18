import { useState } from 'react'
import { ChevronDown, Dices, Grid3X3, MousePointer2, PenTool, RotateCcw, ScanLine, Shapes, Upload, X } from 'lucide-react'
import type { CanvasSize, LabLayer } from '../../types/lab'
import { DEFAULT_PARAMS, EFFECTS, makeLayer } from '../../types/lab'
import { FALLBACK_FONTS } from '../../engine/fonts'
import { RangeControl } from './Controls'

type ContextPanelProps = {
  layer: LabLayer
  size: CanvasSize
  fonts: string[]
  scanningFonts: boolean
  converting: boolean
  shapeAssetCount: number
  onUploadShapes: (files: FileList) => void
  onPatch: (patch: Partial<LabLayer>) => void
  onScanFonts: () => void
  onConvert: () => void
  onRandomize: () => void
}

export function ContextPanel({ layer, size, fonts, scanningFonts, converting, shapeAssetCount, onUploadShapes, onPatch, onScanFonts, onConvert, onRandomize }: ContextPanelProps) {
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 680px)').matches)
  const definition = EFFECTS.find((effect) => effect.id === layer.effect) ?? EFFECTS[0]
  const availableFonts = [...new Set([...fonts, ...FALLBACK_FONTS])].sort((a, b) => a.localeCompare(b))
  const resetEffect = () => {
    const fresh = makeLayer(layer.effect)
    onPatch(['sliced', 'shapes', 'masked'].includes(layer.effect) ? {
      params: fresh.params,
      text: fresh.text,
      font: fresh.font,
      fontWeight: fresh.fontWeight,
      letterSpacing: fresh.letterSpacing,
      scale: fresh.scale,
      x: fresh.x,
      y: fresh.y,
      color: fresh.color,
      secondaryColor: fresh.secondaryColor,
      colorMode: fresh.colorMode,
      shapeStyle: fresh.shapeStyle,
      shapeText: fresh.shapeText,
    } : { params: fresh.params })
  }

  return (
    <section className={`context-panel ${collapsed ? 'collapsed' : ''}`} aria-label="Contextual controls">
      <header className="context-header">
        <div><span className="context-kicker">{layer.kind === 'text' ? 'TYPE INSTRUMENT' : definition.short + ' / LIVE SYSTEM'}</span><h2>{layer.name}</h2></div>
        <button className="icon-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand controls' : 'Collapse controls'}>{collapsed ? <ChevronDown size={16} /> : <X size={16} />}</button>
      </header>
      {!collapsed && (
        <div className="context-body">
          {layer.kind === 'effect' ? (
            <>
              {['kinetic', 'sliced', 'masked'].includes(layer.effect) && (
                <div className="effect-text-controls">
                  <label className="field-label">Custom effect text
                    <input type="text" maxLength={40} value={layer.text} onChange={(event) => onPatch({ text: event.target.value })} placeholder="Enter your word" />
                  </label>
                  <div className="two-column-controls">
                    <label className="field-label">Font
                      <select value={layer.font} onChange={(event) => onPatch({ font: event.target.value })}>{availableFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select>
                    </label>
                    <label className="field-label">Weight
                      <select value={layer.fontWeight} onChange={(event) => onPatch({ fontWeight: Number(event.target.value) })}>{[400, 500, 600, 700, 800, 900].map((weight) => <option key={weight}>{weight}</option>)}</select>
                    </label>
                  </div>
                </div>
              )}
              {layer.effect === 'sliced' && (
                <>
                  <RangeControl definition={{ key: 'tracking', label: 'Tracking', min: -30, max: 60, step: 1, unit: 'px' }} value={layer.letterSpacing} onChange={(value) => onPatch({ letterSpacing: value })} />
                  <RangeControl definition={{ key: 'textScale', label: 'Text scale', min: 10, max: 400, step: 1, unit: '%' }} value={Math.round((layer.scale ?? 1) * 100)} onChange={(value) => onPatch({ scale: value / 100 })} />
                  <RangeControl definition={{ key: 'x', label: 'Horizontal position', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(layer.x * 100)} onChange={(value) => onPatch({ x: value / 100 })} />
                  <RangeControl definition={{ key: 'y', label: 'Vertical position', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(layer.y * 100)} onChange={(value) => onPatch({ y: value / 100 })} />
                </>
              )}
              {layer.effect === 'sliced' && (
                <div className="mesh-editor-controls">
                  <button className={`${layer.splitEditing ? 'primary-action' : 'secondary-action'} full-width`} onClick={() => onPatch({ splitEditing: !layer.splitEditing })}><PenTool size={14} /> {layer.splitEditing ? 'Finish split vectors' : 'Draw custom split vectors'}</button>
                  {layer.splitPaths.length > 0 && <button className="text-action mesh-reset" onClick={() => onPatch({ splitPaths: [] })}><RotateCcw size={13} /> Clear {layer.splitPaths.length} custom paths</button>}
                  {layer.splitEditing && <p className="mesh-hint"><MousePointer2 size={13} /> Drag across the text to draw one or more split lines. Guides are not exported.</p>}
                </div>
              )}
              {['shapes', 'flow', 'displace'].includes(layer.effect) && (
                <label className="field-label">{layer.effect === 'displace' ? 'Displacement pattern' : layer.effect === 'flow' ? 'Vector object' : 'Shape family'}
                  <select value={layer.shapeStyle} onChange={(event) => onPatch({ shapeStyle: event.target.value as LabLayer['shapeStyle'] })}>
                    {layer.effect === 'shapes' && <><option value="mixed">Mixed geometric forms</option><option value="round">Circles, arcs, and rings</option><option value="angular">Polygons and crosses</option></>}
                    <option value="linear">{layer.effect === 'displace' ? 'Generated bands' : 'Bars, crosses, and flowing lines'}</option>
                    {layer.effect === 'displace' && <option value="angular">Generated circles and diamonds</option>}
                    {layer.effect !== 'displace' && <option value="text">Random Arabic and English text</option>}
                    <option value="custom">{layer.effect === 'displace' ? 'Imported shape masks' : 'Uploaded PNG or SVG objects'}</option>
                  </select>
                </label>
              )}
              {['shapes', 'flow'].includes(layer.effect) && layer.shapeStyle === 'text' && (
                <label className="field-label">Text objects · one item per line
                  <textarea rows={3} value={layer.shapeText} onChange={(event) => onPatch({ shapeText: event.target.value })} placeholder="GFX\nSHIFT\nإبداع\nتحول" />
                </label>
              )}
              {['shapes', 'flow', 'displace'].includes(layer.effect) && layer.shapeStyle === 'custom' && (
                <div className="asset-upload-control">
                  <label className="secondary-action full-width"><Upload size={14} /> {shapeAssetCount ? `${shapeAssetCount} of 10 objects loaded` : 'Upload up to 10 PNG or SVG objects'}<input type="file" accept="image/png,image/svg+xml" multiple hidden onChange={(event) => { if (event.target.files?.length) onUploadShapes(event.target.files); event.target.value = '' }} /></label>
                  <p className="microcopy">Original colors and transparency are retained. Assets stay in this browser session.</p>
                </div>
              )}
              <p className="context-description">{definition.description}</p>
              <div className="context-actions">
                <button className="text-action" onClick={onRandomize}><Dices size={14} /> Randomize</button>
                <button className="text-action" onClick={resetEffect}><RotateCcw size={14} /> Reset</button>
              </div>
              {definition.params.map((parameter) => (
                <RangeControl key={parameter.key} definition={parameter} value={layer.params[parameter.key] ?? DEFAULT_PARAMS[parameter.key]} disabled={Boolean(layer.meshPoints?.length && layer.effect === 'triangulate' && ['density', 'intensity', 'vector'].includes(parameter.key))} onChange={(value) => onPatch({ params: { ...layer.params, [parameter.key]: value } })} />
              ))}
              <label className="field-label color-source">Color source
                <select value={layer.colorMode} onChange={(event) => onPatch({ colorMode: event.target.value as LabLayer['colorMode'] })}>
                  <option value="seed">Seed image colors</option>
                  <option value="palette">Custom palette</option>
                  <option value="solid">Solid color</option>
                </select>
              </label>
              {layer.colorMode === 'solid' && <label className="color-field"><span>{layer.effect === 'sketch' ? 'Ink color' : layer.effect === 'shapes' ? 'Shape color' : 'System tint'}</span><input type="color" value={layer.color} onChange={(event) => onPatch({ color: event.target.value })} /><output>{layer.color.toUpperCase()}</output></label>}
              {((layer.effect === 'sketch' && layer.colorMode !== 'palette') || ['sliced', 'shapes', 'flow', 'spray', 'kinetic', 'masked', 'receding'].includes(layer.effect)) && <label className="color-field"><span>{layer.effect === 'sketch' ? 'Paper color' : 'Background'}</span><input type="color" value={layer.secondaryColor} onChange={(event) => onPatch({ secondaryColor: event.target.value })} /><output>{layer.secondaryColor.toUpperCase()}</output></label>}
              {layer.effect === 'displace' && (
                <div className="mesh-editor-controls">
                  <span className="field-label">Effect area</span>
                  <div className="three-column-controls">
                    <button className={!layer.selectionEditing && !layer.selection ? 'primary-action' : 'secondary-action'} onClick={() => onPatch({ selection: undefined, selectionEditing: undefined })}>Full</button>
                    <button className={layer.selectionEditing === 'marquee' ? 'primary-action' : 'secondary-action'} onClick={() => onPatch({ selectionEditing: 'marquee' })}>Marquee</button>
                    <button className={layer.selectionEditing === 'free' ? 'primary-action' : 'secondary-action'} onClick={() => onPatch({ selectionEditing: 'free' })}>Free path</button>
                  </div>
                  {layer.selection && <button className="text-action mesh-reset" onClick={() => onPatch({ selection: undefined, selectionEditing: undefined })}>Clear selection · use full canvas</button>}
                  {layer.selectionEditing && <p className="mesh-hint"><MousePointer2 size={13} /> Drag on the canvas. RGB movement applies only inside the resulting area.</p>}
                </div>
              )}
              {layer.effect === 'triangulate' && (
                <div className="mesh-editor-controls">
                  <button className={`${layer.meshEditing ? 'primary-action' : 'secondary-action'} full-width`} onClick={() => onPatch({ meshEditing: !layer.meshEditing })}><Grid3X3 size={14} /> {layer.meshEditing ? 'Finish mesh editing' : 'Edit geometric mesh'}</button>
                  {layer.meshEditing && <button className="text-action mesh-reset" onClick={() => onPatch({ meshPoints: undefined })}><RotateCcw size={13} /> Restore automatic mesh</button>}
                  {layer.meshEditing && <p className="mesh-hint"><MousePointer2 size={13} /> Click to add · drag to move · Alt-click or right-click to delete.</p>}
                </div>
              )}
              <p className="pointer-hint"><span className="live-dot" /> {layer.meshEditing ? `${layer.meshPoints?.length ?? 0} custom points · guides are not exported.` : 'Move or press on the canvas to apply force.'}</p>
            </>
          ) : (
            <>
              <label className="field-label">Text content
                <textarea value={layer.text} disabled={Boolean(layer.shapes)} onChange={(event) => onPatch({ text: event.target.value })} rows={2} />
              </label>
              <label className="field-label">Device font
                <select value={layer.font} disabled={Boolean(layer.shapes)} onChange={(event) => onPatch({ font: event.target.value })}>
                  {availableFonts.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>
              <button className="secondary-action full-width" onClick={onScanFonts} disabled={scanningFonts || Boolean(layer.shapes)}><ScanLine size={14} /> {scanningFonts ? 'Requesting font access…' : `Scan device fonts${fonts.length ? ` (${fonts.length})` : ''}`}</button>
              <div className="two-column-controls">
                <label className="field-label">Size<input type="number" min={8} max={600} value={layer.fontSize} disabled={Boolean(layer.shapes)} onChange={(event) => onPatch({ fontSize: Number(event.target.value) })} /></label>
                <label className="field-label">Weight<select value={layer.fontWeight} disabled={Boolean(layer.shapes)} onChange={(event) => onPatch({ fontWeight: Number(event.target.value) })}>{[300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight}>{weight}</option>)}</select></label>
              </div>
              <RangeControl definition={{ key: 'textScale', label: 'Text scale', min: 10, max: 400, step: 1, unit: '%' }} value={Math.round((layer.scale ?? 1) * 100)} onChange={(value) => onPatch({ scale: value / 100 })} />
              <RangeControl definition={{ key: 'tracking', label: 'Tracking', min: -30, max: 60, step: 1, unit: 'px' }} value={layer.letterSpacing} disabled={Boolean(layer.shapes)} onChange={(value) => onPatch({ letterSpacing: value })} />
              <RangeControl definition={{ key: 'lineHeight', label: 'Line height', min: 0.6, max: 2, step: 0.01 }} value={layer.lineHeight} disabled={Boolean(layer.shapes)} onChange={(value) => onPatch({ lineHeight: value })} />
              <label className="field-label">Alignment<select value={layer.align} disabled={Boolean(layer.shapes)} onChange={(event) => onPatch({ align: event.target.value as LabLayer['align'] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
              <RangeControl definition={{ key: 'x', label: 'Horizontal position', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(layer.x * 100)} disabled={Boolean(layer.shapes)} onChange={(value) => onPatch({ x: value / 100 })} />
              <RangeControl definition={{ key: 'y', label: 'Vertical position', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(layer.y * 100)} disabled={Boolean(layer.shapes)} onChange={(value) => onPatch({ y: value / 100 })} />
              <RangeControl definition={{ key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' }} value={layer.rotation} disabled={Boolean(layer.shapes)} onChange={(value) => onPatch({ rotation: value })} />
              <div className="text-options-row">
                <label className="check-label"><input type="checkbox" checked={layer.outline} onChange={(event) => onPatch({ outline: event.target.checked })} /> Outline only</label>
                <label className="color-field compact"><input type="color" value={layer.color} onChange={(event) => onPatch({ color: event.target.value })} /><span>{layer.color.toUpperCase()}</span></label>
              </div>
              <button className="primary-action full-width" onClick={onConvert} disabled={converting}><Shapes size={15} /> {converting ? 'Converting outlines…' : layer.shapes ? 'Return to editable text' : 'Convert text to shapes'}</button>
              <p className="microcopy">{layer.shapes ? `${layer.shapes.length} vector commands · ${size.width} × ${size.height}` : 'Drag the text directly on the canvas. Shape conversion preserves the selected font’s vector contours.'}</p>
            </>
          )}
          <div className="mask-controls">
            <span className="field-label">Alpha and layer mask</span>
            <button className={`${layer.maskEditing ? 'primary-action' : 'secondary-action'} full-width`} onClick={() => onPatch({ maskEditing: !layer.maskEditing })}><PenTool size={14} /> {layer.maskEditing ? 'Finish mask painting' : layer.maskStrokes.length ? 'Edit painted layer mask' : 'Add painted layer mask'}</button>
            {layer.maskEditing && <>
              <RangeControl definition={{ key: 'maskBrush', label: 'Mask brush', min: 4, max: 240, step: 1, unit: 'px' }} value={layer.maskBrush} onChange={(value) => onPatch({ maskBrush: value })} />
              <label className="check-label"><input type="checkbox" checked={!layer.maskErase} onChange={(event) => onPatch({ maskErase: !event.target.checked })} /> Restore hidden areas (uncheck to erase)</label>
              <p className="microcopy">Paint to hide or restore this layer. Layer alpha remains available in the Layers panel.</p>
            </>}
            {layer.maskStrokes.length > 0 && <button className="text-action mesh-reset" onClick={() => onPatch({ maskStrokes: [], maskEditing: false })}><RotateCcw size={13} /> Remove mask · {layer.maskStrokes.length} strokes</button>}
          </div>
        </div>
      )}
    </section>
  )
}
