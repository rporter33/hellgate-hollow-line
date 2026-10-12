import * as T from 'three';
import {Voxels,voxelMaterial} from './voxel';
import {CLASSES,ZONES,obstacles,ENEMIES,AFFIXES,type ClassId,type PrivateState} from '../../../packages/shared/src/content';
import {move,rayBox,clamp,distance,obstruction} from '../../../packages/shared/src/math';
import type {Input} from '../../../packages/shared/src/protocol';
import {settings} from './storage';
const circleGeometry=new T.RingGeometry(.9,1,40),cubeGeometry=new T.BoxGeometry(1,1,1),beamGeometry=new T.BoxGeometry(.12,3,.12);
const particleMaterial=new T.MeshBasicMaterial({vertexColors:false});
const rarityColors={common:0xb6b8b1,magic:0x8bc6ed,rare:0xbca0e6,legendary:0xffc874};
export class Renderer {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(75,1,.1,160);world=new T.Group();actors=new Map<string,T.Group>();groups=new Map<string,T.Mesh>();stage=-1;
 yaw=0;pitch=-.08;localId='';state:any;clock=new T.Clock();frames:number[]=[];
 predicted={x:0,z:6};pending:Input[]=[];ack=-1;revision=-1;speed=1;inventory?:PrivateState;
 fx=new Map<string,T.Group>();loot=new Map<string,T.Group>();transient:{object:T.Object3D;end:number}[]=[];
 particles=new T.InstancedMesh(cubeGeometry,particleMaterial,240);particleData:{x:number;y:number;z:number;vx:number;vy:number;vz:number;size:number;life:number;color:number}[]=[];
 ray=new T.Raycaster();tmp=new T.Object3D();sampledFrames=0;
 constructor(parent:HTMLElement){
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;parent.append(this.renderer.domElement);
  this.scene.background=new T.Color(0x17252c);this.scene.fog=new T.FogExp2(0x17252c,.018);this.scene.add(this.world);this.particles.instanceMatrix.setUsage(T.DynamicDrawUsage);this.particles.frustumCulled=false;this.particles.count=0;this.scene.add(this.particles);
  this.scene.add(new T.HemisphereLight(0x9ab8bb,0x514136,2.1));const light=new T.DirectionalLight(0xf1c5a0,2.5);light.position.set(-14,24,8);this.scene.add(light);
  const glow=new T.PointLight(0x42e5ef,30,30,2);glow.position.set(0,3,-8);this.scene.add(glow);
  addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  this.camera.position.set(14,12,18);this.camera.lookAt(0,1,-3);this.applySettings();this.build(1);this.animate();
 }
 applySettings(){this.camera.fov=settings.fov;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'?1:1.5));}
 resetSession(){for(const rig of this.actors.values()){this.scene.remove(rig);rig.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry!==cubeGeometry&&o.geometry!==circleGeometry)o.geometry.dispose();(o.material as T.Material).dispose();}});}this.actors.clear();for(const map of [this.fx,this.loot]){for(const group of map.values()){this.scene.remove(group);for(const o of group.children)((o as T.Mesh).material as T.Material).dispose();}map.clear();}for(const t of this.transient){const o=t.object as T.Line;this.scene.remove(o);o.geometry.dispose();(o.material as T.Material).dispose();}this.transient=[];this.particleData=[];this.pending=[];this.particles.count=0;}
 setInventory(v:PrivateState){this.inventory=v;let speed=0;for(const item of [v.equipment.weapon,v.equipment.armor])for(const a of item.affixes)if(AFFIXES[a.id].stat==='speed')speed+=a.value;this.speed=1+Math.min(.2,speed);}
 predict(input:Input){if(!this.state)return;if(this.revision!==this.state.revision){const p=this.state.players.get(this.localId);if(!p)return;this.predicted={x:p.x,z:p.z};this.pending=[];this.revision=this.state.revision;this.ack=-1;}
  if(input.menu)return;this.pending.push({...input});if(this.pending.length>30)this.pending.shift();this.predictStep(input);}
 predictStep(i:Input){const p=this.state?.players.get(this.localId);if(!p||p.status!=='standing'||i.menu)return;const len=Math.max(1,Math.hypot(i.mx,i.mz));const speed=5*this.speed*(p.action==='charge'?.6:p.action==='whirlwind'?.5:1);move(this.predicted,(i.mx*Math.cos(i.yaw)+i.mz*Math.sin(i.yaw))/len*speed/30,(i.mx*Math.sin(i.yaw)-i.mz*Math.cos(i.yaw))/len*speed/30,this.state.stage,new Set(this.state.broken.keys()));}
 reconcile(){const p=this.state?.players.get(this.localId);if(!p)return;if(this.revision!==this.state.revision){this.revision=this.state.revision;this.pending=[];this.predicted={x:p.x,z:p.z};this.ack=p.ack;}else if(p.ack!==this.ack){this.ack=p.ack;this.pending=this.pending.filter(i=>i.seq>p.ack);this.predicted={x:p.x,z:p.z};for(const i of this.pending)this.predictStep(i);}}
 aim(){this.ray.setFromCamera(new T.Vector2(0,0),this.camera);const objects=[this.world,...[...this.actors.entries()].filter(([id])=>id!==this.localId).map(([,v])=>v)];const hit=this.ray.intersectObjects(objects,true).find(h=>h.object.visible);const target=hit?.point||this.ray.ray.at(30,new T.Vector3());const origin=this.predicted;return {yaw:Math.atan2(target.x-origin.x,-(target.z-origin.z)),pitch:clamp(Math.atan2(target.y-1.25,Math.hypot(target.x-origin.x,target.z-origin.z)),-1.3,1.3)};}
 build(stage:number){this.stage=stage;this.world.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(o.material!==voxelMaterial){for(const m of Array.isArray(o.material)?o.material:[o.material]){const map=(m as T.MeshBasicMaterial).map;if(map)map.dispose();m.dispose();}}}});this.world.clear();this.groups.clear();const zone=ZONES[stage];
  const vox=new Voxels(),w=zone.width*2,d=zone.depth*2;
  vox.box(-w/2,-1,-d/2,w,1,d,stage===1?0x485258:0x68716e);
  for(let x=-w/2;x<w/2;x+=4)for(let z=-d/2;z<d/2;z+=4){if((x+z)%8===0)vox.box(x,-1,z,2,1,2,stage===1?0x515a5f:0x778079);}
  if(stage===1){vox.box(-6,-1,-d/2,12,1,d,0x3e494f);for(let z=-d/2;z<d/2;z+=9)vox.box(-1,-1,z,1,1,4,0x827b60);vox.box(-w/2,-1,-d/2,5,1,d,0x686f6e).box(w/2-5,-1,-d/2,5,1,d,0x686f6e);}
  vox.box(-w/2-2,0,-d/2,2,stage===1?14:8,d,0x4a4645).box(w/2,0,-d/2,2,stage===1?14:8,d,0x4a4645);
  vox.box(-w/2,0,-d/2-2,w,8,2,0x414749); // The exit is a ward in the north wall.
  for(let x=-w/2+2;x<w/2;x+=8){vox.box(x,3,-d/2-1,4,3,1,0x89958b).box(x,1,-d/2,4,1,1,0x4b8790);}
  if(stage===1){for(const side of [-1,1])for(let z=-d/2;z<d/2;z+=10){const x=side<0?-w/2-8:w/2+2;const height=24+Math.round(Math.sin(z*3)*4);vox.box(x,0,z,6,height,9,side<0?0x66564c:0x75594e);for(let y=5;y<height-3;y+=6){vox.box(side<0?x+6:x-1,y,z+2,1,3,3,0x719098).box(side<0?x+6:x-1,y,z+6,1,3,2,0x719098);vox.box(x,y-1,z,6,1,9,0x8a8071);}vox.box(x+1,height,z+2,2,4,2,0x474e50);}
   // A distant ruined bell tower anchors the London skyline.
   vox.box(-40,0,-60,8,42,8,0x4c5759).box(-41,34,-61,10,3,10,0x71756c).box(-38,42,-58,4,8,4,0x455052).box(-37,50,-57,2,5,2,0x394348).box(-39,36,-51,6,5,1,0xb9b9a2).box(-37,37,-50,1,3,1,0x48524f).box(-37,38,-50,2,1,1,0x48524f);
  }
  else {for(const side of [-1,1]){vox.box(side*(w/2-2),0,-d/2,1,2,d,0x956e55);vox.box(side*(w/2-2),2,-d/2,1,1,d,0xc0b6a1);}}
  this.world.add(vox.mesh());
  const props=new Voxels();for(const side of [-1,1])for(const z of [-zone.depth/2+6,zone.depth/2-7]){props.box(side*18,0,z*2,1,10,1,0x37484a).box(side*18-1,10,z*2-1,3,2,3,0xb0a386).box(side*18,11,z*2,1,1,1,0xebcea0);}
  if(stage===5){for(const x of [-10,10])props.box(x*2,-1,-zone.depth,2,1,zone.depth*2,0x393e3d);props.box(-4,0,-24,8,3,4,0x5e7474).box(-2,3,-25,4,8,2,0x87b8a7);}
  if(stage===3)props.box(-4,0,-16,8,4,4,0x8b8580).box(-2,4,-16,4,2,4,0xb7b09a);
  if(stage===4)props.box(-1,0,-18,2,14,2,0x48595c).box(-4,5,-19,8,6,2,0x6a7f75).box(-3,6,-20,6,3,1,0x91ccbe);
  for(let i=0;i<28;i++){const x=Math.sin(i*13.12+stage)*zone.width*.43,z=Math.cos(i*7.39)*zone.depth*.44;props.box(Math.round(x*2),0,Math.round(z*2),1+(i%2),1,1+(i%3===0?1:0),i%2?0x676760:0x807968);}
  this.world.add(props.mesh());
  for(const box of obstacles(stage)){
   const v=new Voxels().box(-Math.round(box.w),0,-Math.round(box.d),Math.round(box.w*2),Math.round(box.h*2),Math.round(box.d*2),box.breakable?0x846747:0x596568);
   if(box.breakable)v.box(-Math.round(box.w),Math.round(box.h*2)-1,-Math.round(box.d),Math.round(box.w*2),1,1,0xebad4f);
   if(box.id==='bus'){v.cells.clear();v.box(-3,0,-9,6,2,18,0x343a3a).box(-3,2,-9,6,11,18,0x873e33);for(let z=-7;z<8;z+=4){v.box(-3,4,z,6,3,2,0x57747b);v.box(-3,9,z,6,3,2,0x57747b);}v.box(-3,4,-9,6,3,1,0x9fa099).box(-3,10,-9,6,2,1,0x89979b).box(-3,8,-10,6,1,1,0xc2a572);v.box(-4,0,-6,1,3,3,0x24292c).box(3,0,-6,1,3,3,0x24292c).box(-4,0,4,1,3,3,0x24292c).box(3,0,4,1,3,3,0x24292c);}
   const m=v.mesh();m.position.set(box.x,0,box.z);this.groups.set(box.id,m);this.world.add(m);
  }
  const gate=new T.Mesh(new T.PlaneGeometry(3.8,4.5),new T.MeshBasicMaterial({color:0x6de3d5,transparent:true,opacity:.23,side:T.DoubleSide}));gate.position.set(0,2.25,-zone.depth/2+.2);this.world.add(gate);
  const halo=new T.Mesh(new T.TorusGeometry(2,.09,4,24),new T.MeshBasicMaterial({color:0x80f7db}));halo.position.copy(gate.position);this.world.add(halo);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#222e37';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#e8dfc6';ctx.textAlign='center';ctx.font='bold 48px Arial';ctx.fillText(stage===5?'ALDWYCH':zone.name.toUpperCase(),512,65);ctx.fillStyle='#a9c1b3';ctx.font='18px Arial';ctx.fillText(stage===1?'STRAND · LONDON WC2':'THE HOLLOW LINE · WARD NETWORK',512,104);const sign=new T.Mesh(new T.PlaneGeometry(7, .875),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas)}));sign.position.set(0,5.3,-zone.depth/2+.3);this.world.add(sign);
  if(stage>1){const roundel=new Voxels();for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++){const r=Math.hypot(x,y);if(r>3.7&&r<5.3)roundel.box(x,y,0,1,1,1,0x9e4338);}roundel.box(-6,-1,-1,13,3,1,0x354e68);const m=roundel.mesh(.25);m.position.set(-7,3.8,-zone.depth/2+.5);this.world.add(m);}
 }
 avatar(kind:string){const group=new T.Group();group.userData.kind=kind;const c=CLASSES[kind as ClassId]?.color||0xb95438;const v=new Voxels().box(-3,5,-2,6,7,4,0x3e474b).box(-2,12,-2,4,4,4,0xc7c1ac).box(-4,9,-2,2,4,4,c).box(2,9,-2,2,4,4,c).box(-3,0,-1,2,5,2,0x393d42).box(1,0,-1,2,5,2,0x393d42);
  if(kind in CLASSES)for(const[key,cell]of v.cells)if(cell.y<5)v.cells.delete(key);
  if(kind==='carrion_runner'){v.cells.clear();v.box(-3,2,-4,6,4,8,0x7e3e34).box(-2,4,-6,4,3,4,0xc1a18b).box(-5,0,-5,2,3,9,0x454237).box(3,0,-5,2,3,9,0x454237).box(-2,5,-7,1,1,1,0xff9d53).box(1,5,-7,1,1,1,0xff9d53);}
  else if(kind==='riftspitter'){v.cells.clear();v.box(-2,5,-2,4,9,4,0x65785e).box(-3,14,-3,6,4,6,0xa0a47a).box(-2,14,-4,4,2,1,0xcfe984).box(-3,0,-1,2,5,2,0x575e49).box(1,0,-1,2,5,2,0x575e49).box(-4,7,-1,2,6,2,0x7e876c).box(2,7,-1,2,6,2,0x7e876c);}
  else if(kind==='ironbound_bulwark'){v.cells.clear();v.box(-6,6,-4,12,12,8,0x4f5557).box(-3,18,-3,6,4,6,0x928e80).box(-8,9,-5,3,10,10,0x77746b).box(5,9,-5,3,10,10,0x77746b).box(-5,7,-5,10,9,2,0xa2957e).box(-2,11,-6,4,3,1,0xe0a863).box(-5,0,-2,4,6,4,0x454a4b).box(1,0,-2,4,6,4,0x454a4b);}
  else if(kind==='breach_cantor'){v.cells.clear();v.box(-3,8,-3,6,7,6,0x685581).box(-2,15,-2,4,4,4,0xc3afc7).box(-5,10,-2,2,7,4,0x8c72a4).box(3,10,-2,2,7,4,0x8c72a4).box(-1,5,-1,2,3,2,0xcc9be8).box(-5,8,-2,2,2,4,0xe8b78b).box(3,8,-2,2,2,4,0xe8b78b);}
  else if(kind==='bellwether'){v.cells.clear();v.box(-6,10,-4,12,13,8,0x888379).box(-5,23,-4,10,8,8,0xbbb5a0).box(-7,22,-5,14,2,10,0x6b675a).box(-2,13,-5,4,7,1,0xffa24f).box(-11,13,-3,4,13,6,0x6f6b62).box(7,13,-3,4,13,6,0x6f6b62).box(-6,0,-3,4,10,6,0x6a6b64).box(2,0,-3,4,10,6,0x6a6b64).box(-7,31,-1,2,3,2,0xcac4b2).box(5,31,-1,2,3,2,0xcac4b2);}
  if(kind==='blademaster')v.box(-6,4,-4,1,9,1,0xdfc6a1).box(5,4,-4,1,9,1,0xdfc6a1);
  else if(kind==='evoker')v.box(-4,2,-2,8,3,4,0x655b87).box(4,7,-5,2,2,2,0x99eaee);
  else v.box(3,6,-7,2,2,7,0x889294).box(3,8,-5,2,1,3,c);
  const body=v.mesh(.125);body.material=voxelMaterial.clone();group.add(body);
  if(kind in CLASSES)for(const side of [-1,1]){const leg=new Voxels().box(-1,-5,-1,2,5,2,0x3b4247).mesh(.125);leg.material=voxelMaterial.clone();leg.name=side<0?'legL':'legR';leg.position.set(side*.25,.625,0);group.add(leg);}
  if(kind==='bellwether'){for(const [name,x]of [['plateL',-1.12],['plateR',1.12]] as const){const plate=new T.Mesh(cubeGeometry,new T.MeshStandardMaterial({color:0xbfb393,roughness:.7,metalness:.35}));plate.name=name;plate.position.set(x,2.7,0);plate.scale.set(.65,1.1,.95);group.add(plate);}}
  if(kind in ENEMIES){const danger=new T.Mesh(circleGeometry,new T.MeshBasicMaterial({color:0xff986e,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));danger.name='tell';danger.rotation.x=-Math.PI/2;danger.position.y=.035;danger.visible=false;group.add(danger);}
  return group;
 }
 emit(x:number,y:number,z:number,color:number,count=8,debris=false){for(let i=0;i<count&&this.particleData.length<240;i++)this.particleData.push({x,y,z,vx:(Math.random()-.5)*(debris?4:2.5),vy:Math.random()*3+1,vz:(Math.random()-.5)*(debris?4:2.5),size:debris?.16:.045,life:debris?1.3:.35,color});}
 event(e:any){const now=performance.now();const rig=this.actors.get(e.target||e.owner);if(e.kind==='hit'&&rig){rig.userData.hit=now+90;this.emit(e.x,1,e.z,e.weak?0xffd17b:0xdcbd8b,5);}if(e.kind==='hurt'&&rig)rig.userData.hit=now+160;
  if(['kill','break','plate_break','explosion','boss_phase'].includes(e.kind))this.emit(e.x||0,e.kind==='plate_break'?2.8:.8,e.z||0,e.kind==='break'?0x988477:0xecc090,settings.quality==='low'?12:24,e.kind==='break');
  if(['rifle','execution','arc','ricochet','arc_coil'].includes(e.kind)&&typeof e.tx==='number'){
   const color=e.kind==='arc'||e.kind==='arc_coil'?0xa9b5fa:e.kind==='ricochet'?0xf4cc87:0xffe4bc;
   const points=[new T.Vector3(e.x,1.25,e.z),new T.Vector3(e.tx,1.25,e.tz)];if(e.kind==='arc')points.splice(1,0,new T.Vector3((e.x+e.tx)/2+.15,1.5,(e.z+e.tz)/2));const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.9}));this.scene.add(line);this.transient.push({object:line,end:now+(e.kind==='execution'?180:95)});
  }
  if(['cut','whirlwind','martyrs_engine','boss_sweep'].includes(e.kind)){const angle=e.kind==='cut'?110*Math.PI/180:Math.PI*2,g=new T.RingGeometry(.65,.95,20,1,Math.PI/2-angle/2,angle),m=new T.Mesh(g,new T.MeshBasicMaterial({color:e.kind==='boss_sweep'?0xff9c73:0xe7d8ab,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.rotation.z=e.yaw||0;m.scale.setScalar(e.radius||2.4);m.position.set(e.x, .7,e.z);this.scene.add(m);this.transient.push({object:m,end:now+130});}
  if(['legendary','heal','revive','blood_seal'].includes(e.kind))this.emit(e.x||this.predicted.x,1,e.z||this.predicted.z,e.kind==='legendary'?0xffc874:0x91dfbb,20);
 }
 syncFX(){const seen=new Set<string>();for(const f of this.state.effects.values()){seen.add(f.id);let group=this.fx.get(f.id);if(!group){group=new T.Group();const danger=['spit','boss_ring','ground_strike','volatile'].includes(f.kind),color=danger?0xff805a:f.kind==='ember'?0xffbb7f:f.kind==='red_wake'?0xd46b50:f.kind==='ping'?0xc8efbb:0xa9a9ee;
    const geometry=['spit','ember','red_wake'].includes(f.kind)?cubeGeometry:circleGeometry;const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));if(geometry===circleGeometry)mesh.rotation.x=-Math.PI/2;group.add(mesh);this.scene.add(group);this.fx.set(f.id,group);}
   const mesh=group.children[0]as T.Mesh,progress=clamp((this.state.time-f.start)/(f.end-f.start),0,1);group.position.set(f.x,f.y||.04,f.z);
   if(f.kind==='red_wake'){const length=Math.hypot(f.tx-f.x,f.tz-f.z);group.position.set((f.x+f.tx)/2,.08,(f.z+f.tz)/2);mesh.scale.set(1,.06,Math.max(.1,length));group.rotation.y=-Math.atan2(f.tx-f.x,-(f.tz-f.z));}
   else if(['ember','spit'].includes(f.kind)){mesh.scale.setScalar(f.kind==='spit'?.36:.22);mesh.rotation.set(progress*8,progress*4,progress*3);}
   else {const radius=f.kind==='boss_ring'?f.radius*progress:f.radius;mesh.scale.setScalar(radius);(mesh.material as T.MeshBasicMaterial).opacity=f.kind==='well'?.6:Math.min(.9,.35+progress*.5);if(f.kind==='well'&&this.sampledFrames%8===0)this.emit(f.x,.15,f.z,0xada5dd,1);}
  }
  for(const cantor of this.state.enemies.values())if(cantor.kind==='breach_cantor'){
   const auraId=`aura_${cantor.id}`;seen.add(auraId);let aura=this.fx.get(auraId);if(!aura){aura=new T.Group();const ring=new T.Mesh(circleGeometry,new T.MeshBasicMaterial({color:0xb595d7,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.scale.setScalar(6);aura.add(ring);this.scene.add(aura);this.fx.set(auraId,aura);}aura.position.set(cantor.x,.025,cantor.z);
   for(const ally of this.state.enemies.values())if(ally.id!==cantor.id&&ally.kind!=='breach_cantor'&&ally.kind!=='bellwether'&&distance(cantor,ally)<=6&&!obstruction(cantor,ally,this.state.stage,new Set(this.state.broken.keys()))){const id=`tether_${cantor.id}_${ally.id}`;seen.add(id);let group=this.fx.get(id);if(!group){group=new T.Group();group.add(new T.Mesh(cubeGeometry,new T.MeshBasicMaterial({color:0xb599d6,transparent:true,opacity:.45})));this.scene.add(group);this.fx.set(id,group);}group.position.set((cantor.x+ally.x)/2,1.25,(cantor.z+ally.z)/2);group.rotation.y=-Math.atan2(ally.x-cantor.x,-(ally.z-cantor.z));group.children[0].scale.set(.035,.035,distance(cantor,ally));}
  }
  for(const [id,g]of this.fx)if(!seen.has(id)){this.scene.remove(g);for(const child of g.children)(child as T.Mesh).material instanceof T.Material&&((child as T.Mesh).material as T.Material).dispose();this.fx.delete(id);}
 }
 syncLoot(){const seen=new Set<string>();for(const d of this.inventory?.drops||[]){seen.add(d.id);let group=this.loot.get(d.id);if(!group){group=new T.Group();const color=rarityColors[d.item.rarity];const beam=new T.Mesh(beamGeometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.28,depthWrite:false}));beam.position.y=1.5;const icon=new T.Mesh(cubeGeometry,new T.MeshBasicMaterial({color}));icon.position.y=.6;icon.scale.setScalar(.24);group.add(beam,icon);group.position.set(d.x,.05,d.z);this.scene.add(group);this.loot.set(d.id,group);}group.children[1].rotation.y=this.state.time*1.5;group.children[1].position.y=.6+Math.sin(this.state.time*3)*.08;}
  for(const[id,g]of this.loot)if(!seen.has(id)){this.scene.remove(g);for(const m of g.children)((m as T.Mesh).material as T.Material).dispose();this.loot.delete(id);}
 }
 animate=()=>{requestAnimationFrame(this.animate);const dt=Math.min(this.clock.getDelta(),.1);this.frames.push(dt*1000);if(this.frames.length>3600)this.frames.shift();this.sampledFrames++;
  if(this.state){if(this.stage!==this.state.stage)this.build(this.state.stage);
   for(const [id,m] of this.groups)m.visible=!this.state.broken.has(id);
   const seen=new Set<string>();for(const p of [...this.state.players.values(),...this.state.enemies.values()]){seen.add(p.id);const kind=p.kind==='player'||p.kind==='companion'?p.classId:p.kind;let rig=this.actors.get(p.id);if(rig&&rig.userData.kind!==kind){this.scene.remove(rig);rig.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry!==cubeGeometry&&o.geometry!==circleGeometry)o.geometry.dispose();(o.material as T.Material).dispose();}});this.actors.delete(p.id);rig=undefined;}if(!rig){rig=this.avatar(kind);this.actors.set(p.id,rig);this.scene.add(rig);}rig.position.lerp(new T.Vector3(p.x,p.status==='downed'?.05:0,p.z),Math.min(1,dt*14));rig.rotation.y=-p.yaw;rig.rotation.z=p.status==='standing'?Math.sin(this.state.time*7+kind.length)*.015:Math.PI/2;rig.scale.setScalar(p.action==='tell'?1+Math.sin(this.state.time*20)*.035:1);}
   for(const p of [...this.state.players.values(),...this.state.enemies.values()]){const rig=this.actors.get(p.id)!;const body=rig.children[0]as T.Mesh;(body.material as T.MeshStandardMaterial).emissive.setHex(rig.userData.hit>performance.now()?0x805a30:0);const tell=rig.getObjectByName('tell')as T.Mesh|undefined;if(tell){tell.visible=p.action.includes('tell');const radius=p.kind==='bellwether'?5:p.kind==='ironbound_bulwark'?4:p.kind==='breach_cantor'?6:p.kind==='riftspitter'?1.4:1.8;tell.scale.setScalar(radius);tell.position.y=.04;}
    if(p.kind==='bellwether'){rig.getObjectByName('plateL')!.visible=p.plateL>0;rig.getObjectByName('plateR')!.visible=p.plateR>0;}
    if(!settings.reducedMotion){body.rotation.z=p.action==='primary'?Math.sin(this.state.time*30)*.1:p.action==='whirlwind'?Math.sin(this.state.time*35)*.2:0;body.rotation.x=p.action==='dodge'?.2:0;const walking=Math.hypot(p.x-(rig.userData.lastX??p.x),p.z-(rig.userData.lastZ??p.z))>.005;for(const side of [-1,1]){const leg=rig.getObjectByName(side<0?'legL':'legR');if(leg)leg.rotation.x=walking?Math.sin(this.state.time*12)*.5*side:0;}rig.userData.lastX=p.x;rig.userData.lastZ=p.z;}
   }
   for(const [id,rig] of this.actors)if(!seen.has(id)){this.scene.remove(rig);rig.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry!==cubeGeometry&&o.geometry!==circleGeometry)o.geometry.dispose();(o.material as T.Material).dispose();}});this.actors.delete(id);}
   this.reconcile();const p=this.state.players.get(this.localId);if(p){const rig=this.actors.get(this.localId);if(rig)rig.position.set(this.predicted.x,rig.position.y,this.predicted.z);const target=new T.Vector3(this.predicted.x,1.6,this.predicted.z);const dir=new T.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));const right=new T.Vector3(Math.cos(this.yaw),0,Math.sin(this.yaw));const pos=target.clone().addScaledVector(dir,-4.5).addScaledVector(right,.65);pos.y+=.6;
    const dx=pos.x-target.x,dz=pos.z-target.z,length=Math.hypot(dx,dz);let allowed=length;for(const box of obstacles(this.state.stage))if(!this.state.broken.has(box.id)){const t=rayBox(target.x,target.z,dx/length,dz/length,box);if(t<allowed&&target.y+(pos.y-target.y)*(t/length)<box.h)allowed=Math.max(.25,t-.25);}const zone=ZONES[this.state.stage];pos.x=clamp(target.x+dx/length*allowed,-zone.width/2+.25,zone.width/2-.25);pos.z=clamp(target.z+dz/length*allowed,-zone.depth/2+.25,zone.depth/2-.25);pos.y=target.y+(pos.y-target.y)*allowed/length;this.camera.position.copy(pos);this.camera.lookAt(target.clone().addScaledVector(dir,20).addScaledVector(right,.65));}
   this.syncFX();this.syncLoot();
  }else {this.camera.position.x=14+Math.sin(performance.now()*.00007)*2;this.camera.lookAt(0,1,-4);}
  for(let i=this.particleData.length-1;i>=0;i--){const p=this.particleData[i];p.life-=dt;if(p.life<=0){this.particleData.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7*dt;if(p.y<.08){p.y=.08;p.vy=0;p.vx*=.92;p.vz*=.92;}this.tmp.position.set(p.x,p.y,p.z);this.tmp.scale.setScalar(p.size*Math.min(1,p.life*5));this.tmp.updateMatrix();this.particles.setMatrixAt(i,this.tmp.matrix);this.particles.setColorAt(i,new T.Color(p.color));}this.particles.count=this.particleData.length;this.particles.instanceMatrix.needsUpdate=true;if(this.particles.instanceColor)this.particles.instanceColor.needsUpdate=true;
  for(let i=this.transient.length-1;i>=0;i--)if(this.transient[i].end<performance.now()){const o=this.transient[i].object as T.Line;this.scene.remove(o);o.geometry.dispose();(o.material as T.Material).dispose();this.transient.splice(i,1);}
  this.renderer.render(this.scene,this.camera);
 };
}
