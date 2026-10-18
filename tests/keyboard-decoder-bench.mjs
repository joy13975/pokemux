import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { KeyboardDecoder } from '../keyboard.mjs';

const decoder = new KeyboardDecoder(), geometry = [];
for (const [row, text] of ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].entries()) {
  for (const [column, key] of [...text].entries()) geometry.push({ key, left: 6 + column * 42 + row * 18, top: 500 + row * 58, width: 40, height: 52 });
}
decoder.setGeometry(geometry);
const durations = [], phrase = 'can i type very fast now ', lookup = Object.fromEntries(geometry.map(rect => [rect.key, rect]));
for (let i = 0; i < 30000; i++) {
  const key = phrase[i % phrase.length], rect = lookup[key];
  const start = performance.now();
  if (rect) decoder.resolve(rect.left + rect.width * 0.93, rect.top + rect.height / 2, { previous: i % 2 ? key : null });
  decoder.accept(key);
  const duration = performance.now() - start;
  if (i >= 1000) durations.push(duration);
}
durations.sort((a, b) => a - b);
const p95 = durations[Math.floor(durations.length * 0.95)], p99 = durations[Math.floor(durations.length * 0.99)];
assert.ok(p95 < 1, `Keyboard decode p95 ${p95}ms exceeds 1ms`);
console.log(JSON.stringify({ measured: durations.length, p95Milliseconds: p95, p99Milliseconds: p99, maxMilliseconds: durations.at(-1), runtime: process.version, scope: 'Cached geometry, local resolution and prefix update; excludes DOM, browser dispatch and transport' }));
