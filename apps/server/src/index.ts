import express from 'express';
import cors from 'cors';
import {createServer} from 'node:http';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {resolve} from 'node:path';
import {ExpeditionRoom,invites} from './ExpeditionRoom';
import {CONTENT,PROTOCOL} from '../../../packages/shared/src/content';
export async function startServer(port=Number(process.env.PORT||2567)) {
 const app=express();const allowed=(process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:2567,http://127.0.0.1:2567').split(',').map(x=>x.trim());
 const validOrigin=(origin?:string,host?:string)=>!origin||allowed.includes(origin)||origin===`https://${host}`||(process.env.NODE_ENV!=='production'&&origin===`http://${host}`);
 app.use((req,res,next)=>cors({origin(origin,cb){cb(null,validOrigin(origin,req.headers.host));}})(req,res,next));app.use(express.json({limit:'2kb'}));
 app.get('/health',(_req,res)=>res.json({ok:true,protocol:PROTOCOL,content:CONTENT,rooms:invites.size,maxRooms:Number(process.env.MAX_ROOMS||5)}));
 app.get('/api/rooms/:code',(req,res)=>{const roomId=invites.get(req.params.code.toUpperCase());if(!roomId){res.status(404).json({error:'Invite not found. Check the six-character code.'});return;}const room=matchMaker.getLocalRoomById(roomId)as ExpeditionRoom;if(room.state.phase!=='lobby'){res.status(403).json({error:'This expedition has deployed. Only its reserved players can reconnect.'});return;}if([...room.state.players.values()].filter(p=>p.kind!=='companion').length>=3){res.status(409).json({error:'Room full. Maximum three online wardens.'});return;}res.json({roomId});});
 app.use(express.static(resolve('apps/client/dist')));
 const http=createServer(app);
 const server=new Server({transport:new WebSocketTransport({server:http,maxPayload:2048,verifyClient(info,cb){cb(validOrigin(info.origin,info.req.headers.host),403,'Origin not allowed');}})});
 server.define('expedition',ExpeditionRoom);
 await server.listen(port,'0.0.0.0');console.log(`Hollow Line server listening on ${port}`);
 return {server,http,app};
}
if(!process.env.HOLLOW_TEST)startServer().catch(e=>{console.error(e.message);process.exit(1);});
