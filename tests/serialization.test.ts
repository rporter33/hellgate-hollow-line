import assert from 'node:assert/strict';
import test from 'node:test';
import {Encoder,Decoder} from '@colyseus/schema';
import {WorldState,ActorState} from '../packages/shared/src/schema';
import {Game} from '../apps/server/src/Game';
import {botInput} from './bot';
import {RELICS,type ClassId} from '../packages/shared/src/content';

test('full combat patches retain valid references through kills, transitions and replay',()=>{
 const issues:string[]=[],original=console.error;console.error=(...args:any[])=>{issues.push(String(args[0]));};
 try{for(const roster of [['blademaster'],['marksman','evoker'],['blademaster','marksman','evoker']]as ClassId[][]){
  const s=new WorldState(),g=new Game(s);s.leader='p0';for(const[n,classId]of roster.entries()){const p=new ActorState();p.id=`p${n}`;p.classId=classId;p.ready=true;g.addPlayer(p);}
  const encoder=new Encoder(s),decoder=new Decoder(new WorldState());decoder.decode(encoder.encodeAll());encoder.discardChanges();g.start('p0');
  for(let t=0;t<25000&&s.phase==='play';t++){
   for(const p of s.players.values()){const inv=g.pd.get(p.id)!.inventory;if(inv.rewards.includes('relic_choice')&&!inv.chosenRelic)g.inventory(p.id,{op:'choose_relic',id:RELICS.find(r=>r.classId===p.classId)!.id});g.accept(p.id,botInput(s,p,p.ack+1));}g.step();
   if(t%3===0){decoder.decode(encoder.encode());encoder.discardChanges();assert.deepEqual([...decoder.state.enemies.keys()],[...s.enemies.keys()]);}
  }
  decoder.decode(encoder.encode());encoder.discardChanges();assert.equal(s.phase,'debrief');assert.equal(decoder.state.phase,'debrief');g.replay('p0');decoder.decode(encoder.encode());encoder.discardChanges();assert.equal(decoder.state.enemies.size,0);
 }}finally{console.error=original;}assert.deepEqual(issues,[]);
});
