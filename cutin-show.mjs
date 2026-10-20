// v1.13 · Cut-in clips (tier 2+ wins): the character's own Flow clip — eyes + line, pull back, the tile slammed down,
// a white flash — played full stage. It opens inside the cut-in band (only the eyes show) and the band snaps open to
// the whole screen as the camera pulls back. Same rules as the 自摸 clips: the video plays muted (allowed without a
// tap) and its sound track is decoded into the game's audio context; both are downloaded ahead for the characters at
// the table, so playback never waits on the network. A character without a clip keeps the still placeholder cut-in.
import {VOICE_GAIN} from './voice-player.mjs';
// open = ms into the clip when the band opens to full screen (the camera starts pulling back); ms = clip length.
// v1.29 · clean 16:9 clips (-c): once open the picture shows whole between the 龍鳳柱 (the blurred -w versions are retired).
export const CUTIN_CLIPS=Object.freeze({
 ichika:{video:'./assets/cutin-v1/ichika-cutin-c.mp4',audio:'./assets/cutin-v1/ichika-cutin.mp3',open:1750,ms:6040},
 // 珍美: eyes + golden glint, the band opens as the camera pulls back to her ohoho laugh (1.25 s); 8.5 s. v1.17 · the
 // sound fades out where her line ends (a second laugh during the pull-back was cut off mid-way).
 harumi:{video:'./assets/cutin-v1/harumi-cutin-c.mp4',audio:'./assets/cutin-v1/harumi-cutin-2.mp3',open:1250,ms:8500},
 // v1.18 · 權藤: glare + golden sparkles and かくごせい, the band opens as the camera pulls back (1.7 s), a short
 // settled hold, the heavy slam under his ringed palm, white; 6.83 s.
 gondo:{video:'./assets/cutin-v1/gondo-cutin-c.mp4',audio:'./assets/cutin-v1/gondo-cutin.mp3',open:1700,ms:6830},
 // v1.19 · 蜜蜜: eyes + いっただきまーす, the band opens as the camera pulls back to her crouch (2.1 s), she blasts out
 // of the top of the frame, bursts through the clouds, dives down yelling and lands superhero-style (negative-film
 // impact frame), white; 9.7 s. v1.20 · no sped-up sound anywhere (her yell plays at its own speed) and the negative
 // flash is made from the landing shot itself, so it no longer jumps between two takes. v1.21 · the dive's sound runs
 // on unbroken through the negative flash (only the picture changes); the impact boom is layered under it. v1.22 · the
 // stray "hey" at the peak of the leap is muted (a silent beat before the dive). v1.23 · final cut (the user's join): the
 // dive cuts away just before touchdown to the take whose landing, negative flash and burst all run on in one piece; 9.79 s.
 mimi:{video:'./assets/cutin-v1/mimi-cutin-c.mp4',audio:'./assets/cutin-v1/mimi-cutin-5.mp3',open:2100,ms:9790},
});
export const CUTIN_OPEN_MS=260;
export class CutinShow{
 constructor({sound,fetcher=(...a)=>fetch(...a)}={}){this.sound=sound;this.fetcher=fetcher;this.urls=new Map();this.pending=new Set();this.bytes=new Map();this.buffers=new Map();this.run=0;this.timers=[];this.src=null;this.video=null;}
 // v1.25 · one clip at a time, after the table is ready (the caller gates it): four clips at once used to crowd out the
 // table's own art and the title music on a phone connection, leaving 「正在準備牌桌」 up for a long time.
 preload(ids){
  for(const id of new Set(ids)){const c=CUTIN_CLIPS[id];if(!c||this.pending.has(id))continue;this.pending.add(id);
   this.queue=(this.queue||Promise.resolve()).then(()=>this.fetcher(c.video).then(r=>{if(!r.ok)throw Error('clip');return r.blob();}).then(b=>this.urls.set(id,URL.createObjectURL(b))).catch(()=>this.pending.delete(id)))
    .then(()=>this.fetcher(c.audio).then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(b)this.bytes.set(id,b);}).catch(()=>{}));
  }
 }
 canPlay(id){return !!CUTIN_CLIPS[id]&&this.urls.has(id);}
 clip(id){return CUTIN_CLIPS[id]||null;}
 async buffer(id){
  const ctx=this.sound?.context;if(!ctx)return null;const c=this.buffers.get(id);if(c?.ctx===ctx)return c.buf;
  const b=this.bytes.get(id);if(!b)return null;try{const buf=await ctx.decodeAudioData(b.slice(0));this.buffers.set(id,{ctx,buf});return buf;}catch{return null;}
 }
 async playSound(id,offset,token){
  const ctx=this.sound?.context;if(!this.sound?.enabled||!ctx||ctx.state!=='running')return;
  const buf=await this.buffer(id);if(!buf||token!==this.run||offset>=buf.duration)return;
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;g.gain.value=VOICE_GAIN;src.connect(g);g.connect(ctx.destination);src.start(0,offset);
  this.src={src,g};src.onended=()=>{src.disconnect();g.disconnect();if(this.src?.src===src)this.src=null;};
 }
 // Builds the clip inside `stage` (a .wc-stage) and plays it. Returns false when it cannot (caller shows the
 // placeholder); onEnd fires when the clip finishes, onFail if the browser refuses to play it.
 start({id,stage,onEnd,onFail}){
  const c=CUTIN_CLIPS[id],url=this.urls.get(id);if(!c||!url)return false;
  const token=++this.run;
  const wrap=document.createElement('div');wrap.className='ci-clip';
  // v1.29 · 龍鳳柱 (dragon left, phoenix right) with eye after-glows and landing sparks; see game-layout.css.
  const sparks=up=>'<b class="ci-sparks">'+[[-26,-14],[-16,-24],[-6,-30],[6,-28],[16,-22],[26,-12],[-20,-6],[20,-4]].map(([x,y])=>'<s style="--dx:'+x+'px;--dy:'+(up?-y:y)+'px"></s>').join('')+'</b>';
  wrap.innerHTML='<div class="ci-edge"></div><div class="ci-frame"></div><div class="ci-pillar l"><i class="ci-eye"><em></em></i>'+sparks(false)+'</div><div class="ci-pillar r"><i class="ci-eye"><em></em></i>'+sparks(true)+'</div>';
  const v=document.createElement('video');v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='auto';v.src=url;
  wrap.querySelector('.ci-frame').append(v);stage.append(wrap);this.video=v;
  let done=false;const end=()=>{if(done||token!==this.run)return;done=true;onEnd?.();};
  v.onended=end;
  v.play().then(()=>{
   if(token!==this.run)return;this.playSound(id,v.currentTime,token);
   const at=Math.max(0,c.open-v.currentTime*1000);
   this.timers.push(setTimeout(()=>{if(token===this.run)wrap.classList.add('open');},at));
   // the pillars land 0.25 s (dragon) and 0.33 s (phoenix) after the band opens: a heavy thud and a jolt each
   for(const d of [250,330])this.timers.push(setTimeout(()=>{if(token!==this.run)return;this.sound?.play?.('pillar');wrap.classList.remove('hit');void wrap.offsetWidth;wrap.classList.add('hit');},at+d));
   this.timers.push(setTimeout(()=>{if(token===this.run)wrap.classList.add('ending');},Math.max(0,c.ms-420-v.currentTime*1000)));
   this.timers.push(setTimeout(end,c.ms+600)); // safety if 'ended' never fires
  }).catch(()=>{if(token!==this.run)return;wrap.remove();onFail?.();});
  return true;
 }
 stop(){
  this.run++;this.timers.forEach(clearTimeout);this.timers=[];
  try{this.video?.pause();}catch{}this.video=null;
  const s=this.src;this.src=null;if(s){try{const ctx=this.sound.context,now=ctx.currentTime;s.g.gain.setValueAtTime(s.g.gain.value,now);s.g.gain.linearRampToValueAtTime(0,now+.15);s.src.stop(now+.17);}catch{}}
 }
}
