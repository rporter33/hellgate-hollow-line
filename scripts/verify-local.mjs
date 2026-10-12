import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const output='test-results';await mkdir(output,{recursive:true});const children=new Set();const reports=[];
function run(name,command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{env:process.env,stdio:['ignore','pipe','pipe']});children.add(child);let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log+=data;process.stdout.write(`[${name}] ${data}`);});child.on('error',reject);child.on('exit',async code=>{children.delete(child);await writeFile(`${output}/${name}.log`,log);reports.push({name,code,passed:code===0});code===0?resolve():reject(new Error(`${name} exited ${code}`));});});}
const production=spawn(process.execPath,['apps/server/dist/index.js'],{env:{...process.env,PORT:'2567'},stdio:['ignore','pipe','pipe']});children.add(production);let serverLog='';for(const stream of [production.stdout,production.stderr])stream.on('data',data=>serverLog+=data);
const cleanup=()=>{for(const child of children)child.kill('SIGTERM');};process.on('SIGINT',()=>{cleanup();process.exitCode=130;});process.on('SIGTERM',()=>{cleanup();process.exitCode=143;});
try{
 let ready=false;for(let attempt=0;attempt<80;attempt++){try{const response=await fetch('http://127.0.0.1:2567/health');if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error('Production server did not become healthy');
 const results=await Promise.allSettled([
  run('browser','python',['tests/browser.py']),
  run('rooms',process.execPath,['--import','tsx','tests/rooms.test.ts']),
  run('full-rooms',process.execPath,['--import','tsx','tests/full-rooms.ts']),
  run('destruction',process.execPath,['--import','tsx','tests/destruction.test.ts']),
  run('recovery',process.execPath,['--import','tsx','tests/recovery.ts'])
 ]);for(const result of results)if(result.status==='rejected')throw result.reason;
 console.log('PASS: production browser, real multi-client combat/destruction, gear, and recovery checks.');
}finally{cleanup();await writeFile(`${output}/production-server.log`,serverLog);await writeFile(`${output}/local-verification.json`,JSON.stringify({completedAt:new Date().toISOString(),reports},null,2));}
