import {rectOf,pointOf} from './viewport.mjs';
import {CharacterTrack,characterEvents} from './character-model.mjs';
import {VoicePlayer} from './voice-player.mjs';
import {paintCharacterPose,loadCharacterClips,CHARACTER_MEDIA} from './character-media.mjs';
import {ready,PREFETCH_MS} from './clip-cache.mjs';
const seats=['south','east','north','west'];
function releaseImages(assets){if(assets?.cache){assets.cache.close();return;}for(const image of Object.values(assets?.images||{}))try{image.src='';}catch{}}
export class CharacterActors{
 constructor(sound){
  this.sound=sound;this.views=new Map();this.tracks=Array.from({length:4},()=>new CharacterTrack(performance.now()));this.seen=new Set();this.assets=new Map();this.pending=new Map();this.voices=new Map();this.failed=new Set();this.wanted=new Set();this.auditAt=0;this.auditText='';this.ready=false;this.blocked=true;this.reduced=true;
  const pending=Object.entries(CHARACTER_MEDIA).filter(([,media])=>media.motion).map(async([id,media])=>{
   const voice=new VoicePlayer({context:()=>sound.context,enabled:()=>sound.enabled&&!this.blocked});this.voices.set(id,voice);
   await voice.preload(media.motion.base,media.motion.voices);
  });
  this.voice=this.voices.get('ichika');
  this.loading=Promise.allSettled(pending).then(()=>{if(this.disabled)return;this.ready=this.assets.size>0;this.reconcile();this.schedule();this.audit();});
 }
 ensureMotion(id){
  // v1.28 · opponents' motion sheets (~20 MB) load after the title and after the table art, so the table is ready first.
  if(globalThis.mimiStartGate&&!(globalThis.mimiStartGateOpen&&globalThis.mimiTableReady))return;
  if(this.disabled||!CHARACTER_MEDIA[id]?.motion||this.pending.has(id)||this.assets.has(id)||this.failed.has(id))return;
  // The local player's body is not displayed: load only visible opponents' atlases.
  const pending=loadCharacterClips(id).then(assets=>{this.pending.delete(id);if(this.disabled)return;if(!this.wanted.has(id)){releaseImages(assets);return;}this.assets.set(id,assets);this.ready=true;this.reconcile();this.schedule();this.audit();}).catch(()=>{this.pending.delete(id);this.failed.add(id);});
  this.pending.set(id,pending);this.loading=Promise.allSettled([this.loading,pending]);
 }
 sync(game,cast,{blocked=false,reduced=false}={}){
  blocked=blocked||['ended','review'].includes(game.phase);
  if(this.game!==game||this.cast?.join()!==cast.join()){
   this.game=game;this.cast=[...cast];this.seen.clear();this.reset();this.tracks=cast.map(id=>new CharacterTrack(performance.now(),CHARACTER_MEDIA[id]?.motion?.profile));
  }
  const wasBlocked=this.blocked,wasReduced=this.reduced;this.blocked=blocked;this.reduced=reduced;
  if(blocked&&!wasBlocked||reduced&&!wasReduced)this.reset();
  // Coming back from a dialog, a hidden tab or a hand end restarts idle cleanly instead of jumping into a gesture.
  else if(!blocked&&wasBlocked||!reduced&&wasReduced)for(const track of this.tracks)track.reset(performance.now());
  this.wanted=new Set(cast.slice(1));
  if(!blocked&&!reduced)this.warmReactions(game);
  if(!reduced)for(const id of cast.slice(1))this.ensureMotion(id);
  if(!this.sound.enabled)this.stopVoices();
  this.reconcile();this.release();if(blocked||reduced)this.cancelFrame();else this.schedule();this.audit();
 }
 // v0.96 · when a seat could call (吃碰槓) or declare (聽), decode that reaction now; the computer still has to
 // think, so by the time it acts the clip is ready and voice and motion start together.
 warmReactions(game){
  if(!this.cast)return;const now=performance.now();this.warm??=new Map();
  for(let s=1;s<4;s++){
   const track=this.tracks[s];if(!track?.profile)continue;let ids;try{ids=game.actions(s).map(a=>a.id);}catch{continue;}
   const kinds=new Set();if(ids.some(id=>id.startsWith('chi:')))kinds.add('chi');if(ids.includes('pon'))kinds.add('pon');
   if(ids.some(id=>id==='openKan'||id.startsWith('concealedKan:')||id.startsWith('addedKan:')))kinds.add('kan');
   if(ids.some(id=>id.startsWith('declare:')))kinds.add('ready');
   if(!kinds.size)continue;
   const clips=[...kinds].map(k=>track.profile.actions[k]?.clip).filter(Boolean);this.warm.set(s,{clips,until:now+6000});
   const cache=this.assets.get(this.cast[s])?.cache;for(const c of clips)cache?.ensure(c).catch(()=>{});
  }
 }
 // Each frame: keep what is drawn and what is about to be drawn decoded; close the rest after a short linger.
 manage(seat,view,pose,now){
  const cache=view.assets.cache;if(!cache?.lazy)return;
  const keep=new Set();for(const p of [pose,pose.previous,pose.next])if(p?.clip)keep.add(p.clip);
  if(pose.nextKind&&pose.nextIdle<PREFETCH_MS){const v=this.tracks[seat]?.profile?.idleVariants?.[pose.nextKind];if(v)keep.add(v.clip);}
  const warm=this.warm?.get(seat);if(warm&&warm.until>now)for(const c of warm.clips)keep.add(c);
  for(const c of keep){if(cache.has(c))cache.touch(c,now);else cache.ensure(c).catch(()=>{});}
  if(now-(view.sweptAt||0)>500){view.sweptAt=now;cache.sweep(keep,now);}
 }
 // Decoded atlases are large (tens of MB each): drop characters that left the visible seats.
 release(){for(const [id,assets] of this.assets)if(!this.wanted.has(id)&&![...this.views.values()].some(v=>v.character===id)){this.assets.delete(id);releaseImages(assets);}this.ready=this.assets.size>0;}
 resident(seat){return seat!==0&&this.ready&&this.assets.has(this.cast?.[seat]);}
 events(before,game){
  if(this.game!==game||this.blocked)return;
  this.lastStep={revision:game.revision,clips:this.tracks.map(t=>t.clip)};
  for(const event of characterEvents(before,game)){
   const voice=this.voices.get(this.cast[event.seat]);if(!voice)continue;
   const key=game.revision+':'+event.seat+':'+event.kind;if(this.seen.has(key))continue;
   this.seen.add(key);if(this.seen.size>16)this.seen.delete(this.seen.values().next().value);
   const start=()=>{this.stopVoices();voice.play(event.kind);if(!this.reduced&&this.resident(event.seat))this.tracks[event.seat].play(event.kind,performance.now());this.schedule();this.audit();};
   // If the reaction clip is still decoding, hold voice and motion together for a moment (≤350 ms) instead of
   // letting the voice run ahead of a frozen character.
   const cache=this.assets.get(this.cast[event.seat])?.cache,clip=this.tracks[event.seat]?.profile?.actions?.[event.kind]?.clip;
   if(this.reduced||!cache?.lazy||!clip||cache.has(clip))start();
   else ready(cache,clip).then(()=>{if(this.game===game&&!this.blocked&&!this.disabled)start();});
   this.last={...event,revision:game.revision};
  }
  this.schedule();this.audit();
 }
 // Easter egg: the player taps a visible opponent. Only the drawn character counts, but with a finger-sized
 // tolerance (radius in CSS px): slim figures such as 珍美 were easy to miss with a 4 px window.
 hitSeat(clientX,clientY,radius=16){
  ({x:clientX,y:clientY}=pointOf(clientX,clientY));let best=null,bestDistance=Infinity;
  for(const [seat,view] of this.views){
   const r=rectOf(view.canvas);if(clientX<r.left-radius||clientX>r.right+radius||clientY<r.top-radius||clientY>r.bottom+radius)continue;
   const c=view.canvas,sx=c.width/r.width,sy=c.height/r.height;
   const x0=Math.max(0,Math.floor((clientX-radius-r.left)*sx)),y0=Math.max(0,Math.floor((clientY-radius-r.top)*sy));
   const x1=Math.min(c.width,Math.ceil((clientX+radius-r.left)*sx)),y1=Math.min(c.height,Math.ceil((clientY+radius-r.top)*sy));
   if(x1<=x0||y1<=y0)continue;
   let a;try{a=view.ctx.getImageData(x0,y0,x1-x0,y1-y0).data;}catch{return seat;}
   const w=x1-x0,step=Math.max(1,Math.round(2*sx));
   for(let y=y0;y<y1;y+=step)for(let x=x0;x<x1;x+=step){
    if(a[((y-y0)*w+(x-x0))*4+3]<=40)continue;
    const d=Math.hypot(r.left+(x+.5)/sx-clientX,r.top+(y+.5)/sy-clientY);
    if(d<=radius&&d<bestDistance){bestDistance=d;best=seat;}
   }
  }
  return best;
 }
 // Returns the reaction that started ('tap' or 'poke') or false. A declaration is never cut by taps.
 // The third tap on the same character within 10 s (taps during the first reaction count) plays the annoyed 'poke'.
 poke(seat,now=performance.now()){
  const id=this.cast?.[seat],track=this.tracks[seat];
  if(this.disabled||this.blocked||!id||seat===0||!this.resident(seat)||!track.profile.actions.tap)return false;
  track.sample(now);const running=track.action?.clip;
  if(running&&running!=='tap')return false;
  this.taps??=new Map();const taps=(this.taps.get(seat)||[]).filter(t=>now-t<10000);taps.push(now);this.taps.set(seat,taps);
  const voice=this.voices.get(id);let kind='tap';
  const cache=this.assets.get(id)?.cache,pokeClip=track.profile.actions.poke?.clip;
  if(taps.length===2&&pokeClip)cache?.ensure(pokeClip).catch(()=>{}); // the next tap may turn annoyed: decode it now
  if(taps.length>=3&&track.profile.actions.poke){kind='poke';this.taps.delete(seat);voice?.stop();}
  else if(running)return false;
  const clip=track.profile.actions[kind]?.clip;
  if(this.reduced||!cache?.lazy||!clip||cache.has(clip)){voice?.play(kind);if(!this.reduced)track.play(kind,now);}
  else ready(cache,clip).then(()=>{if(this.blocked||this.disabled)return;voice?.play(kind);track.play(kind,performance.now());this.schedule();});
  this.last={seat,kind};this.schedule();this.audit();return kind;
 }
 stopVoices(){for(const voice of this.voices.values())voice.stop();}
 async prepareVoices(){await Promise.allSettled([...this.voices.values()].map(voice=>voice.prepare()));}
 reset(){for(const track of this.tracks)track.reset(performance.now());this.stopVoices();this.last=null;}
 disable(){this.disabled=true;this.ready=false;this.assets.clear();this.cancelFrame();this.stopVoices();this.restore();}
 restore(){for(const view of this.views.values()){view.canvas.remove();if(view.image)view.image.style.visibility='';}this.views.clear();}
 reconcile(){
  for(const [seat,view] of this.views)if(!this.resident(seat)||this.reduced||view.character!==this.cast[seat]){view.canvas.remove();if(view.image)view.image.style.visibility='';this.views.delete(seat);}
  if(!this.ready||this.reduced||!this.cast)return;
  for(let seat=1;seat<4;seat++){
   if(!this.resident(seat))continue;
   const stage=document.querySelector('#'+seats[seat]+' .character-stage'),image=stage?.querySelector('img');if(!stage||!image)continue;
   const character=this.cast[seat],assets=this.assets.get(character),{width,height}=assets.motion;
   let view=this.views.get(seat);if(!view){const canvas=document.createElement('canvas');canvas.className='character-animation';canvas.width=width;canvas.height=height;canvas.setAttribute('aria-hidden','true');view={canvas,ctx:canvas.getContext('2d'),image,character,assets};if(!view.ctx)continue;this.views.set(seat,view);}
   if(view.canvas.parentElement!==stage){stage.append(view.canvas);view.image=image;}
   this.paint(view,this.tracks[seat].sample(performance.now()));image.style.visibility='hidden';
  }
 }
 paint(view,pose){
  paintCharacterPose(view.ctx,view.assets.images,pose,view.assets.motion);
  view.canvas.dataset.character=view.character;view.canvas.dataset.motion=pose.clip;view.canvas.dataset.idleVariant=pose.idleVariant||'';
 }
 schedule(){if(this.frame||this.blocked||this.reduced||!this.ready||!this.views.size)return;this.frame=requestAnimationFrame(now=>{
  this.frame=null;for(const [seat,view] of this.views)try{const pose=this.tracks[seat].sample(now);this.paint(view,pose);this.manage(seat,view,pose,now);}catch{this.assets.delete(view.character);view.canvas.remove();view.image.style.visibility='';this.views.delete(seat);}
  this.ready=this.assets.size>0;this.audit(now);this.schedule();
 });}
 cancelFrame(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;}
 // Debug state for QA. From the frame loop it is written at most four times a second, and only when it changed.
 audit(frameTime){if(frameTime!==undefined){if(frameTime-this.auditAt<250)return;this.auditAt=frameTime;}const table=document.getElementById('table');if(table){const voices=[...this.voices.values()];const text=JSON.stringify({ready:this.ready,blocked:this.blocked,reduced:this.reduced,residents:[...this.views.keys()],active:this.tracks.map(t=>t.clip),idle:[...this.views].map(([seat,v])=>({seat,character:v.character,variant:v.canvas.dataset.idleVariant})),last:this.last,lastStep:this.lastStep,voiceReady:[...this.voice.buffers.keys()],voicePlayed:voices.reduce((sum,v)=>sum+v.played,0),voiceStatus:this.voice.status,voiceBytes:voices.reduce((sum,v)=>sum+v.bytes.size,0),voiceErrors:voices.flatMap(v=>[...v.loadErrors||[],...v.decodeErrors||[]]),characters:[...this.voices].map(([id,v])=>({id,ready:this.assets.has(id),voiceReady:[...v.buffers.keys()],voicePlayed:v.played})),memory:[...this.assets].map(([id,a])=>({id,...(a.cache?.stats()||{})}))});if(text!==this.auditText){this.auditText=text;table.dataset.characterAudit=text;}}}
}
