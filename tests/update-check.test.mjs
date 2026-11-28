import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { startUpdateChecker } from '../update-check.mjs';

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pokemux-updates-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const origin = join(root, 'origin.git'), source = join(root, 'source'), checkout = join(root, 'checkout');
  git(root, 'init', '--bare', '--initial-branch=stable', origin);
  git(root, 'clone', origin, source);
  const commit = async (dir, file, message) => {
    await writeFile(join(dir, file), message);
    git(dir, 'add', file);
    git(dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', message);
    return git(dir, 'rev-parse', 'HEAD');
  };
  const initial = await commit(source, 'base', 'First build');
  git(source, 'push', 'origin', 'stable');
  git(root, 'clone', origin, checkout);
  return { source, checkout, initial, commit };
}

test('checks the tracked origin branch, preserves the checkout, and detects a local update until restart', async t => {
  const { source, checkout, initial, commit } = await fixture(t);
  git(source, 'switch', '-c', 'testers');
  git(source, 'push', 'origin', 'testers');
  git(checkout, 'fetch', 'origin');
  git(checkout, 'switch', '-c', 'phone-build', '--track', 'origin/testers');
  const checker = await startUpdateChecker(checkout);
  assert.equal(checker.running, initial);
  const revision = await commit(source, 'next', 'Improve the terminal');
  git(source, 'push', 'origin', 'testers');
  const available = await checker.check();
  assert.deepEqual(available.origin, { state: 'ahead', ref: 'refs/heads/testers', revision, commits: 1 });
  assert.equal(available.local, initial);
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), initial);
  assert.equal(git(checkout, 'rev-parse', 'origin/testers'), initial);
  assert.equal(git(checkout, 'status', '--porcelain'), '');
  git(checkout, 'merge', '--ff-only', revision);
  const installed = await checker.check();
  assert.equal(installed.local, revision);
  assert.equal(installed.running, initial);
  assert.equal(installed.origin.state, 'current');
  assert.equal((await startUpdateChecker(checkout)).running, revision);
});

test('uses origin HEAD without tracking, distinguishes divergence and works offline for local changes', async t => {
  const { source, checkout, initial, commit } = await fixture(t);
  git(checkout, 'switch', '-c', 'offline');
  const checker = await startUpdateChecker(checkout);
  const local = await commit(checkout, 'mine', 'Local change');
  const remote = await commit(source, 'theirs', 'Remote change');
  git(source, 'push', 'origin', 'stable');
  const result = await checker.check();
  assert.equal(result.local, local);
  assert.deepEqual(result.origin, { state: 'diverged', ref: 'HEAD', revision: remote, commits: 1 });
  git(checkout, 'remote', 'set-url', 'origin', '../missing-origin');
  const offline = await (await startUpdateChecker(checkout)).check();
  assert.equal(offline.origin.state, 'unreachable');
  assert.equal(offline.local, local);
  assert.equal(offline.running, local);
  assert.equal(checker.running, initial);
});
