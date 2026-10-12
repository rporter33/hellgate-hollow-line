import {ZONES,ENEMIES,obstacles} from '../packages/shared/src/content';
import {idleInput} from '../packages/shared/src/protocol';
import {distance,angleDiff,obstruction} from '../packages/shared/src/math';
import {waypoint,escapeHazards} from '../packages/shared/src/navigation';
export function botInput(state:any,p:any,sequence:number,crypt=false,latencySeconds=0){
 const i={...idleInput(),seq:sequence,rev:state.revision};const now=state.time;
 if(p.status!=='standing')return i;
 const broken=new Set<string>(state.broken.keys());
 if(state.cleared){
  if(crypt&&state.stage===2){const goal={x:9,z:-5},wall={x:9,z:-7},next=waypoint(p,goal,state.stage,broken,.4),aim=Math.atan2(wall.x-p.x,-(wall.z-p.z)),movement=Math.atan2(next.x-p.x,-(next.z-p.z)),delta=angleDiff(movement,aim);i.yaw=aim;i.primary=!broken.has('crypt_wall');i.mx=distance(p,goal)>1?Math.sin(delta):0;i.mz=distance(p,goal)>1?Math.cos(delta):0;i.interact=broken.has('crypt_wall')&&distance(p,wall)<3;return i;}
  const goal={x:0,z:-ZONES[state.stage].depth/2+2};const next=waypoint(p,goal,state.stage,broken,.4);i.yaw=Math.atan2(next.x-p.x,-(next.z-p.z));i.mz=distance(p,goal)>1?1:0;i.interact=distance(p,goal)<2;return i;}
 const ally=[...state.players.values()].find((v:any)=>v.id!==p.id&&v.status==='downed'&&distance(v,p)<2.5) as any;if(ally){i.interact=true;return i;}
 const enemies=[...state.enemies.values()] as any[];
 const target=enemies.sort((a,b)=>(a.kind==='breach_cantor'?-10:0)+distance(p,a)-(b.kind==='breach_cantor'?-10:0)-distance(p,b))[0];if(!target)return i;
 const dist=distance(p,target);i.yaw=Math.atan2(target.x-p.x,-(target.z-p.z));i.pitch=target.kind==='bellwether'?Math.atan2(2.1-1.25,dist):target.kind==='carrion_runner'?-.025:.015;
 if(p.hp<p.maxHp*.6&&p.medkits)i.edges.push('medkit');
 const danger=enemies.find(e=>(e.action==='tell'||e.action==='sweep_tell'||e.action==='strike_tell')&&distance(p,e)<6&&e.actionEnd-now<.19+Math.min(.1,latencySeconds));
 const ring=[...state.effects.values()].find((f:any)=>f.kind==='boss_ring'&&distance(f,p)-(now-f.start)/(f.end-f.start)*f.radius<2.5&&distance(f,p)-(now-f.start)/(f.end-f.start)*f.radius>-.5)as any;
 if(danger&&now>=p.dodge){i.edges.push('dodge');i.mx=1;}
 i.primary=true;
 if(now>=p.signature&&dist<12)i.edges.push('signature');
 if(p.classId==='marksman'){i.mx=i.mx||.55;if(target.kind==='ironbound_bulwark'&&p.ammo>=4){i.secondary=Math.floor(now*10)%16<8;i.primary=!i.secondary;}if(dist<5)i.mz=-1;else if(dist>20)i.mz=1;}
 if(p.classId==='blademaster'){if(dist>2){const next=waypoint(p,target,state.stage,broken,.4);const movementYaw=Math.atan2(next.x-p.x,-(next.z-p.z));const delta=angleDiff(movementYaw,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);}if(p.resource>=55)i.secondary=true;}
 if(p.classId==='evoker'){i.mx=i.mx||.65;if(dist<12&&p.resource>20&&enemies.length>1){i.secondary=Math.floor(now)%5<2;i.primary=!i.secondary;}if(p.relic==='cinder_choir'&&target.kind!=='bellwether'){if(dist>3)i.mz=1;else if(dist<2.2)i.mz=-1;}else if(dist<5)i.mz=-1;else if(dist>19)i.mz=1;}
 if(obstruction(p,target,state.stage,broken)){const next=waypoint(p,target,state.stage,broken,.4),yaw=Math.atan2(next.x-p.x,-(next.z-p.z)),delta=angleDiff(yaw,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);}
 const strikes=[...state.effects.values()].filter((f:any)=>f.kind==='ground_strike')as any[];
 if(strikes.some(f=>distance(p,f)<f.radius+.5)){const outward=escapeHazards(p,strikes,i.yaw,state.stage,broken),delta=angleDiff(outward,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);i.secondary=false;}
 const ringing=enemies.find(e=>e.action==='ring_tell'&&e.actionEnd-now+distance(e,p)/(20/2.2)<.19+Math.min(.15,latencySeconds));
 const incomingRing=ring||ringing;
 if(incomingRing&&now>=p.dodge){const towards=Math.atan2(incomingRing.x-p.x,-(incomingRing.z-p.z)),delta=angleDiff(towards,i.yaw);i.mx=Math.sin(delta);i.mz=Math.cos(delta);i.edges=i.edges.filter(e=>e!=='dodge');i.edges.push('dodge');}
 return i;
}
