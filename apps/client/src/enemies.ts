import * as T from 'three';
import {Voxels,voxelMaterial} from './voxel';

const geometryCache=new Map<string,T.BufferGeometry>();
export function monster(kind:string){
 const rig=new T.Group();rig.userData.kind=kind;const cached=geometryCache.get(kind);if(cached){rig.add(new T.Mesh(cached,voxelMaterial.clone()));return rig;}const v=new Voxels();
 if(kind==='carrion_runner'){
  v.box(-3,5,-5,6,7,11,0x784a3f).box(-2,10,-10,4,5,6,0xb1a086).box(-2,9,-12,4,2,4,0x978673).box(-2,10,-13,1,1,1,0xe3b37a).box(1,10,-13,1,1,1,0xe3b37a);
  for(const s of [-1,1]){v.box(s<0?-6:4,1,-8,2,9,3,0x4b453b).box(s<0?-5:3,1,3,2,8,3,0x4b453b).box(s<0?-7:4,0,-10,3,2,5,0xaba18a);}
  for(let z=-3;z<7;z+=3)v.box(-1,12,z,2,4,1,0xc0ad8e);v.box(-1,7,6,2,2,6,0x756051).box(-1,8,12,1,2,3,0xa68e6c);
 }
 if(kind==='riftspitter'){
  v.box(-3,16,-2,6,13,5,0x62715d).box(-2,29,-2,4,4,4,0xb4a07a).box(-3,32,-3,6,4,6,0x8c9672).box(-2,31,-4,4,2,2,0xc0cf84).box(-2,25,-3,4,5,1,0xd1dc88);
  for(const s of [-1,1])v.box(s<0?-4:1,0,-1,3,16,3,0x434f43).box(s<0?-4:1,0,-4,3,2,5,0x646e55).box(s<0?-6:4,16,-1,2,12,3,0x6e765b).box(s<0?-6:4,14,-3,2,3,4,0xab9a72);
  v.box(-3,20,3,6,8,3,0x776e53).box(-2,21,6,4,6,1,0xc6c784).box(-1,34,3,2,4,2,0x858060);
 }
 if(kind==='ironbound_bulwark'){
  v.box(-5,17,-3,10,17,7,0x484e4d).box(-3,34,-3,6,7,6,0xa29a86).box(-3,37,-4,6,1,1,0xdfb986).box(-2,39,-4,4,5,2,0x605b4e);
  for(const s of [-1,1])v.box(s<0?-6:2,0,-2,4,17,5,0x5f625b).box(s<0?-6:2,0,-4,4,3,7,0x81806e).box(s<0?-10:7,18,-3,3,15,6,0x727367).box(s<0?-11:7,30,-4,4,5,8,0x989381).box(s<0?-10:7,15,-5,3,5,8,0x8a8370);
  v.box(-6,21,-5,12,12,2,0x9b927a).box(-5,20,-6,10,2,1,0xb7a788).box(-4,23,-6,8,9,1,0x6f7265).box(-1,24,-7,2,6,1,0xe2a567);
 }
 if(kind==='breach_cantor'){
  v.box(-3,16,-2,6,17,5,0x56475e).box(-2,33,-2,4,5,4,0xc0b29a).box(-3,32,-3,1,8,6,0x473c50).box(2,32,-3,1,8,6,0x473c50).box(-3,38,-3,6,2,6,0x74627d).box(-2,34,-3,4,1,1,0xd7bbd7);
  for(const s of [-1,1])v.box(s<0?-7:5,19,-1,2,15,3,0x877a8e).box(s<0?-9:7,17,-2,2,4,4,0xd6bd95).box(s<0?-5:3,8,-2,2,12,3,0x6e5a77);
  v.box(-3,20,-4,6,9,1,0xada18a).box(-2,21,-5,4,7,1,0xb29ade).box(-1,10,-1,2,8,2,0xc2a3df).box(-5,28,-3,10,2,1,0xb6a184).box(-1,3,0,2,5,1,0x7b638c);
 }
 if(kind==='bellwether'){
  for(const s of [-1,1])v.box(s<0?-9:3,3,-4,6,19,8,0x77796c).box(s<0?-10:3,0,-7,7,4,12,0x959382).box(s<0?-8:3,20,-3,5,10,6,0x595d58).box(s<0?-17:13,25,-3,4,18,7,0x777464).box(s<0?-18:13,21,-6,5,5,11,0xa59b83);
  v.box(-10,29,-5,20,18,11,0x817d70).box(-8,31,-6,16,13,1,0xaaa28b).box(-4,27,-7,8,15,1,0xe0a261).box(-3,29,-8,6,11,1,0xf4c27d).box(-1,31,-9,2,7,1,0x695548);
  for(let y=46;y<63;y+=3){const half=14-Math.floor((y-46)/3);v.box(-half,y,-half+3,half*2,3,half*2-6,y===46?0xbab096:0xaaa38e);}
  v.box(-8,63,-4,16,3,8,0x665f50).box(-6,66,-3,3,2,3,0xc6b79a).box(3,66,-3,3,2,3,0xc6b79a).box(-2,60,-9,4,1,1,0xe6c88b);
 }
 const fine=new Voxels();for(const c of v.cells.values())fine.box(c.x*2,c.y*2,c.z*2,2,2,2,c.color);
 const body=fine.mesh(.03125);body.geometry.userData.shared=true;geometryCache.set(kind,body.geometry);body.material=voxelMaterial.clone();rig.add(body);return rig;
}
