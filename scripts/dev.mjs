import {spawn} from 'node:child_process';
const children=[spawn('npm',['run','dev:server'],{stdio:'inherit'}),spawn('npm',['run','dev:client'],{stdio:'inherit'})];
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const p of children)p.kill(signal);process.exit();});
