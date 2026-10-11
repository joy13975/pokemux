import { toKana, toHiragana, toKatakana } from './vendor/kana/wanakana.js';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
let romajiMap;
toKana('', { customKanaMapping: map => { romajiMap = map; return map; } });

function convertComplete(run, convert) {
  let text = '';
  for (let start = 0; start < run.length;) {
    let end = start + 1, node = romajiMap[run[start].toLowerCase()];
    let value = node?.[''] ?? run[start];
    while (node && node[run[end]?.toLowerCase()]) {
      node = node[run[end].toLowerCase()];
      value = node[''] ?? value + run[end];
      end++;
    }
    text += convert(value, { passRomaji: true });
    start = end;
  }
  return text;
}

function composition(raw, mode, finalize = false) {
  const convert = mode === 'hiragana' ? toHiragana : toKatakana;
  let pending = '';
  const text = raw.replace(/[A-Za-z]+(?:(?<=[nN])'[A-Za-z]*)*/g, (run, offset) => {
    const ime = toKana(run, { IMEMode: mode === 'hiragana' ? 'toHiragana' : 'toKatakana' });
    const tail = ime.match(/[A-Za-z]+$/)?.[0] || '';
    const unresolved = tail ? run.slice(-tail.length) : '';
    const complete = tail ? run.slice(0, -tail.length) : run;
    // Retained romaji needs ordinary n-syllable parsing; only nn before a
    // consonant or boundary is the explicit ん stroke consumed by an IME.
    const converted = convertComplete(complete.replace(/nn(?![aeiouy])/gi, "n'"), convert);
    if (!finalize && offset + run.length === raw.length) {
      pending = unresolved;
      return converted + unresolved;
    }
    return converted + (/^n$/i.test(unresolved) ? convert('n') : unresolved);
  });
  return { raw, text, pending };
}

/**
 * Local editable romaji preedit; no method sends terminal input.
 * append/backspace/setMode return snapshot(): { raw, text, pending }.
 * flush returns committed text and empties preedit; clear discards it.
 * setMode retains raw input. Clear explicitly at target/language boundaries.
 * Only romaji is converted; punctuation and existing Japanese stay literal.
 */
export class KanaComposer {
  #raw = '';
  #mode;

  constructor(mode = 'hiragana') { this.setMode(mode); }

  get mode() { return this.#mode; }

  setMode(mode) {
    if (!['hiragana', 'katakana'].includes(mode)) throw new Error('Unsupported kana mode');
    this.#mode = mode;
    return this.snapshot();
  }

  snapshot() { return composition(this.#raw, this.#mode); }

  append(text) {
    this.#raw += text;
    return this.snapshot();
  }

  backspace() {
    const parts = [...graphemes.segment(this.#raw)];
    this.#raw = this.#raw.slice(0, parts.at(-1)?.index ?? 0);
    return this.snapshot();
  }

  clear() { this.#raw = ''; }

  flush() {
    const text = composition(this.#raw, this.#mode, true).text;
    this.clear();
    return text;
  }
}
