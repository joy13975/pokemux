import { eastAsianWidth } from './vendor/width/index.js';
const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
function width(segment) { return /\p{Emoji_Presentation}|\uFE0F/u.test(segment) ? 2 : /^\p{Mark}+$/u.test(segment) ? 0 : eastAsianWidth(segment.codePointAt(0)); }
export function cursorOffset(text, column) {
  let cells = 0;
  for (const { segment, index } of segments.segment(text)) { const n = width(segment); if (cells + n > column) return index; cells += n; if (cells === column) return index + segment.length; }
  return text.length;
}
export class RenderGrid {
  revision = 0;
  history = [];
  apply(frame) {
    if (frame.format !== 'cmux.render-grid.v1' || !Array.isArray(frame.row_spans) || frame.rows < 1 || frame.columns < 1) throw new Error('Invalid cmux render grid');
    if (frame.render_epoch === this.epoch && frame.render_revision <= this.revision) return false;
    if (!frame.full && (frame.render_epoch !== this.epoch || frame.delta_base_render_revision !== this.revision)) throw new Error('cmux stream lost continuity; reconnect for a full replay');
    const styles = new Map((frame.styles || []).map(style => [style.id, style]));
    const ingest = span => ({ ...span, style: styles.get(span.style_id), cell_width: span.cell_width ?? [...segments.segment(span.text)].reduce((n, s) => n + width(s.segment), 0) });
    const spans = frame.row_spans.map(ingest);
    const scrollback = (frame.scrollback_spans || []).map(ingest);
    const bucket = (spans, count) => { const rows = Array.from({ length: count }, () => []); for (const span of spans) rows[span.row].push(span); return rows; };
    const historyRows = () => bucket(scrollback, frame.scrollback_rows || 0);
    if (frame.full) {
      this.screen = Array.from({ length: frame.rows }, () => []);
      if (frame.history_rows !== undefined || frame.scrollback_rows || !(frame.anchor === 'screen' && !frame.scrollback_rows) && frame.active_screen !== 'alternate') this.history = historyRows();
    } else {
      if (frame.rows !== this.rows || frame.columns !== this.columns) throw new Error('cmux changed geometry without a full frame');
      const scrolled = frame.scrolled_rows || 0;
      if (scrolled > this.screen.length) {
        if (!frame.scrollback_spans) throw new Error('Missing streamed scrollback rows');
        if (this.activeScreen !== 'alternate') this.history.push(...this.screen, ...historyRows());
        this.screen = Array.from({ length: frame.rows }, () => []);
      } else { const old = this.screen.splice(0, scrolled); if (this.activeScreen !== 'alternate') this.history.push(...old); this.screen.push(...Array.from({ length: scrolled }, () => [])); }
    }
    const changed = new Set([...(frame.cleared_rows || []), ...spans.map(s => s.row)]);
    const screenRows = bucket(spans, frame.rows);
    for (const row of changed) this.screen[row] = screenRows[row].sort((a, b) => a.column - b.column);
    Object.assign(this, { epoch: frame.render_epoch, revision: frame.render_revision, rows: frame.rows, columns: frame.columns, cursor: frame.cursor, activeScreen: frame.active_screen || this.activeScreen || 'primary' });
    if (frame.modes) this.modes = frame.modes;
    this.searchText = this.screen.map(spans => { let text = '', column = 0; for (const span of spans) { text += ' '.repeat(span.column - column) + span.text; column = span.column + span.cell_width; } return text; }).join('\n').toLowerCase();
    return true;
  }
  paint(element) {
    const selection = element.ownerDocument.getSelection();
    if (element.composing || selection?.toString() && element.contains(selection.anchorNode)) return false;
    if (element.paintedGrid === `${this.epoch}/${this.revision}`) return false;
    const doc = element.ownerDocument, content = [];
    const history = this.activeScreen === 'alternate' ? [] : this.history;
    const lines = [...history, ...this.screen]; let anchor;
    for (const [row, spans] of lines.entries()) {
      const previous = element.children[row], signature = JSON.stringify(spans);
      if (previous?.renderedSpans === signature && previous.textContent === previous.renderedText && row !== history.length + this.cursor?.row && !previous.querySelector('.remote-cursor')) { content.push(previous); continue; }
      const fragment = doc.createElement('div'); fragment.className = 'terminal-row'; fragment.renderedSpans = signature;
      Object.assign(fragment.style, { position: 'relative', height: '1.55em' }); content.push(fragment);
      let column = 0;
      for (const span of spans) {
        const spaces = doc.createTextNode(' '.repeat(span.column - column)); fragment.append(spaces);
        if (row === history.length + this.cursor?.row && this.cursor.column >= column && this.cursor.column < span.column) anchor = { node: spaces, offset: this.cursor.column - column };
        const node = doc.createElement('span'), style = span.style;
        let ascii = '';
        for (const { segment } of segments.segment(span.text)) {
          if (/^[\x00-\x7f]+$/.test(segment)) { ascii += segment; continue; }
          if (ascii) { node.append(doc.createTextNode(ascii)); ascii = ''; }
          const cell = doc.createElement('span'), glyph = doc.createElement('span'); glyph.textContent = segment;
          glyph.style.fontFamily = 'PokemuxPowerline, monospace';
          cell.append(glyph);
          Object.assign(cell.style, { display: 'inline-block', width: `${width(segment)}ch`, verticalAlign: 'top' }); node.append(cell);
        }
        if (ascii) node.append(doc.createTextNode(ascii));
        if (style) {
          if (/^#[a-f0-9]{6}$/i.test(style.foreground)) node.style.color = style.foreground;
          if (/^#[a-f0-9]{6}$/i.test(style.background)) node.style.background = style.background;
          if (style.bold) node.style.fontWeight = 'bold';
          if (style.italic) node.style.fontStyle = 'italic';
          if (style.underline) node.style.textDecoration = 'underline';
          if (style.faint) node.style.opacity = '.5';
          if (style.invisible) node.style.visibility = 'hidden';
          if (style.strikethrough) node.style.textDecoration = 'line-through';
          if (style.inverse) { node.style.color = style.background || '#11151c'; node.style.background = style.foreground || '#e0e6ef'; }
        }
        fragment.append(node);
        const spanWidth = span.cell_width;
        Object.assign(node.style, { display: 'inline-block', width: `${spanWidth}ch`, height: '1.55em', verticalAlign: 'top' });
        if (row === history.length + this.cursor?.row && this.cursor.column >= span.column && this.cursor.column <= span.column + spanWidth) {
          let offset = cursorOffset(span.text, this.cursor.column - span.column), text;
          const walker = doc.createTreeWalker(node, doc.defaultView.NodeFilter.SHOW_TEXT);
          while ((text = walker.nextNode())) { if (offset <= text.length) { anchor = { node: text, offset }; break; } offset -= text.length; }
        }
        column = span.column + spanWidth;
      }
      if (row === history.length + this.cursor?.row && this.cursor.column > column) { const spaces = doc.createTextNode(' '.repeat(this.cursor.column - column)); fragment.append(spaces); anchor = { node: spaces, offset: spaces.length }; }
      if (row === history.length + this.cursor?.row && !anchor) { const empty = doc.createTextNode(''); fragment.append(empty); anchor = { node: empty, offset: 0 }; }
      fragment.append(doc.createTextNode('\n')); fragment.renderedText = fragment.textContent;
    }
    for (const node of [...element.childNodes]) if (!node.classList?.contains('terminal-row')) node.remove();
    for (const [index, row] of content.entries()) { const previous = element.children[index]; if (previous !== row) { if (previous) previous.replaceWith(row); else element.append(row); } }
    while (element.children.length > content.length) element.lastElementChild.remove();
    element.style.position = 'relative';
    element.paintedGrid = `${this.epoch}/${this.revision}`; element.remoteCaret = anchor;
    element.style.width = `${this.columns}ch`; element.style.minWidth = '0';
    if (this.cursor?.visible) {
      const cursor = doc.createElement('span'); cursor.className = 'remote-cursor'; cursor.contentEditable = 'false'; cursor.setAttribute('aria-hidden', 'true');
      Object.assign(cursor.style, { position: 'absolute', left: `${this.cursor.column}ch`, top: '0', width: this.cursor.style === 'bar' ? '2px' : '1ch', height: '1.55em', pointerEvents: 'none', background: this.cursor.style === 'block' ? '#80aaff80' : 'transparent', borderBottom: this.cursor.style === 'underline' ? '2px solid #80aaff' : '', borderLeft: this.cursor.style === 'bar' ? '2px solid #80aaff' : '', outline: this.cursor.style === 'block_hollow' ? '1px solid #80aaff' : '' });
      element.children[this.cursor.row + history.length].append(cursor);
    }
    return true;
  }
}
