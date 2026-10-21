import {TILES,scoreHand} from './scoring.mjs';
import {forbiddenDiscards} from './action-restrictions.mjs';

// A suit frontier retains the most incomplete sets for each (melds, head) pair.
// Caches contain only tile-count patterns, never opponents' hands or wall order.
const suitCache=new Map(),honorCache=new Map();
const blank=()=>new Int8Array(12).fill(-1);
function frontier(c,suited){
 let key=0;for(const n of c)key=key*5+n;
 const cache=suited?suitCache:honorCache;
 if(cache.has(key))return cache.get(key);
 const result=blank(),i=c.findIndex(n=>n>0);
 if(i<0){result[0]=0;return result;}
 const use=(indices,meld=0,head=0,partial=0)=>{
  for(const j of indices)c[j]--;
  const sub=frontier(c,suited);
  for(const j of indices)c[j]++;
  for(let k=0;k<12;k++)if(sub[k]>=0){
   const m=(k>>1)+meld,p=(k&1)+head;
   if(m<=5&&p<=1)result[m*2+p]=Math.max(result[m*2+p],Math.min(5,sub[k]+partial));
  }
 };
 use([i]);
 if(c[i]>=3)use([i,i,i],1);
 if(c[i]>=2){use([i,i],0,1);use([i,i],0,0,1);}
 if(suited){
  if(i<7&&c[i+1]&&c[i+2])use([i,i+1,i+2],1);
  for(const gap of [1,2])if(i+gap<9&&c[i+gap])use([i,i+gap],0,0,1);
 }
 if(cache.size>=24000)cache.clear();
 cache.set(key,result);return result;
}
function countsOf(hand){
 const c=Array(34).fill(0);
 for(const t of hand){const i=TILES.indexOf(t);if(i<0||++c[i]>4)throw new TypeError('Invalid computer hand');}
 return c;
}
function distance(c,meldCount){
 const needed=5-meldCount;
 let combined=blank();combined[0]=0;
 for(let suit=0;suit<4;suit++){
  const local=frontier(c.slice(suit*9,suit===3?34:suit*9+9),suit!==3),next=blank();
  for(let a=0;a<12;a++)if(combined[a]>=0)for(let b=0;b<12;b++)if(local[b]>=0){
   const m=(a>>1)+(b>>1),p=(a&1)+(b&1);
   if(m<=needed&&p<=1)next[m*2+p]=Math.max(next[m*2+p],combined[a]+local[b]);
  }
  combined=next;
 }
 let best=10;
 for(let k=0;k<12;k++)if(combined[k]>=0){const m=k>>1,p=k&1;best=Math.min(best,2*needed-2*m-Math.min(combined[k],needed-m)-p);}
 return best;
}
export function handDistance(hand,meldCount=0){
 if(!Number.isInteger(meldCount)||meldCount<0||meldCount>5)throw new TypeError('Invalid meld count');
 return distance(countsOf(hand),meldCount);
}

