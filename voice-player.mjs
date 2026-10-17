// Character lines play 20% quieter than the original .8 (user request, v0.90).
export const VOICE_GAIN=.64;
export class VoicePlayer{
 constructor({context,enabled,fetcher=(...args)=>fetch(...args)}={}){this.context=context;this.enabled=enabled;this.fetcher=fetcher;this.buffers=new Map();this.bytes=new Map();this.active=null;this.played=0;this.status='loading';}
 async preload(base,kinds=['chi','pon','kan','ready']){
  const rows=await Promise.allSettled(kinds.map(async kind=>{const r=await this.fetcher(base+'/'+kind+'.mp3');if(!r.ok)throw Error('Voice unavailable');this.bytes.set(kind,await r.arrayBuffer());}));
  this.status=rows.every(r=>r.status==='fulfilled')?'loaded':'partial';this.loadErrors=rows.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||r.reason));return this.prepare();
 }
 async prepare(){
  const context=this.context();if(!context)return;
  if(this.decodeContext!==context){this.decodeContext=context;this.buffers.clear();this.decoding=new Map();}
  for(const [kind,bytes] of this.bytes)if(!this.buffers.has(kind)&&!this.decoding.has(kind)){
   const pending=Promise.resolve().then(()=>context.decodeAudioData(bytes.slice(0))).then(buffer=>{
    const samples=buffer.getChannelData(0);let peak=0;for(const value of samples)peak=Math.max(peak,Math.abs(value));
    if(peak<.001||buffer.duration<=0)throw Error('Silent voice');
    if(this.decodeContext===context)this.buffers.set(kind,buffer);
   }).finally(()=>{if(this.decodeContext===context)this.decoding.delete(kind);});this.decoding.set(kind,pending);
  }
  const results=await Promise.allSettled([...this.decoding.values()]);this.decodeErrors=results.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||r.reason));
 }
 play(kind){
  const context=this.context(),buffer=this.buffers.get(kind);
  if(!this.enabled()||!context||context.state!=='running'||!buffer)return false;
  try{
  this.stop();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=VOICE_GAIN;source.connect(gain);gain.connect(context.destination);
  const active={source,gain};this.active=active;
  source.onended=()=>{source.disconnect();gain.disconnect();if(this.active===active)this.active=null;};
  source.start();this.played++;return true;
  }catch{this.stop();return false;}
 }
 stop(){const active=this.active;if(!active)return;this.active=null;try{const context=this.context(),now=context.currentTime;if(context.state!=='running'){active.source.stop();return;}active.gain.gain.setValueAtTime(active.gain.gain.value,now);active.gain.gain.linearRampToValueAtTime(0,now+.03);active.source.stop(now+.035);}catch{}}
}
