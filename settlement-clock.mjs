// Counts active viewing time; a paused or hidden table never advances in the background.
export class SettlementClock {
 constructor({duration=8000,now=()=>performance.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),onUpdate=()=>{},onFinish=()=>{}}={}){
  Object.assign(this,{duration,now,schedule,cancel,onUpdate,onFinish});this.key=null;this.remaining=duration;this.timer=null;this.running=false;this.done=false;
 }
 sync(key,{eligible=false,blocked=false,hold=false}={}){
  this.stop();if(key!==this.key){this.key=key;this.remaining=this.duration;this.done=false;}
  this.eligible=eligible;this.blocked=blocked;this.hold=hold;
  if(key&&eligible&&!blocked&&!hold&&!this.done){this.running=true;this.started=this.now();this.timer=this.schedule(()=>this.tick(),Math.min(250,this.remaining));}
  this.onUpdate(this.state()); 
 }
 stop(){if(this.running)this.remaining=Math.max(0,this.remaining-(this.now()-this.started));this.running=false;if(this.timer!==null)this.cancel(this.timer);this.timer=null;}
 tick(){
  this.timer=null;if(!this.running)return;this.stop();
  if(this.remaining<=0){this.done=true;this.onUpdate(this.state());this.onFinish(this.key);return;}
  this.running=true;this.started=this.now();this.onUpdate(this.state());this.timer=this.schedule(()=>this.tick(),Math.min(250,this.remaining));
 }
 state(){return {key:this.key,remaining:this.remaining,seconds:Math.ceil(this.remaining/1000),running:this.running,done:this.done,eligible:this.eligible,blocked:this.blocked,hold:this.hold};}
 clear(){this.stop();this.key=null;this.done=true;}
}
