import {clamp} from './math';
export type Input={seq:number;rev:number;mx:number;mz:number;yaw:number;pitch:number;primary:boolean;secondary:boolean;interact:boolean;edges:string[];menu:boolean};
export const idleInput=():Input=>({seq:0,rev:0,mx:0,mz:0,yaw:0,pitch:0,primary:false,secondary:false,interact:false,edges:[],menu:false});
export function parseInput(value:unknown):Input|null {
 if(!value||typeof value!=='object')return null;try{if(JSON.stringify(value).length>2048)return null;}catch{return null;}
 const v=value as Record<string,unknown>;
 if(!['seq','rev','mx','mz','yaw','pitch'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])))return null;
 if(!Number.isSafeInteger(v.seq)||!Number.isSafeInteger(v.rev)||(v.seq as number)<0||!Array.isArray(v.edges)||v.edges.length>6)return null;
 if(!['primary','secondary','interact','menu'].every(k=>typeof v[k]==='boolean'))return null;
 const allowed=['dodge','signature','reload','medkit','ping'];if(v.edges.some(e=>!allowed.includes(e)))return null;
 return {seq:v.seq as number,rev:v.rev as number,mx:clamp(v.mx as number,-1,1),mz:clamp(v.mz as number,-1,1),yaw:(v.yaw as number)%(Math.PI*2),pitch:clamp(v.pitch as number,-1.3,1.3),primary:v.primary as boolean,secondary:v.secondary as boolean,interact:v.interact as boolean,menu:v.menu as boolean,edges:[...new Set(v.edges)] as string[]};
}
