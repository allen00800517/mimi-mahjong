// v0.94 · Opening deal. After the dice, tiles go out four at a time to each seat starting with the dealer
// (four rounds, then the dealer's 17th), face down. Your own tiles then flip one by one in the order they were
// dealt, and finally slide into sorted order (理牌). The engine has already dealt; this only reveals it.
// Opponents grow through a hand-count mask on the table renderer; your hand is the real hand DOM, masked.
export const DEAL_TIMING=Object.freeze({step:45,flipGap:22,flipHalf:60,sortDelay:100,sortDur:300,flowerDelay:60,tail:80});

// Cumulative tile counts per seat after each step of a standard deal (4×4 rounds from the dealer, then +1 dealer).
export function dealSchedule(dealer,lengths){
 const counts=[0,0,0,0],steps=[];
 for(let round=0;round<4;round++)for(let d=0;d<4;d++){const s=(dealer+d)%4;counts[s]=Math.min(lengths[s],counts[s]+4);steps.push([...counts]);}
 if(counts[dealer]<lengths[dealer]){counts[dealer]=lengths[dealer];steps.push([...counts]);}
 // Hands that already differ (never at a fresh start, but keep the end state exact) land on the final step.
 const last=steps.at(-1);for(let s=0;s<4;s++)last[s]=lengths[s];
 return steps;
}
// The engine keeps hands sorted, so the physical deal order is not recorded. Before 理牌 the tiles are shown in a
// stable shuffle of the hand (seeded by the hand), which looks exactly like an unsorted deal. perm[j] = the displayed
// tile dealt j-th. The dealer's freshly drawn tile (shown apart at the right) stays last.
export function dealPermutation(n,seed,fixLast=false){
 const idx=Array.from({length:fixLast?n-1:n},(_,i)=>i);let a=(seed>>>0)||1;
 const rnd=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
 for(let i=idx.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
 if(fixLast)idx.push(n-1);return idx;
}
export function dealDuration(steps,handSize){const T=DEAL_TIMING;return steps*T.step+60+handSize*T.flipGap+T.flipHalf*2+T.sortDelay+T.sortDur+T.flowerDelay+T.tail;}
// The deal starts right after the dice land (before the total fades), so the opening stays around three seconds.
export const DEAL_START_AFTER_DICE=100;

export class DealShow{
 constructor({backSrc,onStep,onSound}={}){this.backSrc=backSrc;this.onStep=onStep;this.onSound=onSound;this.state=null;this.timers=[];this.onDone=null;}
 get running(){return !!this.state;}
 // Hide everything until begin(): called when the dice are thrown, so the hand never shows early.
 prepare(game,dealer){
  this.finish({silent:true});
  const lengths=game.players.map(p=>p.hand.length);
  this.state={phase:'hidden',dealer,seed:game.seed,perm:null,hasFlowers:game.players.some(p=>p.flowers.length),steps:dealSchedule(dealer,lengths),step:-1,counts:[0,0,0,0],flipped:new Set(),sorted:false,flowers:false};
  this.onStep?.();
 }
 // What the renderer should show for each seat right now.
 handCount(seat){return this.state?this.state.counts[seat]:null;}
 flowersShown(){return !this.state||this.state.flowers;}
 begin({onDone}={}){
  const st=this.state;if(!st)return;this.onDone=onDone;st.phase='dealing';
  const T=DEAL_TIMING,later=(ms,fn)=>this.timers.push(setTimeout(()=>{if(this.state===st)fn();},ms));
  st.steps.forEach((counts,k)=>later(k*T.step,()=>{
   const before=st.counts[0];st.step=k;st.counts=[...counts];this.onStep?.();
   this.reveal(before,counts[0]);if(k%2===0)this.onSound?.('draw');
  }));
  const flipStart=st.steps.length*T.step+60,n=st.steps.at(-1)[0];
  for(let j=0;j<n;j++)later(flipStart+j*T.flipGap,()=>{this.flip(j);if(j%3===0)this.onSound?.('draw');});
  const sortAt=flipStart+n*T.flipGap+T.flipHalf*2+T.sortDelay;
  later(sortAt,()=>{st.phase='sorting';this.sort(true);this.onSound?.('place');});
  later(sortAt+T.sortDur+T.flowerDelay,()=>{st.flowers=true;st.sorted=true;this.onStep?.();if(st.hasFlowers)this.onSound?.('flower');});
  later(sortAt+T.sortDur+T.flowerDelay+T.tail,()=>this.finish());
 }
 hand(){return document.querySelector('#south .hand');}
 buttons(){return [...(this.hand()?.querySelectorAll('.tile[data-hand-index]')||[])];}
 // Re-apply the current state to a freshly rendered hand (render() rebuilds the DOM). Idempotent, no animation.
 apply(){
  const st=this.state;if(!st)return;const bs=this.buttons(),lefts=bs.map(b=>b.offsetLeft);
  if(!st.perm||st.perm.length!==bs.length)st.perm=dealPermutation(bs.length,st.seed,!!bs.at(-1)?.classList.contains('drawn'));
  const order=bs.map((_,i)=>st.perm.indexOf(i));
  const moving=!st.sorted&&st.phase!=='sorting';
  bs.forEach((b,i)=>{
   const j=order[i];b.classList.add('dealing');b.dataset.dealIndex=j;
   b.style.visibility=j<0||j<st.counts[0]?'':'hidden';
   // Before 理牌 each tile sits where it was dealt: raw position j is the j-th slot of the hand row.
   b.style.translate=moving&&j>=0&&lefts[j]!==undefined?(lefts[j]-lefts[i])+'px 0':'';
   let back=b.querySelector('.deal-back');
   if(!st.flipped.has(j)&&j>=0){if(!back){back=document.createElement('img');back.className='deal-back';back.src=typeof this.backSrc==='function'?this.backSrc():this.backSrc;back.alt='';back.draggable=false;b.append(back);}}
   else back?.remove();
  });
 }
 reveal(from,to){
  this.apply();
  for(const b of this.buttons()){const j=Number(b.dataset.dealIndex);if(j>=from&&j<to)b.animate([{transform:'translateY(-18px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:140,easing:'ease-out'});}
 }
 flip(j){
  const st=this.state,b=this.buttons().find(x=>Number(x.dataset.dealIndex)===j);st.flipped.add(j);if(!b)return;
  const T=DEAL_TIMING;
  b.animate([{scale:'1 1'},{scale:'0 1'}],{duration:T.flipHalf,easing:'ease-in'}).finished.then(()=>{if(this.state!==st)return;b.querySelector('.deal-back')?.remove();b.animate([{scale:'0 1'},{scale:'1 1'}],{duration:T.flipHalf,easing:'ease-out'});}).catch(()=>{});
 }
 sort(animate){
  for(const b of this.buttons()){const from=b.style.translate;if(!from||from==='none')continue;b.style.translate='';if(animate)b.animate([{translate:from},{translate:'0px 0'}],{duration:DEAL_TIMING.sortDur,easing:'cubic-bezier(.3,.7,.25,1)'});}
 }
 finish({silent=false}={}){
  for(const t of this.timers)clearTimeout(t);this.timers=[];
  if(!this.state)return;this.state=null;
  for(const b of this.buttons()){b.classList.remove('dealing');b.style.visibility='';b.style.translate='';b.querySelector('.deal-back')?.remove();}
  this.onStep?.();const done=this.onDone;this.onDone=null;if(!silent)done?.();
 }
}
