import {facePlane} from './table-layout.mjs';
export const MOTION=Object.freeze({discard:340,draw:340,meld:300,meldStagger:30,flower:260,settle:180,readPause:120,call:560,selfCall:1300});
export const FLIGHT=Object.freeze({play:{contact:.82,arc:10,rebound:.7},draw:{contact:.9,arc:13,rebound:.25},meld:{contact:.86,arc:8,rebound:.45},flower:{contact:.9,arc:5,rebound:.2}});
const lerp=(a,b,t)=>a+(b-a)*t;
export function canonicalPose(o){const p=facePlane(o);return {...o,origin:p[0],u:p[1].map((v,i)=>v-p[0][i]),v:p[3].map((v,i)=>v-p[0][i]),flipU:false,flipV:false};}
export function interpolatePose(from,to,t,arc=18){
 if(t<=0)return {...canonicalPose(from),lift:0};if(t>=1)return {...canonicalPose(to),lift:0};
 const a=canonicalPose(from),b=canonicalPose(to),decompose=o=>{const width=Math.hypot(...o.u),angle=Math.atan2(o.u[1],o.u[0]),c=Math.cos(angle),s=Math.sin(angle);return {width,angle,shear:o.v[0]*c+o.v[1]*s,height:-o.v[0]*s+o.v[1]*c};},x=decompose(a),y=decompose(b);
 let da=y.angle-x.angle;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
 const angle=x.angle+da*t,c=Math.cos(angle),s=Math.sin(angle),w=lerp(x.width,y.width,t),h=lerp(x.height,y.height,t),shear=lerp(x.shear,y.shear,t),lift=Math.sin(Math.PI*t)*arc;
 return {...b,origin:[lerp(a.origin[0],b.origin[0],t),lerp(a.origin[1],b.origin[1],t)-lift],u:[w*c,w*s],v:[shear*c-h*s,shear*s+h*c],d:a.d.map((v,i)=>lerp(v,b.d[i],t)),depth:lerp(a.depth,b.depth,t),lift};
}
// Travel and lift use separate curves: a gentle launch, then a definite contact.
// Only the flying copy moves; the final shared layout is never scaled or shifted.
export function flightPose(from,to,p,kind='play'){
 const profile=FLIGHT[kind],q=Math.min(1,Math.max(0,p)/profile.contact),travel=q*q*(3-2*q);
 const pose=interpolatePose(from,to,travel,0),r=Math.max(0,(p-profile.contact)/(1-profile.contact));
 const lift=p<=0||p>=1?0:q<1?4*q*(1-q)*profile.arc:Math.sin(Math.PI*r)*(1-r)*profile.rebound;
 return {...pose,origin:[pose.origin[0],pose.origin[1]-lift],lift};
}
export class MotionTimeline{
 constructor(draw,{clock=()=>performance.now(),raf=cb=>requestAnimationFrame(cb),caf=id=>cancelAnimationFrame(id),onError=error=>console.error(error)}={}){this.onError=onError;this.draw=draw;this.clock=clock;this.raf=raf;this.caf=caf;this.tracks=new Set();this.history=[];this.frame=null;}
 add({kind,duration,delay=0,update,complete,contact=1,onContact}){
  const record={kind,duration,delay,frames:0,status:'running',maxGapMs:0},start=this.clock();this.history.push(record);if(this.history.length>50)this.history.shift();
  const promise=new Promise(resolve=>this.tracks.add({start,duration,delay,update,complete,contact,onContact,resolve,record}));this.schedule();return promise;
 }
 schedule(){if(this.frame===null&&this.tracks.size)this.frame=this.raf(now=>this.tick(now));}
 tick(now){this.frame=null;try{for(const track of [...this.tracks]){track.record.maxGapMs=Math.max(track.record.maxGapMs,Math.round(now-(track.lastTick??track.start)));track.lastTick=now;track.record.elapsedMs=Math.round(now-track.start);const p=Math.max(0,Math.min(1,(now-track.start-track.delay)/track.duration)),visible=now>=track.start+track.delay;track.update(p,visible);track.record.frames++;if(visible&&p>=track.contact&&!track.contacted){track.contacted=true;track.record.contactAtMs=Math.round(now-track.start);track.onContact?.();}if(p===1){track.complete?.();track.record.status='finished';this.tracks.delete(track);track.resolve('finished');}}const began=this.clock();this.draw();const cost=Math.round((this.clock()-began)*100)/100;for(const record of this.history)if(record.status==="running")record.maxRenderMs=Math.max(record.maxRenderMs||0,cost);this.schedule();}catch(error){this.stop('failed');this.onError(error);}}
 stop(status='cancelled'){if(this.frame!==null)this.caf(this.frame);this.frame=null;for(const t of this.tracks){t.record.status=status;t.resolve(status);}this.tracks.clear();}
 cancel({redraw=true}={}){this.stop();if(redraw)this.draw();}
}

