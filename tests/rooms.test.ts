import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from 'colyseus.js';
import {PROTOCOL,CONTENT} from '../packages/shared/src/content';
import {idleInput} from '../packages/shared/src/protocol';
import {matchMaker} from '@colyseus/core';
import type {ExpeditionRoom} from '../apps/server/src/ExpeditionRoom';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('M0: three live clients share movement, destruction, capacity and reconnect',async()=>{
 process.env.HOLLOW_TEST='1';const {startServer}=await import('../apps/server/src/index');const {server}=await startServer(2568);
 const sdk=new Client('ws://127.0.0.1:2568'),options={protocol:PROTOCOL,content:CONTENT,name:'Network tester',classId:'marksman'};
 const a=await sdk.create('expedition',options),b=await sdk.joinById(a.roomId,options),c=await sdk.joinById(a.roomId,options);
 try {
  await delay(200);assert.equal(a.state.players.size,3);assert.equal(b.state.players.size,3);assert.equal(c.state.players.size,3);
  await assert.rejects(sdk.joinById(a.roomId,options));
  const original=a.state.players.get(a.sessionId).x;
  let seq=0,held:any={mx:1};const heartbeat=setInterval(()=>a.send('input',{...idleInput(),seq:++seq,rev:a.state.revision,...held}),34);await delay(300);
  held={primary:true,yaw:0};await delay(1700);
  // Stop moving, face the wall from the updated x coordinate.
  const self=a.state.players.get(a.sessionId);const yaw=Math.atan2(-self.x,self.z+4);
  held={primary:true,yaw};await delay(1200);clearInterval(heartbeat);
  assert.notEqual(a.state.players.get(a.sessionId).x,original);
  for(const room of [a,b,c])assert.equal(room.state.broken.has('training_wall'),true);
  assert.ok(Math.abs(b.state.players.get(a.sessionId).x-a.state.players.get(a.sessionId).x)<.01);
  const token=c.reconnectionToken,id=c.sessionId;c.connection.close();await delay(200);
  const reconnected=await sdk.reconnect(token);await delay(200);assert.equal(reconnected.sessionId,id);assert.equal(reconnected.state.players.size,3);assert.equal(reconnected.state.broken.has('training_wall'),true);
  const rooms=[a,b,reconnected],personal=new Map<string,any>();for(const r of rooms){r.onMessage('personal',v=>personal.set(r.sessionId,v));r.onMessage('event',()=>{});r.send('personal');r.send('lobby',{ready:true});}
  await delay(100);a.send('start');await delay(200);
  const seqs=new Map(rooms.map(r=>[r.sessionId,100]));
  const combat=setInterval(()=>{for(const r of rooms){const p=r.state.players.get(r.sessionId);if(!p)continue;const enemies=[...r.state.enemies.values()] as any[];const target=enemies.sort((x,y)=>Math.hypot(x.x-p.x,x.z-p.z)-Math.hypot(y.x-p.x,y.z-p.z))[0];const edges=[];if(p.hp<p.maxHp*.6&&p.medkits)edges.push('medkit');if(target?.action==='tell'&&r.state.time>=p.dodge)edges.push('dodge');r.send('input',{...idleInput(),seq:seqs.get(r.sessionId)!+1,rev:r.state.revision,primary:!!target,yaw:target?Math.atan2(target.x-p.x,-(target.z-p.z)):0,mz:target&&Math.hypot(target.x-p.x,target.z-p.z)<4?-1:0,edges});seqs.set(r.sessionId,seqs.get(r.sessionId)!+1);}},34);
  const deadline=Date.now()+45000;while(!a.state.cleared&&a.state.phase!=='wipe'&&Date.now()<deadline)await delay(100);
  clearInterval(combat);assert.equal(a.state.phase,'play');assert.equal(a.state.cleared,true);await delay(100);
  assert.equal(a.state.enemies.size,0);assert.equal(b.state.enemies.size,0);assert.equal(reconnected.state.enemies.size,0);for(const r of rooms)assert.ok(personal.get(r.sessionId).bag.some((x:any)=>x.rarity==='magic'));
  const authority=matchMaker.getLocalRoomById(a.roomId) as ExpeditionRoom;
  // Recovery setup uses the real damage pipeline; revive and retry use network commands.
  const pa=authority.state.players.get(a.sessionId)!,pb=authority.state.players.get(b.sessionId)!;pa.x=pb.x=0;pa.z=pb.z=8;authority.game.damagePlayer(pa,999);
  const revive2=setInterval(()=>{const n=seqs.get(b.sessionId)!+1;seqs.set(b.sessionId,n);b.send('input',{...idleInput(),seq:n,rev:b.state.revision,interact:true});},34);
  await delay(3300);clearInterval(revive2);assert.equal(a.state.players.get(a.sessionId).status,'standing');
  for(const p of authority.state.players.values()){authority.game.pd.get(p.id)!.invUntil=0;authority.game.damagePlayer(p,999);}await delay(3300);assert.equal(a.state.phase,'wipe');const previous=a.state.revision;a.send('retry');await delay(200);assert.ok(a.state.revision>previous);assert.equal(a.state.phase,'play');for(const r of rooms)assert.equal(personal.get(r.sessionId).bag.length,0);
  console.log('PASS: 3 actual clients killed both combat waves, received personal loot, revived and retried with loot rewind.');
  await a.leave();await delay(150);assert.equal(b.state.players.size,2);assert.equal(b.state.leader,b.sessionId);
  await reconnected.leave();
  console.log('PASS: 3 actual WebSocket clients; shared movement + broken wall; fourth rejected; reconnect same avatar; leader exit survives.');
 } finally {await b.leave();await server.gracefullyShutdown(false);}
});
