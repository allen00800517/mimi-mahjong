import {isWinningShape} from './rules-core.mjs';
import {scoreHand,flowerTai,payments,sortTiles} from './scoring.mjs';
const names=['你','下家','對家','上家'];
const full=p=>p.hand.length+p.melds.length*3;
export const flowerMethods={
 initializeFlowerClaims(){
  this.initialFlowers=[null,null,null,null];
  const eight=this.players.findIndex(p=>p.flowers.length===8),seven=this.players.findIndex(p=>p.flowers.length===7);
  if(eight>=0)this.initialFlowers[eight]={kind:'eight',winner:eight,source:null,initial:true};
  else if(seven>=0&&this.players.reduce((n,p)=>n+p.flowers.length,0)===8){
   const source=this.players.findIndex((p,s)=>s!==seven&&p.flowers.length===1);
   this.initialFlowers[seven]={kind:'sevenB',winner:seven,source,initial:true};
  }
  if(eight>=0||this.initialFlowers.some(Boolean))this.flowerClosed=true;
  return this.offerInitialFlowers(this.dealer);
 },
 offerInitialFlowers(s){
  const candidate=this.initialFlowers[s];
  if(!candidate)return false;
  if(s!==this.dealer&&this.players[s].draws===0)return false;
  if(full(this.players[s])!==17)return false;
  this.initialFlowers[s]=null;
  this.offerFlowers({...candidate,transfer:candidate.source===null?null:this.players[candidate.source].flowers[0]},s,this.opening);
  return true;
 },
 offerDeferredFlowers(s){
  const candidate=this.deferredFlowers[s];if(!candidate||full(this.players[s])!==17)return false;
  this.deferredFlowers[s]=null;this.offerFlowers(candidate,s,this.opening);return true;
 },
 checkFlowers(drawingSeat=this.turn){
  if(this.flowerClosed)return false;
  const total=this.players.reduce((n,p)=>n+p.flowers.length,0);
  if(total!==8)return false;
  const eight=this.players.findIndex(p=>p.flowers.length===8),seven=this.players.findIndex(p=>p.flowers.length===7);
  if(eight<0&&seven<0)return false;
  if(this.live<1)return false; // current drawer and any robber both need a legal replacement
  const winner=eight>=0?eight:seven,source=eight>=0?null:this.players.findIndex((p,s)=>s!==winner&&p.flowers.length===1);
  const kind=eight>=0?'eight':winner===drawingSeat?'sevenB':'sevenA';
  this.flowerClosed=true;
  const candidate={kind,winner,source,initial:false,transfer:source===null?null:this.players[source].flowers[0]};
  if(winner===drawingSeat&&this.drawOrigin==='openKan'){
   this.deferredFlowers[winner]=candidate;this.note(names[winner]+'明槓補花的花胡，延到下次正常摸牌');return false;
  }
  this.offerFlowers(candidate,drawingSeat,this.opening);
  return true;
 },
 offerFlowers(candidate,resumeSeat,opening){
  this.flowerEvent={...candidate,originalFlowers:[...this.players[candidate.winner].flowers],resumeSeat,opening};
  this.phase='flower';this.event=null;
  this.note(names[candidate.winner]+'可以'+(candidate.kind==='eight'?'八仙過海':'七搶一')+(candidate.initial?'（配牌花胡）':''));
 },
 flowerActions(s){
  const e=this.flowerEvent;if(!e||e.winner!==s)return [];
  const a=[{id:'flowerWin',label:e.kind==='eight'?'胡八仙過海':'胡七搶一'}];
  if(!['S2','S3'].includes(this.players[s].state))a.push({id:'flowerPass',label:'放棄這次花胡'});
  return a;
 },
 declineFlowers(){
  const e=this.flowerEvent;this.flowerEvent=null;
  this.note(names[e.winner]+'放棄這次花胡；相同事件不再詢問');
  // A flower-only pass does not manufacture ordinary passed-win state.
  if(full(this.players[e.resumeSeat])===16){
   this.draw(e.resumeSeat,true,this.drawOrigin??'flower');this.opening=e.opening;
  }else this.phase='turn';
 },
 acceptFlowers(){
  const e=this.flowerEvent,p=this.players[e.winner];
  if(full(p)!==17){
   if(full(p)!==16||this.live<1)throw Error('花胡無法合法補足');
   this.beforeDraw=[...p.hand];this.drawn=this.takeReplacement();
   if(this.drawn[1]==='f')throw Error('八花公開後不應仍有花在牌牆');
   p.hand=sortTiles([...p.hand,this.drawn]);this.replacement=true;this.lastTile=this.live===0;
   this.note(names[e.winner]+'花胡補足手牌');
  }
  if(e.source!==null){
   const owner=this.players[e.source],at=owner.flowers.indexOf(e.transfer);
   if(at<0)throw Error('搶花來源不存在');owner.flowers.splice(at,1);p.flowers.push(e.transfer);
  }
  this.turn=e.winner;
  const normal=!p.passed&&isWinningShape(p.hand,p.melds)&&(e.kind==='sevenA'||this.drawOrigin!=='openKan');
  const method=e.kind==='sevenA'?'ron':'tsumo';
  const opening=e.kind==='sevenA'?null:e.opening;
  const body=normal?scoreHand({
   hand:p.hand,melds:p.melds,flowers:p.flowers,winTile:this.drawn,method,
   state:p.state,seatWind:this.wind(e.winner),roundWind:this.roundWind,
   replacement:this.replacement,lastTile:this.lastTile,opening,
   flowerRob:e.kind==='sevenA',flowerOverride:0
  }):{rows:[],tai:0,pending:[],alternatives:0,waits:[]};
  const payers=e.kind==='eight'||(e.kind==='sevenB'&&normal)?[0,1,2,3].filter(s=>s!==e.winner):[e.source];
  const paid=payers.map(s=>{
   const special=e.kind==='eight'||s===e.source;
   const flowers=special?8+(e.initial?4:0):flowerTai(e.originalFlowers,this.wind(e.winner));
   return {...payments({score:{tai:body.tai+flowers,pending:[]},winner:e.winner,payer:s,dealer:this.dealer,repeats:this.repeats})[0],flowerTai:flowers};
  });
  paid.forEach(x=>{this.scores[x.from]-=x.amount;this.scores[x.to]+=x.amount;});
  this.result={kind:'win',winner:e.winner,method:'flower',tile:this.drawn,hand:[...p.hand],score:body,payments:paid,reason:'',
   flower:{kind:e.kind,initial:e.initial,normal,source:e.source,originalFlowers:e.originalFlowers}};
  this.phase='ended';this.flowerEvent=null;this.initialFlowers=[null,null,null,null];this.deferredFlowers=[null,null,null,null];
  this.note(names[e.winner]+(e.kind==='eight'?'八仙過海':'七搶一')+(normal?'，同步手牌胡牌':'，純花胡'));
 }
};
