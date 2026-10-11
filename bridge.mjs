import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { createConnection } from 'node:net';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function privateJSON(path, value) {
  await mkdir(new URL('.', path), { recursive: true, mode: 0o700 });
  const temporary = new URL(path.href + '.' + randomUUID());
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}
export async function loadJSON(path, initial) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return initial; throw error; }
}
class LocalSocket extends EventEmitter {
  pending = new Map();
  constructor(path) { super(); this.path = path; }
  async open() {
    if (this.socket && !this.socket.destroyed) return this.ready;
    const socket = this.socket = createConnection(this.path);
    this.ready = new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.on('error', () => reject(new RequestError(502, 'cmux local socket is unavailable')));
      socket.on('close', () => {
        reject(new RequestError(502, 'cmux local socket closed'));
        for (const [id, entry] of this.pending) { clearTimeout(entry.timer); entry.reject(new RequestError(502, 'cmux local socket closed')); this.pending.delete(id); }
        this.emit('disconnected');
      });
    });
    createInterface({ input: socket }).on('error', error => socket.destroy(error)).on('line', line => {
      let response;
      try { response = JSON.parse(line); }
      catch (error) { socket.destroy(error); return; }
      const entry = this.pending.get(response.id);
      if (!entry) { socket.destroy(new Error('Unexpected cmux reply')); return; }
      clearTimeout(entry.timer); this.pending.delete(response.id);
      if (response.ok) entry.resolve(response.result);
      else entry.reject(new RequestError(502, `cmux ${entry.method} rejected (${response.error?.code || 'unknown'})`));
    });
    return this.ready;
  }
  async rpc(method, params) {
    await this.open();
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { reject(new RequestError(504, `cmux ${method} timed out`)); this.pending.delete(id); this.socket.destroy(); }, 15000);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }
  close() { this.socket?.destroy(); }
}
export class CmuxBridge extends EventEmitter {
  queues = new Map();
  watches = new Set();
  constructor({ socketPath = '/Users/USER/.local/state/cmux/cmux.sock' } = {}) {
    super(); this.socketPath = socketPath; this.local = new LocalSocket(socketPath);
    this.local.on('disconnected', () => { this.connected = false; this.emit('disconnected'); });
  }
  rpc(method, params) { return this.local.rpc(method, params); }
  async initialize() { await this.connect(); this.observeMetadata(); }
  async status() { await this.connect(); return { connected: true }; }
  async connect() { await this.rpc('system.ping', {}); this.connected = true; }
  observeMetadata() {
    if (this.metadata && !this.metadata.destroyed) return;
    const socket = this.metadata = createConnection(this.socketPath);
    socket.on('connect', () => socket.write(JSON.stringify({ id: randomUUID(), method: 'events.stream', params: { categories: ['window', 'workspace', 'pane', 'surface', 'notification'] } }) + '\n'));
    createInterface({ input: socket }).on('error', error => socket.destroy(error)).on('line', line => {
      let event;
      try { event = JSON.parse(line); }
      catch (error) { socket.destroy(error); return; }
      if (event.type === 'event' && !['surface.input_sent', 'surface.key_sent'].includes(event.name)) this.emit('event', { topic: 'workspace.updated', payload: {} });
      else if (event.ok === false) socket.destroy(new Error('cmux metadata subscription rejected'));
    });
    socket.on('error', error => { console.error('cmux metadata subscription failed:', error.code || 'protocol error'); });
    socket.on('close', () => this.emit('disconnected'));
  }
  watch(target, onFrame, onError) {
    let stopped = false, timer, lastFrame, pending = false, running = false, lastChange = Date.now();
    const wake = changed => {
      if (changed.workspace_id !== target.workspace_id || changed.surface_id !== target.surface_id) return;
      lastChange = Date.now();
      clearTimeout(timer);
      if (running) pending = true;
      else poll();
    };
    const stop = () => { stopped = true; clearTimeout(timer); this.off('input', wake); this.watches.delete(stop); };
    this.watches.add(stop);
    const poll = async () => {
      running = true;
      pending = false;
      try {
        const replay = await this.rpc('terminal.replay', { ...target, anchor: 'screen' });
        if (stopped) return;
        if (replay.workspace_id !== target.workspace_id || replay.surface_id !== target.surface_id || !replay.render_grid?.full) throw new RequestError(502, 'cmux returned a mismatched or incomplete terminal grid');
        const { render_revision, state_seq, terminal_theme_revision, ...visual } = replay.render_grid;
        if (!isDeepStrictEqual(visual, lastFrame)) { lastFrame = visual; lastChange = Date.now(); await onFrame(replay.render_grid); }
      } catch (error) { if (!stopped) { stop(); onError(error); } }
      finally {
        running = false;
        if (!stopped) timer = setTimeout(poll, pending ? 0 : Date.now() - lastChange < 1500 ? 1000 / 15 : 200);
      }
    };
    this.on('input', wake);
    poll();
    return stop;
  }
  close() { for (const stop of this.watches) stop(); this.metadata?.destroy(); this.local.close(); }
  async tree() {
    const tree = await this.rpc('system.tree', { all_windows: true });
    tree.notifications = (await this.rpc('notification.list', {})).notifications;
    await Promise.all(tree.windows.map(async w => { w.groups = (await this.rpc('workspace.group.list', { window_id: w.id })).groups; }));
    return tree;
  }
  async manage(body) {
    const tree = await this.tree(), window = tree.windows.find(w => w.id === body.window_id);
    if (!window) throw new RequestError(404, 'cmux window no longer exists');
    const workspace = window.workspaces.find(w => w.id === body.workspace_id), group = window.groups.find(g => g.id === body.group_id);
    if (body.action === 'new-workspace') {
      if (body.group_id && !group) throw new RequestError(404, 'Workspace group no longer exists');
      return this.rpc('workspace.create', { window_id: window.id, ...(group ? { group_id: group.id } : {}), title: 'New workspace', focus: false });
    }
    if (body.action === 'rename-group') {
      if (!group) throw new RequestError(404, 'Workspace group no longer exists');
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'Group name required');
      return this.rpc('workspace.group.rename', { window_id: window.id, group_id: group.id, name: body.name });
    }
    if (!workspace) throw new RequestError(404, 'Workspace no longer exists');
    if (body.action === 'new-tab') return this.rpc('surface.create', { workspace_id: workspace.id, type: 'terminal', focus: false });
    if (body.action === 'rename-workspace') {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'Workspace name required');
      return this.rpc('workspace.rename', { workspace_id: workspace.id, title: body.name });
    }
    if (body.action === 'close-workspace') return this.rpc('workspace.close', { workspace_id: workspace.id, force: false });
    throw new RequestError(400, 'Unknown workspace action');
  }
  async target(params) {
    if (!uuid.test(params.workspace_id || '') || !uuid.test(params.surface_id || '')) throw new RequestError(400, 'Explicit workspace and terminal IDs required');
    const health = await this.rpc('surface.health', { workspace_id: params.workspace_id, ...(params.action === 'close' ? {} : { surface_id: params.surface_id }) });
    const surface = health.surfaces.find(s => s.id === params.surface_id);
    if (health.workspace_id !== params.workspace_id || !surface || surface.type !== 'terminal') throw new RequestError(404, 'Terminal is no longer in this workspace');
    return health;
  }
  async action(body) {
    const prior = this.queues.get(body.surface_id) || Promise.resolve();
    const operation = prior.then(async () => {
      const health = await this.target(body);
      const target = { workspace_id: body.workspace_id, surface_id: body.surface_id };
      if (body.action === 'input' || body.action === 'paste') {
        if (typeof body.text !== 'string' || Buffer.byteLength(body.text) > 65536) throw new RequestError(400, 'Input must be text of at most 64 KiB');
        const result = await this.rpc(body.action === 'paste' ? 'terminal.paste' : 'terminal.input', { ...target, text: body.text, ...(body.action === 'paste' ? { submit_key: 'none' } : {}) });
        this.emit('input', target);
        return result;
      }
      if (body.action === 'key') {
        if (typeof body.key !== 'string' || body.key.length > 40 || !/^(?:(?:Ctrl|Alt|Shift)-)*(?:[\p{L}\p{N}\p{P}\p{S}]|Enter|Tab|Escape|Backspace|Space|Left|Right|Up|Down|Home|End|PageUp|PageDown|Insert|Delete|F(?:[1-9]|1[0-2]))$/u.test(body.key)) throw new RequestError(400, 'Unsupported key');
        const parts=body.key.split('-'),key=parts.pop(),modifier=1+(parts.includes('Shift')?1:0)+(parts.includes('Alt')?2:0)+(parts.includes('Ctrl')?4:0);
        let sequence;
        if (/^F\d+$/.test(key)) {
          const n=Number(key.slice(1));
          sequence=n<=4?(modifier===1?'\x1bO':'\x1b[1;'+modifier)+'PQRS'[n-1]:'\x1b['+[15,17,18,19,20,21,23,24][n-5]+(modifier===1?'':';'+modifier)+'~';
        } else if (key==='Insert'||(modifier>1&&['Home','End','PageUp','PageDown','Delete'].includes(key))) {
          const final={Home:'H',End:'F'}[key],code={Insert:2,Delete:3,PageUp:5,PageDown:6}[key];
          sequence='\x1b['+(final?'1;'+modifier+final:code+(modifier===1?'':';'+modifier)+'~');
        }
        const result = await this.rpc(sequence?'terminal.input':'surface.send_key',sequence?{...target,text:sequence}:{...target,key:body.key});
        this.emit('input', target);
        return result;
      }
      if (body.action === 'close') {
        return health.surfaces.length === 1
          ? this.rpc('workspace.close', { workspace_id: target.workspace_id, force: true })
          : this.rpc('surface.close', { ...target, force: true });
      }
      if (body.action === 'rename') {
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'A terminal name is required');
        return this.rpc('surface.action', { ...target, action: 'rename', title: body.name });
      }
      throw new RequestError(400, 'Unknown terminal action');
    });
    const settled = operation.then(() => {}, () => {}); this.queues.set(body.surface_id, settled);
    try { return await operation; }
    finally { if (this.queues.get(body.surface_id) === settled) this.queues.delete(body.surface_id); }
  }
}
