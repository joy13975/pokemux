import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: node scripts/build-keyboard-english.mjs alice.txt holmes.txt');
const words = new Map(), sources = [];
for (const path of paths) {
  const input = await readFile(path, 'utf8');
  const body = input.match(/\*\*\* START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n([\s\S]*?)\*\*\* END OF THE PROJECT GUTENBERG EBOOK/);
  if (!body) throw new Error(`Missing public-domain text boundaries in ${path}`);
  sources.push(createHash('sha256').update(input).digest('hex'));
  for (const word of body[1].toLowerCase().match(/[a-z]+/g)) words.set(word, (words.get(word) || 0) + 1);
}
const prefixes = new Map();
for (const [word, count] of [...words].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 1800)) {
  for (let i = 1; i < word.length; i++) {
    const prefix = word.slice(0, i), letters = prefixes.get(prefix) || new Map();
    letters.set(word[i], (letters.get(word[i]) || 0) + count);
    prefixes.set(prefix, letters);
  }
}
const model = {};
for (const [prefix, letters] of [...prefixes].sort((a, b) => a[0].localeCompare(b[0]))) {
  const total = [...letters.values()].reduce((sum, count) => sum + count, 0);
  if (total < 8) continue;
  model[prefix] = [...letters].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([letter, count]) => letter + Math.max(1, Math.round(8 * count / total))).join('');
}
await writeFile(new URL('../vendor/english/model.mjs', import.meta.url), `export default ${JSON.stringify(model)};\n`);
console.log(JSON.stringify({ sourceSHA256: sources, words: words.size, prefixes: Object.keys(model).length, bytes: JSON.stringify(model).length }));
