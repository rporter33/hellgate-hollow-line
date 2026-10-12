import type {Box} from './content';

// Coarse structural blocks contain finer visual voxels. IDs are stable across
// clients, reconnect snapshots and retries; decorative voxels have no physics.
export function buildingBlocks(stage:number):Box[] {
 if(stage!==1)return [];
 const blocks:Box[]=[];
 const add=(b:Box)=>blocks.push(b);
 for(const side of [-1,1]){
  for(let bay=0;bay<4;bay++){
   const building=`strand_${side<0?'west':'east'}_${bay}`,start=-16+bay*8,height=bay===1?21:18;
   for(let col=0;col<4;col++){
    const z=start+1+col*2,chunk=`${building}_${col}`;
    for(let row=0;row<height/1.5;row++){
     const y=row*1.5,door=row<2&&col===1,window=row>=2&&row%2===0&&(col===1||col===2);
     add({id:`${building}_front_${col}_${row}`,building,chunk,x:side*12,z,w:.5,d:2,h:1.5,y,breakable:true,hp:door?45:window?30:70,material:door?'wood':window?'glass':row<2?'stone':'brick',power:door||window?1:row<2?3:2,finish:door?'door':window?'window':row<2?'trim':'wall'});
     add({id:`${building}_back_${col}_${row}`,building,chunk,x:side*17,z,w:.5,d:2,h:1.5,y,breakable:true,hp:80,material:'brick',power:2,finish:'wall'});
    }
    // Upper floors and roof are built from the same removable blocks.
    for(let level=3;level<=height;level+=3)for(let strip=0;strip<3;strip++)add({id:`${building}_floor_${col}_${level}_${strip}`,building,chunk,x:side*(12.875+strip*1.625),z,w:1.75,d:2,h:.25,y:level,breakable:true,hp:90,material:'stone',power:3,finish:'floor'});
   }
   for(const end of [0,8])for(let row=0;row<height/1.5;row++)for(let strip=0;strip<3;strip++)add({id:`${building}_end_${end}_${row}_${strip}`,building,chunk:`${building}_${end===0?0:3}`,x:side*(12.875+strip*1.625),z:start+end,w:1.75,d:.35,h:1.5,y:row*1.5,breakable:true,hp:70,material:row<2?'stone':'brick',power:row<2?3:2,finish:'wall'});
  }
 }
 return blocks;
}

export function unsupportedBlocks(blocks:Box[],broken:Set<string>){
 const live=blocks.filter(b=>!broken.has(b.id)),supported=new Set<string>();
 const overlap=(a:Box,b:Box)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.03&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.03;
 const adjacent=(a:Box,b:Box)=>Math.abs(a.x-b.x)<=(a.w+b.w)/2+.06&&Math.abs(a.z-b.z)<=(a.d+b.d)/2+.06&&Math.hypot(a.x-b.x,a.z-b.z)<=1.8;
 for(const y of [...new Set(live.map(b=>b.y||0))].sort((a,b)=>a-b)){
  const layer=live.filter(b=>(b.y||0)===y),direct=layer.filter(b=>y===0||live.some(below=>supported.has(below.id)&&(below.y||0)<y&&Math.abs((below.y||0)+below.h-y)<.31&&overlap(b,below)));
  for(const b of direct)supported.add(b.id);
  for(const b of layer)if(direct.some(anchor=>adjacent(b,anchor)))supported.add(b.id);
 }
 return live.filter(b=>!supported.has(b.id));
}
