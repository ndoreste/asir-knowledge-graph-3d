#!/usr/bin/env node
/*
 * generar-grafo.mjs — mantenimiento de la bóveda FP ASIR.
 *
 * 1. Recorre todas las notas .md (salvo .obsidian/, Sistema/ y CLAUDE.md).
 * 2. Lee el frontmatter y los [[wikilinks]] (alias, anclas y embeds incluidos).
 * 3. Rellena la sección "Aparece en" de cada concepto (marcador AUTO) a partir
 *    de sus backlinks. Solo reescribe la nota si el contenido cambia.
 * 4. Genera grafo-data.js (window.GRAFO_DATA) para grafo-asir.html.
 * 5. Informa de huérfanas, enlaces faltantes y adjuntos rotos.
 *
 * Uso:  node "Sistema/Grafo/generar-grafo.mjs"                 (desde cualquier carpeta)
 *       node "Sistema/Grafo/generar-grafo.mjs" --sin-escribir  (no toca las notas de concepto)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT = join(HERE, "..", "..");
const OUT = join(HERE, "grafo-data.js");
const WRITE_CONCEPTS = !process.argv.includes("--sin-escribir");
const AUTO_MARK = "<!-- AUTO:aparece-en -->";
const SKIP_DIRS = new Set([".obsidian", ".git", ".trash", "node_modules"]);
// Notas de sistema: se resuelven al enlazarlas (no son "faltantes"), pero no entran en el grafo.
const isHidden = (rel) => rel.startsWith("Sistema/") || rel === "CLAUDE.md";

/* ------------------------------------------------------------ recorrido */

function walk(dir, mdFiles, allFiles) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, mdFiles, allFiles);
      continue;
    }
    allFiles.push(full);
    if (extname(entry.name).toLowerCase() === ".md") {
      mdFiles.push(full);
    }
  }
}

const toPosix = (p) => p.split(sep).join("/");
const norm = (s) => s.normalize("NFC").trim().toLowerCase();

/* --------------------------------------------------------------- parseo */

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-zÀ-ÿ_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, "").trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    fm[kv[1]] = v;
  }
  return fm;
}

// Quita bloques de código y código en línea para no leer enlaces de ejemplo.
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

