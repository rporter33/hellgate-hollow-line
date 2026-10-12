import {appendFileSync,readFileSync} from 'node:fs';
const url=new URL(process.argv[2]);if(url.protocol!=='https:')throw new Error('A deployed HTTPS backend is required.');
const health=await fetch(new URL('/health',url),{signal:AbortSignal.timeout(20000)});if(!health.ok)throw new Error('Backend health failed.');
const result=await health.json(),content=readFileSync('packages/shared/src/content.ts','utf8');
const protocol=content.match(/PROTOCOL = '([^']+)'/)[1],version=content.match(/CONTENT = '([^']+)'/)[1];
if(result.protocol!==protocol||result.content!==version)throw new Error('Backend and client build versions do not match.');
const endpoint=url.origin.replace(/^https:/,'wss:');
if(process.env.GITHUB_ENV)appendFileSync(process.env.GITHUB_ENV,`VITE_GAME_SERVER_URL=${endpoint}\n`);
console.log('Matching backend is healthy:',url.origin);
