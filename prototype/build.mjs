// Inline src/engine.js + one skill into standalone HTML files.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const shell = readFileSync('src/shell.html', 'utf8');
const engine = readFileSync('src/engine.js', 'utf8');
const only = process.argv[2];
for (const f of readdirSync('src/skills').sort()) {
  if (!f.endsWith('.js') || (only && !f.includes(only))) continue;
  const skill = readFileSync('src/skills/' + f, 'utf8');
  const title = (skill.match(/title:\s*'([^']+)'/) || [, f])[1];
  const out = f.replace('.js', '.html');
  writeFileSync(out, shell.replace('%%TITLE%%', title).replace('%%ENGINE%%', () => engine).replace('%%SKILL%%', () => skill));
  console.log('built', out);
}
