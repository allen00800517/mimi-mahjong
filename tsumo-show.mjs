// v1.00 · 自摸 animation in the real game (layout C, agreed in the character lab 2026-10-18): the table dims, the winner
// rises from the bottom edge in the centre, glides left during the big move, the 自摸 stamp lands at stampAt, and the
// clip ends exactly where the settlement portrait appears. The green screen is keyed live (chroma-video.mjs).
// The video always plays muted (iPhone allows that without a tap); the voice is the same track decoded into the
// game's audio context, which the first tap already unlocked. If the clip is not downloaded yet or the phone refuses
// to play video (Low Power Mode), the caller falls back to the still burst portrait + stamp.
import {WIN_ANIM,slideCx} from './win-show.mjs';
import {ChromaVideo} from './chroma-video.mjs';
import {VOICE_GAIN} from './voice-player.mjs';
export const RISE_MS=320;
export const CLIP_MAX_MS=6000;          // safety: never hold the table longer than this
export const voiceUrl=id=>'./assets/win-v1/'+id+'-tsumo-voice.mp3';
// Where the clip frame sits at a given moment: rise from below for RISE_MS, glide from the centre to the hand-off spot.
export function clipTransform(anim,ms,sinceStart){
 const p=Math.min(1,Math.max(0,sinceStart/RISE_MS)),ty=anim.handoff.frameH*Math.pow(1-p,3);
 return {tx:slideCx(anim,ms)-427,ty};
}
export class TsumoShow{
 constructor({sound,fetcher=(...a)=>fetch(...a)}={}){this.sound=sound;this.fetcher=fetcher;this.urls=new Map();this.pending=new Map();this.voiceBytes=new Map();this.voiceBuffers=new Map();this.run=0;this.raf=null;this.voice=null;this.video=null;}
 // Download clips (as blobs, so playback never waits on the network) and voices for the characters at the table.
 preload(ids){
  for(const id of new Set(ids)){const a=WIN_ANIM[id];if(!a||this.pending.has(id))continue;
   this.pending.set(id,this.fetcher(a.video).then(r=>{if(!r.ok)throw Error('clip');return r.blob();}).then(b=>{const u=URL.createObjectURL(b);this.urls.set(id,u);return u;}).catch(()=>{this.pending.delete(id);return null;}));
   this.fetcher(voiceUrl(id)).then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(b)this.voiceBytes.set(id,b);}).catch(()=>{});
  }
 }
 canPlay(id){return !!WIN_ANIM[id]&&this.urls.has(id);}
 element(){
  if(this.video)return this.video;const v=document.createElement('video');v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='auto';
  // Kept in the page (not display:none) so every browser keeps decoding frames for the canvas.
  v.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';v.setAttribute('aria-hidden','true');document.body.append(v);return this.video=v;
 }
 async voiceBuffer(id){
  const ctx=this.sound?.context;if(!ctx)return null;const cached=this.voiceBuffers.get(id);if(cached?.ctx===ctx)return cached.buf;
  const bytes=this.voiceBytes.get(id);if(!bytes)return null;
  try{const buf=await ctx.decodeAudioData(bytes.slice(0));this.voiceBuffers.set(id,{ctx,buf});return buf;}catch{return null;}
 }
 async playVoice(id,offsetSeconds,token){
  const ctx=this.sound?.context;if(!this.sound?.enabled||!ctx||ctx.state!=='running')return;
  const buf=await this.voiceBuffer(id);if(!buf||token!==this.run)return;
  const v=this.video,offset=Math.max(0,v&&!v.paused?v.currentTime:offsetSeconds);if(offset>=buf.duration)return;
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;g.gain.value=VOICE_GAIN;src.connect(g);g.connect(ctx.destination);src.start(0,offset);
  this.voice={src,g};src.onended=()=>{src.disconnect();g.disconnect();if(this.voice?.src===src)this.voice=null;};
 }
 // Starts the clip inside the win stage. Returns false when it cannot (caller shows the still instead);
 // onFail fires if the browser later refuses playback.
 start({id,stage,before=null,onStamp,onEnd,onFail}){
  const a=WIN_ANIM[id],url=this.urls.get(id);if(!a||!url)return false;
  const token=++this.run,v=this.element();
  if(v.dataset.id!==id){v.src=url;v.dataset.id=id;}
  try{v.currentTime=0;}catch{}
  const canvas=document.createElement('canvas'),h=a.handoff.frameH,w=h*16/9;canvas.className='wc-video';
  canvas.style.cssText='left:'+(427-w/2).toFixed(1)+'px;width:'+w.toFixed(1)+'px;height:'+h+'px;transform:translate(0px,'+h+'px)';
  stage.insertBefore(canvas,before);const chroma=new ChromaVideo(canvas,v);
  let stamped=false,began=null,voiced=false;const t0=performance.now();
  const tick=()=>{
   if(token!==this.run)return;const now=performance.now();began??=now;const ms=v.currentTime*1000;
   const {tx,ty}=clipTransform(a,ms,now-began);canvas.style.transform='translate('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px)';chroma.draw();
   if(!voiced){voiced=true;this.playVoice(id,v.currentTime,token);}
   if(!stamped&&ms>=a.stampAt){stamped=true;onStamp?.();}
   if(v.ended||now-t0>CLIP_MAX_MS){if(!stamped)onStamp?.();onEnd?.();return;}
   this.raf=requestAnimationFrame(tick);
  };
  v.play().then(()=>{if(token===this.run)this.raf=requestAnimationFrame(tick);}).catch(()=>{if(token!==this.run)return;canvas.remove();this.playVoice(id,0,token);onFail?.();});
  return true;
 }
 stop(){
  this.run++;if(this.raf)cancelAnimationFrame(this.raf);this.raf=null;try{this.video?.pause();}catch{}
  const voice=this.voice;this.voice=null;if(voice){try{const ctx=this.sound.context,now=ctx.currentTime;voice.g.gain.setValueAtTime(voice.g.gain.value,now);voice.g.gain.linearRampToValueAtTime(0,now+.15);voice.src.stop(now+.17);}catch{}}
 }
}
