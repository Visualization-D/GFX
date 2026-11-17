import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Pipette, Plus, Trash2, Type, Upload } from 'lucide-react'
import type { BlendMode, LabLayer, ParamDefinition } from '../../types/lab'
import { BLEND_MODES, EFFECTS } from '../../types/lab'

export function RangeControl({ definition, value, onChange, disabled = false }: { definition: ParamDefinition; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const formatted = definition.step < 1 ? value.toFixed(2).replace(/0$/, '') : Math.round(value).toString()
  return (
    <label className="range-control">
      <span className="range-label"><span>{definition.label}</span><output>{formatted}{definition.unit ?? ''}</output></span>
      <input
        type="range"
        min={definition.min}
        max={definition.max}
        step={definition.step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-progress': `${(value - definition.min) / (definition.max - definition.min) * 100}%` } as React.CSSProperties}
      />
    </label>
  )
}

type StyleLibraryProps = {
  onSelect: (effect: typeof EFFECTS[number]['id']) => void
  onUpload: () => void
  palette: string[]
  onPaletteChange: (palette: string[]) => void
  onExtractPalette: () => void
}

export function StyleLibrary({ onSelect, onUpload, palette, onPaletteChange, onExtractPalette }: StyleLibraryProps) {
  return (
    <div className="panel-inner style-library">
      <div className="panel-heading"><span>Transformation library</span><span className="count">{String(EFFECTS.length).padStart(2, '0')}</span></div>
      <p className="panel-intro">Apply a live system to the selected layer.</p>
      <div className="style-list">
        {EFFECTS.map((effect) => (
          <button key={effect.id} className="style-item" onClick={() => onSelect(effect.id)} title={effect.description}>
            <span className="style-code">{effect.short}</span>
            <span>{effect.name}</span>
            <Plus size={14} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="palette-editor">
        <div className="palette-heading"><span>Color combination</span><small>05</small></div>
        <div className="palette-swatches">
          {palette.map((color, index) => (
            <label key={index} title={`Edit color ${index + 1}: ${color.toUpperCase()}`}>
              <input type="color" value={color} onChange={(event) => onPaletteChange(palette.map((entry, colorIndex) => colorIndex === index ? event.target.value : entry))} />
              <span style={{ backgroundColor: color }} />
              <small>{index + 1}</small>
            </label>
          ))}
        </div>
        <button className="text-action palette-extract" onClick={onExtractPalette}><Pipette size={13} /> Extract from seed image</button>
      </div>
      <div className="panel-spacer" />
      <button className="secondary-action full-width" onClick={onUpload}><Upload size={15} /> Load image for selected layer</button>
      <p className="microcopy">PNG, JPG, WEBP, GIF · processed locally</p>
    </div>
  )
}

type LayersPanelProps = {
  layers: LabLayer[]
  selectedId: string
  onSelect: (id: string) => void
  onAddEffect: () => void
  onAddText: () => void
  onPatch: (id: string, patch: Partial<LabLayer>) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function LayersPanel({ layers, selectedId, onSelect, onAddEffect, onAddText, onPatch, onDuplicate, onDelete, onMove }: LayersPanelProps) {
  const selected = layers.find((layer) => layer.id === selectedId)
  return (
    <div className="panel-inner layers-panel">
      <div className="panel-heading"><span>Composition layers</span><span className="count">{String(layers.length).padStart(2, '0')}</span></div>
      <div className="layer-add-row">
        <button className="secondary-action" onClick={onAddEffect}><Plus size={14} /> Effect</button>
        <button className="secondary-action" onClick={onAddText}><Type size={14} /> Text</button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div key={layer.id} className={`layer-row ${selectedId === layer.id ? 'selected' : ''}`}>
            <button className="layer-select" onClick={() => onSelect(layer.id)}>
              <span className="layer-thumb">{layer.kind === 'text' ? <Type size={15} /> : EFFECTS.find((effect) => effect.id === layer.effect)?.short}</span>
              <span className="layer-name">{layer.name}<small>{layer.kind === 'text' ? layer.font : `${layer.effect} · ${layer.seedName}`}</small></span>
            </button>
            <button className="icon-button subtle" onClick={() => onPatch(layer.id, { visible: !layer.visible })} aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}>
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            {selectedId === layer.id && (
              <div className="layer-row-actions">
                <button className="icon-button subtle" disabled={index === 0} onClick={() => onMove(layer.id, -1)} aria-label="Move layer up"><ChevronUp size={14} /></button>
                <button className="icon-button subtle" disabled={index === layers.length - 1} onClick={() => onMove(layer.id, 1)} aria-label="Move layer down"><ChevronDown size={14} /></button>
                <button className="icon-button subtle" onClick={() => onDuplicate(layer.id)} aria-label="Duplicate layer"><Copy size={14} /></button>
                <button className="icon-button subtle danger" disabled={layers.length === 1} onClick={() => onDelete(layer.id)} aria-label="Delete layer"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {selected && (
        <div className="layer-compositing">
          <label className="field-label">Blend mode
            <select value={selected.blend} onChange={(event) => onPatch(selected.id, { blend: event.target.value as BlendMode })}>
              {BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode.replace('-', ' ')}</option>)}
            </select>
          </label>
          <RangeControl definition={{ key: 'opacity', label: 'Layer opacity', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(selected.opacity * 100)} onChange={(value) => onPatch(selected.id, { opacity: value / 100 })} />
        </div>
      )}
      <div className="panel-spacer" />
      <p className="microcopy">Top layers composite over lower layers. Select a layer to reveal its instrument panel.</p>
    </div>
  )
}
