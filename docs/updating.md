# Actualizar el repositorio

El vault sigue creciendo durante 2º. Un único script pone el repositorio al día.

## Requisitos

- Windows + PowerShell 7 (el script también funciona en Windows PowerShell 5.1)
- Node.js 18+
- Solo para el vídeo: `npm install`, ffmpeg en el `PATH`, Python (servidor web local) y Google Chrome (o `CHROME_PATH`)

## Flujo de trabajo

```powershell
# 1. Regenerate the graph in the vault, sync vault-tools/ and rebuild index.html
.\scripts\update-from-vault.ps1

# 2. Review the diff
git diff --stat

# 3. Optionally re-record the video and publish
.\scripts\update-from-vault.ps1 -Video -Push
```

`-VaultPath` tiene como valor por defecto `%USERPROFILE%\Desktop\FP ASIR`; pasa otra ruta si el vault cambia de ubicación.

## Pasos manuales

```bash
node "<vault>/Sistema/Grafo/generar-grafo.mjs"      # regenerate grafo-data.js inside the vault
node scripts/build-public.mjs --vault "<vault>"     # sanitized index.html
python -m http.server 8765                          # serve the repo
node scripts/record-video.cjs 10                    # 10-second video → assets/video/
```

Después de actualizar el vídeo, regenera la vista previa del README:

```bash
ffmpeg -y -i assets/video/asir-knowledge-graph-3d-demo.mp4 -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" assets/img/graph-preview.gif
```

Recuerda actualizar la tabla *Estado actual* del README con las cifras que muestra el generador.
