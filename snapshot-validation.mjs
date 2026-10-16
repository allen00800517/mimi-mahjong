import {canCallAndDiscard} from './action-restrictions.mjs';
import {validateDeal} from './deal.mjs';
import {isWinningShape,waitingTiles} from './rules-core.mjs';
import {TILES,flowerTai} from './scoring.mjs';
const requireValid=(ok,message)=>{if(!ok)throw new TypeError('存檔無效：'+message);};
const seat=n=>Number.isInteger(n)&&n>=0&&n<4;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const bool=x=>typeof x==='boolean';
const tile=t=>TILES.includes(t);
const same=(a,b)=>[...a].sort().join(',')===[...b].sort().join(',');
export function validateSnapshot(d){
 requireValid(d&&typeof d==='object'&&!Array.isArray(d),'資料格式');
 const allowed=new Set(['seed','dealer','repeats','scores','roundWind','windOrigin','players','wall','kanCount','phase','turn','event','result','log','revision','history','drawn','beforeDraw','replacement','lastTile','canKan','opening','format','initialFlowers','flowerClosed','flowerEvent','deal','backDraws','callRestriction','drawOrigin','deferredFlowers']);
 requireValid(Object.keys(d).every(k=>allowed.has(k)),'未知欄位或方法覆蓋');
 requireValid(d.format==='mimi-tw-prototype-3','版本不相容；請使用新版紀錄，舊紀錄缺少行牌禁制資訊');
 requireValid(count(d.seed)&&d.seed<=4294967295&&seat(d.dealer)&&seat(d.turn)&&seat(d.roundWind)&&seat(d.windOrigin),'座位／牌局設定');
 if(d.deal!==undefined){validateDeal(d.deal,d.seed,d.dealer,d.windOrigin);requireValid(count(d.backDraws)&&d.backDraws<=144-d.wall.length,'補牌計數');}else requireValid(d.backDraws===undefined,'非正式配牌的補牌計數');
 requireValid(count(d.repeats)&&Number.isSafeInteger(1+2*d.repeats)&&count(d.kanCount)&&count(d.revision),'連莊／槓／事件計數');
 requireValid(Array.isArray(d.scores)&&d.scores.length===4&&d.scores.every(Number.isSafeInteger),'分數');
 requireValid(['turn','response','flower','ended','review'].includes(d.phase),'牌局階段');
 requireValid(Array.isArray(d.players)&&d.players.length===4,'四家資料');
 requireValid(Array.isArray(d.wall)&&d.wall.every(t=>tile(t)||/^[1-8]f$/.test(t)),'牌牆');
 requireValid(Array.isArray(d.log)&&d.log.every(x=>typeof x==='string')&&Array.isArray(d.history),'歷程');
 requireValid(d.history.every(h=>h&&seat(h.seat)&&count(h.revision)&&typeof h.id==='string')&&d.history.length===d.revision,'事件紀錄');
 requireValid(bool(d.replacement)&&bool(d.lastTile)&&bool(d.canKan)&&[null,'heaven','earth'].includes(d.opening),'摸牌事件');
 requireValid(Array.isArray(d.beforeDraw)&&d.beforeDraw.every(tile)&&(d.drawn===null||tile(d.drawn)),'摸牌來源');
 requireValid(bool(d.flowerClosed)&&Array.isArray(d.initialFlowers)&&d.initialFlowers.length===4,'花胡機會紀錄');
 requireValid(d.phase==='flower'||d.flowerEvent===null,'殘留花胡事件');
 d.initialFlowers.forEach((e,s)=>{
  if(e===null)return;
  requireValid(e&&e.initial===true&&e.winner===s&&['eight','sevenB'].includes(e.kind)&&d.flowerClosed,'配牌花胡資格');
  if(e.kind==='eight')requireValid(e.source===null&&d.players[s].flowers.length===8,'配牌八仙');
  else requireValid(seat(e.source)&&e.source!==s&&d.players[s].flowers.length===7&&d.players[e.source].flowers.length===1,'配牌七搶一');
 });
 let kans=0;
 d.players.forEach((p,s)=>{
  requireValid(p&&Array.isArray(p.hand)&&p.hand.every(tile)&&Array.isArray(p.melds)&&Array.isArray(p.flowers)&&p.flowers.every(t=>/^[1-8]f$/.test(t)),'手牌／副露／花牌');
  requireValid(['S0','S1','S2','S3'].includes(p.state)&&bool(p.passed)&&bool(p.everPassed)&&bool(p.called),'宣告／過水');
  requireValid(!p.passed||p.everPassed,'過水歷程');
  requireValid(!['S2','S3'].includes(p.state)||(!p.passed&&p.melds.length===0),'天聽／地聽限制');
  requireValid(count(p.draws)&&count(p.discards)&&Array.isArray(p.ponPassed)&&p.ponPassed.every(tile),'玩家動作計數');
  requireValid(Array.isArray(p.river)&&p.river.every(r=>r&&tile(r.tile)&&bool(r.claimed)),'棄牌');
  for(const m of p.melds){
 if(m.from!==undefined||m.calledTile!==undefined){requireValid(seat(m.from)&&m.from!==s&&tile(m.calledTile)&&m.tiles.includes(m.calledTile)&&m.kind!=='concealedKan','副露來源');if(m.kind==='sequence')requireValid(s===(m.from+1)%4,'吃牌來源座位');}
 if(m.added!==undefined)requireValid(m.added===true&&m.kind==='openKan','加槓標記');
 }
 const size=p.hand.length+p.melds.length*3;
  requireValid(size===16||size===17,'有效手牌張數');
  if(size===16)waitingTiles(p.hand,p.melds);else isWinningShape(p.hand,p.melds);
  kans+=p.melds.filter(m=>m.kind==='openKan'||m.kind==='concealedKan').length;
  if(p.state!=='S0'){
   const h=[...p.hand];
   if(size===17){requireValid(s===d.turn&&h.includes(d.drawn),'宣告摸入牌');h.splice(h.indexOf(d.drawn),1);}
   requireValid(waitingTiles(h,p.melds).length>0,'宣告必須仍然聽牌');
  }
 });
 requireValid(kans===d.kanCount,'已完成槓數');
 requireValid([null,'deal','normal','flower','openKan','concealedKan','addedKan'].includes(d.drawOrigin),'補牌來源');
 requireValid(!['openKan','concealedKan','addedKan','flower'].includes(d.drawOrigin)||d.replacement,'補牌來源與事件不符');
 // The most recent resolved draw-producing command must retain its kan origin through flower passes.
 const lastDrawCommand=[...d.history].reverse().find(h=>/^(discard:|declare:|openKan$|concealedKan:|addedKan:|chi:|pon$)/.test(h.id));
 if(lastDrawCommand&&d.canKan&&d.phase!=='response'&&!['ron','rob_added_kan'].includes(d.result?.method)){
  const expected=/^openKan$/.test(lastDrawCommand.id)?'openKan':lastDrawCommand.id.startsWith('concealedKan:')?'concealedKan':lastDrawCommand.id.startsWith('addedKan:')?'addedKan':null;
  if(expected)requireValid(d.drawOrigin===expected,'槓補牌來源遭變更');
 }
 requireValid(Array.isArray(d.deferredFlowers)&&d.deferredFlowers.length===4,'延後花胡紀錄');
 d.deferredFlowers.forEach((e,s)=>{
  if(e===null)return;
  requireValid(e&&e.initial===false&&e.winner===s&&['eight','sevenB'].includes(e.kind)&&d.flowerClosed&&!d.initialFlowers[s],'延後花胡資格');
  if(e.kind==='eight')requireValid(e.source===null&&e.transfer===null&&d.players[s].flowers.length===8,'延後八仙');
  else requireValid(seat(e.source)&&e.source!==s&&d.players[s].flowers.length===7&&d.players[e.source].flowers.length===1&&d.players[e.source].flowers[0]===e.transfer,'延後七搶一');
 });
 if(d.callRestriction!==null){
  const c=d.callRestriction;
  requireValid(c&&seat(c.seat)&&seat(c.from)&&c.seat!==c.from&&c.seat===d.turn&&['chi','pon'].includes(c.kind)&&tile(c.tile)&&Array.isArray(c.tiles)&&c.tiles.every(tile),'吃碰出牌禁制');
  requireValid(d.phase==='turn'&&!d.canKan&&d.drawOrigin===null,'吃碰禁制階段');
  const p=d.players[c.seat],meld=p.melds.at(-1),river=d.players[c.from].river.at(-1);
  requireValid(p.state==='S0'&&p.called&&meld&&meld.kind===(c.kind==='pon'?'triplet':'sequence')&&same(meld.tiles,c.tiles)&&c.tiles.includes(c.tile)&&river?.claimed&&river.tile===c.tile,'吃碰禁制來源');
  if(c.kind==='chi')requireValid(c.seat===(c.from+1)%4,'吃牌座位');
  const pre={...p,hand:[...p.hand,...c.tiles]};
  pre.hand.splice(pre.hand.indexOf(c.tile),1);
  requireValid(canCallAndDiscard(pre,c.kind,c.tile,c.tiles),'吃碰必須仍能合法出牌');
 }
 if(d.phase==='turn'&&!d.canKan)requireValid(d.callRestriction!==null,'缺少吃碰出牌禁制');
 if(d.phase==='flower')requireValid(d.flowerEvent?.kind==='sevenA'||d.drawOrigin!=='openKan','明槓補花不能立即花胡');

 if(d.phase==='turn'){
  requireValid(d.event===null&&d.result===null,'行動階段不能有殘留回應或結算');
  if(d.canKan){
   requireValid(d.drawOrigin!==null,'缺少摸牌來源');
   const h=[...d.players[d.turn].hand];requireValid(h.includes(d.drawn),'摸入牌不在手牌內');h.splice(h.indexOf(d.drawn),1);
   requireValid(same(h,d.beforeDraw),'摸牌前後手牌不符');
  }else requireValid(d.drawn===null&&!d.replacement&&d.opening===null,'吃碰後不能視為摸牌');
 }
 if(d.phase==='flower'){
  const e=d.flowerEvent;requireValid(e&&['eight','sevenA','sevenB'].includes(e.kind)&&seat(e.winner)&&seat(e.resumeSeat)&&bool(e.initial)&&[null,'heaven','earth'].includes(e.opening),'花胡事件');
  requireValid(d.event===null&&d.result===null&&d.flowerClosed&&Array.isArray(e.originalFlowers),'花胡階段');
  requireValid(e.resumeSeat===d.turn&&(e.kind==='sevenA'?e.source===e.resumeSeat&&!e.initial:e.winner===e.resumeSeat),'花胡中斷與回復座位');
  const p=d.players[e.winner];requireValid(same(p.flowers,e.originalFlowers),'花胡原始花牌');
  if(e.kind==='eight')requireValid(e.source===null&&e.transfer===null&&p.flowers.length===8,'八仙條件');
  else requireValid(seat(e.source)&&e.source!==e.winner&&p.flowers.length===7&&d.players[e.source].flowers.length===1&&d.players[e.source].flowers[0]===e.transfer,'七搶一條件');
  requireValid(p.hand.length+p.melds.length*3===17||d.wall.length>16+d.kanCount,'合法花胡補牌');
 }
 if(d.phase==='response'){
  const e=d.event;requireValid(e&&['discard','addedKan'].includes(e.type)&&seat(e.from)&&e.from===d.turn&&tile(e.tile),'回應事件');
  requireValid(e.responses&&typeof e.responses==='object'&&!Array.isArray(e.responses)&&e.eligible&&typeof e.eligible==='object','回應集合');
  requireValid(Object.keys(e.eligible).length===3&&Object.keys(e.eligible).every(k=>/^[0-3]$/.test(k)&&+k!==e.from&&bool(e.eligible[k])),'胡牌資格');
  requireValid(Object.keys(e.responses).length<3&&Object.keys(e.responses).every(k=>/^[0-3]$/.test(k)&&+k!==e.from&&e.responses[k]&&typeof e.responses[k].id==='string'),'回應座位');
  requireValid(bool(e.lastTile)&&d.result===null,'回應不能已有結算');
  if(e.type==='discard')requireValid([null,'S1','S2','S3'].includes(e.declaration)&&bool(e.first)&&d.players[e.from].river.at(-1)?.tile===e.tile&&!d.players[e.from].river.at(-1).claimed,'棄牌事件來源');
  else requireValid(d.players[e.from].hand.includes(e.tile)&&d.players[e.from].melds.some(m=>m.kind==='triplet'&&m.tiles[0]===e.tile),'加槓來源');
 }
 if(['ended','review'].includes(d.phase)){
  const r=d.result;requireValid(r&&['draw','win','review'].includes(r.kind)&&Array.isArray(r.payments),'結局');
  requireValid((d.phase==='review')===(r.kind==='review'),'待核對階段');
  if(r.kind!=='win')requireValid(r.payments.length===0,'流局／待核對不能收付');
  if(r.kind==='win'){
   requireValid(r.method!=='tsumo'||d.drawOrigin!=='openKan','明槓補牌不可自摸');
   requireValid(seat(r.winner)&&['tsumo','ron','rob_added_kan','flower'].includes(r.method)&&tile(r.tile)&&Array.isArray(r.hand),'胡牌結果');
   const self=r.method==='tsumo'||r.method==='flower';
   requireValid(same(r.hand,self?d.players[r.winner].hand:[...d.players[r.winner].hand,r.tile]),'結算牌組與實際手牌不符');
   if(self)requireValid(r.tile===d.drawn&&r.winner===d.turn,'胡牌摸入牌或座位不符');
   else requireValid(d.event&&d.event.type===(r.method==='ron'?'discard':'addedKan')&&d.event.tile===r.tile&&seat(d.event.from)&&d.event.from!==r.winner,'胡牌來源事件不符');
   if(r.method==='flower'){
    requireValid(r.flower&&['eight','sevenA','sevenB'].includes(r.flower.kind)&&bool(r.flower.initial)&&bool(r.flower.normal)&&d.players[r.winner].flowers.length===8&&r.hand.length+d.players[r.winner].melds.length*3===17,'花胡結果');
    const f=r.flower;
    requireValid(Array.isArray(f.originalFlowers)&&new Set(f.originalFlowers).size===f.originalFlowers.length&&f.originalFlowers.every(t=>/^[1-8]f$/.test(t)&&d.players[r.winner].flowers.includes(t)),'花胡原始花牌');
    requireValid(f.kind==='eight'?f.source===null&&f.originalFlowers.length===8:seat(f.source)&&f.source!==r.winner&&f.originalFlowers.length===7,'花胡付款來源');
    if(r.flower.normal)requireValid(isWinningShape(r.hand,d.players[r.winner].melds),'同步普通胡牌');
   }else requireValid(isWinningShape(r.hand,d.players[r.winner].melds),'胡牌牌型');
   requireValid(r.score&&count(r.score.tai)&&Array.isArray(r.score.rows)&&r.score.rows.every(x=>x&&typeof x.name==='string'&&count(x.tai))&&r.score.rows.reduce((n,x)=>n+x.tai,0)===r.score.tai&&r.score.pending?.length===0,'計台結果');
   requireValid(r.payments.length===(r.method==='tsumo'||r.method==='flower'&&(r.flower.kind==='eight'||r.flower.kind==='sevenB'&&r.flower.normal)?3:1)&&new Set(r.payments.map(p=>p.from)).size===r.payments.length,'付款人數');
   requireValid(r.payments.every(p=>seat(p.from)&&p.to===r.winner&&p.from!==p.to&&count(p.tai)&&count(p.dealerTai)&&Number.isSafeInteger(p.amount)&&p.amount>=0),'收付明細');
   for(const p of r.payments){
    const dealerPoints=p.from===d.dealer||r.winner===d.dealer?1+2*d.repeats:0;
    let flowerPoints=0;
    if(r.method==='flower'){
     const f=r.flower;
     if(f.kind==='sevenA'||f.kind==='sevenB'&&!f.normal)requireValid(p.from===f.source,'花胡付款者不符');
     flowerPoints=f.kind==='eight'||p.from===f.source?8+(f.initial?4:0):flowerTai(f.originalFlowers,(r.winner-d.windOrigin+4)%4);
     requireValid(p.flowerTai===flowerPoints,'花胡台數不符');
    }else if(!self)requireValid(p.from===d.event.from,'放槍付款者不符');
    requireValid(p.dealerTai===dealerPoints&&p.tai===r.score.tai+flowerPoints+dealerPoints&&p.amount===100+50*p.tai,'收付金額與台數不符');
   }
  }
 }
}
