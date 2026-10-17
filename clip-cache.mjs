// v0.96 · Character atlas memory. A decoded atlas costs width×height×4 bytes (a 4-second clip ≈ 15–40 MB), while
// the compressed WebP is ~1 MB. All clips stay downloaded as compressed Blobs; only what is on screen, what is about
// to play, and a small resident set (idle, blink, tap) are decoded. Everything else is closed after it has been
// unused for a few seconds. Browsers without createImageBitmap keep the old behaviour (decode everything once).
import {decodeImage} from './asset-loader.mjs';
export const CLIP_LINGER_MS=4000;   // keep a finished clip decoded this long in case it plays again
export const PREFETCH_MS=3000;      // decode the next idle gesture this long before it starts
export const REACTION_WAIT_MS=350;  // a call/tap may wait this long for its clip so voice and motion stay together

// Clips that must never wait: the standing pose, the blink (drawn every few seconds) and the tap reaction
// (the player's finger expects an instant answer).
export function residentClips(profile){
 const set=new Set(['idle']);const blink=profile?.idleVariants?.blink;if(blink)set.add(blink.clip);
 if(profile?.actions?.tap)set.add(profile.actions.tap.clip);return set;
}
const canBitmap=()=>typeof createImageBitmap==='function'&&typeof Blob==='function';
function closeImage(img){try{if(typeof img?.close==='function')img.close();else if(img)img.src='';}catch{}}
export const imageBytes=img=>(img?.width||img?.naturalWidth||0)*(img?.height||img?.naturalHeight||0)*4;

export class ClipCache{
 constructor({base,clips,resident=['idle'],fetcher=(...a)=>fetch(...a),now=()=>performance.now(),lazy=canBitmap(),decodeBlob=b=>createImageBitmap(b),decodeUrl=async url=>{const img=new Image();img.src=url;await decodeImage(img);return img;}}){
  Object.assign(this,{base,clips:[...clips],resident:new Set(resident),fetcher,now,lazy,decodeBlob,decodeUrl});
  this.images={};this.blobs=new Map();this.decoding=new Map();this.lastUse=new Map();this.closed=false;this.misses=0;this.decodes=0;
 }
 url(clip){return this.base+'/'+clip+'.webp';}
 // Resolves once the resident clips are decoded (and, in lazy mode, every clip is downloaded compressed).
 async load(){
  if(!this.lazy){await Promise.all(this.clips.map(c=>this.ensure(c)));return this;}
  await Promise.all(this.clips.map(c=>this.blob(c).catch(()=>null)));
  await Promise.all([...this.resident].filter(c=>this.clips.includes(c)).map(c=>this.ensure(c)));
  return this;
 }
 blob(clip){
  if(!this.blobs.has(clip))this.blobs.set(clip,Promise.resolve(this.fetcher(this.url(clip))).then(r=>{if(!r.ok)throw Error('missing '+clip);return r.blob?r.blob():r.arrayBuffer().then(b=>new Blob([b],{type:'image/webp'}));}));
  return this.blobs.get(clip);
 }
 has(clip){return !!this.images[clip];}
 ensure(clip){
  if(this.images[clip])return Promise.resolve(this.images[clip]);
  if(this.closed||!this.clips.includes(clip))return Promise.reject(Error('unknown clip '+clip));
  if(!this.decoding.has(clip)){
   const p=(this.lazy?this.blob(clip).then(b=>this.decodeBlob(b)):this.decodeUrl(this.url(clip))).then(img=>{
    this.decoding.delete(clip);if(this.closed){closeImage(img);return null;}
    this.images[clip]=img;this.decodes++;this.lastUse.set(clip,this.now());return img;
   },e=>{this.decoding.delete(clip);throw e;});
   this.decoding.set(clip,p);
  }
  return this.decoding.get(clip);
 }
 touch(clip,t=this.now()){if(this.images[clip])this.lastUse.set(clip,t);}
 // Close decoded clips that are not resident, not wanted right now and unused for CLIP_LINGER_MS.
 sweep(keep=new Set(),t=this.now()){
  if(!this.lazy)return [];const dropped=[];
  for(const clip of Object.keys(this.images)){
   if(this.resident.has(clip)||keep.has(clip))continue;
   if(t-(this.lastUse.get(clip)??0)<CLIP_LINGER_MS)continue;
   closeImage(this.images[clip]);delete this.images[clip];this.lastUse.delete(clip);dropped.push(clip);
  }
  return dropped;
 }
 close(){this.closed=true;for(const img of Object.values(this.images))closeImage(img);this.images={};this.lastUse.clear();}
 get decodedBytes(){return Object.values(this.images).reduce((n,img)=>n+imageBytes(img),0);}
 stats(){return {lazy:this.lazy,decoded:Object.keys(this.images),mb:Math.round(this.decodedBytes/1e5)/10,decodes:this.decodes,misses:this.misses};}
}
// Wait for a clip, but never longer than ms; resolves true if it is ready.
export function ready(cache,clip,ms=REACTION_WAIT_MS){
 if(!cache||cache.has(clip))return Promise.resolve(true);
 cache.misses++;
 return Promise.race([cache.ensure(clip).then(()=>true,()=>false),new Promise(r=>setTimeout(()=>r(false),ms))]);
}
