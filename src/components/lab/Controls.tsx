import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, FolderPlus, Minus, Pipette, Plus, Trash2, Type, Upload } from 'lucide-react'
import type { BlendMode, LabLayer, LayerGroup, PaletteGroup, ParamDefinition } from '../../types/lab'
import { BLEND_MODES, EFFECTS } from '../../types/lab'

export function RangeControl({ definition, value, onChange, disabled = false }: { definition: ParamDefinition; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const formatted = definition.step < 1 ? value.toFixed(2).replace(/0$/, '') : Math.round(value).toString()
  return (
    <label className="range-control">
      <span className="range-label"><span>{definition.label}</span><output>{formatted}{definition.unit ?? ''}</output></span>
      <input type="range" min={definition.min} max={definition.max} step={definition.step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${(value - definition.min) / (definition.max - definition.min) * 100}%` } as React.CSSProperties} />
    </label>
  )
}

type StyleLibraryProps = {
  onSelect: (effect: typeof EFFECTS[number]['id']) => void
  onUpload: () => void
  paletteGroups: PaletteGroup[]
  activePaletteGroup: string
  onActivatePaletteGroup: (id: string) => void
  onPaletteChange: (palette: string[]) => void
  onExtractPalette: () => void
}

export function StyleLibrary({ onSelect, onUpload, paletteGroups, activePaletteGroup, onActivatePaletteGroup, onPaletteChange, onExtractPalette }: StyleLibraryProps) {
  return (
    <div className="panel-inner style-library">
      <div className="panel-heading"><span>Transformation library</span><span className="count">{String(EFFECTS.length).padStart(2, '0')}</span></div>
      <p className="panel-intro">Apply a live system as a new independent layer.</p>
      <div className="style-list">
        {EFFECTS.map((effect) => (
          <button key={effect.id} className="style-item" onClick={() => onSelect(effect.id)} title={effect.description}>
            <span className="style-code">{effect.short}</span><span>{effect.name}</span><Plus size={14} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="palette-editor">
        <div className="palette-heading"><span>Color combination groups</span><small>{paletteGroups.length.toString().padStart(2, '0')}</small></div>
        <div className="palette-groups">
          {paletteGroups.map((group) => {
            const active = group.id === activePaletteGroup
            return <section key={group.id} className={`palette-group ${active ? 'active' : ''}`}>
              <button className="palette-group-toggle" onClick={() => onActivatePaletteGroup(group.id)} aria-expanded={active}>
                <span className="palette-group-strip">{group.colors.slice(0, 5).map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span>
                <strong>{group.name}</strong><small>{group.colors.length}</small><ChevronDown size={13} />
              </button>
              {active && <div className="palette-group-body">
                <div className="palette-count-row"><span>Active colors</span><div><button className="icon-button subtle" disabled={group.colors.length <= 2} onClick={() => onPaletteChange(group.colors.slice(0, -1))} aria-label="Remove palette color"><Minus size={13} /></button><output>{group.colors.length}</output><button className="icon-button subtle" disabled={group.colors.length >= 10} onClick={() => onPaletteChange([...group.colors, group.colors[group.colors.length - 1] ?? '#f4f1e8'])} aria-label="Add palette color"><Plus size={13} /></button></div></div>
                <div className="palette-swatches expanded">
                  {group.colors.map((color, index) => <label key={index} title={`Edit color ${index + 1}: ${color.toUpperCase()}`}><input type="color" value={color} onChange={(event) => onPaletteChange(group.colors.map((entry, colorIndex) => colorIndex === index ? event.target.value : entry))} /><span style={{ backgroundColor: color }} /><small>{index + 1}</small></label>)}
                </div>
                <button className="text-action palette-extract" onClick={onExtractPalette}><Pipette size={13} /> Extract into active group</button>
              </div>}
            </section>
          })}
        </div>
      </div>
      <div className="panel-spacer" />
      <button className="secondary-action full-width" onClick={onUpload}><Upload size={15} /> Load image for selected layer</button>
      <p className="microcopy">Paste a screenshot anywhere for a new image layer. PNG, JPG, WEBP, GIF, and clipboard pixels stay local.</p>
    </div>
  )
}

type LayersPanelProps = {
  layers: LabLayer[]
  groups: LayerGroup[]
  selectedId: string
  onSelect: (id: string) => void
  onAddEffect: () => void
  onAddText: () => void
  onAddGroup: () => void
  onPatchGroup: (id: string, patch: Partial<LayerGroup>) => void
  onDeleteGroup: (id: string) => void
  onPatch: (id: string, patch: Partial<LabLayer>) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function LayersPanel({ layers, groups, selectedId, onSelect, onAddEffect, onAddText, onAddGroup, onPatchGroup, onDeleteGroup, onPatch, onDuplicate, onDelete, onMove }: LayersPanelProps) {
  const selected = layers.find((layer) => layer.id === selectedId)
  const renderedGroups = new Set<string>()
  const groupHeader = (group: LayerGroup) => <div className="layer-group-row" key={`group-${group.id}`}>
    <button className="icon-button subtle" onClick={() => onPatchGroup(group.id, { collapsed: !group.collapsed })} aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name}`}>{group.collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}</button>
    <input value={group.name} onChange={(event) => onPatchGroup(group.id, { name: event.target.value })} aria-label="Group name" />
    <button className="icon-button subtle" onClick={() => onPatchGroup(group.id, { visible: !group.visible })} aria-label={`${group.visible ? 'Hide' : 'Show'} ${group.name}`}>{group.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
    <button className="icon-button subtle danger" onClick={() => onDeleteGroup(group.id)} aria-label={`Ungroup ${group.name}`}><Trash2 size={13} /></button>
  </div>
  return (
    <div className="panel-inner layers-panel">
      <div className="panel-heading"><span>Composition layers</span><span className="count">{String(layers.length).padStart(2, '0')}</span></div>
      <div className="layer-add-row three">
        <button className="secondary-action" onClick={onAddEffect}><Plus size={14} /> Effect</button>
        <button className="secondary-action" onClick={onAddText}><Type size={14} /> Text</button>
        <button className="secondary-action" onClick={onAddGroup}><FolderPlus size={14} /> Group</button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => {
          const group = groups.find((item) => item.id === layer.groupId)
          const showGroup = group && !renderedGroups.has(group.id)
          if (group) renderedGroups.add(group.id)
          return <div key={layer.id}>
            {showGroup && group && groupHeader(group)}
            {!group?.collapsed && <div className={`layer-row ${selectedId === layer.id ? 'selected' : ''} ${group ? 'grouped' : ''}`}>
              <button className="layer-select" onClick={() => onSelect(layer.id)}><span className="layer-thumb">{layer.kind === 'text' ? <Type size={15} /> : EFFECTS.find((effect) => effect.id === layer.effect)?.short}</span><span className="layer-name">{layer.name}<small>{layer.kind === 'text' ? layer.font : `${layer.effect} · ${layer.seedName}`}</small></span></button>
              <button className="icon-button subtle" onClick={() => onPatch(layer.id, { visible: !layer.visible })} aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
              {selectedId === layer.id && <div className="layer-row-actions"><button className="icon-button subtle" disabled={index === 0} onClick={() => onMove(layer.id, -1)} aria-label="Move layer up"><ChevronUp size={14} /></button><button className="icon-button subtle" disabled={index === layers.length - 1} onClick={() => onMove(layer.id, 1)} aria-label="Move layer down"><ChevronDown size={14} /></button><button className="icon-button subtle" onClick={() => onDuplicate(layer.id)} aria-label="Duplicate layer"><Copy size={14} /></button><button className="icon-button subtle danger" disabled={layers.length === 1} onClick={() => onDelete(layer.id)} aria-label="Delete layer"><Trash2 size={14} /></button></div>}
            </div>}
          </div>
        })}
        {groups.filter((group) => !renderedGroups.has(group.id)).map(groupHeader)}
      </div>
      {selected && <div className="layer-compositing">
        <label className="field-label">Layer group<select value={selected.groupId ?? ''} onChange={(event) => onPatch(selected.id, { groupId: event.target.value || undefined })}><option value="">Ungrouped</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label className="field-label">Blend mode<select value={selected.blend} onChange={(event) => onPatch(selected.id, { blend: event.target.value as BlendMode })}>{BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode.replace('-', ' ')}</option>)}</select></label>
        <RangeControl definition={{ key: 'opacity', label: 'Layer alpha', min: 0, max: 100, step: 1, unit: '%' }} value={Math.round(selected.opacity * 100)} onChange={(value) => onPatch(selected.id, { opacity: value / 100 })} />
      </div>}
      <div className="panel-spacer" />
      <p className="microcopy">Top layers composite over lower layers. Groups control visibility and organization; every duplicate owns independent geometry, masks, paths, and settings.</p>
    </div>
  )
}
