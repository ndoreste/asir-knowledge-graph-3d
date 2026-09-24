# ASIR Knowledge Graph 3D

Interactive 3D knowledge graph of my FP ASIR (Network & Systems Administration) studies, built on top of an Obsidian vault with a custom Node.js pipeline and a zero-dependency Canvas renderer.

**[▶ Live demo](https://ndoreste.github.io/asir-knowledge-graph-3d/)** · **[🎬 Demo video (MP4)](assets/video/asir-knowledge-graph-3d-demo.mp4)**

[![3D knowledge graph rotating](assets/img/graph-preview.gif)](https://ndoreste.github.io/asir-knowledge-graph-3d/)

> Work in progress: the vault grows every week while I study 2nd year ASIR, and this repository is refreshed with a single script.

## Goal

Turn two years of course material into a **connected knowledge network** instead of a folder of PDFs:

- Every teaching unit (UD) gets a summary note.
- Units are linked through **concept notes** (RAID, DNS, normalization, LDAP…) that appear across subjects and across both years.
- A generator script keeps the backlinks, indexes and the graph data up to date automatically.
- The result is explorable as a 3D graph in the browser: rotate, zoom, filter by year and click any node to read its summary.

## Snapshot (2026-09-23)

| Notes | Links | Teaching units | Concepts | Orphans | Missing links |
|---:|---:|---:|---:|---:|---:|
| 319 | 2,856 | 57 | 191 | 0 | 0 |

## What this project demonstrates

- **Knowledge management design**: folder taxonomy, note types, templates and MOCs (Maps of Content) for a two-year curriculum.
- **Automation with Node.js**: a dependency-free script that parses Markdown frontmatter and `[[wikilinks]]`, resolves aliases/anchors/embeds, and writes auto-generated sections back into the notes.
- **Data quality checks**: orphan notes, broken links, missing notes and broken attachments are reported on every run.
- **Custom 3D rendering**: perspective projection, camera orbit, zoom, picking and filtering written by hand on the Canvas 2D API — no Three.js, no D3.
- **Privacy by design**: the public build strips e-mails, private platform links, teacher names and timetables, and **fails** if anything leaks.
- **Reproducible media**: the demo video is rendered frame by frame with Playwright + ffmpeg, so it is smooth and can be regenerated after each update.

## How it works

```text
Obsidian vault (Markdown)
        │
        ▼
vault-tools/generar-grafo.mjs ──► updates "Aparece en" backlinks + concept index inside the notes
        │                        └► grafo-data.js  { stats, nodes[], links[] }
        ▼
scripts/build-public.mjs ───────► sanitizes node previews ──► index.html (self-contained, GitHub Pages)
        │
        ▼
scripts/record-video.cjs ───────► Playwright renders 600 frames ──► ffmpeg ──► demo MP4
```

More detail in [docs/architecture.md](docs/architecture.md).

## Repository structure

```text
asir-knowledge-graph-3d/
├── README.md
├── index.html                  # Public 3D graph (sanitized, data inlined) — served by GitHub Pages
├── assets/
│   ├── img/
│   │   ├── graph-overview.png
│   │   └── graph-preview.gif
│   └── video/
│       └── asir-knowledge-graph-3d-demo.mp4
├── vault-tools/                # Files that live inside the vault (Sistema/Grafo)
│   ├── generar-grafo.mjs       # Parser + backlink writer + graph data generator
│   ├── grafo-asir.html         # 3D viewer template (Canvas 2D, no dependencies)
│   └── templates/              # Obsidian templates: UD, concept, subject sheet, MOC, class notes
├── scripts/
│   ├── build-public.mjs        # Sanitized public build → index.html
│   ├── record-video.cjs        # Frame-by-frame video recorder (Playwright + ffmpeg)
│   └── update-from-vault.ps1   # One-command refresh from the vault
├── docs/
│   ├── architecture.md
│   ├── vault-structure.md
│   ├── privacy.md
│   └── updating.md
├── package.json
├── LICENSE
└── .gitignore
```

## Graph legend

| Color | Node type |
|---|---|
| 🟢 Green | Hub / concept |
| ⚪ Cream | MOC (map of content) |
| 🟡 Gold | Teaching unit (UD) |
| 🔵 Blue | Subject sheet |
| 🟣 Violet | Lab / project |
| 🟠 Orange | Orphan note |
| 🩷 Pink | Missing note (linked but not written yet) |

## Run it locally

```bash
git clone https://github.com/ndoreste/asir-knowledge-graph-3d.git
cd asir-knowledge-graph-3d
python -m http.server 8765
# open http://localhost:8765
```

`index.html` is fully self-contained, so it also works by double-clicking it.

## Updating as the course progresses

```powershell
.\scripts\update-from-vault.ps1              # regenerate graph + sanitized index.html
.\scripts\update-from-vault.ps1 -Video -Push # also re-record the video, commit and push
```

See [docs/updating.md](docs/updating.md).

## Tech stack

- **Obsidian** (Markdown vault, frontmatter, wikilinks, templates)
- **Node.js** (ES modules, no runtime dependencies)
- **HTML / CSS / JavaScript** with the Canvas 2D API
- **Playwright** (headless Chromium) + **ffmpeg** for the video
- **PowerShell** for the update workflow
- **GitHub Pages** for hosting

## Security & privacy policy

This repository never includes:

- The raw vault notes, PDFs or course material.
- E-mail addresses, private LMS / Kahoot / NotebookLM / Google Drive links.
- Teacher names or class timetables.
- Local paths, credentials or `.obsidian/` configuration.

Details in [docs/privacy.md](docs/privacy.md).

## Status

Active — 1st year complete, 2nd year in progress (2026-2027).

## License

MIT — see [LICENSE](LICENSE).
