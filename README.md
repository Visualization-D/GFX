# GFX_Shift V2

**By Dr. Mohammad Lataifeh @ University of Sharjah**

A browser-based creative coding editor for transforming image seeds and typography into layered, interactive compositions. All image processing and recording happen locally in the browser.

## Run

```sh
npm install
npm run dev
```

Production build:

```sh
npm run build
npm run preview
```

## Included

- Nine generative canvas systems—Shape Field, Liquid Grid, Vector Flow, Sketchy Lines, RGB Displacement, Spray Explosion, Triangulator, Kinetic Type, and Sliced Word—plus direct Image layers for pasted or uploaded artwork.
- Fresh projects open with a customizable vector Shape Field on an A4 Portrait canvas (1240 × 1754). Shape families, rows, columns, size, jitter, aspect, rotation, fill, line width, animated line fluidity, motion, color, and geometry seed are editable; Randomize regenerates every shape.
- Shape Field supports mixed, round, angular, and linear families, random Arabic and English text objects, and up to ten uploaded PNG or SVG objects per layer. A text-entry area appears whenever text objects are selected.
- Vector Flow provides independent vector length, width, curvature, luminance depth, drift, and bias controls. Lines can be replaced by custom text tokens or uploaded PNG/SVG icons.
- Custom text and font selection for Kinetic Type and Sliced Word. Sliced Word draws vector-scaled glyphs at the final output resolution, with independent horizontal/vertical expansion, 10–400% text scaling, direct dragging, position controls, row shifts, deterministic cell jitter, quarter-turned cells, variation seeds, tracking, gaps, direction, drift, and chromatic echoes.
- Sliced Word also accepts user-drawn split vectors. Drag one or more paths directly across the canvas to orient clipping windows and control how the word separates; guides remain outside exports.
- Kinetic Type uses faster multi-frequency motion, spring elasticity, row scatter, twist, horizontal stretch, vertical pulse, and pointer-follow or mouse-drag force.
- Liquid Grid uses a clean high-contrast default seed, independent uploaded images, traveling waves, hover-following deformation, and stronger press-and-drag swirl interaction.
- Spray Explosion starts with one-pixel image-colored grains. Grain count, grain size, explosion force, motion, and pointer latency remain adjustable.
- RGB Displacement supports generated bands, circles, diamonds, and imported PNG/SVG shape masks. Red and cyan channels have independent X/Y controls, and the effect can cover the full canvas, a marquee, or a free-drawn closed path.
- Independent image sources for every effect layer. Upload or drag-and-drop assigns an image only to the selected layer; palette extraction uses that layer's image.
- Paste a copied web image or screenshot anywhere in the editor to create a new independent Image layer. Clipboard pixels are processed locally.
- Context-sensitive floating controls and pointer interaction.
- Direct on-canvas text positioning, multiline editing, 10–400% vector text scaling, alignment, line height, tracking, rotation, weight, and fill/outline controls. Scaling remains available after converting text to glyph outlines.
- Editable Delaunay meshes: click to add vertices, drag to reposition, and Alt-click or right-click to delete. Guides remain outside exports.
- Adjustable sketch line count, threshold, contour depth, stroke weight, hand jitter, angle, ink, and paper.
- Stacked, selectable palette groups with two to ten editable colors each. Only the active group expands and receives edits or k-means color extraction. Each effect can independently use seed, palette, or solid colors.
- Applying an effect always creates a separate layer. Effect and text layers support visibility, ordering, deep independent duplication, alpha, and 13 blend modes. Duplicated layers own independent parameters, meshes, split paths, selections, masks, text, shape data, and replaceable asset bindings.
- Named layer groups with renaming, collapse/expand, membership controls, ungrouping, and group-wide visibility.
- Painted alpha masks on every layer with adjustable brush size, erase/restore modes, and nondestructive stroke removal. Layer alpha is controlled separately in the Layers panel.
- Standard undo/redo shortcuts: Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, and Ctrl/Cmd+Y. Toolbar controls are also available, with compact history controls on mobile.
- Custom canvas dimensions up to 4096 × 4096.
- Device-font selection. In browsers supporting Local Font Access, text can be converted to real glyph outlines with OpenType.js.
- PNG export and layered PSD download. PSD files include named layer groups, separately rendered raster layers, group and layer visibility, opacity, supported Photoshop blend modes, painted masks, a composite preview, and the canvas background.
- Timed canvas recording. MP4 is used where MediaRecorder supports it; otherwise the app exports WebM and labels the format in the status bar.
- Browser-local project autosave. Uploaded seed pixels and custom PNG/SVG assets are session-only and are not persisted or uploaded.
- Installable PWA with automatic updates.

## GitHub Pages

A ready-to-use workflow is included at `.github/workflows/deploy-pages.yml`.

1. Push this project to a GitHub repository with `main` as the default branch.
2. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab.

Vite uses a relative asset base, so the same build works at a repository subpath without additional configuration.

## Browser notes

- Current Chrome or Edge provides the broadest support for local-font enumeration and outline conversion.
- Video codecs depend on the browser and operating system. Safari commonly supports MP4; Chromium commonly records WebM.
- Canvas size and particle count affect rendering performance. Reduce density when recording very large canvases.
- No server, account, API key, or external asset service is required.
