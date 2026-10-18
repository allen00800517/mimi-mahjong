// v1.02 · Title screen (agreed 2026-10-18). Same pattern as the other 蜜蜜餐廳 mini-games: one full-bleed portrait
// cover (麻雀珍 at dusk, 蜜蜜 seen from behind), the series logo in the empty sky and a start button on the street.
// The cover stays portrait on phones: the table is forced landscape, so here the page counter-rotates; a phone held
// sideways sees the title turned, the same way the table turns when the phone is upright. On a computer the cover
// sits in the middle with a blurred copy filling the sides.
import {viewSize,screenSize} from './viewport.mjs';
export const TITLE_ART=Object.freeze({bg:'./assets/title-v1/title-bg.webp',ratio:941/1672,
 logo:Object.freeze({zh:'./assets/title-v1/logo-zh.webp',ja:'./assets/title-v1/logo-ja.webp'})});
export const TITLE_ALT=Object.freeze({zh:'蜜蜜的牌桌大勝負！麻雀珍篇',ja:'ミーミーの雀卓大勝負！麻雀珍篇'});
// Logo language: Japanese for a Japanese browser, otherwise the Traditional Chinese release logo.
export function titleLang(langs=globalThis.navigator?.languages||[globalThis.navigator?.language]){return /^ja\b/i.test(String(langs?.[0]||''))?'ja':'zh';}
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
const icon=on=>'<img src="./assets/icons/'+(on?'volume-2':'volume-x')+'.svg" alt="">';
export class TitleScreen{
 constructor(host,{version=''}={}){this.host=host;this.version=version;this.el=null;this.onResize=()=>requestAnimationFrame(()=>this.layout());}
 get open(){return !!this.el;}
 show({canContinue=false,soundOn=false,lang=titleLang(),onStart,onContinue,onNew,onSound}={}){
  this.close();
  const el=document.createElement('section');el.id='title-screen';el.setAttribute('aria-label','標題畫面');
  el.innerHTML='<div class="ts-box"><img class="ts-blur" alt="" draggable="false" src="'+TITLE_ART.bg+'"><div class="ts-frame">'+
   '<img class="ts-bg" alt="" draggable="false" src="'+TITLE_ART.bg+'">'+
   '<h1 class="ts-logo"><img alt="'+TITLE_ALT[lang]+'" draggable="false" src="'+TITLE_ART.logo[lang]+'"></h1>'+
   '<div class="ts-actions'+(canContinue?' two':'')+'"><button type="button" class="ts-start">'+(canContinue?'繼續牌局':'開　始')+'</button>'+
   (canContinue?'<button type="button" class="ts-new">開新的一場</button>':'')+'</div>'+
   (this.version?'<span class="ts-version">'+this.version+'</span>':'')+'</div>'+
   '<button type="button" class="ts-sound" aria-pressed="'+soundOn+'" aria-label="'+(soundOn?'音效開啟，點擊靜音':'音效關閉，點擊開啟')+'">'+icon(soundOn)+'</button></div>';
  const done=cb=>()=>{this.close();cb?.();};
  el.querySelector('.ts-start').onclick=done(canContinue?onContinue:onStart);
  el.querySelector('.ts-new')?.addEventListener('click',done(onNew));
  const sb=el.querySelector('.ts-sound');
  sb.onclick=async()=>{const on=!!(await onSound?.());sb.innerHTML=icon(on);sb.setAttribute('aria-pressed',String(on));sb.setAttribute('aria-label',on?'音效開啟，點擊靜音':'音效關閉，點擊開啟');};
  this.host.append(el);this.el=el;this.layout();
  addEventListener('resize',this.onResize);addEventListener('orientationchange',this.onResize);
  el.querySelector('.ts-start').focus({preventScroll:true});
 }
 layout(){
  if(!this.el)return;const coarse=globalThis.matchMedia?.('(pointer: coarse)').matches;
  const L=titleLayout(viewSize(),titleRotates(coarse,screenSize())),s=this.el.style;
  s.setProperty('--ts-bw',L.bw+'px');s.setProperty('--ts-bh',L.bh+'px');s.setProperty('--ts-fw',L.fw+'px');s.setProperty('--ts-fh',L.fh+'px');
  this.el.classList.toggle('turned',L.turn);this.el.classList.toggle('tall',L.tall);this.el.classList.toggle('wide',L.wide);
 }
 close(){if(!this.el)return;removeEventListener('resize',this.onResize);removeEventListener('orientationchange',this.onResize);this.el.remove();this.el=null;}
}
