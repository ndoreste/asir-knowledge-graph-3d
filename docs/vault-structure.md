# Vault structure

The vault is not a PDF archive but a knowledge network: each teaching unit has a summary note, and notes connect through concepts shared across subjects and years.

## Folders

| Folder | Content | Notes |
|---|---|---:|
| `HOME - FP ASIR.md` | Entry point (hub node of the graph) | 1 |
| `MOC/` | Maps of Content: one per year, one per subject, plus `MOC - Conceptos` | 16 |
| `Conceptos/` | One idea per note (RAID, DNS, normalization, LDAP…). The heart of the graph | 191 |
| `1º ASIR/<Subject>/` | Subject sheet, `Unidades/` (UD notes + PDFs) and labs | 101 |
| `2º ASIR/<Subject>/` | Same structure, filled in during the current year | 9 |
| `Biblioteca/` | Reference material | 1 |
| `Sistema/` | Usage guide, changelog, templates and `Grafo/` (tools in this repo) | — |

### Subjects

**1º ASIR** — Databases · Hardware · Operating Systems (ISO) · Employability (ITE) · Markup Languages · Cloud Computing (MPO) · Networks · Intermodular Project

**2º ASIR** — Operating Systems Administration (ASO) · Cloud Architecture (MPO) · Sustainability (SASP) · Network & Internet Services (SRI)

## Note types

| Type | Naming | Content |
|---|---|---|
| **UD** | `SIGLA UDnn - Title` | Summary callout, key points, commands, review questions, concepts, previous/next unit |
| **Concept** | Plain name | Definition, essentials, related concepts and an auto-generated *Aparece en* section |
| **Subject sheet** | `Ficha - Subject` | Schedule, evaluation, links and units of the subject |
| **MOC** | `MOC - Subject` | Ordered map of every note of a subject |
| **Lab / project** | Free | Practical work, Packet Tracer, RAID, exercises |

Templates for every type are in [`vault-tools/templates/`](../vault-tools/templates).

## Linking rules

- Every UD links to its concepts and ends with `Volver a [[MOC - …]]`; that last MOC link becomes the node's *anchor* in the graph.
- Concepts link to each other under *Relacionado con*; the *Aparece en* section is written by the generator and must not be edited by hand.
- Zero orphans and zero missing links is the target after each run.
