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
    this.root.innerHTML = `<div class="block-select-stage"><div class="block-select-box" hidden></div><button data-block-corner="start" aria-label="Selection start" hidden></button><button data-block-corner="end" aria-label="Selection end" hidden></button></div><div class="block-select-toolbar"><span role="status">Drag to select columns</span><button data-block-copy disabled>Copy</button><button data-block-done>Done</button></div>`;
    layer.append(this.root);
    this.stage = this.root.querySelector('.block-select-stage'); this.box = this.root.querySelector('.block-select-box');
    this.status = this.root.querySelector('[role=status]'); this.copyButton = this.root.querySelector('[data-block-copy]');
    this.handles = [...this.root.querySelectorAll('[data-block-corner]')];
    const end = e => { if (this.contact?.id === e.pointerId) { this.move(e); this.contact = null; } };
    this.stage.onpointerdown = e => {
      if (e.button !== 0 || !e.isPrimary) return;
      e.preventDefault(); this.stage.setPointerCapture(e.pointerId);
      const corner = e.target.closest('[data-block-corner]')?.dataset.blockCorner;
      this.contact = { id: e.pointerId, corner };
      if (!corner) this.start = this.end = this.point(e);
      this.move(e);
    };
    this.stage.onpointermove = e => this.move(e); this.stage.onpointerup = end;
    this.stage.onpointercancel = () => { this.contact = null; };
    this.stage.onlostpointercapture = () => { this.contact = null; };
    this.stage.oncontextmenu = e => e.preventDefault();
    this.stage.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    for (const button of this.root.querySelectorAll('button')) button.onpointerdown = e => e.preventDefault();
    this.copyButton.onclick = async () => { await copy(this.grid.copyRectangle(this.start, this.end)); };
    this.root.querySelector('[data-block-done]').onclick = () => this.close();
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
  point(e) {
    const box = this.output.getBoundingClientRect();
    return this.grid.cellAt(this.output, Math.max(box.left, Math.min(box.right - .01, e.clientX)), Math.max(box.top, Math.min(box.bottom - .01, e.clientY)), true);
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
    Object.assign(this.stage.style, { left: x(left) + 'px', top: y(top) + 'px', width: (right - left) * scale + 'px', height: (bottom - top) * scale + 'px' });
    Object.assign(this.root.querySelector('.block-select-toolbar').style, { left: x(left) + 'px', top: Math.max(0, y(top) - 44) + 'px', width: (right - left) * scale + 'px' });
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
    this.copyButton.disabled = !this.grid.copyRectangle(this.start, this.end);
    this.status.textContent = `${Math.abs(this.end.col - this.start.col) + 1} columns · ${Math.abs(this.end.row - this.start.row) + 1} rows`;
  }
  close() {
    if (!this.root.isConnected) return;
    this.output.closest('.terminalwrap')?.removeEventListener('scroll', this.scroll);
    this.output.blockSelection = false; this.root.remove(); this.onClose();
  }
}
