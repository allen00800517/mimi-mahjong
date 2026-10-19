// Per-kind level under the sound bus; tile sounds sit under the character voices, cues lower still.
export const SFX=Object.freeze({discard:{files:6,gain:.85},draw:{files:5,gain:.5},meld:{files:3,gain:.8},riichi:{files:3,gain:1},strong:{files:3,gain:.9},reveal:{files:3,gain:1},shuffle:{files:2,gain:.55},call:{files:1,gain:.28},win:{files:1,gain:.5},flower:{files:1,gain:.35},button:{files:1,gain:.22},ready:{files:1,gain:.3},dice:{files:1,gain:.3}});
export const SFX_VOLUME=.7;
// Game event → which samples play, with start offsets in seconds.
export const SOUND_PLAN=Object.freeze({
 discard:()=>[['discard',0]],
 riichi:()=>[['riichi',0],['ready',.22]],
 draw:()=>[['draw',0]],
 place:()=>[['meld',0]],
 flower:()=>[['flower',0]],
 call:()=>[['call',0]],
 select:()=>[['button',0]],
 // v1.00 · with a 自摸 clip the start stays soft so the voice is heard; the hit and jingle come with the stamp.
 win:({method,anim}={})=>anim?[['reveal',0]]:method==='tsumo'?[['strong',0],['reveal',.12],['win',.4]]:[['reveal',0],['win',.3]],
 stamp:()=>[['strong',0],['win',.15]],
 // v1.12 · the cut-in swoosh when a tier-2+ win is declared (the stamp hit follows when the stamp lands).
 cutin:()=>[['reveal',0]],
 shuffle:()=>[['shuffle',0]], // the old recorded dice ran into the first discards (user); dice now have their own show
 dice:()=>[['dice',0]], // v0.93 · cut to dice-show.mjs: tumble 0–0.55s, land, badge at 0.75s
});
export class TableSound{
 constructor({sampleBase=null,fetcher=(...a)=>fetch(...a)}={}){this.enabled=false;this.context=null;this.played=0;this.master=null;this.sampleBase=sampleBase;this.fetcher=fetcher;this.samples=null;}
 // v1.02 · Create the (still silent) audio context early so tracks and samples can be decoded before the first tap;
 // browsers allow that, they only refuse to resume it without a gesture.
 prepare(){try{if(this.context)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=.16;this.master.connect(this.context.destination);this.loadSamples();}catch{this.context=null;}}
 async unlock(){try{if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=.16;this.master.connect(this.context.destination);}// iOS may report 'interrupted' as well as 'suspended'; resume from any gesture until running.
 this.loadSamples(); if(this.context.state!=='running'&&this.context.state!=='closed')await this.context.resume();}catch{this.context=null;}}
 async toggle(){this.enabled=!this.enabled;if(this.enabled)await this.unlock();return this.enabled;}
 tone(freq,time,duration,volume=.2,type='sine'){if(!this.context||!this.master)return;const o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(this.master);o.start(time);o.stop(time+duration+.01);}
 playTone(kind){if(!this.enabled||!this.context||this.context.state!=='running')return;this.played++;const t=this.context.currentTime;if(kind==='win'){[523,659,784,1047].forEach((n,i)=>this.tone(n,t+i*.09,.4,.3));}else if(kind==='call'){this.tone(392,t,.12,.25,'triangle');this.tone(587,t+.06,.2,.2,'triangle');}else if(kind==='discard'){this.tone(780,t,.025,.24,'triangle');this.tone(210,t+.025,.045,.18);}else if(kind==='place'||kind==='draw'){const v=kind==='place'?.085:.055;this.tone(660,t,.018,v,'triangle');this.tone(190,t+.012,.035,v*.65);}else this.tone(520,t,.04,.08,'triangle');}

 // v0.92 · recorded tile sounds (BOOTH 麻雀サウンド素材集, trimmed) + synthesized cues. Falls back to tones until loaded.
 loadSamples(){
  if(!this.sampleBase||!this.context||this.samples)return;const ctx=this.context;this.samples=new Map();
  this.bus=ctx.createGain();this.bus.gain.value=SFX_VOLUME;this.bus.connect(ctx.destination);
  for(const [kind,{files}] of Object.entries(SFX))for(let i=1;i<=files;i++)
   this.fetcher(this.sampleBase+kind+'-'+i+'.mp3').then(r=>{if(!r.ok)throw Error(kind);return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).then(buf=>{if(this.context!==ctx)return;const list=this.samples.get(kind)||[];list.push(buf);this.samples.set(kind,list);}).catch(()=>{});
 }
 sample(kind,delay=0){
  const list=this.samples?.get(kind),ctx=this.context;if(!list?.length||!ctx)return false;
  let i=Math.floor(Math.random()*list.length);if(list.length>1&&i===this.lastIndex?.[kind])i=(i+1)%list.length;(this.lastIndex??={})[kind]=i;
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=list[i];g.gain.value=SFX[kind].gain;src.connect(g);g.connect(this.bus);src.start(ctx.currentTime+delay);const live=(this.live??={})[kind]??=new Set(),entry={src,g};live.add(entry);src.onended=()=>{live.delete(entry);src.disconnect();g.disconnect();};return true;
 }
 play(kind,detail={}){
  if(!this.enabled||!this.context||this.context.state!=='running')return;
  const now=performance.now(),last=(this.lastPlayed??={})[kind]??-1e9,gap=kind==='place'?300:50;if(now-last<gap)return;this.lastPlayed[kind]=now;
  const plan=SOUND_PLAN[kind]?.(detail);
  if(!plan||!this.samples?.get(plan[0][0])?.length){this.playTone(kind==='riichi'?'discard':kind==='shuffle'||kind==='flower'?'place':kind);return;}
  this.played++;for(const [k,d] of plan)this.sample(k,d);
 }
 // Fade out whatever is still playing of one kind (never a hard cut), e.g. the shuffle when the dice are thrown.
 fade(kind,seconds=.3){const ctx=this.context,live=this.live?.[kind];if(!ctx||!live)return;const now=ctx.currentTime;for(const {src,g} of live){try{g.gain.cancelScheduledValues(now);g.gain.setValueAtTime(g.gain.value,now);g.gain.linearRampToValueAtTime(0,now+seconds);src.stop(now+seconds+.02);}catch{}}}
 suspend(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 resume(){const state=this.context?.state;if(this.enabled&&state&&state!=='running'&&state!=='closed')this.context.resume().catch(()=>{});}
 get state(){return this.context?.state||'uninitialized';}
}
