# Updating the repository

The vault keeps growing during 2nd year. One script brings the repository up to date.

## Requirements

- Windows + PowerShell 7 (the script also works in Windows PowerShell 5.1)
- Node.js 18+
- For the video only: `npm install`, ffmpeg on `PATH`, Python (local web server) and Google Chrome (or `CHROME_PATH`)

## Workflow

```powershell
# 1. Regenerate the graph in the vault, sync vault-tools/ and rebuild index.html
.\scripts\update-from-vault.ps1

# 2. Review the diff
git diff --stat

# 3. Optionally re-record the video and publish
.\scripts\update-from-vault.ps1 -Video -Push
```

`-VaultPath` defaults to `%USERPROFILE%\Desktop\FP ASIR`; pass another path if the vault moves.

## Manual steps

```bash
node "<vault>/Sistema/Grafo/generar-grafo.mjs"      # regenerate grafo-data.js inside the vault
node scripts/build-public.mjs --vault "<vault>"     # sanitized index.html
python -m http.server 8765                          # serve the repo
node scripts/record-video.cjs 10                    # 10-second video → assets/video/
```

After a video update, regenerate the README preview:

```bash
ffmpeg -y -i assets/video/asir-knowledge-graph-3d-demo.mp4 -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" assets/img/graph-preview.gif
```

Remember to update the *Snapshot* table in the README with the numbers printed by the generator.
