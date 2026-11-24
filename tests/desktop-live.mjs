import assert from 'node:assert/strict';
import { access, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DesktopEngine } from '../desktop-server.mjs';

const desktop = new DesktopEngine({ origin: 'http://localhost' });
let original;
try {
 await desktop.start(); original = desktop.directory;
 const child = desktop.child, exited = once(child, 'exit');
 child.kill('SIGTERM'); await exited;
 await desktop.start(); await desktop.stop();
 await assert.rejects(access(original), { code: 'ENOENT' });
 console.log('Desktop recovers from engine exit and removes both private token directories.');
} finally {
 await desktop.stop();
 if (original) await rm(original, { recursive: true, force: true });
}

const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `import {DesktopEngine} from './desktop-server.mjs';const desktop=new DesktopEngine({origin:'http://localhost'});await desktop.start();console.log(desktop.directory);process.exit(0);`], { cwd: new URL('..', import.meta.url) });
await assert.rejects(access(stdout.trim()), { code: 'ENOENT' });
console.log('Bridge process exit removes its private engine credentials.');
