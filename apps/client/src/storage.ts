export type Settings={version:1;sensitivity:number;invert:boolean;fov:number;master:number;music:number;effects:number;quality:'low'|'standard';reducedMotion:boolean;name:string;server:string};
export const defaults:Settings={version:1,sensitivity:.002,invert:false,fov:75,master:.7,music:.3,effects:.75,quality:'standard',reducedMotion:false,name:'Warden',server:''};
export type Records={version:1;wins:Record<string,number>;best:Record<string,number>;relics:string[]};
export function read<T>(key:string,fallback:T):T{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v?.version===1?v:fallback;}catch{return fallback;}}
export function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
const raw=read<Settings>('hollow.settings',defaults);
export const settings:Settings={...defaults,...raw};
for(const [key,min,max]of [['sensitivity',.0005,.006],['fov',70,90],['master',0,1],['music',0,1],['effects',0,1]] as const){settings[key]=typeof raw[key]==='number'&&Number.isFinite(raw[key])?Math.max(min,Math.min(max,raw[key])):defaults[key];}
settings.quality=raw.quality==='low'?'low':'standard';settings.name=typeof raw.name==='string'?raw.name.slice(0,18):'Warden';settings.server=typeof raw.server==='string'?raw.server:'';settings.invert=!!raw.invert;settings.reducedMotion=!!raw.reducedMotion;
export let records=read<Records>('hollow.records',{version:1,wins:{},best:{},relics:[]});
if(!records.wins||typeof records.wins!=='object'||!records.best||typeof records.best!=='object'||!Array.isArray(records.relics))records={version:1,wins:{},best:{},relics:[]};
export function completion(classId:string,party:number,time:number,relics:string[],key:string){const acknowledged=read<{version:1;keys:string[]}>('hollow.acknowledged',{version:1,keys:[]});if(Array.isArray(acknowledged.keys)&&acknowledged.keys.includes(key))return;records.wins[classId]=(Number(records.wins[classId])||0)+1;records.best[party]=Math.min(Number(records.best[party])||Infinity,time);records.relics=[...new Set([...records.relics.filter(x=>typeof x==='string'),...relics])];write('hollow.records',records);write('hollow.acknowledged',{version:1,keys:[...(Array.isArray(acknowledged.keys)?acknowledged.keys:[]),key].slice(-32)});}
export function resetRecords(){records={version:1,wins:{},best:{},relics:[]};write('hollow.records',records);}
export function sessionRead(){try{return JSON.parse(sessionStorage.getItem('hollow.reconnect')||'null');}catch{return null;}}
export function sessionWrite(value:unknown){try{if(value)sessionStorage.setItem('hollow.reconnect',JSON.stringify(value));else sessionStorage.removeItem('hollow.reconnect');}catch{}}
