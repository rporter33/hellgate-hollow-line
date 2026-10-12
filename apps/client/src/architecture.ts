import * as T from 'three';
import {obstacles,type Box} from '../../../packages/shared/src/content';
import {Voxels,voxelMaterial} from './voxel';

const CELL=.0625;
type Batch={mesh:T.InstancedMesh;blocks:Box[];hidden:Set<string>};
// Surface colour is not structural geometry. Keep fine mortar detail without
// hundreds of coplanar triangles per wall block.
function masonryMaterial(){
 const width=32,height=16,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const row=Math.floor(y/8),mortar=y%8===0||(x+(row%2)*8)%16===0;
  const value=mortar?132:230+((Math.floor(x/16)+row)%2)*16,index=(y*width+x)*4;
  data[index]=data[index+1]=data[index+2]=value;data[index+3]=255;
 }
 const map=new T.DataTexture(data,width,height);map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.NearestFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;
 const material=voxelMaterial.clone();material.map=map;return material;
}
export class Architecture {
 batches:Batch[]=[];
 constructor(public root:T.Group,public stage:number){
  const types=new Map<string,Box[]>();
  for(const b of obstacles(stage))if(b.chunk){
   const bay=Number(b.building?.split('_').at(-1)||0),cornice=b.finish==='wall'&&((b.y||0)%3===1.5);
   const key=[b.x<0?-1:1,b.material,b.finish,b.w,b.h,b.d,b.material==='brick'?bay%3:b.finish==='window'?Number(bay%3===1):0,cornice].join('|'),list=types.get(key)||[];list.push(b);types.set(key,list);
  }
  const brick=masonryMaterial();
  for(const blocks of types.values()){
   const b=blocks[0],prototype=this.block(b),material=b.material==='brick'&&b.finish==='wall'?brick:voxelMaterial;
   const mesh=new T.InstancedMesh(prototype.geometry,material,blocks.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   if(material===brick){const pos=mesh.geometry.attributes.position,norm=mesh.geometry.attributes.normal,uv=[];for(let i=0;i<pos.count;i++)uv.push((Math.abs(norm.getX(i))>.5?pos.getZ(i):pos.getX(i))*2,pos.getY(i)*4);mesh.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}
   for(const [i,b]of blocks.entries())mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(b.x,b.y||0,b.z));
   mesh.computeBoundingSphere();this.root.add(mesh);this.batches.push({mesh,blocks,hidden:new Set()});
  }
  if(!types.size){brick.map!.dispose();brick.dispose();}
 }
 block(b:Box){
  const v=new Voxels(),w=Math.max(1,Math.round(b.w/CELL)),h=Math.round(b.h/CELL),d=Math.max(1,Math.round(b.d/CELL)),x=-Math.floor(w/2),z=-Math.floor(d/2);
  const bay=Number(b.building?.split('_').at(-1)||0);
  const color=b.material==='stone'?0x928a76:b.material==='brick'?[0x876853,0x6e5d52,0x927e65][bay%3]:b.material==='glass'?0x263d46:b.material==='wood'?0x384344:0x686c66;
  v.box(x,0,z,w,h,d,color);
  const front=b.x<0?x+w-1:x,project=b.x<0?front:front-2;
  if(b.finish==='wall'&&b.material==='brick'&&(b.y||0)%3===1.5){
   v.box(project,h-3,z,3,2,d,0xaca18c).box(project-1,h-1,z,4,1,d,0x827b70);
  }
  if(b.finish==='trim'){
   v.box(project,h-3,z,3,3,d,0xb0a48b);
   for(let iy=0;iy<h-3;iy+=6)v.box(front,iy,z,1,1,d,0x625f59);
   v.box(project,0,z,3,h-3,2,0xa89b83).box(project,0,z+d-2,3,h-3,2,0xa89b83);
  }
  if(b.finish==='window'){
   // A recessed dark pane, stone jambs, projecting sill and lintel.
   const recess=b.x<0?front-1:front;
   v.erase(recess,2,z+2,2,h-4,d-4);
   v.box(project,0,z,3,2,d,0xc1b69b).box(project,h-3,z,3,3,d,0xb7ae97).box(project,0,z,3,h,2,0xa49d89).box(project,0,z+d-2,3,h,2,0xa49d89);
   v.box(front,2,z+Math.floor(d/2),1,h-4,1,0x807e70).box(front,Math.floor(h*.62),z+2,1,1,d-4,0x807e70);
   if(bay%3===1)for(let iz=3;iz<d-2;iz+=4)v.box(project,2,z+iz,1,6,1,0x354047);
  }
  if(b.finish==='door'){
   v.box(project,0,z,3,h,2,0xa0957d).box(project,0,z+d-2,3,h,2,0xa0957d).box(project,h-3,z,3,3,d,0xb9ab8e);
   for(let iz=4;iz<d-2;iz+=7)v.box(front,3,z+iz,1,h-8,1,0x283337);
   v.box(project,Math.floor(h/2),z+d-5,2,1,1,0xc4a86a);
  }
  return v.mesh(CELL);
 }
 sync(broken:Set<string>){const matrix=new T.Matrix4();for(const batch of this.batches){let changed=false;for(const [i,b]of batch.blocks.entries()){const hidden=broken.has(b.id);if(hidden===batch.hidden.has(b.id))continue;if(hidden){batch.hidden.add(b.id);matrix.makeScale(0,0,0);}else{batch.hidden.delete(b.id);matrix.makeTranslation(b.x,b.y||0,b.z);}batch.mesh.setMatrixAt(i,matrix);changed=true;}if(changed)batch.mesh.instanceMatrix.needsUpdate=true;}}
}
