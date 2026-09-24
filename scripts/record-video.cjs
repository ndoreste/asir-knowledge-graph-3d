'use strict';
/*
 * record-video.cjs — renders the 3D graph frame by frame (no real-time capture → no stutter)
 * and encodes it with ffmpeg.
 *
 * Requirements: Node 18+, ffmpeg on PATH, `npm install` (playwright-core) and a Chromium build:
 *   - Google Chrome installed (used by default), or
 *   - CHROME_PATH pointing to any Chromium / chrome-headless-shell executable.
 *
 * Usage:
 *   python -m http.server 8765
 *   node scripts/record-video.cjs [seconds=10] [output=assets/video/asir-knowledge-graph-3d-demo.mp4]
 *
 * Env: GRAPH_URL (default http://localhost:8765/index.html), CHROME_PATH.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const URL = process.env.GRAPH_URL || 'http://localhost:8765/index.html';
const W = 1920, H = 1080, FPS = 60, LOOP = 10;             // whole camera path in 10 s
const SECONDS = Number(process.argv[2] || LOOP);
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'assets', 'video', 'asir-knowledge-graph-3d-demo.mp4'));
const FRAMES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-frames-'));

// Camera choreography over LOOP seconds: top → front → bottom → top, zoom in to x2.6 → out → start.
const YAW_RATE = Math.PI / LOOP;                             // half a turn per video: slow spin
const tiltAt = t => 0.3 + 0.9 * Math.cos(2 * Math.PI * t / LOOP);
const ZIN = Math.log(2.6), ZOUT = Math.log(1.8);
const logZoomAt = t => { const s = Math.sin(2 * Math.PI * t / LOOP); return s * (s > 0 ? ZIN : ZOUT); };
const INITIAL_TILT = 0.6;                                    // st.tilt value on page load

function launchOptions() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH, headless: true };
  return { channel: 'chrome', headless: true };
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Clean frame: no cursor, no floating labels, no built-in auto-spin.
  await page.addStyleTag({ content: 'canvas{cursor:none!important}.tip{display:none!important}.sub .hint{display:none!important}' });
  await page.evaluate(() => {
    const b = document.getElementById('bSpin');
    if (b && b.getAttribute('aria-pressed') === 'true') b.click();
    const cv = document.querySelector('canvas');
    window.__x = -5000; window.__y = -5000;                // pointer off-canvas: never hovers a node
    window.__ev = (type) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: window.__x, clientY: window.__y, bubbles: true, cancelable: true }));
    try { window.__ev('pointerdown'); } catch (e) { console.warn('pointerdown:', e.message); }
    window.__step = (dYaw, dTilt, dLogZoom) => {
      window.__x += dYaw / 0.004; window.__y += -dTilt / 0.003; window.__ev('pointermove');
      if (dLogZoom) {
        const r = cv.getBoundingClientRect();
        cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -dLogZoom / 0.0015, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
      }
      return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    };
  });

  // Pre-roll (not recorded): set the initial tilt of the choreography.
  await page.evaluate(([d]) => window.__step(0, d, 0), [tiltAt(0) - INITIAL_TILT]);

  const total = Math.round(SECONDS * FPS);
  for (let i = 0; i < total; i++) {
    const t0 = i / FPS, t1 = (i + 1) / FPS;
    await page.screenshot({ path: path.join(FRAMES_DIR, `f${String(i).padStart(5, '0')}.png`) });
    await page.evaluate(([a, b, c]) => window.__step(a, b, c), [YAW_RATE / FPS, tiltAt(t1) - tiltAt(t0), logZoomAt(t1) - logZoomAt(t0)]);
    if (i % FPS === 0) console.log(`frame ${i}/${total}`);
  }
  await browser.close();

  // Two-pass ~7 Mbps: 10 s ≈ 8 MB, small enough for GitHub, Discord and LinkedIn.
  const input = ['-framerate', String(FPS), '-i', path.join(FRAMES_DIR, 'f%05d.png')];
  const codec = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', '7M', '-maxrate', '7.5M', '-bufsize', '14M', '-pix_fmt', 'yuv420p'];
  const passlog = path.join(FRAMES_DIR, 'ffpass');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, ...codec, '-pass', '1', '-passlogfile', passlog, '-an', '-f', 'null', os.platform() === 'win32' ? 'NUL' : '/dev/null'], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, ...codec, '-pass', '2', '-passlogfile', passlog, '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  console.log('Video saved:', OUT);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
