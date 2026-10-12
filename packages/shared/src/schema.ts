import {Schema,MapSchema,defineTypes} from '@colyseus/schema';
export class ActorState extends Schema {
 id='';name='';kind='';classId='marksman';x=0;z=0;yaw=0;pitch=0;hp=100;maxHp=100;resource=0;ammo=24;
 connected=true;ready=false;status='standing';ack=0;signature=0;dodge=0;medkits=2;action='idle';actionEnd=0;downEnd=0;
 relic='';mod='';weaponLook='common';armorLook='common';kills=0;deaths=0;guardUntil=0;elite='';phase=1;tx=0;tz=0;plateL=0;plateR=0;revive=0;
}
defineTypes(ActorState,{id:'string',name:'string',kind:'string',classId:'string',x:'float32',z:'float32',yaw:'float32',pitch:'float32',hp:'float32',maxHp:'float32',resource:'float32',ammo:'uint8',connected:'boolean',ready:'boolean',status:'string',ack:'uint32',signature:'float32',dodge:'float32',medkits:'uint8',action:'string',actionEnd:'float32',downEnd:'float32',relic:'string',mod:'string',weaponLook:'string',armorLook:'string',kills:'uint16',deaths:'uint16',guardUntil:'float32',elite:'string',phase:'uint8',tx:'float32',tz:'float32',plateL:'float32',plateR:'float32',revive:'float32'});
export class EffectState extends Schema {id='';kind='';owner='';x=0;y=0;z=0;tx=0;tz=0;radius=1;end=0;start=0;}
defineTypes(EffectState,{id:'string',kind:'string',owner:'string',x:'float32',y:'float32',z:'float32',tx:'float32',tz:'float32',radius:'float32',end:'float32',start:'float32'});
export class WorldState extends Schema {
 code='';leader='';phase='lobby';stage=0;wave=0;time=0;elapsed=0;revision=1;seed=2048;partySize=1;cleared=false;paused=false;regroup=0;destination=0;message='';completionId='';
 players=new MapSchema<ActorState>();enemies=new MapSchema<ActorState>();effects=new MapSchema<EffectState>();broken=new MapSchema<number>();coverHealth=new MapSchema<number>();
}
defineTypes(WorldState,{code:'string',leader:'string',phase:'string',stage:'uint8',wave:'uint8',time:'float32',elapsed:'float32',revision:'uint32',seed:'uint32',partySize:'uint8',cleared:'boolean',paused:'boolean',regroup:'float32',destination:'uint8',message:'string',completionId:'string',players:{map:ActorState},enemies:{map:ActorState},effects:{map:EffectState},broken:{map:'uint32'},coverHealth:{map:'float32'}});
