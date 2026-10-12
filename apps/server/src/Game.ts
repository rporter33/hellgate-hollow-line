import {ActorState,EffectState,WorldState} from '../../../packages/shared/src/schema';
import {CLASSES,ENEMIES,SCALING,ZONES,obstacles,obstacleById,RELICS,MODS,AFFIXES,type ClassId,type EnemyId,type Item,type PrivateState,type Box} from '../../../packages/shared/src/content';
import {unsupportedBlocks} from '../../../packages/shared/src/architecture';
import {idleInput,parseInput,type Input} from '../../../packages/shared/src/protocol';
import {move,distance,obstruction,rayBox,rayBox3,rayCandidates,sphereBox,walkBlocking,angleDiff,clamp,rng,hash,segmentDistance} from '../../../packages/shared/src/math';
import {waypoint} from '../../../packages/shared/src/navigation';
import {companionInput} from './Companion';
const DT=1/30;
type Stats={damage:number;rate:number;speed:number;cooldown:number;hp:number;armor:number};
type PlayerData={input:Input;inputAt:number;inventory:PrivateState;roll:number;nextAttack:number;nextSecondary:number;lastHit:number;lastPrimary:number;combo:number;invUntil:number;dashUntil:number;dx:number;dz:number;charge:number;secondaryWas:boolean;arcCount:number;arcAttacks:Set<string>;reviveTarget:string;reviveStart:number;reviveX:number;reviveZ:number;lastDamage:number;pingAt:number;medkitAt:number;stats:Stats;lunge?:{end:number;dx:number;dz:number;hit:boolean;trail:string}};
type EnemyData={next:number;guards:number[];lastGuard:number;attack:number;target:string;adds:boolean;hits:Set<string>;fromX:number;fromZ:number;lastX:number;lastZ:number;pathAt:number;nx:number;nz:number};
type Source={owner:string;damage:number;primary:boolean;guard:boolean;kind:string;attack:string;weak?:boolean;weakMult?:number;plate?:'left'|'right'};
type EffectData={source?:Source;hits:Set<string>;vx:number;vz:number;vy:number;remaining:number;height:number;target?:string;detonate?:boolean};
type Checkpoint={stage:number;broken:[string,number][];cover:[string,number][];players:Record<string,{inventory:PrivateState;roll:number}>};
export class Game {
 pd=new Map<string,PlayerData>();ed=new Map<string,EnemyData>();fd=new Map<string,EffectData>();checkpoint?:Checkpoint;
 uid=0;waveQueue:EnemyId[]=[];nextWave=0;wipeAt=0;runStart=0;cryptDone=false;startParty=1;tickCost:number[]=[];
 dirtyBuildings=new Set<string>();collapses=new Map<string,{at:number;blocks:Box[];hits:Set<string>}>();
 constructor(public s:WorldState,public sendPrivate:(id:string,v:PrivateState)=>void=()=>{},public event:(v:any)=>void=()=>{}){}
 addPlayer(p:ActorState){if(!p.kind)p.kind='player';this.s.players.set(p.id,p);this.resetPlayer(p,true);}
 setCompanions(id:string,count:number){if(id!==this.s.leader||this.s.phase!=='lobby'||!Number.isInteger(count)||count<0||count>2)return false;
  for(const p of [...this.s.players.values()])if(p.kind==='companion')this.removePlayer(p.id);
  const humanClasses=[...this.s.players.values()].map(p=>p.classId),classes=(['marksman','evoker','blademaster'] as ClassId[]).sort((a,b)=>Number(humanClasses.includes(a))-Number(humanClasses.includes(b)));
  const limit=Math.min(count,3-this.s.players.size);for(let i=0;i<limit;i++){const p=new ActorState();p.id=this.id('companion');p.kind='companion';p.name=['Ash · AI','Morrow · AI'][i];p.classId=classes[i];p.ready=true;p.connected=true;p.x=(i+1)*2;p.z=6;this.addPlayer(p);}return true;
 }
 removePlayer(id:string){this.s.players.delete(id);this.pd.delete(id);}
 resetPlayer(p:ActorState,fresh=false){
  const c=CLASSES[p.classId as ClassId];let inv=this.pd.get(p.id)?.inventory;
  if(fresh||!inv){inv={bag:[],equipment:{weapon:{id:this.id('item'),base:p.classId,name:c.weapon,slot:'weapon',rarity:'common',classId:p.classId as ClassId,affixes:[]},armor:{id:this.id('item'),base:'faction_armor',name:`${c.faction} armor`,slot:'armor',rarity:'common',classId:p.classId as ClassId,affixes:[]}},drops:[],rewards:[],chosenRelic:'',randomDrops:0};}
  this.pd.set(p.id,{input:idleInput(),inputAt:this.s.time,inventory:inv,roll:0,nextAttack:0,nextSecondary:0,lastHit:0,lastPrimary:0,combo:0,invUntil:0,dashUntil:0,dx:0,dz:0,charge:0,secondaryWas:false,arcCount:0,arcAttacks:new Set(),reviveTarget:'',reviveStart:0,reviveX:0,reviveZ:0,lastDamage:0,pingAt:0,medkitAt:0,stats:{damage:1,rate:1,speed:1,cooldown:1,hp:c.hp,armor:c.armor}});
  this.updateStats(p);p.hp=p.maxHp;p.resource=p.classId==='evoker'?100:0;p.ammo=24;p.medkits=2;p.status='standing';p.action='idle';p.signature=p.dodge=p.actionEnd=p.downEnd=p.revive=0;this.private(p.id);
 }
 private(id:string){const data=this.pd.get(id);if(data)this.sendPrivate(id,structuredClone(data.inventory));}
 id(prefix:string){return `${prefix}_${++this.uid}`;}
 accept(id:string,v:unknown){const p=this.s.players.get(id),d=this.pd.get(id),i=parseInput(v);if(!p||!d||!i||i.rev!==this.s.revision||i.seq<=p.ack||!p.connected)return false;
  if(i.seq<=d.input.seq)return false;i.edges=[...new Set([...d.input.edges,...i.edges])];d.input=i;d.inputAt=this.s.time;return true;
 }
 clearInput(id:string){const d=this.pd.get(id);if(d){d.input=idleInput();d.inputAt=this.s.time;d.charge=0;d.secondaryWas=false;}}
 start(id:string){if(id!==this.s.leader||this.s.phase!=='lobby'||![...this.s.players.values()].every(p=>p.ready&&p.connected))return false;
  this.s.phase='play';this.s.elapsed=0;this.startParty=this.s.players.size;this.runStart=this.s.time;this.enter(1);return true;
 }
 enter(stage:number){
  this.s.stage=stage;this.s.wave=0;this.s.cleared=false;this.s.regroup=0;this.s.destination=0;this.s.message=ZONES[stage].objective;this.s.partySize=Math.max(1,this.s.players.size);this.s.revision++;this.s.enemies.clear();this.ed.clear();this.clearEffects();this.waveQueue=[];this.nextWave=0;this.wipeAt=0;
  let n=0;for(const p of this.s.players.values()){p.x=(n++-(this.s.players.size-1)/2)*2;p.z=ZONES[stage].depth/2-4;this.clearInput(p.id);p.status='standing';p.downEnd=0;p.action='idle';p.revive=0;}
  this.checkpoint={stage,broken:[...this.s.broken.entries()],cover:[...this.s.coverHealth.entries()],players:{}};
  for(const p of this.s.players.values()){const d=this.pd.get(p.id)!;this.checkpoint.players[p.id]={inventory:structuredClone(d.inventory),roll:d.roll};}
  this.spawnWave();this.event({kind:'zone',stage});
 }
 spawnWave(){
  if(this.s.stage===5&&this.s.wave===0){this.spawnEnemy('bellwether',0,-4);this.s.wave=1;return;}
  const composition:Record<number,EnemyId[][]>={
   1:[['carrion_runner','carrion_runner','carrion_runner','carrion_runner'],['carrion_runner','carrion_runner','carrion_runner','carrion_runner','riftspitter','riftspitter']],
   2:[['carrion_runner','carrion_runner','carrion_runner','riftspitter','riftspitter','ironbound_bulwark'],['carrion_runner','carrion_runner','ironbound_bulwark']],
   3:[['carrion_runner','carrion_runner','carrion_runner','riftspitter','riftspitter','ironbound_bulwark']],
   4:[['carrion_runner','carrion_runner','carrion_runner','riftspitter','riftspitter','ironbound_bulwark','breach_cantor'],['carrion_runner','carrion_runner','carrion_runner','riftspitter','riftspitter','breach_cantor']]
  };
  const wave=composition[this.s.stage]?.[this.s.wave];if(!wave){this.clearEncounter();return;}
  this.waveQueue=[...wave,...Array(SCALING[this.s.partySize-1].runners).fill('carrion_runner')];this.fillWave();this.s.wave++;this.s.message=`${ZONES[this.s.stage].objective} · wave ${this.s.wave}`;
 }
 fillWave(){while(this.waveQueue.length&&this.s.enemies.size<12){const kind=this.waveQueue.shift()!;const n=this.s.enemies.size;const elite=(this.s.stage===3&&kind==='ironbound_bulwark')||(this.s.stage===4&&this.s.wave===0&&kind==='ironbound_bulwark')?(this.s.seed%2?'frenzied':'volatile'):'';this.spawnEnemy(kind,-7+(n%4)*4,-ZONES[this.s.stage].depth/2+4+Math.floor(n/4)*3,elite);}}
 spawnEnemy(kind:EnemyId,x:number,z:number,elite=''){
  const p=new ActorState(),base=ENEMIES[kind],scale=SCALING[this.s.partySize-1];p.id=this.id('enemy');p.name=base.name;p.kind=kind;p.x=x;p.z=z;p.hp=p.maxHp=base.hp*(kind==='bellwether'?scale.boss:scale.health)*(elite?1.3:1);p.elite=elite;p.plateL=p.plateR=kind==='bellwether'?150*scale.boss:0;p.yaw=Math.PI;p.action='idle';
  this.s.enemies.set(p.id,p);this.ed.set(p.id,{next:this.s.time+.8,guards:[],lastGuard:-10,attack:0,target:'',adds:false,hits:new Set(),fromX:x,fromZ:z,lastX:x,lastZ:z,pathAt:0,nx:x,nz:z});
  // Resolve placement against solid cover, rather than spawning inside it.
  const b=obstacles(this.s.stage).find(b=>walkBlocking(b)&&!this.s.broken.has(b.id)&&Math.abs(x-b.x)<b.w/2+base.radius&&Math.abs(z-b.z)<b.d/2+base.radius);if(b)p.x=b.x+b.w/2+base.radius+.1;
  return p;
 }
 clearEncounter(){this.s.cleared=true;this.nextWave=0;this.s.message='Breach cleared · recover your cache';
  for(const p of this.s.players.values()){if(p.status!=='standing'){p.status='standing';p.hp=p.maxHp*.4;p.z=-ZONES[this.s.stage].depth/2+4;}
   const inv=this.pd.get(p.id)!.inventory;if(this.s.stage===1&&!inv.rewards.includes('strand_weapon')){this.give(p,this.rollItem(p,'weapon','magic'));inv.rewards.push('strand_weapon');this.private(p.id);}
   if(this.s.stage===2&&!inv.rewards.includes('concourse_weapon')){this.give(p,this.rollItem(p,'weapon','rare'));inv.rewards.push('concourse_weapon','relic_choice');this.private(p.id);}
   if(this.s.stage===3&&!inv.rewards.includes('crypt_mod_choice')){inv.rewards.push('crypt_mod_choice');this.private(p.id);this.cryptDone=true;}
   if(this.s.stage===4&&!inv.rewards.includes('signal_mod')){this.give(p,this.modItem(MODS[Math.floor(this.random(p)*3)].id));inv.rewards.push('signal_mod');p.hp=p.maxHp;p.medkits=2;p.ammo=24;p.resource=p.classId==='marksman'?0:100;p.signature=p.dodge=this.s.time;this.private(p.id);}
   if(this.s.stage===5&&!inv.rewards.includes('boss_reward')){this.give(p,this.rollItem(p,undefined,'rare'));inv.rewards.push('boss_reward');for(const relic of RELICS.filter(r=>r.classId===p.classId&&r.id!==inv.chosenRelic))this.give(p,this.relicItem(relic.id));this.private(p.id);}
  }
  this.event({kind:'clear',stage:this.s.stage});
 }
 step(){const before=performance.now();
  const humans=[...this.s.players.values()].filter(p=>p.kind!=='companion');if(!humans.some(p=>p.connected))return;
  this.s.paused=humans.length===1&&this.pd.get(humans[0].id)?.input.menu===true&&this.s.phase==='play';if(this.s.paused)return;
  for(const p of this.s.players.values())if(this.pd.get(p.id)?.input.menu)p.ack=Math.max(p.ack,this.pd.get(p.id)!.input.seq);
  this.s.time+=DT;if(this.s.phase==='play'&&!this.s.regroup)this.s.elapsed+=DT;
  for(const p of this.s.players.values())if(p.kind==='companion')this.accept(p.id,companionInput(this,p));
  for(const p of this.s.players.values())this.playerStep(p);
  if(this.s.phase==='play'){
   for(const e of [...this.s.enemies.values()])this.enemyStep(e);
   this.effectStep();this.structureStep();this.fillWave();
   if(!this.s.enemies.size&&!this.waveQueue.length&&!this.s.cleared){if(!this.nextWave)this.nextWave=this.s.time+2;if(this.s.time>=this.nextWave){this.nextWave=0;this.spawnWave();}}
   const standing=[...this.s.players.values()].some(p=>p.connected&&p.status==='standing');if(!standing){if(!this.wipeAt)this.wipeAt=this.s.time+(this.s.players.size===1?0:3);if(this.s.time>=this.wipeAt){this.s.phase='wipe';this.s.message='The line has fallen. Retry the checkpoint.';this.clearEffects();for(const p of this.s.players.values())this.clearInput(p.id);}}else this.wipeAt=0;
   if(this.s.regroup&&this.s.time>=this.s.regroup)this.enter(this.s.destination);
  }else {this.effectStep();this.structureStep();}
  this.tickCost.push(performance.now()-before);if(this.tickCost.length>1800)this.tickCost.shift();
 }
 playerStep(p:ActorState){const d=this.pd.get(p.id)!;p.ack=Math.max(p.ack,d.input.seq);if(this.s.time-d.inputAt>.3)this.clearInput(p.id);const i=d.input,now=this.s.time;
  if(p.status==='downed'){if(now>=p.downEnd)p.status='spectator';return;}if(p.status!=='standing'||!p.connected)return;
  p.yaw=i.yaw;p.pitch=i.pitch;
  if(i.menu){d.charge=0;d.secondaryWas=false;d.reviveTarget='';p.revive=0;return;}
  if(this.s.phase==='wipe')return;
  if(i.edges.includes('dodge')&&now>=p.dodge){const len=Math.hypot(i.mx,i.mz);d.dx=len?(i.mx*Math.cos(i.yaw)+i.mz*Math.sin(i.yaw))/len:-Math.sin(i.yaw);d.dz=len?(i.mx*Math.sin(i.yaw)-i.mz*Math.cos(i.yaw))/len:Math.cos(i.yaw);d.dashUntil=now+.3;d.invUntil=now+.25;p.dodge=now+2;p.action='dodge';p.actionEnd=now+.3;d.charge=0;d.lunge=undefined;d.nextAttack=now+.3;this.event({kind:'dodge',owner:p.id,x:p.x,z:p.z});}
  const broken=new Set(this.s.broken.keys());
  if(d.lunge&&now<d.lunge.end){const l=d.lunge,before={x:p.x,z:p.z};const wall=this.aimCover(p,.85);if(wall&&!l.hit){this.hitCover(wall.id,45*d.stats.damage,p.id,2);l.hit=true;}move(p,l.dx*6/.25*DT,l.dz*6/.25*DT,this.s.stage,broken);const trail=this.s.effects.get(l.trail);if(trail){trail.tx=p.x;trail.tz=p.z;}
   if(!l.hit){const enemy=[...this.s.enemies.values()].find(e=>segmentDistance(e,before,p)<ENEMIES[e.kind as EnemyId].radius+.4&&!this.blocked(before,e));if(enemy){l.hit=true;this.hitEnemy(enemy,{owner:p.id,damage:45*d.stats.damage,primary:false,guard:true,kind:'lunge',attack:l.trail||this.id('attack')});p.resource=Math.min(100,p.resource+15);}}
  }
  else if(now<d.dashUntil)move(p,d.dx*3.2/.3*DT,d.dz*3.2/.3*DT,this.s.stage,broken);
  else {const len=Math.max(1,Math.hypot(i.mx,i.mz)),speed=5*d.stats.speed*(d.charge?.6:p.action==='whirlwind'&&p.actionEnd>now?.5:1);move(p,(i.mx*Math.cos(i.yaw)+i.mz*Math.sin(i.yaw))/len*speed*DT,(i.mx*Math.sin(i.yaw)-i.mz*Math.cos(i.yaw))/len*speed*DT,this.s.stage,broken);}
  if(p.actionEnd<=now){if(p.action==='reload')p.ammo=24;p.action='idle';}
  if(i.edges.includes('medkit')&&p.medkits&&p.hp<p.maxHp&&now>=d.medkitAt){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.45);p.medkits--;d.medkitAt=now+1;this.event({kind:'heal',owner:p.id,x:p.x,z:p.z});}
  if(i.edges.includes('reload'))this.reload(p);
  if(i.edges.includes('ping')&&now>=d.pingAt){d.pingAt=now+1;this.effect('ping',p.id,p.x+Math.sin(p.yaw)*8,p.z-Math.cos(p.yaw)*8,1,3);}
  if(i.interact)this.interact(p);else {d.reviveTarget='';p.revive=0;}
  if(now>=d.dashUntil&&p.action!=='reload'&&this.s.phase!=='debrief'){
   if(i.edges.includes('signature')&&now>=p.signature)this.signature(p);
   if(i.secondary)this.secondary(p);else if(d.secondaryWas)this.releaseSecondary(p);
   if(i.primary&&!i.secondary&&now>=d.nextAttack&&now>=p.actionEnd)this.primary(p);
  }
  d.secondaryWas=i.secondary;if(p.classId==='evoker'&&p.action!=='arc')p.resource=Math.min(100,p.resource+15*DT);
  if(p.classId==='blademaster'&&now-d.lastHit>4)p.resource=Math.max(0,p.resource-10*DT);i.edges=[];
 }
 reload(p:ActorState){const d=this.pd.get(p.id)!;if(p.classId!=='marksman'||p.ammo===24||p.action==='reload'||this.s.time<d.dashUntil)return;p.action='reload';p.actionEnd=this.s.time+1.2;d.charge=0;this.event({kind:'reload',owner:p.id});}
 primary(p:ActorState){const d=this.pd.get(p.id)!,now=this.s.time;
  if(p.classId==='blademaster'){
   if(now-d.lastPrimary>1)d.combo=0;const damage=[30,30,45][d.combo++%3]*d.stats.damage;d.lastPrimary=now;d.nextAttack=now+.35/d.stats.rate;p.action='primary';p.actionEnd=now+.24;const attack=this.id('attack');let target:ActorState|undefined;
   for(const e of [...this.s.enemies.values()])if(distance(p,e)<=2.4+ENEMIES[e.kind as EnemyId].radius&&Math.abs(angleDiff(p.yaw,Math.atan2(e.x-p.x,-(e.z-p.z))))<=55*Math.PI/180&&!this.blocked(p,e)){this.hitEnemy(e,{owner:p.id,damage,primary:true,guard:false,kind:'cut',attack,plate:this.meleePlate(p,e)});target??=e;}
   const box=this.aimCover(p,2.4);if(box)this.hitCover(box.id,damage,p.id);if(target){p.resource=Math.min(100,p.resource+10);this.primaryProc(p,attack,target);}this.event({kind:'cut',owner:p.id,x:p.x,z:p.z,yaw:p.yaw});return;
  }
  if(p.classId==='evoker'){
   d.nextAttack=now+1/3/d.stats.rate;p.action='primary';p.actionEnd=now+.16;const attack=this.id('attack');for(const angle of p.relic==='cinder_choir'?[-8,0,8]:[0]){const yaw=p.yaw+angle*Math.PI/180,id=this.effect('ember',p.id,p.x,p.z,.2,1);const f=this.s.effects.get(id)!,data=this.fd.get(id)!;f.y=1.25;data.vx=Math.sin(yaw)*24;data.vz=-Math.cos(yaw)*24;data.vy=Math.tan(p.pitch)*24;data.remaining=24;data.source={owner:p.id,damage:24*d.stats.damage*(p.relic==='cinder_choir'?.5:1),primary:true,guard:true,kind:'ember',attack};}
   this.event({kind:p.relic==='cinder_choir'?'cinder_choir':'ember',owner:p.id,x:p.x,z:p.z});return;
  }
  if(!p.ammo){this.reload(p);return;}p.ammo--;d.nextAttack=now+.2/d.stats.rate;p.action='primary';p.actionEnd=now+.12;
  this.shoot(p,18,30,true,false,'rifle');if(!p.ammo)this.reload(p);
 }
 meleePlate(p:ActorState,e:ActorState):'left'|'right'|undefined{if(e.kind!=='bellwether')return;const side=(p.x-e.x)*Math.cos(e.yaw)+(p.z-e.z)*Math.sin(e.yaw);if(Math.abs(side)>.8)return side<0?'left':'right';}
 aimCover(p:ActorState,range:number){return rayCandidates(this.s.stage,p.x,p.z,Math.sin(p.yaw),-Math.cos(p.yaw),range).filter(b=>!this.s.broken.has(b.id)).map(b=>({b,dist:rayBox3(p.x,1.25,p.z,Math.sin(p.yaw),Math.tan(p.pitch),-Math.cos(p.yaw),b)})).sort((a,b)=>a.dist-b.dist).find(v=>v.dist<range)?.b;}
 aimed(p:ActorState,range:number){return [...this.s.enemies.values()].map(e=>({e,along:(e.x-p.x)*Math.sin(p.yaw)-(e.z-p.z)*Math.cos(p.yaw),perp:Math.abs((e.x-p.x)*Math.cos(p.yaw)+(e.z-p.z)*Math.sin(p.yaw))})).filter(v=>v.along>0&&v.along<range&&v.perp<ENEMIES[v.e.kind as EnemyId].radius+.3&&!this.blocked(p,v.e)).sort((a,b)=>a.along-b.along)[0]?.e;}
 secondary(p:ActorState){const d=this.pd.get(p.id)!,now=this.s.time;
  if(p.classId==='blademaster'){
   if(p.resource<40||now<d.nextSecondary||now<p.actionEnd)return;const extra=p.relic==='martyrs_engine'?p.resource-40:0,radius=3+extra*.015,damage=(65+extra*.8)*d.stats.damage;p.resource=p.relic==='martyrs_engine'?0:p.resource-40;d.nextSecondary=now+1;p.action='whirlwind';p.actionEnd=now+.65;const attack=this.id('attack');
   for(const e of [...this.s.enemies.values()])if(distance(p,e)<=radius&&!this.blocked(p,e))this.hitEnemy(e,{owner:p.id,damage,primary:false,guard:true,kind:'whirlwind',attack,plate:this.meleePlate(p,e)});for(const b of obstacles(this.s.stage))if(sphereBox(p.x,1.25,p.z,radius,b))this.hitCover(b.id,damage,p.id,extra>=40?3:2);this.effect('whirlwind',p.id,p.x,p.z,radius,.65);this.event({kind:p.relic==='martyrs_engine'?'martyrs_engine':'whirlwind',owner:p.id,x:p.x,z:p.z,radius});return;
  }
  if(p.classId==='evoker'){
   if((now<p.actionEnd&&p.action!=='arc')||p.resource<=0)return;const target=this.aimed(p,12);if(!target){const box=this.aimCover(p,12);if(!box){if(p.action==='arc'){p.action='idle';p.actionEnd=now;}return;}p.resource=Math.max(0,p.resource-20*DT);p.action='arc';p.actionEnd=now+.08;if(now>=d.nextSecondary){d.nextSecondary=now+.25;this.hitCover(box.id,16*d.stats.damage,p.id,3);this.event({kind:'arc',owner:p.id,x:p.x,z:p.z,tx:box.x,tz:box.z,ty:clamp(1.25+Math.tan(p.pitch)*distance(p,box),box.y||0,(box.y||0)+box.h)});}return;}p.resource=Math.max(0,p.resource-20*DT);p.action='arc';p.actionEnd=now+.08;
   if(now<d.nextSecondary)return;d.nextSecondary=now+.25;const attack=this.id('attack'),visited=new Set([target.id]);this.hitEnemy(target,{owner:p.id,damage:16*d.stats.damage,primary:false,guard:true,kind:'arc',attack});this.event({kind:'arc',owner:p.id,x:p.x,z:p.z,tx:target.x,tz:target.z});let from=target;
   for(let j=0;j<2;j++){const next=this.nearEnemy(from,5,from.id,visited);if(!next)break;visited.add(next.id);this.hitEnemy(next,{owner:p.id,damage:8*d.stats.damage,primary:false,guard:false,kind:'arc_chain',attack});this.event({kind:'arc',owner:p.id,x:from.x,z:from.z,tx:next.x,tz:next.z});from=next;}return;
  }
  if(p.ammo<4){if(!d.secondaryWas)this.event({kind:'hint',owner:p.id,message:'Execution Round needs 4 rounds. Press R.'});return;}
  if(!d.charge&&this.s.time>=p.actionEnd){d.charge=this.s.time;p.action='charge';p.actionEnd=this.s.time+1000;}
 }
 releaseSecondary(p:ActorState){const d=this.pd.get(p.id)!;if(p.classId==='marksman'&&d.charge){const charged=this.s.time-d.charge>=.6;d.charge=0;p.actionEnd=this.s.time;p.action='idle';if(charged&&p.ammo>=4){p.ammo-=4;this.shoot(p,80,30,false,true,'execution',p.relic==='long_watch'?3:1);d.nextAttack=this.s.time+.3;p.action='execution';p.actionEnd=this.s.time+.3;}}}
 signature(p:ActorState){if(this.s.time<p.actionEnd&&p.action!=='arc')return;const d=this.pd.get(p.id)!,now=this.s.time;
  if(p.classId==='blademaster'){p.signature=now+5*d.stats.cooldown;p.action='lunge';p.actionEnd=now+.25;const trail=p.relic==='red_wake'?this.effect('red_wake',p.id,p.x,p.z,.5,2.25):'';if(trail){const f=this.s.effects.get(trail)!;f.tx=p.x;f.tz=p.z;this.fd.get(trail)!.source={owner:p.id,damage:45*d.stats.damage,primary:false,guard:false,kind:'relic',attack:trail};}d.lunge={end:now+.25,dx:Math.sin(p.yaw),dz:-Math.cos(p.yaw),hit:false,trail};this.event({kind:'lunge',owner:p.id,x:p.x,z:p.z});return;}
  if(p.classId==='evoker'){
   if(p.resource<40)return;p.resource-=40;p.signature=now+8*d.stats.cooldown;p.action='well';p.actionEnd=now+.25;const target=this.aimed(p,16);let range=target?distance(p,target):clamp(1.25/Math.max(.08,-Math.tan(p.pitch)),3,16);const b=this.aimCover(p,range);if(b)range=Math.max(1,rayBox(p.x,p.z,Math.sin(p.yaw),-Math.cos(p.yaw),b)-.4);
   const id=this.effect('well',p.id,p.x+Math.sin(p.yaw)*range,p.z-Math.cos(p.yaw)*range,4,p.relic==='event_horizon'?4:3);if(p.relic==='event_horizon'){const f=this.fd.get(id)!;f.detonate=true;f.source={owner:p.id,damage:90*d.stats.damage,primary:false,guard:false,kind:'relic',attack:id};}this.event({kind:'well',owner:p.id,x:p.x,z:p.z});return;
  }
  p.signature=this.s.time+8*d.stats.cooldown;p.action='grenade';p.actionEnd=this.s.time+.25;
  let range=10;const dx=Math.sin(p.yaw),dz=-Math.cos(p.yaw),cover=this.aimCover(p,range);if(cover)range=Math.max(.5,rayBox3(p.x,1.25,p.z,dx,Math.tan(p.pitch),dz,cover)-.15);
  const id=this.effect('grenade',p.id,p.x+dx*range,p.z+dz*range,3,.7);const f=this.s.effects.get(id)!;f.y=Math.max(.25,1.25+Math.tan(p.pitch)*range);f.tx=p.x;f.tz=p.z;this.fd.get(id)!.source={owner:p.id,damage:75*d.stats.damage,primary:false,guard:true,kind:'grenade',attack:id};this.fd.get(id)!.detonate=true;this.event({kind:'grenade',owner:p.id,x:p.x,z:p.z});
 }
 shoot(p:ActorState,base:number,range:number,primary:boolean,guard:boolean,kind:string,maxHits=1){
  const d=this.pd.get(p.id)!,dx=Math.sin(p.yaw),dz=-Math.cos(p.yaw),attack=this.id('attack');let stop=range,boxHit:any;
  // The ray starts at the avatar muzzle. Camera peeking never changes this path.
  for(const b of rayCandidates(this.s.stage,p.x,p.z,dx,dz,range))if(!this.s.broken.has(b.id)){const hit=rayBox3(p.x,1.25,p.z,dx,Math.tan(p.pitch),dz,b);if(hit<stop){stop=hit;boxHit=b;}}
  const hits=[...this.s.enemies.values()].map(e=>{const along=(e.x-p.x)*dx+(e.z-p.z)*dz,perp=Math.abs((e.x-p.x)*dz-(e.z-p.z)*dx);return {e,along,perp};}).filter(h=>h.along>0&&h.along<stop&&h.perp<ENEMIES[h.e.kind as EnemyId].radius).sort((a,b)=>a.along-b.along).slice(0,maxHits);
  let successful=false;for(const {e,along} of hits){const hitY=1.25+Math.tan(p.pitch)*along;const height=ENEMIES[e.kind as EnemyId].height;const weak=e.kind==='bellwether'?hitY>=1.6&&hitY<=2.7:hitY>height*.68&&hitY<height+ .25;
   if(hitY<.2||hitY>height+.3)continue;const side=(p.x+dx*along-e.x)*Math.cos(e.yaw)+(p.z+dz*along-e.z)*Math.sin(e.yaw);const plate=e.kind==='bellwether'&&hitY>2.2&&hitY<3.5&&Math.abs(side)>.55?(side<0?'left':'right'):undefined;
   successful=this.hitEnemy(e,{owner:p.id,damage:base*d.stats.damage,primary,guard,kind,attack,weak,plate,weakMult:kind==='execution'&&p.relic==='long_watch'?2:1.5})||successful;if(maxHits===1)stop=along;
  }
  if(!successful&&boxHit)this.hitCover(boxHit.id,base*d.stats.damage,p.id,kind==='execution'?3:1);
  if(primary&&successful)this.primaryProc(p,attack,hits[0].e);
  this.event({kind,owner:p.id,x:p.x,z:p.z,tx:p.x+dx*stop,ty:1.25+Math.tan(p.pitch)*stop,tz:p.z+dz*stop});
 }
 hitCover(id:string,damage:number,owner:string,power=1){const b=obstacleById(this.s.stage,id);if(!b?.breakable||this.s.broken.has(id))return;const p=this.s.players.get(owner),mult=p?.mod==='breach_core'?1.5:1;
  if(power<(b.power||1)){this.event({kind:'material_resist',owner,id,x:b.x,y:(b.y||0)+b.h/2,z:b.z,material:b.material});return;}
  const hp=(this.s.coverHealth.get(id)??b.hp??60)-damage*mult;this.s.coverHealth.set(id,Math.max(0,hp));if(hp<=0)this.breakBlock(b);
 }
 breakBlock(b:Box,collapse=false){if(this.s.broken.has(b.id))return;this.s.broken.set(b.id,this.s.revision);this.s.coverHealth.delete(b.id);for(const data of this.ed.values())data.pathAt=0;if(b.building&&!collapse)this.dirtyBuildings.add(b.building);this.event({kind:collapse?'collapse':'break',id:b.id,x:b.x,y:(b.y||0)+b.h/2,z:b.z,material:b.material});}
 structureStep(){
  for(const building of this.dirtyBuildings){const loose=unsupportedBlocks(obstacles(this.s.stage).filter(b=>b.building===building),new Set(this.s.broken.keys()));const chunks=new Map<string,Box[]>();for(const b of loose){const list=chunks.get(b.chunk!)||[];list.push(b);chunks.set(b.chunk!,list);}for(const [chunk,blocks]of chunks)if(!this.collapses.has(chunk)){this.collapses.set(chunk,{at:this.s.time+1,blocks,hits:new Set()});const low=blocks[0],id=this.effect('collapse_warning',chunk,low.x,low.z,2.4,1);this.s.effects.get(id)!.y=.04;this.event({kind:'collapse_warning',x:low.x,z:low.z});}}
  this.dirtyBuildings.clear();let budget=8;
  for(const [chunk,c]of this.collapses){if(this.s.time<c.at)continue;while(c.blocks.length&&budget>0){const b=c.blocks.shift()!;if(this.s.broken.has(b.id))continue;this.breakBlock(b,true);budget--;const height=(b.y||0)+b.h/2,id=this.effect('falling_block',b.id,b.x,b.z,Math.max(b.w,b.d)/2,Math.max(.25,Math.sqrt(2*height/9.8)));this.s.effects.get(id)!.y=height;const data=this.fd.get(id)!;data.detonate=true;data.hits=c.hits;}
   if(!c.blocks.length)this.collapses.delete(chunk);if(!budget)break;}
 }
 hitEnemy(e:ActorState,source:Source){if(!this.s.enemies.has(e.id)||e.action==='transition')return false;const p=this.s.players.get(source.owner),data=this.ed.get(e.id)!;let damage=source.damage;
  if(e.kind==='bellwether'&&source.plate&&this.hitPlate(e,source.plate,damage,source.owner))return true;
  damage*=100/(100+ENEMIES[e.kind as EnemyId].armor);if(source.weak)damage*=source.weakMult||1.5;
  if(e.kind==='ironbound_bulwark'){
   if(source.guard&&(source.kind!=='arc'||this.s.time-data.lastGuard>=1)){data.lastGuard=this.s.time;data.guards=data.guards.filter(t=>this.s.time-t<4);data.guards.push(this.s.time);if(data.guards.length>=3){e.guardUntil=this.s.time+4;data.guards=[];this.event({kind:'guard_break',x:e.x,z:e.z});}}
   if(p&&e.guardUntil<this.s.time&&Math.abs(angleDiff(e.yaw,Math.atan2(p.x-e.x,-(p.z-e.z))))<Math.PI/3)damage*=.5;
  }
  if(e.kind!=='breach_cantor'&&e.kind!=='bellwether'&&[...this.s.enemies.values()].some(c=>c.kind==='breach_cantor'&&distance(c,e)<=6&&!this.blocked(c,e)))damage*=.7;
  e.hp=Math.max(0,e.hp-damage);if(p)this.pd.get(p.id)!.lastHit=this.s.time;this.event({kind:'hit',owner:source.owner,target:e.id,x:e.x,z:e.z,damage:Math.round(damage),weak:source.weak});
  if(e.hp<=0)this.killEnemy(e,source);
  else if(e.kind==='bellwether'&&e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.action='transition';e.actionEnd=this.s.time+2;e.plateL=e.plateR=0;this.event({kind:'boss_phase',x:e.x,z:e.z});}
  return true;
 }
 hitPlate(e:ActorState,side:'left'|'right',damage:number,owner:string){const key=side==='left'?'plateL':'plateR';if(e[key]<=0)return false;const p=this.s.players.get(owner);e[key]=Math.max(0,e[key]-damage*(p?.mod==='breach_core'?1.5:1));this.event({kind:e[key]<=0?'plate_break':'plate_hit',target:e.id,side,x:e.x,z:e.z});return true;}
 killEnemy(e:ActorState,source:Source){const p=this.s.players.get(source.owner);if(p){p.kills++;if(source.primary&&p.mod==='blood_seal'){p.hp=Math.min(p.maxHp,p.hp+4);this.event({kind:'blood_seal',owner:p.id,x:p.x,z:p.z});}}
  this.s.enemies.delete(e.id);this.ed.delete(e.id);this.event({kind:'kill',x:e.x,z:e.z,target:e.id,enemy:e.kind});
  if(e.elite==='volatile'){const id=this.effect('volatile','',e.x,e.z,3,1);this.fd.get(id)!.detonate=true;}
  if(e.kind!=='bellwether'&&!e.name.includes('Echo'))for(const player of this.s.players.values()){
   const d=this.pd.get(player.id)!;if(e.elite)this.drop(player,this.rollItem(player,undefined,'rare'),e.x,e.z);
   else if(d.inventory.randomDrops<4&&this.random(player)<.08){d.inventory.randomDrops++;this.drop(player,this.rollItem(player),e.x,e.z);}
  }
 }
 primaryProc(p:ActorState,attack:string,target:ActorState){const d=this.pd.get(p.id)!;if(d.arcAttacks.has(attack))return;d.arcAttacks.add(attack);if(d.arcAttacks.size>100)d.arcAttacks.delete(d.arcAttacks.values().next().value!);
  if(p.mod==='arc_coil'&&++d.arcCount%5===0){const other=this.nearEnemy(target,5,target.id);if(other){this.hitEnemy(other,{owner:p.id,damage:12,primary:false,guard:false,kind:'proc',attack});this.event({kind:'arc_coil',owner:p.id,x:target.x,z:target.z,tx:other.x,tz:other.z});}}
  if(p.relic==='ricochet_testament'){const other=this.nearEnemy(target,6,target.id);if(other){this.hitEnemy(other,{owner:p.id,damage:18*d.stats.damage*.6,primary:false,guard:false,kind:'relic',attack});this.event({kind:'ricochet',owner:p.id,x:target.x,z:target.z,tx:other.x,tz:other.z});}}
 }
 nearEnemy(from:{x:number;z:number},range:number,except:string,exclude:Set<string>=new Set()){return [...this.s.enemies.values()].filter(e=>e.id!==except&&!exclude.has(e.id)&&distance(from,e)<=range&&!this.blocked(from,e)).sort((a,b)=>distance(from,a)-distance(from,b))[0];}
 blocked(a:{x:number;z:number},b:{x:number;z:number}){return obstruction(a,b,this.s.stage,new Set(this.s.broken.keys()));}
 damagePlayer(p:ActorState,base:number){const d=this.pd.get(p.id)!;if(p.status!=='standing'||this.s.time<d.invUntil)return;const amount=base*SCALING[this.s.partySize-1].damage*100/(100+d.stats.armor);p.hp=Math.max(0,p.hp-amount);d.lastDamage=this.s.time;d.reviveTarget='';p.revive=0;this.event({kind:'hurt',owner:p.id,x:p.x,z:p.z,damage:Math.round(amount)});
  if(!p.hp){p.deaths++;p.status=this.s.players.size===1?'spectator':'downed';p.downEnd=this.s.time+20;p.action='idle';this.clearInput(p.id);this.event({kind:'down',owner:p.id});}
 }
 enemyStep(e:ActorState){const d=this.ed.get(e.id)!,now=this.s.time,base=ENEMIES[e.kind as EnemyId];const targets=[...this.s.players.values()].filter(p=>p.status==='standing');const p=targets.sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!p)return;
  if(e.kind==='bellwether'){this.bossStep(e,d,p);return;}
  if(e.action==='tell'){
   if(now>=e.actionEnd){e.action='recover';e.actionEnd=now+base.recovery;this.enemyImpact(e,d);d.next=e.actionEnd;}
   return;
  }
  if(e.action==='recover'){if(now<e.actionEnd)return;e.action='idle';}
  const dist=distance(e,p);e.yaw=Math.atan2(p.x-e.x,-(p.z-e.z));
  if(dist>base.range||(e.kind==='riftspitter'&&dist<6)||this.blocked(e,p)){
   const direction=e.kind==='riftspitter'&&dist<6&&!this.blocked(e,p)?-1:1;
   if(now>=d.pathAt){const next=waypoint(e,p,this.s.stage,new Set(this.s.broken.keys()),base.radius);d.nx=next.x;d.nz=next.z;d.pathAt=now+.2;}
   const pathDist=Math.max(.1,Math.hypot(d.nx-e.x,d.nz-e.z)),dx=(d.nx-e.x)/pathDist*direction,dz=(d.nz-e.z)/pathDist*direction;
   const before={x:e.x,z:e.z};move(e,dx*base.speed*(e.elite==='frenzied'?1.2:1)*DT,dz*base.speed*(e.elite==='frenzied'?1.2:1)*DT,this.s.stage,new Set(this.s.broken.keys()),base.radius);
   if(distance(before,e)<.01){const side=Math.sin(hash(e.id)%2?1:-1);move(e,-dz*side*base.speed*DT,dx*side*base.speed*DT,this.s.stage,new Set(this.s.broken.keys()),base.radius);}
  }
  const winding=[...this.s.enemies.values()].filter(v=>v.action==='tell');const heavy=e.kind==='ironbound_bulwark'||e.kind==='bellwether';
  if(dist<=base.range&&!this.blocked(e,p)&&now>=d.next&&winding.length<SCALING[this.s.partySize-1].windups&&(!heavy||!winding.some(v=>v.kind==='ironbound_bulwark'||v.kind==='bellwether'))&&winding.filter(v=>this.ed.get(v.id)?.target===p.id).length<2){
   e.action='tell';e.actionEnd=now+base.tell;e.tx=p.x;e.tz=p.z;d.target=p.id;d.hits.clear();d.fromX=e.x;d.fromZ=e.z;this.event({kind:'tell',enemy:e.kind,x:e.x,z:e.z});
  }
 }
 bossStep(e:ActorState,d:EnemyData,p:ActorState){const now=this.s.time;
  if(e.action==='transition'){
   if(now>=e.actionEnd&&!d.adds){d.adds=true;for(let i=0;i<SCALING[this.s.partySize-1].adds;i++){const add=this.spawnEnemy('carrion_runner',-8+i*3,-9);add.name='Carrion Echo';}e.action='recover';e.actionEnd=now+2;d.next=e.actionEnd;}
   return;
  }
  if(['sweep_tell','ring_tell','strike_tell'].includes(e.action)){
   if(now<e.actionEnd)return;
   if(e.action==='sweep_tell'){
    e.yaw=Math.atan2(p.x-e.x,-(p.z-e.z));for(const player of this.s.players.values())if(distance(e,player)<=5&&Math.abs(angleDiff(e.yaw,Math.atan2(player.x-e.x,-(player.z-e.z))))<Math.PI*.65&&!this.blocked(e,player))this.damagePlayer(player,35);
    for(const b of obstacles(this.s.stage))if(sphereBox(e.x,1.5,e.z,5,b))this.hitCover(b.id,60,'',3);this.event({kind:'boss_sweep',x:e.x,z:e.z});
   }else if(e.action==='ring_tell'){this.effect('boss_ring',e.id,e.x,e.z,20,2.2);this.event({kind:'bell',x:e.x,z:e.z});}
   e.action='recover';e.actionEnd=now+1.4;d.next=e.actionEnd;return;
  }
  if(now<d.next)return;e.action='idle';const dist=distance(e,p);if(dist>4)move(e,(p.x-e.x)/dist*1.1*DT,(p.z-e.z)/dist*1.1*DT,this.s.stage,new Set(this.s.broken.keys()),1.6);
  if([...this.s.enemies.values()].some(v=>v.id!==e.id&&v.kind==='ironbound_bulwark'&&v.action==='tell'))return;
  d.attack++;e.yaw=Math.atan2(p.x-e.x,-(p.z-e.z));e.tx=p.x;e.tz=p.z;
  if(e.phase===2&&d.attack%3===0){e.action='strike_tell';e.actionEnd=now+1;const targets=[...this.s.players.values()].filter(v=>v.status==='standing');const hits=new Set<string>();for(let i=0;i<3;i++){const target=targets[i%targets.length];const id=this.effect('ground_strike',e.id,target.x+(i>=targets.length?(i-1)*3:0),target.z,2.2,1);const f=this.fd.get(id)!;f.detonate=true;f.hits=hits;}}
  else {e.action=d.attack%2?'sweep_tell':'ring_tell';e.actionEnd=now+(e.action==='ring_tell'?1.2:1);}
  this.event({kind:'tell',enemy:e.action,x:e.x,z:e.z});
 }
 enemyImpact(e:ActorState,d:EnemyData){const base=ENEMIES[e.kind as EnemyId];
  if(e.kind==='riftspitter'){const dist=Math.max(.1,Math.hypot(e.tx-e.x,e.tz-e.z));const id=this.effect('spit',e.id,e.x,e.z,.3,3);const effect=this.s.effects.get(id)!;effect.y=1.45;effect.tx=e.tx;effect.tz=e.tz;const f=this.fd.get(id)!;f.vx=(e.tx-e.x)/dist*10;f.vz=(e.tz-e.z)/dist*10;f.source={owner:'',damage:18,primary:false,guard:false,kind:'enemy',attack:id};return;}
  if(e.kind==='carrion_runner'){const dist=Math.max(.1,Math.hypot(e.tx-e.x,e.tz-e.z));move(e,(e.tx-e.x)/dist*Math.min(dist,3),(e.tz-e.z)/dist*Math.min(dist,3),this.s.stage,new Set(this.s.broken.keys()),base.radius);}
  for(const p of this.s.players.values()){const dist=distance(e,p);const arc=Math.abs(angleDiff(e.yaw,Math.atan2(p.x-e.x,-(p.z-e.z))));if(dist<=(e.kind==='breach_cantor'?6:e.kind==='ironbound_bulwark'?4:1.5)&&(e.kind==='breach_cantor'||arc<Math.PI/3)&&!this.blocked(e,p))this.damagePlayer(p,base.damage);}
  this.event({kind:'impact',enemy:e.kind,x:e.x,z:e.z});
 }
 effect(kind:string,owner:string,x:number,z:number,radius:number,duration:number){const f=new EffectState();f.id=this.id('fx');f.kind=kind;f.owner=owner;f.x=x;f.z=z;f.radius=radius;f.start=this.s.time;f.end=this.s.time+duration;this.s.effects.set(f.id,f);this.fd.set(f.id,{hits:new Set(),vx:0,vz:0,vy:0,remaining:30,height:1.2});return f.id;}
 clearEffects(){this.s.effects.clear();this.fd.clear();this.collapses.clear();this.dirtyBuildings.clear();}
 effectStep(){
  const wells=[...this.s.effects.values()].filter(f=>f.kind==='well');for(const e of this.s.enemies.values()){if(e.kind==='bellwether')continue;const f=wells.filter(f=>distance(f,e)<=f.radius&&!this.blocked(f,e)).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(f){const dist=Math.max(.3,distance(f,e)),speed=2*(e.kind==='ironbound_bulwark'?.35:1);move(e,(f.x-e.x)/dist*speed*DT,(f.z-e.z)/dist*speed*DT,this.s.stage,new Set(this.s.broken.keys()),ENEMIES[e.kind as EnemyId].radius);}}
  for(const f of [...this.s.effects.values()]){const d=this.fd.get(f.id)!;
  if(f.kind==='red_wake'&&distance(f,{x:f.tx,z:f.tz})>.1)for(const e of [...this.s.enemies.values()])if(!d.hits.has(e.id)&&segmentDistance(e,f,{x:f.tx,z:f.tz})<.5+ENEMIES[e.kind as EnemyId].radius&&!this.blocked(f,e)){d.hits.add(e.id);this.hitEnemy(e,d.source!);}
  if(f.kind==='boss_ring'){const radius=(this.s.time-f.start)/(f.end-f.start)*f.radius;const width=f.radius*DT/(f.end-f.start)+.35;for(const p of this.s.players.values())if(!d.hits.has(p.id)&&Math.abs(distance(f,p)-radius)<=width){d.hits.add(p.id);this.damagePlayer(p,25);}}
  if(d.vx||d.vz){const before={x:f.x,z:f.z};f.x+=d.vx*DT;f.z+=d.vz*DT;f.y+=d.vy*DT;d.remaining-=Math.hypot(d.vx,d.vz)*DT;
   const speed=Math.hypot(d.vx,d.vz),rayHits=rayCandidates(this.s.stage,before.x,before.z,d.vx/speed,d.vz/speed,speed*DT).filter(b=>!this.s.broken.has(b.id)).map(b=>({b,t:rayBox3(before.x,f.y-d.vy*DT,before.z,d.vx/speed,d.vy/speed,d.vz/speed,b)})).filter(v=>v.t<=speed*DT).sort((a,b)=>a.t-b.t);if(rayHits.length||d.remaining<=0){if(f.kind==='ember'&&rayHits.length)this.hitCover(rayHits[0].b.id,d.source!.damage,f.owner);this.s.effects.delete(f.id);this.fd.delete(f.id);continue;}
   if(f.kind==='spit')for(const p of this.s.players.values())if(segmentDistance(p,before,f)<.65){this.damagePlayer(p,d.source!.damage);f.end=this.s.time;break;}
   if(f.kind==='ember')for(const e of [...this.s.enemies.values()]){const height=ENEMIES[e.kind as EnemyId].height;if(segmentDistance(e,before,f)<ENEMIES[e.kind as EnemyId].radius&&f.y>.1&&f.y<height+.3){const side=(f.x-e.x)*Math.cos(e.yaw)+(f.z-e.z)*Math.sin(e.yaw);const plate:'left'|'right'|undefined=e.kind==='bellwether'&&f.y>2.2&&f.y<3.5&&Math.abs(side)>.55?(side<0?'left':'right'):undefined;const source={...d.source!,plate,weak:e.kind==='bellwether'?f.y>=1.6&&f.y<=2.7:f.y>height*.68};const hit=this.hitEnemy(e,source);const p=this.s.players.get(f.owner);if(p&&hit)this.primaryProc(p,source.attack,e);f.end=this.s.time;break;}}
  }
  if(this.s.time>=f.end){
   if(d.detonate){
    if(f.kind==='falling_block'){for(const p of this.s.players.values())if(!d.hits.has(p.id)&&distance(f,p)<=f.radius+.4){d.hits.add(p.id);this.damagePlayer(p,20);}}
    else if(f.kind==='volatile'){for(const p of this.s.players.values())if(distance(f,p)<=f.radius)this.damagePlayer(p,25);}
    else if(f.kind==='ground_strike'){for(const p of this.s.players.values())if(!d.hits.has(p.id)&&distance(f,p)<=f.radius&&!this.blocked(f,p)){d.hits.add(p.id);this.damagePlayer(p,25);}for(const b of obstacles(this.s.stage))if(sphereBox(f.x,.4,f.z,f.radius,b))this.hitCover(b.id,60,'',3);}
    else if(d.source)this.explode(f,d.source);
    this.event({kind:'explosion',x:f.x,z:f.z,radius:f.radius});
   }
   this.s.effects.delete(f.id);this.fd.delete(f.id);
  }
 }}
 explode(f:EffectState,source:Source){for(const e of [...this.s.enemies.values()])if(distance(f,e)<=f.radius&&!this.blocked(f,e)){this.hitEnemy(e,source);if(e.kind==='bellwether'){this.hitPlate(e,'left',source.damage,source.owner);this.hitPlate(e,'right',source.damage,source.owner);}}for(const b of obstacles(this.s.stage))if(sphereBox(f.x,f.y||.5,f.z,f.radius,b))this.hitCover(b.id,source.damage,source.owner,3);}
 interact(p:ActorState){const d=this.pd.get(p.id)!,now=this.s.time;
  if(this.s.cleared&&this.s.stage===2&&this.s.broken.has('crypt_wall')&&distance(p,{x:9,z:-7})<3&&p.id===this.s.leader&&!this.cryptDone){this.transition(p.id,3);return;}
  const ally=[...this.s.players.values()].find(a=>a.id!==p.id&&a.status==='downed'&&distance(p,a)<=2.5&&!this.blocked(p,a));
  if(ally){if(d.reviveTarget!==ally.id){d.reviveTarget=ally.id;d.reviveStart=now;d.reviveX=p.x;d.reviveZ=p.z;}if(Math.hypot(p.x-d.reviveX,p.z-d.reviveZ)>.5||d.lastDamage>=d.reviveStart){d.reviveTarget='';p.revive=0;return;}
   p.revive=(now-d.reviveStart)/3;if(now-d.reviveStart>=3){ally.status='standing';ally.hp=ally.maxHp*.4;ally.downEnd=0;this.pd.get(ally.id)!.invUntil=now+1;d.reviveTarget='';p.revive=0;this.event({kind:'revive',owner:ally.id});}return;
  }
  d.reviveTarget='';p.revive=0;const drop=d.inventory.drops.find(v=>distance(p,v)<=2.5);if(drop){this.inventory(p.id,{op:'pickup',id:drop.id});return;}
  if(this.s.cleared&&p.z<-ZONES[this.s.stage].depth/2+4&&p.id===this.s.leader){if(this.s.stage===5)this.extract();else this.transition(p.id,this.s.stage===1?2:this.s.stage===4?5:4);}
 }
 transition(id:string,destination:number){if(id!==this.s.leader||this.s.phase!=='play'||!this.s.cleared||this.s.regroup)return false;
  const leader=this.s.players.get(id)!;if(leader.z>-ZONES[this.s.stage].depth/2+4&&destination!==3)return false;
  if(destination===3){if(this.s.stage!==2||this.cryptDone||!this.s.broken.has('crypt_wall')||distance(leader,{x:9,z:-7})>5)return false;}
  else if(destination!==(this.s.stage===1?2:this.s.stage===2||this.s.stage===3?4:5))return false;
  this.s.destination=destination;const near=[...this.s.players.values()].filter(p=>p.connected).every(p=>distance(p,leader)<6);if(near)this.enter(destination);else {this.s.regroup=this.s.time+10;this.s.message=`Regrouping · ${ZONES[destination].name}`;}return true;
 }
 extract(){if(this.s.phase!=='play'||!this.s.cleared||this.s.stage!==5)return;this.s.phase='debrief';this.s.completionId=this.id('completion');this.s.message='The Hollow Line is silent';this.clearEffects();for(const p of this.s.players.values()){this.clearInput(p.id);this.private(p.id);}this.event({kind:'complete',time:this.s.elapsed,partySize:this.startParty,seed:this.s.seed});}
 practice(id:string){if(id!==this.s.leader||this.s.phase!=='debrief')return false;this.s.phase='practice';this.s.stage=0;this.s.revision++;this.s.broken.delete('training_wall');this.s.coverHealth.delete('training_wall');const dummy=this.spawnEnemy('carrion_runner',0,-7);dummy.name='Sanctuary ward dummy';dummy.hp=dummy.maxHp=999999;dummy.action='recover';dummy.actionEnd=1e9;let i=0;for(const p of this.s.players.values()){p.x=(i++-1)*2;p.z=5;p.hp=p.maxHp;p.resource=p.classId==='evoker'?100:0;p.ammo=24;p.signature=p.dodge=this.s.time;this.clearInput(p.id);}return true;}
 finishPractice(id:string){if(id!==this.s.leader||this.s.phase!=='practice')return false;this.s.phase='debrief';this.s.stage=5;this.s.revision++;this.s.enemies.clear();this.ed.clear();this.clearEffects();return true;}
 replay(id:string,newSeed=false){if(id!==this.s.leader||!['debrief','practice'].includes(this.s.phase))return false;this.s.phase='lobby';this.s.completionId='';this.s.stage=0;this.s.wave=0;this.s.elapsed=0;this.s.cleared=false;this.s.broken.clear();this.s.coverHealth.clear();this.s.enemies.clear();this.ed.clear();this.clearEffects();this.s.revision++;this.cryptDone=false;this.checkpoint=undefined;if(newSeed)this.s.seed=(this.s.seed+Math.floor(Math.random()*100000)+1)>>>0;
  let i=0;for(const p of this.s.players.values()){this.resetPlayer(p,true);p.x=(i++-1)*2;p.z=6;p.ready=p.kind==='companion';p.kills=p.deaths=0;}return true;
 }
 relicItem(id:string):Item{const r=RELICS.find(r=>r.id===id)!;return {id:this.id('item'),base:id,name:r.name,slot:'relic',rarity:'legendary',classId:r.classId,affixes:[]};}
 modItem(id:string):Item{const m=MODS.find(m=>m.id===id)!;return {id:this.id('item'),base:id,name:m.name,slot:'mod',rarity:'rare',affixes:[]};}
 retry(id:string){if(id!==this.s.leader||this.s.phase!=='wipe'||!this.checkpoint)return false;const cp=this.checkpoint;this.s.broken.clear();this.s.coverHealth.clear();for(const [k,v]of cp.broken)this.s.broken.set(k,v);for(const [k,v]of cp.cover)this.s.coverHealth.set(k,v);
  for(const p of this.s.players.values()){const d=this.pd.get(p.id)!;const saved=cp.players[p.id];if(saved){d.inventory=structuredClone(saved.inventory);d.roll=saved.roll;}const roll=d.roll;this.resetPlayer(p);this.pd.get(p.id)!.roll=roll;}
  this.s.phase='play';this.enter(cp.stage);return true;
 }
 random(p:ActorState){const d=this.pd.get(p.id)!;return rng(hash(`${this.s.seed}:${p.id}:${d.roll++}`))();}
 rollItem(p:ActorState,slot?:'weapon'|'armor',rarity?:'magic'|'rare'):Item {slot??=this.random(p)<.6?'weapon':'armor';rarity??=this.random(p)<.65?'magic':'rare';const eligible=Object.entries(AFFIXES).filter(([,a])=>(a.slots as readonly string[]).includes(slot!));const affixes:Item['affixes']=[];
  for(let i=0;i<(rarity==='rare'?2:1);i++){const [id,a]=eligible.splice(Math.floor(this.random(p)*eligible.length),1)[0];affixes.push({id:id as keyof typeof AFFIXES,value:a.min+(a.max-a.min)*this.random(p)});}
  const c=CLASSES[p.classId as ClassId];return {id:this.id('item'),base:slot==='weapon'?p.classId:'faction_armor',name:`${affixes.map(a=>AFFIXES[a.id].name).join(' ')} ${slot==='weapon'?c.weapon:c.faction+' armor'}`,slot,rarity,classId:p.classId as ClassId,affixes};
 }
 give(p:ActorState,item:Item){const inv=this.pd.get(p.id)!.inventory;if(inv.bag.length<12)inv.bag.push(item);else this.drop(p,item,p.x,p.z);this.private(p.id);}
 drop(p:ActorState,item:Item,x:number,z:number){this.pd.get(p.id)!.inventory.drops.push({id:this.id('drop'),x,z,item});this.private(p.id);}
 inventory(id:string,command:any){const p=this.s.players.get(id),d=this.pd.get(id);if(!p||!d||!p.connected||p.status!=='standing'||!command||typeof command!=='object')return false;try{if(JSON.stringify(command).length>2048)return false;}catch{return false;}const inv=d.inventory;
  if(command.op==='pickup'){const index=inv.drops.findIndex(v=>v.id===command.id&&distance(p,v)<=2.5);if(index<0||inv.bag.length>=12)return false;inv.bag.push(inv.drops.splice(index,1)[0].item);}
  else if(command.op==='discard'){const index=inv.bag.findIndex(v=>v.id===command.id);if(index<0)return false;inv.bag.splice(index,1);}
  else if(command.op==='choose_relic'){
   const relic=RELICS.find(r=>r.id===command.id&&r.classId===p.classId);if(!relic||!inv.rewards.includes('relic_choice')||inv.chosenRelic)return false;
   const bagIndex=inv.bag.findIndex(i=>i.base===relic.id),dropIndex=inv.drops.findIndex(i=>i.item.base===relic.id);const item=bagIndex>=0?inv.bag.splice(bagIndex,1)[0]:dropIndex>=0?inv.drops.splice(dropIndex,1)[0].item:this.relicItem(relic.id);
   if(inv.equipment.relic)this.give(p,inv.equipment.relic);inv.equipment.relic=item;inv.chosenRelic=relic.id;inv.rewards.push('relic_chosen');this.updateStats(p);this.event({kind:'legendary',owner:p.id,x:p.x,z:p.z,relic:relic.id});
  }
  else if(command.op==='choose_mod'){
   if(!inv.rewards.includes('crypt_mod_choice')||inv.rewards.includes('crypt_mod_chosen')||!MODS.some(m=>m.id===command.id))return false;inv.rewards.push('crypt_mod_chosen');this.give(p,this.modItem(command.id));
  }
  else if(command.op==='socket'){
   const index=inv.bag.findIndex(i=>i.id===command.id&&i.slot==='mod');if(index<0)return false;const item=inv.bag.splice(index,1)[0];if(inv.equipment.weapon.mod)this.give(p,this.modItem(inv.equipment.weapon.mod));inv.equipment.weapon.mod=item.base;d.arcCount=0;d.arcAttacks.clear();this.updateStats(p);this.event({kind:'socket',owner:p.id,mod:item.base});
  }
  else if(command.op==='unsocket'){
   const old=inv.equipment.weapon.mod;if(!old)return false;delete inv.equipment.weapon.mod;this.give(p,this.modItem(old));d.arcCount=0;d.arcAttacks.clear();this.updateStats(p);
  }
  else if(command.op==='equip'){
   const index=inv.bag.findIndex(v=>v.id===command.id);if(index<0)return false;const item=inv.bag[index];if(item.classId&&item.classId!==p.classId||item.slot==='mod')return false;
   const previous=inv.equipment[item.slot];inv.bag.splice(index,1);if(previous)inv.bag.push(previous);inv.equipment[item.slot]=item;if(item.slot==='weapon'){d.arcCount=0;d.arcAttacks.clear();}this.updateStats(p);
  }else return false;
  this.private(id);return true;
 }
 updateStats(p:ActorState){const d=this.pd.get(p.id)!,c=CLASSES[p.classId as ClassId],totals:Record<string,number>={damage:0,rate:0,speed:0,cooldown:0,hp:0,armor:0};for(const item of Object.values(d.inventory.equipment))for(const a of item?.affixes||[])totals[AFFIXES[a.id].stat]+=a.value;
  d.stats={damage:1+totals.damage,rate:1+totals.rate,speed:1+Math.min(.2,totals.speed),cooldown:1-Math.min(.25,totals.cooldown),hp:c.hp+totals.hp,armor:c.armor+totals.armor};p.maxHp=d.stats.hp;p.hp=Math.min(p.hp,p.maxHp);p.relic=d.inventory.equipment.relic?.base||'';p.mod=d.inventory.equipment.weapon.mod||'';const look=(item:Item)=>`${item.rarity}:${item.affixes.map(a=>a.id).sort().join(',')}`;p.weaponLook=look(d.inventory.equipment.weapon);p.armorLook=look(d.inventory.equipment.armor);
 }
}
