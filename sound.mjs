export class TableSound{
 constructor(){this.enabled=false;this.context=null;this.played=0;this.master=null;}
 async unlock(){try{if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=.16;this.master.connect(this.context.destination);}// iOS may report 'interrupted' as well as 'suspended'; resume from any gesture until running.
 if(this.context.state!=='running'&&this.context.state!=='closed')await this.context.resume();}catch{this.context=null;}}
 async toggle(){this.enabled=!this.enabled;if(this.enabled)await this.unlock();return this.enabled;}
 tone(freq,time,duration,volume=.2,type='sine'){if(!this.context||!this.master)return;const o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(this.master);o.start(time);o.stop(time+duration+.01);}
 play(kind){if(!this.enabled||!this.context||this.context.state!=='running')return;this.played++;const t=this.context.currentTime;if(kind==='win'){[523,659,784,1047].forEach((n,i)=>this.tone(n,t+i*.09,.4,.3));}else if(kind==='call'){this.tone(392,t,.12,.25,'triangle');this.tone(587,t+.06,.2,.2,'triangle');}else if(kind==='discard'){this.tone(780,t,.025,.24,'triangle');this.tone(210,t+.025,.045,.18);}else if(kind==='place'||kind==='draw'){const v=kind==='place'?.085:.055;this.tone(660,t,.018,v,'triangle');this.tone(190,t+.012,.035,v*.65);}else this.tone(520,t,.04,.08,'triangle');}
 suspend(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 resume(){const state=this.context?.state;if(this.enabled&&state&&state!=='running'&&state!=='closed')this.context.resume().catch(()=>{});}
 get state(){return this.context?.state||'uninitialized';}
}
