import {ZONES,obstacles} from './content';
import {distance,obstruction,clamp,walkBlocking} from './math';
const grids=new Map<string,Uint8Array>();
export function waypoint(from:{x:number;z:number},to:{x:number;z:number},stage:number,broken:Set<string>,radius=.5){
 if(!obstruction(from,to,stage,broken))return to;
 const step=.75,zone=ZONES[stage],width=Math.ceil(zone.width/step),height=Math.ceil(zone.depth/step),count=width*height;
 const solids=obstacles(stage).filter(b=>walkBlocking(b)&&!broken.has(b.id));
 const position=(i:number)=>({x:(i%width+.5)*step-zone.width/2,z:(Math.floor(i/width)+.5)*step-zone.depth/2});
 const cell=(p:{x:number;z:number})=>clamp(Math.floor((p.x+zone.width/2)/step),0,width-1)+clamp(Math.floor((p.z+zone.depth/2)/step),0,height-1)*width;
 const key=`${stage}:${radius}:${solids.map(b=>b.id).join('|')}`;let template=grids.get(key);if(!template){template=new Uint8Array(count);for(let i=0;i<count;i++){const p=position(i);template[i]=solids.some(b=>Math.abs(p.x-b.x)<b.w/2+radius&&Math.abs(p.z-b.z)<b.d/2+radius)?0:1;}if(grids.size>=24)grids.delete(grids.keys().next().value!);grids.set(key,template);}
 const start=cell(from),goal=cell(to),walkable=template.slice(),parents=new Int32Array(count).fill(-1),queue=new Int32Array(count);
 walkable[start]=1;walkable[goal]=1;let head=0,tail=1;queue[0]=start;parents[start]=start;let best=start,bestDistance=distance(from,to);
 while(head<tail){const c=queue[head++];if(c===goal){best=c;break;}const p=position(c),d=distance(p,to);if(d<bestDistance){bestDistance=d;best=c;}
  const x=c%width,z=Math.floor(c/width);for(const [nx,nz]of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){if(nx<0||nz<0||nx>=width||nz>=height)continue;const next=nx+nz*width;if(walkable[next]&&parents[next]===-1){parents[next]=c;queue[tail++]=next;}}
 }
 if(best===start)return from;while(parents[best]!==start&&parents[best]!==best)best=parents[best];return position(best);
}
export function escapeHazards(from:{x:number;z:number},hazards:{x:number;z:number;radius:number}[],yaw:number,stage:number,broken:Set<string>){
 let best=yaw,score=-Infinity;const zone=ZONES[stage];
 for(let i=0;i<16;i++){const angle=yaw+i*Math.PI/8,target={x:clamp(from.x+Math.sin(angle)*4.5,-zone.width/2+.5,zone.width/2-.5),z:clamp(from.z-Math.cos(angle)*4.5,-zone.depth/2+.5,zone.depth/2-.5)};
  const safety=Math.min(...hazards.map(h=>distance(target,h)-h.radius))-(obstruction(from,target,stage,broken)?10:0);if(safety>score){score=safety;best=Math.atan2(target.x-from.x,-(target.z-from.z));}}
 return best;
}
