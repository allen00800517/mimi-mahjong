// v0.93 · Opening dice. Each hand starts with the three dice the engine already rolled for the wall break
// (deal.dice), thrown from the dealer's side, tumbling as real cubes and settling with the total and the door seat.
// Drawn with code on purpose: a plain traditional die is pure geometry (ivory cube, red 1 and 4), and a real 3D
// tumble needs all six faces, which generated flat art cannot give. Timing is fixed so the sound can be cut to it.
export const DICE_TIMING=Object.freeze({delay:700,roll:550,badge:750,hold:1500,fade:220});
export const DICE_TOTAL_MS=DICE_TIMING.delay+DICE_TIMING.hold+DICE_TIMING.fade;
export const DICE_REDUCED_MS=1250;

// Faces for a die showing v at the front. Opposite faces always add up to 7, like a real die.
export function dieFaces(v){
 if(!Number.isInteger(v)||v<1||v>6)throw new RangeError('die value');
 const rest=[1,2,3].filter(n=>n!==v&&n!==7-v),[a,b]=rest;
 return {front:v,back:7-v,right:a,left:7-a,top:b,bottom:7-b};
}
// The badge names the door seat (where the wall is broken). The dealer, marked 莊 by the name, always discards first.
export function diceBadgeText(deal,names){return deal.dice.join('＋')+'＝'+deal.total+'　'+names[deal.doorSeat]+' 開門';}
// Screen direction of each seat (0 bottom = you, 1 right, 2 top, 3 left): the dice come in from the dealer.
export function throwVector(seat){return [[0,1],[1,0],[0,-1],[-1,0]][((seat%4)+4)%4];}

const PIPS={1:[[50,50]],2:[[28,28],[72,72]],3:[[26,26],[50,50],[74,74]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[26,26],[74,26],[50,50],[26,74],[74,74]],6:[[28,24],[72,24],[28,50],[72,50],[28,76],[72,76]]};
export function faceSVG(v){
 const red=v===1||v===4,r=v===1?12:8.5;
 return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="20" fill="#fffaf0" stroke="#e2c27e" stroke-width="3"/><rect x="9" y="8" width="82" height="38" rx="15" fill="#fff" opacity=".55"/>'+PIPS[v].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(red?'#d23a3f':'#3a2a1c')+'"/>').join('')+'</svg>';
}
const FACE_TRANSFORM={front:'',back:'rotateY(180deg)',right:'rotateY(90deg)',left:'rotateY(-90deg)',top:'rotateX(90deg)',bottom:'rotateX(-90deg)'};

