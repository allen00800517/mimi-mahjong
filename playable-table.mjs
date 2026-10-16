import {tableLayout,VIEW} from './table-layout.mjs';
import {setFaceImages} from './tiles.mjs';
import {MotionTimeline,flightPose,FLIGHT,MOTION} from './motion-timeline.mjs';
import {TileRenderer,faceObject} from './tile-renderer.mjs';
import {ResourceGeneration} from './resource-generation.mjs';
const seatIds=['south','east','north','west'];
function proxyFor(o){const seat=document.getElementById(seatIds[o.seat]);if(o.kind==='river')return document.getElementById('river-'+o.seat).children[o.index];if(o.kind==='hand')return seat.querySelectorAll('.back')[o.index];if(o.kind==='meld')return seat.querySelector('[data-meld-index="'+o.group+'"]')?.children[o.index];if(o.kind==='flower')return (o.seat===0?document.getElementById('self-flowers'):seat).querySelectorAll('.flower-tile')[o.index];return null;}
export class PlayableTable{
 constructor(canvas,motionCanvas){
  this.canvas=canvas;this.motionCanvas=motionCanvas;motionCanvas.hidden=false;this.ready=false;this.objects=[];this.flights=new Map();
  this.resources=new ResourceGeneration();this.lostSurfaces=new Set();
  this.timeline=new MotionTimeline(()=>this.draw(),{onError:error=>this.onMotionError?.(error)});
  new ResizeObserver(()=>{this.staticDirty=true;this.draw();}).observe(canvas);
  for(const surface of [canvas,motionCanvas]){
   surface.addEventListener("webglcontextlost",e=>{e.preventDefault();this.lostSurfaces.add(surface);this.resources.invalidate();this.ready=false;document.getElementById("table").classList.remove("table-3d-ready");document.getElementById("table-loading").hidden=false;document.getElementById("table-loading-text").textContent="正在恢復牌桌…";this.onUnavailable?.();});
   surface.addEventListener("webglcontextrestored",()=>{this.lostSurfaces.delete(surface);if(!this.lostSurfaces.size)this.loading=this.start();});
  }
  this.loading=this.start();
 }
 async start(){
  const generation=this.resources.begin();this.ready=false;this.onUnavailable?.();
  const loading=document.getElementById('table-loading'),retry=document.getElementById('table-retry');loading.hidden=false;retry.hidden=true;
  let stage='assets';
  try{
   if(this.lostSurfaces.size)return;
   const renderer=new TileRenderer(this.canvas);this.resources.own(generation,renderer);
   const motionRenderer=new TileRenderer(this.motionCanvas);this.resources.own(generation,motionRenderer);
   await Promise.all([renderer.load(),motionRenderer.load()]);if(!this.resources.current(generation))return;
   const images=await renderer.faceImages();if(!this.resources.current(generation))return;
   if(renderer.gl.isContextLost()||motionRenderer.gl.isContextLost())throw Error('WebGL context lost');
   motionRenderer.draw([faceObject({x:0,y:0,width:42,height:57.75},{face:'1m'})],{background:false});motionRenderer.gl.finish();
   stage='presentation';
   this.renderer=renderer;this.motionRenderer=motionRenderer;setFaceImages(images);this.staticDirty=true;this.layoutDirty=true;this.ready=true;this.draw();loading.hidden=true;this.onReady?.();
  }catch(e){if(!this.resources.current(generation))return;this.ready=false;this.resources.invalidate();document.getElementById('table-loading-text').textContent=stage==='assets'?'牌桌素材未能載入，請重試。':'牌局畫面處理發生錯誤，請重新載入。';loading.hidden=false;retry.hidden=false;console.error(e);}
 }
 update(game,skin,lastEffect){this.layoutDirty=true;this.staticDirty=true;this.game=game;this.skin=skin;this.lastEffect=lastEffect;this.objects=tableLayout(game,skin,lastEffect);this.proxies=new Map(this.objects.map(o=>[o.key,proxyFor(o)]));this.draw();}
 toScreen(p){const r=this.canvas.getBoundingClientRect();return [r.left+p[0]*r.width/VIEW.width,r.top+p[1]*r.height/VIEW.height];}
 screenRect(b){const a=this.toScreen([b.x,b.y]),z=this.toScreen([b.x+b.width,b.y+b.height]);return{x:a[0],y:a[1],width:z[0]-a[0],height:z[1]-a[1]};}
 landingPlane(el){const o=this.objects.find(o=>proxyFor(o)===el);return o?o.plane.map(p=>this.toScreen(p)):null;}
 captureLayout(){return this.objects.map(o=>({...o}));}
 logicalRect(r){const b=this.canvas.getBoundingClientRect();return {x:(r.x-b.left)*854/b.width,y:(r.y-b.top)*394/b.height,width:r.width*854/b.width,height:r.height*394/b.height};}
 objectFor(el){return this.objects.find(o=>this.proxies?.get(o.key)===el);}
 fly(face,start,end,{back=false,draw=false,meld=false,flower=false,delay=0,onContact}={}){this.staticDirty=true;const dest=this.objectFor(end)||faceObject(this.logicalRect(end.getBoundingClientRect())),source=start.origin?start:faceObject(this.logicalRect(start)),key=Symbol();const from={...source,face,back:source.back??back},to={...dest,face,back},kind=flower?'flower':draw?'draw':meld?'meld':'play',duration=MOTION[kind==='play'?'discard':kind],staged=draw||flower;this.flights.set(key,{...from,flying:true,visible:!staged||delay===0});return this.timeline.add({kind,duration,delay,contact:FLIGHT[kind].contact,onContact,update:(p,visible)=>{const pose=flightPose(from,to,p,kind);let shownBack=back;if(from.back&&!back){const flip=Math.max(0,Math.min(1,(Math.min(1,p/FLIGHT[kind].contact)-.16)/.58)),width=Math.max(.08,Math.abs(Math.cos(Math.PI*flip))),old=pose.u;pose.origin=pose.origin.map((n,i)=>n+old[i]*(1-width)/2);pose.u=old.map(n=>n*width);shownBack=flip<.5;}this.flights.set(key,{...pose,face:shownBack?null:face,back:shownBack,flying:true,visible:visible||!staged});},complete:()=>{this.flights.get(key).settled=true;}});}
 hold(duration){return this.timeline.add({kind:"read",duration,update:()=>{}});}
 cancelMotion({redraw=true}={}){this.staticDirty=true;this.shift=null;this.flights.clear();this.timeline.cancel({redraw});}
 animateLayout(previous,{handDelay=0}={}){
  const from=new Map((previous||[]).filter(o=>['meld','hand','river'].includes(o.kind)).map(o=>[o.key,o]));
  const moved=this.objects.filter(o=>{const old=from.get(o.key);return old&&Math.hypot(o.origin[0]-old.origin[0],o.origin[1]-old.origin[1])>1;});
  if(!moved.length)return Promise.resolve();
  const shift={from,progress:0,handProgress:0};this.shift=shift;
  const tracks=[false,true].filter(hand=>moved.some(o=>(o.kind==='hand')===hand)).map(hand=>this.timeline.add({kind:hand?'hand-settle':'settle',duration:MOTION.settle,delay:hand?handDelay:0,update:p=>{shift[hand?'handProgress':'progress']=p;}}));
  return Promise.all(tracks).then(()=>{if(this.shift===shift){this.staticDirty=true;this.shift=null;this.draw();}});
 }
 wallTiles(){return this.objects.filter(o=>o.kind==='wall').map(o=>({key:[o.seat,o.stack,o.layer].join(':'),rect:this.screenRect(o.rect),object:o}));}
 draw(){if(!this.ready||!this.game)return;const table=document.getElementById('table');const progress=this.shift?this.shift.progress:1,eased=1-Math.pow(1-progress,3);const shown=this.objects.map(o=>{const old=this.shift?.from.get(o.key);if(!old)return o;const progress=o.kind==='hand'?this.shift.handProgress:this.shift.progress,eased=1-Math.pow(1-progress,3),result={...o};for(const key of ['origin','u','v','d'])result[key]=o[key].map((v,i)=>old[key][i]+(v-old[key][i])*eased);result.depth=old.depth+(o.depth-old.depth)*eased;return result;});const error=this.staticDirty||this.shift?this.renderer.draw(shown.filter(o=>!this.proxies?.get(o.key)?.classList.contains('motion-arrival'))):0;this.staticDirty=false;this.motionRenderer.draw([...this.flights.values()].filter(o=>o.visible!==false),{background:false});table.classList.add('table-3d-ready');
 if(this.layoutDirty){table.classList.toggle('dense-rivers',this.game.players.some((p,s)=>s%2===0&&p.river.filter(r=>!r.claimed).length>12));document.querySelectorAll('.river-zone .tile,.opponent-tiles .back,.opponent-tiles .tile').forEach(el=>{el.style.display='none';});
 for(const o of this.objects){const el=this.proxies?.get(o.key);if(!el)continue;const b=o.rect;Object.assign(el.style,{display:'block',left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px'});el.style.setProperty('--projected-w',b.width+'px');el.style.setProperty('--projected-h',b.height+'px');el.dataset.renderKey=o.key;el.classList.toggle('latest-discard',!!o.last);}
 const pages=[1,1,1,1],riverButton=document.getElementById('river-toggle');riverButton.textContent='放大查看棄牌';riverButton.title='放大查看四家完整棄牌順序';
 table.dataset.renderAudit=JSON.stringify({ready:true,revision:this.game.revision,phase:this.game.phase,turn:this.game.turn,wall:this.game.wall.length,shownWall:this.objects.filter(o=>o.kind==='wall').length,opponentHands:[1,2,3].map(s=>({seat:s,count:this.game.players[s].hand.length,shown:this.objects.filter(o=>o.kind==='hand'&&o.seat===s).length})),riverPages:pages,meldCounts:this.game.players.map(p=>p.melds.length),flowers:this.game.players.map(p=>p.flowers.length),textures:this.renderer.textures.size,rendererStats:this.renderer.stats,motions:this.timeline.history,activeMotions:this.timeline.tracks.size,glErrors:[error],objects:this.objects});this.layoutDirty=false;}
 table.dataset.motionAudit=JSON.stringify({active:this.timeline.tracks.size,motions:this.timeline.history,renderer:this.renderer.stats,motionRenderer:this.motionRenderer.stats,locked:[...document.querySelectorAll('.hand button,#actions button')].every(b=>b.disabled)});
 }
}
