import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { createConnection } from 'node:net';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, rename, mkdtemp, rm } from 'node:fs/promises';
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const maxImageBytes = 10 * 1024 * 1024;
export function imageKind(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { type: 'image/png', extension: 'png' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { type: 'image/jpeg', extension: 'jpg' };
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return { type: 'image/gif', extension: 'gif' };
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  return null;
}
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
      else entry.reject(Object.assign(new RequestError(502, `cmux ${entry.method} rejected (${response.error?.code || 'unknown'})`), {cmuxCode:response.error?.code}));
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
  phoneViewTimers = new Map();
  constructor({ socketPath = `${homedir()}/.local/state/cmux/cmux.sock` } = {}) {
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
    let timer, running = false, pending = false;
    const publish = async () => {
      timer = null; running = true; pending = false;
      try {
        const tree = await this.tree();
        if (!socket.destroyed) this.emit('event', { topic: 'workspace.updated', payload: tree });
      } catch (error) { socket.destroy(error); }
      finally { running = false; if (pending && !socket.destroyed) schedule(); }
    };
    const schedule = () => { pending = true; if (!timer && !running) timer = setTimeout(publish, 75); };

    socket.on('connect', () => socket.write(JSON.stringify({ id: randomUUID(), method: 'events.stream', params: { categories: ['window', 'workspace', 'pane', 'surface', 'notification'] } }) + '\n'));
    createInterface({ input: socket }).on('error', error => socket.destroy(error)).on('line', line => {
      let event;
      try { event = JSON.parse(line); }
      catch (error) { socket.destroy(error); return; }
      if (event.type === 'event' && !['surface.input_sent', 'surface.key_sent'].includes(event.name)) schedule();
      else if (event.ok === false) socket.destroy(new Error('cmux metadata subscription rejected'));
    });
    socket.on('error', error => { console.error('cmux metadata subscription failed:', error.code || 'protocol error'); });
    socket.on('close', () => { clearTimeout(timer); this.emit('disconnected'); });
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
  close() {
    for (const stop of this.watches) stop();
    for (const timer of this.phoneViewTimers.values()) clearTimeout(timer);
    this.phoneViewTimers.clear();
    this.metadata?.destroy(); this.local.close();
  }
  async tree() {
    const tree = await this.rpc('system.tree', { all_windows: true });
    tree.notifications = (await this.rpc('notification.list', {})).notifications;
    await Promise.all(tree.windows.map(async w => { w.groups = (await this.rpc('workspace.group.list', { window_id: w.id })).groups; }));
    return tree;
  }
  async manage(body) {
    const tree = await this.tree(), window = tree.windows.find(w => w.id === body.window_id);
    if (!window) throw new RequestError(404, 'cmux window no longer exists');
    if (body.action === 'recover-tab') {
      const existing = new Set(tree.windows.flatMap(w => w.workspaces.flatMap(ws => ws.panes.flatMap(p => p.surfaces.map(s => s.id)))));
      await this.rpc('window.focus', { window_id: window.id });
      await this.reopenNativeTab();
      const { active } = await this.waitForTree(tree => tree.active?.surface_id && !existing.has(tree.active.surface_id), 'cmux did not report a recovered tab.');
      return Object.fromEntries(['window_id', 'workspace_id', 'pane_id', 'surface_id'].map(key => [key, active[key]]));
    }
    const workspace = window.workspaces.find(w => w.id === body.workspace_id), group = window.groups.find(g => g.id === body.group_id);
    if (body.action === 'new-group') {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'Group name required');
      return this.rpc('workspace.group.create', { window_id: window.id, name: body.name });
    }
    if (['new-workspace', 'new-tab'].includes(body.action) && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100)) throw new RequestError(400, 'Name required');
    if (body.action === 'new-workspace') {
      if (body.group_id && !group) throw new RequestError(404, 'Workspace group no longer exists');
      return this.rpc('workspace.create', { window_id: window.id, ...(group ? { group_id: group.id } : {}), title: body.name, focus: false });
    }
    if (body.action === 'rename-group') {
      if (!group) throw new RequestError(404, 'Workspace group no longer exists');
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'Group name required');
      return this.rpc('workspace.group.rename', { window_id: window.id, group_id: group.id, name: body.name });
    }
    if (!workspace) throw new RequestError(404, 'Workspace no longer exists');
    if (body.action === 'move-workspace') {
      if (body.group_id && !group) throw new RequestError(404, 'Workspace group no longer exists');
      if (body.before_workspace_id && !window.workspaces.some(w => w.id === body.before_workspace_id)) throw new RequestError(404, 'Destination workspace no longer exists');
      if (body.move_group === true && !window.groups.some(g => g.anchor_workspace_id === workspace.id)) throw new RequestError(400, 'Only a group anchor can move its group');
      if (body.move_group === true && body.group_id) throw new RequestError(400, 'A group cannot be moved into another group');
      const sourceGroup = window.groups.find(g => g.anchor_workspace_id === workspace.id || g.member_workspace_ids?.includes(workspace.id));
      let inventory = window;
      if (body.move_group !== true && sourceGroup?.id !== group?.id) {
        if (group) await this.rpc('workspace.group.add', { window_id: window.id, workspace_id: workspace.id, group_id: group.id, placement: 'end' });
        else await this.rpc('workspace.group.remove', { window_id: window.id, workspace_id: workspace.id });
        inventory = (await this.tree()).windows.find(w => w.id === window.id);
        if (!inventory) throw new RequestError(404, 'cmux window no longer exists');
      }
      const target = { window_id: window.id, workspace_id: workspace.id };
      if (body.before_workspace_id) return this.rpc('workspace.reorder', { ...target, before_workspace_id: body.before_workspace_id });
      const destination = group && inventory.groups.find(g => g.id === group.id);
      const index = group ? inventory.workspaces.findLastIndex(w => destination?.anchor_workspace_id === w.id || destination?.member_workspace_ids?.includes(w.id)) : inventory.workspaces.length - 1;
      if (index < 0) throw new RequestError(404, 'Destination group no longer contains this workspace');
      return this.rpc('workspace.reorder', { ...target, index });
    }
    if (body.action === 'new-tab') {
      const result = await this.rpc('surface.create', { workspace_id: workspace.id, type: 'terminal', focus: false });
      await this.rpc('surface.action', { workspace_id: workspace.id, surface_id: result.surface_id, action: 'rename', title: body.name });
      return result;
    }
    if (body.action === 'rename-workspace') {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) throw new RequestError(400, 'Workspace name required');
      return this.rpc('workspace.rename', { workspace_id: workspace.id, title: body.name });
    }
    if (body.action === 'close-workspace') return this.closeTarget('workspace.close', { workspace_id: workspace.id, force: body.confirmed === true });
    throw new RequestError(400, 'Unknown workspace action');
  }
  async waitForTree(ready, message) {
    const deadline = Date.now() + 5000;
    do {
      const tree = await this.rpc('system.tree', { all_windows: true });
      if (ready(tree)) return tree;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    throw new RequestError(504, message);
  }
  async closeTarget(method, params) {
    const result = await this.rpc(method, params);
    await this.waitForTree(tree => {
      const workspace = tree.windows.flatMap(w => w.workspaces).find(ws => ws.id === params.workspace_id);
      return !workspace || params.surface_id && !workspace.panes.some(p => p.surfaces.some(s => s.id === params.surface_id));
    }, 'cmux did not finish closing the tab or workspace.');
    return result;
  }
  async reopenNativeTab() {
    try { await promisify(execFile)('/usr/bin/swift', [fileURLToPath(new URL('recover-tab.swift', import.meta.url))], { timeout: 15000, maxBuffer: 65536 }); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 72) throw new RequestError(503, 'Install the Xcode Command Line Tools on the Mac to enable tab recovery.');
      if (error.code === 2) { const failure = JSON.parse(error.stderr); throw new RequestError(failure.status, failure.message); }
      throw error;
    }
  }
  async target(params) {
    if (!uuid.test(params.workspace_id || '') || !uuid.test(params.surface_id || '')) throw new RequestError(400, 'Explicit workspace and terminal IDs required');
    const health = await this.rpc(params.action === 'reorder' ? 'surface.list' : 'surface.health', { workspace_id: params.workspace_id, ...(params.action === 'close' ? {} : { surface_id: params.surface_id }) });
    const surface = health.surfaces.find(s => s.id === params.surface_id);
    if (health.workspace_id !== params.workspace_id || !surface || params.action !== 'reorder' && surface.type !== 'terminal') throw new RequestError(404, 'Terminal is no longer in this workspace');
    return health;
  }
  async phoneViewport(target, body, restoreCounting = true) {
    const { client_id, viewport_generation, viewport_columns, viewport_rows } = body;
    if (!uuid.test(client_id || '') || !Number.isSafeInteger(viewport_generation) || viewport_generation < 1) throw new RequestError(400, 'Invalid phone sizing lease');
    const lease = { ...target, client_id, viewport_generation };
    if (body.clear === true) { await this.rpc('terminal.viewport', { ...lease, clear: true }); return { released: true }; }
    if (![viewport_columns, viewport_rows].every(value => Number.isSafeInteger(value) && value > 0)) throw new RequestError(400, 'Invalid phone terminal dimensions');
    const claim = body.claim === true;
    if (claim) {
      const { size_state: state } = await this.rpc('terminal.size_state', target);
      if (!['latest', 'smallest', 'priority'].includes(state.policy.mode)) {
        throw new RequestError(409, 'Choose Last Active or Fit Everyone in the cmux terminal size menu first');
      }
    }
    const report = { ...lease, viewport_columns, viewport_rows, anchor: 'screen', max_scrollback_rows: 0, device_kind: 'iphone', device_name: 'Pokemux', device_id: 'pokemux-' + client_id };
    try {
      const replay = await this.rpc('terminal.replay', claim ? { ...report, counts_override: true } : report);
      const state = replay.size_state;
      const participant = state?.participants?.find(view => view.id === replay.self_participant_id);
      if (!participant?.priority_key) throw new RequestError(502, 'cmux did not confirm the phone sizing participant');
      const ownsSize = state.policy.mode === 'priority' && state.policy.priority[0] === participant.priority_key;
      if (claim && !ownsSize) {
        await this.rpc('terminal.size_policy.set', { ...target, mode: 'priority', priority: [participant.priority_key] });
        return { pending: true, claimed: true };
      }
      if (restoreCounting && !claim && ownsSize && !participant.counts && participant.counts_override === null) {
        await this.rpc('terminal.replay', { ...report, counts_override: true });
        return { pending: true };
      }
      if (!ownsSize || !participant.counts) return { released: true };
      return { columns: state.cols, rows: state.rows };
    } catch (error) {
      if (error.cmuxCode === 'viewport_transition') return { pending: true };
      throw error;
    }
  }
  async leasePhoneViewport(target, body) {
    const key = target.surface_id + '/' + body.client_id;
    clearTimeout(this.phoneViewTimers.get(key));
    this.phoneViewTimers.delete(key);
    const result = await this.phoneViewport(target, body);
    if (body.clear === true) return result;
    const release = () => this.phoneViewport(target, { ...body, clear: true });
    if (result.released) return release();

    const renewInterval = 3000;
    const deadline = Date.now() + (result.pending ? renewInterval : 30_000);
    const schedule = () => {
      const timer = setTimeout(async () => {
        try {
          if (this.phoneViewTimers.get(key) !== timer) return;
          // Stock cmux can publish Mac ownership on TTL expiry without resizing its PTY.
          if (Date.now() >= deadline) {
            await release();
            return;
          }
          const refreshed = await this.phoneViewport(target, { ...body, claim: false }, false);
          if (this.phoneViewTimers.get(key) !== timer) return;
          if (refreshed.released) await release();
          else schedule();
        } catch (error) {
          if (this.phoneViewTimers.get(key) === timer) console.error('Phone sizing lease failed:', error.message);
        } finally {
          if (this.phoneViewTimers.get(key) === timer) this.phoneViewTimers.delete(key);
        }
      }, Math.min(renewInterval, Math.max(0, deadline - Date.now())));
      timer.unref();
      this.phoneViewTimers.set(key, timer);
    };
    schedule();
    return result;
  }
  async action(body) {
    const prior = this.queues.get(body.surface_id) || Promise.resolve();
    const operation = prior.then(async () => {
      const health = await this.target(body);
      const target = { workspace_id: body.workspace_id, surface_id: body.surface_id };
      if (body.action === 'viewport') return this.leasePhoneViewport(target, body);
      if (body.action === 'reorder') {
        if (!uuid.test(body.reference_surface_id || '') || body.reference_surface_id === body.surface_id || typeof body.after !== 'boolean') throw new RequestError(400, 'A sibling tab and reorder direction are required');
        const source = health.surfaces.find(s => s.id === body.surface_id), sibling = health.surfaces.find(s => s.id === body.reference_surface_id);
        if (!sibling) throw new RequestError(404, 'Reference tab is no longer in this workspace');
        if (source.pane_id !== sibling.pane_id) throw new RequestError(400, 'Tabs must be in the same pane');
        return this.rpc('surface.reorder', { ...target, [body.after ? 'after_surface_id' : 'before_surface_id']: body.reference_surface_id, focus: false });
      }
      if (body.action === 'mouse') {
        const { col, row } = body;
        if (!Number.isInteger(col) || col < 0 || !Number.isInteger(row) || row < 0) throw new RequestError(400, 'Invalid mouse geometry');
        const result = await this.rpc('terminal.mouse', { ...target, col, row });
        this.emit('input', target);
        return result;
      }
      if (body.action === 'scroll') {
        const { delta_lines, col, row } = body;
        if (!Number.isFinite(delta_lines) || !delta_lines || Math.abs(delta_lines) > 100 || !Number.isInteger(col) || col < 0 || !Number.isInteger(row) || row < 0) throw new RequestError(400, 'Invalid scroll geometry');
        const result = await this.rpc('terminal.scroll', { ...target, delta_lines, col, row });
        this.emit('input', target);
        return result;
      }
      if (body.action === 'image') {
        const bytes = body.bytes;
        if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > maxImageBytes) throw new RequestError(400, 'Image is empty or exceeds the upload limit');
        const kind = imageKind(bytes);
        if (!kind || kind.type !== body.type) throw new RequestError(400, 'Paste a PNG, JPEG, GIF or WebP image with a matching content type');
        const directory = await mkdtemp(join(tmpdir(), 'pokemux-image-')), file = join(directory, 'image.' + kind.extension);
        try {
          await writeFile(file, bytes, { mode: 0o600, flag: 'wx' });
          const text = /[\r\n]/u.test(file) ? "'" + file.replaceAll("'", "'\\''") + "'" : file.replace(/[\\ ()[\]{}<>"'`!#$&;|*?~\t]/gu, '\\$&');
          const result = await this.rpc('terminal.input', { ...target, text });
          this.emit('input', target);
          return result;
        } catch (error) { await rm(directory, { recursive: true }); throw error; }
      }
      if (body.action === 'input' || body.action === 'paste') {
        if (typeof body.text !== 'string' || Buffer.byteLength(body.text) > 65536) throw new RequestError(400, 'Input must be text of at most 64 KiB');
        const result = await this.rpc(body.action === 'paste' ? 'terminal.paste' : 'terminal.input', { ...target, text: body.text, ...(body.action === 'paste' ? { submit_key: 'none' } : {}) });
        this.emit('input', target);
        return result;
      }
      if (body.action === 'key') {
        if (typeof body.key !== 'string' || body.key.length > 40 || !/^(?:(?:Ctrl|Alt|Shift|Cmd)-)*(?:[\p{L}\p{N}\p{P}\p{S}]|Enter|Tab|Escape|Backspace|Space|Left|Right|Up|Down|Home|End|PageUp|PageDown|Insert|Delete|F(?:[1-9]|1[0-2]))$/u.test(body.key)) throw new RequestError(400, 'Unsupported key');
        const prefix=body.key.match(/^(?:(?:Ctrl|Alt|Shift|Cmd)-)+/)?.[0]||'',parts=prefix.split('-'),key=body.key.slice(prefix.length),modifier=1+(parts.includes('Shift')?1:0)+(parts.includes('Alt')?2:0)+(parts.includes('Ctrl')?4:0)+(parts.includes('Cmd')?8:0);
        if (/^F\d+$/.test(key)||key==='Insert'||(modifier>1&&['Home','End','PageUp','PageDown','Delete'].includes(key))) throw new RequestError(400, `cmux cannot send ${body.key} as a key; no terminal input was sent`);
        let sequence;
        if(modifier===1&&[...key].length===1)sequence=key;
        else if (!parts.includes('Cmd')&&parts.includes('Alt')&&([...key].length===1||key==='Space')) {
          // Native named Alt text follows the Mac's Option policy rather than terminal Meta semantics.
          let text=key==='Space'?' ':parts.includes('Shift')?key.toUpperCase():key;
          if(parts.includes('Ctrl')){const code=text.toUpperCase().charCodeAt(0);if(text===' '||code>=64&&code<=95)text=String.fromCharCode(code&31);else if(text==='?')text='\x7f';}
          sequence='\x1b'+text;
        }
        const result = await this.rpc(sequence?'terminal.input':'surface.send_key',sequence?{...target,text:sequence}:{...target,key:body.key});
        this.emit('input', target);
        return result;
      }
      if (body.action === 'close') {
        return health.surfaces.length === 1
          ? this.closeTarget('workspace.close', { workspace_id: target.workspace_id, force: true })
          : this.closeTarget('surface.close', { ...target, force: true });
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
