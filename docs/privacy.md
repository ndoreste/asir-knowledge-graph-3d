# Privacy

The vault contains personal and third-party information that must never reach a public repository. The public build is designed to fail closed.

## What is published

- `index.html`: the viewer with the graph data inlined. Each node has a name, type, course, degree and a **sanitized** preview (~260 characters).
- The demo video and screenshots, which only show node titles and global statistics.
- The tools and empty templates.

## What is never published

- Raw notes, PDFs, attachments or course material.
- `.obsidian/` configuration and local absolute paths.
- The *Abrir en Obsidian* button (hidden: it only works on the author's machine).

## Sanitization rules (`scripts/build-public.mjs`)

| Data | Replacement |
|---|---|
| E-mail addresses | `[correo]` |
| School LMS, Kahoot, NotebookLM, Google Drive/Docs/Forms, Classroom, Teams, Meet links | `[enlace privado]` |
| Tracking parameters (`si`, `authuser`, `utm_*`) on public links | removed |
| `Profesor/a: Name Surname` (and variants) | `Profesor/a: [docente]` |
| `Horario: …` class timetables | `Horario: [horario omitido]` |

Sanitization happens on the **data** (each preview string) before it is injected into the HTML, not with regexes over the final page.

## Fail-closed check

After building, the script scans the final HTML again for e-mails, private links and every teacher name it detected. If anything is found it prints the leak and exits with code 1 **without writing** `index.html`, so `update-from-vault.ps1` stops before committing.

## Adding new rules

If a new kind of private data appears (for example a new platform), add its domain to `PRIVATE_URL` or a new pattern in `sanitizeText()` and run `node scripts/build-public.mjs` to verify.
