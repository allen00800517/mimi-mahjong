import {Game} from './engine.mjs';
import {createDeal,firstDealer,validateDeal} from './deal.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const check=(v,message)=>{if(!v)throw new TypeError('整場紀錄無效：'+message);};
const seat=n=>Number.isInteger(n)&&n>=0&&n<4;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const winds=['東','南','西','北'];
export function transition(progress,result,rounds){
 check([1,4].includes(rounds)&&progress&&seat(progress.dealer)&&seat(progress.roundWind)&&progress.roundWind<rounds&&count(progress.repeats)&&Number.isInteger(progress.handInRound)&&progress.handInRound>=1&&progress.handInRound<=4,'進度');
 check(result&&['draw','win'].includes(result.kind)&&(result.kind!=='win'||seat(result.winner)),'本手未完成裁定');
 if(result.kind==='draw'||result.winner===progress.dealer){
  check(Number.isSafeInteger(progress.repeats+1),'連莊數超出可精確記錄範圍');
  return {...progress,repeats:progress.repeats+1,completed:false};
 }
 if(progress.roundWind===rounds-1&&progress.handInRound===4)return {...progress,completed:true};
 return {dealer:(progress.dealer+1)%4,roundWind:progress.roundWind+(progress.handInRound===4?1:0),handInRound:progress.handInRound%4+1,repeats:0,completed:false};
}
function scoresAfter(before,result,dealer,repeats){
 check(Array.isArray(result.payments),'缺少收付');
 if(result.kind==='draw')check(result.payments.length===0,'流局不能收付');
 const scores=[...before];
 for(const p of result.payments){
  check(p&&seat(p.from)&&seat(p.to)&&p.from!==p.to&&p.to===result.winner&&count(p.tai)&&count(p.dealerTai)&&Number.isSafeInteger(p.amount)&&p.amount>0,'收付格式');
  check(p.dealerTai===(p.from===dealer||p.to===dealer?1+2*repeats:0)&&p.tai>=p.dealerTai&&p.amount===100+50*p.tai,'底台／莊家收付');
  scores[p.from]-=p.amount;scores[p.to]+=p.amount;
 }
 check(scores.every(Number.isSafeInteger)&&scores.reduce((a,b)=>a+b,0)===0,'分數守恆或精度');
 return scores;
}
const progressOf=({dealer,roundWind,handInRound,repeats})=>({dealer,roundWind,handInRound,repeats});
export class Match {
 constructor({seed=Date.now()>>>0,rounds=4,starter=firstDealer(seed)}={}){
  check(count(seed)&&seed<=4294967295&&[1,4].includes(rounds)&&seat(starter),'開場設定');
  this.seed=seed;this.rounds=rounds;this.starter=starter;this.status='playing';this.history=[];
  this.progress={dealer:starter,roundWind:0,handInRound:1,repeats:0};
  this.game=this.makeGame([0,0,0,0]);
 }
 get handNumber(){return this.history.length+(this.status==='completed'?0:1);}
 get label(){return winds[this.progress.roundWind]+'風圈 · 第 '+this.progress.handInRound+' 莊 · 第 '+this.handNumber+' 手';}
 makeGame(scores){
  const seed=(this.seed+this.history.length)>>>0,deal=createDeal(seed,this.progress.dealer);
  return new Game({seed,...this.progress,windOrigin:deal.doorSeat,deal,scores});
 }
 nextProgress(){if(this.status==='completed'||this.game.phase!=='ended')throw Error('目前不能進入下一手');return transition(this.progress,this.game.result,this.rounds);}
 advance(expectedHand=this.handNumber){
  if(expectedHand!==this.handNumber)throw Error('此手結算操作已過期');
  const next=this.nextProgress(),g=this.game;
  const before=this.history.at(-1)?.scores??[0,0,0,0];
  check(same(scoresAfter(before,g.result,g.dealer,g.repeats),g.scores),'本手分數與收付不符');
  const row={number:this.handNumber,seed:g.seed,...this.progress,deal:clone(g.deal),kind:g.result.kind,winner:g.result.kind==='win'?g.result.winner:null,method:g.result.method??null,payments:clone(g.result.payments),scores:[...g.scores]};
  // Construct the next hand before committing the boundary.
  const newGame=next.completed?null:new Game({seed:(g.seed+1)>>>0,...progressOf(next),deal:createDeal((g.seed+1)>>>0,next.dealer),windOrigin:createDeal((g.seed+1)>>>0,next.dealer).doorSeat,scores:g.scores});
  this.history.push(row);
  if(next.completed)this.status='completed';
  else{this.progress=progressOf(next);this.game=newGame;}
  return this;
 }
 standings(){
  const scores=this.game.scores;
  return scores.map((score,seat)=>({seat,score,rank:1+scores.filter(n=>n>score).length})).sort((a,b)=>b.score-a.score||a.seat-b.seat);
 }
 snapshot(){return clone({format:'mimi-tw-match-3',seed:this.seed,rounds:this.rounds,starter:this.starter,status:this.status,progress:this.progress,history:this.history,game:this.game.snapshot()});}
 static restore(data){
  check(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length===8&&Object.keys(data).every(k=>['format','seed','rounds','starter','status','progress','history','game'].includes(k)),'資料欄位');
  // There are eight persisted fields; reject extra properties without assigning them.
  return restoreMatch(data);
 }
}
function restoreMatch(d){
 check(d.format==='mimi-tw-match-3'&&count(d.seed)&&d.seed<=4294967295&&[1,4].includes(d.rounds)&&seat(d.starter)&&['playing','completed'].includes(d.status)&&Array.isArray(d.history),'版本與設定');
 let progress={dealer:d.starter,roundWind:0,handInRound:1,repeats:0},scores=[0,0,0,0],completed=false,previousScores=scores;
 for(let i=0;i<d.history.length;i++){
  const row=d.history[i];check(!completed&&row&&row.number===i+1&&row.seed===((d.seed+i)>>>0)&&same(progressOf(row),progress),'逐手進度');
  validateDeal(row.deal,row.seed,row.dealer,row.deal?.doorSeat);
  check(['draw','win'].includes(row.kind)&&(row.kind==='draw'?row.winner===null&&row.method===null:seat(row.winner)&&['ron','tsumo','rob_added_kan','flower'].includes(row.method)),'逐手結果');
  if(row.kind==='win'){
   check(Array.isArray(row.payments)&&new Set(row.payments.map(p=>p.from)).size===row.payments.length,'逐手付款者');
   check(row.method==='tsumo'?row.payments.length===3:row.method==='flower'?[1,3].includes(row.payments.length):row.payments.length===1,'逐手付款人數與胡牌方式不符');
  }
  previousScores=scores;scores=scoresAfter(scores,row,row.dealer,row.repeats);check(same(scores,row.scores),'逐手累計');
  const next=transition(progress,row,d.rounds);completed=next.completed;if(!completed)progress=progressOf(next);
 }
 check(completed===(d.status==='completed')&&same(d.progress,progress),'整場結束狀態或圈風');
 const game=Game.restore(d.game),index=d.history.length-(completed?1:0);
 check(game.seed===((d.seed+index)>>>0)&&game.dealer===progress.dealer&&game.roundWind===progress.roundWind&&game.repeats===progress.repeats&&game.deal,'目前手進度');
 validateDeal(game.deal,game.seed,game.dealer,game.windOrigin);
 if(completed){
  const last=d.history.at(-1);
  check(game.phase==='ended'&&game.result.kind===last.kind&&game.result.winner===last.winner&&game.result.method===last.method&&same(game.result.payments,last.payments)&&same(game.scores,scores),'終局重複或不一致');
  check(same(scoresAfter(previousScores,game.result,game.dealer,game.repeats),scores),'終局分數');
 }else{
  check(game.phase!=='review','未裁定牌局不可作整場紀錄');
  const expected=game.phase==='ended'?scoresAfter(scores,game.result,game.dealer,game.repeats):scores;
  check(same(game.scores,expected),'目前手分數');
 }
 return Object.assign(Object.create(Match.prototype),{seed:d.seed,rounds:d.rounds,starter:d.starter,status:d.status,progress:clone(progress),history:clone(d.history),game});
}
