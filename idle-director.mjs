// Approved silent idle artwork. New Flow gestures retain their natural pace.
export const IDLE_VARIANTS=Object.freeze({blink:{label:'眨眼',duration:260,clip:'call',first:0,last:10,pingpong:true,lead:50,tail:60},tilt:{label:'歪頭微笑',duration:1800,clip:'idle',first:18,last:72,lead:150,tail:200},look:{label:'低頭看牌',duration:2500,clip:'look',first:0,last:29,lead:150,tail:200},apron:{label:'整理圍裙',duration:3000,clip:'apron',first:0,last:35,lead:150,tail:200},hair:{label:'撥頭髮',duration:3417,clip:'hair',first:0,last:40,lead:150,tail:200},cake:{label:'拿出蛋糕',duration:5500,clip:'cake',first:0,last:65,lead:150,tail:200}});
const PERIOD=120000;
// v1.72 · optional per-gesture weight (default 1) and cooldown (ms since its last start) so a signature gag can be rarer; with all weights 1 this is the old uniform pick.
const pick=(choices,variants,u)=>{const w=choices.map(k=>variants[k].weight??1),total=w.reduce((a,b)=>a+b,0);let x=u*total;for(let i=0;i<choices.length;i++){if(x<w[i])return choices[i];x-=w[i];}return choices.at(-1);};
const between=(random,a,b)=>a+(b-a)*Math.max(0,Math.min(.999999,random()));
export function idlePose(kind,ms,variants=IDLE_VARIANTS){
 const spec=variants[kind];if(!spec||ms<0||ms>=spec.duration)return {clip:'idle',frame:0,idleVariant:'quiet'};
 const p=ms/spec.duration,triangle=1-Math.abs(p*2-1);
 const frame=spec.first+Math.round((spec.pingpong?triangle:p)*(spec.last-spec.first));
 const pose={clip:spec.clip,frame,idleVariant:kind};
 const {lead,tail}=spec;
 if(ms<lead)return {...pose,previous:{clip:'idle',frame:0},previousMix:1-ms/lead};
 if(ms>spec.duration-tail)return {...pose,next:{clip:'idle',frame:0},nextMix:(ms-(spec.duration-tail))/tail};
 return pose;
}
export class IdleDirector{
 constructor(now=0,{random=Math.random,variants=IDLE_VARIANTS}={}){this.random=random;this.variants=variants;this.start=now;this.lastAccent=null;this.lastAt={};this.breathPeriod=between(random,4600,6400);this.breathPhase=between(random,0,Math.PI*2);this.plans=new Map();}
 plan(period){
  if(this.plans.has(period))return this.plans.get(period);
  const r=this.random,events=[];
  const available=Object.keys(this.variants).filter(x=>x!=='blink'),maxDuration=Math.max(0,...available.map(x=>this.variants[x].duration));
  // v0.95: gaps shortened (user): first gesture after 8–14 s, then 12–20 s of rest between gestures.
  // Only the first block uses the opening; later blocks continue the rest from the previous block's last gesture.
  const previous=this.plans.get(period-1)?.filter(e=>e.kind!=='blink').at(-1);
  let accentAt=period>0&&previous?Math.max(0,previous.end+between(r,12000,20000)-PERIOD):between(r,8000,14000);
  while(available.length&&accentAt+maxDuration<PERIOD){
   const at=period*PERIOD+accentAt,open=available.filter(x=>!(this.variants[x].cooldown&&at-(this.lastAt[x]??-Infinity)<this.variants[x].cooldown)),pool=open.length?open:available;
   const choices=pool.length>1?pool.filter(x=>x!==this.lastAccent):pool,kind=pick(choices,this.variants,between(r,0,1));this.lastAt[kind]=at;
   this.lastAccent=kind;events.push({kind,start:accentAt,end:accentAt+this.variants[kind].duration});accentAt+=this.variants[kind].duration+between(r,12000,20000);
  }
  if(this.variants.blink){const duration=this.variants.blink.duration;for(let t=between(r,3000,6000);t+duration<PERIOD;t+=between(r,3500,7000))if(!events.some(e=>t<e.end+700&&t+duration>e.start-700))events.push({kind:'blink',start:t,end:t+duration});}
  events.sort((a,b)=>a.start-b.start);this.plans.set(period,events);if(this.plans.size>3)this.plans.delete(this.plans.keys().next().value);return events;
 }
 sample(now){
  const ms=Math.max(0,now-this.start),period=Math.floor(ms/PERIOD),local=ms%PERIOD,events=this.plan(period);
  const event=events.find(e=>local>=e.start&&local<e.end),pose=event?idlePose(event.kind,local-event.start,this.variants):{clip:'idle',frame:0,idleVariant:'quiet'};
  // Sub-pixel breathing anchored at the feet; large gestures remain rare.
  const fade=Math.min(1,ms/2000),breath=1+.0018*(Math.sin(ms/this.breathPeriod*Math.PI*2+this.breathPhase)-Math.sin(this.breathPhase))*fade;
  const upcoming=events.find(e=>e.start>local);
  return {...pose,breath,idleMs:event?local-event.start:null,idleStart:event?this.start+period*PERIOD+event.start:null,nextIdle:Math.round((upcoming?.start??PERIOD)-local),nextKind:upcoming?.kind??null};
 }
}
