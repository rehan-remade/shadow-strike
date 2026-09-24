// Mix the Unity capture's logged SFX events (frame name vol) with the baked WAVs into one track.
// usage: node mix-audio.mjs <sfx.txt> <audioDir> <frames> <out.wav>
import { readFileSync, writeFileSync } from 'node:fs';
const [log, dir, frames, out] = process.argv.slice(2);
const SR = 44100, N = Math.ceil(+frames / 60 * SR);
const mix = new Float32Array(N);
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const b = readFileSync(`${dir}/${name}.wav`);
  let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = b.readInt16LE(o + 8 + i * 2) / 32768;
  return cache[name] = d;
}
const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean);
// music: "<frame> music:<track> 1" switches the looping track; no music lines = the legacy pad
const musicAt = lines.filter(l => l.includes(' music:')).map(l => [Math.round((+l.split(' ')[0] - 1) / 60 * SR), l.split(' ')[1].slice(6)]);
if (!musicAt.length) musicAt.push([0, 'bgm']);
for (let k = 0; k < musicAt.length; k++) {
  const [at, name] = musicAt[k], end = k + 1 < musicAt.length ? musicAt[k + 1][0] : N, m = load(name);
  for (let i = Math.max(0, at); i < end && i < N; i++) mix[i] += m[(i - at) % m.length] * 0.9 * Math.min(1, (i - at) / (SR * 0.3));
}
for (const line of lines.filter(l => !l.includes(' music:'))) {
  const [f, name, vol] = line.split(' ');
  const s = load(name), at = Math.round((+f - 1) / 60 * SR);
  for (let i = 0; i < s.length && at + i < N; i++) mix[at + i] += s[i] * +vol;
}
let peak = 0; for (const v of mix) peak = Math.max(peak, Math.abs(v));
const g = peak > 0.95 ? 0.95 / peak : 1;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * g)) * 32767), 44 + i * 2);
writeFileSync(out, buf);
console.log('mixed', out, 'peak', peak.toFixed(2));