export function visibleCounts(view){
 const c=countsOf(view.hand);
 for(const river of view.rivers??[])for(const r of river)if(!r.claimed){const i=TILES.indexOf(r.tile);if(i>=0)c[i]++;}
 const exposed=view.exposed??Array.from({length:4},(_,s)=>s===view.seat?view.melds:[]);
 for(const melds of exposed)for(const m of melds)for(const t of m.tiles){const i=TILES.indexOf(t);if(i>=0)c[i]++;}
 // An added-kan offer reveals the fourth tile before the meld is committed.
 if(view.event?.type==='addedKan'){const i=TILES.indexOf(view.event.tile);if(i>=0)c[i]++;}
 return c.map(n=>Math.min(4,n));
}
function analyzer(seen){
 const memo=new Map();
 const getDistance=(c,m)=>{
  const key=m+':'+c.join('');if(memo.has(key))return memo.get(key);
  const d=distance(c,m);memo.set(key,d);return d;
 };
 return (hand,meldCount)=>{
  const c=countsOf(hand),shanten=getDistance(c,meldCount),improving=[];let ukeire=0;
  for(let i=0;i<34;i++)if(c[i]<4&&seen[i]<4){
   c[i]++;const improved=getDistance(c,meldCount)<shanten;c[i]--;
   if(improved){const count=4-seen[i];ukeire+=count;improving.push({tile:TILES[i],count});}
  }
  return {shanten,ukeire,improving};
 };
}
export function evaluateHand(hand,meldCount=0,seen=countsOf(hand)){return analyzer(seen)(hand,meldCount);}
function threats(view){
 return Array.from({length:4},(_,s)=>s).filter(s=>s!==view.seat).map(s=>({seat:s,weight:view.states?.[s]&&view.states[s]!=='S0'?1:(view.exposed?.[s]?.length??0)>=4?.55:0})).filter(t=>t.weight>0);
}
export function tileDanger(view,tile,seen=visibleCounts(view)){
 const i=TILES.indexOf(tile);if(i<0)return 0;
 const unknown=seen.map(n=>4-n);let ways=unknown[i]>=1?1:0;
 if(unknown[i]>=2)ways++;
 if(i<27)for(let lo=Math.max(i-i%9,i-2);lo<=i&&lo%9<=6;lo++){
  if(lo+2>=27||Math.floor(lo/9)!==Math.floor(i/9))continue;
  if([lo,lo+1,lo+2].filter(j=>j!==i).every(j=>unknown[j]>0))ways++;
 }
 if(!ways)return 0;
 let risk=0;
 for(const threat of threats(view)){
  // A prior discard is a likelihood hint, not Japanese permanent furiten.
  const river=view.rivers?.[threat.seat]??[],familiar=river.some(r=>r.tile===tile)?.72:1;
  const rank=i%9,shape=i>=27?.65:rank===0||rank===8?.75:rank===1||rank===7?.95:1.1;
  risk+=threat.weight*familiar*shape*(.3+.7*ways/(i>=27?2:5));
 }
 return risk;
}
const effective=q=>q.shanten===0&&q.ukeire===0?1:q.shanten;
// v1.03 · CPU 牌風 — each character plays to the style shown on the character select (user, 2026-10-19).
//  mimi 快手: wins whatever comes, calls freely, defends little.      ichika 穩健: defends hard, folds early, rarely calls.
//  harumi 貴氣: steers toward 混一色 / honour triplets, passes cheap wins early.   gondo 豪賭: chases 清一色, passes small wins.
//  jinying 家常 (v1.53): plain 平胡 — sheds honours early, chows freely but pons only when it makes her ready, takes any win.
// Numbers are tuned with self-play (work/cpu/sim.mjs) so the styles differ but no one runs away with the table.
export const CPU_STYLES=Object.freeze({
 std:Object.freeze({}),
 mimi:Object.freeze({defense:.3,eagerCalls:true,declareRisk:1}),
 ichika:Object.freeze({defense:1.35,fold:true,strictCalls:true,declareRisk:.5}),
 harumi:Object.freeze({defense:1.25,flush:'half',flushFrom:10,offSuit:40,offSuitEarly:90,honorKeep:18,minTai:Object.freeze({tai:2,live:30})}),
 jinying:Object.freeze({defense:1,plainShed:14,ponOnlyReady:true}),
 gondo:Object.freeze({defense:.75,flush:'half',pureLean:12,flushFrom:9,offSuit:70,offSuitEarly:120,minTai:Object.freeze({tai:2,live:24,whenChasing:true}),declareRisk:1.4}),
});
const styleOf=id=>CPU_STYLES[id]??CPU_STYLES.std;
const SUITS=['m','p','s'];
// Which suit a flush-minded style is steering toward, if the hand already leans that way.
export function flushPlan(view,style){
 if(!style.flush)return null;
 const all=[...view.hand,...view.melds.flatMap(m=>m.tiles)],cnt={m:0,p:0,s:0,z:0};
 for(const t of all)if(cnt[t[1]]!==undefined)cnt[t[1]]++;
 const suit=SUITS.reduce((a,b)=>cnt[b]>cnt[a]?b:a,'m'),half=style.flush==='half';
 const fits=t=>t[1]===suit||(half&&t[1]==='z');
 if(view.melds.some(m=>!m.tiles.every(fits)))return null;
 const score=cnt[suit]+(half?cnt.z:0);
 const from=style.flushFrom??9;
 return score>=from?{suit,half,fits,weight:score>=from+2?1:.6,strong:score>=from+2}:null;
}
// Distance of a flush hand: the fitting tiles plus blanks for the off-suit slots still to be replaced.
function flushQuality(fitting,meldCount,seen,plan,size){
 const c=countsOf(fitting),pad=size-fitting.length,d=distance(c,meldCount);
 let ukeire=0;
 for(let i=0;i<34;i++){const t=TILES[i];if(!plan.fits(t)||c[i]>=4||seen[i]>=4)continue;c[i]++;if(distance(c,meldCount)<d)ukeire+=4-seen[i];c[i]--;}
 // Every off-suit tile still held is a slot that must be swapped out; distance() already treats it as missing.
 return {shanten:d,ukeire,pad};
}
function valuableHonor(view,t){if(t[1]!=='z')return false;const n=+t[0];return n>=5||n===(view.seatWind??-9)+1||n===(view.roundWind??-9)+1;}
function rankDiscards(view,hand,meldCount,tiles,analyze,seen,style=CPU_STYLES.std){
 const choices=[];
 for(const tile of tiles){
  const after=[...hand],at=after.indexOf(tile);if(at<0)continue;after.splice(at,1);
  const quality=analyze(after,meldCount),danger=tileDanger(view,tile,seen);
  choices.push({tile,...quality,danger});
 }
 const best=Math.min(...choices.map(effective)),defense=(best===0?22:best===1?85:150)*(style.defense??1);
 const plan=flushPlan({...view,hand},style),folding=style.fold&&best>=2&&threats(view).some(t=>t.weight>=1);
 for(const q of choices){
  q.value=-100*effective(q)+q.ukeire*1.2-q.danger*defense;
  if(plan&&view.live>16){
   // Judge the hand as the flush it is heading for: off-suit tiles count for nothing, and only in-suit draws help.
   const after=[...hand];after.splice(after.indexOf(q.tile),1);const fq=flushQuality(after.filter(plan.fits),meldCount,seen,plan,after.length);
   if(fq.shanten<=effective(q)+(plan.strong?2:1))q.value=-100*fq.shanten+fq.ukeire*1.2-q.danger*defense+(plan.fits(q.tile)?0:style.offSuit*plan.weight);
  }
  if(plan&&style.pureLean&&q.tile[1]==='z')q.value+=style.pureLean; // 豪賭 sheds honours first: 清一色 over 混一色
  if(style.plainShed&&q.tile[1]==='z')q.value+=style.plainShed; // 家常 keeps a plain hand: honours go first
  if(style.honorKeep&&valuableHonor(view,q.tile)&&hand.filter(t=>t===q.tile).length>=2)q.value-=style.honorKeep;
  if(folding)q.value=-q.danger*1000-effective(q);
 }
 choices.sort((a,b)=>b.value-a.value||a.danger-b.danger||TILES.indexOf(a.tile)-TILES.indexOf(b.tile));
 return choices;
}
function remove(hand,tiles){const result=[...hand];for(const t of tiles){const i=result.indexOf(t);if(i<0)return null;result.splice(i,1);}return result;}

