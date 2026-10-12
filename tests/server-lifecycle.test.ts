import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

test('an assertion after server cleanup fails the process',()=>{
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`
  import assert from 'node:assert/strict';
  const {startServer}=await import('./apps/server/src/index.ts');
  const {server}=await startServer(0);
  await server.gracefullyShutdown(false);
  assert.fail('intentional lifecycle regression probe');
 `],{env:{...process.env,HOLLOW_TEST:'1'},encoding:'utf8',timeout:15000});
 assert.equal(result.error,undefined);
 assert.equal(result.status,1,result.stderr);
 assert.match(result.stderr,/intentional lifecycle regression probe/);
});
