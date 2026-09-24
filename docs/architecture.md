# Architecture

The project has three stages. Each one is a single file with no runtime dependencies except the video recorder.

## 1. Graph generator — `vault-tools/generar-grafo.mjs`

Lives inside the vault at `Sistema/Grafo/` and is run with `node "Sistema/Grafo/generar-grafo.mjs"`.

1. **Walk** every `.md` file (skipping `.obsidian/`, `.git/`, `.trash/`, `node_modules/`). `Sistema/` and `CLAUDE.md` resolve as link targets but are hidden from the graph.
2. **Parse** YAML-like frontmatter (`tipo`, `curso`, `area`, `tags`…) and every `[[wikilink]]`, including aliases (`[[Note|alias]]`), anchors (`[[Note#Heading]]`), block refs, embeds (`![[file.pdf]]`) and escaped aliases inside tables. Code blocks are stripped first so example links are ignored.
3. **Classify** each note: `hub`, `moc`, `concepto`, `ud`, `ficha`, `practica` or `nota`, and assign a course (1º / 2º) from its folder or frontmatter.
4. **Resolve** links by note name or by path; real attachments are detected by extension, so `Enlace troncal 802.1Q` is treated as a note, not a `.1q` file.
5. **Write back** auto-generated content, only when it changes:
   - The *Aparece en* (“appears in”) section of every concept, grouped by course, between `<!-- AUTO:aparece-en -->` markers.
   - The concept index in `MOC - Conceptos`, grouped by area with usage counts.
6. **Emit** `grafo-data.js` (`window.GRAFO_DATA = { stats, nodes, links }`) and `grafo-completo.html` (viewer + data inlined, embeddable in an Obsidian iframe).
7. **Report** orphans, missing notes, broken attachments and duplicated note names.

Run with `--sin-escribir` for a dry run that never touches the notes.

### Data model

```js
{
  stats: { notas, enlaces, conceptos, uds, huerfanas, faltantes, generado: "YYYY-MM-DD HH:mm" },
  nodes: [{ id: "1º ASIR/Redes/Unidades/REDES UD01 - ….md", name, kind, course, courses: ["1"],
            degree, orphan, anchor: "MOC/MOC - Redes.md", preview: "first ~260 chars of the summary" }],
  links: [{ source: "<node id>", target: "<node id>" }]
}
```

Missing notes become pink `faltante:` nodes so gaps in the knowledge base are visible.

## 2. 3D viewer — `vault-tools/grafo-asir.html`

A single HTML file, ~500 lines, using only the **Canvas 2D API**:

- Deterministic layout: nodes are placed with a seeded hash of their id, so the graph looks the same on every load.
- Hand-written perspective projection, yaw/tilt orbit, wheel zoom, auto-spin and `prefers-reduced-motion` support.
- Hit-testing for hover/click, a detail panel with the note summary, search, year filters (1º / 2º / concepts) and toggles for labels and links.
- Styling follows the “JARVIS” gold-on-black palette shared with my other projects.

## 3. Public build — `scripts/build-public.mjs`

Reads `grafo-data.js`, sanitizes every node preview, injects the data into the viewer template and writes `index.html`. See [privacy.md](privacy.md).

## 4. Video — `scripts/record-video.cjs`

Real-time screen capture drops frames, so the recorder drives the page instead:

1. Opens `index.html` in headless Chromium at 1920×1080.
2. Hides the cursor and tooltips, disables the built-in spin.
3. For each of the 600 frames (10 s × 60 fps) it takes a screenshot and then advances the camera by synthetic pointer/wheel events along a scripted path (top → front → bottom → top with a zoom in/out).
4. Encodes the PNG sequence with ffmpeg (two-pass H.264, ~7 Mbps → ~8 MB).