// Hand tai of the win on offer (dealer tai not included); null when it cannot be estimated.
function offeredTai(view){
 try{
  const ron=view.event?.type==='discard'||view.event?.type==='addedKan',winTile=ron?view.event.tile:view.drawn;if(!winTile)return null;
  const hand=ron?[...view.hand,winTile]:[...view.hand];
  return scoreHand({hand,melds:view.melds,flowers:view.flowers??[],winTile,method:ron?(view.event.type==='addedKan'?'rob_added_kan':'ron'):'tsumo',state:view.state??'S0',seatWind:view.seatWind??0,roundWind:view.roundWind??0}).tai;
 }catch{return null;}
}
export function chooseAction(view,character){
 const legal=view.legal??[];if(!legal.length)return null;const style=styleOf(character);
 const win=legal.find(a=>a.id==='win'||a.id==='flowerWin');
 if(win){
  // 貴氣 / 豪賭 let a cheap win go while the wall is still long (過水); declared 地聽/天聽 must take it.
  const m=style.minTai,skip=legal.find(a=>a.id==='pass'||a.id==='passWin');
  if(win.id==='win'&&m&&skip&&(view.live??0)>m.live&&(!m.whenChasing||flushPlan(view,style))){const tai=offeredTai(view);if(tai!==null&&tai<m.tai)return skip.id;}
  return win.id;
 }
 if(legal.length===1)return legal[0].id;
 const seen=visibleCounts(view),analyze=analyzer(seen),meldCount=view.melds.length;
 const discards=legal.filter(a=>a.id.startsWith('discard:'));
 if(discards.length){
  const ranked=rankDiscards(view,view.hand,meldCount,discards.map(a=>a.tile),analyze,seen,style),best=ranked[0];
  for(const kan of legal.filter(a=>/^(concealedKan|addedKan):/.test(a.id))){
   const concealed=kan.id.startsWith('concealedKan:'),hand=remove(view.hand,Array(concealed?4:1).fill(kan.tile));
   if(!hand)continue;
   const q=analyze(hand,meldCount+(concealed?1:0));
   if(q.shanten<=best.shanten&&q.ukeire>=Math.max(1,best.ukeire*.8)&&(!threats(view).length||(concealed&&best.shanten===0)||tileDanger(view,kan.tile,seen)<.25)&&(view.live>8||q.shanten<best.shanten))return kan.id;
  }
  const declaration=legal.find(a=>a.id==='declare:'+best.tile);
  if(declaration&&best.shanten===0&&best.ukeire>0&&best.danger<(style.declareRisk??.8))return declaration.id;
  return 'discard:'+best.tile;
 }
 const pass=legal.find(a=>a.id==='pass');
 if(pass&&view.event?.type==='discard'){
  const baseline=analyze(view.hand,meldCount),incoming=view.event.tile,candidates=[],plan=flushPlan(view,style);
  if(threats(view).length&&(style.strictCalls||baseline.shanten>=(style.callThreatShanten??2)))return pass.id;
  for(const call of legal.filter(a=>a.id==='pon'||a.id==='openKan'||a.id.startsWith('chi:'))){
   const tiles=call.id.startsWith('chi:')?[...call.tiles]:Array(call.id==='openKan'?4:3).fill(incoming),used=[...tiles];used.splice(used.indexOf(incoming),1);
   if(plan&&!plan.fits(incoming))continue; // a flush hunter never opens a meld outside the suit
   const hand=remove(view.hand,used);if(!hand)continue;
   let best;
   if(call.id==='openKan'){const q=analyze(hand,meldCount+1);best={...q,value:-100*effective(q)+1.2*q.ukeire,danger:0};}
   else{
    const blocked=forbiddenDiscards({kind:call.id==='pon'?'pon':'chi',tile:incoming,tiles});
    best=rankDiscards(view,hand,meldCount+1,[...new Set(hand)].filter(t=>!blocked.includes(t)),analyze,seen,style)[0];
   }
   // A kan already owns a complete triplet, so its distance cannot improve
   // until the replacement draw. Allow that draw for a useful, already-open
   // incomplete hand; ready hands cannot win on open-kan replacement here.
   const usefulKan=call.id==='openKan'&&meldCount>0&&baseline.shanten>0&&best?.shanten===baseline.shanten&&best.ukeire>=Math.max(8,baseline.ukeire)&&view.live>12&&!threats(view).length;
   const improves=effective(best??{shanten:9})<effective(baseline),eager=style.eagerCalls&&best&&effective(best)===effective(baseline)&&best.ukeire>baseline.ukeire*2;
   const honorPon=style.honorKeep&&call.id==='pon'&&valuableHonor(view,incoming)&&best&&effective(best)<=effective(baseline);
   const strictOk=!style.strictCalls||(best&&best.shanten<=2);
   if(style.ponOnlyReady&&call.id==='pon'&&(best?.shanten??9)>0)continue; // 家常 pons only when it makes her ready
   if(best&&(improves||usefulKan||eager||honorPon)&&strictOk&&best.ukeire>0&&best.danger<.8)candidates.push({id:call.id,...best});
  }
  candidates.sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  return candidates[0]?.id??pass.id;
 }
 return pass?.id??legal[0].id;
}
