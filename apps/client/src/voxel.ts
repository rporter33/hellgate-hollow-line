import * as T from 'three';
type Cell={x:number;y:number;z:number;color:number};
export class Voxels {
 cells=new Map<string,Cell>();
 box(x:number,y:number,z:number,w:number,h:number,d:number,color:number){for(let ix=x;ix<x+w;ix++)for(let iy=y;iy<y+h;iy++)for(let iz=z;iz<z+d;iz++)this.cells.set(`${ix},${iy},${iz}`,{x:ix,y:iy,z:iz,color});return this;}
 mesh(scale=.5){
  const positions:number[]=[],normals:number[]=[],colors:number[]=[];
  const faces=[{n:[1,0,0],v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],light:.78},{n:[-1,0,0],v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],light:.65},{n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],light:1},{n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],light:.4},{n:[0,0,1],v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],light:.86},{n:[0,0,-1],v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],light:.7}];
  for(const c of this.cells.values())for(const f of faces){if(this.cells.has(`${c.x+f.n[0]},${c.y+f.n[1]},${c.z+f.n[2]}`))continue;const color=new T.Color(c.color).multiplyScalar(f.light);for(const i of [0,1,2,0,2,3]){const p=f.v[i];positions.push((c.x+p[0])*scale,(c.y+p[1])*scale,(c.z+p[2])*scale);normals.push(...f.n);colors.push(color.r,color.g,color.b);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
  return new T.Mesh(g,voxelMaterial);
 }
}
export const voxelMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:.08,flatShading:true});