const LINK_RE = /(!?)\[\[([^\]|#^\n]+)(?:[#^][^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/g;

function extractLinks(text) {
  const out = [];
  const body = stripCode(text);
  // En tablas el alias va escapado ([[Nota\|alias]]): la barra invertida no es parte del nombre.
  for (const m of body.matchAll(LINK_RE)) out.push({ embed: m[1] === "!", target: m[2].trim().replace(/\\$/, "") });
  return out;
}

/* ------------------------------------------------------- clasificación */

function kindOf(rel, fm, name) {
  const tipo = typeof fm.tipo === "string" ? fm.tipo.toLowerCase() : "";
  if (name === "HOME - FP ASIR") return "hub";
  if (tipo === "moc" || rel.startsWith("MOC/")) return "moc";
  if (tipo === "concepto" || rel.startsWith("Conceptos/")) return "concepto";
  if (tipo === "ud") return "ud";
  if (tipo === "ficha" || name.startsWith("Ficha - ")) return "ficha";
  if (tipo === "practica" || tipo === "proyecto" || /Proyecto Intermodular|PACKET TRACER|RAID5|Ejercicios|EJERCICIOS/i.test(rel)) {
    return "practica";
  }
  return "nota";
}

function courseOf(rel, fm) {
  if (rel.startsWith("1º ASIR/")) return "1";
  if (rel.startsWith("2º ASIR/")) return "2";
  const c = typeof fm.curso === "string" ? fm.curso : "";
  if (c.startsWith("1")) return "1";
  if (c.startsWith("2")) return "2";
  return "";
}

/* ----------------------------------------------------------------- main */

const mdFiles = [];
const allFiles = [];
walk(VAULT, mdFiles, allFiles);

// Índices de resolución: nombre de nota → nota; ruta sin extensión → nota; adjuntos.
const notesByName = new Map();
const notesByPath = new Map();
const attachByName = new Set(allFiles.map((f) => norm(basename(f))));
const attachByPath = new Set(allFiles.map((f) => norm(toPosix(relative(VAULT, f)))));
const duplicates = [];

const allNotes = mdFiles.map((full) => {
  const rel = toPosix(relative(VAULT, full));
  const name = basename(full, ".md");
  const text = readFileSync(full, "utf8");
  const fm = parseFrontmatter(text);
  const note = { full, rel, name, text, fm, hidden: isHidden(rel), kind: kindOf(rel, fm, name), course: courseOf(rel, fm) };
  const key = norm(name);
  if (notesByName.has(key)) duplicates.push(rel);
  else notesByName.set(key, note);
  notesByPath.set(norm(rel.replace(/\.md$/i, "")), note);
  return note;
});
const notes = allNotes.filter((n) => !n.hidden);
const repeatedNames = new Set(duplicates.map((rel) => norm(basename(rel, ".md"))));

function resolve(target) {
  const t = norm(target.replace(/\.md$/i, ""));
  if (t.includes("/")) {
    if (notesByPath.has(t)) return notesByPath.get(t);
    for (const [p, n] of notesByPath) if (p.endsWith("/" + t)) return n;
    return null;
  }
  return notesByName.get(t) ?? null;
}

// Solo extensiones reales de adjunto: "Enlace troncal 802.1Q" es una nota, no un archivo ".1q".
const ATTACHMENT_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".jfif", ".webp", ".gif", ".svg", ".bmp", ".mp4", ".webm", ".mp3",
  ".docx", ".doc", ".xlsx", ".pptx", ".txt", ".csv", ".json", ".xml", ".xsl", ".dtd", ".html", ".css",
  ".js", ".sql", ".sh", ".pkt", ".drawio", ".zip", ".canvas",
]);
const isAttachment = (target) => ATTACHMENT_EXT.has(extname(target).toLowerCase());

const edges = new Map(); // "a|b" → {source, target}
const missing = new Map(); // nombre normalizado → {name, from:Set}
const brokenAttachments = [];
const backlinks = new Map(); // rel → Set(rel)

for (const n of notes) {
  for (const { target } of extractLinks(n.text)) {
    if (isAttachment(target)) {
      const t = norm(target);
      if (!attachByName.has(t.split("/").pop()) && !attachByPath.has(t)) {
        brokenAttachments.push(`${n.rel} → ${target}`);
      }
      continue;
    }
    const dest = resolve(target);
    if (!dest) {
      const key = norm(target);
      if (!missing.has(key)) missing.set(key, { name: target, from: new Set() });
      missing.get(key).from.add(n.rel);
      continue;
    }
    if (dest === n || dest.hidden) continue;
    const [a, b] = [n.rel, dest.rel].sort();
    edges.set(`${a}|${b}`, { source: a, target: b });
    if (!backlinks.has(dest.rel)) backlinks.set(dest.rel, new Set());
    backlinks.get(dest.rel).add(n.rel);
  }
}

/* --------------------------------------------- "Aparece en" automático */

const byRel = new Map(notes.map((n) => [n.rel, n]));
let conceptsUpdated = 0;

function apareceEn(concept) {
  const refs = [...(backlinks.get(concept.rel) ?? [])]
    .map((r) => byRel.get(r))
    .filter((n) => n && n.kind !== "moc" && n.kind !== "hub" && n.kind !== "concepto");
  const groups = { "1": [], "2": [], "": [] };
  for (const n of refs) groups[n.course].push(n);
  const label = { "1": "**1º ASIR**", "2": "**2º ASIR**", "": "**Otras**" };
  // Nombres repetidos (README, ENTREGA_COMPLETA…) se enlazan por ruta con alias "carpeta/nombre".
  const linkTo = (n) => {
    if (!repeatedNames.has(norm(n.name))) return { key: n.name, md: `[[${n.name}]]` };
    const parts = n.rel.replace(/\.md$/i, "").split("/");
    const alias = parts.slice(-2).join("/");
    return { key: alias, md: `[[${parts.join("/")}|${alias}]]` };
  };
  const lines = [];
  for (const c of ["1", "2", ""]) {
    if (!groups[c].length) continue;
    const list = groups[c].map(linkTo).sort((a, b) => a.key.localeCompare(b.key, "es")).map((x) => x.md).join(" · ");
    lines.push(`- ${label[c]}: ${list}`);
  }
  return lines.length ? lines.join("\n") : "- (todavía sin notas que lo enlacen)";
}

for (const n of notes) {
  if (n.kind !== "concepto" || !n.text.includes(AUTO_MARK)) continue;
  const i = n.text.indexOf(AUTO_MARK) + AUTO_MARK.length;
  const rest = n.text.slice(i);
  const nextHeading = rest.search(/\n## /);
  const tail = nextHeading >= 0 ? rest.slice(nextHeading) : "\n";
  const updated = `${n.text.slice(0, i)}\n${apareceEn(n)}\n${tail}`;
  if (updated !== n.text) {
    if (WRITE_CONCEPTS) writeFileSync(n.full, updated, "utf8");
    conceptsUpdated++;
  }
}
// "Aparece en" solo escribe backlinks ya contados: el grafo no cambia.

/* ----------------------------------- índice automático de MOC - Conceptos */

const INDEX_MARK = "<!-- AUTO:indice-conceptos -->";
const AREA_LABEL = {
  redes: "Redes",
  "bases-de-datos": "Bases de datos",
  web: "Lenguajes de marcas y web",
  hardware: "Hardware",
  sistemas: "Sistemas operativos",
  nube: "Nube",
  seguridad: "Seguridad",
  sostenibilidad: "Sostenibilidad",
  empleabilidad: "Empleabilidad",
};

function conceptIndex() {
  const groups = new Map();
  for (const n of notes) {
    if (n.kind !== "concepto") continue;
    const area = typeof n.fm.area === "string" && n.fm.area ? n.fm.area : "otros";
    // Mismo criterio que "Aparece en": solo notas de contenido (ni MOC, ni hub, ni otros conceptos).
    const uses = [...(backlinks.get(n.rel) ?? [])].filter((r) => {
      const k = byRel.get(r)?.kind;
      return k && k !== "concepto" && k !== "moc" && k !== "hub";
    }).length;
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push({ name: n.name, uses });
  }
  const order = [...Object.keys(AREA_LABEL), "otros"];
  const out = [];
  for (const area of order) {
    const list = groups.get(area);
    if (!list) continue;
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    out.push(`### ${AREA_LABEL[area] ?? "Otros"} (${list.length})`);
    out.push(list.map((c) => `[[${c.name}]] (${c.uses})`).join(" · "));
    out.push("");
  }
  return out.join("\n");
}

const mocConceptos = notes.find((n) => n.name === "MOC - Conceptos");
let indexUpdated = false;
if (mocConceptos && mocConceptos.text.includes(INDEX_MARK)) {
  const i = mocConceptos.text.indexOf(INDEX_MARK) + INDEX_MARK.length;
  const rest = mocConceptos.text.slice(i);
  const next = rest.search(/\n## /);
  const tail = next >= 0 ? rest.slice(next) : "\n";
  const updated = `${mocConceptos.text.slice(0, i)}\n${conceptIndex()}${tail}`;
  if (updated !== mocConceptos.text) {
    if (WRITE_CONCEPTS) writeFileSync(mocConceptos.full, updated, "utf8");
    indexUpdated = true;
  }
}

/* ------------------------------------------------------ salida del grafo */

const degree = new Map(notes.map((n) => [n.rel, 0]));
for (const e of edges.values()) {
  degree.set(e.source, degree.get(e.source) + 1);
  degree.set(e.target, degree.get(e.target) + 1);
}

// MOC ancla de una nota: el último MOC enlazado (el "Volver a [[MOC…]]" del final).
function anchorMocOf(n) {
  let last = null;
  for (const { target } of extractLinks(n.text)) {
    const d = resolve(target);
    if (d && !d.hidden && d.kind === "moc" && d !== n) last = d.rel;
  }
  return last;
}

function preview(text) {
  const body = text.replace(/^---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, "");
  const summary = /\[!summary\][^\n]*\n((?:>.*\n?)+)/.exec(body);
  const def = /\*\*Definición\*\*:?\s*([^\n]+)/.exec(body);
  const raw = summary ? summary[1].replace(/^>\s?/gm, "") : def ? def[1] : body.replace(/^#.*$/gm, "");
  return raw
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
    .replace(/[*_>#`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

const nodes = notes.map((n) => ({
  id: n.rel,
  name: n.name,
  kind: n.kind,
  course: n.course,
  degree: degree.get(n.rel),
  orphan: degree.get(n.rel) === 0,
  anchor: n.kind === "moc" || n.kind === "hub" ? null : anchorMocOf(n),
  preview: preview(n.text),
}));

for (const [key, m] of missing) {
  const id = `faltante:${key}`;
  nodes.push({
    id, name: m.name, kind: "faltante", course: "", degree: m.from.size, orphan: false, anchor: null,
    preview: `Enlazada desde ${m.from.size} nota(s), pero la nota no existe todavía.`,
  });
  for (const from of m.from) edges.set(`${from}|${id}`, { source: from, target: id });
}

// Cursos de cada nodo: el suyo o, si es transversal (conceptos, MOC generales), los de sus vecinos.
const nodeById = new Map(nodes.map((n) => [n.id, n]));
const courseSets = new Map(nodes.map((n) => [n.id, new Set(n.course ? [n.course] : [])]));
for (const e of edges.values()) {
  const a = nodeById.get(e.source);
  const b = nodeById.get(e.target);
  if (!a || !b) continue;
  if (!a.course && b.course) courseSets.get(a.id).add(b.course);
  if (!b.course && a.course) courseSets.get(b.id).add(a.course);
}
for (const n of nodes) n.courses = [...courseSets.get(n.id)];

const links = [...edges.values()];
const orphans = nodes.filter((n) => n.orphan);
const stats = {
  notas: notes.length,
  enlaces: links.length,
  conceptos: notes.filter((n) => n.kind === "concepto").length,
  uds: notes.filter((n) => n.kind === "ud").length,
  huerfanas: orphans.length,
  faltantes: missing.size,
  generado: new Date().toISOString().slice(0, 16).replace("T", " "),
};

const dataJs = `// Generado por generar-grafo.mjs — no editar a mano.\nwindow.GRAFO_DATA = ${JSON.stringify({ stats, nodes, links })};\n`;
writeFileSync(OUT, dataJs, "utf8");

// Versión autocontenida (datos dentro del HTML): es la que se incrusta en Obsidian,
// donde el iframe no puede cargar un segundo archivo, y la más fácil de compartir.
const TEMPLATE = join(HERE, "grafo-asir.html");
const STANDALONE = join(HERE, "grafo-completo.html");
const template = readFileSync(TEMPLATE, "utf8");
const scriptTag = '<script src="grafo-data.js"></script>';
if (template.includes(scriptTag)) {
  const inline = `<script>\n${dataJs.replace(/<\/script/gi, "<\\/script")}</script>`;
  writeFileSync(STANDALONE, template.replace(scriptTag, () => inline), "utf8");
} else {
  console.warn(`AVISO: ${scriptTag} no está en grafo-asir.html; no se genera grafo-completo.html`);
}

/* ---------------------------------------------------------------- informe */

console.log(`Notas: ${stats.notas} · Enlaces: ${stats.enlaces} · UDs: ${stats.uds} · Conceptos: ${stats.conceptos}`);
console.log(`Conceptos con "Aparece en" actualizado: ${conceptsUpdated}${WRITE_CONCEPTS ? "" : " (simulado)"}`);
console.log(`Índice de MOC - Conceptos: ${indexUpdated ? "actualizado" : "sin cambios"}${WRITE_CONCEPTS ? "" : " (simulado)"}`);
console.log(`Huérfanas: ${orphans.length}`);
orphans.forEach((n) => console.log(`  · ${n.id}`));
console.log(`Enlaces faltantes: ${missing.size}`);
[...missing.values()].forEach((m) => console.log(`  · [[${m.name}]] ← ${[...m.from].join(", ")}`));
console.log(`Adjuntos rotos: ${brokenAttachments.length}`);
brokenAttachments.forEach((b) => console.log(`  · ${b}`));
if (duplicates.length) {
  console.log(`Nombres de nota repetidos (enlázalos por ruta): ${duplicates.length}`);
  duplicates.forEach((d) => console.log(`  · ${d}`));
}
console.log(`Grafo escrito en ${toPosix(relative(VAULT, OUT))}`);
