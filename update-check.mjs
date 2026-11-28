import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const checkInterval = 5 * 60 * 1000;
const observedOrigin = 'refs/pokemux/observed-origin';

export async function startUpdateChecker(cwd) {
  const git = async (...args) => {
    const { stdout } = await run('git', args, {
      cwd, timeout: 10_000, killSignal: 'SIGKILL',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
    });
    return stdout.trim();
  };
  try {
    await stat(join(cwd, '.git'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const revision = async (ref = 'HEAD') => {
    const value = await git('rev-parse', '--verify', ref + '^{commit}');
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)) throw new Error('Invalid Pokemux Git revision');
    return value;
  };

  const running = await revision();
  let remote, checkedAt = -Infinity;

  async function readOrigin() {
    const remotes = await git('remote');
    if (!remotes.split('\n').includes('origin')) return { state: 'unconfigured' };
    const branch = await git('rev-parse', '--symbolic-full-name', 'HEAD');
    const tracking = branch.startsWith('refs/heads/')
      ? await git('for-each-ref', '--format=%(upstream:remotename) %(upstream:remoteref)', branch)
      : '';
    const [name, upstream] = tracking.split(' ');
    const ref = name === 'origin' && upstream?.startsWith('refs/heads/') ? upstream : 'HEAD';
    try {
      await git('fetch', '--quiet', '--no-tags', '--no-write-fetch-head', '--no-auto-maintenance',
        '--no-recurse-submodules', '--refmap=', 'origin', '+' + ref + ':' + observedOrigin);
    } catch (error) {
      if (typeof error.code !== 'number' && !error.killed) throw error;
      return { state: 'unreachable', ref };
    }
    return { ref, revision: await revision(observedOrigin) };
  }

  return {
    running,
    async check() {
      if (Date.now() - checkedAt >= checkInterval) {
        checkedAt = Date.now();
        remote = readOrigin().catch(error => {
          checkedAt = -Infinity;
          throw error;
        });
      }
      const [local, observed] = await Promise.all([revision(), remote]);
      let origin = observed;
      if (observed.revision) {
        const [left, right] = (await git('rev-list', '--left-right', '--count',
          local + '...' + observed.revision)).split(/\s+/).map(Number);
        origin = { ...observed, commits: right, state: right ? (left ? 'diverged' : 'ahead') : 'current' };
      }
      return { running, local, origin };
    }
  };
}
