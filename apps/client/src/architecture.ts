import * as T from 'three';
import {obstacles,type Box} from '../../../packages/shared/src/content';
import {Voxels,voxelMaterial} from './voxel';

const CELL=.0625;
type Batch={mesh:T.InstancedMesh;blocks:Box[];hidden:Set<string>};
export class Architecture {
 batches:Batch[]=[];
 constructor(public root:T.Group,public stage:number){
  const types=new Map<string,Box[]>();
  for(const b of obstacles(stage))if(b.chunk){const key=[b.x<0?-1:1,b.material,b.finish,b.w,b.h,b.d].join('|'),list=types.get(key)||[];list.push(b);types.set(key,list);}
  for(const blocks of types.values()){
   const prototype=this.block(blocks[0]),mesh=new T.InstancedMesh(prototype.geometry,voxelMaterial,blocks.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   for(const [i,b]of blocks.entries())mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(b.x,b.y||0,b.z));
   mesh.computeBoundingSphere();this.root.add(mesh);this.batches.push({mesh,blocks,hidden:new Set()});
  }
 }
 block(b:Box){
  const v=new Voxels(),w=Math.max(1,Math.round(b.w/CELL)),h=Math.round(b.h/CELL),d=Math.max(1,Math.round(b.d/CELL)),x=-Math.floor(w/2),z=-Math.floor(d/2);
  const color=b.material==='stone'?0x928a76:b.material==='brick'?(b.x<0?0x705449:0x786050):b.material==='glass'?0x354b53:b.material==='wood'?0x4c4941:0x686c66;
  v.box(x,0,z,w,h,d,color);
  const face=b.x<0?x+w-1:x;
  if(b.finish==='wall'&&b.material==='brick')for(let iy=0;iy<h;iy++)for(let iz=0;iz<d;iz++){
   const course=Math.floor(iy/2),mortar=iy%2===0||(iz+(course%2?2:0))%5===0;
   v.box(face,iy,z+iz,1,1,1,mortar?0x4f4840:(course+Math.floor(iz/5))%3===0?0x856554:color);
  }
  if(b.finish==='trim'){v.box(face,h-2,z,1,2,d,0xb0a48b);for(let iz=0;iz<d;iz+=8)v.box(face,0,z+iz,1,h-2,1,0x675f53);}
  if(b.finish==='window')v.box(face,0,z,1,2,d,0xc1b69b).box(face,h-2,z,1,2,d,0xb7ae97).box(face,0,z,1,h,2,0xa49d89).box(face,0,z+d-2,1,h,2,0xa49d89).box(face,0,z+Math.floor(d/2),1,h,1,0x807e70).box(face,Math.floor(h/2),z,1,1,d,0x807e70);
  if(b.finish==='door'){v.box(face,0,z,1,h,2,0xa0957d).box(face,0,z+d-2,1,h,2,0xa0957d);for(let iz=3;iz<d-2;iz+=4)v.box(face,1,z+iz,1,h-2,1,0x343b3c);v.box(face,Math.floor(h/2),z+d-4,1,1,1,0xc4a86a);}
  return v.mesh(CELL);
 }
 sync(broken:Set<string>){const matrix=new T.Matrix4();for(const batch of this.batches){let changed=false;for(const [i,b]of batch.blocks.entries()){const hidden=broken.has(b.id);if(hidden===batch.hidden.has(b.id))continue;if(hidden){batch.hidden.add(b.id);matrix.makeScale(0,0,0);}else{batch.hidden.delete(b.id);matrix.makeTranslation(b.x,b.y||0,b.z);}batch.mesh.setMatrixAt(i,matrix);changed=true;}if(changed)batch.mesh.instanceMatrix.needsUpdate=true;}}
}
