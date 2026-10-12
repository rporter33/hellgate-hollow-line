import assert from 'node:assert/strict';
import test from 'node:test';
import {WebSocketServer,WebSocket} from 'ws';
import {latencyProxy} from './latency';

test('jitter and reliable stalls preserve frame order in both directions',async()=>{
 const server=new WebSocketServer({port:0});await new Promise<void>(r=>server.once('listening',r));
 const upstream:number[]=[],downstream:number[]=[],count=512;
 server.on('connection',socket=>socket.on('message',data=>{upstream.push(Number(data.toString()));socket.send(data);}));
 const stop=await latencyProxy(0,(server.address() as {port:number}).port);
 const client=new WebSocket(`ws://127.0.0.1:${stop.port}`);
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  await new Promise<void>((resolve,reject)=>{client.once('open',resolve);client.once('error',reject);});
  const received=new Promise<void>((resolve,reject)=>{
   timeout=setTimeout(()=>reject(new Error('Ordered transport timed out')),10000);
   client.on('message',data=>{downstream.push(Number(data.toString()));if(downstream.length===count)resolve();});
  });
  for(let i=0;i<count;i++){client.send(String(i));if(i%7===0)await new Promise(r=>setTimeout(r,1));}
  await received;
  const expected=Array.from({length:count},(_,i)=>i);
  assert.deepEqual(upstream,expected,'client-to-server frames reordered');
  assert.deepEqual(downstream,expected,'server-to-client frames reordered');
 }finally{if(timeout)clearTimeout(timeout);client.terminate();await stop();await new Promise<void>(r=>server.close(()=>r()));}
});
