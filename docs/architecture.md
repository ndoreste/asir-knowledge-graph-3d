# Arquitectura

El proyecto tiene tres etapas. Cada una es un único archivo sin dependencias en tiempo de ejecución, salvo el grabador de vídeo.

## 1. Generador del grafo — `vault-tools/generar-grafo.mjs`

Vive dentro del vault en `Sistema/Grafo/` y se ejecuta con `node "Sistema/Grafo/generar-grafo.mjs"`.

1. **Recorre** todos los archivos `.md` (omitiendo `.obsidian/`, `.git/`, `.trash/`, `node_modules/`). `Sistema/` y `CLAUDE.md` se resuelven como destinos de enlace, pero se ocultan en el grafo.
2. **Analiza** el frontmatter de tipo YAML (`tipo`, `curso`, `area`, `tags`…) y cada `[[wikilink]]`, incluidos alias (`[[Note|alias]]`), anclas (`[[Note#Heading]]`), referencias a bloques, embeds (`![[file.pdf]]`) y alias escapados dentro de tablas. Primero se eliminan los bloques de código para ignorar los enlaces de ejemplo.
3. **Clasifica** cada nota: `hub`, `moc`, `concepto`, `ud`, `ficha`, `practica` o `nota`, y le asigna un curso (1º / 2º) según su carpeta o su frontmatter.
4. **Resuelve** los enlaces por nombre de nota o por ruta; los adjuntos reales se detectan por extensión, de modo que `Enlace troncal 802.1Q` se trata como una nota y no como un archivo `.1q`.
5. **Escribe de vuelta** el contenido autogenerado, solo cuando cambia:
   - La sección *Aparece en* de cada concepto, agrupada por curso, entre los marcadores `<!-- AUTO:aparece-en -->`.
   - El índice de conceptos en `MOC - Conceptos`, agrupado por área con recuento de usos.
6. **Genera** `grafo-data.js` (`window.GRAFO_DATA = { stats, nodes, links }`) y `grafo-completo.html` (visor + datos incrustados, embebible en un iframe de Obsidian).
7. **Informa** de huérfanas, notas inexistentes, adjuntos rotos y nombres de nota duplicados.

Ejecútalo con `--sin-escribir` para hacer una prueba en seco que nunca modifica las notas.

### Modelo de datos

```js
{
  stats: { notas, enlaces, conceptos, uds, huerfanas, faltantes, generado: "YYYY-MM-DD HH:mm" },
  nodes: [{ id: "1º ASIR/Redes/Unidades/REDES UD01 - ….md", name, kind, course, courses: ["1"],
            degree, orphan, anchor: "MOC/MOC - Redes.md", preview: "first ~260 chars of the summary" }],
  links: [{ source: "<node id>", target: "<node id>" }]
}
```

Las notas inexistentes se convierten en nodos rosas `faltante:` para que los huecos de la base de conocimiento sean visibles.

## 2. Visor 3D — `vault-tools/grafo-asir.html`

Un único archivo HTML, de unas ~500 líneas, que solo usa la **API Canvas 2D**:

- Layout determinista: los nodos se colocan con un hash con semilla de su id, así que el grafo se ve igual en cada carga.
- Proyección en perspectiva escrita a mano, órbita de guiñada/inclinación, zoom con la rueda, giro automático y soporte de `prefers-reduced-motion`.
- Hit-testing para hover/clic, un panel de detalle con el resumen de la nota, búsqueda, filtros por curso (1º / 2º / conceptos) y conmutadores para etiquetas y enlaces.
- El estilo sigue la paleta dorado sobre negro «JARVIS» que comparto con mis otros proyectos.

## 3. Build público — `scripts/build-public.mjs`

Lee `grafo-data.js`, sanea la vista previa de cada nodo, inyecta los datos en la plantilla del visor y escribe `index.html`. Consulta [privacy.md](privacy.md).

## 4. Vídeo — `scripts/record-video.cjs`

La captura de pantalla en tiempo real pierde fotogramas, así que el grabador controla la página en su lugar:

1. Abre `index.html` en Chromium headless a 1920×1080.
2. Oculta el cursor y los tooltips, y desactiva el giro integrado.
3. Para cada uno de los 600 fotogramas (10 s × 60 fps) toma una captura de pantalla y después avanza la cámara mediante eventos sintéticos de puntero/rueda a lo largo de una trayectoria programada (arriba → frente → abajo → arriba, con un zoom de acercamiento/alejamiento).
4. Codifica la secuencia PNG con ffmpeg (H.264 a dos pasadas, ~7 Mbps → ~8 MB).
