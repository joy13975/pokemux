import { RenderGrid } from './grid.mjs';

export class BlockSelection {
  constructor({ output, grid, layer, copy, onClose }) {
    this.output = output; this.layer = layer; this.onClose = onClose;
    this.grid = Object.assign(new RenderGrid(), grid, { screen: grid.screen.slice(), history: grid.history.slice() });
    output.blockSelection = true;
    const doc = output.ownerDocument;
    doc.getSelection()?.removeAllRanges();
    this.root = doc.createElement('section'); this.root.className = 'block-select';
    this.root.setAttribute('aria-label', 'Rectangular text selection');
    this.root.innerHTML = `<div class="block-select-stage"><div class="block-select-box" hidden></div><button data-block-corner="start" aria-label="Selection start" hidden></button><button data-block-corner="end" aria-label="Selection end" hidden></button></div><button class="block-select-copy" data-block-copy type="button" hidden>Copy</button>`;
    layer.append(this.root);
    this.stage = this.root.querySelector('.block-select-stage'); this.box = this.root.querySelector('.block-select-box');
    this.copyButton = this.root.querySelector('[data-block-copy]');
    this.handles = [...this.root.querySelectorAll('[data-block-corner]')];
    const release = () => {
      if (!this.contact) return;
      this.contact = null;
      this.stage.classList.remove('drawing');
      this.layout();
    };
    const end = e => { if (this.contact?.id === e.pointerId) { this.move(e); release(); } };
    this.stage.onpointerdown = e => { if (e.target.closest('[data-block-corner]')) this.begin(e); };
    this.stage.onpointermove = e => this.move(e); this.stage.onpointerup = end;
    this.stage.onpointercancel = release;
    this.stage.onlostpointercapture = release;
    this.stage.oncontextmenu = e => e.preventDefault();
    this.stage.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    for (const button of this.root.querySelectorAll('button')) button.onpointerdown = e => e.preventDefault();
    this.copyButton.onclick = async () => { await copy(this.grid.copyRectangle(this.start, this.end)); };
    this.outsidePress = e => {
      if (e.isPrimary && e.button === 0 && !this.root.contains(e.target)) this.close();
    };
    doc.addEventListener('pointerdown', this.outsidePress);
    this.root.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
      const corner = e.target.dataset.blockCorner, point = this[corner];
      if (!point || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      this[corner] = { col: Math.max(0, Math.min(grid.columns - 1, point.col + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0))), row: Math.max(grid.activeScreen === 'alternate' ? 0 : -this.grid.history.length, Math.min(grid.rows - 1, point.row + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0))) };
      this.layout();
    };
    this.scroll = () => this.layout(); output.closest('.terminalwrap').addEventListener('scroll', this.scroll);
    this.layout();
  }
  begin(e) {
    if (e.button !== 0 || !e.isPrimary) return;
    e.preventDefault(); this.stage.classList.add('drawing'); this.stage.setPointerCapture(e.pointerId);
    const corner = e.target.closest('[data-block-corner]')?.dataset.blockCorner;
    this.contact = { id: e.pointerId, corner };
    if (!corner) this.start = this.end = this.point(e);
    this.move(e);
  }
  point(e) {
    const box = this.output.getBoundingClientRect(), wrap = this.output.closest('.terminalwrap').getBoundingClientRect(), layer = this.layer.getBoundingClientRect();
    const scale = this.layer.offsetWidth / layer.width || 1;
    const reach = (value, min, max) => {
      const rim = Math.min(24 / scale, (max - min) / 4), left = value < (min + max) / 2, distance = left ? value - min : max - value;
      if (distance >= rim * 2) return value;
      const t = Math.max(0, (distance - rim) / rim), offset = rim * t * t * (5 - 3 * t);
      return left ? min + offset : max - Math.max(.01, offset);
    };
    const x = reach(e.clientX, Math.max(box.left, wrap.left, layer.left), Math.min(box.right, wrap.right, layer.right));
    const y = reach(e.clientY, Math.max(box.top, wrap.top, layer.top), Math.min(box.bottom, wrap.bottom, layer.bottom));
    return this.grid.cellAt(this.output, x, y, true);
  }
  move(e) {
    if (this.contact?.id !== e.pointerId) return;
    const point = this.point(e); if (!point) return;
    this[this.contact.corner || 'end'] = point; this.layout();
  }
  layout() {
    const output = this.output, layer = this.layer.getBoundingClientRect(), wrap = output.closest('.terminalwrap').getBoundingClientRect(), text = output.getBoundingClientRect();
    const scale = this.layer.offsetWidth / layer.width || 1, x = value => (value - layer.left) * scale, y = value => (value - layer.top) * scale;
    const top = Math.max(wrap.top, layer.top), left = Math.max(wrap.left, layer.left), right = Math.min(wrap.right, layer.right), bottom = Math.min(wrap.bottom, layer.bottom);
    const width = (right - left) * scale, height = (bottom - top) * scale;
    Object.assign(this.stage.style, { left: x(left) + 'px', top: y(top) + 'px', width: width + 'px', height: height + 'px' });
    if (!this.start || !this.end) return;
    const line = output.firstElementChild.getBoundingClientRect().height, cell = text.width / this.grid.columns, history = this.grid.activeScreen === 'alternate' ? 0 : this.grid.history.length;
    const rect = { left: (text.left - left + Math.min(this.start.col, this.end.col) * cell) * scale, top: (text.top - top + (Math.min(this.start.row, this.end.row) + history) * line) * scale, width: (Math.abs(this.end.col - this.start.col) + 1) * cell * scale, height: (Math.abs(this.end.row - this.start.row) + 1) * line * scale };
    this.box.hidden = false;
    for (const [key, value] of Object.entries(rect)) this.box.style[key] = value + 'px';
    for (const handle of this.handles) {
      const start = handle.dataset.blockCorner === 'start', point = this[handle.dataset.blockCorner];
      const col = point.col + (start ? this.start.col > this.end.col : this.end.col >= this.start.col), row = point.row + history + (start ? this.start.row > this.end.row : this.end.row >= this.start.row);
      Object.assign(handle.style, { left: (text.left - left + col * cell) * scale + 'px', top: (text.top - top + row * line) * scale + 'px' }); handle.hidden = false;
    }
    const boxLeft = Math.max(0, rect.left), boxRight = Math.min(width, rect.left + rect.width);
    const boxTop = Math.max(0, rect.top), boxBottom = Math.min(height, rect.top + rect.height);
    const button = this.copyButton;
    button.hidden = !!this.contact || boxRight <= boxLeft || boxBottom <= boxTop;
    if (button.hidden) return;
    button.disabled = !this.grid.copyRectangle(this.start, this.end);
    const gap = 8, anchor = (boxLeft + boxRight) / 2;
    const above = boxTop - button.offsetHeight - gap;
    const below = boxBottom + gap;
    const maxTop = Math.max(0, height - button.offsetHeight);
    const placeAbove = above >= 0 || (below > maxTop && boxTop >= height - boxBottom);
    const buttonLeft = Math.max(0, Math.min(width - button.offsetWidth, anchor - button.offsetWidth / 2));
    const buttonTop = Math.max(0, Math.min(maxTop, placeAbove ? above : below));
    button.dataset.side = placeAbove ? 'above' : 'below';
    button.style.left = x(left) + buttonLeft + 'px';
    button.style.top = y(top) + buttonTop + 'px';
    button.style.setProperty('--copy-anchor', anchor - buttonLeft + 'px');
  }
  close() {
    if (!this.root.isConnected) return;
    this.output.ownerDocument.removeEventListener('pointerdown', this.outsidePress);
    this.output.closest('.terminalwrap')?.removeEventListener('scroll', this.scroll);
    this.output.blockSelection = false; this.root.remove(); this.onClose();
  }
}
