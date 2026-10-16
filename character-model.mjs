import {IdleDirector} from './idle-director.mjs';
import {ICHIKA_PROFILE} from './character-profiles.mjs';
export {CHARACTER_CLIPS,CHARACTER_ACTIONS} from './character-profiles.mjs';
export function characterEvents(before,game){
 if(['ended','review','dealing'].includes(game.phase))return [];
 const events=[];
 game.players.forEach((p,seat)=>{
  const added=p.melds.length>before.counts[seat];
  const changed=p.melds.findIndex((m,i)=>i<before.counts[seat]&&m.kind!==before.kinds[seat][i]);
  if(added||changed>=0){const m=p.melds[added?p.melds.length-1:changed];events.push({seat,kind:m.kind==='sequence'?'chi':m.kind==='triplet'?'pon':'kan'});}
  if(before.states[seat]==='S0'&&p.state!=='S0')events.push({seat,kind:'ready'});
 });return events;
}
// This clock never returns a promise or blocks a game action. The newest event replaces the old one.
export class CharacterTrack{
 constructor(now=0,profile=ICHIKA_PROFILE){this.profile=profile;this.reset(now);}
 reset(now=0){this.clip='idle';this.start=now;this.from=null;this.action=null;this.idle=new IdleDirector(now,{variants:this.profile.idleVariants});}
 play(kind,now){const from=this.sample(now);this.action=this.profile.actions[kind]??this.profile.actions.pon;this.clip=this.action.clip;this.start=now;this.from={clip:from.clip,frame:from.frame};}
 sample(now){
  let ms=Math.max(0,now-this.start);
  if(this.action&&ms>=this.action.duration){this.reset(now);ms=0;}
  if(!this.action)return this.idle.sample(now);
  const frames=this.profile.clips[this.clip].frames;
  const frame=this.action?Math.min(frames-1,this.action.first+Math.floor(ms/this.action.duration*(frames-this.action.first))):Math.floor(ms/1000*24)%frames;
  const pose={clip:this.clip,frame};
  if(this.from&&ms<70)return {...pose,previous:this.from,previousMix:1-ms/70};
  if(this.action&&ms>this.action.duration-120)return {...pose,next:{clip:'idle',frame:0},nextMix:(ms-(this.action.duration-120))/120};
  return pose;
 }
}
