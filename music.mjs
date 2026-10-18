// v0.91 · Background music. Four round tracks (東南西北) plus one "someone declared 聽" track.
// Each file is stereo and already normalised; the loop crossfade is baked into the file just before loopEnd,
// so an AudioBufferSourceNode can jump loopEnd → loopStart sample-accurately with no audible seam.
// Only the playing track stays decoded, to keep memory low on phones.
export const MUSIC_TRACKS=Object.freeze({
 east:{label:'東風圈',url:'./assets/music-v1/bgm-east.mp3',loopStart:7.964,loopEnd:163.538},
 south:{label:'南風圈',url:'./assets/music-v1/bgm-south.mp3',loopStart:35.782,loopEnd:144.08},
 west:{label:'西風圈',url:'./assets/music-v1/bgm-west.mp3',loopStart:67.106,loopEnd:155.527},
 north:{label:'北風圈',url:'./assets/music-v1/bgm-north.mp3',loopStart:19.992,loopEnd:162.656},
 ready:{label:'聽牌',url:'./assets/music-v1/bgm-ready.mp3',loopStart:18.994,loopEnd:143.824},
 // v1.02 · title theme (Mahjong_Parlour_Night, user's Flow Music): title screen and character select. 120 BPM; the loop
 // runs from the end of the first chorus to the end of the second (40 bars), so the intro and first chorus play once.
 title:{label:'標題',url:'./assets/music-v1/bgm-title.mp3',loopStart:80.02,loopEnd:160.02},
});
export const WIND_TRACKS=Object.freeze(['east','south','west','north']);
export const MUSIC_VOLUME=.35; // v0.92: 30% lower than the first .5 (user request)

// Which track should play right now. choice: 'auto' or a wind track id the player fixed in the menu.
export function musicTrackFor({phase,players=[],roundWind=0,rounds=null,seed=0,choice='auto',title=false}={}){
 if(title)return 'title';
 const live=!['ended','review'].includes(phase);
 if(live&&players.some(p=>p&&p.state&&p.state!=='S0'))return 'ready';
 if(choice&&choice!=='auto'&&WIND_TRACKS.includes(choice))return choice;
 if(rounds===4)return WIND_TRACKS[roundWind]??'east';
 if(rounds===1)return WIND_TRACKS[((seed>>>0)%4+4)%4];
 return 'east';
}

export class MusicPlayer{
 constructor({context,enabled,fetcher=(...args)=>fetch(...args),fade=1.2}={}){
  this.context=context;this.enabled=enabled;this.fetcher=fetcher;this.fade=fade;
  this.buffers=new Map();this.bytes=new Map();this.loading=new Map();this.current=null;this.wanted=null;this.active=null;this.master=null;this.masterContext=null;this.errors=[];
 }
 output(){
  const ctx=this.context();if(!ctx)return null;
  if(this.masterContext!==ctx){this.masterContext=ctx;this.master=ctx.createGain();this.master.gain.value=MUSIC_VOLUME;this.master.connect(ctx.destination);this.buffers.clear();this.loading.clear();this.active=null;}
  return this.master;
 }
 load(id){
  const ctx=this.context(),track=MUSIC_TRACKS[id];if(!ctx||!track)return Promise.resolve(null);
  this.output(); // bind to this context first, so a track decoded ahead of time is not thrown away by output()
  if(this.buffers.has(id))return Promise.resolve(this.buffers.get(id));
  if(!this.loading.has(id)){
   const fresh=()=>this.fetcher(track.url).then(r=>{if(!r.ok)throw Error('Music unavailable');return r.arrayBuffer();});
   const got=this.bytes.has(id)?this.bytes.get(id).then(b=>b||fresh()):fresh();
   const p=got.then(bytes=>ctx.decodeAudioData(bytes.slice(0))).then(buffer=>{if(this.masterContext===ctx)this.buffers.set(id,buffer);return buffer;}).catch(e=>{this.errors.push(id+': '+(e?.message||e));return null;}).finally(()=>this.loading.delete(id));
   this.loading.set(id,p);
  }
  return this.loading.get(id);
 }
 // v1.02 · Download a track's bytes before audio is allowed (title screen), so it can start right on the first tap.
 prefetch(id){const track=MUSIC_TRACKS[id];if(!track||this.bytes.has(id)||this.buffers.has(id))return;
  this.bytes.set(id,this.fetcher(track.url).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null));}
 // Resolves true once the track is actually playing, or false after timeout ms.
 whenPlaying(id,timeout=1200){const t0=Date.now();return new Promise(res=>{const tick=()=>{if(this.active?.id===id)res(true);else if(Date.now()-t0>=timeout)res(false);else setTimeout(tick,40);};tick();});}
 // Ask for a track; playback follows whenever audio is enabled. Calling it repeatedly with the same id is cheap.
 want(id){this.wanted=id;this.sync();}
 async sync(){
  const ctx=this.context(),on=!!(ctx&&this.enabled()&&ctx.state==='running');
  if(!on){this.pending=null;if(this.active)this.stopActive(0.25);this.current=null;return;}
  const out=this.output(),id=this.wanted;
  if(!id||this.active?.id===id||this.pending===id)return;
  this.pending=id;const buffer=await this.load(id);
  if(this.pending!==id)return;this.pending=null;
  if(!buffer||this.context()!==ctx||!this.enabled()||ctx.state!=='running')return;
  const track=MUSIC_TRACKS[id],src=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;
  src.buffer=buffer;src.loop=true;src.loopStart=track.loopStart;src.loopEnd=Math.min(track.loopEnd,buffer.duration);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+this.fade);
  src.connect(gain);gain.connect(out);src.start(now);
  if(this.active)this.stopActive(this.fade);
  this.active={id,src,gain};this.current=id;this.prune(id);
 }
 stopActive(fade){
  const a=this.active,ctx=this.context();this.active=null;if(!a)return;
  try{const now=ctx.currentTime;a.gain.gain.cancelScheduledValues(now);a.gain.gain.setValueAtTime(a.gain.gain.value,now);a.gain.gain.linearRampToValueAtTime(0,now+fade);a.src.stop(now+fade+.05);a.src.onended=()=>{a.src.disconnect();a.gain.disconnect();};}catch{}
 }
 // Stereo tracks are ~60MB once decoded, so only the playing one stays decoded; the next is decoded when needed.
 prune(keep){for(const id of [...this.buffers.keys()])if(id!==keep)this.buffers.delete(id);}
 stop(){this.pending=null;this.stopActive(.25);this.current=null;}
}
