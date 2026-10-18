import {forbiddenDiscards,canCallAndDiscard} from './action-restrictions.mjs';
import {createDeal,cutWall,validateDeal} from './deal.mjs';
import {flowerMethods} from './flower-events.mjs';
import {validateSnapshot} from './snapshot-validation.mjs';
import {isWinningShape,waitingTiles,afterDiscard,declaredKan,resolveRon,parseHand} from './rules-core.mjs';
import {TILES,sortTiles,tileLabel,scoreHand,payments} from './scoring.mjs';
export {chooseAction} from './computer-player.mjs';
export const STATE_NAMES={S0:'未宣告',S1:'宣告聽牌',S2:'地聽',S3:'天聽'};
export const NAMES=['你','下家','對家','上家'];
const copy=x=>JSON.parse(JSON.stringify(x));
function rng(seed) { let a=seed>>>0; return ()=> {a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function makeWall(seed) { const r=rng(seed), a=TILES.flatMap(t=>Array(4).fill(t)).concat(Array.from({length:8},(_,i)=>(i+1)+'f'));for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const remove=(a,t)=>{const i=a.indexOf(t);if(i<0)throw Error('不存在的牌：'+t);a.splice(i,1);};
export class Game {
 constructor({seed=Date.now()>>>0,dealer=0,repeats=0,scores=[0,0,0,0],roundWind=0,windOrigin=0,deal=null}={}) {
  this.seed=seed>>>0;this.dealer=dealer;this.repeats=repeats;this.scores=[...scores];this.roundWind=roundWind;this.windOrigin=windOrigin;
  this.players=Array.from({length:4},()=>({hand:[],melds:[],flowers:[],river:[],state:'S0',passed:false,everPassed:false,ponPassed:[],draws:0,discards:0,called:false}));
  this.initialFlowers=[null,null,null,null];this.deferredFlowers=[null,null,null,null];this.flowerEvent=null;this.flowerClosed=false;this.callRestriction=null;this.drawOrigin='deal';
  if(deal){validateDeal(deal,this.seed,dealer,windOrigin);this.deal=copy(deal);this.backDraws=0;}
  this.wall=deal?cutWall(makeWall(this.seed),deal):makeWall(this.seed);this.kanCount=0;this.phase='dealing';this.turn=dealer;this.event=null;this.result=null;this.log=[];this.revision=0;this.history=[];
  // Match hands deal two stacks (four tiles) at a time, four passes.
  // Legacy one-at-a-time fixtures remain reproducible outside match mode.
  for(let n=0;n<(deal?4:16);n++)for(let d=0;d<4;d++)for(let t=0;t<(deal?4:1);t++)this.players[(dealer+d)%4].hand.push(this.wall.shift());
  if(deal)this.note('骰子 '+deal.dice.join('＋')+'＝'+deal.total+'；'+NAMES[deal.doorSeat]+'開門東；從'+NAMES[deal.firstWallSeat]+'第 '+deal.firstStack+' 墩取牌。');
  this.players[dealer].hand.push(this.wall.shift());
  let dealerReplacement=false, dealerDrawn=this.players[dealer].hand.at(-1);
  for(let d=0;d<4;d++) {
   const s=(dealer+d)%4,p=this.players[s];
   for(let i=0;i<p.hand.length;i++) {
    while(p.hand[i][1]==='f') {
     p.flowers.push(p.hand[i]);this.note(NAMES[s]+'配牌補花 '+tileLabel(p.hand[i]));
     if(this.live<=0){this.endDraw('配牌無可補牌');return;}
     p.hand[i]=this.takeReplacement();if(s===dealer){dealerReplacement=true;dealerDrawn=p.hand[i];}
    }
   }
  }
  this.players.forEach(p=>p.hand=sortTiles(p.hand));
  this.note('開局 #'+this.seed+'；'+NAMES[dealer]+'坐莊，連莊 '+repeats+'。');
  this.phase='turn';this.drawn=dealerDrawn;this.beforeDraw=[...this.players[dealer].hand];remove(this.beforeDraw,this.drawn);
  this.replacement=dealerReplacement;this.lastTile=this.live===0;this.canKan=true;this.opening='heaven';
  this.initializeFlowerClaims();this.assertInvariant();
 }
 takeReplacement(){
  if(!this.deal)return this.wall.pop();
  const index=this.backDraws%2===0?this.wall.length-2:this.wall.length-1;
  this.backDraws++;return this.wall.splice(index,1)[0];
 }
 get live(){return Math.max(0,this.wall.length-16-this.kanCount);}
 note(text){this.log.push(text);}
 wind(s){return (s-this.windOrigin+4)%4;}
 canWin(s,t=null){const p=this.players[s];if(p.passed)return false; if(!t&&(this.callRestriction||this.drawOrigin==='openKan'))return false; if(t) return waitingTiles(p.hand,p.melds).includes(t); return isWinningShape(p.hand,p.melds);}
 endDraw(reason='牌牆到達保留邊界，流局'){this.initialFlowers=[null,null,null,null];this.deferredFlowers=[null,null,null,null];this.phase='ended';this.result={kind:'draw',reason,payments:[]};this.note(reason);}
 draw(s,replacement=false,origin=replacement?'flower':'normal'){
  const normalDraw=!replacement;this.callRestriction=null;this.drawOrigin=origin;
  this.turn=s;const p=this.players[s];this.beforeDraw=[...p.hand];this.canKan=true;this.opening=null;
  if(!replacement){p.draws++;if(s!==this.dealer&&p.draws===1&&!p.called)this.opening='earth';}
  this.replacement=replacement;
  for(;;){
   if(this.live<=0){this.endDraw('沒有合法可摸／補牌，流局');return;}
   const t=replacement?this.takeReplacement():this.wall.shift();
   this.lastTile=this.live===0;
   if(t[1]==='f'){
    if(this.drawOrigin==='normal')this.drawOrigin='flower';
    p.flowers.push(t);this.note(NAMES[s]+'補花 '+tileLabel(t));replacement=true;this.replacement=true;
    if(this.live<=0){this.endDraw('最後取到花牌，已無合法補牌，流局');return;}
    if(this.checkFlowers(s))return;
   }else{p.hand.push(t);p.hand=sortTiles(p.hand);this.drawn=t;this.phase='turn';this.note(NAMES[s]+(replacement?'補牌':'摸牌'));if(!this.offerInitialFlowers(s)&&normalDraw)this.offerDeferredFlowers(s);return;}
  }
 }
 declaration(s,discarded){
  const p=this.players[s];if(p.state!=='S0')return null;
  if(p.discards===0&&!p.called) {
   if(p.passed&&discarded){const h=[...p.hand];remove(h,discarded);if(waitingTiles(h,p.melds).includes(discarded))return 'S1';}
   return s===this.dealer&&this.opening==='heaven'?'S3':s!==this.dealer?'S2':'S1';
  }return 'S1';
 }
 actions(s){
  if(!Number.isInteger(s)||s<0||s>3)throw Error('錯誤座位');
  const p=this.players[s],a=[];
  if(this.phase==='flower')return this.flowerActions(s);
  if(this.phase==='response'){
   if(this.event.from===s||this.event.responses[s])return a;
   const e=this.event;
   if(this.canWin(s,e.tile)) {
    a.push({id:'win',label:e.type==='addedKan'?'搶槓胡':'胡牌'});
    if(['S2','S3'].includes(p.state))return a;
   }
   if(e.type==='discard'&&p.state==='S0'&&this.live>3) {
    const n=p.hand.filter(t=>t===e.tile).length;
    if(n>=2&&!p.ponPassed.includes(e.tile)&&canCallAndDiscard(p,'pon',e.tile,Array(3).fill(e.tile)))a.push({id:'pon',label:'碰 '+tileLabel(e.tile)});
    if(n===3&&s!==(e.from+1)%4&&this.live>=2)a.push({id:'openKan',label:'明槓 '+tileLabel(e.tile)});
    if(s===(e.from+1)%4&&e.tile[1]!=='z'){
     const n=+e.tile[0],suit=e.tile[1];
     for(let lo=n-2;lo<=n;lo++)if(lo>=1&&lo<=7){
      const seq=[lo,lo+1,lo+2].map(v=>v+suit),need=[...seq];remove(need,e.tile);
      if(need.every(t=>p.hand.includes(t))&&canCallAndDiscard(p,'chi',e.tile,seq))a.push({id:'chi:'+lo,label:'吃 '+seq.map(tileLabel).join(' '),tiles:seq});
     }
    }
   }
   a.push({id:'pass',label:a.some(x=>x.id==='win')?'過水（暫時不能胡）':'略過'});return a;
  }
  if(this.phase!=='turn'||this.turn!==s)return a;
  if(this.canWin(s)){
   a.push({id:'win',label:'自摸'});
   if(!['S2','S3'].includes(p.state))a.push({id:'passWin',label:'過水，繼續出牌'});
   return a; // Win/pass must resolve before discarding or kan.
  }
  const blocked=forbiddenDiscards(this.callRestriction),unique=[...new Set(p.hand)];
  const discards=p.state==='S0'?unique:[this.drawn];
  for(const t of discards.filter(t=>!blocked.includes(t)))a.push({id:'discard:'+t,label:'打 '+tileLabel(t),tile:t});
  if(p.state==='S0') for(const t of unique.filter(t=>!blocked.includes(t))){
   const decl=this.declaration(s,t);
   const h=[...p.hand];remove(h,t);
   const waits=waitingTiles(h,p.melds);
   if(waits.length)a.push({id:'declare:'+t,label:STATE_NAMES[decl]+'，打 '+tileLabel(t),tile:t,state:decl,waits});
  }
  if(this.canKan&&this.live>=2&&!['S2','S3'].includes(p.state)){
   for(const t of unique)for(const kind of ['concealedKan','addedKan']){
    const possible=kind==='concealedKan'?p.hand.filter(x=>x===t).length===4:p.melds.some(m=>m.kind==='triplet'&&m.tiles[0]===t);
    if(!possible)continue;
    if(p.state==='S1'&&!declaredKan({state:p.state,handBeforeDraw:this.beforeDraw,melds:p.melds,drawnTile:this.drawn,tile:t,kind,replacementAvailableAfterReserve:true,passed:p.passed}).allowed)continue;
    a.push({id:kind+':'+t,label:(kind==='concealedKan'?'暗槓 ':'加槓 ')+tileLabel(t),tile:t});
   }
  }return a;
 }
 act(s,id,revision=this.revision){
  if(revision!==this.revision)throw Error('操作已過期');
  const a=this.actions(s).find(a=>a.id===id);if(!a)throw Error('不合法的操作：'+id);
  this.history.push({revision:this.revision,seat:s,id});this.revision++;
  const p=this.players[s];
  if(this.phase==='flower'){if(id==='flowerWin')this.acceptFlowers();else this.declineFlowers();this.assertInvariant();return;}
  if(this.phase==='response'){
   const opts=this.actions(s);
   if(id!=='win'&&opts.some(a=>a.id==='win')){p.passed=true;p.everPassed=true;this.note(NAMES[s]+'過水');}
   if(!['pon','openKan'].includes(id)&&opts.some(a=>a.id==='pon'))p.ponPassed.push(this.event.tile);
   this.event.responses[s]=a;
   this.resolveResponses();this.assertInvariant();return;
  }
  if(id==='win'){this.finish(s,'tsumo');}
  else if(id==='passWin'){p.passed=true;p.everPassed=true;this.note(NAMES[s]+'放棄自摸，進入過水');}
  else if(id.startsWith('discard:')||id.startsWith('declare:')){
   const t=a.tile;remove(p.hand,t);p.discards++;p.ponPassed=[];this.callRestriction=null;
   p.passed=afterDiscard({state:p.state,handAfterDiscard:p.hand,melds:p.melds,discarded:t,passed:p.passed}).passed;
   p.river.push({tile:t,claimed:false});
   const declaration=id.startsWith('declare:')?a.state:null;
   this.note(NAMES[s]+'打出 '+tileLabel(t)+(declaration?'，提交'+STATE_NAMES[declaration]:''));
   this.startResponses({type:'discard',from:s,tile:t,declaration,first:p.discards===1,lastTile:this.lastTile});
  }else if(id.startsWith('addedKan:')){
   this.note(NAMES[s]+'申請加槓 '+tileLabel(a.tile));
   this.startResponses({type:'addedKan',from:s,tile:a.tile,lastTile:false});
  }else if(id.startsWith('concealedKan:'))this.completeKan(s,a.tile,'concealedKan');
  this.assertInvariant();
 }
 startResponses(e){
  e.responses={};e.eligible={};
  for(let s=0;s<4;s++)if(s!==e.from)e.eligible[s]=this.canWin(s,e.tile);
  this.event=e;this.phase='response';
  for(let s=0;s<4;s++)if(s!==e.from){
   const a=this.actions(s);
   if(a.length===1)e.responses[s]=a[0]; // mandatory win or no optional action
  }
  this.resolveResponses();
 }
 resolveResponses(){
  const e=this.event;
  if(Object.keys(e.responses).length<3)return;
  const claims=Object.keys(e.responses).map(k=>({seat:+k,state:this.players[k].state,eligible:e.eligible[k],passed:false,...(e.eligible[k]?{choice:e.responses[k].id==='win'?'win':'pass'}:{})}));
  const win=resolveRon({discarder:e.from,claims});
  if(win.winner!==null){this.finish(win.winner,e.type==='addedKan'?'rob_added_kan':'ron',e.from,e.tile);return;}
  if(e.type==='addedKan'){this.event=null;this.completeKan(e.from,e.tile,'addedKan');return;}
  if(e.declaration){this.players[e.from].state=e.declaration;this.note(NAMES[e.from]+STATE_NAMES[e.declaration]+'成立');}
  const callers=Object.keys(e.responses).map(Number).filter(s=>['pon','openKan'].includes(e.responses[s].id)).sort((a,b)=>(a-e.from+4)%4-(b-e.from+4)%4);
  let caller=callers[0];
  if(caller===undefined)caller=Object.keys(e.responses).map(Number).find(s=>e.responses[s].id.startsWith('chi:'));
  if(caller!==undefined){
   const action=e.responses[caller],p=this.players[caller];
   this.players[e.from].river.at(-1).claimed=true;
   if(action.id==='openKan'){for(let i=0;i<3;i++)remove(p.hand,e.tile);p.melds.push({kind:'openKan',tiles:Array(4).fill(e.tile),from:e.from,calledTile:e.tile});this.kanCount++;}
   else{
    const tiles=action.id==='pon'?Array(3).fill(e.tile):action.tiles,need=[...tiles];remove(need,e.tile);need.forEach(t=>remove(p.hand,t));
    p.melds.push({kind:action.id==='pon'?'triplet':'sequence',tiles:[...tiles],from:e.from,calledTile:e.tile});
   }
   p.called=true;this.turn=caller;this.phase='turn';this.canKan=false;this.opening=null;this.drawn=null;this.lastTile=false;this.replacement=false;this.event=null;
   this.callRestriction=action.id==='openKan'?null:{seat:caller,from:e.from,kind:action.id==='pon'?'pon':'chi',tile:e.tile,tiles:[...p.melds.at(-1).tiles]};this.drawOrigin=null;
   this.note(NAMES[caller]+action.label);
   if(action.id==='openKan')this.draw(caller,true,'openKan');
  }else{this.event=null;this.draw((e.from+1)%4);}
 }
 completeKan(s,t,kind){
  const p=this.players[s];p.called=true;
  if(kind==='concealedKan'){for(let i=0;i<4;i++)remove(p.hand,t);p.melds.push({kind,tiles:Array(4).fill(t)});}
  else{remove(p.hand,t);const m=p.melds.find(m=>m.kind==='triplet'&&m.tiles[0]===t);m.kind='openKan';m.tiles.push(t);m.added=true;}
  this.kanCount++;this.note(NAMES[s]+(kind==='concealedKan'?'暗槓 ':'加槓 ')+tileLabel(t));this.draw(s,true,kind);
 }
 finish(s,method,payer=null,tile=this.drawn){
  if(method==='tsumo'&&!this.canWin(s))throw Error('目前摸牌來源或過水狀態不能自摸');
  const p=this.players[s],hand=method==='tsumo'?[...p.hand]:[...p.hand,tile];
  // Godgame: an earlier chi/pon cancels human win for the entire table.
  // An upgraded pon is now an openKan, so include exposed kans in this check.
  const interrupted=this.players.some(player=>player.melds.some(m=>m.kind!=='concealedKan'));
  const opening=method==='tsumo'?this.opening:method==='ron'&&this.event.first&&!interrupted?'human':null;
  const score=scoreHand({hand,melds:p.melds,flowers:p.flowers,winTile:tile,method,state:p.state,seatWind:this.wind(s),roundWind:this.roundWind,replacement:method==='tsumo'&&this.replacement,lastTile:method==='tsumo'?this.lastTile:method==='ron'&&this.event.lastTile,opening});
  const paid=payments({score,winner:s,payer,dealer:this.dealer,repeats:this.repeats});
  paid.forEach(x=>{this.scores[x.from]-=x.amount;this.scores[x.to]+=x.amount;});
  this.initialFlowers=[null,null,null,null];this.deferredFlowers=[null,null,null,null];
  this.result={kind:score.pending.length?'review':'win',winner:s,method,tile,hand,score,payments:paid,reason:score.pending.join('；')};
  this.phase=score.pending.length?'review':'ended';this.note(NAMES[s]+({tsumo:'自摸',ron:'胡牌',rob_added_kan:'搶槓胡'})[method]+(score.pending.length?'，結算待核對':'，手牌 '+score.tai+' 台（莊家台逐筆另列）'));
 }
 next(){
  if(!['ended','review'].includes(this.phase))throw Error('本手尚未結束');
  const review=this.phase==='review',retain=this.result.kind==='draw'||this.result.winner===this.dealer;
  const dealer=review?this.dealer:retain?this.dealer:(this.dealer+1)%4;
  const seed=(this.seed+1)>>>0,deal=this.deal?createDeal(seed,dealer):null;
  return new Game({seed,deal,dealer,repeats:review?this.repeats:retain?this.repeats+1:0,scores:this.scores,roundWind:this.roundWind,windOrigin:deal?deal.doorSeat:this.windOrigin});
 }
 publicView(s){
  const p=this.players[s];
  return {seat:s,hand:[...p.hand],state:p.state,melds:copy(p.melds),flowers:[...p.flowers],seatWind:this.wind(s),roundWind:this.roundWind,drawn:this.phase==='turn'&&this.turn===s?this.drawn:null,legal:copy(this.actions(s)),rivers:this.players.map(p=>copy(p.river)),exposed:this.players.map((p,i)=>p.melds.map(m=>i!==s&&m.kind==='concealedKan'?{kind:m.kind,tiles:['hidden','hidden','hidden','hidden']}:copy(m))),states:this.players.map(p=>p.state),event:this.event?{type:this.event.type,from:this.event.from,tile:this.event.tile}:null,live:this.live};
 }
 assertInvariant(){
  const a=[...this.wall];
  this.players.forEach(p=>a.push(...p.hand,...p.flowers,...p.melds.flatMap(m=>m.tiles),...p.river.filter(r=>!r.claimed).map(r=>r.tile)));
  if(a.length!==144)throw Error('牌數不守恆：'+a.length);
  for(const t of TILES)if(a.filter(x=>x===t).length!==4)throw Error('牌數異常：'+t);
  for(let i=1;i<=8;i++)if(a.filter(x=>x===i+'f').length!==1)throw Error('花牌異常');
  if(this.wall.length<16+this.kanCount)throw Error('侵入保留牌');
  if(this.phase==='turn'||this.phase==='response'){
   this.players.forEach((p,s)=>{
    const expected=this.phase==='turn'&&s===this.turn||this.phase==='response'&&this.event.type==='addedKan'&&s===this.event.from?17:16;
    if(p.hand.length+p.melds.length*3!==expected)throw Error('手牌張數異常：'+s);
   });
  }return true;
 }
 snapshot(){return copy({...this,format:'mimi-tw-prototype-3'});}
 static restore(data){
  validateSnapshot(data);
  const g=Object.assign(Object.create(Game.prototype),copy(data));g.assertInvariant();
  if(g.phase==='response')for(let s=0;s<4;s++)if(s!==g.event.from){
   const e=g.event,p=g.players[s],response=e.responses[s],passed=p.passed;
   const shape=waitingTiles(p.hand,p.melds).includes(e.tile);
   if(e.eligible[s]&&!shape||!e.eligible[s]&&shape&&!passed)throw new TypeError('存檔無效：胡牌資格與手牌不符');
   if(response){
    delete e.responses[s];if(e.eligible[s])p.passed=false;
    const legal=g.actions(s).find(a=>a.id===response.id);
    e.responses[s]=response;p.passed=passed;
    if(!legal||JSON.stringify(legal)!==JSON.stringify(response))throw new TypeError('存檔無效：回應並非合法操作');
   }
  }
  return g;
 }
}
Object.assign(Game.prototype,flowerMethods);
// Reproducible training fixtures still contain exactly the same 144 physical tiles.
export function trainingGame(kind='ready'){
 const g=new Game({seed:1616});g.players=Array.from({length:4},()=>({hand:[],melds:[],flowers:[],river:[],state:'S0',passed:false,everPassed:false,ponPassed:[],draws:2,discards:2,called:false}));
 let hand=kind==='kan'?parseHand('1111m 234m 456p 789p 34s 55s'):parseHand('123m 456m 234p 678s 34s 55p 9z'.replace('9z','1z'));
 if(kind==='win')hand=parseHand('234m 456m 234p 678s 345s 55p');
 g.wall=makeWall(1616);hand.forEach(t=>remove(g.wall,t));g.players[0].hand=sortTiles(hand);
 for(let s=1;s<4;s++)while(g.players[s].hand.length<16){const i=g.wall.findIndex(t=>t[1]!=='f');g.players[s].hand.push(g.wall.splice(i,1)[0]);}
 g.phase='turn';g.turn=0;g.drawn=kind==='kan'?'1m':kind==='win'?'5s':'1z';g.beforeDraw=[...g.players[0].hand];remove(g.beforeDraw,g.drawn);
 g.drawOrigin='normal';g.callRestriction=null;g.deferredFlowers=[null,null,null,null];g.opening=null;g.replacement=false;g.lastTile=false;g.canKan=true;g.log=['練習牌例：固定配牌，只供驗證。'];g.history=[];g.event=null;g.result=null;g.revision=0;
 if(kind==='kan')g.players[0].state='S1';
 g.assertInvariant();return g;
}
