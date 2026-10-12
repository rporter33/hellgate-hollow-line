import * as T from 'three';
type Cell={x:number;y:number;z:number;color:number};
export class Voxels {
 cells=new Map<string,Cell>();
 box(x:number,y:number,z:number,w:number,h:number,d:number,color:number){for(let ix=x;ix<x+w;ix++)for(let iy=y;iy<y+h;iy++)for(let iz=z;iz<z+d;iz++)this.cells.set(`${ix},${iy},${iz}`,{x:ix,y:iy,z:iz,color});return this;}
 erase(x:number,y:number,z:number,w:number,h:number,d:number){for(let ix=x;ix<x+w;ix++)for(let iy=y;iy<y+h;iy++)for(let iz=z;iz<z+d;iz++)this.cells.delete(`${ix},${iy},${iz}`);return this;}
 mesh(scale=.5){
  const positions:number[]=[],normals:number[]=[],colors:number[]=[];
  // Merge coplanar, equally coloured faces. Fine cells add detail without
  // forcing one draw call or two triangles for every exposed voxel face.
  const shades=[[.65,.78],[.4,1],[.7,.86]];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   const u=(axis+1)%3,v=(axis+2)%3,planes=new Map<number,Map<string,number>>();
   for(const c of this.cells.values()){
    const p=[c.x,c.y,c.z],next=[...p];next[axis]+=sign;if(this.cells.has(next.join(',')))continue;
    const plane=p[axis]+(sign>0?1:0),mask=planes.get(plane)||new Map<string,number>();mask.set(`${p[u]},${p[v]}`,c.color);planes.set(plane,mask);
   }
   for(const [plane,mask]of planes)while(mask.size){
    const key=mask.keys().next().value!,[x,y]=key.split(',').map(Number),hex=mask.get(key)!;let w=1,h=1;
    while(mask.get(`${x+w},${y}`)===hex)w++;
    rows:while(true){for(let i=0;i<w;i++)if(mask.get(`${x+i},${y+h}`)!==hex)break rows;h++;}
    for(let ix=0;ix<w;ix++)for(let iy=0;iy<h;iy++)mask.delete(`${x+ix},${y+iy}`);
    const color=new T.Color(hex).multiplyScalar(shades[axis][sign>0?1:0]),corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],normal=[0,0,0];normal[axis]=sign;
    for(const i of sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]){const point=[0,0,0];point[axis]=plane;point[u]=corners[i][0];point[v]=corners[i][1];positions.push(...point.map(n=>n*scale));normals.push(...normal);colors.push(color.r,color.g,color.b);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
  return new T.Mesh(g,voxelMaterial);
 }
}
export const voxelMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:.08,flatShading:true});
