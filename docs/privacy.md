# Privacidad

El vault contiene información personal y de terceros que nunca debe llegar a un repositorio público. El build público está diseñado para fallar de forma segura (fail closed).

## Qué se publica

- `index.html`: el visor con los datos del grafo incrustados. Cada nodo tiene nombre, tipo, curso, grado y una vista previa **saneada** (~260 caracteres).
- El vídeo de demostración y las capturas de pantalla, que solo muestran títulos de nodos y estadísticas globales.
- Las herramientas y las plantillas vacías.

## Qué no se publica nunca

- Notas originales, PDFs, adjuntos ni material del curso.
- La configuración de `.obsidian/` ni rutas absolutas locales.
- El botón *Abrir en Obsidian* (oculto: solo funciona en el equipo del autor).

## Reglas de saneamiento (`scripts/build-public.mjs`)

| Dato | Sustitución |
|---|---|
| Direcciones de correo electrónico | `[correo]` |
| Enlaces al LMS del centro, Kahoot, NotebookLM, Google Drive/Docs/Forms, Classroom, Teams, Meet | `[enlace privado]` |
| Parámetros de seguimiento (`si`, `authuser`, `utm_*`) en enlaces públicos | se eliminan |
| `Profesor/a: Name Surname` (y variantes) | `Profesor/a: [docente]` |
| Horarios de clase `Horario: …` | `Horario: [horario omitido]` |

El saneamiento se aplica sobre los **datos** (cada cadena de vista previa) antes de inyectarlos en el HTML, no con expresiones regulares sobre la página final.

## Comprobación fail-closed

Tras el build, el script vuelve a analizar el HTML final en busca de correos electrónicos, enlaces privados y cada nombre de docente que haya detectado. Si encuentra algo, muestra la filtración y termina con código 1 **sin escribir** `index.html`, de modo que `update-from-vault.ps1` se detiene antes de hacer commit.

## Añadir nuevas reglas

Si aparece un nuevo tipo de dato privado (por ejemplo, una plataforma nueva), añade su dominio a `PRIVATE_URL` o un nuevo patrón en `sanitizeText()` y ejecuta `node scripts/build-public.mjs` para verificarlo.
