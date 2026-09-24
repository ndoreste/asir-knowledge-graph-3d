# Estructura del vault

El vault no es un archivo de PDFs, sino una red de conocimiento: cada unidad didáctica tiene una nota de resumen, y las notas se conectan mediante conceptos compartidos entre asignaturas y cursos.

## Carpetas

| Carpeta | Contenido | Notas |
|---|---|---:|
| `HOME - FP ASIR.md` | Punto de entrada (nodo hub del grafo) | 1 |
| `MOC/` | Maps of Content: uno por curso, uno por asignatura, más `MOC - Conceptos` | 16 |
| `Conceptos/` | Una idea por nota (RAID, DNS, normalización, LDAP…). El corazón del grafo | 191 |
| `1º ASIR/<Subject>/` | Ficha de la asignatura, `Unidades/` (notas de UD + PDFs) y prácticas | 101 |
| `2º ASIR/<Subject>/` | Misma estructura, que se completa durante el curso actual | 9 |
| `Biblioteca/` | Material de referencia | 1 |
| `Sistema/` | Guía de uso, registro de cambios, plantillas y `Grafo/` (las herramientas de este repo) | — |

### Asignaturas

**1º ASIR** — Bases de Datos · Hardware · Sistemas Operativos (ISO) · Empleabilidad (ITE) · Lenguajes de Marcas · Computación en la Nube (MPO) · Redes · Proyecto Intermodular

**2º ASIR** — Administración de Sistemas Operativos (ASO) · Arquitectura Cloud (MPO) · Sostenibilidad (SASP) · Servicios de Red e Internet (SRI)

## Tipos de nota

| Tipo | Nomenclatura | Contenido |
|---|---|---|
| **UD** | `SIGLA UDnn - Title` | Callout de resumen, puntos clave, comandos, preguntas de repaso, conceptos, unidad anterior/siguiente |
| **Concepto** | Nombre sin más | Definición, lo esencial, conceptos relacionados y una sección *Aparece en* autogenerada |
| **Ficha de asignatura** | `Ficha - Subject` | Horario, evaluación, enlaces y unidades de la asignatura |
| **MOC** | `MOC - Subject` | Mapa ordenado de todas las notas de una asignatura |
| **Práctica / proyecto** | Libre | Trabajo práctico, Packet Tracer, RAID, ejercicios |

Las plantillas de cada tipo están en [`vault-tools/templates/`](../vault-tools/templates).

## Reglas de enlazado

- Cada UD enlaza a sus conceptos y termina con `Volver a [[MOC - …]]`; ese último enlace al MOC se convierte en el *anchor* del nodo en el grafo.
- Los conceptos se enlazan entre sí bajo *Relacionado con*; la sección *Aparece en* la escribe el generador y no debe editarse a mano.
- El objetivo tras cada ejecución es cero huérfanas y cero enlaces faltantes.
