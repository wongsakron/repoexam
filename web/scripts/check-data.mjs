// CI sanity check for the exported data: run with `npm run check`.
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf8'));
const meta = read('meta.json');
const sum = read('sum.json');
const Q = read('q.json');

const errors = [];
const keys = new Set(meta.chapters.map((c) => c.k));
const seen = new Set();

for (const q of Q) {
  if (seen.has(q.id)) errors.push(`duplicate id ${q.id}`);
  seen.add(q.id);
  if (!keys.has(`${q.b}-${q.c}`)) errors.push(`${q.id}: unknown chapter ${q.b}-${q.c}`);
  if (![1, 2, 3].includes(q.lv)) errors.push(`${q.id}: bad level ${q.lv}`);
  if (!Array.isArray(q.ch) || q.ch.length < 2) errors.push(`${q.id}: needs at least 2 choices`);
  if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < q.ch.length)) errors.push(`${q.id}: answer out of range`);
  if (!q.e) errors.push(`${q.id}: missing explanation`);
  for (const n of q.im || []) {
    if (!existsSync(new URL(`../public/img/${n}.webp`, import.meta.url))) errors.push(`${q.id}: missing image ${n}`);
  }
}
for (const k of keys) if (!sum[k]) errors.push(`missing summary for chapter ${k}`);
const grouped = meta.groups.flatMap((g) => g.chs).sort();
if (JSON.stringify(grouped) !== JSON.stringify([...keys].sort())) errors.push('mock groups must cover every chapter once');
if (meta.groups.reduce((s, g) => s + g.w, 0) !== 100) errors.push('mock group weights must sum to 100');

if (errors.length) {
  console.error(errors.slice(0, 50).join('\n'));
  console.error(`${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`data OK: ${Q.length} questions, ${keys.size} chapters`);
