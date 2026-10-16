import {CharacterTrack,characterEvents} from './character-model.mjs';
import {VoicePlayer} from './voice-player.mjs';
import {paintCharacterPose,loadCharacterMotion,CHARACTER_MEDIA} from './character-media.mjs';
const seats=['south','east','north','west'];
function releaseImages(assets){for(const image of Object.values(assets?.images||{}))try{image.src='';}catch{}}
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
  if(this.disabled||!CHARACTER_MEDIA[id]?.motion||this.pending.has(id)||this.assets.has(id)||this.failed.has(id))return;
  // The local player's body is not displayed: load only visible opponents' atlases.
  const pending=loadCharacterMotion(id).then(assets=>{this.pending.delete(id);if(this.disabled)return;if(!this.wanted.has(id)){releaseImages(assets);return;}this.assets.set(id,assets);this.ready=true;this.reconcile();this.schedule();this.audit();}).catch(()=>{this.pending.delete(id);this.failed.add(id);});
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
  if(!reduced)for(const id of cast.slice(1))this.ensureMotion(id);
  if(!this.sound.enabled)this.stopVoices();
  this.reconcile();this.release();if(blocked||reduced)this.cancelFrame();else this.schedule();this.audit();
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
   this.stopVoices();voice.play(event.kind);
   if(!this.reduced&&this.resident(event.seat))this.tracks[event.seat].play(event.kind,performance.now());
   this.last={...event,revision:game.revision};
  }
  this.schedule();this.audit();
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
  this.frame=null;for(const [seat,view] of this.views)try{this.paint(view,this.tracks[seat].sample(now));}catch{this.assets.delete(view.character);view.canvas.remove();view.image.style.visibility='';this.views.delete(seat);}
  this.ready=this.assets.size>0;this.audit(now);this.schedule();
 });}
 cancelFrame(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;}
 // Debug state for QA. From the frame loop it is written at most four times a second, and only when it changed.
 audit(frameTime){if(frameTime!==undefined){if(frameTime-this.auditAt<250)return;this.auditAt=frameTime;}const table=document.getElementById('table');if(table){const voices=[...this.voices.values()];const text=JSON.stringify({ready:this.ready,blocked:this.blocked,reduced:this.reduced,residents:[...this.views.keys()],active:this.tracks.map(t=>t.clip),idle:[...this.views].map(([seat,v])=>({seat,character:v.character,variant:v.canvas.dataset.idleVariant})),last:this.last,lastStep:this.lastStep,voiceReady:[...this.voice.buffers.keys()],voicePlayed:voices.reduce((sum,v)=>sum+v.played,0),voiceStatus:this.voice.status,voiceBytes:voices.reduce((sum,v)=>sum+v.bytes.size,0),voiceErrors:voices.flatMap(v=>[...v.loadErrors||[],...v.decodeErrors||[]]),characters:[...this.voices].map(([id,v])=>({id,ready:this.assets.has(id),voiceReady:[...v.buffers.keys()],voicePlayed:v.played}))});if(text!==this.auditText){this.auditText=text;table.dataset.characterAudit=text;}}}
}
