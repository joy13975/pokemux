import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateFixtureRPC} from './fixture-ownership.mjs';

const [infoPath,outputPath,phase,token]=process.argv.slice(2);assert.ok(infoPath&&outputPath,'Pass explicit owned fixture metadata and output paths');assert.ok(['before','typed','clicked'].includes(phase));assert.match(token||'',/^[a-f0-9-]{36}$/i);
const info=JSON.parse(await readFile(infoPath,'utf8'));assert.equal(info.claude,true);assert.ok(info.runId);
const params={workspace_id:info.workspaceId,surface_id:info.surfaceId,anchor:'screen',max_scrollback_rows:0};
validateFixtureRPC('terminal.replay',params,{windowId:info.windowId,workspaces:new Set([info.workspaceId]),surfaces:new Set([info.surfaceId]),groups:new Set(),panes:new Set()});
const result=JSON.parse(execFileSync('/Applications/cmux.app/Contents/Resources/bin/cmux',['--socket','/Users/USER/.local/state/cmux/cmux.sock','--json','rpc','terminal.replay',JSON.stringify(params)],{encoding:'utf8',timeout:5000}));
assert.equal(result.workspace_id,info.workspaceId);assert.equal(result.surface_id,info.surfaceId);
await writeFile(outputPath,JSON.stringify({runId:info.runId,phase,token,capturedAt:new Date().toISOString(),result}),{mode:0o600});
console.log(JSON.stringify({runId:info.runId,cursor:result.render_grid.cursor}));
