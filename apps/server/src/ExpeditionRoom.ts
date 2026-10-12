import {Room,Client,ServerError} from '@colyseus/core';
import {randomBytes} from 'node:crypto';
import {WorldState,ActorState} from '../../../packages/shared/src/schema';
import {CLASS_IDS,CLASSES,PROTOCOL,CONTENT,type ClassId} from '../../../packages/shared/src/content';
import {Game} from './Game';
export const invites=new Map<string,string>();
export class ExpeditionRoom extends Room<WorldState> {
 maxClients=3;game!:Game; rates=new Map<string,{start:number;count:number}>();
 onCreate(options:any){
  if(options.protocol!==PROTOCOL||options.content!==CONTENT)throw new ServerError(400,'Client/server version mismatch. Refresh to update.');
  if(invites.size>=Number(process.env.MAX_ROOMS||5))throw new ServerError(503,'Server at capacity. Try again soon.');
  this.setState(new WorldState()); this.patchRate=50;
  this.game=new Game(this.state,(id,v)=>this.clients.find(c=>c.sessionId===id)?.send('personal',v),v=>this.broadcast('event',{...v,tick:this.state.time,revision:this.state.revision}));
  let code='';do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(invites.has(code));
  this.state.code=code;invites.set(code,this.roomId);this.setMetadata({code});
  this.onMessage('input',(client,data)=>{
   if(this.rate(client.sessionId))this.game.accept(client.sessionId,data);
  });
  this.onMessage('lobby',(client,data)=>{
   if(this.state.phase!=='lobby'||!data||typeof data!=='object')return;
   const p=this.state.players.get(client.sessionId)!;
   if(CLASS_IDS.includes(data.classId)&&p.classId!==data.classId){p.classId=data.classId;this.game.resetPlayer(p,true);}
   if(typeof data.ready==='boolean')p.ready=data.ready;
  });
  this.onMessage('inventory',(client,data)=>{if(this.rate(client.sessionId)&&data?.rev===this.state.revision)this.game.inventory(client.sessionId,data);});
  this.onMessage('personal',client=>this.game.private(client.sessionId));
  this.onMessage('start',client=>{if(this.game.start(client.sessionId))this.lock();});
  this.onMessage('retry',client=>this.game.retry(client.sessionId));
  this.onMessage('transition',(client,data)=>{if(Number.isInteger(data))this.game.transition(client.sessionId,data);});
  this.onMessage('replay',(client,data)=>{if(this.game.replay(client.sessionId,data===true))this.unlock();});
  this.onMessage('companions',(client,data)=>this.game.setCompanions(client.sessionId,data));
  this.onMessage('practice',client=>this.game.practice(client.sessionId));
  this.onMessage('finishPractice',client=>this.game.finishPractice(client.sessionId));
  this.onMessage('seed',(client,data)=>{if(client.sessionId===this.state.leader&&this.state.phase==='lobby'&&Number.isSafeInteger(data)&&data>=0&&data<=4294967295)this.state.seed=data;});
  this.setSimulationInterval(()=>this.game.step(),1000/30);
 }
 rate(id:string){const r=this.rates.get(id);if(!r)return false;const now=Date.now();if(now-r.start>=1000){r.start=now;r.count=0;}return ++r.count<=60;}
 onAuth(client:Client,options:any){if(options.protocol!==PROTOCOL||options.content!==CONTENT)throw new ServerError(400,'Client/server version mismatch. Refresh to update.');if(this.state.phase!=='lobby')throw new ServerError(403,'Expedition deployed. Only reconnects may enter.');return true;}
 onJoin(client:Client,options:any){if(this.state.players.size>=3){const ai=[...this.state.players.values()].find(p=>p.kind==='companion');if(ai)this.game.removePlayer(ai.id);else throw new ServerError(403,'Room full. Maximum three wardens.');}const p=new ActorState();p.id=client.sessionId;p.name=String(options.name||'Warden').replace(/[<>]/g,'').slice(0,18);p.kind='player';p.classId=CLASS_IDS.includes(options.classId)?options.classId:'marksman';p.hp=p.maxHp=CLASSES[p.classId as ClassId].hp;p.x=(this.state.players.size-1)*2;p.z=6;this.game.addPlayer(p);this.rates.set(p.id,{start:Date.now(),count:0});if(!this.state.leader)this.state.leader=p.id;}
 async onLeave(client:Client,consented:boolean){
  const p=this.state.players.get(client.sessionId);if(!p)return;p.connected=false;this.game.clearInput(p.id);this.transferLeader();
  try {if(consented)throw new Error('left');await this.allowReconnection(client,60);p.connected=true;this.game.clearInput(p.id);this.rates.set(p.id,{start:Date.now(),count:0});if(!this.state.leader)this.state.leader=p.id;this.game.private(p.id);}
  catch{this.game.removePlayer(p.id);this.rates.delete(p.id);this.transferLeader();}
 }
 transferLeader(){const p=[...this.state.players.values()].find(p=>p.connected&&p.kind!=='companion');this.state.leader=p?.id||'';}
 onDispose(){if(this.state?.code)invites.delete(this.state.code);}
}
