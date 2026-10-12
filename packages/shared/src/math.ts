import {obstacles,ZONES,type Box} from './content';
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDiff=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function segmentDistance(p:{x:number;z:number},a:{x:number;z:number},b:{x:number;z:number}){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
const grids=new Map<number,Map<string,Box[]>>();
export const walkBlocking=(b:Box)=>(b.y||0)<1.9&&(b.y||0)+b.h>.2;
export function nearbyBoxes(stage:number,x:number,z:number,radius=1){
 let grid=grids.get(stage);if(!grid){grid=new Map();for(const b of obstacles(stage))for(let ix=Math.floor((b.x-b.w/2)/2);ix<=Math.floor((b.x+b.w/2)/2);ix++)for(let iz=Math.floor((b.z-b.d/2)/2);iz<=Math.floor((b.z+b.d/2)/2);iz++){const key=`${ix},${iz}`,list=grid.get(key)||[];list.push(b);grid.set(key,list);}grids.set(stage,grid);}
 const result=new Set<Box>();for(let ix=Math.floor((x-radius)/2);ix<=Math.floor((x+radius)/2);ix++)for(let iz=Math.floor((z-radius)/2);iz<=Math.floor((z+radius)/2);iz++)for(const b of grid.get(`${ix},${iz}`)||[])result.add(b);return [...result];
}
export function rayCandidates(stage:number,x:number,z:number,dx:number,dz:number,length:number){const found=new Set<Box>();for(let t=0;t<=length+1;t+=1.5)for(const b of nearbyBoxes(stage,x+dx*t,z+dz*t,.15))found.add(b);return [...found];}
export function move(p:{x:number;z:number},dx:number,dz:number,stage:number,broken:Set<string>,radius=.4) {
 const zone=ZONES[stage]; const solids=nearbyBoxes(stage,p.x+dx/2,p.z+dz/2,Math.hypot(dx,dz)/2+radius).filter(b=>walkBlocking(b)&&!broken.has(b.id));
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
 for(let i=0;i<count;i++){
  const x=clamp(p.x+dx/count,-zone.width/2+radius,zone.width/2-radius);
  if(!solids.some(b=>Math.abs(x-b.x)<b.w/2+radius&&Math.abs(p.z-b.z)<b.d/2+radius))p.x=x;
  const z=clamp(p.z+dz/count,-zone.depth/2+radius,zone.depth/2-radius);
  if(!solids.some(b=>Math.abs(p.x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius))p.z=z;
 }
}
export function rayBox(x:number,z:number,dx:number,dz:number,b:Box):number {
 let low=0,high=Infinity;
 for(const [o,d,min,max] of [[x,dx,b.x-b.w/2,b.x+b.w/2],[z,dz,b.z-b.d/2,b.z+b.d/2]]){
  if(Math.abs(d)<1e-8){if(o<min||o>max)return Infinity;}
  else {const a=(min-o)/d,c=(max-o)/d;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));}
 }
 return high>=low?low:Infinity;
}
export function rayBox3(x:number,y:number,z:number,dx:number,dy:number,dz:number,b:Box){let low=0,high=Infinity;for(const [o,d,min,max] of [[x,dx,b.x-b.w/2,b.x+b.w/2],[y,dy,b.y||0,(b.y||0)+b.h],[z,dz,b.z-b.d/2,b.z+b.d/2]]){if(Math.abs(d)<1e-8){if(o<min||o>max)return Infinity;}else{const a=(min-o)/d,c=(max-o)/d;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));}}return high>=low?low:Infinity;}
export function sphereBox(x:number,y:number,z:number,radius:number,b:Box){return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,(b.y||0)-y,y-(b.y||0)-b.h),Math.max(0,Math.abs(z-b.z)-b.d/2))<=radius;}
export function obstruction(a:{x:number;z:number},b:{x:number;z:number},stage:number,broken:Set<string>,height=1.2){
 const d=distance(a,b);if(d<.01)return false;
 return rayCandidates(stage,a.x,a.z,(b.x-a.x)/d,(b.z-a.z)/d,d).some(box=>!broken.has(box.id)&&(box.y||0)<=height&&(box.y||0)+box.h>=height&&rayBox(a.x,a.z,(b.x-a.x)/d,(b.z-a.z)/d,box)<d-.15);
}
export function rng(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function hash(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
