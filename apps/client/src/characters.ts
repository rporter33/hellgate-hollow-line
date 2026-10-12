import * as T from 'three';
import {Voxels,voxelMaterial} from './voxel';
import {ARMOR_SLOTS,type ClassId} from '../../../packages/shared/src/content';

const CELL=.05;
const DETAIL=.025;
const cloth=0x252b31,joint=0x393c40,skin=0xb5a58e;
function mesh(v:Voxels,name:string,parent:T.Object3D){
 const fine=new Voxels();for(const c of v.cells.values())fine.box(c.x*2,c.y*2,c.z*2,2,2,2,c.color);
 if(name==='armor_chest')for(const [key,c]of fine.cells){if(c.y>=46&&c.y<64&&Math.abs(c.x+.5)>(c.y<50?7:c.y<56?8:9))fine.cells.delete(key);}
 {const bevel:string[]=[];for(const [key,c]of fine.cells){const exposed=(axis:'x'|'y'|'z',sign:number)=>{const p={...c};p[axis]+=sign;return !fine.cells.has(`${p.x},${p.y},${p.z}`);};const corner=['x','y','z'].filter(a=>exposed(a as 'x'|'y'|'z',1)||exposed(a as 'x'|'y'|'z',-1)).length;if(corner===3)bevel.push(key);}for(const key of bevel)fine.cells.delete(key);}
 const m=fine.mesh(DETAIL);m.name=name;m.material=voxelMaterial.clone();if((name.startsWith('gear_')||name.startsWith('armor_'))){(m.material as T.MeshStandardMaterial).metalness=.3;(m.material as T.MeshStandardMaterial).roughness=.72;}parent.add(m);return m;
}
function pivot(parent:T.Object3D,name:string,x:number,y:number,z=0){const p=new T.Group();p.name=name;p.position.set(x,y,z);parent.add(p);return p;}
function clearPart(rig:T.Group,name:string){const parts:T.Mesh[]=[];rig.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(name))parts.push(o);});for(const o of parts){o.geometry.dispose();(o.material as T.Material).dispose();o.removeFromParent();}}

export function character(classId:ClassId){
 const rig=new T.Group();rig.userData.kind=classId;rig.userData.humanoid=true;
 const spine=pivot(rig,'spine',0,0);
 mesh(new Voxels().ellipsoid(0,24,0,4,5,2.5,cloth).ellipsoid(0,29,0,5,5,2.5,cloth).box(-2,34,-2,4,2,4,skin),'base_torso',spine).scale.x=.82;
 const head=pivot(spine,'head',0,1.78);
 mesh(new Voxels().ellipsoid(0,2.5,0,2.5,3,2.5,skin).box(-2,4,-2,4,1,4,0x3c3735).box(-2,2,-3,4,1,1,0x756457),'base_head',head);
 for(const side of [-1,1]){
  const suffix=side<0?'L':'R',leg=pivot(spine,'leg'+suffix,side*.14,1.03),knee=pivot(leg,'knee'+suffix,0,-.51);
  mesh(new Voxels().ellipsoid(0,-5,0,2.2,5.5,2.2,cloth).box(-2,-10,-3,4,2,1,joint),'base_thigh'+suffix,leg).scale.x=.8;
  mesh(new Voxels().ellipsoid(0,-4.5,0,1.8,5,1.8,cloth).box(-2,-10,-4,4,2,6,joint),'base_shin'+suffix,knee).scale.x=.8;
  const arm=pivot(spine,'arm'+suffix,side*.27,1.64),elbow=pivot(arm,'elbow'+suffix,0,-.32),hand=pivot(elbow,'hand'+suffix,0,-.34);
  mesh(new Voxels().ellipsoid(0,-3,0,1.9,3.5,1.9,cloth).box(-2,-7,-2,4,2,4,joint),'base_upper_arm'+suffix,arm).scale.x=.78;
  mesh(new Voxels().ellipsoid(0,-3,0,1.9,3.5,1.9,cloth),'base_forearm'+suffix,elbow).scale.x=.78;
  mesh(new Voxels().box(-1,-2,-1,2,2,3,skin),'base_hand'+suffix,hand);
 }
 dress(rig,{helmetLook:'common:',chestLook:'common:',armsLook:'common:',legsLook:'common:',weaponLook:'common:',relic:'',mod:''});return rig;
}

