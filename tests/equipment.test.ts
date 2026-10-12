import assert from 'node:assert/strict';
import test from 'node:test';
import {ARMOR_SLOTS,ARMOR_SHARE,CLASSES} from '../packages/shared/src/content';
import {ActorState,WorldState} from '../packages/shared/src/schema';
import {Game} from '../apps/server/src/Game';
import {character,dress} from '../apps/client/src/characters';
import {botInput} from './bot';
import {companionInput} from '../apps/server/src/Companion';

test('melee agents react to ring windup before a delayed ring snapshot arrives',()=>{
 const s=new WorldState(),g=new Game(s),p=new ActorState();p.id='warden';p.classId='blademaster';g.addPlayer(p);
 s.phase='play';s.stage=5;s.time=10;p.x=.4;p.z=0;p.dodge=0;
 const boss=g.spawnEnemy('bellwether',0,0);boss.action='ring_tell';boss.actionEnd=10.1;
 assert.equal(s.effects.size,0);
 assert.ok(botInput(s,p,1,false,.1).edges.includes('dodge'));
 assert.ok(companionInput(g,p).edges.includes('dodge'));
 p.dodge=11;
 assert.equal(botInput(s,p,2,false,.1).edges.includes('dodge'),false);
});

test('independent armor preserves other slots, health, ownership and checkpoint state',()=>{
 const s=new WorldState(),g=new Game(s),p=new ActorState(),other=new ActorState();
 p.id='warden';other.id='other';g.addPlayer(p);g.addPlayer(other);s.leader=p.id;p.ready=other.ready=true;g.start(p.id);
 const inv=g.pd.get(p.id)!.inventory,original=structuredClone(inv.equipment);
 p.hp=50;
 for(const slot of ARMOR_SLOTS){
  const item=g.rollItem(p,slot,'rare');g.give(p,item);
  assert.equal(g.inventory(other.id,{op:'equip',id:item.id}),false);
  assert.equal(g.inventory(p.id,{op:'equip',id:item.id}),true);
  assert.equal(inv.equipment[slot].id,item.id);
  assert.equal(inv.bag.filter(i=>i.id===original[slot].id).length,1);
  assert.equal(g.inventory(p.id,{op:'equip',id:item.id}),false);
  assert.equal(p.hp,50);
  assert.ok(p[`${slot}Look`].startsWith('rare:'));
 }
 const firstHelmet=inv.equipment.helmet.id,otherSlots=ARMOR_SLOTS.filter(slot=>slot!=='helmet').map(slot=>inv.equipment[slot].id);
 const replacement=g.rollItem(p,'helmet','magic');g.give(p,replacement);g.inventory(p.id,{op:'equip',id:replacement.id});
 assert.deepEqual(ARMOR_SLOTS.filter(slot=>slot!=='helmet').map(slot=>inv.equipment[slot].id),otherSlots);
 assert.equal(inv.bag.filter(i=>i.id===firstHelmet).length,1);
 const hpBonus=Object.values(inv.equipment).flatMap(i=>i?.affixes||[]).filter(a=>a.id==='resolute').reduce((n,a)=>n+a.value,0);
 assert.equal(p.maxHp,CLASSES.marksman.hp+hpBonus);
 s.phase='wipe';assert.equal(g.retry(p.id),true);
 assert.deepEqual(g.pd.get(p.id)!.inventory.equipment,original);
 for(const slot of ARMOR_SLOTS)assert.equal(p[`${slot}Look`],'common:');
});

test('armor rolls keep the original total affix budget across four slots',()=>{
 const s=new WorldState(),g=new Game(s),p=new ActorState();p.id='warden';g.addPlayer(p);
 for(const slot of ARMOR_SLOTS)for(let i=0;i<40;i++){
  const item=g.rollItem(p,slot,'rare');assert.equal(item.slot,slot);
  assert.equal(new Set(item.affixes.map(a=>a.id)).size,2);
  for(const a of item.affixes)if(a.id==='resolute')assert.ok(a.value>=15*ARMOR_SHARE[slot]&&a.value<=25*ARMOR_SHARE[slot]);
 }
});

test('a helmet swap rebuilds only the helmet on the visible rig',()=>{
 const rig=character('marksman');
 const before=rig.getObjectByName('armor_helmet'),chest=rig.getObjectByName('armor_chest'),arms=rig.getObjectByName('armor_arms_shoulderL'),legs=rig.getObjectByName('armor_legs_greaveL');
 dress(rig,{helmetLook:'rare:plated',chestLook:'common:',armsLook:'common:',legsLook:'common:',weaponLook:'common:',relic:'',mod:''});
 assert.notEqual(rig.getObjectByName('armor_helmet'),before);
 assert.equal(rig.getObjectByName('armor_chest'),chest);
 assert.equal(rig.getObjectByName('armor_arms_shoulderL'),arms);
 assert.equal(rig.getObjectByName('armor_legs_greaveL'),legs);
});
