import {buildingBlocks} from './architecture';
export const PROTOCOL = 'hollow-3';
export const CONTENT = '2026.10.12-3';
export const CLASS_IDS = ['blademaster', 'marksman', 'evoker'] as const;
export type ClassId = typeof CLASS_IDS[number];
export const CLASSES = {
  blademaster: {name:'Blademaster',faction:'Templar',hp:130,armor:20,color:0xd5b66d,weapon:'Twin Blades',primary:'Twin Cut',secondary:'Whirlwind',signature:'Lunge',description:'Earn Zeal with your blades. Spend it to cut a path through the horde.'},
  marksman: {name:'Marksman',faction:'Hunter',hp:110,armor:10,color:0xe2a354,weapon:'Pulse Rifle',primary:'Pulse Rifle',secondary:'Execution Round',signature:'Breach Grenade',description:'Create firing lanes. Charge precision shots and watch your magazine.'},
  evoker: {name:'Evoker',faction:'Cabalist',hp:95,armor:5,color:0xa697ed,weapon:'Ember Focus',primary:'Ember Focus',secondary:'Arc Lash',signature:'Gravity Well',description:'Pull enemies together. Spend Focus to chain lightning through them.'}
} as const;
export const ZONES = [
  {id:'temple',name:'Temple sanctuary',objective:'Prepare your expedition',width:24,depth:24,theme:'sanctuary'},
  {id:'strand',name:'The Strand breach',objective:'Clear the Strand',width:36,depth:32,theme:'street'},
  {id:'concourse',name:'Collapsed concourse',objective:'Break their guard',width:24,depth:28,theme:'station'},
  {id:'maintenance_crypt',name:'Maintenance crypt',objective:'Recover the sealed cache',width:22,depth:24,theme:'crypt'},
  {id:'signal_chamber',name:'Signal chamber',objective:'Silence the Cantor',width:24,depth:28,theme:'signal'},
  {id:'aldwych_platform',name:'Aldwych platform',objective:'Silence the Bellwether',width:30,depth:30,theme:'platform'}
] as const;
export interface Box {id:string;x:number;z:number;w:number;d:number;h:number;y?:number;breakable?:boolean;hp?:number;material?:'wood'|'metal'|'glass'|'brick'|'stone';power?:number;chunk?:string;finish?:'wall'|'window'|'door'|'floor'|'trim';building?:string}
const obstacleCache=new Map<number,Box[]>();
export function obstacles(stage:number):Box[] {let result=obstacleCache.get(stage);if(!result){result=[...cover(stage),...buildingBlocks(stage)];obstacleCache.set(stage,result);}return result;}
function cover(stage:number):Box[] {
  if(stage===0) return [{id:'training_wall',x:0,z:-4,w:4,d:1,h:2,breakable:true,hp:60}];
  if(stage===1) return [
    {id:'bus',x:-8,z:-3,w:3,d:9,h:4.4}, {id:'barricade_a',x:-1.7,z:0,w:3,d:1,h:1.6,breakable:true,hp:60},
    {id:'barricade_b',x:1.7,z:0,w:3,d:1,h:1.6,breakable:true,hp:60}, {id:'crate_1',x:7,z:-5,w:2,d:2,h:1.8,breakable:true,hp:60}];
  if(stage===2) return [
    {id:'pillar_a',x:-5,z:-2,w:1.5,d:1.5,h:5,breakable:true,hp:140,material:'stone',power:3}, {id:'pillar_b',x:5,z:-2,w:1.5,d:1.5,h:5,breakable:true,hp:140,material:'stone',power:3},
    {id:'ticket_barrier',x:0,z:1,w:5,d:1,h:1.2,breakable:true,hp:60},
    {id:'crypt_wall',x:9,z:-7,w:4,d:1,h:2.5,breakable:true,hp:60}];
  if(stage===3) return [{id:'sarcophagus',x:0,z:0,w:2,d:4,h:1.3},{id:'crypt_cover',x:-6,z:-4,w:2,d:2,h:1.7,breakable:true,hp:60}];
  if(stage===4) return [{id:'transmitter',x:0,z:-9,w:3,d:2,h:4},{id:'relay_a',x:-5,z:-2,w:2,d:2,h:1.7,breakable:true,hp:60},{id:'relay_b',x:5,z:-2,w:2,d:2,h:1.7,breakable:true,hp:60}];
  return [-1,1].flatMap(s=>[-1,1].map(t=>({id:`platform_cover_${s}_${t}`,x:s*7,z:t*5,w:2.5,d:2.5,h:2,breakable:true,hp:60})));
}
const blockIndex=new Map<number,Map<string,Box>>();
export function obstacleById(stage:number,id:string){let index=blockIndex.get(stage);if(!index){index=new Map(obstacles(stage).map(b=>[b.id,b]));blockIndex.set(stage,index);}return index.get(id);}
export const ENEMIES = {
  carrion_runner:{height:1.1,name:'Carrion Runner',hp:40,armor:0,damage:12,tell:.55,recovery:.8,speed:3.9,range:3,color:0xb95438,radius:.5},
  riftspitter:{height:2.4,name:'Riftspitter',hp:100,armor:0,damage:18,tell:.8,recovery:1.5,speed:2.2,range:13,color:0x95a25b,radius:.65},
  ironbound_bulwark:{height:2.75,name:'Ironbound Bulwark',hp:240,armor:25,damage:30,tell:1,recovery:1.2,speed:1.8,range:4,color:0x736f76,radius:1},
  breach_cantor:{height:2.5,name:'Breach Cantor',hp:120,armor:5,damage:16,tell:1.2,recovery:2.8,speed:1.6,range:6,color:0xa35ac4,radius:.65},
  bellwether:{height:4.25,name:'The Bellwether',hp:8400,armor:0,damage:35,tell:1,recovery:1.4,speed:1.1,range:5,color:0xb4a38b,radius:1.6}
} as const;
export type EnemyId = keyof typeof ENEMIES;
export const SCALING = [{health:1,boss:1,damage:1,runners:0,windups:3,adds:4},{health:1.65,boss:1.8,damage:1.1,runners:1,windups:4,adds:5},{health:2.3,boss:2.6,damage:1.2,runners:2,windups:5,adds:6}];
export const RELICS = [
 {id:'red_wake',name:'Red Wake',classId:'blademaster',icon:'↯',effect:'Lunge leaves a burning path for 2s. Each enemy crossing it takes 45 damage once.'},
 {id:'martyrs_engine',name:"Martyr’s Engine",classId:'blademaster',icon:'✺',effect:'Whirlwind consumes all Zeal. Extra Zeal increases its damage and radius.'},
 {id:'ricochet_testament',name:'Ricochet Testament',classId:'marksman',icon:'⤳',effect:'Primary hits bounce once to a nearby enemy for 60% damage. Cover blocks the bounce.'},
 {id:'long_watch',name:'Long Watch',classId:'marksman',icon:'⌖',effect:'Execution Round pierces up to three enemies. Weak points take 2× damage.'},
 {id:'cinder_choir',name:'Cinder Choir',classId:'evoker',icon:'⋔',effect:'Ember Focus becomes a fan of three bolts, each at 50% damage. Close distance for more hits.'},
 {id:'event_horizon',name:'Event Horizon',classId:'evoker',icon:'◉',effect:'Gravity Well lasts 4s, then detonates for 90 damage inside its radius.'}
] as const;
export const MODS = [
 {id:'arc_coil',name:'Arc Coil',icon:'ϟ',effect:'Every fifth successful primary attack arcs to another enemy for 12 damage.'},
 {id:'blood_seal',name:'Blood Seal',icon:'♜',effect:'Direct primary kills restore 4 health.'},
 {id:'breach_core',name:'Breach Core',icon:'◇',effect:'Deal 50% more damage to breakable cover and boss plates.'}
] as const;
export const AFFIXES = {
 savage:{name:'Savage',slots:['weapon'],min:.08,max:.15,stat:'damage'},rapid:{name:'Rapid',slots:['weapon'],min:.05,max:.1,stat:'rate'},
 resolute:{name:'Resolute',slots:['armor'],min:15,max:25,stat:'hp'},plated:{name:'Plated',slots:['armor'],min:8,max:15,stat:'armor'},
 fleet:{name:'Fleet',slots:['weapon','armor'],min:.04,max:.08,stat:'speed'},focused:{name:'Focused',slots:['weapon','armor'],min:.05,max:.1,stat:'cooldown'}
} as const;
export const ARMOR_SLOTS = ['helmet','chest','arms','legs'] as const;
export type ArmorSlot = typeof ARMOR_SLOTS[number];
export const ARMOR_SHARE:Record<ArmorSlot,number> = {helmet:.2,chest:.4,arms:.2,legs:.2};
export const ARMOR_NAMES:Record<ArmorSlot,string> = {helmet:'Helm',chest:'Cuirass',arms:'Vambraces',legs:'Greaves'};
export const EQUIPMENT_SLOTS = ['weapon',...ARMOR_SLOTS,'relic'] as const;
export const isArmorSlot = (slot:string):slot is ArmorSlot => (ARMOR_SLOTS as readonly string[]).includes(slot);
export type Item = {id:string;base:string;name:string;slot:'weapon'|ArmorSlot|'relic'|'mod';rarity:'common'|'magic'|'rare'|'legendary';classId?:ClassId;affixes:{id:keyof typeof AFFIXES;value:number}[];mod?:string};
export type PrivateState = {bag:Item[];equipment:{weapon:Item;relic?:Item}&Record<ArmorSlot,Item>;drops:{id:string;x:number;z:number;item:Item}[];rewards:string[];chosenRelic:string;randomDrops:number};
