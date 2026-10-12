import {settings} from './storage';
export class Audio {
 ctx?:AudioContext;master?:GainNode;music?:GainNode;effects?:GainNode;noise?:AudioBuffer;voices=0;last=new Map<string,number>();ambient:OscillatorNode[]=[];stage=0;
 async start(){if(!this.ctx){const c=this.ctx=new AudioContext();this.master=c.createGain();this.music=c.createGain();this.effects=c.createGain();this.master.connect(c.destination);this.music.connect(this.master);this.effects.connect(this.master);this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.6;
   for(const [freq,volume]of [[55,.045],[82.41,.025],[110,.013]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(this.music);o.start();this.ambient.push(o);}
   setInterval(()=>{if(this.ctx?.state==='running')this.bell(this.stage===5?.35:.08,true);},this.stage===5?6000:14000);
  }this.apply();await this.ctx.resume();}
 apply(){if(!this.ctx)return;this.master!.gain.setTargetAtTime(settings.master,this.ctx.currentTime,.03);this.music!.gain.setTargetAtTime(settings.music,this.ctx.currentTime,.05);this.effects!.gain.setTargetAtTime(settings.effects,this.ctx.currentTime,.03);}
 tone(freq:number,end:number,duration:number,volume:number,type:OscillatorType='sine',music=false){if(!this.ctx||this.ctx.state!=='running'||this.voices>24)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();this.voices++;o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),c.currentTime+duration);g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.002,volume),c.currentTime+.008);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(music?this.music!:this.effects!);o.start();o.stop(c.currentTime+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};}
 hiss(duration:number,volume:number,frequency=1200){if(!this.ctx||this.voices>24)return;const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();s.buffer=this.noise!;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.6;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(filter);filter.connect(g);g.connect(this.effects!);s.start();s.stop(c.currentTime+duration);this.voices++;s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();this.voices--;};}
 bell(volume=.12,music=false){for(const [multiple,gain]of [[1,1],[2.76,.45],[5.4,.15]])this.tone(110*multiple,108*multiple,1.9,volume*gain,'sine',music);}
 play(event:any){const type=event.kind,now=performance.now();if(now-(this.last.get(type)||0)<(type==='hit'?45:25))return;this.last.set(type,now);
  if(type==='rifle'){this.tone(150,55,.09,.1,'triangle');this.hiss(.055,.11,3800);}
  else if(type==='execution'){this.tone(280,45,.25,.15,'sawtooth');this.hiss(.16,.13,2000);}
  else if(['cut','lunge','whirlwind','martyrs_engine'].includes(type)){this.hiss(.19,.15,600);this.tone(type==='cut'?170:100,50,.18,.065,'triangle');}
  else if(['ember','cinder_choir'].includes(type)){this.tone(450,190,.17,.08,'sawtooth');this.hiss(.12,.035,1300);}
  else if(['arc','arc_coil','ricochet'].includes(type)){this.tone(820,300,.13,.065,'square');this.hiss(.07,.04,5000);}
  else if(type==='well'){this.tone(200,40,.65,.13,'sine');this.tone(510,180,.6,.05,'triangle');}
  else if(type==='hit'||type==='plate_hit'){this.hiss(.04,.065,2200);this.tone(event.weak?820:360,180,.045,.05,'sine');}
  else if(['kill','break','plate_break','explosion','boss_sweep'].includes(type)){this.hiss(.35,.13,300);this.tone(type==='kill'?100:65,25,.4,.1,'triangle');}
  else if(type==='tell'){const e=event.enemy;if(e==='carrion_runner')this.tone(145,80,.35,.11,'sawtooth');else if(e==='riftspitter')this.tone(260,680,.65,.08,'triangle');else if(e==='ironbound_bulwark')this.tone(170,65,.8,.13,'square');else this.bell(.085);}
  else if(['bell','boss_phase','zone'].includes(type))this.bell(type==='boss_phase'?.18:.09);
  else if(['legendary','clear','complete','socket'].includes(type)){this.tone(440,440,.35,.1);setTimeout(()=>this.tone(660,660,.5,.08),110);setTimeout(()=>this.tone(880,880,.7,.08),240);}
  else if(type==='hurt')this.tone(80,40,.17,.12,'sawtooth');
  else if(['heal','revive','blood_seal'].includes(type))this.tone(320,640,.4,.08,'sine');
  else if(type==='reload'){this.hiss(.09,.05,2800);this.tone(350,220,.1,.03,'square');}
 }
}
