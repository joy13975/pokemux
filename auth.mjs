import { randomBytes } from 'node:crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { loadJSON, privateJSON, RequestError } from './bridge.mjs';
const sessionSeconds = 12 * 3600;
export class Passkeys {
  sessions = new Map();
  persistence = Promise.resolve();
  constructor({ origin, ownerLogin, file }) { this.origin = origin; this.rpID = new URL(origin).hostname; this.ownerLogin = ownerLogin; this.file = file; this.sessionFile = new URL(file.href + '.sessions'); }
  async initialize() {
    this.credentials = await loadJSON(this.file, []);
    const saved = await loadJSON(this.sessionFile, { origin: this.origin, ownerLogin: this.ownerLogin, sessions: [] });
    if (saved.origin !== this.origin || saved.ownerLogin !== this.ownerLogin || !Array.isArray(saved.sessions) || !saved.sessions.every(entry => Array.isArray(entry) && entry.length === 2 && /^[a-f0-9]{64}$/.test(entry[0]) && Number.isSafeInteger(entry[1]))) throw new Error('Invalid persisted login sessions');
    this.sessions = new Map(saved.sessions.filter(([, expires]) => expires > Date.now()).map(([id, expires]) => [id, { expires, authenticated: true }]));
  }
  async persistSessions() {
    this.persistence = this.persistence.then(() => privateJSON(this.sessionFile, {
      origin: this.origin, ownerLogin: this.ownerLogin,
      sessions: [...this.sessions].filter(([, session]) => session.authenticated && session.expires > Date.now()).map(([id, session]) => [id, session.expires])
    }));
    await this.persistence;
  }
  async logout(id) { this.sessions.delete(id); await this.persistSessions(); }
  cookie(id) { return `pokemux=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}${this.origin.startsWith('https:') ? '; Secure' : ''}`; }
  session(req) {
    const id = /(?:^|;\s*)pokemux=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    const session = this.sessions.get(id);
    if (session && session.expires > Date.now()) return { id, ...session };
    if (id) this.sessions.delete(id);
    return null;
  }
  require(req) { const session = this.session(req); if (!session?.authenticated) throw new RequestError(401, 'Unlock with your passkey'); return session; }
  sameOrigin(req) { if (req.headers.origin !== this.origin) throw new RequestError(403, 'Request origin rejected'); }
  bootstrap(req) { if (!this.ownerLogin || req.headers['tailscale-user-login'] !== this.ownerLogin) throw new RequestError(403, 'First passkey must be registered through your owner Tailscale connection'); }
  issue() {
    const id = randomBytes(32).toString('hex');
    const session = { expires: Date.now() + sessionSeconds * 1000, authenticated: false };
    this.sessions.set(id, session); return { id, ...session };
  }
  async options(req, res, register) {
    if (register) { if (this.credentials.length) this.require(req); else this.bootstrap(req); }
    else if (!this.credentials.length) throw new RequestError(409, 'Register a passkey first');
    const session = this.session(req) || this.issue();
    res.setHeader('Set-Cookie', this.cookie(session.id));
    const options = register ? await generateRegistrationOptions({ rpName: 'Pokemux', rpID: this.rpID, userID: new TextEncoder().encode('pokemux-owner'), userName: 'Pokemux owner', attestationType: 'none', excludeCredentials: this.credentials.map(c => ({ id: c.id, transports: c.transports })), authenticatorSelection: { residentKey: 'required', userVerification: 'required' } }) : await generateAuthenticationOptions({ rpID: this.rpID, allowCredentials: this.credentials.map(c => ({ id: c.id, transports: c.transports })), userVerification: 'required' });
    Object.assign(this.sessions.get(session.id), { challenge: options.challenge, challengeExpiry: Date.now() + 120000, register });
    return options;
  }
  async verify(req, res, response, register) {
    const session = this.session(req), stored = session && this.sessions.get(session.id);
    if (!stored?.challenge || stored.challengeExpiry < Date.now() || stored.register !== register) throw new RequestError(400, 'Passkey request expired');
    if (register) { if (this.credentials.length) this.require(req); else this.bootstrap(req); }
    const challenge = stored.challenge; delete stored.challenge;
    try {
      if (register) {
        const result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: this.origin, expectedRPID: this.rpID, requireUserVerification: true });
        if (!result.verified || !result.registrationInfo) throw new RequestError(403, 'Passkey verification failed');
        const c = result.registrationInfo.credential;
        this.credentials.push({ ...c, publicKey: Buffer.from(c.publicKey).toString('base64') });
      } else {
        const c = this.credentials.find(c => c.id === response.id);
        if (!c) throw new RequestError(403, 'Unknown passkey');
        const result = await verifyAuthenticationResponse({ response, credential: { ...c, publicKey: Buffer.from(c.publicKey, 'base64') }, expectedChallenge: challenge, expectedOrigin: this.origin, expectedRPID: this.rpID, requireUserVerification: true });
        if (!result.verified) throw new RequestError(403, 'Passkey verification failed');
        c.counter = result.authenticationInfo.newCounter;
      }
    } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError(403, 'Passkey verification failed'); }
    await privateJSON(this.file, this.credentials);
    this.sessions.delete(session.id);
    const fresh = this.issue(); this.sessions.get(fresh.id).authenticated = true;
    await this.persistSessions();
    res.setHeader('Set-Cookie', this.cookie(fresh.id));
    return { authenticated: true };
  }
}
