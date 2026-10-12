import {ARMOR_SLOTS,ENEMIES,type Item,RELICS} from '../../../packages/shared/src/content';
import {idleInput} from '../../../packages/shared/src/protocol';
import {distance,angleDiff,obstruction} from '../../../packages/shared/src/math';
import {waypoint,escapeHazards} from '../../../packages/shared/src/navigation';
import type {ActorState} from '../../../packages/shared/src/schema';
import type {Game} from './Game';
const score=(item:Item)=>({common:0,magic:10,rare:20,legendary:30}[item.rarity]+item.affixes.reduce((n,a)=>n+a.value*(a.id==='savage'?100:a.id==='rapid'?80:a.id==='resolute'?1:40),0));
export function companionInput(g:Game,p:ActorState){
 const s=g.s,now=s.time,i={...idleInput(),seq:p.ack+1,rev:s.revision},data=g.pd.get(p.id)!,inv=data.inventory;
 if(p.status!=='standing'||s.phase!=='play')return i;
 // Companions use the same validated inventory operations as humans.
 if(s.cleared){for(const slot of ['weapon',...ARMOR_SLOTS] as const){const best=inv.bag.filter(a=>a.slot===slot).sort((a,b)=>score(b)-score(a))[0];if(best&&score(best)>score(inv.equipment[slot]))g.inventory(p.id,{op:'equip',id:best.id});}
  if(inv.rewards.includes('relic_choice')&&!inv.chosenRelic){const relic=RELICS.find(r=>r.classId===p.classId&&(p.classId!=='evoker'||r.id==='event_horizon'))!;g.inventory(p.id,{op:'choose_relic',id:relic.id});}
  if(inv.rewards.includes('crypt_mod_choice')&&!inv.rewards.includes('crypt_mod_chosen'))g.inventory(p.id,{op:'choose_mod',id:'blood_seal'});
  const mod=inv.bag.find(a=>a.slot==='mod');if(mod&&!p.mod)g.inventory(p.id,{op:'socket',id:mod.id});
  const drop=inv.drops.find(d=>distance(p,d)<2.5);if(drop&&inv.bag.length<12)g.inventory(p.id,{op:'pickup',id:drop.id});
 }
 if(p.hp<p.maxHp*.6&&p.medkits)i.edges.push('medkit');
 const broken=new Set(s.broken.keys());
 const revivable=[...s.players.values()].filter(a=>a.id!==p.id&&a.status==='downed').sort((a,b)=>(a.kind==='companion'?10:0)+distance(p,a)-(b.kind==='companion'?10:0)-distance(p,b))[0];
 if(revivable){if(distance(p,revivable)<2.3){i.interact=true;return i;}const next=waypoint(p,revivable,s.stage,broken,.4);i.yaw=Math.atan2(next.x-p.x,-(next.z-p.z));i.mz=1;return i;}
 const leader=s.players.get(s.leader)||[...s.players.values()].find(v=>v.kind==='player'&&v.connected);
 if(s.cleared||!s.enemies.size){if(leader&&distance(p,leader)>3){const next=waypoint(p,leader,s.stage,broken,.4);i.yaw=Math.atan2(next.x-p.x,-(next.z-p.z));i.mz=1;}return i;}
 const enemies=[...s.enemies.values()],target=enemies.sort((a,b)=>(a.kind==='breach_cantor'?-8:0)+distance(p,a)-(b.kind==='breach_cantor'?-8:0)-distance(p,b))[0];
 const dist=distance(p,target);i.yaw=Math.atan2(target.x-p.x,-(target.z-p.z));i.pitch=target.kind==='bellwether'?Math.atan2(.85,dist):target.kind==='carrion_runner'?-.025:.015;
 const danger=enemies.find(e=>(e.action==='tell'||e.action==='sweep_tell'||e.action==='strike_tell')&&distance(p,e)<6&&e.actionEnd-now<.19);
 const ring=[...s.effects.values()].find(f=>f.kind==='boss_ring'&&distance(f,p)-(now-f.start)/(f.end-f.start)*f.radius<2.5&&distance(f,p)-(now-f.start)/(f.end-f.start)*f.radius>-.5);
 if(danger&&now>=p.dodge){i.edges.push('dodge');i.mx=1;}
 if(now>=p.signature&&dist<12)i.edges.push('signature');i.primary=true;
 if(p.classId==='blademaster'){
  if(dist>2){const next=waypoint(p,target,s.stage,broken,.4),yaw=Math.atan2(next.x-p.x,-(next.z-p.z)),delta=angleDiff(yaw,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);}if(p.resource>=55)i.secondary=true;
 }else {
  i.mx=i.mx||.6;if(dist<5)i.mz=-1;else if(dist>18)i.mz=1;
  if(p.classId==='marksman'&&target.kind==='ironbound_bulwark'&&p.ammo>=4){i.secondary=Math.floor(now*10)%16<8;i.primary=!i.secondary;}
  if(p.classId==='evoker'&&dist<12&&p.resource>20&&enemies.length>1){i.secondary=Math.floor(now)%5<2;i.primary=!i.secondary;}
 }
 if(obstruction(p,target,s.stage,broken)){const next=waypoint(p,target,s.stage,broken,.4),yaw=Math.atan2(next.x-p.x,-(next.z-p.z)),delta=angleDiff(yaw,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);}
 const strikes=[...s.effects.values()].filter(f=>f.kind==='ground_strike');
 if(strikes.some(f=>distance(p,f)<f.radius+.5)){const outward=escapeHazards(p,strikes,i.yaw,s.stage,broken),delta=angleDiff(outward,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);i.secondary=false;}
 const ringing=enemies.find(e=>e.action==='ring_tell'&&e.actionEnd-now+distance(e,p)/(20/2.2)<.19);
 const incomingRing=ring||ringing;
 if(incomingRing&&now>=p.dodge){const towards=Math.atan2(incomingRing.x-p.x,-(incomingRing.z-p.z)),delta=angleDiff(towards,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);i.edges=i.edges.filter(e=>e!=='dodge');i.edges.push('dodge');}
 return i;
}
