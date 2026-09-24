#!/usr/bin/env node
/*
 * build-public.mjs — builds the public, self-contained graph (index.html) for GitHub Pages.
 *
 * Reads the graph data generated inside the vault (Sistema/Grafo/grafo-data.js), removes
 * anything personal from the node previews and writes index.html with the data inlined.
 *
 * Removed / replaced:
 *   - E-mail addresses                          → [correo]
 *   - Private platform links (school LMS, Kahoot, NotebookLM, Google Drive/Docs/Forms,
 *     Classroom, Teams, Meet)                   → [enlace privado]
 *   - Tracking params on public links (?si=, ?authuser=, utm_*)
 *   - Teacher names ("Profesor/a: Nombre Apellido") → [docente]
 *   - Class timetables ("Horario: ...")          → [horario omitido]
 *   - The "Abrir en Obsidian" button (only works on the author's machine)
 *
 * The build fails (exit 1) if any e-mail, private link or detected teacher name survives.
 *
 * Usage: node scripts/build-public.mjs [--vault "C:/path/to/vault"]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argVault = process.argv.indexOf("--vault");
const VAULT = argVault > -1 ? process.argv[argVault + 1] : join(homedir(), "Desktop", "FP ASIR");
const DATA_JS = join(VAULT, "Sistema", "Grafo", "grafo-data.js");
const TEMPLATE = join(ROOT, "vault-tools", "grafo-asir.html");
const OUT = join(ROOT, "index.html");

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const PRIVATE_URL =
  /https?:\/\/[^\s"'\\)\]<>]*(thepowermba|thepower\.education|kahoot|notebooklm\.google|drive\.google|docs\.google|forms\.gle|forms\.office|classroom\.google|teams\.microsoft|meet\.google)[^\s"'\\)\]<>]*/gi;
const TRACKING_PARAM = /([?&])(si|authuser|utm_[a-z]+)=[^&\s"'<>]*&?/gi;
const NAME_WORD = "[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñü.]*";
const TEACHER = new RegExp(
  `\\b(Profesor(?:\\/a|a)?|PROFESOR(?:A)?|Tutor(?:a)?|TUTOR(?:A)?|Docente)(\\s*:\\s*|\\s+)(${NAME_WORD}(?:\\s+${NAME_WORD}){0,4})`,
  "g",
);
// Hasta el siguiente separador " - ", "·" o "|" (los rangos 16:00-17:00 no cortan).
const TIMETABLE = /\bHorario:\s*(?:(?!\s-\s|·|\|)[^\n])+/gi;
const HIDE_OBSIDIAN = "<style>#po{display:none!important}</style>";
const SCRIPT_TAG = '<script src="grafo-data.js"></script>';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function loadGraph(file) {
  if (!existsSync(file)) fail(`no existe ${file}. Ejecuta antes generar-grafo.mjs en la bóveda o usa --vault.`);
  const src = readFileSync(file, "utf8");
  const json = src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1);
  try {
    return JSON.parse(json);
  } catch (e) {
    return fail(`grafo-data.js no contiene JSON válido (${e.message})`);
  }
}

function cleanUrl(url) {
  return url.replace(TRACKING_PARAM, "$1").replace(/[?&]$/, "");
}

function sanitizeText(text, teacherNames) {
  return text
    .replace(EMAIL, "[correo]")
    .replace(PRIVATE_URL, "[enlace privado]")
    .replace(/https?:\/\/[^\s"'\\)\]<>]+/g, cleanUrl)
    .replace(TEACHER, (_, label, sep, name) => {
      teacherNames.add(name.trim());
      return `${label}${sep}[docente]`;
    })
    .replace(TIMETABLE, "Horario: [horario omitido] ");
}

function sanitizeGraph(graph) {
  const teacherNames = new Set();
  const nodes = graph.nodes.map((n) => ({ ...n, preview: sanitizeText(n.preview ?? "", teacherNames) }));
  return { graph: { ...graph, nodes }, teacherNames };
}

function assertClean(html, teacherNames) {
  const leaks = [
    ...[...html.matchAll(EMAIL)].map((m) => m[0]),
    ...[...html.matchAll(PRIVATE_URL)].map((m) => m[0]),
    ...[...teacherNames].filter((name) => name.length > 3 && html.includes(name)),
  ];
  if (leaks.length) fail(`quedan ${leaks.length} datos privados: ${leaks.slice(0, 5).join(" | ")}`);
}

const { graph, teacherNames } = sanitizeGraph(loadGraph(DATA_JS));
const template = readFileSync(TEMPLATE, "utf8");
if (!template.includes(SCRIPT_TAG)) fail(`${SCRIPT_TAG} no está en ${TEMPLATE}`);

const dataJs = `window.GRAFO_DATA = ${JSON.stringify(graph)};\n`;
const inline = `<script>\n${dataJs.replace(/<\/script/gi, "<\\/script")}</script>`;
const html = template.replace(SCRIPT_TAG, () => inline).replace("</head>", `${HIDE_OBSIDIAN}</head>`);

assertClean(html, teacherNames);
writeFileSync(OUT, html, "utf8");
const s = graph.stats;
console.log(`index.html escrito · ${s.notas} notas · ${s.enlaces} enlaces · ${teacherNames.size} nombres de docentes ocultados`);
