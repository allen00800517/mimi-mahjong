import {CharacterTrack} from './character-model.mjs';
import {ICHIKA_PROFILE} from './character-profiles.mjs';
import {IdleDirector,idlePose} from './idle-director.mjs';
export class MotionPreview{
 constructor(profile=ICHIKA_PROFILE){this.speed=1;this.setProfile(profile);}
 setProfile(profile=ICHIKA_PROFILE){this.profile=profile;this.select('idle',this.mode||'live');}
 select(kind,mode='live'){
  if(kind!=='idle'&&!this.profile.actions[kind])throw Error('Unknown action');
  if(!['live','source'].includes(mode))throw Error('Unknown playback mode');
  this.kind=kind;this.mode=mode;this.elapsed=0;this.playing=false;this.last=null;this.idleVariant='auto';this.idle=new IdleDirector(0,{variants:this.profile.idleVariants});
  this.clip=kind==='idle'?'idle':this.profile.actions[kind].clip;
  this.base=kind==='idle'&&mode==='live'?60000:mode==='source'?this.profile.clips[this.clip].frames/(this.profile.clips[this.clip].fps||24)*1000:this.profile.actions[kind].duration;
  this.duration=this.base;
 }
 selectIdle(kind,mode='live'){const variant=this.profile.idleVariants[kind];if(!variant)throw Error('Unknown idle variant');this.select('idle',mode);this.idleVariant=kind;this.clip=variant.clip;
  // Source speed plays only the variant's own frame range (e.g. a blink is frames 0–10 of the call clip, not the whole clip).
  const frames=(variant.last-variant.first+1)*(variant.pingpong?2:1);this.base=this.duration=mode==='source'?frames/(this.profile.clips[this.clip].fps||24)*1000:variant.duration;}
 get naturalIdle(){return this.kind==='idle'&&this.mode==='live'&&this.idleVariant==='auto';}
 get looping(){return this.naturalIdle||this.kind==='idle'&&this.mode==='source'&&this.idleVariant==='auto';}
 get position(){return this.naturalIdle?this.elapsed%this.duration:this.elapsed;}
 get sourceTime(){return this.duration===this.base?this.elapsed:this.elapsed/this.duration*this.base;}
 get finished(){return !this.looping&&this.elapsed>=this.duration;}
 tick(now){
  if(this.playing&&this.last!==null){this.elapsed+=Math.max(0,now-this.last)*this.speed;if(this.kind==='idle'&&this.mode==='source'&&this.idleVariant==='auto')this.elapsed%=this.duration;else if(!this.looping&&this.elapsed>=this.duration){this.elapsed=this.duration;this.playing=false;}}
  this.last=now;
 }
 play(now,restart=false){if(restart||this.finished){this.elapsed=0;if(this.naturalIdle)this.idle=new IdleDirector(0,{variants:this.profile.idleVariants});}this.last=now;this.playing=true;}
 pause(now){this.tick(now);this.playing=false;}
 seek(ms){this.elapsed=Math.max(0,Math.min(this.duration,ms));this.playing=false;this.last=null;}
 step(direction){const variant=this.kind==='idle'&&this.idleVariant!=='auto'?this.profile.idleVariants[this.idleVariant]:null;const count=variant?(variant.last-variant.first)*(variant.pingpong?2:1)+1:this.profile.clips[this.clip].frames-(this.mode==='live'&&this.kind!=='idle'?this.profile.actions[this.kind].first:0);this.seek(this.position+direction*(this.naturalIdle?1000/24:this.duration/count));}
 pose(){
  if(this.finished)return {clip:'idle',frame:0};
  if(this.mode==='source'&&this.kind==='idle'&&this.idleVariant!=='auto'){const v=this.profile.idleVariants[this.idleVariant],span=v.last-v.first,p=Math.min(1,this.elapsed/this.duration),q=v.pingpong?1-Math.abs(p*2-1):p;return {clip:v.clip,frame:v.first+Math.min(span,Math.floor(q*(span+1)))};}
  if(this.mode==='source')return {clip:this.clip,frame:Math.min(this.profile.clips[this.clip].frames-1,Math.floor(this.elapsed/this.duration*this.profile.clips[this.clip].frames))};
  if(this.naturalIdle)return this.idle.sample(this.elapsed);
  if(this.kind==='idle')return idlePose(this.idleVariant,this.sourceTime,this.profile.idleVariants);
  const t=new CharacterTrack(0,this.profile);t.play(this.kind,0);return t.sample(this.sourceTime);
 }
}
