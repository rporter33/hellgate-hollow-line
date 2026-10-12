import test from 'node:test';
import assert from 'node:assert/strict';
import {ActorState,WorldState} from '../packages/shared/src/schema';
import {obstacles,PROTOCOL,CONTENT,ARMOR_SLOTS,type PrivateState} from '../packages/shared/src/content';
import {unsupportedBlocks} from '../packages/shared/src/architecture';
import {move,obstruction,rayBox3} from '../packages/shared/src/math';
import {idleInput} from '../packages/shared/src/protocol';
import {Game} from '../apps/server/src/Game';
import {Client} from 'colyseus.js';
import {matchMaker} from '@colyseus/core';
import type {ExpeditionRoom} from '../apps/server/src/ExpeditionRoom';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));

test('masonry needs the correct power; upper blocks never obstruct a ground-level ray',()=>{
 const s=new WorldState(),g=new Game(s),p=new ActorState();p.id='p';g.addPlayer(p);s.stage=1;
 const stone=obstacles(1).find(b=>b.id==='strand_east_0_front_2_0')!;
 g.hitCover(stone.id,1000,p.id,1);assert.equal(s.broken.has(stone.id),false);assert.equal(s.coverHealth.has(stone.id),false);
 g.hitCover(stone.id,40,p.id,3);assert.equal(s.coverHealth.get(stone.id),30);g.hitCover(stone.id,40,p.id,3);assert.equal(s.broken.has(stone.id),true);
 const high=obstacles(1).find(b=>b.id==='strand_east_0_front_2_8')!;assert.equal(rayBox3(9,1.25,-11,1,0,0,high),Infinity);
 const point={x:10,z:-11};move(point,4,0,1,new Set(s.broken.keys()));assert.ok(point.x<12,'remaining head-height block must still stop movement');
 for(const b of obstacles(1))if(b.building===stone.building&&b.chunk===stone.chunk&&b.finish!=='floor')g.breakBlock(b);
 move(point,4,0,1,new Set(s.broken.keys()));assert.ok(point.x>12.6);assert.equal(obstruction({x:9,z:-11},{x:14,z:-11},1,new Set(s.broken.keys())),false);
});

test('buildings start supported; broad footing loss warns before bounded local collapse',()=>{
 const s=new WorldState(),g=new Game(s),p=new ActorState();p.id='p';g.addPlayer(p);s.stage=1;
 const blocks=obstacles(1).filter(b=>b.building==='strand_west_0');assert.equal(unsupportedBlocks(blocks,new Set()).length,0);
 for(const b of blocks.filter(b=>b.id.includes('_front_')&&(b.y||0)<3))g.hitCover(b.id,999,p.id,3);
 const before=s.broken.size;g.structureStep();assert.ok(g.collapses.size>0);assert.ok([...s.effects.values()].some(f=>f.kind==='collapse_warning'));assert.equal(s.broken.size,before);
 s.time=.9;g.structureStep();assert.equal(s.broken.size,before);s.time=1.1;g.structureStep();assert.ok(s.broken.size>before);assert.ok(s.broken.size-before<=8);
 for(let i=0;i<50;i++){s.time+=1/30;g.structureStep();g.effectStep();}assert.equal(g.collapses.size,0);assert.equal(unsupportedBlocks(blocks,new Set(s.broken.keys())).length,0);
});

test('three actual clients share charged-shot masonry collapse, gear appearance and recovery',async()=>{
 process.env.HOLLOW_TEST='1';const{startServer}=await import('../apps/server/src/index');const{server}=await startServer(2571);
 const sdk=new Client('ws://127.0.0.1:2571'),options={protocol:PROTOCOL,content:CONTENT,name:'Masonry tester',classId:'marksman'},a=await sdk.create('expedition',options),b=await sdk.joinById(a.roomId,options),c=await sdk.joinById(a.roomId,options);let current=c;const rooms=[a,b,c];let interval:ReturnType<typeof setInterval>|undefined;
 try{
  for(const r of rooms){r.onMessage('event',()=>{});r.onMessage('personal',()=>{});r.send('lobby',{ready:true});}await delay(250);a.send('start');await delay(200);
  const authority=matchMaker.getLocalRoomById(a.roomId)as ExpeditionRoom;authority.state.enemies.clear();authority.game.ed.clear();authority.game.waveQueue=[];authority.state.cleared=true;
  const player=authority.state.players.get(a.sessionId)!;player.x=9;player.z=-11;let seq=0,held:any={primary:true,yaw:Math.PI/2};
  interval=setInterval(()=>a.send('input',{...idleInput(),seq:++seq,rev:a.state.revision,...held}),34);await delay(650);
  const stone='strand_east_0_front_2_0';assert.equal(a.state.broken.has(stone),false);
  held={secondary:true,yaw:Math.PI/2};await delay(750);held={yaw:Math.PI/2};await delay(250);
  for(const r of rooms)assert.equal(r.state.broken.has(stone),true);assert.ok([...a.state.effects.values()].some((f:any)=>f.kind==='collapse_warning'));
  await delay(2200);for(const r of rooms)assert.deepEqual([...r.state.broken.keys()],[...a.state.broken.keys()]);assert.ok(a.state.broken.size>6);
  held={yaw:Math.PI/2,mz:1};await delay(850);held={yaw:Math.PI/2};await delay(150);assert.ok(a.state.players.get(a.sessionId).x>12.6,'player crosses the hole created by the shot and collapse');
  const pc=authority.state.players.get(c.sessionId)!,equipmentIds:Record<string,string>={};
  for(const [index,slot]of ARMOR_SLOTS.entries()){
   const item=authority.game.rollItem(pc,slot,'rare');equipmentIds[slot]=item.id;authority.game.give(pc,item);await delay(80);c.send('inventory',{op:'equip',id:item.id,rev:c.state.revision});await delay(120);
   for(const r of rooms)for(const [n,otherSlot]of ARMOR_SLOTS.entries())assert.ok(r.state.players.get(c.sessionId)[`${otherSlot}Look`].startsWith(n<=index?'rare:':'common:'));
  }
  const token=c.reconnectionToken,id=c.sessionId;c.connection.close();await delay(200);current=await sdk.reconnect(token);current.onMessage('event',()=>{});let recovered:PrivateState|undefined;current.onMessage('personal',(v:PrivateState)=>recovered=v);current.send('personal');await delay(200);assert.equal(current.sessionId,id);assert.deepEqual([...current.state.broken.keys()],[...a.state.broken.keys()]);
  for(const slot of ARMOR_SLOTS){assert.ok(current.state.players.get(id)[`${slot}Look`].startsWith('rare:'));assert.equal(recovered!.equipment[slot].id,equipmentIds[slot]);}
  clearInterval(interval);interval=undefined;authority.state.phase='wipe';a.send('retry');await delay(200);for(const r of [a,b,current]){assert.equal(r.state.broken.has(stone),false);for(const slot of ARMOR_SLOTS)assert.ok(r.state.players.get(id)[`${slot}Look`].startsWith('common:'));}
 }finally{if(interval)clearInterval(interval);await Promise.all([a,b,current].map(r=>r.leave()));await server.gracefullyShutdown(false);}
});
