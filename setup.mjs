const { startRegistration, startAuthentication } = window.SimpleWebAuthnBrowser;
const $ = id => document.getElementById(id);
async function api(path, data) {
  const response = await fetch('/api/' + path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
async function run(button, action) {
  button.disabled = true; $('message').textContent = '';
  try { await action(); } catch (error) { $('message').textContent = error.message; }
  finally { button.disabled = false; }
}
async function refresh() {
  const auth = await api('auth'); $('passkey').hidden = auth.authenticated;
  $('unlock').textContent = auth.registered ? 'Unlock with passkey' : 'Create your passkey';
  if (!auth.authenticated) return;
  const status = await api('status');
  $('connect').hidden = !status.connected;
}
$('unlock').onclick = () => run($('unlock'), async () => {
  const auth = await api('auth'), kind = auth.registered ? 'login' : 'register';
  const optionsJSON = await api(`passkey/${kind}-options`, {});
  const response = await (auth.registered ? startAuthentication : startRegistration)({ optionsJSON });
  await api(`passkey/${kind}-verify`, response); await refresh();
});
$('connectButton').onclick = () => run($('connectButton'), async () => { await api('connect', {}); location.replace('/'); });
refresh().catch(error => $('message').textContent = error.message);
