import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { privateJSON } from './bridge.mjs';
const { stdout } = await promisify(execFile)('/Applications/Tailscale.app/Contents/MacOS/Tailscale', ['status', '--json'], { timeout: 15000 });
const tailnet = JSON.parse(stdout), ownerLogin = tailnet.User[tailnet.Self.UserID]?.LoginName, hostname = tailnet.Self.DNSName?.replace(/\.$/, '');
if (!ownerLogin || !hostname?.endsWith('.ts.net')) throw new Error('Tailscale owner and DNS name are required');
await privateJSON(new URL('state/server.json', import.meta.url), { ownerLogin, origin: 'https://' + hostname });
console.log('Configured Pokemux owner and HTTPS origin. No credentials were exported.');
