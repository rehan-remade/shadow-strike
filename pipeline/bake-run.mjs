// Build bake.html (prototype engine + Avenger skill + RPG art/audio bakers), run it in headless Chrome over CDP and
// write sprite sheets, atlas.json and WAVs into the Unity project's Resources folder.
// usage: node pipeline/bake-run.mjs [outDir]   (default: unity/Assets/Resources)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const here = import.meta.dirname;
const dest = process.argv[2] || resolve(here, '../unity/Assets/Resources');
const root = resolve(here, '../prototype');
const html = readFileSync(join(root, 'src/shell.html'), 'utf8')
  .replace('%%TITLE%%', 'bake')
  .replace('%%ENGINE%%', () => readFileSync(join(root, 'src/engine.js'), 'utf8'))
  .replace('%%SKILL%%', () => readFileSync(join(root, 'src/skills/05-avenger.js'), 'utf8') + '\n' + ['rpg-art.js', 'rpg-audio.js'].filter(f => existsSync(join(here, f))).map(f => readFileSync(join(here, f), 'utf8')).join('\n') + '\n' + readFileSync(join(here, 'bake.js'), 'utf8'))
  .replace('boot();', 'boot();\n');
const page = join(here, 'bake.html');
writeFileSync(page, html);

const base = join(homedir(), '.cache/puppeteer/chrome-headless-shell'), ver = readdirSync(base)[0], plat = readdirSync(join(base, ver))[0];
const port = 9334;
const proc = spawn(join(base, ver, plat, 'chrome-headless-shell'), ['--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function j(path, method) { for (let i = 0; i < 300; i++) { try { return await (await fetch(`http://127.0.0.1:${port}${path}`, { method })).json(); } catch { await sleep(100); } } throw new Error('no chrome'); }
try {
  const t = await j('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(), logs = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 600)); };
  const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'file://' + page + '?capture' });
  let ok = false;
  for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: 'typeof BAKE', returnByValue: true }); if (r.result?.result?.value === 'function') { ok = true; break; } await sleep(100); }
  if (!ok) throw new Error('BAKE not defined\n' + logs.join('\n'));
  const r = await send('Runtime.evaluate', { expression: 'BAKE()', awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800));
  const out = r.result.result.value;
  mkdirSync(join(dest, 'Art'), { recursive: true }); mkdirSync(join(dest, 'Audio'), { recursive: true });
  for (const [k, b64] of Object.entries(out.images)) writeFileSync(join(dest, 'Art', k + '.png'), Buffer.from(b64, 'base64'));
  for (const [k, b64] of Object.entries(out.audio)) writeFileSync(join(dest, 'Audio', k + '.wav'), Buffer.from(b64, 'base64'));
  writeFileSync(join(dest, 'atlas.json'), JSON.stringify(out.atlas));
  console.log(`baked ${Object.keys(out.images).length} images, ${Object.keys(out.audio).length} sounds -> ${dest}`);
  ws.close();
} finally { proc.kill(); }
