import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KeyboardDecoder, calibrate } from '../keyboard.mjs';

const geometry = ['g', 'h', 'j', 'k'].map((key, i) => ({ key, left: i * 40, top: 0, width: 40, height: 40 }));
function decoder(options) {
  const value = new KeyboardDecoder(options);
  value.setGeometry(geometry);
  return value;
}

test('English context only resolves ambiguous letter boundaries and never changes central hits', () => {
  const value = decoder();
  value.accept('t');
  assert.equal(value.resolve(39.5, 20), 'h', 'th is a common prefix, tg is not');
  for (const key of geometry) assert.equal(value.resolve(key.left + 20, 20), key.key);
  assert.equal(value.resolve(39.5, 20, { english: false }), 'g');
  assert.equal(value.resolve(39.5, 20, { literal: true }), 'g');
  value.reset();
  assert.equal(value.resolve(39.5, 20), 'g', 'A new word has no predictive context');
  value.accept('z'); value.accept('z'); value.accept('z');
  assert.equal(value.resolve(39.5, 20), 'g', 'Unknown prefixes stay spatial');
  value.reset();
  for (const letter of 'constructor') value.accept(letter);
  assert.equal(value.resolve(39.5, 20), 'g', 'Object property names are valid input, not model entries');
});

test('per-contact hysteresis retains the previous key through tiny boundary motion, but deliberate crossing wins', () => {
  const value = decoder({ english: false });
  assert.equal(value.resolve(40.5, 20), 'h');
  assert.equal(value.resolve(40.5, 20, { previous: 'g' }), 'g');
  assert.equal(value.resolve(39.5, 20, { previous: 'h' }), 'h');
  assert.equal(value.resolve(55, 20, { previous: 'g' }), 'h');
  assert.equal(value.resolve(25, 20, { previous: 'h' }), 'g');
  assert.equal(value.resolve(-100, 20, { previous: 'g' }), null);
});

test('known intended-key calibration corrects each thumb independently and scales with key size', () => {
  const offsets = calibrate([
    { thumb: 'left', x: 30, y: 24, left: 0, top: 0, width: 40, height: 40 },
    { thumb: 'left', x: 66, y: 24, left: 40, top: 0, width: 40, height: 40 },
    { thumb: 'right', x: 14, y: 24, left: 0, top: 0, width: 40, height: 40 },
  ]);
  assert.deepEqual(offsets, { left: { x: 0.2, y: 0.1 }, right: { x: -0.15, y: 0.1 } });
  const value = decoder({ english: false, offsets });
  assert.equal(value.resolve(43, 24), 'g');
  assert.equal(value.resolve(118, 24), 'k');
  assert.equal(value.resolve(43, 24, { thumb: 'right' }), 'h');
  value.setGeometry(geometry.map(key => ({ ...key, left: key.left * 2, width: 80, height: 80 })));
  assert.equal(value.resolve(86, 48), 'g');
  value.setOffsets({});
  assert.equal(value.resolve(86, 48), 'h');
});

test('word context follows committed characters, backspace and literal-mode boundaries without buffering output', () => {
  const value = decoder();
  value.accept('T'); value.accept('x'); value.accept('Backspace');
  assert.equal(value.resolve(39.5, 20), 'h');
  value.accept('h', { literal: true });
  assert.equal(value.resolve(39.5, 20), 'g');
  value.accept('t'); value.accept(' ');
  assert.equal(value.resolve(39.5, 20), 'g');
  value.accept('t'); value.accept('ArrowLeft');
  assert.equal(value.resolve(39.5, 20), 'g');
  value.accept('t'); value.reset();
  assert.equal(value.resolve(39.5, 20), 'g');
});

test('symbols, gaps and translated layouts are handled without letter remapping', () => {
  const value = new KeyboardDecoder();
  value.setGeometry([
    { key: '|', left: 100, top: 500, width: 30, height: 40 },
    { key: '~', left: 136, top: 500, width: 30, height: 40 },
  ]);
  value.accept('t');
  assert.equal(value.resolve(129, 520), '|');
  assert.equal(value.resolve(137, 520), '~');
  assert.equal(value.resolve(133, 520), '|');
  assert.equal(value.resolve(110, 600), null);
});

test('layout changes replace cached geometry and repeated contacts do not mutate text context', () => {
  const value = decoder();
  value.accept('t');
  for (let i = 0; i < 100; i++) assert.equal(value.resolve(20, 20), 'g');
  assert.equal(value.resolve(39.5, 20), 'h');
  value.setGeometry([{ key: 'q', left: 0, top: 0, width: 40, height: 40 }]);
  assert.equal(value.resolve(20, 20), 'q');
  assert.equal(value.resolve(100, 20), null);
});
