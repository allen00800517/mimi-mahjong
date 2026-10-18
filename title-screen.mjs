// v1.02 · Title screen (agreed 2026-10-18). Same pattern as the other 蜜蜜餐廳 mini-games: one full-bleed portrait
// cover (麻雀珍 at dusk, 蜜蜜 seen from behind), the series logo in the empty sky and a start button on the street.
// The cover stays portrait on phones: the table is forced landscape, so here the page counter-rotates; a phone held
// sideways sees the title turned, the same way the table turns when the phone is upright. On a computer the cover
// sits in the middle with a blurred copy filling the sides.
import {viewSize,screenSize} from './viewport.mjs';
import {faceSVG} from './dice-show.mjs';
export const TITLE_ART=Object.freeze({bg:'./assets/title-v1/title-bg.webp',ratio:941/1672,
 logo:Object.freeze({zh:'./assets/title-v1/logo-zh.webp',ja:'./assets/title-v1/logo-ja.webp'})});
export const TITLE_ALT=Object.freeze({zh:'蜜蜜的牌桌大勝負！麻雀珍篇',ja:'ミーミーの雀卓大勝負！麻雀珍篇'});
// Logo language. For now every player sees the Japanese logo (user, 2026-10-19); the Chinese one is ready for the
// multilingual release, when Japanese browsers get 'ja' and everyone else 'zh'.
export const TITLE_LANG_FIXED='ja';
export function titleLang(langs=globalThis.navigator?.languages||[globalThis.navigator?.language],fixed=TITLE_LANG_FIXED){if(fixed)return fixed;return /^ja\b/i.test(String(langs?.[0]||''))?'ja':'zh';}
// Phones (touch, small screen) keep the title portrait; computers and tablets do not rotate.
export function titleRotates(coarse,screen){return !!coarse&&Math.min(screen.width,screen.height)<700;}
// box = the portrait area the title is laid out in; frame = the cover image fitted inside it.
// On screens taller than the art (most phones) the cover may lose up to TITLE_CROP of its width on each side
// (蜜蜜 and the neon sign stay inside); what is left above and below fades into a blurred copy.
export const TITLE_CROP=.04;
export function titleLayout(view,rotate,ratio=TITLE_ART.ratio){
 const turn=rotate&&view.width>view.height,bw=turn?view.height:view.width,bh=turn?view.width:view.height;
 const fw=Math.min(bw/(1-2*TITLE_CROP),bh*ratio),fh=fw/ratio;
 return {turn,bw,bh,fw,fh,tall:fh<bh-1,wide:fw<bw-1};
}
// v1.02 · Logo pop, same feel as the 八百屋篇 title (its numbers): 0.35 s after the title appears the logo springs in
// with an elastic overshoot over 0.9 s, tilted about -10° and straightening as it lands; then it floats gently.
// At the pop, mahjong tiles (mostly honours, same art as the table) and two dice fly out of it under gravity with
// a few sparkles. The buttons slide up 0.75 s into the pop.
// Logo size and centre in the cover frame (width share, height share); kept in step with .ts-logo in game-layout.css.
// 76% wide makes it about as tall as the 八百屋篇 logo, which is a wider shape (user: 92% was too big).
export const TITLE_LOGO=Object.freeze({w:.76,y:.195});
export const POP=Object.freeze({musicWait:1200,tapDelay:0,delay:350,dur:900,buttonsAt:750,buttonsDur:350,tilt:-10.3});
export function elastic(t){if(t<=0)return 0;if(t>=1)return 1;return Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1;}
export function logoPopFrames(n=36){const f=[];for(let i=0;i<=n;i++){const k=i/n,sc=elastic(k),rot=(1-Math.min(1,k*1.4))*POP.tilt;f.push({offset:k,transform:'rotate('+rot.toFixed(2)+'deg) scale('+sc.toFixed(4)+')'});}return f;}
export const BURST_TILES=Object.freeze(['7z','6z','5z','1z','2z','3z','4z','7z','6z','1m','5p','9s']);
// Particles in frame pixels; speeds and gravity follow 八百屋篇, scaled by the frame width (its canvas was ~390 wide).
export function burstParticles({fw,cx,cy,lw,lh},rand=Math.random){
 const u=fw/390,out=[];
 const items=[...BURST_TILES.map(t=>({kind:'tile',t})),{kind:'die',v:5},{kind:'die',v:4}];
 items.forEach((it,i)=>{const a=-Math.PI*.5+(rand()-.5)*Math.PI*1.7,sp=(260+rand()*300)*u,h=it.kind==='tile'?fw*(.1+rand()*.035):fw*(.075+rand()*.02);
  out.push({...it,x:cx+(rand()-.5)*lw*.5,y:cy+(rand()-.5)*lh*.3,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-120*u,g:620*u,h,w:it.kind==='tile'?h*112/154:h,rot:rand()*6,vr:(rand()-.5)*9,life:1.7+rand()*.5});});
 for(let i=0;i<10;i++){const a=rand()*Math.PI*2,sp=(160+rand()*200)*u;out.push({kind:'star',x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.7,g:200*u,h:(6+rand()*6)*u*1.8,w:(6+rand()*6)*u*1.8,rot:0,vr:0,life:.6});}
 return out;
}
// Position, rotation (rad), scale and opacity of a particle t seconds after the pop.
export function particleAt(p,t){const a=1-t/p.life;return {x:p.x+p.vx*t,y:p.y+p.vy*t+.5*p.g*t*t,rot:p.rot+p.vr*t,scale:p.kind==='star'?1:Math.min(1,t*8),opacity:p.kind==='star'?Math.max(0,a):Math.max(0,Math.min(1,a*3)),alive:t<p.life};}
const icon=on=>'<img src="./assets/icons/'+(on?'volume-2':'volume-x')+'.svg" alt="">';
export class TitleScreen{
 constructor(host,{version=''}={}){this.host=host;this.version=version;this.el=null;this.onResize=()=>requestAnimationFrame(()=>this.layout());}
 get open(){return !!this.el;}
 show({canContinue=false,soundOn=false,lang=titleLang(),tapFirst=false,onTap,onStart,onContinue,onNew,onSound,onPop}={}){
  this.close();
  const el=document.createElement('section');el.id='title-screen';el.setAttribute('aria-label','標題畫面');
  el.innerHTML='<div class="ts-box"><img class="ts-blur" alt="" draggable="false" src="'+TITLE_ART.bg+'"><div class="ts-frame">'+
   '<img class="ts-bg" alt="" draggable="false" src="'+TITLE_ART.bg+'">'+
   '<h1 class="ts-logo"><span class="ts-bob"><img alt="'+TITLE_ALT[lang]+'" draggable="false" src="'+TITLE_ART.logo[lang]+'"></span></h1><div class="ts-burst" aria-hidden="true"></div>'+
   '<div class="ts-actions'+(canContinue?' two':'')+'"><button type="button" class="ts-start">'+(canContinue?'繼續牌局':'開　始')+'</button>'+
   (canContinue?'<button type="button" class="ts-new">開新的一場</button>':'')+'</div>'+
   (tapFirst?'<div class="ts-tap" role="button" tabindex="0">點一下畫面開始</div>':'')+(this.version?'<span class="ts-version">'+this.version+'</span>':'')+'</div>'+
   '<button type="button" class="ts-sound" aria-pressed="'+soundOn+'" aria-label="'+(soundOn?'音效開啟，點擊靜音':'音效關閉，點擊開啟')+'">'+icon(soundOn)+'</button></div>';
  const done=cb=>()=>{this.close();cb?.();};
  el.querySelector('.ts-start').onclick=done(canContinue?onContinue:onStart);
  el.querySelector('.ts-new')?.addEventListener('click',done(onNew));
  const sb=el.querySelector('.ts-sound');
  sb.addEventListener('pointerdown',e=>e.stopPropagation());
  sb.onclick=async e=>{e.stopPropagation();const on=!!(await onSound?.());sb.innerHTML=icon(on);sb.setAttribute('aria-pressed',String(on));sb.setAttribute('aria-label',on?'音效開啟，點擊靜音':'音效關閉，點擊開啟');};
  this.host.append(el);this.el=el;this.layout();
  addEventListener('resize',this.onResize);addEventListener('orientationchange',this.onResize);
  // v1.02 · Before audio is allowed (a fresh launch) the title waits for one tap anywhere: that tap starts the theme
  // and the logo pops with it (user's idea; it also turns the iPhone audio rule into part of the show).
  if(tapFirst){el.classList.add('await-tap');const box=el.querySelector('.ts-box');
   const go=()=>{if(!el.classList.contains('await-tap'))return;el.classList.remove('await-tap');removeEventListener('keydown',key);
    const gate=Promise.race([Promise.resolve(onTap?.()).catch(()=>{}),new Promise(r=>setTimeout(r,POP.musicWait))]);this.pop(onPop,gate);};
   const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};
   box.addEventListener('click',go);addEventListener('keydown',key);this.offKey=()=>removeEventListener('keydown',key);
   el.querySelector('.ts-tap').focus({preventScroll:true});return;}
  el.querySelector('.ts-start').focus({preventScroll:true});
  this.pop(onPop);
 }
 pop(onPop,gate=null){
  const el=this.el,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,img=el.querySelector('.ts-logo img');
  if(reduced||!img.animate){img.style.transform='none';el.classList.add('popped');return;}
  // Wait until the cover and the logo are decoded (at most 2.5 s) so the pop is never spent on a blank screen;
  // the burst tiles are fetched meanwhile.
  for(const t of new Set(BURST_TILES)){const i=new Image();i.src='./assets/title-v1/burst-'+t+'.webp';}
  const ready=[el.querySelector('.ts-bg'),img].map(i=>i.decode?i.decode().catch(()=>{}):Promise.resolve());
  Promise.all([Promise.race([Promise.all(ready),new Promise(r=>setTimeout(r,2500))]),gate||Promise.resolve()]).then(()=>{if(this.el===el)this.startPop(onPop,!!gate);});
 }
 // After the first tap the music is already starting, so the logo springs out almost at once.
 startPop(onPop,tapped=false){
  const el=this.el,img=el.querySelector('.ts-logo img'),acts=el.querySelector('.ts-actions');
  el.classList.add('popping');el.dataset.popAt=String(Math.round(performance.now()));
  const delay=tapped?POP.tapDelay:POP.delay;
  img.animate(logoPopFrames(),{duration:POP.dur,delay,easing:'linear',fill:'both'});
  acts.animate([{opacity:0,transform:'translateY(calc(-50% + 1.6em))'},{opacity:1,transform:'translateY(-50%)'}],{duration:POP.buttonsDur,delay:delay+POP.buttonsAt,easing:'ease-out',fill:'both'});
  this.popTimer=setTimeout(()=>{if(this.el!==el)return;el.classList.add('popped');onPop?.();this.burst();},delay);
 }
 burst(){
  const el=this.el,box=el.querySelector('.ts-burst'),L=this.L,logo=el.querySelector('.ts-logo img');if(!L)return;
  const ar=(logo.naturalWidth&&logo.naturalHeight)?logo.naturalWidth/logo.naturalHeight:1.5,lw=L.fw*TITLE_LOGO.w,lh=lw/ar;
  const ps=burstParticles({fw:L.fw,cx:L.fw/2,cy:L.fh*TITLE_LOGO.y,lw,lh}).map(p=>{const n=document.createElement(p.kind==='tile'?'img':'div');n.className='ts-p '+p.kind;
   if(p.kind==='tile'){n.src='./assets/title-v1/burst-'+p.t+'.webp';n.alt='';n.draggable=false;}else if(p.kind==='die')n.innerHTML=faceSVG(p.v);
   n.style.width=p.w+'px';n.style.height=p.h+'px';box.append(n);return {p,n};});
  const t0=performance.now();let live=ps;
  const step=now=>{if(this.el!==el)return;const t=(now-t0)/1000;live=live.filter(({p,n})=>{const s=particleAt(p,t);if(!s.alive){n.remove();return false;}
    n.style.transform='translate('+(s.x-p.w/2).toFixed(1)+'px,'+(s.y-p.h/2).toFixed(1)+'px) rotate('+s.rot.toFixed(3)+'rad) scale('+s.scale.toFixed(3)+')';n.style.opacity=s.opacity.toFixed(3);return true;});
   if(live.length)this.raf=requestAnimationFrame(step);};
  this.raf=requestAnimationFrame(step);
 }
 layout(){
  if(!this.el)return;const coarse=globalThis.matchMedia?.('(pointer: coarse)').matches;
  const L=titleLayout(viewSize(),titleRotates(coarse,screenSize())),s=this.el.style;
  s.setProperty('--ts-bw',L.bw+'px');s.setProperty('--ts-bh',L.bh+'px');s.setProperty('--ts-fw',L.fw+'px');s.setProperty('--ts-fh',L.fh+'px');
  this.L=L;this.el.classList.toggle('turned',L.turn);this.el.classList.toggle('tall',L.tall);this.el.classList.toggle('wide',L.wide);
 }
 close(){if(!this.el)return;this.offKey?.();this.offKey=null;clearTimeout(this.popTimer);cancelAnimationFrame(this.raf);removeEventListener('resize',this.onResize);removeEventListener('orientationchange',this.onResize);this.el.remove();this.el=null;}
}
