// Capture each skill loop (frames + offline audio) via headless Chrome/CDP and cut them
// back to back into one 1920x1080 video.
// usage: node render-video.mjs out.mp4 02-blizzard.html 03-meteor.html ...
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const [out, ...pages] = process.argv.slice(2);
const SKIP = 0.25; // trim the first bit of idle on each clip
const work = resolve('.render');
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'frames'), { recursive: true });

const base = join(homedir(), '.cache/puppeteer/chrome-headless-shell');
const ver = readdirSync(base)[0];
const plat = readdirSync(join(base, ver))[0];
const chrome = join(base, ver, plat, 'chrome-headless-shell');
const port = 9333;
const proc = spawn(chrome, ['--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, '--window-size=400,300', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
proc.stderr.on('data', d => { if (process.env.DEBUG) process.stderr.write(d); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(path, method) {
  for (let i = 0; i < 300; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: method || 'GET' }); return await r.json(); } catch { await sleep(100); }
  }
  throw new Error('chrome not reachable');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const ready = new Promise(r => { ws.onopen = r; });
  return {
    ready, close: () => ws.close(),
    send(method, params) { return new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }); },
    async eval(expr, awaitPromise) {
      const m = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: !!awaitPromise });
      if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 500));
      return m.result?.result?.value;
    },
  };
}

function wavPcm(buf) { // returns {fmt, data}
  let o = 12, fmt, data;
  while (o < buf.length) {
    const id = buf.toString('ascii', o, o + 4), sz = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = buf.subarray(o + 8, o + 8 + sz);
    if (id === 'data') data = buf.subarray(o + 8, o + 8 + sz);
    o += 8 + sz;
  }
  return { fmt, data };
}

let frameNo = 0; const pcm = []; let fmt;
try {
  await json('/json/version');
  for (const p of pages) {
    const target = await json('/json/new?about:blank', 'PUT');
    const c = cdp(target.webSocketDebuggerUrl); await c.ready;
    await c.send('Page.enable');
    await c.send('Page.navigate', { url: 'file://' + resolve(p) + '?capture' });
    for (let i = 0; i < 100 && (await c.eval('typeof CAP')) !== 'object'; i++) await sleep(100);
    const t0 = Date.now();
    const frames = await c.eval(`CAP.frames(${SKIP})`);
    for (const f of frames) writeFileSync(join(work, 'frames', String(frameNo++).padStart(5, '0') + '.png'), Buffer.from(f, 'base64'));
    const wav = Buffer.from(await c.eval('CAP.audio()', true), 'base64');
    const w = wavPcm(wav); fmt = w.fmt;
    // pad/trim audio to exactly the clip's frame count
    const need = Math.round(frames.length / 60 * 44100) * 4;
    const d = Buffer.alloc(need); w.data.copy(d, 0, 0, Math.min(need, w.data.length));
    pcm.push(d);
    console.log(`${p}: ${frames.length} frames (${(frames.length / 60).toFixed(2)}s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    c.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  }
} finally { proc.kill(); }

const data = Buffer.concat(pcm);
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); fmt.copy(hdr, 20, 0, 16); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
writeFileSync(join(work, 'audio.wav'), Buffer.concat([hdr, data]));

execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '60', '-i', join(work, 'frames/%05d.png'), '-i', join(work, 'audio.wav'),
  '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, `${(frameNo / 60).toFixed(2)}s`);
