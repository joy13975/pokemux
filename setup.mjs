const { startRegistration, startAuthentication } = window.SimpleWebAuthnBrowser;
const $ = id => document.getElementById(id);
async function api(path, data) {
  const response = await fetch('/api/' + path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
async function run(button, action) {
  if (button.disabled) return;
  button.disabled = true; $('message').textContent = '';
  try { await action(); } catch (error) { $('message').textContent = error.message; }
  finally { button.disabled = false; }
}
async function openTerminals() {
  await api('connect', {}); location.replace('/');
}
let automaticAttempted = false, pendingAutomatic;
async function tryAutomatic() {
  if (!pendingAutomatic || automaticAttempted || document.hidden || !document.hasFocus()) return;
  automaticAttempted = true;
  await run($('unlock'), () => unlock(pendingAutomatic));
}
window.addEventListener('focus', tryAutomatic);
document.addEventListener('visibilitychange', tryAutomatic);
async function refresh() {
  const auth = await api('auth'); $('passkey').hidden = auth.authenticated; $('connect').hidden = true;
  $('unlock').textContent = auth.registered ? 'Unlock with passkey' : 'Create your passkey';
  if (!auth.authenticated) {
    if (auth.registered && !automaticAttempted) { pendingAutomatic = auth; await tryAutomatic(); }
    return;
  }
  $('message').textContent = 'Opening terminals…';
  try { await openTerminals(); }
  catch (error) { $('connect').hidden = false; throw error; }
}
async function unlock(auth) {
  const kind = auth.registered ? 'login' : 'register';
  const optionsJSON = await api(`passkey/${kind}-options`, {});
  const response = await (auth.registered ? startAuthentication : startRegistration)({ optionsJSON });
  await api(`passkey/${kind}-verify`, response); await refresh();
}
$('unlock').onclick = () => run($('unlock'), async () => { automaticAttempted = true; await unlock(await api('auth')); });
$('connectButton').onclick = () => run($('connectButton'), openTerminals);
refresh().catch(error => $('message').textContent = error.message);
