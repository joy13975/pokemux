import nextLetters from './vendor/english/model.mjs';

const thumbs = ['left', 'right'];
function rectValid(rect) {
  return ['left', 'top', 'width', 'height'].every(name => Number.isFinite(rect[name])) && rect.width > 0 && rect.height > 0;
}

export function calibrate(samples) {
  const sums = { left: { x: 0, y: 0, count: 0 }, right: { x: 0, y: 0, count: 0 } };
  for (const sample of samples) {
    if (!thumbs.includes(sample.thumb)) throw new Error('Calibration requires a left or right thumb');
    if (!rectValid(sample) || !Number.isFinite(sample.x) || !Number.isFinite(sample.y)) throw new Error('Invalid calibration geometry');
    const sum = sums[sample.thumb];
    sum.x += (sample.x - sample.left - sample.width / 2) / sample.width;
    sum.y += (sample.y - sample.top - sample.height / 2) / sample.height;
    sum.count++;
  }
  return Object.fromEntries(thumbs.map(thumb => [thumb, { x: sums[thumb].count ? sums[thumb].x / sums[thumb].count : 0, y: sums[thumb].count ? sums[thumb].y / sums[thumb].count : 0 }]));
}

export class KeyboardDecoder {
  constructor({ english = true, offsets = {} } = {}) {
    this.english = english;
    this.keys = [];
    this.prefix = '';
    this.setOffsets(offsets);
  }

  setOffsets(offsets) {
    const normalized = {};
    for (const thumb of thumbs) {
      const offset = offsets[thumb] || { x: 0, y: 0 };
      if (!Number.isFinite(offset.x) || !Number.isFinite(offset.y)) throw new Error('Invalid keyboard thumb offset');
      normalized[thumb] = { x: offset.x, y: offset.y };
    }
    this.offsets = normalized;
  }

  setGeometry(geometry) {
    const names = new Set();
    const keys = geometry.map(rect => {
      if (!rectValid(rect) || typeof rect.key !== 'string' || !rect.key) throw new Error('Invalid keyboard geometry');
      if (names.has(rect.key)) throw new Error(`Duplicate keyboard key: ${rect.key}`);
      names.add(rect.key);
      return { ...rect, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    });
    this.midpoint = keys.length ? (Math.min(...keys.map(key => key.left)) + Math.max(...keys.map(key => key.left + key.width))) / 2 : 0;
    this.keys = keys;
  }

  resolve(x, y, { previous = null, english = this.english, literal = false, thumb } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (thumb !== undefined && !thumbs.includes(thumb)) throw new Error('Keyboard contact requires a left or right thumb');
    const offset = this.offsets[thumb || (x < this.midpoint ? 'left' : 'right')];
    const candidates = [];
    let nearest;
    for (const key of this.keys) {
      const dx = (x - key.cx) / key.width - offset.x, dy = (y - key.cy) / key.height - offset.y;
      if (Math.abs(dx) > 0.75 || Math.abs(dy) > 0.75) continue;
      const candidate = { key: key.key, dx, dy, distance: dx * dx + dy * dy };
      candidates.push(candidate);
      if (!nearest || candidate.distance < nearest.distance) nearest = candidate;
    }
    if (!nearest) return null;
    if (Math.abs(nearest.dx) <= 0.29 && Math.abs(nearest.dy) <= 0.29) return nearest.key;
    const weights = !literal && english && /^[a-z]$/i.test(nearest.key) && Object.hasOwn(nextLetters, this.prefix) ? nextLetters[this.prefix] : null;
    let best = nearest, score = nearest.distance;
    if (weights) {
      score = Infinity;
      for (const candidate of candidates) {
        if (!/^[a-z]$/i.test(candidate.key) || candidate.distance > nearest.distance + 0.12) continue;
        const position = weights.indexOf(candidate.key.toLowerCase());
        const weight = position < 0 ? 0 : Number(weights[position + 1]);
        const candidateScore = candidate.distance - 0.12 * weight / 8;
        if (candidateScore < score) { best = candidate; score = candidateScore; }
      }
    }
    const retained = candidates.find(candidate => candidate.key === previous);
    if (retained && Math.abs(retained.dx) <= 0.65 && Math.abs(retained.dy) <= 0.65 && retained.distance <= best.distance + 0.12) return retained.key;
    return best.key;
  }

  accept(key, { literal = false } = {}) {
    if (literal) this.reset();
    else if (key === 'Backspace') this.prefix = this.prefix.slice(0, -1);
    else if (/^[a-z]$/i.test(key)) this.prefix = (this.prefix + key.toLowerCase()).slice(-24);
    else this.reset();
  }

  reset() { this.prefix = ''; }
}