type Appearance={helmetLook:string;chestLook:string;armsLook:string;legsLook:string;weaponLook:string;relic:string;mod:string};
export function dress(rig:T.Group,p:Appearance){
 const key=[...ARMOR_SLOTS.map(slot=>p[`${slot}Look`]),p.weaponLook,p.relic,p.mod].join('|');if(rig.userData.look===key)return;rig.userData.look=key;
 const weaponChanged=rig.userData.weaponLook!==`${p.weaponLook}:${p.mod}`,relicChanged=rig.userData.relic!==p.relic;rig.userData.weaponLook=`${p.weaponLook}:${p.mod}`;rig.userData.relic=p.relic;const kind=rig.userData.kind as ClassId;
 const spine=rig.getObjectByName('spine')!,head=rig.getObjectByName('head')!;
 const light=kind==='evoker'?0x9bb8ec:kind==='marksman'?0x8ed4d6:0xe3c282;
 const trim=kind==='blademaster'?0xc3a15d:kind==='marksman'?0x99b9be:0xb7a0cf;
 for(const slot of ARMOR_SLOTS){const look=p[`${slot}Look`];if(rig.userData[`${slot}Look`]===look)continue;rig.userData[`${slot}Look`]=look;clearPart(rig,`armor_${slot}`);
 const rare=look.startsWith('rare'),magic=!look.startsWith('common'),heavy=look.includes('plated');
 const steel=kind==='blademaster'?(rare?0xbdb6a1:0x8a8a80):kind==='marksman'?(rare?0xb2b8af:0x727f80):rare?0x958798:0x665a6f;
 if(slot==='chest'){const chest=new Voxels().box(-5,25,-3,10,7,1,steel).box(-4,24,2,8,8,1,steel).box(-5,23,-3,10,2,1,trim).box(-4,30,-4,8,2,1,steel).box(-1,26,-4,2,5,1,trim).box(-4,26,-4,1,3,1,trim).box(3,26,-4,1,3,1,trim).box(-4,20,-3,8,2,1,0x4d4b40);
 if(kind==='blademaster'){chest.box(-3,24,-4,6,1,1,steel).box(-1,28,-5,2,3,1,light).box(-3,29,-5,6,1,1,light);for(const side of [-1,1])chest.box(side<0?-5:2,18,-3,3,5,1,steel);}
 if(kind==='marksman'){chest.box(-4,22,-4,3,3,2,0x6b614c).box(1,22,-4,3,3,2,0x6b614c).box(-1,25,-4,2,3,1,0x3c4746).box(-4,31,-4,8,1,1,trim).box(-2,25,3,4,6,2,steel).box(-1,26,5,2,4,1,0x384745).box(-1,29,6,2,1,1,light);}
 if(kind==='evoker'){chest.box(-5,23,-3,1,10,1,trim).box(4,23,-3,1,10,1,trim).box(-2,29,-4,4,2,1,light);for(let row=9;row<24;row+=3)chest.box(-5,row,3,10,3,1,row%2?0x3e374c:0x463b53);chest.box(-4,9,-3,3,12,1,0x473d57).box(1,9,-3,3,12,1,0x473d57).box(-4,9,-4,1,12,1,trim).box(3,9,-4,1,12,1,trim);}
 if(rare)chest.box(-3,28,-5,6,1,1,trim).box(-1,25,-5,2,4,1,light);
 if(heavy)chest.box(-6,25,-4,2,6,1,steel).box(4,25,-4,2,6,1,steel);
 mesh(chest,'armor_chest',spine).scale.x=.84;}
 if(slot==='helmet'){
 const helmet=new Voxels();
 if(kind==='blademaster'){helmet.ellipsoid(0,3,.5,3.2,3.5,2.8,steel).box(-2,1,-3,4,4,1,steel).box(-2,3,-4,4,1,1,light).box(-1,0,-4,2,3,1,0x514e47);if(rare)helmet.box(-1,6,-1,2,2,2,trim).box(-3,5,0,1,2,2,trim).box(2,5,0,1,2,2,trim);}
 if(kind==='marksman'){helmet.ellipsoid(0,3,0,3.2,3.5,3,steel).erase(-2,0,-4,4,4,3).box(-3,0,-2,1,4,5,steel).box(2,0,-2,1,4,5,steel).box(-2,2,-3,4,2,1,0x486873).box(-2,3,-4,4,1,1,light).box(3,1,0,1,3,1,0x39484b);if(rare)helmet.box(-1,6,-1,2,1,2,trim);}
 if(kind==='evoker'){helmet.box(-3,-1,-2,1,7,6,0x41364f).box(2,-1,-2,1,7,6,0x41364f).box(-3,5,-2,6,2,6,0x41364f).box(-2,0,2,4,5,2,0x41364f).box(-3,0,-3,1,6,1,trim).box(2,0,-3,1,6,1,trim);if(rare)helmet.box(-3,6,0,1,3,1,trim).box(2,6,0,1,3,1,trim);}
 if(magic)helmet.box(-1,5,-3,2,1,1,light);
 mesh(helmet,'armor_helmet',head);}
 for(const side of [-1,1]){
  const s=side<0?'L':'R',arm=rig.getObjectByName('arm'+s)!,elbow=rig.getObjectByName('elbow'+s)!,leg=rig.getObjectByName('leg'+s)!,knee=rig.getObjectByName('knee'+s)!;
  const width=kind==='blademaster'?(heavy||rare?6:5):kind==='marksman'?3.5:3;
  if(slot==='arms'){mesh(new Voxels().ellipsoid(0,-.5,0,width/2,2,2.6,steel).box(-Math.floor(width/2),-1,-3,width,1,1,trim).box(-2,-5,-3,4,3,1,steel),'armor_arms_shoulder'+s,arm);
  mesh(new Voxels().box(-2,-6,-3,4,5,1,steel).box(-2,-6,2,4,5,1,steel).box(-2,-4,-4,4,1,1,trim).box(-1,-2,-4,2,1,1,magic?light:steel),'armor_arms_gauntlet'+s,elbow).scale.x=.82;
  if(rare)mesh(new Voxels().box(-1,-5,-5,2,4,1,trim).box(-1,-2,-6,2,1,1,light),'armor_arms_crest'+s,elbow);
  }
  if(slot==='legs'){mesh(new Voxels().box(-2,-10,-3,4,7,1,steel).box(-2,-10,-4,4,2,1,trim),'armor_legs_thigh'+s,leg).scale.x=.82;
  mesh(new Voxels().box(-2,-8,-3,4,8,1,steel).box(-1,-7,-4,2,6,1,trim).box(-2,-10,-5,4,3,7,steel).box(-2,-10,-6,4,1,1,0x313b3d),'armor_legs_greave'+s,knee).scale.x=.82;
  if(magic)mesh(new Voxels().box(-1,-3,-5,2,2,1,light),'armor_legs_seal'+s,knee);}
 }
 }
 if(weaponChanged){clearPart(rig,'gear_weapon');const steel=kind==='blademaster'?0x8a8a80:kind==='marksman'?0x727f80:0x665a6f;const weaponRare=p.weaponLook.startsWith('rare'),weaponMagic=!p.weaponLook.startsWith('common'),weaponMetal=weaponRare?0xc5c3b0:0x878f90,accent=p.mod==='blood_seal'?0xe39884:p.mod==='breach_core'?0xe9bb67:p.mod==='arc_coil'?0xb6b8f0:light;
 for(const side of kind==='blademaster'?[-1,1]:[1]){
  const hand=rig.getObjectByName(side<0?'handL':'handR')!,weapon=new Voxels();
  if(kind==='blademaster'){weapon.box(-1,-3,-1,2,5,2,0x4c4940).box(-4,1,-2,8,1,3,trim).box(-1,2,-1,2,19,2,weaponMetal).box(-1,21,-1,1,3,1,weaponMetal).box(-1,5,-2,2,14,1,weaponMagic?accent:0xd1caba);if(weaponRare)weapon.box(-2,3,-1,4,3,2,trim);}
  else if(kind==='marksman'){weapon.box(-2,-1,-9,4,4,10,weaponMetal).box(-2,0,1,4,3,4,0x40494b).box(-1,0,-18,2,2,9,0x4b5657).box(-2,-1,-17,4,4,2,weaponMetal).box(-1,-5,-6,2,4,3,0x414846).box(-1,-4,-1,2,3,2,0x554e42).box(-1,3,-11,2,2,6,0x344647).box(-1,4,-12,2,1,1,accent).box(-3,1,-8,1,1,6,accent);for(let z=-15;z<-9;z+=2)weapon.box(-2,0,z,4,1,1,0x364344);if(weaponRare)weapon.box(-3,-2,-8,6,1,8,weaponMetal).box(-2,-2,-17,4,1,1,accent);}
  else{weapon.box(-2,-2,-4,4,4,6,steel).box(-3,0,-5,6,1,5,trim).box(-1,1,-6,2,3,2,accent).box(-2,-1,-7,1,4,2,trim).box(1,-1,-7,1,4,2,trim);if(weaponRare)weapon.box(-3,1,-6,1,3,1,trim).box(2,1,-6,1,3,1,trim);}
  mesh(weapon,'gear_weapon'+side,hand);
 }
 }
 if(relicChanged){clearPart(rig,'gear_relic');if(p.relic){const color=p.relic==='red_wake'||p.relic==='cinder_choir'?0xee9e7c:p.relic==='event_horizon'?0xb4abed:0xe6c383;mesh(new Voxels().box(-1,27,4,2,3,1,color).box(-2,28,4,4,1,1,color),'gear_relic',spine);}}
}

