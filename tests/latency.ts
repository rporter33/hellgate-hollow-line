import {createServer,request} from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
// Actual bidirectional transport delay, jitter, and reliable-transport stalls.
export async function latencyProxy(port:number,target:number){
 const pending=new Set<ReturnType<typeof setTimeout>>();const measurements:{path:string;started:number;up:number;down:number;seconds:number}[]=[];
 const schedule=(fn:()=>void,delay:number)=>{const timer=setTimeout(()=>{pending.delete(timer);fn();},delay);pending.add(timer);};
 const sample=()=>50+(Math.random()-.5)*30+(Math.random()<.01?100:0);
 const server=createServer((req,res)=>{const chunks:Buffer[]=[];req.on('data',v=>chunks.push(v));req.on('end',()=>schedule(()=>{const up=request({hostname:'127.0.0.1',port:target,path:req.url,method:req.method,headers:req.headers},r=>{const data:Buffer[]=[];r.on('data',v=>data.push(v));r.on('end',()=>schedule(()=>{res.writeHead(r.statusCode||200,r.headers);res.end(Buffer.concat(data));},sample()));});up.on('error',()=>{res.writeHead(502);res.end();});up.end(Buffer.concat(chunks));},sample()));});
 const ws=new WebSocketServer({noServer:true});const sockets=new Set<WebSocket>();
 server.on('upgrade',(req,socket,head)=>ws.handleUpgrade(req,socket,head,c=>{const measurement={path:req.url||'',started:Date.now(),up:0,down:0,seconds:0};measurements.push(measurement);const up=new WebSocket(`ws://127.0.0.1:${target}${req.url}`);sockets.add(c);sockets.add(up);let outbound=0,inbound=0;const queued:{data:any;binary:boolean}[]=[];
  // One timer drains each FIFO. Independent timers can run out of order under
  // load even when their nominal deadlines increase; TCP never reorders frames.
  type Frame={to:WebSocket;data:any;binary:boolean;at:number};
  const lanes:{out:Frame[];in:Frame[]}={out:[],in:[]};
  const drain=(dir:'out'|'in')=>{const queue=lanes[dir],frame=queue[0];if(!frame)return;schedule(()=>{queue.shift();if(frame.to.readyState===WebSocket.OPEN)frame.to.send(frame.data,{binary:frame.binary});drain(dir);},Math.max(0,frame.at-Date.now()));};
  const forward=(to:WebSocket,data:any,binary:boolean,dir:'out'|'in')=>{const now=Date.now(),previous=dir==='out'?outbound:inbound,at=Math.max(now+sample(),previous+1);if(dir==='out')outbound=at;else inbound=at;const queue=lanes[dir];queue.push({to,data:Buffer.from(data),binary,at});if(queue.length===1)drain(dir);};
  c.on('message',(data,binary)=>{measurement.up+=(data as Buffer).byteLength;if(up.readyState!==WebSocket.OPEN)queued.push({data,binary});else forward(up,data,binary,'out');});up.on('open',()=>{for(const v of queued)forward(up,v.data,v.binary,'out');});up.on('message',(data,binary)=>{measurement.down+=(data as Buffer).byteLength;forward(c,data,binary,'in');});
  c.on('close',()=>{measurement.seconds=(Date.now()-measurement.started)/1000;sockets.delete(c);up.close();});up.on('close',()=>{sockets.delete(up);c.close();});c.on('error',()=>{});up.on('error',()=>c.close());
 }));await new Promise<void>(r=>server.listen(port,'127.0.0.1',r));
 return Object.assign(async()=>{for(const timer of pending)clearTimeout(timer);for(const s of sockets)s.terminate();ws.close();await new Promise<void>(r=>server.close(()=>r()));},{measurements,port:(server.address() as {port:number}).port});
}
