import assert from 'node:assert/strict';
import {Client} from 'colyseus.js';
import {matchMaker} from '@colyseus/core';
import {PROTOCOL,CONTENT} from '../packages/shared/src/content';
import {idleInput} from '../packages/shared/src/protocol';
import type {ExpeditionRoom} from '../apps/server/src/ExpeditionRoom';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));process.env.HOLLOW_TEST='1';const{startServer}=await import('../apps/server/src/index');const{server}=await startServer(2572);
const sdk=new Client('ws://127.0.0.1:2572'),options={protocol:PROTOCOL,content:CONTENT,name:'Recovery tester',classId:'marksman'};
try{
 await assert.rejects(sdk.create('expedition',{...options,content:'incompatible'}));
 const a=await sdk.create('expedition',options),b=await sdk.joinById(a.roomId,options);let personal:any;
 for(const r of [a,b]){r.onMessage('event',()=>{});r.onMessage('personal',v=>{if(r===b)personal=v;});r.send('personal');r.send('lobby',{ready:true});}
 await delay(100);a.send('start');await delay(150);await assert.rejects(sdk.joinById(a.roomId,options));
 const authority=matchMaker.getLocalRoomById(a.roomId)as ExpeditionRoom;
 // Arrange a specific recovery snapshot through normal server systems.
 authority.game.enter(5);const boss=[...authority.state.enemies.values()][0];authority.game.hitEnemy(boss,{owner:a.sessionId,damage:boss.hp*.51,primary:false,guard:true,kind:'execution',attack:'fixture'});authority.game.hitCover('platform_cover_1_1',100,a.sessionId);
 const pb=authority.state.players.get(b.sessionId)!;const weapon=authority.game.rollItem(pb,'weapon','rare');authority.game.give(pb,weapon);await delay(100);b.send('inventory',{op:'equip',id:weapon.id,rev:authority.state.revision});await delay(100);
 const bToken=b.reconnectionToken,bId=b.sessionId;b.connection.close();await delay(200);const c=await sdk.reconnect(bToken);c.onMessage('event',()=>{});c.onMessage('personal',v=>personal=v);c.send('personal');await delay(200);
 assert.equal(c.sessionId,bId);assert.equal(c.state.players.size,2);assert.equal(personal.equipment.weapon.id,weapon.id);assert.ok(c.state.broken.has('platform_cover_1_1'));assert.equal([...c.state.enemies.values()].find((e:any)=>e.kind==='bellwether').phase,2);
 await a.leave();await delay(150);assert.equal(c.state.leader,c.sessionId);assert.equal(c.state.partySize,2);assert.equal(c.state.players.size,1);
 const token=c.reconnectionToken;c.connection.close();await delay(200);const frozen=authority.state.time;await delay(350);assert.equal(authority.state.time,frozen);
 const d=await sdk.reconnect(token);d.onMessage('event',()=>{});d.onMessage('personal',()=>{});await delay(150);assert.equal(d.state.players.size,1);assert.ok(d.state.broken.has('platform_cover_1_1'));
 const expired=d.reconnectionToken;d.connection.close();console.log('Recovery checks passed; observing the actual 60-second grace expiry…');await delay(61000);await assert.rejects(sdk.reconnect(expired));
 console.log('PASS: protocol rejection, fresh join rejection, gear + broken cover + boss-phase reconnect, leader transfer, all-disconnected freeze, and real 60-second expiry.');
}finally{await server.gracefullyShutdown(false);}