export function pose(rig:T.Group,p:any,time:number,walking:boolean,reduced:boolean){
 const kind=rig.userData.kind as ClassId,spine=rig.getObjectByName('spine')!;
 const phase=time*10,step=walking&&!reduced?Math.sin(phase)*.36:0;
 spine.position.y=walking&&!reduced?Math.abs(Math.sin(phase))*.025:0;spine.rotation.x=p.action==='dodge'?.25:p.action==='lunge'?.15:0;
 for(const side of [-1,1]){const s=side<0?'L':'R',arm=rig.getObjectByName('arm'+s)!,elbow=rig.getObjectByName('elbow'+s)!,leg=rig.getObjectByName('leg'+s)!,knee=rig.getObjectByName('knee'+s)!;
  leg.rotation.x=step*side;knee.rotation.x=-Math.max(0,step*side)*.6;arm.rotation.set(kind==='marksman'?.6:kind==='evoker'?.7:-step*side*.5,0,side*-.06);elbow.rotation.x=kind==='marksman'?1.1:kind==='evoker'?.6:.1;
  if(kind==='blademaster'&&['primary','whirlwind'].includes(p.action)){arm.rotation.x=.8;arm.rotation.z=side*(.35+Math.sin(time*22)*.6);elbow.rotation.x=.4;}
  if(kind==='evoker'&&['arc','well'].includes(p.action))arm.rotation.x=1.3;
  if(kind==='marksman'&&p.action==='reload'){arm.rotation.x=.9;elbow.rotation.x=1.4;}
  const weapon=rig.getObjectByName('gear_weapon'+side);if(weapon&&kind!=='blademaster')weapon.rotation.x=-(arm.rotation.x+elbow.rotation.x)+p.pitch;
 }
 if(!reduced)spine.rotation.y=p.action==='whirlwind'?time*15:0;
}