export class DiceShow{
 constructor(host,{center=[.5,.43],size=.112}={}){this.host=host;this.center=center;this.size=size;this.el=null;this.timers=[];this.onDone=null;}
 get running(){return !!this.el;}
 // dice: [n,n,n]; text: badge; from: dealer seat; onStart: fired when the dice actually leave the hand (after the delay).
 start({dice,text,from=0,reduced=false,onStart=null,onDone=null}={}){
  this.finish({silent:true});
  const H=this.host.clientHeight||394,W=this.host.clientWidth||854,S=Math.round(H*this.size),cx=W*this.center[0],cy=H*this.center[1];
  const el=document.createElement('div');el.className='dice-show';el.setAttribute('aria-hidden','true');el.style.setProperty('--die',S+'px');el.style.visibility='hidden';
  const [vx,vy]=throwVector(from),spread=S*1.08;
  const dice3=dice.map((v,i)=>{
   const pos=document.createElement('div');pos.className='die-pos';
   const ex=cx+(i-1)*spread,ey=cy+(i===1?-S*.06:S*.04);pos.style.left=ex-S/2+'px';pos.style.top=ey-S/2+'px';
   pos.innerHTML='<div class="die-shadow"></div><div class="die-hop"><div class="die-cube">'+Object.entries(dieFaces(v)).map(([k,n])=>'<div class="die-face" style="transform:'+FACE_TRANSFORM[k]+' translateZ(calc(var(--die) / 2))">'+faceSVG(n)+'</div>').join('')+'<div class="die-core"></div><div class="die-core" style="transform:rotateY(90deg)"></div><div class="die-core" style="transform:rotateX(90deg)"></div></div></div>';
   el.append(pos);return {pos,i,ex,ey};
  });
  const badge=document.createElement('div');badge.className='dice-badge';badge.textContent=text;badge.style.top=cy+S*.85+'px';el.append(badge);
  this.host.append(el);this.el=el;this.onDone=onDone;
  const later=(ms,fn)=>this.timers.push(setTimeout(fn,ms));
  if(reduced){
   el.style.visibility='';el.animate([{opacity:0},{opacity:1}],{duration:150,fill:'both'});badge.style.opacity=1;
   onStart?.();later(DICE_REDUCED_MS-200,()=>el.animate([{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}));later(DICE_REDUCED_MS,()=>this.finish());
   return;
  }
  const T=DICE_TIMING;badge.style.opacity=0;
  later(T.delay,()=>{
   el.style.visibility='';onStart?.();
   for(const {pos,i} of dice3){
    const lag=i*35,sx=vx*S*(4.2+i*.35)+(vy?(i-1)*S*.9:0),sy=vy*S*(3.4+i*.3)+(vx?(i-1)*S*.7:0);
    const k=Math.sin(i*2.1+dice[i])*.5+.5,spinX=(vy?-vy:1)*(540+180*Math.round(k*2)),spinY=(vx?vx:1)*(360+180*Math.round((1-k)*2)),endZ=(i-1)*4+(k-.5)*6;
    const timing={duration:T.roll-lag,delay:lag,fill:'both',easing:'cubic-bezier(.22,.68,.32,1)'};
    pos.animate([{transform:`translate(${sx}px,${sy}px) scale(.78)`,opacity:0},{offset:.1,opacity:1},{transform:'translate(0px,0px) scale(1)',opacity:1}],timing);
    pos.querySelector('.die-cube').animate([{transform:`rotateX(${spinX}deg) rotateY(${spinY}deg) rotateZ(${-endZ*6}deg)`},{transform:`rotateX(0deg) rotateY(0deg) rotateZ(${endZ}deg)`}],timing);
    pos.querySelector('.die-hop').animate([{transform:'translateY(0)',offset:0},{transform:`translateY(${-S*.75}px)`,offset:.2,easing:'ease-in'},{transform:'translateY(0)',offset:.42,easing:'ease-out'},{transform:`translateY(${-S*.28}px)`,offset:.6,easing:'ease-in'},{transform:'translateY(0)',offset:.76,easing:'ease-out'},{transform:`translateY(${-S*.08}px)`,offset:.88,easing:'ease-in'},{transform:'translateY(0)',offset:1}],{...timing,easing:'linear'});
    pos.querySelector('.die-shadow').animate([{transform:'scale(.5)',opacity:.2},{transform:'scale(.7)',opacity:.35,offset:.2},{transform:'scale(1)',opacity:.6,offset:.42},{transform:'scale(1)',opacity:.6}],{...timing,easing:'linear'});
   }
  });
  later(T.delay+T.roll,()=>{
   for(const {pos} of dice3)pos.animate([{scale:'1.12 .9'},{scale:'.96 1.04'},{scale:'1 1'}],{duration:180,easing:'ease-out'});
   const spark=document.createElement('div');spark.className='dice-sparkles';spark.style.left=cx+'px';spark.style.top=cy+'px';
   for(let k=0;k<9;k++){const a=k/9*Math.PI*2+.2,st=document.createElement('i');st.style.left=Math.cos(a)*S*2.05+'px';st.style.top=Math.sin(a)*S*1.25+'px';st.animate([{transform:'translate(-50%,-50%) scale(0) rotate(0deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1.1) rotate(45deg)',opacity:1,offset:.35},{transform:'translate(-50%,-50%) scale(0) rotate(90deg)',opacity:0}],{duration:520,delay:k%3*40,fill:'both',easing:'ease-out'});spark.append(st);}
   el.append(spark);
  });
  later(T.delay+T.badge,()=>badge.animate([{opacity:0,transform:'translate(-50%,6px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:200,fill:'forwards',easing:'ease-out'}));
  later(T.delay+T.hold,()=>el.animate([{opacity:1},{opacity:0}],{duration:T.fade,fill:'forwards'}));
  later(DICE_TOTAL_MS,()=>this.finish());
 }
 finish({silent=false}={}){
  for(const t of this.timers)clearTimeout(t);this.timers=[];
  if(!this.el)return;this.el.remove();this.el=null;const done=this.onDone;this.onDone=null;if(!silent)done?.();
 }
}
