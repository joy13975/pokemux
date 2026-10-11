import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KanaComposer } from '../kana.mjs';

test('typing a Japanese greeting keeps unfinished romaji editable', () => {
  const composer = new KanaComposer();
  assert.deepEqual(composer.append('k'), { raw: 'k', text: 'k', pending: 'k' });
  assert.deepEqual(composer.append('o'), { raw: 'ko', text: 'こ', pending: '' });
  composer.append('nnichih');
  assert.equal(composer.snapshot().text, 'こんにちh');
  assert.equal(composer.snapshot().pending, 'h');
  composer.append('a');
  assert.equal(composer.flush(), 'こんにちは');
  assert.deepEqual(composer.snapshot(), { raw: '', text: '', pending: '' });
});

test('n ambiguity remains reversible until its following letter or commit', () => {
  const composer = new KanaComposer();
  assert.equal(composer.append('shinbun').text, 'しんぶn');
  assert.equal(composer.flush(), 'しんぶん');
  assert.equal(composer.append('na').text, 'な');
  composer.clear();
  assert.equal(composer.append("n'a").text, 'んあ');
  composer.clear();
  assert.equal(composer.append('nya').text, 'にゃ');
});

test('double n supports explicit ん and a following n syllable', () => {
  for (const [raw, expected] of [['nn', 'ん'], ['nna', 'んな'], ['nni', 'んに'], ['nnya', 'んにゃ'], ['nnka', 'んか'], ['nnna', 'んな']]) {
    const composer = new KanaComposer();
    for (const character of raw) composer.append(character);
    assert.equal(composer.flush(), expected, raw);
  }
});

test('doubled consonants and small kana come from WanaKana mappings', () => {
  const composer = new KanaComposer();
  assert.equal(composer.append('kk').text, 'kk');
  composer.append('o');
  assert.equal(composer.flush(), 'っこ');
  composer.append('gakkou syashin maccha xtsu lya');
  assert.equal(composer.flush(), 'がっこう しゃしん まっちゃ っ ゃ');
});

test('katakana mode ignores caps and keeps foreign-sound combinations', () => {
  const composer = new KanaComposer('katakana');
  composer.append('FAIRU wo CHEKKU');
  assert.equal(composer.flush(), 'ファイル ヲ チェック');
});

test('punctuation, whitespace, digits, Unicode and shell syntax stay literal', () => {
  const composer = new KanaComposer();
  composer.append("nihon, test! 123 ./ -- = + : ; ' [ ] { }\n日本😀");
  assert.equal(composer.flush(), "にほん, てst! 123 ./ -- = + : ; ' [ ] { }\n日本😀");
});

test('backspace edits original romaji so a completed syllable can be corrected', () => {
  const composer = new KanaComposer();
  composer.append('kya');
  assert.deepEqual(composer.backspace(), { raw: 'ky', text: 'ky', pending: 'ky' });
  composer.append('u');
  assert.equal(composer.flush(), 'きゅ');
  composer.append('nn');
  assert.deepEqual(composer.backspace(), { raw: 'n', text: 'n', pending: 'n' });
  assert.deepEqual(composer.backspace(), { raw: '', text: '', pending: '' });
  assert.deepEqual(composer.backspace(), { raw: '', text: '', pending: '' });
});

test('backspace removes a whole grapheme rather than splitting Unicode input', () => {
  const composer = new KanaComposer();
  composer.append('ka👨‍👩‍👧‍👦');
  assert.deepEqual(composer.backspace(), { raw: 'ka', text: 'か', pending: '' });
});

test('flush preserves unfinished consonants and their case instead of inventing kana', () => {
  for (const raw of ['k', 'kk', 'ny', 'NY', 'QZ']) {
    const composer = new KanaComposer();
    composer.append(raw);
    assert.equal(composer.flush(), raw);
  }
});

test('unmatched Latin keeps its original case before and between converted syllables',()=>{
 for(const [raw,hiragana,katakana] of [['QZa','Qざ','Qザ'],['QZka','QZか','QZカ'],['kaQZshi','かQZし','カQZシ'],['Qqka','Qqか','Qqカ'],['QZqzka','QZqzか','QZqzカ'],['KKXka','KKヵ','KKヵ'],['TNka','Tんか','Tンカ']]){
  for(const [mode,expected] of [['hiragana',hiragana],['katakana',katakana]]){
   const composer=new KanaComposer(mode);
   for(const character of raw)composer.append(character);
   assert.equal(composer.snapshot().text,expected,`${mode} preview ${raw}`);
   assert.equal(composer.flush(),expected,`${mode} commit ${raw}`);
  }
 }
});

test('mode changes retain preedit; clear explicitly discards it without emitting', () => {
  const composer = new KanaComposer();
  composer.append('nihon');
  assert.equal(composer.setMode('katakana').text, 'ニホn');
  assert.equal(composer.setMode('hiragana').text, 'にほn');
  composer.clear();
  assert.equal(composer.flush(), '');
});
